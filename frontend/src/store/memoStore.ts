import { create } from 'zustand';
import type { Memo, MemoStatus, TransformResult, Credits } from '@/types/memo';
import { memosApi, aiApi, audioApi } from '@/lib/api';

interface MemoStore {
  // ── 데이터 ────────────────────────────────────────────────
  memos: Memo[];
  credits: Credits | null;
  isLoading: boolean;
  error: string | null;

  // ── UI 상태 ───────────────────────────────────────────────
  activeFilter: MemoStatus | 'all';
  inputPanelOpen: boolean;
  learningModalMemoId: number | null;
  learningResult: TransformResult | null;
  isTransforming: boolean;
  isGeneratingAudio: boolean;
  audioUrl: string | null;

  // ── 액션: 메모 CRUD ───────────────────────────────────────
  fetchMemos: () => Promise<void>;
  createMemo: (content: string, sourceUrl?: string) => Promise<void>;
  updateStatus: (id: number, status: MemoStatus) => Promise<void>;
  deleteMemo: (id: number) => Promise<void>;

  // ── 액션: AI 변환 (수동 트리거만) ─────────────────────────
  fetchCredits: () => Promise<void>;
  transformMemo: (id: number) => Promise<void>;

  // ── 액션: 오디오 ──────────────────────────────────────────
  generateAudio: (id: number) => Promise<void>;
  downloadAudio: (id: number) => Promise<void>;

  // ── 액션: UI ──────────────────────────────────────────────
  setActiveFilter: (filter: MemoStatus | 'all') => void;
  setInputPanelOpen: (open: boolean) => void;
  openLearningModal: (memoId: number) => void;
  closeLearningModal: () => void;
  clearError: () => void;
}

export const useMemoStore = create<MemoStore>((set, get) => ({
  memos: [],
  credits: null,
  isLoading: false,
  error: null,
  activeFilter: 'all',
  inputPanelOpen: false,
  learningModalMemoId: null,
  learningResult: null,
  isTransforming: false,
  isGeneratingAudio: false,
  audioUrl: null,

  fetchMemos: async () => {
    set({ isLoading: true, error: null });
    try {
      const memos = await memosApi.list();
      set({ memos });
    } catch {
      set({ error: '메모를 불러오는데 실패했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  createMemo: async (content, sourceUrl) => {
    const memo = await memosApi.create(content, sourceUrl);
    set((s) => ({ memos: [memo, ...s.memos] }));
  },

  updateStatus: async (id, status) => {
    const updated = await memosApi.updateStatus(id, status);
    set((s) => ({ memos: s.memos.map((m) => (m.id === id ? updated : m)) }));
  },

  deleteMemo: async (id) => {
    await memosApi.delete(id);
    set((s) => ({ memos: s.memos.filter((m) => m.id !== id) }));
  },

  fetchCredits: async () => {
    try {
      const credits = await aiApi.getCredits();
      set({ credits });
    } catch {
      // 크레딧 조회 실패 시 기본값 유지 (네트워크 오류 등)
    }
  },

  /** ✨ 영어로 변환하기 — 수동 트리거만 호출 가능 */
  transformMemo: async (id) => {
    set({ isTransforming: true, error: null, audioUrl: null });
    try {
      const result = await aiApi.transform(id);
      // 크레딧 UI 업데이트
      set((s) => ({
        learningResult: result,
        credits: s.credits
          ? { ...s.credits, daily_credits: result.credits_remaining }
          : null,
        // 메모 목록에서 is_transformed 플래그 업데이트
        memos: s.memos.map((m) =>
          m.id === id ? { ...m, is_transformed: true } : m
        ),
      }));
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'object' && detail?.code === 'NO_CREDITS') {
        set({ error: 'NO_CREDITS' });
      } else {
        set({ error: 'AI 변환에 실패했습니다. 잠시 후 다시 시도해주세요.' });
      }
    } finally {
      set({ isTransforming: false });
    }
  },

  generateAudio: async (id) => {
    set({ isGeneratingAudio: true, error: null });
    try {
      const { audio_url } = await audioApi.generate(id);
      set({ audioUrl: audio_url });
    } catch {
      set({ error: '오디오 생성에 실패했습니다.' });
    } finally {
      set({ isGeneratingAudio: false });
    }
  },

  downloadAudio: async (id) => {
    const { download_url } = await audioApi.getDownloadUrl(id);
    // 임시 링크로 브라우저 다운로드 트리거
    const a = document.createElement('a');
    a.href = download_url;
    a.download = `memolish_${id}.mp3`;
    a.click();
  },

  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setInputPanelOpen: (open) => set({ inputPanelOpen: open }),
  openLearningModal: (memoId) =>
    set({ learningModalMemoId: memoId, learningResult: null, audioUrl: null }),
  closeLearningModal: () =>
    set({ learningModalMemoId: null, learningResult: null, audioUrl: null }),
  clearError: () => set({ error: null }),
}));

// ── 필터된 메모 셀렉터 ─────────────────────────────────────────
export const selectFilteredMemos = (state: MemoStore): Memo[] => {
  if (state.activeFilter === 'all') return state.memos;
  return state.memos.filter((m) => m.status === state.activeFilter);
};
