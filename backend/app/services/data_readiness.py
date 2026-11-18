import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any
from backend.app.services.chunker import chunk_document


def evaluate_data_readiness(extracted_dir: str) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Evaluates enterprise structured and unstructured data readiness for AI and RAG applications.
    Returns: (report_dict, list_of_chunks_to_persist)
    """
    base = Path(extracted_dir).resolve()

    # 1. Structured Data Analysis
    sql_files = []
    total_tables = 0
    tables_with_pk = 0
    total_indexes = 0

    # 2. Unstructured / RAG Documentation Analysis
    doc_files = []
    all_chunks = []

    for root, _, files in os.walk(base):
        for file in files:
            full_path = Path(root) / file
            rel_path = str(full_path.relative_to(base)).replace("\\", "/")
            ext = full_path.suffix.lower()

            if ext == ".sql":
                sql_files.append((rel_path, full_path))
            elif ext in [".md", ".markdown", ".rst", ".txt"] or file.lower().startswith("readme"):
                doc_files.append((rel_path, full_path))

    # Evaluate Structured SQL
    for rel_path, full_path in sql_files:
        try:
            content = full_path.read_text(encoding="utf-8", errors="ignore")
            # Tables
            tables = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_\"\.]+)\s*\((.*?)\);", content, re.I | re.S)
            for tbl_name, body in tables:
                total_tables += 1
                if "primary key" in body.lower():
                    tables_with_pk += 1

            # Indexes
            indexes = re.findall(r"CREATE\s+(?:UNIQUE\s+)?INDEX", content, re.I)
            total_indexes += len(indexes)
        except Exception:
            pass

    if total_tables > 0:
        pk_ratio = tables_with_pk / total_tables
        has_indexes = total_indexes > 0
        structured_score = (pk_ratio * 70.0) + (30.0 if has_indexes else 0.0)
    else:
        # Default baseline if no explicit SQL schemas found
        structured_score = 50.0

    # Evaluate Unstructured Documentation & Chunking
    chunks_with_headings = 0
    total_tokens = 0

    for rel_path, full_path in doc_files:
        try:
            content = full_path.read_text(encoding="utf-8", errors="ignore")
            file_chunks = chunk_document(rel_path, content)
            for ch in file_chunks:
                all_chunks.append(ch)
                total_tokens += ch["token_count"]
                if ch["metadata"].get("headings"):
                    chunks_with_headings += 1
        except Exception:
            pass

    if len(doc_files) > 0 and len(all_chunks) > 0:
        doc_count_score = min(40.0, len(doc_files) * 20.0)
        heading_coverage_ratio = chunks_with_headings / len(all_chunks)
        heading_score = heading_coverage_ratio * 30.0

        # Mean chunk size penalty if too tiny or too huge
        avg_tokens = total_tokens / len(all_chunks)
        if 50 <= avg_tokens <= 400:
            size_score = 30.0
        elif 25 <= avg_tokens <= 600:
            size_score = 20.0
        else:
            size_score = 10.0

        unstructured_score = doc_count_score + heading_score + size_score
    else:
        unstructured_score = 20.0  # Minimal score if documentation is completely missing

    # Weighted Overall Score
    overall_score = round((0.4 * structured_score) + (0.6 * unstructured_score), 1)
    structured_score = round(structured_score, 1)
    unstructured_score = round(unstructured_score, 1)

    # Generate Evidence-Backed Recommendations
    recommendations = []
    if total_tables > 0 and tables_with_pk < total_tables:
        recommendations.append(f"Add PRIMARY KEY constraints to {total_tables - tables_with_pk} tables in SQL schema for relational integrity.")
    if total_tables > 0 and total_indexes == 0:
        recommendations.append("Define database indexes on high-frequency lookup columns to avoid full table scans in RAG retrieval.")
    if len(doc_files) == 0:
        recommendations.append("No technical documentation or README found. Add architectural guides for knowledge assistant indexing.")
    elif chunks_with_headings < len(all_chunks):
        recommendations.append("Structure documentation with clear hierarchical markdown headings (# and ##) to enhance semantic RAG segmentation.")
    if len(all_chunks) > 0 and (total_tokens / len(all_chunks)) < 40:
        recommendations.append("Document sections are very short; combine brief paragraphs into comprehensive conceptual guides.")

    if not recommendations:
        recommendations.append("Enterprise data and documentation meet production RAG readiness standards.")

    metrics = {
        "structured": {
            "total_sql_files": len(sql_files),
            "total_tables": total_tables,
            "tables_with_primary_key": tables_with_pk,
            "total_indexes": total_indexes,
        },
        "unstructured": {
            "total_doc_files": len(doc_files),
            "total_chunks": len(all_chunks),
            "total_tokens_estimated": total_tokens,
            "chunks_with_headings": chunks_with_headings,
            "average_tokens_per_chunk": round(total_tokens / len(all_chunks), 1) if all_chunks else 0,
        },
    }

    report = {
        "overall_score": overall_score,
        "structured_score": structured_score,
        "unstructured_score": unstructured_score,
        "metrics": metrics,
        "recommendations": recommendations,
        "total_chunks": len(all_chunks),
    }

    return report, all_chunks
