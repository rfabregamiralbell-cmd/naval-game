import React, { useMemo } from 'react';
import { useGame } from '../core/context/GameContext';
import { evaluateCityDefense } from '../engines/defense/terrainDefenseEngine';

export default function MilitaryDefensePanel({ onClose }) {
  const { gameState } = useGame();
  
  const defenseStats = useMemo(() => evaluateCityDefense(gameState.customDistricts || []), [gameState.customDistricts]);

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0b0f19', borderTop: '4px solid #ef4444',
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
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fca5a5' }}>
              Defensa y Militar
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Puntos fuertes y vulnerabilidades de la ciudad
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
        
        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Puntuación de Defensa Global</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{defenseStats.totalDefenseScore}</div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Nodos Militares</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc' }}>{defenseStats.militaryNodes.length}</div>
          </div>
          <div style={{ flex: 1, background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Distritos Protegidos</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc' }}>{defenseStats.protectedCount}</div>
          </div>
        </div>

        {defenseStats.vulnerabilities.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#ef4444', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span> Vulnerabilidades Críticas
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {defenseStats.vulnerabilities.map((vuln, i) => (
                <div key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#fca5a5' }}>
                  {vuln}
                </div>
              ))}
            </div>
          </div>
        )}

        {defenseStats.vulnerabilities.length === 0 && defenseStats.militaryNodes.length > 0 && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✅</span> Todos los objetivos críticos están bajo cobertura militar.
          </div>
        )}

        {defenseStats.militaryNodes.length === 0 && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span> La ciudad no tiene defensas militares activas. Construye murallas o fortalezas.
          </div>
        )}

      </div>
    </div>
  );
}
