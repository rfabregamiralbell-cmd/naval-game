import React, { useState, useEffect } from 'react';
import { useGame } from '../core/context/GameContext';
import researchConfig from '../config/research_config.json';
import resourcesConfig from '../config/resources_config.json';
import { formatDuration } from '../utils/formatters';

export default function UniversityPanel({ onClose, onBack }) {
  const { gameState, startResearch, hasResources } = useGame();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const active = gameState.research?.activeResearch;
  const completed = gameState.research?.completedResearch || [];

  const handleStart = (researchId, cost, durationBaseSec) => {
    startResearch(researchId, cost, durationBaseSec);
  };

  // Find active research details
  const activeDetails = active ? researchConfig[active.id] : null;
  const timeLeftMs = active ? Math.max(0, active.endsAt - now) : 0;
  
  // Calculate progress percentage
  let progressPercent = 0;
  if (active && activeDetails) {
    const totalMs = activeDetails.durationBaseSec * 1000 * (gameState.economy?.constructionTimeMultiplier ?? 1.0);
    progressPercent = Math.min(100, Math.round(((totalMs - timeLeftMs) / totalMs) * 100));
  }

  return (
    <div className="mobile-bottom-sheet" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0b0f19', borderTop: '4px solid #a855f7',
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
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#c084fc' }}>
              Real Universidad Científica
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Investiga avances tecnológicos para tu colonia
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
        
        {/* Active Research Card */}
        {active && activeDetails && (
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            border: '1px solid #c084fc', borderRadius: '8px', padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#c084fc', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Investigación en curso
              </span>
              <span style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 'bold' }}>
                ⌛ {formatDuration(timeLeftMs)}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '26px' }}>{activeDetails.icon}</span>
              <div>
                <strong style={{ fontSize: '15px' }}>{activeDetails.name}</strong>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{activeDetails.branch}</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ background: '#334155', height: '10px', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                background: 'linear-gradient(90deg, #c084fc 0%, #a855f7 100%)',
                width: `${progressPercent}%`, height: '100%', borderRadius: '5px',
                transition: 'width 0.5s ease-out'
              }}></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#c084fc', marginTop: '4px', fontWeight: 'bold' }}>
              {progressPercent}% Completado
            </div>
          </div>
        )}

        {/* Researches List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
            Catálogo de Investigaciones
          </div>

          {Object.values(researchConfig).map(res => {
            const isCompleted = completed.includes(res.id);
            const isCurrent = active?.id === res.id;
            const canAfford = hasResources(res.cost);

            let statusLabel = '🔬 Investigar';
            let btnBg = '#a855f7';
            let btnDisabled = false;

            if (isCompleted) {
              statusLabel = '✓ Investigado';
              btnBg = '#10b981';
              btnDisabled = true;
            } else if (isCurrent) {
              statusLabel = '⚡ Progresando...';
              btnBg = '#475569';
              btnDisabled = true;
            } else if (active) {
              statusLabel = '🔬 Cola llena';
              btnBg = '#334155';
              btnDisabled = true;
            } else if (!canAfford) {
              statusLabel = 'Faltan recursos';
              btnBg = '#1e293b';
              btnDisabled = true;
            }

            return (
              <div 
                key={res.id}
                style={{
                  background: isCompleted ? 'rgba(16, 185, 129, 0.05)' : '#1e293b',
                  border: `1px solid ${isCompleted ? '#10b98144' : '#334155'}`,
                  borderRadius: '8px', padding: '14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{res.icon}</span>
                    <div>
                      <strong style={{ fontSize: '14px', color: isCompleted ? '#10b981' : '#f8fafc' }}>
                        {res.name}
                      </strong>
                      <span style={{ fontSize: '10px', background: '#334155', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px', color: '#cbd5e1' }}>
                        {res.branch}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: '6px 0', fontSize: '12px', color: '#94a3b8', lineHeight: '1.3' }}>
                    {res.description}
                  </p>
                  
                  {/* Cost and duration display */}
                  {!isCompleted && (
                    <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span>⌛ {res.durationBaseSec}s</span>
                      <span>|</span>
                      {Object.entries(res.cost).map(([resId, amt]) => {
                        const name = resourcesConfig[resId]?.name || resId;
                        const icon = resourcesConfig[resId]?.icon || '';
                        return (
                          <span key={resId} style={{ color: canAfford ? '#38bdf8' : '#ef4444' }}>
                            {icon} {amt} {name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleStart(res.id, res.cost, res.durationBaseSec)}
                  disabled={btnDisabled}
                  style={{
                    padding: '8px 12px',
                    background: btnBg,
                    color: btnDisabled ? '#94a3b8' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: btnDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    minWidth: '110px'
                  }}
                >
                  {statusLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
