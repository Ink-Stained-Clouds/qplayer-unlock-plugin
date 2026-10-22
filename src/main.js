"use strict";

// 独立解锁音源。宿主右键菜单写死，插件加不进去；任意音源的下载必须走
// 该音源自己的 resolveStream。QQ/网易那两份插件已把缓存链换成可下载的解锁直链。
// 本插件负责搜索解锁，以及播放页复制当前曲直链。

var kuwo = require("./kuwo");

function call(method, args) { return qplayer.call(method, args || {}); }

var GD_API = "https://music-api.gdstudio.xyz/api.php";
var SOURCE_KEY = "unlockSources";
var DEFAULT_SOURCES = ["netease", "joox"];
var SOURCE_LABELS = {
  netease: "网易云",
  joox: "JOOX",
  kuwo: "酷我"
};
var HOT = ["海阔天空", "晴天", "起风了", "夜曲", "告白气球", "稻香", "演员", "光年之外"];

function text(value) { return String(value == null ? "" : value); }

function parseJson(body) {
  try { return JSON.parse(body); } catch (_) { return null; }
}

function httpGet(url, headers, timeoutMs) {
  return call("http.request", {
    url: url, method: "GET", headers: headers || {}, timeoutMs: timeoutMs || 8000
  }).then(function (response) {
    if (!response || response.status < 200 || response.status >= 300) return null;
    return text(response.body);
  }, function () { return null; });
}

function notify(message) {
  return call("notifications.toast", {message: message}).then(function () { return true; },
      function () { return false; });
}

function loadJson(key, fallback) {
  return call("storage.get", {key: key}).then(function (value) {
    if (value == null || value === "") return fallback;
    if (typeof value === "string") {
      var parsed = parseJson(value);
      return parsed == null ? fallback : parsed;
    }
    return value;
  }, function () { return fallback; });
}

function saveJson(key, value) {
  return call("storage.put", {key: key, value: JSON.stringify(value)});
}

function enabledSources() {
  return loadJson(SOURCE_KEY, DEFAULT_SOURCES).then(function (list) {
    if (!list || !list.length) return DEFAULT_SOURCES.slice();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (SOURCE_LABELS[list[i]] && out.indexOf(list[i]) < 0) out.push(list[i]);
    }
    return out.length ? out : DEFAULT_SOURCES.slice();
  });
}

function bitrate(quality) {
  return quality === "standard" ? "128" : "320";
}

function encodeId(meta) {
  return encodeURIComponent(meta.source) + ":" + encodeURIComponent(String(meta.id))
      + ":" + encodeURIComponent(text(meta.name))
      + ":" + encodeURIComponent(text((meta.artist || []).join(",")))
      + ":" + encodeURIComponent(text(meta.album))
      + ":" + encodeURIComponent(text(meta.pic_id))
      + ":" + encodeURIComponent(text(meta.url_id || meta.id))
      + ":" + encodeURIComponent(text(meta.lyric_id || meta.id));
}

function decodeId(raw) {
  var parts = String(raw || "").split(":");
  if (parts.length < 2) return null;
  function dec(i) {
    try { return decodeURIComponent(parts[i] || ""); } catch (_) { return parts[i] || ""; }
  }
  var artists = dec(3);
  return {
    source: dec(0),
    id: dec(1),
    name: dec(2),
    artist: artists ? artists.split(",") : [],
    album: dec(4),
    pic_id: dec(5),
    url_id: dec(6) || dec(1),
    lyric_id: dec(7) || dec(1)
  };
}

function artistNames(item) {
  var names = item && item.artist;
  if (Object.prototype.toString.call(names) === "[object Array]") {
    var out = [];
    for (var i = 0; i < names.length; i++) {
      if (names[i]) out.push(text(names[i]));
    }
    return out;
  }
  var single = text(names);
  return single ? [single] : [];
}

function gdPic(source, picId, size) {
  if (!picId) return Promise.resolve("");
  if (source === "kuwo") return Promise.resolve("");
  return httpGet(GD_API + "?types=pic&source=" + encodeURIComponent(source)
      + "&id=" + encodeURIComponent(picId) + "&size=" + (size || 300),
      {"User-Agent": "qplayer/1.0"}).then(function (body) {
    var obj = parseJson(body);
    var url = obj && obj.url;
    return url ? String(url).replace(/\\/g, "") : "";
  }, function () { return ""; });
}

function songDto(item, artworkUrl, thumbUrl) {
  var names = artistNames(item);
  var artists = [];
  for (var i = 0; i < names.length; i++) {
    artists.push({id: names[i], name: names[i]});
  }
  var albumName = text(item.album);
  var dto = {
    id: encodeId({
      source: item.source,
      id: item.id,
      name: item.name,
      artist: names,
      album: albumName,
      pic_id: item.pic_id,
      url_id: item.url_id || item.id,
      lyric_id: item.lyric_id || item.id
    }),
    title: text(item.name) || "未知歌曲",
    durationMs: 0,
    artworkUrl: artworkUrl || "",
    artworkThumbUrl: thumbUrl || artworkUrl || "",
    artists: artists,
    playable: true,
    trial: false,
    restricted: false
  };
  if (albumName) dto.album = {id: albumName, name: albumName};
  return dto;
}

function withArtwork(item) {
  if (!item || !item.id) return Promise.resolve(null);
  return gdPic(item.source, item.pic_id, 300).then(function (url) {
    var thumb = url;
    if (url && url.indexOf("param=") < 0 && url.indexOf("music.126.net") >= 0) {
      thumb = url + (url.indexOf("?") >= 0 ? "&" : "?") + "param=140y140";
    }
    return songDto(item, url, thumb);
  });
}

function gdSearch(source, query, count) {
  return httpGet(GD_API + "?types=search&source=" + encodeURIComponent(source)
      + "&name=" + encodeURIComponent(query) + "&count=" + (count || 20) + "&pages=1",
      {"User-Agent": "qplayer/1.0"}).then(function (body) {
    var list = parseJson(body);
    if (!list || !list.length) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      if (!item.id || !item.name) continue;
      item.source = item.source || source;
      out.push(item);
    }
    return out;
  }, function () { return []; });
}

function searchAll(query, limit) {
  return enabledSources().then(function (sources) {
    var jobs = [];
    for (var i = 0; i < sources.length; i++) {
      (function (source) {
        if (source === "kuwo") {
          jobs.push(kuwo.searchSongs(query, "", "", limit));
        } else {
          jobs.push(gdSearch(source, query, limit));
        }
      })(sources[i]);
    }
    return Promise.all(jobs).then(function (pages) {
      var seen = {};
      var items = [];
      for (var p = 0; p < pages.length; p++) {
        var list = pages[p] || [];
        for (var j = 0; j < list.length; j++) {
          var item = list[j];
          var key = item.source + ":" + item.id;
          if (seen[key]) continue;
          seen[key] = true;
          items.push(item);
        }
      }
      return items;
    });
  });
}

function searchSongs(args) {
  var query = text(args && args.query).trim();
  if (!query) return {items: [], nextCursor: ""};
  var limit = Math.max(1, Math.min(40, Number(args.limit) || 20));
  return searchAll(query, limit).then(function (items) {
    var jobs = [];
    var cap = Math.min(items.length, 40);
    for (var i = 0; i < cap; i++) jobs.push(withArtwork(items[i]));
    return Promise.all(jobs).then(function (songs) {
      var out = [];
      for (var i = 0; i < songs.length; i++) if (songs[i]) out.push(songs[i]);
      return {items: out, nextCursor: ""};
    });
  });
}

function hotSearch() {
  return HOT.slice();
}

function songDetails(args) {
  var ids = (args && args.ids) || [];
  var metas = [];
  for (var i = 0; i < ids.length && metas.length < 500; i++) {
    var meta = decodeId(ids[i]);
    if (meta && meta.id) metas.push(meta);
  }
  var jobs = [];
  for (var j = 0; j < metas.length; j++) jobs.push(withArtwork(metas[j]));
  return Promise.all(jobs).then(function (songs) {
    var out = [];
    for (var k = 0; k < songs.length; k++) if (songs[k]) out.push(songs[k]);
    return out;
  });
}

function gdUrl(source, id, quality) {
  if (!id) return Promise.resolve(null);
  return httpGet(GD_API + "?types=url&source=" + encodeURIComponent(source)
      + "&id=" + encodeURIComponent(id) + "&br=" + bitrate(quality),
      {"User-Agent": "qplayer/1.0"}).then(function (body) {
    var obj = parseJson(body);
    var url = obj && obj.url;
    return url ? String(url).replace(/\\/g, "") : null;
  }, function () { return null; });
}

function firstUrl(factories) {
  function next(i) {
    if (i >= factories.length) return Promise.resolve(null);
    return factories[i]().then(function (url) {
      return url ? url : next(i + 1);
    }, function () { return next(i + 1); });
  }
  return next(0);
}

function resolveForMeta(meta, quality) {
  var name = text(meta.name);
  var artist = artistNames(meta).join(" ");
  var keyword = artist ? name + " " + artist : name;
  var factories = [];
  if (meta.source === "kuwo" && meta.id) {
    factories.push(function () { return kuwo.url(keyword, name, artist); });
    factories.push(function () { return kuwo.bodian(keyword, name, artist); });
  } else if (meta.source) {
    factories.push(function () { return gdUrl(meta.source, meta.url_id || meta.id, quality); });
  }
  factories.push(function () { return kuwo.bodian(keyword, name, artist); });
  factories.push(function () { return kuwo.url(keyword, name, artist); });
  factories.push(function () { return gdUrl("netease", meta.url_id || meta.id, quality); });
  factories.push(function () {
    return gdSearch("netease", keyword, 8).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (kuwo.isMatch(item.name, artistNames(item).join(" "), name, artist)) {
          return gdUrl("netease", item.url_id || item.id, quality);
        }
      }
      return null;
    });
  });
  factories.push(function () {
    return gdSearch("joox", keyword, 8).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (kuwo.isMatch(item.name, artistNames(item).join(" "), name, artist)) {
          return gdUrl("joox", item.url_id || item.id, quality);
        }
      }
      return null;
    });
  });
  return firstUrl(factories);
}

function streamOf(url) {
  var lower = url.toLowerCase();
  var mime = "audio/mpeg";
  if (lower.indexOf(".flac") >= 0) mime = "audio/flac";
  else if (lower.indexOf(".m4a") >= 0 || lower.indexOf(".mp4") >= 0) mime = "audio/mp4";
  return {
    url: url,
    headers: {},
    mimeType: mime,
    expiresAtMs: Date.now() + 15 * 60 * 1000,
    trial: false,
    cacheable: true
  };
}

function resolveStream(args) {
  var meta = decodeId(args && args.id);
  if (!meta || !meta.id) throw new Error("缺少歌曲 ID");
  return resolveForMeta(meta, args && args.quality).then(function (url) {
    if (!url) throw new Error("歌曲暂无可用播放地址");
    return streamOf(url);
  });
}

function lyrics(args) {
  var meta = decodeId(args && args.id);
  if (!meta) return {assets: []};
  if (meta.source === "kuwo") return {assets: []};
  return httpGet(GD_API + "?types=lyric&source=" + encodeURIComponent(meta.source)
      + "&id=" + encodeURIComponent(meta.lyric_id || meta.id),
      {"User-Agent": "qplayer/1.0"}).then(function (body) {
    var obj = parseJson(body);
    var raw = obj && obj.lyric;
    if (!raw || raw === "NULL" || raw.indexOf("歌词获取失败") >= 0) return {assets: []};
    var assets = [{format: "lrc", role: "original", text: String(raw)}];
    if (obj.tlyric) assets.push({format: "lrc", role: "translation", text: String(obj.tlyric)});
    return {assets: assets};
  }, function () { return {assets: []}; });
}

function share(args) {
  var meta = decodeId(args && args.id);
  if (!meta) return "";
  return resolveForMeta(meta, "exhigh").then(function (url) {
    return url || "";
  });
}

function copyUrl(url) {
  if (!url) return notify("没有可用直链");
  return call("clipboard.write", {text: url}).then(function () {
    return notify("已复制解锁直链");
  });
}

function saveUrl(meta, url) {
  var artist = (meta.artist || []).join(" ");
  var filename = (meta.name || "audio") + (artist ? " - " + artist : "");
  var mime = "audio/mpeg";
  var ext = ".mp3";
  var lower = String(url).toLowerCase();
  if (lower.indexOf(".flac") >= 0) { mime = "audio/flac"; ext = ".flac"; }
  else if (lower.indexOf(".m4a") >= 0 || lower.indexOf(".mp4") >= 0) { mime = "audio/mp4"; ext = ".m4a"; }
  if (filename.toLowerCase().slice(-ext.length) !== ext) filename += ext;
  return call("files.save", {
    url: url,
    filename: filename,
    mimeType: mime,
    headers: {}
  }).then(function (ok) {
    return notify(ok === false ? "已取消保存" : "已保存到所选位置");
  }, function (error) {
    return notify("保存失败：" + (error && error.message ? error.message : error));
  });
}

function downloadCurrent() {
  return call("playback.read", {}).then(function (state) {
    var id = state && state.currentSongId;
    if (!id) {
      return notify("当前不是本插件搜到的歌。QQ/网易云请直接右键「下载」。");
    }
    var meta = decodeId(id);
    if (!meta) return notify("当前歌曲不属于解锁下载插件");
    return resolveForMeta(meta, "exhigh").then(function (url) {
      if (!url) return notify("没有可用直链");
      return saveUrl(meta, url);
    });
  }, function () {
    return notify("读不到当前播放状态");
  });
}

function settingsDialog(args) {
  var action = args && args.action;
  var next = enabledSources();
  if (action && SOURCE_LABELS[action]) {
    var inputs = ((args.payload) || {}).inputs || {};
    next = enabledSources().then(function (list) {
      var on = inputs[action] === true;
      var idx = list.indexOf(action);
      if (on && idx < 0) list.push(action);
      if (!on && idx >= 0 && list.length > 1) list.splice(idx, 1);
      return saveJson(SOURCE_KEY, list).then(function () { return list; });
    });
  }
  return next.then(function (list) {
    var switches = [
      {type: "text", style: "body",
        text: "QQ/网易云请用宿主右键「下载」。本插件搜到的歌可用播放页「下载当前」。"}
    ];
    var keys = ["netease", "joox", "kuwo"];
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      switches.push({
        type: "switch", id: id, label: SOURCE_LABELS[id],
        checked: list.indexOf(id) >= 0,
        desc: id === "kuwo" ? "走酷我直链，适合会员曲。" : "GDStudio 聚合。"
      });
    }
    return {
      title: "解锁下载",
      subtitle: "音源选择",
      icon: "tune",
      body: switches
    };
  });
}

function downloadDialog(args) {
  var action = args && args.action;
  if (action === "copy") {
    return downloadCurrent().then(function () {
      return {
        title: "下载当前",
        subtitle: "解锁下载",
        icon: "download",
        body: [
          {type: "text", style: "body", text: "已尝试保存当前曲。"},
          {type: "text", style: "caption",
            text: "QQ/网易云请在对应列表右键「下载」。本按钮保存本插件当前曲。"},
          {type: "row", items: [
            {type: "button", id: "copy", label: "再保存一次", style: "filled"}
          ]}
        ]
      };
    });
  }
  return {
    title: "下载当前",
    subtitle: "解锁下载",
    icon: "download",
    body: [
      {type: "text", style: "body",
        text: "任意 QQ/网易云歌曲：右键「下载」，弹出保存框后写成 mp3/flac。本按钮保存本插件当前曲。"},
      {type: "text", style: "caption",
        text: "需要本插件当前曲时点「保存文件」。"},
      {type: "row", items: [
        {type: "button", id: "copy", label: "保存文件", style: "filled"}
      ]}
    ]
  };
}

module.exports = {
  handlers: {
    searchSongs: searchSongs,
    hotSearch: hotSearch,
    songDetails: songDetails,
    resolveStream: resolveStream,
    lyrics: lyrics,
    share: share,
    "ui.download": downloadDialog,
    "ui.settings": settingsDialog
  }
};
