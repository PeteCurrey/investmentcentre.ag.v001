export type EventType = 'IPO_REGISTRATION' | 'EARNINGS_RELEASE' | 'CENTRAL_BANK_DECISION' | 'INDEX_REBALANCE' | 'PREDICTION_MARKET_EXPIRY';
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
export declare class HorizonEngine {
    private events;
    addEvent(event: HorizonEvent): HorizonEvent;
    attachPredictionOdds(eventId: string, odds: PredictionOdds): boolean;
    getForwardCalendar(daysAhead?: number): (HorizonEvent & {
        daysUntil: number;
    })[];
}
//# sourceMappingURL=index.d.ts.map