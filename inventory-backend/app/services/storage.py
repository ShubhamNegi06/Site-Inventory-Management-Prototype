import uuid
import boto3
from botocore.config import Config

from app.core.config import settings

_client = boto3.client(
    "s3",
    endpoint_url=settings.R2_ENDPOINT_URL,
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)

BUCKET = settings.R2_BUCKET_NAME


def build_object_key(site_slug: str, sample_id: uuid.UUID, filename: str) -> str:
    unique = uuid.uuid4().hex[:8]
    safe_name = filename.replace("/", "_")
    return f"{site_slug}/{sample_id}/{unique}_{safe_name}"


def upload_file(key: str, file_bytes: bytes, content_type: str) -> None:
    _client.put_object(Bucket=BUCKET, Key=key, Body=file_bytes, ContentType=content_type)


def delete_file(key: str) -> None:
    _client.delete_object(Bucket=BUCKET, Key=key)


def generate_presigned_download_url(key: str, filename: str, expires_in: int = 900) -> str:
    return _client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": BUCKET,
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"',
        },
        ExpiresIn=expires_in,
    )
