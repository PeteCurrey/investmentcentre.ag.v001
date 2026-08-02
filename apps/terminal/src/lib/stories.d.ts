export interface InstrumentImpact {
    ticker: string;
    name: string;
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
    reasoning: string;
    assetClass: 'FX' | 'EQUITY' | 'COMMODITY' | 'RATES' | 'CREDIT' | 'CRYPTO' | 'INDEX';
}
export interface TraderImpact {
    headline: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'HIGH ALERT' | 'VOLATILE';
    timeframe: 'IMMEDIATE' | 'SHORT-TERM' | 'MEDIUM-TERM' | 'LONG-TERM';
    affectedTraderTypes: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export interface Story {
    id: string;
    title: string;
    pillar: string;
    salienceScore?: number;
    sourceLabel: string;
    publishedAt: string;
    metricLabel?: string;
    metricValue?: string;
    summary: string;
    narrative: string;
    keyFacts: string[];
    traderImpact: TraderImpact;
    instruments: InstrumentImpact[];
    relatedStoryIds: string[];
    tags: string[];
}
export declare const STORIES: Record<string, Story>;
export declare function getStory(id: string): Story | undefined;
export declare function getAllStories(): Story[];
export declare function getRelatedStories(id: string): Story[];
//# sourceMappingURL=stories.d.ts.map