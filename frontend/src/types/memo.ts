export type MemoStatus = 'not_started' | 'in_progress' | 'completed' | 'keep_reviewing';

export const STATUS_LABEL: Record<MemoStatus, string> = {
  not_started: '진행 전',
  in_progress: '진행 중',
  completed: '완료',
  keep_reviewing: '계속 참조',
};

export const STATUS_COLOR: Record<MemoStatus, string> = {
  not_started: 'bg-red-100 text-red-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  keep_reviewing: 'bg-blue-100 text-blue-700',
};

export interface DialogueExchange {
  speaker: 'A' | 'B';
  line: string;
  korean: string;
}

export interface AIDialogue {
  title: string;
  situation: string;
  exchanges: DialogueExchange[];
}

export interface Memo {
  id: number;
  user_id: string;
  content: string;
  source_url?: string;
  url_title?: string;
  url_description?: string;
  status: MemoStatus;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  is_transformed: boolean;
  ai_summary_ko?: string;
  ai_summary_en?: string;
  ai_dialogue_json?: string;
  audio_s3_key?: string;
}

export interface TransformResult {
  summary_ko: string;
  summary_en: string;
  dialogue: AIDialogue;
  credits_remaining: number;
}

export interface Credits {
  daily_credits: number;
  is_premium: boolean;
  max_daily_credits: number;
}
