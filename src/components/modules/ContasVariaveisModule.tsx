import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { VariableExpense, PaymentMethod, ExpenseStatus } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency, formatDate, getCurrentDateFormatted } from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import { Plus, X, ShoppingBag, CreditCard, Landmark, CheckCircle, Clock } from 'lucide-react';

export const ContasVariaveisModule: React.FC = () => {
  const {
    variableExpenses,
    categories,
    subcategories,
    banks,
    cards,
    addVariableExpense,
    updateVariableExpense,
    deleteVariableExpense,
  } = useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VariableExpense | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<VariableExpense | null>(null);

  // Form
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(getCurrentDateFormatted());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cartão');
  const [bankId, setBankId] = useState('');
  const [cardId, setCardId] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>('Pago');

  const openAddModal = () => {
    setEditingItem(null);
    setDescription('');
    setCategoryId(categories.find((c) => c.type === 'Despesa')?.id || categories[0]?.id || '');
    setSubcategoryId('');
    setAmount(0);
    setDate(getCurrentDateFormatted());
    setPaymentMethod('Cartão');
    setBankId(banks[0]?.id || '');
    setCardId(cards[0]?.id || '');
    setStatus('Pago');
    setIsModalOpen(true);
  };

  const openEditModal = (item: VariableExpense) => {
    setEditingItem(item);
    setDescription(item.description);
    setCategoryId(item.categoryId);
    setSubcategoryId(item.subcategoryId || '');
    setAmount(item.amount);
    setDate(item.date);
    setPaymentMethod(item.paymentMethod);
    setBankId(item.bankId || '');
    setCardId(item.cardId || '');
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleDuplicate = (item: VariableExpense) => {
    addVariableExpense({
      description: `${item.description} (Cópia)`,
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      amount: item.amount,
      date: getCurrentDateFormatted(),
      paymentMethod: item.paymentMethod,
      bankId: item.bankId,
      cardId: item.cardId,
      status: item.status,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateVariableExpense(editingItem.id, {
        description,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        amount,
        date,
        paymentMethod,
        bankId: paymentMethod === 'Cartão' ? undefined : bankId,
        cardId: paymentMethod === 'Cartão' ? cardId : undefined,
        status,
      });
    } else {
      addVariableExpense({
        description,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        amount,
        date,
        paymentMethod,
        bankId: paymentMethod === 'Cartão' ? undefined : bankId,
        cardId: paymentMethod === 'Cartão' ? cardId : undefined,
        status,
      });
    }
    setIsModalOpen(false);
  };

  const columns: Column<VariableExpense>[] = [
    {
      header: 'Descrição / Data',
      accessor: (r) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100">{r.description}</p>
          <span className="text-[11px] text-slate-400 font-mono">{formatDate(r.date)}</span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Categoria',
      accessor: (r) => {
        const cat = categories.find((c) => c.id === r.categoryId);
        return <span className="font-semibold text-rose-600 dark:text-rose-400">{cat?.name || '-'}</span>;
      },
    },
    {
      header: 'Forma de Pagamento',
      accessor: (r) => {
        if (r.paymentMethod === 'Cartão') {
          const card = cards.find((c) => c.id === r.cardId);
          return (
            <span className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
              <CreditCard className="w-3.5 h-3.5" />
              {card?.name || 'Cartão'}
            </span>
          );
        }
        const bank = banks.find((b) => b.id === r.bankId);
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <Landmark className="w-3.5 h-3.5 text-blue-500" />
            {r.paymentMethod} ({bank?.name || 'Banco'})
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (r) => (
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${
            r.status === 'Pago'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
          }`}
        >
          {r.status === 'Pago' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {r.status}
        </span>
      ),
    },
    {
      header: 'Valor',
      accessor: (r) => <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(r.amount)}</span>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Contas Variáveis & Gastos Diários"
        subtitle="Supermercado, restaurantes, combustível, farmácia e compras avulsas"
        columns={columns}
        data={variableExpenses}
        idKey="id"
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDuplicate={handleDuplicate}
        onDelete={(item) => setDeleteItemTarget(item)}
        exportFilename="contas_variaveis"
      />

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingItem ? '✏️ Editar Conta Variável' : '➕ Nova Conta Variável'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Compras no Carrefour, Posto Shell, Farmácia"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data da Compra</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="Cartão">Cartão de Crédito</option>
                    <option value="Pix">PIX</option>
                    <option value="Débito">Débito</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {paymentMethod === 'Cartão' ? (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
                  <label className="block font-bold text-purple-900 dark:text-purple-200">
                    Selecione o Cartão de Crédito
                  </label>
                  <p className="text-[11px] text-purple-600 dark:text-purple-300">
                    Insere automaticamente na fatura e atualiza limite do cartão. Não movimenta conta bancária agora.
                  </p>
                  <select
                    required
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl font-bold text-purple-700 dark:text-purple-300"
                  >
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.network})
                      </option>
                    ))}
                  </select>
                </div>
              ) : paymentMethod === 'Dinheiro' ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  <p className="font-bold">Pagamento em Dinheiro</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-300">
                    Registra saída em dinheiro espécie. Não altera saldo bancário nem limites de cartão.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                  <label className="block font-bold text-blue-900 dark:text-blue-200">Selecione a Conta Bancária</label>
                  <p className="text-[11px] text-blue-600 dark:text-blue-300">
                    Debita automaticamente o valor da conta bancária.
                  </p>
                  <select
                    required
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl font-bold text-blue-700 dark:text-blue-300"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.institution})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Salvar Conta Variável
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SmartDeleteModal
        isOpen={!!deleteItemTarget}
        onClose={() => setDeleteItemTarget(null)}
        title="Excluir Conta Variável"
        itemName={deleteItemTarget?.description || ''}
        moduleType="geral"
        onConfirm={() => {
          if (deleteItemTarget) deleteVariableExpense(deleteItemTarget.id);
        }}
      />
    </div>
  );
};
