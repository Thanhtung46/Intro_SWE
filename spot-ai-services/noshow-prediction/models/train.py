"""Offline training entrypoint for the no-show model (research.md decision 9).

Run manually or via an external scheduler — NOT part of the request path:

    python -m models.train

Reads resolved bookings (status COMPLETED/NO_SHOW) read-only from the
shared Supabase Postgres database, builds the same feature vector
services/features.py builds at serve time, fits a scikit-learn classifier
with class_weight="balanced" to handle the expected no-show minority class
(research.md decision 3), evaluates on a holdout split, and persists the
artifact to models/noshow_model.joblib for services/model_registry.py to
load at the next service (re)start (FR-013).
"""

import logging
import sys

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from app.config import connection, settings
from services.features import FEATURE_NAMES, feature_vector_for_resolved_booking

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("noshow-prediction.train")

# Below this many labeled rows (or with only one class present), skip the
# holdout split and just fit on everything so an artifact still exists —
# documented low-data limitation, not an error (quickstart.md).
MIN_ROWS_FOR_HOLDOUT = 20


def _fetch_resolved_bookings() -> list[tuple[int, str]]:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT booking_id, status
                FROM schema_booking.bookings
                WHERE status IN ('COMPLETED', 'NO_SHOW')
                """)
            return cur.fetchall()


def build_training_dataset() -> tuple[np.ndarray, np.ndarray]:
    """(X, y) using the same feature logic services/features.py uses at
    serve time, computed per resolved booking (label 1 = NO_SHOW)."""
    rows: list[list[float]] = []
    labels: list[int] = []
    for booking_id, status in _fetch_resolved_bookings():
        vector = feature_vector_for_resolved_booking(booking_id)
        if vector is None:
            continue
        rows.append(vector)
        labels.append(1 if status == "NO_SHOW" else 0)
    return np.array(rows), np.array(labels)


def train_and_evaluate() -> HistGradientBoostingClassifier:
    X, y = build_training_dataset()
    n_classes = len(set(y.tolist())) if len(y) else 0
    model = HistGradientBoostingClassifier(class_weight="balanced", random_state=42)

    if len(X) >= MIN_ROWS_FOR_HOLDOUT and n_classes >= 2:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        model.fit(X_train, y_train)
        proba = model.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, proba)
        logger.info(
            "Holdout ROC-AUC: %.3f (n_train=%d, n_test=%d, features=%s)",
            auc,
            len(X_train),
            len(X_test),
            FEATURE_NAMES,
        )
    else:
        logger.warning(
            "Only %d resolved bookings with %d class(es) found (need >= %d "
            "rows and 2 classes for a holdout eval) — fitting on the full "
            "dataset with no evaluation. Re-run once more historical "
            "COMPLETED/NO_SHOW data exists.",
            len(X),
            n_classes,
            MIN_ROWS_FOR_HOLDOUT,
        )
        if len(X) == 0:
            X = np.zeros((1, len(FEATURE_NAMES)))
            y = np.array([0])
        model.fit(X, y)

    return model


def main() -> None:
    model = train_and_evaluate()
    settings.model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, settings.model_path)
    logger.info("Saved model artifact to %s", settings.model_path)


if __name__ == "__main__":
    sys.exit(main())
