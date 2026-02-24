import logging
from app.config import settings

logger = logging.getLogger(__name__)


def _get_client():
    if not settings.aws_access_key_id:
        raise RuntimeError("AWS 자격증명이 설정되지 않았습니다. .env 파일을 확인하세요.")
    try:
        import boto3  # lazy import
    except ImportError:
        raise RuntimeError("boto3 패키지가 설치되지 않았습니다. pip install boto3 를 실행하세요.")

    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def upload_to_s3(audio_bytes: bytes, s3_key: str) -> None:
    client = _get_client()
    client.put_object(
        Bucket=settings.aws_s3_bucket_name,
        Key=s3_key,
        Body=audio_bytes,
        ContentType="audio/mpeg",
    )
    logger.info("S3 업로드 완료: %s", s3_key)


def get_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    client = _get_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_s3_bucket_name, "Key": s3_key},
        ExpiresIn=expires_in,
    )
