'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useMemoStore } from '@/store/memoStore';
import { memosApi } from '@/lib/api';

interface MemoInputPanelProps {
  onClose: () => void;
}

export function MemoInputPanel({ onClose }: MemoInputPanelProps) {
  const { createMemo } = useMemoStore();
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [urlPreview, setUrlPreview] = useState<{ title: string } | null>(null);
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleUrlBlur = async () => {
    if (!sourceUrl || !sourceUrl.startsWith('http')) return;
    setIsParsingUrl(true);
    try {
      // 임시 메모 없이 파싱만 미리 수행 (미리보기용)
      const res = await fetch(
        `/api/memos/0/parse-url`,  // 실제로는 저장 후 파싱 — MVP에서는 저장 시 처리
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Id': 'preview' },
          body: JSON.stringify({ url: sourceUrl }),
        }
      );
      // URL 파싱은 메모 저장 후 처리하므로 여기서는 제목만 표시
      setUrlPreview({ title: new URL(sourceUrl).hostname });
    } catch {
      setUrlPreview({ title: new URL(sourceUrl).hostname });
    } finally {
      setIsParsingUrl(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      await createMemo(content.trim(), sourceUrl || undefined);
      onClose();
    } catch {
      alert('메모 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const today = new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

  return (
    <>
      {/* 딤드 배경 */}
      <div
        className="fixed inset-0 z-30 bg-black/40"
        onClick={onClose}
      />

      {/* 바텀 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto bg-white rounded-t-2xl shadow-2xl slide-up">
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">새 메모</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {/* 메모 입력 */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="무슨 일이 있었나요? 스케줄, 고민, 배운 것..."
            className="w-full resize-none border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[96px]"
            rows={4}
          />

          {/* URL 첨부 (선택) */}
          <div className="mt-3">
            <label className="text-xs text-gray-500 mb-1.5 block">🔗 링크 첨부 (선택)</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {isParsingUrl && (
              <p className="text-xs text-gray-400 mt-1">링크 정보 불러오는 중...</p>
            )}
            {urlPreview && !isParsingUrl && (
              <p className="text-xs text-indigo-500 mt-1 truncate">🔗 {urlPreview.title}</p>
            )}
          </div>

          {/* 날짜 안내 */}
          <p className="mt-3 text-xs text-gray-400">
            📅 시작: {today} → 종료: {tomorrow} (자동 설정)
          </p>

          {/* 저장 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSaving}
            className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? '저장 중...' : '메모 저장하기'}
          </button>
        </div>
      </div>
    </>
  );
}
