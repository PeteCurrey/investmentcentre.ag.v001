"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdapter = createAdapter;
__exportStar(require("./base"), exports);
__exportStar(require("./unbuilt"), exports);
__exportStar(require("./fred"), exports);
__exportStar(require("./twelve_data"), exports);
__exportStar(require("./sec_edgar"), exports);
__exportStar(require("./usaspending"), exports);
__exportStar(require("./kalshi"), exports);
__exportStar(require("./finnhub"), exports);
__exportStar(require("./fca_short_positions"), exports);
__exportStar(require("./cftc_cot"), exports);
__exportStar(require("./eia"), exports);
__exportStar(require("./us_treasury_fiscal"), exports);
__exportStar(require("./companies_house"), exports);
__exportStar(require("./gleif"), exports);
const unbuilt_1 = require("./unbuilt");
const fred_1 = require("./fred");
const twelve_data_1 = require("./twelve_data");
const sec_edgar_1 = require("./sec_edgar");
const usaspending_1 = require("./usaspending");
const kalshi_1 = require("./kalshi");
const finnhub_1 = require("./finnhub");
const fca_short_positions_1 = require("./fca_short_positions");
const cftc_cot_1 = require("./cftc_cot");
const eia_1 = require("./eia");
const us_treasury_fiscal_1 = require("./us_treasury_fiscal");
const companies_house_1 = require("./companies_house");
const gleif_1 = require("./gleif");
function createAdapter(sourceId) {
    switch (sourceId) {
        case 'fred': return new fred_1.FredAdapter();
        case 'twelve_data': return new twelve_data_1.TwelveDataAdapter();
        case 'sec_edgar': return new sec_edgar_1.SecEdgarAdapter();
        case 'usaspending': return new usaspending_1.UsaSpendingAdapter();
        case 'kalshi': return new kalshi_1.KalshiAdapter();
        case 'finnhub': return new finnhub_1.FinnhubAdapter();
        case 'fca_short_positions': return new fca_short_positions_1.FcaShortPositionsAdapter();
        case 'cftc_cot': return new cftc_cot_1.CftcCotAdapter();
        case 'eia': return new eia_1.EiaAdapter();
        case 'us_treasury_fiscal': return new us_treasury_fiscal_1.UsTreasuryFiscalAdapter();
        case 'companies_house': return new companies_house_1.CompaniesHouseAdapter();
        case 'gleif': return new gleif_1.GleifAdapter();
        case 'nasdaq_ipo_calendar':
        case 'opencorporates':
        case 'polymarket':
        case 'manifold':
            return new unbuilt_1.UnbuiltAdapter(sourceId);
        default:
            return new unbuilt_1.UnbuiltAdapter(sourceId);
    }
}
//# sourceMappingURL=index.js.map