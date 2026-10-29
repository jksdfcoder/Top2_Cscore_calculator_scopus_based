# 下一位 AI 的交接

本次交付是可运行的计算器第一段，不是整个多阶段产品完成。实际目录为 `Cscore_calculator`，原始计划中的 `cscore-web` 为旧建议名称。先读 README、PRODUCT、DESIGN 和 docs/plans 下的完整计划。

## 已实现

纯前端 Nuxt 4 + Nuxt UI 单页；导出引导、批量 CSV、作者确认、缺失与冲突检查、补充历史窗口、歧义匹配人工选择、四种结果、六指标和贡献雷达、本地报告、清空与导入取消。代码不发出个人数据请求，也不写入 localStorage/sessionStorage。文件内容在内存中；浏览器和操作系统如何管理内存不由应用保证。30 MB 单文件上限；大型导入目前仍在主线程。

计算核心位于 app/lib/cscore，状态位于 useAnalysis.ts。原始导出无稳定 EID 时以标题/年份匹配，再以期刊、ISSN、卷期消歧。浏览器用 SHA-256 标记输入；导出审计没有文件名、论文标题、作者 ID 或人工匹配记录。审计目前不能用于恢复完整会话。

## 实际数据验证

本地私有材料在父目录 `docs/research/scopus-export-2026-10-29`，不随新仓库发布。Ioannidis Scopus ID 57226848754，1516 条文献，1488 条截至 2025。TypeScript 与已有独立 Python 实现的四种结果一致：

|模式|含自引|排除所有作者自引|
|---|---:|---:|
|Career|5.32473806892426|5.30644560852974|
|2025|4.927358503034955|4.937274198692969|

这验证实现一致性，不代表与官方冻结值完全相同，也不能代表所有作者/学科。原始验证只有一位；2026-10-29 追加 Schreiber 和 Jumper 两位，见下方 Hm 复核。

与官方 V9 Table 1 同一作者逐指标对比（本地减官方；论文数 1488 与官方 np6025 相同）：

|模式|NC|H|Hm|c|
|---|---:|---:|---:|---:|
|Career 含自引|+13|0|−0.667|−0.0011|
|Career 排自引|+140|0|−0.333|−0.0005|
|2025 含自引|−84|0|−0.263|−0.0030|
|2025 排自引|−60|+1|+0.929|+0.0115|

此前把作者人数口径列为首要怀疑，目前证据不足：新增 Schreiber、Jumper 的 8 种模式中，6 个 Hm 与官方一致（<1e-14）；Schreiber 两种单年 Hm 相差 +0.2，一条边界引用的假设变化即可复现。Ioannidis 的具体差异仍未定位，不应直接归因于快照或修改分母。完整六指标、排查证据和复现方式见 [Hm 复核](docs/qa/hm-validation-2026-10-29.md)。 后续[时间窗口深度复核](docs/qa/window-review-2026-10-29.md)排除了已检查的年度错位、早期窗口遗漏和2026混入；确认日期控件不能还原官方历史快照。另记录了窗口外冲突会过度阻断结果的校验问题，尚未修改生产逻辑。

运行 `CSCORE_PRIVATE_FIXTURES=/absolute/path npm run test:private`。目录需要 `reference/maxlog.json`、`validation-report.json` 和五个原始文件：`ioannidis-publications.csv`、`ioannidis-citations-including-self-full.csv`、`ioannidis-citations-excluding-all-self.csv`、`ioannidis-citations-1996-2021-including-self.csv`、`ioannidis-citations-1996-2021-excluding-all-self.csv`。脚本只输出聚合指标。

已证实的坑：Author CSV 部分 Cited by 空值不能当零；Overview 的 >year 桶不可靠，不用于推断覆盖；非零 <year 桶不能证明排除了 1996 以前引用；26 年窗口需要补充 1996–2021。论文逐行之和与 Scopus summary 可能差 1，不进行人为修正。Hm 的等引次数排序按数值 EID。

## 官方 field/subfield 对照（第二段已完成）

`scripts/build-reference.py` 从 V9 Table 1（父目录 `originDoc`，各约 100 MB）和 Table 2 生成 `public/reference/v9/comparison.json`（约 138 KB，记录各源文件 SHA-256，约 90 秒）。内容：每个 field/subfield 全体 ≥5 篇作者的 c 分位数（Table 2 原值，只基于含自引 c）；每个 subfield 的前 2% 线（含/排自引各一条）；全局第 100,000 名线。加 `--peers-out public/reference/v9/peers` 时另外为每个 subfield × 口径 × 自引设置按对数排名等距抽取最多 160 位上榜作者（姓名、机构、排名、c、六指标；约 7.3 MB，174×2 个文件），构建时用 maxlog 复算每位上榜作者 c 并断言与官方值相差 <1e-6。只覆盖上榜区间（约前 2%），以下没有个人数据。

2% 线的推导：在 Table 1 中取 `rank sm-subfield-1 ≤ 0.02 × sm-subfield-1 count` 的作者的最低 c。已验证：所有"不靠全局前 10 万入选"的作者的排名比例最大值恰为 0.0200（164 个 subfield，中位 0.01998），且全部 348 条 2% 线落在该 subfield 的 c@95 与 c@99 之间（脚本断言）。排自引模式没有官方分位数，只显示 2% 线和前 10 万线。

UI 为 Field → Subfield 选择后显示四种模式的位置；切换不改变本人分数。subfield 由用户自选，不等于官方主 subfield（官方取论文占比最大的 Science-Metrix 类目）。作者级邻近名单（plan 里的"比较作者"）有意未做：数据量大、价值低于全体分位数，需要时再按 subfield 分片。

## Docker

`docker build -t cscore-calculator . && docker run -p 8080:8080 cscore-calculator`。nginx 只托管静态文件，带 CSP（`connect-src 'self' blob:` 是隐私边界）。对容器跑浏览器测试：`BASE_URL=http://localhost:8080 npx playwright test`；首个旅程会在出现 CSP 违规时失败。

## 下一阶段顺序

1. **扩展真实复核**：至少再选不同作者规模、早期论文、合并作者 ID、同名同年文献等案例；私有原始数据不能提交。为每个指标解释与官方差异，而非只比较总分。现在不能承诺“任意 CSV 都能接近官方”。
2. **完成教程**：见 docs/tutorial。16 张截图已逐张审查，结果在 `docs/tutorial/asset-manifest.csv` 和 recording-checklist.md 末尾；这些截图未脱敏，不发布。导出指南现用 `public/tutorial/step1–4.mp4`（2026-10-29 用 ego-browser 录制，录前在页面内把作者姓名、ID、机构、论文、指标替换为占位并隐藏账户区，OCR 逐帧核对；每段约 9 秒、<150 KB，减少动效时不自动播放）。Scopus 界面改版时需重录。
3. **发布准备**：决定托管服务（Docker 镜像或任意静态托管均可），验证其日志/隐私说明；如果不用 nginx.conf，需要把同样的 CSP 头迁过去。检查 CC BY-NC 数据许可是否符合未来用途。CI 只验证，不部署。没有创建生产站点。
4. 根据实际大文件体验再考虑 Web Worker、进度条/取消解析；当前取消会阻止旧结果覆盖，但不能中断已经开始的同步解析。不要先增加账户、数据库或 AI。

## 验证与风险

见 docs/qa/verification.md。独立代码复查已完成并修复未知自引设置、历史桶矛盾和 demo 异步覆盖问题。第二段复查修复：补导入或移除文件不再清空人工匹配决定；指向已不在候选中的 EID 的旧决定会被忽略，该行重新出现可选候选。依赖 audit 在本次检查还有 8 个 low，0 moderate/high/critical；不要为了消警告强制降级 Nuxt。CI 不运行私有数据验证。全量产品计划仍包含未完成任务；不要把阶段复选框全勾上。
