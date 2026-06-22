import React, { createContext, useContext, useState, useEffect } from 'react';
import { runEconomyTick, applyOfflineProgress, getActiveBalanceConfig } from '../../engines/economy/economyEngine';
import captainsConfig from '../../config/captains_config.json';

const GameContext = createContext();

const INITIAL_STATE = {
  resources: {
    gold: 5000,
    wood: 2000,
    materials: 500,
    goods: 0,
    crew: 40,
    sails: 0,
    cannons: 0,
    gunpowder: 0,
    sugar: 0,
    tobacco: 0,
    cocoa: 0,
    coffee: 0,
    cotton: 0,
    grain: 0,
    leather: 0,
    salt: 0
  },
  storage: {
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
  },
  population: {
    total: 120,
    capacity: 150,
    freeWorkers: 120,
    assignedWorkers: 0,
    growthRate: 0
  },
  economy: {
    cycleLengthMs: 10000,
    lastTickAt: 0,
    netBalance: {},
    grossProduction: {},
    grossConsumption: {},
    storageLosses: {},
    warnings: []
  },
  customDistricts: [],
  customLinearStructures: [],
  cabildoLevel: 1,
  cityId: 'port_001',
  research: {
    unlocked: [],
    activeResearch: null, // { id, endsAt }
    completedResearch: []
  },
  fleet: {
    ships: [], // { id, type, name, captainId, upgrades: [] }
    shipsUnderConstruction: [] // { id, type, name, endsAt }
  },
  bank: {
    loans: [], // { id, amount, interestRate, remainingDebt, dueAt }
    creditScore: 100,
    debtTotal: 0
  },
  cityLife: {
    morale: 70,
    stability: 70,
    health: 70,
    order: 70
  },
  captains: {
    available: captainsConfig.map(c => ({ ...c })),
    hired: []
  }
};

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState(() => {
    const saved = localStorage.getItem('naval_game_clean_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Migrate old resources
        if (parsed.resources && parsed.resources.materials === undefined) {
          parsed.resources = { ...INITIAL_STATE.resources, ...parsed.resources };
          parsed.storage = { ...INITIAL_STATE.storage, ...parsed.storage };
        }
        
        // Add default specialized crop resources if missing
        if (parsed.resources && parsed.resources.sugar === undefined) {
          parsed.resources = { ...INITIAL_STATE.resources, ...parsed.resources };
          parsed.storage = { ...INITIAL_STATE.storage, ...parsed.storage };
        }

        if (!parsed.population) {
          parsed.population = { ...INITIAL_STATE.population };
        }
        if (!parsed.economy) {
          parsed.economy = { ...INITIAL_STATE.economy };
        }
        if (!parsed.research) {
          parsed.research = { ...INITIAL_STATE.research };
        }
        if (!parsed.fleet) {
          parsed.fleet = { ...INITIAL_STATE.fleet };
        }
        if (!parsed.bank) {
          parsed.bank = { ...INITIAL_STATE.bank };
        }
        if (!parsed.cityLife) {
          parsed.cityLife = { ...INITIAL_STATE.cityLife };
        }
        if (parsed.customLinearStructures === undefined) {
          parsed.customLinearStructures = [];
        }
        if (!parsed.captains || !parsed.captains.available || parsed.captains.available.length === 0) {
          parsed.captains = {
            available: captainsConfig.map(c => ({ ...c })),
            hired: parsed.captains?.hired || []
          };
        }
        return parsed;
      } catch (e) {
        console.error("Error loading save", e);
      }
    }
    return INITIAL_STATE;
  });

  const [planningMode, setPlanningMode] = useState({
    active: false,
    mode: null,
    buildingType: null,
    targetWorkers: 0,
    targetAreaM2: 0,
  });

  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [isListOpen, setIsListOpen] = useState(false);

  // Apply offline progress on mount and start tick loop
  useEffect(() => {
    if (!window.offlineProgressApplied) {
      window.offlineProgressApplied = true;
      setGameState(prev => {
        return applyOfflineProgress(prev);
      });
    }

    const activeConfig = getActiveBalanceConfig();
    const interval = setInterval(() => {
      setGameState(prev => {
        return runEconomyTick(prev);
      });
    }, activeConfig.economyCycleMs);

    return () => clearInterval(interval);
  }, []);

  // Persist state
  useEffect(() => {
    localStorage.setItem('naval_game_clean_state', JSON.stringify(gameState));
  }, [gameState]);

  const resetGame = () => {
    setGameState(INITIAL_STATE);
    setSelectedDistrictId(null);
    setIsListOpen(false);
  };

  const hasResources = (cost) => {
    for (const [resId, amount] of Object.entries(cost)) {
      if ((gameState.resources[resId] || 0) < amount) {
        return false;
      }
    }
    return true;
  };

  const deductResources = (cost) => {
    let success = true;
    const missing = [];
    for (const [resId, amount] of Object.entries(cost)) {
      if ((gameState.resources[resId] || 0) < amount) {
        success = false;
        missing.push(resId);
      }
    }

    if (!success) {
      return { success: false, missing };
    }

    setGameState(prev => {
      const nextResources = { ...prev.resources };
      for (const [resId, amount] of Object.entries(cost)) {
        nextResources[resId] = (nextResources[resId] || 0) - amount;
      }
      return {
        ...prev,
        resources: nextResources
      };
    });

    return { success: true, missing: [] };
  };

  // 1. Research Action
  const startResearch = (researchId, cost, durationBaseSec) => {
    const deducted = deductResources(cost);
    if (!deducted.success) return { success: false, reason: 'Recursos insuficientes' };

    setGameState(prev => {
      const activeConfig = getActiveBalanceConfig();
      // Apply constructionTimeMultiplier to research duration
      const durationMultiplier = activeConfig.constructionTimeMultiplier ?? 1.0;
      const actualDurationMs = durationBaseSec * 1000 * durationMultiplier;
      return {
        ...prev,
        research: {
          ...prev.research,
          activeResearch: {
            id: researchId,
            endsAt: Date.now() + actualDurationMs
          }
        }
      };
    });
    return { success: true };
  };

  // 2. Astillero Shipbuilding Action
  const buildShip = (shipType, cost, durationBaseSec) => {
    const deducted = deductResources(cost);
    if (!deducted.success) return { success: false, reason: 'Recursos insuficientes' };

    setGameState(prev => {
      const activeConfig = getActiveBalanceConfig();
      const durationMultiplier = activeConfig.constructionTimeMultiplier ?? 1.0;
      const actualDurationMs = durationBaseSec * 1000 * durationMultiplier;
      const newShipUnderConst = {
        id: 'ship_uc_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type: shipType,
        name: shipType.charAt(0).toUpperCase() + shipType.slice(1) + ' ' + (prev.fleet.ships.length + prev.fleet.shipsUnderConstruction.length + 1),
        endsAt: Date.now() + actualDurationMs
      };
      return {
        ...prev,
        fleet: {
          ...prev.fleet,
          shipsUnderConstruction: [...prev.fleet.shipsUnderConstruction, newShipUnderConst]
        }
      };
    });
    return { success: true };
  };

  // 3. Astillero Upgrade Action
  const applyShipUpgrade = (shipId, upgradeId, cost) => {
    const deducted = deductResources(cost);
    if (!deducted.success) return { success: false, reason: 'Recursos insuficientes' };

    setGameState(prev => {
      const updatedShips = prev.fleet.ships.map(s => {
        if (s.id === shipId) {
          const upgrades = s.upgrades || [];
          if (upgrades.includes(upgradeId)) return s;
          return {
            ...s,
            upgrades: [...upgrades, upgradeId]
          };
        }
        return s;
      });
      return {
        ...prev,
        fleet: {
          ...prev.fleet,
          ships: updatedShips
        }
      };
    });
    return { success: true };
  };

  // 4. Bank Actions
  const takeLoan = (amount, interestRate, termCycles) => {
    setGameState(prev => {
      const newLoan = {
        id: 'loan_' + Date.now(),
        amount,
        interestRate,
        remainingDebt: Math.round(amount * (1 + interestRate)),
        dueAt: Date.now() + (termCycles * 10000)
      };
      const nextResources = { ...prev.resources };
      nextResources.gold = (nextResources.gold || 0) + amount;
      return {
        ...prev,
        resources: nextResources,
        bank: {
          ...prev.bank,
          loans: [...prev.bank.loans, newLoan],
          debtTotal: prev.bank.debtTotal + newLoan.remainingDebt
        }
      };
    });
  };

  const payLoan = (loanId) => {
    let success = false;
    setGameState(prev => {
      const loan = prev.bank.loans.find(l => l.id === loanId);
      if (!loan) return prev;
      if ((prev.resources.gold || 0) < loan.remainingDebt) return prev;

      success = true;
      const nextResources = { ...prev.resources };
      nextResources.gold = nextResources.gold - loan.remainingDebt;
      const remainingLoans = prev.bank.loans.filter(l => l.id !== loanId);
      const newDebtTotal = remainingLoans.reduce((sum, l) => sum + l.remainingDebt, 0);

      return {
        ...prev,
        resources: nextResources,
        bank: {
          ...prev.bank,
          loans: remainingLoans,
          debtTotal: newDebtTotal
        }
      };
    });
    return success;
  };

  // 5. Captains Actions
  const hireCaptain = (captainId) => {
    let success = false;
    let reason = '';
    setGameState(prev => {
      const cap = prev.captains.available.find(c => c.id === captainId);
      if (!cap) {
        reason = 'Capitán no disponible';
        return prev;
      }
      for (const [resId, amt] of Object.entries(cap.cost)) {
        if ((prev.resources[resId] || 0) < amt) {
          reason = `Faltan recursos: ${resId}`;
          return prev;
        }
      }

      success = true;
      const nextResources = { ...prev.resources };
      for (const [resId, amt] of Object.entries(cap.cost)) {
        nextResources[resId] = nextResources[resId] - amt;
      }

      const updatedAvailable = prev.captains.available.filter(c => c.id !== captainId);
      const hiredCap = { ...cap, hiredAt: Date.now(), assignedShipId: null };

      return {
        ...prev,
        resources: nextResources,
        captains: {
          available: updatedAvailable,
          hired: [...prev.captains.hired, hiredCap]
        }
      };
    });
    return { success, reason };
  };

  const assignCaptainToShip = (shipId, captainId) => {
    setGameState(prev => {
      const updatedShips = prev.fleet.ships.map(s => {
        if (s.id === shipId) {
          return { ...s, captainId };
        }
        if (captainId && s.captainId === captainId) {
          return { ...s, captainId: null }; // remove from previous ship
        }
        return s;
      });

      const updatedHired = prev.captains.hired.map(c => {
        if (c.id === captainId) {
          return { ...c, assignedShipId: shipId };
        }
        if (c.assignedShipId === shipId) {
          return { ...c, assignedShipId: null }; // clear other assignment
        }
        return c;
      });

      return {
        ...prev,
        fleet: {
          ...prev.fleet,
          ships: updatedShips
        },
        captains: {
          ...prev.captains,
          hired: updatedHired
        }
      };
    });
  };

  // 6. Hacienda Specialization Action
  const specializePlantation = (districtId, specKey) => {
    setGameState(prev => {
      const updatedDistricts = prev.customDistricts.map(d => {
        if (d.id === districtId) {
          return {
            ...d,
            specialization: specKey
          };
        }
        return d;
      });
      return {
        ...prev,
        customDistricts: updatedDistricts
      };
    });
  };

  const addDistrict = (district) => {
    setGameState(prev => ({
      ...prev,
      customDistricts: [...prev.customDistricts, district]
    }));
  };

  return (
    <GameContext.Provider value={{
      gameState,
      setGameState,
      resetGame,
      planningMode,
      setPlanningMode,
      deductResources,
      hasResources,
      addDistrict,
      selectedDistrictId,
      setSelectedDistrictId,
      isListOpen,
      setIsListOpen,
      startResearch,
      buildShip,
      applyShipUpgrade,
      takeLoan,
      payLoan,
      hireCaptain,
      assignCaptainToShip,
      specializePlantation
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
