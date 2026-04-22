---
title: macOS でタブボタンのネイティブ描画を無効化する
date: 2026-04-22
---

# macOS でタブボタンのネイティブ描画を無効化する

macOSのSafariやChromeで`<button>`要素がネイティブのmacOS UIで描画されてしまい、CSSが効かない問題。

## 症状

- `background-color`が効かない
- クリック時に白いフラッシュが出る
- ボーダーやパディングがずれる

## 原因

macOSはフォームコントロール（`<button>`, `<select>`など）にネイティブのUIを適用する。

## 解決策

```css
button {
  -webkit-appearance: none;
  appearance: none;
}
```

これでOSのネイティブ描画が無効になり、CSSが完全に効くようになる。

## クリック時の白いフラッシュ

タップ時のハイライトは別のプロパティで制御する。

```css
button {
  -webkit-appearance: none;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
}
```

Tailwindを使っているなら`appearance-none`クラスで同じ効果が得られる。
