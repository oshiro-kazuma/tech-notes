---
title: Vercel に React SPA をデプロイするときの routing 設定
date: 2026-04-22
---

# Vercel に React SPA をデプロイするときの routing 設定

React RouterなどのCSRアプリをVercelにデプロイするとき、直URLにアクセスすると404になる。

## 原因

`/posts/1` に直アクセスすると、Vercelはサーバー側で`/posts/1.html`を探す。SPAではそのファイルは存在しないので404になる。

## 解決策

`vercel.json`にrewritesを設定して、すべてのリクエストを`index.html`に流す。

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

これでどのパスにアクセスしてもReact Routerが処理するようになる。

## 環境変数

APIのURLは環境変数で切り替える。Vercelのダッシュボードで`VITE_API_URL`を設定。

```env
# .env.local（ローカル）
VITE_API_URL=http://localhost:3000

# Vercel（本番）
VITE_API_URL=https://rust-blog-api.fly.dev
```

Viteは`VITE_`プレフィックスの変数だけをクライアントに公開する。
