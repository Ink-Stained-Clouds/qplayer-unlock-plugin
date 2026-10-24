"use strict";

// 下载工具，不提供搜索曲目。网易云 / QQ 等音源的歌在列表右键「下载」选音质，
// 或点播放页「下载当前」。真正拉流的是宿主 resolveStream，跟播放同一条路。

function call(method, args) { return qplayer.call(method, args || {}); }

function notify(message) {
  return call("notifications.toast", {message: message}).then(function () { return true; },
      function () { return false; });
}

function downloadCurrent() {
  return call("files.downloadCurrent", {}).then(function () {
    return true;
  }, function (error) {
    var text = error && error.message ? error.message : String(error || "");
    if (text.indexOf("no song") >= 0) return notify("当前没有正在播放的歌曲");
    if (text.indexOf("not implemented") >= 0 || text.indexOf("save dialog") >= 0) {
      return notify("当前 QPlayer 没有保存对话框，请用带 files.save 的构建");
    }
    return notify("下载失败：" + text);
  });
}

function helpDialog() {
  return {
    title: "解锁下载",
    subtitle: "不提供搜索",
    icon: "download",
    body: [
      {type: "text", style: "body",
        text: "本插件不提供歌曲搜索。请用网易云或 QQ 音乐搜歌，再右键下载并选音质。"},
      {type: "text", style: "caption",
        text: "宿主弹出音质选择后，按播放同一条 resolveStream 拉流，并写入封面和歌词。"}
    ]
  };
}

function downloadDialog(args) {
  if (args && (args.action === "save" || args.action === "open")) {
    return downloadCurrent().then(helpDialog);
  }
  var page = helpDialog();
  page.body.push({type: "row", items: [
    {type: "button", id: "save", label: "下载当前", style: "filled", enabled: true}
  ]});
  return page;
}

module.exports = {
  handlers: {
    "ui.download": downloadDialog,
    "ui.help": helpDialog
  }
};
