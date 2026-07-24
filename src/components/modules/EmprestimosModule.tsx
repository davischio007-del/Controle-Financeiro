import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Loan, LoanType, AmortizationSystem, InstallmentStatus, LoanInstallment } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import {
  formatCurrency,
  formatDate,
  calculateEarlyPayoffDetails,
  calculateExtraAmortizationDetails,
  getCurrentDateFormatted,
  calculatePRICESchedule,
  calculateSACSchedule,
  calculateCustomSchedule,
} from '../../lib/utils';
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
  Calendar,
  Edit3,
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

export function getLoanInstallments(loan: Loan): LoanInstallment[] {
  const rawInsts = loan.installments || [];
  const hasValidAmounts =
    rawInsts.length > 0 &&
    rawInsts.some((i) => (i.amount || 0) > 0 || (i.principal || 0) > 0);

  const baseDate = loan.contractDate || (rawInsts[0]?.dueDate && !rawInsts[0].dueDate.startsWith('1970') && !rawInsts[0].dueDate.startsWith('1969') ? rawInsts[0].dueDate : getCurrentDateFormatted());
  const firstDue = loan.firstDueDate;

  let computedSchedule: LoanInstallment[] = [];
  if (loan.amortizationSystem === 'SAC') {
    computedSchedule = calculateSACSchedule(
      loan.contractedAmount || 0,
      loan.interestRateMonthly || 0,
      loan.installmentsTotal || 12,
      baseDate,
      loan.iofAmount || 0,
      loan.insuranceAmount || 0,
      loan.feesAmount || 0,
      firstDue
    );
  } else if (loan.amortizationSystem === 'Personalizado') {
    computedSchedule = calculateCustomSchedule(
      loan.contractedAmount || 0,
      loan.interestRateMonthly || 0,
      loan.installmentsTotal || 12,
      baseDate,
      loan.iofAmount || 0,
      loan.insuranceAmount || 0,
      loan.feesAmount || 0,
      firstDue
    );
  } else {
    computedSchedule = calculatePRICESchedule(
      loan.contractedAmount || 0,
      loan.interestRateMonthly || 0,
      loan.installmentsTotal || 12,
      baseDate,
      loan.iofAmount || 0,
      loan.insuranceAmount || 0,
      loan.feesAmount || 0,
      firstDue
    );
  }

  if (hasValidAmounts) {
    return rawInsts.map((inst, idx) => {
      const calc = computedSchedule[idx];
      const amount = (inst.amount && inst.amount > 0) ? inst.amount : (calc?.amount || 0);
      const principal = (inst.principal && inst.principal > 0) ? inst.principal : (calc?.principal || 0);
      const interest = (inst.interest && inst.interest > 0) ? inst.interest : (calc?.interest || 0);
      const remainingBalance =
        inst.remainingBalance !== undefined && inst.remainingBalance > 0
          ? inst.remainingBalance
          : (calc?.remainingBalance || 0);
      const dueDate =
        inst.dueDate && !inst.dueDate.startsWith('1970') && !inst.dueDate.startsWith('1969')
          ? inst.dueDate
          : (calc?.dueDate || getCurrentDateFormatted());

      return {
        ...inst,
        amount,
        principal,
        interest,
        remainingBalance,
        dueDate,
      };
    });
  }

  if (rawInsts.length > 0) {
    return computedSchedule.map((calcInst, index) => {
      const existing = rawInsts[index] || rawInsts.find((r) => r.number === calcInst.number);
      if (existing) {
        const isPaidStatus = existing.status === 'Paga' || existing.status === 'Quitada' || existing.status === 'Antecipada';
        return {
          ...calcInst,
          status: existing.status || calcInst.status,
          paidAmount: existing.paidAmount !== undefined && existing.paidAmount > 0
            ? existing.paidAmount
            : (isPaidStatus ? calcInst.amount : 0),
          paidDate: existing.paidDate || calcInst.paidDate,
          dueDate: existing.dueDate && !existing.dueDate.startsWith('1970') && !existing.dueDate.startsWith('1969')
            ? existing.dueDate
            : calcInst.dueDate,
        };
      }
      return calcInst;
    });
  }

  return computedSchedule;
}

export const EmprestimosModule: React.FC = () => {
  const {
    loans,
    banks,
    cards,
    addLoan,
    updateLoan,
    deleteLoanSmart,
    deleteLoan,
    payLoanInstallment,
    updateLoanInstallmentStatus,
    earlyPayoffLoan,
    applyExtraAmortizationLoan,
  } = useFinancialStore();

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

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

  // Extra Amortization Modal State
  const [extraAmortModalLoan, setExtraAmortModalLoan] = useState<Loan | null>(null);
  const [extraAmortAmount, setExtraAmortAmount] = useState<number>(1000);
  const [extraAmortDate, setExtraAmortDate] = useState<string>(getCurrentDateFormatted());
  const [extraAmortOption, setExtraAmortOption] = useState<'prazo' | 'parcela'>('prazo');
  const [extraAmortBankId, setExtraAmortBankId] = useState<string>(banks[0]?.id || '');

  // Direct Delete Modal State - Removed duplicate, using single onDelete target

  // Form State
  const [bankId, setBankId] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState<string>(getCurrentDateFormatted());
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const y = nextMonth.getFullYear();
    const m = String(nextMonth.getMonth() + 1).padStart(2, '0');
    const day = String(nextMonth.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
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

  const handleContractDateChange = (val: string) => {
    setContractDate(val);
    if (val) {
      const clean = val.split('T')[0];
      const parts = clean.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setMonth(d.getMonth() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setFirstDueDate(`${y}-${m}-${day}`);
      }
    }
  };

  // Calculated schedule and average installment for the registration form
  const calculatedSchedule = React.useMemo(() => {
    if (!contractedAmount || !installmentsTotal) return [];
    const startDate = contractDate || getCurrentDateFormatted();
    if (amortizationSystem === 'SAC') {
      return calculateSACSchedule(contractedAmount, interestRateMonthly, installmentsTotal, startDate, 0, 0, feesAmount, firstDueDate);
    } else if (amortizationSystem === 'Personalizado') {
      return calculateCustomSchedule(contractedAmount, interestRateMonthly, installmentsTotal, startDate, 0, 0, feesAmount, firstDueDate);
    } else {
      return calculatePRICESchedule(contractedAmount, interestRateMonthly, installmentsTotal, startDate, 0, 0, feesAmount, firstDueDate);
    }
  }, [contractedAmount, interestRateMonthly, installmentsTotal, amortizationSystem, feesAmount, contractDate, firstDueDate]);

  const averageInstallmentAmount = React.useMemo(() => {
    if (!calculatedSchedule.length) return 0;
    const total = calculatedSchedule.reduce((acc, curr) => acc + curr.amount, 0);
    return total / calculatedSchedule.length;
  }, [calculatedSchedule]);

  const activeLoanInstallments = React.useMemo(() => {
    if (!detailLoan) return [];
    return getLoanInstallments(detailLoan);
  }, [detailLoan]);

  const openAddModal = () => {
    setEditingItem(null);
    setBankId(banks[0]?.id || '');
    setContractNumber(`CT-${Math.floor(100000 + Math.random() * 900000)}-${new Date().getFullYear()}`);
    const today = getCurrentDateFormatted();
    setContractDate(today);
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setFirstDueDate(`${y}-${m}-${day}`);
    setType('Consignado');
    setCustomType('');
    setContractedAmount(30000);
    setNetAmountReceived(30000);
    setInterestRateMonthly(1.4);
    setInterestRateYearly(18.16);
    setCetRateYearly(19.80);
    setIofAmount(0);
    setInsuranceAmount(0);
    setFeesAmount(0);
    setAmortizationSystem('PRICE');
    setInstallmentsTotal(48);
    setIsModalOpen(true);
  };

  const openEditModal = (loan: Loan) => {
    setEditingItem(loan);
    setBankId(loan.bankId);
    setContractNumber(loan.contractNumber || '');
    setContractDate(loan.contractDate || getCurrentDateFormatted());
    const defaultFirstDue = loan.firstDueDate || (loan.installments?.[0]?.dueDate || '');
    setFirstDueDate(defaultFirstDue);
    setType(loan.type || 'Consignado');
    setCustomType(loan.customType || '');
    setContractedAmount(loan.contractedAmount);
    setNetAmountReceived(loan.netAmountReceived || loan.contractedAmount);
    setInterestRateMonthly(loan.interestRateMonthly);
    setInterestRateYearly(loan.interestRateYearly);
    setCetRateYearly(loan.cetRateYearly);
    setIofAmount(loan.iofAmount || 0);
    setInsuranceAmount(loan.insuranceAmount || 0);
    setFeesAmount(loan.feesAmount || 0);
    setAmortizationSystem(loan.amortizationSystem);
    setInstallmentsTotal(loan.installmentsTotal);
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
        contractDate,
        firstDueDate,
        type: type === 'Outros' ? customType || 'Outros' : type,
        customType: type === 'Outros' ? customType : undefined,
        contractedAmount,
        netAmountReceived,
        interestRateMonthly,
        interestRateYearly,
        cetRateYearly,
        iofAmount: 0,
        insuranceAmount: 0,
        feesAmount,
        amortizationSystem,
        installmentsTotal,
      });
    } else {
      addLoan({
        bankId,
        contractNumber,
        contractDate,
        firstDueDate,
        type: type === 'Outros' ? customType || 'Outros' : type,
        customType: type === 'Outros' ? customType : undefined,
        contractedAmount,
        netAmountReceived,
        interestRateMonthly,
        interestRateYearly,
        cetRateYearly,
        iofAmount: 0,
        insuranceAmount: 0,
        feesAmount,
        amortizationSystem,
        installmentsTotal,
        installmentsPaid: 0,
        installmentAmount: averageInstallmentAmount || contractedAmount / installmentsTotal,
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
    setPaymentError(null);
    setPaymentSuccess(null);
    const inst = loan.installments.find((i) => i.number === installmentNumber);
    const res = payLoanInstallment(loan.id, installmentNumber, loan.bankId);
    if (!res.success) {
      if (inst) {
        setEditingInstallment({ loanId: loan.id, inst });
        setInstNewStatus('Paga');
        setInstPaidAmountVal(inst.amount);
        setInstBankId(loan.bankId || banks[0]?.id || cards[0]?.id || '');
      }
      setPaymentError(res.error || 'Pagamento rejeitado por saldo/limite insuficiente.');
      return;
    }
    setPaymentSuccess(`Parcela nº ${installmentNumber} paga com sucesso! Saldo/limite atualizado.`);
    if (detailLoan?.id === loan.id) {
      const refreshed = useFinancialStore.getState().loans.find((l) => l.id === loan.id);
      if (refreshed) setDetailLoan(refreshed);
    }
  };

  const handleSaveInstallmentStatus = () => {
    if (!editingInstallment) return;
    setPaymentError(null);
    setPaymentSuccess(null);
    const res = updateLoanInstallmentStatus(
      editingInstallment.loanId,
      editingInstallment.inst.number,
      instNewStatus,
      instPaidAmountVal,
      instBankId
    );
    if (!res.success) {
      setPaymentError(res.error || 'Pagamento rejeitado.');
      return;
    }
    setPaymentSuccess('Situação da parcela alterada com sucesso! Saldo/limite atualizado.');
    setEditingInstallment(null);
    if (detailLoan?.id === editingInstallment.loanId) {
      const refreshed = useFinancialStore.getState().loans.find((l) => l.id === editingInstallment.loanId);
      if (refreshed) setDetailLoan(refreshed);
    }
  };

  // KPIs
  const totalContracted = loans.reduce((acc, l) => acc + (l.contractedAmount || 0), 0);
  const totalOutstanding = loans.reduce((acc, l) => {
    const insts = getLoanInstallments(l);
    const paidInsts = insts.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada');
    const paidAmort = paidInsts.reduce((a, i) => a + (i.principal || 0), 0);
    return acc + Math.max(0, (l.contractedAmount || 0) - paidAmort);
  }, 0);
  const totalPaidAmort = loans.reduce((acc, l) => {
    const insts = getLoanInstallments(l);
    const paidInsts = insts.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada');
    return acc + paidInsts.reduce((a, i) => a + (i.principal || 0), 0);
  }, 0);
  const totalPaidInterest = loans.reduce((acc, l) => {
    const insts = getLoanInstallments(l);
    const paidInsts = insts.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada');
    return acc + paidInsts.reduce((a, i) => a + (i.interest || 0), 0);
  }, 0);

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
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-400">
                {b?.name} • {r.amortizationSystem} ({r.interestRateMonthly}% a.m. / CET {r.cetRateYearly}% a.a.)
              </span>
              <button
                onClick={() => openEditModal(r)}
                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors inline-flex items-center"
                title="Editar dados do contrato"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>
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
      accessor: (r) => {
        const insts = getLoanInstallments(r);
        const paidInsts = insts.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada');
        const paidAmort = Math.round(paidInsts.reduce((acc, i) => acc + (i.principal || 0), 0) * 100) / 100;
        const paidInterest = Math.round(paidInsts.reduce((acc, i) => acc + (i.interest || 0), 0) * 100) / 100;
        const dynamicOutstanding = Math.round(Math.max(0, (r.contractedAmount || 0) - paidAmort) * 100) / 100;

        return (
          <div>
            <span className="font-black text-red-600 dark:text-red-400">{formatCurrency(dynamicOutstanding)}</span>
            <p className="text-[10px] text-slate-400">Juros pagos: {formatCurrency(paidInterest)}</p>
          </div>
        );
      },
      sortable: true,
    },
    {
      header: 'Progresso / Parcelas',
      accessor: (r) => {
        const insts = getLoanInstallments(r);
        const paidCount = insts.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada').length;
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
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setDetailLoan(r);
                setActiveTab('resumo');
              }}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm"
              title="Ver Demonstrativo das Parcelas"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Demonstrativo</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Rejection / Error Notice Banner */}
      {paymentError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-start gap-3 shadow-md animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm text-red-800 dark:text-red-200 mb-0.5">Pagamento Rejeitado</p>
            <p className="leading-relaxed">{paymentError}</p>
          </div>
          <button
            onClick={() => setPaymentError(null)}
            className="text-red-400 hover:text-red-700 dark:hover:text-red-200 font-black text-base px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Notice Banner */}
      {paymentSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-3 shadow-md animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm text-emerald-800 dark:text-emerald-200">Operação Realizada com Sucesso</p>
            <p>{paymentSuccess}</p>
          </div>
          <button
            onClick={() => setPaymentSuccess(null)}
            className="text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200 font-black text-base px-2"
          >
            ×
          </button>
        </div>
      )}

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
                    <button
                      onClick={() => openEditModal(detailLoan)}
                      className="p-1 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
                      title="Editar Contrato"
                    >
                      <Edit3 className="w-4 h-4 text-amber-400" />
                    </button>
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailLoan(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Operações e Inserções do Demonstrativo */}
            {detailLoan.status === 'Ativo' && (
              <div className="px-5 py-3 bg-slate-800 border-b border-slate-700/80 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">Ações do Empréstimo:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const nextInst = activeLoanInstallments.find((i) => i.status === 'Pendente' || i.status === 'Atrasada');
                    return (
                      <>
                        {nextInst && (
                          <button
                            onClick={() => handlePayInstallment(detailLoan, nextInst.number)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pagar nº {nextInst.number} ({formatCurrency(nextInst.amount)})
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setExtraAmortModalLoan(detailLoan);
                            setExtraAmortAmount(1000);
                            setExtraAmortBankId(detailLoan.bankId);
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
                        >
                          <TrendingDown className="w-3.5 h-3.5" />
                          Amortizar Extra
                        </button>
                        <button
                          onClick={() => {
                            setEarlyPayoffLoanTarget(detailLoan);
                            const paidCount = activeLoanInstallments.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada').length;
                            setPayoffUntilInstallment(paidCount);
                            setPayoffBankId(detailLoan.bankId);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Quitar Empréstimo
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

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
                2. Tabela Analítica de Parcelas ({activeLoanInstallments.length})
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

                    <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl col-span-3">
                      {(() => {
                        const paidCount = activeLoanInstallments.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada').length;
                        const details = calculateEarlyPayoffDetails({ ...detailLoan, installments: activeLoanInstallments }, paidCount);
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
                        <span className="text-slate-400 block">Data do Empréstimo</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {detailLoan.contractDate ? formatDate(detailLoan.contractDate) : 'Não informada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Vencimento 1ª Parcela</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {detailLoan.firstDueDate
                            ? formatDate(detailLoan.firstDueDate)
                            : (activeLoanInstallments[0]?.dueDate ? formatDate(activeLoanInstallments[0].dueDate) : 'Não informada')}
                        </span>
                      </div>
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
                        activeLoanInstallments.filter((i) => statusFilter === 'Todos' || i.status === statusFilter)
                          .length
                      }{' '}
                      de {activeLoanInstallments.length} parcelas
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
                          <th className="p-3 text-right">Total Pago</th>
                          <th className="p-3 text-right">Saldo Devedor</th>
                          <th className="p-3 text-center">Situação</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {activeLoanInstallments
                          .filter((i) => statusFilter === 'Todos' || i.status === statusFilter)
                          .map((inst) => (
                            <tr key={inst.number} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{inst.number}</td>
                              <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{formatDate(inst.dueDate)}</td>
                              <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                                {formatCurrency(inst.amount)}
                              </td>
                              <td className="p-3 text-right text-blue-600 font-semibold">{formatCurrency(inst.principal)}</td>
                              <td className="p-3 text-right text-amber-600">{formatCurrency(inst.interest)}</td>
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
                          <LineChart data={activeLoanInstallments.slice(0, 48)}>
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
                          <BarChart data={activeLoanInstallments.slice(0, 24)}>
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Origem do Pagamento (Conta Bancária ou Cartão)
                </label>
                <select
                  value={instBankId}
                  onChange={(e) => {
                    setInstBankId(e.target.value);
                    setPaymentError(null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                >
                  <optgroup label="🏦 Contas Bancárias (Saldo Disponível)">
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — Saldo: {formatCurrency(b.currentBalance)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="💳 Cartões de Crédito (Limite Disponível)">
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — Limite Disp: {formatCurrency(c.limitAvailable)}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {(() => {
                  const selBank = banks.find((b) => b.id === instBankId);
                  const selCard = cards.find((c) => c.id === instBankId);
                  const isPaidStatus = instNewStatus === 'Paga' || instNewStatus === 'Antecipada' || instNewStatus === 'Quitada';
                  if (!isPaidStatus) return null;

                  if (selBank) {
                    const isInsufficient = selBank.currentBalance < instPaidAmountVal;
                    return (
                      <p
                        className={`text-[11px] mt-1.5 font-semibold flex items-center gap-1 ${
                          isInsufficient ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        🏦 Saldo em {selBank.name}: {formatCurrency(selBank.currentBalance)}
                        {isInsufficient && ' ⚠️ (Saldo insuficiente! O pagamento será rejeitado)'}
                      </p>
                    );
                  }
                  if (selCard) {
                    const isInsufficient = selCard.limitAvailable < instPaidAmountVal;
                    return (
                      <p
                        className={`text-[11px] mt-1.5 font-semibold flex items-center gap-1 ${
                          isInsufficient ? 'text-red-600 dark:text-red-400 font-bold' : 'text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        💳 Limite Disponível no Cartão {selCard.name}: {formatCurrency(selCard.limitAvailable)}
                        {isInsufficient && ' ⚠️ (Limite insuficiente! O pagamento será rejeitado)'}
                      </p>
                    );
                  }
                  return null;
                })()}
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
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Forma de Pagamento (Conta Bancária ou Cartão)
                    </label>
                    <select
                      value={payoffBankId}
                      onChange={(e) => {
                        setPayoffBankId(e.target.value);
                        setPaymentError(null);
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                    >
                      <optgroup label="🏦 Contas Bancárias (Saldo Disponível)">
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} — Saldo: {formatCurrency(b.currentBalance)}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="💳 Cartões de Crédito (Limite Disponível)">
                        {cards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} — Limite Disp: {formatCurrency(c.limitAvailable)}
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    {(() => {
                      const selBank = banks.find((b) => b.id === payoffBankId);
                      const selCard = cards.find((c) => c.id === payoffBankId);
                      const requiredVal = details.payoffAmountDiscounted;

                      if (selBank) {
                        const isInsufficient = selBank.currentBalance < requiredVal;
                        return (
                          <p
                            className={`text-[11px] mt-1.5 font-semibold flex items-center gap-1 ${
                              isInsufficient ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            🏦 Saldo em {selBank.name}: {formatCurrency(selBank.currentBalance)}
                            {isInsufficient && ' ⚠️ (Saldo insuficiente: a quitação será rejeitada!)'}
                          </p>
                        );
                      }
                      if (selCard) {
                        const isInsufficient = selCard.limitAvailable < requiredVal;
                        return (
                          <p
                            className={`text-[11px] mt-1.5 font-semibold flex items-center gap-1 ${
                              isInsufficient ? 'text-red-600 dark:text-red-400 font-bold' : 'text-purple-600 dark:text-purple-400'
                            }`}
                          >
                            💳 Limite Disponível no Cartão {selCard.name}: {formatCurrency(selCard.limitAvailable)}
                            {isInsufficient && ' ⚠️ (Limite insuficiente: a quitação será rejeitada!)'}
                          </p>
                        );
                      }
                      return null;
                    })()}
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
                        setPaymentError(null);
                        setPaymentSuccess(null);
                        const res = earlyPayoffLoan(earlyPayoffLoanTarget.id, payoffUntilInstallment, payoffBankId);
                        if (!res.success) {
                          setPaymentError(res.error || 'Quitação rejeitada.');
                          return;
                        }
                        setPaymentSuccess('Quitação antecipada efetuada com sucesso! Saldo/limite atualizado.');
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

              {/* Loan Dates */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Data do Empréstimo
                  </label>
                  <input
                    type="date"
                    required
                    value={contractDate}
                    onChange={(e) => handleContractDateChange(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Vencimento 1ª Parcela
                  </label>
                  <input
                    type="date"
                    required
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
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

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Encargos Adicionais (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={feesAmount || ''}
                  onChange={(e) => setFeesAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  placeholder="0.00"
                />
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

              {/* Parcela Média Estimada Card */}
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-purple-900 dark:text-purple-200">Parcela Média Estimada</span>
                  <span className="text-[11px] text-purple-700 dark:text-purple-300">
                    {amortizationSystem === 'SAC' && calculatedSchedule.length > 0
                      ? `1ª: ${formatCurrency(calculatedSchedule[0]?.amount)} → Última: ${formatCurrency(calculatedSchedule[calculatedSchedule.length - 1]?.amount)}`
                      : amortizationSystem === 'PRICE'
                      ? 'Valor fixo mensal das parcelas'
                      : 'Média estimada das parcelas'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-purple-700 dark:text-purple-300">
                    {formatCurrency(averageInstallmentAmount)}
                  </span>
                  <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                    / mês ({installmentsTotal || 1}x)
                  </span>
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

      {/* Extra Amortization Modal */}
      {extraAmortModalLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setExtraAmortModalLoan(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Realizar Amortização Extra</h3>
                <p className="text-xs text-slate-500">
                  {extraAmortModalLoan.customType || extraAmortModalLoan.type} • Saldo Atual: {formatCurrency(extraAmortModalLoan.outstandingBalance)}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data do Aporte</label>
                  <input
                    type="date"
                    value={extraAmortDate}
                    onChange={(e) => setExtraAmortDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor da Amortização (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    value={extraAmortAmount}
                    onChange={(e) => setExtraAmortAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Objetivo da Amortização</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExtraAmortOption('prazo')}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      extraAmortOption === 'prazo'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-200 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <p className="text-xs">Reduzir Prazo</p>
                    <p className="text-[10px] font-normal text-slate-500 mt-0.5">Mantém o valor das parcelas e elimina meses finais</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtraAmortOption('parcela')}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      extraAmortOption === 'parcela'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-200 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <p className="text-xs">Reduzir Parcela</p>
                    <p className="text-[10px] font-normal text-slate-500 mt-0.5">Mantém o prazo total e reduz o valor mensal</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Forma de Pagamento (Conta Bancária ou Cartão)
                </label>
                <select
                  value={extraAmortBankId}
                  onChange={(e) => {
                    setExtraAmortBankId(e.target.value);
                    setPaymentError(null);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                >
                  <optgroup label="🏦 Contas Bancárias (Saldo Disponível)">
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — Saldo: {formatCurrency(b.currentBalance)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="💳 Cartões de Crédito (Limite Disponível)">
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — Limite Disp: {formatCurrency(c.limitAvailable)}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {(() => {
                  const selBank = banks.find((b) => b.id === extraAmortBankId);
                  const selCard = cards.find((c) => c.id === extraAmortBankId);

                  if (selBank) {
                    const isInsufficient = selBank.currentBalance < extraAmortAmount;
                    return (
                      <p
                        className={`text-[11px] mt-1.5 font-semibold flex items-center gap-1 ${
                          isInsufficient ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        🏦 Saldo em {selBank.name}: {formatCurrency(selBank.currentBalance)}
                        {isInsufficient && ' ⚠️ (Saldo insuficiente: a amortização será rejeitada!)'}
                      </p>
                    );
                  }
                  if (selCard) {
                    const isInsufficient = selCard.limitAvailable < extraAmortAmount;
                    return (
                      <p
                        className={`text-[11px] mt-1.5 font-semibold flex items-center gap-1 ${
                          isInsufficient ? 'text-red-600 dark:text-red-400 font-bold' : 'text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        💳 Limite Disponível no Cartão {selCard.name}: {formatCurrency(selCard.limitAvailable)}
                        {isInsufficient && ' ⚠️ (Limite insuficiente: a amortização será rejeitada!)'}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Economia Obtida Preview Report */}
              {(() => {
                const report = calculateExtraAmortizationDetails(
                  extraAmortModalLoan,
                  extraAmortAmount,
                  extraAmortDate || getCurrentDateFormatted(),
                  extraAmortOption
                );

                return (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl space-y-2">
                    <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Relatório de Economia Obtida
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-400 block text-[10px]">Juros Originais Restantes</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(report.originalFutureInterest)}</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-400 block text-[10px]">Novos Juros Restantes</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(report.newFutureInterest)}</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-400 block text-[10px]">Economia Total de Juros</span>
                        <span className="font-black text-emerald-600 text-sm">+{formatCurrency(report.interestSaved)} ({report.savingsPercent}%)</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-400 block text-[10px]">Nova Data/Prazo de Quitação</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{report.newPayoffDate}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setExtraAmortModalLoan(null)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setPaymentError(null);
                    setPaymentSuccess(null);
                    const res = applyExtraAmortizationLoan(
                      extraAmortModalLoan.id,
                      extraAmortAmount,
                      extraAmortDate,
                      extraAmortOption,
                      extraAmortBankId
                    );
                    if (!res.success) {
                      setPaymentError(res.error || 'Amortização extra rejeitada.');
                      return;
                    }
                    setPaymentSuccess('Amortização extra realizada com sucesso! Saldo/limite atualizado.');
                    setExtraAmortModalLoan(null);
                    if (detailLoan?.id === extraAmortModalLoan.id) {
                      const refreshed = useFinancialStore.getState().loans.find((l) => l.id === extraAmortModalLoan.id);
                      if (refreshed) setDetailLoan(refreshed);
                    }
                  }}
                  className="px-5 py-2 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md"
                >
                  Confirmar Amortização
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Modal */}
      {deleteItemTarget && (
        <SmartDeleteModal
          isOpen={!!deleteItemTarget}
          onClose={() => setDeleteItemTarget(null)}
          onConfirm={() => {
            deleteLoanSmart(deleteItemTarget.id);
            if (detailLoan?.id === deleteItemTarget.id) setDetailLoan(null);
            setDeleteItemTarget(null);
          }}
          title={`Excluir Empréstimo (${deleteItemTarget.customType || deleteItemTarget.type})`}
          description={
            deleteItemTarget.installmentsPaid > 0
              ? 'Atenção: Este empréstimo possui parcelas pagas! Ao confirmar a exclusão, o contrato e seu histórico serão removidos do sistema e os relatórios financeiros recalculados.'
              : 'Deseja excluir este empréstimo e seu contrato definitivamente?'
          }
        />
      )}
    </div>
  );
};
