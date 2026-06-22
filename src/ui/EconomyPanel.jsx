import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { calculateDistrictStats } from '../economy/districtStats';
import { formatDuration } from '../utils/formatters';
import { getActiveBalanceConfig } from '../economy/economyEngine';

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

export default function EconomyPanel({ onClose }) {
  const { gameState } = useGame();
  const [showDetails, setShowDetails] = useState(false);

  const eco = gameState.economy || {};
  const net = eco.netBalance || {};
  const prod = eco.grossProduction || {};
  const cons = eco.grossConsumption || {};
  const losses = eco.storageLosses || {};
  const warnings = eco.warnings || [];

  const pop = gameState.population || { total: 0, capacity: 0, freeWorkers: 0, assignedWorkers: 0 };

  const formatBalance = (val) => {
    if (val > 0) return `+${val}`;
    return val.toString();
  };

  const getBalanceColor = (val) => {
    if (val > 0) return '#10b981'; // Green
    if (val < 0) return '#ef4444'; // Red
    return '#888';
  };

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#141414', borderTop: '4px solid #eab308',
      borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
      zIndex: 2000, display: 'flex', flexDirection: 'column',
      maxHeight: '85vh', overflowY: 'auto',
      boxShadow: '0 -5px 25px rgba(0,0,0,0.85)',
      color: '#fff', fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #222',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#eab308' }}>
            Panel de Economía Cartagena <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 'normal' }}>· Ciclo: {formatDuration(eco.cycleLengthMs || 10000)}</span>
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
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Demographics Summary */}
        <div style={{ background: '#1d1d1d', padding: '12px 15px', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>
            👥 Demografía de la Ciudad
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
            <div>
              Población Total: <strong style={{ color: '#f472b6' }}>{pop.total} / {pop.capacity} hab.</strong>
            </div>
            <div>
              Trabajadores Libres: <strong style={{ color: '#34d399' }}>{pop.freeWorkers}</strong>
            </div>
            <div>
              Empleados: <strong>{pop.assignedWorkers}</strong>
            </div>
            <div>
              Crecimiento: <span style={{ color: pop.growthRate > 0 ? '#10b981' : '#888' }}>+{pop.growthRate}/ciclo</span>
            </div>
          </div>
        </div>

        {/* Net Balance Summary (Resumen solicitado) */}
        <div style={{ background: '#1d1d1d', padding: '12px 15px', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>
            📈 Resumen del Ciclo (Balance Neto / {formatDuration(eco.cycleLengthMs || 10000)})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>💰 Oro:</span>
              <strong style={{ color: getBalanceColor(net.gold || 0) }}>
                {formatBalance(net.gold || 0)}/ciclo
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>🪵 Madera:</span>
              <strong style={{ color: getBalanceColor(net.wood || 0) }}>
                {formatBalance(net.wood || 0)}/ciclo
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>🏗️ Materiales:</span>
              <strong style={{ color: getBalanceColor(net.materials || 0) }}>
                {formatBalance(net.materials || 0)}/ciclo
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>📦 Bienes:</span>
              <strong style={{ color: getBalanceColor(net.goods || 0) }}>
                {formatBalance(net.goods || 0)}/ciclo
              </strong>
            </div>
            {(net.sails !== undefined && net.sails !== 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', gridColumn: 'span 2' }}>
                <span>⛵ Velas:</span>
                <strong style={{ color: getBalanceColor(net.sails) }}>
                  {formatBalance(net.sails)}/ciclo
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Bottlenecks / Warnings (Cuellos de Botella) */}
        <div style={{ background: '#1d1d1d', padding: '12px 15px', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>
            ⚠️ Cuellos de Botella y Advertencias
          </div>
          {warnings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {warnings.map((w, idx) => (
                <div key={idx} style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 'bold' }}>
                  ⚠️ {w}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>
              ✓ Ninguno detectado. Economía en orden.
            </div>
          )}
        </div>

        {/* Saturated storage losses list */}
        {Object.keys(losses).length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '12px 15px', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
              💥 Pérdidas por Almacenamiento Saturado
            </div>
            {Object.entries(losses).map(([resId, amt]) => {
              const icon = resId === 'goods' ? '📦' : resId === 'wood' ? '🪵' : resId === 'materials' ? '🏗️' : '⚓';
              return (
                <div key={resId} style={{ fontSize: '13px', fontWeight: 'bold', color: '#fca5a5' }}>
                  {icon} {resId === 'goods' ? 'bienes' : resId === 'wood' ? 'madera' : resId === 'materials' ? 'materiales' : resId} -{amt} por falta de almacenes
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible Details Button */}
        <button 
          onClick={() => setShowDetails(prev => !prev)}
          style={{
            padding: '10px', background: '#333', color: '#fff', border: 'none',
            borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px'
          }}
        >
          {showDetails ? '🗁 Ocultar Detalles por Distrito' : '🔍 Mostrar Detalles por Distrito'}
        </button>

        {/* Collapsible Details Section */}
        {showDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {gameState.customDistricts?.map((d) => {
              const stats = calculateDistrictStats(d.type, d.areaM2, d.assignedWorkers, d.level, gameState.customDistricts);
              return (
                <div key={d.id} style={{ background: '#111', padding: '10px 12px', borderRadius: '6px', border: '1px solid #222', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#eab308', marginBottom: '4px' }}>
                    <span>{ICONS[d.type]} {stats.levelTitle}</span>
                    <span style={{ fontSize: '10px', color: '#888' }}>{DISTRICT_NAMES[d.type]}</span>
                  </div>
                  <div>Estado: <span style={{ color: d.status === 'constructing' ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>{d.status}</span></div>
                  <div>Trabajadores: {d.assignedWorkers || 0} / {stats.workersRequired} (Eficiencia: {Math.round(stats.efficiencyScore * 100)}%)</div>
                  
                  {/* Outputs */}
                  {d.status === 'constructing' ? (
                    <div style={{ color: '#888', fontStyle: 'italic', marginTop: '2px' }}>En construcción — Sin producción</div>
                  ) : (
                    <div style={{ marginTop: '2px' }}>
                      {stats.production.consumptions && stats.production.consumptions.length > 0 && (
                        stats.production.consumptions.map(c => (
                          <div key={c.key} style={{ color: '#ef4444' }}>Consumo: -{c.rate} {c.label}/ciclo</div>
                        ))
                      )}
                      {stats.production.rates && stats.production.rates.length > 0 ? (
                        stats.production.rates.map(r => (
                          <div key={r.key} style={{ color: '#a3e635' }}>Produce: +{r.rate} {r.label}/ciclo (Máx: {r.rate})</div>
                        ))
                      ) : (
                        <div style={{ color: '#aaa' }}>Produce: 0 (No productivo)</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
