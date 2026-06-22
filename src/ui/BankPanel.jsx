import React from 'react';
import { useGame } from '../context/GameContext';

export default function BankPanel({ onClose, onBack }) {
  const { gameState, takeLoan, payLoan } = useGame();

  const loans = gameState.bank?.loans || [];
  const debtTotal = gameState.bank?.debtTotal || 0;
  const creditScore = gameState.bank?.creditScore ?? 100;
  const currentGold = gameState.resources?.gold || 0;

  const handleTakeSmallLoan = () => {
    // Take a small loan: 1000 gold, 15% interest (1150 total debt), 10 cycles term
    takeLoan(1000, 0.15, 10);
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
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
              Banco e Intendencia Financiera
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Financiación real, préstamos coloniales y control de deuda
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
        
        {/* Financial Summary */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid #334155', borderRadius: '8px', padding: '15px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Tu Oro</div>
            <strong style={{ fontSize: '15px', color: '#eab308' }}>💰 {currentGold}</strong>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Deuda Total</div>
            <strong style={{ fontSize: '15px', color: '#ef4444' }}>💸 {debtTotal}</strong>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Historial Crédit.</div>
            <strong style={{ fontSize: '15px', color: '#10b981' }}>📈 {creditScore}%</strong>
          </div>
        </div>

        {/* Small Loan Offer */}
        <div style={{
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '8px', padding: '14px', display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <strong style={{ fontSize: '14px', color: '#f59e0b' }}>📜 Préstamo pequeño</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.3' }}>
              Financiación inmediata de la Real Hacienda de Indias.<br />
              • Recibes: <strong>1.000 oro</strong><br />
              • Devuelves: <strong>1.150 oro</strong> (15% interés)
            </p>
          </div>

          <button
            onClick={handleTakeSmallLoan}
            style={{
              padding: '10px 14px',
              background: '#f59e0b',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            Solicitar
          </button>
        </div>

        {/* Active Loans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Préstamos Activos ({loans.length})
          </div>

          {loans.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
              No tienes deudas pendientes.
            </div>
          ) : (
            loans.map(loan => {
              const canPay = currentGold >= loan.remainingDebt;
              return (
                <div 
                  key={loan.id}
                  style={{
                    background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: '#fca5a5' }}>Deuda pendiente: {loan.remainingDebt} oro</strong>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                      Base: {loan.amount} oro | Interés: {Math.round(loan.interestRate * 100)}%
                    </div>
                  </div>

                  <button
                    onClick={() => payLoan(loan.id)}
                    disabled={!canPay}
                    style={{
                      padding: '8px 12px',
                      background: canPay ? '#10b981' : '#334155',
                      color: canPay ? '#fff' : '#64748b',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: canPay ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Amortizar
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
