"""File Manager upload validation — Image/PDF/PPT/Video/Audio (the five
kinds this module accepts). Checks declared content-type and file extension
agree on the same kind, plus a magic-byte sniff for the formats where that's
cheap and reliable (image/PDF/pptx/wav) — full sniffing for every video/audio
container isn't attempted (unlike messaging's stricter image/PDF-only
validator, app/domain/file_validation.py), a reasonable scope line for a
general-purpose file manager rather than a security-sensitive chat surface.
"""
_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/gif": "image",
    "application/pdf": "pdf",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ppt",
    "video/mp4": "video",
    "video/quicktime": "video",
    "video/webm": "video",
    "video/x-msvideo": "video",
    "audio/mpeg": "audio",
    "audio/wav": "audio",
    "audio/x-wav": "audio",
    "audio/ogg": "audio",
    "audio/mp4": "audio",
}

_EXTENSIONS: dict[str, str] = {
    ".jpg": "image", ".jpeg": "image", ".png": "image", ".webp": "image", ".gif": "image",
    ".pdf": "pdf",
    ".ppt": "ppt", ".pptx": "ppt",
    ".mp4": "video", ".mov": "video", ".webm": "video", ".avi": "video",
    ".mp3": "audio", ".wav": "audio", ".ogg": "audio", ".m4a": "audio",
}


class FileValidationError(ValueError):
    pass


def _sniff_kind(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff") or data.startswith(b"\x89PNG\r\n\x1a\n") or data.startswith(b"GIF8"):
        return "image"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image"
    if data.startswith(b"%PDF-"):
        return "pdf"
    if data[:4] == b"PK\x03\x04":  # pptx (and any other zip-based office format)
        return "ppt"
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "audio"
    return None  # video containers / legacy .ppt / mp3 / ogg: not sniffed, content-type+extension only


def validate_upload(*, file_name: str, content_type: str, data: bytes, max_size_bytes: int) -> str:
    """Returns the validated kind, or raises FileValidationError."""
    if len(data) == 0:
        raise FileValidationError("File is empty")
    if len(data) > max_size_bytes:
        raise FileValidationError(f"File exceeds the {max_size_bytes // (1024 * 1024)}MB limit")

    ext = "." + file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    by_content_type = _CONTENT_TYPES.get(content_type.lower())
    by_extension = _EXTENSIONS.get(ext)

    if by_content_type is None:
        raise FileValidationError(f"Unsupported content type: {content_type}")
    if by_extension is None:
        raise FileValidationError(f"Unsupported file extension: {ext or '(none)'}")
    if by_content_type != by_extension:
        raise FileValidationError("File contents don't match the declared file type")

    sniffed = _sniff_kind(data)
    if sniffed is not None and sniffed != by_content_type:
        raise FileValidationError("File contents don't match the declared file type")

    return by_content_type
