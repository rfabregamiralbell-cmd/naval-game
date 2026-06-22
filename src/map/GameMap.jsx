import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGame } from '../core/context/GameContext';
import buildingsConfig from '../config/buildings_config.json';
import UrbanPlanningOverlay from '../components/UrbanPlanningOverlay';
import { getLevelFromWorkers } from '../engines/economy/districtStats';

// Import our new components
import CustomDistrictsLayer from './layers/CustomDistrictsLayer';
import CustomDistrictPopup from '../panels/CustomDistrictPopup';
import DistrictListPanel from '../panels/DistrictListPanel';
import InfluenceLayer from './layers/InfluenceLayer';
import StreetLogisticsLayer from './layers/StreetLogisticsLayer';
import TerrainDefenseLayer from './layers/TerrainDefenseLayer';
import { calculateDistrictStats } from '../engines/economy/districtStats';
import { formatDuration } from '../utils/formatters';
import resourcesConfig from '../config/resources_config.json';
import { getActiveBalanceConfig } from '../engines/economy/economyEngine';

const ICONS = {
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

// Map event observers
function MapCenterObserver({ isActive, onCenterChanged }) {
  const map = useMap();
  useEffect(() => {
    if (!isActive) return;
    
    let isCalculating = false;
    let timeout;
    
    const handler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!isCalculating) {
          isCalculating = true;
          onCenterChanged(map.getCenter(), () => {
            isCalculating = false;
          });
        }
      }, 50);
    };

    map.on('move', handler);
    handler();

    return () => {
      map.off('move', handler);
      clearTimeout(timeout);
    };
  }, [map, isActive, onCenterChanged]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      onMapClick();
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map, onMapClick]);
  return null;
}

function MapRefRegister() {
  const map = useMap();
  useEffect(() => {
    window.map = map;
  }, [map]);
  return null;
}


export default function GameMap({ activeMapLayers = [] }) {
  const { 
    gameState, 
    setGameState, 
    planningMode, 
    setPlanningMode, 
    deductResources, 
    hasResources,
    addDistrict,
    selectedDistrictId,
    setSelectedDistrictId,
    isListOpen,
    setIsListOpen
  } = useGame();

  const [planningPoly, setPlanningPoly] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Expansion mode states
  const [expansionMode, setExpansionMode] = useState({ active: false, district: null, workersAdded: 30 });
  const [expansionPreview, setExpansionPreview] = useState(null);
  const [isExpanding, setIsExpanding] = useState(false);

  const mapRef = React.useRef(null);
  const position = [10.42, -75.54];

  // Tick construction countdowns once per second
  useEffect(() => {
    const timer = setInterval(() => {
      let changed = false;
      const updatedDistricts = gameState.customDistricts?.map(d => {
        if ((d.status === 'constructing' || d.status === 'upgrading') && d.constructionEndsAt && Date.now() >= d.constructionEndsAt) {
          changed = true;
          return { ...d, status: 'operational' };
        }
        return d;
      });
      if (changed) {
        setGameState(prev => ({
          ...prev,
          customDistricts: updatedDistricts
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.customDistricts, setGameState]);

  // Clean planning overlays on mode exit
  useEffect(() => {
    if (!planningMode.active) {
      setPlanningPoly(null);
      setValidationData(null);
    }
  }, [planningMode.active]);

  // Calculate expansion preview whenever parameters change
  useEffect(() => {
    if (!expansionMode.active || !expansionMode.district) {
      setExpansionPreview(null);
      return;
    }

    setIsExpanding(true);
    import('../engines/planning/districtExpansion').then(({ proposeExpansion }) => {
      proposeExpansion(expansionMode.district, expansionMode.workersAdded, gameState.customDistricts, gameState.cabildoLevel || 1)
        .then(data => {
          setExpansionPreview(data);
          setIsExpanding(false);
        })
        .catch(err => {
          console.error("Expansion preview error:", err);
          setIsExpanding(false);
        });
    });
  }, [expansionMode.active, expansionMode.workersAdded, expansionMode.district, gameState.customDistricts]);

  const handlePreviewCenter = useCallback((center, doneCallback) => {
    if (!planningMode.active || planningMode.mode !== 'center_marker') {
      if (doneCallback) doneCallback();
      return;
    }
    
    setIsValidating(true);
    import('../utils/smartDistrictFill').then(({ generateDistrictFromSeed }) => {
      generateDistrictFromSeed({
        buildingType: planningMode.buildingType,
        seedLatLng: { lat: center.lat, lng: center.lng },
        targetWorkers: planningMode.targetWorkers || 30,
        targetAreaM2: planningMode.targetAreaM2 || 2400,
        existingDistricts: gameState.customDistricts || [],
        cabildoLevel: gameState.cabildoLevel
      }).then(data => {
        setValidationData(data);
        setPlanningPoly(data.polygon);
        setIsValidating(false);
        if (doneCallback) doneCallback();
      }).catch(err => {
        console.error("Center marker preview error:", err);
        setIsValidating(false);
        if (doneCallback) doneCallback();
      });
    });
  }, [planningMode, gameState.customDistricts, gameState.cabildoLevel]);

  // Handle map click to deselect district
  const handleMapClick = useCallback(() => {
    setSelectedDistrictId(null);
  }, [setSelectedDistrictId]);

  // Confirm new placement
  const handleConfirmPlacement = async () => {
    if (!validationData || !validationData.valid) return;
    if (!hasResources(validationData.cost)) return; // Anti-exploit guard
    
    deductResources(validationData.cost);
    
    const { findSafeMainBuildingPoint } = await import('../engines/planning/districtValidation');
    const safePt = await findSafeMainBuildingPoint(planningPoly);

    const bConfig = buildingsConfig[planningMode.buildingType];
    const initialLevel = getLevelFromWorkers(planningMode.buildingType, validationData.workersRequired);
    const lvlConfig = bConfig?.levels?.[initialLevel.toString()] || {};
    const baseDurationSec = lvlConfig.buildDurationSec || 60;

    const { getActiveBalanceConfig } = await import('../engines/economy/economyEngine');
    const activeConfig = getActiveBalanceConfig();
    const durationMs = Math.max(1000, Math.round(baseDurationSec * activeConfig.constructionTimeMultiplier * 1000));

    addDistrict({
      id: `custom_${Date.now()}`,
      type: planningMode.buildingType,
      name: bConfig.name,
      polygon: planningPoly,
      mainBuildingPoint: safePt,
      areaM2: validationData.areaM2,
      targetWorkers: validationData.targetWorkers,
      workersRequired: validationData.workersRequired,
      assignedWorkers: validationData.workersRequired,
      level: initialLevel,
      status: 'constructing',
      createdAt: Date.now(),
      constructionStartedAt: Date.now(),
      constructionEndsAt: Date.now() + durationMs,
      cost: validationData.cost,
      expansions: [],
      generationMethod: 'center_marker_smart_fill'
    });

    setPlanningMode({ active: false });
  };

  // Confirm expansion
  const handleConfirmExpansion = async () => {
    if (!expansionPreview || !expansionPreview.valid) return;
    const cost = expansionPreview.cost;
    if (!hasResources(cost)) return; // Anti-exploit guard
    
    deductResources(cost);

    const { combineDistrictPolygons } = await import('../engines/planning/districtExpansion');
    const { findSafeMainBuildingPoint } = await import('../engines/planning/districtValidation');

    const combinedPoly = combineDistrictPolygons(expansionMode.district.polygon, expansionPreview.polygon);
    const newAreaM2 = expansionMode.district.areaM2 + expansionPreview.areaAddedM2;
    const newWorkers = (expansionMode.district.assignedWorkers || expansionMode.district.workersRequired) + expansionPreview.workersAdded;
    
    const safePt = await findSafeMainBuildingPoint(combinedPoly);

    const bConfig = buildingsConfig[expansionMode.district.type];
    const newLevel = getLevelFromWorkers(expansionMode.district.type, newWorkers);
    const lvlConfig = bConfig?.levels?.[newLevel.toString()] || {};
    let baseDurationSec = lvlConfig.buildDurationSec || 60;

    const currentLevel = getLevelFromWorkers(expansionMode.district.type, expansionMode.district.assignedWorkers || expansionMode.district.workersRequired);
    if (newLevel === currentLevel) {
      baseDurationSec = Math.round(baseDurationSec * 0.3); // 30% of base build time if level does not change
    }

    const { getActiveBalanceConfig } = await import('../engines/economy/economyEngine');
    const activeConfig = getActiveBalanceConfig();
    const durationMs = Math.max(1000, Math.round(baseDurationSec * activeConfig.constructionTimeMultiplier * 1000));

    setGameState(prev => ({
      ...prev,
      customDistricts: prev.customDistricts.map(d => {
        if (d.id === expansionMode.district.id) {
          const prevExpansions = d.expansions || [];
          const newExpansion = {
            id: `expansion_${Date.now()}`,
            areaAddedM2: expansionPreview.areaAddedM2,
            workersAdded: expansionPreview.workersAdded,
            cost: cost,
            createdAt: Date.now()
          };
          return {
            ...d,
            polygon: combinedPoly,
            mainBuildingPoint: safePt,
            areaM2: newAreaM2,
            assignedWorkers: newWorkers,
            workersRequired: newWorkers,
            status: 'upgrading',
            constructionEndsAt: Date.now() + durationMs,
            expansions: [...prevExpansions, newExpansion]
          };
        }
        return d;
      })
    }));

    const dId = expansionMode.district.id;
    setExpansionMode({ active: false, district: null, workersAdded: 30 });
    setExpansionPreview(null);
    setSelectedDistrictId(dId); // Reopen management popup for this district
  };

  // Resources state check for planning overlay
  let overallStatusColor = '#10b981'; // Green
  let overallStatusColorRgba = 'rgba(16, 185, 129, 0.2)';
  let shortMessage = 'Válido';
  if (validationData) {
    const { valid, cost } = validationData;
    const canAfford = cost && hasResources(cost);
    
    if (!valid) {
      overallStatusColor = '#ef4444'; // Red
      overallStatusColorRgba = 'rgba(239, 68, 68, 0.2)';
      shortMessage = validationData.blockedReasons[0] || 'Terreno no válido';
    } else if (!canAfford) {
      overallStatusColor = '#f59e0b'; // Yellow
      overallStatusColorRgba = 'rgba(245, 158, 11, 0.2)';
      shortMessage = 'Faltan recursos';
    }
  }

  // Expansion afford check
  const canAffordExpansion = expansionPreview && hasResources(expansionPreview.cost);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer 
        ref={mapRef}
        center={position} 
        zoom={14} 
        style={{ width: '100%', height: '100%', background: '#1a1a1a' }} 
        zoomControl={false}
      >
        <MapCenterObserver 
          isActive={planningMode.active && planningMode.mode === 'center_marker'}
          onCenterChanged={handlePreviewCenter}
        />

        <MapClickHandler onMapClick={handleMapClick} />

        <MapRefRegister />


        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri" maxZoom={18}
        />

        {/* Dynamic Built Districts Overlay */}
        <CustomDistrictsLayer 
          selectedDistrictId={selectedDistrictId}
          onSelectDistrict={(dist) => {
            if (!expansionMode.active) {
              setSelectedDistrictId(dist.id);
            }
          }}
        />

        {/* List Panel inside map so it has Leaflet MapContext */}
        <DistrictListPanel 
          isOpen={isListOpen}
          onClose={() => setIsListOpen(false)}
          onSelectDistrict={(dist) => {
            setSelectedDistrictId(dist.id);
          }}
        />

        {/* Placing new district preview */}
        {planningPoly && planningMode.active && (
          <GeoJSON 
            key={`planning_${Date.now()}`} 
            data={planningPoly} 
            style={{
              color: overallStatusColor,
              weight: 3,
              fillColor: overallStatusColor,
              fillOpacity: 0.25
            }}
          />
        )}

        {/* Expansion proposed area preview */}
        {expansionMode.active && expansionPreview?.polygon && (
          <GeoJSON
            key={`expansion_preview_${Date.now()}`}
            data={expansionPreview.polygon}
            style={{
              color: expansionPreview.valid ? '#b8c875' : '#ff3333',
              weight: 3,
              fillColor: expansionPreview.valid ? '#8b9045' : '#ef4444',
              fillOpacity: 0.18,
              dashArray: '5, 5'
            }}
          />
        )}
        
        {/* Map Layers (Influences, Logistics, etc.) */}
        <InfluenceLayer districts={gameState.customDistricts} activeInfluenceTypes={activeMapLayers} />
        <StreetLogisticsLayer districts={gameState.customDistricts} activeLayers={activeMapLayers} />
        <TerrainDefenseLayer districts={gameState.customDistricts} activeLayers={activeMapLayers} />
        
      </MapContainer>

      {/* PLACING MARKER OVERLAY */}
      {planningMode.active && planningMode.mode === 'center_marker' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 1000, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          {validationData && !isValidating && (
            <div style={{
              background: overallStatusColor, color: '#fff', padding: '4px 8px', borderRadius: '4px',
              fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
            }}>
              {shortMessage}
            </div>
          )}
          <div style={{ 
            width: '60px', height: '60px', border: `2px dashed ${overallStatusColor}`, borderRadius: '50%', 
            background: overallStatusColorRgba, display: 'flex', justifyContent: 'center', alignItems: 'center',
            boxShadow: `0 0 15px ${overallStatusColorRgba}`
          }}>
            <span style={{ fontSize: '24px' }}>{ICONS[planningMode.buildingType] || '📍'}</span>
          </div>
          <div style={{ width: '2px', height: '15px', background: overallStatusColor, marginTop: '5px' }}></div>
          <div style={{ width: '8px', height: '8px', background: overallStatusColor, borderRadius: '50%' }}></div>
        </div>
      )}

      {/* PLACING BOTTOM SHEET */}
      {planningMode.active && (
        <UrbanPlanningOverlay 
          validationData={validationData}
          isValidating={isValidating}
          buildingType={planningMode.buildingType}
          config={buildingsConfig[planningMode.buildingType]}
          onConfirm={handleConfirmPlacement}
          onCancel={() => setPlanningMode({ active: false })}
        />
      )}

      {/* DISTRICT DETAIL BOTTOM SHEET */}
      {selectedDistrictId && !expansionMode.active && (
        <CustomDistrictPopup 
          districtId={selectedDistrictId}
          onClose={() => setSelectedDistrictId(null)}
          onStartExpansion={(dist) => {
            setSelectedDistrictId(null);
            setExpansionMode({ active: true, district: dist, workersAdded: 30 });
          }}
        />
      )}

      {/* EXPANSION CONTROL PANEL */}
      {expansionMode.active && expansionMode.district && (
        <div className="mobile-bottom-sheet" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#141414', borderTop: '4px solid #3b82f6',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
          zIndex: 1001, padding: '20px', color: '#fff',
          fontFamily: "'Outfit', 'Inter', sans-serif"
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '10px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#3b82f6' }}>
              ➕ Ampliar {DISTRICT_NAMES[expansionMode.district.type]}
            </h3>
            <button 
              onClick={() => {
                const dId = expansionMode.district.id;
                setExpansionMode({ active: false, district: null, workersAdded: 30 });
                setSelectedDistrictId(dId);
              }}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px' }}
            >
              ×
            </button>
          </div>

          {/* Increment Select */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>
              Incremento de Trabajadores
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[10, 30, 80].map((num) => (
                <button
                  key={num}
                  onClick={() => setExpansionMode(prev => ({ ...prev, workersAdded: num }))}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '4px', fontWeight: 'bold',
                    background: expansionMode.workersAdded === num ? '#3b82f6' : '#222',
                    color: '#fff', border: `1px solid ${expansionMode.workersAdded === num ? '#60a5fa' : '#444'}`
                  }}
                >
                  +{num} Trab.
                </button>
              ))}
            </div>
          </div>

          {/* Preview Details */}
          {isExpanding ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
              Analizando terreno y celdas...
            </div>
          ) : expansionPreview ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
              
              {/* Validation Result */}
              <div style={{
                background: '#1d1d1d', padding: '10px', borderRadius: '6px',
                borderLeft: `4px solid ${expansionPreview.valid ? '#10b981' : '#ef4444'}`
              }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: expansionPreview.valid ? '#10b981' : '#ef4444', display: 'block' }}>
                  {expansionPreview.valid ? 'Zona de ampliación válida' : 'Ampliación inválida'}
                </span>
                {!expansionPreview.valid && (
                  <span style={{ fontSize: '12px', color: '#ff3333', marginTop: '2px', display: 'block' }}>
                    {expansionPreview.messages[0] === 'No puedes ampliar hacia agua o humedal'
                      ? 'No puedes ampliar hacia agua o humedal'
                      : expansionPreview.messages[0] === 'Esta zona parece inundable'
                      ? 'Esta zona parece inundable'
                      : 'No hay suficiente terreno seco contiguo'}
                  </span>
                )}
                {expansionPreview.valid && (
                  <span style={{ fontSize: '12px', color: '#aaa' }}>
                    Área añadida: +{new Intl.NumberFormat('es-CO').format(expansionPreview.areaAddedM2)} m²
                  </span>
                )}
              </div>

              {/* Cost and Resources */}
              <div style={{
                background: '#1d1d1d', padding: '10px', borderRadius: '6px',
                borderLeft: `4px solid ${canAffordExpansion ? '#10b981' : '#f59e0b'}`
              }}>
                <span style={{ fontSize: '12px', color: '#aaa', display: 'block' }}>
                  Coste de ampliación: {Object.entries(expansionPreview.cost).map(([resId, amt]) => {
                    const name = resourcesConfig[resId]?.name || resId;
                    const icon = resourcesConfig[resId]?.icon || '📦';
                    return `${icon} ${amt} ${name}`;
                  }).join(', ')}
                </span>
                {!canAffordExpansion && (
                  <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold', marginTop: '2px', display: 'block' }}>
                    Faltan recursos para la ampliación
                  </span>
                )}
              </div>

              {/* Production and Workers Stats */}
              {expansionPreview.valid && (
                <div style={{ background: '#1d1d1d', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Trabajadores finales: {(expansionMode.district.assignedWorkers || expansionMode.district.workersRequired) + expansionPreview.workersAdded}</div>
                  <div style={{ color: '#a3e635', fontWeight: 'bold' }}>
                    Nueva producción estimada: +{calculateDistrictStats(expansionMode.district.type, expansionMode.district.areaM2 + expansionPreview.areaAddedM2, (expansionMode.district.assignedWorkers || expansionMode.district.workersRequired) + expansionPreview.workersAdded, expansionMode.district.level).production.rate} {calculateDistrictStats(expansionMode.district.type, expansionMode.district.areaM2 + expansionPreview.areaAddedM2, (expansionMode.district.assignedWorkers || expansionMode.district.workersRequired) + expansionPreview.workersAdded, expansionMode.district.level).production.label}/día
                  </div>
                  {(() => {
                    const bConfig = buildingsConfig[expansionMode.district.type];
                    const currentWorkers = expansionMode.district.assignedWorkers || expansionMode.district.workersRequired;
                    const newWorkers = currentWorkers + expansionPreview.workersAdded;
                    const newLevel = getLevelFromWorkers(expansionMode.district.type, newWorkers);
                    const lvlConfig = bConfig?.levels?.[newLevel.toString()] || {};
                    let baseDurationSec = lvlConfig.buildDurationSec || 60;
                    
                    const currentLevel = getLevelFromWorkers(expansionMode.district.type, currentWorkers);
                    if (newLevel === currentLevel) {
                      baseDurationSec = Math.round(baseDurationSec * 0.3);
                    }
                    
                    const activeConfig = getActiveBalanceConfig();
                    const durationMs = Math.max(1000, Math.round(baseDurationSec * activeConfig.constructionTimeMultiplier * 1000));
                    return (
                      <div style={{ color: '#60a5fa', fontWeight: 'bold', borderTop: '1px solid #333', paddingTop: '4px', marginTop: '2px' }}>
                        ⏱️ Duración de ampliación: {formatDuration(durationMs)}
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          ) : null}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                const dId = expansionMode.district.id;
                setExpansionMode({ active: false, district: null, workersAdded: 30 });
                setExpansionPreview(null);
                setSelectedDistrictId(dId);
              }}
              style={{ flex: 1, padding: '12px', background: '#222', color: '#ccc', border: '1px solid #444', borderRadius: '4px', fontWeight: 'bold' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmExpansion}
              disabled={isExpanding || !expansionPreview || !expansionPreview.valid || !canAffordExpansion}
              style={{
                flex: 1, padding: '12px', borderRadius: '4px', fontWeight: 'bold',
                background: (expansionPreview?.valid && canAffordExpansion) ? '#10b981' : '#222',
                color: (expansionPreview?.valid && canAffordExpansion) ? '#fff' : '#555',
                border: 'none', cursor: (expansionPreview?.valid && canAffordExpansion) ? 'pointer' : 'not-allowed'
              }}
            >
              Confirmar ampliación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
