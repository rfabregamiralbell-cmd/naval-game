import React from 'react';
import { Circle, Tooltip } from 'react-leaflet';
import { calculateDistrictInfluence } from '../economy/influenceEngine';
import * as turf from '@turf/turf';

export default function InfluenceLayer({ districts, activeInfluenceTypes = [] }) {
  if (activeInfluenceTypes.length === 0 || !districts || districts.length === 0) return null;

  return (
    <>
      {districts.map(district => {
        if (!district.geometry || district.status !== 'operational') return null;

        const influence = calculateDistrictInfluence(district);
        if (influence.radiusMeters <= 0) return null;

        // Check if we should render this type
        if (!activeInfluenceTypes.includes('all') && !activeInfluenceTypes.includes(influence.type)) return null;

        // Find centroid to place the circle
        let center;
        try {
          const centroid = turf.centroid(district.geometry);
          center = [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]]; // leaflet is [lat, lng]
        } catch (e) {
          return null; // fallback if geometry is invalid
        }

        return (
          <Circle
            key={`inf-${district.id}`}
            center={center}
            radius={influence.radiusMeters}
            pathOptions={{
              color: influence.color,
              fillColor: influence.color,
              fillOpacity: 0.1,
              weight: 1,
              dashArray: '4 4'
            }}
          >
            <Tooltip direction="top" opacity={0.8}>
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                Influencia: {influence.type.charAt(0).toUpperCase() + influence.type.slice(1)}<br/>
                Radio: {Math.round(influence.radiusMeters)}m<br/>
                Fuerza: {influence.strength}
              </div>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}
