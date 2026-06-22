import React, { useState } from 'react';
import { useGame } from '../core/context/GameContext';
import resourcesConfig from '../config/resources_config.json';

export default function CrewPanel({ onClose, onBack }) {
  const { gameState, hireCaptain, assignCaptainToShip } = useGame();
  const [selectedCaptainId, setSelectedCaptainId] = useState(null);

  const available = gameState.captains?.available || [];
  const hired = gameState.captains?.hired || [];
  const ships = gameState.fleet?.ships || [];
  const crewCount = gameState.resources?.crew || 0;
  const currentGold = gameState.resources?.gold || 0;

  const handleHire = (capId) => {
    const res = hireCaptain(capId);
    if (!res.success) {
      alert(`⚠️ Reclutamiento fallido: ${res.reason}`);
    }
  };

  const handleAssign = (shipId, capId) => {
    assignCaptainToShip(shipId, capId);
    setSelectedCaptainId(null);
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Épico': return '#c084fc';
      case 'Raro': return '#38bdf8';
      case 'Poco Común': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0b0f19', borderTop: '4px solid #a78bfa',
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
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a78bfa' }}>
              Oficina de Reclutamiento y Tripulación
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Contrata capitanes ilustres y gestiona marineros de la colonia
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
        
        {/* Crew Stock Summary */}
        <div style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #0f172a 100%)',
          border: '1px solid #7c3aed', borderRadius: '8px', padding: '12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <strong style={{ fontSize: '14px', color: '#a78bfa' }}>⚓ Marinería Disponible</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#cbd5e1' }}>
              Marineros libres reclutados en la taberna y puerto listos para embarcar.
            </p>
          </div>
          <strong style={{ fontSize: '20px', color: '#fff' }}>👥 {crewCount}</strong>
        </div>

        {/* Hireable Captains */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Capitanes Disponibles en la Taberna ({available.length})
          </div>

          {available.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
              No hay capitanes en la taberna. Reclutarás más en los siguientes barcos.
            </div>
          ) : (
            available.map(cap => {
              const goldCost = cap.cost.gold || 0;
              const crewCost = cap.cost.crew || 0;
              const canAfford = currentGold >= goldCost && crewCount >= crewCost;
              const rColor = getRarityColor(cap.rarity);

              return (
                <div 
                  key={cap.id}
                  style={{
                    background: '#1e293b', border: '1px solid #334155',
                    borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{cap.name}</strong>
                      <span style={{ fontSize: '10px', background: `${rColor}33`, color: rColor, border: `1px solid ${rColor}66`, padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {cap.rarity}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '2px', fontWeight: 'bold' }}>
                      {cap.title}
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.3' }}>
                      {cap.description}
                    </p>

                    {/* Stats List */}
                    <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0' }}>
                      {cap.stats.tradeBonus > 0 && <span>📈 Comercio: +{Math.round(cap.stats.tradeBonus * 100)}%</span>}
                      {cap.stats.speedBonus > 0 && <span>⚡ Vel: +{cap.stats.speedBonus} nudos</span>}
                      {cap.stats.defenseBonus > 0 && <span>🛡️ Def: +{Math.round(cap.stats.defenseBonus * 100)}%</span>}
                      {cap.stats.riskReduction > 0 && <span>🛡️ Seguridad: +{Math.round(cap.stats.riskReduction * 100)}%</span>}
                    </div>

                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      Costo: <span style={{ color: currentGold >= goldCost ? '#eab308' : '#ef4444' }}>💰 {goldCost}</span> | <span style={{ color: crewCount >= crewCost ? '#a78bfa' : '#ef4444' }}>👥 {crewCost} marineros</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleHire(cap.id)}
                    disabled={!canAfford}
                    style={{
                      padding: '8px 12px',
                      background: canAfford ? '#a78bfa' : '#334155',
                      color: canAfford ? '#000' : '#64748b',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                      minWidth: '90px'
                    }}
                  >
                    Contratar
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Hired Captains */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Capitanes Contratados ({hired.length})
          </div>

          {hired.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
              No has contratado capitanes todavía.
            </div>
          ) : (
            hired.map(cap => {
              const isAssigned = cap.assignedShipId !== null;
              const assignedShip = ships.find(s => s.id === cap.assignedShipId);
              const shipName = isAssigned ? assignedShip?.name || 'Barco' : 'Ninguno';

              return (
                <div 
                  key={cap.id}
                  style={{
                    background: '#0f172a', border: '1px solid #1e293b',
                    borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#fff' }}>{cap.name}</strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>({cap.title})</span>
                    </div>
                    <span style={{ fontSize: '11px', color: isAssigned ? '#10b981' : '#fb923c', fontWeight: 'bold' }}>
                      ⛵ {isAssigned ? `Asignado a: ${shipName}` : 'Sin Barco'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setSelectedCaptainId(selectedCaptainId === cap.id ? null : cap.id)}
                      style={{
                        flex: 1, padding: '6px', background: '#1e293b', border: '1px solid #334155',
                        color: '#fff', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >
                      {selectedCaptainId === cap.id ? 'Cerrar Asignación' : 'Asignar a Barco'}
                    </button>
                  </div>

                  {/* Assign to Ship Menu */}
                  {selectedCaptainId === cap.id && (
                    <div style={{ background: '#111726', padding: '10px', borderRadius: '6px', marginTop: '4px' }}>
                      {ships.length === 0 ? (
                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                          No tienes barcos construidos en tu flota. Construye uno en el Astillero.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Selecciona una embarcación:
                          </div>
                          
                          {/* Unassign option if already assigned */}
                          {isAssigned && (
                            <button
                              onClick={() => handleAssign(null, cap.id)}
                              style={{
                                padding: '6px', background: '#334155', border: 'none', color: '#fff',
                                borderRadius: '4px', fontSize: '11px', cursor: 'pointer', textAlign: 'left'
                              }}
                            >
                              ❌ Desasignar del barco actual
                            </button>
                          )}

                          {ships.map(s => {
                            // If ship already has this captain, disable or skip
                            const isCurrent = s.captainId === cap.id;
                            if (isCurrent) return null;

                            return (
                              <button
                                key={s.id}
                                onClick={() => handleAssign(s.id, cap.id)}
                                style={{
                                  padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8',
                                  borderRadius: '4px', fontSize: '11.5px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between'
                                }}
                              >
                                <span>⛵ {s.name} ({shipsConfig[s.type]?.name})</span>
                                <span style={{ fontSize: '10px', color: s.captainId ? '#fb923c' : '#10b981' }}>
                                  {s.captainId ? 'Reemplazar cap.' : 'Libre'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
