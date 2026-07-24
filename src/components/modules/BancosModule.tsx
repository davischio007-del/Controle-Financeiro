import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Bank, AccountType } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency, formatDate } from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import { OFXImportModal } from '../common/OFXImportModal';
import { getBankMovements, BankMovement } from '../../utils/bankUtils';
import { Plus, X, Landmark, FileCode, ArrowRightLeft } from 'lucide-react';

export const BancosModule: React.FC = () => {
  const {
    banks,
    addBank,
    updateBank,
    deleteBankSmart,
    incomes,
    fixedExpenses,
    variableExpenses,
    transfers,
    loans,
    investments,
    categories,
    subcategories,
  } = useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOFXModalOpen, setIsOFXModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Bank | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<Bank | null>(null);

  // Extrato state
  const [selectedBankForExtrato, setSelectedBankForExtrato] = useState<Bank | null>(null);
  const [extratoFilterMode, setExtratoFilterMode] = useState<'periodo' | 'mes' | 'ano'>('mes');
  const [selectedMonth, setSelectedMonth] = useState<string>('07/2026');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [startDate, setStartDate] = useState<string>('2026-07-01');
  const [endDate, setEndDate] = useState<string>('2026-07-31');

  // Form
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [type, setType] = useState<AccountType>('Corrente');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [color, setColor] = useState('#3B82F6');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setInstitution('');
    setAgency('');
    setAccount('');
    setType('Corrente');
    setInitialBalance(0);
    setCurrentBalance(0);
    setColor('#3B82F6');
    setStatus('Ativo');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Bank) => {
    setEditingItem(item);
    setName(item.name);
    setInstitution(item.institution);
    setAgency(item.agency);
    setAccount(item.account);
    setType(item.type);
    setInitialBalance(item.initialBalance);
    setCurrentBalance(item.currentBalance);
    setColor(item.color);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateBank(editingItem.id, {
        name,
        institution,
        agency,
        account,
        type,
        initialBalance,
        currentBalance,
        color,
        status,
      });
    } else {
      addBank({
        name,
        institution,
        agency,
        account,
        type,
        initialBalance,
        currentBalance: initialBalance,
        color,
        icon: 'Landmark',
        status,
      });
    }
    setIsModalOpen(false);
  };

  // Check if bank has movements
  const bankHasMovements = (bankId: string) => {
    const hasInc = incomes.some((i) => i.bankId === bankId);
    const hasFix = fixedExpenses.some((f) => f.bankId === bankId);
    const hasVar = variableExpenses.some((v) => v.bankId === bankId);
    return hasInc || hasFix || hasVar;
  };

  const columns: Column<Bank>[] = [
    {
      header: 'Instituição / Nome',
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ backgroundColor: r.color }}
          >
            {r.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{r.name}</p>
            <p className="text-[11px] text-slate-400">{r.institution}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Agência / Conta',
      accessor: (r) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          Ag {r.agency} / Cc {r.account}
        </span>
      ),
    },
    {
      header: 'Tipo',
      accessor: (r) => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {r.type}
        </span>
      ),
    },
    {
      header: 'Saldo Atual',
      accessor: (r) => (
        <span className={`font-black ${r.currentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(r.currentBalance)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Extrato',
      accessor: (r) => (
        <button
          onClick={() => setSelectedBankForExtrato(r)}
          className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
        >
          Ver Extrato
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Bancos & Contas Bancárias"
        subtitle="Contas correntes, digitais, investimentos e conciliação bancária OFX/CSV"
        columns={columns}
        data={banks}
        idKey="id"
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={(item) => setDeleteItemTarget(item)}
        exportFilename="contas_bancarias"
        customHeaderActions={
          <button
            onClick={() => setIsOFXModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
          >
            <FileCode className="w-4 h-4" />
            <span>Importar Extrato OFX/CSV</span>
          </button>
        }
      />

      {/* OFX Import Modal */}
      <OFXImportModal isOpen={isOFXModalOpen} onClose={() => setIsOFXModalOpen(false)} />

      {/* Add/Edit Bank Modal */}
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
              {editingItem ? '✏️ Editar Banco' : '➕ Novo Banco'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Itaú Unibanco, Nubank Principal"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Instituição</label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ex: Banco Itaú S.A."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Conta</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Corrente">Corrente</option>
                    <option value="Poupança">Poupança</option>
                    <option value="Pagamentos">Pagamentos</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Agência</label>
                  <input
                    type="text"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    placeholder="0001"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número da Conta</label>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="12345-6"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cor Identificadora</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-xs">{color}</span>
                  </div>
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
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Salvar Banco
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
        title="Excluir Conta Bancária"
        itemName={deleteItemTarget?.name || ''}
        moduleType="bancos"
        hasActiveData={deleteItemTarget ? bankHasMovements(deleteItemTarget.id) : false}
        availableBanks={banks.filter((b) => b.id !== deleteItemTarget?.id)}
        onConfirm={(option, targetBankId) => {
          if (deleteItemTarget) {
            deleteBankSmart(deleteItemTarget.id, option as any, targetBankId);
          }
        }}
      />

      {/* Extrato Detalhado Modal */}
      {selectedBankForExtrato && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedBankForExtrato(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                style={{ backgroundColor: selectedBankForExtrato.color }}
              >
                {selectedBankForExtrato.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Extrato da Conta: {selectedBankForExtrato.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedBankForExtrato.institution} • Ag {selectedBankForExtrato.agency} / Cc {selectedBankForExtrato.account}
                </p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Filtro do Extrato:</span>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 font-bold">
                  <button
                    onClick={() => setExtratoFilterMode('mes')}
                    className={`px-3 py-1 rounded-md transition-all ${extratoFilterMode === 'mes' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    Por Mês
                  </button>
                  <button
                    onClick={() => setExtratoFilterMode('ano')}
                    className={`px-3 py-1 rounded-md transition-all ${extratoFilterMode === 'ano' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    Por Ano
                  </button>
                  <button
                    onClick={() => setExtratoFilterMode('periodo')}
                    className={`px-3 py-1 rounded-md transition-all ${extratoFilterMode === 'periodo' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    Por Período
                  </button>
                </div>
              </div>

              {extratoFilterMode === 'mes' && (
                <div className="flex items-center gap-2">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Selecionar Mês/Ano:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="05/2026">Maio/2026</option>
                    <option value="06/2026">Junho/2026</option>
                    <option value="07/2026">Julho/2026</option>
                    <option value="08/2026">Agosto/2026</option>
                  </select>
                </div>
              )}

              {extratoFilterMode === 'ano' && (
                <div className="flex items-center gap-2">
                  <label className="font-bold text-slate-600 dark:text-slate-400">Selecionar Ano:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              )}

              {extratoFilterMode === 'periodo' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">Data Início</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">Data Fim</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Extrato Calculation & Table */}
            {(() => {
              const bId = selectedBankForExtrato.id;

              // Collect all bank movements using central bankUtils logic
              const allMovements = getBankMovements(bId, {
                banks,
                incomes,
                fixedExpenses,
                variableExpenses,
                transfers,
                loans,
                investments,
                categories,
                subcategories,
              });

              // Determine period boundaries
              let isMatchingPeriod = (m: BankMovement) => true;
              let isBeforePeriod = (m: BankMovement) => false;

              if (extratoFilterMode === 'mes') {
                const parts = selectedMonth.split('/'); // e.g., "07/2026"
                const monthStartStr = `${parts[1]}-${parts[0]}-01`;
                isMatchingPeriod = (m) => {
                  const mParts = m.date.split('-');
                  return `${mParts[1]}/${mParts[0]}` === selectedMonth;
                };
                isBeforePeriod = (m) => m.date < monthStartStr;
              } else if (extratoFilterMode === 'ano') {
                const yearStartStr = `${selectedYear}-01-01`;
                isMatchingPeriod = (m) => m.date.startsWith(selectedYear);
                isBeforePeriod = (m) => m.date < yearStartStr;
              } else if (extratoFilterMode === 'periodo') {
                isMatchingPeriod = (m) => m.date >= startDate && m.date <= endDate;
                isBeforePeriod = (m) => m.date < startDate;
              }

              // Movements before the period to compute prior starting balance
              const priorMovements = allMovements.filter(isBeforePeriod);
              const priorEntradas = priorMovements
                .filter((m) => m.type === 'Entrada')
                .reduce((acc, m) => acc + m.amount, 0);
              const priorSaidas = priorMovements
                .filter((m) => m.type === 'Saída')
                .reduce((acc, m) => acc + m.amount, 0);

              const initialBal = (selectedBankForExtrato.initialBalance || 0) + priorEntradas - priorSaidas;

              // Filtered movements for the selected period
              const filteredMovements = allMovements.filter(isMatchingPeriod);

              const totalEntradas = filteredMovements
                .filter((m) => m.type === 'Entrada')
                .reduce((acc, m) => acc + m.amount, 0);

              const totalSaidas = filteredMovements
                .filter((m) => m.type === 'Saída')
                .reduce((acc, m) => acc + m.amount, 0);

              const finalBal = initialBal + totalEntradas - totalSaidas;

              // Calculate running balance row by row
              let currentRunning = initialBal;
              const movementsWithRunning = filteredMovements.map((m) => {
                if (m.type === 'Entrada') {
                  currentRunning += m.amount;
                } else {
                  currentRunning -= m.amount;
                }
                return { ...m, runningBalance: currentRunning };
              });

              return (
                <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                  {/* Account Cards Header */}
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Saldo Inicial</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{formatCurrency(initialBal)}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Entradas</p>
                      <p className="text-sm font-black text-emerald-600">{formatCurrency(totalEntradas)}</p>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
                      <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Saídas</p>
                      <p className="text-sm font-black text-rose-600">{formatCurrency(totalSaidas)}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Saldo Final</p>
                      <p className="text-sm font-black text-blue-600">{formatCurrency(finalBal)}</p>
                    </div>
                  </div>

                  {/* Movements Table */}
                  <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5">Data</th>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Categoria</th>
                          <th className="p-2.5">Subgrupo</th>
                          <th className="p-2.5 text-center">Tipo</th>
                          <th className="p-2.5 text-right">Valor</th>
                          <th className="p-2.5 text-right">Saldo Após Movimentação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {movementsWithRunning.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400">
                              Nenhuma movimentação encontrada para o período selecionado.
                            </td>
                          </tr>
                        ) : (
                          movementsWithRunning.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-2.5 font-medium whitespace-nowrap">{m.date}</td>
                              <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">{m.description}</td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">{m.categoryName}</td>
                              <td className="p-2.5 text-slate-500">{m.subcategoryName}</td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    m.type === 'Entrada'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {m.type}
                                </span>
                              </td>
                              <td
                                className={`p-2.5 text-right font-bold ${
                                  m.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {m.type === 'Entrada' ? '+' : '-'} {formatCurrency(m.amount)}
                              </td>
                              <td className="p-2.5 text-right font-black text-slate-800 dark:text-slate-200">
                                {formatCurrency(m.runningBalance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
