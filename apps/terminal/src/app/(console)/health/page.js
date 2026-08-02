"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HealthPage;
const react_1 = __importDefault(require("react"));
const registry_1 = require("@meridian/registry");
const adapters_1 = require("@meridian/adapters");
async function getHealthData() {
    return await Promise.all(registry_1.WAVE_1_REGISTRY.map(async (source) => {
        try {
            const adapter = (0, adapters_1.createAdapter)(source.id);
            const h = await adapter.health();
            return {
                ...h,
                name: source.name,
                pillar: source.pillar,
                licence_class: source.licence_class,
                staleness_sla_seconds: source.staleness_sla_seconds
            };
        }
        catch {
            return {
                source_id: source.id,
                name: source.name,
                pillar: source.pillar,
                state: 'NOT_CONNECTED',
                expected_cadence: source.cadence,
                staleness_sla_seconds: source.staleness_sla_seconds,
                licence_class: source.licence_class
            };
        }
    }));
}
async function HealthPage() {
    const sources = await getHealthData();
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid #E4E4DF', paddingBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: '"DM Mono", monospace', marginBottom: '4px' }}>
          OPERATIONAL TELEMETRY & FEED HEALTH
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#14181B' }}>
          System Source Health Board
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
          Live status across registered data adapters. Sources with valid API keys report HEALTHY.
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
        <thead>
          <tr style={{ backgroundColor: '#F7F7F5', borderBottom: '2px solid #E4E4DF', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>SOURCE ID</th>
            <th style={{ padding: '10px' }}>NAME</th>
            <th style={{ padding: '10px' }}>PILLAR</th>
            <th style={{ padding: '10px' }}>CADENCE</th>
            <th style={{ padding: '10px' }}>LICENCE CLASS</th>
            <th style={{ padding: '10px' }}>SLA (SEC)</th>
            <th style={{ padding: '10px' }}>STATE</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (<tr key={source.source_id} style={{ borderBottom: '1px solid #E4E4DF' }}>
              <td style={{ padding: '10px', fontWeight: 700 }}>{source.source_id}</td>
              <td style={{ padding: '10px' }}>{source.name}</td>
              <td style={{ padding: '10px' }}>{source.pillar}</td>
              <td style={{ padding: '10px' }}>{source.expected_cadence}</td>
              <td style={{ padding: '10px' }}>{source.licence_class}</td>
              <td style={{ padding: '10px' }}>{source.staleness_sla_seconds}s</td>
              <td style={{ padding: '10px' }}>
                <span style={{
                padding: '2px 8px',
                fontWeight: 700,
                fontSize: '10px',
                backgroundColor: source.state === 'HEALTHY' ? '#DCFCE7' : '#FEF3C7',
                color: source.state === 'HEALTHY' ? '#166534' : '#92400E',
                border: source.state === 'HEALTHY' ? '1px solid #86EFAC' : '1px solid #FCD34D'
            }}>
                  {source.state}
                </span>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
//# sourceMappingURL=page.js.map