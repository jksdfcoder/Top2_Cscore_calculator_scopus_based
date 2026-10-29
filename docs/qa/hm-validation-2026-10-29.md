# Hm 真实样本复核 — 2026-10-29

结论：新增两位作者的 CSV 复核，不修改 Hm 公式。John Jumper 的四种 Hm、Michael Schreiber 的两种 career Hm 与官方 V9 一致（误差 < 1e-14）。目前没有证据支持“按 CSV 作者 ID 数计分母会普遍算错”；Ioannidis 的差异尚未定位，不能直接归因于快照更新。

## 获取和计算

使用用户授权的现有 Scopus 登录会话，通过界面的 Export all → CSV 和 Citation overview → Export 下载。没有调用 Scopus API、SciVal 或编写网站爬虫。机构访问显示 HKU Libraries；这里是浏览器导出权限，未使用 HKU API。新原始 CSV、带账户标识的操作截图和逐篇诊断均留在仓库外部 `../docs/research/hm-validation-2026-10-29/`。

- Schreiber, Michael：Scopus ID 22998421900，Chemnitz，387 篇，与官方 np6025 相同。一个文献 CSV + 两种自引设置的 2001–2025 和 1996–2021 窗口，共五个文件。重叠年度逐篇核对一致；只取 1996–2025，排除 <1996 和 >2025。
- Jumper, John M.：Scopus ID 36717725300，DeepMind，32 篇，与官方 np6025 相同。最早论文 2010 年；文献和两种自引窗口，共三个文件。逐篇 <2001 均为零，能证明 career 的早期覆盖。
- 比较官方 V9 的同名、同机构行，而非拿作者页当前 lifetime h-index 对比 2025 指标。论文数量相同不证明逐篇记录完全相同。
- 生产 TypeScript 核心与独立 Python 实现的六指标和 c-score 对拍：两位作者各四种模式全部通过（指标容差 1e-10，c-score 1e-12）。官方六指标代回 V9 maxlog 的 c-score 也逐模式验证到 1e-12。

## 新样本结果

数值顺序为“本地 CSV / 官方 V9”。Δc = 本地 − 官方。这里只发布聚合结果，未发布逐篇 Scopus 数据。

|作者|模式|Hm 本地 / 官方|c 本地 / 官方|Δc|
|---|---|---:|---:|---:|
|Schreiber|Career 含自引|32.671367521 / 32.671367521|3.874622226 / 3.874541104|+0.000081122|
|Schreiber|Career 排全部作者自引|28.888034188 / 28.888034188|3.796888340 / 3.796845337|+0.000043003|
|Schreiber|2025 含自引|4.158333333 / 3.958333333|2.472409160 / 2.460300008|+0.012109152|
|Schreiber|2025 排全部作者自引|4.158333333 / 3.958333333|2.472541196 / 2.460077585|+0.012463610|
|Jumper|Career 含自引|3.753005877 / 3.753005877|3.262770471 / 3.261816893|+0.000953578|
|Jumper|Career 排全部作者自引|3.628005877 / 3.628005877|3.251729822 / 3.250779496|+0.000950326|
|Jumper|2025 含自引|2.388864463 / 2.388864463|3.477007334 / 3.474187836|+0.002819498|
|Jumper|2025 排全部作者自引|2.388864463 / 2.388864463|3.475123298 / 3.472299581|+0.002823717|

完整六指标与差值见 [hm-validation-summary.json](hm-validation-summary.json)。官方数字来源为 John P. A. Ioannidis 的 [Elsevier V9 Table 1](https://doi.org/10.17632/btchxktzyw.9)，源数据 CC BY-NC 3.0；不将其改标为 MIT。

## Hm 的具体排查

参考 [Schreiber 的原始论文](https://arxiv.org/abs/0805.2000) 和 [官方公开 V2 代码](https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/2) `top cited scholars - base.py`：按引用数降序、Eid 升序排序，累计 1/n_authors，取不超过该篇引用数的最大累计有效排名。公开代码来自 V2，不能称作已获知的 V9 生产源码。当前独立实现采用这个规则，不用 h/作者平均数，不对 effective rank 四舍五入。

1. **浮点误差**：Ioannidis 用 Python Fraction 做精确分数核对，四模式与浮点计算一致到报告精度，不能解释现有 0.263–0.929 的差值。
2. **并列排序**：Ioannidis 试数值 EID、字符串 EID、并列时作者数正/倒序。三种模式 Hm 都未改变；仅 career 排自引在作者数倒序时恰好等于官方。这不足以支持更改排序规则，且会偏离已公开的实现。
3. **Schreiber 的单引文敏感性**：当前 single-year 的 Hm 是 4.158333333，官方 3.958333333。某篇五作者论文当前 2025 引用为 5；仅在分析副本中将该值假设为 4，Hm 就精确回到官方值，h-index 不变。**这是敏感性情景，不是官方该论文引用数的实证，也没有改写 CSV 或校正生产结果。** 新增纯合成单测固定这一现象。
4. **Ioannidis 的差异仍在**：career 含/排自引 Hm 的差为 −0.666666667 / −0.333333333；single-year 为 −0.263157895 / +0.928571429。排自引 career 可由不止一种单引用假设恢复官方 Hm，其他模式没找到单条 ±1 的边界情景。仅凭作者级总数无法唯一反推旧的逐篇引用、作者列表、EID 集合或 V9 排序细节。

新增样本共 8 个模式中，6 个 Hm 与官方一致，2 个为 Schreiber 的单年差异。这提升了实现可信度，但样本小、非随机，不能转成总体准确率。

## 实际遇到的匹配边界

Schreiber 有两条同标题、同年、同期刊、同卷期但不同 EID 的记录。论文导出分别是 12 引用和 0 引用；Overview 的两行都给同一个 ISSN，不能据 ISSN 自动确认归属。两条记录作者次序和人数相同。

程序默认保留歧义并阻止结果，这是正确行为。研究探针对每个窗口人工提供两种一致的一对一配对，分别重新计算；两种配对的全部六指标、c-score 和覆盖检查均一致。因此本次可以报告不依赖该配对的聚合结果，**不能声称已经证明两条书目记录的归属**，也不把“按当前引用数猜配对”加入产品。后续可改善手动匹配界面，显示 EID、年/卷期、DOI 和引文窗口供用户辨认；现有候选在这类情形的信息不足。

## 复现

新通用探针只读取外部 manifest，输出输入指纹、人工决定数量和聚合指标，不输出原始题名、作者 ID 或文件路径：

```sh
CSCORE_SAMPLE_MANIFEST=/absolute/path/schreiber-manifest.json npm run validate:sample
CSCORE_SAMPLE_MANIFEST=/absolute/path/jumper-manifest.json npm run validate:sample
```

本机 manifest 与原始文件位于前述仓库外目录，不在 CI 或公开仓库中。manifest 格式：

```ts
{
  authorIds: string[],
  files: string[], // 相对 manifest 目录的路径，或绝对路径
  decisions?: Record<string, string>, // 解析器 content ID:physical row → 人工确认 EID
  expected: { scope, selfMode, metrics: { NC, H, Hm, NCS, NCSF, NCSFL }, cScore }[],
  official?: { scope, selfMode, metrics, cScore }[]
}
```

expected 必须提供四种模式的独立计算结果。官方差值只报告，不通过调参强制归零。私人分析脚本还保存了双配对不变性、重叠年份、精确分数及边界敏感性检查。

下一步最有价值的是取得官方冻结的逐篇输入或作者团队的 V9 实现说明；否则继续增加案例只能约束原因，无法唯一证明 Ioannidis 差异根源。当前不修改生产 Hm 计算规则，不把当前导出冒充官方冻结结果。

## 本次验证

`npm test`：34 项通过；`npm run typecheck`、`npm run format:check` 通过。Ioannidis 原私有 parity 脚本及两个新样本 manifest 探针均通过；将 expected 的 NC 人为加 1 时，通用探针按预期报错退出。新加入的是研究脚本、合成边界测试和文档，未改变页面或生产计分逻辑，本次未重跑全套 UI 测试。
