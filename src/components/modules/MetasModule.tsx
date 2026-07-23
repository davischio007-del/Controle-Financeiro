import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Goal } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency, formatDate, getCurrentDateFormatted } from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import { Target, Plus, X, PiggyBank, Calendar, CheckCircle2 } from 'lucide-react';

export const MetasModule: React.FC = () => {
  const { goals, banks, addGoal, updateGoal, deleteGoal, contributeToGoal } = useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAporteModalOpen, setIsAporteModalOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

  // Form State
  const [name, setName] = useState('Reserva de Emergência');
  const [category, setCategory] = useState<Goal['category']>('Reserva Emergência');
  const [targetAmount, setTargetAmount] = useState<number>(50000);
  const [currentAmount, setCurrentAmount] = useState<number>(15000);
  const [targetDate, setTargetDate] = useState('2026-12-31');
  const [color, setColor] = useState('#3B82F6');

  // Aporte Form
  const [aporteAmount, setAporteAmount] = useState<number>(1000);
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id || '');

  const openAddModal = () => {
    setEditingItem(null);
    setName('Reserva de Emergência');
    setCategory('Reserva Emergência');
    setTargetAmount(50000);
    setCurrentAmount(15000);
    setTargetDate('2026-12-31');
    setColor('#3B82F6');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Goal) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setTargetAmount(item.targetAmount);
    setCurrentAmount(item.currentAmount);
    setTargetDate(item.targetDate);
    setColor(item.color);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateGoal(editingItem.id, {
        name,
        category,
        targetAmount,
        currentAmount,
        targetDate,
        color,
      });
    } else {
      addGoal({
        name,
        category,
        targetAmount,
        currentAmount,
        targetDate,
        color,
      });
    }
    setIsModalOpen(false);
  };

  const handleAporteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    contributeToGoal(selectedGoal.id, aporteAmount, selectedBankId);
    setIsAporteModalOpen(false);
  };

  const columns: Column<Goal>[] = [
    {
      header: 'Meta / Categoria',
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ backgroundColor: r.color }}
          >
            <Target className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{r.name}</p>
            <span className="text-[10px] font-semibold text-slate-400">{r.category}</span>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Progresso Financeiro',
      accessor: (r) => {
        const percent = Math.min(100, Math.round((r.currentAmount / r.targetAmount) * 100));
        return (
          <div className="w-44 space-y-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300">{formatCurrency(r.currentAmount)}</span>
              <span className="text-slate-400 font-mono">{percent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: r.color }} />
            </div>
            <span className="text-[10px] text-slate-400">Meta: {formatCurrency(r.targetAmount)}</span>
          </div>
        );
      },
    },
    {
      header: 'Data Limite',
      accessor: (r) => <span className="font-mono text-slate-500 text-xs">{formatDate(r.targetDate)}</span>,
      sortable: true,
    },
    {
      header: 'Ação Rápida',
      accessor: (r) => (
        <button
          onClick={() => {
            setSelectedGoal(r);
            setAporteAmount(1000);
            setIsAporteModalOpen(true);
          }}
          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
        >
          <PiggyBank className="w-3.5 h-3.5" /> Aportar
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Planejamento de Metas & Sonhos"
        subtitle="Acompanhamento do progresso da Reserva, Imóveis, Carro e Projetos de Vida"
        columns={columns}
        data={goals}
        idKey="id"
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={(item) => setDeleteTarget(item)}
        exportFilename="metas_e_sonhos"
      />

      {/* Aporte Modal */}
      {isAporteModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAporteModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">🐖 Aportar na Meta</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedGoal.name}</p>

            <form onSubmit={handleAporteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor do Aporte (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={aporteAmount}
                  onChange={(e) => setAporteAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Debitar da Conta Bancária:</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({formatCurrency(b.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAporteModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
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
              {editingItem ? '✏️ Editar Meta' : '🎯 Nova Meta Financeira'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Meta</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Viagem de Férias, Entrada da Casa, Reserva"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Reserva Emergência">Reserva Emergência</option>
                    <option value="Casa">Casa / Imóvel</option>
                    <option value="Carro">Carro / Veículo</option>
                    <option value="Viagem">Viagem</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cor do Card</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-9 rounded-xl cursor-pointer border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Atual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Objetivo</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
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
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Delete Modal */}
      <SmartDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Meta"
        itemName={deleteTarget?.name || ''}
        moduleType="geral"
        onConfirm={() => {
          if (deleteTarget) deleteGoal(deleteTarget.id);
        }}
      />
    </div>
  );
};
