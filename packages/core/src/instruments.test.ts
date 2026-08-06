import { describe, it, expect } from 'vitest';
import { INSTRUMENT_PIPS, getPipValue } from './instruments';

describe('Instrument Pip Resolution & Magnitude Constraints', () => {
  it('resolves every instrument in INSTRUMENT_PIPS to an explicit pip scale', () => {
    expect(INSTRUMENT_PIPS.length).toBeGreaterThan(30);

    for (const inst of INSTRUMENT_PIPS) {
      const pipFromSymbol = getPipValue(inst.symbol);
      const pipFromOanda = getPipValue(inst.oandaId);

      expect(pipFromSymbol).toBe(inst.pipValue);
      expect(pipFromOanda).toBe(inst.pipValue);
    }
  });

  it('asserts magnitude limits per instrument category', () => {
    for (const inst of INSTRUMENT_PIPS) {
      const s = inst.symbol.toUpperCase();

      // FX Majors, Minors, Exotics
      if (s.includes('/') && !s.startsWith('XAU') && !s.startsWith('XAG') && !s.startsWith('BTC') && !s.startsWith('ETH') && !s.startsWith('SOL') && !s.startsWith('XRP') && !s.startsWith('LTC') && !s.startsWith('XPT') && !s.startsWith('XPD')) {
        if (s.includes('JPY')) {
          expect(inst.pipValue).toBe(0.01);
        } else {
          expect(inst.pipValue).toBe(0.0001);
        }
        // Simulated FX spread of 0.0003 (3 pips) or 0.03 for JPY (3 pips)
        const mockRawSpreadDiff = s.includes('JPY') ? 0.03 : 0.0003;
        const spreadPips = mockRawSpreadDiff / inst.pipValue;
        expect(spreadPips).toBeLessThan(5.0);
      }

      // Equity Indices
      if (['SPX500', 'NAS100', 'US30', 'UK100', 'GER40', 'JPN225', 'AUS200', 'HK33', 'EU50'].includes(inst.symbol)) {
        expect(inst.pipValue).toBe(1.0);
        // Simulated index spread (e.g. 3.2 points for NAS100, 4.5 for US30, 0.5 for SPX)
        const mockIndexSpreadPoints = 3.2;
        const spreadPoints = mockIndexSpreadPoints / inst.pipValue;
        expect(spreadPoints).toBeLessThan(20.0);
      }

      // Gold Spot
      if (inst.symbol === 'XAU/USD') {
        expect(inst.pipValue).toBe(1.0);
        // Simulated Gold spread of $0.65 (65 cents)
        const mockGoldSpreadDollars = 0.65;
        const spreadPips = mockGoldSpreadDollars / inst.pipValue;
        expect(spreadPips).toBeLessThan(1.0); // 0.65 points < 1.0 point ($1.00 / 100 cents)
      }
    }
  });
});
