"""Read original PDFs; write metadata and first-page images outside the web app.
No complete PDF is copied, modified, uploaded or served.
Requires PyMuPDF; pass its temporary installation with PYTHONPATH if needed.
"""
import argparse
import collections
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path

import pymupdf


def canonical(value):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()).strip()


def inspect(source, index, output):
    source, index, output = source.resolve(), index.resolve(), output.resolve()
    if any(part.lower() in {"public", "dist"} for part in output.parts) or output.is_relative_to(source):
        raise ValueError("Analysis output must be private and outside the original source.")
    output.mkdir(parents=True, exist_ok=True)
    (output / "original-covers").mkdir(exist_ok=True)
    index_doc = pymupdf.open(index)
    index_pages = [page.get_text() for page in index_doc]
    entries, category, pending = [], None, None
    for line in "\n".join(index_pages[:2]).splitlines():
        if re.match(r"^0[1-6] - ", line):
            category = line[5:].strip()
        elif line.startswith("Kit "):
            pending = line.strip()
        elif re.match(r"^\d+ atividades$", line) and pending:
            entries.append({"source_title": pending, "category": category, "index_activities": int(line.split()[0])})
            pending = None
    assert len(entries) == 63, f"Expected 63 index entries, found {len(entries)}"
    by_name = {canonical(e["source_title"]): e for e in entries}
    files, hashes, logical_kits = [], collections.defaultdict(list), collections.defaultdict(list)
    for path in sorted(source.rglob("*.pdf")):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        hashes[digest].append(path)
        logical_kits[canonical(path.stem)].append(path)
    for key, paths in logical_kits.items():
        path = sorted(paths, key=lambda p: (-len(p.parts), str(p)))[0]
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        assert key in by_name, f"Unmapped PDF: {path.name}"
        entry = by_name[key]
        with pymupdf.open(path) as doc:
            cover_text = doc[0].get_text()
            activities_match = re.search(r"(\d+) atividades? para imprimir", cover_text)
            age_match = re.search(r"Indicado para:\s*([^\n]+)", cover_text)
            body_examples, instructions, blank_pages = [], [], []
            word_counts = collections.Counter()
            # Every page is read; only a short, non-comprehensive evidence summary is retained.
            for page_index in range(1, len(doc)):
                text = doc[page_index].get_text()
                if not text.strip():
                    blank_pages.append(page_index + 1)
                lines = [line.strip() for line in text.splitlines() if line.strip()]
                word_counts.update(re.findall(r"[A-Za-zÀ-ÿ]{4,}", text.lower()))
                useful = [line for line in lines if not re.match(r"^(Escola:|Data:|Nome:|Turma:|_{2,})", line)]
                for line in useful:
                    if len(line) > 25 and line not in instructions and len(instructions) < 8:
                        instructions.append(line)
                if page_index in {1, 2, 3, len(doc) - 1}:
                    body_examples.append({"page": page_index + 1, "excerpt": "\n".join(useful)[:700]})
            count = int(activities_match.group(1)) if activities_match else None
            result = {
                **entry, "source_relative_path": str(path.relative_to(source)),
                "sha256": digest, "file_bytes": path.stat().st_size,
                "pdf_pages": len(doc), "activity_pages": len(doc) - 1,
                "cover_activities": count, "age": age_match.group(1).strip() if age_match else None,
                "cover_text": cover_text, "instructions": instructions, "evidence_examples": body_examples,
                "frequent_words": word_counts.most_common(20), "blank_text_pages": blank_pages,
                "page_size_points": [round(doc[0].rect.width, 2), round(doc[0].rect.height, 2)],
                "alternate_files": [{"path": str(p.relative_to(source)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "same_binary": hashlib.sha256(p.read_bytes()).hexdigest() == digest} for p in paths if p != path],
                "source_selection": "ZIP/extracted category reference; variants require owner review" if len(paths) > 1 else "Only available source",
                "checks": {"index_matches_cover": count == entry["index_activities"], "activity_pages_match": len(doc) - 1 == entry["index_activities"]},
            }
            slug = canonical(path.stem).replace(" ", "-")
            cover_name = slug + ".png"
            doc[0].get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False).save(output / "original-covers" / cover_name)
            result["extracted_cover"] = cover_name
            files.append(result)
        print(json.dumps({"kit": path.stem, "pages": result["pdf_pages"], "activities": count, "verified": all(result["checks"].values())}, ensure_ascii=False), flush=True)
    assert len(files) == 63, f"Expected 63 unique kits, found {len(files)}"
    zip_checks = []
    for archive in sorted(source.glob("*.zip")):
        with zipfile.ZipFile(archive) as zipped:
            for name in zipped.namelist():
                if name.lower().endswith(".pdf"):
                    digest = hashlib.sha256(zipped.read(name)).hexdigest()
                    zip_checks.append({"zip": archive.name, "entry": name, "matches_extracted_pdf": digest in hashes})
    report = {"source_root": str(source), "index_path": str(index), "index_sha256": hashlib.sha256(index.read_bytes()).hexdigest(),
              "index_pages": index_pages, "kits": sorted(files, key=lambda e: (e["category"], e["source_title"])),
              "summary": {"pdf_paths": sum(len(paths) for paths in hashes.values()), "unique_kits": len(files),
                          "activities_total": sum(e["index_activities"] for e in files), "zip_pdf_entries": len(zip_checks),
                          "distinct_pdf_binaries": len(hashes), "kits_with_alternate_versions": sum(bool(e["alternate_files"]) for e in files),
                          "all_counts_match": all(all(e["checks"].values()) for e in files),
                          "all_zip_entries_match": all(e["matches_extracted_pdf"] for e in zip_checks)}, "zip_checks": zip_checks}
    (output / "source-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--index", type=Path, required=True)
    parser.add_argument("--private-output", type=Path, required=True)
    args = parser.parse_args()
    inspect(args.source, args.index, args.private_output)
