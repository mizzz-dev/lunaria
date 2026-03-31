// =============================================
// @lunaria/rule-engine - Trigger → Condition → Action
// =============================================

import type {
  RuleCondition,
  RuleAction,
  RuleContext,
  RuleExecutionResult,
} from '@lunaria/types';
import { evaluateConditions } from './conditions.js';
import { executeActions } from './actions.js';
import type { ActionExecutionDeps } from './actions.js';

export type { ActionExecutionDeps } from './actions.js';
export { evaluateConditions } from './conditions.js';
export { executeActions } from './actions.js';

export interface RuleRecord {
  id: string;
  trigger: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
}

/** Execute a single rule against the given context */
export async function executeRule(
  rule: RuleRecord,
  ctx: RuleContext,
  deps: ActionExecutionDeps,
): Promise<RuleExecutionResult> {
  const start = Date.now();

  if (!rule.enabled) {
    return { ruleId: rule.id, status: 'skipped', actionsRan: [], durationMs: 0 };
  }

  // Evaluate conditions
  const conditionsMet = evaluateConditions(rule.conditions, ctx);
  if (!conditionsMet) {
    return {
      ruleId: rule.id,
      status: 'skipped',
      actionsRan: [],
      durationMs: Date.now() - start,
    };
  }

  // Execute actions
  const actionResults = await executeActions(rule.actions, ctx, deps);
  const anyError = actionResults.some((r) => !r.success);

  const errorMsg = anyError
    ? actionResults
        .filter((r) => !r.success)
        .map((r) => `${r.type}: ${r.error ?? 'unknown'}`)
        .join('; ')
    : undefined;

  return {
    ruleId: rule.id,
    status: anyError ? 'error' : 'success',
    actionsRan: actionResults.filter((r) => r.success).map((r) => r.type),
    ...(errorMsg !== undefined ? { error: errorMsg } : {}),
    durationMs: Date.now() - start,
  };
}

/** Execute all matching rules for a trigger, sorted by priority */
export async function executeRulesForTrigger(
  rules: RuleRecord[],
  ctx: RuleContext,
  deps: ActionExecutionDeps,
): Promise<RuleExecutionResult[]> {
  const matching = rules
    .filter((r) => r.enabled && r.trigger === ctx.trigger)
    .sort((a, b) => b.priority - a.priority);

  return Promise.all(matching.map((rule) => executeRule(rule, ctx, deps)));
}

/** Dry-run a rule without actually executing actions (for testing) */
export function testRule(
  rule: Pick<RuleRecord, 'conditions'>,
  ctx: RuleContext,
): { conditionsMet: boolean; conditionResults: Array<{ type: string; passed: boolean }> } {
  const conditionResults = (rule.conditions ?? []).map((cond) => ({
    type: cond.type,
    passed: evaluateConditions([cond], ctx),
  }));

  return {
    conditionsMet: conditionResults.every((r) => r.passed),
    conditionResults,
  };
}
