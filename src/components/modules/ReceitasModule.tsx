import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Income } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency, formatDate, getCurrentDateFormatted } from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import { Plus, TrendingUp, X, Paperclip, Check } from 'lucide-react';

export const ReceitasModule: React.FC = () => {
  const {
    incomes,
    categories,
    subcategories,
    banks,
    addIncome,
    updateIncome,
    deleteIncome,
  } = useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Income | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<Income | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [bankId, setBankId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(getCurrentDateFormatted());
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const openAddModal = () => {
    setEditingItem(null);
    setDescription('');
    setCategoryId(categories.find((c) => c.type === 'Receita')?.id || categories[0]?.id || '');
    setSubcategoryId('');
    setBankId('');
    setAmount(0);
    setDate(getCurrentDateFormatted());
    setIsRecurring(false);
    setNotes('');
    setAttachmentName('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Income) => {
    setEditingItem(item);
    setDescription(item.description);
    setCategoryId(item.categoryId);
    setSubcategoryId(item.subcategoryId || '');
    setBankId(item.bankId || '');
    setAmount(item.amount);
    setDate(item.date);
    setIsRecurring(item.isRecurring);
    setNotes(item.notes || '');
    setAttachmentName(item.attachmentName || '');
    setIsModalOpen(true);
  };

  const handleDuplicate = (item: Income) => {
    addIncome({
      description: `${item.description} (Cópia)`,
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      bankId: item.bankId,
      amount: item.amount,
      date: getCurrentDateFormatted(),
      isRecurring: item.isRecurring,
      notes: item.notes,
      attachmentName: item.attachmentName,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateIncome(editingItem.id, {
        description,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        bankId: bankId || undefined,
        amount,
        date,
        isRecurring,
        notes,
        attachmentName,
      });
    } else {
      addIncome({
        description,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        bankId: bankId || undefined,
        amount,
        date,
        isRecurring,
        notes,
        attachmentName,
      });
    }
    setIsModalOpen(false);
  };

  const filteredSubcategories = subcategories.filter((s) => s.categoryId === categoryId);

  const columns: Column<Income>[] = [
    {
      header: 'Descrição',
      accessor: (r) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100">{r.description}</p>

            <span className="text-[10px] text-slate-400 block font-mono">{r.isRecurring ? '🔄 Recorrente' : ' Pontual'}</span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Categoria / Subcategoria',
      accessor: (r) => {
        const cat = categories.find((c) => c.id === r.categoryId);
        const sub = subcategories.find((s) => s.id === r.subcategoryId);
        return (
          <div>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{cat?.name || '-'}</span>
            {sub && <span className="text-slate-400 text-[11px] block">{sub.name}</span>}
          </div>
        );
      },
    },
    {
      header: 'Conta Bancária',
      accessor: (r) => {
        if (!r.bankId) {
          return <span className="font-medium text-slate-400 dark:text-slate-500 italic">Espécie / Sem conta</span>;
        }
        const b = banks.find((bk) => bk.id === r.bankId);
        return <span className="font-medium text-slate-700 dark:text-slate-300">{b ? b.name : '-'}</span>;
      },
    },
    {
      header: 'Data',
      accessor: (r) => <span className="font-mono text-slate-600 dark:text-slate-400">{formatDate(r.date)}</span>,
      sortable: true,
    },
    {
      header: 'Valor',
      accessor: (r) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.amount)}</span>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Lançamento de Receitas"
        subtitle="Gerencie salários, serviços freelance, dividendos e entradas financeiras"
        columns={columns}
        data={incomes}
        idKey="id"
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDuplicate={handleDuplicate}
        onDelete={(item) => setDeleteItemTarget(item)}
        exportFilename="receitas_financeiras"
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
              {editingItem ? '✏️ Editar Receita' : '➕ Nova Receita'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Salário Mensal, Freelance, Rendimentos"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setSubcategoryId('');
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subcategoria</label>
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Nenhuma</option>
                    {filteredSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Conta Bancária (Opcional)</label>
                  <select
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="">Nenhuma (Dinheiro em Espécie / Outro)</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.institution})
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data do Lançamento</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>Receita Recorrente</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações adicionais..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
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
                  className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md"
                >
                  Salvar Receita
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
        title="Excluir Receita"
        itemName={deleteItemTarget?.description || ''}
        moduleType="geral"
        onConfirm={() => {
          if (deleteItemTarget) deleteIncome(deleteItemTarget.id);
        }}
      />
    </div>
  );
};
