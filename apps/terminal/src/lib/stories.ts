// Central story registry — every item across all pages links here
// Each story has: full narrative, trader impact, instruments affected, and supporting evidence

export interface InstrumentImpact {
  ticker: string;
  name: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
  reasoning: string;
  assetClass: 'FX' | 'EQUITY' | 'COMMODITY' | 'RATES' | 'CREDIT' | 'CRYPTO' | 'INDEX';
}

export interface TraderImpact {
  headline: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'HIGH ALERT' | 'VOLATILE';
  timeframe: 'IMMEDIATE' | 'SHORT-TERM' | 'MEDIUM-TERM' | 'LONG-TERM';
  affectedTraderTypes: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface Story {
  id: string;
  title: string;
  pillar: string;
  salienceScore?: number;
  sourceLabel: string;
  publishedAt: string;
  metricLabel?: string;
  metricValue?: string;

  // Rich content
  summary: string;         // 1-2 sentence executive summary
  narrative: string;       // Full analytical narrative (4-6 paragraphs)
  keyFacts: string[];      // Bullet-point hard data facts

  traderImpact: TraderImpact;
  instruments: InstrumentImpact[];

  // Supporting evidence
  relatedStoryIds: string[];
  tags: string[];
}

export const STORIES: Record<string, Story> = {

  // ── THE BRIEF (home page salience deltas) ─────────────────────────────────
  'sal_1': {
    id: 'sal_1',
    title: 'Fed Funds Rate Breach: 5.75% vs 5.50% Thesis Threshold',
    pillar: 'WORLD',
    salienceScore: 90,
    sourceLabel: 'FRED / Federal Reserve',
    publishedAt: '2026-08-02T10:00:00Z',
    metricLabel: 'Federal Funds Effective Rate',
    metricValue: '5.75%',

    summary: 'The Federal Reserve has maintained the federal funds rate at 5.75%, breaching the 5.50% threshold that underpins the GBP/USD long thesis and potentially invalidating multiple active positions.',

    narrative: `The Federal Open Market Committee (FOMC) has held the federal funds effective rate at 5.75%, a level 25 basis points above the 5.50% trigger threshold encoded into the active GBP/USD long thesis. This is not a rate hike — the Fed has been at this level since its March 2026 meeting — but the sustained maintenance above threshold represents a thesis stress event that demands immediate review.

The thesis posited that the UK/US rate differential would remain favourable to GBP as the Bank of England held while the Fed prepared to cut. That preparation has failed to materialise. Markets have now re-priced the first Fed cut from June to November 2026 at the earliest, a four-month extension of the restrictive regime.

The sustained elevated rate has several second-order effects that compound the primary thesis breach: higher-for-longer US rates attract capital flows into USD assets, suppressing GBP/USD upside. US 10-year Treasury yields have remained above 4.60%, making dollar-denominated bonds a competing safe haven to UK gilts. Consumer credit stress in both economies is beginning to surface, and any US economic softening that forces a Fed cut could simultaneously cause GBP weakness through risk-off flows.

The salience score of 90/100 reflects both the direct thesis invalidation (+30) and the cross-source corroboration from Kalshi prediction markets showing only a 31% implied probability of a Fed cut before October (+20). Any trader holding long GBP/USD positions built on the rate differential narrative must now reassess the conviction framework and size accordingly.`,

    keyFacts: [
      'Fed Funds Effective Rate: 5.75% (as of 2026-08-01)',
      'Thesis invalidation threshold: 5.50% — BREACHED',
      'First Fed cut now priced for November 2026 (vs June previously)',
      'Kalshi implied probability of Fed cut before October: 31%',
      'US 10Y Treasury yield: 4.64% (vs BoE base rate 5.25%)',
      'GBP/USD current spot: 1.3145 (vs thesis entry: 1.3200)',
    ],

    traderImpact: {
      headline: 'Thesis invalidation event: immediate GBP/USD long position review required.',
      bias: 'BEARISH',
      timeframe: 'SHORT-TERM',
      affectedTraderTypes: ['FX Macro', 'Rates Traders', 'Fixed Income Portfolio Managers', 'Hedge Fund Long/Short'],
      riskLevel: 'HIGH',
    },

    instruments: [
      { ticker: 'GBP/USD', name: 'British Pound / US Dollar', direction: 'BEARISH', reasoning: 'Direct thesis invalidation — rate differential no longer favours GBP. Dollar strengthens on delayed cut expectations.', assetClass: 'FX' },
      { ticker: 'EUR/USD', name: 'Euro / US Dollar', direction: 'BEARISH', reasoning: 'Broad USD strength suppresses EUR. ECB also facing delayed cut cycle.', assetClass: 'FX' },
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', direction: 'BEARISH', reasoning: 'Higher-for-longer rates push long-duration bond prices down.', assetClass: 'RATES' },
      { ticker: 'DXY', name: 'US Dollar Index', direction: 'BULLISH', reasoning: 'Sustained elevated Fed funds rate maintains USD strength vs G10 basket.', assetClass: 'INDEX' },
      { ticker: 'GILT 10Y', name: 'UK 10-Year Gilt', direction: 'NEUTRAL', reasoning: 'BoE hold with potential for cut means gilts range-bound, not directionally forced.', assetClass: 'RATES' },
    ],

    relatedStoryIds: ['macro_2', 'alt_1', 'ths_101'],
    tags: ['fed', 'rates', 'gbp', 'usd', 'thesis-invalidation', 'macro'],
  },

  'sal_2': {
    id: 'sal_2',
    title: 'FCA Net Short Positions Spike on FTSE Retail Equities',
    pillar: 'MARKETS',
    salienceScore: 70,
    sourceLabel: 'FCA UK Disclosure Register',
    publishedAt: '2026-08-02T08:00:00Z',
    metricLabel: 'FCA UK Net Short — ASOS PLC (ASC.L)',
    metricValue: '4.85%',

    summary: 'Marshall Wace and GLG Partners have simultaneously increased disclosed short positions in UK retail equities, with ASOS at 7.85% net short — signalling institutional conviction around a UK consumer spending deterioration thesis.',

    narrative: `Two of the largest European hedge funds — Marshall Wace LLP and GLG Partners — have simultaneously disclosed elevated short positions in UK-listed retail equities via the FCA's mandatory short selling disclosure register. Marshall Wace holds a 7.85% net short on ASOS PLC (ASC.L) and GLG Partners holds 5.40% net short on Boohoo Group PLC (BOO.L). These are not incidental — the coordinated increase in disclosed shorts from sophisticated institutional actors signals a high-conviction macro-sector thesis around UK consumer spending deterioration.

The context matters: UK consumer confidence fell to its lowest level since late 2023 in the July 2026 GfK survey, UK retail sales ex-fuel for June printed -0.9% MoM against a -0.3% consensus, and UK real wages have turned negative in rolling three-month terms as the post-COVID wage catch-up fades. Fast-fashion online retailers like ASOS and Boohoo are double-exposed — they rely on discretionary consumer spending *and* they carry significant currency risk through GBP-denominated revenues against USD-priced inventory.

The 4.85% average net short across these names is historically significant. FCA data shows that average net shorts above 4% in any single sector cluster have preceded sector drawdowns of 15%+ within 90 days in 7 of the last 9 occurrences. The signal is reinforced by the fact that both positions were increased within a 72-hour window — not a slow-motion hedge build, but a deliberate coordination of conviction.

For active traders: the short side is already crowded at these names, which introduces short squeeze risk if any retail catalyst materialises (e.g., a positive holiday trading update). The cleaner trade may be through sector index puts (FTSE 350 Retailers, LSE: NMX53) or options structures on the broader UK consumer discretionary basket rather than direct single-name shorts now.`,

    keyFacts: [
      'ASOS PLC (ASC.L) — Marshall Wace: 7.85% net short (FCA disclosed 2026-08-01)',
      'Boohoo Group (BOO.L) — GLG Partners: 5.40% net short (FCA disclosed 2026-08-01)',
      'UK GfK Consumer Confidence: -24 (lowest since Nov 2023)',
      'UK Retail Sales ex-fuel June 2026: -0.9% MoM (vs -0.3% consensus)',
      'UK Real Wages: -0.2% in rolling 3M as of July 2026',
      'Both positions increased within 72-hour window — coordinated positioning signal',
    ],

    traderImpact: {
      headline: 'Institutional short conviction in UK online retail is high. Crowding risk means avoid new single-name shorts; prefer sector-level expressions.',
      bias: 'BEARISH',
      timeframe: 'SHORT-TERM',
      affectedTraderTypes: ['Equity Long/Short', 'Sector Rotation Funds', 'UK Domestic Equity', 'Retail Sector Analysts'],
      riskLevel: 'MEDIUM',
    },

    instruments: [
      { ticker: 'ASC.L', name: 'ASOS PLC', direction: 'BEARISH', reasoning: '7.85% net short from Marshall Wace — high institutional conviction on the short side.', assetClass: 'EQUITY' },
      { ticker: 'BOO.L', name: 'Boohoo Group PLC', direction: 'BEARISH', reasoning: '5.40% net short from GLG Partners. Revenue model vulnerable to UK consumer squeeze.', assetClass: 'EQUITY' },
      { ticker: 'NMX53', name: 'FTSE 350 General Retailers Index', direction: 'BEARISH', reasoning: 'Sector-wide discretionary pressure from UK consumer weakness. Less crowded expression than single names.', assetClass: 'INDEX' },
      { ticker: 'GBP/USD', name: 'British Pound / US Dollar', direction: 'BEARISH', reasoning: 'UK consumer deterioration reduces BoE hawkishness prospects, mildly GBP-negative.', assetClass: 'FX' },
      { ticker: 'VOD.L', name: 'Vodafone Group PLC', direction: 'NEUTRAL', reasoning: 'Telecom as defensive sector may benefit from rotation out of consumer discretionary.', assetClass: 'EQUITY' },
    ],

    relatedStoryIds: ['mkt_short_asos', 'mkt_short_boohoo', 'sal_1'],
    tags: ['fca', 'short-selling', 'uk-retail', 'consumer', 'hedge-funds', 'equities'],
  },

  'sal_3': {
    id: 'sal_3',
    title: 'Defense Innovation Systems Contract Award: $5M DoD',
    pillar: 'UNDERCURRENT',
    salienceScore: 40,
    sourceLabel: 'USAspending.gov',
    publishedAt: '2026-08-01T16:00:00Z',
    metricLabel: 'Federal Contract Award',
    metricValue: '$5,000,000.00',

    summary: 'A $5M Department of Defense contract was awarded to Defense Innovation Systems LLC on 2026-08-01, with a simultaneous congressional stock purchase disclosure and SEC Form 4 insider buy — a rare three-source entity join.',

    narrative: `A three-source entity intelligence join has been triggered on Defense Innovation Systems LLC (ticker: DIS). On August 1st 2026, USAspending.gov recorded a $5,000,000 federal contract award from the US Department of Defense (Award ID: CONT_AWD_12345). Within the same 72-hour window, the congressional trading database (via Quiver Quant) shows Representative Virginia Foxx of the US House disclosing a personal stock purchase of between $50,000 and $100,000 in the same entity. Additionally, SEC Form 4 filings show CEO Johnathan Vance purchasing 25,000 shares on July 30th.

This three-source join — government contract award, congressional insider buy, and C-suite insider purchase — is a rare convergence. In isolation, each signal is weak. Together, they represent a high-conviction information event: insiders with knowledge of contract pipeline appear to have positioned ahead of a material award. The timing differential (congressional buy July 28, CEO buy July 30, contract award August 1) is forensically significant.

It is important to caveat: congressional trading disclosures are subject to a 45-day reporting lag, meaning the actual trade date was likely in mid-June. The SEC Form 4 for the CEO has no lag. Both pre-date the contract award, which is the legally significant question if the STOCK Act applies.

For traders: the immediate market impact of a $5M contract is modest for a company of this size. However, the forward signal is what matters — a $5M award from DoD is often a capability demonstration contract that precedes significantly larger IDIQ (Indefinite Delivery, Indefinite Quantity) awards. Defense procurement operates in layered gates. The real option value here is the pipeline signal, not the award itself.`,

    keyFacts: [
      'Contract Award: $5,000,000 — US Dept of Defense (awarded 2026-08-01)',
      'Congressional buy: Rep. Virginia Foxx — $50,000-$100,000 purchase (disclosed 2026-07-28)',
      'Insider buy: CEO Johnathan Vance — 25,000 shares (SEC Form 4 filed 2026-07-30)',
      'Three-source entity join: USAspending + QuiverQuant + SEC EDGAR simultaneously',
      'Award type: Likely capability demonstration contract (precursor to IDIQ)',
      'STOCK Act reporting window: up to 45 days for congressional disclosures',
    ],

    traderImpact: {
      headline: 'Three-source insider cluster on defense contract recipient. Watch for IDIQ follow-on award within 90-180 days.',
      bias: 'BULLISH',
      timeframe: 'MEDIUM-TERM',
      affectedTraderTypes: ['Event-Driven', 'Defense Sector Equity', 'Quant Alt-Data', 'Activist / Special Situations'],
      riskLevel: 'MEDIUM',
    },

    instruments: [
      { ticker: 'DIS', name: 'Defense Innovation Systems LLC', direction: 'BULLISH', reasoning: 'Convergent insider signals ahead of contract. Pipeline optionality for larger IDIQ award.', assetClass: 'EQUITY' },
      { ticker: 'ITA', name: 'iShares US Aerospace & Defense ETF', direction: 'BULLISH', reasoning: 'Defense sector tailwinds from elevated DoD contract velocity in 2026.', assetClass: 'INDEX' },
      { ticker: 'LMT', name: 'Lockheed Martin', direction: 'NEUTRAL', reasoning: 'Sector peer — monitor for competitive contract activity in same DoD programme area.', assetClass: 'EQUITY' },
    ],

    relatedStoryIds: ['und_1'],
    tags: ['defense', 'insider-trading', 'usaspending', 'sec-form4', 'congressional-trading', 'alt-data'],
  },

  // ── WORLD PAGE ─────────────────────────────────────────────────────────────
  'macro_1': {
    id: 'macro_1',
    title: 'Federal Funds Effective Rate: 5.33% — Monetary Policy Unchanged',
    pillar: 'WORLD',
    sourceLabel: 'FRED / Federal Reserve',
    publishedAt: '2026-08-01T00:00:00Z',
    metricLabel: 'Federal Funds Effective Rate',
    metricValue: '5.33%',

    summary: 'The Federal Funds Effective Rate remains at 5.33%, reflecting an unchanged FOMC stance at the most recent meeting window. Markets remain split on the timing of the first cut.',

    narrative: `The Federal Reserve's primary policy rate — the Federal Funds Effective Rate — continues to trade at 5.33%, representing the average of the 5.25%–5.50% target range established in the July 2023 hiking cycle that the Fed has maintained without adjustment for the longest period in its post-2008 history.

The "effective" rate measures the actual overnight cost at which banks lend excess reserves to each other, and its stability at 5.33% within the target range reflects orderly reserve market functioning. The rate itself has not changed since July 2023, and the FOMC has signalled through dot plot projections that any 2026 cuts will be gradual and data-dependent, with the median FOMC member now projecting one 25bp cut in Q4 2026.

The macro significance lies in what the sustained rate means for risk assets globally: US real rates remain positive at approximately 2.8% above core PCE, making US Treasury holdings genuinely attractive in real terms for global capital. This continues to act as a gravitational pull on dollar assets.`,

    keyFacts: [
      'Current rate: 5.33% (within 5.25%–5.50% target range)',
      'Last change: July 2023 (unchanged for longest period since 2008)',
      'FOMC dot plot median: 1 cut of 25bp in Q4 2026',
      'Real rate (vs core PCE 2.5%): approximately +2.8%',
      'Next FOMC meeting: August 20, 2026',
    ],

    traderImpact: {
      headline: 'Stable policy rate maintains USD as carry trade funding constraint and global benchmark. No directional change from this print.',
      bias: 'NEUTRAL',
      timeframe: 'MEDIUM-TERM',
      affectedTraderTypes: ['FX Macro', 'Rates Traders', 'EM Debt', 'Global Asset Allocators'],
      riskLevel: 'LOW',
    },

    instruments: [
      { ticker: 'DXY', name: 'US Dollar Index', direction: 'BULLISH', reasoning: 'Sustained elevated real rates maintain USD structural bid.', assetClass: 'INDEX' },
      { ticker: 'TLT', name: '20+ Year Treasury Bond ETF', direction: 'NEUTRAL', reasoning: 'No change to policy removes near-term duration catalyst.', assetClass: 'RATES' },
      { ticker: 'GLD', name: 'Gold (SPDR Gold Shares)', direction: 'NEUTRAL', reasoning: 'Gold faces headwinds from positive real rates, but geopolitical bids provide floor.', assetClass: 'COMMODITY' },
      { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', direction: 'BEARISH', reasoning: 'High US rates maintain dollar strength, pressuring EM currency and debt spreads.', assetClass: 'INDEX' },
    ],

    relatedStoryIds: ['sal_1', 'alt_1', 'macro_2'],
    tags: ['fed', 'rates', 'fomc', 'monetary-policy', 'usd'],
  },

  'macro_2': {
    id: 'macro_2',
    title: 'US Total Public Debt Outstanding: $34.9 Trillion',
    pillar: 'WORLD',
    sourceLabel: 'US Treasury Bureau of Fiscal Service',
    publishedAt: '2026-08-01T00:00:00Z',
    metricLabel: 'US Total Public Debt Outstanding',
    metricValue: '$34,920,410,000,000',

    summary: 'US public debt has reached $34.92 trillion, representing 124% of GDP. The pace of issuance at elevated yields is creating structural demand concerns for long-duration Treasury auctions.',

    narrative: `The US Treasury Bureau of Fiscal Service has published the daily statement showing total public debt outstanding at $34.92 trillion as of August 1st, 2026. This represents approximately 124% of US nominal GDP, a level that was last observed only briefly during COVID stimulus and historically associated with structural fiscal risk accumulation rather than cyclical deficit spending.

The composition matters: roughly $27.4 trillion is held by the public (market debt) and $7.5 trillion is intragovernmental (Social Security trust funds etc.). The market-held debt is what creates price-sensitive demand dynamics in Treasury auctions. With the Fed no longer expanding its balance sheet via QE and actually engaged in QT (reducing by ~$95B/month), the marginal buyer of Treasury debt at these volumes must come from price-sensitive private capital.

The auction demand dynamics are beginning to show signs of stress. The July 2026 20-year Treasury auction posted a bid-to-cover ratio of 2.28x, below the 12-auction trailing average of 2.51x, and primary dealers were forced to absorb a higher-than-usual 20.3% of the auction. When primary dealers hold inventory they don't want, it typically leads to secondary market selling in the following sessions.

For traders, this creates a complex environment: the debt level itself is not an immediate catalyst, but the issuance rhythm absolutely is. The US Treasury is issuing approximately $1.8 trillion per quarter in net new debt, and with demand episodically soft, the risk of a disorderly auction that reprices the long end of the curve — and its knock-on to mortgage rates, corporate credit spreads, and equity valuations — is non-trivial.`,

    keyFacts: [
      'US Total Debt: $34.92 trillion (as of 2026-08-01)',
      'As % of GDP: ~124% (nominal)',
      'Public (market) debt: ~$27.4 trillion — price sensitive',
      'Fed QT pace: -$95B/month balance sheet reduction',
      'July 2026 20Y auction bid-to-cover: 2.28x (vs 2.51x trailing average)',
      'Primary dealer absorption: 20.3% (elevated — sign of soft demand)',
      'Net new issuance per quarter: ~$1.8 trillion',
    ],

    traderImpact: {
      headline: 'Debt issuance momentum and soft auction demand introduce tail risk of long-end yield spike. Monitor upcoming auction results closely.',
      bias: 'BEARISH',
      timeframe: 'MEDIUM-TERM',
      affectedTraderTypes: ['Rates Traders', 'Fixed Income Portfolio Managers', 'Macro Hedge Funds', 'Mortgage REITs'],
      riskLevel: 'HIGH',
    },

    instruments: [
      { ticker: 'TLT', name: '20+ Year Treasury Bond ETF', direction: 'BEARISH', reasoning: 'Supply pressure and soft demand push long-end yields higher, prices lower.', assetClass: 'RATES' },
      { ticker: 'IEF', name: '7-10 Year Treasury Bond ETF', direction: 'BEARISH', reasoning: 'Intermediate duration also pressured by steepening supply dynamics.', assetClass: 'RATES' },
      { ticker: 'DXY', name: 'US Dollar Index', direction: 'VOLATILE', reasoning: 'Disorderly auction could cause USD to rally short-term then sell off if it signals fiscal instability.', assetClass: 'INDEX' },
      { ticker: 'GLD', name: 'SPDR Gold Shares', direction: 'BULLISH', reasoning: 'Fiscal expansion trajectory and debt monetisation risk provide structural bid for gold as dollar hedge.', assetClass: 'COMMODITY' },
      { ticker: 'MBB', name: 'iShares Mortgage-Backed Securities ETF', direction: 'BEARISH', reasoning: 'Higher long-end yields directly widen mortgage spreads and compress MBS valuations.', assetClass: 'CREDIT' },
    ],

    relatedStoryIds: ['sal_1', 'macro_1'],
    tags: ['us-debt', 'treasury', 'fiscal', 'rates', 'auctions', 'sovereign'],
  },

  'macro_3': {
    id: 'macro_3',
    title: 'EIA Crude Oil Inventories: 426.8M bbl — Draw of 3.4M bbl',
    pillar: 'WORLD',
    sourceLabel: 'EIA Weekly Petroleum Status Report',
    publishedAt: '2026-07-26T00:00:00Z',
    metricLabel: 'US Crude Oil Stocks (Excl. SPR)',
    metricValue: '426,800,000 bbl',

    summary: 'The EIA weekly petroleum status report shows US crude oil inventories fell 3.4 million barrels to 426.8M bbl — a bullish surprise vs the +1.2M bbl consensus expectation.',

    narrative: `The US Energy Information Administration's weekly petroleum status report for the week ending July 25th, 2026 shows commercial crude oil stocks (excluding the Strategic Petroleum Reserve) at 426.8 million barrels — a draw of 3.4 million barrels from the prior week's 430.2M bbl. This contrasts sharply with the analyst consensus expectation of a +1.2 million barrel build, representing a 4.6 million barrel miss versus consensus in the bullish direction.

The draw was driven by a combination of elevated refinery runs (93.2% utilisation rate — highest since pre-COVID summer 2019) and a modest decline in crude imports to 6.1M bpd. US crude production was stable at 13.3M bpd. The Cushing, Oklahoma storage hub — the delivery point for NYMEX WTI futures — saw an even more pronounced draw of 1.8M bbl, tightening the physical delivery market and typically associated with prompt WTI price strengthening relative to the forward curve (backwardation).

The 5-year average for this time of year is 455M bbl, meaning current stocks are approximately 6.2% below the seasonal norm — a structurally supportive backdrop for crude prices heading into the late-summer driving season. OPEC+ production discipline has remained intact through Q2 2026 following the voluntary production cut extensions agreed at the June ministerial meeting.

For energy traders, this print shifts the probability distribution of WTI price outcomes over the next 4-6 weeks toward the upside. The 4-6% below seasonal norm inventory level historically correlates with WTI spot prices that trade 8-12% above the 12-month trailing average, all else equal.`,

    keyFacts: [
      'EIA crude stocks: 426.8M bbl (draw of 3.4M bbl week-on-week)',
      'Consensus expectation: +1.2M bbl build — SIGNIFICANT MISS',
      'Cushing, OK storage: -1.8M bbl (prompt market tightening)',
      'US refinery utilisation: 93.2% (highest since pre-COVID summer 2019)',
      'Current stocks vs 5-year seasonal average: -6.2% below',
      'OPEC+ production cuts: extended through Q3 2026',
      'WTI spot price reaction: +$1.85/bbl (+2.4%) in session following release',
    ],

    traderImpact: {
      headline: 'Bullish crude surprise. Structurally below-average inventory levels support a $78-$85 WTI price range through summer. Energy sector rotation warranted.',
      bias: 'BULLISH',
      timeframe: 'SHORT-TERM',
      affectedTraderTypes: ['Energy Commodity Traders', 'Macro Hedge Funds', 'Energy Equity Sector', 'Refining Margin Traders'],
      riskLevel: 'MEDIUM',
    },

    instruments: [
      { ticker: 'WTI_CRUDE', name: 'WTI Light Sweet Crude', direction: 'BULLISH', reasoning: 'Inventory draw surprise + Cushing tightening = backwardation signal. Prompt month strengthens.', assetClass: 'COMMODITY' },
      { ticker: 'XOM', name: 'Exxon Mobil', direction: 'BULLISH', reasoning: 'Integrated major benefits from higher crude realisation prices and strong refinery margins.', assetClass: 'EQUITY' },
      { ticker: 'XLE', name: 'Energy Select Sector SPDR ETF', direction: 'BULLISH', reasoning: 'Sector-wide tailwind from bullish crude fundamentals.', assetClass: 'INDEX' },
      { ticker: 'RIO', name: 'Rio Tinto ADR', direction: 'NEUTRAL', reasoning: 'Commodity complex broadly supportive but iron ore/copper have separate drivers.', assetClass: 'EQUITY' },
      { ticker: 'UAL', name: 'United Airlines Holdings', direction: 'BEARISH', reasoning: 'Higher crude prices increase jet fuel costs — headwind for airline margins.', assetClass: 'EQUITY' },
    ],

    relatedStoryIds: ['ths_102'],
    tags: ['eia', 'crude-oil', 'energy', 'wti', 'commodities', 'opec'],
  },

  // ── MARKETS PAGE ───────────────────────────────────────────────────────────
  'mkt_gbpusd': {
    id: 'mkt_gbpusd',
    title: 'GBP/USD: 1.3145 — Rate Differential Compression',
    pillar: 'MARKETS',
    sourceLabel: 'Twelve Data',
    publishedAt: '2026-08-02T19:00:00Z',
    metricLabel: 'GBP/USD Spot',
    metricValue: '1.3145',

    summary: 'GBP/USD is trading at 1.3145, up +0.42% on the session, but the rate differential narrative that underpinned the bull thesis above 1.32 is showing structural cracks with the Fed remaining on hold.',

    narrative: `GBP/USD is trading at 1.3145, up 55 pips on the session and reflecting a modest GBP bid driven by UK services PMI data that surprised to the upside at 53.2 vs 51.8 consensus. However, the intraday strength masks a more concerning structural backdrop: the medium-term bull thesis for GBP/USD that assumed a decisive US rate cutting cycle beginning in mid-2026 has been pushed out significantly.

The pair has been consolidating between 1.2950 and 1.3280 since March 2026 — a 330-pip range that has resisted breakout in either direction. The near-term support at 1.3000 (psychological level and 100-day EMA) has held three times, while the resistance at 1.3280 (2025 high) has capped four separate rally attempts. This is classic range-bound behaviour in a macro tug-of-war environment.

The key catalysts to watch are the August 20th FOMC meeting (any hint of September cut would be strongly GBP/USD bullish) and the Bank of England's August 7th meeting (any cut from BoE would immediately pressure the pair lower). The positioning data shows speculative long GBP positions at stretched levels (+$4.2B net long per CFTC data), which creates vulnerability to a washout on any BoE surprise.`,

    keyFacts: [
      'GBP/USD spot: 1.3145 (+0.42% on session)',
      'UK Services PMI July 2026: 53.2 (vs 51.8 consensus) — upside surprise',
      '90-day trading range: 1.2950 – 1.3280',
      'CFTC speculative net long GBP: +$4.2B (stretched)',
      'Key support: 1.3000 (psychological + 100-day EMA)',
      'Key resistance: 1.3280 (2025 high)',
      'Next major catalysts: BoE Aug 7, FOMC Aug 20',
    ],

    traderImpact: {
      headline: 'Range-bound with catalyst risk in both directions. Stretched speculative longs increase downside velocity if BoE surprises with cut.',
      bias: 'NEUTRAL',
      timeframe: 'SHORT-TERM',
      affectedTraderTypes: ['FX Spot Traders', 'FX Options Desks', 'UK Corporate Hedgers', 'Macro Funds'],
      riskLevel: 'MEDIUM',
    },

    instruments: [
      { ticker: 'GBP/USD', name: 'British Pound / US Dollar', direction: 'NEUTRAL', reasoning: 'Range-bound 1.2950–1.3280. Catalyst-dependent for breakout direction.', assetClass: 'FX' },
      { ticker: 'GBP/EUR', name: 'British Pound / Euro', direction: 'BULLISH', reasoning: 'UK PMI outperformance vs EU makes GBP relatively stronger within European crosses.', assetClass: 'FX' },
      { ticker: 'GILT 2Y', name: 'UK 2-Year Gilt', direction: 'BULLISH', reasoning: 'BoE on hold means front-end gilts remain well supported at current yield levels.', assetClass: 'RATES' },
    ],

    relatedStoryIds: ['sal_1', 'ths_101', 'alt_1'],
    tags: ['gbp', 'usd', 'fx', 'boe', 'fed', 'rates'],
  },

  'mkt_short_asos': {
    id: 'mkt_short_asos',
    title: 'ASOS PLC: 7.85% Net Short — Marshall Wace',
    pillar: 'MARKETS',
    sourceLabel: 'FCA Short Selling Disclosure Register',
    publishedAt: '2026-08-01T00:00:00Z',
    metricLabel: 'Net Short Position — ASOS PLC (ASC.L)',
    metricValue: '7.85%',

    summary: 'Marshall Wace LLP has disclosed a 7.85% net short position in ASOS PLC — one of the largest disclosed short positions in the FTSE UK retail sector in 2026.',

    narrative: `Marshall Wace LLP, one of Europe's largest systematic and discretionary hedge funds with approximately $70B AUM, has disclosed a 7.85% net short position in ASOS PLC (ASC.L) via the FCA's mandatory short selling register. This position was last increased on August 1st, 2026, and represents one of the largest disclosed institutional short positions in the UK retail sector this year.

ASOS is a high-growth online fashion retailer that has faced a significant structural de-rating over the past 24 months: revenue growth has decelerated from 26% in 2022 to an expected -8% in fiscal year 2026 as the post-COVID e-commerce pull-forward normalises. The company carries £480M in gross debt and faces GBP/USD exposure on inventory purchases (denominated in USD) against largely GBP/EUR revenues — a currency headwind that intensifies when the dollar is strong.

The Marshall Wace position is not purely directional — as a stat-arb specialist, they likely run this through a pairs trade or factor model — but the disclosed net position at 7.85% represents genuine short conviction. At this level, any significant price decline could create a self-reinforcing dynamic: other shorts become emboldened, institutional holders accelerate sales, and retail sentiment deteriorates.

The counter-risk for any trader considering following this short: ASOS management has guided a return to profitability by H2 FY2027, and the stock is already down 78% from its 2021 peak. Any positive catalyst — an activist investor, a strategic review, or a better-than-expected trading update — could create a violent short squeeze.`,

    keyFacts: [
      'ASOS PLC (ASC.L) net short: 7.85% — Marshall Wace LLP',
      'Marshall Wace AUM: ~$70B (one of Europe\'s largest hedge funds)',
      'ASOS revenue growth: 26% (2022) → -8% expected FY2026',
      'ASOS gross debt: £480M',
      'ASOS currency exposure: USD inventory costs vs GBP/EUR revenues',
      'Stock performance from 2021 peak: -78%',
      'Short squeeze risk: HIGH (crowded, stock already heavily de-rated)',
    ],

    traderImpact: {
      headline: 'Heavily shorted at 7.85%. Directional bears face squeeze risk. Prefer sector-level expression or options structures over outright short.',
      bias: 'BEARISH',
      timeframe: 'SHORT-TERM',
      affectedTraderTypes: ['Equity Long/Short', 'Event-Driven', 'UK Retail Sector Specialists'],
      riskLevel: 'HIGH',
    },

    instruments: [
      { ticker: 'ASC.L', name: 'ASOS PLC', direction: 'BEARISH', reasoning: '7.85% institutional short conviction from Marshall Wace. Revenue declining, debt elevated.', assetClass: 'EQUITY' },
      { ticker: 'NMX53', name: 'FTSE 350 General Retailers Index', direction: 'BEARISH', reasoning: 'Cleaner sector expression with less single-name squeeze risk.', assetClass: 'INDEX' },
    ],

    relatedStoryIds: ['sal_2', 'mkt_short_boohoo'],
    tags: ['fca', 'short-selling', 'asos', 'uk-retail', 'marshall-wace'],
  },

  'mkt_short_boohoo': {
    id: 'mkt_short_boohoo',
    title: 'Boohoo Group: 5.40% Net Short — GLG Partners',
    pillar: 'MARKETS',
    sourceLabel: 'FCA Short Selling Disclosure Register',
    publishedAt: '2026-08-01T00:00:00Z',
    metricLabel: 'Net Short Position — Boohoo Group (BOO.L)',
    metricValue: '5.40%',

    summary: 'GLG Partners has disclosed a 5.40% net short in Boohoo Group PLC, simultaneous with Marshall Wace\'s ASOS short — signalling coordinated institutional bearishness on UK online fast fashion.',

    narrative: `GLG Partners (a subsidiary of Man Group, ~$170B AUM) has disclosed a 5.40% net short position in Boohoo Group PLC (BOO.L). The simultaneous disclosure with Marshall Wace's ASOS position (filed within the same 72-hour FCA window) points to a shared macro thesis among institutional short sellers: the structural difficulties facing UK-listed online fast fashion retailers in the current cost-of-living environment.

Boohoo's fundamentals are even weaker than ASOS's: the company has issued multiple profit warnings in the last 18 months, its former founder John Lyttle stepped back from the CEO role, and a BooHoo-branded acquisition of the Karen Millen and Coastal brands has not delivered the brand premium it hoped for. The company has seen its market capitalisation fall from £5.6B in early 2021 to approximately £180M today — a 97% destruction of shareholder value.

GLG's 5.40% short represents a significantly scaled institutional position given Boohoo's relatively small market cap. The position size relative to the float is meaningful: if GLG were to cover even partially, they would need to absorb a meaningful percentage of daily traded volume, creating potential for sharp short-term price spikes that are disconnected from fundamentals.

The primary risk factor for this short is the same as ASOS — a private equity bid or strategic buyer offering a premium to the distressed price. At these valuations, many UK retailers have become attractive to international consolidators, and Boohoo's owned brands (Nasty Gal, PrettyLittleThing) carry IP value beyond the trading business.`,

    keyFacts: [
      'Boohoo Group PLC (BOO.L) net short: 5.40% — GLG Partners (Man Group)',
      'Man Group AUM: ~$170B',
      'Boohoo market cap: ~£180M (97% below 2021 peak of £5.6B)',
      'Multiple profit warnings in last 18 months',
      'CEO leadership change in FY2025',
      'Owned brands: PrettyLittleThing, Nasty Gal, Karen Millen (IP value)',
      'Private equity bid risk: ELEVATED at current distressed valuation',
    ],

    traderImpact: {
      headline: 'Distressed valuation with elevated short interest creates binary outcomes. Avoid initiating new shorts at these levels; event risk (PE bid) is high.',
      bias: 'BEARISH',
      timeframe: 'SHORT-TERM',
      affectedTraderTypes: ['Event-Driven', 'Distressed Equity', 'UK Small Cap'],
      riskLevel: 'HIGH',
    },

    instruments: [
      { ticker: 'BOO.L', name: 'Boohoo Group PLC', direction: 'BEARISH', reasoning: '5.40% institutional short. 97% down from peak but PE bid risk creates violent upside tail.', assetClass: 'EQUITY' },
    ],

    relatedStoryIds: ['sal_2', 'mkt_short_asos'],
    tags: ['fca', 'short-selling', 'boohoo', 'uk-retail', 'glg-partners', 'distressed'],
  },

  // ── HORIZON PAGE ───────────────────────────────────────────────────────────
  'evt_1': {
    id: 'evt_1',
    title: 'Acme AI Tech Corp S-1 IPO Registration — T-13 Days',
    pillar: 'HORIZON',
    sourceLabel: 'SEC EDGAR',
    publishedAt: '2026-08-02T00:00:00Z',
    metricLabel: 'IPO Registration (S-1)',
    metricValue: '64% implied probability',

    summary: 'Acme AI Tech Corp has filed an S-1 with the SEC, targeting an August 15th IPO. Kalshi prediction market implies 64% probability of successful listing. AI infrastructure sector peer comps suggest demanding valuation.',

    narrative: `Acme AI Tech Corp has filed an S-1 registration statement with the Securities and Exchange Commission, targeting an IPO on or around August 15th, 2026. The Kalshi prediction market contract KXACMEIPO currently implies a 64% probability of a successful listing within the target window — reflecting genuine market uncertainty about whether market conditions will support the offering.

AI infrastructure IPOs in 2026 have had a mixed reception. Several high-profile listings from AI model companies (not to be confused with AI infrastructure plays) received strong initial demand but subsequently traded below their offer prices within 90 days as lock-up periods expired. Acme's positioning as an infrastructure provider (data center networking and inference acceleration chips) places it closer to the NVDA/AMD comps rather than the pure-software AI plays.

The S-1 revenue disclosure (last 12 months) shows $380M revenue with 84% gross margins — exceptionally strong for a hardware company and more typical of software. This suggests a significant software licensing component layered on hardware. The company is seeking a valuation range of $8-10B — approximately 21-26x LTM revenue, which compares to NVDA's 23x at IPO.

For traders, the IPO creates several embedded opportunities: pre-IPO grey market pricing (available on some platforms), immediate post-lock-up options strategies, and sector peer rotation as institutional capital repositions ahead of the IPO. The existing AI infrastructure ETFs (BOTZ, ROBO) may see inflows as generalist investors seek listed proxies ahead of the listing.`,

    keyFacts: [
      'Filing: S-1 Registration Statement — SEC EDGAR (2026-08-02)',
      'Target IPO date: August 15, 2026 (T-13 days)',
      'Kalshi implied probability of successful listing: 64%',
      'LTM Revenue: $380M | Gross margin: 84%',
      'Target valuation range: $8-10B (21-26x LTM revenue)',
      'Peer comp: NVDA was 23x LTM revenue at IPO',
      'Category: AI infrastructure (data center networking / inference acceleration)',
    ],

    traderImpact: {
      headline: 'IPO event creates pre-listing sector rotation opportunity. Monitor BOTZ/ROBO ETF flows. Post-IPO lock-up expiry in 90-180 days is the higher-conviction entry.',
      bias: 'BULLISH',
      timeframe: 'SHORT-TERM',
      affectedTraderTypes: ['IPO Desk', 'Tech Sector Equity', 'Event-Driven', 'Retail Momentum'],
      riskLevel: 'MEDIUM',
    },

    instruments: [
      { ticker: 'BOTZ', name: 'Global X Robotics & AI ETF', direction: 'BULLISH', reasoning: 'Pre-IPO institutional interest drives inflows into listed AI infrastructure proxies.', assetClass: 'INDEX' },
      { ticker: 'NVDA', name: 'Nvidia Corporation', direction: 'BULLISH', reasoning: 'Primary peer comp — AI infrastructure sentiment lifts on successful IPO validation.', assetClass: 'EQUITY' },
      { ticker: 'SMH', name: 'VanEck Semiconductor ETF', direction: 'BULLISH', reasoning: 'Semiconductor sector broadly supportive of AI infrastructure demand narrative.', assetClass: 'INDEX' },
      { ticker: 'AMD', name: 'Advanced Micro Devices', direction: 'BULLISH', reasoning: 'Direct peer in inference acceleration — competitive positioning validated by market.', assetClass: 'EQUITY' },
    ],

    relatedStoryIds: [],
    tags: ['ipo', 'sec', 'ai', 'technology', 'kalshi', 'event-driven'],
  },

  'evt_2': {
    id: 'evt_2',
    title: 'FOMC Federal Reserve Rate Decision — T-18 Days (August 20)',
    pillar: 'HORIZON',
    sourceLabel: 'Federal Reserve / Kalshi',
    publishedAt: '2026-08-02T00:00:00Z',
    metricLabel: 'Implied Cut Probability (Kalshi KXFEDAUG26)',
    metricValue: '69%',

    summary: 'The August 20th FOMC meeting carries a 69% implied probability of a 25bp rate cut, per Kalshi markets. A cut would be the first in this cycle and represents the most significant macro event of Q3 2026.',

    narrative: `The Federal Reserve's August 20th, 2026 FOMC meeting is now the single most consequential macro event on the near-term calendar. The Kalshi event contract KXFEDAUG26 implies a 69% probability that the Fed will announce a 25bp rate cut — which would be the first reduction in the federal funds target range since the hiking cycle that began in March 2022. This is not a trivial event: it would represent a regime change in the dominant direction of US monetary policy.

The 69% probability is significantly higher than the same contract was pricing 30 days ago (41%), reflecting a rapid reassessment following softer-than-expected core PCE data (2.4% vs 2.7% prior, released July 25th) and weaker-than-expected July jobs report data (148K nonfarm payrolls vs 185K consensus). The FOMC has communicated that it wants to see "greater confidence" that inflation is converging sustainably to 2% — the July PCE print may have provided that confidence.

If the Fed cuts on August 20th, the market impact will be broad and immediate: short-term US rates will fall (2Y Treasury yield reprices ~25bp lower), USD weakens across G10 (DXY -0.5% to -1.5% expected intraday), risk assets broadly rally (SPX +1-2% in the session), gold likely rises $20-40/oz, and GBP/USD breaks above 1.3280 resistance.

If the Fed surprises with a hold (31% probability per Kalshi), the reverse occurs — USD strengthens, equities sell off, and the market must re-price the timing of cuts into Q4 2026 or early 2027, with significant duration volatility.

The positioning setup is asymmetric: markets are 69% long a cut but asset prices have already partially reflected this probability. The clean trade is optionality on the 31% tail — buying volatility rather than taking a directional view.`,

    keyFacts: [
      'FOMC meeting date: August 20, 2026 (T-18 days)',
      'Kalshi cut probability (KXFEDAUG26): 69%',
      'Change in 30 days: 41% → 69% (rapid repricing)',
      'Core PCE July 2026: 2.4% (vs 2.7% prior) — key catalyst for re-pricing',
      'July Nonfarm Payrolls: 148K (vs 185K consensus)',
      'Fed "confidence" language: requires sustained 2% trajectory',
      'Market impact if cut: 2Y yield -25bp, DXY -0.5-1.5%, SPX +1-2%, GLD +$20-40',
      'Market impact if hold: reverse — USD bid, equities sell, duration volatile',
    ],

    traderImpact: {
      headline: 'Highest-conviction macro event of Q3 2026. Buy volatility rather than direction — the 31% hold probability creates asymmetric payoff on optionality.',
      bias: 'VOLATILE',
      timeframe: 'IMMEDIATE',
      affectedTraderTypes: ['All Asset Classes', 'FX Macro', 'Rates Traders', 'Equity Derivatives', 'Macro Hedge Funds'],
      riskLevel: 'CRITICAL',
    },

    instruments: [
      { ticker: 'GBP/USD', name: 'British Pound / US Dollar', direction: 'BULLISH', reasoning: 'If cut: USD weakens, GBP/USD breaks 1.3280 resistance. If hold: pair sells off to 1.29-1.30.', assetClass: 'FX' },
      { ticker: 'DXY', name: 'US Dollar Index', direction: 'BEARISH', reasoning: 'Cut = dollar weakens. 69% probability tilts expected value negative for DXY.', assetClass: 'INDEX' },
      { ticker: 'GLD', name: 'SPDR Gold Shares', direction: 'BULLISH', reasoning: 'Rate cut lowers opportunity cost of holding gold. Historically +2-4% on first cut day.', assetClass: 'COMMODITY' },
      { ticker: 'TLT', name: '20+ Year Treasury Bond ETF', direction: 'BULLISH', reasoning: 'Front end rallies on cut. Long end may lag if cut is interpreted as reflation signal.', assetClass: 'RATES' },
      { ticker: 'SQQQ', name: 'ProShares UltraPro Short QQQ', direction: 'BEARISH', reasoning: 'Risk-on scenario if cut delivered means growth equities rally — inverse ETF loses.', assetClass: 'INDEX' },
    ],

    relatedStoryIds: ['sal_1', 'macro_1', 'alt_1', 'ths_101'],
    tags: ['fomc', 'fed', 'rate-cut', 'monetary-policy', 'kalshi', 'high-priority'],
  },

  'evt_3': {
    id: 'evt_3',
    title: 'FTSE 100 Quarterly Index Rebalance — T-30 Days (September 1)',
    pillar: 'HORIZON',
    sourceLabel: 'FTSE Russell / Companies House',
    publishedAt: '2026-08-02T00:00:00Z',
    metricLabel: 'FTSE 100 Rebalance',
    metricValue: 'T-30 Days',

    summary: 'The FTSE 100 quarterly index rebalance on September 1st will trigger mechanical index-tracking fund flows into additions and out of deletions — creating predictable price pressure windows.',

    narrative: `The FTSE Russell quarterly review of the FTSE 100 index takes place on September 1st, 2026, with changes effective from the open of trading on September 22nd (following the announcement on September 5th). This is a highly predictable, calendar-driven event that creates systematic mechanical demand and supply in affected names.

FTSE Russell uses a market capitalisation-based eligibility methodology. Stocks ranked 90th or below in the FTSE 100 at the review date are candidates for demotion to the FTSE 250, and stocks ranked 90th or above in the FTSE 250 are candidates for promotion. Based on current market caps, the most likely demotion candidates from the FTSE 100 are Hunting PLC (HTG.L, rank ~96) and Ferrexpo PLC (FXPO.L, rank ~99). The most likely promotion candidate from the FTSE 250 is Watches of Switzerland Group (WOSG.L, rank ~3 in FTSE 250).

The mechanical impact arises from passive index-tracking funds, which collectively hold approximately £95B in FTSE 100 tracking mandates. These funds must sell demoted stocks and buy promoted stocks at the market close on September 19th (the implementation date). For a small-cap stock like Watches of Switzerland, this represents approximately 8-12 days of average daily volume in concentrated buying in a single session — creating a substantial, predictable price spike.

Experienced index arbitrageurs build positions in the likely promotions 4-6 weeks before announcement (around now), then liquidate at or before the implementation date. The trade requires a view on which names are most likely to be included/excluded and comfort with announcement risk (if the expected changes don't materialise, positions may need to be unwound rapidly).`,

    keyFacts: [
      'FTSE 100 rebalance effective date: September 22, 2026',
      'Review date: September 1, 2026',
      'Announcement date: September 5, 2026',
      'FTSE 100 passive AUM: ~£95B (mechanical buying/selling at implementation)',
      'Most likely demotion candidates: HTG.L (rank ~96), FXPO.L (rank ~99)',
      'Most likely promotion candidate: WOSG.L (rank ~3 in FTSE 250)',
      'WOSG.L estimated mechanical demand at implementation: 8-12x ADTV',
    ],

    traderImpact: {
      headline: 'Index arb opportunity in likely promotion/demotion candidates. Enter 4-6 weeks before announcement. Highest-probability trade is long WOSG.L vs short FTSE 250 ETF hedge.',
      bias: 'BULLISH',
      timeframe: 'MEDIUM-TERM',
      affectedTraderTypes: ['Index Arbitrageurs', 'Quantitative Equity', 'Passive Asset Managers', 'UK Equity Long/Short'],
      riskLevel: 'MEDIUM',
    },

    instruments: [
      { ticker: 'WOSG.L', name: 'Watches of Switzerland Group', direction: 'BULLISH', reasoning: 'Most likely FTSE 100 promotion candidate — 8-12x ADTV mechanical buying on September 19th.', assetClass: 'EQUITY' },
      { ticker: 'HTG.L', name: 'Hunting PLC', direction: 'BEARISH', reasoning: 'Most likely FTSE 100 demotion candidate — mechanical selling pressure from passive funds.', assetClass: 'EQUITY' },
      { ticker: 'ISF.L', name: 'iShares Core FTSE 100 ETF', direction: 'NEUTRAL', reasoning: 'Underlying instrument — will experience inflows as rebalance drives AUM reallocation.', assetClass: 'INDEX' },
    ],

    relatedStoryIds: [],
    tags: ['ftse', 'index-rebalance', 'passive', 'uk-equities', 'event-driven', 'mechanical'],
  },

  // ── ALTERNATIVES PAGE ──────────────────────────────────────────────────────
  'alt_1': {
    id: 'alt_1',
    title: 'Kalshi: Will Fed Cut Rates at August 2026 Meeting? — 69% Implied',
    pillar: 'ALTERNATIVES',
    sourceLabel: 'Kalshi Prediction Market',
    publishedAt: '2026-08-02T19:00:00Z',
    metricLabel: 'KXFEDAUG26 Implied Probability',
    metricValue: '69%',

    summary: 'Kalshi\'s KXFEDAUG26 event contract implies a 69% probability of a Fed rate cut at the August 20th FOMC meeting, with $1.4M in volume backing this view — a high-conviction prediction market signal.',

    narrative: `The Kalshi prediction market contract KXFEDAUG26 — "Will the Federal Reserve cut the federal funds rate at the August 2026 FOMC meeting?" — is currently implying a 69% YES probability with $1.4M in traded volume. This is one of the most actively traded event contracts on the platform this month and represents the collective wisdom of sophisticated participants willing to put real capital behind their macroeconomic forecasts.

Prediction markets, when liquid and active, have historically outperformed expert surveys and Fed funds futures as leading indicators of FOMC outcomes — primarily because they aggregate heterogeneous private information and enforce skin-in-the-game discipline that surveys do not. The 69% reading is higher than the Fed funds futures-implied probability of approximately 62%, suggesting that Kalshi participants have incorporated recent data faster or weight certain indicators differently.

The 30-day shift in this contract from 41% to 69% is particularly notable. This repricing occurred across two sessions — July 25th (core PCE release) and July 31st (jobs report). The speed of the repricing suggests that the data was sufficiently decisive to move the probability distribution dramatically rather than incrementally, which is itself informative: markets believe these data points resolve meaningful uncertainty.

For traders using this as a positioning guide: a 69% probability of a cut implies that a 25bp cut is the modal outcome, but the distribution has a meaningful 31% tail. The asymmetric payoff in markets (higher vol on the surprise hold than on the priced-in cut) suggests that tail options (buy September FOMC straddles, buy VIX calls) offer attractive risk-adjusted returns at current implied vols.`,

    keyFacts: [
      'Kalshi contract: KXFEDAUG26 (August 20, 2026 FOMC)',
      'Current implied probability: 69% YES (cut)',
      'Volume: $1.4M (high conviction, liquid market)',
      '30-day change: 41% → 69% (core PCE + jobs data catalysts)',
      'Fed funds futures implied probability: 62% (Kalshi is more aggressive)',
      'Survey consensus (Economist poll): 58%',
      'Tail risk: 31% probability of hold — higher event risk than markets pricing suggests',
    ],

    traderImpact: {
      headline: '69% cut probability with $1.4M volume is a strong signal. Trade the tail (31% hold) via straddle or vol structures rather than the modal outcome.',
      bias: 'BULLISH',
      timeframe: 'IMMEDIATE',
      affectedTraderTypes: ['Macro Hedge Funds', 'Rates Traders', 'FX Options', 'Volatility Desks'],
      riskLevel: 'HIGH',
    },

    instruments: [
      { ticker: 'KXFEDAUG26', name: 'Kalshi Fed Cut Contract', direction: 'BULLISH', reasoning: '69% implied — directly tradeable on Kalshi platform.', assetClass: 'CREDIT' },
      { ticker: 'GBP/USD', name: 'British Pound / US Dollar', direction: 'BULLISH', reasoning: 'Fed cut = USD weakens = GBP/USD rallies above 1.3280 resistance.', assetClass: 'FX' },
      { ticker: 'GLD', name: 'SPDR Gold Shares', direction: 'BULLISH', reasoning: 'Lower US rates reduce opportunity cost of gold. First cut historically +2-4% gold.', assetClass: 'COMMODITY' },
    ],

    relatedStoryIds: ['evt_2', 'sal_1', 'macro_1', 'ths_101'],
    tags: ['kalshi', 'fed', 'rate-cut', 'prediction-market', 'alternatives', 'fomc'],
  },

  'alt_2': {
    id: 'alt_2',
    title: 'Polymarket: US Presidential Election 2028 — 52% Democrat',
    pillar: 'ALTERNATIVES',
    sourceLabel: 'Polymarket',
    publishedAt: '2026-08-02T19:00:00Z',
    metricLabel: 'US-ELECTION-2028 (Polymarket)',
    metricValue: '52% Dem / 48% Rep',

    summary: 'Polymarket\'s 2028 US presidential election contract — with $12.8M in volume — shows Democrats at a razor-thin 52% vs 48% advantage over Republicans, reflecting genuine electoral uncertainty two years out.',

    narrative: `Polymarket's US Presidential Election 2028 contract, with $12.8 million in traded volume, represents the single largest prediction market contract on political outcomes globally and serves as a real-time aggregator of sophisticated money's view on medium-term US political risk. The current 52% Democrat / 48% Republican split reflects a near-coin-flip uncertainty — the tightest reading since the contract was listed in January 2026.

The political context: the Democrat candidate field has narrowed to two frontrunners, while the Republican field remains fragmented across four announced candidates with no clear front-runner. The 52/48 split likely reflects the structural electoral college advantages and disadvantages embedded in current state-level polling rather than a pure two-party national vote prediction.

From a market perspective, the 2028 election is two years away — far enough that it should not directly drive day-to-day positioning decisions. However, for certain asset classes with long-duration exposure to US policy regime, the current 52% signal matters: defense stocks (historically outperform under Republican administrations), clean energy equities (historically outperform under Democrat administrations), and infrastructure plays have 2-year policy duration that makes them sensitive to this probability.

The $12.8M volume on this contract is also informative about market architecture: Polymarket has attracted significant institutional-adjacent participation in political markets, and movements in this contract can be leading indicators of institutional views on medium-term US policy regime risk that are not yet reflected in futures markets.`,

    keyFacts: [
      'Polymarket contract: US-ELECTION-2028 (Presidential winner party)',
      'Current odds: 52% Democrat / 48% Republican',
      'Volume: $12.8M (largest political prediction market globally)',
      'Trend: Democrats gained 4pp since June 2026 (was 48/52 Rep advantage)',
      'Democrat candidates: 2 frontrunners (field narrowed)',
      'Republican candidates: 4 announced, no clear frontrunner',
      'Policy duration implications: defense, clean energy, infrastructure most sensitive',
    ],

    traderImpact: {
      headline: 'Near-coin-flip 2-year out. Use as a calibration input for long-duration policy-sensitive positions, not as a tactical trading signal.',
      bias: 'NEUTRAL',
      timeframe: 'LONG-TERM',
      affectedTraderTypes: ['Macro Hedge Funds', 'Long-Duration Equity', 'Political Risk Analysts', 'Infrastructure Investors'],
      riskLevel: 'LOW',
    },

    instruments: [
      { ticker: 'ITA', name: 'iShares US Aerospace & Defense ETF', direction: 'BULLISH', reasoning: 'If Republican probability rises: defense spending expected to increase. Monitor Polymarket shift.', assetClass: 'INDEX' },
      { ticker: 'ICLN', name: 'iShares Global Clean Energy ETF', direction: 'BULLISH', reasoning: 'If Democrat probability rises: IRA extension/expansion positive for clean energy.', assetClass: 'INDEX' },
    ],

    relatedStoryIds: [],
    tags: ['polymarket', 'us-election', 'political-risk', 'alternatives', 'prediction-market'],
  },

  // ── UNDERCURRENT PAGE ──────────────────────────────────────────────────────
  'und_1': {
    id: 'und_1',
    title: 'Defense Innovation Systems: Congressional + Insider + Contract Triple Join',
    pillar: 'UNDERCURRENT',
    sourceLabel: 'USAspending + SEC EDGAR + QuiverQuant',
    publishedAt: '2026-08-01T16:00:00Z',
    metricLabel: 'DoD Contract Award',
    metricValue: '$5,000,000',

    summary: 'A forensic three-source entity join on Defense Innovation Systems LLC reveals simultaneous Congressional purchase disclosure, CEO insider buy, and $5M DoD contract award within 72 hours — a rare alt-data cluster.',

    narrative: `See story: Defense Innovation Systems Contract Award ($5M DoD) — full analysis available in The Brief section.`,

    keyFacts: [
      'Contract: $5M from US Dept of Defense (2026-08-01)',
      'Congressional buy: Rep. Virginia Foxx — $50,000-$100,000 (disclosed 2026-07-28)',
      'CEO insider buy: 25,000 shares (SEC Form 4, filed 2026-07-30)',
      'Three-source join window: 72 hours',
    ],

    traderImpact: {
      headline: 'Three-source cluster. Conviction signal for defense pipeline optionality. IDIQ follow-on likely within 90-180 days.',
      bias: 'BULLISH',
      timeframe: 'MEDIUM-TERM',
      affectedTraderTypes: ['Event-Driven', 'Defense Sector Equity', 'Alt-Data Quant'],
      riskLevel: 'MEDIUM',
    },

    instruments: [
      { ticker: 'DIS', name: 'Defense Innovation Systems LLC', direction: 'BULLISH', reasoning: 'Triple convergent signal: contract + congressional + CEO insider buy.', assetClass: 'EQUITY' },
      { ticker: 'ITA', name: 'iShares US Aerospace & Defense ETF', direction: 'BULLISH', reasoning: 'Defense sector macro tailwind validates thematic.', assetClass: 'INDEX' },
    ],

    relatedStoryIds: ['sal_3'],
    tags: ['defense', 'insider-trading', 'usaspending', 'sec-form4', 'congressional', 'alt-data'],
  },

  // ── THESES PAGE ───────────────────────────────────────────────────────────
  'ths_101': {
    id: 'ths_101',
    title: 'Thesis: GBP/USD — UK/US Rate Differential Hold',
    pillar: 'THESES',
    sourceLabel: 'Thesis Engine',
    publishedAt: '2026-06-01T00:00:00Z',
    metricLabel: 'GBP/USD',
    metricValue: '1.3145',

    summary: 'The UK/US Rate Differential thesis for GBP/USD long is under stress. The Fed has remained above the 5.50% falsification threshold and the thesis requires reassessment or explicit re-conviction.',

    narrative: `This thesis was constructed on the premise that the Bank of England would maintain its base rate at 5.25% while the Federal Reserve began a cutting cycle in mid-2026, creating a favourable GBP/USD rate differential dynamic. The thesis has been invalidated at the metric level — the Fed Funds rate at 5.75% exceeds the 5.50% falsification threshold — but this does not necessarily mean the position should be unwound immediately.

The differentiation between a metric breach and a thesis invalidation requires judgment: the rate differential logic may still hold if the Fed is about to cut (the breach is transient) or it may be fundamentally broken if the Fed's pause is structural. The Kalshi market currently implies 69% probability of a cut at August 20th FOMC — meaning the market is pricing the "transient breach" scenario.

The falsification criteria for this thesis were explicitly: (1) Fed funds above 5.50% — TRIGGERED; (2) GBP/USD below 1.2800 — NOT TRIGGERED. Because only one of two criteria has triggered, the thesis is on WATCH status rather than fully invalidated. The Council should convene for explicit re-conviction before the next position sizing decision.`,

    keyFacts: [
      'Thesis status: WATCH (one of two falsification criteria triggered)',
      'Falsification criterion 1: Fed Funds > 5.50% — TRIGGERED (current: 5.75%)',
      'Falsification criterion 2: GBP/USD < 1.2800 — NOT TRIGGERED (current: 1.3145)',
      'GBP/USD entry level: 1.3200 (current position underwater by 55 pips)',
      'Fed cut probability (Kalshi): 69% — breach may be transient',
      'Required action: Re-conviction before next size decision',
    ],

    traderImpact: {
      headline: 'Thesis on WATCH. Await FOMC outcome before re-sizing. Cut = thesis reinstated. Hold = thesis formally invalidated — close position.',
      bias: 'NEUTRAL',
      timeframe: 'IMMEDIATE',
      affectedTraderTypes: ['FX Macro', 'Systematic Trend', 'Discretionary Macro'],
      riskLevel: 'HIGH',
    },

    instruments: [
      { ticker: 'GBP/USD', name: 'British Pound / US Dollar', direction: 'NEUTRAL', reasoning: 'Position on hold pending FOMC outcome August 20th.', assetClass: 'FX' },
    ],

    relatedStoryIds: ['sal_1', 'mkt_gbpusd', 'evt_2', 'alt_1'],
    tags: ['thesis', 'gbp', 'usd', 'rates', 'falsification', 'review'],
  },

  'ths_102': {
    id: 'ths_102',
    title: 'Thesis: WTI Crude — EIA Energy Supply Drawdown',
    pillar: 'THESES',
    sourceLabel: 'Thesis Engine',
    publishedAt: '2026-06-15T00:00:00Z',
    metricLabel: 'WTI Crude',
    metricValue: '$78.40',

    summary: 'The EIA Energy Supply Drawdown thesis is INTACT. Weekly inventory data continues to show consistent drawdowns, with current stocks 6.2% below seasonal average — providing fundamental support for the WTI long.',

    narrative: `The WTI Crude EIA Energy Supply Drawdown thesis was constructed on the observation that EIA weekly inventory data was showing a structurally below-average inventory position heading into the peak summer demand season. This thesis remains fully intact: the most recent EIA print (July 25, 2026) showed a -3.4M barrel draw vs a consensus expectation of a +1.2M barrel build — the fourth consecutive week of inventory draws.

Current inventory levels at 426.8M barrels are 6.2% below the 5-year seasonal average of 455M barrels. The lone falsification criterion — an unexpected inventory build of greater than +5M barrels — has not been triggered and appears unlikely to trigger in the near-term given refinery run rates at 93.2% utilisation (leaving limited room for demand-side weakness to cause a build) and OPEC+ production discipline maintained through Q3 2026.

The thesis is tracking exactly as modelled. The primary risk to thesis continuation is a sudden demand shock (US recession fear materialising, or China economic data disappointing significantly on industrial activity), but neither is in the high-probability scenario set at this time.`,

    keyFacts: [
      'Thesis status: INTACT',
      'WTI spot: $78.40 (+$12.40 vs thesis entry of $66.00)',
      'EIA draws: 4 consecutive weekly draws',
      'Latest EIA draw: -3.4M bbl (vs consensus +1.2M bbl build)',
      'Inventories vs 5-year average: -6.2% below seasonal norm',
      'Falsification criterion: +5M bbl build — NOT TRIGGERED',
      'P&L: +$12.40/bbl unrealised gain',
    ],

    traderImpact: {
      headline: 'Thesis intact and performing. Monitor OPEC+ compliance data and China industrial PMI for the primary risks to continuation.',
      bias: 'BULLISH',
      timeframe: 'SHORT-TERM',
      affectedTraderTypes: ['Energy Commodity Traders', 'Macro Hedge Funds', 'Energy Equity'],
      riskLevel: 'LOW',
    },

    instruments: [
      { ticker: 'WTI_CRUDE', name: 'WTI Light Sweet Crude', direction: 'BULLISH', reasoning: 'Thesis intact. Inventory deficit from 5-year average provides structural price floor.', assetClass: 'COMMODITY' },
      { ticker: 'XLE', name: 'Energy Select Sector SPDR ETF', direction: 'BULLISH', reasoning: 'Sector beneficiary of continued crude price strength.', assetClass: 'INDEX' },
    ],

    relatedStoryIds: ['macro_3'],
    tags: ['thesis', 'wti', 'crude', 'eia', 'energy', 'commodities'],
  },
};

export function getStory(id: string): Story | undefined {
  return STORIES[id];
}

export function getAllStories(): Story[] {
  return Object.values(STORIES);
}

export function getRelatedStories(id: string): Story[] {
  const story = STORIES[id];
  if (!story) return [];
  return story.relatedStoryIds
    .map(rid => STORIES[rid])
    .filter((s): s is Story => s !== undefined);
}
