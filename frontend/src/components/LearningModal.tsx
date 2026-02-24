'use client';

import { useEffect } from 'react';
import { X, Volume2, Download, Loader2 } from 'lucide-react';
import { useMemoStore } from '@/store/memoStore';
import type { AIDialogue } from '@/types/memo';

interface LearningModalProps {
  memoId: number;
}

export function LearningModal({ memoId }: LearningModalProps) {
  const {
    memos,
    learningResult,
    isTransforming,
    isGeneratingAudio,
    audioUrl,
    error,
    transformMemo,
    generateAudio,
    downloadAudio,
    closeLearningModal,
    clearError,
  } = useMemoStore();

  const memo = memos.find((m) => m.id === memoId);

  // 모달 열릴 때 자동으로 변환 실행 (캐시가 있으면 API 재호출 없음)
  useEffect(() => {
    transformMemo(memoId);
  }, [memoId]); // eslint-disable-line

  const dialogue: AIDialogue | null = learningResult?.dialogue ?? null;
  const isNoCredits = error === 'NO_CREDITS';

  return (
    <>
      {/* 오버레이 */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={closeLearningModal} />

      {/* 모달 */}
      <div className="fixed inset-x-0 bottom-0 top-16 z-50 max-w-lg mx-auto bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">✨ AI 영어 학습</h2>
          <button onClick={closeLearningModal} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 원본 메모 */}
          {memo && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">📌 원본 메모</h3>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">
                {memo.content}
              </p>
            </section>
          )}

          {/* 로딩 */}
          {isTransforming && (
            <div className="flex flex-col items-center py-10 gap-3 text-indigo-500">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm">✨ AI가 대화문을 만들고 있어요...</p>
            </div>
          )}

          {/* 크레딧 소진 */}
          {isNoCredits && !isTransforming && (
            <div className="text-center py-8 space-y-4">
              <p className="text-2xl">⚠️</p>
              <p className="font-semibold text-gray-800">오늘의 AI 변환 크레딧이 소진되었어요</p>
              <p className="text-sm text-gray-500">자정에 3개가 자동으로 충전됩니다.</p>
              <button
                onClick={() => {
                  clearError();
                  alert('광고 연동 예정 (v2)');
                }}
                className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600"
              >
                🎬 광고 보고 1회 더 변환
              </button>
              <button
                onClick={() => alert('프리미엄 결제 예정 (v2)')}
                className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl font-semibold text-sm hover:bg-yellow-500"
              >
                💎 프리미엄으로 무제한 변환
              </button>
            </div>
          )}

          {/* 변환 결과 */}
          {learningResult && !isTransforming && (
            <>
              {/* 요약 */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">📝 요약</h3>
                <div className="bg-indigo-50 rounded-xl p-3 space-y-2">
                  <p className="text-sm text-gray-800">
                    <span className="mr-1">🇰🇷</span>
                    {learningResult.summary_ko}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="mr-1">🇺🇸</span>
                    {learningResult.summary_en}
                  </p>
                </div>
              </section>

              {/* 대화문 */}
              {dialogue && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">💬 영어 대화문</h3>
                  <p className="text-xs text-gray-500 mb-3">상황: {dialogue.situation}</p>
                  <div className="dialogue-scroll space-y-3">
                    {dialogue.exchanges.map((ex, idx) => (
                      <div
                        key={idx}
                        className={`flex ${ex.speaker === 'B' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                            ex.speaker === 'A'
                              ? 'bg-blue-100 rounded-tl-sm'
                              : 'bg-orange-100 rounded-tr-sm'
                          }`}
                        >
                          <p className="text-sm font-semibold text-gray-800">{ex.line}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{ex.korean}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 오디오 플레이어 */}
              {audioUrl && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <audio controls src={audioUrl} className="w-full h-10" />
                </div>
              )}

              {/* 오디오 액션 */}
              <div className="flex gap-3 pb-2">
                <button
                  onClick={() => generateAudio(memoId)}
                  disabled={isGeneratingAudio}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-indigo-300 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
                >
                  {isGeneratingAudio ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Volume2 size={16} />
                  )}
                  오디오 듣기
                </button>
                <button
                  onClick={() => downloadAudio(memoId)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  <Download size={16} />
                  다운로드
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
