"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BriefPage;
const react_1 = __importStar(require("react"));
const link_1 = __importDefault(require("next/link"));
const Value_1 = require("../../../components/Value");
function BriefPage() {
    const [activeTab, setActiveTab] = (0, react_1.useState)('ALL');
    const salienceRankedDeltas = [
        {
            id: 'sal_1',
            title: 'Fed Funds Rate Breach (5.75% vs 5.50% Thesis Threshold)',
            metric: 'macro.fred.fedfunds',
            pillar: 'WORLD',
            score: 90,
            breakdown: 'Matches active thesis (+40); Triggers complete thesis invalidation (+30); Cross-source contradiction (+20)',
            source: 'fred',
            val: '5.75%',
            age: 10,
            bias: 'BEARISH',
            instruments: ['GBP/USD', 'DXY', 'TLT'],
        },
        {
            id: 'sal_2',
            title: 'FCA Net Short Positions Spike on FTSE Retail Equities',
            metric: 'short_interest.fca.uk_net_shorts',
            pillar: 'MARKETS',
            score: 70,
            breakdown: 'Matches active thesis (+40); Cross-source contradiction (+20); Metric velocity accelerating (+10)',
            source: 'fca_short_positions',
            val: '4.85%',
            age: 120,
            bias: 'BEARISH',
            instruments: ['ASC.L', 'BOO.L', 'NMX53'],
        },
        {
            id: 'sal_3',
            title: 'Defense Innovation Systems Contract Award ($5M USD)',
            metric: 'contract.gov.award_amount',
            pillar: 'UNDERCURRENT',
            score: 40,
            breakdown: 'Matches active thesis (+40)',
            source: 'usaspending',
            val: '$5,000,000.00',
            age: 3600,
            bias: 'BULLISH',
            instruments: ['DIS', 'ITA'],
        }
    ];
    const filteredDeltas = activeTab === 'ALL'
        ? salienceRankedDeltas
        : salienceRankedDeltas.filter(d => d.pillar === activeTab);
    const biasConfig = {
        BULLISH: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
        BEARISH: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
        NEUTRAL: { bg: '#F7F7F5', color: '#6B7280', border: '#E4E4DF' },
    };
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: '"DM Mono", monospace' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', letterSpacing: '1px' }}>
            DAILY EXECUTIVE SYNTHESIS — 02 AUGUST 2026
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#14181B', letterSpacing: '-0.5px', margin: 0 }}>
            The Brief
          </h1>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', marginBottom: 0 }}>
            Deterministic explicit-weight salience ranking & position impact assessment.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
          {['ALL', 'WORLD', 'MARKETS', 'UNDERCURRENT'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '4px 12px',
                backgroundColor: activeTab === tab ? '#1C3A5E' : '#F7F7F5',
                color: activeTab === tab ? '#FFFFFF' : '#6B7280',
                border: '1px solid #E4E4DF',
                cursor: 'pointer',
                fontFamily: '"DM Mono", monospace',
                fontSize: '10px',
                letterSpacing: '0.5px'
            }}>
              {tab}
            </button>))}
        </div>
      </div>

      {/* KPI Summary Grid with SVG Sparklines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
            { label: 'MONITORED FEEDS', val: '18 Active', source: 'registry', age: 0, path: 'M0 20 L20 18 L40 22 L60 12 L80 15 L100 8' },
            { label: 'DELTAS DETECTED (24H)', val: '142', source: 'delta_engine', age: 12, path: 'M0 25 L20 22 L40 18 L60 10 L80 14 L100 5' },
            { label: 'COUNCIL CONSENSUS', val: '92% High', source: 'ai_council', age: 45, path: 'M0 15 L20 15 L40 12 L60 8 L80 10 L100 6' },
            { label: 'GBP/USD SPOT', val: '1.3145', unit: 'GBP/USD', source: 'twelve_data', age: 5, path: 'M0 22 L20 25 L40 20 L60 15 L80 18 L100 10' },
        ].map((kpi, idx) => (<div key={idx} style={{ border: '1px solid #E4E4DF', padding: '14px 16px', backgroundColor: '#F7F7F5', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.5px' }}>
              {kpi.label}
            </div>
            <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 500, color: '#14181B' }}>
              <Value_1.Value provenance={{ value: kpi.val, unit: kpi.unit, source: kpi.source, sourceTimestamp: new Date().toISOString(), stalenessSeconds: kpi.age }}/>
            </div>

            {/* Sparkline Graphic */}
            <div style={{ marginTop: '10px', height: '24px', width: '100%' }}>
              <svg width="100%" height="24" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path d={kpi.path} fill="none" stroke="#1C3A5E" strokeWidth="1.5" opacity="0.6"/>
              </svg>
            </div>
          </div>))}
      </div>

      {/* Salience Ranked Priority Board */}
      <div style={{ border: '1px solid #E4E4DF', padding: '20px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E4E4DF', paddingBottom: '10px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#1C3A5E', margin: 0, letterSpacing: '0.5px' }}>
            [SALIENCE RANKING] HIGHEST PRIORITY OPPORTUNITIES & DELTAS
          </h2>
          <span style={{ fontSize: '10px', color: '#6B7280' }}>
            SHOWING {filteredDeltas.length} OF {salienceRankedDeltas.length} ITEMS
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDeltas.map((item) => {
            const bias = biasConfig[item.bias];
            return (<link_1.default key={item.id} href={`/story/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                    border: `1px solid ${bias.border}`,
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                }} onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#F7F7F5';
                }} onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Crisp Salience Score Tag */}
                      <span style={{
                    padding: '2px 8px',
                    backgroundColor: item.score >= 80 ? '#FEE2E2' : '#FEF3C7',
                    color: item.score >= 80 ? '#991B1B' : '#92400E',
                    fontSize: '10px',
                    fontWeight: 600,
                    border: '1px solid #E4E4DF',
                }}>
                        SALIENCE {item.score}/100
                      </span>
                      
                      <span style={{
                    padding: '2px 8px',
                    backgroundColor: bias.bg,
                    color: bias.color,
                    fontSize: '10px',
                    fontWeight: 600,
                    border: `1px solid ${bias.border}`,
                }}>
                        {item.bias}
                      </span>

                      <span style={{
                    padding: '2px 6px',
                    backgroundColor: '#1C3A5E',
                    color: '#FFFFFF',
                    fontSize: '9px',
                    fontWeight: 600,
                }}>
                        {item.pillar}
                      </span>

                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#14181B' }}>
                        {item.title}
                      </span>
                    </div>

                    {/* Salience Meter Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, maxWidth: '240px', height: '4px', backgroundColor: '#E4E4DF', overflow: 'hidden' }}>
                        <div style={{
                    width: `${item.score}%`,
                    height: '100%',
                    backgroundColor: item.score >= 80 ? '#DC2626' : '#D97706'
                }}/>
                      </div>
                      <span style={{ fontSize: '10px', color: '#6B7280' }}>
                        WEIGHT: {item.breakdown}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {item.instruments.map(t => (<span key={t} style={{
                        padding: '1px 6px',
                        backgroundColor: '#F7F7F5',
                        border: '1px solid #E4E4DF',
                        fontSize: '10px',
                        fontWeight: 500,
                        color: '#1C3A5E',
                    }}>
                          {t}
                        </span>))}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', marginLeft: '24px' }}>
                    <Value_1.Value provenance={{ value: item.val, source: item.source, sourceTimestamp: new Date().toISOString(), stalenessSeconds: item.age }}/>
                    <div style={{
                    fontSize: '10px',
                    color: '#1C3A5E',
                    marginTop: '8px',
                }}>
                      VIEW NARRATIVE →
                    </div>
                  </div>
                </div>
              </link_1.default>);
        })}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map