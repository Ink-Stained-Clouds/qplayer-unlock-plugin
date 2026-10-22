# QPlayer 解锁下载插件

<p><b>简体中文</b> · <a href="README.en.md">English</a></p>

独立音源插件：按歌名搜索，从网易云 / JOOX / 酷我匹配可播直链。
QPlayer 本体不含在线音源；本插件实现公开的 JavaScript ABI（apiVersion 1.0）。

任意 QQ 音乐 / 网易云歌曲的下载，不走本插件（宿主右键菜单写死，插件加不进去），
而是走对应音源自己的 `resolveStream`。请同时使用已改过的
[网易云插件](https://github.com/TIMER-err/qplayer-netease-plugin) 和
[QQ 音乐插件](https://github.com/TIMER-err/qplayer-qqmusic-plugin)（或本仓库工作区里的同名目录）：
官方无版权、仅试听、需要会员时会换源，右键「缓存歌曲」把完整音轨下到 QPlayer 缓存。

本项目与网易云、JOOX、酷我、QQ 音乐或 GDStudio 没有隶属关系，不分发音频或账号凭据。
使用者需自行遵守服务条款与当地法律。

## 怎么下任意歌曲

| 歌曲来自 | 操作 |
|---|---|
| 网易云音乐 | 列表右键 **缓存歌曲**。灰歌/试听会自动换源后下载 |
| QQ 音乐 | 同上。无版权/会员歌会自动换源后下载 |
| 本插件搜索结果 | 右键 **缓存歌曲**，或播放页 **下载当前** 复制直链 |

设置页可开关本插件自己的搜索音源。播放页「下载当前」只作用于本插件正在播的歌。

## 构建

```bash
chmod +x scripts/package.sh
./scripts/package.sh
python3 scripts/verify-package.py dist/*.qplug
```

完整 ABI 见
[插件模板](https://github.com/TIMER-err/qplayer-plugin-template/blob/main/docs/ABI.md)。
