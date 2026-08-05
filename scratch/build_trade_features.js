const fs = require('fs');

const path = '/Users/petercurrey/Desktop/Investment Centre/apps/terminal/src/app/(console)/trade/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add computeTimeHeld and getTvSymbol helpers right before ratingColor function
const helpersPos = content.indexOf('function ratingColor');
if (helpersPos !== -1 && !content.includes('function getTvSymbol')) {
  const helpersCode = `function getTvSymbol(symbol: string): string {
  const inst = INSTRUMENTS.find(i => i.symbol === symbol);
  return inst ? inst.tvSymbol : 'FX:' + symbol.replace('/', '');
}

function computeTimeHeld(openedAt: string): string {
  if (!openedAt || openedAt === '—') return '—';
  const tradeTime = new Date(openedAt.includes('T') ? openedAt : openedAt.replace(' ', 'T')).getTime();
  if (isNaN(tradeTime)) return openedAt;
  const ms = Date.now() - tradeTime;
  if (ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return \`\${days}d \${hours % 24}h\`;
  if (hours > 0) return \`\${hours}h \${mins % 60}m\`;
  return \`\${mins}m\`;
}

`;
  content = content.substring(0, helpersPos) + helpersCode + content.substring(helpersPos);
}

// 2. Add new state hooks
const statesTarget = "const [pnlTimeframe, setPnlTimeframe]";
if (!content.includes('const [bulkModalOpen, setBulkModalOpen]')) {
  const newStates = `// Bulk Actions State
  const [bulkModalOpen, setBulkModalOpen]           = useState(false);
  const [bulkFilter, setBulkFilter]                 = useState<'all' | 'profitable' | 'losing' | 'instrument'>('all');
  const [bulkInstrument, setBulkInstrument]         = useState<string>('');
  const [bulkConfirmPending, setBulkConfirmPending] = useState(false);
  const [bulkProgress, setBulkProgress]             = useState<{ current: number; total: number } | null>(null);
  const [bulkResult, setBulkResult]                 = useState<string | null>(null);

  // Chart Modal State
  const [chartModalInstrument, setChartModalInstrument] = useState<{ symbol: string; tvSymbol: string } | null>(null);
  const [chartModalTimeframe, setChartModalTimeframe]   = useState<string>('60');

  // Table UX & Refresh Timer
  const [hoveredRow, setHoveredRow]                 = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown]     = useState<number>(30);

  ${statesTarget}`;
  content = content.replace(statesTarget, newStates);
}

// 3. Countdown timer effect
if (!content.includes('setRefreshCountdown(prev')) {
  const countdownEffectTarget = "const inst = instruments.find";
  const countdownEffectCode = `useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  ${countdownEffectTarget}`;
  content = content.replace(countdownEffectTarget, countdownEffectCode);
}

// 4. handleBulkClose function
if (!content.includes('const handleBulkClose')) {
  const bulkCloseTarget = "const fetchOandaData = useCallback";
  const bulkCloseCode = `const handleBulkClose = async (positionsToClose: Position[]) => {
    if (positionsToClose.length === 0) return;
    setBulkConfirmPending(false);
    setBulkProgress({ current: 0, total: positionsToClose.length });
    setBulkResult(null);

    let closedCount = 0;
    let totalRealizedEst = 0;

    for (let i = 0; i < positionsToClose.length; i++) {
      const p = positionsToClose[i];
      setBulkProgress({ current: i + 1, total: positionsToClose.length });
      try {
        const res = await fetch('/api/close-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tradeId: p.tradeId, instrument: p.instrument })
        });
        const data = await res.json();
        if (data.success) {
          closedCount++;
          const pnlVal = parseFloat(p.unrealizedPL || '0');
          totalRealizedEst += p.pnlPositive ? pnlVal : -pnlVal;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 300));
    }

    setBulkProgress(null);
    const sign = totalRealizedEst >= 0 ? '+' : '-';
    setBulkResult(\`Closed \${closedCount} of \${positionsToClose.length} position\${positionsToClose.length !== 1 ? 's' : ''}. Est. P&L: \${sign}\$\${Math.abs(totalRealizedEst).toFixed(2)}\`);
    fetchOandaData();
  };

  ${bulkCloseTarget}`;
  content = content.replace(bulkCloseTarget, bulkCloseCode);
}

// 5. Open Chart button in ticker strip
if (!content.includes('OPEN CHART IN POPUP')) {
  const tickerStripTarget = "{TIMEFRAMES.map(tf => (";
  const tickerStripCode = `<button onClick={() => setChartModalInstrument({ symbol: inst.symbol, tvSymbol: inst.tvSymbol })} style={{
            padding: '2px 9px', backgroundColor: '#1C3A5E', color: '#C8F135', border: '1px solid #1C3A5E', fontSize: '9px', fontWeight: 700, cursor: 'pointer', ...mono, marginRight: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            📈 OPEN CHART
          </button>
          ${tickerStripTarget}`;
  content = content.replace(tickerStripTarget, tickerStripCode);
}

// 6. Mode Clarity Banner above Closed P&L / Positions panel
if (!content.includes('MODE CLARITY BANNER')) {
  const bannerTarget = "{/* ── Closed Trades P&L Performance Analytics ── */}";
  const bannerCode = `{/* ── MODE CLARITY BANNER ── */}
      <div style={{
        padding: '10px 16px',
        marginBottom: '16px',
        backgroundColor: autotrader?.enabled ? '#F0FDF4' : '#F0F9FF',
        border: \`1px solid \${autotrader?.enabled ? '#86EFAC' : '#BAE6FD'}\`,
        borderRadius: '2px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        fontFamily: '"DM Mono", monospace',
        fontSize: '11px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: autotrader?.enabled ? '#22C55E' : '#0284C7',
            display: 'inline-block',
            boxShadow: autotrader?.enabled ? '0 0 8px rgba(34, 197, 94, 0.8)' : 'none'
          }} />
          <span style={{ fontWeight: 800, color: autotrader?.enabled ? '#166534' : '#0369A1', letterSpacing: '0.5px' }}>
            {autotrader?.enabled ? '⚡ AUTO-TRADING ENGINE ACTIVE' : '👤 MANUAL TRADING MODE'}
          </span>
          <span style={{ color: '#475569', fontSize: '10px' }}>
            — {autotrader?.enabled ? 'Algorithmic signals running. Manual trades & overrides permitted.' : 'Full operator manual control. Autonomous signals paused.'}
          </span>
        </div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: autotrader?.enabled ? '#15803D' : '#0284C7' }}>
          {autotrader?.enabled ? \`LOTS: \${autotrader.lotUnits || 100} units\` : 'MANUAL ROUTER READY'}
        </div>
      </div>

      ${bannerTarget}`;
  content = content.replace(bannerTarget, bannerCode);
}

// 7. Header of Positions Panel (Add Bulk Actions button + summary stats)
const headerTarget = "<span style={{ padding: '1px 7px', backgroundColor: positions.length > 0 ? '#22C55E' : '#475569', color: '#FFFFFF', fontSize: '9px', fontWeight: 800 }}>{positions.length}</span>";
if (!content.includes('BULK ACTIONS')) {
  const headerReplacement = `<span style={{ padding: '1px 7px', backgroundColor: positions.length > 0 ? '#22C55E' : '#475569', color: '#FFFFFF', fontSize: '9px', fontWeight: 800 }}>{positions.length}</span>
            {positions.length > 0 && (() => {
              const totalUnrealized = positions.reduce((acc, p) => acc + (p.pnlPositive ? parseFloat(p.unrealizedPL) : -parseFloat(p.unrealizedPL)), 0);
              const winCount = positions.filter(p => p.pnlPositive).length;
              const lossCount = positions.filter(p => !p.pnlPositive).length;
              const pnlSign = totalUnrealized >= 0 ? '+' : '-';
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
                  <span style={{ fontSize: '10px', color: totalUnrealized >= 0 ? '#4ADE80' : '#F87171', fontWeight: 800, fontFamily: '"DM Mono", monospace' }}>
                    UNREALIZED: {pnlSign}\${Math.abs(totalUnrealized).toFixed(2)}
                  </span>
                  <span style={{ fontSize: '9px', color: '#94A3B8' }}>
                    ({winCount}W / {lossCount}L)
                  </span>
                </div>
              );
            })()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {positions.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setBulkModalOpen(true); setBulkResult(null); }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  fontFamily: '"DM Mono", monospace',
                }}
              >
                ⚡ BULK ACTIONS
              </button>
            )}
            <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 400 }}>Refreshed {lastRefresh} (next in {refreshCountdown}s) · {posCollapsed ? 'click to expand' : 'click to collapse'}</span>
          </div>`;
  content = content.replace(
    `<span style={{ padding: '1px 7px', backgroundColor: positions.length > 0 ? '#22C55E' : '#475569', color: '#FFFFFF', fontSize: '9px', fontWeight: 800 }}>{positions.length}</span>
          </div>
          <span style={{ fontSize: '9px', color: '#475569', fontWeight: 400 }}>Refreshed {lastRefresh} · {posCollapsed ? 'click to expand' : 'click to collapse'}</span>`,
    headerReplacement
  );
}

// 8. Replace Table Headers to include CHART column
if (!content.includes("'CHART'")) {
  content = content.replace(
    "{['INSTRUMENT', 'DIRECTION', 'UNITS', 'ENTRY', 'UNREALIZED P&L', 'OPENED AT', 'DETAILS', 'CLOSE'].map(h => (",
    "{['INSTRUMENT', 'CHART', 'DIRECTION', 'UNITS', 'ENTRY', 'UNREALIZED P&L', 'OPENED / TIME HELD', 'DETAILS', 'CLOSE'].map(h => ("
  );
}

// 9. Table Row customization (Visual P&L edge bar, hover state, Chart button, Time held)
const oldRowPattern = `<tr style={{ borderBottom: '1px solid #F0F0EC', backgroundColor: expandedPos === p.id ? '#F0F9FF' : (p.pnlPositive ? '#F0FDF4' : '#FFF5F5') }}>
                          <td style={{ padding: '9px 12px', fontWeight: 800, color: '#1C3A5E', fontSize: '11px' }}>{p.instrument}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{ padding: '2px 7px', backgroundColor: p.direction === 'BUY' ? '#DCFCE7' : '#FEE2E2', color: p.direction === 'BUY' ? '#166534' : '#991B1B', fontWeight: 800, border: \`1px solid \${p.direction === 'BUY' ? '#86EFAC' : '#FCA5A5'}\`, fontSize: '9px' }}>
                              {p.direction === 'BUY' ? '▲ LONG' : '▼ SHORT'}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', fontWeight: 600 }}>{p.units}</td>
                          <td style={{ padding: '9px 12px' }}>{p.entryPrice}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 800, fontSize: '11px', color: p.pnlPositive ? '#16A34A' : '#DC2626' }}>{p.pnlSign}\${p.unrealizedPL}</td>
                          <td style={{ padding: '9px 12px', color: '#6B7280', whiteSpace: 'nowrap' }}>{p.openedAt}</td>`;

const newRowReplacement = `<tr
                          onMouseEnter={() => setHoveredRow(p.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            borderBottom: '1px solid #F0F0EC',
                            borderLeft: \`4px solid \${p.pnlPositive ? '#22C55E' : '#EF4444'}\`,
                            backgroundColor: hoveredRow === p.id ? '#F1F5F9' : (expandedPos === p.id ? '#F0F9FF' : (p.pnlPositive ? '#F0FDF4' : '#FFF5F5')),
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '9px 12px', fontWeight: 800, color: '#1C3A5E', fontSize: '11px' }}>{p.instrument}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <button
                              onClick={() => setChartModalInstrument({ symbol: p.instrument, tvSymbol: getTvSymbol(p.instrument) })}
                              style={{ padding: '2px 6px', backgroundColor: '#1C3A5E', color: '#C8F135', border: 'none', fontSize: '9px', fontWeight: 700, cursor: 'pointer', ...mono }}
                            >
                              📈 CHART
                            </button>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{ padding: '2px 7px', backgroundColor: p.direction === 'BUY' ? '#DCFCE7' : '#FEE2E2', color: p.direction === 'BUY' ? '#166534' : '#991B1B', fontWeight: 800, border: \`1px solid \${p.direction === 'BUY' ? '#86EFAC' : '#FCA5A5'}\`, fontSize: '9px' }}>
                              <span style={{ animation: 'blink 1.5s infinite', display: 'inline-block', marginRight: '3px' }}>{p.direction === 'BUY' ? '▲' : '▼'}</span>
                              {p.direction === 'BUY' ? 'LONG' : 'SHORT'}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', fontWeight: 600 }}>{p.units}</td>
                          <td style={{ padding: '9px 12px' }}>{p.entryPrice}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 800, fontSize: '11px', color: p.pnlPositive ? '#16A34A' : '#DC2626' }}>{p.pnlSign}\${p.unrealizedPL}</td>
                          <td style={{ padding: '9px 12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                            <div>{p.openedAt}</div>
                            <div style={{ fontSize: '8px', color: '#94A3B8', fontWeight: 600 }}>Held: {computeTimeHeld(p.openedAt)}</div>
                          </td>`;

if (content.includes(oldRowPattern)) {
  content = content.replace(oldRowPattern, newRowReplacement);
}

// 10. Update ColSpan in expanded row detail from 8 to 9
content = content.replace('<td colSpan={8}', '<td colSpan={9}');

// 11. Add Modals before closing </div>
const closingStyleTarget = "<style>{`";
if (!content.includes('/* ── BULK ACTIONS MODAL ── */')) {
  const modalsJsx = `{/* ── BULK ACTIONS MODAL ── */}
      {bulkModalOpen && (
        <div
          onClick={() => setBulkModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC',
              width: '100%', maxWidth: '520px', padding: '24px', borderRadius: '4px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', fontFamily: '"DM Mono", monospace'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', pb: '12px', marginBottom: '16px', paddingBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626', letterSpacing: '1px' }}>
                ⚡ BULK CLOSE OPERATIONS
              </div>
              <button onClick={() => setBulkModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>

            {bulkProgress ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '12px', color: '#C8F135', marginBottom: '12px', fontWeight: 700 }}>
                  CLOSING POSITIONS ({bulkProgress.current} / {bulkProgress.total})...
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#1E293B', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: \`\${(bulkProgress.current / bulkProgress.total) * 100}%\`, height: '100%', backgroundColor: '#DC2626', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            ) : bulkResult ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#4ADE80', fontWeight: 800, marginBottom: '16px' }}>{bulkResult}</div>
                <button onClick={() => { setBulkResult(null); setBulkModalOpen(false); }} style={{ padding: '8px 20px', backgroundColor: '#1C3A5E', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', ...mono }}>
                  DONE
                </button>
              </div>
            ) : bulkConfirmPending ? (
              <div style={{ backgroundColor: '#1E293B', padding: '16px', border: '1px solid #DC2626', marginBottom: '16px' }}>
                <div style={{ color: '#EF4444', fontWeight: 800, fontSize: '12px', marginBottom: '8px' }}>⚠️ CONFIRM BULK EXECUTION</div>
                <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '16px' }}>
                  You are about to execute a bulk close for <strong>{
                    bulkFilter === 'all' ? positions.length :
                    bulkFilter === 'profitable' ? positions.filter(p => p.pnlPositive).length :
                    bulkFilter === 'losing' ? positions.filter(p => !p.pnlPositive).length :
                    positions.filter(p => p.instrument === bulkInstrument).length
                  } position(s)</strong> via OANDA API.
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setBulkConfirmPending(false)} style={{ padding: '8px 14px', backgroundColor: '#334155', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, ...mono }}>CANCEL</button>
                  <button onClick={() => {
                    let toClose = positions;
                    if (bulkFilter === 'profitable') toClose = positions.filter(p => p.pnlPositive);
                    if (bulkFilter === 'losing') toClose = positions.filter(p => !p.pnlPositive);
                    if (bulkFilter === 'instrument') toClose = positions.filter(p => p.instrument === bulkInstrument);
                    handleBulkClose(toClose);
                  }} style={{ padding: '8px 16px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 800, ...mono }}>
                    CONFIRM EXECUTE →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Section A — By Filter */}
                <div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px', marginBottom: '10px' }}>
                    SECTION A — CLOSE ALL BY FILTER ({positions.length} OPEN)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={() => { setBulkFilter('profitable'); setBulkConfirmPending(true); }}
                      disabled={positions.filter(p => p.pnlPositive).length === 0}
                      style={{ padding: '12px', backgroundColor: '#166534', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: positions.filter(p => p.pnlPositive).length === 0 ? 0.4 : 1, textAlign: 'left', ...mono }}
                    >
                      <div>✕ CLOSE ALL PROFITABLE</div>
                      <div style={{ fontSize: '9px', color: '#86EFAC', fontWeight: 400, marginTop: '4px' }}>
                        {positions.filter(p => p.pnlPositive).length} trade(s) in profit
                      </div>
                    </button>
                    <button
                      onClick={() => { setBulkFilter('losing'); setBulkConfirmPending(true); }}
                      disabled={positions.filter(p => !p.pnlPositive).length === 0}
                      style={{ padding: '12px', backgroundColor: '#991B1B', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: positions.filter(p => !p.pnlPositive).length === 0 ? 0.4 : 1, textAlign: 'left', ...mono }}
                    >
                      <div>✕ CLOSE ALL LOSING</div>
                      <div style={{ fontSize: '9px', color: '#FCA5A5', fontWeight: 400, marginTop: '4px' }}>
                        {positions.filter(p => !p.pnlPositive).length} trade(s) in loss
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={() => { setBulkFilter('all'); setBulkConfirmPending(true); }}
                    style={{ width: '100%', marginTop: '10px', padding: '12px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', fontWeight: 800, cursor: 'pointer', letterSpacing: '1px', ...mono }}
                  >
                    🚨 EMERGENCY CLOSE ALL {positions.length} OPEN POSITIONS
                  </button>
                </div>

                {/* Section B — By Instrument */}
                <div style={{ borderTop: '1px solid #1E293B', paddingTop: '16px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px', marginBottom: '10px' }}>
                    SECTION B — CLOSE BY SPECIFIC INSTRUMENT
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={bulkInstrument}
                      onChange={e => setBulkInstrument(e.target.value)}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#1E293B', color: '#F8FAFC', border: '1px solid #334155', ...mono, fontSize: '11px' }}
                    >
                      <option value="">Select Instrument...</option>
                      {Array.from(new Set(positions.map(p => p.instrument))).map(sym => (
                        <option key={sym} value={sym}>
                          {sym} ({positions.filter(p => p.instrument === sym).length} trade(s))
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!bulkInstrument}
                      onClick={() => { setBulkFilter('instrument'); setBulkConfirmPending(true); }}
                      style={{ padding: '8px 16px', backgroundColor: bulkInstrument ? '#1C3A5E' : '#334155', color: bulkInstrument ? '#C8F135' : '#64748B', border: '1px solid #334155', fontWeight: 800, cursor: bulkInstrument ? 'pointer' : 'not-allowed', ...mono }}
                    >
                      CLOSE PAIR →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHART MODAL OVERLAY ── */}
      {chartModalInstrument && (
        <div
          onClick={() => setChartModalInstrument(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)',
            zIndex: 9998, display: 'flex', flexDirection: 'column', padding: '24px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, backgroundColor: '#0F172A', border: '1px solid #1E293B',
              borderRadius: '4px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
          >
            <div style={{ padding: '12px 20px', backgroundColor: '#1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#C8F135', letterSpacing: '1px', ...mono }}>
                  📈 LIVE CHART — {chartModalInstrument.symbol}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf.value}
                      onClick={() => setChartModalTimeframe(tf.value)}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: chartModalTimeframe === tf.value ? '#1C3A5E' : '#0F172A',
                        color: chartModalTimeframe === tf.value ? '#C8F135' : '#94A3B8',
                        border: `1px solid ${chartModalTimeframe === tf.value ? '#C8F135' : '#334155'}`,
                        fontSize: '10px', cursor: 'pointer', ...mono
                      }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setChartModalInstrument(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#0A0D12' }}>
              <TradingViewChart symbol={chartModalInstrument.tvSymbol} interval={chartModalTimeframe} theme="dark" height="100%" showSidebar />
            </div>
          </div>
        </div>
      )}

      `;
  content = content.replace(closingStyleTarget, modalsJsx + closingStyleTarget);
}

// 12. Keyframe blink animation in style tag
if (!content.includes('@keyframes blink')) {
  content = content.replace(
    '@keyframes pulse {',
    `@keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        @keyframes pulse {`
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched trade page');
