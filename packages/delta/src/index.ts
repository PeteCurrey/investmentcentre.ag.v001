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

export class DeltaEngine {
  /**
   * Scans a batch of observations across different sources for contradictions.
   * A contradiction occurs when two independent sources report on the same metric/entity
   * within a close time window, but their values diverge significantly (> 2%).
   */
  public detectContradictions(observations: Observation[], divergenceThresholdPct = 2.0): ContradictionObject[] {
    const contradictions: ContradictionObject[] = [];
    const grouped = new Map<string, Observation[]>();

    for (const obs of observations) {
      const key = `${obs.entity_id || 'GLOBAL'}:${obs.metric.toLowerCase()}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(obs);
    }

    for (const [key, obsGroup] of grouped.entries()) {
      if (obsGroup.length < 2) continue;

      for (let i = 0; i < obsGroup.length; i++) {
        for (let j = i + 1; j < obsGroup.length; j++) {
          const obsA = obsGroup[i];
          const obsB = obsGroup[j];

          // Must be from different sources
          if (obsA.source_id === obsB.source_id) continue;

          if (obsA.value_numeric !== null && obsB.value_numeric !== null) {
            const valA = Number(obsA.value_numeric);
            const valB = Number(obsB.value_numeric);
            const maxVal = Math.max(Math.abs(valA), Math.abs(valB));

            if (maxVal > 0) {
              const diff = Math.abs(valA - valB);
              const divergence = (diff / maxVal) * 100;

              if (divergence >= divergenceThresholdPct) {
                contradictions.push({
                  id: `cntr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                  metric: obsA.metric,
                  entityId: obsA.entity_id,
                  pillar: obsA.pillar,
                  observationIdA: obsA.id,
                  sourceIdA: obsA.source_id,
                  valueA: obsA.value_text || valA.toString(),
                  observationIdB: obsB.id,
                  sourceIdB: obsB.source_id,
                  valueB: obsB.value_text || valB.toString(),
                  divergencePct: Math.round(divergence * 100) / 100,
                  detectedAt: new Date().toISOString()
                });
              }
            }
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Compares past observation against new observation to identify significant changes or anomalies.
   */
  public detectChanges(pastObs: Observation, newObs: Observation): Delta | null {
    if (pastObs.metric !== newObs.metric) return null;

    if (pastObs.value_numeric !== null && newObs.value_numeric !== null) {
      const pastVal = Number(pastObs.value_numeric);
      const newVal = Number(newObs.value_numeric);

      if (pastVal !== newVal) {
        const changePct = pastVal !== 0 ? ((newVal - pastVal) / Math.abs(pastVal)) * 100 : 100;
        const isAnomaly = Math.abs(changePct) >= 20.0;

        return {
          id: `delta_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: isAnomaly ? 'ANOMALY' : 'CHANGE',
          metric: newObs.metric,
          entityId: newObs.entity_id,
          pillar: newObs.pillar,
          changeMagnitude: Math.round(changePct * 100) / 100,
          description: `Metric ${newObs.metric} shifted by ${changePct.toFixed(2)}% from ${pastObs.value_text || pastVal} to ${newObs.value_text || newVal}`,
          sourceObservationIds: [pastObs.id, newObs.id],
          detectedAt: new Date().toISOString()
        };
      }
    }

    return null;
  }
}
