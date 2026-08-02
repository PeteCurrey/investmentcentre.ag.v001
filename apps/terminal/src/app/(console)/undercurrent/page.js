"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UndercurrentPage;
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
const Value_1 = require("../../../components/Value");
function UndercurrentPage() {
    const entityJoins = [
        {
            id: 'uc_1',
            entityName: 'Defense Innovation Systems LLC',
            identifiers: 'CIK: 0001980000 | LEI: 5493001KJ957G9212345 | TICKER: DIS',
            congressTrade: {
                member: 'Rep. Virginia Foxx (US House)',
                transaction: 'PURCHASE ($50,000 - $100,000)',
                disclosedAt: '2026-07-28',
                source: 'quiver_quant'
            },
            govContract: {
                awardId: 'CONT_AWD_12345',
                agency: 'US Dept of Defense',
                amount: '$5,000,000.00',
                awardedAt: '2026-08-01',
                source: 'usaspending'
            },
            insiderForm4: {
                insider: 'CEO Johnathan Vance',
                sharesBought: '25,000 shares',
                filedAt: '2026-07-30',
                source: 'sec_edgar'
            }
        }
    ];
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          THE UNDERCURRENT — ALT-DATA & CROSS-SOURCE ENTITY JOINS
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          Smart Money & Government Contract Joins
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Congressional stock transactions cross-referenced against federal contract awards, SEC Form 4 insider purchases, and flight/maritime tracking. Click join for full analysis.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {entityJoins.map((join) => (<link_1.default key={join.id} href={`/story/${join.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
                border: '1px solid #E4E4DF',
                padding: '20px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
            }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F7F7F5')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}>
              <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1C3A5E' }}>
                    {join.entityName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginTop: '2px' }}>
                    RESOLVED IDENTIFIERS: {join.identifiers}
                  </div>
                </div>
                <div style={{ color: '#9CA3AF', fontSize: '18px' }}>→</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {/* Congressional Trade */}
                <div style={{ border: '1px solid #E4E4DF', padding: '14px', backgroundColor: '#FFFFFF' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#1C3A5E', marginBottom: '8px' }}>
                    [1] CONGRESSIONAL TRADE DISCLOSURE
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#14181B' }}>{join.congressTrade.member}</div>
                  <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, margin: '4px 0' }}>{join.congressTrade.transaction}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
                    Disclosed: {join.congressTrade.disclosedAt} ({join.congressTrade.source})
                  </div>
                </div>

                {/* Federal Contract Award */}
                <div style={{ border: '1px solid #E4E4DF', padding: '14px', backgroundColor: '#FFFFFF' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#1C3A5E', marginBottom: '8px' }}>
                    [2] FEDERAL CONTRACT AWARD (USAspending)
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#14181B' }}>{join.govContract.agency}</div>
                  <div style={{ fontSize: '14px', color: '#1C3A5E', fontWeight: 700, margin: '4px 0' }}>
                    <Value_1.Value provenance={{ value: join.govContract.amount, source: 'usaspending', sourceTimestamp: join.govContract.awardedAt, stalenessSeconds: 86400 }}/>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
                    Awarded: {join.govContract.awardedAt} ({join.govContract.awardId})
                  </div>
                </div>

                {/* SEC Form 4 Insider */}
                <div style={{ border: '1px solid #E4E4DF', padding: '14px', backgroundColor: '#FFFFFF' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#1C3A5E', marginBottom: '8px' }}>
                    [3] SEC FORM 4 INSIDER PURCHASE
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#14181B' }}>{join.insiderForm4.insider}</div>
                  <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, margin: '4px 0' }}>{join.insiderForm4.sharesBought}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
                    Filed: {join.insiderForm4.filedAt} ({join.insiderForm4.source})
                  </div>
                </div>
              </div>
            </div>
          </link_1.default>))}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map