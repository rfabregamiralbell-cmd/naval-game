import React from 'react';
import { useGame } from '../core/context/GameContext';
import resourcesConfig from '../config/resources_config.json';
import { calculateStorageCapacity } from '../engines/economy/economyEngine';

export default function GoodsMarketPanel({ onClose, onBack }) {
  const { gameState, setGameState } = useGame();
  const storageLimits = calculateStorageCapacity(gameState);

  // Spread-based pricing definitions
  const tradableResources = [
    { id: 'wood', basePrice: 3, buyPrice: 4, sellPrice: 1 },
    { id: 'materials', basePrice: 8, buyPrice: 10, sellPrice: 4 },
    { id: 'goods', basePrice: 12, buyPrice: 15, sellPrice: 6 },
    { id: 'sails', basePrice: 18, buyPrice: 22, sellPrice: 9 },
    { id: 'cannons', basePrice: 100, buyPrice: 120, sellPrice: 50 },
    { id: 'gunpowder', basePrice: 20, buyPrice: 25, sellPrice: 10 }
  ];

  const handleBuy = (resId, qty, price) => {
    const totalCost = qty * price;
    if ((gameState.resources.gold || 0) < totalCost) return;

    const currentStock = gameState.resources[resId] || 0;
    const limit = storageLimits[resId] || 999999;
    if (currentStock + qty > limit) {
      alert("⚠️ No hay suficiente espacio en los almacenes.");
      return;
    }

    setGameState(prev => {
      const nextResources = { ...prev.resources };
      nextResources.gold = (nextResources.gold || 0) - totalCost;
      nextResources[resId] = (nextResources[resId] || 0) + qty;
      return {
        ...prev,
        resources: nextResources
      };
    });
  };

  const handleSell = (resId, qty, price) => {
    const currentStock = gameState.resources[resId] || 0;
    if (currentStock < qty) return;

    const totalProfit = qty * price;

    setGameState(prev => {
      const nextResources = { ...prev.resources };
      nextResources.gold = (nextResources.gold || 0) + totalProfit;
      nextResources[resId] = Math.max(0, (nextResources[resId] || 0) - qty);
      return {
        ...prev,
        resources: nextResources
      };
    });
  };

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
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
              Lonja y Mercado Local de Abastos
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Comercia recursos básicos con mercaderes locales
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

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Anti-Arbitrage Alert */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0284c7',
          borderRadius: '6px', padding: '8px 12px', fontSize: '11.5px', color: '#38bdf8', lineHeight: '1.4'
        }}>
          💡 <strong>Nota del gremio mercantil:</strong> Los aranceles coloniales imponen un spread de compra/venta para evitar especulaciones. La venta da menos oro que el coste de importación directa.
        </div>

        {/* Catalog Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tradableResources.map(item => {
            const config = resourcesConfig[item.id];
            const stock = gameState.resources[item.id] || 0;
            const limit = storageLimits[item.id] || 999999;
            const canBuy10 = (gameState.resources.gold || 0) >= item.buyPrice * 10 && stock + 10 <= limit;
            const canBuy50 = (gameState.resources.gold || 0) >= item.buyPrice * 50 && stock + 50 <= limit;
            const canSell10 = stock >= 10;
            const canSell50 = stock >= 50;

            return (
              <div 
                key={item.id}
                style={{
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
                }}
              >
                {/* Product stock details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '20px' }}>{config?.icon || '📦'}</span>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{config?.name || item.id}</strong>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                        Tus almacenes: <strong>{stock}</strong> / {limit}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '11.5px' }}>
                    <span style={{ color: '#ef4444' }}>📥 Compra: {item.buyPrice}💰</span>
                    <br />
                    <span style={{ color: '#10b981' }}>📤 Venta: {item.sellPrice}💰</span>
                  </div>
                </div>

                {/* Operations Actions Buttons Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleBuy(item.id, 10, item.buyPrice)}
                    disabled={!canBuy10}
                    style={{
                      padding: '8px 0', background: canBuy10 ? 'rgba(239, 68, 68, 0.2)' : '#121214',
                      color: canBuy10 ? '#ef4444' : '#64748b', border: `1px solid ${canBuy10 ? '#ef444466' : '#222'}`,
                      borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: canBuy10 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Compra 10
                  </button>
                  <button
                    onClick={() => handleBuy(item.id, 50, item.buyPrice)}
                    disabled={!canBuy50}
                    style={{
                      padding: '8px 0', background: canBuy50 ? 'rgba(239, 68, 68, 0.2)' : '#121214',
                      color: canBuy50 ? '#ef4444' : '#64748b', border: `1px solid ${canBuy50 ? '#ef444466' : '#222'}`,
                      borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: canBuy50 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Compra 50
                  </button>
                  <button
                    onClick={() => handleSell(item.id, 10, item.sellPrice)}
                    disabled={!canSell10}
                    style={{
                      padding: '8px 0', background: canSell10 ? 'rgba(16, 185, 129, 0.2)' : '#121214',
                      color: canSell10 ? '#10b981' : '#64748b', border: `1px solid ${canSell10 ? '#10b98166' : '#222'}`,
                      borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: canSell10 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Venta 10
                  </button>
                  <button
                    onClick={() => handleSell(item.id, 50, item.sellPrice)}
                    disabled={!canSell50}
                    style={{
                      padding: '8px 0', background: canSell50 ? 'rgba(16, 185, 129, 0.2)' : '#121214',
                      color: canSell50 ? '#10b981' : '#64748b', border: `1px solid ${canSell50 ? '#10b98166' : '#222'}`,
                      borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: canSell50 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Venta 50
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
