from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import audit, chat, workflows

app = FastAPI(title="PrimeAgent API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(chat.router)
app.include_router(workflows.router)
app.include_router(audit.router)

