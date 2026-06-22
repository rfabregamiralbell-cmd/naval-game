import React, { useMemo } from 'react';
import { Polyline, Tooltip, CircleMarker } from 'react-leaflet';
import { getStreetEdges, evaluateDistrictLogistics } from '../../engines/logistics/streetNetworkEngine';
import * as turf from '@turf/turf';
import streetNetwork from '../../config/street_network_config.json';

export default function StreetLogisticsLayer({ districts, activeLayers = [] }) {
  if (!activeLayers.includes('logistics') || !districts) return null;

  const edges = useMemo(() => getStreetEdges(), []);
  const { connections } = useMemo(() => evaluateDistrictLogistics(districts), [districts]);

  return (
    <>
      {/* Draw existing streets */}
      {edges.map((edge, i) => {
        const positions = edge.coordinates.map(c => [c[1], c[0]]); // [lat, lng]
        const color = edge.type === 'main' ? '#fbbf24' : '#94a3b8'; // amber or slate
        const weight = edge.type === 'main' ? 4 : 2;

        return (
          <Polyline key={`edge-${i}`} positions={positions} pathOptions={{ color, weight, opacity: 0.8 }}>
            <Tooltip direction="top">Calle {edge.type === 'main' ? 'Principal' : 'Secundaria'}</Tooltip>
          </Polyline>
        );
      })}

      {/* Draw district connections to nearest node */}
      {connections.map(dist => {
        if (!dist.logisticsConnected || !dist.geometry || !dist.nearestStreetNodeId) return null;
        
        let centroid;
        try {
          centroid = turf.centroid(dist.geometry).geometry.coordinates; // [lng, lat]
        } catch (e) {
          return null;
        }

        const node = streetNetwork.nodes.find(n => n.id === dist.nearestStreetNodeId);
        const nodePos = node ? [node.coordinates[1], node.coordinates[0]] : null;

        const distPos = [centroid[1], centroid[0]];
        const color = dist.logisticsEfficiency > 80 ? '#22c55e' : dist.logisticsEfficiency > 40 ? '#eab308' : '#ef4444';

        return (
          <React.Fragment key={`log-${dist.id}`}>
            <CircleMarker center={distPos} radius={5} pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}>
              <Tooltip direction="top">
                Eficiencia Logística: {dist.logisticsEfficiency}%<br/>
                Distancia a red: {dist.logisticsDistanceMeters}m
              </Tooltip>
            </CircleMarker>
            {nodePos && (
              <Polyline 
                positions={[distPos, nodePos]} 
                pathOptions={{ color, weight: 2, dashArray: '4, 4', opacity: 0.6 }} 
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
