# Scopus CSV 导出说明（已核对 2026-10-29 UI）

需要用户自己的 Scopus 导出权限。本站不索要账户、API key，也不代爬数据。

1. Authors 搜索本人，核对 Author ID、机构和文献归属，进入作者页。
2. Documents 区域选择 **Export all → CSV**。不要使用作者搜索结果的 Export CSV，它导出的是另一类表。
3. 保留 Citation information，增加 **Serial identifiers (e.g. ISSN)**，关闭 **Truncate to optimize for Excel**，下载文献 CSV。
4. 返回作者页，打开 Citation overview，选择包含 2025 的窗口（例如 2000–2025）。关闭 **Hide documents with 0 citations**，不启用引用排除，导出 CSV。
5. 在 Exclude citations 选择 **Exclude self citations of all authors**，再导出一次。“Selected author”不等价。
6. 三份原始 CSV 一起拖入计算器，确认自己的 Scopus Author ID，计算。无需自己合并文件。
7. 若提示职业生涯早期覆盖不足，针对所缺自引模式追加 **1996–2021** Citation overview 导出。仍保留零引文文献。保留之前文件，再拖入补充 CSV。

Career 指收到引用的年份 1996–2025；single-year 指 2025 年收到的引用，不是只看 2025 年发表的论文。所有论文均限发表年份截至 2025。UI 当前窗口上限 26 年；无法凭非零的 <2000 桶判断其中是否有 1996 年前引用。

下载审计 JSON 或指标 CSV 均在本地创建。刷新、关闭或 Clear all data 清除当前应用会话。输出是当前导出快照的估算，官方采用固定历史快照。
