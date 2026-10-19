# 現行設計

ブラウザー → Cloudflare Worker（静的ファイル + Hono API + Google OAuth）→ D1 / Workers AI。

## ソース

- `src/main.tsx`: セッション、画面、選択状態、操作。
- `src/components/`: ボタン、ダイアログ、スケルトン、案件入力、社員詳細。
- `src/pages/WorkspaceViews.tsx`: 案件、社員、承認、成果物、設定。
- `src/office/Office.tsx`: SVGの部屋・家具、DOMの選択可能なメンバー、Motionの移動。
- `shared/studio.ts`: 型、テンプレート、進捗と所在計算。
- `worker/index.ts`: API、所有者確認、状態遷移、実行リース。
- `worker/auth.ts`: Google OIDC Authorization Code + PKCE、nonce、JWT検証、D1セッション。
- `worker/data.ts`: 正規化D1アクセス、初期社員、利用回数。
- `worker/ai.ts`: Workers AI、入力検証、自然文の案件案への変換。
- `migrations/0001_studio.sql`: ユーザー、セッション、案件、社員、タスク、成果物、承認、ログ、利用数。

## セキュリティと実行

全データ操作をuser_idで制限。パスワードは扱わずGoogleのopenid/email/profileのみ。Google ID Tokenは公開鍵・issuer・audience・nonce・メール検証状態を確認。セッションは32バイト乱数、D1にはSHA-256ハッシュのみ保存、HttpOnly/Secure/SameSite=Lax Cookieで7日。
POSTは同一Originのみ。CSP、frame-ancestors、Permissions Policy、入力サイズ・形式・スキーマを検証。公開用ENVIRONMENTはproduction。

生成要求はD1の条件付きUPDATEでrun_idを取得し、二重生成を防止。生成中の案件削除は禁止。結果と承認依頼、状態更新はD1 batchのトランザクションで反映。失敗はerror。5分以上経過した実行リースは読み込み時にerrorに戻す。
本文はReactのテキスト/pre要素で表示し、生HTMLとして実行しない。

AI本文生成50回/日、自然文整理・文字起こし各30回/日（ユーザー別、UTC日付）。APIの利用回数は実行要求時に加算し、失敗も含む。1回のテキスト生成は最大2200出力トークン。R2/KV/Queuesは現時点では不要なので作成しない。

## 配信と開発

本番: WorkerがdistをStatic Assetsで配信し、/api/*と/auth/*だけWorkerを先に実行。Vite開発時は5176→4317にプロキシ。CookieとOriginは同一ホストを維持。
5秒間隔の表示更新はタブが表示中かつ操作待ちでない場合のみ。初回セッション・データ待ちは全画面スケルトン。偽の待ち時間は追加しない。

## 今後

長時間ジョブやツール実行を追加する場合はCloudflare Workflows/Queues/Agentsを検討し、run_idとキャンセル/再開を拡張する。現行の単発文章生成に合わせ、初期運用で不要な構成は増やしていない。
