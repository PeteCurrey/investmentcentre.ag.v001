import React from 'react';
interface TradingViewChartProps {
    symbol?: string;
    interval?: string;
    theme?: 'dark' | 'light';
    height?: number;
    showSidebar?: boolean;
}
declare global {
    interface Window {
        TradingView: any;
    }
}
export default function TradingViewChart({ symbol, interval, theme, height, showSidebar, }: TradingViewChartProps): React.JSX.Element;
export {};
//# sourceMappingURL=TradingViewChart.d.ts.map