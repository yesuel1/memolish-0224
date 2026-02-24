'use client';

import { useState } from 'react';
import { Trash2, ExternalLink } from 'lucide-react';
import type { Memo, MemoStatus } from '@/types/memo';
import { STATUS_LABEL, STATUS_COLOR } from '@/types/memo';
import { useMemoStore } from '@/store/memoStore';

interface MemoCardProps {
  memo: Memo;
}

const ALL_STATUSES: MemoStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'keep_reviewing',
];

export function MemoCard({ memo }: MemoCardProps) {
  const { updateStatus, deleteMemo, openLearningModal } = useMemoStore();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const handleStatusChange = async (status: MemoStatus) => {
    setShowStatusMenu(false);
    await updateStatus(memo.id, status);
  };

  const handleDelete = async () => {
    if (confirm('이 메모를 삭제하시겠어요?')) {
      await deleteMemo(memo.id);
    }
  };

  return (
    <div className="relative bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* 상단: 상태 뱃지 + 날짜 + 삭제 */}
      <div className="flex items-center justify-between mb-2">
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu((v) => !v)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[memo.status]}`}
          >
            {STATUS_LABEL[memo.status]} ▾
          </button>
          {showStatusMenu && (
            <div className="absolute top-7 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-36">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                    s === memo.status ? 'font-semibold text-indigo-600' : 'text-gray-700'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(memo.created_at).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <button
            onClick={handleDelete}
            className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
            aria-label="메모 삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 메모 내용 */}
      <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">{memo.content}</p>

      {/* URL 첨부 미리보기 */}
      {memo.url_title && (
        <a
          href={memo.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1.5 text-xs text-indigo-500 hover:underline line-clamp-1"
        >
          <ExternalLink size={12} />
          {memo.url_title}
        </a>
      )}

      {/* AI 변환 CTA — 핵심 버튼 (수동 원칙) */}
      <div className="mt-3">
        {memo.is_transformed ? (
          <button
            onClick={() => openLearningModal(memo.id)}
            className="w-full py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
          >
            ✅ 대화문 보기
          </button>
        ) : (
          <button
            onClick={() => openLearningModal(memo.id)}
            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
          >
            ✨ 영어로 변환하기
          </button>
        )}
      </div>
    </div>
  );
}
