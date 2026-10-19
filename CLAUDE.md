# Claude Code

AGENTS.mdの共通ルールに従う。README.md、docs/HANDOFF.md、docs/PRODUCT.md、docs/ARCHITECTURE.md、docs/TECH_CHOICES.md、docs/TESTING.mdを読む。
現行版はPC Web / Liquid Glass / 部屋による所在 / Cloudflare Workers・D1・Workers AI / Googleのみの認証。旧ローカルモックに戻さない。
変更後にpnpm test・pnpm buildを実行し、UIは実ブラウザーで確認。テストのスタブと実サービス接続の検証を区別する。
