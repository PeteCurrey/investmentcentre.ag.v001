import { describe, it, expect } from 'vitest';
import { toScaledInteger, createMoney, addMoney, subMoney, moneyToString } from './money';

describe('packages/core/money', () => {
  it('correctly creates scaled integer from bigint and string integer', () => {
    const s1 = toScaledInteger(10050n);
    const s2 = toScaledInteger('10050');
    expect(s1).toBe(10050n);
    expect(s2).toBe(10050n);
  });

  it('throws runtime error if string float is passed to toScaledInteger', () => {
    expect(() => toScaledInteger('100.50')).toThrow(/Float values forbidden/);
  });

  it('performs exact scaled integer arithmetic', () => {
    const m1 = createMoney(toScaledInteger(1050n), 2, 'USD'); // $10.50
    const m2 = createMoney(toScaledInteger(2025n), 2, 'USD'); // $20.25
    const sum = addMoney(m1, m2);
    expect(sum.amount).toBe(3075n);
    expect(moneyToString(sum)).toBe('30.75 USD');

    const diff = subMoney(m2, m1);
    expect(diff.amount).toBe(975n);
    expect(moneyToString(diff)).toBe('9.75 USD');
  });
});
