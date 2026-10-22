# QPlayer 解锁下载插件

<p><b>简体中文</b> · <a href="README.en.md">English</a></p>

独立音源插件：按歌名搜索，从网易云 / JOOX / 酷我匹配可播直链，供播放和下载。
QPlayer 本体不含在线音源；本插件实现公开的 JavaScript ABI（apiVersion 1.0）。

本项目与网易云、JOOX、酷我或 GDStudio 没有隶属、合作或背书关系，不分发音频或
账号凭据。使用者需自行遵守服务条款与当地法律。

## 右键菜单

QPlayer 的歌曲右键菜单由宿主写死，**插件不能往里面加条目**。对本插件搜到的歌：

| 操作 | 效果 |
|---|---|
| 右键 **缓存歌曲** | 宿主调用本插件 `resolveStream`，把解锁直链下载到 QPlayer 缓存目录 |
| 右键 **复制链接** | 复制当前曲的解锁直链 |
| 播放页 **下载当前** | 复制正在播放的本插件歌曲直链，方便浏览器另存 |

请先把搜索源切到「解锁下载」，搜到歌之后再右键缓存。其他音源插件搜到的歌不会走本插件。

## 功能

| 能力 | 说明 |
|---|---|
| `searchSongs` | 按关键词同时搜已开启的音源 |
| `hotSearch` | 一组常用热搜词 |
| `songDetails` | 从原生 ID 还原歌曲元数据 |
| `resolveStream` | 解锁直链：GDStudio → 酷我波点/mobi，失败则换源 |
| `lyrics` | GDStudio 明文 LRC |
| `share` | 返回直链，供右键「复制链接」 |

设置页可选音源（网易云 / JOOX / 酷我）。播放页入口用于复制当前曲直链。

## 构建

```bash
chmod +x scripts/package.sh
./scripts/package.sh
python3 scripts/verify-package.py dist/*.qplug
```

然后在 QPlayer「设置 → 音源插件 → 导入插件包」选择生成的 `.qplug`。
未签名包导入时会显示代码执行警告。

完整 ABI 见
[插件模板](https://github.com/TIMER-err/qplayer-plugin-template/blob/main/docs/ABI.md)。

## 发布

推送与 `plugin.json` 版本一致的 `v<version>` tag 即触发发布工作流。
正式分发需使用仓库外保存的 P-256 私钥签名；未配置 Secret 时只构建未签名开发包。
