# AI STUDIO

眺めて楽しい、任せて便利なAI制作オフィス。Windows向けローカルWebアプリの初期版です。

## 起動

Node.js 24以降、pnpmを使用します。

```powershell
cd C:\Users\taise\Documents\Codex\ai-studio
pnpm install
pnpm dev
```

ブラウザーで http://127.0.0.1:5176 を開きます。APIは4317番です。

```powershell
pnpm test
pnpm build
pnpm start
```

ビルド後の `pnpm start` は http://127.0.0.1:4317 でアプリを配信します。devとは同時起動しないでください。

## 最初の操作

1. Researcherをクリックし「開始」を押す。
2. 「成果物を作成」でモック書類を承認ボックスへ送る。
3. 承認ボックスで承認・修正依頼・保留する。
4. 承認すると進捗が更新され、次工程を開始できる。
5. 案件管理で各工程を操作する。新規案件、編集、削除に対応。

AI社員のプロフィール編集、指示のログ保存、成果物のMarkdown保存、設定画面からJSON書き出しができます。

**実AIは未接続です。** 時間経過による自動進行はありません。画面の実行はすべて手動モックです。

データは `data/studio.sqlite` に保存しGitから除外します。停止後にdataフォルダーをコピーしてバックアップできます。JSON書き出しは参照用で、インポートは未実装です。

## 開発ドキュメント

- [製品仕様](docs/PRODUCT.md)
- [設計](docs/ARCHITECTURE.md)
- [開発計画](docs/ROADMAP.md)
- [引き継ぎ](docs/HANDOFF.md)
- [会話の整理](docs/DISCUSSION.md)

オフィスのピクセル表現はPixiJSの図形とCSSで描画しています。外部画像・フォントに依存しません。
