# QPlayer unlock-download plugin

<p><a href="README.md">简体中文</a> · <b>English</b></p>

This plugin does not search or play songs. Search with NetEase / QQ Music, then:

- right-click **Download** and pick a quality
- or tap **Download current** on the now-playing page

Qualities: 128k / 192k / 320k / lossless / Hi-Res. The host calls that source's
`resolveStream` — the same path playback uses — then the save dialog writes
`Title - Artist.mp3` (or flac/m4a). If the source has no matching rendition it
falls back to the best URL it can give. Needs a QPlayer build with `files.save`
(`D:/desktop/qplayer` in this workspace).

**Cache this song** is still the internal offline copy.

```bash
python scripts/export-cache.py
```

still batch-exports existing `*.cache` files into a Music folder.
