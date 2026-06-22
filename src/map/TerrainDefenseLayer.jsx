import React, { useMemo } from 'react';
import { Polygon, Circle, Tooltip } from 'react-leaflet';
import terrainConfig from '../data/terrain_elevation_config.json';
import { evaluateCityDefense } from '../defense/terrainDefenseEngine';

export default function TerrainDefenseLayer({ districts, activeLayers = [] }) {
  const showMilitary = activeLayers.includes('military');
  const showElevation = activeLayers.includes('elevation');

  if (!showMilitary && !showElevation) return null;

  const { militaryNodes } = useMemo(() => evaluateCityDefense(districts), [districts]);

  return (
    <>
      {/* Draw Elevation Zones */}
      {showElevation && terrainConfig.zones.map(zone => {
        const positions = zone.coordinates[0].map(c => [c[1], c[0]]); // [lat, lng]
        const isHigh = zone.elevation > 20;
        
        return (
          <Polygon 
            key={zone.id} 
            positions={positions} 
            pathOptions={{ 
              color: isHigh ? '#fb923c' : '#38bdf8', 
              weight: 2, 
              fillColor: isHigh ? '#fb923c' : '#38bdf8', 
              fillOpacity: 0.15 
            }}
          >
            <Tooltip direction="center">
              {zone.name}<br/>
              Elevación: {zone.elevation}m
            </Tooltip>
          </Polygon>
        );
      })}

      {/* Draw Military Coverage */}
      {showMilitary && militaryNodes.map(node => {
        const pos = [node.centroid[1], node.centroid[0]];
        return (
          <Circle 
            key={`defense-${node.id}`} 
            center={pos} 
            radius={node.coverageRadius}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.1,
              weight: 1,
              dashArray: '5, 5'
            }}
          >
            <Tooltip direction="top">
              Cobertura Militar<br/>
              Radio: {node.coverageRadius}m<br/>
              Bonus Altura: +{node.terrain.elevation * 2}
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}
