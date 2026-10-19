# 引き継ぎ v0.2 — 2026-10-19

v0.1から要件変更。現行仕様はPRODUCT.md、技術選定理由はTECH_CHOICES.md、設計はARCHITECTURE.md。

## 現状

Workers / D1 / Workers AIの構成へ移行。部屋と社員所在、案件CRUD、社員編集、承認・保留・修正、実AI生成、音声ファイル文字起こしと案件案作成を実装。Google OIDC、PKCE、署名検証とサーバーセッションを実装。
Google Cloudの既存設定はユーザーと一から確認中。実接続完了まではGoogle認証を検証済み扱いにしない。

公開URL: https://ai-studio.now-task.workers.dev
GitHub: https://github.com/taisei004/ai-studio

## 開発

pnpm install → pnpm db:local → pnpm build → pnpm dev。
通常のNode 24。Workers AIはremote binding。旧server/は起動しない。`.wrangler`と`.dev.vars`はGit対象外。
新規D1は空の案件一覧と6人の社員で開始。旧ローカルデータは自動移行しない。

## 検証

TESTING.mdに現在の結果・未検証を記録。Miniflare契約テストのモデル応答はスタブ。別途ブラウザーで実Workers AIから生成と文字起こしに成功。
本番でGoogle認証が未設定の場合、ログイン画面に設定準備中を表示し、データAPIは401となる。公開環境で開発セッションへフォールバックしない。

## 制限

リサーチはモデルの提案（Web検索なし）。タスクはテンプレートから作成した直列工程。音声認識後はフォームの確認が必要。実マイク収録とGoogle認証の本人選択は実機操作が必要。

## 次の開発者

AGENTS.md→README→PRODUCT→ARCHITECTURE→TECH_CHOICES→TESTINGの順に読む。pnpm testとpnpm buildで現状確認。仕様を旧v0.1に戻さない。Google認証の接続状態と公開版を確認してから、未検証項目や次の機能へ進む。
