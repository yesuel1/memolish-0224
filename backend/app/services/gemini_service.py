import logging
import json
import os
import certifi

# Windows SSL 인증서 경로 강제 설정 — google.genai 임포트 전에 반드시 먼저 설정
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())

from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an English conversation learning assistant for the Memolish app.

## Your Role
You help Korean users learn practical English by transforming their personal daily memos,
to-dos, and notes into engaging English learning content. The content must be directly
relevant to the user's actual life context — never generic.

## Output Requirements
You MUST return ONLY a valid JSON object — no markdown, no explanation text, no code fences.

{
  "summary_ko": "<string: 2-3 sentence Korean summary>",
  "summary_en": "<string: 2-3 sentence English summary, natural and fluent>",
  "dialogue": {
    "title": "<string: short English title for the dialogue scene>",
    "situation": "<string: 1 sentence in Korean describing the A-B role-play scenario>",
    "exchanges": [
      {"speaker": "A", "line": "<English line>", "korean": "<Korean translation>"},
      {"speaker": "B", "line": "<English line>", "korean": "<Korean translation>"}
    ]
  }
}

## Dialogue Rules
1. Generate 6 to 10 exchanges total (alternating A and B).
2. Use natural, spoken English. Contractions are encouraged.
3. Each line should be 1-2 sentences maximum.
4. ALWAYS return valid JSON only."""


async def transform_memo_with_gemini(source_text: str) -> dict:
    """메모 텍스트를 Gemini API로 변환. 수동 트리거 전용."""
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")

    client = genai.Client(api_key=settings.gemini_api_key)
    user_prompt = (
        "다음 메모를 분석하고 영어 학습 콘텐츠로 변환해 주세요."
        " 반드시 유효한 JSON만 반환하고 다른 텍스트는 포함하지 마세요.\n\n"
        f"---\n{source_text}\n---"
    )
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            response_mime_type="application/json",
        ),
    )
    result = json.loads(response.text)
    logger.info("Gemini 변환 완료 (exchanges=%s)", len(result["dialogue"]["exchanges"]))
    return result
