---
title: Next.js + Turborepo + Drizzle ORM + SQLite のモノレポ構成
date: 2026-04-22
---

# Next.js + Turborepo + Drizzle ORM + SQLite のモノレポ構成

Personal CFOプロジェクトのモノレポ構成。

## ディレクトリ構成

```
apps/
  web/        # Next.js アプリ
  crawler/    # Playwright スクレイパー
packages/
  db/         # Drizzle ORM スキーマ・マイグレーション
turbo.json
pnpm-workspace.yaml
```

## turbo.json

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "db:migrate": { "cache": false },
    "db:seed": { "cache": false },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

`dependsOn: ["^build"]`で依存パッケージを先にビルドする順序制御。`db:migrate`はキャッシュ不要なので`cache: false`。

## packages/db の構成

Drizzle ORMのスキーマとマイグレーションを`packages/db`に集約。`apps/web`と`apps/crawler`の両方から参照する。

```typescript
// packages/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  // ...
})
```

## Vercel ビルド時に自動マイグレーション

`next.config.ts`のビルドフックでマイグレーションを実行。デプロイのたびに最新スキーマが適用される。

```typescript
// apps/web/next.config.ts
import { migrate } from '../packages/db/migrate'

const nextConfig = {
  // ...
}

await migrate()
export default nextConfig
```
