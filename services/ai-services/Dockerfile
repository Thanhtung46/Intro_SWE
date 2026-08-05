# services/ai-services — FastAPI 0.111.1 (Python 3.11.9)
# Standalone service: build context is this directory, not the monorepo root.
ARG PYTHON_VERSION=3.11.9

FROM python:${PYTHON_VERSION}-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
