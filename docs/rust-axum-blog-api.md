---
title: Rust + Axum でブログ REST API を作る
date: 2026-04-22
---

# Rust + Axum でブログ REST API を作る

シングルユーザー向けのブログAPIをRust + Axumで作った。

## スタック

- **Axum 0.7** — Webフレームワーク
- **SQLite + sqlx 0.7** — データベース
- **argon2** — パスワードハッシュ
- **jsonwebtoken** — JWT認証
- **utoipa** — OpenAPI自動生成

## ディレクトリ構成

```
src/
├── main.rs          # エントリポイント・ルーティング
├── error.rs         # エラー型
├── jwt.rs           # JWT生成・検証・Extractor
├── models.rs        # 構造体定義
└── handlers/
    ├── auth.rs      # 登録・ログイン
    ├── posts.rs     # 記事CRUD
    ├── users.rs     # ユーザー情報
    └── uploads.rs   # 画像アップロード
```

## ルーティング

Axumのルーターはネストできる。認証が必要なルートにはExtractorでミドルウェア的にJWTを検証。

```rust
let app = Router::new()
    .route("/api/posts", get(posts::list).post(posts::create))
    .route("/api/posts/:id", get(posts::get).put(posts::update).delete(posts::delete))
    .route("/api/auth/login", post(auth::login))
    .layer(CorsLayer::permissive());
```

## JWT Extractor

Axumの`FromRequestParts`を実装すると、ハンドラの引数にJWTクレームを取れる。

```rust
#[async_trait]
impl<S> FromRequestParts<S> for Claims {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        let auth = parts.headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or(AppError::Unauthorized)?;

        decode_jwt(auth)
    }
}
```

ハンドラでは`Claims`を受け取るだけ。

```rust
async fn create_post(
    claims: Claims,
    State(pool): State<SqlitePool>,
    Json(body): Json<CreatePost>,
) -> Result<Json<Post>, AppError> {
    // ...
}
```

## utoipa で Swagger UI

`#[utoipa::path]`アトリビュートを付けるだけでOpenAPIのスキーマが生成される。

```rust
#[utoipa::path(
    post,
    path = "/api/posts",
    request_body = CreatePost,
    responses((status = 201, body = Post))
)]
async fn create_post(...) {}
```

`http://localhost:3000/api-docs` でSwagger UIが確認できる。
