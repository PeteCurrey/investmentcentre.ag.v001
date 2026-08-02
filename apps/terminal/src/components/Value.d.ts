import React from 'react';
import { Observation } from '@meridian/core';
export interface ValueProps {
    observation?: Observation;
    provenance?: {
        value: string | number;
        unit?: string;
        source: string;
        sourceTimestamp: string;
        stalenessSeconds: number;
    };
}
export declare const Value: React.FC<ValueProps>;
//# sourceMappingURL=Value.d.ts.map