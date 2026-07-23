import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { formatCurrency } from '../../lib/utils';
import { Trash2, RotateCcw, CheckCircle2 } from 'lucide-react';

export const LixeiraModule: React.FC = () => {
  const {
    incomes,
    fixedExpenses,
    variableExpenses,
    banks,
    cards,
    loans,
    investments,
    restoreTrashItem,
    purgeTrashItem,
  } = useFinancialStore();

  const [message, setMessage] = useState('');

  // Collect all archived items
  const archivedIncomes = incomes.filter((i) => i.archived).map((i) => ({ id: i.id, description: i.description, amount: i.amount, module: 'Receita' }));
  const archivedFixed = fixedExpenses.filter((f) => f.archived).map((f) => ({ id: f.id, description: f.description, amount: f.amount, module: 'Conta Fixa' }));
  const archivedVar = variableExpenses.filter((v) => v.archived).map((v) => ({ id: v.id, description: v.description, amount: v.amount, module: 'Conta Variável' }));
  const archivedBanks = banks.filter((b) => b.archived).map((b) => ({ id: b.id, description: b.name, amount: b.currentBalance, module: 'Banco' }));
  const archivedCards = cards.filter((c) => c.archived).map((c) => ({ id: c.id, description: c.name, amount: c.limitTotal, module: 'Cartão' }));
  const archivedLoans = loans.filter((l) => l.archived).map((l) => ({ id: l.id, description: l.type, amount: l.contractedAmount, module: 'Empréstimo' }));
  const archivedInvestments = investments
    .filter((i) => i.archived)
    .map((i) => ({ id: i.id, description: i.institution, amount: i.currentAmount, module: 'Investimento' }));

  const allArchived = [
    ...archivedIncomes,
    ...archivedFixed,
    ...archivedVar,
    ...archivedBanks,
    ...archivedCards,
    ...archivedLoans,
    ...archivedInvestments,
  ];

  const handleRestore = (id: string) => {
    restoreTrashItem(id);
    setMessage('Item restaurado com sucesso para seu módulo de origem!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handlePurge = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item permanentemente? Esta ação não poderá ser desfeita.')) {
      purgeTrashItem(id);
      setMessage('Item removido definitivamente.');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Lixeira & Itens Arquivados</h2>
            <p className="text-xs text-slate-500">
              Mecanismo de Exclusão Inteligente (Smart Delete). Restaure itens arquivados ou remova definitivamente
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {allArchived.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Trash2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">A lixeira está vazia</h3>
          <p className="text-xs text-slate-400">Nenhum registro arquivado ou desativado no momento.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Módulo</th>
                <th className="p-3">Descrição / Item</th>
                <th className="p-3">Valor / Dados</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allArchived.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                      {item.module}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                  <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.amount ? formatCurrency(item.amount) : '-'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                      <button
                        onClick={() => handlePurge(item.id)}
                        className="px-3 py-1 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
