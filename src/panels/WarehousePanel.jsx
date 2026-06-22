import React from 'react';
import { useGame } from '../core/context/GameContext';
import resourcesConfig from '../config/resources_config.json';
import { calculateStorageCapacity } from '../engines/economy/economyEngine';

export default function WarehousePanel({ onClose, onBack }) {
  const { gameState } = useGame();
  const storageLimits = calculateStorageCapacity(gameState);

  const categories = [
    {
      id: 'construction',
      name: 'Materiales de Construcción',
      icon: '🪵',
      resources: ['wood', 'materials', 'stone', 'brick', 'lime']
    },
    {
      id: 'coloniales',
      name: 'Productos Coloniales',
      icon: '🎋',
      resources: ['goods', 'sugar', 'tobacco', 'cocoa', 'coffee']
    },
    {
      id: 'navales',
      name: 'Materiales Navales',
      icon: '⛵',
      resources: ['sails', 'navalWood', 'rope', 'anchors', 'spareParts']
    },
    {
      id: 'militares',
      name: 'Suministros Militares',
      icon: '💣',
      resources: ['cannons', 'gunpowder', 'muskets', 'soldiers']
    },
    {
      id: 'manufacturas',
      name: 'Manufacturas de Exportación',
      icon: '⚙️',
      resources: ['tools', 'rum', 'cigars', 'clothes']
    }
  ];

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0b0f19', borderTop: '4px solid #10b981',
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
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#34d399' }}>
              Almacenes Generales del Puerto
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Control global de inventarios, stock y límites de almacenamiento
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
        
        {categories.map(cat => {
          // Filter resources: show only if amount > 0 OR visibleInHud is true
          const visibleRes = cat.resources.filter(resId => {
            const amount = gameState.resources[resId] || 0;
            const config = resourcesConfig[resId];
            return amount > 0 || config?.visibleInHud === true;
          });

          if (visibleRes.length === 0) return null; // hide empty categories

          return (
            <div 
              key={cat.id}
              style={{
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: '8px', padding: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                <strong style={{ fontSize: '14px', color: '#34d399' }}>{cat.name}</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visibleRes.map(resId => {
                  const amount = gameState.resources[resId] || 0;
                  const limit = storageLimits[resId] || 999999;
                  const pct = Math.min(100, Math.round((amount / limit) * 100));
                  const config = resourcesConfig[resId];

                  // Colors for stock urgency
                  let barColor = '#34d399';
                  if (pct >= 90) barColor = '#ef4444'; // critical / saturated
                  else if (pct >= 70) barColor = '#fb923c'; // warning

                  return (
                    <div key={resId} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>
                          {config?.icon || '📦'} {config?.name || resId}
                        </span>
                        <span>
                          <strong>{amount}</strong> <span style={{ color: '#64748b' }}>/ {limit === 999999 ? '∞' : limit}</span>
                        </span>
                      </div>
                      
                      {limit !== 999999 && (
                        <div style={{ background: '#0f172a', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ background: barColor, width: `${pct}%`, height: '100%' }}></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Storage Cap Warning Indicator */}
        {gameState.economy?.warnings?.includes('Almacenes saturados') && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
            borderRadius: '6px', padding: '10px 12px', color: '#f87171', fontSize: '12px',
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
          }}>
            ⚠️ Advertencia: Algunos almacenes están saturados. Expándelos o vende excedentes para evitar pérdidas automáticas en el siguiente ciclo.
          </div>
        )}

      </div>
    </div>
  );
}
