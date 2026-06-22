import buildingsConfig from '../data/buildings_config.json';

/**
 * Helper to calculate level based on workers count and config thresholds.
 */
export function getLevelFromWorkers(type, workers) {
  const config = buildingsConfig[type];
  if (!config || !config.levels) return 1;
  
  const levelKeys = Object.keys(config.levels).sort((a, b) => parseInt(a) - parseInt(b));
  for (const k of levelKeys) {
    if (workers <= config.levels[k].maxWorkers) {
      return parseInt(k);
    }
  }
  return parseInt(levelKeys[levelKeys.length - 1]);
}

/**
 * Calculates all gameplay stats for a given district type and area.
 * 
 * @param {string} type - Building type (e.g. 'hacienda')
 * @param {number} areaM2 - District area in square meters
 * @param {number} assignedWorkers - Current workers assigned
 * @param {number} forceLevel - Force a specific level (optional)
 * @param {Array} existingDistricts - Array of existing customDistricts in the city (for warnings)
 * @returns {object} Calculated stats
 */
export function calculateDistrictStats(type, areaM2, assignedWorkers = null, forceLevel = null, existingDistricts = []) {
  const config = buildingsConfig[type] || {
    name: type,
    workerAreaFactor: 80,
    populationAreaFactor: 150,
    visual: { icon: '📍', fillColor: '#ccc', strokeColor: '#999' }
  };

  // 1. Worker count
  const workerFactor = config.workerAreaFactor || 80;
  const workersRequired = Math.max(10, Math.floor(areaM2 / workerFactor));
  const currentAssigned = assignedWorkers !== null ? assignedWorkers : workersRequired;

  // 2. Determine Level
  const calculatedLevel = getLevelFromWorkers(type, currentAssigned);
  const level = forceLevel !== null ? forceLevel : calculatedLevel;

  // 3. Get Level Config
  const levelKeys = Object.keys(config.levels || {});
  const maxLevel = levelKeys.length > 0 ? Math.max(...levelKeys.map(k => parseInt(k))) : 1;
  const currentLevelKey = Math.min(level, maxLevel).toString();
  const levelConfig = config.levels ? config.levels[currentLevelKey] : null;

  const levelTitle = levelConfig ? levelConfig.title : `Nivel ${level}`;
  const levelRoman = ['I', 'II', 'III', 'IV', 'V'][level - 1] || level.toString();

  // 4. Efficiency
  const efficiencyScore = workersRequired > 0 
    ? Math.min(1.0, currentAssigned / workersRequired) 
    : 1.0;

  // 5. Production & Consumption
  let productionKey = config.resourceProduced || 'goods';
  const productionList = [];
  const consumptionList = [];

  const getSpanishLabel = (key) => {
    const labels = {
      gold: 'oro',
      wood: 'madera',
      materials: 'materiales',
      goods: 'bienes',
      sails: 'velas',
      spareParts: 'repuestos',
      crew: 'tripulación',
      weapons: 'armas'
    };
    return labels[key] || key;
  };

  if (levelConfig && levelConfig.baseProduction) {
    for (const [resId, val] of Object.entries(levelConfig.baseProduction)) {
      const rate = Math.max(1, Math.round(val * efficiencyScore));
      productionList.push({
        key: resId,
        rate,
        label: getSpanishLabel(resId)
      });
    }
  }

  if (levelConfig && levelConfig.baseConsumption) {
    for (const [resId, val] of Object.entries(levelConfig.baseConsumption)) {
      const rate = Math.max(1, Math.round(val * efficiencyScore));
      consumptionList.push({
        key: resId,
        rate,
        label: getSpanishLabel(resId)
      });
    }
  }

  // Fallback if empty and productionPerM2 exists
  if (productionList.length === 0 && config.productionPerM2) {
    const pKeys = Object.keys(config.productionPerM2);
    if (pKeys.length > 0) {
      const factor = config.productionPerM2[pKeys[0]];
      const rawProd = areaM2 * factor * 0.03;
      const rate = Math.max(1, Math.round(rawProd * efficiencyScore));
      productionList.push({
        key: pKeys[0],
        rate,
        label: getSpanishLabel(pKeys[0])
      });
    }
  }

  const primaryProd = productionList[0] || { key: productionKey, rate: 0, label: getSpanishLabel(productionKey) };

  // 6. Maintenance
  let maintenanceGold = 0;
  if (levelConfig && levelConfig.maintenance) {
    maintenanceGold = levelConfig.maintenance.gold || levelConfig.maintenance.goldPerCycle || 0;
  } else {
    // Fallback formula
    maintenanceGold = type === 'cabildo' ? 10 : Math.max(1, Math.round(areaM2 * 0.00018));
  }

  // 7. Population Capacity
  const popFactor = config.populationAreaFactor || 150;
  const populationCapacity = Math.floor(areaM2 / popFactor);

  // 8. Warning & Dependency checks (derived from city districts)
  let warning = null;
  
  if (type === 'hacienda') {
    const hasCamino = existingDistricts.some(d => d.type === 'camino' && d.status === 'operational');
    if (!hasCamino) {
      warning = 'Necesita Camino Interior para exportar más';
    }
  } else if (type === 'aduana') {
    const hasAlmacen = existingDistricts.some(d => d.type === 'almacen' && d.status === 'operational');
    if (!hasAlmacen) {
      warning = 'Necesita Almacenes para aumentar comercio';
    }
  } else if (type === 'puerto') {
    const hasArsenal = existingDistricts.some(d => d.type === 'arsenal' && d.status === 'operational');
    if (!hasArsenal) {
      warning = 'Necesita Arsenal para rutas protegidas';
    }
  } else if (type === 'arsenal') {
    const hasGremio = existingDistricts.some(d => d.type === 'gremio' && d.status === 'operational');
    if (!hasGremio) {
      warning = 'Necesita Gremio para mejorar producción naval';
    }
  } else if (type === 'fortaleza') {
    if (level < 3) {
      warning = 'Protección insuficiente para convoyes grandes';
    }
  }

  // 9. Determine visual scale label
  let levelLabel = 'Pequeña';
  if (level >= 4) levelLabel = 'Grande';
  else if (level >= 2) levelLabel = 'Mediana';

  return {
    level,
    levelTitle,
    levelRoman,
    levelLabel,
    workersRequired,
    assignedWorkers: currentAssigned,
    populationCapacity,
    efficiencyScore,
    production: {
      key: primaryProd.key,
      rate: primaryProd.rate,
      label: primaryProd.label,
      rates: productionList,
      consumptions: consumptionList
    },
    maintenance: {
      goldPerDay: maintenanceGold
    },
    warning,
    areaUsedM2: areaM2
  };
}
