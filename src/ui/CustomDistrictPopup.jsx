import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { calculateDistrictStats } from '../economy/districtStats';
import { formatDuration } from '../utils/formatters';
import { getActiveBalanceConfig } from '../economy/economyEngine';
import resourcesConfig from '../data/resources_config.json';
import specConfig from '../data/plantation_specializations_config.json';

const DISTRICT_NAMES = {
  hacienda: 'Hacienda Agrícola',
  gremio: 'Gremio de Artesanos',
  almacen: 'Almacenes de Depósito',
  aduana: 'Aduana',
  puerto: 'Puerto Comercial',
  arsenal: 'Arsenal',
  fortaleza: 'Fortaleza',
  camino: 'Camino Interior',
  cabildo: 'Cabildo'
};

const ICONS = {
  hacienda: '🌾',
  gremio: '⚒️',
  almacen: '📦',
  aduana: '⚖️',
  puerto: '⛵',
  arsenal: '⚓',
  fortaleza: '🏰',
  camino: '🛣️',
  cabildo: '🏛️'
};

export default function CustomDistrictPopup({ districtId, onClose, onStartExpansion }) {
  const { gameState, setGameState, specializePlantation } = useGame();
  
  const district = gameState.customDistricts?.find(d => d.id === districtId);
  
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [districtId]);

  if (!district) return null;

  const timeLeftMs = Math.max(0, (district.constructionEndsAt || 0) - now);

  // Reactively calculate current stats
  const stats = calculateDistrictStats(district.type, district.areaM2, district.assignedWorkers, district.level || 1, gameState.customDistricts);
  const maxStats = calculateDistrictStats(district.type, district.areaM2, stats.workersRequired, district.level || 1, gameState.customDistricts);

  // Calculate refund
  const calculateRefund = () => {
    let totalGold = district.cost?.gold || 0;
    let totalWood = district.cost?.wood || 0;

    if (district.expansions && district.expansions.length > 0) {
      district.expansions.forEach(exp => {
        totalGold += exp.cost?.gold || 0;
        totalWood += exp.cost?.wood || 0;
      });
    }

    return {
      gold: Math.floor(totalGold * 0.3),
      wood: Math.floor(totalWood * 0.3)
    };
  };

  const refund = calculateRefund();

  const [showDemolishConfirm, setShowDemolishConfirm] = useState(false);

  // Handle worker modification
  const handleModifyWorkers = (amount) => {
    const currentAssigned = district.assignedWorkers ?? 0;
    const freeWorkers = gameState.population?.freeWorkers ?? 0;
    
    let newAssigned = currentAssigned;
    if (amount === 'max') {
      newAssigned = Math.min(stats.workersRequired, currentAssigned + freeWorkers);
    } else if (amount === 'clear') {
      newAssigned = 0;
    } else {
      const target = currentAssigned + amount;
      if (amount > 0) {
        newAssigned = Math.min(stats.workersRequired, currentAssigned + Math.min(amount, freeWorkers));
      } else {
        newAssigned = Math.max(0, target);
      }
    }

    if (newAssigned === currentAssigned) return;

    setGameState(prev => {
      const nextDistricts = prev.customDistricts.map(d => 
        d.id === district.id 
          ? { ...d, assignedWorkers: newAssigned } 
          : d
      );
      
      const nextAssigned = nextDistricts.reduce((acc, curr) => {
        if (curr.status === 'operational') {
          return acc + (curr.assignedWorkers ?? 0);
        }
        return acc;
      }, 0);
      const nextFree = Math.max(0, (prev.population?.total ?? 120) - nextAssigned);

      return {
        ...prev,
        customDistricts: nextDistricts,
        population: {
          ...prev.population,
          assignedWorkers: nextAssigned,
          freeWorkers: nextFree
        }
      };
    });
  };

  // Handle demolition
  const handleDemolish = () => {
    setGameState(prev => ({
      ...prev,
      resources: {
        gold: prev.resources.gold + refund.gold,
        wood: prev.resources.wood + refund.wood
      },
      customDistricts: prev.customDistricts.filter(d => d.id !== district.id)
    }));
    onClose();
  };

  // Get status label and color
  let statusText = 'Operativa';
  let statusColor = '#10b981';
  let activeStatus = district.status;

  if (activeStatus === 'operational') {
    if (district.type === 'hacienda' && stats.warning) {
      activeStatus = 'saturated';
    } else if (stats.warning) {
      activeStatus = 'at_risk';
    }
  }

  if (activeStatus === 'constructing') {
    statusText = `En construcción · Termina en ${formatDuration(timeLeftMs)}`;
    statusColor = '#f59e0b';
  } else if (activeStatus === 'upgrading') {
    statusText = `En mejora · Termina en ${formatDuration(timeLeftMs)}`;
    statusColor = '#3b82f6';
  } else if (activeStatus === 'saturated') {
    statusText = 'Saturada';
    statusColor = '#f59e0b';
  } else if (activeStatus === 'at_risk') {
    statusText = 'En riesgo';
    statusColor = '#ef4444';
  }

  // Format currency/numbers
  const formatNum = (num) => new Intl.NumberFormat('es-CO').format(num);

  if (showDemolishConfirm) {
    return (
      <div className="mobile-bottom-sheet" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#141414', borderTop: `4px solid #ef4444`,
        borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '0 -5px 25px rgba(0,0,0,0.8)',
        color: '#fff', fontFamily: "'Outfit', 'Inter', sans-serif"
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #222' }}>
          <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px' }}>
            💥 ¿Confirmar demolición de la distrito?
          </h3>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#ccc', lineHeight: '1.4' }}>
            Se perderá todo el distrito y sus celdas utilizadas permanentemente. Se reembolsará el 30% de los recursos totales acumulados:
          </p>
          <div style={{ background: '#222', padding: '12px 15px', borderRadius: '6px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
            💰 +{refund.gold} Oro &nbsp;&nbsp;&nbsp;&nbsp; 🪵 +{refund.wood} Madera
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setShowDemolishConfirm(false)}
              style={{ flex: 1, padding: '12px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleDemolish}
              style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
            >
              Confirmar Demoler
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#141414', borderTop: `4px solid ${statusColor}`,
      borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
      zIndex: 1001, display: 'flex', flexDirection: 'column',
      maxHeight: '85vh', overflowY: 'auto',
      boxShadow: '0 -5px 25px rgba(0,0,0,0.8)',
      color: '#fff', fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #222',

        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>{ICONS[district.type]}</span>
          <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#d4af37' }}>
              {stats.levelTitle}
            </div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>
              {DISTRICT_NAMES[district.type]} · Nivel {stats.levelRoman}
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#888',
            fontSize: '24px', cursor: 'pointer', padding: '0 5px'
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Warning Alert */}
        {stats.warning && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b',
            borderRadius: '6px', padding: '10px 12px', color: '#f59e0b',
            fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            ⚠️ Aviso: {stats.warning}
          </div>
        )}

        {/* State and Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: '#1d1d1d', padding: '10px 15px', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Estado</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: statusColor }}>{statusText}</div>
          </div>
          <div style={{ background: '#1d1d1d', padding: '10px 15px', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Área Utilizada</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{formatNum(stats.areaUsedM2)} m²</div>
          </div>
        </div>

        {/* Workers Slider / Controls */}
        <div style={{ background: '#1d1d1d', padding: '15px', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Trabajadores</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                👷 {stats.assignedWorkers} / {stats.workersRequired}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Eficiencia</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: stats.efficiencyScore > 0.8 ? '#10b981' : '#f59e0b' }}>
                {Math.round(stats.efficiencyScore * 100)}%
              </div>
            </div>
          </div>

          {/* Workers Free Warning */}
          {gameState.population?.freeWorkers === 0 && (
            <div style={{ color: '#fb923c', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
              ⚠️ No hay trabajadores libres en la ciudad
            </div>
          )}

          {/* Button Grid Row 1: Add/Sub */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button 
              onClick={() => handleModifyWorkers(-10)} 
              disabled={district.status === 'constructing' || district.status === 'upgrading' || stats.assignedWorkers <= 0}
              style={{ flex: 1, padding: '6px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              -10
            </button>
            <button 
              onClick={() => handleModifyWorkers(-1)} 
              disabled={district.status === 'constructing' || district.status === 'upgrading' || stats.assignedWorkers <= 0}
              style={{ flex: 1, padding: '6px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              -1
            </button>
            <button 
              onClick={() => handleModifyWorkers(1)} 
              disabled={district.status === 'constructing' || district.status === 'upgrading' || stats.assignedWorkers >= stats.workersRequired || (gameState.population?.freeWorkers || 0) <= 0}
              style={{ flex: 1, padding: '6px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              +1
            </button>
            <button 
              onClick={() => handleModifyWorkers(10)} 
              disabled={district.status === 'constructing' || district.status === 'upgrading' || stats.assignedWorkers >= stats.workersRequired || (gameState.population?.freeWorkers || 0) <= 0}
              style={{ flex: 1, padding: '6px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              +10
            </button>
          </div>

          {/* Button Grid Row 2: Max/Clear */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => handleModifyWorkers('max')} 
              disabled={district.status === 'constructing' || district.status === 'upgrading' || stats.assignedWorkers >= stats.workersRequired || (gameState.population?.freeWorkers || 0) <= 0}
              style={{ flex: 1, padding: '6px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Asignar Máximo
            </button>
            <button 
              onClick={() => handleModifyWorkers('clear')} 
              disabled={district.status === 'constructing' || district.status === 'upgrading' || stats.assignedWorkers <= 0}
              style={{ flex: 1, padding: '6px', background: '#475569', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Liberar Todos
            </button>
          </div>
        </div>

        {/* Economy, Production & Maintenance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: '#1d1d1d', padding: '12px 15px', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Producción</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
              {district.status !== 'operational' ? (
                <div style={{ color: '#ef4444', fontSize: '11.5px', fontWeight: 'normal', fontStyle: 'italic' }}>
                  🚫 Inactivo por construcción / mejora
                </div>
              ) : stats.production.consumptions && stats.production.consumptions.length > 0 ? (
                <div>
                  {stats.production.consumptions.map(c => {
                    const maxC = maxStats.production.consumptions.find(x => x.key === c.key) || c;
                    return (
                      <div key={c.key} style={{ color: '#ef4444', fontSize: '11px', fontWeight: 'normal' }}>
                        Consume: -{c.rate} (Máx: -{maxC.rate}) {c.label}/ciclo
                      </div>
                    );
                  })}
                  {stats.production.rates.map(p => {
                    const maxP = maxStats.production.rates.find(x => x.key === p.key) || p;
                    return (
                      <div key={p.key} style={{ color: '#a3e635', fontSize: '12px', marginTop: '2px' }}>
                        ➔ Produce: +{p.rate} (Máx: +{maxP.rate}) {p.label}/ciclo
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {stats.production.rates && stats.production.rates.length > 0 ? (
                    stats.production.rates.map(p => {
                      const maxP = maxStats.production.rates.find(x => x.key === p.key) || p;
                      return (
                        <div key={p.key} style={{ color: '#a3e635', fontSize: '12px', marginBottom: '3px' }}>
                          Produce: +{p.rate} (Máx: +{maxP.rate}) {p.label}/ciclo
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#aaa', fontSize: '12px' }}>Ninguna</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ background: '#1d1d1d', padding: '12px 15px', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Mantenimiento</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>
              {stats.maintenance.goldPerDay} oro/día
            </div>
          </div>
        </div>

        {/* Capacity Details */}
        <div style={{ background: '#1d1d1d', padding: '12px 15px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: '#aaa' }}>Capacidad de población:</span>
          <span style={{ fontWeight: 'bold' }}>👤 {stats.populationCapacity} hab.</span>
        </div>

        {/* Almacenes Capacity Block */}
        {district.type === 'almacen' && (
          <div style={{ background: '#1d1d1d', padding: '12px 15px', borderRadius: '6px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Capacidad Añadida</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🪵 madera:</span>
                <strong style={{ color: '#eab308' }}>+{Math.round((district.level === 1 ? 500 : district.level === 2 ? 1200 : district.level === 3 ? 2500 : district.level === 4 ? 5000 : 12000) * stats.efficiencyScore)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🧱 materiales:</span>
                <strong style={{ color: '#eab308' }}>+{Math.round((district.level === 1 ? 250 : district.level === 2 ? 600 : district.level === 3 ? 1200 : district.level === 4 ? 2500 : 6000) * stats.efficiencyScore)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>📦 bienes:</span>
                <strong style={{ color: '#eab308' }}>+{Math.round((district.level === 1 ? 500 : district.level === 2 ? 1200 : district.level === 3 ? 2500 : district.level === 4 ? 5000 : 12000) * stats.efficiencyScore)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>⛵ velas:</span>
                <strong style={{ color: '#eab308' }}>+{Math.round((district.level === 1 ? 50 : district.level === 2 ? 120 : district.level === 3 ? 250 : district.level === 4 ? 500 : 1200) * stats.efficiencyScore)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>💣 pólvora:</span>
                <strong style={{ color: '#eab308' }}>+{Math.round((district.level === 1 ? 100 : district.level === 2 ? 240 : district.level === 3 ? 500 : district.level === 4 ? 1000 : 2500) * stats.efficiencyScore)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>💥 cañones:</span>
                <strong style={{ color: '#eab308' }}>+{Math.round((district.level === 1 ? 25 : district.level === 2 ? 60 : district.level === 3 ? 120 : district.level === 4 ? 250 : 600) * stats.efficiencyScore)}</strong>
              </div>
            </div>
          </div>
        )}


        {/* Hacienda Crop Specialization (Level >= 2) */}
        {district.type === 'hacienda' && district.level >= 2 && district.status === 'operational' && (
          <div style={{ background: '#1d1d1d', padding: '15px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Especialización de Cultivo</div>
            <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '4px' }}>
              Las haciendas de nivel II+ pueden especializarse en un cultivo avanzado para producir materias primas comerciales.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                onClick={() => specializePlantation(district.id, null)}
                style={{
                  padding: '6px 10px',
                  background: !district.specialization ? '#2563eb' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🌾 Bienes (Genérico)
              </button>
              {Object.values(specConfig).map(spec => (
                <button
                  key={spec.key}
                  onClick={() => specializePlantation(district.id, spec.key)}
                  style={{
                    padding: '6px 10px',
                    background: district.specialization === spec.key ? '#10b981' : '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {spec.icon} {spec.name}
                </button>
              ))}
            </div>
            {district.specialization && (
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontStyle: 'italic' }}>
                ➔ Produciendo activamente: {specConfig[district.specialization]?.name}
              </div>
            )}
          </div>
        )}

        {/* Debug: Water/Wetlands & Costs */}
        <div style={{ background: '#111', padding: '10px 15px', borderRadius: '6px', border: '1px solid #222', fontSize: '11px', color: '#777' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Coste de construcción:</span>
            <span>
              {district.cost ? Object.entries(district.cost).map(([resId, amt]) => {
                const name = resourcesConfig[resId]?.name || resId;
                const icon = resourcesConfig[resId]?.icon || '📦';
                return `${icon} ${amt} ${name}`;
              }).join(' | ') : 'Gratis'}
            </span>
          </div>
          {district.expansions && district.expansions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#8b9045' }}>
              <span>Expansiones ({district.expansions.length}):</span>
              <span>
                {(() => {
                  const combinedCost = {};
                  district.expansions.forEach(exp => {
                    if (exp.cost) {
                      for (const [resId, amt] of Object.entries(exp.cost)) {
                        combinedCost[resId] = (combinedCost[resId] || 0) + amt;
                      }
                    }
                  });
                  return Object.entries(combinedCost).map(([resId, amt]) => {
                    const name = resourcesConfig[resId]?.name || resId;
                    const icon = resourcesConfig[resId]?.icon || '📦';
                    return `${icon} ${amt} ${name}`;
                  }).join(' | ');
                })()}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Humedad detectada:</span>
            <span>Agua: {district.waterPixelCount || 0} px | Humedal: {district.wetlandPixelCount || 0} px</span>
          </div>
        </div>

        {/* Actions Button Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '5px' }}>
          {/* Ampliar */}
          <button
            onClick={() => onStartExpansion(district)}
            disabled={district.status === 'constructing' || district.status === 'upgrading'}
            style={{
              padding: '12px', background: (district.status === 'constructing' || district.status === 'upgrading') ? '#222' : '#10b981',
              color: (district.status === 'constructing' || district.status === 'upgrading') ? '#555' : '#fff',
              border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (district.status === 'constructing' || district.status === 'upgrading') ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)', transition: 'background 0.2s'
            }}
          >
            ➕ Ampliar
          </button>
          
          {/* Reducir (Locked) */}
          <button
            disabled
            style={{
              padding: '12px', background: '#222', color: '#555',
              border: '1px dashed #444', borderRadius: '4px', fontWeight: 'bold',
              cursor: 'not-allowed'
            }}
          >
            Reducir — próximamente
          </button>

          {/* Demoler */}
          <button
            onClick={() => setShowDemolishConfirm(true)}
            style={{
              gridColumn: 'span 2', padding: '12px', background: '#ef4444', color: '#fff',
              border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)', transition: 'background 0.2s'
            }}
          >
            💥 Demoler (Devuelve 30%)
          </button>
        </div>


      </div>
    </div>
  );
}
