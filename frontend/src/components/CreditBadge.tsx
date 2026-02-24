'use client';

interface CreditBadgeProps {
  credits: number;
  isPremium: boolean;
}

export function CreditBadge({ credits, isPremium }: CreditBadgeProps) {
  if (isPremium) {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold border border-yellow-200">
        💎 프리미엄
      </span>
    );
  }

  const colorClass =
    credits > 1
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : credits === 1
      ? 'bg-orange-50 text-orange-700 border-orange-200'
      : 'bg-red-50 text-red-600 border-red-200';

  return (
    <span
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
      title="오늘 남은 AI 변환 크레딧"
    >
      ✨ {credits}/3
    </span>
  );
}
