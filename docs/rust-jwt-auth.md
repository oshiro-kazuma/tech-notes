---
title: Rust で JWT 認証を自前実装する（Axum + argon2 + jsonwebtoken）
date: 2026-04-22
---

# Rust で JWT 認証を自前実装する（Axum + argon2 + jsonwebtoken）

Axumでシンプルなメール・パスワード + JWT認証を実装した。

## パスワードのハッシュ化

argon2でハッシュ化する。`argon2::hash_encoded`でハッシュ生成、`argon2::verify_encoded`で検証。

```rust
use argon2::{self, Config};

fn hash_password(password: &str) -> Result<String, argon2::Error> {
    let salt = rand::random::<[u8; 32]>();
    argon2::hash_encoded(password.as_bytes(), &salt, &Config::default())
}

fn verify_password(hash: &str, password: &str) -> Result<bool, argon2::Error> {
    argon2::verify_encoded(hash, password.as_bytes())
}
```

## JWT の生成・検証

```rust
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: i64,   // user_id
    exp: usize, // expiry
}

fn create_jwt(user_id: i64, secret: &str) -> Result<String, AppError> {
    let exp = (Utc::now() + Duration::days(30)).timestamp() as usize;
    let claims = Claims { sub: user_id, exp };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|_| AppError::Internal)
}
```

## Axum の Extractor で認証を抽象化

ハンドラの引数に`Claims`を入れるだけで認証済みを保証できる。

```rust
#[async_trait]
impl<S> FromRequestParts<S> for Claims {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        let token = extract_bearer_token(parts)?;
        decode_jwt(&token, &get_jwt_secret())
    }
}

// 認証が必要なハンドラ
async fn get_me(claims: Claims, State(pool): State<SqlitePool>) -> Result<Json<User>, AppError> {
    // claims.sub がログイン中のuser_id
}
```

## シングルユーザーの場合

registerエンドポイントはユーザーが0件のときだけ通す。

```rust
async fn register(State(pool): State<SqlitePool>, Json(body): Json<RegisterRequest>) -> Result<Json<AuthResponse>, AppError> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users").fetch_one(&pool).await?;
    if count > 0 {
        return Err(AppError::Forbidden);
    }
    // ...
}
```
