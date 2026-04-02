# Lunaria

プラグイン方式とルールエンジンを備えた、コミュニティ運営向け高機能 Discord Bot ＋ 管理ダッシュボード

---

## はじめる前に

以下がすべてインストール済みであることを確認してください。

| ツール | バージョン | 確認コマンド |
|--------|-----------|-------------|
| Node.js | 20 以上 | `node -v` |
| pnpm | 9 以上 | `pnpm -v` |
| Docker Desktop | 最新推奨 | `docker -v` |

> **pnpm が入っていない場合:**
> ```bash
> npm install -g pnpm
> ```

---

## Discord Bot の準備

Bot を動かすには Discord Developer Portal でアプリを作る必要があります。

1. https://discord.com/developers/applications を開く
2. 右上の **New Application** をクリックしてアプリを作成
3. 左メニュー **Bot** → **Reset Token** でトークンをコピー → `DISCORD_BOT_TOKEN` に使用
4. 左メニュー **OAuth2** → `CLIENT ID` と `CLIENT SECRET` をコピー
5. 左メニュー **Bot** → **Privileged Gateway Intents** で以下を ON にする
   - Server Members Intent
   - Message Content Intent

---

## セットアップ手順

### ① クローン

```bash
git clone https://github.com/mizzzk-dev/lunaria.git
cd lunaria
```

### ② 依存関係のインストール

```bash
pnpm install
```

> `node_modules` が作られます。数分かかることがあります。

### ③ データベースと Redis を起動

```bash
pnpm docker:up
```

> Docker Desktop が起動している状態で実行してください。

起動確認:
```bash
docker ps
```
`lunaria-postgres` と `lunaria-redis` が `Up` になっていれば OK。

### ④ 環境変数の設定

```bash
cp .env.example .env
```

`.env` を開き、以下の項目を書き換えます:

```env
# Discord Developer Portal でコピーしたもの
DISCORD_BOT_TOKEN=ここにトークンを貼り付け
DISCORD_CLIENT_ID=ここにクライアントIDを貼り付け
DISCORD_CLIENT_SECRET=ここにクライアントシークレットを貼り付け

# ランダムな秘密鍵（下のコマンドで生成）
JWT_SECRET=32文字以上のランダム文字列
COOKIE_SECRET=32文字以上のランダム文字列
BOT_INTERNAL_SECRET=32文字以上のランダム文字列
NEXTAUTH_SECRET=32文字以上のランダム文字列
```

> **秘密鍵の生成（Mac/Linux）:**
> ```bash
> openssl rand -base64 32
> ```
> 出力された文字列をそのまま貼り付けてください。

### ⑤ データベースのセットアップ

```bash
pnpm db:migrate   # テーブルを作成
pnpm db:seed      # 初期データを投入
```

> エラーが出る場合は `pnpm docker:up` を実行してから少し待って再試行してください。

### ⑥ 起動

```bash
pnpm dev
```

以下の4つが同時に起動します:

| サービス | URL |
|---------|-----|
| ダッシュボード | http://localhost:3000 |
| API サーバー | http://localhost:4000 |
| API ドキュメント（Swagger） | http://localhost:4000/api/docs |
| Discord Bot | Discord 上で動作 |

---

## 動作確認

**API:** ブラウザで http://localhost:4000/api/docs を開き、Swagger UI が表示されれば OK。

**DB 管理画面:**
```bash
pnpm db:studio
```
http://localhost:5555 でデータを閲覧・編集できます。

**Bot のサーバー招待:**
Discord Developer Portal → **OAuth2 → URL Generator** で以下を選択:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Administrator`

生成された URL をブラウザで開き、Bot をサーバーに招待します。

---

## よく使うコマンド

```bash
pnpm dev              # 全アプリを起動（開発モード）
pnpm build            # 本番用ビルド
pnpm typecheck        # 型エラーチェック
pnpm lint             # コードスタイルチェック
pnpm docker:up        # DB + Redis 起動
pnpm docker:down      # DB + Redis 停止
pnpm db:studio        # DB 管理画面を開く
pnpm db:migrate       # DB スキーマを更新
pnpm db:seed          # 初期データを投入
```

---

## トラブルシューティング

**`pnpm install` でエラー**
Node.js のバージョンが古い可能性があります。`node -v` で 20 以上か確認してください。

**`pnpm db:migrate` で接続エラー**
Docker が起動していない可能性があります。
```bash
pnpm docker:up
# 10秒ほど待ってから:
pnpm db:migrate
```

**Bot がオフラインのまま**
`.env` の `DISCORD_BOT_TOKEN` が正しいか確認してください。
トークンは Discord Developer Portal → Bot → **Reset Token** で再発行できます。

---

## プロジェクト構成

```
lunaria/
├── apps/
│   ├── api/          # REST API サーバー（Fastify、ポート 4000）
│   ├── bot/          # Discord Bot（discord.js）
│   ├── dashboard/    # 管理ダッシュボード（Next.js、ポート 3000）
│   └── worker/       # バックグラウンドジョブ（BullMQ）
└── packages/
    ├── db/           # データベース操作（Prisma）
    ├── types/        # 型定義
    ├── shared/       # 共通ユーティリティ
    ├── plugin-sdk/   # プラグイン定義（15種類）
    ├── rule-engine/  # ルールエンジン
    └── ui/           # UI コンポーネント
```

**技術スタック:** TypeScript · Fastify · discord.js v14 · Next.js 14 · Prisma · PostgreSQL · Redis · BullMQ · pnpm workspaces · Turbo

---

## ドキュメント

| ファイル | 内容 |
|---------|------|
| `docs/setup-guide.md` | 詳細なセットアップ手順（初心者向け） |
| `docs/test-spec.md` | テスト仕様書（219 テストケース） |
| `openapi.yaml` | OpenAPI 3.1 仕様書 |
