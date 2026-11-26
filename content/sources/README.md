# 典籍原始文本

| 文件 | 书名 | 说明 |
|---|---|---|
| `ziping.txt` | 子平真诠 | 清·沈孝瞻原著（仅原文） |
| `ditiansui.txt` | 滴天髓阐微 | 原文 + 原注 + 清·任铁樵注 |
| `qiongtong.txt` | 穷通宝鉴 | 清·余春台编 |

来源：殆知阁古籍语料 <https://github.com/garychowcmu/daizhigev20>（`易藏/术数/`），均为公有领域古籍文本。

`npm run build:books` 会把这些文本解析为 `src/content/books/*.json`（结构化章节，供阅读器使用）。

**校勘说明**：殆知阁版《子平真诠》正文仅保留了首末两章的标题，其余 46 章连排。已参照 china-testing/bazi 仓库的《子平真诠原本》分章，在对应位置补入章节标题（只补标题，正文未改动）。
