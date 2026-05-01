---
title: launchd で個人タスクを定期実行する（macOS）
date: 2026-04-30
---

# launchd で個人タスクを定期実行する（macOS）

毎朝 11 時にクローラを動かして、結果を Google Drive にアップロードするような「個人用バッチ」を macOS 上で動かしている。最初 `cron` で組もうとしたが、macOS だと launchd の方が筋が良かったのでメモを残しておく。

## なぜ自分の PC で動かすのか（GitHub Actions ではなく）

最初は GitHub Actions の `schedule` トリガで回していたが、すぐに無料枠を食いつぶして止まってしまった。

- private リポジトリでは scheduled workflow も **無料枠の分単位を消費する**
- クローラ系を毎日回していると数日でリミットに到達して止まる
- 「クラウド側で確実に動かしたい」レベルの可用性は不要(自分しか使っていないし、1日落ちても困らない)

それなら **メイン PC が起動している時間帯に launchd で回せば十分**、という判断。家で寝ている時間に動けば良い、くらいの要件なので、PC の電源がたまに落ちていても気にしない。

## なぜ launchd か（cron ではなく）

- macOS では `cron` は **deprecated** 扱い（一応動くが）
- スリープ復帰後の遅延実行（`StartCalendarInterval` + `RunAtLoad`）を OS が面倒見てくれる
- 標準出力 / 標準エラー出力をファイルに振るのが plist のキーひとつで済む
- システム再起動後の再登録も自動

## 最小の plist

`~/Library/LaunchAgents/com.example.my-task.plist` に置くと user agent として登録される。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.example.my-task</string>

    <key>WorkingDirectory</key>
    <string>/Users/yourname/projects/my-task</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/make</string>
        <string>run</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>11</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/Users/yourname/projects/my-task/logs/launchd-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/yourname/projects/my-task/logs/launchd-stderr.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
```

ポイント:

- **`Label`** はファイル名と一致させる（`launchctl list` で識別される名前）
- **`WorkingDirectory`** を必ず指定する。launchd はデフォルトで `/` で起動するので、相対パスを使うコマンドが軒並み壊れる
- **`ProgramArguments`** は絶対パスで書く。`PATH` は当てにしない
- **`EnvironmentVariables` の `PATH`**：launchd の環境変数は素のシェルとは別物で、Homebrew(`/opt/homebrew/bin`) にすら通っていない。明示的に書かないと `make` の中で叩く `go` や `op` が `command not found` になる
- **`StartCalendarInterval`** は cron と違って「指定時刻が来たら起動」。スリープ中ならスリープ復帰後に1回実行される

## 登録 / 解除 / 状態確認

```bash
# 登録
launchctl load ~/Library/LaunchAgents/com.example.my-task.plist

# 解除
launchctl unload ~/Library/LaunchAgents/com.example.my-task.plist

# 一覧（登録されているか）
launchctl list | grep com.example.my-task

# 即時実行（テスト時に便利）
launchctl start com.example.my-task
```

## Makefile で管理する

plist をプロジェクト内に置き、`~/Library/LaunchAgents/` には symlink を張る運用にしておくと、plist の編集 → 再 load がやりやすい。

```makefile
PLIST_NAME = com.example.my-task.plist
PLIST_SRC = $(CURDIR)/$(PLIST_NAME)
PLIST_DST = $(HOME)/Library/LaunchAgents/$(PLIST_NAME)

.PHONY: schedule unschedule schedule-status

schedule:
	@mkdir -p logs
	@if launchctl list | grep -q $(PLIST_NAME:.plist=); then \
		echo "Already scheduled. Run 'make unschedule' first."; \
		exit 1; \
	fi
	@ln -sf $(PLIST_SRC) $(PLIST_DST)
	launchctl load $(PLIST_DST)
	@echo "Scheduled: $(PLIST_NAME)"

unschedule:
	@if launchctl list | grep -q $(PLIST_NAME:.plist=); then \
		launchctl unload $(PLIST_DST); \
		echo "Unloaded: $(PLIST_NAME)"; \
	fi
	@rm -f $(PLIST_DST)

schedule-status:
	@if launchctl list | grep -q $(PLIST_NAME:.plist=); then \
		echo "Status: ACTIVE"; \
		launchctl list | grep $(PLIST_NAME:.plist=); \
	else \
		echo "Status: NOT scheduled"; \
	fi
```

`make schedule` / `make unschedule` / `make schedule-status` で操作できるようにしておくと、plist を直接触る必要がなくなる。

## ハマりどころ

### 1. PATH が通っていない

launchd の `EnvironmentVariables` は素の login shell とは別物。`.zshrc` も `.zprofile` も読まれない。

```xml
<key>EnvironmentVariables</key>
<dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
</dict>
```

これが無いと `make: go: command not found` で延々詰まる。

### 2. シークレット管理（1Password CLI などの対話認証ツール）

launchd 経由だと **Touch ID プロンプトが出せない**ので、`op run` のような対話前提のツールは使えない。`.env` を事前に生成しておく方式に切り替える必要がある。

```bash
# ログイン中に1回だけ実行: op inject で .env を書き出す
op inject -i .env.tpl -o .env
chmod 600 .env

# 以降は launchd から .env を読むだけで動く
```

詳細は [1Password CLI の記事](/op-secrets-management) を参照。

### 3. ログがどこに行ったか分からない

`StandardOutPath` と `StandardErrorPath` を設定していれば、そこに出る。`Console.app` で `subsystem:com.example.my-task` 検索でも追える。

```bash
# リアルタイムで追う
tail -f logs/launchd-stdout.log logs/launchd-stderr.log
```

### 4. plist 編集後の反映

plist を変更したら **unload → load** が必要。symlink にしておけば実体ファイルだけ編集して、load し直すだけで済む。

```bash
make unschedule && make schedule
```

### 5. 実行されたか確認したい

`launchctl list <Label>` の出力に `LastExitStatus` が出る。

```bash
launchctl list com.example.my-task
# {
#   "LimitLoadToSessionType" = "Aqua";
#   "Label" = "com.example.my-task";
#   "LastExitStatus" = 0;       ← 0 なら正常終了
#   "PID" = 12345;              ← 実行中ならある
# }
```

## おまけ：実行ログを Google Drive に上げておく

ローカルの `logs/` だけだと、別のマシンから見たり過去のログを遡るのが面倒。クローラ本体の最後でログファイルを Google Drive に上げておくと、後から日付別に追える。

```go
// Go の場合：実行終了時にログファイルを Drive にアップロード
defer func() {
    f, _ := os.Open(logFilePath)
    defer f.Close()
    logsFolderID, _ := du.FindOrCreateSubFolder("logs")
    du.UploadFileToFolder(f, logFileName, logsFolderID)
}()
```

ファイル名に実行日時 + 結果（success / fail）を含めておくと、Drive 上で一覧した時にどの日が失敗したか目視で分かる。

## まとめ

- macOS の個人タスクは `cron` より launchd
- plist は `~/Library/LaunchAgents/` に置く（user agent として実行される）
- `EnvironmentVariables.PATH` を明示するのが最大のハマりどころ
- Makefile で `schedule` / `unschedule` / `schedule-status` を提供しておくと運用が楽
- 対話認証が必要な secret は事前に `.env` に書き出して、launchd からは読むだけにする
- ログは Drive 等の外部ストレージに上げると後から追いやすい

cron と比べると plist が冗長に感じるが、Makefile で隠蔽してしまえば日常的に書く必要は無いので、慣れたら戻れない。
