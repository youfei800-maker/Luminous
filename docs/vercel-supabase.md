# Vercel公開サイトと編集画面を接続する

公開サイトとMacは、同じSupabaseプロジェクトに接続すると同じ記事・画像を使います。以後は公開サイトの `/editorial/login` から編集できます。Supabaseはデータと画像の保存先、Vercelはサイトの実行場所です。

## 1. Supabaseの初期設定

1. Vercelに連携したSupabaseプロジェクトを開きます。
2. **SQL Editor → New query** を開きます。
3. このリポジトリの **[supabase/setup.sql](../supabase/setup.sql)** の内容をすべて貼り付け、**Run** を押します。

`luminous_documents` テーブル、保存用の関数、`luminous-media` 画像バケットを作成します。記事・下書き・アカウントは匿名のブラウザから直接取得できない設定です。パスワードはハッシュ化して保存します。既存の編集データやアカウントをSQLで上書きしません。

## 2. Vercelの環境変数を確認する

Vercelの該当プロジェクトで **Settings → Environment Variables** を開き、**Production** に次が設定されていることを確認します。連携時に設定済みなら追加し直す必要はありません。

| 名前                                                     | 設定する値                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| `SUPABASE_URL` または `NEXT_PUBLIC_SUPABASE_URL`         | 同じSupabaseプロジェクトのProject URL（`https://...supabase.co`）   |
| `SUPABASE_SERVICE_ROLE_KEY` または `SUPABASE_SECRET_KEY` | サーバー専用のservice_roleキー、または `sb_secret_...` のsecretキー |

`anon` キーや `sb_publishable_...` の公開キーだけでは、編集データを保存できません。秘密キーには **NEXT_PUBLIC\_ を付けないでください**。APIキー・パスワードはチャットやGitHubに貼り付けず、Vercelの環境変数に設定します。

任意設定：`LUMINOUS_STORAGE=supabase`、`SUPABASE_STORAGE_BUCKET=luminous-media`。通常はURLとサーバー専用キーを検出してSupabaseを使用します。

GitHubの最新 `main` をVercelでデプロイしてください。環境変数を変更した場合は **Redeploy** が必要です。Previewでも編集する場合は、同じ変数をPreviewに設定すると本番データを共有するため、誤って公開変更を行わないよう本番と別のSupabaseプロジェクトを推奨します。

## 3. Macの編集内容を移行する

編集していたMacで行います。開発サーバーが動いているターミナルでは **Control + C** を押して停止し、1行ずつ実行してください。

```bash
cd ~/Luminous
git pull
npm ci
npm run editorial:connect
```

Project URLとサーバー専用APIキーを聞かれます。Vercelに設定したものと同じ値を使います。APIキーは入力しても画面に表示されません。接続を確認した後、Git管理対象外の `.env.local` に保存します。既存の他の環境変数は維持します。

次に移行内容を確認します。この段階では公開側は変更しません。

```bash
npm run editorial:migrate
```

記事・イベント・活動実績・画像の件数を確認し、移行を実行します。

```bash
npm run editorial:migrate -- --apply
```

`.luminous/` にあるアカウント・保存済みの編集内容・参照中の画像をSupabaseへ移します。公開データは画像を移した後に保存します。元のMacのファイルは削除しません。同じ内容の移行は再実行できます。公開側に異なるアカウント・記事・同名画像がある場合は、上書きせず停止します。一部だけ移った場合も、元のファイルを変更せず再実行できます。

移行元の `content.json` がない場合は、ローカルで一度記事かサイト設定を保存する必要があります。いったん `.env.local` の `LUMINOUS_STORAGE` を `local` にして開発サーバーを起動・保存し、停止後 `supabase` に戻して移行します。

## 4. 公開サイトから編集する

ブラウザで **https://www.luminous-official.jp/editorial/login** を開きます。

移行した場合は、これまでのメールアドレスとパスワードでログインできます。管理画面に「Supabaseに保存します」と表示されることを確認します。記事の「公開する」または「サイト設定を保存」で反映し、公開ページを再読み込みして確認してください。

Macでも `npm run dev` で起動できますが、Supabase接続中は**同じ保存先の公開データを変更します**。Macの以前の保存内容を、後から再移行して上書きすることはできません。今後は公開側の編集画面を使うと分かりやすくなります。

## アカウントを新規作成・再設定する場合

移行する場合は新規作成不要です。元のアカウントがない場合のみ、同じSupabase接続を設定したMacで実行します。

```bash
npm run editorial:setup
```

パスワード再設定は `npm run editorial:setup -- --reset`。Supabase接続中は公開側のアカウントを再設定し、既存のログインを無効にします。

## 保存の仕組みと検証の範囲

コンテンツとアカウントはSupabaseの非公開テーブル、アップロード画像は非公開Storageバケットに保存します。サイトのサーバーが `/media/...` から画像を配信します。保存時にデータベース内でバージョンを比較し、別のVercelインスタンスからの同時編集による上書きを拒否します。

画像アップロードはVercelのリクエストサイズ制限に合わせ、4MB以下です。JPEG・PNG・WebPを検証・WebP変換して保存します。

`npm run build && npm run test:editorial` でローカルと共有保存アダプターを検証します。共有保存テストはSupabase互換のテスト用サーバーを使い、実際のSupabaseプロジェクトやVercelの設定には接続しません。本番確認は初期設定・移行後に公開サイトで行います。
