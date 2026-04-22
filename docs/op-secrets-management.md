---
title: 1Password CLI で環境変数・シークレットを管理する
---

# 1Password CLI で環境変数・シークレットを管理する

ハードコードや `.env` の git 管理なしに、1Password CLI（`op`）を使ってシークレットを安全に扱うパターンを紹介します。

## なぜ 1Password CLI か

- `.env` を git に含めるとシークレットが漏洩するリスクがある
- チームで開発する場合、Slack や Notion でパスワードを共有しがち
- 1Password は既に使っているので、開発用のシークレット管理も一元化したい

---

## セットアップ

```bash
# macOS
brew install 1password-cli

# 確認
op --version
# 2.x.x

# サインイン（初回）
eval $(op signin)
```

---

## 基本：`op://` 参照形式

1Password のアイテムを参照する URI 形式。

```
op://<Vault>/<Item>/<Field>
```

例：
```
op://Personal/My API Keys/api_key
op://Work/AWS/access_key_id
```

---

## パターン 1：`op run --env-file` でコマンド実行時に注入

`.env.tpl` ファイルに `op://` 参照を書いておき、`op run` 経由でコマンドを実行する。

```bash
# .env.tpl
DATABASE_URL=op://Personal/My App/database_url
API_KEY=op://Personal/My App/api_key
```

```bash
# op run が .env.tpl の op:// を展開して環境変数として渡す
op run --env-file=.env.tpl -- go run ./cmd/server
op run --env-file=.env.tpl -- npm start
```

**特徴：**
- `.env.tpl` は git に含めてよい（`op://` 参照はシークレットではない）
- 実行のたびに 1Password の認証が必要（Touch ID など）
- CI/CD にはそのまま使えない

> `op inject` の <span v-pre>`{{ }}`</span> 記法とは異なり、`op run --env-file` は `KEY=op://...` 形式のみ対応。

---

## パターン 2：`op inject` で `.env` を生成する

`op inject` は <span v-pre>`{{ op://... }}`</span> テンプレートを実際の値に展開してファイルを出力する。

::: v-pre
```bash
# .env.tpl（op inject 用）
DATABASE_URL={{ op://Personal/My App/database_url }}
API_KEY={{ op://Personal/My App/api_key }}
```
:::

```bash
# .env として書き出す（Touch ID 1回）
op inject -i .env.tpl -o .env
chmod 600 .env

# 以降は .env を読むだけ（1Password 不要）
go run ./cmd/server
```

**.gitignore に追加：**
```
.env
```

**特徴：**
- 生成した `.env` は git に含めない
- 一度生成すればバッチ処理・cron にも使える
- 認証情報が変わったときは再実行が必要

---

## パターン 3：`op document` でファイルごと管理する

API キー JSON（Google Cloud の `credentials.json` など）もそのまま保存・取得できる。

```bash
# 1Password に保存
op document create credentials.json \
  --title "My Service Account" \
  --vault Personal

# 取得
op document get "My Service Account" --vault Personal --output ./credentials.json
chmod 600 ./credentials.json
```

---

## 実践：setup-secrets.sh パターン

バッチ処理や cron 向けに、1Password 認証を一度だけ行って `.env` と必要なファイルをローカルに書き出すスクリプト。

```bash
#!/bin/bash
# setup-secrets.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

ERRORS=0

# .env を生成
if op inject -i .env.tpl -o .env; then
  chmod 600 .env
  echo "✓ .env を生成しました"
else
  echo "✗ .env の生成に失敗しました" >&2
  ERRORS=$((ERRORS + 1))
fi

# credentials.json を取得
if op document get "My Service Account" --vault Personal --output ./credentials.json 2>/dev/null; then
  chmod 600 ./credentials.json
  echo "✓ credentials.json を取得しました"
else
  echo "⚠ credentials.json が 1Password に見つかりません（スキップ）" >&2
fi

[ "$ERRORS" -eq 0 ] || exit 1
```

---

## Makefile との統合

`.env` があればそのまま実行、なければ `op run` にフォールバック。

```makefile
# 初回セットアップ（Touch ID 1回）
setup-secrets:
	@./setup-secrets.sh

# .env があれば直接実行、なければ op run 経由
run:
	@if [ -f .env ]; then \
		go run ./cmd/crawler; \
	else \
		op run --env-file=.env.tpl -- go run ./cmd/crawler; \
	fi
```

**使い方：**
```bash
# 初回または認証情報が変わったとき
./setup-secrets.sh   # Touch ID 1回

# 以降はバッチ実行可能
make run             # 認証不要
```

---

## まとめ

| 用途 | 方法 |
|------|------|
| 開発中（都度認証 OK） | `op run --env-file=.env.tpl -- <command>` |
| バッチ・cron（認証不要にしたい） | `op inject -i .env.tpl -o .env` で事前書き出し |
| JSON ファイルも管理したい | `op document create / get` |
| CI/CD | 1Password サービスアカウントの `OP_SERVICE_ACCOUNT_TOKEN` を利用 |

シークレットは 1Password に一元管理しつつ、`op://` 参照だけをリポジトリに含めることで、チーム共有も安全になる。
