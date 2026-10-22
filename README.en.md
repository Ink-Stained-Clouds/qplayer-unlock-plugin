# QPlayer unlock-download plugin

<p><a href="README.md">简体中文</a> · <b>English</b></p>

Independent source plugin: search by title, match a playable URL from NetEase /
JOOX / Kuwo. QPlayer itself has no online sources; this package implements ABI 1.0.

Downloads of arbitrary QQ Music / NetEase tracks do **not** go through this plugin
(the host owns the song context menu). They go through each source's
`resolveStream`. Use the patched NetEase and QQ plugins: unplayable, trial, or VIP
tracks are rematched, and right-click **Cache song** writes the full unlocked
stream into QPlayer's cache.

Not affiliated with NetEase, JOOX, Kuwo, QQ Music, or GDStudio.

## Build

```bash
./scripts/package.sh
python3 scripts/verify-package.py dist/*.qplug
```
