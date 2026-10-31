# 输入与命令

Node.js >=20。仓库根目录 `npm ci` 后，运行 `npx playwright install chromium`；或指定本机浏览器：`BROWSER_CHANNEL=chrome` / `msedge`。优先级：`BROWSER_EXECUTABLE`（绝对路径）→ `BROWSER_CHANNEL` → Playwright Chromium。Windows PowerShell 示例：`$env:BROWSER_CHANNEL='msedge'`。

```sh
node scripts/render_cards.mjs examples/article/cards.json --out dist/article
npm test
```

输入 UTF-8 JSON：

```json
{
  "title": "贴图发布标题",
  "titleCandidates": ["备选标题一", "备选标题二", "备选标题三"],
  "caption": "短配文",
  "status": "ready",
  "adaptation": "原文提炼范围与省略说明，或选题创作依据。",
  "cards": [
    {
      "layout": "cover",
      "kicker": "方法手记",
      "title": "图卡标题",
      "lead": "首图的一句话说明",
      "blocks": [{"label": "编辑建议", "text": "一段文字"}],
      "source": "用户材料第 1 节；或具体来源页面 URL",
      "changes": "本卡如何提炼改写"
    }
  ]
}
```

`layout` 支持 cover、qa、compare、case、checklist、digest、summary。compare 的 blocks 必须恰好两个，形成左右两栏；其余 layout 可有 0—5 个 blocks。每块可用 `text` 或 `items`（字符串数组，最多 6 项），也可同时提供。`quote: true` 将该块显示为引文，表示文字必须人工逐字核对；模板不添加引号冒充原文标点。

每卡必填 title、source、changes、layout；根节点必填 title、caption、adaptation、status、cards。status 仅 ready 或 draft；1—20 张为本工具容量边界，不代表微信限制。缺字段、非法 layout、溢出或输出目录已有文件时退出非零。字段均为纯文本，HTML 被转义。

输出目录需为空，避免旧图混入新稿；失败报告在输出目录中保留，修改输入后换一个空目录重跑。渲染器先检查全部页面，再导出，溢出失败不会产出一套貌似完整的 PNG。未安装浏览器会给出可执行的配置建议；不会自动联网下载。

输出：`01.png` 等、`preview.html`、`contact-sheet.png`（270px 宽缩略图拼版）、`mobile-preview.png`（360px 宽逐张预览）、`cards.json`、`copy.md`、`adaptation.md`、`check-report.json`。报告自动检查不包含法律真实性审核；人工复核另存 `review.json`。
