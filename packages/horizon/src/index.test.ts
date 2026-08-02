import { describe, it, expect } from 'vitest';
import { HorizonEngine, HorizonEvent } from './index';

describe('packages/horizon (The Horizon Forward Calendar Engine)', () => {
  it('registers forward events and filters by timeframe', () => {
    const engine = new HorizonEngine();

    const futureDate = new Date(Date.now() + 5 * 86400000).toISOString(); // 5 days ahead

    engine.addEvent({
      id: 'evt_fed_aug',
      title: 'FOMC Rate Decision Meeting',
      eventType: 'CENTRAL_BANK_DECISION',
      entityId: 'ent_fed',
      scheduledAt: futureDate,
      sourceId: 'fred'
    });

    const calendar = engine.getForwardCalendar(30);
    expect(calendar.length).toBe(1);
    expect(calendar[0].id).toBe('evt_fed_aug');
    expect(calendar[0].daysUntil).toBe(5);
  });

  it('attaches prediction market contract odds to forward events', () => {
    const engine = new HorizonEngine();

    const futureDate = new Date(Date.now() + 10 * 86400000).toISOString();

    const event = engine.addEvent({
      id: 'evt_ipo_acme',
      title: 'Acme AI Tech Corp S-1 IPO Registration',
      eventType: 'IPO_REGISTRATION',
      entityId: 'ent_acme',
      scheduledAt: futureDate,
      sourceId: 'sec_edgar',
      filingRef: 'r2://sec_edgar/0001980000/S1.json'
    });

    const attached = engine.attachPredictionOdds(event.id, {
      marketSource: 'kalshi',
      ticker: 'KXFEDAUG26',
      probabilityPct: 69,
      lastPriceText: '69%',
      updatedAt: new Date().toISOString()
    });

    expect(attached).toBe(true);

    const calendar = engine.getForwardCalendar(30);
    expect(calendar[0].attachedOdds?.length).toBe(1);
    expect(calendar[0].attachedOdds?.[0].probabilityPct).toBe(69);
  });
});
