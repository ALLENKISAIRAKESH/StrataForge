import re
from typing import List, Dict, Any
from pathlib import Path


def estimate_tokens(text: str) -> int:
    """Estimates token count without external heavy tokenizer: ~4 chars per token."""
    return max(1, len(text) // 4)


def chunk_document(
    file_path: str,
    text: str,
    target_chunk_size: int = 800,  # ~200 tokens
    chunk_overlap: int = 150,     # ~35 tokens
) -> List[Dict[str, Any]]:
    """
    Performs deterministic semantic text chunking with:
    - Heading hierarchy preservation (# Heading, ## Subheading)
    - Source line number tracking (line_start, line_end)
    - Sliding window overlap
    - Clean token estimation
    """
    if not text.strip():
        return []

    lines = text.splitlines(keepends=True)
    chunks = []
    chunk_index = 0

    current_headings = []
    current_chunk_lines = []
    current_chunk_char_count = 0
    chunk_line_start = 1

    for line_idx, line in enumerate(lines, 1):
        # Detect markdown headings
        heading_match = re.match(r"^(#{1,6})\s+(.+)$", line.strip())
        if heading_match:
            level = len(heading_match.group(1))
            heading_text = heading_match.group(2).strip()
            # Prune deeper or equal level headings
            current_headings = [h for h in current_headings if h["level"] < level]
            current_headings.append({"level": level, "title": heading_text})

        line_len = len(line)
        if current_chunk_char_count + line_len > target_chunk_size and current_chunk_lines:
            # Finalize current chunk
            chunk_text = "".join(current_chunk_lines).strip()
            if chunk_text:
                chunks.append({
                    "file_path": file_path,
                    "chunk_index": chunk_index,
                    "content": chunk_text,
                    "token_count": estimate_tokens(chunk_text),
                    "metadata": {
                        "line_start": chunk_line_start,
                        "line_end": line_idx - 1,
                        "headings": [h["title"] for h in current_headings],
                        "char_count": len(chunk_text),
                    },
                })
                chunk_index += 1

            # Prepare sliding overlap
            overlap_lines = []
            overlap_chars = 0
            for prev_line in reversed(current_chunk_lines):
                if overlap_chars + len(prev_line) <= chunk_overlap:
                    overlap_lines.insert(0, prev_line)
                    overlap_chars += len(prev_line)
                else:
                    break

            current_chunk_lines = overlap_lines + [line]
            current_chunk_char_count = sum(len(l) for l in current_chunk_lines)
            chunk_line_start = max(1, line_idx - len(overlap_lines))
        else:
            if not current_chunk_lines:
                chunk_line_start = line_idx
            current_chunk_lines.append(line)
            current_chunk_char_count += line_len

    # Add remainder chunk
    if current_chunk_lines:
        chunk_text = "".join(current_chunk_lines).strip()
        if chunk_text:
            chunks.append({
                "file_path": file_path,
                "chunk_index": chunk_index,
                "content": chunk_text,
                "token_count": estimate_tokens(chunk_text),
                "metadata": {
                    "line_start": chunk_line_start,
                    "line_end": len(lines),
                    "headings": [h["title"] for h in current_headings],
                    "char_count": len(chunk_text),
                },
            })

    return chunks
