// src/economy/influenceEngine.js

import buildingsConfig from '../../config/buildings_config.json';
import { getLevelFromWorkers } from './districtStats';

const INFLUENCE_TYPES = {
  hacienda: 'production',
  gremio: 'production',
  almacen: 'storage',
  aduana: 'trade',
  mercado: 'trade',
  banco: 'trade',
  puerto: 'naval',
  arsenal: 'naval',
  fortaleza: 'military',
  bateria: 'military',
  muralla: 'military',
  taberna: 'urban',
  iglesia: 'urban',
  hospital: 'urban',
  universidad: 'administration',
  cabildo: 'administration'
};

const INFLUENCE_COLORS = {
  production: '#84cc16', // lime
  storage: '#fbbf24',    // amber
  trade: '#38bdf8',      // light blue
  naval: '#2563eb',      // blue
  military: '#ef4444',   // red
  urban: '#a855f7',      // purple
  administration: '#f472b6' // pink
};

export function calculateDistrictInfluence(district) {
  if (district.status !== 'operational') {
    return {
      radiusMeters: 0,
      strength: 0,
      type: null,
      color: null,
      score: 0
    };
  }

  const typeData = buildingsConfig[district.type];
  if (!typeData) {
    return { radiusMeters: 0, strength: 0, type: null, color: null, score: 0 };
  }

  const influenceType = INFLUENCE_TYPES[district.type] || 'urban';
  const color = INFLUENCE_COLORS[influenceType];
  
  const level = getLevelFromWorkers(district.workers || 0);
  
  // Base radius 100m, expands with level and area
  // We can convert meters to map units later.
  // Assuming a map where distance is in standard units, we'll use a visual radius.
  const baseRadius = 50; 
  const radiusMeters = baseRadius + (level * 25) + ((district.areaM2 || 0) / 200);
  
  const strength = level * 10;
  const score = strength * (radiusMeters / 100);

  return {
    radiusMeters,
    strength,
    type: influenceType,
    color,
    score
  };
}
