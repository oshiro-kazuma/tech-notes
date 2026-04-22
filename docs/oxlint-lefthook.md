---
title: oxlint + lefthook でコミット前のlintを爆速にする
date: 2026-04-22
---

# oxlint + lefthook でコミット前のlintを爆速にする

ESLintが遅くてストレスだったので、oxlint + lefthookに切り替えた。

## oxlint

RustベースのLinter。ESLintより50〜100倍速い。

```bash
pnpm add -D oxlint
```

`--type-aware`でTypeScriptの型情報を使ったルールも有効になる。`--fix`で自動修正。

## lefthook

Go製のgit hooksマネージャー。`lefthook.yml`で設定、`stage_fixed: true`で修正後のファイルを自動ステージング。

```yaml
pre-commit:
  commands:
    format:
      glob: "*.{ts,tsx,js,jsx,json,css,yml,yaml,md}"
      run: pnpm oxfmt {staged_files}
      stage_fixed: true
    lint:
      glob: "*.{ts,tsx,js,jsx}"
      run: pnpm oxlint --type-aware --fix {staged_files}
      stage_fixed: true
```

`{staged_files}`でステージングされたファイルだけに絞って実行するので速い。

## インストール

```bash
pnpm add -D lefthook
pnpm lefthook install
```

## post-merge / post-checkout で WAL ファイルを削除

SQLiteを使っているプロジェクトでブランチ切り替え後に`-shm`/`-wal`ファイルが残ると不整合が起きる。lefthookでブランチ操作後に自動削除する。

```yaml
post-merge:
  commands:
    clean-wal:
      run: rm -f data/*.db-shm data/*.db-wal

post-checkout:
  commands:
    clean-wal:
      run: rm -f data/*.db-shm data/*.db-wal
```
