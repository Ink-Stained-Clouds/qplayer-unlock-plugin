# QPlayer 解锁下载插件

<p><b>简体中文</b> · <a href="README.en.md">English</a></p>

独立音源插件：按歌名搜索，从网易云 / JOOX / 酷我匹配可播直链。
需要 QPlayer **带 `files.save` 的构建**（本仓库工作区 `D:/desktop/qplayer`）。

任意 QQ / 网易云歌曲：在那条歌上右键 **下载**。宿主弹出保存框，把解锁直链写成
`歌名 - 歌手.mp3`（或 flac/m4a）。「缓存此歌曲」仍是内部离线副本，不是导出文件。

本插件播放页「下载当前」对**本插件搜到并正在播放**的歌调用 `files.save`。

请同时使用已改过的网易云 / QQ 音源插件（官方无版权或仅试听时换源）。

```bash
python scripts/export-cache.py
```

仍可用于把已经缓存的 `*.cache` 批量导出到 Music 文件夹。
