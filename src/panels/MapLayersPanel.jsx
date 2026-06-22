import React from 'react';

export default function MapLayersPanel({ activeLayers, toggleLayer, onClose }) {
  const layers = [
    { id: 'production', label: 'Producción', color: '#84cc16' },
    { id: 'storage', label: 'Almacenamiento', color: '#fbbf24' },
    { id: 'trade', label: 'Comercio', color: '#38bdf8' },
    { id: 'naval', label: 'Naval', color: '#2563eb' },
    { id: 'military', label: 'Militar', color: '#ef4444' },
    { id: 'urban', label: 'Urbana', color: '#a855f7' },
    { id: 'administration', label: 'Administración', color: '#f472b6' }
  ];

  const mapLayers = [
    { id: 'logistics', label: 'Logística / Calles', color: '#eab308' },
    { id: 'elevation', label: 'Elevación y Terreno', color: '#fb923c' }
  ];

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0b0f19', borderTop: '4px solid #8b5cf6',
      borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
      zIndex: 1001, display: 'flex', flexDirection: 'column',
      maxHeight: '85vh', overflowY: 'auto',
      boxShadow: '0 -5px 25px rgba(0,0,0,0.8)',
      color: '#fff', fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #1e293b',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>🗺️</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#c4b5fd' }}>
              Capas del Mapa
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Visualiza zonas de influencia y rutas
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

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 10px 0', color: '#e2e8f0', fontSize: '14px' }}>Zonas de Influencia</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
               onClick={() => toggleLayer('all_influences')}
               style={{
                  background: activeLayers.includes('all_influences') ? '#334155' : 'transparent',
                  border: '1px solid #334155', borderRadius: '4px', padding: '8px 12px',
                  color: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
               }}
            >
              <span>Mostrar Todas</span>
              <span>{activeLayers.includes('all_influences') ? '👁️' : '🕶️'}</span>
            </button>
            {layers.map(layer => {
              const isActive = activeLayers.includes(layer.id) || activeLayers.includes('all_influences');
              return (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  style={{
                    background: isActive ? `${layer.color}22` : 'transparent',
                    border: `1px solid ${isActive ? layer.color : '#1e293b'}`,
                    borderRadius: '4px', padding: '8px 12px', color: '#e2e8f0',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: layer.color }}></div>
                  <span style={{ flex: 1 }}>{layer.label}</span>
                  <span>{isActive ? '👁️' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 10px 0', color: '#e2e8f0', fontSize: '14px' }}>Capas Físicas</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mapLayers.map(layer => {
              const isActive = activeLayers.includes(layer.id);
              return (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  style={{
                    background: isActive ? `${layer.color}22` : 'transparent',
                    border: `1px solid ${isActive ? layer.color : '#1e293b'}`,
                    borderRadius: '4px', padding: '8px 12px', color: '#e2e8f0',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ flex: 1 }}>{layer.label}</span>
                  <span>{isActive ? '👁️' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 10px 0', color: '#e2e8f0', fontSize: '14px' }}>Herramientas Futuras</h4>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Análisis de espionaje en próximas subfases.
          </div>
        </div>
        
        <button
          onClick={() => toggleLayer('clear_all')}
          style={{
            marginTop: '10px', background: '#ef4444', color: '#fff', border: 'none',
            borderRadius: '4px', padding: '10px', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          Limpiar todas las capas
        </button>
      </div>
    </div>
  );
}
