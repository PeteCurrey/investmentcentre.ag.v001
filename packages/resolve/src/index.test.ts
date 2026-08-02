import { describe, it, expect } from 'vitest';
import { EntityResolver } from './index';

describe('packages/resolve (Entity Resolution & Union-Find)', () => {
  it('creates and resolves entity by ticker identifier', () => {
    const resolver = new EntityResolver();
    const ent = resolver.createEntity('Acme Corp', 'COMPANY', [
      { type: 'TICKER', value: 'ACME', source: 'twelve_data', confidence: 100 }
    ]);

    const found = resolver.resolveByIdentifier({
      type: 'TICKER',
      value: 'acme',
      source: 'twelve_data',
      confidence: 100
    });

    expect(found).not.toBeNull();
    expect(found?.id).toBe(ent.id);
    expect(found?.name).toBe('Acme Corp');
  });

  it('merges entities when cross-source identifiers overlap (EDGAR CIK + Companies House + LEI)', () => {
    const resolver = new EntityResolver();

    // Source 1: SEC EDGAR discovers company with CIK 0001234567
    const e1 = resolver.createEntity('Global Energy PLC', 'COMPANY', [
      { type: 'CIK', value: '0001234567', source: 'sec_edgar', confidence: 100 }
    ]);

    // Source 2: UK Companies House discovers company with Number 09876543
    const e2 = resolver.createEntity('Global Energy UK', 'COMPANY', [
      { type: 'COMPANIES_HOUSE', value: '09876543', source: 'companies_house', confidence: 100 }
    ]);

    expect(resolver.getAllEntities().length).toBe(2);

    // Source 3: GLEIF publishes LEI record linking CIK 0001234567 and Companies House 09876543
    resolver.attachIdentifier(e1.id, { type: 'LEI', value: '5493001KJ957G9212345', source: 'gleif', confidence: 100 });
    resolver.attachIdentifier(e2.id, { type: 'LEI', value: '5493001KJ957G9212345', source: 'gleif', confidence: 100 });

    // Merged into single canonical entity
    expect(resolver.getAllEntities().length).toBe(1);

    const resolvedByCik = resolver.resolveByIdentifier({ type: 'CIK', value: '0001234567', source: 'sec_edgar', confidence: 100 });
    const resolvedByCH = resolver.resolveByIdentifier({ type: 'COMPANIES_HOUSE', value: '09876543', source: 'companies_house', confidence: 100 });

    expect(resolvedByCik?.id).toBe(resolvedByCH?.id);
    expect(resolvedByCik?.identifiers.length).toBe(3);
  });
});
