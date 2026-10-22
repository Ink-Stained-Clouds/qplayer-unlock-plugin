#!/usr/bin/env python3
"""Copy QPlayer audio cache files into named, playable music files.

QPlayer stores right-click "Cache song" downloads as hashed ``*.cache`` blobs
under the cache root. Plugins cannot read the filesystem, so this runs on the
host and writes ``<title> - <artist>.mp3`` (or ``.flac`` / ``.m4a``) next to
the cache, or into ``--out``.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
from pathlib import Path

INVALID = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
WINDOWS_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}


def detect_ext(head: bytes) -> str:
    if head.startswith(b"fLaC"):
        return ".flac"
    if head.startswith(b"OggS"):
        return ".ogg"
    if len(head) >= 12 and head[4:8] == b"ftyp":
        return ".m4a"
    if head.startswith(b"ID3") or (len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0):
        return ".mp3"
    return ".mp3"


def audio_key(media_id: str) -> str:
    digest = hashlib.sha256(media_id.encode("utf-8")).hexdigest()
    return "v2-" + digest


def safe_name(title: str, artist: str) -> str:
    title = INVALID.sub(" ", (title or "未知歌曲").strip()) or "未知歌曲"
    artist = INVALID.sub(" ", (artist or "").strip())
    name = f"{title} - {artist}".strip(" -") if artist else title
    name = re.sub(r"\s+", " ", name).strip(" .")
    if not name:
        name = "未知歌曲"
    stem = Path(name).stem.upper()
    if stem in WINDOWS_RESERVED:
        name = "_" + name
    return name[:180]


def load_settings(data_dir: Path) -> dict:
    path = data_dir / "config" / "settings.json"
    if not path.is_file():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def load_index(data_dir: Path) -> list[dict]:
    path = data_dir / "indexes" / "media-v2.json"
    if not path.is_file():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    items = payload.get("items") if isinstance(payload, dict) else payload
    return [item for item in (items or []) if isinstance(item, dict) and item.get("id")]


def unique_path(directory: Path, stem: str, ext: str) -> Path:
    candidate = directory / (stem + ext)
    n = 2
    while candidate.exists():
        candidate = directory / f"{stem} ({n}){ext}"
        n += 1
    return candidate


def export(audio_dir: Path, out_dir: Path, items: list[dict]) -> tuple[int, int, int]:
    out_dir.mkdir(parents=True, exist_ok=True)
    files = {path.name: path for path in audio_dir.glob("*.cache") if path.is_file()}
    copied = 0
    skipped = 0
    unnamed = 0
    used = set()

    for item in items:
        media_id = str(item.get("id") or "")
        name = audio_key(media_id) + ".cache"
        source = files.get(name)
        if source is None:
            continue
        used.add(name)
        artist = str(item.get("artist") or item.get("artistNamesCsv") or "").replace(",", " / ")
        stem = safe_name(str(item.get("title") or ""), artist)
        ext = detect_ext(source.read_bytes()[:16])
        dest = unique_path(out_dir, stem, ext)
        if dest.exists() and dest.stat().st_size == source.stat().st_size:
            skipped += 1
            continue
        shutil.copy2(source, dest)
        copied += 1
        print(dest)

    for name, source in sorted(files.items()):
        if name in used:
            continue
        ext = detect_ext(source.read_bytes()[:16])
        dest = unique_path(out_dir, name[:-6], ext)
        shutil.copy2(source, dest)
        unnamed += 1
        print(dest)
    return copied, skipped, unnamed


def main() -> int:
    parser = argparse.ArgumentParser(description="Export QPlayer *.cache audio as named music files")
    parser.add_argument("--data", type=Path, default=Path.home() / ".qplayer",
                        help="QPlayer data dir (default: ~/.qplayer)")
    parser.add_argument("--cache", type=Path, default=None,
                        help="Cache root containing cache/audio (overrides settings.json)")
    parser.add_argument("--out", type=Path, default=None,
                        help="Output folder (default: <cache-root>/Music)")
    args = parser.parse_args()

    data_dir = args.data.expanduser()
    settings = load_settings(data_dir)
    cache_root = args.cache.expanduser() if args.cache else None
    if cache_root is None:
        folder = str(settings.get("cacheFolder") or "").strip()
        cache_root = Path(folder) if folder else data_dir
    audio_dir = cache_root / "cache" / "audio"
    if not audio_dir.is_dir():
        print("no audio cache at " + str(audio_dir), file=sys.stderr)
        return 1

    out_dir = args.out.expanduser() if args.out else cache_root / "Music"
    items = load_index(data_dir)
    copied, skipped, unnamed = export(audio_dir, out_dir, items)
    print(
        "exported {copied} named, {skipped} already present, {unnamed} unnamed -> {out}".format(
            copied=copied, skipped=skipped, unnamed=unnamed, out=out_dir
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
