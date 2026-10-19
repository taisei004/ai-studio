# Google認証の確認・設定

AI STUDIOに必要なのはGoogleログインのopenid/email/profileのみ。Google Cloudの課金アカウント、Gmail/Driveのアクセス権限、サービスアカウントの鍵は不要。

専用プロジェクト: `AI STUDIO`（`spatial-iris-512114-q1`）。既存プロジェクトの`now`クライアントとは分離する。

2026-10-20: Web OAuthクライアント作成、公開URLのみのリダイレクト登録、Worker Secretsへの設定、実Googleログイン/ログアウトとD1保存を確認済み。Google側の表示はExternal / Testingで作成し、その後の変更はしていない。基本identityスコープ（openid/email/profile）のみの場合はテスト利用者リスト制限の例外となる（[Google公式](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)）。ブランド審査は未実施で、Googleの同意画面にはアプリ名の代わりにドメインが表示される。Googleコンソールの対象設定画面は断続的な読み込みエラーがあり、本番ステータスへの切り替えは未実施。

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
