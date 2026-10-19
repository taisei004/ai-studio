# AI STUDIO

PC用Webアプリ。AIメンバーの所在・案件・タスク・承認・成果物を管理します。

- 会議室、リサーチ室、PCルーム、制作室、レビュー室、ラウンジ。
- タスク状態に応じたメンバー移動と、部屋・社員の詳細表示。
- 白基調のLiquid Glassを参考にしたUI。Motionによる画面遷移・移動、全画面スケルトン。
- フォーム、自然文、録音・音声ファイルによる案件入力。
- Workers AIの実生成、承認・修正依頼・保留。
- Cloudflare Workers / D1。ログインはGoogleのみ。

公開先: https://ai-studio.now-task.workers.dev

## 開発

Node.js 24以降、pnpm 11。

```sh
pnpm install
pnpm db:local
pnpm build
pnpm dev
```

http://127.0.0.1:5176 。Workersは4317番。Workers AIはremote bindingで実際のCloudflareアカウントを使用するため、`pnpm exec wrangler login` が必要です。
ローカル開発セッションはENVIRONMENT=developmentかつlocalhost/127.0.0.1限定。公開先で認証を迂回しません。

## 確認・公開

```sh
pnpm test
pnpm build
pnpm db:remote
pnpm exec wrangler deploy
```

単一テナントの個人用として公開する場合は `ALLOWED_EMAILS` シークレットに利用を許可するメールアドレスを設定します。未設定時はGoogleで認証した利用者ごとに独立したデータを作成します。
Google設定は [GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md) を参照。秘密情報は `.dev.vars` またはWorkers Secretsに保存し、Gitに含めません。

## 資料

- [技術選定と採用理由](docs/TECH_CHOICES.md)
- [製品仕様](docs/PRODUCT.md)
- [設計](docs/ARCHITECTURE.md)
- [検証記録](docs/TESTING.md)
- [引き継ぎ](docs/HANDOFF.md)

旧v0.1のローカルNode/SQLiteモックコードはserver/と旧テストに履歴参照用で残っています。現行の起動・公開には使いません。旧ローカルDBの自動移行はありません。
