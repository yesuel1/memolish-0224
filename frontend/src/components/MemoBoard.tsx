'use client';

import { useMemoStore, selectFilteredMemos } from '@/store/memoStore';
import { MemoCard } from './MemoCard';

export function MemoBoard() {
  const { isLoading, error } = useMemoStore();
  const memos = useMemoStore(selectFilteredMemos);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error && error !== 'NO_CREDITS') {
    return (
      <div className="text-center py-12 text-red-500 text-sm">{error}</div>
    );
  }

  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📝</div>
        <p className="text-gray-500 text-sm">
          아직 메모가 없어요.
          <br />
          오늘 있었던 일을 적어보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {memos.map((memo) => (
        <MemoCard key={memo.id} memo={memo} />
      ))}
    </div>
  );
}
