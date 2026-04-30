---
title: GitHub から Production環境を遠ざける(GCP編)
date: 2026-04-28
---

# GitHub から Production環境を遠ざける(GCP編)

AI エージェントに自動化を任せる場面が増え、Production環境の credential 漏洩リスクは「人が間違えるか」だけでなく「外部システムが侵害された時にどこまで波及するか」で考える必要が出てきた。Cloud Run + Cloud Build + Secret Manager + private VPC な Cloud SQL という構成で運用していて、立ち上げ時に楽したくて選んだ組み合わせだったが、結果として「Production環境の secret も DB への到達経路も deploy 権限も GitHub 側に持たせない」形になっていた。現状の構成と、それぞれの選択がどう効いている(または効いていない)かを記録しておく。

## 方針

| 項目 | 方針 |
|------|------|
| Cloud SQL | private VPC で作成。public IP を持たせない |
| Production環境の secret | すべて Secret Manager で管理。GitHub に置かない |
| Production環境への操作 | させない（ビルドのトリガだけに留める） |
| Deploy | Cloud Build で実行 |

## なぜ GitHub に Production環境の secret を置かないか

GitHub Actions Secrets に Production環境の API key や DB password を直接置く構成は便利だが、外部システムへの依存を増やすことになる。

- **サプライチェーン攻撃の標的**：`tj-actions/changed-files` の事件のように、third-party action 経由で secret が外部に流出する事故が定期的に起きている
- **監査ログが分散する**：「誰がいつ secret を参照したか」を GitHub と GCP の両方で追う必要がある
- **長期 credential が漏れる**：service account key を Secrets に置くと、漏洩時に手で revoke するまで生き続ける

Production環境の credential は「GCP 内で完結」させ、GitHub からは触れないようにするのが安全側。

## Cloud SQL は private VPC

public IP を有効にすると、認証情報さえ手に入れば世界中のどこからでも接続できてしまう。private IP のみにすれば、VPC 内（Cloud Run、GCE、Cloud Build worker pool など）からしか到達できない。

```bash
gcloud sql instances create my-db \
  --database-version=POSTGRES_16 \
  --region=asia-northeast1 \
  --network=projects/$PROJECT_ID/global/networks/default \
  --no-assign-ip
```

Cloud Run から接続する場合は Direct VPC egress を経由する。

## DB が「遠い」設計を受け入れる

private VPC にすると、利便性とのトレードオフが発生する。これは制限ではなく、private VPC を選んだ時点で付いてくる性質。最初は不便に感じたが、運用してみるとこれで十分成立している。むしろ **DB がかなり遠い場所に置かれた状態** になっていて、認証情報が漏れた程度では到達できないので、セキュリティ的にはかなり強固。

### 起こること

- **GitHub Actions から直接 migration が打てない**：runner は VPC 外にいるので private IP に届かない
- **ローカル PC から `psql` / `mysql` で直接繋げない**：同じく VPC 外
- **Cloud SQL Auth Proxy をローカルで起動しても無駄**：Auth Proxy は認証・暗号化を解決するだけで、ネットワーク経路は作らない。`--private-ip` 付きで起動しても、proxy が裏で TCP 接続できないので失敗する
- **VPC 内に踏み台(GCE / Cloud Workstations / GKE pod 等)を作らない限り、外から接続するすべがない**

ここがポイントで、「Auth Proxy を入れれば private IP でもローカルから繋がる」と誤解されがちだが、**踏み台が無ければ接続経路そのものが存在しない**。これは制限ではなく、private VPC 構成が意図的に作っている性質。

### 運用での解

実際には「DB が遠い」状態を維持したまま、用途別に到達手段を分けて運用する。

| 用途 | 手段 |
|------|------|
| 日常的にクエリを投げたい | **Cloud SQL Studio**（ブラウザだけで完結） |
| migration を流したい | **Cloud Run job** をコンテナ化 → Cloud Build からトリガ |
| バッチで一時的な処理を流したい | Cloud Run job / Cloud Build |
| アプリからの接続 | Cloud Run + Direct VPC egress |

> 結果として「**Chrome を操作しない限り production DB に到達できない**」状態になる。これは運用上は不便に見えるが、認証情報が漏れただけでは DB に到達できないので、攻撃者にとってのハードルが一段上がる。

### migration を Cloud Run job で流す

GitHub Actions から直接打てない代わりに、migration をコンテナ化して Cloud Run job として登録する。

```yaml
# cloudbuild.yaml（migration ジョブ）
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/migrate:$SHORT_SHA', '-f', 'Dockerfile.migrate', '.']

  - name: gcr.io/cloud-builders/docker
    args: ['push', 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/migrate:$SHORT_SHA']

  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    entrypoint: gcloud
    args:
      - run
      - jobs
      - update
      - migrate
      - --image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/migrate:$SHORT_SHA
      - --region=asia-northeast1
      - --network=my-vpc
      - --subnet=my-subnet
      - --vpc-egress=private-ranges-only
      - --update-secrets=DB_PASSWORD=db-password:latest

  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    entrypoint: gcloud
    args: ['run', 'jobs', 'execute', 'migrate', '--region=asia-northeast1', '--wait']
```

Cloud Run job を Direct VPC egress(`private-ranges-only`)で起動すれば、private IP の Cloud SQL に到達できる。public 宛の通信(Secret Manager API など)は通常経路で出るのでレイテンシ・コスト面でも有利。GitHub からは「Cloud Build を起動するだけ」なので、Production環境の credential は一切 GitHub 側に渡らない。

## Secret Manager に集約

DB password、外部 API key、JWT 署名鍵などは全部 Secret Manager に入れる。

```bash
echo -n "super-secret-value" | \
  gcloud secrets create db-password \
  --data-file=- \
  --replication-policy=automatic
```

Cloud Run からは環境変数として参照する。Cloud Run の service account に `roles/secretmanager.secretAccessor` を付けるだけで、アプリ側のコードには何も書かなくていい。

```bash
gcloud run deploy my-app \
  --update-secrets=DB_PASSWORD=db-password:latest
```

**ポイント：**
- バージョン管理されるので rotation が楽
- IAM で「どの service account がどの secret を読めるか」を細かく絞れる
- アクセスログが Cloud Audit Logs に残る

## GitHub から Production環境を直接触らせない

GitHub Actions から `gcloud run deploy` を直接叩く構成は楽だが、その権限を持った credential が GitHub 側に常駐する。代わりに **Cloud Build をトリガするだけ** にする。

```
[GitHub] --(push trigger)--> [Cloud Build] --(deploy)--> [Cloud Run]
                                  ↑
                             Secret Manager
```

GitHub 側に渡すのは「Cloud Build をトリガする最小権限」だけ。Production環境を変更する権限は Cloud Build の service account にしか持たせない。

### Workload Identity Federation で長期 credential を排除

GitHub Actions から GCP を呼ぶ必要がある場合でも、service account key（JSON）を Secrets に置くのは避ける。WIF を使えば短命トークンで認証できる。

```yaml
# .github/workflows/trigger.yml
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: projects/123/locations/global/workloadIdentityPools/github/providers/my-repo
    service_account: github-trigger@my-project.iam.gserviceaccount.com

- run: gcloud builds triggers run my-trigger --branch=main
```

GitHub 側に置くのは provider の resource name と service account email だけ。これらは漏れても単体では悪用できない。

## Cloud Build で deploy

deploy は Cloud Build に閉じ込める。`cloudbuild.yaml` に手順を書き、Secret Manager から必要な値を取り出してビルドする。

```yaml
# cloudbuild.yaml
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/api:$SHORT_SHA', '.']

  - name: gcr.io/cloud-builders/docker
    args: ['push', 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/api:$SHORT_SHA']

  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    entrypoint: gcloud
    args:
      - run
      - deploy
      - api
      - --image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/api:$SHORT_SHA
      - --region=asia-northeast1
      - --update-secrets=DB_PASSWORD=db-password:latest

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/sentry-dsn/versions/latest
      env: SENTRY_DSN
```

Cloud Build の service account に `roles/run.admin` と `roles/secretmanager.secretAccessor` を付与しておけば、外から credential を渡す必要がなくなる。

> **補足：build / deploy だけなら GitHub Actions + WIF でも十分**
>
> `docker build` も `gcloud run deploy` も、Production環境の secret 値そのものを読まない（Secret Manager 参照は文字列で渡すだけで、実体は Cloud Run がランタイムで読む）。なので build / deploy 自体は GitHub Actions で WIF を使えば成立する。Cloud Build に寄せる強い動機が出てくるのは「**VPC 内に居ないとできない処理**」（private IP の DB に対する migration、Secret Manager の値を実際に読んで加工する処理 など）。
>
> 今回 build / deploy も含めて Cloud Build に統一しているのは、立ち上げ初期に「とにかく楽したい・なるべくノーコードで構築したい」という事情で Cloud Run + Cloud Build の組み合わせに寄せた結果でもある。GitHub Actions の YAML を別途書く手間を省けたのが大きく、セキュリティ要件で Cloud Build にした、というよりは **そのまま運用していて特に問題が無いので続けている**、というのが本音。

## まとめ

- Production環境の credential は GCP 内で完結させる（GitHub に置かない）
- GitHub には「ビルドをトリガする権限」だけ渡す（WIF で短命トークン化）
- Cloud SQL は private VPC、secret は Secret Manager、deploy は Cloud Build
- 結果として「GitHub が侵害されても Production環境は守られる」状態になる

楽したくて始めた構成が、AI 時代の脅威モデルから見ても破綻していなかった、というのが現時点の感触。Cloud Run + Cloud Build + Secret Manager + private VPC の素直な組み合わせは、結果として GitHub からの侵害に対して頑健になっていた。
