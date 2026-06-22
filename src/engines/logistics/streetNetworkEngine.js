import streetNetwork from '../../config/street_network_config.json';
import * as turf from '@turf/turf';

export function getNearestNode(coordinate) {
  if (!streetNetwork.nodes || streetNetwork.nodes.length === 0) return null;
  
  const pt = turf.point(coordinate); // [lng, lat]
  let minDistance = Infinity;
  let nearest = null;

  streetNetwork.nodes.forEach(node => {
    const nodePt = turf.point(node.coordinates);
    const dist = turf.distance(pt, nodePt, { units: 'meters' });
    if (dist < minDistance) {
      minDistance = dist;
      nearest = node;
    }
  });

  return nearest;
}

export function evaluateDistrictLogistics(districts) {
  // Finds bottlenecks and efficiency.
  const warnings = [];
  const connections = districts.map(district => {
    if (district.status !== 'operational' || !district.geometry) {
      return { ...district, logisticsConnected: false };
    }

    let centroid;
    try {
      centroid = turf.centroid(district.geometry).geometry.coordinates; // [lng, lat]
    } catch (e) {
      return { ...district, logisticsConnected: false };
    }

    const nearestNode = getNearestNode(centroid);
    if (!nearestNode) return { ...district, logisticsConnected: false };

    const distanceToNode = turf.distance(turf.point(centroid), turf.point(nearestNode.coordinates), { units: 'meters' });
    
    // A distance of > 300m might be considered bad.
    const isConnected = distanceToNode < 400;

    let efficiency = 100;
    if (distanceToNode > 200) efficiency = 80;
    if (distanceToNode > 400) efficiency = 50;
    if (distanceToNode > 800) efficiency = 20;

    if (!isConnected) {
      warnings.push(`${district.type.toUpperCase()} demasiado lejos de la red de calles (${Math.round(distanceToNode)}m).`);
    }

    return {
      ...district,
      nearestStreetNodeId: nearestNode.id,
      logisticsConnected: isConnected,
      logisticsDistanceMeters: Math.round(distanceToNode),
      logisticsEfficiency: efficiency
    };
  });

  return { connections, warnings };
}

export function getStreetEdges() {
  return streetNetwork.edges.map(edge => {
    const sourceNode = streetNetwork.nodes.find(n => n.id === edge.source);
    const targetNode = streetNetwork.nodes.find(n => n.id === edge.target);
    if (sourceNode && targetNode) {
      return {
        ...edge,
        coordinates: [sourceNode.coordinates, targetNode.coordinates]
      };
    }
    return null;
  }).filter(Boolean);
}
