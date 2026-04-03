import type {
  Document,
  DocumentDetail,
  Section,
  Session,
  Provocation,
  OutlineNote,
} from './types.ts';

// Auto-detect base URL: use relative path for production, localhost for dev
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocal
  ? `${window.location.protocol}//${window.location.host}/api`
  : `${window.location.protocol}//${window.location.host}/babel/api`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API PUT ${path}: ${res.status}`);
  return res.json();
}

async function deleteReq<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API DELETE ${path}: ${res.status}`);
  return res.json();
}

// ── Documents ─────────────────────────────────────────────────

export function fetchDocuments(): Promise<{ documents: Document[] }> {
  return fetchJson('/documents');
}

export function fetchDocument(id: number): Promise<DocumentDetail> {
  return fetchJson(`/documents/${id}`);
}

export function fetchSection(docId: number, idx: number): Promise<Section> {
  return fetchJson(`/documents/${docId}/sections/${idx}`);
}

export function createDocumentText(title: string, text: string): Promise<{ id: number; title: string; section_count: number }> {
  return postJson('/documents', { title, text, source_type: 'text' });
}

export function createDocumentUrl(url: string): Promise<{ id: number; title: string; section_count: number }> {
  return postJson('/documents/url', { url });
}

export async function uploadDocumentPdf(file: File): Promise<{ id: number; title: string; section_count: number }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export function deleteDocument(id: number): Promise<{ deleted: boolean }> {
  return deleteReq(`/documents/${id}`);
}

// ── Sessions ──────────────────────────────────────────────────

export function fetchSessions(): Promise<{ sessions: Session[] }> {
  return fetchJson('/sessions');
}

export function createSession(docId: number, mode = 'provocation', lensType?: string): Promise<Session> {
  return postJson('/sessions', { doc_id: docId, mode, lens_type: lensType });
}

export function updateSession(id: number, data: { current_section?: number; mode?: string; lens_type?: string }): Promise<Session> {
  return putJson(`/sessions/${id}`, data);
}

// ── Provocations ──────────────────────────────────────────────

export function provoke(req: {
  session_id: number;
  doc_id: number;
  section_idx: number;
  mode: string;
  action: string;
  lens_type?: string;
}): Promise<Provocation> {
  return postJson('/provoke', req);
}

export function fetchProvocations(sessionId: number, sectionIdx?: number): Promise<{ provocations: Provocation[] }> {
  const params = sectionIdx !== undefined ? `?section_idx=${sectionIdx}` : '';
  return fetchJson(`/sessions/${sessionId}/provocations${params}`);
}

// ── Outlines ──────────────────────────────────────────────────

export function fetchOutline(docId: number): Promise<{ notes: OutlineNote[] }> {
  return fetchJson(`/outline/${docId}`);
}

export function saveOutline(note: {
  doc_id: number;
  section_idx?: number | null;
  note_text: string;
  position?: number;
  id?: number;
}): Promise<{ id: number }> {
  return postJson('/outline', note);
}

export function deleteOutlineNote(id: number): Promise<{ deleted: boolean }> {
  return deleteReq(`/outline/${id}`);
}

// ── Version ───────────────────────────────────────────────────

export function fetchVersion(): Promise<{ version: string; backend: string }> {
  return fetchJson('/version');
}
