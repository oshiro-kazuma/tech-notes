---
title: tech notesを作った
---

# tech notesを作った

GitHub Pagesでtechnotesを作った。

## 構成

- VitePress
- GitHub Actions でビルド & デプロイ
- publicリポジトリなのでActions無制限

## ノートの追加方法

`docs/notes/` 以下にMarkdownファイルを置いて、`docs/.vitepress/config.ts` のsidebarにリンクを追加するだけ。

mainブランチにpushすると自動で公開される。
