import React, { useState } from 'react';
import { useGame } from './context/GameContext';
import GameMap from './components/GameMap';
import TownHallPopup from './components/TownHallPopup';
import EconomyPanel from './ui/EconomyPanel';
import resourcesConfig from './data/resources_config.json';
import { getActiveBalanceConfig } from './economy/economyEngine';

// Import new City panels
import CityPanel from './ui/CityPanel';
import UniversityPanel from './ui/UniversityPanel';
import PortPanel from './ui/PortPanel';
import ShipyardPanel from './ui/ShipyardPanel';
import WarehousePanel from './ui/WarehousePanel';
import GoodsMarketPanel from './ui/GoodsMarketPanel';
import BankPanel from './ui/BankPanel';
import CityLifePanel from './ui/CityLifePanel';
import CrewPanel from './ui/CrewPanel';
import MapLayersPanel from './ui/MapLayersPanel';
import MilitaryDefensePanel from './ui/MilitaryDefensePanel';

function App() {
  const { gameState, resetGame, setIsListOpen } = useGame();
  const [showTownHall, setShowTownHall] = useState(false);
  const [showEconomy, setShowEconomy] = useState(false);
  const [showDebugJson, setShowDebugJson] = useState(false);
  
  // City navigation state
  const [showCity, setShowCity] = useState(false);
  const [activeCityCenter, setActiveCityCenter] = useState('main'); // 'main', 'university', 'port', etc.
  
  // Map layers state
  const [showMapLayers, setShowMapLayers] = useState(false);
  const [activeMapLayers, setActiveMapLayers] = useState([]);

  const districts = gameState.customDistricts || [];

  const hasArsenal = districts.some(d => d.type === 'arsenal' && d.status === 'operational');
  const hasFortaleza = districts.some(d => d.type === 'fortaleza' && d.status === 'operational');

  const showConditional = (resId) => {
    const amount = gameState.resources[resId] || 0;
    if (amount > 0) return true;
    if (resId === 'sails' && hasArsenal) return true;
    if ((resId === 'cannons' || resId === 'gunpowder') && (hasArsenal || hasFortaleza)) return true;
    return false;
  };

  const primaryResources = ['gold', 'wood', 'materials', 'goods', 'crew'];
  const conditionalResources = ['sails', 'cannons', 'gunpowder'];

  const renderedResources = [];
  primaryResources.forEach(resId => {
    const config = resourcesConfig[resId];
    renderedResources.push({
      id: resId,
      name: config?.name || resId,
      icon: config?.icon || '📦',
      amount: gameState.resources[resId] || 0,
      color: resId === 'gold' ? '#d4af37' : resId === 'wood' ? '#a3e635' : resId === 'materials' ? '#38bdf8' : resId === 'goods' ? '#f59e0b' : '#a78bfa'
    });
  });

  conditionalResources.forEach(resId => {
    if (showConditional(resId)) {
      const config = resourcesConfig[resId];
      renderedResources.push({
        id: resId,
        name: config?.name || resId,
        icon: config?.icon || '⚓',
        amount: gameState.resources[resId] || 0,
        color: resId === 'sails' ? '#60a5fa' : resId === 'cannons' ? '#ef4444' : '#fb923c'
      });
    }
  });

  const handleCloseCity = () => {
    setShowCity(false);
    setActiveCityCenter('main');
  };

  const handleOpenCenter = (centerId) => {
    setActiveCityCenter(centerId);
  };

  const handleBackToCity = () => {
    setActiveCityCenter('main');
  };

  const toggleLayer = (layerId) => {
    if (layerId === 'clear_all') {
      setActiveMapLayers([]);
      return;
    }
    
    if (layerId === 'all_influences') {
      setActiveMapLayers(prev => prev.includes('all_influences') ? prev.filter(l => l !== 'all_influences') : [...prev, 'all_influences']);
      return;
    }

    setActiveMapLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(l => l !== layerId)
        : [...prev, layerId]
    );
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      
      {/* HUD Global */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '8px',
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {/* Resources & Demographics Bar */}
          <div style={{
            display: 'flex', gap: '8px', flexWrap: 'wrap', pointerEvents: 'auto',
            maxWidth: '75%', overflowX: 'auto', paddingBottom: '4px'
          }}>
            {/* Standard and Conditional Stockpiles */}
            {renderedResources.map(res => (
              <div 
                key={res.id} 
                title={res.name}
                style={{
                  background: 'rgba(20,20,20,0.75)', backdropFilter: 'blur(4px)',
                  padding: '4px 8px', borderRadius: '6px', border: `1px solid ${res.color}66`,
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px'
                }}
              >
                <span>{res.icon}</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{res.amount}</span>
              </div>
            ))}

            {/* Population */}
            <div 
              title="Población actual / Capacidad"
              style={{
                background: 'rgba(20,20,20,0.75)', backdropFilter: 'blur(4px)',
                padding: '4px 8px', borderRadius: '6px', border: '1px solid #f472b666',
                display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px'
              }}
            >
              <span>👤</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>
                {gameState.population?.total || 0}/{gameState.population?.capacity || 0}
              </span>
            </div>

            {/* Workers */}
            <div 
              title="Trabajadores (Libres / Asignados)"
              style={{
                background: 'rgba(20,20,20,0.75)', backdropFilter: 'blur(4px)',
                padding: '4px 8px', borderRadius: '6px', border: '1px solid #34d39966',
                display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px'
              }}
            >
              <span>👷</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>
                L: {gameState.population?.freeWorkers || 0} | A: {gameState.population?.assignedWorkers || 0}
              </span>
            </div>
          </div>

          {/* Navigation Actions */}
          <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto', alignItems: 'center' }}>
            {(() => {
              const activeConfig = getActiveBalanceConfig();
              return (
                <div 
                  id="balance-mode-indicator"
                  style={{
                    background: activeConfig.mode === 'testing' ? '#b91c1c' : '#15803d',
                    color: '#fff',
                    border: `1px solid ${activeConfig.mode === 'testing' ? '#ef4444' : '#22c55e'}`,
                    borderRadius: '4px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    marginRight: '4px'
                  }}
                >
                  Modo: {activeConfig.mode}
                </div>
              );
            })()}
            <button 
              id="districts-panel-button"
              onClick={() => setIsListOpen(prev => !prev)}
              style={{ padding: '6px 12px', background: '#8b9045', color: '#fff', border: '1px solid #6b7035', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              📋 Distritos
            </button>
            <button 
              id="economy-panel-button"
              onClick={() => setShowEconomy(true)}
              style={{ padding: '6px 12px', background: '#eab308', color: '#000', border: '1px solid #ca8a04', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              📊 Economía
            </button>
            <button 
              id="city-panel-button"
              onClick={() => { setShowCity(true); setActiveCityCenter('main'); }}
              style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: '1px solid #2563eb', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              🌆 Ciudad
            </button>
            <button 
              onClick={() => setShowMapLayers(true)}
              style={{ padding: '6px 12px', background: '#8b5cf6', color: '#fff', border: '1px solid #7c3aed', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              🗺️ Capas
            </button>
            <button 
              onClick={() => setShowDebugJson(prev => !prev)}
              style={{ padding: '6px 12px', background: '#475569', color: '#fff', border: '1px solid #334155', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              🔍 JSON
            </button>
            <button 
              onClick={resetGame}
              style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: '1px solid #b91c1c', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Map */}
      <GameMap activeMapLayers={activeMapLayers} />

      {/* Popups */}
      {showTownHall && (
        <TownHallPopup onClose={() => setShowTownHall(false)} />
      )}

      {showEconomy && (
        <EconomyPanel onClose={() => setShowEconomy(false)} />
      )}

      {/* City Panels Render */}
      {showCity && activeCityCenter === 'main' && (
        <CityPanel onClose={handleCloseCity} onOpenCenter={handleOpenCenter} />
      )}

      {showCity && activeCityCenter === 'university' && (
        <UniversityPanel onClose={handleCloseCity} onBack={handleBackToCity} />
      )}

      {showCity && activeCityCenter === 'port' && (
        <PortPanel onClose={handleCloseCity} onBack={handleBackToCity} />
      )}

      {showCity && activeCityCenter === 'shipyard' && (
        <ShipyardPanel onClose={handleCloseCity} onBack={handleBackToCity} />
      )}

      {showCity && activeCityCenter === 'warehouses' && (
        <WarehousePanel onClose={handleCloseCity} onBack={handleBackToCity} />
      )}

      {showCity && activeCityCenter === 'market' && (
        <GoodsMarketPanel onClose={handleCloseCity} onBack={handleBackToCity} />
      )}

      {showCity && activeCityCenter === 'bank' && (
        <BankPanel onClose={handleCloseCity} onBack={handleBackToCity} />
      )}

      {showCity && activeCityCenter === 'citylife' && (
        <CityLifePanel onClose={handleCloseCity} onBack={handleBackToCity} />
      )}

      {showCity && activeCityCenter === 'crew' && (
        <CrewPanel onClose={handleCloseCity} onBack={handleBackToCity} />
      )}

      {showCity && activeCityCenter === 'defense' && (
        <MilitaryDefensePanel onClose={handleCloseCity} />
      )}

      {showMapLayers && (
        <MapLayersPanel 
          activeLayers={activeMapLayers} 
          toggleLayer={toggleLayer} 
          onClose={() => setShowMapLayers(false)} 
        />
      )}

      {/* JSON Debugger */}
      {showDebugJson && (
        <div style={{
          position: 'fixed', top: '10%', left: '10%', right: '10%', bottom: '10%',
          background: 'rgba(10,10,10,0.96)', border: '2px solid #3b82f6', borderRadius: '8px',
          padding: '20px', zIndex: 3000, color: '#fff', overflow: 'auto',
          fontFamily: 'monospace', fontSize: '11px', boxShadow: '0 10px 30px rgba(0,0,0,0.9)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#d4af37' }}>🔍 Estado de Distritos Construidos (JSON)</h3>
            <button onClick={() => setShowDebugJson(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer' }}>×</button>
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(gameState, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
