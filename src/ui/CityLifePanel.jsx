import React from 'react';
import { useGame } from '../context/GameContext';

export default function CityLifePanel({ onClose, onBack }) {
  const { gameState } = useGame();

  const cityLife = gameState.cityLife || { morale: 70, stability: 70, health: 70, order: 70 };
  const morale = cityLife.morale;
  const health = cityLife.health;
  const order = cityLife.order;
  const stability = cityLife.stability;

  // Compute active modifiers
  let moraleBonusText = 'Sin bonos ni penalizaciones.';
  let moraleColor = '#cbd5e1';
  if (morale >= 80) {
    moraleBonusText = '🎉 Moral alta: +10% de producción en Gremios y Haciendas.';
    moraleColor = '#10b981';
  } else if (morale <= 40) {
    moraleBonusText = '⚠️ Moral baja: -10% de penalización de producción.';
    moraleColor = '#ef4444';
  }

  let healthText = 'Población saludable.';
  let healthColor = '#cbd5e1';
  if (health <= 40) {
    healthText = '💀 Brote epidemiológico: Crecimiento demográfico reducido a la mitad.';
    healthColor = '#ef4444';
  } else if (health >= 80) {
    healthText = '🥗 Salubridad excelente: Crecimiento y bienestar estables.';
    healthColor = '#10b981';
  }

  let orderText = 'Paz y orden público garantizados.';
  let orderColor = '#cbd5e1';
  if (order <= 40) {
    orderText = '🔥 Inestabilidad civil: Riesgo inminente de disturbios y saqueos.';
    orderColor = '#ef4444';
  }

  const indicators = [
    { name: 'Moral Social', val: morale, icon: '🎻', color: moraleColor, desc: 'Felicidad de la ciudadanía.' },
    { name: 'Salud y Salubridad', val: health, icon: '🏥', color: healthColor, desc: 'Higiene y control de plagas.' },
    { name: 'Orden y Seguridad', val: order, icon: '⚔️', color: orderColor, desc: 'Respeto a las leyes reales.' },
    { name: 'Estabilidad Gubernamental', val: stability, icon: '⚖️', color: '#38bdf8', desc: 'Confianza en las autoridades.' }
  ];

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
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7' }}>
              Vida Urbana y Cabildo Abierto
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Moral, salubridad y estabilidad demográfica de la colonia
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
        
        {/* Indicators List */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {indicators.map(ind => (
            <div 
              key={ind.name}
              style={{
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: '8px', padding: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px' }}>{ind.icon}</span>
                <strong style={{ fontSize: '16px', color: ind.color }}>{ind.val}%</strong>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#f8fafc' }}>
                {ind.name}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                {ind.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Active Modifiers and Warnings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Modificadores Activos de la Ciudad
          </div>

          <div style={{ background: '#111726', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Morale description */}
            <div style={{ fontSize: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
              <strong style={{ color: moraleColor }}>🎭 Moral Social:</strong>
              <div style={{ marginTop: '2px', color: '#e2e8f0' }}>{moraleBonusText}</div>
            </div>
            {/* Health description */}
            <div style={{ fontSize: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
              <strong style={{ color: healthColor }}>🏥 Salubridad:</strong>
              <div style={{ marginTop: '2px', color: '#e2e8f0' }}>{healthText}</div>
            </div>
            {/* Order description */}
            <div style={{ fontSize: '12px' }}>
              <strong style={{ color: orderColor }}>⚔️ Orden Interno:</strong>
              <div style={{ marginTop: '2px', color: '#e2e8f0' }}>{orderText}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
