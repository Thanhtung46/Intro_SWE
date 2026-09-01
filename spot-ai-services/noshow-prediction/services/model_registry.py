"""Loads and caches the trained no-show model artifact.

The artifact (models/noshow_model.joblib) is produced offline by
models/train.py (research.md decision 9) and loaded once at process
startup. If no artifact exists yet, the service still starts — callers get
a 503 from the prediction endpoints instead of a crash (spec.md Edge
Cases), and GET /health reports modelLoaded: false.
"""

import logging
from typing import Any, Optional

import joblib

from app.config import settings

logger = logging.getLogger("noshow-prediction")

_model: Optional[Any] = None
_load_attempted = False


def load_model() -> None:
    """Load the model artifact from settings.model_path, if present.

    Safe to call multiple times (e.g. once at startup, again in tests after
    monkeypatching settings.model_path) — always re-attempts the load.
    """
    global _model, _load_attempted
    _load_attempted = True
    if settings.model_path.exists():
        _model = joblib.load(settings.model_path)
        logger.info("Loaded no-show model from %s", settings.model_path)
    else:
        _model = None
        logger.warning(
            "No model artifact found at %s — predictions will 503 until "
            "models/train.py is run",
            settings.model_path,
        )


def is_loaded() -> bool:
    if not _load_attempted:
        load_model()
    return _model is not None


def get_model() -> Any:
    if not _load_attempted:
        load_model()
    if _model is None:
        raise RuntimeError("No-show model is not loaded")
    return _model


def set_model_for_testing(model: Any) -> None:
    """Test-only hook to inject a stub model without touching the filesystem."""
    global _model, _load_attempted
    _model = model
    _load_attempted = True
