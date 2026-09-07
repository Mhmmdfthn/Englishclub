"""Word Hunt API: routes permainan, leaderboard, dan penyajian frontend."""

from pathlib import Path

import os
import re

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

_ADMIN_JURUSAN = {"Ilmu Komputer", "Manajemen", "Akuntansi", "Bisnis Digital", "Sains Data", "Agribisnis", "Lainnya"}

try:
    from . import game, leaderboard, members, stories
except ImportError:
    import game
    import leaderboard
    import members
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


class MemberIn(BaseModel):
    nama: str = Field(min_length=2, max_length=40)
    no_hp: str = Field(min_length=10, max_length=15)
    jurusan: str = Field(min_length=1, max_length=30)

    @field_validator("jurusan")
    @classmethod
    def validate_jurusan(cls, v: str) -> str:
        if v not in _ADMIN_JURUSAN:
            raise ValueError(f"Jurusan harus salah satu: {', '.join(sorted(_ADMIN_JURUSAN))}")
        return v

    @field_validator("no_hp")
    @classmethod
    def validate_hp(cls, v: str) -> str:
        vv = v.strip().replace(" ", "").replace("-", "")
        if not re.fullmatch(r"08[0-9]{8,11}", vv):
            raise ValueError("No HP harus format 08xxxxxxxxxx (10-13 digit)")
        return vv


class AdminVerifyIn(BaseModel):
    token: str = Field(min_length=1)


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


def _require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    expected = os.getenv("ADMIN_TOKEN")
    if not expected:
        # fail closed: jika ADMIN_TOKEN belum di-set, tolak semua akses admin
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN belum dikonfigurasi di server")
    if x_admin_token != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/api/admin/verify")
def verify_admin(body: AdminVerifyIn) -> dict:
    expected = os.getenv("ADMIN_TOKEN")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN belum dikonfigurasi")
    if body.token != expected:
        raise HTTPException(status_code=401, detail="Token salah")
    return {"ok": True}


@app.get("/api/members/highlight")
def get_members_highlight() -> dict:
    # public, no auth — hanya data masked untuk highlight panel
    return {"highlight": members.highlight(30), "total": len(members.all_members(1000))}


@app.get("/api/members")
def get_members(x_admin_token: str | None = Header(default=None)) -> dict:
    _require_admin(x_admin_token)
    return {"members": members.all_members(100)}


@app.post("/api/members")
def post_member(body: MemberIn) -> dict:
    try:
        row = members.add_member(body.nama.strip(), body.no_hp.strip(), body.jurusan.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "member": row}


@app.get("/api/members/export")
def export_members(x_admin_token: str | None = Header(default=None)):
    from fastapi.responses import FileResponse

    _require_admin(x_admin_token)
    path = members.csv_path()
    return FileResponse(str(path), media_type="text/csv", filename="pendaftaran_ec.csv")


_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")
