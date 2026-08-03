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

export const Value: React.FC<ValueProps> = ({ observation, provenance }) => {
  if (!observation && !provenance) {
    throw new Error('MERIDIAN Type Security Exception: Unprovenanced figure rendering is prohibited. Value requires observation or provenance payload.');
  }

  const val = observation 
    ? (observation.value_text || (observation.value_numeric !== null ? observation.value_numeric.toString() : 'N/A'))
    : provenance!.value;

  const unit = observation ? observation.unit : provenance?.unit;
  const source = observation ? observation.source_id : provenance!.source;
  const timestamp = observation ? observation.source_timestamp : provenance!.sourceTimestamp;
  const staleness = observation ? observation.staleness_seconds : provenance!.stalenessSeconds;

  const isDegraded = staleness > 3600;
  const isOffline = staleness > 86400;

  // '—' is the universal "not connected / not fetched" sentinel used across all pages.
  // Rendering a specific source:age tag in that state contradicts the NOT CONNECTED banner
  // and fabricates the appearance of a recent successful fetch.
  const isDisconnected = val === '—' || val === null || val === undefined;

  return (
    <span style={{ fontFamily: '"DM Mono", monospace', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontWeight: 600, color: '#14181B' }}>
        {val} {unit && <span style={{ fontSize: '0.85em', color: '#6B7280' }}>{unit}</span>}
      </span>
      {isDisconnected ? (
        <span
          title={`Source: ${source} — no data received`}
          style={{
            fontSize: '10px',
            padding: '1px 4px',
            border: '1px solid #FCD34D',
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            borderRadius: '0px'
          }}
        >
          SOURCE UNAVAILABLE
        </span>
      ) : (
        <span
          title={`Source: ${source} | Timestamp: ${timestamp} | Age: ${staleness}s`}
          style={{
            fontSize: '10px',
            padding: '1px 4px',
            border: '1px solid #E4E4DF',
            backgroundColor: isOffline ? '#FEE2E2' : isDegraded ? '#FEF3C7' : '#F7F7F5',
            color: isOffline ? '#991B1B' : isDegraded ? '#92400E' : '#6B7280',
            borderRadius: '0px'
          }}
        >
          {source}:{staleness}s
        </span>
      )}
    </span>
  );
};
