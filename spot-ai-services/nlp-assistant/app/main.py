"""FastAPI app entrypoint for the nlp-assistant service.

Run with: uvicorn app.main:app --port 5003
"""

from fastapi import FastAPI

from app.routers.conversation import router as conversation_router

app = FastAPI(title="SPOT NLP Assistant Service")
app.include_router(conversation_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
