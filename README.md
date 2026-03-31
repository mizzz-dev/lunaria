# Lunaria

プラグイン方式とルールエンジンを備えた、コミュニティ運営向け高機能 Discord Bot ＋ 管理ダッシュボード

A plugin-driven Discord Bot and management dashboard for community operations, with a built-in rule engine.

---

## はじめる前に / Prerequisites

以下がすべてインストール済みであることを確認してください。  
Make sure the following are installed before you start.

| ツール / Tool | バージョン / Version | 確認コマンド / Check |
|--------------|---------------------|---------------------|
| Node.js | 20 以上 / 20+ | `node -v` |
| pnpm | 9 以上 / 9+ | `pnpm -v` |
| Docker Desktop | 最新推奨 / Latest | `docker -v` |

> **pnpm が入っていない場合 / If pnpm is not installed:**
> ```bash
> npm install -g pnpm
> ```

---

## Discord Bot の準備 / Discord Bot Setup

Bot を動かすには Discord Developer Portal でアプリを作る必要があります。  
You need to create an app in the Discord Developer Portal.

1. https://discord.com/developers/applications を開く / Open the URL
2. 右上の **New Application** をクリックしてアプリを作成 / Click **New Application**
3. 左メニュー **Bot** → **Reset Token** でトークンをコピー → `DISCORD_BOT_TOKEN` に使用  
   Left menu **Bot** → **Reset Token** → copy the token (this is your `DISCORD_BOT_TOKEN`)
4. 左メニュー **OAuth2** → `CLIENT ID` と `CLIENT SECRET` をコピー  
   Left menu **OAuth2** → copy `CLIENT ID` and `CLIENT SECRET`
5. 左メニュー **Bot** → **Privileged Gateway Intents** で以下を ON にする  
   Left menu **Bot** → **Privileged Gateway Intents** → enable:
   - Server Members Intent
   - Message Content Intent

---

## セットアップ手順 / Setup

### ① クローン / Clone

```bash
git clone https://github.com/mizzzk-dev/lunaria.git
cd lunaria
```

### ② 依存関係のインストール / Install dependencies

```bash
pnpm install
```

> `node_modules` が作られます。数分かかることがあります。  
> This creates `node_modules` and may take a few minutes.

### ③ データベースと Redis を起動 / Start the database and Redis

```bash
pnpm docker:up
```

> Docker Desktop が起動している状態で実行してください。  
> Make sure Docker Desktop is running before executing this command.

起動確認 / Verify:
```bash
docker ps
```
`lunaria-postgres` と `lunaria-redis` が `Up` になっていれば OK。  
Both `lunaria-postgres` and `lunaria-redis` should show `Up`.

### ④ 環境変数の設定 / Configure environment variables

```bash
cp .env.example .env
```

`.env` を開き、以下の項目を書き換えます / Open `.env` and fill in:

```env
# Discord Developer Portal でコピーしたもの / From Discord Developer Portal
DISCORD_BOT_TOKEN=ここにトークンを貼り付け / paste token here
DISCORD_CLIENT_ID=ここにクライアントIDを貼り付け / paste client ID here
DISCORD_CLIENT_SECRET=ここにクライアントシークレットを貼り付け / paste client secret here

# ランダムな秘密鍵 / Random secret keys
JWT_SECRET=32文字以上のランダム文字列 / random string, 32+ chars
COOKIE_SECRET=32文字以上のランダム文字列 / random string, 32+ chars
BOT_INTERNAL_SECRET=32文字以上のランダム文字列 / random string, 32+ chars
NEXTAUTH_SECRET=32文字以上のランダム文字列 / random string, 32+ chars
```

> **秘密鍵の生成 / Generate secret keys (Mac/Linux):**
> ```bash
> openssl rand -base64 32
> ```
> 出力をそのまま貼り付けてください。/ Paste the output directly.

### ⑤ データベースのセットアップ / Database setup

```bash
pnpm db:migrate   # テーブルを作成 / Create tables
pnpm db:seed      # 初期データを投入 / Insert seed data
```

> エラーが出る場合は `pnpm docker:up` を実行してから少し待って再試行してください。  
> If you get an error, run `pnpm docker:up`, wait a few seconds, then retry.

### ⑥ 起動 / Start

```bash
pnpm dev
```

以下の4つが同時に起動します / All four services start together:

| サービス / Service | URL |
|-------------------|-----|
| ダッシュボード / Dashboard | http://localhost:3000 |
| API サーバー / API Server | http://localhost:4000 |
| API ドキュメント / API Docs (Swagger) | http://localhost:4000/api/docs |
| Discord Bot | Discord 上で動作 / Runs on Discord |

---

## 動作確認 / Verify it works

**API:** ブラウザで http://localhost:4000/api/docs を開き Swagger UI が表示されれば OK。  
Open http://localhost:4000/api/docs — if Swagger UI loads, the API is running.

**DB 管理画面 / DB Studio:**
```bash
pnpm db:studio
```
http://localhost:5555 でデータを閲覧・編集できます。  
Browse and edit data at http://localhost:5555.

**Bot のサーバー招待 / Invite Bot to your server:**  
Discord Developer Portal → **OAuth2 → URL Generator** で以下を選択 / select:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Administrator`

生成された URL をブラウザで開き、Bot をサーバーに招待します。  
Open the generated URL and invite the Bot to your server.

---

## よく使うコマンド / Common commands

```bash
pnpm dev              # 全アプリを起動（開発モード）/ Start all apps (dev mode)
pnpm build            # 本番用ビルド / Production build
pnpm typecheck        # 型エラーチェック / Type check
pnpm lint             # コードスタイルチェック / Lint
pnpm docker:up        # DB + Redis 起動 / Start DB + Redis
pnpm docker:down      # DB + Redis 停止 / Stop DB + Redis
pnpm db:studio        # DB 管理画面 / Open DB GUI
pnpm db:migrate       # DB スキーマを更新 / Apply DB migrations
pnpm db:seed          # 初期データを投入 / Insert seed data
```

---

## トラブルシューティング / Troubleshooting

**`pnpm install` でエラー / Error on `pnpm install`**  
Node.js のバージョンが古い可能性があります。`node -v` で 20 以上か確認してください。  
Your Node.js version may be too old. Check `node -v` is 20 or higher.

**`pnpm db:migrate` で接続エラー / Connection error on `pnpm db:migrate`**  
Docker が起動していない可能性があります。  
Docker may not be running yet.
```bash
pnpm docker:up
# 10秒ほど待ってから / Wait ~10 seconds, then:
pnpm db:migrate
```

**Bot がオフラインのまま / Bot stays offline**  
`.env` の `DISCORD_BOT_TOKEN` が正しいか確認してください。  
Check that `DISCORD_BOT_TOKEN` in `.env` is correct.  
トークンは Discord Developer Portal → Bot → **Reset Token** で再発行できます。  
You can re-issue a token at Discord Developer Portal → Bot → **Reset Token**.

---

## プロジェクト構成 / Project structure

```
lunaria/
├── apps/
│   ├── api/          # REST API サーバー / API server (Fastify, port 4000)
│   ├── bot/          # Discord Bot (discord.js)
│   ├── dashboard/    # 管理ダッシュボード / Dashboard (Next.js, port 3000)
│   └── worker/       # バックグラウンドジョブ / Background jobs (BullMQ)
└── packages/
    ├── db/           # データベース操作 / Database (Prisma)
    ├── types/        # 型定義 / Shared types
    ├── shared/       # 共通ユーティリティ / Utilities
    ├── plugin-sdk/   # プラグイン定義 / Plugin registry (15 plugins)
    ├── rule-engine/  # ルールエンジン / Rule engine
    └── ui/           # UI コンポーネント / UI components
```

**Stack:** TypeScript · Fastify · discord.js v14 · Next.js 14 · Prisma · PostgreSQL · Redis · BullMQ · pnpm workspaces · Turbo
