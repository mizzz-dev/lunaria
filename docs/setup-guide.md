# ローカル開発環境 ビルド・起動手順

> 対象読者: プログラミング初心者〜中級者
> 所要時間: 約 30〜45 分（初回）

---

## 目次

1. [必要なツールの確認・インストール](#1-必要なツールの確認インストール)
2. [リポジトリをパソコンに取得する](#2-リポジトリをパソコンに取得する)
3. [Discord Bot の準備](#3-discord-bot-の準備)
4. [データベースと Redis を起動する](#4-データベースと-redis-を起動する)
5. [環境変数を設定する](#5-環境変数を設定する)
6. [依存パッケージをインストールする](#6-依存パッケージをインストールする)
7. [データベースをセットアップする](#7-データベースをセットアップする)
8. [アプリを起動する](#8-アプリを起動する)
9. [スラッシュコマンドを Discord に登録する](#9-スラッシュコマンドを-discord-に登録する)
10. [動作確認](#10-動作確認)
11. [停止方法](#11-停止方法)
12. [よくあるエラーと対処法](#12-よくあるエラーと対処法)

---

## 1. 必要なツールの確認・インストール

ターミナル（Mac: Terminal.app / Windows: PowerShell）を開いて以下を確認してください。

### Node.js（バージョン 20 以上）

```bash
node -v
```

`v20.x.x` または `v22.x.x` と表示されれば OK。
表示されない場合は [https://nodejs.org](https://nodejs.org) から **LTS 版** をインストールしてください。

---

### pnpm（バージョン 9 以上）

```bash
pnpm -v
```

表示されない場合はインストールします。

```bash
npm install -g pnpm
```

インストール後、`pnpm -v` を実行して `9.x.x` と表示されれば OK。

---

### Docker Desktop

```bash
docker -v
```

表示されない場合は [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) からインストールしてください。
インストール後、**Docker Desktop アプリを起動**してください（タスクバー/メニューバーにクジラのアイコンが出ていれば OK）。

---

### Git

```bash
git -v
```

表示されない場合は [https://git-scm.com](https://git-scm.com) からインストールしてください。

---

## 2. リポジトリをパソコンに取得する

```bash
git clone https://github.com/mizzzk-dev/lunaria.git
cd lunaria
```

> **`cd lunaria`** を忘れずに実行してください。以後のコマンドはすべてこのフォルダの中で実行します。

---

## 3. Discord Bot の準備

Bot を動かすには Discord の開発者アカウントが必要です。

### 3-1. アプリを作成する

1. [https://discord.com/developers/applications](https://discord.com/developers/applications) を開く
2. 右上の **「New Application」** ボタンをクリック
3. 名前を入力（例: `Lunaria Dev`）して **「Create」**

### 3-2. Bot トークンを取得する

1. 左メニューの **「Bot」** をクリック
2. **「Reset Token」** → 確認ダイアログで **「Yes, do it!」**
3. 表示されたトークンをコピーしてメモ帳に保存
   ⚠️ **このトークンは一度しか表示されません。必ずメモしてください。**

### 3-3. 権限を有効にする

同じ **「Bot」** ページの下部 **「Privileged Gateway Intents」** で以下を **ON** にする:

- ✅ **Server Members Intent**
- ✅ **Message Content Intent**

**「Save Changes」** をクリックして保存。

### 3-4. Client ID と Client Secret を取得する

1. 左メニューの **「OAuth2」** をクリック
2. **「Client ID」** をコピー → メモ帳に保存
3. **「Client Secret」** の **「Reset Secret」** → コピー → メモ帳に保存

---

## 4. データベースと Redis を起動する

Docker Desktop が起動している状態で実行します。

```bash
pnpm docker:up
```

起動確認（1〜2 分待ってから実行）:

```bash
docker ps
```

以下の 2 行が表示されれば OK:

```
lunaria-postgres   Up ...
lunaria-redis      Up ...
```

> `Up` にならない場合は Docker Desktop が起動しているか確認してください。

---

## 5. 環境変数を設定する

### 5-1. ファイルをコピーする

```bash
cp .env.example .env
```

### 5-2. .env を編集する

テキストエディタ（VS Code 推奨）で `.env` を開きます。

```bash
# VS Code を使っている場合
code .env
```

以下の項目を**必ず**書き換えてください:

```env
# ─────────────────────────────────────────────
# Discord（手順 3 でメモしたもの）
# ─────────────────────────────────────────────
DISCORD_BOT_TOKEN=ここにBotトークンを貼り付け
DISCORD_CLIENT_ID=ここにClient IDを貼り付け
DISCORD_CLIENT_SECRET=ここにClient Secretを貼り付け

# 開発用サーバーのID（スラッシュコマンドをすぐ反映させるために使用）
# Discord でサーバーを右クリック → 「IDをコピー」
DISCORD_DEV_GUILD_ID=ここにサーバーIDを貼り付け

# ─────────────────────────────────────────────
# 秘密鍵（以下のコマンドで生成できます）
# ─────────────────────────────────────────────
JWT_SECRET=生成した文字列を貼り付け
COOKIE_SECRET=生成した文字列を貼り付け
BOT_INTERNAL_SECRET=生成した文字列を貼り付け
NEXTAUTH_SECRET=生成した文字列を貼り付け
```

### 5-3. 秘密鍵を生成する

**Mac / Linux の場合:**

```bash
openssl rand -base64 32
```

このコマンドを **4 回** 実行し、出力された文字列を 4 つの秘密鍵にそれぞれ貼り付けてください。

**Windows (PowerShell) の場合:**

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 5-4. サーバー ID の確認方法

Discord の **開発者モード** を有効にする必要があります:

1. Discord 設定 → 「詳細設定」→ **「開発者モード」** を ON
2. テスト用サーバーを右クリック → **「IDをコピー」**
3. `.env` の `DISCORD_DEV_GUILD_ID` に貼り付け

---

## 6. 依存パッケージをインストールする

```bash
pnpm install
```

> `node_modules` が作成されます。初回は 2〜5 分かかることがあります。
> `warn` は無視して OK。`error` が出た場合は [よくあるエラーと対処法](#12-よくあるエラーと対処法) を確認してください。

---

## 7. データベースをセットアップする

### 7-1. テーブルを作成する

```bash
pnpm db:migrate
```

> `✔ Your database is now in sync with your schema.` と表示されれば OK。
> エラーが出た場合、Docker が完全に起動していない可能性があります。30 秒待ってから再実行してください。

### 7-2. 初期データを投入する

```bash
pnpm db:seed
```

> パーミッション定義など、動作に必要な初期データが投入されます。

---

## 8. アプリを起動する

**全サービスをまとめて起動:**

```bash
pnpm dev
```

以下の 4 つが同時に起動します:

| サービス | 起動ログの目印 | URL |
|---------|-------------|-----|
| API サーバー | `Server listening at http://0.0.0.0:4000` | http://localhost:4000 |
| Bot | `[bot] Ready. Logged in as Lunaria Dev#XXXX` | Discord 上で動作 |
| Worker | `[worker] Ready.` | バックグラウンド処理 |
| Dashboard | `▲ Next.js ready on http://localhost:3000` | http://localhost:3000 |

> `Ctrl + C` でまとめて停止できます。

**サービスを個別に起動したい場合:**

```bash
# ターミナルを 4 つ開いてそれぞれ実行
pnpm --filter @lunaria/api dev
pnpm --filter @lunaria/bot dev
pnpm --filter @lunaria/worker dev
pnpm --filter @lunaria/dashboard dev
```

---

## 9. スラッシュコマンドを Discord に登録する

Bot を Discord サーバーに招待し、スラッシュコマンドを使えるようにします。

### 9-1. Bot をサーバーに招待する

1. [Discord Developer Portal](https://discord.com/developers/applications) を開く
2. 作成したアプリを選択
3. 左メニュー **「OAuth2」→「URL Generator」**
4. **Scopes** で `bot` と `applications.commands` にチェック
5. **Bot Permissions** で `Administrator` にチェック
6. 生成された URL をブラウザで開き、テスト用サーバーに招待

### 9-2. コマンドを登録する

Bot が起動している状態で新しいターミナルを開き:

```bash
pnpm --filter @lunaria/bot deploy-commands
```

> `DISCORD_DEV_GUILD_ID` が設定されていると、そのサーバーだけに即時反映されます（未設定の場合は全サーバーに反映されますが 1 時間かかることがあります）。

Discord で `/` を入力すると `ping`, `level`, `ticket`, `quote` などのコマンドが表示されれば OK。

---

## 10. 動作確認

### API が動いているか確認

ブラウザで [http://localhost:4000/api/docs](http://localhost:4000/api/docs) を開きます。
Swagger UI（API ドキュメント一覧）が表示されれば API は正常に起動しています。

### DB の中身を確認する

```bash
pnpm db:studio
```

ブラウザで [http://localhost:5555](http://localhost:5555) が開きます。
テーブルとデータを GUI で確認・編集できます。

### Bot のコマンドを試す

Discord のテストサーバーで `/ping` を実行します。
Embed でレイテンシが表示されれば Bot は正常に動作しています。

---

## 11. 停止方法

### アプリを停止する

`pnpm dev` を実行しているターミナルで `Ctrl + C`

### データベースを停止する

```bash
pnpm docker:down
```

> データは Docker Volume に保存されているので、次回 `pnpm docker:up` で再起動しても残っています。

### データをすべて削除したい場合

```bash
docker compose down -v
```

> `-v` をつけると Volume（DB データ）も削除されます。再度 `pnpm db:migrate && pnpm db:seed` が必要になります。

---

## 12. よくあるエラーと対処法

### `pnpm install` で `ENOENT` エラー

**原因:** `lunaria` フォルダの中にいない可能性があります。
**対処:** `pwd` コマンドでフォルダ位置を確認し、`cd lunaria` を実行してください。

---

### `pnpm db:migrate` で `Can't reach database server`

**原因:** Docker が起動していないか、まだ起動中です。
**対処:**
```bash
docker ps  # lunaria-postgres が Up になっているか確認
# Up になっていなければ:
pnpm docker:up
# 30 秒待ってから:
pnpm db:migrate
```

---

### Bot が `[bot] Missing required environment variable: DISCORD_BOT_TOKEN` で停止する

**原因:** `.env` が正しく設定されていません。
**対処:** `.env` ファイルを開き、`DISCORD_BOT_TOKEN` が正しく貼り付けられているか確認してください。クォート（`"`）は不要です。

---

### Discord でスラッシュコマンドが表示されない

**原因:** コマンドが登録されていません。
**対処:** `pnpm --filter @lunaria/bot deploy-commands` を実行してください。
それでも出ない場合は Discord を再起動するか、数分待ってください。

---

### `pnpm dev` で `Port 4000 is already in use`

**原因:** 別のプロセスがポートを使用しています。
**対処:**
```bash
# Mac / Linux
lsof -i :4000 | grep LISTEN
kill -9 <表示されたPID>

# Windows (PowerShell)
netstat -ano | findstr :4000
taskkill /PID <表示されたPID> /F
```

---

### `pnpm build` で TypeScript エラーが多数出る

**原因:** `packages/` が先にビルドされていない可能性があります。
**対処:**
```bash
pnpm --filter @lunaria/types build
pnpm --filter @lunaria/shared build
pnpm --filter @lunaria/db build
pnpm build
```
