import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Investment, InvestmentType, LiquidityType } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency, formatDate, getCurrentDateFormatted } from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import { TrendingUp, Plus, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const InvestimentosModule: React.FC = () => {
  const {
    investments,
    banks,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    depositInvestment,
    withdrawInvestment,
    recalculateInvestmentYields,
  } = useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Investment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null);

  // Market Rates State
  const [cdiRate, setCdiRate] = useState<number>(10.5);
  const [selicRate, setSelicRate] = useState<number>(10.5);
  const [ipcaRate, setIpcaRate] = useState<number>(4.0);

  // Form State
  const [institution, setInstitution] = useState('BTG Pactual');
  const [type, setType] = useState<InvestmentType>('CDB');
  const [appliedAmount, setAppliedAmount] = useState<number>(10000);
  const [currentAmount, setCurrentAmount] = useState<number>(10500);
  const [yieldPercent, setYieldPercent] = useState<number>(1.2);
  const [liquidity, setLiquidity] = useState<LiquidityType>('Diária');
  const [applicationDate, setApplicationDate] = useState(getCurrentDateFormatted());

  // Transaction Modal State
  const [txType, setTxType] = useState<'Aporte' | 'Resgate'>('Aporte');
  const [txAmount, setTxAmount] = useState<number>(1000);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id || '');

  const openAddModal = () => {
    setEditingItem(null);
    setInstitution('BTG Pactual');
    setType('CDB');
    setAppliedAmount(10000);
    setCurrentAmount(10500);
    setYieldPercent(1.2);
    setLiquidity('Diária');
    setApplicationDate(getCurrentDateFormatted());
    setIsModalOpen(true);
  };

  const openEditModal = (item: Investment) => {
    setEditingItem(item);
    setInstitution(item.institution);
    setType(item.type);
    setAppliedAmount(item.appliedAmount);
    setCurrentAmount(item.currentAmount);
    setYieldPercent(item.yieldPercent);
    setLiquidity(item.liquidity);
    setApplicationDate(item.applicationDate);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateInvestment(editingItem.id, {
        institution,
        type,
        appliedAmount,
        currentAmount,
        yieldPercent,
        liquidity,
        applicationDate,
      });
    } else {
      addInvestment({
        institution,
        type,
        appliedAmount,
        currentAmount,
        yieldPercent,
        yieldAccumulated: currentAmount - appliedAmount,
        liquidity,
        applicationDate,
      });
    }
    setIsModalOpen(false);
  };

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestment) return;
    if (txType === 'Aporte') {
      depositInvestment(selectedInvestment.id, txAmount, selectedBankId);
    } else {
      withdrawInvestment(selectedInvestment.id, txAmount, selectedBankId);
    }
    setIsTxModalOpen(false);
  };

  const totalPortfolio = investments.reduce((acc, i) => acc + (i.archived ? 0 : i.currentAmount), 0);
  const totalApplied = investments.reduce((acc, i) => acc + (i.archived ? 0 : i.appliedAmount), 0);
  const totalGain = totalPortfolio - totalApplied;

  const columns: Column<Investment>[] = [
    {
      header: 'Ativo / Instituição',
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{r.type}</p>
            <p className="text-[11px] text-slate-400">{r.institution}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Valor Aplicado',
      accessor: (r) => <span className="font-mono font-medium text-slate-600 dark:text-slate-300">{formatCurrency(r.appliedAmount)}</span>,
    },
    {
      header: 'Saldo Atual',
      accessor: (r) => <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(r.currentAmount)}</span>,
      sortable: true,
    },
    {
      header: 'Rentabilidade',
      accessor: (r) => (
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
          +{r.yieldPercent}%
        </span>
      ),
    },
    {
      header: 'Liquidez',
      accessor: (r) => (
        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
          {r.liquidity}
        </span>
      ),
    },
    {
      header: 'Ações Rápidas',
      accessor: (r) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSelectedInvestment(r);
              setTxType('Aporte');
              setTxAmount(1000);
              setIsTxModalOpen(true);
            }}
            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Aporte
          </button>
          <button
            onClick={() => {
              setSelectedInvestment(r);
              setTxType('Resgate');
              setTxAmount(1000);
              setIsTxModalOpen(true);
            }}
            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-bold hover:bg-rose-100 transition-colors flex items-center gap-1"
          >
            <ArrowDownRight className="w-3.5 h-3.5" /> Resgate
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-2xl shadow-md">
          <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">Patrimônio Investido</p>
          <p className="text-2xl font-black mt-1 font-mono">{formatCurrency(totalPortfolio)}</p>
          <p className="text-[11px] text-indigo-300 mt-2">Rentabilidade global consolidada</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Aplicado</p>
          <p className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100 font-mono">{formatCurrency(totalApplied)}</p>
          <p className="text-[11px] text-slate-400 mt-2">Capital inicial injetado</p>
        </div>

        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl shadow-sm">
          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">Rendimento Acumulado</p>
          <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400 font-mono">+{formatCurrency(totalGain)}</p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">Lucro líquido dos investimentos</p>
        </div>
      </div>

      {/* Market Indexers & Automatic Yield Recalculation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Taxas de Mercado & Indexadores (CDI, Selic, IPCA)
            </h4>
            <p className="text-xs text-slate-400">
              Ajuste as taxas de referência ou utilize a atualização automática dos rendimentos da carteira
            </p>
          </div>

          <button
            onClick={() => recalculateInvestmentYields({ cdi: cdiRate, selic: selicRate, ipca: ipcaRate })}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            Recalcular Rentabilidade Automática
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300">CDI (% a.a.)</span>
              <p className="text-[10px] text-slate-400">Referência CDBs/LCIs</p>
            </div>
            <input
              type="number"
              step="0.01"
              value={cdiRate}
              onChange={(e) => setCdiRate(parseFloat(e.target.value) || 0)}
              className="w-16 p-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-emerald-600"
            />
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300">SELIC (% a.a.)</span>
              <p className="text-[10px] text-slate-400">Taxa Básica Banco Central</p>
            </div>
            <input
              type="number"
              step="0.01"
              value={selicRate}
              onChange={(e) => setSelicRate(parseFloat(e.target.value) || 0)}
              className="w-16 p-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-indigo-600"
            />
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300">IPCA (% a.a.)</span>
              <p className="text-[10px] text-slate-400">Inflação Tesouro IPCA+</p>
            </div>
            <input
              type="number"
              step="0.01"
              value={ipcaRate}
              onChange={(e) => setIpcaRate(parseFloat(e.target.value) || 0)}
              className="w-16 p-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-amber-600"
            />
          </div>
        </div>
      </div>

      <DataTable
        title="Gestão de Investimentos & Carteira"
        subtitle="Acompanhamento de CDB, Tesouro, Ações, FIIs e rendimentos em tempo real"
        columns={columns}
        data={investments}
        idKey="id"
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={(item) => setDeleteTarget(item)}
        exportFilename="investimentos_carteira"
      />

      {/* Transaction (Deposit/Withdraw) Modal */}
      {isTxModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsTxModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {txType === 'Aporte' ? '🟢 Novo Aporte' : '🔴 Novo Resgate'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{selectedInvestment.type} - {selectedInvestment.institution}</p>

            <form onSubmit={handleTxSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {txType === 'Aporte' ? 'Debitar da Conta Bancária:' : 'Creditar na Conta Bancária:'}
                </label>
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
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-bold text-white rounded-xl shadow-md ${
                    txType === 'Aporte' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar {txType}
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
              {editingItem ? '✏️ Editar Investimento' : '➕ Novo Investimento'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Instituição / Corretora</label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex: BTG Pactual, XP, Ágora, NuInvest"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Ativo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as InvestmentType)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="CDB">CDB</option>
                    <option value="Tesouro Direto">Tesouro Direto</option>
                    <option value="LCI">LCI / LCA</option>
                    <option value="Ações">Ações</option>
                    <option value="FII">FIIs (Fundos Imobiliários)</option>
                    <option value="Cripto">Criptomoedas</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Liquidez</label>
                  <select
                    value={liquidity}
                    onChange={(e) => setLiquidity(e.target.value as LiquidityType)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Diária">Diária</option>
                    <option value="No Vencimento">No Vencimento</option>
                    <option value="D+1">D+1</option>
                    <option value="D+30">D+30</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Aplicado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={appliedAmount}
                    onChange={(e) => setAppliedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Saldo Atual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
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
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Salvar Investimento
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
        title="Excluir Investimento"
        itemName={deleteTarget?.institution || ''}
        moduleType="geral"
        onConfirm={() => {
          if (deleteTarget) deleteInvestment(deleteTarget.id);
        }}
      />
    </div>
  );
};
