# Lunaria テスト仕様書

| 項目 | 内容 |
|------|------|
| 文書バージョン | 1.0.0 |
| 作成日 | 2026-04-02 |
| 対象システム | Lunaria Discord コミュニティ管理プラットフォーム |
| 対象ブランチ | claude/discord-bot-platform-mvp-mq1rU |
| テスト環境 | ローカル開発環境（Docker Compose） |

---

## 目次

1. [テストの目的・方針](#1-テストの目的方針)
2. [テスト環境・前提条件](#2-テスト環境前提条件)
3. [テスト種別と実施方針](#3-テスト種別と実施方針)
4. [認証テスト](#4-認証テスト)
5. [ギルド管理テスト](#5-ギルド管理テスト)
6. [プラグイン管理テスト](#6-プラグイン管理テスト)
7. [ルールエンジンテスト](#7-ルールエンジンテスト)
8. [コンテンツ機能テスト](#8-コンテンツ機能テスト)
9. [新機能テスト（12件）](#9-新機能テスト12件)
10. [Discord Bot コマンドテスト](#10-discord-bot-コマンドテスト)
11. [Bot イベントテスト](#11-bot-イベントテスト)
12. [Worker テスト](#12-worker-テスト)
13. [セキュリティテスト](#13-セキュリティテスト)
14. [非機能テスト](#14-非機能テスト)
15. [テスト完了条件](#15-テスト完了条件)

---

## 1. テストの目的・方針

### 目的

- Lunaria の全機能が仕様通りに動作することを確認する
- リグレッション（既存機能への影響）がないことを保証する
- セキュリティ・認可の不備がないことを確認する

### 方針

- **正常系・異常系・境界値** をすべてテストする
- **認証なしアクセス・権限不足アクセス** は必ずテストする
- API テストは **curl または HTTP クライアント（Thunder Client / Postman）** で実施
- Bot テストは **開発用 Discord サーバー** で実施
- DB の状態変化は **Prisma Studio（http://localhost:5555）** で目視確認する

---

## 2. テスト環境・前提条件

### 必須サービスの起動確認

テスト開始前に以下がすべて起動済みであること。

```bash
pnpm docker:up          # PostgreSQL + Redis
pnpm db:migrate         # スキーマ適用
pnpm db:seed            # 初期データ投入
pnpm dev                # 全サービス起動
pnpm --filter @lunaria/bot deploy-commands  # スラッシュコマンド登録
```

### エンドポイント一覧

| サービス | URL |
|---------|-----|
| API サーバー | http://localhost:4000 |
| API ドキュメント | http://localhost:4000/api/docs |
| ダッシュボード | http://localhost:3000 |
| Prisma Studio | http://localhost:5555（`pnpm db:studio`） |

### テスト用アカウントの準備

| 役割 | 準備内容 |
|------|----------|
| 管理者ユーザー | ギルドオーナー権限を持つ Discord アカウント |
| 一般ユーザー | モデレーター権限のない Discord アカウント |
| Bot アカウント | `.env` に設定済みの Bot トークン |

---

## 3. テスト種別と実施方針

| テスト種別 | 対象 | ツール |
|-----------|------|--------|
| API 単体テスト | REST エンドポイント | curl / Postman |
| 統合テスト | API ↔ DB の整合性 | Prisma Studio + curl |
| Bot コマンドテスト | スラッシュコマンド | Discord クライアント |
| Bot イベントテスト | Discord イベントハンドラー | Discord 操作 |
| Worker テスト | BullMQ ジョブ | ログ確認 |
| セキュリティテスト | 認証・認可 | curl（Cookie なし） |

---

## 4. 認証テスト

### 前提
- Cookie: `lunaria_token` に有効な JWT を保持する
- 無効 Cookie: 期限切れまたは不正な JWT

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| AUTH-001 | Discord ログインリダイレクト | `GET /api/v1/auth/login` を実行 | 302 で Discord OAuth URL にリダイレクト。`state` Cookie が設定されること |
| AUTH-002 | OAuth コールバック正常系 | Discord 認証後の `?code=xxx&state=xxx` でアクセス | 302 でダッシュボードへリダイレクト。`lunaria_token` Cookie が設定されること |
| AUTH-003 | OAuth state 不一致 | `state` を改ざんして `/callback` にアクセス | 400 または 302 でエラーページへ |
| AUTH-004 | 認証ユーザー情報取得 | Cookie 付きで `GET /api/v1/auth/me` | 200: `{ success: true, data: { discordId, username } }` |
| AUTH-005 | Cookie なしで /me アクセス | Cookie なしで `GET /api/v1/auth/me` | 401: `{ success: false, error: { code: 'UNAUTHORIZED' } }` |
| AUTH-006 | 管理ギルド一覧取得 | Cookie 付きで `GET /api/v1/auth/guilds` | 200: ユーザーが管理権限を持つギルドの配列 |
| AUTH-007 | ログアウト | `POST /api/v1/auth/logout` | 200: Cookie が削除されること |
| AUTH-008 | ログアウト後の /me | ログアウト後に `GET /api/v1/auth/me` | 401 |


---

## 5. ギルド管理テスト

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| GUILD-001 | ギルド情報取得（正常系） | `GET /api/v1/guilds/:guildId` (Cookie 付き) | 200: ギルド名・ID が返ること |
| GUILD-002 | 存在しないギルド | `GET /api/v1/guilds/nonexistent` | 404: `NOT_FOUND` |
| GUILD-003 | ダッシュボード統計取得 | `GET /api/v1/guilds/:guildId/dashboard` | 200: memberCount, enabledPlugins, ruleCount, recentAuditLogs を含む |
| GUILD-004 | 設定取得 | `GET /api/v1/guilds/:guildId/settings` | 200: ギルド設定オブジェクト |
| GUILD-005 | 設定更新（正常系） | `PATCH /api/v1/guilds/:guildId/settings` body: `{ "name": "新名前" }` | 200: 更新後のデータ。DB に反映されること |
| GUILD-006 | 設定更新（権限不足） | `guild.manage` 権限のないユーザーで PATCH | 403: `FORBIDDEN` |
| GUILD-007 | name が空文字 | `PATCH` body: `{ "name": "" }` | 400: バリデーションエラー |
| GUILD-008 | name が 101 文字以上 | `PATCH` body: `{ "name": "a".repeat(101) }` | 400: バリデーションエラー |

---

## 6. プラグイン管理テスト

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| PLUGIN-001 | プラグイン一覧取得 | `GET /api/v1/guilds/:guildId/plugins` | 200: 全15プラグイン定義 + 有効化状態 |
| PLUGIN-002 | プラグイン詳細取得 | `GET /api/v1/guilds/:guildId/plugins/quote` | 200: quote プラグイン設定 |
| PLUGIN-003 | 存在しないプラグイン | `GET /api/v1/guilds/:guildId/plugins/invalid_key` | 404: `PLUGIN_NOT_FOUND` |
| PLUGIN-004 | プラグイン有効化 | `POST /api/v1/guilds/:guildId/plugins/quote/enable` | 200。DB の `enabled=true` を確認 |
| PLUGIN-005 | プラグイン無効化 | `POST /api/v1/guilds/:guildId/plugins/quote/disable` | 200。DB の `enabled=false` を確認 |
| PLUGIN-006 | 有効化（権限不足） | `plugin.manage` なしで enable | 403 |
| PLUGIN-007 | プラグイン設定更新 | `PATCH /api/v1/guilds/:guildId/plugins/quote` body: `{ "config": { "maxQuotesPerUser": 10 } }` | 200: 設定が保存されること |
| PLUGIN-008 | stub プラグイン有効化 | `hoyolink` を有効化しようとする | 400 または 403 でブロックされること |

---

## 7. ルールエンジンテスト

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| RULE-001 | ルール一覧取得 | `GET /api/v1/guilds/:guildId/rules` | 200: ページネーション付きリスト |
| RULE-002 | ルール作成（正常系） | `POST` body: `{ "name": "テストルール", "trigger": "messageCreate", "conditions": [], "actions": [{"type":"log_emit","config":{"message":"test","level":"info"}}] }` | 201: 作成されたルール |
| RULE-003 | ルール作成（name 空） | `POST` body: `{ "name": "", ... }` | 400 |
| RULE-004 | ルール作成（権限不足） | `rule.manage` なしで POST | 403 |
| RULE-005 | ルール詳細取得 | `GET /api/v1/guilds/:guildId/rules/:ruleId` | 200: ルールオブジェクト |
| RULE-006 | ルール更新 | `PATCH` body: `{ "enabled": false }` | 200: `enabled=false` に更新 |
| RULE-007 | ルール削除 | `DELETE /api/v1/guilds/:guildId/rules/:ruleId` | 200: `{ deleted: true }` |
| RULE-008 | ルール乾試行（条件マッチ） | `POST /rules/:ruleId/test` body: `{ "context": { "content": "hello" } }` | 200: `matched: true`, actions リスト |
| RULE-009 | ルール乾試行（条件不一致） | content がキーワードに合わない context | 200: `matched: false`, アクション不実行 |
| RULE-010 | 実行履歴取得 | `GET /api/v1/guilds/:guildId/rule-runs` | 200: 実行ログリスト |

---

## 8. コンテンツ機能テスト

### 8-1. クォート

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| QUOTE-001 | クォート一覧取得 | `GET /api/v1/guilds/:guildId/quotes` | 200: ページネーション付きリスト（deleted=false のみ） |
| QUOTE-002 | クォート作成 | `POST` body: `{ "content": "名言です", "author": "テストユーザー" }` | 201: 作成されたクォート |
| QUOTE-003 | ランダム取得 | `GET /quotes/random` | 200: ランダムなクォート1件 |
| QUOTE-004 | タグフィルタ | `GET /quotes?tag=funny` | 200: tags に "funny" を含むものだけ |
| QUOTE-005 | クォート削除（論理削除） | `DELETE /quotes/:quoteId` | 200: DB で `deleted=true`。一覧に出なくなること |
| QUOTE-006 | クォート報告 | `POST /quotes/:quoteId/report` body: `{ "reason": "不適切" }` | 200: DB に QuoteReport が作成されること |

### 8-2. 投票 (Poll)

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| POLL-001 | 投票作成 | `POST` body: `{ "title": "テスト投票", "voteType": "single", "channelId": "...", "options": [{"label":"A"},{"label":"B"}] }` | 201: options 付きで作成 |
| POLL-002 | 投票終了 | `POST /polls/:pollId/close` | 200: `closed=true` |
| POLL-003 | 終了済み投票の再終了 | 既に closed な Poll を close | 409: `CONFLICT` |
| POLL-004 | 結果集計 | `GET /polls/:pollId/results` | 200: options ごとの投票数 |

### 8-3. イベント

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| EVENT-001 | イベント作成 | `POST` body: `{ "title": "テストイベント", "startsAt": "2026-05-01T10:00:00Z" }` | 201 |
| EVENT-002 | 参加ステータス更新 | `POST /events/:eventId/participants` body: `{ "status": "going" }` | 200: DB に EventParticipant が作成 |
| EVENT-003 | イベント中止 | `POST /events/:eventId/cancel` | 200: `status=cancelled` |
| EVENT-004 | 存在しないイベント | `GET /events/nonexistent` | 404 |

### 8-4. FAQ

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| FAQ-001 | FAQ 作成 | `POST` body: `{ "title": "テスト Q", "content": "テスト A" }` | 201 |
| FAQ-002 | FAQ 検索 | `GET /faqs?q=テスト` | 200: タイトル・本文に "テスト" を含む FAQ のみ |
| FAQ-003 | 閲覧数加算 | `GET /faqs/:faqId` を複数回実行 | viewCount が毎回 +1 されること |
| FAQ-004 | フィードバック投稿 | `POST /faqs/:faqId/feedback` body: `{ "rating": "helpful" }` | 200: DB に FaqFeedback が作成 |


---

## 9. 新機能テスト（12件）

### 9-1. ウェルカムメッセージ

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| WEL-001 | 設定取得（未設定状態） | `GET /api/v1/guilds/:guildId/welcome` | 200: `{ enabled: false }` |
| WEL-002 | 設定有効化 | `PATCH` body: `{ "enabled": true, "channelId": "チャンネルID", "message": "ようこそ {user}!" }` | 200: 設定が保存されること |
| WEL-003 | テンプレート変数 | message に `{user}`, `{server}`, `{count}` を含めて設定 | 200: 保存成功。Bot がメンバー参加時に変数を置換して送信すること（WEL-006 で確認） |
| WEL-004 | DM 有効化 | `PATCH` body: `{ "dmEnabled": true, "dmMessage": "DMメッセージ" }` | 200: DB に保存 |
| WEL-005 | message が空文字 | `PATCH` body: `{ "message": "" }` | 400: バリデーションエラー |
| WEL-006 | メンバー参加時の動作 | Bot が有効な状態でテストサーバーに別アカウントで参加 | 設定したチャンネルに Embed が送信されること |
| WEL-007 | DM 拒否ユーザー | DM 無効アカウントが参加 | DM 送信エラーを無視して処理が続くこと（チャンネル送信は正常） |
| WEL-008 | 設定無効化 | `PATCH` body: `{ "enabled": false }` | 200: 以後メンバー参加時に Embed が送信されないこと |

### 9-2. レベルシステム

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| LVL-001 | 設定取得（未設定） | `GET /api/v1/guilds/:guildId/levels/config` | 200: `{ enabled: false }` |
| LVL-002 | レベルシステム有効化 | `PATCH` body: `{ "enabled": true, "xpPerMessage": 20, "xpCooldownSec": 30 }` | 200: 設定保存 |
| LVL-003 | XP 付与（メッセージ送信） | Bot 有効状態でテストチャンネルにメッセージ送信 | DB の `user_levels` に XP が加算されること |
| LVL-004 | クールダウン動作 | 連続してメッセージを送信 | `xpCooldownSec` 以内の送信は XP が加算されないこと |
| LVL-005 | レベルアップ通知 | XP が閾値を超えるまでメッセージ送信 | `levelUpChannelId` のチャンネルにレベルアップメッセージが送信されること |
| LVL-006 | ランキング取得 | `GET /api/v1/guilds/:guildId/levels/leaderboard` | 200: XP 降順で最大50件 |
| LVL-007 | 自分のランク取得 | `GET /api/v1/guilds/:guildId/levels/me` | 200: 自ユーザーの xp, level, messages |
| LVL-008 | ロール報酬作成 | `POST /levels/rewards` body: `{ "level": 5, "roleId": "ロールID" }` | 201: 報酬が作成 |
| LVL-009 | ロール報酬削除 | `DELETE /levels/rewards/:rewardId` | 200: `{ deleted: true }` |
| LVL-010 | `/level rank` コマンド | Discord で `/level rank` を実行 | Embed でレベル・XP・進捗バーが表示されること |
| LVL-011 | `/level leaderboard` コマンド | Discord で `/level leaderboard` を実行 | Embed でランキング Top 10 が表示されること |
| LVL-012 | 無効チャンネルの XP 除外 | `ignoredChannels` に対象チャンネル ID を設定後メッセージ送信 | XP が加算されないこと |

### 9-3. チケットシステム

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| TKT-001 | 設定有効化 | `PATCH /tickets/config` body: `{ "enabled": true, "categoryId": "カテゴリID", "supportRoleIds": ["ロールID"] }` | 200: 設定保存 |
| TKT-002 | パネル設置 | Discord で `/ticket panel` を実行 | 対象チャンネルにボタン付き Embed が送信されること |
| TKT-003 | チケット作成（ボタン） | パネルの「チケットを作成」ボタンをクリック | 専用プライベートチャンネルが作成され、ウェルカムメッセージが送信されること |
| TKT-004 | 同時オープン上限 | `maxOpenPerUser=1` 設定後、チケットが開いている状態で再度ボタンをクリック | 上限エラーメッセージが表示されること |
| TKT-005 | チケット一覧 API | `GET /tickets?status=open` | 200: open 状態のチケット一覧 |
| TKT-006 | チケット詳細 API | `GET /tickets/:ticketId` | 200: チケット情報 |
| TKT-007 | チケット閉鎖（コマンド） | `/ticket close ticket_id=xxx` を実行 | `status=closed`。チャンネルが削除されること |
| TKT-008 | チケット閉鎖 API | `POST /tickets/:ticketId/close` | 200: `status=closed`, `closedAt` が設定されること |
| TKT-009 | 閉鎖済みの再閉鎖 | closed なチケットを再度 close | 409: `CONFLICT` |
| TKT-010 | 権限のないユーザーの閉鎖 | `moderation.manage` のないユーザーが API で close | 403 |

### 9-4. 一時ボイスチャンネル

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| TVC-001 | 設定有効化 | `PATCH /voice/temp-vc/config` body: `{ "enabled": true, "triggerChannelId": "VCチャンネルID" }` | 200: 設定保存 |
| TVC-002 | チャンネル自動生成 | トリガーチャンネルに参加 | 新しい VC チャンネルが生成され、そこへ移動されること。DB に TempVoiceChannel が作成されること |
| TVC-003 | 名前テンプレート | `nameTemplate: "{user}'s Room"` に設定後参加 | 生成チャンネル名が `ユーザー名's Room` になること |
| TVC-004 | 空になったら削除 | 一時 VC から全員退出 | チャンネルが自動削除され、DB からレコードが削除されること |
| TVC-005 | 上限到達 | `maxChannels=1` 設定後、1つ生成されている状態でトリガー参加 | 新しいチャンネルが生成されないこと |
| TVC-006 | アクティブ一覧 API | `GET /voice/temp-vc/channels` | 200: 現在アクティブな一時 VC リスト |

### 9-5. 入退室ログ

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| VLOG-001 | ログ設定有効化 | `PATCH /voice/log/config` body: `{ "enabled": true, "channelId": "ログチャンネルID" }` | 200: 設定保存 |
| VLOG-002 | 入室ログ | VC に参加 | ログチャンネルに緑色 Embed（入室情報）が送信されること。DB に `eventType=join` のレコードが作成 |
| VLOG-003 | 退室ログ | VC から退出 | 赤色 Embed（退室情報）が送信されること |
| VLOG-004 | 移動ログ | 別の VC チャンネルへ移動 | 黄色 Embed（移動元→移動先）が送信されること |
| VLOG-005 | 入室ログ無効化 | `logJoin: false` に設定後参加 | 入室時のログが送信されないこと |
| VLOG-006 | 履歴 API | `GET /voice/log/history?userId=xxx` | 200: 特定ユーザーの入退室履歴 |
| VLOG-007 | ページネーション | `GET /voice/log/history?page=2&pageSize=10` | 200: 指定ページのデータ |

### 9-6. 投票ロール付与

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| PRW-001 | ロール報酬追加 | `POST /polls/:pollId/rewards` body: `{ "optionId": "xxx", "roleId": "ロールID" }` | 201: 報酬が作成されること |
| PRW-002 | 報酬一覧取得 | `GET /polls/:pollId/rewards` | 200: option 情報付きのリスト |
| PRW-003 | 報酬削除 | `DELETE /polls/:pollId/rewards/:rewardId` | 200: `{ deleted: true }` |
| PRW-004 | 存在しない option への報酬 | 存在しない `optionId` で POST | 404: `NOT_FOUND` |
| PRW-005 | 権限不足 | `poll.manage` なしで POST | 403 |

### 9-7. メッセージスケジューラー

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| SCH-001 | スケジュール作成 | `POST /scheduled-messages` body: `{ "name": "テスト告知", "channelId": "xxx", "content": "お知らせ", "scheduledAt": "2026-05-01T09:00:00Z" }` | 201: `status=pending` で作成 |
| SCH-002 | スケジュール一覧 | `GET /scheduled-messages?status=pending` | 200: pending のメッセージ一覧 |
| SCH-003 | スケジュール更新 | `PATCH /scheduled-messages/:id` body: `{ "content": "変更後" }` | 200: 更新されること |
| SCH-004 | 送信済み更新禁止 | `status=sent` のメッセージを PATCH | 409: `CONFLICT` |
| SCH-005 | スケジュール削除 | `DELETE /scheduled-messages/:id` | 200: `{ deleted: true }` |
| SCH-006 | Worker 処理 | pending なメッセージが `scheduledAt` を過ぎた状態で Worker 起動 | `status=sent`, `sentAt` が設定されること |

### 9-8. カスタムボタン

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| BTN-001 | コンポーネント作成 | `POST /components` body: `{ "name": "役職ボタン", "label": "メンバー", "customId": "role_member", "actionType": "role_toggle", "actionConfig": { "roleId": "ロールID" } }` | 201: 作成されること |
| BTN-002 | 重複 customId | 同じ `customId` で再度 POST | 409: `CONFLICT` |
| BTN-003 | コンポーネント一覧 | `GET /components` | 200: ギルドのコンポーネント一覧 |
| BTN-004 | ロールトグル（付与） | Discord でボタンをクリック（ロール未保持状態） | ロールが付与されること。DB に ComponentInteraction が作成されること |
| BTN-005 | ロールトグル（削除） | 同ボタンを再クリック（ロール保持状態） | ロールが削除されること |
| BTN-006 | コンポーネント更新 | `PATCH /components/:id` body: `{ "enabled": false }` | 200: `enabled=false` |
| BTN-007 | 無効コンポーネントのクリック | `enabled=false` のボタンをクリック | 無反応であること |
| BTN-008 | コンポーネント削除 | `DELETE /components/:id` | 200: `{ deleted: true }` |

### 9-9. AI モデレーション

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| AIM-001 | 設定有効化 | `PATCH /ai-moderation/config` body: `{ "enabled": true, "action": "log", "logChannelId": "xxx" }` | 200: 設定保存 |
| AIM-002 | 設定取得 | `GET /ai-moderation/config` | 200: 現在の設定 |
| AIM-003 | 閾値バリデーション | `toxicityThreshold: 1.5` で PATCH | 400: バリデーションエラー（0〜1 範囲） |
| AIM-004 | スキャン履歴取得 | `GET /ai-moderation/scans` | 200: スキャン履歴一覧 |
| AIM-005 | flagged フィルタ | `GET /ai-moderation/scans?flagged=true` | 200: `flagged=true` のもののみ |
| AIM-006 | 権限不足 | `moderation.manage` なしで設定変更 | 403 |

### 9-10. 多言語翻訳

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| TRN-001 | 設定有効化 | `PATCH /translation/config` body: `{ "enabled": true, "triggerEmoji": "🌐", "defaultTargetLang": "en" }` | 200: 設定保存 |
| TRN-002 | 設定取得 | `GET /translation/config` | 200: 現在の設定 |
| TRN-003 | 翻訳リアクション | Bot 有効時に日本語メッセージに 🌐 リアクションを付ける | Bot がメッセージに翻訳リクエスト返信をすること |
| TRN-004 | 別絵文字では反応しない | 🌐 以外の絵文字を付ける | Bot が反応しないこと |
| TRN-005 | 機能無効時 | `enabled: false` の状態でリアクション | Bot が反応しないこと |

### 9-11. サーバー間連携（Guild Groups）

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| GG-001 | グループ作成 | `POST /api/v1/guild-groups` body: `{ "name": "テストグループ", "ownerGuildDiscordId": "xxx" }` | 201: inviteCode 付きで作成 |
| GG-002 | グループ一覧 | `GET /api/v1/guild-groups` | 200: グループ一覧 |
| GG-003 | グループ詳細 | `GET /api/v1/guild-groups/:groupId` | 200: members 付きのグループ詳細 |
| GG-004 | 招待コードで参加 | `POST /guild-groups/:groupId/join` body: `{ "guildDiscordId": "xxx", "inviteCode": "..." }` | 201: member が追加されること |
| GG-005 | 無効な招待コード | 誤った inviteCode で JOIN | 404: `NOT_FOUND` |
| GG-006 | 重複参加 | すでに参加済みのギルドで再度 JOIN | 409: `CONFLICT` |
| GG-007 | ブロードキャスト作成 | `POST /guild-groups/:groupId/broadcast` body: `{ "content": "お知らせ", "targets": [{"guildDiscordId":"xxx","channelId":"yyy"}] }` | 201: BroadcastTarget が作成されること |
| GG-008 | ブロードキャスト履歴 | `GET /guild-groups/:groupId/broadcasts` | 200: ページネーション付きリスト |

### 9-12. ダッシュボード通知

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| NTF-001 | 通知一覧取得 | `GET /api/v1/notifications` | 200: 自ユーザーの通知一覧 + unreadCount |
| NTF-002 | 未読フィルタ | `GET /notifications?read=false` | 200: `read=false` のもののみ |
| NTF-003 | 通知既読 | `PATCH /notifications/:notificationId/read` | 200: `read=true` に更新 |
| NTF-004 | 全件既読 | `POST /notifications/read-all` | 200: 全通知が `read=true` になること |
| NTF-005 | Push 購読登録 | `POST /notifications/subscriptions` body: `{ "endpoint": "https://...", "p256dh": "...", "auth": "...", "eventTypes": ["member_join"] }` | 201: subscription が作成 |
| NTF-006 | 重複購読 | 同じ endpoint で再 POST | 200: 既存 subscription が更新されること（upsert） |
| NTF-007 | 購読解除 | `DELETE /notifications/subscriptions/:endpoint` | 200: `active=false` に更新 |
| NTF-008 | 他ユーザーの通知アクセス | 別ユーザーの notificationId を PATCH | 404 または 403 |


---

## 10. Discord Bot コマンドテスト

| TC-ID | コマンド | テスト項目 | 手順 | 期待結果 |
|-------|---------|-----------|------|----------|
| CMD-001 | `/ping` | 応答確認 | Discord で `/ping` を実行 | Embed でレイテンシ（ms）が表示されること |
| CMD-002 | `/quote add` | クォート追加 | `/quote add content:名言 author:テスト` | 成功 Embed。DB に作成されること |
| CMD-003 | `/quote random` | ランダム表示 | `/quote random` | クォートが Embed で表示されること |
| CMD-004 | `/quote list` | 一覧表示 | `/quote list` | 最新クォートの一覧 Embed |
| CMD-005 | `/level rank` | 自分のランク | `/level rank` | レベル・XP・進捗バーの Embed |
| CMD-006 | `/level rank user:@他ユーザー` | 他ユーザーのランク | `/level rank user:@TargetUser` | ターゲットユーザーの情報 Embed |
| CMD-007 | `/level leaderboard` | ランキング | `/level leaderboard` | Top 10 ランキング Embed（🥇🥈🥉付き） |
| CMD-008 | `/ticket panel` | パネル設置 | 管理者権限で `/ticket panel` | ボタン付き Embed がチャンネルに送信 |
| CMD-009 | `/ticket list` | 一覧表示 | 管理者権限で `/ticket list` | オープン中チケットの Embed |
| CMD-010 | `/ticket close` | 閉鎖 | `/ticket close ticket_id:xxx` | `status=closed` になりチャンネル削除 |
| CMD-011 | `/moderation warn` | 警告発行 | `/moderation warn user:@ユーザー reason:テスト` | 警告 Embed。DB に ModerationAction 作成 |
| CMD-012 | `/moderation history` | 履歴表示 | `/moderation history user:@ユーザー` | モデレーション履歴 Embed |
| CMD-013 | `/settings show` | 設定表示 | `/settings show` | ギルド設定情報の Embed |
| CMD-014 | `/analytics` | アナリティクス | 管理者で `/analytics period:30d` | 統計情報 Embed（メンバー数・メッセージ数等） |
| CMD-015 | `/link-game add` | ゲーム連携 | `/link-game add game:minecraft uid:12345` | 連携成功 Embed。DB に GameLink 作成 |
| CMD-016 | `/link-game list` | 連携一覧 | `/link-game list` | リンク済みゲームの一覧 |
| CMD-017 | `/link-game remove` | 連携解除 | `/link-game remove game:minecraft` | 解除成功。DB から削除 |
| CMD-018 | `/consent show` | 同意状況 | `/consent show` | 同意タイプ別の状況 Embed |
| CMD-019 | `/consent grant` | 同意 | `/consent grant type:data_analytics` | 同意記録。DB に ConsentRecord 作成 |
| CMD-020 | `/consent revoke` | 同意取り消し | `/consent revoke type:data_analytics` | 取り消し。DB の `granted=false` |
| CMD-021 | `/rule run-test` | ルールテスト | `/rule run-test rule_id:xxx` | dry-run 結果 Embed（matched/skipped） |
| CMD-022 | 権限不足コマンド | 管理者専用コマンド | 一般ユーザーで `/settings show` | Discord のデフォルト権限エラーが表示 |
| CMD-023 | 未登録ギルドでのコマンド | ギルド未登録時 | 未登録サーバーで Bot コマンドを実行 | `❌ サーバーが登録されていません。` のエラー |

---

## 11. Bot イベントテスト

| TC-ID | イベント | テスト項目 | 手順 | 期待結果 |
|-------|---------|-----------|------|----------|
| EVT-001 | guildMemberAdd | ユーザー登録 | テストアカウントがサーバーに参加 | DB に User・GuildMembership が作成されること |
| EVT-002 | guildMemberAdd | ウェルカム送信 | WelcomeConfig 有効化後にメンバー参加 | 設定チャンネルに Embed が送信されること |
| EVT-003 | guildMemberAdd | ルール実行 | `trigger=memberJoin` のルールを作成後にメンバー参加 | RuleRun が DB に作成されること |
| EVT-004 | messageCreate | 自動応答 | `matchType=keyword`, `pattern=おはよう` の AutoResponse 作成後に「おはよう」と送信 | Bot がリプライすること |
| EVT-005 | messageCreate | ルール実行 | `trigger=messageCreate`, `condition=keyword` のルールにマッチするメッセージを送信 | ルールのアクションが実行されること |
| EVT-006 | messageCreate | XP 加算 | LevelConfig 有効の状態でメッセージ送信 | DB の user_levels.xp が増加すること |
| EVT-007 | messageCreate | Bot メッセージ無視 | Bot 自身がメッセージを送信 | XP 加算・自動応答が発火しないこと |
| EVT-008 | voiceStateUpdate | 一時 VC 生成 | TempVcConfig 有効でトリガーチャンネルに参加 | 新チャンネルが生成されること |
| EVT-009 | voiceStateUpdate | 一時 VC 削除 | 一時 VC から全員退出 | チャンネルが削除されること |
| EVT-010 | voiceStateUpdate | 入室ログ | VoiceLogConfig 有効でVC参加 | ログチャンネルに Embed が送信され DB にも記録 |
| EVT-011 | voiceStateUpdate | 退室ログ | VC から退出 | 赤色 Embed が送信されること |
| EVT-012 | voiceStateUpdate | 移動ログ | 別 VC に移動 | 移動元→移動先の Embed が送信されること |
| EVT-013 | messageReactionAdd | 翻訳リアクション | TranslationConfig 有効でメッセージに 🌐 を付ける | Bot が翻訳リクエストをリプライすること |
| EVT-014 | messageReactionAdd | Bot のリアクション無視 | Bot が付けたリアクション | 無限ループしないこと |
| EVT-015 | interactionCreate | カスタムボタン（ロール付与） | role_toggle ボタンをクリック | ロールが付与されること |
| EVT-016 | interactionCreate | チケット作成ボタン | `lunaria:ticket:open` ボタンをクリック | チケットチャンネルが生成されること |

---

## 12. Worker テスト

| TC-ID | Worker | テスト項目 | 手順 | 期待結果 |
|-------|--------|-----------|------|----------|
| WRK-001 | 起動確認 | 全 Worker の起動 | `pnpm --filter @lunaria/worker dev` を実行 | ログに全 Worker 名が表示されること。Redis への接続成功ログが出ること |
| WRK-002 | daily_content | 日次コンテンツ配信 | DailyContentJob を作成し、`/daily-content/jobs/:jobId/run-now` を叩く | `DailyContentRun` に `status=success` が記録されること |
| WRK-003 | daily_content | クォートなし | quote 0件の状態で contentType=quote のジョブを実行 | `status=skipped` または `status=error` が記録されること |
| WRK-004 | reminder | リマインダー送信 | `remindAt` が過去の Reminder を作成し Worker を起動 | `sent=true`, `sentAt` が設定されること |
| WRK-005 | reminder | 送信済みスキップ | `sent=true` の Reminder が対象になった場合 | 再送されないこと |
| WRK-006 | reminder | 繰り返しリマインダー | `recurrence=daily` の Reminder が送信された後 | 翌日の `remindAt` で新しい Reminder が作成されること |
| WRK-007 | moderation_expire | 期限切れ Mute 解除 | `expiresAt` が過去の mute アクションに対して Worker 実行 | `reversed=true`, `reversedAt` が設定されること |
| WRK-008 | moderation_expire | 解除済みスキップ | `reversed=true` のアクション | 再処理されないこと |
| WRK-009 | scheduled_rule | スケジュールルール実行 | `trigger=scheduled` のルールを作成し Worker にジョブを投入 | RuleRun が `status=success` で作成されること |
| WRK-010 | analytics_aggregate | 集計処理 | AnalyticsEvent が存在する状態で Worker を実行 | `analytics_daily` に日別集計が作成・更新されること |
| WRK-011 | scheduled_message | スケジュールメッセージ送信 | `status=pending` の ScheduledMessage に対して Worker 実行 | `status=sent`, `sentAt` が設定されること |
| WRK-012 | broadcast | ブロードキャスト配信 | CrossServerBroadcast に pending な Target がある状態で Worker 実行 | Target の `status=sent`, `sentAt` が設定されること |
| WRK-013 | broadcast | 部分的失敗 | 一部の Target でエラーが発生 | Broadcast の `status=partial`、成功した Target は `status=sent` |

---

## 13. セキュリティテスト

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| SEC-001 | Cookie なしでのリソースアクセス | Cookie を送らずに `GET /api/v1/guilds/:guildId` | 401: `UNAUTHORIZED` |
| SEC-002 | 改ざん JWT | JWT のペイロード部を Base64 デコード→改ざん→再エンコードして送信 | 401: 署名検証エラー |
| SEC-003 | 他ギルドのリソースアクセス | 自分が属さないギルド ID でリクエスト | 403 または 404 |
| SEC-004 | System ロールの削除試行 | `DELETE /roles/:roleId`（isSystem=true） | 403: `FORBIDDEN` |
| SEC-005 | System ロールの更新試行 | `PATCH /roles/:roleId`（isSystem=true） | 403: `FORBIDDEN` |
| SEC-006 | SQL インジェクション | `name` フィールドに `'; DROP TABLE guilds; --` を入力 | Prisma のパラメータ化クエリにより無害化されること |
| SEC-007 | XSS 文字列の保存 | content に `<script>alert(1)</script>` を含む Quote を作成・取得 | エスケープされずに文字列として保存・返却されること（フロントエンドでのエスケープは別途確認） |
| SEC-008 | 正規表現 ReDoS | AutoResponse の regex パターンに `(a+)+$` を設定してマッチ実行 | タイムアウト・クラッシュしないこと（try/catch で false を返すこと） |
| SEC-009 | 権限昇格の試み | `member` ロールのユーザーが `rbac.manage` 権限のある操作を実行 | 403 |
| SEC-010 | Bot トークンのログ出力 | Worker・API のログを確認 | `DISCORD_BOT_TOKEN` などの機密情報がログに出力されないこと |
| SEC-011 | 過剰リクエスト（レート制限） | 同一エンドポイントに 100 req/sec で連続リクエスト | サーバーがクラッシュしないこと。必要に応じてレート制限が機能すること |
| SEC-012 | CORS 確認 | `Origin: https://evil.example.com` ヘッダー付きでリクエスト | CORS エラーとなること（設定済みオリジン以外からのリクエストを拒否） |

---

## 14. 非機能テスト

### 14-1. エラーハンドリング

| TC-ID | テスト項目 | 手順 | 期待結果 |
|-------|-----------|------|----------|
| ERR-001 | 存在しないエンドポイント | `GET /api/v1/nonexistent` | 404 |
| ERR-002 | 不正な JSON Body | `Content-Type: application/json` で不正な JSON を送信 | 400: `VALIDATION_ERROR` |
| ERR-003 | 型不一致 | 数値フィールドに文字列を送信（例: `xpPerMessage: "abc"`） | 400: バリデーションエラー |
| ERR-004 | DB 接続切れ | Docker で PostgreSQL を停止した状態で API にリクエスト | 500: `INTERNAL_ERROR`。クラッシュしないこと |
| ERR-005 | Redis 接続切れ | Docker で Redis を停止した状態で Worker を起動 | Worker が即時終了せず、接続リトライを行うこと |
| ERR-006 | Discord API エラー | Bot の操作で Discord 側エラーが返る場合 | エラーをキャッチしてクラッシュしないこと。エラーログに記録されること |

### 14-2. パフォーマンス目安

> ローカル開発環境での参考値。本番環境への適用前に再計測すること。

| 項目 | 目標値 |
|------|--------|
| API レスポンスタイム（単純 GET） | 200ms 以内 |
| API レスポンスタイム（DB 集計クエリ） | 1,000ms 以内 |
| Bot コマンド応答（defer なし） | 3,000ms 以内（Discord の制限） |
| Worker 1 ジョブの処理時間 | 5,000ms 以内 |
| 起動時間（`pnpm dev`） | 60 秒以内 |

### 14-3. ログ確認

| TC-ID | テスト項目 | 確認方法 | 期待結果 |
|-------|-----------|---------|----------|
| LOG-001 | API 起動ログ | `pnpm --filter @lunaria/api dev` のターミナル | `Server listening at http://0.0.0.0:4000` が出力されること |
| LOG-002 | Bot 起動ログ | Bot のターミナル | `[bot] Ready. Logged in as ...` が出力されること |
| LOG-003 | Worker 起動ログ | Worker のターミナル | `[worker] Ready.` が出力されること |
| LOG-004 | エラーログ形式 | 意図的にエラーを発生させる | `[ERROR]` プレフィックスでスタックトレースが出力されること |
| LOG-005 | 機密情報の非出力 | 全ログを確認 | トークン・パスワード・JWT 文字列がログに含まれないこと |

---

## 15. テスト完了条件

### 合格基準

| カテゴリ | 合格条件 |
|---------|---------|
| 認証テスト（AUTH） | 全 8 件合格 |
| ギルド管理（GUILD） | 全 8 件合格 |
| プラグイン管理（PLUGIN） | 全 8 件合格 |
| ルールエンジン（RULE） | 全 10 件合格 |
| コンテンツ機能 | 全 18 件合格 |
| 新機能 12 件（WEL〜NTF） | 各機能 80% 以上合格（1機能あたり最低1件の異常系テスト合格） |
| Bot コマンド（CMD） | 全 23 件合格 |
| Bot イベント（EVT） | 全 16 件合格 |
| Worker（WRK） | 全 13 件合格 |
| セキュリティ（SEC） | **全件合格必須** |
| エラーハンドリング（ERR） | 全 6 件合格 |

### 総テストケース数

| カテゴリ | 件数 |
|---------|------|
| 認証 | 8 |
| ギルド管理 | 8 |
| プラグイン管理 | 8 |
| ルールエンジン | 10 |
| コンテンツ機能 | 18 |
| 新機能 12 件 | 92 |
| Bot コマンド | 23 |
| Bot イベント | 16 |
| Worker | 13 |
| セキュリティ | 12 |
| 非機能 | 11 |
| **合計** | **219** |

### リリース判定

以下をすべて満たした場合にテスト完了とする:

- [ ] セキュリティテスト全件合格
- [ ] 全カテゴリの合格率 80% 以上
- [ ] クリティカル（認証・権限）バグ 0 件
- [ ] サービスクラッシュを引き起こすバグ 0 件
- [ ] `pnpm build` が全パッケージでエラーなし
- [ ] `pnpm typecheck` がエラーなし

