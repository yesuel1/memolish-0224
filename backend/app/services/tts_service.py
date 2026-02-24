import logging
from app.config import settings

logger = logging.getLogger(__name__)


async def generate_tts_audio(exchanges: list[dict]) -> bytes:
    """
    대화문을 Google Cloud TTS로 변환하여 MP3 바이트 반환.
    google-cloud-texttospeech 미설치 시 RuntimeError 발생.
    """
    if not settings.google_application_credentials:
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS가 설정되지 않았습니다.")

    try:
        from google.cloud import texttospeech  # lazy import
    except ImportError:
        raise RuntimeError(
            "google-cloud-texttospeech 패키지가 설치되지 않았습니다.\n"
            "pip install google-cloud-texttospeech 를 실행하세요."
        )

    VOICE_CONFIG = {
        "A": texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Journey-F",
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE,
        ),
        "B": texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Journey-D",
            ssml_gender=texttospeech.SsmlVoiceGender.MALE,
        ),
    }
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=0.9,
    )

    client = texttospeech.TextToSpeechClient()
    segments: list[bytes] = []
    for exchange in exchanges:
        line = exchange.get("line", "")
        if not line:
            continue
        voice = VOICE_CONFIG.get(exchange.get("speaker", "A"), VOICE_CONFIG["A"])
        resp = client.synthesize_speech(
            input=texttospeech.SynthesisInput(text=line),
            voice=voice,
            audio_config=audio_config,
        )
        segments.append(resp.audio_content)

    combined = b"".join(segments)
    logger.info("TTS 생성 완료: %d개 exchanges, %d bytes", len(exchanges), len(combined))
    return combined
