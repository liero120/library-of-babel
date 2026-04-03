"""FastAPI application — Library of Babel critical reading partner."""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from backend import session as db
from backend.document import chunk_text, fetch_url, ingest_pdf, ingest_text
from backend.provocation import close_browser, generate_provocation, stream_provocation

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-24s  %(levelname)-5s  %(message)s",
)
log = logging.getLogger(__name__)

__version__ = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_db()
    log.info("Database initialized at %s", db.DB_PATH)
    yield
    await close_browser()
    await db.close_db()
    log.info("Shutdown complete")


app = FastAPI(title="Library of Babel", version=__version__, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost",
        "capacitor://localhost",
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://srv1195671.hstgr.cloud",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Models ───────────────────────────────────────────


class TextDocumentCreate(BaseModel):
    title: str
    text: str
    source_type: str = "text"


class UrlDocumentCreate(BaseModel):
    url: str


class ProvokeRequest(BaseModel):
    session_id: int
    doc_id: int
    section_idx: int
    mode: str
    action: str
    lens_type: str | None = None


class SessionCreate(BaseModel):
    doc_id: int
    mode: str = "provocation"
    lens_type: str | None = None


class SessionUpdate(BaseModel):
    current_section: int | None = None
    mode: str | None = None
    lens_type: str | None = None


class OutlineNote(BaseModel):
    doc_id: int
    section_idx: int | None = None
    note_text: str
    position: int = 0
    id: int | None = None


# ── Documents ──────────────────────────────────────────────────


@app.post("/api/documents")
async def create_document_text(body: TextDocumentCreate):
    """Create a document from plain text or markdown."""
    title, sections = ingest_text(body.text, body.title)
    doc_id = await db.insert_document(
        title=title,
        source_type=body.source_type,
        source_ref=None,
        full_text=body.text,
        sections=[s.to_dict() for s in sections],
    )
    return {"id": doc_id, "title": title, "section_count": len(sections)}


@app.post("/api/documents/upload")
async def create_document_upload(file: UploadFile = File(...)):
    """Upload a PDF file."""
    content = await file.read()
    title, full_text, sections = ingest_pdf(content)
    doc_id = await db.insert_document(
        title=title,
        source_type="pdf",
        source_ref=file.filename,
        full_text=full_text,
        sections=[s.to_dict() for s in sections],
    )
    return {"id": doc_id, "title": title, "section_count": len(sections)}


@app.post("/api/documents/url")
async def create_document_url(body: UrlDocumentCreate):
    """Fetch a URL and create a document."""
    title, text = await fetch_url(body.url)
    sections = chunk_text(text)
    doc_id = await db.insert_document(
        title=title,
        source_type="url",
        source_ref=body.url,
        full_text=text,
        sections=[s.to_dict() for s in sections],
    )
    return {"id": doc_id, "title": title, "section_count": len(sections)}


@app.get("/api/documents")
async def list_documents():
    docs = await db.get_documents()
    return {"documents": docs}


@app.get("/api/documents/{doc_id}")
async def get_document(doc_id: int):
    doc = await db.get_document(doc_id)
    if not doc:
        return JSONResponse({"error": "not found"}, status_code=404)
    return doc


@app.get("/api/documents/{doc_id}/sections/{idx}")
async def get_section(doc_id: int, idx: int):
    section = await db.get_section(doc_id, idx)
    if not section:
        return JSONResponse({"error": "not found"}, status_code=404)
    return section


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: int):
    ok = await db.delete_document(doc_id)
    if not ok:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"deleted": True}


# ── Sessions ───────────────────────────────────────────────────


@app.post("/api/sessions")
async def create_session(body: SessionCreate):
    session = await db.create_session(body.doc_id, body.mode, body.lens_type)
    return session


@app.get("/api/sessions")
async def list_sessions():
    sessions = await db.get_sessions()
    return {"sessions": sessions}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: int):
    session = await db.get_session(session_id)
    if not session:
        return JSONResponse({"error": "not found"}, status_code=404)
    return session


@app.put("/api/sessions/{session_id}")
async def update_session(session_id: int, body: SessionUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    session = await db.update_session(session_id, **updates)
    if not session:
        return JSONResponse({"error": "not found"}, status_code=404)
    return session


# ── Provocations ───────────────────────────────────────────────


@app.post("/api/provoke")
async def provoke(body: ProvokeRequest):
    """Generate a provocation for the given section."""
    # Get section text
    section = await db.get_section(body.doc_id, body.section_idx)
    if not section:
        return JSONResponse({"error": "section not found"}, status_code=404)

    # Get document for title
    doc = await db.get_document(body.doc_id)

    # Get previous provocations for context
    history = await db.get_provocations(body.session_id, body.section_idx)
    history_dicts = [{"action": p["action"], "response": p["response"]} for p in history]

    # Get user notes for this section
    outline = await db.get_outline(body.doc_id)
    section_notes = [n for n in outline if n.get("section_idx") == body.section_idx]
    user_notes = "\n".join(n["note_text"] for n in section_notes) if section_notes else None

    # Build prompt
    from backend.prompts import get_system_prompt, get_user_prompt

    system = get_system_prompt(body.mode, body.lens_type)
    user_msg = get_user_prompt(
        body.mode, body.action, section["content"], user_notes, history_dicts
    )

    # Generate
    response = await generate_provocation(
        section_text=section["content"],
        mode=body.mode,
        action=body.action,
        lens_type=body.lens_type,
        user_notes=user_notes,
        history=history_dicts,
        doc_title=doc["title"] if doc else "",
        section_idx=body.section_idx,
        total_sections=doc["section_count"] if doc else 1,
        section_title=section.get("title"),
    )

    # Persist
    prov_id = await db.insert_provocation(
        session_id=body.session_id,
        doc_id=body.doc_id,
        section_idx=body.section_idx,
        mode=body.mode,
        action=body.action,
        lens_type=body.lens_type,
        prompt_sent=user_msg,
        response=response,
    )

    return {
        "id": prov_id,
        "session_id": body.session_id,
        "section_idx": body.section_idx,
        "mode": body.mode,
        "action": body.action,
        "lens_type": body.lens_type,
        "response": response,
    }


@app.get("/api/sessions/{session_id}/provocations")
async def get_provocations(session_id: int, section_idx: int | None = None):
    provs = await db.get_provocations(session_id, section_idx)
    return {"provocations": provs}


# ── Outlines ───────────────────────────────────────────────────


@app.post("/api/outline")
async def save_outline(body: OutlineNote):
    note_id = await db.upsert_outline(
        doc_id=body.doc_id,
        section_idx=body.section_idx,
        note_text=body.note_text,
        position=body.position,
        note_id=body.id,
    )
    return {"id": note_id}


@app.get("/api/outline/{doc_id}")
async def get_outline(doc_id: int):
    notes = await db.get_outline(doc_id)
    return {"notes": notes}


@app.delete("/api/outline/{note_id}")
async def delete_outline_note(note_id: int):
    ok = await db.delete_outline(note_id)
    if not ok:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"deleted": True}


# ── WebSocket (streaming provocations) ────────────────────────

_ws_connections: set[WebSocket] = set()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _ws_connections.add(ws)
    try:
        while True:
            data = await ws.receive_json()
            if data.get("type") == "provoke_stream":
                section = await db.get_section(data["doc_id"], data["section_idx"])
                if not section:
                    await ws.send_json({"type": "error", "message": "section not found"})
                    continue

                history = await db.get_provocations(data["session_id"], data["section_idx"])
                history_dicts = [{"action": p["action"], "response": p["response"]} for p in history]

                full_response = []
                async for token in stream_provocation(
                    section_text=section["content"],
                    mode=data["mode"],
                    action=data["action"],
                    lens_type=data.get("lens_type"),
                    user_notes=data.get("user_notes"),
                    history=history_dicts,
                ):
                    full_response.append(token)
                    await ws.send_json({"type": "token", "text": token})

                # Persist the full provocation
                from backend.prompts import get_user_prompt

                user_msg = get_user_prompt(
                    data["mode"], data["action"], section["content"], None, history_dicts
                )
                prov_id = await db.insert_provocation(
                    session_id=data["session_id"],
                    doc_id=data["doc_id"],
                    section_idx=data["section_idx"],
                    mode=data["mode"],
                    action=data["action"],
                    lens_type=data.get("lens_type"),
                    prompt_sent=user_msg,
                    response="".join(full_response),
                )
                await ws.send_json({"type": "done", "id": prov_id})

            elif data.get("type") == "ping":
                await ws.send_json({"type": "pong"})

    except WebSocketDisconnect:
        _ws_connections.discard(ws)
    except Exception as e:
        log.error("WebSocket error: %s", e)
        _ws_connections.discard(ws)


# ── Version & Health ───────────────────────────────────────────


@app.get("/api/version")
async def api_version():
    return {"version": __version__, "backend": os.getenv("LLM_BACKEND", "api")}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Static Files (frontend) ───────────────────────────────────

_frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mobile", "dist")

if os.path.exists(_frontend_path):
    @app.get("/")
    async def root():
        return FileResponse(
            os.path.join(_frontend_path, "index.html"),
            headers={"Cache-Control": "no-cache, must-revalidate"},
        )

    @app.get("/sw.js")
    async def serve_sw():
        sw_path = os.path.join(_frontend_path, "sw.js")
        if os.path.exists(sw_path):
            return FileResponse(
                sw_path,
                media_type="application/javascript",
                headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
            )
        return JSONResponse({"error": "not found"}, status_code=404)

    @app.get("/manifest.json")
    async def serve_manifest():
        return FileResponse(os.path.join(_frontend_path, "manifest.json"))

    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_path, "assets")), name="assets")

    # SPA fallback — must be last
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        file_path = os.path.join(_frontend_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(
            os.path.join(_frontend_path, "index.html"),
            headers={"Cache-Control": "no-cache, must-revalidate"},
        )
