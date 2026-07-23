import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Card, CardNetwork } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency } from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import { Plus, X, CreditCard, ShieldAlert, CheckCircle, Landmark, Receipt } from 'lucide-react';

interface CartoesModuleProps {
  selectedCardIdForInvoice?: string;
}

export const CartoesModule: React.FC<CartoesModuleProps> = ({ selectedCardIdForInvoice }) => {
  const { cards, banks, addCard, updateCard, deleteCardSmart, payCardInvoice, fixedExpenses, variableExpenses } =
    useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Card | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<Card | null>(null);

  // Invoice Details Modal
  const [activeInvoiceCard, setActiveInvoiceCard] = useState<Card | null>(
    selectedCardIdForInvoice ? cards.find((c) => c.id === selectedCardIdForInvoice) || null : null
  );
  const [paymentBankId, setPaymentBankId] = useState<string>(banks[0]?.id || '');
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // Form
  const [name, setName] = useState('');
  const [bankId, setBankId] = useState('');
  const [network, setNetwork] = useState<CardNetwork>('Mastercard');
  const [limitTotal, setLimitTotal] = useState<number>(10000);
  const [closingDay, setClosingDay] = useState<number>(15);
  const [dueDay, setDueDay] = useState<number>(22);
  const [color, setColor] = useState('#820AD1');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setBankId(banks[0]?.id || '');
    setNetwork('Mastercard');
    setLimitTotal(10000);
    setClosingDay(15);
    setDueDay(22);
    setColor('#820AD1');
    setStatus('Ativo');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Card) => {
    setEditingItem(item);
    setName(item.name);
    setBankId(item.bankId);
    setNetwork(item.network);
    setLimitTotal(item.limitTotal);
    setClosingDay(item.closingDay);
    setDueDay(item.dueDay);
    setColor(item.color);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateCard(editingItem.id, {
        name,
        bankId,
        network,
        limitTotal,
        closingDay,
        dueDay,
        color,
        status,
      });
    } else {
      addCard({
        name,
        bankId,
        network,
        limitTotal,
        closingDay,
        dueDay,
        color,
        icon: 'CreditCard',
        status,
      });
    }
    setIsModalOpen(false);
  };

  const handleExecutePayment = () => {
    if (!activeInvoiceCard || !paymentBankId) return;
    const ok = payCardInvoice(activeInvoiceCard.id, new Date().getMonth() + 1, new Date().getFullYear(), paymentBankId);
    if (ok) {
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setActiveInvoiceCard(null);
      }, 1500);
    }
  };

  // Get invoice purchases for active card
  const getCardPurchases = (cardId: string) => {
    const fixed = fixedExpenses.filter((f) => f.cardId === cardId);
    const variable = variableExpenses.filter((v) => v.cardId === cardId);
    return { fixed, variable };
  };

  const columns: Column<Card>[] = [
    {
      header: 'Cartão / Bandeira',
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ backgroundColor: r.color }}
          >
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{r.name}</p>
            <p className="text-[11px] text-slate-400">
              {r.network} • Fech. dia {r.closingDay} | Venc. dia {r.dueDay}
            </p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Banco Emissor',
      accessor: (r) => {
        const b = banks.find((bk) => bk.id === r.bankId);
        return <span className="font-semibold text-slate-700 dark:text-slate-300">{b?.name || '-'}</span>;
      },
    },
    {
      header: 'Limite Utilizado / Total',
      accessor: (r) => {
        const pct = Math.min(100, Math.round((r.limitUsed / r.limitTotal) * 100));
        return (
          <div className="space-y-1 w-36">
            <div className="flex justify-between text-[11px]">
              <span className="font-bold text-purple-600">{formatCurrency(r.limitUsed)}</span>
              <span className="text-slate-400">{formatCurrency(r.limitTotal)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${pct > 80 ? 'bg-red-500' : 'bg-purple-600'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
      sortable: true,
    },
    {
      header: 'Limite Disponível',
      accessor: (r) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.limitAvailable)}</span>
      ),
    },
    {
      header: 'Fatura Atual',
      accessor: (r) => (
        <button
          onClick={() => setActiveInvoiceCard(r)}
          className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Ver Fatura</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Gestão de Cartões de Crédito"
        subtitle="Limites, faturas abertas, histórico de compras e pagamentos integrados"
        columns={columns}
        data={cards}
        idKey="id"
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={(item) => setDeleteItemTarget(item)}
        exportFilename="cartoes_credito"
      />

      {/* Invoice Details & Payment Modal */}
      {activeInvoiceCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveInvoiceCard(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                style={{ backgroundColor: activeInvoiceCard.color }}
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Fatura Atual: {activeInvoiceCard.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Vencimento dia {activeInvoiceCard.dueDay} • Fechamento dia {activeInvoiceCard.closingDay}
                </p>
              </div>
            </div>

            {paymentSuccess ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Fatura Paga com Sucesso!</h4>
                <p className="text-xs text-slate-500">
                  O limite do cartão foi liberado e o saldo da conta bancária foi atualizado.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                {/* Total Invoice Header */}
                <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase">
                      Valor Total da Fatura
                    </p>
                    <p className="text-2xl font-black text-purple-900 dark:text-purple-100">
                      {formatCurrency(activeInvoiceCard.limitUsed)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Limite Disponível</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {formatCurrency(activeInvoiceCard.limitAvailable)}
                    </p>
                  </div>
                </div>

                {/* Purchases list */}
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Lançamentos da Fatura</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2">
                    {(() => {
                      const { fixed, variable } = getCardPurchases(activeInvoiceCard.id);
                      if (fixed.length === 0 && variable.length === 0) {
                        return <p className="text-slate-400 py-3 text-center">Nenhum lançamento nesta fatura.</p>;
                      }
                      return (
                        <>
                          {fixed.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg"
                            >
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{f.description}</p>
                                <p className="text-[10px] text-slate-400">Conta Fixa Recorrente</p>
                              </div>
                              <span className="font-bold text-purple-600">{formatCurrency(f.amount)}</span>
                            </div>
                          ))}
                          {variable.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg"
                            >
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{v.description}</p>
                                <p className="text-[10px] text-slate-400">{v.date}</p>
                              </div>
                              <span className="font-bold text-purple-600">{formatCurrency(v.amount)}</span>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Pay Invoice Form */}
                {activeInvoiceCard.limitUsed > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      Débito Automático da Fatura na Conta:
                    </label>
                    <select
                      value={paymentBankId}
                      onChange={(e) => setPaymentBankId(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} (Saldo: {formatCurrency(b.currentBalance)})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleExecutePayment}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirmar Pagamento da Fatura</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Card Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingItem ? '✏️ Editar Cartão' : '➕ Novo Cartão'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Cartão</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank Ultravioleta, Itaú Black"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Banco Emissor</label>
                  <select
                    required
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bandeira</label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value as CardNetwork)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Elo">Elo</option>
                    <option value="Amex">Amex</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Limite Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={limitTotal}
                    onChange={(e) => setLimitTotal(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dia Fechamento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={closingDay}
                    onChange={(e) => setClosingDay(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dia Vencimento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Delete Modal */}
      <SmartDeleteModal
        isOpen={!!deleteItemTarget}
        onClose={() => setDeleteItemTarget(null)}
        title="Excluir Cartão de Crédito"
        itemName={deleteItemTarget?.name || ''}
        moduleType="cartoes"
        hasActiveData={deleteItemTarget ? deleteItemTarget.limitUsed > 0 : false}
        onConfirm={(option) => {
          if (deleteItemTarget) {
            deleteCardSmart(deleteItemTarget.id, option as any);
          }
        }}
      />
    </div>
  );
};
