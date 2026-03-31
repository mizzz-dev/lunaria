# Lunaria

プラグイン方式とルールエンジンを備えた、コミュニティ運営向け高機能 Discord Bot ＋ 管理ダッシュボード

---

## はじめる前に確認すること

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
3. 左メニュー **Bot** → **Reset Token** でトークンをコピー（これが `DISCORD_BOT_TOKEN`）
4. 左メニュー **OAuth2** → `CLIENT ID` と `CLIENT SECRET` をコピー
5. 左メニュー **Bot** → **Privileged Gateway Intents** で以下を ON にする
   - Server Members Intent
   - Message Content Intent

---

## セットアップ手順

### ① リポジトリをクローン

```bash
git clone https://github.com/mizzzk-dev/lunaria.git
cd lunaria
```

### ② 依存関係をインストール

```bash
pnpm install
```

> `node_modules` が作られます。数分かかることがあります。

### ③ データベースと Redis を起動

```bash
pnpm docker:up
```

> Docker Desktop が起動している状態で実行してください。
> PostgreSQL（DB）と Redis（キュー）がバックグラウンドで立ち上がります。

起動確認:
```bash
docker ps
```
`lunaria-postgres` と `lunaria-redis` が `Up` になっていれば OK です。

### ④ 環境変数ファイルを作成

```bash
cp .env.example .env
```

`.env` をテキストエディタで開き、以下の項目を書き換えます:

```env
# Discord Developer Portal でコピーしたもの
DISCORD_BOT_TOKEN=ここにトークンを貼り付け
DISCORD_CLIENT_ID=ここにクライアントIDを貼り付け
DISCORD_CLIENT_SECRET=ここにクライアントシークレットを貼り付け

# ランダムな秘密鍵（下のコマンドで生成できます）
JWT_SECRET=ここに32文字以上のランダム文字列
COOKIE_SECRET=ここに32文字以上のランダム文字列
BOT_INTERNAL_SECRET=ここに32文字以上のランダム文字列
NEXTAUTH_SECRET=ここに32文字以上のランダム文字列
```

> **秘密鍵の生成方法（Mac/Linux）:**
> ```bash
> openssl rand -base64 32
> ```
> 出力された文字列をそのまま貼り付けてください。

### ⑤ データベースをセットアップ

```bash
pnpm db:migrate   # テーブルを作成
pnpm db:seed      # 初期データを投入
```

> エラーが出る場合は `pnpm docker:up` を実行してから少し待って再試行してください。

### ⑥ アプリを起動

```bash
pnpm dev
```

以下の4つが同時に起動します:

| サービス | URL |
|---------|-----|
| ダッシュボード | http://localhost:3000 |
| API サーバー | http://localhost:4000 |
| API ドキュメント (Swagger) | http://localhost:4000/api/docs |
| Discord Bot | Discord 上で動作 |

---

## 動作確認

### API が動いているか確認

ブラウザで http://localhost:4000/api/docs を開き、Swagger UI が表示されれば OK。

### DB の中身を GUI で確認

```bash
pnpm db:studio
```

http://localhost:5555 でデータを閲覧・編集できます。

### Bot がサーバーに参加しているか確認

Discord Developer Portal → **OAuth2 → URL Generator** で以下を選択:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Administrator`

生成された URL をブラウザで開き、Bot をサーバーに招待します。

---

## よく使うコマンド

```bash
pnpm dev              # 全アプリをまとめて起動（開発モード）
pnpm build            # 本番用ビルド
pnpm typecheck        # 型エラーチェック
pnpm lint             # コードスタイルチェック
pnpm docker:up        # DB + Redis 起動
pnpm docker:down      # DB + Redis 停止
pnpm db:studio        # DB 管理画面を開く
pnpm db:migrate       # DB スキーマを最新に更新
pnpm db:seed          # 初期データを再投入
```

---

## トラブルシューティング

### `pnpm install` でエラーが出る

Node.js のバージョンが古い可能性があります。`node -v` で 20 以上か確認してください。

### `pnpm db:migrate` で接続エラーが出る

Docker が起動していないか、起動途中の可能性があります。
```bash
pnpm docker:up
# 10秒ほど待ってから
pnpm db:migrate
```

### Bot がオフラインのまま

`.env` の `DISCORD_BOT_TOKEN` が正しいか確認してください。
トークンは Discord Developer Portal → Bot → **Reset Token** で再発行できます（再発行すると古いトークンは無効になります）。

---

## プロジェクト構成

```
lunaria/
├── apps/
│   ├── api/          # REST API サーバー (Fastify, ポート 4000)
│   ├── bot/          # Discord Bot (discord.js)
│   ├── dashboard/    # 管理ダッシュボード (Next.js, ポート 3000)
│   └── worker/       # バックグラウンドジョブ (BullMQ)
└── packages/
    ├── db/           # データベース操作 (Prisma)
    ├── types/        # 型定義
    ├── shared/       # 共通ユーティリティ
    ├── plugin-sdk/   # プラグイン定義 (15種類)
    ├── rule-engine/  # ルールエンジン
    └── ui/           # UI コンポーネント
```
