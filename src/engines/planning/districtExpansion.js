import * as turf from '@turf/turf';
import buildingsConfig from '../../config/buildings_config.json';

import { validateExpansion } from './districtValidation';

/**
 * Generates a proposed expansion polygon and calculates stats/costs.
 * 
 * @param {object} district - The customDistrict being expanded
 * @param {number} workersAdded - 10, 30, or 80
 * @param {Array} existingDistricts - Array of all customDistricts
 * @returns {object} Result of expansion proposal { valid, polygon, cost, areaAddedM2, workersAdded, blockedReasons, messages }
 */
export async function proposeExpansion(district, workersAdded, existingDistricts, cabildoLevel = 1) {
  const config = buildingsConfig[district.type] || {
    workerAreaFactor: 80,
    costPerM2: { gold: 0.1, wood: 0.05 }
  };

  const targetAddedAreaM2 = workersAdded * config.workerAreaFactor;
  const districtPoly = district.polygon;

  // 1. Define search bbox around district
  // A search radius depending on size. Let's make it proportional.
  // 30 workers -> 2400m², side is ~50m. Let's buffer by 250m.
  const searchBuffer = turf.buffer(districtPoly, 0.25, { units: 'kilometers' });
  const bbox = turf.bbox(searchBuffer);

  // 2. Generate 25m x 25m grid (0.025 km)
  const grid = turf.squareGrid(bbox, 0.025, { units: 'kilometers' });

  // 3. Classify cells
  const cells = grid.features.map((f, i) => {
    const centerPt = turf.center(f);
    const inCurrent = turf.booleanPointInPolygon(centerPt, districtPoly);
    
    // Check if in other districts
    let inOther = false;
    for (const other of existingDistricts) {
      if (other.id !== district.id && turf.booleanPointInPolygon(centerPt, other.polygon)) {
        inOther = true;
        break;
      }
    }

    return {
      id: i,
      polygon: f,
      center: centerPt.geometry.coordinates,
      inCurrent,
      inOther
    };
  });

  // Candidates: cells not in current, and not in other
  const candidates = cells.filter(c => !c.inCurrent && !c.inOther);
  
  // Find seed cells: candidates adjacent to current district boundary
  // Distance from cell center to district polygon < 35 meters (to account for diagonals of 25m square)
  const seedCells = [];
  const districtCentroid = turf.centroid(districtPoly);

  for (const c of candidates) {
    const pt = turf.point(c.center);
    const distToPolygon = turf.distance(pt, districtPoly, { units: 'meters' });
    if (distToPolygon < 35) {
      seedCells.push(c);
    }
  }

  if (seedCells.length === 0) {
    return {
      valid: false,
      polygon: null,
      cost: { gold: 0, wood: 0 },
      areaAddedM2: 0,
      workersAdded,
      blockedReasons: ['not_enough_valid_land'],
      messages: ['No hay suficiente terreno contiguo libre']
    };
  }

  // BFS / Region Growing from seeds
  const queue = [...seedCells];
  const visited = new Set(seedCells.map(c => c.id));
  const selectedCells = [];
  let currentAddedAreaM2 = 0;

  // Sort queue initially by proximity to district centroid
  queue.sort((a, b) => {
    const ptA = turf.point(a.center);
    const ptB = turf.point(b.center);
    return turf.distance(ptA, districtCentroid) - turf.distance(ptB, districtCentroid);
  });

  const getNeighbors = (cell) => {
    const cellPt = turf.point(cell.center);
    return candidates.filter(c => {
      if (visited.has(c.id)) return false;
      const dist = turf.distance(cellPt, turf.point(c.center), { units: 'meters' });
      return dist < 38; // adjacent grid distance
    });
  };

  while (queue.length > 0 && currentAddedAreaM2 < targetAddedAreaM2) {
    const cell = queue.shift();
    selectedCells.push(cell);
    currentAddedAreaM2 += 625; // 25m * 25m cell is 625 m2

    // Add neighbors
    const neighbors = getNeighbors(cell);
    for (const n of neighbors) {
      if (!visited.has(n.id)) {
        visited.add(n.id);
        queue.push(n);
      }
    }

    // Keep queue sorted by distance to seed/district so it grows in a compact circle/donut
    queue.sort((a, b) => {
      const ptA = turf.point(a.center);
      const ptB = turf.point(b.center);
      return turf.distance(ptA, districtCentroid) - turf.distance(ptB, districtCentroid);
    });
  }

  // If we couldn't get at least 60% of target area, fail
  if (currentAddedAreaM2 < targetAddedAreaM2 * 0.6) {
    return {
      valid: false,
      polygon: null,
      cost: { gold: 0, wood: 0 },
      areaAddedM2: 0,
      workersAdded,
      blockedReasons: ['not_enough_valid_land'],
      messages: ['No hay suficiente terreno seco contiguo']
    };
  }

  // Dissolve selected cells to get the expansion polygon
  let expansionPolygon = null;
  if (selectedCells.length > 0) {
    const fc = turf.featureCollection(selectedCells.map(c => c.polygon));
    const dissolved = turf.dissolve(fc);
    if (dissolved.features && dissolved.features.length > 0) {
      let maxArea = 0;
      for (const f of dissolved.features) {
        const area = turf.area(f);
        if (area > maxArea) {
          maxArea = area;
          expansionPolygon = f;
        }
      }
      // Simplify the polygon slightly for Leaflet rendering
      expansionPolygon = turf.simplify(expansionPolygon, { tolerance: 0.0001, highQuality: true });
    }
  }

  if (!expansionPolygon) {
    return {
      valid: false,
      polygon: null,
      cost: { gold: 0, wood: 0 },
      areaAddedM2: 0,
      workersAdded,
      blockedReasons: ['not_enough_valid_land'],
      messages: ['Error al generar la ampliación']
    };
  }

  // Calculate costs based on area added
  const actualAddedAreaM2 = Math.floor(turf.area(expansionPolygon));
  const goldCost = Math.ceil(50 + actualAddedAreaM2 * config.costPerM2.gold);
  const woodCost = Math.ceil(20 + actualAddedAreaM2 * config.costPerM2.wood);

  // Validate the expansion polygon against water/wetlands/other districts
  const currentWorkers = district.assignedWorkers || district.workersRequired;
  const targetWorkersAfter = currentWorkers + workersAdded;
  const validation = await validateExpansion(district, expansionPolygon, existingDistricts, cabildoLevel, targetWorkersAfter);

  return {
    valid: validation.valid,
    polygon: expansionPolygon,
    cost: {
      gold: goldCost,
      wood: woodCost
    },
    areaAddedM2: actualAddedAreaM2,
    workersAdded,
    blockedReasons: validation.blockedReasons,
    messages: validation.messages
  };
}

/**
 * Combines a district's original polygon with an expansion polygon.
 * 
 * @param {object} districtPolygon - GeoJSON Feature or Geometry
 * @param {object} expansionPolygon - GeoJSON Feature or Geometry
 * @returns {object} Combined dissolved GeoJSON Feature
 */
export function combineDistrictPolygons(districtPolygon, expansionPolygon) {
  const fc = turf.featureCollection([districtPolygon, expansionPolygon]);
  const dissolved = turf.dissolve(fc);
  
  if (dissolved.features && dissolved.features.length > 0) {
    let maxArea = 0;
    let mainPoly = dissolved.features[0];
    for (const f of dissolved.features) {
      const area = turf.area(f);
      if (area > maxArea) {
        maxArea = area;
        mainPoly = f;
      }
    }
    return turf.simplify(mainPoly, { tolerance: 0.00005, highQuality: true });
  }
  return districtPolygon;
}
