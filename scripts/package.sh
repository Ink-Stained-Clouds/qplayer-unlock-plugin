#!/usr/bin/env bash
set -euo pipefail

project_dir=$(cd "$(dirname "$0")/.." && pwd)
stage_dir=$(mktemp -d)
trap 'rm -rf "$stage_dir"' EXIT
mkdir -p "$stage_dir/META-INF" "$project_dir/dist"

cp "$project_dir/plugin.json" "$stage_dir/plugin.json"
for directory in src ui assets; do
  if [[ -d "$project_dir/$directory" ]]; then
    cp -R "$project_dir/$directory" "$stage_dir/$directory"
  fi
done

pick_python() {
  local candidate
  for candidate in python python3 py; do
    if ! command -v "$candidate" >/dev/null 2>&1; then
      continue
    fi
    case "$(command -v "$candidate")" in
      *WindowsApps*) continue ;;
    esac
    if "$candidate" -c "import json,hashlib,pathlib,zipfile" >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

PYTHON=$(pick_python) || {
  echo "python3 is required" >&2
  exit 1
}

plugin_id=$(cd "$project_dir" && "$PYTHON" -c "import json; print(json.load(open('plugin.json', encoding='utf-8'))['id'])")
plugin_version=$(cd "$project_dir" && "$PYTHON" -c "import json; print(json.load(open('plugin.json', encoding='utf-8'))['version'])")

"$PYTHON" - "$stage_dir" <<'PY'
import hashlib
import json
import os
import pathlib
import sys

raw = sys.argv[1]
if os.name == "nt" and raw.startswith("/") and len(raw) > 3 and raw[2] == "/":
    raw = raw[1] + ":" + raw[2:]
root = pathlib.Path(raw)
files = {}
for path in sorted(root.rglob("*")):
    if path.is_file() and "META-INF" not in path.relative_to(root).parts:
        name = path.relative_to(root).as_posix()
        files[name] = hashlib.sha256(path.read_bytes()).hexdigest()
(root / "META-INF" / "qplayer-files.json").write_text(
    json.dumps(files, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY

if [[ -n "${QPLAYER_PLUGIN_SIGNING_KEY:-}" ]]; then
  openssl dgst -sha256 -sign "$QPLAYER_PLUGIN_SIGNING_KEY" \
    -out "$stage_dir/META-INF/qplayer.sig.bin" \
    "$stage_dir/META-INF/qplayer-files.json"
  openssl base64 -A -in "$stage_dir/META-INF/qplayer.sig.bin" \
    -out "$stage_dir/META-INF/qplayer.sig"
  rm "$stage_dir/META-INF/qplayer.sig.bin"
fi

output="$project_dir/dist/$plugin_id-$plugin_version.qplug"
if command -v jar >/dev/null 2>&1; then
  (
    cd "$stage_dir"
    jar --create --file "$output" --no-manifest \
      --date=2000-01-01T00:00:00Z -C "$stage_dir" .
  )
else
  "$PYTHON" - "$stage_dir" "$output" <<'PY'
import os
import pathlib
import sys
import zipfile

def win(raw):
    if os.name == "nt" and raw.startswith("/") and len(raw) > 3 and raw[2] == "/":
        return raw[1] + ":" + raw[2:]
    return raw

root = pathlib.Path(win(sys.argv[1]))
output = pathlib.Path(win(sys.argv[2]))
with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(root).as_posix())
PY
fi
printf '%s\n' "$output"
