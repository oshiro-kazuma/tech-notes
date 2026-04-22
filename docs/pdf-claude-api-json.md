---
title: PDFや画像をClaude APIに投げてJSONで受け取る
date: 2026-04-22
---

# PDFや画像をClaude APIに投げてJSONで受け取る

不動産投資の会計書類（領収書・請求書など）をPDFや画像でアップロードして、Claude APIで会計エントリのJSONとして抽出する実装。

## やっていること

1. クライアントからファイルをFormDataでアップロード
2. ArrayBufferをbase64に変換
3. PDFなら`document`タイプ、画像なら`image`タイプのコンテンツブロックを作成
4. システムプロンプトでJSONの出力形式を指定
5. レスポンスのテキストをパースして返す

## APIルートの実装

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  // PDFと画像でコンテンツブロックの type が異なる
  const contentBlock = file.type === 'application/pdf'
    ? {
        type: 'document' as const,
        source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 }
      }
    : {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: file.type as ImageMediaType, data: base64 }
      }

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [contentBlock, { type: 'text', text: 'データを抽出してください。' }]
    }],
  })

  const text = response.content.find(b => b.type === 'text')?.text ?? ''

  // コードブロックが混入する場合があるので除去
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  return NextResponse.json(JSON.parse(cleaned))
}
```

## システムプロンプトでJSONを強制する

「以下のJSON形式**のみ**を返してください。余分なテキストは一切含めないでください。」と明示するのがポイント。スキーマも具体的に書く。

```typescript
const SYSTEM_PROMPT = `
書類からデータを抽出し、以下のJSON形式のみを返してください。余分なテキストは含めないでください。

{
  "entries": [
    {
      "entryDate": "YYYY-MM-DD",
      "description": "説明",
      "amount": 金額（整数）,
      "accountCategory": "expense | income | liability | asset"
    }
  ]
}
`
```

明示してもコードブロック（` ```json `）で囲まれることがあるので、受け取り側で除去する処理は入れておく。

## 対応フォーマット

Anthropic APIでPDFを使う場合は`type: 'document'`、画像は`type: 'image'`。media_typeも異なる。

```typescript
// PDF
{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }

// 画像
{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } }
```

JPEG・PNG・GIF・WebPに対応。

## よりクリーンな方法：Tool use で強制する

システムプロンプトでJSONを指定する方法はコードブロックが混入することがある。Tool useの `tool_choice` でツールを強制すると、`input` がそのままオブジェクトで返ってくるのでパース処理が不要になる。

```typescript
const response = await client.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 2048,
  tools: [{
    name: 'extract_entries',
    description: '書類から会計エントリを抽出する',
    input_schema: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entryDate: { type: 'string' },
              description: { type: 'string' },
              amount: { type: 'number' },
              accountCategory: { type: 'string', enum: ['expense', 'income', 'liability', 'asset'] }
            },
            required: ['entryDate', 'description', 'amount', 'accountCategory']
          }
        }
      },
      required: ['entries']
    }
  }],
  tool_choice: { type: 'tool', name: 'extract_entries' }, // このツールを必ず呼ばせる
  messages: [{
    role: 'user',
    content: [contentBlock, { type: 'text', text: 'データを抽出してください。' }]
  }],
})

// tool_use ブロックの input がそのままオブジェクト
const toolUse = response.content.find(b => b.type === 'tool_use')
const result = toolUse?.input // JSON.parse不要
```

スキーマをJSONスキーマで定義するので、型の保証も強くなる。
