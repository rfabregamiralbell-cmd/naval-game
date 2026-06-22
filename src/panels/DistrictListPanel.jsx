import React from 'react';
import { useMap } from 'react-leaflet';
import { useGame } from '../core/context/GameContext';
import { calculateDistrictStats } from '../engines/economy/districtStats';

const DISTRICT_ICONS = {
  cabildo: '🏛️',
  hacienda: '🌾',
  gremio: '⚒️',
  almacen: '📦',
  aduana: '⚖️',
  puerto: '⛵',
  arsenal: '⚓',
  fortaleza: '🏰',
  camino: '🛣️'
};

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

export default function DistrictListPanel({ isOpen, onClose, onSelectDistrict }) {
  const { gameState } = useGame();
  const map = useMap();

  if (!isOpen) return null;

  const districts = gameState.customDistricts || [];

  const handleRowClick = (dist) => {
    if (dist.mainBuildingPoint) {
      // Zoom closer (16) and center map
      map.flyTo(dist.mainBuildingPoint, 16, { animate: true, duration: 1.0 });
    }
    onSelectDistrict(dist);
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', top: '70px', right: '20px', bottom: '20px',
      width: '320px', background: 'rgba(20, 20, 20, 0.95)',
      border: '1px solid #d4af37', borderRadius: '8px', zIndex: 1000,
      display: 'flex', flexDirection: 'column', color: '#fff',
      fontFamily: "'Outfit', 'Inter', sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.8)'
    }}>
      {/* Title Header */}
      <div style={{
        padding: '12px 15px', borderBottom: '1px solid #333',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '15px', color: '#d4af37' }}>
          📋 Lista de Distritos ({districts.length})
        </h3>
        <button 
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#888',
            fontSize: '18px', cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>

      {/* List Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {districts.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
            No hay distritos construidos aún.
          </div>
        ) : (
          districts.map((dist) => {
            const stats = calculateDistrictStats(dist.type, dist.areaM2, dist.assignedWorkers, dist.level || 1, districts);
            const iconChar = DISTRICT_ICONS[dist.type] || '📍';
            
            let statusBadge = null;
            if (dist.status === 'constructing') {
              statusBadge = (
                <span style={{
                  fontSize: '9px', background: '#f59e0b', color: '#000',
                  padding: '2px 4px', borderRadius: '3px', fontWeight: 'bold', marginLeft: '5px'
                }}>
                  Construyendo
                </span>
              );
            }

            return (
              <div 
                key={dist.id}
                onClick={() => handleRowClick(dist)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid #222', borderRadius: '4px',
                  padding: '10px', marginBottom: '8px', cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)'; e.currentTarget.style.borderColor = '#d4af37'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = '#222'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#e0e0e0' }}>
                    {iconChar} {DISTRICT_NAMES[dist.type]} {stats.levelRoman}
                    {statusBadge}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa' }}>
                  <span>👥 {stats.assignedWorkers} trab.</span>
                  <span style={{ color: '#a3e635', fontWeight: 'bold' }}>
                    💰 +{stats.production.rate} {stats.production.label}/día
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
