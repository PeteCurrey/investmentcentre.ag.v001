"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CouncilPage;
const react_1 = __importDefault(require("react"));
function CouncilPage() {
    const models = [
        {
            role: 'RISK & MACRO OFFICER',
            modelName: 'claude-sonnet-4-6',
            provider: 'Anthropic (ANTHROPIC_API_KEY)',
            status: 'ONLINE',
            summary: 'Fed Funds rate at 5.25% maintains neutral monetary policy stance. Yield curve inversion narrowing. Macro risk metrics remain within FTMO_STANDARD parameters. [obs_fred_fedfunds]',
            conviction: '85%',
            citations: ['obs_fred_fedfunds', 'obs_nyfed_sofr']
        },
        {
            role: 'PORTFOLIO STRATEGIST',
            modelName: 'gpt-4o',
            provider: 'OpenAI (OPENAI_API_KEY)',
            status: 'ONLINE',
            summary: 'GBP/USD technical structure shows 4-hour market structure shift higher. Position sizing capped at 1.0% portfolio risk per trade intent. [obs_twelve_gbpusd]',
            conviction: '80%',
            citations: ['obs_twelve_gbpusd']
        },
        {
            role: 'SENTIMENT & NARRATIVE ANALYST',
            modelName: 'grok-beta',
            provider: 'xAI (XAI_API_KEY)',
            status: 'ONLINE',
            summary: 'Retail trader crowd positioning shows 62% short bias on GBP/USD. Retail crowd counter-trend opportunity confirmed. Prediction market odds show 69% probability of August Fed pause. [obs_kalshi_fedaug26]',
            conviction: '75%',
            citations: ['obs_kalshi_fedaug26']
        }
    ];
    const adversaryAttack = {
        thesisTitle: 'Long GBP/USD Macro & Rate Confluence',
        attackVector: 'Macro Counter-Trend Pressure & Crowded Liquidity',
        flawIdentified: 'Potential liquidity squeeze on unexpected high-volatility event',
        severity: 'MINOR',
        survived: true,
        counterArguments: [
            'Stop-loss bounds enforced by RiskGate',
            'Multi-model consensus holds > 80% conviction',
            'No active data contradictions detected'
        ],
        attackedAt: '2026-08-02 17:25:00 UTC'
    };
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          MULTI-MODEL ARTIFICIAL INTELLIGENCE COUNCIL & ADVERSARY ENGINE
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          AI Council & The Adversary
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Continuous 3-model synthesis (Claude, GPT-4o, Grok) with disagreement preservation and mandatory Adversary demolition passes.
        </p>
      </div>

      {/* Model Status Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {models.map((m, i) => (<div key={i} style={{ border: '1px solid #E4E4DF', padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#1C3A5E' }}>
                {m.role}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#166534',
                backgroundColor: '#DCFCE7',
                padding: '2px 6px',
                border: '1px solid #86EFAC'
            }}>
                {m.status}
              </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#14181B', marginBottom: '4px' }}>
              {m.modelName}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace' }}>
              {m.provider}
            </div>
          </div>))}
      </div>

      {/* Model Opinions & Citations */}
      <div style={{ border: '1px solid #E4E4DF', padding: '20px', backgroundColor: '#FFFFFF' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#1C3A5E', borderBottom: '1px solid #E4E4DF', paddingBottom: '8px', marginBottom: '16px' }}>
          [COUNCIL OPINIONS & CITATION VERIFICATION]
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {models.map((m, idx) => (<div key={idx} style={{ border: '1px solid #E4E4DF', padding: '16px', backgroundColor: '#F7F7F5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#14181B' }}>
                  {m.role} ({m.modelName})
                </span>
                <span style={{ fontSize: '12px', fontFamily: '"DM Mono", monospace', fontWeight: 700, color: '#1C3A5E' }}>
                  CONVICTION: {m.conviction}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#14181B', lineHeight: '1.5', marginBottom: '12px' }}>
                {m.summary}
              </p>
              <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>VERIFIED CITATIONS:</span>
                {m.citations.map((c, i) => (<span key={i} style={{ padding: '2px 6px', border: '1px solid #E4E4DF', backgroundColor: '#FFFFFF', color: '#1C3A5E', fontWeight: 700 }}>
                    [{c}]
                  </span>))}
              </div>
            </div>))}
        </div>
      </div>

      {/* The Adversary Demolition Pass */}
      <div style={{ border: '1px solid #DC2626', padding: '20px', backgroundColor: '#FEF2F2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FCA5A5', paddingBottom: '8px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"DM Mono", monospace', color: '#991B1B' }}>
            [THE ADVERSARY PASS] DEMOLITION ATTACK LOG
          </h2>
          <span style={{
            padding: '4px 10px',
            backgroundColor: '#DCFCE7',
            color: '#166534',
            fontWeight: 700,
            fontSize: '11px',
            fontFamily: '"DM Mono", monospace',
            border: '1px solid #86EFAC'
        }}>
            ATTACK SURVIVED (STRICTLY INTACT)
          </span>
        </div>

        <div style={{ fontSize: '13px', color: '#14181B', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div><strong>Attacked Thesis:</strong> {adversaryAttack.thesisTitle}</div>
          <div><strong>Attack Vector:</strong> {adversaryAttack.attackVector}</div>
          <div><strong>Flaw Highlighted:</strong> {adversaryAttack.flawIdentified}</div>
          <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
            <strong>SURVIVAL DEFENSE COUNTER-ARGUMENTS:</strong>
            <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginTop: '4px' }}>
              {adversaryAttack.counterArguments.map((arg, idx) => (<li key={idx}>{arg}</li>))}
            </ul>
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map