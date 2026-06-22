import React, { useState, useEffect } from 'react';
import { useGame } from '../core/context/GameContext';
import shipsConfig from '../config/ships_config.json';
import shipUpgradesConfig from '../config/ship_upgrades_config.json';
import resourcesConfig from '../config/resources_config.json';
import { formatDuration } from '../utils/formatters';

export default function ShipyardPanel({ onClose, onBack }) {
  const { gameState, buildShip, applyShipUpgrade, hasResources } = useGame();
  const [now, setNow] = useState(Date.now());
  const [selectedShipId, setSelectedShipId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const districts = gameState.customDistricts || [];
  const hasArsenal = districts.some(d => d.type === 'arsenal' && d.status === 'operational');

  const shipsUC = gameState.fleet?.shipsUnderConstruction || [];
  const fleet = gameState.fleet?.ships || [];
  const completedResearch = gameState.research?.completedResearch || [];

  const handleBuild = (shipType, cost, durationBaseSec) => {
    buildShip(shipType, cost, durationBaseSec);
  };

  const handleUpgrade = (shipId, upgradeId, cost) => {
    applyShipUpgrade(shipId, upgradeId, cost);
  };

  const selectedShip = fleet.find(s => s.id === selectedShipId);

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0b0f19', borderTop: '4px solid #f59e0b',
      borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
      zIndex: 1002, display: 'flex', flexDirection: 'column',
      maxHeight: '85vh', overflowY: 'auto',
      boxShadow: '0 -5px 25px rgba(0,0,0,0.8)',
      color: '#fff', fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #1e293b',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={onBack}
            style={{
              background: '#1e293b', border: '1px solid #334155', color: '#fff',
              padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
            }}
          >
            ← Volver
          </button>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fb923c' }}>
              Real Astillero de la Armada
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Construye navíos de línea y modifica tu flota comercial
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '24px', cursor: 'pointer', padding: '0 5px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Status Check */}
        {!hasArsenal ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
            borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#f87171'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
            <strong>Astillero inactivo</strong>
            <p style={{ fontSize: '12px', color: '#fca5a5', margin: '4px 0 0 0' }}>
              Debes tener un <strong>Arsenal</strong> operativo y asignarle trabajadores para construir y modificar embarcaciones.
            </p>
          </div>
        ) : (
          <>
            {/* Construction Queue */}
            {shipsUC.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Grada de Construcción Activa
                </div>
                {shipsUC.map(s => {
                  const spec = shipsConfig[s.type];
                  const timeLeftMs = Math.max(0, s.endsAt - now);
                  const totalMs = (spec?.buildDurationSec || 120) * 1000 * (gameState.economy?.constructionTimeMultiplier ?? 1.0);
                  const pct = Math.min(100, Math.round(((totalMs - timeLeftMs) / totalMs) * 100));

                  return (
                    <div 
                      key={s.id}
                      style={{
                        background: 'linear-gradient(135deg, #2d1e10 0%, #0f172a 100%)',
                        border: '1px solid #f59e0b', borderRadius: '8px', padding: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                        <strong>🛠️ {s.name} ({spec?.name})</strong>
                        <span>⌛ {formatDuration(timeLeftMs)}</span>
                      </div>
                      <div style={{ background: '#334155', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ background: '#f59e0b', width: `${pct}%`, height: '100%' }}></div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '10px', color: '#fb923c', marginTop: '4px', fontWeight: 'bold' }}>
                        {pct}% armado
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Catalog of Ships */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Catálogo Base de Barcos
              </div>

              {Object.values(shipsConfig).map(ship => {
                const canAfford = hasResources(ship.cost);
                // For this phase, enable only Balandra building as a real action, show others as locked or buildable if they can afford
                const isBalandra = ship.id === 'balandra';
                const buttonDisabled = !isBalandra || !canAfford || shipsUC.length >= 1; // 1 ship under construction max for simple queue
                
                let btnLabel = '🛠️ Construir';
                if (!isBalandra) btnLabel = '🔒 Nivel II requerido';
                else if (shipsUC.length >= 1) btnLabel = 'Grada ocupada';
                else if (!canAfford) btnLabel = 'Faltan recursos';

                return (
                  <div 
                    key={ship.id}
                    style={{
                      background: '#1e293b', border: '1px solid #334155',
                      borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '22px' }}>⛵</span>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{ship.name}</strong>
                          <span style={{ fontSize: '10px', background: '#0f172a', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px', color: '#38bdf8', textTransform: 'capitalize' }}>
                            {ship.type}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '11px', color: '#94a3b8', lineHeight: '1.3' }}>
                        {ship.description}
                      </p>
                      
                      <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span>⌛ {ship.buildDurationSec}s</span>
                        <span>|</span>
                        <span>📦 Carga: {ship.cargoCapacity}</span>
                        <span>|</span>
                        {Object.entries(ship.cost).map(([resId, amt]) => {
                          const config = resourcesConfig[resId];
                          return (
                            <span key={resId} style={{ color: canAfford ? '#34d399' : '#ef4444' }}>
                              {config?.icon} {amt} {config?.name || resId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuild(ship.id, ship.cost, ship.buildDurationSec)}
                      disabled={buttonDisabled}
                      style={{
                        padding: '8px 12px',
                        background: buttonDisabled ? '#334155' : '#f59e0b',
                        color: buttonDisabled ? '#94a3b8' : '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: buttonDisabled ? 'not-allowed' : 'pointer',
                        minWidth: '100px'
                      }}
                    >
                      {btnLabel}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Fleet List and Upgrades */}
            {fleet.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Flota Activa de la Colonia ({fleet.length})
                </div>
                {fleet.map(s => {
                  const spec = shipsConfig[s.type];
                  const hasCaptain = s.captainId !== null;
                  const captainName = hasCaptain ? gameState.captains?.hired?.find(c => c.id === s.captainId)?.name || 'Habilitado' : 'Sin Capitán';
                  
                  return (
                    <div 
                      key={s.id}
                      style={{
                        background: '#0f172a', border: '1px solid #1e293b',
                        borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#38bdf8' }}>⛵ {s.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({spec?.name})</span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: hasCaptain ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                          👤 {captainName}
                        </span>
                      </div>

                      {/* Applied Modifications */}
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Mejoras Aplicadas ({s.upgrades?.length || 0} / {spec?.modificationSlots || 1})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {s.upgrades && s.upgrades.length > 0 ? s.upgrades.map(upgId => {
                            const upg = shipUpgradesConfig[upgId];
                            return (
                              <span key={upgId} style={{ fontSize: '10.5px', background: '#1e293b', border: '1px solid #10b981', color: '#10b981', padding: '1px 6px', borderRadius: '4px' }}>
                                {upg?.icon} {upg?.name}
                              </span>
                            );
                          }) : (
                            <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>Ninguna modificación</span>
                          )}
                        </div>
                      </div>

                      {/* Upgrade Options Button Trigger */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setSelectedShipId(s.id === selectedShipId ? null : s.id)}
                          style={{
                            flex: 1, padding: '6px', background: '#1e293b', border: '1px solid #334155',
                            color: '#fff', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'
                          }}
                        >
                          ⚙️ {selectedShipId === s.id ? 'Cerrar Mejoras' : 'Ver Mejoras Disponibles'}
                        </button>
                      </div>

                      {/* Upgrades Menu for selected ship */}
                      {selectedShipId === s.id && (
                        <div style={{ background: '#111726', padding: '10px', borderRadius: '6px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {Object.values(shipUpgradesConfig).map(upg => {
                            const isInstalled = s.upgrades?.includes(upg.id);
                            const hasSlot = (s.upgrades?.length || 0) < (spec?.modificationSlots || 1);
                            const isResearchRequired = upg.requiredResearch !== null;
                            const isResearched = !isResearchRequired || completedResearch.includes(upg.requiredResearch);
                            const canAfford = hasResources(upg.cost);

                            let buttonDisabled = isInstalled || !hasSlot || !isResearched || !canAfford;
                            let btnLabel = 'Instalar';
                            let warningText = '';

                            if (isInstalled) {
                              btnLabel = 'Instalada';
                            } else if (!hasSlot) {
                              btnLabel = 'Sin ranuras';
                              warningText = 'No quedan ranuras de modificación libres.';
                            } else if (!isResearched) {
                              btnLabel = 'Bloqueado';
                              const resName = upg.requiredResearch.replace('_', ' ');
                              warningText = `Requiere investigar "${resName}" en Universidad.`;
                            } else if (!canAfford) {
                              btnLabel = 'Faltan recursos';
                            }

                            return (
                              <div key={upg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '6px', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                    {upg.icon} {upg.name}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', margin: '2px 0' }}>
                                    {upg.description}
                                  </div>
                                  {!isInstalled && (
                                    <div style={{ fontSize: '10px', display: 'flex', gap: '6px' }}>
                                      {Object.entries(upg.cost).map(([resId, amt]) => (
                                        <span key={resId} style={{ color: canAfford ? '#34d399' : '#ef4444' }}>
                                          {resourcesConfig[resId]?.icon} {amt}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {warningText && (
                                    <div style={{ fontSize: '9.5px', color: '#fb923c', fontWeight: 'bold', marginTop: '2px' }}>
                                      ⚠️ {warningText}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleUpgrade(s.id, upg.id, upg.cost)}
                                  disabled={buttonDisabled}
                                  style={{
                                    padding: '6px 10px', background: isInstalled ? '#10b981' : buttonDisabled ? '#334155' : '#f59e0b',
                                    color: buttonDisabled ? '#94a3b8' : '#000', border: 'none', borderRadius: '4px',
                                    fontSize: '11px', fontWeight: 'bold', cursor: buttonDisabled ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  {btnLabel}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
