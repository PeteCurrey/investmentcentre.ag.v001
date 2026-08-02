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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TradingViewChart;
const react_1 = __importStar(require("react"));
function TradingViewChart({ symbol = 'OANDA:GBPUSD', interval = '15', theme = 'dark', height = 500, showSidebar = true, }) {
    const containerRef = (0, react_1.useRef)(null);
    const uid = (0, react_1.useId)().replace(/:/g, '_');
    const containerId = `tv_${uid}`;
    (0, react_1.useEffect)(() => {
        const scriptId = 'tradingview-widget-script';
        let script = document.getElementById(scriptId);
        const initWidget = () => {
            if (!window.TradingView || !containerRef.current)
                return;
            // Clear previous widget
            containerRef.current.innerHTML = '';
            const inner = document.createElement('div');
            inner.id = containerId;
            inner.style.height = '100%';
            inner.style.width = '100%';
            containerRef.current.appendChild(inner);
            new window.TradingView.widget({
                autosize: true,
                symbol,
                interval,
                timezone: 'Etc/UTC',
                theme: theme === 'dark' ? 'dark' : 'light',
                style: '1', // Candlestick
                locale: 'en',
                toolbar_bg: theme === 'dark' ? '#0F172A' : '#F7F7F5',
                enable_publishing: false,
                withdateranges: true,
                allow_symbol_change: true,
                container_id: containerId,
                hide_side_toolbar: !showSidebar,
                save_image: false,
                // Rich indicator set
                studies: [
                    'RSI@tv-basicstudies', // RSI 14
                    'MACD@tv-basicstudies', // MACD (12,26,9)
                    'BB@tv-basicstudies', // Bollinger Bands (20,2)
                    'MAExp@tv-basicstudies', // EMA — default 9
                    'MAExp@tv-basicstudies', // EMA — will add 20 via overrides
                    'MASimple@tv-basicstudies', // SMA 50
                    'MASimple@tv-basicstudies', // SMA 200
                    'StochRSI@tv-basicstudies', // Stochastic RSI
                    'ATR@tv-basicstudies', // ATR — volatility
                    'VWAP@tv-basicstudies', // VWAP
                ],
                studies_overrides: {
                    'RSI.length': 14,
                    'bb.length': 20,
                    'bb.mult': 2,
                    'MACD.fast length': 12,
                    'MACD.slow length': 26,
                    'MACD.signal smoothing': 9,
                },
                disabled_features: [
                    'header_symbol_search',
                    'use_localstorage_for_settings',
                ],
                enabled_features: [
                    'study_templates',
                    'side_toolbar_in_fullscreen_mode',
                    'hide_left_toolbar_by_default',
                ],
                overrides: {
                    'paneProperties.background': theme === 'dark' ? '#0A0D12' : '#FFFFFF',
                    'paneProperties.vertGridProperties.color': theme === 'dark' ? '#1E293B' : '#E4E4DF',
                    'paneProperties.horzGridProperties.color': theme === 'dark' ? '#1E293B' : '#E4E4DF',
                    'symbolWatermarkProperties.transparency': 90,
                    'scalesProperties.textColor': theme === 'dark' ? '#94A3B8' : '#6B7280',
                    'mainSeriesProperties.candleStyle.upColor': '#22C55E',
                    'mainSeriesProperties.candleStyle.downColor': '#EF4444',
                    'mainSeriesProperties.candleStyle.borderUpColor': '#22C55E',
                    'mainSeriesProperties.candleStyle.borderDownColor': '#EF4444',
                    'mainSeriesProperties.candleStyle.wickUpColor': '#22C55E',
                    'mainSeriesProperties.candleStyle.wickDownColor': '#EF4444',
                },
            });
        };
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.onload = initWidget;
            document.head.appendChild(script);
        }
        else {
            if (window.TradingView) {
                initWidget();
            }
            else {
                script.addEventListener('load', initWidget);
            }
        }
        return () => {
            if (containerRef.current)
                containerRef.current.innerHTML = '';
        };
    }, [symbol, interval, theme, containerId, showSidebar]);
    return (<div style={{
            width: '100%',
            height: `${height}px`,
            position: 'relative',
            backgroundColor: theme === 'dark' ? '#0A0D12' : '#FFFFFF',
        }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}/>
    </div>);
}
//# sourceMappingURL=TradingViewChart.js.map