"""Word Hunt API: routes permainan, leaderboard, dan penyajian frontend."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    from . import game, leaderboard, stories
except ImportError:
    import game
    import leaderboard
    import stories

app = FastAPI(title="Word Hunt API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class WordIn(BaseModel):
    path: list[int] = Field(..., description="Urutan indeks sel 0..24")


class ScoreIn(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    score: int = Field(ge=0)
    words: int = Field(ge=0)


class StoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    batch: str = Field(default="Anggota EC UPB", max_length=30)
    comment: str = Field(min_length=1, max_length=220)


@app.get("/api/ping")
def ping() -> dict:
    return {"pong": True}


@app.post("/api/game")
def post_game() -> dict:
    session = game.create_session()
    return {
        "session_id": session.id,
        "grid": session.grid,
        "time_limit": game.BASE_TIME,
    }


@app.post("/api/game/{session_id}/word")
def post_word(session_id: str, body: WordIn) -> dict:
    session = game.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    return game.submit_word(session, body.path)


@app.get("/api/leaderboard")
def get_leaderboard() -> dict:
    return {"entries": leaderboard.top(10)}


@app.post("/api/leaderboard")
def post_leaderboard(body: ScoreIn) -> dict:
    rank = leaderboard.add_score(body.name.strip(), body.score, body.words)
    return {"rank": rank}


@app.get("/api/stories")
def get_stories() -> dict:
    return {"stories": stories.latest()}


@app.post("/api/stories")
def post_story(body: StoryIn) -> dict:
    story = stories.add_story(body.name.strip(), body.batch.strip() or "Anggota EC UPB", body.comment.strip())
    return {"story": story}


_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")
