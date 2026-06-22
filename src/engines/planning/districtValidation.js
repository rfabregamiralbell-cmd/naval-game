import * as turf from '@turf/turf';
import { validatePolygonAgainstVisualWater } from '../../utils/visualWaterValidator';

/**
 * Validates a proposed expansion polygon.
 * 
 * @param {object} currentDistrict - The district being expanded
 * @param {object} expansionPolygon - The polygon of the new area being added
 * @param {Array} existingDistricts - Array of all other customDistricts in the game
 * @returns {object} Validation result { valid, blockedReasons, messages }
 */
import buildingsConfig from '../../config/buildings_config.json';
import { getLevelFromWorkers } from '../../engines/economy/districtStats';

/**
 * Validates if the town matches required levels for the chosen size.
 * 
 * @param {string} type - Building type (e.g., 'hacienda')
 * @param {number} targetWorkers - Target workers count
 * @param {number} cabildoLevel - Level of the Cabildo
 * @param {Array} existingDistricts - Array of existing customDistricts
 * @returns {object} { valid, reason, message }
 */
export function checkLevelRequirements(type, targetWorkers, cabildoLevel, existingDistricts = []) {
  const config = buildingsConfig[type];
  if (!config || !config.levels) return { valid: true };

  const targetLevel = getLevelFromWorkers(type, targetWorkers);
  const levelConfig = config.levels[targetLevel.toString()];
  
  if (!levelConfig || !levelConfig.requirements) return { valid: true };

  const requirements = levelConfig.requirements;

  const getMaxLevelBuilt = (reqType) => {
    const matches = existingDistricts.filter(d => d.type === reqType && d.status === 'operational');
    if (matches.length === 0) return 0;
    return Math.max(...matches.map(d => getLevelFromWorkers(reqType, d.assignedWorkers || d.workersRequired)));
  };

  for (const [reqKey, requiredVal] of Object.entries(requirements)) {
    if (reqKey === 'cabildoLevel') {
      if (cabildoLevel < requiredVal) {
        return {
          valid: false,
          reason: `Requiere Cabildo Nivel ${requiredVal}`,
          message: `Requiere Cabildo Nivel ${requiredVal}`
        };
      }
    } else {
      const distType = reqKey.replace('Level', '');
      const maxBuilt = getMaxLevelBuilt(distType);
      if (maxBuilt < requiredVal) {
        const friendlyNames = {
          camino: 'Camino Interior',
          almacen: 'Almacenes',
          puerto: 'Puerto',
          gremio: 'Gremio de Artesanos',
          fortaleza: 'Fortaleza',
          arsenal: 'Arsenal'
        };
        const friendlyName = friendlyNames[distType] || distType;
        const reqText = requiredVal > 1 
          ? `Requiere ${friendlyName} Nivel ${requiredVal}`
          : `Requiere ${friendlyName}`;
        return {
          valid: false,
          reason: reqText,
          message: reqText
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates a proposed expansion polygon.
 * 
 * @param {object} currentDistrict - The district being expanded
 * @param {object} expansionPolygon - The polygon of the new area being added
 * @param {Array} existingDistricts - Array of all other customDistricts in the game
 * @param {number} cabildoLevel - Current Cabildo level
 * @param {number} targetWorkersAfter - Combined workers after expansion
 * @returns {object} Validation result { valid, blockedReasons, messages }
 */
export async function validateExpansion(currentDistrict, expansionPolygon, existingDistricts, cabildoLevel = 1, targetWorkersAfter = 30) {
  const blockedReasons = [];
  const messages = [];

  if (!expansionPolygon) {
    blockedReasons.push('not_enough_valid_land');
    messages.push('No hay suficiente terreno seco contiguo');
    return { valid: false, blockedReasons, messages };
  }

  // 0. Progression / Level Requirement check
  const reqCheck = checkLevelRequirements(currentDistrict.type, targetWorkersAfter, cabildoLevel, existingDistricts);
  if (!reqCheck.valid) {
    blockedReasons.push('progression_requirements_failed');
    messages.push(reqCheck.message);
  }

  // 1. Overlap Check with other districts
  const otherDistricts = existingDistricts.filter(d => d.id !== currentDistrict.id);
  for (const other of otherDistricts) {
    try {
      const intersection = turf.intersect(turf.featureCollection([expansionPolygon, other.polygon]));
      if (intersection && turf.area(intersection) > 5) {
        blockedReasons.push('overlaps_existing_district');
        messages.push('Se solapa con otro distrito');
        break;
      }
    } catch (e) {
      console.warn("Intersection check failed", e);
    }
  }

  // 2. Playable Area Check
  const centroid = turf.centroid(expansionPolygon);
  const [lng, lat] = centroid.geometry.coordinates;
  const inPlayableArea = lat >= 10.35 && lat <= 10.50 && lng >= -75.60 && lng <= -75.45;
  if (!inPlayableArea) {
    blockedReasons.push('not_enough_valid_land');
    messages.push('Fuera del área jugable');
  }

  // 3. Water and Wetland Pixel Validation
  const visualCheck = await validatePolygonAgainstVisualWater(expansionPolygon, false);


  if (visualCheck.waterPixelCount > 2) {
    blockedReasons.push('expansion_hits_water');
    messages.push('No puedes ampliar hacia agua o humedal');
  }

  if (visualCheck.wetlandPixelCount > 2) {
    blockedReasons.push('expansion_hits_wetland');
    messages.push('No puedes ampliar hacia agua o humedal');
  }

  if (visualCheck.mangrovePixelCount > 2) {
    blockedReasons.push('terrain_is_wetland_or_mangrove');
    messages.push('Esta zona parece inundable');
  }

  const valid = blockedReasons.length === 0;

  return {
    valid,
    blockedReasons,
    messages: messages.length > 0 ? messages : ['Válido'],
    visualCheck
  };
}

/**
 * Calculates a safe point inside the polygon for placing the main building icon.
 * Ensures the point is not in water and is strictly inside the polygon.
 * 
 * @param {object} polygon - GeoJSON Feature or Geometry
 * @returns {Promise<Array>} [lat, lng] coordinates
 */
export async function findSafeMainBuildingPoint(polygon) {
  const c = turf.centroid(polygon);
  const ptCoord = c.geometry.coordinates; // [lng, lat]
  
  const inside = turf.booleanPointInPolygon(c, polygon);
  
  if (inside) {
    // Check if centroid is dry (buffer it slightly to sample surrounding pixels)
    const check = await validatePolygonAgainstVisualWater(turf.buffer(c, 0.005, { units: 'kilometers' }), false);
    if (check.waterPixelCount <= 1 && check.wetlandPixelCount <= 1) {
      return [ptCoord[1], ptCoord[0]]; // Return [lat, lng] for Leaflet
    }
  }

  // 2. Centroid is outside or wet. Try pointOnFeature (guaranteed inside)
  const onFeature = turf.pointOnFeature(polygon);
  const onFeatureCoord = onFeature.geometry.coordinates;
  const checkOnFeature = await validatePolygonAgainstVisualWater(turf.buffer(onFeature, 0.005, { units: 'kilometers' }), false);
  if (checkOnFeature.waterPixelCount <= 1 && checkOnFeature.wetlandPixelCount <= 1) {
    return [onFeatureCoord[1], onFeatureCoord[0]];
  }

  // 3. Fallback: sample a point grid inside the polygon to find the driest spot close to the centroid
  const bbox = turf.bbox(polygon);
  const grid = turf.pointGrid(bbox, 0.015, { units: 'kilometers' }); // 15m grid
  const candidates = [];
  
  for (const f of grid.features) {
    if (turf.booleanPointInPolygon(f, polygon)) {
      const checkPt = await validatePolygonAgainstVisualWater(turf.buffer(f, 0.005, { units: 'kilometers' }), false);
      candidates.push({
        coord: f.geometry.coordinates,
        water: checkPt.waterPixelCount,
        wetland: checkPt.wetlandPixelCount,
        dist: turf.distance(f, c)
      });
    }
  }

  if (candidates.length > 0) {
    // Sort dry first, then by minimum water/wetland, then by distance to centroid
    candidates.sort((a, b) => {
      const aDry = (a.water === 0 && a.wetland === 0) ? 0 : 1;
      const bDry = (b.water === 0 && b.wetland === 0) ? 0 : 1;
      if (aDry !== bDry) return aDry - bDry;
      
      const aScore = a.water + a.wetland;
      const bScore = b.water + b.wetland;
      if (aScore !== bScore) return aScore - bScore;
      
      return a.dist - b.dist;
    });
    
    const best = candidates[0].coord;
    return [best[1], best[0]]; // [lat, lng]
  }

  // Ultimate fallback
  return [onFeatureCoord[1], onFeatureCoord[0]];
}

