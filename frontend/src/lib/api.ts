import axios from 'axios';
import { getSession } from 'next-auth/react';
import type { Memo, MemoStatus, TransformResult, Credits } from '@/types/memo';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const client = axios.create({ baseURL: BASE_URL });

// NextAuth 세션의 user.id(OAuth sub)를 X-Session-Id 헤더로 주입
client.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.user?.id) {
    config.headers['X-Session-Id'] = session.user.id;
  }
  return config;
});

// ── 메모 CRUD ──────────────────────────────────────────────────

export const memosApi = {
  list: () =>
    client.get<Memo[]>('/api/memos').then((r) => r.data),

  create: (content: string, source_url?: string) =>
    client.post<Memo>('/api/memos', { content, source_url }).then((r) => r.data),

  update: (id: number, content: string, source_url?: string) =>
    client.put<Memo>(`/api/memos/${id}`, { content, source_url }).then((r) => r.data),

  delete: (id: number) =>
    client.delete(`/api/memos/${id}`),

  updateStatus: (id: number, status: MemoStatus) =>
    client.patch<Memo>(`/api/memos/${id}/status`, { status }).then((r) => r.data),

  parseUrl: (id: number, url: string) =>
    client.post(`/api/memos/${id}/parse-url`, { url }).then((r) => r.data),
};

// ── AI 변환 (수동 트리거 전용) ─────────────────────────────────

export const aiApi = {
  /** ✨ 영어로 변환하기 버튼 클릭 시에만 호출 */
  transform: (memoId: number) =>
    client.post<TransformResult>(`/api/ai/transform/${memoId}`).then((r) => r.data),

  getCredits: () =>
    client.get<Credits>('/api/ai/credits').then((r) => r.data),
};

// ── 오디오 ─────────────────────────────────────────────────────

export const audioApi = {
  generate: (memoId: number) =>
    client.post<{ audio_url: string; cached: boolean }>(`/api/audio/generate/${memoId}`).then((r) => r.data),

  getDownloadUrl: (memoId: number) =>
    client.get<{ download_url: string; expires_in_seconds: number }>(`/api/audio/download/${memoId}`).then((r) => r.data),
};
