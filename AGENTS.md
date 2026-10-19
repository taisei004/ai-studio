# AI STUDIO 開発ルール

最初にREADME.md、docs/PRODUCT.md、docs/ARCHITECTURE.md、docs/HANDOFF.mdを読む。

- 現行仕様はユーザーの2026-10-19の追加依頼を優先する。PC用Webアプリ、白基調Liquid Glass、部屋による稼働表示。宣伝・挨拶・キャッチコピーは不要。
- バックエンドはCloudflare Workers/D1、AIはWorkers AI、ログインはGoogleのみ。実行処理をUIから分離し、ユーザー操作に対応する送信のみ行う。
- 進捗と状態は実タスクから計算する。時間経過だけで成功にしない。
- モックは明示表示する。内部思考の表示ではなく実行ログと成果物を表示する。
- 認証情報、data、node_modules、distはコミットしない。
- 変更後はpnpm testとpnpm build。UIを変えたらブラウザーで確認。
- 不明点は文書の確定事項と実装判断を区別し、判断をHANDOFFに残す。
- ClaudeとCodexが同時に同じファイルを編集しない。
- 引き継ぎ前にHANDOFFの実装・検証・制限を更新する。
