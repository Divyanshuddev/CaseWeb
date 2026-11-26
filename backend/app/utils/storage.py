import hashlib
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Set, Tuple

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

ALLOWED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_DOCUMENT_EXTENSIONS: Set[str] = {".pdf", ".txt", ".md"}
ALLOWED_EXTENSIONS: Set[str] = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

ALLOWED_MIME_TYPES: Set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "text/markdown",
}

# Magic byte prefixes for strict binary validation
MAGIC_SIGNATURES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".gif": [b"GIF87a", b"GIF89a"],
    ".webp": [b"RIFF"],
    ".pdf": [b"%PDF-"],
}


class StorageBackend(ABC):
    """Abstract storage interface supporting local disk and cloud object storage."""

    @abstractmethod
    async def save_file(
        self,
        file: UploadFile,
        subdir: str,
        allowed_extensions: Optional[Set[str]] = None,
    ) -> Tuple[str, str, int, str]:
        """Save validated upload and return (relative_key, public_url, size_bytes, sha256)."""

    @abstractmethod
    def delete_file(self, file_url: Optional[str]) -> None:
        """Delete a stored file if it exists."""


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: Path, max_bytes: int):
        self.base_dir = base_dir
        self.max_bytes = max_bytes
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save_file(
        self,
        file: UploadFile,
        subdir: str,
        allowed_extensions: Optional[Set[str]] = None,
    ) -> Tuple[str, str, int, str]:
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is missing a filename.",
            )

        ext = Path(file.filename).suffix.lower()
        permitted_exts = allowed_extensions or ALLOWED_EXTENSIONS
        if ext not in permitted_exts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(permitted_exts))}",
            )

        if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported MIME type '{file.content_type}'.",
            )

        contents = await file.read()
        size_bytes = len(contents)
        if size_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )
        if size_bytes > self.max_bytes:
            max_mb = self.max_bytes // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum size limit of {max_mb} MB.",
            )

        if ext in MAGIC_SIGNATURES:
            if not any(contents.startswith(sig) for sig in MAGIC_SIGNATURES[ext]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File contents do not match the declared file format.",
                )
            if ext == ".webp" and contents[8:12] != b"WEBP":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid WEBP image header.",
                )

        # Clean subdir path to prevent path traversal
        safe_subdir = Path(subdir).name if subdir else "general"
        target_dir = self.base_dir / safe_subdir
        target_dir.mkdir(parents=True, exist_ok=True)

        unique_name = f"{uuid.uuid4().hex}{ext}"
        target_path = (target_dir / unique_name).resolve()
        if not str(target_path).startswith(str(self.base_dir.resolve())):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid storage path.",
            )

        target_path.write_bytes(contents)
        sha256 = hashlib.sha256(contents).hexdigest()
        relative_key = f"{safe_subdir}/{unique_name}"
        public_url = f"/uploads/{relative_key}"
        return relative_key, public_url, size_bytes, sha256

    def delete_file(self, file_url: Optional[str]) -> None:
        if not file_url or not file_url.startswith("/uploads/"):
            return
        relative = file_url.removeprefix("/uploads/")
        candidate = (self.base_dir / relative).resolve()
        base_resolved = self.base_dir.resolve()
        if str(candidate).startswith(str(base_resolved)) and candidate.is_file():
            candidate.unlink(missing_ok=True)


class CloudStorageStubBackend(StorageBackend):
    """Cloud-ready adapter hook for S3/GCS compatible storage."""

    def __init__(self, bucket_name: str, endpoint_url: str = ""):
        self.bucket_name = bucket_name
        self.endpoint_url = endpoint_url

    async def save_file(
        self,
        file: UploadFile,
        subdir: str,
        allowed_extensions: Optional[Set[str]] = None,
    ) -> Tuple[str, str, int, str]:
        raise NotImplementedError(
            "Configure boto3/google-cloud-storage client in CloudStorageStubBackend for production S3/GCS uploads."
        )

    def delete_file(self, file_url: Optional[str]) -> None:
        return None


def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.STORAGE_BACKEND.lower() == "s3" and settings.S3_BUCKET_NAME:
        return CloudStorageStubBackend(
            bucket_name=settings.S3_BUCKET_NAME,
            endpoint_url=settings.S3_ENDPOINT_URL,
        )
    return LocalStorageBackend(
        base_dir=settings.upload_path,
        max_bytes=settings.max_upload_bytes,
    )
