---
title: tech notesを作った
layout: default
parent: Notes
nav_order: 1
---

# tech notesを作った

GitHub Pagesでtechnotesを作った。

## 構成

- Jekyll（GitHub Pagesのデフォルト機能）
- テーマ: just-the-docs
- ビルドはGitHubが自動でやってくれるのでNode.jsもRubyも不要

## ノートの追加方法

`notes/` 以下にMarkdownファイルを置くだけ。

```markdown
---
title: タイトル
layout: default
parent: Notes
nav_order: 1
---

内容
```

mainブランチにpushすると自動で公開される。
