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
  User as UserIcon,
  Filter,
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
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#64748B'];

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
    users,
  } = useFinancialStore();

  // Period Filter State
  const [periodState, setPeriodState] = useState<PeriodFilterState>(() => loadSavedPeriodFilter());

  // Report Type & Granularity
  const [reportTab, setReportTab] = useState<'dre' | 'extrato' | 'categorias' | 'bancos' | 'fluxo' | 'emprestimos' | 'investimentos'>('dre');
  const [granularity, setGranularity] = useState<'Diário' | 'Semanal' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'>('Mensal');

  // Grouping State
  const [groupBy, setGroupBy] = useState<'none' | 'mes' | 'ano' | 'banco' | 'cartao' | 'categoria' | 'subcategoria' | 'pagamento' | 'situacao' | 'usuario'>('none');

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Column Sort
  const [sortField, setSortField] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Emit Timestamp
  const emissionTimestamp = useMemo(() => new Date().toLocaleString('pt-BR'), []);

  // Filtered Raw Datasets by Period & Non-Archived
  const filteredIncomes = useMemo(() => {
    return incomes.filter((inc) => !inc.archived && isDateInRange(inc.date, periodState.startDate, periodState.endDate));
  }, [incomes, periodState]);

  const filteredFixed = useMemo(() => {
    return fixedExpenses.filter((f) => {
      if (f.archived) return false;
      // Fixed expense date simulation based on dueDay in active year/month
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
        categoryName: cat?.name || 'Receitas',
        subcategoryId: inc.subcategoryId,
        subcategoryName: sub?.name || '-',
        bankId: inc.bankId,
        bankName: bk?.name || '-',
        paymentMethod: 'Pix / Depósito',
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
        paymentMethod: f.paymentMethod || 'Débito',
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
        paymentMethod: v.paymentMethod || 'Pix',
        status: v.status || 'Pago',
        createdBy: 'Sistema',
      });
    });

    // Filter by text search query
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
  }, [filteredIncomes, filteredFixed, filteredVariable, categories, subcategories, banks, cards, searchQuery, sortField, sortDir, periodState]);

  // Totals recalculations
  const totalIncomesVal = useMemo(() => filteredIncomes.reduce((acc, i) => acc + i.amount, 0), [filteredIncomes]);
  const totalFixedVal = useMemo(() => filteredFixed.reduce((acc, f) => acc + f.amount, 0), [filteredFixed]);
  const totalVarVal = useMemo(() => filteredVariable.reduce((acc, v) => acc + v.amount, 0), [filteredVariable]);
  const totalExpensesVal = totalFixedVal + totalVarVal;
  const netResultVal = totalIncomesVal - totalExpensesVal;

  // Pagination Logic
  const totalPages = Math.ceil(consolidatedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return consolidatedTransactions.slice(start, start + pageSize);
  }, [consolidatedTransactions, currentPage, pageSize]);

  // Grouped Data Calculation
  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null;

    const map: Record<string, { key: string; totalEntradas: number; totalSaidas: number; count: number; items: typeof consolidatedTransactions }> = {};

    consolidatedTransactions.forEach((t) => {
      let groupKey = 'Outros';

      if (groupBy === 'mes') {
        const parts = t.date.split('-');
        groupKey = parts.length >= 2 ? `${parts[1]}/${parts[0]}` : 'Sem Mês';
      } else if (groupBy === 'ano') {
        groupKey = t.date.substring(0, 4) || 'Sem Ano';
      } else if (groupBy === 'banco') {
        groupKey = t.bankName && t.bankName !== '-' ? t.bankName : 'Sem Banco/Outros';
      } else if (groupBy === 'cartao') {
        groupKey = t.cardName && t.cardName !== '-' ? t.cardName : 'Outros Meios (Não Cartão)';
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

  // Category Pie Data
  const categoryPieData = useMemo(() => {
    const map: Record<string, number> = {};
    consolidatedTransactions.forEach((t) => {
      if (t.nature === 'Saída') {
        map[t.categoryName] = (map[t.categoryName] || 0) + t.amount;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [consolidatedTransactions]);

  // Comparative Cash Flow Chart Data
  const cashFlowChartData = useMemo(() => {
    const map: Record<string, { label: string; Receitas: number; Despesas: number }> = {};

    consolidatedTransactions.forEach((t) => {
      let label = t.date;
      if (granularity === 'Mensal') {
        label = t.date.substring(0, 7); // YYYY-MM
      } else if (granularity === 'Anual') {
        label = t.date.substring(0, 4); // YYYY
      } else if (granularity === 'Semanal') {
        label = `Semana de ${t.date}`;
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
        map[label] = { label, Receitas: 0, Despesas: 0 };
      }

      if (t.nature === 'Entrada') {
        map[label].Receitas += t.amount;
      } else {
        map[label].Despesas += t.amount;
      }
    });

    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  }, [consolidatedTransactions, granularity]);

  // Handle Handlers
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
      Data: t.date,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Central de Relatórios Executivos & DRE
          </h2>
          <p className="text-xs text-slate-500">
            Ajuste de filtros por período, agrupamentos flexíveis e exportação para A4/PDF/Excel
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors shadow-sm"
            title="Imprimir em A4"
          >
            <Printer className="w-4 h-4" /> Imprimir A4
          </button>
        </div>
      </div>

      {/* Advanced Global Period Filter */}
      <div className="no-print">
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

      {/* Navigation Tabs */}
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
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grouping Controls for Tab 2 Extrato */}
      {reportTab === 'extrato' && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs no-print">
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar lançamento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE REPORT WRAPPER */}
      <div
        id="relatorio-imprimir"
        className="p-6 md:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
      >
        {/* Print Header */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              SISTEMA GESTÃO FINANCEIRA
            </h1>
            <p className="text-sm font-bold text-blue-600">
              {reportTab === 'dre'
                ? 'Demonstrativo do Resultado do Exercício (DRE)'
                : reportTab === 'extrato'
                ? 'Extrato Analítico de Lançamentos Financeiros'
                : reportTab === 'categorias'
                ? 'Relatório por Categoria & Subcategoria'
                : reportTab === 'bancos'
                ? 'Relatório por Banco e Cartão de Crédito'
                : reportTab === 'fluxo'
                ? 'Fluxo de Caixa e Projeção Histórica'
                : reportTab === 'emprestimos'
                ? 'Relatório de Empréstimos e Financiamentos'
                : 'Relatório de Carteira e Patrimônio'}
            </p>
          </div>

          <div className="text-right text-xs font-mono text-slate-500 space-y-0.5">
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Período:</strong>{' '}
              {formatDate(periodState.startDate)} a {formatDate(periodState.endDate)}
            </p>
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Emissão:</strong> {emissionTimestamp}
            </p>
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Usuário:</strong>{' '}
              {currentUser?.name || currentUser?.email || 'Administrador'}
            </p>
          </div>
        </div>

        {/* VIEW 1: DRE GERENCIAL */}
        {reportTab === 'dre' && (
          <div className="space-y-6">
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
              <div className="p-3.5 bg-slate-900 text-white font-bold flex justify-between uppercase">
                <span>Rubrica / Indicador Financeiro</span>
                <span>Valor Total no Período</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Receita Bruta */}
                <div className="p-3.5 flex justify-between font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span>(+) RECEITA OPERACIONAL BRUTA</span>
                  <span className="text-sm font-black">{formatCurrency(totalIncomesVal)}</span>
                </div>

                {/* Despesas Fixas */}
                <div className="p-3.5 flex justify-between text-slate-700 dark:text-slate-300 pl-6">
                  <span>(-) Custos & Despesas Fixas / Recorrentes</span>
                  <span className="font-mono text-rose-600">({formatCurrency(totalFixedVal)})</span>
                </div>

                {/* Despesas Variáveis */}
                <div className="p-3.5 flex justify-between text-slate-700 dark:text-slate-300 pl-6">
                  <span>(-) Despesas Variáveis & Consumo Operacional</span>
                  <span className="font-mono text-rose-600">({formatCurrency(totalVarVal)})</span>
                </div>

                {/* Total Despesas */}
                <div className="p-3.5 flex justify-between font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20">
                  <span>(=) TOTAL DE DESPESAS OPERACIONAIS</span>
                  <span className="text-sm font-black">({formatCurrency(totalExpensesVal)})</span>
                </div>

                {/* Resultado Líquido */}
                <div
                  className={`p-4 flex justify-between text-sm font-black ${
                    netResultVal >= 0
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100'
                  }`}
                >
                  <div>
                    <span>(=) RESULTADO LÍQUIDO DO PERÍODO</span>
                    <p className="text-[11px] font-normal opacity-80 mt-0.5">
                      Margem Líquida:{' '}
                      <strong>{totalIncomesVal > 0 ? ((netResultVal / totalIncomesVal) * 100).toFixed(1) : 0}%</strong>
                    </p>
                  </div>
                  <span className="text-lg">{formatCurrency(netResultVal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: EXTRATO CONSOLIDADO & AGRUPADO */}
        {reportTab === 'extrato' && (
          <div className="space-y-6">
            {/* If Grouping is Active */}
            {groupBy !== 'none' && groupedData ? (
              <div className="space-y-6">
                {groupedData.map((group) => (
                  <div
                    key={group.key}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs"
                  >
                    <div className="p-3.5 bg-slate-100 dark:bg-slate-800 font-bold flex items-center justify-between text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-blue-600">{group.key}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full">
                          {group.count} lançamentos
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-emerald-600">
                          Entradas: <strong>{formatCurrency(group.totalEntradas)}</strong>
                        </span>
                        <span className="text-rose-600">
                          Saídas: <strong>{formatCurrency(group.totalSaidas)}</strong>
                        </span>
                        <span className="font-bold border-l pl-3 border-slate-300 dark:border-slate-700">
                          Saldo: {formatCurrency(group.totalEntradas - group.totalSaidas)}
                        </span>
                      </div>
                    </div>

                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5">Data</th>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Categoria</th>
                          <th className="p-2.5">Banco/Cartão</th>
                          <th className="p-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {group.items.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2.5 font-mono text-slate-500">{formatDate(item.date)}</td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{item.description}</td>
                            <td className="p-2.5 text-slate-500">{item.categoryName}</td>
                            <td className="p-2.5 text-slate-500">
                              {item.bankName !== '-' ? item.bankName : item.cardName}
                            </td>
                            <td
                              className={`p-2.5 text-right font-bold ${
                                item.nature === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
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
              /* Flat Table */
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th
                        className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => {
                          setSortField('date');
                          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Data
                      </th>
                      <th
                        className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => {
                          setSortField('description');
                          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Descrição
                      </th>
                      <th className="p-3">Tipo / Natureza</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Conta / Origem</th>
                      <th className="p-3">Situação</th>
                      <th
                        className="p-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => {
                          setSortField('amount');
                          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {paginatedTransactions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-slate-500">{formatDate(item.date)}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{item.description}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.nature === 'Entrada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
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
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {item.bankName !== '-' ? item.bankName : item.cardName !== '-' ? item.cardName : item.paymentMethod}
                        </td>
                        <td className="p-3 font-bold text-slate-500">{item.status}</td>
                        <td
                          className={`p-3 text-right font-black ${
                            item.nature === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
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
                <div className="text-slate-500">
                  Exibindo <strong>{paginatedTransactions.length}</strong> de{' '}
                  <strong>{consolidatedTransactions.length}</strong> lançamentos no período
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
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
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: RELATÓRIO POR CATEGORIA */}
        {reportTab === 'categorias' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {categoryPieData.map((item, idx) => {
                  const pct = totalExpensesVal > 0 ? ((item.value / totalExpensesVal) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                          <span className="text-[10px] text-slate-400 block">{pct}% do total de despesas</span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: POR BANCO E CARTÃO DE CRÉDITO */}
        {reportTab === 'bancos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank summary */}
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" /> Saldo & Extrato por Banco
                </h3>

                <div className="space-y-2 text-xs">
                  {banks.map((b) => (
                    <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{b.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {b.type} • Saldo atual: {formatCurrency(b.currentBalance)}
                        </p>
                      </div>
                      <div className="text-right font-bold text-blue-600">
                        {formatCurrency(b.currentBalance)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cards summary */}
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" /> Faturas por Cartão de Crédito
                </h3>

                <div className="space-y-2 text-xs">
                  {cards.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{c.name}</p>
                        <p className="text-[10px] text-slate-400">
                          Limite: {formatCurrency(c.limitTotal)} | Disp: {formatCurrency(c.limitAvailable)}
                        </p>
                      </div>
                      <div className="text-right font-bold text-purple-600">
                        Fatura: {formatCurrency(c.limitUsed)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: FLUXO DE CAIXA COMPARATIVO */}
        {reportTab === 'fluxo' && (
          <div className="space-y-6">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 6: EMPRÉSTIMOS E FINANCIAMENTOS */}
        {reportTab === 'emprestimos' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div>
                <span className="text-slate-400 block">Contratado Total</span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                  {formatCurrency(loans.reduce((a, l) => a + l.contractedAmount, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Saldo Devedor Atual</span>
                <span className="font-black text-sm text-rose-600">
                  {formatCurrency(loans.reduce((a, l) => a + l.outstandingBalance, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Amortizado</span>
                <span className="font-black text-sm text-emerald-600">
                  {formatCurrency(loans.reduce((a, l) => a + l.paidAmortization, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Juros Pagos</span>
                <span className="font-black text-sm text-amber-600">
                  {formatCurrency(loans.reduce((a, l) => a + l.paidInterest, 0))}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Contrato / Tipo</th>
                    <th className="p-3">Banco</th>
                    <th className="p-3 text-right">Contratado</th>
                    <th className="p-3 text-right">Saldo Devedor</th>
                    <th className="p-3 text-right">Juros Pagos</th>
                    <th className="p-3 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {loans.map((l) => (
                    <tr key={l.id}>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{l.customType || l.type}</td>
                      <td className="p-3 text-slate-500">{banks.find((b) => b.id === l.bankId)?.name}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(l.contractedAmount)}</td>
                      <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(l.outstandingBalance)}</td>
                      <td className="p-3 text-right font-mono text-amber-600">{formatCurrency(l.paidInterest)}</td>
                      <td className="p-3 text-center font-bold text-slate-600">{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 7: PATRIMÔNIO E INVESTIMENTOS */}
        {reportTab === 'investimentos' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div>
                <span className="text-slate-400 block">Total Aplicado</span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                  {formatCurrency(investments.reduce((a, i) => a + i.appliedAmount, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Valor Atual da Carteira</span>
                <span className="font-black text-sm text-indigo-600">
                  {formatCurrency(investments.reduce((a, i) => a + i.currentAmount, 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Rendimento Acumulado</span>
                <span className="font-black text-sm text-emerald-600">
                  +{formatCurrency(investments.reduce((a, i) => a + (i.currentAmount - i.appliedAmount), 0))}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Ativos Totais</span>
                <span className="font-black text-sm text-slate-900 dark:text-white">{investments.length} posições</span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Ativo / Tipo</th>
                    <th className="p-3">Instituição</th>
                    <th className="p-3 text-right">Aplicado</th>
                    <th className="p-3 text-right">Valor Atual</th>
                    <th className="p-3 text-right">Lucro/Rendimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {investments.map((inv) => (
                    <tr key={inv.id}>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{inv.type}</td>
                      <td className="p-3 text-slate-500">{inv.institution}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(inv.appliedAmount)}</td>
                      <td className="p-3 text-right font-bold text-indigo-600">{formatCurrency(inv.currentAmount)}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        +{formatCurrency(inv.currentAmount - inv.appliedAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Print Grand Total Footer */}
        <div className="border-t-2 border-slate-900 dark:border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs font-bold gap-2">
          <div>
            <span>
              TOTAL GERAL EXTRATO: Entradas {formatCurrency(totalIncomesVal)} | Saídas {formatCurrency(totalExpensesVal)}
            </span>
            <p className="text-[10px] font-normal text-slate-400">
              Resultado do Período: <strong>{formatCurrency(netResultVal)}</strong>
            </p>
          </div>

          <div className="text-slate-500 font-mono text-[10px] text-right">
            <span>Página 1 de 1  •  Total de Registros: {consolidatedTransactions.length}</span>
            <p className="opacity-70">SGF System • Relatório V2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};
