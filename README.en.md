# QPlayer unlock-download plugin

<p><a href="README.md">简体中文</a> · <b>English</b></p>

Independent source plugin: search by title, match a playable URL from NetEase /
JOOX / Kuwo, then play or cache it. QPlayer itself has no online sources; this
package implements ABI 1.0.

Not affiliated with NetEase, JOOX, Kuwo, or GDStudio. No audio or credentials
are redistributed. Users must follow the services' terms and local law.

## Right-click menu

The song context menu is owned by the host; **plugins cannot add items to it**.
For tracks found through this plugin:

| Action | Effect |
|---|---|
| **Cache song** | Host calls this plugin's `resolveStream` and writes the unlocked URL into QPlayer's cache |
| **Copy link** | Copies the unlocked stream URL |
| Player-bar **Download current** | Copies the URL of the playing track from this plugin |

Switch the search source to this plugin first. Tracks from other source plugins
do not go through this resolver.

## Build

```bash
./scripts/package.sh
python3 scripts/verify-package.py dist/*.qplug
```
