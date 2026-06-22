import React from 'react';
import { useGame } from '../core/context/GameContext';
import cityCentersConfig from '../config/city_centers_config.json';

export default function CityPanel({ onClose, onOpenCenter }) {
  const { gameState } = useGame();
  const districts = gameState.customDistricts || [];

  // Helper to check if a district is operational
  const isOperational = (type) => districts.some(d => d.type === type && d.status === 'operational');

  // Eval centers from config
  const centers = cityCentersConfig.map(center => {
    // Check if any of the required district types is operational
    const hasRequired = center.requiredDistrictTypes.some(type => isOperational(type));
    
    // Some centers might be unlocked by default or have specific logic if we want,
    // but the prompt says to require the physical building or show warning.
    // Vida Urbana requires market, tavern, church, or hospital
    // Crew requires tavern or port
    
    return {
      ...center,
      isUnlocked: hasRequired,
      requirementText: `Requiere ${center.requiredDistrictTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' o ')} operativo.`
    };
  });

  const handleFocusMap = (e, center) => {
    e.stopPropagation();
    const reqTypes = center.requiredDistrictTypes || [];
    const district = districts.find(d => reqTypes.includes(d.type) && d.status === 'operational');
    
    if (district && district.geometry && district.geometry.coordinates && window.map) {
      // coordinates is [[[lng, lat], [lng, lat], ...]]
      const coords = district.geometry.coordinates[0];
      if (coords && coords.length > 0) {
        // Calculate bounds
        const lats = coords.map(c => c[1]);
        const lngs = coords.map(c => c[0]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        window.map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [20, 20], maxZoom: 17 });
      }
      onClose(); // Close the panel to see the map
    }
  };
  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0b0f19', borderTop: '4px solid #3b82f6',
      borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
      zIndex: 1001, display: 'flex', flexDirection: 'column',
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
          <span style={{ fontSize: '24px' }}>🌆</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>
              Centro Urbano e Instituciones
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Gestiona el crecimiento científico, comercial y naval interno
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

      {/* Grid of Cards */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {centers.map(center => {
          const activeResearchId = gameState.research?.activeResearch?.id;
          const isResearching = center.id === 'university' && activeResearchId;
          const underConst = gameState.fleet?.shipsUnderConstruction?.length || 0;
          const isBuildingShip = center.id === 'shipyard' && underConst > 0;
          const activeLoans = gameState.bank?.loans?.length || 0;
          const hasDebt = center.id === 'bank' && activeLoans > 0;

          return (
            <div 
              key={center.id}
              onClick={() => center.isUnlocked && onOpenCenter(center.id)}
              style={{
                background: center.isUnlocked ? '#1e293b' : 'rgba(15, 23, 42, 0.4)',
                border: `1px solid ${center.isUnlocked ? '#334155' : '#1e293b'}`,
                borderRadius: '8px',
                padding: '14px 16px',
                cursor: center.isUnlocked ? 'pointer' : 'not-allowed',
                opacity: center.isUnlocked ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{
                fontSize: '28px',
                background: center.isUnlocked ? '#0f172a' : '#111',
                padding: '10px',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #1e293b'
              }}>
                {center.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '15px', color: center.isUnlocked ? '#f8fafc' : '#64748b' }}>
                    {center.name}
                  </span>
                  
                  {/* Status Badge */}
                  {center.isUnlocked ? (
                    <span style={{
                      fontSize: '9px', background: 'rgba(16,185,129,0.15)', color: '#10b981',
                      padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'
                    }}>
                      Disponible
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '9px', background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                      padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'
                    }}>
                      Bloqueado
                    </span>
                  )}

                  {/* Activity Indicator Badge */}
                  {isResearching && (
                    <span style={{
                      fontSize: '9px', background: 'rgba(59,130,246,0.2)', color: '#3b82f6',
                      padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'
                    }}>
                      ⚡ Investigando
                    </span>
                  )}
                  {isBuildingShip && (
                    <span style={{
                      fontSize: '9px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
                      padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'
                    }}>
                      🛠️ Construyendo ({underConst})
                    </span>
                  )}
                  {hasDebt && (
                    <span style={{
                      fontSize: '9px', background: 'rgba(239,68,68,0.2)', color: '#ef4444',
                      padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'
                    }}>
                      💸 Préstamo ({activeLoans})
                    </span>
                  )}
                </div>
                
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.3' }}>
                  {center.description}
                </div>

                {center.isUnlocked && center.mapFocus && (
                  <button
                    onClick={(e) => handleFocusMap(e, center)}
                    style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    📍 Ver en mapa
                  </button>
                )}

                {!center.isUnlocked && (
                  <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⚠️</span>
                    <span>{center.requirementText} (Falta edificio físico)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
