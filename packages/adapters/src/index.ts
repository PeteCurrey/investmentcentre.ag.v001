export * from './base';
export * from './fred';
export * from './twelve_data';
export * from './sec_edgar';
export * from './usaspending';
export * from './kalshi';
export * from './finnhub';
export * from './fca_short_positions';
export * from './cftc_cot';
export * from './eia';
export * from './us_treasury_fiscal';
export * from './companies_house';
export * from './gleif';

import { Adapter } from './base';
import { FredAdapter } from './fred';
import { TwelveDataAdapter } from './twelve_data';
import { SecEdgarAdapter } from './sec_edgar';
import { UsaSpendingAdapter } from './usaspending';
import { KalshiAdapter } from './kalshi';
import { FinnhubAdapter } from './finnhub';
import { FcaShortPositionsAdapter } from './fca_short_positions';
import { CftcCotAdapter } from './cftc_cot';
import { EiaAdapter } from './eia';
import { UsTreasuryFiscalAdapter } from './us_treasury_fiscal';
import { CompaniesHouseAdapter } from './companies_house';
import { GleifAdapter } from './gleif';

export function createAdapter(sourceId: string): Adapter {
  switch (sourceId) {
    case 'fred':                return new FredAdapter();
    case 'twelve_data':         return new TwelveDataAdapter();
    case 'sec_edgar':           return new SecEdgarAdapter();
    case 'usaspending':         return new UsaSpendingAdapter();
    case 'kalshi':              return new KalshiAdapter();
    case 'finnhub':             return new FinnhubAdapter();
    case 'fca_short_positions': return new FcaShortPositionsAdapter();
    case 'cftc_cot':            return new CftcCotAdapter();
    case 'eia':                 return new EiaAdapter();
    case 'us_treasury_fiscal':  return new UsTreasuryFiscalAdapter();
    case 'companies_house':     return new CompaniesHouseAdapter();
    case 'gleif':               return new GleifAdapter();
    default:
      throw new Error(`Unknown adapter sourceId: '${sourceId}'`);
  }
}
