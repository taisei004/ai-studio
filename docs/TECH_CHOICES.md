# 技術選定と理由

| 採用                              | 理由・役割                                                                       | 制約 / 判断                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| React 19                          | 既存基盤を継続し、案件・承認・部屋の選択状態を同期する                           | PC向け操作が中心。サーバー描画やSEOのための別フレームワークは不要                               |
| TypeScript                        | UIとWorkerで型を共有し、状態・APIの不整合を検出                                  | 外部入力は型だけでは安全にならないためZodも使用                                                 |
| Vite 7                            | 素早いローカル更新と静的ビルド。Worker Static Assetsと分離しやすい               | Reactのuse client宣言に関する依存側警告はブラウザー専用アプリでは無害                           |
| CSS / Tailwind 4                  | 白、透過、ぼかし、境界、影、レイアウトをデザイントークンとして一元管理           | 主な意匠は専用CSS。標準DOMで読みやすさと操作性を維持                                            |
| Motion 12                         | 部屋間移動、選択、モーダル、ナビゲーションと画面切り替えに同じバネ・時間を使う   | OS/アプリのアニメーション低減に対応。待機中に無意味な自動進行をしない                           |
| SVG + HTML                        | 部屋の間取り・家具を解像度非依存で描き、社員と部屋のボタンはキーボード操作できる | PixiJSは今回の非ゲーム・少人数オフィスでは不要なため現行UIから除去。外部素材やWebGL依存を減らす |
| Lucide                            | 一貫した線幅・サイズのアイコン。機能名はテキストやaria-labelを併記               | Apple SF Symbolsの資産をWebへ流用しない                                                         |
| Cloudflare Workers                | ユーザー指定。API、認証、静的ファイルを1つの配信先にまとめ、サーバー管理を減らす | Node常駐サーバーを本番には使わない                                                              |
| Workers Static Assets             | SPAとAPIを同じoriginに配信。Cookie・CORS・運用を単純化                           | Cloudflare Pagesを別途作る必要がない                                                            |
| D1                                | SQLite系SQLで正規化、所有者分離、外部キー、状態遷移のトランザクションを扱える    | v0.1のJSON一括保存から変更。1ユーザーの全Stateを競合しながら上書きしない                        |
| Hono                              | Workersに適した小さなルーター。認証、ヘッダー、リクエストサイズ制限をまとめる    | 重いNode用Webサーバーを持ち込まない                                                             |
| Zod 4                             | フォーム・JSON・AIの構造化出力を同じスキーマで検証                               | AI出力をそのままDBへ登録しない                                                                  |
| jose 6                            | GoogleのJWKを使いID Tokenの署名とclaimsを検証                                    | 自作JWT署名・検証をしない                                                                       |
| Google OIDC + PKCE                | Googleのみのログイン要件。利用者がパスワードをアプリへ渡さずに済む               | Web OAuthクライアントと厳密なリダイレクトURLの登録が必要                                        |
| D1のハッシュ化セッション          | ブラウザーへOAuth Tokenを保存せず、失効・期限管理を行える                        | セッションCookieのみ。localStorageに認証情報を入れない                                          |
| MediaRecorder                     | PCブラウザーで録音データを取得し、認識処理はWorkers AIへ統一する                 | マイク許可が必要。非対応・拒否時はファイル/自然文/フォームを利用可能                            |
| Workers AI Whisper large v3 turbo | ユーザー指定のCloudflare内で音声を文字起こし。複数言語に対応                     | 60秒録音・8MB上限。音声をD1/R2に保存しない。実マイクの確認は発話が必要                          |
| Workers AI Llama 3.3 70B FP8 fast | JSON案件案と日本語成果物を同じ基盤で生成。既存Cloudflare bindingを利用           | Web調査やコード実行はしない。JSONは検証後、ユーザーが登録を確定                                 |
| Node Test + Miniflare             | 実際のworkerd/D1で所有者分離、状態遷移、競合、エラーを検証する                   | モデル応答は契約テストではスタブ、ブラウザーでは実Workers AIを別検証                            |
| pnpm / lockfile                   | 依存関係と公式レジストリのバージョンを固定し、他の開発者が再現できる             | Windows環境向けにhoisted構成とローカルストアを設定                                              |
| GitHub / GitHub Actions           | ソース管理とビルド・テストの再現。引き継ぎを同じリポジトリで行う                 | 秘密情報はGitに含めない。公開はユーザーの明示依頼による                                         |

## Appleガイドの取り入れ方

AppleネイティブのLiquid Glass APIはWebでは使わない。ガイドの階層、素材、可読性、動きの原則をCSSで実装する。ガラスをサイドバー・ツールバー・操作・ダイアログに使い、本文や成果物は白い安定した面にする。必要なときだけ色を使い、ぼかしを何層も重ねない。

## 一次資料（2026-10-19確認）

- Apple Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Liquid Glass: https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass
- Apple Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Cloudflare Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Workers AI bindings: https://developers.cloudflare.com/workers-ai/configuration/bindings/
- Whisper: https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/
- Llama: https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
- Google OIDC: https://developers.google.com/identity/openid-connect/openid-connect
- Vite: https://vite.dev/guide/
- Tailwind: https://tailwindcss.com/docs/installation/using-vite
