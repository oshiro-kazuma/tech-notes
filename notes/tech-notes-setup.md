---
layout: page
title: tech notesを作った
---

GitHub Pagesでtechnotesを作った。

## 構成

- Jekyll（GitHub Pagesのデフォルト機能）
- テーマ: minima
- ビルドはGitHubが自動でやってくれるのでNode.jsもRubyも不要

## ノートの追加方法

`notes/` 以下にMarkdownファイルを置くだけ。

```markdown
---
layout: page
title: タイトル
---

内容
```

mainブランチにpushすると自動で公開される。
