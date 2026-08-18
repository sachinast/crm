"""Attachment upload validation for in-app messaging.

Checks three independent signals — declared content-type, file extension, and
a magic-byte sniff of the actual bytes — and requires all three to agree on
the same kind. This catches the common spoofing case (a renamed executable
labeled `image/png`) without a heavyweight dependency like python-magic;
it is not exhaustive content security scanning.
"""
from app.models.enums import AttachmentKind

_ALLOWED_CONTENT_TYPES: dict[str, AttachmentKind] = {
    "image/jpeg": AttachmentKind.image,
    "image/png": AttachmentKind.image,
    "image/webp": AttachmentKind.image,
    "application/pdf": AttachmentKind.pdf,
}

_ALLOWED_EXTENSIONS: dict[str, AttachmentKind] = {
    ".jpg": AttachmentKind.image,
    ".jpeg": AttachmentKind.image,
    ".png": AttachmentKind.image,
    ".webp": AttachmentKind.image,
    ".pdf": AttachmentKind.pdf,
}


def _sniff_kind(data: bytes) -> AttachmentKind | None:
    if data.startswith(b"\xff\xd8\xff"):
        return AttachmentKind.image  # JPEG
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return AttachmentKind.image  # PNG
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return AttachmentKind.image  # WEBP
    if data.startswith(b"%PDF-"):
        return AttachmentKind.pdf
    return None


class FileValidationError(ValueError):
    pass


def validate_attachment(*, file_name: str, content_type: str, data: bytes, max_size_bytes: int) -> AttachmentKind:
    """Returns the validated AttachmentKind, or raises FileValidationError."""
    if len(data) == 0:
        raise FileValidationError("File is empty")
    if len(data) > max_size_bytes:
        raise FileValidationError(f"File exceeds the {max_size_bytes // (1024 * 1024)}MB limit")

    ext = ""
    if "." in file_name:
        ext = "." + file_name.rsplit(".", 1)[-1].lower()

    by_content_type = _ALLOWED_CONTENT_TYPES.get(content_type.lower())
    by_extension = _ALLOWED_EXTENSIONS.get(ext)
    by_sniff = _sniff_kind(data)

    if by_content_type is None:
        raise FileValidationError(f"Unsupported content type: {content_type}")
    if by_extension is None:
        raise FileValidationError(f"Unsupported file extension: {ext or '(none)'}")
    if by_sniff is None:
        raise FileValidationError("File contents don't match a supported image or PDF format")
    if not (by_content_type == by_extension == by_sniff):
        raise FileValidationError("File contents don't match the declared file type")

    return by_content_type
