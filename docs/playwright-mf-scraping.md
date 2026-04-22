---
title: GitHub Actions + Playwright で MoneyForward を定期スクレイピングする
date: 2026-04-22
---

# GitHub Actions + Playwright で MoneyForward を定期スクレイピングする

MoneyForward MeのデータをPlaywrightで取得してSQLiteに保存する処理をGitHub Actionsで定期実行している。

## OTP（2FA）対応のログイン

MoneyForwardはTOTPの2FAがある。`otpauth`ライブラリで都度トークンを生成してログインする。

```typescript
import * as OTPAuth from 'otpauth'

export async function login(page: Page): Promise<void> {
  await page.goto('https://moneyforward.com/users/sign_in')
  await page.fill('input[type="email"]', process.env.MF_EMAIL!)
  await page.fill('input[type="password"]', process.env.MF_PASSWORD!)
  await page.click('button#submitto')

  if (page.url().includes('otp')) {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(process.env.MF_OTP_SECRET!)
    })
    await page.fill('input[name="otp_attempt"]', totp.generate())
    await page.click('button#submitto')
  }
}
```

`MF_EMAIL`, `MF_PASSWORD`, `MF_OTP_SECRET`はGitHub Secretsに登録。

## GitHub Actions の設定

```yaml
on:
  schedule:
    - cron: '0 1,13 * * *'  # 毎日2回（JST 10:00, 22:00）
  workflow_dispatch:

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run crawl
        env:
          MF_EMAIL: ${{ secrets.MF_EMAIL }}
          MF_PASSWORD: ${{ secrets.MF_PASSWORD }}
          MF_OTP_SECRET: ${{ secrets.MF_OTP_SECRET }}
```

## SQLiteのDBをリポジトリで管理する

スクレイピング結果のSQLiteファイルをコミットしてリポジトリで管理している。Vercelのビルド時にDBファイルが存在する前提でSSGする構成。

DBファイルのコミットはCIからbotでpushする。ブランチ保護ルールがあるとbotのpushをそこだけ例外にする必要がある。
