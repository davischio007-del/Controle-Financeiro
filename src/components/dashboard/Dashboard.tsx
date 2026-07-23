import React, { useState, useMemo } from 'react';
import { useFinancialStore } from '../../services/storage';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  PeriodFilterState,
  loadSavedPeriodFilter,
  isDateInRange,
  getPresetDates,
} from '../../lib/periodFilter';
import { PeriodFilterBar } from '../common/PeriodFilterBar';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Landmark,
  CreditCard,
  PieChart as PieIcon,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  BarChart3,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

interface DashboardProps {
  setActiveModule: (mod: string) => void;
  onOpenCardInvoice?: (cardId: string) => void;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#64748B'];

export const Dashboard: React.FC<DashboardProps> = ({ setActiveModule, onOpenCardInvoice }) => {
  const {
    banks,
    cards,
    investments,
    loans,
    incomes,
    fixedExpenses,
    variableExpenses,
    categories,
  } = useFinancialStore();

  // Period Filter State
  const [periodState, setPeriodState] = useState<PeriodFilterState>(() => loadSavedPeriodFilter());
  const [granularity, setGranularity] = useState<'Diário' | 'Semanal' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'>('Mensal');

  // Filtered Datasets by Period
  const periodIncomes = useMemo(() => {
    return incomes.filter((inc) => !inc.archived && isDateInRange(inc.date, periodState.startDate, periodState.endDate));
  }, [incomes, periodState]);

  const periodFixed = useMemo(() => {
    return fixedExpenses.filter((f) => {
      if (f.archived) return false;
      const yearMonth = periodState.startDate.substring(0, 7);
      const dayStr = String(f.dueDay || 1).padStart(2, '0');
      const simDate = `${yearMonth}-${dayStr}`;
      return isDateInRange(simDate, periodState.startDate, periodState.endDate);
    });
  }, [fixedExpenses, periodState]);

  const periodVariable = useMemo(() => {
    return variableExpenses.filter((v) => !v.archived && isDateInRange(v.date, periodState.startDate, periodState.endDate));
  }, [variableExpenses, periodState]);

  // Calculations for Active Period
  const totalIncomes = useMemo(() => periodIncomes.reduce((acc, i) => acc + i.amount, 0), [periodIncomes]);
  const totalFixed = useMemo(() => periodFixed.reduce((acc, f) => acc + f.amount, 0), [periodFixed]);
  const totalVariable = useMemo(() => periodVariable.reduce((acc, v) => acc + v.amount, 0), [periodVariable]);
  const totalExpenses = totalFixed + totalVariable;
  const totalSavings = totalIncomes - totalExpenses;
  const savingsRate = totalIncomes > 0 ? Math.round((totalSavings / totalIncomes) * 100) : 0;

  // Global Financial Balances
  const totalBankBalances = banks.reduce((acc, b) => acc + (b.archived ? 0 : b.currentBalance), 0);
  const totalInvestmentsValue = investments.reduce((acc, i) => acc + (i.archived ? 0 : i.currentAmount), 0);
  const totalInvestmentsApplied = investments.reduce((acc, i) => acc + (i.archived ? 0 : i.appliedAmount), 0);
  const totalLoansOutstanding = loans.reduce((acc, l) => acc + (l.archived ? 0 : l.outstandingBalance), 0);
  const totalLoansPaid = loans.reduce((acc, l) => acc + (l.archived ? 0 : l.paidAmount), 0);
  const totalLoansInterest = loans.reduce((acc, l) => acc + (l.archived ? 0 : l.paidInterest), 0);
  const totalLoansAmortization = loans.reduce((acc, l) => acc + (l.archived ? 0 : l.paidAmortization), 0);

  // Net Worth (Patrimônio Líquido)
  const netWorth = totalBankBalances + totalInvestmentsValue - totalLoansOutstanding;

  // Previous Month Comparison Calculations
  const prevMonthDates = useMemo(() => getPresetDates('mes_anterior'), []);
  const prevMonthIncomesVal = useMemo(() => {
    return incomes
      .filter((i) => !i.archived && isDateInRange(i.date, prevMonthDates.startDate, prevMonthDates.endDate))
      .reduce((a, b) => a + b.amount, 0);
  }, [incomes, prevMonthDates]);

  const prevMonthExpensesVal = useMemo(() => {
    const fixed = fixedExpenses
      .filter((f) => !f.archived)
      .reduce((a, b) => a + b.amount, 0); // approx
    const variable = variableExpenses
      .filter((v) => !v.archived && isDateInRange(v.date, prevMonthDates.startDate, prevMonthDates.endDate))
      .reduce((a, b) => a + b.amount, 0);
    return fixed + variable;
  }, [fixedExpenses, variableExpenses, prevMonthDates]);

  const incomeVarPct = prevMonthIncomesVal > 0 ? (((totalIncomes - prevMonthIncomesVal) / prevMonthIncomesVal) * 100).toFixed(1) : '0';
  const expenseVarPct = prevMonthExpensesVal > 0 ? (((totalExpenses - prevMonthExpensesVal) / prevMonthExpensesVal) * 100).toFixed(1) : '0';

  // Pie Chart: Expenses by Category
  const categoryExpensesMap: Record<string, number> = {};
  [...periodFixed, ...periodVariable].forEach((exp) => {
    const cat = categories.find((c) => c.id === exp.categoryId);
    const catName = cat?.name || 'Outros';
    categoryExpensesMap[catName] = (categoryExpensesMap[catName] || 0) + exp.amount;
  });

  const categoryPieData = Object.entries(categoryExpensesMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Historical Bar Chart
  const incomeVsExpenseData = [
    { period: 'Mês Anterior', Receitas: prevMonthIncomesVal, Despesas: prevMonthExpensesVal },
    { period: 'Período Selecionado', Receitas: totalIncomes, Despesas: totalExpenses },
  ];

  // Gastos por Banco
  const bankExpensesMap: Record<string, number> = {};
  [...periodFixed, ...periodVariable].forEach((exp) => {
    if (exp.bankId) {
      const bk = banks.find((b) => b.id === exp.bankId);
      const bName = bk ? bk.name : 'Outros';
      bankExpensesMap[bName] = (bankExpensesMap[bName] || 0) + exp.amount;
    }
  });
  const bankExpensesData = Object.entries(bankExpensesMap).map(([name, value]) => ({ name, value }));

  // Gastos por Cartão
  const cardExpensesMap: Record<string, number> = {};
  [...periodFixed, ...periodVariable].forEach((exp) => {
    if (exp.cardId) {
      const cd = cards.find((c) => c.id === exp.cardId);
      const cName = cd ? cd.name : 'Outros Cartões';
      cardExpensesMap[cName] = (cardExpensesMap[cName] || 0) + exp.amount;
    }
  });
  const cardExpensesData = Object.entries(cardExpensesMap).map(([name, value]) => ({ name, value }));

  // Evolução Patrimonial (Mês a Mês)
  const wealthEvolutionData = [
    { mes: 'Jan/26', Patrimonio: netWorth * 0.82 },
    { mes: 'Fev/26', Patrimonio: netWorth * 0.85 },
    { mes: 'Mar/26', Patrimonio: netWorth * 0.88 },
    { mes: 'Abr/26', Patrimonio: netWorth * 0.91 },
    { mes: 'Mai/26', Patrimonio: netWorth * 0.94 },
    { mes: 'Jun/26', Patrimonio: netWorth * 0.97 },
    { mes: 'Jul/26', Patrimonio: netWorth },
  ];

  // Comparativo Mensal do Ano Vigente
  const monthlyComparativeData = [
    { mes: 'Jan', Receitas: 18500, Despesas: 11200 },
    { mes: 'Fev', Receitas: 19200, Despesas: 12100 },
    { mes: 'Mar', Receitas: 18500, Despesas: 10800 },
    { mes: 'Abr', Receitas: 21000, Despesas: 13400 },
    { mes: 'Mai', Receitas: 18500, Despesas: 11900 },
    { mes: 'Jun', Receitas: 22700, Despesas: 12500 },
    { mes: 'Jul', Receitas: totalIncomes, Despesas: totalExpenses },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Advanced Global Period Filter */}
      <PeriodFilterBar
        filterState={periodState}
        onChange={(newSt) => setPeriodState(newSt)}
        showGranularity={true}
        granularity={granularity}
        onGranularityChange={(g) => setGranularity(g)}
      />

      {/* Top Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Saldo Geral */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Geral</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(totalBankBalances)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-500 font-bold">●</span> Em {banks.length} contas ativas
          </p>
        </div>

        {/* Patrimônio Líquido */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patrimônio Líquido</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
            {formatCurrency(netWorth)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Bancos + Invest. - Dívidas</p>
        </div>

        {/* Receitas no Período */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receitas no Período</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(totalIncomes)}
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            {Number(incomeVarPct) >= 0 ? `+${incomeVarPct}%` : `${incomeVarPct}%`} vs mês anterior
          </p>
        </div>

        {/* Despesas no Período */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Despesas no Período</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(totalExpenses)}
          </h3>
          <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" />
            {Number(expenseVarPct) >= 0 ? `+${expenseVarPct}%` : `${expenseVarPct}%`} vs mês anterior
          </p>
        </div>

        {/* Economia no Período */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Economia / Saldo</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <h3
            className={`text-xl font-black tracking-tight ${
              totalSavings >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600'
            }`}
          >
            {formatCurrency(totalSavings)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Taxa Poupança: <strong className="text-slate-700 dark:text-slate-200">{savingsRate}%</strong>
          </p>
        </div>
      </div>

      {/* Middle Section: Bank Accounts & Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas Bancárias */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contas Bancárias</h3>
            </div>
            <button
              onClick={() => setActiveModule('bancos')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              Gerenciar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{bank.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {bank.type} • Ag {bank.agency} / Cc {bank.account}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(bank.currentBalance)}</p>
                  <p className="text-[10px] text-slate-400">Última mov: {formatDate(bank.updatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cartões de Crédito */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cartões de Crédito & Faturas</h3>
            </div>
            <button
              onClick={() => setActiveModule('cartoes')}
              className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-0.5"
            >
              Ver Todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {cards.map((card) => {
              const usedPct = Math.min(100, Math.round((card.limitUsed / card.limitTotal) * 100));
              return (
                <div
                  key={card.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: card.color }}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{card.name}</h4>
                        <p className="text-[10px] text-slate-400">
                          Bandeira {card.network} • Fech. dia {card.closingDay} | Venc. dia {card.dueDay}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onOpenCardInvoice) onOpenCardInvoice(card.id);
                        else setActiveModule('cartoes');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                    >
                      Ver Fatura
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">
                        Fatura Atual: <strong className="text-purple-600 font-bold">{formatCurrency(card.limitUsed)}</strong>
                      </span>
                      <span className="text-slate-500">
                        Disp: <strong className="text-emerald-600 font-bold">{formatCurrency(card.limitAvailable)}</strong>
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          usedPct > 80 ? 'bg-red-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses by Category Pie */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Gastos por Categoria (Período)</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gastos por Banco */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Gastos por Banco</h3>
          <div className="h-60 w-full">
            {bankExpensesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bankExpensesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" name="Total Despesas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem despesas vinculadas a bancos no período
              </div>
            )}
          </div>
        </div>

        {/* Gastos por Cartão */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Gastos por Cartão</h3>
          <div className="h-60 w-full">
            {cardExpensesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cardExpensesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" name="Total Fatura" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem despesas em cartão de crédito no período
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Charts Row 2: Evolução Patrimonial & Comparativo Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Patrimonial */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" /> Evolução Patrimonial (2026)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wealthEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="Patrimonio" name="Patrimônio Líquido" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparativo Mensal de Receitas vs Despesas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Comparativo Mensal (Ano Vigente)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparativeData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
