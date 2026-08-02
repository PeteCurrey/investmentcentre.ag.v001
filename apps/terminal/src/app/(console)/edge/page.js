"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EdgePage;
const react_1 = __importDefault(require("react"));
const Value_1 = require("../../../components/Value");
function EdgePage() {
    const opportunities = [
        {
            id: 'opp_1',
            instrument: 'GBP/USD',
            assetClass: 'FX',
            direction: 'BUY',
            conviction: 88,
            sizing: '1.0% Portfolio Risk',
            entryPrice: '1.3145',
            stopLoss: '1.3000',
            takeProfit: '1.3350',
            adversarySurvived: true,
            correlationGroup: 'USD_SHORT_EXPOSURE',
            citations: ['obs_fred_fedfunds', 'obs_twelve_gbpusd']
        },
        {
            id: 'opp_2',
            instrument: 'WTI_CRUDE',
            assetClass: 'COMMODITIES',
            direction: 'BUY',
            conviction: 82,
            sizing: '1.5% Portfolio Risk',
            entryPrice: '$78.40',
            stopLoss: '$75.00',
            takeProfit: '$84.00',
            adversarySurvived: true,
            correlationGroup: 'ENERGY_LONG_EXPOSURE',
            citations: ['obs_eia_crude', 'obs_twelve_wti']
        }
    ];
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          CROSS-ASSET OPPORTUNITY & POSITION STRUCTURE BOARD
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          The Edge
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Ranked cross-asset trade tickets, position correlation grouping, risk gate invalidation levels, and Adversary survival badges.
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
          RANKED OPPORTUNITIES (ADVERSARY SURVIVED)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
          {opportunities.map((opp) => (<div key={opp.id} style={{ border: '1px solid #E4E4DF', padding: '20px', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                padding: '4px 10px',
                backgroundColor: opp.direction === 'BUY' ? '#DCFCE7' : '#FEE2E2',
                color: opp.direction === 'BUY' ? '#166534' : '#991B1B',
                fontFamily: '"DM Mono", monospace',
                fontWeight: 700,
                fontSize: '12px',
                border: '1px solid #E4E4DF'
            }}>
                    {opp.direction}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#14181B' }}>
                    {opp.instrument}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
                    [{opp.assetClass}]
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{
                padding: '3px 8px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                fontWeight: 700,
                fontSize: '10px',
                fontFamily: '"DM Mono", monospace',
                border: '1px solid #86EFAC'
            }}>
                    ADVERSARY PASSED
                  </span>
                  <span style={{ fontFamily: '"DM Mono", monospace', fontWeight: 700, fontSize: '14px', color: '#1C3A5E' }}>
                    CONVICTION: {opp.conviction}/100
                  </span>
                </div>
              </div>

              {/* Parameters & Risk Gate Sizing */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', backgroundColor: '#F7F7F5', padding: '12px', border: '1px solid #E4E4DF', fontFamily: '"DM Mono", monospace', fontSize: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ color: '#6B7280', fontSize: '10px' }}>RECOMMENDED SIZING</div>
                  <div style={{ fontWeight: 700, color: '#14181B' }}>{opp.sizing}</div>
                </div>
                <div>
                  <div style={{ color: '#6B7280', fontSize: '10px' }}>ENTRY PRICE</div>
                  <div style={{ fontWeight: 700, color: '#14181B' }}>
                    <Value_1.Value provenance={{ value: opp.entryPrice, source: 'twelve_data', sourceTimestamp: new Date().toISOString(), stalenessSeconds: 5 }}/>
                  </div>
                </div>
                <div>
                  <div style={{ color: '#6B7280', fontSize: '10px' }}>STOP LOSS (RISK GATE)</div>
                  <div style={{ fontWeight: 700, color: '#DC2626' }}>{opp.stopLoss}</div>
                </div>
                <div>
                  <div style={{ color: '#6B7280', fontSize: '10px' }}>TAKE PROFIT</div>
                  <div style={{ fontWeight: 700, color: '#16A34A' }}>{opp.takeProfit}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#6B7280' }}>
                <span>CORRELATION GROUP: <strong>{opp.correlationGroup}</strong></span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span>CITATIONS:</span>
                  {opp.citations.map((c, i) => (<span key={i} style={{ color: '#1C3A5E', fontWeight: 700 }}>[{c}]</span>))}
                </div>
              </div>
            </div>))}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map