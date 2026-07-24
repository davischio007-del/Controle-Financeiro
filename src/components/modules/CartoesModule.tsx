import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Card, CardNetwork, VariableExpense } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import {
  formatCurrency,
  formatDate,
  getInvoiceCompetence,
  getInstallmentCompetence,
  calculateInstallmentAmounts,
  getCurrentDateFormatted,
} from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Plus,
  X,
  CreditCard,
  CheckCircle,
  Receipt,
  Filter,
  BarChart3,
  TrendingDown,
  ShoppingBag,
  Trash2,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Search,
  PieChart,
  Pencil,
} from 'lucide-react';

interface CartoesModuleProps {
  selectedCardIdForInvoice?: string;
}

const CHART_COLORS = ['#820AD1', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export const CartoesModule: React.FC<CartoesModuleProps> = ({ selectedCardIdForInvoice }) => {
  const {
    cards,
    banks,
    addCard,
    updateCard,
    deleteCardSmart,
    payCardInvoice,
    variableExpenses,
    addVariableExpense,
    updateVariableExpense,
    deleteVariableExpense,
    categories,
    subcategories,
  } = useFinancialStore();

  const [activeTab, setActiveTab] = useState<'cartoes' | 'compras' | 'relatorios'>('cartoes');

  // Modals state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deleteCardTarget, setDeleteCardTarget] = useState<Card | null>(null);
  const [cardFormError, setCardFormError] = useState<string | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<VariableExpense | null>(null);
  const [purchaseFormError, setPurchaseFormError] = useState<string | null>(null);

  // Purchase Deletion Target
  const [deletePurchaseTarget, setDeletePurchaseTarget] = useState<VariableExpense | null>(null);

  // Invoice Modal State
  const [activeInvoiceCard, setActiveInvoiceCard] = useState<Card | null>(
    selectedCardIdForInvoice ? cards.find((c) => c.id === selectedCardIdForInvoice) || null : null
  );
  const [paymentBankId, setPaymentBankId] = useState<string>(banks[0]?.id || '');
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // Dedicated Pay Invoice Modal State
  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState<boolean>(false);
  const [payModalCardId, setPayModalCardId] = useState<string>('');
  const [payModalBankId, setPayModalBankId] = useState<string>('');
  const [payModalError, setPayModalError] = useState<string | null>(null);
  const [payModalSuccess, setPayModalSuccess] = useState<boolean>(false);

  // Invoice Filters
  const [filterType, setFilterType] = useState<'fatura_atual' | 'competencia' | 'periodo'>('fatura_atual');
  const [selectedCompetence, setSelectedCompetence] = useState<string>('07/2026');
  const [startDate, setStartDate] = useState<string>('2026-07-01');
  const [endDate, setEndDate] = useState<string>('2026-07-31');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterInstallmentType, setFilterInstallmentType] = useState<'all' | 'avista' | 'parcelado'>('all');

  // Purchases Tab Search & Filter State
  const [purchasesSearchTerm, setPurchasesSearchTerm] = useState('');
  const [purchasesCardFilter, setPurchasesCardFilter] = useState('all');

  // Reports Filters
  const [reportCardId, setReportCardId] = useState<string>('all');
  const [reportBankId, setReportBankId] = useState<string>('all');
  const [reportCategoryId, setReportCategoryId] = useState<string>('all');

  // Card Form State
  const [cardName, setCardName] = useState('');
  const [cardBankId, setCardBankId] = useState('');
  const [cardNetwork, setCardNetwork] = useState<CardNetwork>('Mastercard');
  const [cardLimitTotal, setCardLimitTotal] = useState<number>(10000);
  const [cardClosingDay, setCardClosingDay] = useState<number>(15);
  const [cardDueDay, setCardDueDay] = useState<number>(22);
  const [cardColor, setCardColor] = useState('#820AD1');
  const [cardStatus, setCardStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Purchase Form State
  const [pCardId, setPCardId] = useState<string>(cards[0]?.id || '');
  const [pDate, setPDate] = useState<string>(getCurrentDateFormatted());
  const [pDescription, setPDescription] = useState<string>('');
  const [pCategoryId, setPCategoryId] = useState<string>(categories[0]?.id || '');
  const [pSubcategoryId, setPSubcategoryId] = useState<string>('');
  const [pAmount, setPAmount] = useState<number>(0);
  const [pInstallments, setPInstallments] = useState<number>(1);
  const [pNotes, setPNotes] = useState<string>('');
  const [purchaseSuccessToast, setPurchaseSuccessToast] = useState(false);

  // Open Add Card Modal
  const openAddCardModal = () => {
    setEditingCard(null);
    setCardName('');
    setCardBankId(banks[0]?.id || '');
    setCardNetwork('Mastercard');
    setCardLimitTotal(10000);
    setCardClosingDay(15);
    setCardDueDay(22);
    setCardColor('#820AD1');
    setCardStatus('Ativo');
    setCardFormError(null);
    setIsCardModalOpen(true);
  };

  // Open Edit Card Modal
  const openEditCardModal = (item: Card) => {
    setEditingCard(item);
    setCardName(item.name);
    setCardBankId(item.bankId);
    setCardNetwork(item.network);
    setCardLimitTotal(item.limitTotal);
    setCardClosingDay(item.closingDay);
    setCardDueDay(item.dueDay);
    setCardColor(item.color);
    setCardStatus(item.status);
    setCardFormError(null);
    setIsCardModalOpen(true);
  };

  // Handle Card Submit with Duplicate Validation
  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCardFormError(null);

    if (!cardName.trim() || !cardBankId) {
      setCardFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    // Duplicate Card Validation for Same Bank
    const isDuplicate = cards.some(
      (c) =>
        c.id !== editingCard?.id &&
        c.bankId === cardBankId &&
        c.name.toLowerCase().trim() === cardName.toLowerCase().trim()
    );

    if (isDuplicate) {
      setCardFormError('Já existe um cartão cadastrado com este mesmo nome para este banco emissor.');
      return;
    }

    if (editingCard) {
      updateCard(editingCard.id, {
        name: cardName.trim(),
        bankId: cardBankId,
        network: cardNetwork,
        limitTotal: cardLimitTotal,
        closingDay: cardClosingDay,
        dueDay: cardDueDay,
        color: cardColor,
        status: cardStatus,
      });
    } else {
      addCard({
        name: cardName.trim(),
        bankId: cardBankId,
        network: cardNetwork,
        limitTotal: cardLimitTotal,
        closingDay: cardClosingDay,
        dueDay: cardDueDay,
        color: cardColor,
        icon: 'CreditCard',
        status: cardStatus,
      });
    }
    setIsCardModalOpen(false);
  };

  // Open Purchase Modal for Add
  const openAddPurchaseModal = (preselectedCardId?: string) => {
    setEditingPurchase(null);
    setPCardId(preselectedCardId || cards[0]?.id || '');
    setPDate(getCurrentDateFormatted());
    setPDescription('');
    setPCategoryId(categories.find((c) => c.type === 'Despesa')?.id || categories[0]?.id || '');
    setPSubcategoryId('');
    setPAmount(0);
    setPInstallments(1);
    setPNotes('');
    setPurchaseFormError(null);
    setIsPurchaseModalOpen(true);
  };

  // Open Purchase Modal for Edit
  const openEditPurchaseModal = (item: VariableExpense) => {
    setEditingPurchase(item);
    setPCardId(item.cardId || cards[0]?.id || '');
    setPDate(item.date);
    setPDescription(item.description);
    setPCategoryId(item.categoryId);
    setPSubcategoryId(item.subcategoryId || '');
    setPAmount(item.amount);
    setPInstallments(item.installmentsCount || 1);
    setPNotes(item.notes || '');
    setPurchaseFormError(null);
    setIsPurchaseModalOpen(true);
  };

  // Handle Purchase Submit with Limit & Exact Installment Validation
  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseFormError(null);

    if (!pCardId) {
      setPurchaseFormError('Selecione um cartão de crédito.');
      return;
    }

    if (!pAmount || pAmount <= 0) {
      setPurchaseFormError('O valor total da compra deve ser maior que zero.');
      return;
    }

    const instCount = Math.max(1, pInstallments);
    const selCard = cards.find((c) => c.id === pCardId);

    if (selCard) {
      const availableLimitForValidation =
        editingPurchase && editingPurchase.cardId === selCard.id
          ? selCard.limitAvailable + editingPurchase.amount
          : selCard.limitAvailable;

      if (pAmount > availableLimitForValidation) {
        setPurchaseFormError(
          `Limite disponível insuficiente no cartão ${selCard.name}! (Limite disponível: ${formatCurrency(
            availableLimitForValidation
          )})`
        );
        return;
      }
    }

    const instAmounts = calculateInstallmentAmounts(pAmount, instCount);

    if (editingPurchase) {
      updateVariableExpense(editingPurchase.id, {
        description: pDescription,
        categoryId: pCategoryId,
        subcategoryId: pSubcategoryId || undefined,
        amount: pAmount,
        date: pDate,
        paymentMethod: 'Cartão',
        cardId: pCardId,
        status: 'Pago',
        installmentsCount: instCount,
        currentInstallment: 1,
        installmentAmount: instAmounts[0],
        notes: pNotes || undefined,
      });
    } else {
      addVariableExpense({
        description: pDescription,
        categoryId: pCategoryId,
        subcategoryId: pSubcategoryId || undefined,
        amount: pAmount,
        date: pDate,
        paymentMethod: 'Cartão',
        cardId: pCardId,
        status: 'Pago',
        installmentsCount: instCount,
        currentInstallment: 1,
        installmentAmount: instAmounts[0],
        notes: pNotes || undefined,
      });
    }

    setIsPurchaseModalOpen(false);
    setPurchaseSuccessToast(true);
    setTimeout(() => setPurchaseSuccessToast(false), 3000);
  };

  // Handle Invoice Payment Execution
  const handleExecutePayment = () => {
    if (!activeInvoiceCard || !paymentBankId) return;
    const ok = payCardInvoice(activeInvoiceCard.id, new Date().getMonth() + 1, new Date().getFullYear(), paymentBankId);
    if (ok) {
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setActiveInvoiceCard(null);
      }, 1500);
    }
  };

  const openPayInvoiceModal = (card?: Card) => {
    const targetCard = card || cards[0];
    setPayModalCardId(targetCard?.id || '');
    setPayModalBankId(banks[0]?.id || '');
    setPayModalError(null);
    setPayModalSuccess(false);
    setIsPayInvoiceModalOpen(true);
  };

  const handleConfirmPayInvoiceModal = () => {
    setPayModalError(null);
    if (!payModalCardId) {
      setPayModalError('Selecione um cartão de crédito.');
      return;
    }
    if (!payModalBankId) {
      setPayModalError('Selecione um banco para pagamento.');
      return;
    }
    const card = cards.find((c) => c.id === payModalCardId);
    const bank = banks.find((b) => b.id === payModalBankId);
    if (!card) {
      setPayModalError('Cartão não encontrado.');
      return;
    }
    if (!bank) {
      setPayModalError('Banco de pagamento não encontrado.');
      return;
    }

    if (card.limitUsed <= 0) {
      setPayModalError(`O cartão "${card.name}" não possui fatura pendente (Limite Utilizado: R$ 0,00).`);
      return;
    }

    if (bank.currentBalance < card.limitUsed) {
      setPayModalError(
        `Pagamento Rejeitado: Saldo insuficiente na conta "${bank.name}". Saldo disponível: R$ ${bank.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Fatura do cartão: R$ ${card.limitUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      );
      return;
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const ok = payCardInvoice(payModalCardId, currentMonth, currentYear, payModalBankId);
    if (ok) {
      setPayModalSuccess(true);
      setTimeout(() => {
        setPayModalSuccess(false);
        setIsPayInvoiceModalOpen(false);
      }, 1800);
    } else {
      setPayModalError('Ocorreu um erro ao processar o pagamento da fatura.');
    }
  };

  // Unroll purchases into installments with exact invoice competence & penny precision
  const getUnrolledInvoiceInstallments = (card: Card) => {
    const cardVariablePurchases = variableExpenses.filter(
      (v) => v.cardId === card.id || (v.paymentMethod === 'Cartão' && v.cardId === card.id)
    );

    const unrolledItems: {
      id: string;
      purchaseId: string;
      date: string;
      description: string;
      categoryId: string;
      subcategoryId?: string;
      originalTotalAmount: number;
      installmentNumber: number;
      installmentsTotal: number;
      installmentAmount: number;
      competenceStr: string;
      month: number;
      year: number;
      notes?: string;
    }[] = [];

    cardVariablePurchases.forEach((v) => {
      const N = v.installmentsCount && v.installmentsCount > 0 ? v.installmentsCount : 1;
      const amounts = calculateInstallmentAmounts(v.amount, N);

      for (let k = 1; k <= N; k++) {
        const comp = getInstallmentCompetence(v.date, card.closingDay, k);
        unrolledItems.push({
          id: `${v.id}_inst_${k}`,
          purchaseId: v.id,
          date: v.date,
          description: v.description,
          categoryId: v.categoryId,
          subcategoryId: v.subcategoryId,
          originalTotalAmount: v.amount,
          installmentNumber: k,
          installmentsTotal: N,
          installmentAmount: amounts[k - 1],
          competenceStr: comp.competenceStr,
          month: comp.month,
          year: comp.year,
          notes: v.notes,
        });
      }
    });

    return unrolledItems;
  };

  // Compute Current Invoice Competence for a Card based on today's date
  const getCurrentCardInvoiceCompetence = (card: Card) => {
    return getInvoiceCompetence(getCurrentDateFormatted(), card.closingDay).competenceStr;
  };

  // Export to PDF
  const handleExportPDF = (items: any[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Lançamentos em Cartões de Crédito', 14, 18);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);

    let y = 35;
    doc.setFont('helvetica', 'bold');
    doc.text('Data | Estabelecimento | Categoria | Competência | Parcela | Valor', 14, y);
    doc.setFont('helvetica', 'normal');
    y += 8;

    items.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const catName = categories.find((c) => c.id === item.categoryId)?.name || 'Geral';
      const line = `${formatDate(item.date)} | ${item.description.substring(0, 20)} | ${catName} | ${
        item.competenceStr
      } | ${item.installmentNumber}/${item.installmentsTotal} | R$ ${item.installmentAmount.toFixed(2)}`;
      doc.text(line, 14, y);
      y += 6;
    });

    doc.save('relatorio_cartoes.pdf');
  };

  // Export to Excel
  const handleExportExcel = (items: any[]) => {
    const data = items.map((i) => ({
      'Data Compra': formatDate(i.date),
      Descrição: i.description,
      Categoria: categories.find((c) => c.id === i.categoryId)?.name || 'Geral',
      Subcategoria: subcategories.find((s) => s.id === i.subcategoryId)?.name || '-',
      Competência: i.competenceStr,
      Parcela: `${i.installmentNumber}/${i.installmentsTotal}`,
      'Valor Parcela': i.installmentAmount,
      'Valor Total Original': i.originalTotalAmount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
    XLSX.writeFile(workbook, 'relatorio_cartoes.xlsx');
  };

  // Summary Metrics
  const totalCardsLimit = cards.reduce((acc, c) => acc + (c.status === 'Ativo' ? c.limitTotal : 0), 0);
  const totalCardsUsed = cards.reduce((acc, c) => acc + (c.status === 'Ativo' ? c.limitUsed : 0), 0);
  const totalCardsAvailable = totalCardsLimit - totalCardsUsed;

  const cardColumns: Column<Card>[] = [
    {
      header: 'Cartão / Bandeira',
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0"
            style={{ backgroundColor: r.color }}
          >
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800 dark:text-slate-100">{r.name}</p>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  r.status === 'Ativo'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {r.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {r.network} • Fech. dia {r.closingDay} | Venc. dia {r.dueDay}
            </p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Banco Emissor',
      accessor: (r) => {
        const b = banks.find((bk) => bk.id === r.bankId);
        return <span className="font-semibold text-slate-700 dark:text-slate-300">{b?.name || '-'}</span>;
      },
    },
    {
      header: 'Limite Utilizado / Total',
      accessor: (r) => {
        const pct = r.limitTotal > 0 ? Math.min(100, Math.round((r.limitUsed / r.limitTotal) * 100)) : 0;
        return (
          <div className="space-y-1 w-36">
            <div className="flex justify-between text-[11px]">
              <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(r.limitUsed)}</span>
              <span className="text-slate-400">{formatCurrency(r.limitTotal)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${pct > 80 ? 'bg-red-500' : 'bg-purple-600'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
      sortable: true,
    },
    {
      header: 'Limite Disponível',
      accessor: (r) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.limitAvailable)}</span>
      ),
    },
    {
      header: 'Demonstrativo',
      accessor: (r) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setActiveInvoiceCard(r);
              setSelectedCompetence(getCurrentCardInvoiceCompetence(r));
            }}
            className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors flex items-center gap-1 shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Fatura</span>
          </button>
          <button
            onClick={() => openPayInvoiceModal(r)}
            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex items-center gap-1 shadow-sm"
            title="Inserir Pagamento de Fatura citando Banco"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Pagar</span>
          </button>
        </div>
      ),
    },
  ];

  // Card Purchases List Filtered
  const cardPurchasesList = variableExpenses
    .filter((v) => v.paymentMethod === 'Cartão' && v.cardId)
    .filter((v) => {
      if (purchasesCardFilter !== 'all' && v.cardId !== purchasesCardFilter) return false;
      if (
        purchasesSearchTerm &&
        !v.description.toLowerCase().includes(purchasesSearchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {purchaseSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle className="w-5 h-5" />
          <span className="font-bold text-xs">Compra lançada com sucesso no cartão! Limite e parcelas atualizados.</span>
        </div>
      )}

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Limite Total Cadastrado</span>
            <CreditCard className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalCardsLimit)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{cards.filter((c) => c.status === 'Ativo').length} cartões ativos</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Limite Comprometido</span>
            <TrendingDown className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400">{formatCurrency(totalCardsUsed)}</p>
          <p className="text-[11px] text-purple-500 mt-0.5 font-medium">
            {totalCardsLimit > 0 ? Math.round((totalCardsUsed / totalCardsLimit) * 100) : 0}% do limite global utilizado
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Limite Disponível</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCardsAvailable)}</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">Pronto para novas compras e emergências</p>
        </div>

        <div className="bg-purple-600 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-xs font-bold uppercase tracking-wider">Lançamento Rápido</span>
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <button
              onClick={() => openAddPurchaseModal()}
              className="w-full mt-2 py-2 bg-white text-purple-700 hover:bg-purple-50 font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Compra no Cartão</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('cartoes')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'cartoes'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Meus Cartões ({cards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('compras')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'compras'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Compras no Cartão ({cardPurchasesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('relatorios')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'relatorios'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Relatórios & Gráficos</span>
          </button>
        </div>

        <button
          onClick={() => openPayInvoiceModal()}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all flex items-center gap-1.5"
        >
          <Receipt className="w-4 h-4" />
          <span>Pagar Fatura</span>
        </button>
      </div>

      {/* TAB 1: MEUS CARTÕES */}
      {activeTab === 'cartoes' && (
        <DataTable
          title="Gestão de Cartões de Crédito"
          subtitle="Cadastre seus cartões, consulte faturas por competência e feche lançamentos parcelados automaticamente"
          columns={cardColumns}
          data={cards}
          idKey="id"
          onAdd={openAddCardModal}
          onEdit={openEditCardModal}
          onDelete={(item) => setDeleteCardTarget(item)}
          exportFilename="cartoes_credito"
        />
      )}

      {/* TAB 2: COMPRAS NO CARTÃO (LANÇAMENTOS) */}
      {activeTab === 'compras' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Lançamentos de Compras no Cartão</h3>
              <p className="text-xs text-slate-500">Histórico de compras à vista e parceladas registradas</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={purchasesSearchTerm}
                  onChange={(e) => setPurchasesSearchTerm(e.target.value)}
                  placeholder="Buscar estabelecimento..."
                  className="pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <select
                value={purchasesCardFilter}
                onChange={(e) => setPurchasesCardFilter(e.target.value)}
                className="p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="all">Todos os Cartões</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Data Compra</th>
                  <th className="p-3">Cartão Utilizado</th>
                  <th className="p-3">Estabelecimento / Descrição</th>
                  <th className="p-3">Categoria / Subcategoria</th>
                  <th className="p-3 text-center">Parcelas</th>
                  <th className="p-3 text-right">Valor Total (R$)</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cardPurchasesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhuma compra encontrada para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  cardPurchasesList.map((p) => {
                    const card = cards.find((c) => c.id === p.cardId);
                    const catName = categories.find((c) => c.id === p.categoryId)?.name || 'Geral';
                    const subName = subcategories.find((s) => s.id === p.subcategoryId)?.name || '-';
                    const instCount = p.installmentsCount || 1;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                          {formatDate(p.date)}
                        </td>
                        <td className="p-3">
                          <span
                            className="px-2 py-0.5 text-[10px] font-bold text-white rounded-md"
                            style={{ backgroundColor: card?.color || '#820AD1' }}
                          >
                            {card?.name || 'Cartão'}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{p.description}</p>
                          {p.notes && <p className="text-[10px] text-slate-400 italic">{p.notes}</p>}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-purple-600 dark:text-purple-400">{catName}</p>
                          <p className="text-[10px] text-slate-400">{subName}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold rounded text-[10px]">
                            {instCount}x {instCount === 1 ? '(À Vista)' : ''}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditPurchaseModal(p)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                              title="Editar Compra no Cartão"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletePurchaseTarget(p)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                              title="Cancelar/Excluir Compra e Restaurar Limite"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RELATÓRIOS & GRÁFICOS */}
      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-600" />
                <span>Filtros do Relatório de Cartões de Crédito</span>
              </h3>

              {/* Export Buttons */}
              {(() => {
                const filteredCardList = cards.filter((c) => {
                  if (reportCardId !== 'all' && c.id !== reportCardId) return false;
                  if (reportBankId !== 'all' && c.bankId !== reportBankId) return false;
                  return true;
                });
                const allUnrolled = filteredCardList.flatMap((card) => getUnrolledInvoiceInstallments(card));
                const matchingItems = allUnrolled.filter((item) => {
                  if (reportCategoryId !== 'all' && item.categoryId !== reportCategoryId) return false;
                  return true;
                });

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportPDF(matchingItems)}
                      className="px-3 py-1.5 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 rounded-xl font-bold text-xs flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Exportar PDF</span>
                    </button>

                    <button
                      onClick={() => handleExportExcel(matchingItems)}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-xs flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Exportar Excel</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Filtrar por Cartão</label>
                <select
                  value={reportCardId}
                  onChange={(e) => setReportCardId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                >
                  <option value="all">Todos os Cartões</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.network})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Filtrar por Banco Emissor</label>
                <select
                  value={reportBankId}
                  onChange={(e) => setReportBankId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                >
                  <option value="all">Todos os Bancos Emissores</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Filtrar por Categoria</label>
                <select
                  value={reportCategoryId}
                  onChange={(e) => setReportCategoryId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report Content */}
          {(() => {
            const filteredCardList = cards.filter((c) => {
              if (reportCardId !== 'all' && c.id !== reportCardId) return false;
              if (reportBankId !== 'all' && c.bankId !== reportBankId) return false;
              return true;
            });

            const allUnrolled = filteredCardList.flatMap((card) => getUnrolledInvoiceInstallments(card));

            const matchingItems = allUnrolled.filter((item) => {
              if (reportCategoryId !== 'all' && item.categoryId !== reportCategoryId) return false;
              return true;
            });

            const totalAmountAll = matchingItems.reduce((sum, i) => sum + i.installmentAmount, 0);
            const totalAVista = matchingItems
              .filter((i) => i.installmentsTotal === 1)
              .reduce((sum, i) => sum + i.installmentAmount, 0);
            const totalParcelado = matchingItems
              .filter((i) => i.installmentsTotal > 1)
              .reduce((sum, i) => sum + i.installmentAmount, 0);

            // Chart 1: Gastos por Cartão
            const gastosPorCartaoData = cards.map((c) => {
              const cardInsts = allUnrolled.filter((i) => i.purchaseId.startsWith(`var_`) && cards.find(cr => cr.id === c.id));
              const total = matchingItems
                .filter((item) => {
                  const p = variableExpenses.find((v) => v.id === item.purchaseId);
                  return p?.cardId === c.id;
                })
                .reduce((sum, item) => sum + item.installmentAmount, 0);
              return {
                name: c.name,
                valor: Math.round(total * 100) / 100,
              };
            }).filter((d) => d.valor > 0);

            // Chart 2: Gastos por Categoria
            const gastosPorCategoriaMap: Record<string, number> = {};
            matchingItems.forEach((item) => {
              const catName = categories.find((c) => c.id === item.categoryId)?.name || 'Outros';
              gastosPorCategoriaMap[catName] = (gastosPorCategoriaMap[catName] || 0) + item.installmentAmount;
            });

            const gastosPorCategoriaData = Object.entries(gastosPorCategoriaMap).map(([name, valor]) => ({
              name,
              valor: Math.round(valor * 100) / 100,
            }));

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-900">
                    <p className="text-xs font-bold text-purple-700 uppercase">Total Geral das Compras</p>
                    <p className="text-2xl font-black text-purple-900 dark:text-purple-100">{formatCurrency(totalAmountAll)}</p>
                    <p className="text-[11px] text-purple-600 font-medium">{matchingItems.length} parcelas registradas</p>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900">
                    <p className="text-xs font-bold text-emerald-700 uppercase">Compras à Vista (1x)</p>
                    <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{formatCurrency(totalAVista)}</p>
                    <p className="text-[11px] text-emerald-600 font-medium">Pagamento único na fatura</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900">
                    <p className="text-xs font-bold text-blue-700 uppercase">Compras Parceladas (&gt;1x)</p>
                    <p className="text-2xl font-black text-blue-900 dark:text-blue-100">{formatCurrency(totalParcelado)}</p>
                    <p className="text-[11px] text-blue-600 font-medium">Distribuídas em faturas futuras</p>
                  </div>
                </div>

                {/* Visual Charts Section (Requirement 8) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chart 1: Gastos por Cartão */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <span>Gastos por Cartão de Crédito</span>
                    </h4>
                    {gastosPorCartaoData.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                        Nenhum dado para exibir no gráfico.
                      </div>
                    ) : (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={gastosPorCartaoData}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="valor" fill="#820AD1" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Chart 2: Gastos por Categoria */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs mb-3 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-purple-600" />
                      <span>Distribuição dos Gastos por Categoria</span>
                    </h4>
                    {gastosPorCategoriaData.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                        Nenhum dado para exibir no gráfico.
                      </div>
                    ) : (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={gastosPorCategoriaData}
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              dataKey="valor"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {gastosPorCategoriaData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table of all matched card purchases */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-3">
                    Relatório Detalhado de Lançamentos de Cartão
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                          <th className="p-2.5">Data Compra</th>
                          <th className="p-2.5">Descrição / Estabelecimento</th>
                          <th className="p-2.5">Categoria</th>
                          <th className="p-2.5">Subcategoria</th>
                          <th className="p-2.5">Fatura / Competência</th>
                          <th className="p-2.5 text-center">Parcela</th>
                          <th className="p-2.5 text-right">Valor da Parcela</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {matchingItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400">
                              Nenhum lançamento encontrado para os filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          matchingItems.map((item) => {
                            const catName = categories.find((c) => c.id === item.categoryId)?.name || 'Geral';
                            const subName = subcategories.find((s) => s.id === item.subcategoryId)?.name || '-';

                            return (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-2.5 font-medium font-mono text-slate-600 dark:text-slate-400">
                                  {formatDate(item.date)}
                                </td>
                                <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">{item.description}</td>
                                <td className="p-2.5 font-semibold text-purple-600 dark:text-purple-400">{catName}</td>
                                <td className="p-2.5 text-slate-500">{subName}</td>
                                <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">{item.competenceStr}</td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold rounded text-[10px]">
                                    {item.installmentNumber}/{item.installmentsTotal}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-black text-slate-900 dark:text-white">
                                  {formatCurrency(item.installmentAmount)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* DEMONSTRATIVO DA FATURA MODAL */}
      {activeInvoiceCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveInvoiceCard(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Cartão & Demonstrativo */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
                style={{ backgroundColor: activeInvoiceCard.color }}
              >
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Fatura: {activeInvoiceCard.name}
                  </h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {activeInvoiceCard.network}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Banco Emissor:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {banks.find((b) => b.id === activeInvoiceCard.bankId)?.name || 'N/A'}
                  </strong>{' '}
                  • Fechamento: dia <strong>{activeInvoiceCard.closingDay}</strong> | Vencimento: dia{' '}
                  <strong>{activeInvoiceCard.dueDay}</strong>
                </p>
              </div>
            </div>

            {paymentSuccess ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-xl font-black text-slate-900 dark:text-white">Fatura Paga com Sucesso!</h4>
                <p className="text-xs text-slate-500">
                  O limite correspondente ao valor pago foi restaurado no cartão e o saldo bancário foi atualizado.
                </p>
              </div>
            ) : (
              (() => {
                const unrolled = getUnrolledInvoiceInstallments(activeInvoiceCard);

                const currentCompStr = getCurrentCardInvoiceCompetence(activeInvoiceCard);
                const activeCompStr = filterType === 'fatura_atual' ? currentCompStr : selectedCompetence;

                const filteredInstallments = unrolled
                  .filter((item) => {
                    if (filterType === 'fatura_atual') {
                      return item.competenceStr === currentCompStr;
                    }
                    if (filterType === 'competencia') {
                      return item.competenceStr === selectedCompetence;
                    }
                    if (filterType === 'periodo') {
                      return item.date >= startDate && item.date <= endDate;
                    }
                    return true;
                  })
                  .filter((item) => {
                    if (filterCategory !== 'all' && item.categoryId !== filterCategory) return false;
                    if (filterSubcategory !== 'all' && item.subcategoryId !== filterSubcategory) return false;
                    if (filterInstallmentType === 'avista' && item.installmentsTotal > 1) return false;
                    if (filterInstallmentType === 'parcelado' && item.installmentsTotal === 1) return false;
                    return true;
                  });

                const totalInvoiceValue = filteredInstallments.reduce((sum, item) => sum + item.installmentAmount, 0);

                // Quantidade de compras únicas
                const uniquePurchasesCount = new Set(filteredInstallments.map((i) => i.purchaseId)).size;

                return (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                    {/* Header Limite & Totais do Demonstrativo */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block">
                          Competência
                        </span>
                        <span className="text-base font-black text-purple-900 dark:text-purple-100">
                          {activeCompStr}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block">
                          Total da Fatura
                        </span>
                        <span className="text-base font-black text-purple-900 dark:text-purple-100">
                          {formatCurrency(totalInvoiceValue)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Limite Utilizado</span>
                        <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(activeInvoiceCard.limitUsed)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Limite Disponível</span>
                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(activeInvoiceCard.limitAvailable)}
                        </span>
                      </div>
                    </div>

                    {/* Filtros da Fatura */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl space-y-3 border border-slate-200 dark:border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Consulta por:</span>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
                          <button
                            onClick={() => setFilterType('fatura_atual')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              filterType === 'fatura_atual'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Fatura Atual ({currentCompStr})
                          </button>
                          <button
                            onClick={() => setFilterType('competencia')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              filterType === 'competencia'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Competência
                          </button>
                          <button
                            onClick={() => setFilterType('periodo')}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              filterType === 'periodo'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Período Customizado
                          </button>
                        </div>
                      </div>

                      {filterType === 'competencia' && (
                        <div className="flex items-center gap-2 pt-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400">Selecionar Mês/Ano:</label>
                          <select
                            value={selectedCompetence}
                            onChange={(e) => setSelectedCompetence(e.target.value)}
                            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                          >
                            <option value="05/2026">05/2026</option>
                            <option value="06/2026">06/2026</option>
                            <option value="07/2026">07/2026 (Atual)</option>
                            <option value="08/2026">08/2026</option>
                            <option value="09/2026">09/2026</option>
                            <option value="10/2026">10/2026</option>
                            <option value="11/2026">11/2026</option>
                            <option value="12/2026">12/2026</option>
                            <option value="01/2027">01/2027</option>
                            <option value="02/2027">02/2027</option>
                            <option value="03/2027">03/2027</option>
                            <option value="04/2027">04/2027</option>
                          </select>
                        </div>
                      )}

                      {filterType === 'periodo' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Data Início</label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Data Fim</label>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Tipo de Compra</label>
                          <select
                            value={filterInstallmentType}
                            onChange={(e) => setFilterInstallmentType(e.target.value as any)}
                            className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                          >
                            <option value="all">Todas (À Vista e Parceladas)</option>
                            <option value="avista">Apenas À Vista (1x)</option>
                            <option value="parcelado">Apenas Parceladas (&gt;1x)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Categoria</label>
                          <select
                            value={filterCategory}
                            onChange={(e) => {
                              setFilterCategory(e.target.value);
                              setFilterSubcategory('all');
                            }}
                            className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                          >
                            <option value="all">Todas as Categorias</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">Subcategoria</label>
                          <select
                            value={filterSubcategory}
                            onChange={(e) => setFilterSubcategory(e.target.value)}
                            className="w-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                          >
                            <option value="all">Todas as Subcategorias</option>
                            {subcategories
                              .filter((s) => filterCategory === 'all' || s.categoryId === filterCategory)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Tabela Detalhada das Compras da Fatura */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">
                          Demonstrativo das Compras da Fatura ({filteredInstallments.length} itens)
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Fechamento dia {activeInvoiceCard.closingDay}
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                              <th className="p-2.5">Data Compra</th>
                              <th className="p-2.5">Estabelecimento / Descrição</th>
                              <th className="p-2.5">Categoria</th>
                              <th className="p-2.5">Subcategoria</th>
                              <th className="p-2.5 text-right">Valor Original</th>
                              <th className="p-2.5 text-center">Parcela</th>
                              <th className="p-2.5 text-right">Valor Parcela</th>
                              <th className="p-2.5 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredInstallments.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="p-6 text-center text-slate-400">
                                  Nenhuma compra vinculada a esta fatura ou filtro selecionado.
                                </td>
                              </tr>
                            ) : (
                              filteredInstallments.map((inst) => {
                                const catName = categories.find((c) => c.id === inst.categoryId)?.name || 'Geral';
                                const subName = subcategories.find((s) => s.id === inst.subcategoryId)?.name || '-';
                                const origPurchase = variableExpenses.find((v) => v.id === inst.purchaseId);

                                return (
                                  <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="p-2.5 font-medium font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                      {formatDate(inst.date)}
                                    </td>
                                    <td className="p-2.5">
                                      <p className="font-bold text-slate-800 dark:text-slate-100">{inst.description}</p>
                                      {inst.notes && <p className="text-[10px] text-slate-400 italic">{inst.notes}</p>}
                                    </td>
                                    <td className="p-2.5 font-semibold text-purple-600 dark:text-purple-400">{catName}</td>
                                    <td className="p-2.5 text-slate-500">{subName}</td>
                                    <td className="p-2.5 text-right font-bold text-slate-600 dark:text-slate-400">
                                      {formatCurrency(inst.originalTotalAmount)}
                                    </td>
                                    <td className="p-2.5 text-center whitespace-nowrap">
                                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold rounded text-[10px]">
                                        {inst.installmentNumber}/{inst.installmentsTotal}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-right font-black text-purple-700 dark:text-purple-300">
                                      {formatCurrency(inst.installmentAmount)}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      {origPurchase && (
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            onClick={() => openEditPurchaseModal(origPurchase)}
                                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition-colors"
                                            title="Editar Compra"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setDeletePurchaseTarget(origPurchase)}
                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                                            title="Cancelar/Excluir Compra"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          {/* Demonstrativo Footer Summary (Requirement 6) */}
                          <tfoot>
                            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-white border-t border-slate-200 dark:border-slate-700">
                              <td colSpan={5} className="p-2.5">
                                Totais da Fatura: {uniquePurchasesCount} compras únicas | {filteredInstallments.length} parcelas
                              </td>
                              <td colSpan={3} className="p-2.5 text-right text-purple-700 dark:text-purple-300 font-black text-xs">
                                Total: {formatCurrency(totalInvoiceValue)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Formulário de Pagamento da Fatura */}
                    {totalInvoiceValue > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                          Pagar/Quitar esta Fatura ({formatCurrency(totalInvoiceValue)}):
                        </label>
                        <select
                          value={paymentBankId}
                          onChange={(e) => setPaymentBankId(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                        >
                          {banks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} (Saldo Atual: {formatCurrency(b.currentBalance)})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={handleExecutePayment}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Pagar Fatura de {activeCompStr} ({formatCurrency(totalInvoiceValue)})</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: LANÇAMENTO DE COMPRA NO CARTÃO */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPurchaseModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <span>{editingPurchase ? '✏️ Editar Compra no Cartão' : '➕ Lançar Compra no Cartão de Crédito'}</span>
            </h3>

            {purchaseFormError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{purchaseFormError}</span>
              </div>
            )}

            <form onSubmit={handlePurchaseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cartão de Crédito Utilizado</label>
                <select
                  required
                  value={pCardId}
                  onChange={(e) => setPCardId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl font-bold text-purple-700 dark:text-purple-300"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.network}) - Limite Disp: {formatCurrency(c.limitAvailable)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição do Estabelecimento / Item</label>
                <input
                  type="text"
                  required
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  placeholder="Ex: Notebook Dell, Carrefour, Passagem Aérea, Zaffari"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    required
                    value={pCategoryId}
                    onChange={(e) => {
                      setPCategoryId(e.target.value);
                      setPSubcategoryId('');
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subcategoria (Opcional)</label>
                  <select
                    value={pSubcategoryId}
                    onChange={(e) => setPSubcategoryId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Sem Subcategoria</option>
                    {subcategories
                      .filter((s) => s.categoryId === pCategoryId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data da Compra</label>
                  <input
                    type="date"
                    required
                    value={pDate}
                    onChange={(e) => setPDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={pAmount || ''}
                    onChange={(e) => setPAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nº Parcelas</label>
                  <select
                    value={pInstallments}
                    onChange={(e) => setPInstallments(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => (
                      <option key={num} value={num}>
                        {num}x {num === 1 ? '(À vista)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Automatic Installments Calculation Preview */}
              {pAmount > 0 && pCardId && (
                <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1.5 text-xs text-purple-900 dark:text-purple-200">
                  <p className="font-bold flex items-center justify-between">
                    <span>Geração Automática das Parcelas:</span>
                    <span className="text-purple-700 dark:text-purple-300 font-black">
                      {pInstallments}x de {formatCurrency(pAmount / pInstallments)}
                    </span>
                  </p>
                  {(() => {
                    const selCard = cards.find((c) => c.id === pCardId);
                    if (!selCard) return null;
                    const firstComp = getInvoiceCompetence(pDate, selCard.closingDay);
                    const lastComp = getInstallmentCompetence(pDate, selCard.closingDay, pInstallments);

                    return (
                      <p className="text-[11px] text-purple-700 dark:text-purple-300">
                        1ª Parcela na Fatura de <strong>{firstComp.competenceStr}</strong>
                        {pInstallments > 1 && (
                          <>
                            {' '}
                            • Última Parcela ({pInstallments}x) em <strong>{lastComp.competenceStr}</strong>
                          </>
                        )}
                      </p>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  value={pNotes}
                  onChange={(e) => setPNotes(e.target.value)}
                  placeholder="Garantia estendida, presente, código do pedido"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
                >
                  {editingPurchase ? 'Atualizar Compra' : 'Salvar Compra no Cartão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CADASTRO E EDIÇÃO DE CARTÃO */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCardModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingCard ? '✏️ Editar Cartão de Crédito' : '➕ Novo Cartão de Crédito'}
            </h3>

            {cardFormError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cardFormError}</span>
              </div>
            )}

            <form onSubmit={handleCardSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Cartão</label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Ex: Itaú Personnalité Black, Visa Platinum"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Banco Emissor</label>
                  <select
                    required
                    value={cardBankId}
                    onChange={(e) => setCardBankId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bandeira</label>
                  <select
                    value={cardNetwork}
                    onChange={(e) => setCardNetwork(e.target.value as CardNetwork)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Elo">Elo</option>
                    <option value="Amex">Amex</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Limite Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cardLimitTotal}
                    onChange={(e) => setCardLimitTotal(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fechamento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={cardClosingDay}
                    onChange={(e) => setCardClosingDay(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vencimento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={cardDueDay}
                    onChange={(e) => setCardDueDay(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cor Visual</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cardColor}
                      onChange={(e) => setCardColor(e.target.value)}
                      className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0"
                    />
                    <span className="font-mono text-slate-500 text-xs">{cardColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={cardStatus}
                    onChange={(e) => setCardStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Purchase Confirmation Modal */}
      {deletePurchaseTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Cancelar Lançamento no Cartão?</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Deseja realmente cancelar a compra <strong>"{deletePurchaseTarget.description}"</strong> ({formatCurrency(
                deletePurchaseTarget.amount
              )})? O limite do cartão será restaurado automaticamente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletePurchaseTarget(null)}
                className="px-3 py-1.5 font-bold text-xs text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  deleteVariableExpense(deletePurchaseTarget.id);
                  setDeletePurchaseTarget(null);
                }}
                className="px-4 py-1.5 font-bold text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl shadow"
              >
                Sim, Cancelar Compra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Delete Modal for Cards */}
      <SmartDeleteModal
        isOpen={!!deleteCardTarget}
        onClose={() => setDeleteCardTarget(null)}
        title="Excluir Cartão de Crédito"
        itemName={deleteCardTarget?.name || ''}
        moduleType="cartoes"
        hasActiveData={deleteCardTarget ? deleteCardTarget.limitUsed > 0 : false}
        onConfirm={(option) => {
          if (deleteCardTarget) {
            deleteCardSmart(deleteCardTarget.id, option as any);
          }
        }}
      />

      {/* Modal Pagar Fatura do Cartão (Citando o Banco Utilizado) */}
      {isPayInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Pagamento de Fatura do Cartão de Crédito
                </h3>
              </div>
              <button
                onClick={() => setIsPayInvoiceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {payModalError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{payModalError}</span>
              </div>
            )}

            {payModalSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Pagamento de fatura efetuado com sucesso! Limite restaurado e saldo bancário atualizado.</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Select Card */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione o Cartão de Crédito:
                </label>
                <select
                  value={payModalCardId}
                  onChange={(e) => setPayModalCardId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Fatura Atual: {formatCurrency(c.limitUsed)} (Limite Disponível: {formatCurrency(c.limitAvailable)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Payment Bank */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione o Banco Utilizado para Pagamento:
                </label>
                <select
                  value={payModalBankId}
                  onChange={(e) => setPayModalBankId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — Saldo Disponível: {formatCurrency(b.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Summary Card */}
              {(() => {
                const selCard = cards.find((c) => c.id === payModalCardId);
                const selBank = banks.find((b) => b.id === payModalBankId);
                const faturaVal = selCard ? selCard.limitUsed : 0;
                const saldoVal = selBank ? selBank.currentBalance : 0;
                const isInsufficient = saldoVal < faturaVal && faturaVal > 0;

                return (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Valor da Fatura a Pagar:</span>
                      <span className="font-black text-purple-600 dark:text-purple-400 text-sm">
                        {formatCurrency(faturaVal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Saldo Atual da Conta ({selBank?.name || 'N/A'}):</span>
                      <span className={`font-bold text-xs ${isInsufficient ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(saldoVal)}
                      </span>
                    </div>

                    {isInsufficient && (
                      <p className="text-[11px] text-red-500 font-bold mt-1">
                        ⚠️ Atenção: O saldo da conta bancária selecionada é menor que o valor da fatura.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsPayInvoiceModalOpen(false)}
                className="px-4 py-2 font-bold text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayInvoiceModal}
                disabled={payModalSuccess}
                className="px-5 py-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar Pagamento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
