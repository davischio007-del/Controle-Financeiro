import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { formatCurrency } from '../../lib/utils';
import { saveDocToFirestore, deleteDocFromFirestore } from '../../services/firebaseSync';
import { Trash2, RotateCcw, CheckCircle2, Search, Filter, AlertTriangle, RefreshCw } from 'lucide-react';

interface TrashRow {
  id: string;
  originalId: string;
  title: string;
  amount?: number;
  moduleKey: string;
  moduleLabel: string;
  deletedAt?: string;
  deletedBy?: string;
  isTrashBin: boolean;
  originalData?: any;
}

export const LixeiraModule: React.FC = () => {
  const store = useFinancialStore();
  const {
    trashBin,
    incomes,
    fixedExpenses,
    variableExpenses,
    banks,
    cards,
    loans,
    investments,
    categories,
    subcategories,
    goals,
    restoreTrashItem,
    purgeTrashItem,
    clearTrashBin,
    updateIncome,
    updateFixedExpense,
    updateVariableExpense,
    updateBank,
    updateCard,
    updateGoal,
    updateInvestment,
  } = store;

  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('todos');

  const showNotification = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const getModuleLabel = (key: string): string => {
    const labels: Record<string, string> = {
      receitas: 'Receita',
      contas_fixas: 'Conta Fixa',
      contas_variaveis: 'Conta Variável',
      bancos: 'Banco',
      cartoes: 'Cartão',
      categorias: 'Categoria',
      subcategorias: 'Subcategoria',
      emprestimos: 'Empréstimo',
      investimentos: 'Investimento',
      metas: 'Meta',
      usuarios: 'Usuário',
      transferencias: 'Transferência',
    };
    return labels[key] || key;
  };

  // 1. Items from trashBin (Smart Delete)
  const trashBinItems: TrashRow[] = trashBin.map((t) => ({
    id: t.id,
    originalId: t.originalId,
    title: t.itemTitle || 'Item sem título',
    amount:
      t.originalData?.amount ??
      t.originalData?.contractedAmount ??
      t.originalData?.currentAmount ??
      t.originalData?.currentBalance ??
      t.originalData?.targetAmount ??
      t.originalData?.appliedAmount,
    moduleKey: t.module,
    moduleLabel: getModuleLabel(t.module),
    deletedAt: t.deletedAt,
    deletedBy: t.deletedBy,
    isTrashBin: true,
    originalData: t.originalData,
  }));

  // 2. Archived items from collections
  const archivedIncomes: TrashRow[] = incomes
    .filter((i) => i.archived)
    .map((i) => ({
      id: i.id,
      originalId: i.id,
      title: i.description,
      amount: i.amount,
      moduleKey: 'receitas',
      moduleLabel: 'Receita',
      isTrashBin: false,
    }));

  const archivedFixed: TrashRow[] = fixedExpenses
    .filter((f) => f.archived)
    .map((f) => ({
      id: f.id,
      originalId: f.id,
      title: f.description,
      amount: f.amount,
      moduleKey: 'contas_fixas',
      moduleLabel: 'Conta Fixa',
      isTrashBin: false,
    }));

  const archivedVar: TrashRow[] = variableExpenses
    .filter((v) => v.archived)
    .map((v) => ({
      id: v.id,
      originalId: v.id,
      title: v.description,
      amount: v.amount,
      moduleKey: 'contas_variaveis',
      moduleLabel: 'Conta Variável',
      isTrashBin: false,
    }));

  const archivedBanks: TrashRow[] = banks
    .filter((b) => b.archived)
    .map((b) => ({
      id: b.id,
      originalId: b.id,
      title: b.name,
      amount: b.currentBalance,
      moduleKey: 'bancos',
      moduleLabel: 'Banco',
      isTrashBin: false,
    }));

  const archivedCards: TrashRow[] = cards
    .filter((c) => c.archived)
    .map((c) => ({
      id: c.id,
      originalId: c.id,
      title: c.name,
      amount: c.limitTotal,
      moduleKey: 'cartoes',
      moduleLabel: 'Cartão',
      isTrashBin: false,
    }));

  const archivedLoans: TrashRow[] = loans
    .filter((l) => l.archived)
    .map((l) => ({
      id: l.id,
      originalId: l.id,
      title: `${l.type} - ${l.contractNumber || 'Sem contrato'}`,
      amount: l.contractedAmount,
      moduleKey: 'emprestimos',
      moduleLabel: 'Empréstimo',
      isTrashBin: false,
    }));

  const archivedInvestments: TrashRow[] = investments
    .filter((i) => i.archived)
    .map((i) => ({
      id: i.id,
      originalId: i.id,
      title: `${i.type} (${i.institution})`,
      amount: i.currentAmount,
      moduleKey: 'investimentos',
      moduleLabel: 'Investimento',
      isTrashBin: false,
    }));

  const allRows: TrashRow[] = [
    ...trashBinItems,
    ...archivedIncomes,
    ...archivedFixed,
    ...archivedVar,
    ...archivedBanks,
    ...archivedCards,
    ...archivedLoans,
    ...archivedInvestments,
  ];

  // Filter by search & module
  const filteredRows = allRows.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.moduleLabel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule =
      selectedModuleFilter === 'todos' || item.moduleKey === selectedModuleFilter;
    return matchesSearch && matchesModule;
  });

  // RESTORE ACTION
  const handleRestore = (item: TrashRow) => {
    if (item.isTrashBin) {
      restoreTrashItem(item.id);
    } else {
      // Unarchive from corresponding collection
      switch (item.moduleKey) {
        case 'receitas':
          updateIncome(item.id, { archived: false });
          break;
        case 'contas_fixas':
          updateFixedExpense(item.id, { archived: false });
          break;
        case 'contas_variaveis':
          updateVariableExpense(item.id, { archived: false });
          break;
        case 'bancos':
          updateBank(item.id, { archived: false });
          break;
        case 'cartoes':
          updateCard(item.id, { archived: false });
          break;
        case 'metas':
          updateGoal(item.id, { archived: false });
          break;
        case 'investimentos':
          updateInvestment(item.id, { archived: false });
          break;
        default:
          break;
      }
    }
    showNotification(`Item "${item.title}" restaurado com sucesso!`);
  };

  // PERMANENT PURGE ACTION
  const handlePurge = (item: TrashRow) => {
    if (
      !confirm(
        `Tem certeza que deseja EXCLUIR DEFINITIVAMENTE "${item.title}"? Esta ação é irreversível.`
      )
    ) {
      return;
    }

    if (item.isTrashBin) {
      purgeTrashItem(item.id);
    } else {
      // Permanently remove archived item from store & Firestore
      switch (item.moduleKey) {
        case 'receitas':
          useFinancialStore.setState((s) => ({
            incomes: s.incomes.filter((x) => x.id !== item.id),
          }));
          deleteDocFromFirestore('incomes', item.id);
          break;
        case 'contas_fixas':
          useFinancialStore.setState((s) => ({
            fixedExpenses: s.fixedExpenses.filter((x) => x.id !== item.id),
          }));
          deleteDocFromFirestore('fixedExpenses', item.id);
          break;
        case 'contas_variaveis':
          useFinancialStore.setState((s) => ({
            variableExpenses: s.variableExpenses.filter((x) => x.id !== item.id),
          }));
          deleteDocFromFirestore('variableExpenses', item.id);
          break;
        case 'bancos':
          useFinancialStore.setState((s) => ({
            banks: s.banks.filter((x) => x.id !== item.id),
          }));
          deleteDocFromFirestore('banks', item.id);
          break;
        case 'cartoes':
          useFinancialStore.setState((s) => ({
            cards: s.cards.filter((x) => x.id !== item.id),
          }));
          deleteDocFromFirestore('cards', item.id);
          break;
        case 'emprestimos':
          useFinancialStore.setState((s) => ({
            loans: s.loans.filter((x) => x.id !== item.id),
          }));
          deleteDocFromFirestore('loans', item.id);
          break;
        case 'investimentos':
          useFinancialStore.setState((s) => ({
            investments: s.investments.filter((x) => x.id !== item.id),
          }));
          deleteDocFromFirestore('investments', item.id);
          break;
        default:
          break;
      }
    }
    showNotification(`Item "${item.title}" foi excluído definitivamente.`);
  };

  // CLEAR ALL TRASH
  const handleClearAll = () => {
    if (allRows.length === 0) return;
    if (
      confirm(
        `Tem certeza que deseja ESVAZIAR A LIXEIRA e excluir DEFINITIVAMENTE todos os ${allRows.length} itens? Esta ação não pode ser desfeita.`
      )
    ) {
      clearTrashBin();
      // Also purge archived items from state & Firestore
      allRows.forEach((row) => {
        if (!row.isTrashBin) {
          const colMap: Record<string, string> = {
            receitas: 'incomes',
            contas_fixas: 'fixedExpenses',
            contas_variaveis: 'variableExpenses',
            bancos: 'banks',
            cartoes: 'cards',
            emprestimos: 'loans',
            investimentos: 'investments',
          };
          const col = colMap[row.moduleKey];
          if (col) deleteDocFromFirestore(col, row.id);
        }
      });

      useFinancialStore.setState((s) => ({
        incomes: s.incomes.filter((x) => !x.archived),
        fixedExpenses: s.fixedExpenses.filter((x) => !x.archived),
        variableExpenses: s.variableExpenses.filter((x) => !x.archived),
        banks: s.banks.filter((x) => !x.archived),
        cards: s.cards.filter((x) => !x.archived),
        loans: s.loans.filter((x) => !x.archived),
        investments: s.investments.filter((x) => !x.archived),
      }));
      showNotification('Lixeira esvaziada totalmente com sucesso.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Lixeira & Arquivo
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                {allRows.length} {allRows.length === 1 ? 'item' : 'itens'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Restaure itens excluídos ou remova-os definitivamente do banco de dados
            </p>
          </div>
        </div>

        {allRows.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 self-start md:self-auto cursor-pointer shadow-sm"
          >
            <Trash2 className="w-4 h-4" /> Esvaziar Lixeira
          </button>
        )}
      </div>

      {/* Alert / Toast Notification */}
      {message && (
        <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      {allRows.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar na lixeira..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5" /> Módulo:
            </span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'receitas', label: 'Receitas' },
              { id: 'contas_fixas', label: 'Contas Fixas' },
              { id: 'contas_variaveis', label: 'Contas Variáveis' },
              { id: 'categorias', label: 'Categorias' },
              { id: 'bancos', label: 'Bancos' },
              { id: 'cartoes', label: 'Cartões' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedModuleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedModuleFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table / List View */}
      {filteredRows.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Trash2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {allRows.length === 0 ? 'A lixeira está vazia' : 'Nenhum item encontrado na busca'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {allRows.length === 0
              ? 'Nenhum registro ou arquivo foi excluído recente.'
              : 'Tente alterar o termo digitado ou os filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Módulo</th>
                <th className="p-3">Descrição / Item</th>
                <th className="p-3">Valor / Dados</th>
                <th className="p-3">Data Exclusão</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] inline-block">
                      {item.moduleLabel}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                    {item.title}
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.amount !== undefined && item.amount !== null ? formatCurrency(item.amount) : '-'}
                  </td>
                  <td className="p-3 text-slate-400 text-[11px]">
                    {item.deletedAt ? new Date(item.deletedAt).toLocaleString('pt-BR') : 'Arquivado'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestore(item)}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Restaurar item para o sistema"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                      <button
                        onClick={() => handlePurge(item)}
                        className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Excluir permanentemente da lixeira"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir Definitivamente
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

