# gzh-tietu · 橄榄手记贴图

面向律师、企业法务的微信公众号贴图 skill：原文提炼或选题创作 → 图卡分镜 → 本地 HTML 排版 → PNG。沿用橄榄手记视觉语言，默认五张 3:4 图卡。

本仓库交付源码，不自动安装 skill、不上传公众号、不承诺流量。skill 入口为 [SKILL.md](SKILL.md)。

## 运行

需要 Node.js 20+：

```sh
npm ci
npx playwright install chromium
node scripts/render_cards.mjs examples/article/cards.json --out dist/article
node scripts/render_cards.mjs examples/topic/cards.json --out dist/topic
npm test
```

浏览器回归测试需设 `RUN_RENDER_TESTS=1` 后运行 `npm test`（PowerShell：`$env:RUN_RENDER_TESTS='1'`），会验证尺寸、中德文混排、密集引文、输出目录保护，以及溢出时拒绝交付图片。普通 `npm test` 只运行不需要浏览器的输入检查。

已有 Chrome/Edge 可用 `BROWSER_CHANNEL=chrome` 或 `msedge`，不必下载 Chromium。可执行文件通过 `BROWSER_EXECUTABLE` 配置。完整输入与输出说明见 [接口文档](references/interface.md)。输出路径须为空。

## 包含什么

- 五类创作配方：问题解答、规则对比、案例启示、操作清单、学术导读。
- 本地样式模板与纯文本 JSON 输入，输出高清 PNG、手机预览、拼版及可编辑文案。
- 自动检查排版溢出；事实、引文及手机可读性由创作者复核。
- 两组人工编写、无私人信息的演示，详见 [样例说明](examples/SOURCES.md)。

研究来源与许可说明见 [研究记录](references/research.md)。本项目实现独立编写，未引入其他图卡项目代码；沿用仓库创建时选择的 [Apache-2.0 许可证](LICENSE)。
