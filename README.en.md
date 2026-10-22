# QPlayer unlock-download plugin

<p><a href="README.md">简体中文</a> · <b>English</b></p>

Independent source plugin. Requires a QPlayer build with `files.save`
(`D:/desktop/qplayer` in this workspace).

Any QQ / NetEase track: right-click **Download**. The host save dialog writes a
named `.mp3` / `.flac` / `.m4a`. **Cache this song** remains an internal
offline copy.

This plugin's player-bar **Download current** calls `files.save` only for a
track found through this plugin.

```bash
python scripts/export-cache.py
```

still batch-exports existing `*.cache` files into a Music folder.
