import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Loan, LoanType, AmortizationSystem, InstallmentStatus, LoanInstallment } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency, calculateEarlyPayoffDetails, getCurrentDateFormatted } from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import {
  Plus,
  X,
  Banknote,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Percent,
  ShieldCheck,
  TrendingDown,
  FileText,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  Clock,
  Coins,
  Building2,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const EmprestimosModule: React.FC = () => {
  const {
    loans,
    banks,
    addLoan,
    updateLoan,
    deleteLoanSmart,
    payLoanInstallment,
    updateLoanInstallmentStatus,
    earlyPayoffLoan,
  } = useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Loan | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<Loan | null>(null);

  // Analytical View Drawer/Modal Target
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'tabela' | 'simulacao' | 'graficos'>('resumo');

  // Installment status edit modal inside analytical view
  const [editingInstallment, setEditingInstallment] = useState<{ loanId: string; inst: LoanInstallment } | null>(null);
  const [instNewStatus, setInstNewStatus] = useState<InstallmentStatus>('Paga');
  const [instPaidAmountVal, setInstPaidAmountVal] = useState<number>(0);
  const [instBankId, setInstBankId] = useState<string>(banks[0]?.id || '');

  // Early Payoff Recalculation Modal
  const [earlyPayoffLoanTarget, setEarlyPayoffLoanTarget] = useState<Loan | null>(null);
  const [payoffBankId, setPayoffBankId] = useState<string>(banks[0]?.id || '');
  const [payoffUntilInstallment, setPayoffUntilInstallment] = useState<number>(0);
  const [simulatedDate, setSimulatedDate] = useState<string>(getCurrentDateFormatted());

  // Form State
  const [bankId, setBankId] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [type, setType] = useState<string>('Consignado');
  const [customType, setCustomType] = useState('');
  const [contractedAmount, setContractedAmount] = useState<number>(30000);
  const [netAmountReceived, setNetAmountReceived] = useState<number>(30000);
  const [interestRateMonthly, setInterestRateMonthly] = useState<number>(1.4);
  const [interestRateYearly, setInterestRateYearly] = useState<number>(18.16);
  const [cetRateYearly, setCetRateYearly] = useState<number>(19.80);
  const [iofAmount, setIofAmount] = useState<number>(450);
  const [insuranceAmount, setInsuranceAmount] = useState<number>(250);
  const [feesAmount, setFeesAmount] = useState<number>(0);
  const [amortizationSystem, setAmortizationSystem] = useState<AmortizationSystem>('PRICE');
  const [installmentsTotal, setInstallmentsTotal] = useState<number>(48);

  // Table status filter
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  const openAddModal = () => {
    setEditingItem(null);
    setBankId(banks[0]?.id || '');
    setContractNumber(`CT-${Math.floor(100000 + Math.random() * 900000)}-${new Date().getFullYear()}`);
    setType('Consignado');
    setCustomType('');
    setContractedAmount(30000);
    setNetAmountReceived(30000);
    setInterestRateMonthly(1.4);
    setInterestRateYearly(18.16);
    setCetRateYearly(19.80);
    setIofAmount(450);
    setInsuranceAmount(250);
    setFeesAmount(0);
    setAmortizationSystem('PRICE');
    setInstallmentsTotal(48);
    setIsModalOpen(true);
  };

  const handleMonthlyInterestChange = (val: number) => {
    setInterestRateMonthly(val);
    const yearly = Math.round((Math.pow(1 + val / 100, 12) - 1) * 10000) / 100;
    setInterestRateYearly(yearly);
    setCetRateYearly(Math.round((yearly + 1.6) * 100) / 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateLoan(editingItem.id, {
        bankId,
        contractNumber,
        type: type === 'Outros' ? customType || 'Outros' : type,
        customType: type === 'Outros' ? customType : undefined,
        contractedAmount,
        netAmountReceived,
        interestRateMonthly,
        interestRateYearly,
        cetRateYearly,
        iofAmount,
        insuranceAmount,
        feesAmount,
        amortizationSystem,
        installmentsTotal,
      });
    } else {
      addLoan({
        bankId,
        contractNumber,
        type: type === 'Outros' ? customType || 'Outros' : type,
        customType: type === 'Outros' ? customType : undefined,
        contractedAmount,
        netAmountReceived,
        interestRateMonthly,
        interestRateYearly,
        cetRateYearly,
        iofAmount,
        insuranceAmount,
        feesAmount,
        amortizationSystem,
        installmentsTotal,
        installmentsPaid: 0,
        installmentAmount: contractedAmount / installmentsTotal,
        outstandingBalance: contractedAmount,
        paidAmount: 0,
        paidInterest: 0,
        paidAmortization: 0,
        status: 'Ativo',
        installments: [],
      });
    }
    setIsModalOpen(false);
  };

  const handlePayInstallment = (loan: Loan, installmentNumber: number) => {
    payLoanInstallment(loan.id, installmentNumber, loan.bankId);
    // Refresh detail target if open
    if (detailLoan?.id === loan.id) {
      const refreshed = useFinancialStore.getState().loans.find((l) => l.id === loan.id);
      if (refreshed) setDetailLoan(refreshed);
    }
  };

  const handleSaveInstallmentStatus = () => {
    if (!editingInstallment) return;
    updateLoanInstallmentStatus(
      editingInstallment.loanId,
      editingInstallment.inst.number,
      instNewStatus,
      instPaidAmountVal,
      instBankId
    );
    setEditingInstallment(null);
    if (detailLoan?.id === editingInstallment.loanId) {
      const refreshed = useFinancialStore.getState().loans.find((l) => l.id === editingInstallment.loanId);
      if (refreshed) setDetailLoan(refreshed);
    }
  };

  // KPIs
  const totalContracted = loans.reduce((acc, l) => acc + l.contractedAmount, 0);
  const totalOutstanding = loans.reduce((acc, l) => acc + l.outstandingBalance, 0);
  const totalPaidAmort = loans.reduce((acc, l) => acc + l.paidAmortization, 0);
  const totalPaidInterest = loans.reduce((acc, l) => acc + l.paidInterest, 0);

  const columns: Column<Loan>[] = [
    {
      header: 'Contrato / Modalidade',
      accessor: (r) => {
        const b = banks.find((bk) => bk.id === r.bankId);
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-slate-800 dark:text-slate-100">{r.customType || r.type}</p>
              {r.contractNumber && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                  {r.contractNumber}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              {b?.name} • {r.amortizationSystem} ({r.interestRateMonthly}% a.m. / CET {r.cetRateYearly}% a.a.)
            </span>
          </div>
        );
      },
      sortable: true,
    },
    {
      header: 'Valor Contratado / Líquido',
      accessor: (r) => (
        <div>
          <p className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(r.contractedAmount)}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">
            Líquido: {formatCurrency(r.netAmountReceived || r.contractedAmount)}
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Saldo Devedor Atual',
      accessor: (r) => (
        <div>
          <span className="font-black text-red-600 dark:text-red-400">{formatCurrency(r.outstandingBalance)}</span>
          <p className="text-[10px] text-slate-400">Juros pagos: {formatCurrency(r.paidInterest)}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Progresso / Parcelas',
      accessor: (r) => {
        const paidCount = r.installments.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada').length;
        const pct = Math.min(100, Math.round((paidCount / (r.installmentsTotal || 1)) * 100));
        return (
          <div className="space-y-1 w-32">
            <div className="flex justify-between text-[10px] font-bold text-slate-500">
              <span>{paidCount} pagas</span>
              <span>{r.installmentsTotal} total ({pct}%)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Ações de Gestão',
      accessor: (r) => {
        const nextPending = r.installments.find((i) => i.status === 'Pendente' || i.status === 'Atrasada');
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setDetailLoan(r);
                setActiveTab('resumo');
              }}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              Demonstrativo
            </button>

            {r.status === 'Ativo' && (
              <>
                {nextPending && (
                  <button
                    onClick={() => handlePayInstallment(r, nextPending.number)}
                    className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    Pagar nº {nextPending.number}
                  </button>
                )}
                <button
                  onClick={() => {
                    setEarlyPayoffLoanTarget(r);
                    const paidCount = r.installments.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada').length;
                    setPayoffUntilInstallment(paidCount);
                    setPayoffBankId(r.bankId);
                  }}
                  className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  Quitar
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Total Contratado</span>
            <Banknote className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalContracted)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{loans.length} contratos ativos/encerrados</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Saldo Devedor Consolidado</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-xl font-black text-red-600 dark:text-red-400">{formatCurrency(totalOutstanding)}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalContracted > 0 ? `${Math.round((totalOutstanding / totalContracted) * 100)}% do montante total` : 'Sem dívidas'}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Amortização Paga</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaidAmort)}</p>
          <p className="text-[11px] text-slate-400 mt-1">+ {formatCurrency(totalPaidInterest)} em juros quitados</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Simulação de Quitação</span>
            <Calculator className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">Recálculo em tempo real</p>
          <p className="text-[11px] text-slate-400 mt-1">Abatimento integral de juros futuros</p>
        </div>
      </div>

      {/* Main Loans Table */}
      <DataTable
        title="Empréstimos, Financiamentos & Consignados"
        subtitle="Controle completo de modalidades, contratos, demonstrativo analítico, taxas e quitação antecipada"
        columns={columns}
        data={loans}
        idKey="id"
        onAdd={openAddModal}
        onDelete={(item) => setDeleteItemTarget(item)}
        exportFilename="emprestimos_financiamentos"
      />

      {/* DEMONSTRATIVO ANALÍTICO DOS EMPRÉSTIMOS - MODAL / DRAWER */}
      {detailLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{detailLoan.customType || detailLoan.type}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                      {detailLoan.contractNumber || 'Contrato'}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        detailLoan.status === 'Ativo'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {detailLoan.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Banco: {banks.find((b) => b.id === detailLoan.bankId)?.name} • Sistema {detailLoan.amortizationSystem}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailLoan(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 gap-2 pt-2">
              <button
                onClick={() => setActiveTab('resumo')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-colors border-b-2 ${
                  activeTab === 'resumo'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                1. Resumo Financeiro & Taxas
              </button>
              <button
                onClick={() => setActiveTab('tabela')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-colors border-b-2 ${
                  activeTab === 'tabela'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                2. Tabela Analítica de Parcelas ({detailLoan.installments.length})
              </button>
              <button
                onClick={() => setActiveTab('simulacao')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-colors border-b-2 ${
                  activeTab === 'simulacao'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                3. Simulação de Quitação
              </button>
              <button
                onClick={() => setActiveTab('graficos')}
                className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-colors border-b-2 ${
                  activeTab === 'graficos'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                4. Gráficos de Evolução
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-slate-900">
              {/* TAB 1: RESUMO FINANCEIRO */}
              {activeTab === 'resumo' && (
                <div className="space-y-6">
                  {/* Financial Overview Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                      <p className="text-[11px] font-bold text-slate-400">Valor Contratado</p>
                      <p className="text-base font-black text-slate-800 dark:text-slate-100">
                        {formatCurrency(detailLoan.contractedAmount)}
                      </p>
                    </div>

                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                      <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Líquido Recebido</p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(detailLoan.netAmountReceived || detailLoan.contractedAmount)}
                      </p>
                    </div>

                    <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl">
                      <p className="text-[11px] font-bold text-red-700 dark:text-red-300">Saldo Devedor Atual</p>
                      <p className="text-base font-black text-red-600 dark:text-red-400">
                        {formatCurrency(detailLoan.outstandingBalance)}
                      </p>
                    </div>

                    <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
                      <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Amortização Paga</p>
                      <p className="text-base font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(detailLoan.paidAmortization)}
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl">
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Juros Pagos Acumulados</p>
                      <p className="text-base font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(detailLoan.paidInterest)}
                      </p>
                    </div>

                    <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl">
                      <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300">IOF / Seguro Totais</p>
                      <p className="text-base font-black text-purple-600 dark:text-purple-400">
                        {formatCurrency((detailLoan.iofAmount || 0) + (detailLoan.insuranceAmount || 0))}
                      </p>
                    </div>

                    <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl col-span-2">
                      {(() => {
                        const paidCount = detailLoan.installments.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada').length;
                        const details = calculateEarlyPayoffDetails(detailLoan, paidCount);
                        return (
                          <div>
                            <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                              Quitação Antecipada Hoje (Abatimento de Juros)
                            </p>
                            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(details.payoffAmountDiscounted)}
                              <span className="text-xs font-semibold text-emerald-600 ml-2">
                                (Economia: {formatCurrency(details.interestSavings)})
                              </span>
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Contract Details Panel */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      Especificações Contratuais do Financiamento
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Taxa Mensal</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {detailLoan.interestRateMonthly}% a.m.
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Taxa Anual</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {detailLoan.interestRateYearly}% a.a.
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">CET (Custo Efetivo Total)</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{detailLoan.cetRateYearly}% a.a.</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Sistema Amortização</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{detailLoan.amortizationSystem}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Total de Parcelas</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{detailLoan.installmentsTotal}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Valor Médio Parcela</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(detailLoan.installmentAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">IOF Financiado</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(detailLoan.iofAmount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Seguro Financiado</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(detailLoan.insuranceAmount || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TABELA ANALÍTICA DE PARCELAS */}
              {activeTab === 'tabela' && (
                <div className="space-y-4">
                  {/* Status Filters */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {['Todos', 'Pendente', 'Paga', 'Atrasada', 'Antecipada', 'Quitada', 'Renegociada'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                            statusFilter === st
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs text-slate-400 font-medium">
                      Exibindo{' '}
                      {
                        detailLoan.installments.filter((i) => statusFilter === 'Todos' || i.status === statusFilter)
                          .length
                      }{' '}
                      de {detailLoan.installments.length} parcelas
                    </p>
                  </div>

                  {/* Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Nº</th>
                          <th className="p-3">Vencimento</th>
                          <th className="p-3 text-right">Prestação</th>
                          <th className="p-3 text-right">Amortização</th>
                          <th className="p-3 text-right">Juros</th>
                          <th className="p-3 text-right">IOF/Seguro</th>
                          <th className="p-3 text-right">Total Pago</th>
                          <th className="p-3 text-right">Saldo Devedor</th>
                          <th className="p-3 text-center">Situação</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {detailLoan.installments
                          .filter((i) => statusFilter === 'Todos' || i.status === statusFilter)
                          .map((inst) => (
                            <tr key={inst.number} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{inst.number}</td>
                              <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{inst.dueDate}</td>
                              <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                                {formatCurrency(inst.amount)}
                              </td>
                              <td className="p-3 text-right text-blue-600 font-semibold">{formatCurrency(inst.principal)}</td>
                              <td className="p-3 text-right text-amber-600">{formatCurrency(inst.interest)}</td>
                              <td className="p-3 text-right text-slate-400">
                                {formatCurrency((inst.iof || 0) + (inst.insurance || 0))}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-600">
                                {formatCurrency(inst.paidAmount)}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-500">
                                {formatCurrency(inst.remainingBalance)}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    inst.status === 'Paga' || inst.status === 'Quitada'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                      : inst.status === 'Antecipada'
                                      ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                                      : inst.status === 'Atrasada'
                                      ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                                      : inst.status === 'Renegociada'
                                      ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {inst.status}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    setEditingInstallment({ loanId: detailLoan.id, inst });
                                    setInstNewStatus(inst.status === 'Pendente' ? 'Paga' : inst.status);
                                    setInstPaidAmountVal(inst.paidAmount || inst.amount);
                                    setInstBankId(detailLoan.bankId);
                                  }}
                                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold"
                                >
                                  Alterar Status
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SIMULAÇÃO DE QUITAÇÃO ANTECIPADA */}
              {activeTab === 'simulacao' && (
                <div className="space-y-6">
                  <div className="p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-blue-400" />
                      <h4 className="font-bold text-base">Simulador de Quitação com Abatimento de Juros Futuros</h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      A quitação antecipada garante o desconto proporcional dos juros futuros não decorridos, conforme
                      determinado pelo Código de Defesa do Consumidor e resolução do Banco Central.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Controls Form */}
                    <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Data Simulada para Quitação
                        </label>
                        <input
                          type="date"
                          value={simulatedDate}
                          onChange={(e) => setSimulatedDate(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Até qual parcela deseja antecipar?
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={detailLoan.installmentsTotal}
                            value={payoffUntilInstallment}
                            onChange={(e) => setPayoffUntilInstallment(parseInt(e.target.value) || 0)}
                            className="w-full"
                          />
                          <span className="font-bold text-sm w-12 text-center">{payoffUntilInstallment}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {payoffUntilInstallment === 0
                            ? 'Quitar todas as parcelas restantes'
                            : `Manter até parcela ${payoffUntilInstallment} e quitar as demais`}
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Conta Bancária para Débito
                        </label>
                        <select
                          value={payoffBankId}
                          onChange={(e) => setPayoffBankId(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                        >
                          {banks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} (Saldo: {formatCurrency(b.currentBalance)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Results Card */}
                    {(() => {
                      const details = calculateEarlyPayoffDetails(detailLoan, payoffUntilInstallment);
                      return (
                        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">
                              Resultado da Simulação
                            </span>

                            <div>
                              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                                Valor Atualizado para Quitação Hoje:
                              </span>
                              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(details.payoffAmountDiscounted)}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-emerald-200 dark:border-emerald-800 text-xs">
                              <div>
                                <span className="text-emerald-700 dark:text-emerald-300">Total Nominal sem Desconto:</span>
                                <p className="font-bold text-slate-700 dark:text-slate-300">
                                  {formatCurrency(details.totalOriginalRemaining)}
                                </p>
                              </div>
                              <div>
                                <span className="text-emerald-700 dark:text-emerald-300">Economia Total em Juros:</span>
                                <p className="font-bold text-emerald-600">+{formatCurrency(details.interestSavings)}</p>
                              </div>
                              <div>
                                <span className="text-emerald-700 dark:text-emerald-300">Parcelas Quitadas:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200">
                                  {details.remainingInstallmentsCount} parcelas
                                </p>
                              </div>
                              <div>
                                <span className="text-emerald-700 dark:text-emerald-300">Desconto Obtido:</span>
                                <p className="font-bold text-emerald-600">~{details.discountPercentage}%</p>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              earlyPayoffLoan(detailLoan.id, payoffUntilInstallment, payoffBankId);
                              const refreshed = useFinancialStore.getState().loans.find((l) => l.id === detailLoan.id);
                              if (refreshed) setDetailLoan(refreshed);
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Efetivar Quitação Agora
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 4: GRÁFICOS DE EVOLUÇÃO */}
              {activeTab === 'graficos' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Outstanding Balance Evolution Chart */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <LineIcon className="w-4 h-4 text-blue-500" />
                        Evolução do Saldo Devedor (R$)
                      </h4>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={detailLoan.installments.slice(0, 48)}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="number" />
                            <YAxis tickFormatter={(v) => `R$${v / 1000}k`} />
                            <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                            <Line
                              type="monotone"
                              dataKey="remainingBalance"
                              name="Saldo Devedor"
                              stroke="#2563eb"
                              strokeWidth={3}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Amortization vs Interest Chart */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-amber-500" />
                        Composição da Parcela: Amortização vs Juros (R$)
                      </h4>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={detailLoan.installments.slice(0, 24)}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="number" />
                            <YAxis tickFormatter={(v) => `R$${v}`} />
                            <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                            <Legend />
                            <Bar dataKey="principal" name="Amortização" fill="#10b981" stackId="a" />
                            <Bar dataKey="interest" name="Juros" fill="#f59e0b" stackId="a" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Installment Status Modal */}
      {editingInstallment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingInstallment(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Alterar Situação da Parcela nº {editingInstallment.inst.number}
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Situação</label>
                <select
                  value={instNewStatus}
                  onChange={(e) => setInstNewStatus(e.target.value as InstallmentStatus)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Paga">Paga</option>
                  <option value="Atrasada">Atrasada</option>
                  <option value="Antecipada">Antecipada</option>
                  <option value="Quitada">Quitada</option>
                  <option value="Renegociada">Renegociada</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Efetivamente Pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={instPaidAmountVal}
                  onChange={(e) => setInstPaidAmountVal(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Conta Bancária de Débito</label>
                <select
                  value={instBankId}
                  onChange={(e) => setInstBankId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Saldo: {formatCurrency(b.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setEditingInstallment(null)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveInstallmentStatus}
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Salvar Situação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recalculation & Quick Early Payoff Modal */}
      {earlyPayoffLoanTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEarlyPayoffLoanTarget(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Simulação de Quitação Antecipada</h3>
                <p className="text-xs text-slate-500">Recálculo automático dos juros futuros com abatimento integral</p>
              </div>
            </div>

            {(() => {
              const details = calculateEarlyPayoffDetails(earlyPayoffLoanTarget, payoffUntilInstallment);
              return (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-800 dark:text-emerald-200">
                        Valor com Desconto p/ Quitar Agora:
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(details.payoffAmountDiscounted)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                      <div>
                        <span>Economia de Juros Futuros:</span>
                        <p className="font-bold text-emerald-600">+{formatCurrency(details.interestSavings)}</p>
                      </div>
                      <div>
                        <span>Desconto Percentual Obtido:</span>
                        <p className="font-bold text-emerald-600">~{details.discountPercentage}%</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Conta para Débito</label>
                    <select
                      value={payoffBankId}
                      onChange={(e) => setPayoffBankId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} (Saldo: {formatCurrency(b.currentBalance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setEarlyPayoffLoanTarget(null)}
                      className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        earlyPayoffLoan(earlyPayoffLoanTarget.id, payoffUntilInstallment, payoffBankId);
                        setEarlyPayoffLoanTarget(null);
                      }}
                      className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                    >
                      Efetuar Quitação Total
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add / Edit Loan Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Contratar Empréstimo ou Financiamento
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Banco Concedente</label>
                  <select
                    required
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.institution})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número do Contrato</label>
                  <input
                    type="text"
                    required
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="Ex: CT-889410"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Empréstimo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="CDC">CDC</option>
                    <option value="Consignado">Consignado</option>
                    <option value="Financiamento">Financiamento</option>
                    <option value="Crédito Pessoal">Crédito Pessoal</option>
                    <option value="Capital de Giro">Capital de Giro</option>
                    <option value="Outros">Outros / Personalizado</option>
                  </select>
                </div>

                {type === 'Outros' && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Modalidade Customizada</label>
                    <input
                      type="text"
                      required
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="Ex: Leasing Veicular"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Contratado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={contractedAmount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setContractedAmount(val);
                      setNetAmountReceived(val);
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor Líquido Recebido (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={netAmountReceived || ''}
                    onChange={(e) => setNetAmountReceived(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Taxa Mensal (% a.m.)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={interestRateMonthly || ''}
                    onChange={(e) => handleMonthlyInterestChange(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Taxa Anual (% a.a.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestRateYearly || ''}
                    onChange={(e) => setInterestRateYearly(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CET (% a.a.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cetRateYearly || ''}
                    onChange={(e) => setCetRateYearly(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">IOF (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={iofAmount || ''}
                    onChange={(e) => setIofAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Seguro (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={insuranceAmount || ''}
                    onChange={(e) => setInsuranceAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Encargos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={feesAmount || ''}
                    onChange={(e) => setFeesAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sistema de Amortização</label>
                  <select
                    value={amortizationSystem}
                    onChange={(e) => setAmortizationSystem(e.target.value as AmortizationSystem)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="PRICE">PRICE (Parcelas Fixas)</option>
                    <option value="SAC">SAC (Amortização Constante)</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade de Parcelas</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={installmentsTotal || ''}
                    onChange={(e) => setInstallmentsTotal(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Automatic credit note */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2.5 text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Regra de Lançamento Automático:</strong> Ao salvar, o valor líquido recebido (
                  <strong>{formatCurrency(netAmountReceived)}</strong>) será creditado automaticamente no saldo do banco
                  selecionado, e o cronograma de todas as <strong>{installmentsTotal} parcelas</strong> será gerado
                  automaticamente.
                </p>
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
                  Cadastrar Empréstimo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Delete Modal */}
      {deleteItemTarget && (
        <SmartDeleteModal
          isOpen={!!deleteItemTarget}
          onClose={() => setDeleteItemTarget(null)}
          onConfirm={() => {
            deleteLoanSmart(deleteItemTarget.id);
            setDeleteItemTarget(null);
          }}
          title={`Excluir / Encerrar Empréstimo (${deleteItemTarget.type})`}
          description={
            deleteItemTarget.installmentsPaid > 0
              ? 'Este empréstimo possui parcelas pagas! Ele não será excluído para preservar o histórico contábil, mas o status será alterado para Encerrado.'
              : 'Deseja mover este empréstimo não iniciado para a lixeira?'
          }
        />
      )}
    </div>
  );
};
