import React, { useState } from 'react';
import { useGame } from '../core/context/GameContext';
import buildingsConfig from '../config/buildings_config.json';
import { checkLevelRequirements } from '../engines/planning/districtValidation';

const BUILDABLE_KEYS = ['hacienda', 'gremio', 'almacen', 'aduana', 'puerto', 'arsenal', 'fortaleza', 'camino'];
const LOCKED_KEYS = ['taberna', 'catedral', 'hospital', 'universidad'];

const SHORT_ROLES = {
  cabildo: "Gobierno de la ciudad",
  hacienda: "Produce bienes agrícolas",
  gremio: "Produce madera y materiales",
  almacen: "Almacena recursos y bienes",
  aduana: "Convierte bienes en oro",
  puerto: "Establece rutas comerciales",
  arsenal: "Produce velas y repuestos",
  fortaleza: "Defensa militar de costa",
  camino: "Transporta bienes e insumos"
};

export default function TownHallPopup({ onClose }) {
  const { gameState, setPlanningMode } = useGame();
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [targetWorkers, setTargetWorkers] = useState(30);

  const handleStartPlacement = () => {
    if (!selectedBuilding) return;
    const config = buildingsConfig[selectedBuilding];
    setPlanningMode({
      active: true,
      mode: 'center_marker',
      buildingType: selectedBuilding,
      targetWorkers,
      targetAreaM2: targetWorkers * config.workerAreaFactor
    });
    onClose();
  };

  const selectedConfig = selectedBuilding ? buildingsConfig[selectedBuilding] : null;

  // Run requirements check for target worker level
  const reqCheck = selectedBuilding
    ? checkLevelRequirements(selectedBuilding, targetWorkers, gameState.cabildoLevel || 1, gameState.customDistricts || [])
    : { valid: true };

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      background: '#141414', border: '2px solid #d4af37', borderRadius: '12px',
      padding: '20px', width: '90%', maxWidth: '420px', zIndex: 2000, color: '#fff',
      boxShadow: '0 10px 30px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '12px', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏛️ Cabildo - Planificación
        </h2>
        <button 
          onClick={onClose} 
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer', padding: '0 5px' }}
        >
          ×
        </button>
      </div>

      {/* Available Buildings Grid */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>
          1. Distritos Construibles
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {BUILDABLE_KEYS.map((key) => {
            const config = buildingsConfig[key];
            const isSelected = selectedBuilding === key;
            return (
              <button 
                key={key}
                onClick={() => {
                  setSelectedBuilding(key);
                  setTargetWorkers(30); // reset target workers
                }}
                style={{
                  padding: '10px', textAlign: 'left',
                  background: isSelected ? 'rgba(212, 175, 55, 0.15)' : '#1d1d1d',
                  color: '#fff', border: `1px solid ${isSelected ? '#d4af37' : '#333'}`,
                  borderRadius: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  transition: 'all 0.2s ease', minHeight: '65px', justifyContent: 'center'
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: isSelected ? '#d4af37' : '#fff' }}>
                  {config.visual.icon} {config.name}
                </span>
                <span style={{ fontSize: '9px', color: '#aaa', marginTop: '4px', lineHeight: '1.2' }}>
                  {SHORT_ROLES[key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Locked / Upcoming Buildings */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>
          2. Próximamente (Evolución de Ciudad)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', opacity: 0.5 }}>
          {LOCKED_KEYS.map((key) => {
            const config = buildingsConfig[key];
            return (
              <div 
                key={key}
                style={{
                  padding: '10px', background: '#111',
                  color: '#666', border: '1px dashed #333',
                  borderRadius: '6px', display: 'flex', flexDirection: 'column',
                  cursor: 'not-allowed'
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#777' }}>
                  {config.visual.icon} {config.name}
                </span>
                <span style={{ fontSize: '10px', color: '#e11d48', marginTop: '2px', fontWeight: 'bold' }}>Próximamente</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected building description & parameters */}
      {selectedBuilding && selectedConfig && (
        <div style={{
          background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: '6px',
          padding: '12px', marginBottom: '20px'
        }}>
          {/* Description */}
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#ccc', lineHeight: '1.4' }}>
            {selectedConfig.description}
          </p>

          {/* Logistics dependencies */}
          <div style={{ fontSize: '11px', color: '#aaa', borderTop: '1px solid #333', paddingTop: '8px', marginBottom: '10px' }}>
            <div>🔧 <strong>Dependencia:</strong> {selectedConfig.dependencyText}</div>
            <div>💡 <strong>Desbloquea:</strong> {selectedConfig.unlocksText}</div>
          </div>

          {/* Workers range */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
              <span style={{ color: '#aaa' }}>Trabajadores Objetivo:</span>
              <span style={{ fontWeight: 'bold', color: '#d4af37' }}>{targetWorkers}</span>
            </div>
            <input 
              type="range" 
              min="15" max="250" step="5" 
              value={targetWorkers} 
              onChange={(e) => setTargetWorkers(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#d4af37', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#777', marginTop: '4px' }}>
              <span>Área: {targetWorkers * selectedConfig.workerAreaFactor} m²</span>
              <span>Población: 👤 {Math.floor((targetWorkers * selectedConfig.workerAreaFactor) / selectedConfig.populationAreaFactor)} hab.</span>
            </div>
          </div>

          {/* Check requirements warning */}
          {!reqCheck.valid && (
            <div style={{
              marginTop: '12px', background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444', borderRadius: '4px', padding: '8px',
              color: '#fca5a5', fontSize: '12px', fontWeight: 'bold', textAlign: 'center'
            }}>
              ⚠️ Bloqueado: {reqCheck.message}
            </div>
          )}
        </div>
      )}

      {/* Action build button */}
      <button 
        onClick={handleStartPlacement}
        disabled={!selectedBuilding || !reqCheck.valid}
        style={{
          width: '100%', padding: '12px',
          background: (selectedBuilding && reqCheck.valid) ? '#10b981' : '#222',
          color: (selectedBuilding && reqCheck.valid) ? '#fff' : '#666',
          border: 'none', borderRadius: '6px',
          fontWeight: 'bold', fontSize: '16px', cursor: (selectedBuilding && reqCheck.valid) ? 'pointer' : 'not-allowed',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)', transition: 'background 0.2s'
        }}
      >
        📍 Colocar en mapa
      </button>
    </div>
  );
}
