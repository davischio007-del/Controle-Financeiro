import React, { useState, useMemo } from 'react';
import { useFinancialStore } from '../../services/storage';
import { formatCurrency, formatDate, exportToPDF, exportToExcel } from '../../lib/utils';
import {
  PeriodFilterState,
  loadSavedPeriodFilter,
  isDateInRange,
} from '../../lib/periodFilter';
import { PeriodFilterBar } from '../common/PeriodFilterBar';
import {
  FileText,
  Download,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Building2,
  CreditCard,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Eye,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Maximize2,
  X,
  FileSpreadsheet,
  Percent,
  Wallet,
  Activity,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  Area,
} from 'recharts';

const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#6366F1', // Indigo
];

export const RelatoriosModule: React.FC = () => {
  const {
    incomes,
    fixedExpenses,
    variableExpenses,
    banks,
    cards,
    categories,
    subcategories,
    loans,
    investments,
    currentUser,
  } = useFinancialStore();

  // Period Filter State
  const [periodState, setPeriodState] = useState<PeriodFilterState>(() => loadSavedPeriodFilter());

  // Report Type & Granularity
  const [reportTab, setReportTab] = useState<
    'dre' | 'extrato' | 'categorias' | 'bancos' | 'fluxo' | 'emprestimos' | 'investimentos'
  >('dre');
  const [granularity, setGranularity] = useState<'Diário' | 'Semanal' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'>('Mensal');

  // Grouping State
  const [groupBy, setGroupBy] = useState<
    'none' | 'mes' | 'ano' | 'banco' | 'cartao' | 'categoria' | 'subcategoria' | 'pagamento' | 'situacao' | 'usuario'
  >('none');

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Column Sort
  const [sortField, setSortField] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Print Preview Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Emission Timestamp & Document Reference
  const emissionTimestamp = useMemo(() => new Date().toLocaleString('pt-BR'), []);
  const docRefNumber = useMemo(() => `REL-${Math.floor(100000 + Math.random() * 900000)}`, []);

  // Filtered Raw Datasets by Period & Non-Archived
  const filteredIncomes = useMemo(() => {
    return incomes.filter((inc) => !inc.archived && isDateInRange(inc.date, periodState.startDate, periodState.endDate));
  }, [incomes, periodState]);

  const filteredFixed = useMemo(() => {
    return fixedExpenses.filter((f) => {
      if (f.archived) return false;
      const yearMonth = periodState.startDate.substring(0, 7);
      const dayStr = String(f.dueDay || 1).padStart(2, '0');
      const simDate = `${yearMonth}-${dayStr}`;
      return isDateInRange(simDate, periodState.startDate, periodState.endDate);
    });
  }, [fixedExpenses, periodState]);

  const filteredVariable = useMemo(() => {
    return variableExpenses.filter((v) => !v.archived && isDateInRange(v.date, periodState.startDate, periodState.endDate));
  }, [variableExpenses, periodState]);

  // Combined Consolidated Transactions Array
  const consolidatedTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      description: string;
      type: 'Receita' | 'Despesa Fixa' | 'Despesa Variável';
      nature: 'Entrada' | 'Saída';
      amount: number;
      categoryId: string;
      categoryName: string;
      subcategoryId?: string;
      subcategoryName?: string;
      bankId?: string;
      bankName?: string;
      cardId?: string;
      cardName?: string;
      paymentMethod?: string;
      status: string;
      createdBy: string;
    }> = [];

    // Map Incomes
    filteredIncomes.forEach((inc) => {
      const cat = categories.find((c) => c.id === inc.categoryId);
      const sub = subcategories.find((s) => s.id === inc.subcategoryId);
      const bk = banks.find((b) => b.id === inc.bankId);
      list.push({
        id: inc.id,
        date: inc.date,
        description: inc.description,
        type: 'Receita',
        nature: 'Entrada',
        amount: inc.amount,
        categoryId: inc.categoryId,
        categoryName: cat?.name || 'Receitas Operacionais',
        subcategoryId: inc.subcategoryId,
        subcategoryName: sub?.name || '-',
        bankId: inc.bankId,
        bankName: bk?.name || '-',
        paymentMethod: 'Pix / Transferência',
        status: 'Pago',
        createdBy: inc.createdBy || 'Sistema',
      });
    });

    // Map Fixed Expenses
    filteredFixed.forEach((f) => {
      const cat = categories.find((c) => c.id === f.categoryId);
      const sub = subcategories.find((s) => s.id === f.subcategoryId);
      const bk = banks.find((b) => b.id === f.bankId);
      const cd = cards.find((c) => c.id === f.cardId);
      const yearMonth = periodState.startDate.substring(0, 7);
      const dayStr = String(f.dueDay || 1).padStart(2, '0');
      list.push({
        id: f.id,
        date: f.lastPaidDate || `${yearMonth}-${dayStr}`,
        description: f.description,
        type: 'Despesa Fixa',
        nature: 'Saída',
        amount: f.amount,
        categoryId: f.categoryId,
        categoryName: cat?.name || 'Despesas Fixas',
        subcategoryId: f.subcategoryId,
        subcategoryName: sub?.name || '-',
        bankId: f.bankId,
        bankName: bk?.name || '-',
        cardId: f.cardId,
        cardName: cd?.name || '-',
        paymentMethod: f.paymentMethod || 'Débito / Pix',
        status: f.status || 'Pendente',
        createdBy: 'Sistema',
      });
    });

    // Map Variable Expenses
    filteredVariable.forEach((v) => {
      const cat = categories.find((c) => c.id === v.categoryId);
      const sub = subcategories.find((s) => s.id === v.subcategoryId);
      const bk = banks.find((b) => b.id === v.bankId);
      const cd = cards.find((c) => c.id === v.cardId);
      list.push({
        id: v.id,
        date: v.date,
        description: v.description,
        type: 'Despesa Variável',
        nature: 'Saída',
        amount: v.amount,
        categoryId: v.categoryId,
        categoryName: cat?.name || 'Despesas Variáveis',
        subcategoryId: v.subcategoryId,
        subcategoryName: sub?.name || '-',
        bankId: v.bankId,
        bankName: bk?.name || '-',
        cardId: v.cardId,
        cardName: cd?.name || '-',
        paymentMethod: v.paymentMethod || 'Cartão / Pix',
        status: v.status || 'Pago',
        createdBy: 'Sistema',
      });
    });

    // Filter by search query
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? list.filter(
          (item) =>
            item.description.toLowerCase().includes(query) ||
            item.categoryName.toLowerCase().includes(query) ||
            item.subcategoryName?.toLowerCase().includes(query) ||
            item.bankName?.toLowerCase().includes(query) ||
            item.cardName?.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query)
        )
      : list;

    // Sort
    return filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a] || '';
      let valB: any = b[sortField as keyof typeof b] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [
    filteredIncomes,
    filteredFixed,
    filteredVariable,
    categories,
    subcategories,
    banks,
    cards,
    searchQuery,
    sortField,
    sortDir,
    periodState,
  ]);

  // Key Financial Metric Totals
  const totalIncomesVal = useMemo(() => filteredIncomes.reduce((acc, i) => acc + i.amount, 0), [filteredIncomes]);
  const totalFixedVal = useMemo(() => filteredFixed.reduce((acc, f) => acc + f.amount, 0), [filteredFixed]);
  const totalVarVal = useMemo(() => filteredVariable.reduce((acc, v) => acc + v.amount, 0), [filteredVariable]);
  const totalExpensesVal = totalFixedVal + totalVarVal;
  const netResultVal = totalIncomesVal - totalExpensesVal;
  const netMarginPercent = totalIncomesVal > 0 ? (netResultVal / totalIncomesVal) * 100 : 0;

  // Pagination Logic
  const totalPages = Math.ceil(consolidatedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return consolidatedTransactions.slice(start, start + pageSize);
  }, [consolidatedTransactions, currentPage, pageSize]);

  // Grouped Data Calculation for Extrato Tab
  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null;

    const map: Record<
      string,
      { key: string; totalEntradas: number; totalSaidas: number; count: number; items: typeof consolidatedTransactions }
    > = {};

    consolidatedTransactions.forEach((t) => {
      let groupKey = 'Outros';

      if (groupBy === 'mes') {
        const parts = t.date.split('-');
        groupKey = parts.length >= 2 ? `${parts[1]}/${parts[0]}` : 'Sem Mês';
      } else if (groupBy === 'ano') {
        groupKey = t.date.substring(0, 4) || 'Sem Ano';
      } else if (groupBy === 'banco') {
        groupKey = t.bankName && t.bankName !== '-' ? t.bankName : 'Outras Fontes';
      } else if (groupBy === 'cartao') {
        groupKey = t.cardName && t.cardName !== '-' ? t.cardName : 'Débito / Pix / Dinheiro';
      } else if (groupBy === 'categoria') {
        groupKey = t.categoryName;
      } else if (groupBy === 'subcategoria') {
        groupKey = t.subcategoryName && t.subcategoryName !== '-' ? t.subcategoryName : 'Geral';
      } else if (groupBy === 'pagamento') {
        groupKey = t.paymentMethod || 'Outros';
      } else if (groupBy === 'situacao') {
        groupKey = t.status || 'Pendente';
      } else if (groupBy === 'usuario') {
        groupKey = t.createdBy || 'Sistema';
      }

      if (!map[groupKey]) {
        map[groupKey] = { key: groupKey, totalEntradas: 0, totalSaidas: 0, count: 0, items: [] };
      }

      if (t.nature === 'Entrada') {
        map[groupKey].totalEntradas += t.amount;
      } else {
        map[groupKey].totalSaidas += t.amount;
      }
      map[groupKey].count += 1;
      map[groupKey].items.push(t);
    });

    return Object.values(map).sort((a, b) => b.totalSaidas + b.totalEntradas - (a.totalSaidas + a.totalEntradas));
  }, [consolidatedTransactions, groupBy]);

  // Expense Categories Breakdown
  const expenseCategoriesData = useMemo(() => {
    const map: Record<string, number> = {};
    consolidatedTransactions.forEach((t) => {
      if (t.nature === 'Saída') {
        map[t.categoryName] = (map[t.categoryName] || 0) + t.amount;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [consolidatedTransactions]);

  // Income Sources Breakdown
  const incomeSourcesData = useMemo(() => {
    const map: Record<string, number> = {};
    consolidatedTransactions.forEach((t) => {
      if (t.nature === 'Entrada') {
        map[t.categoryName] = (map[t.categoryName] || 0) + t.amount;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [consolidatedTransactions]);

  // DRE Comparison Waterfall / Structure Chart
  const dreChartData = useMemo(() => {
    return [
      { name: 'Receita Bruta', valor: totalIncomesVal, fill: '#10B981' },
      { name: 'Custos Fixos', valor: totalFixedVal, fill: '#F59E0B' },
      { name: 'Despesas Var.', valor: totalVarVal, fill: '#EF4444' },
      { name: 'Lucro Líquido', valor: Math.max(0, netResultVal), fill: netResultVal >= 0 ? '#3B82F6' : '#DC2626' },
    ];
  }, [totalIncomesVal, totalFixedVal, totalVarVal, netResultVal]);

  // Cash Flow Evolution Chart Data
  const cashFlowChartData = useMemo(() => {
    const map: Record<string, { label: string; Receitas: number; Despesas: number; Saldo: number }> = {};

    consolidatedTransactions.forEach((t) => {
      let label = t.date;
      if (granularity === 'Mensal') {
        label = t.date.substring(0, 7);
      } else if (granularity === 'Anual') {
        label = t.date.substring(0, 4);
      } else if (granularity === 'Semanal') {
        label = `Sem. ${t.date}`;
      } else if (granularity === 'Trimestral') {
        const month = parseInt(t.date.substring(5, 7)) || 1;
        const q = Math.ceil(month / 3);
        label = `Q${q} ${t.date.substring(0, 4)}`;
      } else if (granularity === 'Semestral') {
        const month = parseInt(t.date.substring(5, 7)) || 1;
        const s = month <= 6 ? 1 : 2;
        label = `S${s} ${t.date.substring(0, 4)}`;
      }

      if (!map[label]) {
        map[label] = { label, Receitas: 0, Despesas: 0, Saldo: 0 };
      }

      if (t.nature === 'Entrada') {
        map[label].Receitas += t.amount;
      } else {
        map[label].Despesas += t.amount;
      }
      map[label].Saldo = map[label].Receitas - map[label].Despesas;
    });

    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  }, [consolidatedTransactions, granularity]);

  // Handlers for Exporting and Printing
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const headers = ['Data', 'Descrição', 'Tipo / Natureza', 'Categoria', 'Forma / Origem', 'Valor (R$)'];
    const rows = consolidatedTransactions.map((t) => [
      formatDate(t.date),
      t.description,
      `${t.type} (${t.nature})`,
      t.categoryName,
      t.bankName !== '-' ? t.bankName : t.cardName !== '-' ? t.cardName : t.paymentMethod,
      formatCurrency(t.amount),
    ]);

    exportToPDF(
      'RELATÓRIO FINANCEIRO EXECUTIVO CONSOLIDADO',
      headers,
      rows,
      `relatorio_financeiro_${periodState.startDate}_a_${periodState.endDate}`,
      {
        period: `${formatDate(periodState.startDate)} a ${formatDate(periodState.endDate)}`,
        emitDate: emissionTimestamp,
        user: currentUser?.name || currentUser?.email || 'Administrador',
        grandTotal: `Entradas: ${formatCurrency(totalIncomesVal)} | Saídas: ${formatCurrency(totalExpensesVal)} | Saldo: ${formatCurrency(netResultVal)}`,
      }
    );
  };

  const handleExportExcel = () => {
    const exportData = consolidatedTransactions.map((t) => ({
      Data: formatDate(t.date),
      Descrição: t.description,
      Tipo: t.type,
      Natureza: t.nature,
      Categoria: t.categoryName,
      Subcategoria: t.subcategoryName,
      Banco: t.bankName,
      Cartão: t.cardName,
      FormaPagamento: t.paymentMethod,
      Situação: t.status,
      Valor: t.amount,
      CriadoPor: t.createdBy,
    }));

    exportToExcel(
      exportData,
      `exportacao_financeira_${periodState.startDate}_a_${periodState.endDate}`
    );
  };

  // Quick Preset Handlers
  const applyPreset = (preset: 'dre' | 'extrato' | 'categorias' | 'bancos' | 'fluxo') => {
    setReportTab(preset);
    if (preset === 'extrato') {
      setGroupBy('mes');
    } else {
      setGroupBy('none');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER & EXECUTIVE TOOLBAR */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-md shadow-blue-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Central de Relatórios Executivos & DRE
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                PRO V2.5
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Demonstrativo de Resultado (DRE), análise gráfica, relatórios A4 em tempo real e exportação estruturada
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm"
          >
            <Eye className="w-4 h-4 text-blue-400 dark:text-blue-600" /> Visualizar A4
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Planilha Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
            title="Imprimir documento em papel A4"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* QUICK PRESETS & PERIOD FILTER */}
      <div className="no-print space-y-4">
        {/* Preset Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Atalhos Rápidos:
          </span>
          <button
            onClick={() => applyPreset('dre')}
            className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
              reportTab === 'dre'
                ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            DRE Gerencial
          </button>
          <button
            onClick={() => applyPreset('extrato')}
            className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
              reportTab === 'extrato' && groupBy === 'mes'
                ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            Extrato Mensal
          </button>
          <button
            onClick={() => applyPreset('categorias')}
            className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
              reportTab === 'categorias'
                ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            Curva por Categoria
          </button>
          <button
            onClick={() => applyPreset('bancos')}
            className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
              reportTab === 'bancos'
                ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            Bancos & Cartões
          </button>
          <button
            onClick={() => applyPreset('fluxo')}
            className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
              reportTab === 'fluxo'
                ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            Fluxo de Caixa
          </button>
        </div>

        {/* Global Period Filter Bar Component */}
        <PeriodFilterBar
          filterState={periodState}
          onChange={(newSt) => {
            setPeriodState(newSt);
            setCurrentPage(1);
          }}
          showGranularity={reportTab === 'fluxo'}
          granularity={granularity}
          onGranularityChange={(g) => setGranularity(g)}
        />
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Card 1: Receita Bruta */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Receita Operacional
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(totalIncomesVal)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {filteredIncomes.length}
              </span>{' '}
              lançamentos de entrada
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-b-2xl" />
        </div>

        {/* Card 2: Despesas Totais */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Despesas Totais
            </span>
            <div className="p-2 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(totalExpensesVal)}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Fixas: <strong>{formatCurrency(totalFixedVal)}</strong></span>
              <span>•</span>
              <span>Var: <strong>{formatCurrency(totalVarVal)}</strong></span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 rounded-b-2xl" />
        </div>

        {/* Card 3: Resultado Líquido */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Resultado do Exercício
            </span>
            <div
              className={`p-2 rounded-xl ${
                netResultVal >= 0
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
              }`}
            >
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p
              className={`text-xl font-black tracking-tight ${
                netResultVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(netResultVal)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Margem Operacional:{' '}
              <strong className={netMarginPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {netMarginPercent.toFixed(1)}%
              </strong>
            </p>
          </div>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl ${
              netResultVal >= 0 ? 'bg-blue-500' : 'bg-rose-600'
            }`}
          />
        </div>

        {/* Card 4: Indicador de Saúde Financial */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saúde do Período
            </span>
            <div className="p-2 bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  netMarginPercent > 20
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : netMarginPercent >= 0
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                }`}
              >
                {netMarginPercent > 20 ? 'Excelente' : netMarginPercent >= 0 ? 'Equilibrado' : 'Atenção / Déficit'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {consolidatedTransactions.length} movimentações no filtro
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 rounded-b-2xl" />
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
        {[
          { id: 'dre', label: '1. DRE Gerencial', icon: FileText },
          { id: 'extrato', label: '2. Extrato Consolidado', icon: Layers },
          { id: 'categorias', label: '3. Por Categoria', icon: PieIcon },
          { id: 'bancos', label: '4. Por Banco & Cartão', icon: Building2 },
          { id: 'fluxo', label: '5. Fluxo de Caixa', icon: BarChart3 },
          { id: 'emprestimos', label: '6. Empréstimos', icon: TrendingDown },
          { id: 'investimentos', label: '7. Patrimônio', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* GROUPING & SEARCH CONTROLS (Only when Tab 2 Extrato is selected) */}
      {reportTab === 'extrato' && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-700 dark:text-slate-200">Agrupar Por:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="none">Sem Agrupamento (Lista Detalhada)</option>
                <option value="mes">Mês do Lançamento</option>
                <option value="ano">Ano do Lançamento</option>
                <option value="banco">Banco / Conta Bancária</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="categoria">Categoria</option>
                <option value="subcategoria">Subcategoria</option>
                <option value="pagamento">Forma de Pagamento</option>
                <option value="situacao">Situação (Pago/Pendente)</option>
                <option value="usuario">Usuário Criador</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar descrição, categoria, banco..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE / DISPLAYED REPORT CONTAINER */}
      <div
        id="relatorio-imprimir"
        className="p-6 md:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6"
      >
        {/* OFFICIAL CORPORATE REPORT HEADER */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                SISTEMA DE GESTÃO FINANCEIRA
              </h1>
            </div>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {reportTab === 'dre'
                ? 'Demonstrativo do Resultado do Exercício (DRE Gerencial)'
                : reportTab === 'extrato'
                ? 'Extrato Analítico Consolidado de Lançamentos'
                : reportTab === 'categorias'
                ? 'Relatório por Categoria e Subcategoria de Gastos'
                : reportTab === 'bancos'
                ? 'Relatório por Banco e Cartão de Crédito'
                : reportTab === 'fluxo'
                ? 'Demonstrativo de Fluxo de Caixa Historico'
                : reportTab === 'emprestimos'
                ? 'Relatório de Empréstimos e Financiamentos'
                : 'Relatório de Carteira e Patrimônio de Investimentos'}
            </p>
          </div>

          <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400 space-y-0.5">
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Doc. Ref:</strong> {docRefNumber}
            </p>
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Período:</strong>{' '}
              {formatDate(periodState.startDate)} a {formatDate(periodState.endDate)}
            </p>
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Emissão:</strong> {emissionTimestamp}
            </p>
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Emitido Por:</strong>{' '}
              {currentUser?.name || currentUser?.email || 'Administrador'}
            </p>
          </div>
        </div>

        {/* TAB 1: DRE GERENCIAL */}
        {reportTab === 'dre' && (
          <div className="space-y-6">
            {/* DRE Structure Waterfall Chart */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 no-print">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Estrutura Comparativa da DRE
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dreChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} fontSize={10} />
                    <YAxis dataKey="name" type="category" width={110} fontSize={11} fontWeight="bold" />
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DRE Structured Statement Table */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden text-xs shadow-sm">
              <div className="p-3.5 bg-slate-900 text-white font-bold flex justify-between uppercase tracking-wider text-xs">
                <span>Rubrica / Indicador Financeiro</span>
                <div className="flex items-center gap-12">
                  <span>% da Receita</span>
                  <span>Valor Total (R$)</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* 1. Receita Operacional Bruta */}
                <div className="p-3.5 flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20">
                  <span className="text-sm flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" /> 1. (+) RECEITA OPERACIONAL BRUTA
                  </span>
                  <div className="flex items-center gap-12">
                    <span className="font-mono text-xs text-slate-500">100.0%</span>
                    <span className="text-base font-black">{formatCurrency(totalIncomesVal)}</span>
                  </div>
                </div>

                {/* 2. Custos & Despesas Fixas */}
                <div className="p-3.5 flex items-center justify-between text-slate-700 dark:text-slate-300 pl-8 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div>
                    <span className="font-semibold">2. (-) Custos & Despesas Fixas / Recorrentes</span>
                    <p className="text-[10px] text-slate-400">Contas fixas, aluguel, utilidades e assinaturas</p>
                  </div>
                  <div className="flex items-center gap-12 font-mono">
                    <span className="text-slate-500">
                      {totalIncomesVal > 0 ? ((totalFixedVal / totalIncomesVal) * 100).toFixed(1) : '0.0'}%
                    </span>
                    <span className="font-bold text-rose-600">({formatCurrency(totalFixedVal)})</span>
                  </div>
                </div>

                {/* 3. Despesas Variáveis */}
                <div className="p-3.5 flex items-center justify-between text-slate-700 dark:text-slate-300 pl-8 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div>
                    <span className="font-semibold">3. (-) Despesas Variáveis & Consumo Operacional</span>
                    <p className="text-[10px] text-slate-400">Gastos variáveis, cartão de crédito e imprevistos</p>
                  </div>
                  <div className="flex items-center gap-12 font-mono">
                    <span className="text-slate-500">
                      {totalIncomesVal > 0 ? ((totalVarVal / totalIncomesVal) * 100).toFixed(1) : '0.0'}%
                    </span>
                    <span className="font-bold text-rose-600">({formatCurrency(totalVarVal)})</span>
                  </div>
                </div>

                {/* 4. Total Despesas */}
                <div className="p-3.5 flex items-center justify-between font-bold text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/20">
                  <span className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4" /> 4. (=) TOTAL DE DESPESAS OPERACIONAIS
                  </span>
                  <div className="flex items-center gap-12 font-mono">
                    <span className="text-slate-500">
                      {totalIncomesVal > 0 ? ((totalExpensesVal / totalIncomesVal) * 100).toFixed(1) : '0.0'}%
                    </span>
                    <span className="text-sm font-black">({formatCurrency(totalExpensesVal)})</span>
                  </div>
                </div>

                {/* 5. Resultado Líquido */}
                <div
                  className={`p-4 flex items-center justify-between ${
                    netResultVal >= 0
                      ? 'bg-gradient-to-r from-emerald-100 to-teal-50 dark:from-emerald-950 dark:to-teal-950/50 text-emerald-900 dark:text-emerald-100'
                      : 'bg-gradient-to-r from-rose-100 to-pink-50 dark:from-rose-950 dark:to-pink-950/50 text-rose-900 dark:text-rose-100'
                  }`}
                >
                  <div>
                    <span className="text-sm font-black uppercase tracking-tight">
                      5. (=) RESULTADO LÍQUIDO DO EXERCÍCIO
                    </span>
                    <p className="text-[11px] font-medium opacity-80 mt-0.5">
                      Margem de Lucro Operacional:{' '}
                      <strong>{netMarginPercent.toFixed(1)}%</strong>
                    </p>
                  </div>
                  <span className="text-lg font-black font-mono tracking-tight">{formatCurrency(netResultVal)}</span>
                </div>
              </div>
            </div>

            {/* Side-by-side Cards: Top Despesas & Top Receitas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Top Expense Categories */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-rose-600">
                    <TrendingDown className="w-4 h-4" /> Maiores Ofensores (Despesas)
                  </span>
                  <span className="text-[10px] text-slate-400">Top 5 Categorias</span>
                </h4>

                <div className="space-y-2 text-xs">
                  {expenseCategoriesData.slice(0, 5).map((cat) => {
                    const pct = totalExpensesVal > 0 ? (cat.value / totalExpensesVal) * 100 : 0;
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-700 dark:text-slate-300">{cat.name}</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(cat.value)} <span className="text-[10px] text-slate-400">({pct.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Income Sources */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <TrendingUp className="w-4 h-4" /> Origens de Entrada (Receitas)
                  </span>
                  <span className="text-[10px] text-slate-400">Top 5 Fontes</span>
                </h4>

                <div className="space-y-2 text-xs">
                  {incomeSourcesData.slice(0, 5).map((src) => {
                    const pct = totalIncomesVal > 0 ? (src.value / totalIncomesVal) * 100 : 0;
                    return (
                      <div key={src.name} className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-700 dark:text-slate-300">{src.name}</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(src.value)} <span className="text-[10px] text-slate-400">({pct.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXTRATO CONSOLIDADO & AGRUPADO */}
        {reportTab === 'extrato' && (
          <div className="space-y-6">
            {groupBy !== 'none' && groupedData ? (
              /* Grouped View */
              <div className="space-y-6">
                {groupedData.map((group) => (
                  <div
                    key={group.key}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs shadow-sm"
                  >
                    <div className="p-3.5 bg-slate-100 dark:bg-slate-800 font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">{group.key}</span>
                        <span className="text-[10px] px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full font-semibold">
                          {group.count} lançamentos
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Entradas: <strong>{formatCurrency(group.totalEntradas)}</strong>
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          Saídas: <strong>{formatCurrency(group.totalSaidas)}</strong>
                        </span>
                        <span className="font-bold border-l pl-3 border-slate-300 dark:border-slate-700">
                          Saldo: {formatCurrency(group.totalEntradas - group.totalSaidas)}
                        </span>
                      </div>
                    </div>

                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5">Data</th>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Categoria</th>
                          <th className="p-2.5">Conta/Cartão</th>
                          <th className="p-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {group.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-2.5 font-mono text-slate-500">{formatDate(item.date)}</td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{item.description}</td>
                            <td className="p-2.5 text-slate-500">{item.categoryName}</td>
                            <td className="p-2.5 text-slate-500">
                              {item.bankName !== '-' ? item.bankName : item.cardName !== '-' ? item.cardName : item.paymentMethod}
                            </td>
                            <td
                              className={`p-2.5 text-right font-bold font-mono ${
                                item.nature === 'Entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {item.nature === 'Entrada' ? '+' : '-'}{formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              /* Flat Detailed Table */
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto text-xs shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th
                        className="p-3 cursor-pointer hover:bg-slate-800 transition-colors"
                        onClick={() => {
                          setSortField('date');
                          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Data {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th
                        className="p-3 cursor-pointer hover:bg-slate-800 transition-colors"
                        onClick={() => {
                          setSortField('description');
                          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Descrição {sortField === 'description' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="p-3">Tipo / Natureza</th>
                      <th className="p-3">Categoria / Subcat</th>
                      <th className="p-3">Conta / Cartão</th>
                      <th className="p-3">Situação</th>
                      <th
                        className="p-3 text-right cursor-pointer hover:bg-slate-800 transition-colors"
                        onClick={() => {
                          setSortField('amount');
                          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Valor {sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {paginatedTransactions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{formatDate(item.date)}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{item.description}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.nature === 'Entrada'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {item.categoryName}
                          {item.subcategoryName && item.subcategoryName !== '-' && (
                            <span className="text-[10px] text-slate-400 block">{item.subcategoryName}</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {item.bankName !== '-' ? item.bankName : item.cardName !== '-' ? item.cardName : item.paymentMethod}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              item.status === 'Pago' || item.status === 'Concluído'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : item.status === 'Atrasado'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {item.status === 'Pago' || item.status === 'Concluído' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : item.status === 'Atrasado' ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {item.status}
                          </span>
                        </td>
                        <td
                          className={`p-3 text-right font-black font-mono whitespace-nowrap ${
                            item.nature === 'Entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.nature === 'Entrada' ? '+' : '-'}{formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {groupBy === 'none' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs no-print">
                <div className="text-slate-500 dark:text-slate-400">
                  Exibindo <strong>{paginatedTransactions.length}</strong> de{' '}
                  <strong>{consolidatedTransactions.length}</strong> lançamentos
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-200 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold px-2 text-slate-700 dark:text-slate-200">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-200 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POR CATEGORIA */}
        {reportTab === 'categorias' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Donut Pie Chart */}
              <div className="h-72 w-full p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategoriesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenseCategoriesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Categorized Progress List */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {expenseCategoriesData.map((item, idx) => {
                  const pct = totalExpensesVal > 0 ? (item.value / totalExpensesVal) * 100 : 0;
                  return (
                    <div
                      key={item.name}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                        </div>
                        <span className="font-bold font-mono text-slate-900 dark:text-white">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 text-right">{pct.toFixed(1)}% do total de despesas</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: POR BANCO E CARTÃO DE CRÉDITO */}
        {reportTab === 'bancos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Balances & Accounts */}
              <div className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3 bg-white dark:bg-slate-900">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Building2 className="w-4 h-4 text-blue-600" /> Saldos e Posição em Bancos
                </h3>

                <div className="space-y-2.5 text-xs">
                  {banks.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center border border-slate-200/50 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center font-bold">
                          {b.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{b.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {b.institution} • {b.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black font-mono text-sm text-blue-600 dark:text-blue-400">
                          {formatCurrency(b.currentBalance)}
                        </span>
                        <p className="text-[10px] text-slate-400">Saldo Atualizado</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credit Card Invoices */}
              <div className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3 bg-white dark:bg-slate-900">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <CreditCard className="w-4 h-4 text-purple-600" /> Cartões de Crédito & Faturas
                </h3>

                <div className="space-y-2.5 text-xs">
                  {cards.map((c) => {
                    const pctUsed = c.limitTotal > 0 ? (c.limitUsed / c.limitTotal) * 100 : 0;
                    return (
                      <div
                        key={c.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-800"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{c.name}</p>
                            <p className="text-[10px] text-slate-400">
                              Fechamento dia {c.closingDay} • Vencimento dia {c.dueDay}
                            </p>
                          </div>
                          <span className="font-black font-mono text-purple-600 dark:text-purple-400">
                            Fatura: {formatCurrency(c.limitUsed)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pctUsed > 80 ? 'bg-rose-500' : 'bg-purple-600'
                            }`}
                            style={{ width: `${Math.min(100, pctUsed)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Limite Total: {formatCurrency(c.limitTotal)}</span>
                          <span>Disp: {formatCurrency(c.limitAvailable)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FLUXO DE CAIXA */}
        {reportTab === 'fluxo' && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Evolução Histórica (Entradas vs Saídas)
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cashFlowChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Saldo" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EMPRÉSTIMOS E FINANCIAMENTOS */}
        {reportTab === 'emprestimos' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contratado Total</span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-100 font-mono">
                  {formatCurrency(loans.reduce((a, l) => a + l.contractedAmount, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Saldo Devedor</span>
                <span className="font-black text-sm text-rose-600 font-mono">
                  {formatCurrency(loans.reduce((a, l) => a + l.outstandingBalance, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Amortizado</span>
                <span className="font-black text-sm text-emerald-600 font-mono">
                  {formatCurrency(loans.reduce((a, l) => a + l.paidAmortization, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Juros Pagos</span>
                <span className="font-black text-sm text-amber-600 font-mono">
                  {formatCurrency(loans.reduce((a, l) => a + l.paidInterest, 0))}
                </span>
              </div>
            </div>

            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-3">Contrato / Modalidade</th>
                    <th className="p-3">Instituição Banco</th>
                    <th className="p-3 text-right">Contratado</th>
                    <th className="p-3 text-right">Saldo Devedor</th>
                    <th className="p-3 text-right">Juros Pagos</th>
                    <th className="p-3 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{l.customType || l.type}</td>
                      <td className="p-3 text-slate-500">{banks.find((b) => b.id === l.bankId)?.name || 'Banco'}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(l.contractedAmount)}</td>
                      <td className="p-3 text-right font-bold text-rose-600 font-mono">
                        {formatCurrency(l.outstandingBalance)}
                      </td>
                      <td className="p-3 text-right font-mono text-amber-600">{formatCurrency(l.paidInterest)}</td>
                      <td className="p-3 text-center font-bold text-slate-600">{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: PATRIMÔNIO E INVESTIMENTOS */}
        {reportTab === 'investimentos' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Aplicado</span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-100 font-mono">
                  {formatCurrency(investments.reduce((a, i) => a + i.appliedAmount, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Valor Atual Carteira</span>
                <span className="font-black text-sm text-indigo-600 font-mono">
                  {formatCurrency(investments.reduce((a, i) => a + i.currentAmount, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Rendimento Acumulado</span>
                <span className="font-black text-sm text-emerald-600 font-mono">
                  +{formatCurrency(investments.reduce((a, i) => a + (i.currentAmount - i.appliedAmount), 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Posições Ativas</span>
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {investments.length} ativos
                </span>
              </div>
            </div>

            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-3">Ativo / Tipo</th>
                    <th className="p-3">Instituição / Corretora</th>
                    <th className="p-3 text-right">Aplicado</th>
                    <th className="p-3 text-right">Valor Atual</th>
                    <th className="p-3 text-right">Lucro Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {investments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{inv.type}</td>
                      <td className="p-3 text-slate-500">{inv.institution}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(inv.appliedAmount)}</td>
                      <td className="p-3 text-right font-bold text-indigo-600 font-mono">
                        {formatCurrency(inv.currentAmount)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 font-mono">
                        +{formatCurrency(inv.currentAmount - inv.appliedAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OFFICIAL GRAND TOTAL & SIGNATURE FOOTER */}
        <div className="border-t-2 border-slate-900 dark:border-slate-100 pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-bold gap-2">
            <div>
              <span className="text-slate-900 dark:text-white">
                RESUMO CONSOLIDADO DO EXTRATO: Entradas {formatCurrency(totalIncomesVal)} | Saídas {formatCurrency(totalExpensesVal)}
              </span>
              <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                Resultado do Período: <strong className={netResultVal >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(netResultVal)}</strong>
              </p>
            </div>

            <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] sm:text-right">
              <p>Doc ID: {docRefNumber} • Total Registros: {consolidatedTransactions.length}</p>
              <p className="opacity-70">Sistema de Gestão Financeira • Relatório Oficial A4</p>
            </div>
          </div>

          {/* Signature Block for Official Reports (Visible on Print) */}
          <div className="pt-6 border-t border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-400 print-header">
            <div>
              <div className="border-t border-slate-400 w-3/4 mx-auto mb-1" />
              <span>Elaborado por: {currentUser?.name || 'Administrador'}</span>
            </div>
            <div>
              <div className="border-t border-slate-400 w-3/4 mx-auto mb-1" />
              <span>Aprovado por / Controladoria</span>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT PREVIEW FULLSCREEN MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 no-print">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Visualização de Impressão Folha A4</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" /> Baixar PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimir Agora
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Fechar visualização"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Sheet Frame */}
            <div className="p-8 bg-slate-100 dark:bg-slate-950 max-h-[80vh] overflow-y-auto">
              <div className="bg-white text-slate-900 p-8 shadow-md rounded-none mx-auto max-w-2xl text-xs space-y-6 border border-slate-300">
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-black tracking-tight uppercase">
                      RELATÓRIO FINANCEIRO EXECUTIVO
                    </h2>
                    <p className="text-xs font-bold text-blue-700">DRE & Extrato Consolidado</p>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-500">
                    <p>Doc Ref: {docRefNumber}</p>
                    <p>Data: {emissionTimestamp}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 flex justify-between font-mono text-xs">
                    <span>(+) Receita Bruta: <strong>{formatCurrency(totalIncomesVal)}</strong></span>
                    <span>(-) Despesas: <strong>{formatCurrency(totalExpensesVal)}</strong></span>
                    <span className="font-black text-blue-700">(=) Resultado: {formatCurrency(netResultVal)}</span>
                  </div>

                  <table className="w-full text-left border border-slate-200 text-[10px]">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="p-2">Data</th>
                        <th className="p-2">Descrição</th>
                        <th className="p-2">Categoria</th>
                        <th className="p-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {consolidatedTransactions.slice(0, 15).map((t) => (
                        <tr key={t.id}>
                          <td className="p-2 font-mono">{formatDate(t.date)}</td>
                          <td className="p-2 font-bold">{t.description}</td>
                          <td className="p-2">{t.categoryName}</td>
                          <td
                            className={`p-2 text-right font-bold font-mono ${
                              t.nature === 'Entrada' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {t.nature === 'Entrada' ? '+' : '-'}{formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {consolidatedTransactions.length > 15 && (
                    <p className="text-[10px] text-center text-slate-500 italic">
                      ... e mais {consolidatedTransactions.length - 15} lançamentos no documento completo.
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-300 pt-4 text-[10px] flex justify-between text-slate-500">
                  <span>Emitido por: {currentUser?.name || 'Administrador'}</span>
                  <span>Página 1 de 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
