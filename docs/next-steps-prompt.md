# Lunaria: 情報整理＋次アクション作成用プロンプト

以下を **そのまま** AI に渡して使ってください。

---

あなたはテックリード兼プロダクトマネージャーです。以下のプロジェクト情報を読んで、
**「現状サマリー」と「次にやること（優先順位付き）」を実行可能レベルで整理**してください。

## 目的
- 現在の実装状況を短時間で把握する
- 未実装/改善ポイントを洗い出す
- 次スプリントで着手すべきタスクを優先順位付きで決める

## プロジェクト情報（事前収集済み）
- プロダクト: Lunaria（Discordコミュニティ運営向け Bot + 管理ダッシュボード）
- 構成: monorepo（apps: api / bot / dashboard / worker, packages: db / types / shared / plugin-sdk / rule-engine / ui）
- 主要スタック: TypeScript, Fastify, discord.js v14, Next.js 14, Prisma, PostgreSQL, Redis, BullMQ, pnpm, Turbo
- 全体ステータス: MVP Complete（主要機能は実装済み）
- Plugin:
  - Active 12: quote, poll, event, lfg, team_split, faq, reminder, moderation, daily_content, auto_response, analytics, template
  - Stub 3: hoyolink, voice_consent, external_server
- Rule Engine:
  - Trigger 8種 / Condition 9種 / Action 8種
  - dry-run テストAPIあり
- Known Limitations / Future Work:
  1) Stub plugin は有効化不可
  2) Analytics は生数値表示中心（グラフUI未統合）
  3) Dashboard のリアルタイム更新なし（WebSocket等未導入）
  4) Event バナー等のファイルアップロード未対応
  5) API rate limit が in-memory（本番マルチインスタンス想定では Redis 化推奨）

## あなたにやってほしいこと
1. 上記情報をもとに、現状を 5〜8 箇条書きで要約。
2. 「次にやること」を **Must / Should / Could** で分類。
3. 各タスクに以下を必ず付ける:
   - 背景（なぜ必要か）
   - 実装対象（apps/packages のどこか）
   - 完了条件（DoD）
   - 見積（S/M/L）
   - 依存関係
4. 直近2週間の実行計画を提案（週次マイルストーン形式）。
5. 最後に、チームへ共有できる「次スプリント計画」要約（200〜300文字）を日本語で作成。

## 出力フォーマット（厳守）
- ## 現状サマリー
- ## 優先タスク（Must）
- ## 優先タスク（Should）
- ## 優先タスク（Could）
- ## 2週間実行計画
- ## チーム共有用サマリー（200〜300文字）

## 制約
- 不明点は推測で断定せず「要確認」と明記。
- 技術負債解消だけでなく、運用品質（監視/可観測性/権限/運用負荷）も評価対象に含める。
- 可能なら「ユーザー価値」と「運用リスク低減」の両軸で優先理由を説明する。

---

### 使い方メモ
- 追加で設計資料がある場合は、このプロンプトの「プロジェクト情報」に追記してから実行してください。
- 出力された Must タスクをそのまま issue 化すると、次スプリント計画が速くなります。
