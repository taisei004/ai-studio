# アーキテクチャ

UI: React / TypeScript / Vite / Tailwind CSS。OfficeはPixiJS v8で床・家具を描画し、社員ボタンをHTMLで重ねる。DOMを使うためキーボード選択と日本語文字の読みやすさを維持できる。描画素材はコード生成。

API: Node.js 24のHTTPサーバー（127.0.0.1:4317）。開発はVite 5176からAPIをプロキシし、ビルド後は同APIがdistを配信。

永続化: Node組み込みnode:sqlite。`studio`テーブルにState全体のJSONを原子的に書き込む。WAL有効。初期版の単一プロセス・単一ユーザー・同期モックに限定。今後の非同期実行や複数利用者に対応させる前に正規化、トランザクション、実行キュー、状態の競合制御が必要。

## ファイル

- shared/domain.ts: Agent / Project / Task / Approval / Artifact / Log、進捗計算。
- server/store.ts: 初期データ、状態遷移、永続化。
- server/agents/runner.ts: AgentRunnerインターフェースとMockRunner。
- server/index.ts: JSON APIと静的ファイル配信。
- src/main.tsx: アプリの画面と操作。
- src/office/Office.tsx: オフィス描画。
- src/styles.css: 配色・レイアウト・レスポンシブ・状態演出。

## API

GET /api/state → State。
POST /api/action → {action,id,...fields}。成功時に更新後Stateを返し、失敗時400とerrorを返す。
アクション: createProject / editProject / deleteProject / editAgent / start / finish / fail / approve / revise / hold / message。

## 実AI接続時の境界

AgentRunner.run(Task)は成果物のタイトルと本文を返す。現在はサーバー内で同期的なモックを待つだけ。実実行ではjobId、runId、キャンセル、イベント配信、成果物ファイル参照、明示した許可範囲を追加する。モデル設定欄は保存のみで、現在のRunner選択に影響しない。

ローカル待受・既知Originの確認・JSON必須・リクエスト上限あり。認証機能はないためLAN公開やインターネット公開には未対応。認証情報は保存しない。

参照: https://vite.dev/guide/ 、https://nodejs.org/api/sqlite.html 、https://tailwindcss.com/docs/installation/using-vite
