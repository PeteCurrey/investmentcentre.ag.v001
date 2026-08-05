import { Observation, Pillar } from '@meridian/core';
export type DeltaType = 'CHANGE' | 'ACCELERATION' | 'CONTRADICTION' | 'ANOMALY';
export interface Delta {
    id: string;
    type: DeltaType;
    metric: string;
    entityId: string | null;
    pillar: Pillar;
    changeMagnitude: number;
    description: string;
    sourceObservationIds: string[];
    detectedAt: string;
}
export interface ContradictionObject {
    id: string;
    metric: string;
    entityId: string | null;
    pillar: Pillar;
    observationIdA: string;
    sourceIdA: string;
    valueA: string;
    observationIdB: string;
    sourceIdB: string;
    valueB: string;
    divergencePct: number;
    detectedAt: string;
}
export declare class DeltaEngine {
    /**
     * Scans a batch of observations across different sources for contradictions.
     * A contradiction occurs when two independent sources report on the same metric/entity
     * within a close time window, but their values diverge significantly (> 2%).
     */
    detectContradictions(observations: Observation[], divergenceThresholdPct?: number): ContradictionObject[];
    /**
     * Compares past observation against new observation to identify significant changes or anomalies.
     */
    detectChanges(pastObs: Observation, newObs: Observation): Delta | null;
}
//# sourceMappingURL=index.d.ts.map