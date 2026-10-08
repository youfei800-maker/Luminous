# Luminous

女性一人ひとりのキャリアと人生のストーリーに出会うメディア。
参照サイトのワイン色・淡いピンク・クリーム色と、`Bloom your future` のビジュアルを引き継いだ Next.js プロジェクトです。

## 構成

- Next.js 16 / React 19
- JavaScript（TypeScript なし）
- App Router（ルート直下の `app/`）
- Tailwind CSS 4（公式テンプレートの Turbopack プラグイン）
- ESLint なし、`src/` なし、import エイリアスは `@/*`
- API キー、データベース、外部サービスの設定は不要

## 開発

Node.js 20.9 以上が必要です。クラウド環境で検証したバージョンは Node.js 24.19.0 / npm 11.9.0 です。

```bash
cd /workspace/Luminous
npm ci --cache /tmp/luminous-npm-cache --no-audit --no-fund
npm run dev -- --hostname 0.0.0.0
```

既定ポートは 3000。使用中なら Next.js が 3001 以降の空きポートを選びます。実際のポートは起動ログで確認してください。

```bash
npm run build
npm start
```

## ページと機能

- `/` — トップ、ストーリー一覧、Girls / Women、メディアのビジョン、イベント案内
- `/stories` — 名前・職業・キーワード検索、カテゴリ・テーマの絞り込み
- `/girls` / `/women` — 対象カテゴリの一覧（世代をつなぐ対談は両方に表示）
- `/stories/[slug]` — インタビュー、人物プロフィール、キャリア年表、関連記事、共有
- `/saved` — ブックマークした記事。ログイン不要で、このブラウザの localStorage に保存
- `/about` — Luminous のビジョン・価値観
- `/events/bloom-career-day` — 参照サイトのイベント情報と、既存の公式申込フォームへのリンク

ヘッダーの虫眼鏡から全記事を検索できます。スマートフォン向けのメニュー、キーボード操作、Esc で閉じる検索ダイアログ、空の検索結果と404ページにも対応しています。

## コンテンツを変更する

プロフィール・記事・年表は `lib/stories.js` にまとまっています。`slug`、`title`、`image`、`profile`、`timeline`、`sections` を更新すると、一覧と記事ページに反映されます。人物と記事本文は架空のサンプルです。公開用の取材記事・画像に差し替えてください。

色・余白・レスポンシブ表示は `app/globals.css`、トップ構成は `app/page.js` で編集できます。

## 画像とフォント

- `bridge.png`、`girls.png`、`women.png`：ユーザー指定の参照サイト `https://luminous-media-concept.qpj2r4fy94.chatgpt.site/` の素材
- `designer.jpg`：Unsplash `photo-1524504388940-b1c1722653e1`
- `team.jpg`：Unsplash `photo-1551836022-d5d88e9218df`
- `learning.jpg`：Unsplash `photo-1544717305-2782549b5136`
- 英字フォント：Noto Serif Display。ライセンスは `public/fonts/LICENSE.txt`

画像・英字フォントをローカルに保持しているため、通常の起動・表示に画像配信先や Google Fonts への通信は不要です。写真はサンプル記事のイメージであり、掲載人物の実際のプロフィールを示すものではありません。
