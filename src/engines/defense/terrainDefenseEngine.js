import terrainConfig from '../../config/terrain_elevation_config.json';
import * as turf from '@turf/turf';

export function getElevationAt(coordinate) {
  const pt = turf.point(coordinate); // [lng, lat]
  
  for (const zone of terrainConfig.zones) {
    const poly = turf.polygon(zone.coordinates);
    if (turf.booleanPointInPolygon(pt, poly)) {
      return { elevation: zone.elevation, name: zone.name, type: zone.type };
    }
  }
  
  return { elevation: terrainConfig.defaultElevation, name: 'Terreno Base', type: 'flat' };
}

export function evaluateCityDefense(districts) {
  let totalDefenseScore = 0;
  const militaryNodes = [];
  const vulnerabilities = [];
  const protectedDistricts = new Set();

  // First, find all military nodes and their coverage
  districts.forEach(district => {
    if (district.status !== 'operational' || !district.geometry) return;

    let centroid;
    try {
      centroid = turf.centroid(district.geometry).geometry.coordinates;
    } catch (e) {
      return;
    }

    const terrain = getElevationAt(centroid);
    let baseDefense = 0;
    let coverageRadius = 0;

    if (district.type === 'fortaleza') {
      baseDefense = 100;
      coverageRadius = 600 + (terrain.elevation * 10); // Height gives range
    } else if (district.type === 'bateria') {
      baseDefense = 50;
      coverageRadius = 300 + (terrain.elevation * 8);
    } else if (district.type === 'muralla') {
      baseDefense = 30;
      coverageRadius = 100 + (terrain.elevation * 5);
    }

    if (baseDefense > 0) {
      const heightBonus = terrain.elevation * 2;
      const nodeScore = baseDefense + heightBonus;
      totalDefenseScore += nodeScore;
      
      militaryNodes.push({
        id: district.id,
        centroid,
        coverageRadius,
        score: nodeScore,
        terrain
      });
    }
  });

  // Now, evaluate other districts for vulnerabilities
  districts.forEach(district => {
    if (['fortaleza', 'bateria', 'muralla'].includes(district.type) || district.status !== 'operational' || !district.geometry) {
      return;
    }

    let centroid;
    try {
      centroid = turf.centroid(district.geometry).geometry.coordinates;
    } catch (e) {
      return;
    }

    const pt = turf.point(centroid);
    let isProtected = false;

    for (const node of militaryNodes) {
      const dist = turf.distance(pt, turf.point(node.centroid), { units: 'meters' });
      if (dist <= node.coverageRadius) {
        isProtected = true;
        protectedDistricts.add(district.id);
        break;
      }
    }

    if (!isProtected) {
      if (['almacen', 'puerto', 'arsenal', 'aduana'].includes(district.type)) {
        vulnerabilities.push(`El ${district.type.toUpperCase()} está fuera de la cobertura militar y es un objetivo crítico.`);
      }
    }
  });

  return {
    totalDefenseScore: Math.round(totalDefenseScore),
    militaryNodes,
    protectedCount: protectedDistricts.size,
    vulnerabilities
  };
}
