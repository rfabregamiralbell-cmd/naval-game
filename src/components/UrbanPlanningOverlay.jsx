import React from 'react';
import { useGame } from '../context/GameContext';

export default function UrbanPlanningOverlay({ isValidating, validationData, config, buildingType, onConfirm, onCancel }) {
  const { gameState } = useGame();
  const res = gameState.resources;

  if (isValidating || !validationData) {
    return (
      <div className="mobile-bottom-sheet" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a1a1a', borderTop: `2px solid #3b82f6`,
        borderTopLeftRadius: '16px', borderTopRightRadius: '16px', zIndex: 1001, padding: '30px', textAlign: 'center'
      }}>
        <h2 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px' }}>
          Analizando terreno...
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const { valid, blockedReasons, areaM2, targetAreaM2, workersRequired, targetWorkers, cost } = validationData;
  
  const goldMissing = cost ? Math.max(0, cost.gold - res.gold) : 0;
  const woodMissing = cost ? Math.max(0, cost.wood - res.wood) : 0;
  const canAfford = goldMissing === 0 && woodMissing === 0;

  let overallStatusColor = '#10b981'; // Green
  let overallStatusText = 'Confirmable';
  if (!valid) {
    overallStatusColor = '#ef4444'; // Red
    overallStatusText = 'No puedes construir todavía';
  } else if (!canAfford) {
    overallStatusColor = '#f59e0b'; // Yellow
    overallStatusText = 'No puedes construir todavía';
  }

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a1a1a', borderTop: `4px solid ${overallStatusColor}`,
      borderTopLeftRadius: '16px', borderTopRightRadius: '16px', zIndex: 1001, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '15px', borderBottom: '1px solid #333' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Trazando: {config?.name || buildingType}</h2>
      </div>
      
      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* TERRAIN STATE */}
        <div style={{ background: '#222', padding: '10px', borderRadius: '6px', borderLeft: `4px solid ${valid ? '#10b981' : '#ef4444'}` }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: valid ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
            Estado terreno: {valid ? 'Válido' : 'Inválido'}
          </p>
          {!valid && blockedReasons && blockedReasons.length > 0 && (
            <ul style={{ margin: '5px 0 0', paddingLeft: '20px', color: '#ef4444', fontSize: '12px' }}>
              {blockedReasons.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {valid && (
            <p style={{ margin: '0', fontSize: '12px', color: '#aaa' }}>
              Área: {areaM2} / obj {targetAreaM2} m²<br/>Trabajadores: {workersRequired} / {targetWorkers}
            </p>
          )}
        </div>

        {/* RESOURCE STATE */}
        <div style={{ background: '#222', padding: '10px', borderRadius: '6px', borderLeft: `4px solid ${canAfford ? '#10b981' : '#f59e0b'}` }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: canAfford ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
            Recursos: {canAfford ? 'Suficientes' : 'Faltan recursos'}
          </p>
          <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#aaa' }}>
            Coste total: {cost?.gold} Oro, {cost?.wood} Madera
          </p>
          {!canAfford && (
            <p style={{ margin: '0', fontSize: '12px', color: '#f59e0b' }}>
              Faltan: {goldMissing > 0 ? `${goldMissing} oro` : ''} {goldMissing > 0 && woodMissing > 0 ? 'y' : ''} {woodMissing > 0 ? `${woodMissing} madera` : ''}
            </p>
          )}
        </div>

      </div>

      <div style={{ padding: '15px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '8px', background: '#222', color: '#ccc', border: '1px solid #444', borderRadius: '4px' }}>
          📏 Cambiar tamaño
        </button>
        <button onClick={onCancel} style={{ width: '100%', marginTop: '5px', padding: '10px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}>
          Cancelar
        </button>
        <button 
          onClick={onConfirm} 
          disabled={!valid || !canAfford} 
          style={{ 
            width: '100%', marginTop: '5px', padding: '10px', 
            background: (valid && canAfford) ? '#10b981' : '#111', 
            color: (valid && canAfford) ? '#fff' : '#555', 
            border: `1px solid ${(valid && canAfford) ? '#059669' : '#333'}`, 
            borderRadius: '4px', fontWeight: 'bold' 
          }}
        >
          {valid && canAfford ? 'Confirmar construcción' : overallStatusText}
        </button>
      </div>
    </div>
  );
}
