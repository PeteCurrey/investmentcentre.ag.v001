"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HorizonPage;
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
function HorizonPage() {
    const events = [
        {
            id: 'hor_1',
            title: 'Acme AI Tech Corp S-1 IPO Registration',
            eventType: 'IPO_REGISTRATION',
            scheduledAt: '2026-08-15',
            daysUntil: 13,
            sourceId: 'sec_edgar',
            predictionOdds: { source: 'kalshi', prob: '64%' }
        },
        {
            id: 'hor_2',
            title: 'FOMC Federal Reserve Interest Rate Decision',
            eventType: 'CENTRAL_BANK_DECISION',
            scheduledAt: '2026-08-20',
            daysUntil: 18,
            sourceId: 'fred',
            predictionOdds: { source: 'kalshi', prob: '69%' }
        },
        {
            id: 'hor_3',
            title: 'FTSE 100 Quarterly Index Rebalance',
            eventType: 'INDEX_REBALANCE',
            scheduledAt: '2026-09-01',
            daysUntil: 30,
            sourceId: 'companies_house',
            predictionOdds: null
        }
    ];
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          FORWARD EVENT & TIMEFRAME HORIZON
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The Horizon
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Unified forward calendar linking SEC EDGAR filings, central bank dates, and Kalshi/Polymarket event contract odds.
        </p>
      </div>

      <div style={{ border: '1px solid #E4E4DF' }}>
        <div style={{
            backgroundColor: '#F7F7F5',
            padding: '12px 16px',
            fontSize: '12px',
            fontFamily: '"DM Mono", monospace',
            fontWeight: 700,
            borderBottom: '1px solid #E4E4DF',
            color: '#1C3A5E'
        }}>
          UPCOMING EVENTS (NEXT 90 DAYS) — CLICK ROW FOR FULL ANALYSIS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {events.map((evt, idx) => (<link_1.default key={evt.id} href={`/story/${evt.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                padding: '16px',
                borderBottom: idx < events.length - 1 ? '1px solid #E4E4DF' : 'none',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
            }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F7F7F5')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}>
                <div style={{ minWidth: '80px', fontWeight: 700, color: '#1C3A5E', fontFamily: '"DM Mono", monospace', fontSize: '12px' }}>
                  T-{evt.daysUntil} Days
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                padding: '2px 6px',
                backgroundColor: '#1C3A5E',
                color: '#FFFFFF',
                fontSize: '9px',
                fontWeight: 700,
                fontFamily: '"DM Mono", monospace'
            }}>
                      {evt.eventType}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#14181B' }}>
                      {evt.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
                    Scheduled: {evt.scheduledAt} | Source: {evt.sourceId}
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
                  {evt.predictionOdds ? (<div>
                      <div style={{ color: '#16A34A', fontWeight: 700, fontSize: '14px' }}>
                        {evt.predictionOdds.prob}
                      </div>
                      <div style={{ color: '#6B7280', fontSize: '10px' }}>
                        {evt.predictionOdds.source}
                      </div>
                    </div>) : (<span style={{ color: '#9CA3AF' }}>NO ODD MARKETS</span>)}
                </div>
                
                <div style={{ color: '#9CA3AF', fontSize: '14px', paddingLeft: '8px' }}>
                  →
                </div>
              </div>
            </link_1.default>))}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map