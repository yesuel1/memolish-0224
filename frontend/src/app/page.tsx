'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, LogOut } from 'lucide-react';
import { useMemoStore } from '@/store/memoStore';
import { CreditBadge } from '@/components/CreditBadge';
import { MemoBoard } from '@/components/MemoBoard';
import { MemoInputPanel } from '@/components/MemoInputPanel';
import { LearningModal } from '@/components/LearningModal';
import type { MemoStatus } from '@/types/memo';

const STATUS_TABS: { label: string; value: MemoStatus | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '진행 전', value: 'not_started' },
  { label: '진행 중', value: 'in_progress' },
  { label: '완료', value: 'completed' },
  { label: '계속 참조', value: 'keep_reviewing' },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    fetchMemos,
    fetchCredits,
    credits,
    activeFilter,
    setActiveFilter,
    inputPanelOpen,
    setInputPanelOpen,
    learningModalMemoId,
  } = useMemoStore();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMemos();
      fetchCredits();
    }
  }, [status, fetchMemos, fetchCredits]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-indigo-400 text-sm animate-pulse">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <h1 className="text-xl font-bold text-indigo-600 tracking-tight">Memolish</h1>
        <div className="flex items-center gap-2">
          {credits && (
            <CreditBadge credits={credits.daily_credits} isPremium={credits.is_premium} />
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="로그아웃"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 상태 탭 필터 */}
      <nav className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-gray-100 bg-white scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === tab.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 메모 목록 */}
      <main className="flex-1 px-4 py-3 pb-24 overflow-y-auto">
        <MemoBoard />
      </main>

      {/* FAB — 메모 추가 */}
      <button
        onClick={() => setInputPanelOpen(true)}
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
        aria-label="새 메모 추가"
      >
        <Plus size={20} />
        <span className="font-semibold text-sm">메모 추가</span>
      </button>

      {/* 바텀 시트 (메모 입력) */}
      {inputPanelOpen && <MemoInputPanel onClose={() => setInputPanelOpen(false)} />}

      {/* AI 학습 모달 */}
      {learningModalMemoId !== null && <LearningModal memoId={learningModalMemoId} />}
    </div>
  );
}
