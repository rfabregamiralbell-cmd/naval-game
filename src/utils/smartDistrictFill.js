import * as turf from '@turf/turf';
import buildingsConfig from '../data/buildings_config.json';
import { validatePolygonAgainstVisualWater } from './visualWaterValidator';
import { checkLevelRequirements } from '../planning/districtValidation';

export async function generateDistrictFromSeed({
  buildingType,
  seedLatLng,
  targetWorkers,
  targetAreaM2,
  existingDistricts,
  cabildoLevel = 1
}) {
  const seedPt = turf.point([seedLatLng.lng, seedLatLng.lat]);
  const bConfig = buildingsConfig[buildingType];
  const blockedReasons = [];

  // Create grid
  const radiusKm = Math.sqrt(targetAreaM2 * 4) / 1000;
  const searchBbox = turf.bbox(turf.buffer(seedPt, radiusKm, { units: 'kilometers' }));
  const grid = turf.squareGrid(searchBbox, 0.025, { units: 'kilometers' });

  const cells = grid.features.map((f, i) => ({
    id: i,
    polygon: f,
    center: turf.center(f).geometry.coordinates
  }));

  let startCell = null;
  let minSeedDist = Infinity;
  for (const c of cells) {
    const dist = turf.distance(seedPt, turf.point(c.center), { units: 'meters' });
    if (dist < minSeedDist) {
      minSeedDist = dist;
      startCell = c;
    }
  }

  if (!startCell) return createFailResult(["Punto inicial fuera de límites"]);

  const isCellValid = (cell) => {
    const pt = turf.point(cell.center);
    for (const d of existingDistricts) {
      if (turf.booleanPointInPolygon(pt, d.polygon)) {
        return { valid: false, reason: "Ocupado por otro distrito" };
      }
    }
    return { valid: true };
  };

  const startValidity = isCellValid(startCell);
  if (!startValidity.valid) return createFailResult([startValidity.reason]);

  const queue = [startCell];
  const visited = new Set([startCell.id]);
  const selectedCells = [];
  let currentAreaM2 = 0;

  const getNeighbors = (cell) => {
    return cells.filter(c => !visited.has(c.id) && turf.distance(turf.point(cell.center), turf.point(c.center), {units: 'meters'}) < 40);
  };

  while (queue.length > 0 && currentAreaM2 < targetAreaM2) {
    queue.sort((a, b) => turf.distance(seedPt, turf.point(a.center)) - turf.distance(seedPt, turf.point(b.center)));
    const cell = queue.shift();
    selectedCells.push(cell);
    currentAreaM2 += 625;

    for (const n of getNeighbors(cell)) {
      if (!visited.has(n.id)) {
        visited.add(n.id);
        if (isCellValid(n).valid) queue.push(n);
      }
    }
  }

  if (currentAreaM2 < targetAreaM2 * 0.7) {
    blockedReasons.push("No hay suficiente área válida");
  }

  let finalPolygon = null;
  if (selectedCells.length > 0) {
    const fc = turf.featureCollection(selectedCells.map(c => c.polygon));
    const dissolved = turf.dissolve(fc);
    if (dissolved.features && dissolved.features.length > 0) {
      let maxArea = 0;
      for (const f of dissolved.features) {
        const area = turf.area(f);
        if (area > maxArea) { maxArea = area; finalPolygon = f; }
      }
      finalPolygon = turf.simplify(finalPolygon, { tolerance: 0.0001, highQuality: true });
    }
  }

  if (!finalPolygon) return createFailResult(["Error al generar polígono"]);

  // --- LEVEL REQUIREMENTS VALIDATION ---
  const reqCheck = checkLevelRequirements(buildingType, targetWorkers, cabildoLevel, existingDistricts);
  if (!reqCheck.valid) {
    blockedReasons.push(reqCheck.message);
  }

  // --- CATEGORY-SPECIFIC STRICT VALIDATION ---
  const needsProximity = bConfig.category === 'COASTAL_ONLY' || bConfig.category === 'WATER_ADJACENT';
  const visualCheck = await validatePolygonAgainstVisualWater(finalPolygon, needsProximity);

  if (visualCheck.waterPixelCount > 5) {
    if (bConfig.category === 'COASTAL_ONLY' || bConfig.category === 'WATER_ADJACENT') {
      blockedReasons.push("El edificio debe estar sobre tierra"); // No flotante
    } else {
      blockedReasons.push("El distrito invade agua");
    }
  }

  if (bConfig.category === 'AGRICULTURE_ONLY') {
    if (visualCheck.wetlandPixelCount > 20 || visualCheck.mangrovePixelCount > 20) {
      blockedReasons.push("La hacienda necesita tierra agrícola seca");
      blockedReasons.push("Esta zona parece agua, manglar o humedal");
    }
  } else {
    // For Gremio, Aduana, Arsenal, a high wetland count is also bad
    if (visualCheck.wetlandPixelCount > 50 || visualCheck.mangrovePixelCount > 50) {
      blockedReasons.push("Esta zona parece humedal o manglar");
    }
  }

  if (needsProximity) {
    if (!visualCheck.waterProximity) {
      blockedReasons.push("Demasiado lejos de la costa");
      blockedReasons.push("Debe estar junto a costa, puerto o muelle");
    }
  }

  const finalAreaM2 = Math.floor(turf.area(finalPolygon));
  const valid = blockedReasons.length === 0;

  return {
    valid,
    polygon: finalPolygon,
    areaM2: finalAreaM2,
    targetAreaM2,
    workersRequired: Math.floor(finalAreaM2 / bConfig.workerAreaFactor),
    targetWorkers,
    cost: {
      gold: Math.ceil(bConfig.baseCost.gold + (finalAreaM2 * bConfig.costPerM2.gold)),
      wood: Math.ceil(bConfig.baseCost.wood + (finalAreaM2 * bConfig.costPerM2.wood))
    },
    blockedReasons
  };

  function createFailResult(reasons) {
    return {
      valid: false, polygon: null, areaM2: 0, targetAreaM2, workersRequired: 0,
      targetWorkers, cost: { gold: 0, wood: 0 }, blockedReasons: reasons
    };
  }
}
