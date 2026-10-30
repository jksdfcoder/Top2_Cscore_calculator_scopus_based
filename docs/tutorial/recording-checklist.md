# Tutorial preparation and recording checklist

Status: text instructions and functional demo ready; final recording, redacted Scopus screenshots and subtitles not produced.

- Verify current Scopus UI with an authorized personal session; use the exact steps in export-guide.zh.md and the in-app ExportGuide.vue.
- Capture author search → correct profile → Documents export → field selection → citation overview → zero-citation switch → both exclusion modes → supplemental window if needed.
- Before publication, remove names, account initials, institutional subscription branding, profile identifiers, local paths and cookies unless specifically authorized. Never commit raw private source material.
- Record the calculator with synthetic fixtures: import three files, confirm ID 123, show both career and single-year, switch self-citation mode, expand metric table, download, clear.
- Include a recovery example: missing citation file or earlier coverage; add required export and recalculate.
- Explain the radar as six score contributions. Official cohort comparison is deferred.
- Capture desktop and narrow screen; check captions, pointer visibility and absence of unrelated tabs. Verify narration against visible actions before rendering.

Private reference material exists only in the parent workspace at docs/research/scopus-export-2026-10-29/walkthrough.md and its screenshot directory. It is research evidence, not publish-ready tutorial media. The next AI must inspect the actual files and permissions before using them.

## 截图审查结果

2026-10-29 逐张看过 16 张原图。没有裁剪、复制或遮挡，下列是原图现状。明细在 `asset-manifest.csv`。

公开复用计数：`approved-for-public-use` 0 张，`reference-only` 16 张，`needs-recapture` 0 张。

每张都带有登录痕迹：
- 左上角都有 订阅机构署名。
- 右上角深色圆标是账户缩写，旁边有机构建筑图标（图标上没有机构名称）和带红点的通知铃。06、07 的导出弹窗把顶栏压暗，这两个标记仍可读。
- 01、02 搜索框下方是当前账户的 Search History，是登录者自己的近期检索（具体内容不在此记录）。
- 04 至 08 文献列表第一条是示范论文，合著者为 Schippers, Michaëla C. 与 Vermeulen, Nicolaas。这是公开书目，不是账户姓名。
- 画面中没有邮箱、浏览器地址栏、书签、IP 或会话 token。John P.A. Ioannidis（Scopus ID 57226848754，Stanford University School of Medicine）是公开示范作者，作者页上的姓名和机构要保留。
- 界面是当前白底 Scopus（含 Semantic Search、Scopus AI）。03 有 “You are viewing the new author results page” 和 “Use the previous version”。06、07 写着导出上限因系统升级暂降为 5,000 篇。作者页 Awarded grants 带 Beta。

公开前必须先处理，目前一张都还没遮：
- 全部 16 张：模糊左上角 订阅机构署名，以及右上角账户缩写圆标和紧挨着的机构图标。
- 另加 01、02：从 Search History 标题往下整段裁掉或模糊。
- 04 至 08 若按上文去掉一切姓名，可再模糊合著者那一行；Export all 和导出弹窗在该行上方。

这些标记都在页眉，01 和 02 的检索历史在搜索表单下方。模糊之后，Authors 搜索、结果页 Export CSV 与文献 Export all 的区别、字段勾选、Citation overview 的日期、零引开关和排除菜单都还在，所以不必为打码重拍。11 的三个排除选项都没有勾上，页眉数字已经是排除全部作者自引后的 319,210 次引用、h-index 202；展示勾选状态用 13。原图只留在私人研究目录 `docs/research/scopus-export-2026-10-29/`，不要提交进应用仓库。
