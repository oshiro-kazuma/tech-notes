---
title: Fly.io に Rust + SQLite をデプロイする
date: 2026-04-22
---

# Fly.io に Rust + SQLite をデプロイする

RustのAPIをFly.ioにDockerでデプロイした。SQLiteのデータ永続化にFly Volumeを使う。

## cargo-chef でビルドキャッシュを最適化

Rustのビルドは遅いので、依存クレートのキャッシュをDockerレイヤーに分離する。

```dockerfile
FROM lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json  # 依存だけビルド（キャッシュされる）
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/rust-blog-api .
CMD ["sh", "-c", "touch /data/blog.db && ./rust-blog-api"]
```

`cargo chef cook`でソースを変えても依存のビルドがスキップされ、2回目以降のビルドが大幅に速くなる。

## fly.toml

```toml
app = 'rust-blog-api'
primary_region = 'nrt'  # 東京

[env]
  DATABASE_URL = 'sqlite:/data/blog.db'
  UPLOAD_DIR   = '/data/uploads'

[[mounts]]
  source = 'blog_data'
  destination = '/data'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true

[[vm]]
  size = 'shared-cpu-1x'
  memory = '256mb'
```

## SQLite の永続化

Fly.ioのコンテナはデプロイのたびに再作成されるので、SQLiteファイルをVolumeに置く必要がある。

```bash
fly volumes create blog_data --size 1 --region nrt
```

`[[mounts]]`でコンテナの`/data`にマウントすると、`blog.db`が消えなくなる。

## auto_stop_machines

無料枠を活かすために`auto_stop_machines = 'stop'`にしておくとリクエストのないときはマシンが停止する。`auto_start_machines = true`でリクエスト時に自動起動する。

コールドスタートが発生するが、個人用途なら問題ない。
