# Google認証の確認・設定

AI STUDIOに必要なのはGoogleログインのopenid/email/profileのみ。Google Cloudの課金アカウント、Gmail/Driveのアクセス権限、サービスアカウントの鍵は不要。

## 確認する順序

1. Google Cloud Consoleに、管理したいGoogleアカウントでログインする。
2. プロジェクト一覧を確認する。既存のAI STUDIO向けプロジェクトがなければ専用プロジェクトを作る。
3. Google Auth Platformでアプリ名・サポート連絡先を設定。
4. 対象（自分のみのテスト / 一般利用）を確認。テスト公開の場合は必要なテストユーザーを登録する。
5. クライアント→WebアプリケーションのOAuthクライアントを作成。

## リダイレクトURL

```text
https://ai-studio.now-task.workers.dev/auth/google/callback
http://localhost:5176/auth/google/callback
http://127.0.0.1:5176/auth/google/callback
http://localhost:4317/auth/google/callback
http://127.0.0.1:4317/auth/google/callback
```

本番だけ利用する場合は本番の1件のみでよい。URLは末尾スラッシュを含め完全一致で登録する。

## Workerへ登録

```sh
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
```

CLIの対話入力で登録する。チャット、Git、コマンド引数、スクリーンショットに秘密を含めない。
ローカルは `.dev.vars.example` を参考に、Git対象外の `.dev.vars` へ設定する。

認証クライアントを新規に作成する場面では、認証情報の作成になるためブラウザー操作ポリシーに従って、その操作時に確認する。既存設定を読んで調べる操作は確認不要。

## 実接続のテスト

公開URLを開く→Googleでログイン→本人のアカウントを選択→アプリへ戻る→案件作成と再読み込み→ログアウト→保護APIが401になることを確認。
テスト用のローカル開発セッションはGoogleログイン成功の代わりには数えない。

参照: https://developers.google.com/identity/openid-connect/openid-connect
