# 次に行うべきこと（コピペ用）

> 前提: `まだテストは未実施` の状態から、機能追加と品質向上を最短で進めるための実行コマンド集。

## 0) まず安全に現状保存

```bash
git checkout -b chore/next-sprint-kickoff
pnpm install
cp .env.example .env
```

---

## 1) テスト基盤の起動（未実施状態を脱する）

```bash
docker compose up -d
pnpm -w typecheck
pnpm -w lint
pnpm -w test
```

> テストが未整備/失敗する場合は、次を先に実行:

```bash
pnpm -w build
pnpm --filter @lunaria/api build
pnpm --filter @lunaria/bot build
pnpm --filter @lunaria/dashboard build
pnpm --filter @lunaria/worker build
```

---

## 2) 直近で価値が高い改修（Must）

## 2-1. API Rate Limit の Redis 化

```bash
git checkout -b feat/api-redis-rate-limit
# 実装: apps/api/src/app.ts, apps/api/src/lib/redis.ts 周辺
pnpm --filter @lunaria/api typecheck
pnpm --filter @lunaria/api test
```

完了条件（DoD）
- マルチインスタンスで同一しきい値が効く
- 429 レスポンス仕様を統一
- 環境変数/運用手順を docs に追記

## 2-2. Dashboard リアルタイム更新（SSE 先行）

```bash
git checkout -b feat/dashboard-realtime-sse
# 実装: apps/api に配信エンドポイント、apps/dashboard に購読処理
pnpm --filter @lunaria/api typecheck
pnpm --filter @lunaria/dashboard typecheck
```

完了条件（DoD）
- 対象画面1つ（例: moderation / analytics）で自動更新
- 切断時の再接続あり
- 手動リロード導線を残す

## 2-3. 可観測性の最小セット導入

```bash
git checkout -b chore/observability-baseline
# 実装: api/bot/worker の構造化ログ + 失敗ジョブ可視化
pnpm --filter @lunaria/api typecheck
pnpm --filter @lunaria/worker typecheck
pnpm --filter @lunaria/bot typecheck
```

完了条件（DoD）
- request/job 単位で追跡可能
- error rate / queue lag / job fail を把握可能
- 障害時の一次対応手順を docs 化

---

## 3) 次点で着手（Should）

## 3-1. Analytics グラフ UI（生数値→時系列可視化）

```bash
git checkout -b feat/dashboard-analytics-charts
pnpm --filter @lunaria/dashboard dev
```

## 3-2. Event バナーのファイルアップロード

```bash
git checkout -b feat/event-banner-upload
# 先に保存先方針を決める（S3 など）
pnpm --filter @lunaria/api typecheck
pnpm --filter @lunaria/dashboard typecheck
```

## 3-3. Stub plugin 1件の実装開始

```bash
git checkout -b feat/plugin-hoyolink-mvp
pnpm -w typecheck
```

---

## 4) すぐ issue 化できるテンプレ（コピペ）

```md
## 背景
- 何を解決するか

## スコープ
- apps/packages の対象

## DoD
- [ ] 機能要件を満たす
- [ ] 型チェック通過
- [ ] lint 通過
- [ ] テスト追加/更新
- [ ] docs 更新

## 見積
- S / M / L

## 依存
- 先行 Issue / インフラ設定 / 外部サービス
```

---

## 5) PR 作成前チェック（毎回コピペ）

```bash
pnpm -w typecheck && pnpm -w lint && pnpm -w test
git status
git add -A
git commit -m "feat: <変更内容>"
```

---

## 6) 2週間の実行順（そのまま運用可）

- Week 1
  1. Redis rate limit
  2. SSE PoC（1画面）
  3. 構造化ログ + 最低限メトリクス

- Week 2
  1. Must の結合確認
  2. Analytics グラフ UI
  3. 次スプリント用に Stub plugin 1件の仕様確定

---

## 7) 最短スタート用（全部一気に実行）

```bash
git checkout -b chore/quality-kickoff
pnpm install
cp .env.example .env
docker compose up -d
pnpm -w typecheck || true
pnpm -w lint || true
pnpm -w test || true
```

> `|| true` は「まず失敗箇所を可視化する」ため。安定化後は必ず外す。
