from typing import Tuple


ZIP_MAGIC_SIGNATURES = [
    b"PK\x03\x04",  # Standard ZIP file
    b"PK\x05\x06",  # Empty ZIP file
    b"PK\x07\x08",  # Spanned ZIP file
]


def validate_zip_magic_bytes(file_header: bytes) -> Tuple[bool, str]:
    """
    Validates that uploaded file content begins with genuine ZIP archive magic signatures.
    Protects against malicious executable payloads disguised as .zip.
    """
    if len(file_header) < 4:
        return False, "File is too short to be a valid ZIP archive"

    prefix = file_header[:4]
    for magic in ZIP_MAGIC_SIGNATURES:
        if prefix.startswith(magic):
            return True, "Valid ZIP signature"

    return False, f"Invalid file signature: expected PK zip magic bytes, got {prefix.hex()}"
