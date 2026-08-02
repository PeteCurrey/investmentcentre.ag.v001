import { Pillar } from '@meridian/core';

export type EventType = 
  | 'IPO_REGISTRATION' 
  | 'EARNINGS_RELEASE' 
  | 'CENTRAL_BANK_DECISION' 
  | 'INDEX_REBALANCE' 
  | 'PREDICTION_MARKET_EXPIRY';

export interface PredictionOdds {
  marketSource: 'kalshi' | 'polymarket' | 'manifold';
  ticker: string;
  probabilityPct: number;
  lastPriceText: string;
  updatedAt: string;
}

export interface HorizonEvent {
  id: string;
  title: string;
  eventType: EventType;
  entityId: string | null;
  scheduledAt: string;
  sourceId: string;
  filingRef?: string;
  attachedOdds?: PredictionOdds[];
}

export class HorizonEngine {
  private events: Map<string, HorizonEvent> = new Map();

  public addEvent(event: HorizonEvent): HorizonEvent {
    this.events.set(event.id, event);
    return event;
  }

  public attachPredictionOdds(eventId: string, odds: PredictionOdds): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;

    if (!event.attachedOdds) {
      event.attachedOdds = [];
    }
    event.attachedOdds.push(odds);
    return true;
  }

  public getForwardCalendar(daysAhead = 90): (HorizonEvent & { daysUntil: number })[] {
    const now = new Date().getTime();
    const cutoff = now + daysAhead * 86400000;

    const result: (HorizonEvent & { daysUntil: number })[] = [];

    for (const event of this.events.values()) {
      const eventTime = new Date(event.scheduledAt).getTime();
      if (eventTime >= now && eventTime <= cutoff) {
        const daysUntil = Math.ceil((eventTime - now) / 86400000);
        result.push({
          ...event,
          daysUntil
        });
      }
    }

    return result.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }
}
