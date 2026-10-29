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

这验证实现一致性，不代表与官方冻结值完全相同，也不能代表所有作者/学科。仅验证了一位真实作者，应优先扩展样本。

运行 `CSCORE_PRIVATE_FIXTURES=/absolute/path npm run test:private`。目录需要 `reference/maxlog.json`、`validation-report.json` 和五个原始文件：`ioannidis-publications.csv`、`ioannidis-citations-including-self-full.csv`、`ioannidis-citations-excluding-all-self.csv`、`ioannidis-citations-1996-2021-including-self.csv`、`ioannidis-citations-1996-2021-excluding-all-self.csv`。脚本只输出聚合指标。

已证实的坑：Author CSV 部分 Cited by 空值不能当零；Overview 的 >year 桶不可靠，不用于推断覆盖；非零 <year 桶不能证明排除了 1996 以前引用；26 年窗口需要补充 1996–2021。论文逐行之和与 Scopus summary 可能差 1，不进行人为修正。Hm 的等引次数排序按数值 EID。

## 下一阶段顺序

1. **官方 cohort 与 field/subfield 对比**：从 V9 原始官方表构建可复现静态数据 pipeline，记录下载来源、校验和、冻结时间、许可、原列名映射及作者主/次 subfield。保留 career/single-year 和含/不含自引的区别。先做数据契约与 fixture，再接 UI。当前没有 cohort 文件和比较器，不要把已有贡献雷达解释成作者比较。Field/subfield 是比较分组，不是计算 c-score 的输入；用户选择不代表官方学科归属。不需要 SciVal 才能计算。
2. **扩展真实复核**：至少再选不同作者规模、早期论文、合并作者 ID、同名同年文献等案例；私有原始数据不能提交。为每个指标解释与官方差异，而非只比较总分。现在不能承诺“任意 CSV 都能接近官方”。
3. **完成教程**：见 docs/tutorial。父目录已有 walkthrough.md 和 16 张真实操作截图，但包含账户/机构信息，必须逐张审查和脱敏；本仓库未发布这些截图。重新录制时再次核对 Scopus UI、导出权限及窗口上限。未制作最终视频。
4. **发布准备**：决定托管服务，验证其日志/隐私说明和 CSP；无分析服务为默认。检查 maxlog 的 CC BY-NC 数据许可是否符合未来用途。CI 只验证，不部署。没有创建生产站点。
5. 根据实际大文件体验再考虑 Web Worker、进度条/取消解析；当前取消会阻止旧结果覆盖，但不能中断已经开始的同步解析。不要先增加账户、数据库或 AI。

## 验证与风险

见 docs/qa/verification.md。独立代码复查已完成并修复未知自引设置、历史桶矛盾和 demo 异步覆盖问题。依赖 audit 在本次检查还有 8 个 low，0 moderate/high/critical；不要为了消警告强制降级 Nuxt。CI 不运行私有数据验证。全量产品计划仍包含未完成任务；不要把阶段复选框全勾上。
