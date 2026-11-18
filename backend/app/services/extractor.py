import os
import zipfile
import shutil
from pathlib import Path
from typing import Tuple, List
from backend.app.core.config import settings


class SafeExtractionError(Exception):
    """Raised when an archive violates security constraints."""
    pass


def is_symlink(zip_info: zipfile.ZipInfo) -> bool:
    # 0o120000 is the Unix file mode bit for symbolic links
    mode = zip_info.external_attr >> 16
    return (mode & 0o120000) == 0o120000


def safe_extract_zip(
    zip_path: str,
    target_dir: str,
    max_extracted_bytes: int = settings.MAX_EXTRACTED_SIZE_BYTES,
    max_file_count: int = settings.MAX_FILE_COUNT,
) -> Tuple[int, int]:
    """
    Safely unpacks a ZIP archive into target_dir with enterprise-grade defenses:
    - Path traversal (Zip Slip) rejection
    - Symlink and junction rejection
    - Decompression bomb protection (file count and uncompressed bytes limits)
    - Rejection of absolute paths or drive letters
    Returns: (extracted_file_count, total_uncompressed_bytes)
    """
    if not zipfile.is_zipfile(zip_path):
        raise SafeExtractionError("Invalid archive: file is not a valid ZIP file.")

    target_path = Path(target_dir).resolve()
    target_path.mkdir(parents=True, exist_ok=True)

    extracted_count = 0
    total_bytes = 0

    with zipfile.ZipFile(zip_path, "r") as zf:
        infolist = zf.infolist()

        # 1. File Count Check
        if len(infolist) > max_file_count:
            raise SafeExtractionError(
                f"Archive exceeds maximum allowed file count: {len(infolist)} > {max_file_count}"
            )

        # 2. Cumulative Uncompressed Size Pre-Check
        total_declared_size = sum(item.file_size for item in infolist)
        if total_declared_size > max_extracted_bytes:
            raise SafeExtractionError(
                f"Archive declared uncompressed size exceeds limit: {total_declared_size} > {max_extracted_bytes} bytes."
            )

        # 3. Member Validation & Extraction
        for member in infolist:
            # Check for symlinks
            if is_symlink(member):
                raise SafeExtractionError(
                    f"Security violation: Symbolic links are forbidden in archive: '{member.filename}'"
                )

            # Check for path traversal patterns
            raw_name = member.filename.replace("\\", "/")
            if raw_name.startswith("/") or ".." in raw_name.split("/"):
                raise SafeExtractionError(
                    f"Security violation: Path traversal detected in archive path: '{member.filename}'"
                )

            # Prevent Windows absolute drive letters e.g. C:
            if ":" in raw_name:
                raise SafeExtractionError(
                    f"Security violation: Absolute path indicator in archive: '{member.filename}'"
                )

            # Canonical path resolution check
            destination = (target_path / raw_name).resolve()
            try:
                # Ensure destination resides strictly inside target_path
                destination.relative_to(target_path)
            except ValueError:
                raise SafeExtractionError(
                    f"Security violation: Path escapes target directory: '{member.filename}'"
                )

            # Skip directory entries
            if member.is_dir() or raw_name.endswith("/"):
                destination.mkdir(parents=True, exist_ok=True)
                continue

            # Ensure parent directories exist
            destination.parent.mkdir(parents=True, exist_ok=True)

            # Extract file content safely with byte tracking
            file_bytes = 0
            with zf.open(member, "r") as source, open(destination, "wb") as target:
                while True:
                    chunk = source.read(65536)
                    if not chunk:
                        break
                    file_bytes += len(chunk)
                    total_bytes += len(chunk)
                    if total_bytes > max_extracted_bytes:
                        # Clean up partial directory on bomb detection
                        shutil.rmtree(target_dir, ignore_errors=True)
                        raise SafeExtractionError(
                            f"Archive exceeded maximum allowed extraction size during extraction ({max_extracted_bytes} bytes)."
                        )
                    target.write(chunk)

            extracted_count += 1

    return extracted_count, total_bytes
