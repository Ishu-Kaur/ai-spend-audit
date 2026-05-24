import { expect, test, describe } from 'vitest';
import { runAudit, AuditInput } from '../lib/auditEngine';

describe('AI Spend Audit Engine Unit Tests', () => {

  // Test 1: ChatGPT Team 1-seat allocation downgrade to Plus
  test('Should suggest downgrading ChatGPT Team to Plus for 1 seat', () => {
    const input: AuditInput = {
      teamSize: 1,
      primaryUseCase: 'writing',
      tools: [
        { toolId: 'chatgpt', plan: 'team', monthlySpend: 30, seats: 1 }
      ]
    };
    const result = runAudit(input);
    expect(result.monthlySavings).toBe(10);
    expect(result.recommendations[0].recommendedPlan).toBe('Plus');
  });

  // Test 2: Cursor Business downgrade to Pro for teams < 3
  test('Should suggest downgrading Cursor Business to Pro for 2 seats', () => {
    const input: AuditInput = {
      teamSize: 2,
      primaryUseCase: 'coding',
      tools: [
        { toolId: 'cursor', plan: 'business', monthlySpend: 80, seats: 2 }
      ]
    };
    const result = runAudit(input);
    expect(result.monthlySavings).toBe(40); // (40 * 2) - (20 * 2) = 40
    expect(result.recommendations[0].recommendedPlan).toBe('Pro');
  });

  // Test 3: Claude Team minimum seat elimination
  test('Should suggest downgrading Claude Team to Pro if paying for less than 5 active users', () => {
    const input: AuditInput = {
      teamSize: 2,
      primaryUseCase: 'mixed',
      tools: [
        { toolId: 'claude', plan: 'team', monthlySpend: 125, seats: 2 } // paying the 5-seat minimum
      ]
    };
    const result = runAudit(input);
    expect(result.monthlySavings).toBe(85); // 125 - (20 * 2) = 85
    expect(result.recommendations[0].recommendedPlan).toBe('Pro');
  });

  // Test 4: High-savings verification
  test('Should flag high savings boolean if monthly savings are >= $500', () => {
    const input: AuditInput = {
      teamSize: 30,
      primaryUseCase: 'coding',
      tools: [
        { toolId: 'copilot', plan: 'enterprise', monthlySpend: 1170, seats: 30 } // 30 * 39 = 1170
      ]
    };
    const result = runAudit(input);
    expect(result.monthlySavings).toBe(600); // 1170 - (19 * 30) = 600
    expect(result.isHighSavings).toBe(true);
  });

  // Test 5: Optimal spend test (Zero savings)
  test('Should suggest zero savings if plans are already optimized', () => {
    const input: AuditInput = {
      teamSize: 5,
      primaryUseCase: 'coding',
      tools: [
        { toolId: 'cursor', plan: 'pro', monthlySpend: 100, seats: 5 }
      ]
    };
    const result = runAudit(input);
    expect(result.monthlySavings).toBe(0);
    expect(result.isHighSavings).toBe(false);
  });

});