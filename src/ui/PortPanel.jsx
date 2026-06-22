import React from 'react';
import { useGame } from '../context/GameContext';
import portConfig from '../data/port_config.json';

export default function PortPanel({ onClose, onBack }) {
  const { gameState } = useGame();
  const districts = gameState.customDistricts || [];

  // Find all operational Puerto districts
  const ports = districts.filter(d => d.type === 'puerto' && d.status === 'operational');
  const maxPortLevel = ports.length > 0 ? Math.max(...ports.map(p => p.level || 1)) : 0;
  const activePortConfig = maxPortLevel > 0 ? portConfig[maxPortLevel.toString()] : null;

  const fleetCount = gameState.fleet?.ships?.length || 0;

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0b0f19', borderTop: '4px solid #38bdf8',
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
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>
              Capitanía del Puerto Real
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Administra la capacidad comercial de atraque y embarcaciones
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
        {!activePortConfig ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
            borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#f87171'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
            <strong>Puerto comercial inactivo</strong>
            <p style={{ fontSize: '12px', color: '#fca5a5', margin: '4px 0 0 0' }}>
              Debes trazar y completar un distrito de tipo <strong>Puerto</strong> en la costa y asignar trabajadores para activar la capitanía.
            </p>
          </div>
        ) : (
          <>
            {/* Active Port Level Stats Card */}
            <div style={{
              background: 'linear-gradient(135deg, #0c4a6e 0%, #0f172a 100%)',
              border: '1px solid #0284c7', borderRadius: '8px', padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Infraestructura Portuaria Activa
                </span>
                <span style={{ fontSize: '11px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  Nivel {maxPortLevel}
                </span>
              </div>
              <strong style={{ fontSize: '16px', color: '#f8fafc' }}>{activePortConfig.description}</strong>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                <div style={{ background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px' }}>⚓</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginTop: '4px' }}>Muelles Disponibles</div>
                  <strong style={{ fontSize: '15px', color: '#38bdf8' }}>{activePortConfig.docks} muelles</strong>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px' }}>🚢</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginTop: '4px' }}>Tamaño de Barco Máx.</div>
                  <strong style={{ fontSize: '15px', color: '#38bdf8', textTransform: 'capitalize' }}>{activePortConfig.maxShipSize}</strong>
                </div>
              </div>
            </div>

            {/* Docks Visualization */}
            <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>
                Estatus de Atraque de la Bahía
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                {Array.from({ length: activePortConfig.docks }).map((_, idx) => {
                  const isOccupied = idx < fleetCount; // Dummy representation: active fleet occupy docks
                  return (
                    <div 
                      key={idx}
                      style={{
                        background: isOccupied ? 'rgba(56, 189, 248, 0.1)' : 'rgba(148, 163, 184, 0.05)',
                        border: `1px dashed ${isOccupied ? '#38bdf8' : '#475569'}`,
                        borderRadius: '6px',
                        padding: '10px',
                        textAlign: 'center',
                        fontSize: '11px'
                      }}
                    >
                      <div style={{ fontSize: '18px' }}>{isOccupied ? '⛵' : '🌊'}</div>
                      <div style={{ fontWeight: 'bold', marginTop: '4px', color: isOccupied ? '#38bdf8' : '#64748b' }}>
                        Muelle {idx + 1}
                      </div>
                      <div style={{ fontSize: '9px', color: isOccupied ? '#10b981' : '#64748b' }}>
                        {isOccupied ? 'Ocupado' : 'Vacío'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Allowed Ship Types */}
            <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                Modelos de Barco Autorizados en Capitanía
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activePortConfig.allowedTypes.map(type => (
                  <span 
                    key={type}
                    style={{
                      background: '#0f172a', border: '1px solid #334155', color: '#38bdf8',
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', textTransform: 'capitalize'
                    }}
                  >
                    ⛵ {type}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Future Port Upgrades List (Visual depth) */}
        <div style={{ background: '#111726', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>
            Mejoras Portuarias Futuras (Próximamente)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
              <span>🏗️ Oficina de Registro Arancelario</span>
              <span style={{ color: '#64748b' }}>Requiere Puerto Nivel II</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
              <span>🏮 Faro Colonial de la Bahía</span>
              <span style={{ color: '#64748b' }}>Requiere Puerto Nivel III</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '2px' }}>
              <span>🌊 Dársena de Defensa Fluvial</span>
              <span style={{ color: '#64748b' }}>Requiere Fortaleza Nivel II</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
