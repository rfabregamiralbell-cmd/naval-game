import buildingsConfig from '../data/buildings_config.json';
import balanceConfig from '../data/balance_config.json';
import { calculateDistrictStats } from './districtStats';

/**
 * Returns the currently active balance config based on the selected mode in balance_config.json
 */
export function getActiveBalanceConfig() {
  const mode = balanceConfig.mode || 'testing';
  return {
    mode,
    ...balanceConfig[mode]
  };
}

/**
 * Calculates storage capacity limits for all resources based on built and operational Almacenes.
 */
export function calculateStorageCapacity(gameState) {
  const baseLimits = {
    wood: 3000,
    materials: 1000,
    goods: 500,
    sails: 100,
    cannons: 50,
    gunpowder: 200,
    sugar: 1000,
    tobacco: 1000,
    cocoa: 1000,
    coffee: 1000,
    cotton: 1000,
    grain: 1000,
    leather: 1000,
    salt: 1000
  };

  const districts = gameState.customDistricts || [];
  const almacenes = districts.filter(d => d.type === 'almacen' && d.status === 'operational');

  // Sum storage bonuses
  almacenes.forEach(d => {
    const stats = calculateDistrictStats(d.type, d.areaM2, d.assignedWorkers, d.level, districts);
    const efficiency = stats.efficiencyScore; // 0 to 1
    
    // Level specific storage additions
    let bonus = { wood: 0, materials: 0, goods: 0, sails: 0, cannons: 0, gunpowder: 0, sugar: 0, tobacco: 0, cocoa: 0, coffee: 0, cotton: 0, grain: 0, leather: 0, salt: 0 };
    if (d.level === 1) {
      bonus = { wood: 500, materials: 250, goods: 500, sails: 50, cannons: 25, gunpowder: 100, sugar: 500, tobacco: 500, cocoa: 500, coffee: 500, cotton: 500, grain: 500, leather: 500, salt: 500 };
    } else if (d.level === 2) {
      bonus = { wood: 1200, materials: 600, goods: 1200, sails: 120, cannons: 60, gunpowder: 240, sugar: 1200, tobacco: 1200, cocoa: 1200, coffee: 1200, cotton: 1200, grain: 1200, leather: 1200, salt: 1200 };
    } else if (d.level === 3) {
      bonus = { wood: 2500, materials: 1200, goods: 2500, sails: 250, cannons: 120, gunpowder: 500, sugar: 2500, tobacco: 2500, cocoa: 2500, coffee: 2500, cotton: 2500, grain: 2500, leather: 2500, salt: 2500 };
    } else if (d.level === 4) {
      bonus = { wood: 5000, materials: 2500, goods: 5000, sails: 500, cannons: 250, gunpowder: 1000, sugar: 5000, tobacco: 5000, cocoa: 5000, coffee: 5000, cotton: 5000, grain: 5000, leather: 5000, salt: 5000 };
    } else if (d.level === 5) {
      bonus = { wood: 12000, materials: 6000, goods: 12000, sails: 1200, cannons: 600, gunpowder: 2500, sugar: 12000, tobacco: 12000, cocoa: 12000, coffee: 12000, cotton: 12000, grain: 12000, leather: 12000, salt: 12000 };
    }

    for (const [resId, amt] of Object.entries(bonus)) {
      if (baseLimits[resId] !== undefined) {
        baseLimits[resId] += Math.round(amt * efficiency);
      }
    }
  });

  return baseLimits;
}

/**
 * Runs a single tick of the economy (1 cycle).
 */
export function runEconomyTick(gameState) {
  // Clone state
  const state = JSON.parse(JSON.stringify(gameState));
  const districts = state.customDistricts || [];
  const activeConfig = getActiveBalanceConfig();

  // 0. Update ongoing Research & Shipbuilding
  if (state.research && state.research.activeResearch) {
    if (Date.now() >= state.research.activeResearch.endsAt) {
      state.research.completedResearch = [...(state.research.completedResearch || []), state.research.activeResearch.id];
      state.research.activeResearch = null;
    }
  }

  if (state.fleet && state.fleet.shipsUnderConstruction) {
    const finishedUC = state.fleet.shipsUnderConstruction.filter(s => Date.now() >= s.endsAt);
    if (finishedUC.length > 0) {
      const remainingUC = state.fleet.shipsUnderConstruction.filter(s => Date.now() < s.endsAt);
      const newShips = finishedUC.map(s => ({
        id: s.id,
        type: s.type,
        name: s.name,
        captainId: null,
        upgrades: []
      }));
      state.fleet.ships = [...(state.fleet.ships || []), ...newShips];
      state.fleet.shipsUnderConstruction = remainingUC;
    }
  }

  // 1. Calculate limits
  const storageLimits = calculateStorageCapacity(state);

  // 2. Population capacity calculation (Base 50 + residential capacity from operational districts)
  let capacity = 50;
  districts.forEach(d => {
    if (d.status === 'operational') {
      const stats = calculateDistrictStats(d.type, d.areaM2, d.assignedWorkers, d.level, districts);
      capacity += stats.populationCapacity;
    }
  });

  // Grow/Decline population with config multiplier
  const baseGrowth = 1;
  let growthPerCycle = baseGrowth * activeConfig.populationGrowthMultiplier;
  
  // Apply health penalty: health <= 40 reduces growth by 50%
  const health = state.cityLife?.health ?? 70;
  if (health <= 40) {
    growthPerCycle = Math.round(growthPerCycle * 0.5);
  }
  
  let popTotal = state.population?.total ?? 120;
  if (popTotal < capacity) {
    popTotal = Math.min(capacity, popTotal + growthPerCycle);
  } else if (popTotal > capacity) {
    popTotal = Math.max(capacity, popTotal - growthPerCycle);
  }

  // 3. Demographics & Worker clamps (anti-exploit: total assigned workers cannot exceed population)
  let totalAssigned = districts.reduce((acc, curr) => {
    if (curr.status === 'operational') {
      return acc + Math.max(0, curr.assignedWorkers ?? 0);
    }
    return acc;
  }, 0);

  if (totalAssigned > popTotal) {
    let excess = totalAssigned - popTotal;
    for (const d of districts) {
      if (excess <= 0) break;
      if (d.status === 'operational' && (d.assignedWorkers || 0) > 0) {
        const reduce = Math.min(d.assignedWorkers, excess);
        d.assignedWorkers -= reduce;
        excess -= reduce;
      }
    }
    totalAssigned = districts.reduce((acc, curr) => {
      if (curr.status === 'operational') {
        return acc + (curr.assignedWorkers ?? 0);
      }
      return acc;
    }, 0);
  }

  const freeWorkers = Math.max(0, popTotal - totalAssigned);

  state.population = {
    total: popTotal,
    capacity,
    freeWorkers,
    assignedWorkers: totalAssigned,
    growthRate: popTotal < capacity ? growthPerCycle : 0
  };

  // 4. Run production/consumption
  const grossProduction = {};
  const grossConsumption = {};
  const maintenance = { gold: 0 };
  const storageLosses = {};
  const economyWarnings = [];

  // Infrastructures state
  const hasCamino = districts.some(d => d.type === 'camino' && d.status === 'operational');
  const hasGremio = districts.some(d => d.type === 'gremio' && d.status === 'operational');
  const hasAduana = districts.some(d => d.type === 'aduana' && d.status === 'operational');

  // Process outputs/maintenance for operational districts only (status === 'operational')
  districts.forEach(d => {
    if (d.status !== 'operational') {
      return;
    }

    const stats = calculateDistrictStats(d.type, d.areaM2, d.assignedWorkers, d.level, districts);
    const efficiency = stats.efficiencyScore;

    // Maintenance cost
    const maint = stats.maintenance?.goldPerDay || 0;
    maintenance.gold += maint;

    // Morale effects
    const morale = state.cityLife?.morale ?? 70;
    let finalProdMultiplier = activeConfig.productionMultiplier;
    if (morale >= 80) {
      finalProdMultiplier *= 1.1; // +10% production
    } else if (morale <= 40) {
      finalProdMultiplier *= 0.9; // -10% production
    }

    // Production calculation scaled by finalProdMultiplier
    if (d.type === 'hacienda') {
      let prodGoods = stats.production?.rates?.find(r => r.key === 'goods')?.rate || 0;
      if (!hasCamino) {
        prodGoods = Math.round(prodGoods * 0.6);
        economyWarnings.push("Hacienda necesita Camino Interior");
      }

      // Check if research "rotacion_cultivos" is completed
      const hasRotacion = state.research?.completedResearch?.includes('rotacion_cultivos');
      let haciendaMultiplier = finalProdMultiplier;
      if (hasRotacion) {
        haciendaMultiplier *= 1.1; // +10% net bonus
      }

      const finalProd = Math.round(prodGoods * haciendaMultiplier);

      if (d.specialization) {
        // Output specialized resource instead of goods
        const specKey = d.specialization;
        grossProduction[specKey] = (grossProduction[specKey] || 0) + finalProd;
      } else {
        grossProduction.goods = (grossProduction.goods || 0) + finalProd;
      }
    } 
    else if (d.type === 'gremio') {
      const prodWood = stats.production?.rates?.find(r => r.key === 'wood')?.rate || 0;
      const prodMat = stats.production?.rates?.find(r => r.key === 'materials')?.rate || 0;
      grossProduction.wood = (grossProduction.wood || 0) + Math.round(prodWood * finalProdMultiplier);
      grossProduction.materials = (grossProduction.materials || 0) + Math.round(prodMat * finalProdMultiplier);
    }
    else if (d.type === 'arsenal') {
      let prodSails = stats.production?.rates?.find(r => r.key === 'sails')?.rate || 0;
      let prodSpare = stats.production?.rates?.find(r => r.key === 'spareParts')?.rate || 0;
      if (!hasGremio) {
        prodSails = Math.round(prodSails * 0.5);
        prodSpare = Math.round(prodSpare * 0.5);
        economyWarnings.push("Arsenal necesita Gremio");
      }
      grossProduction.sails = (grossProduction.sails || 0) + Math.round(prodSails * finalProdMultiplier);
      grossProduction.spareParts = (grossProduction.spareParts || 0) + Math.round(prodSpare * finalProdMultiplier);
    }
    else if (d.type === 'puerto') {
      if (!hasAduana) {
        economyWarnings.push("Puerto necesita Aduana");
      }
    }
  });

  // Process Aduana input-goods consumption and gold-output transformation (operational only)
  const aduanas = districts.filter(d => d.type === 'aduana' && d.status === 'operational');
  let availableGoods = (state.resources?.goods || 0) + (grossProduction.goods || 0);

  aduanas.forEach(d => {
    const stats = calculateDistrictStats(d.type, d.areaM2, d.assignedWorkers, d.level, districts);
    const efficiency = stats.efficiencyScore;
    
    // Required goods consumption scaled by productionMultiplier
    const config = buildingsConfig.aduana;
    const currentLvlKey = Math.min(d.level || 1, 5).toString();
    const baseConsumption = config.levels[currentLvlKey]?.baseConsumption?.goods || 0;
    const baseGoldProd = config.levels[currentLvlKey]?.baseProduction?.gold || 0;

    const requiredGoods = Math.round(baseConsumption * efficiency * activeConfig.productionMultiplier);
    let goldProdMax = Math.round(baseGoldProd * efficiency * activeConfig.productionMultiplier);

    // Apply "contabilidad_mercantil" research (+10% gold output)
    const hasContabilidad = state.research?.completedResearch?.includes('contabilidad_mercantil');
    if (hasContabilidad) {
      goldProdMax = Math.round(goldProdMax * 1.1);
    }

    if (requiredGoods > 0) {
      const consumedGoods = Math.min(availableGoods, requiredGoods);
      const ratio = consumedGoods / requiredGoods;
      const goldProduced = Math.round(goldProdMax * ratio);

      availableGoods -= consumedGoods;
      grossConsumption.goods = (grossConsumption.goods || 0) + consumedGoods;
      grossProduction.gold = (grossProduction.gold || 0) + goldProduced;

      if (ratio < 1.0) {
        economyWarnings.push("Aduana sin bienes suficientes");
      }
    } else {
      if (efficiency === 0) {
        economyWarnings.push("Aduana sin trabajadores");
      }
    }
  });

  // 5. Update state resources
  state.resources = state.resources || {};
  
  // Deduct maintenance gold
  state.resources.gold = (state.resources.gold || 0) - maintenance.gold;

  // Apply productions & consumptions
  for (const [resId, amt] of Object.entries(grossProduction)) {
    state.resources[resId] = (state.resources[resId] || 0) + amt;
  }
  for (const [resId, amt] of Object.entries(grossConsumption)) {
    state.resources[resId] = (state.resources[resId] || 0) - amt;
  }

  // Anti-exploit: clamp all resources to Math.max(0, val) to prevent negative stockpiles
  for (const resId of Object.keys(state.resources)) {
    state.resources[resId] = Math.max(0, state.resources[resId]);
  }

  // 6. Apply storage limits and caps
  let saturated = false;
  for (const [resId, limit] of Object.entries(storageLimits)) {
    const current = state.resources[resId] || 0;
    if (current > limit) {
      saturated = true;
      const loss = current - limit;
      storageLosses[resId] = loss;
      state.resources[resId] = limit;
    }
  }

  if (saturated) {
    economyWarnings.push("Almacenes saturados");
  }

  // General demographics checks
  const totalRequired = districts.reduce((acc, curr) => {
    if (curr.status === 'operational') {
      const stats = calculateDistrictStats(curr.type, curr.areaM2, curr.assignedWorkers, curr.level, districts);
      return acc + stats.workersRequired;
    }
    return acc;
  }, 0);

  if (totalAssigned < totalRequired && popTotal >= capacity) {
    economyWarnings.push("Faltan trabajadores");
  }

  // General city life order checks
  const order = state.cityLife?.order ?? 70;
  if (order <= 40) {
    economyWarnings.push("Riesgo inminente de disturbios populares");
  }

  // 7. Update net balances and economy logs
  const netBalance = {};
  const allResourceKeys = new Set([
    ...Object.keys(grossProduction),
    ...Object.keys(grossConsumption),
    ...Object.keys(storageLosses),
    'gold'
  ]);

  allResourceKeys.forEach(resId => {
    let produced = grossProduction[resId] || 0;
    let consumed = grossConsumption[resId] || 0;
    let lost = storageLosses[resId] || 0;
    let maint = resId === 'gold' ? maintenance.gold : 0;
    netBalance[resId] = produced - consumed - lost - maint;
  });

  // Filter warnings to keep unique entries
  const uniqueWarnings = [...new Set(economyWarnings)];

  state.economy = {
    cycleLengthMs: activeConfig.economyCycleMs,
    lastTickAt: Date.now(),
    netBalance,
    grossProduction,
    grossConsumption,
    storageLosses,
    warnings: uniqueWarnings
  };

  return state;
}

/**
 * Handles offline production and completes overdue constructions.
 */
export function applyOfflineProgress(gameState) {
  if (!gameState.economy || !gameState.economy.lastTickAt) {
    const activeConfig = getActiveBalanceConfig();
    return {
      ...gameState,
      economy: {
        ...(gameState.economy || {}),
        cycleLengthMs: activeConfig.economyCycleMs,
        lastTickAt: Date.now(),
        netBalance: {},
        grossProduction: {},
        grossConsumption: {},
        storageLosses: {},
        warnings: []
      }
    };
  }

  let state = JSON.parse(JSON.stringify(gameState));
  const elapsedMs = Date.now() - state.economy.lastTickAt;
  const activeConfig = getActiveBalanceConfig();
  const cycleLengthMs = state.economy.cycleLengthMs || activeConfig.economyCycleMs;
  let cycles = Math.floor(elapsedMs / cycleLengthMs);

  if (cycles <= 0) return state;

  // Cap offline simulation cycles from config
  cycles = Math.min(activeConfig.offlineMaxCycles, cycles);
  console.log(`[Offline Progress] Simulating ${cycles} offline economic cycles (mode: ${activeConfig.mode})...`);

  // 1. Complete any overdue constructions, upgrades, researches, and shipbuilding first
  const now = Date.now();
  state.customDistricts = state.customDistricts?.map(d => {
    if ((d.status === 'constructing' || d.status === 'upgrading') && d.constructionEndsAt && now >= d.constructionEndsAt) {
      return { ...d, status: 'operational' };
    }
    return d;
  }) || [];

  if (state.research && state.research.activeResearch && now >= state.research.activeResearch.endsAt) {
    state.research.completedResearch = [...(state.research.completedResearch || []), state.research.activeResearch.id];
    state.research.activeResearch = null;
  }

  if (state.fleet && state.fleet.shipsUnderConstruction) {
    const finishedUC = state.fleet.shipsUnderConstruction.filter(s => now >= s.endsAt);
    if (finishedUC.length > 0) {
      const remainingUC = state.fleet.shipsUnderConstruction.filter(s => now < s.endsAt);
      const newShips = finishedUC.map(s => ({
        id: s.id,
        type: s.type,
        name: s.name,
        captainId: null,
        upgrades: []
      }));
      state.fleet.ships = [...(state.fleet.ships || []), ...newShips];
      state.fleet.shipsUnderConstruction = remainingUC;
    }
  }

  // 2. Sequentially run cycles to compute storage limits and resource depletion accurately
  for (let i = 0; i < cycles; i++) {
    state = runEconomyTick(state);
  }

  // Update lastTickAt to current time
  state.economy.lastTickAt = Date.now();

  return state;
}
