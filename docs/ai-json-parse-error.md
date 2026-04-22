---
title: AIのレスポンスにJSONコードブロックが含まれるときのパース
date: 2026-04-22
---

# AIのレスポンスにJSONコードブロックが含まれるときのパース

ClaudeなどのLLMにJSONを返させると、素直にJSONだけを返さず` ```json `のコードブロックで囲んで返すことがある。

## 問題

```
```json
{ "key": "value" }
```
```

これをそのまま`JSON.parse()`するとエラーになる。

## 解決策

正規表現でコードブロックを除去してからパースする。

```typescript
function parseAiJson<T>(text: string): T {
  const stripped = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  return JSON.parse(stripped) as T
}
```

## より堅牢にする

コードブロックの中身だけを取り出す方法。コードブロックが途中に含まれる場合も対応できる。

```typescript
function parseAiJson<T>(text: string): T {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = match ? match[1].trim() : text.trim()
  return JSON.parse(jsonStr) as T
}
```

## 根本的な対策

プロンプトで「JSONのみ返せ、コードブロックは使うな」と明示する。または、AISDKの`Output.object()`などの構造化出力機能を使う。
