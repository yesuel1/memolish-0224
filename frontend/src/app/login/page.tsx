'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-yellow-50 to-white px-6">
      {/* 로고 */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-indigo-600 tracking-tight mb-2">
          Memolish
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          내 삶이 영어 교과서<br />
          일상 메모를 초개인화 영어 회화로
        </p>
      </div>

      {/* 카카오 로그인 버튼 */}
      <div className="w-full max-w-sm">
        <button
          onClick={() => signIn('kakao', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-[#FEE500] rounded-2xl shadow-sm text-sm font-semibold text-[#3C1E1E] hover:bg-yellow-300 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#3C1E1E">
            <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.677 5.076 4.2 6.463l-.9 3.337a.3.3 0 0 0 .45.337L9.6 18.6c.79.113 1.594.17 2.4.17 5.523 0 10-3.477 10-7.77C22 6.477 17.523 3 12 3z"/>
          </svg>
          카카오로 계속하기
        </button>
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center">
        로그인하면 메모가 내 계정에 안전하게 저장됩니다
      </p>
    </div>
  );
}
