import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveDocToFirestore, deleteDocFromFirestore } from './firebaseSync';
import {
  User,
  Bank,
  Card,
  CardInvoice,
  CardPurchase,
  Category,
  Subcategory,
  Income,
  FixedExpense,
  VariableExpense,
  Loan,
  Investment,
  InvestmentTransaction,
  Goal,
  Transfer,
  TrashItem,
  AuditLog,
  SystemSettings,
  SystemModule,
  UserPermissions,
  LoanInstallment,
  InstallmentStatus,
} from '../types';
import {
  hashPassword,
  verifyPassword,
  calculatePRICESchedule,
  calculateSACSchedule,
  calculateCustomSchedule,
  getCurrentDateFormatted,
  calculateExtraAmortizationDetails,
  getInvoiceCompetence,
} from '../lib/utils';
import { recalculateAllBankBalances } from '../utils/bankUtils';

// Helper full permissions object
export const FULL_MODULE_PERMISSIONS = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  import: true,
  export: true,
  manage: true,
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  dashboard: FULL_MODULE_PERMISSIONS,
  receitas: FULL_MODULE_PERMISSIONS,
  contas_fixas: FULL_MODULE_PERMISSIONS,
  contas_variaveis: FULL_MODULE_PERMISSIONS,
  bancos: FULL_MODULE_PERMISSIONS,
  cartoes: FULL_MODULE_PERMISSIONS,
  emprestimos: FULL_MODULE_PERMISSIONS,
  investimentos: FULL_MODULE_PERMISSIONS,
  metas: FULL_MODULE_PERMISSIONS,
  categorias: FULL_MODULE_PERMISSIONS,
  subcategorias: FULL_MODULE_PERMISSIONS,
  relatorios: FULL_MODULE_PERMISSIONS,
  usuarios: FULL_MODULE_PERMISSIONS,
  configuracoes: FULL_MODULE_PERMISSIONS,
};

export const USER_PERMISSIONS: UserPermissions = {
  dashboard: { ...FULL_MODULE_PERMISSIONS, manage: false },
  receitas: FULL_MODULE_PERMISSIONS,
  contas_fixas: FULL_MODULE_PERMISSIONS,
  contas_variaveis: FULL_MODULE_PERMISSIONS,
  bancos: { ...FULL_MODULE_PERMISSIONS, create: false, edit: false, delete: false, manage: false },
  cartoes: { ...FULL_MODULE_PERMISSIONS, create: false, edit: false, delete: false, manage: false },
  emprestimos: { ...FULL_MODULE_PERMISSIONS, create: false, edit: false, delete: false, manage: false },
  investimentos: { ...FULL_MODULE_PERMISSIONS, create: false, edit: false, delete: false, manage: false },
  metas: FULL_MODULE_PERMISSIONS,
  categorias: { ...FULL_MODULE_PERMISSIONS, create: false, edit: false, delete: false },
  subcategorias: { ...FULL_MODULE_PERMISSIONS, create: false, edit: false, delete: false },
  relatorios: { ...FULL_MODULE_PERMISSIONS, manage: false },
  usuarios: { view: false, create: false, edit: false, delete: false, import: false, export: false, manage: false },
  configuracoes: { view: false, create: false, edit: false, delete: false, import: false, export: false, manage: false },
};

// Seed Users
const INITIAL_ADMIN_PASSWORD_HASH = hashPassword('Snoop123@');

const INITIAL_USERS: User[] = [
  {
    id: 'user_admin_01',
    username: 'davischio',
    name: 'Davi Schio (Admin)',
    email: 'davi.schio007@gmail.com',
    role: 'Administrador',
    status: 'Ativo',
    passwordHash: INITIAL_ADMIN_PASSWORD_HASH,
    pin: '1234',
    permissions: ADMIN_PERMISSIONS,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user_regular_02',
    username: 'usuario.comum',
    name: 'Usuário Comum',
    email: 'usuario@financeiro.com',
    role: 'Usuário Comum',
    status: 'Ativo',
    passwordHash: hashPassword('Usuario123@'),
    pin: '0000',
    permissions: USER_PERMISSIONS,
    createdAt: '2026-02-10T00:00:00.000Z',
  },
];

// Seed Banks
const INITIAL_BANKS: Bank[] = [
  {
    id: 'bank_itau',
    name: 'Itaú Unibanco',
    institution: 'Banco Itaú S.A.',
    agency: '1234',
    account: '56789-0',
    type: 'Corrente',
    initialBalance: 10000,
    currentBalance: 14850.00,
    color: '#EC7000',
    icon: 'Landmark',
    status: 'Ativo',
    archived: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bank_nubank',
    name: 'Nu Pagamentos',
    institution: 'Nu Financeira',
    agency: '0001',
    account: '987654-3',
    type: 'Pagamentos',
    initialBalance: 5000,
    currentBalance: 8420.50,
    color: '#820AD1',
    icon: 'Wallet',
    status: 'Ativo',
    archived: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bank_btg',
    name: 'BTG Pactual',
    institution: 'Banco BTG Pactual S.A.',
    agency: '0001',
    account: '334455-1',
    type: 'Investimentos',
    initialBalance: 30000,
    currentBalance: 45200.00,
    color: '#001E62',
    icon: 'TrendingUp',
    status: 'Ativo',
    archived: false,
    updatedAt: new Date().toISOString(),
  },
];

// Seed Cards
const INITIAL_CARDS: Card[] = [
  {
    id: 'card_nubank_uv',
    name: 'Nubank Ultravioleta',
    bankId: 'bank_nubank',
    network: 'Mastercard',
    limitTotal: 25000,
    limitUsed: 3840.00,
    limitAvailable: 21160.00,
    closingDay: 15,
    dueDay: 22,
    color: '#820AD1',
    icon: 'CreditCard',
    status: 'Ativo',
    archived: false,
  },
  {
    id: 'card_itau_personnalite',
    name: 'Itaú Personnalité Black',
    bankId: 'bank_itau',
    network: 'Visa',
    limitTotal: 40000,
    limitUsed: 5120.00,
    limitAvailable: 34880.00,
    closingDay: 10,
    dueDay: 18,
    color: '#1E293B',
    icon: 'CreditCard',
    status: 'Ativo',
    archived: false,
  },
];

// Seed Categories & Subcategories
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_moradia', name: 'Moradia', type: 'Despesa', color: '#EF4444', icon: 'Home', isSystem: true, archived: false },
  { id: 'cat_mercado', name: 'Alimentação & Mercado', type: 'Despesa', color: '#F59E0B', icon: 'ShoppingCart', isSystem: true, archived: false },
  { id: 'cat_transporte', name: 'Transporte', type: 'Despesa', color: '#3B82F6', icon: 'Car', isSystem: true, archived: false },
  { id: 'cat_saude', name: 'Saúde & Bem-Estar', type: 'Despesa', color: '#10B981', icon: 'HeartPulse', isSystem: true, archived: false },
  { id: 'cat_lazer', name: 'Lazer & Viagens', type: 'Despesa', color: '#8B5CF6', icon: 'Smile', isSystem: true, archived: false },
  { id: 'cat_educacao', name: 'Educação', type: 'Despesa', color: '#6366F1', icon: 'GraduationCap', isSystem: true, archived: false },
  { id: 'cat_receitas', name: 'Receitas & Rendimentos', type: 'Receita', color: '#059669', icon: 'DollarSign', isSystem: true, archived: false },
  { id: 'cat_investimentos', name: 'Investimentos', type: 'Despesa', color: '#0284C7', icon: 'PieChart', isSystem: true, archived: false },
  { id: 'cat_emprestimos', name: 'Empréstimos & Financiamentos', type: 'Despesa', color: '#DC2626', icon: 'Landmark', isSystem: true, archived: false },
  { id: 'cat_outros', name: 'Outros / Diversos', type: 'Ambos', color: '#64748B', icon: 'MoreHorizontal', isSystem: true, archived: false },
];

const INITIAL_SUBCATEGORIES: Subcategory[] = [
  { id: 'sub_aluguel', categoryId: 'cat_moradia', name: 'Aluguel & Condomínio', archived: false },
  { id: 'sub_energia', categoryId: 'cat_moradia', name: 'Energia Elétrica', archived: false },
  { id: 'sub_internet', categoryId: 'cat_moradia', name: 'Internet Fibra', archived: false },
  { id: 'sub_iptu', categoryId: 'cat_moradia', name: 'IPTU & Taxas', archived: false },
  { id: 'sub_supermercado', categoryId: 'cat_mercado', name: 'Supermercado', archived: false },
  { id: 'sub_restaurante', categoryId: 'cat_mercado', name: 'Restaurante & Delivery', archived: false },
  { id: 'sub_combustivel', categoryId: 'cat_transporte', name: 'Combustível', archived: false },
  { id: 'sub_ipva', categoryId: 'cat_transporte', name: 'IPVA & Seguro Auto', archived: false },
  { id: 'sub_plano_saude', categoryId: 'cat_saude', name: 'Plano de Saúde', archived: false },
  { id: 'sub_farmacia', categoryId: 'cat_saude', name: 'Farmácia & Remédios', archived: false },
  { id: 'sub_academia', categoryId: 'cat_saude', name: 'Academia & Esportes', archived: false },
  { id: 'sub_salario', categoryId: 'cat_receitas', name: 'Salário Fixo', archived: false },
  { id: 'sub_freelance', categoryId: 'cat_receitas', name: 'Projetos Freelance', archived: false },
  { id: 'sub_dividendos', categoryId: 'cat_receitas', name: 'Dividendos & JCP', archived: false },
];

// Seed Incomes
const INITIAL_INCOMES: Income[] = [
  {
    id: 'inc_salario_julho',
    description: 'Salário Mensal Executivo',
    categoryId: 'cat_receitas',
    subcategoryId: 'sub_salario',
    bankId: 'bank_itau',
    amount: 18500.00,
    date: '2026-07-05',
    isRecurring: true,
    notes: 'Pagamento referente ao mês de Julho',
    archived: false,
    createdAt: '2026-07-05T09:00:00.000Z',
    createdBy: 'davischio',
  },
  {
    id: 'inc_freelance_julho',
    description: 'Consultoria de Arquitetura de Software',
    categoryId: 'cat_receitas',
    subcategoryId: 'sub_freelance',
    bankId: 'bank_nubank',
    amount: 4200.00,
    date: '2026-07-15',
    isRecurring: false,
    notes: 'Projeto de consultoria para cliente internacional',
    archived: false,
    createdAt: '2026-07-15T14:30:00.000Z',
    createdBy: 'davischio',
  },
];

// Seed Fixed Expenses
const INITIAL_FIXED_EXPENSES: FixedExpense[] = [
  {
    id: 'fix_aluguel',
    description: 'Aluguel do Apartamento Residencial',
    categoryId: 'cat_moradia',
    subcategoryId: 'sub_aluguel',
    amount: 3800.00,
    dueDay: 10,
    periodicity: 'Mensal',
    paymentMethod: 'Pix',
    bankId: 'bank_itau',
    status: 'Pago',
    archived: false,
    lastPaidDate: '2026-07-09',
  },
  {
    id: 'fix_plano_saude',
    description: 'Plano de Saúde Unimed Executivo',
    categoryId: 'cat_saude',
    subcategoryId: 'sub_plano_saude',
    amount: 1250.00,
    dueDay: 15,
    periodicity: 'Mensal',
    paymentMethod: 'Cartão',
    cardId: 'card_itau_personnalite',
    status: 'Pago',
    archived: false,
    lastPaidDate: '2026-07-14',
  },
  {
    id: 'fix_internet',
    description: 'Internet Fibra Óptica 600 Mega',
    categoryId: 'cat_moradia',
    subcategoryId: 'sub_internet',
    amount: 180.00,
    dueDay: 5,
    periodicity: 'Mensal',
    paymentMethod: 'Cartão',
    cardId: 'card_nubank_uv',
    status: 'Pago',
    archived: false,
    lastPaidDate: '2026-07-04',
  },
];

// Seed Variable Expenses
const INITIAL_VARIABLE_EXPENSES: VariableExpense[] = [
  {
    id: 'var_mercado_semana1',
    description: 'Compras Quinzenais Carrefour',
    categoryId: 'cat_mercado',
    subcategoryId: 'sub_supermercado',
    amount: 1450.00,
    date: '2026-07-10',
    paymentMethod: 'Cartão',
    cardId: 'card_nubank_uv',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_apple_store',
    description: 'Assinatura Apple Services & iCloud',
    categoryId: 'cat_outros',
    subcategoryId: 'sub_internet',
    amount: 350.00,
    date: '2026-07-12',
    paymentMethod: 'Cartão',
    cardId: 'card_nubank_uv',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_supermercado_pao_acucar',
    description: 'Hortifruti & Orgânicos Pão de Açúcar',
    categoryId: 'cat_mercado',
    subcategoryId: 'sub_supermercado',
    amount: 860.00,
    date: '2026-07-14',
    paymentMethod: 'Cartão',
    cardId: 'card_nubank_uv',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_restaurante_outback',
    description: 'Jantar Executivo Outback Steakhouse',
    categoryId: 'cat_mercado',
    subcategoryId: 'sub_restaurante',
    amount: 420.00,
    date: '2026-07-15',
    paymentMethod: 'Cartão',
    cardId: 'card_nubank_uv',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_posto_gasolina',
    description: 'Abastecimento Ipiranga Grid',
    categoryId: 'cat_transporte',
    subcategoryId: 'sub_combustivel',
    amount: 280.00,
    date: '2026-07-16',
    paymentMethod: 'Cartão',
    cardId: 'card_nubank_uv',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_farmacia_drogasil',
    description: 'Medicamentos & Cuidados Drogasil',
    categoryId: 'cat_saude',
    subcategoryId: 'sub_farmacia',
    amount: 300.00,
    date: '2026-07-17',
    paymentMethod: 'Cartão',
    cardId: 'card_nubank_uv',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_combustivel_posto',
    description: 'Abastecimento Posto Shell V-Power',
    categoryId: 'cat_transporte',
    subcategoryId: 'sub_combustivel',
    amount: 320.00,
    date: '2026-07-18',
    paymentMethod: 'Cartão',
    cardId: 'card_itau_personnalite',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_passagem_aerea_latam',
    description: 'Passagens Aéreas Latam Brasil',
    categoryId: 'cat_lazer',
    subcategoryId: 'sub_freelance',
    amount: 1850.00,
    date: '2026-07-08',
    paymentMethod: 'Cartão',
    cardId: 'card_itau_personnalite',
    status: 'Pago',
    archived: false,
    installmentsCount: 3,
    currentInstallment: 1,
    installmentAmount: 616.66,
  },
  {
    id: 'var_hotel_pousada',
    description: 'Reserva Hospedagem Booking.com',
    categoryId: 'cat_lazer',
    subcategoryId: 'sub_freelance',
    amount: 920.00,
    date: '2026-07-11',
    paymentMethod: 'Cartão',
    cardId: 'card_itau_personnalite',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_vestuario_zara',
    description: 'Roupas & Acessórios Zara Shopping',
    categoryId: 'cat_outros',
    subcategoryId: 'sub_freelance',
    amount: 480.00,
    date: '2026-07-13',
    paymentMethod: 'Cartão',
    cardId: 'card_itau_personnalite',
    status: 'Pago',
    archived: false,
  },
  {
    id: 'var_uber_viagens',
    description: 'Corridas Executivas Uber',
    categoryId: 'cat_transporte',
    subcategoryId: 'sub_combustivel',
    amount: 300.00,
    date: '2026-07-19',
    paymentMethod: 'Cartão',
    cardId: 'card_itau_personnalite',
    status: 'Pago',
    archived: false,
  },
];

// Seed Loans (PRICE and SAC)
const PRICE_INST = calculatePRICESchedule(30000, 1.4, 48, '2025-06-01', 0, 0);
PRICE_INST.forEach((inst) => {
  if (inst.number <= 12) {
    inst.status = 'Paga';
    inst.paidAmount = inst.amount;
    inst.paidDate = `2025-${String((inst.number % 12) + 1).padStart(2, '0')}-05`;
  }
});

const SAC_INST = calculateSACSchedule(250000, 1.1, 360, '2024-06-01', 0, 0);
SAC_INST.forEach((inst) => {
  if (inst.number <= 24) {
    inst.status = 'Paga';
    inst.paidAmount = inst.amount;
    inst.paidDate = `2024-${String((inst.number % 12) + 1).padStart(2, '0')}-10`;
  }
});

const INITIAL_LOANS: Loan[] = [
  {
    id: 'loan_consignado_fina',
    bankId: 'bank_itau',
    contractNumber: 'CT-889410-2025',
    type: 'Consignado',
    contractedAmount: 30000,
    netAmountReceived: 30000,
    interestRateMonthly: 1.4,
    interestRateYearly: 18.16,
    cetRateYearly: 19.80,
    iofAmount: 0,
    insuranceAmount: 0,
    feesAmount: 0,
    amortizationSystem: 'PRICE',
    installmentsTotal: 48,
    installmentsPaid: 12,
    installmentAmount: 864.20,
    outstandingBalance: 22500.00,
    paidAmount: 10370.40,
    paidInterest: 4320.00,
    paidAmortization: 6050.40,
    status: 'Ativo',
    consignadoDetails: {
      iofTotal: 0,
      insuranceTotal: 0,
      monthlyFee: 15,
    },
    installments: PRICE_INST,
    archived: false,
  },
  {
    id: 'loan_financiamento_caixa',
    bankId: 'bank_itau',
    contractNumber: 'CT-104928-2024',
    type: 'Financiamento',
    customType: 'Financiamento Imobiliário',
    contractedAmount: 250000,
    netAmountReceived: 250000,
    interestRateMonthly: 1.1,
    interestRateYearly: 14.03,
    cetRateYearly: 15.20,
    iofAmount: 0,
    insuranceAmount: 0,
    feesAmount: 0,
    amortizationSystem: 'SAC',
    installmentsTotal: 360,
    installmentsPaid: 24,
    installmentAmount: 3444.44,
    outstandingBalance: 233333.33,
    paidAmount: 82666.56,
    paidInterest: 66000.00,
    paidAmortization: 16666.56,
    status: 'Ativo',
    installments: SAC_INST,
    archived: false,
  },
];

// Seed Investments
const INITIAL_INVESTMENTS: Investment[] = [
  {
    id: 'inv_tesouro_selic',
    institution: 'BTG Pactual',
    type: 'Tesouro Direto',
    appliedAmount: 25000.00,
    currentAmount: 28450.00,
    yieldPercent: 13.75,
    yieldAccumulated: 3450.00,
    liquidity: 'Diária',
    applicationDate: '2025-01-15',
    maturityDate: '2029-03-01',
    archived: false,
    transactions: [
      { id: 'inv_tx_1', investmentId: 'inv_tesouro_selic', type: 'Aporte', amount: 25000, date: '2025-01-15', notes: 'Aporte inicial reserva' },
      { id: 'inv_tx_2', investmentId: 'inv_tesouro_selic', type: 'Rendimento', amount: 3450, date: '2026-07-01', notes: 'Rendimento acumulado Selic' },
    ],
  },
  {
    id: 'inv_fii_hglg11',
    institution: 'BTG Pactual',
    type: 'FII',
    appliedAmount: 30000.00,
    currentAmount: 34200.00,
    yieldPercent: 11.20,
    yieldAccumulated: 4200.00,
    liquidity: 'D+1',
    applicationDate: '2024-11-10',
    archived: false,
    transactions: [
      { id: 'inv_tx_3', investmentId: 'inv_fii_hglg11', type: 'Aporte', amount: 30000, date: '2024-11-10', notes: 'Compra 180 cotas HGLG11' },
    ],
  },
  {
    id: 'inv_cdb_110',
    institution: 'BTG Pactual',
    type: 'CDB',
    appliedAmount: 20000.00,
    currentAmount: 22100.00,
    yieldPercent: 12.10,
    yieldAccumulated: 2100.00,
    liquidity: 'Diária',
    applicationDate: '2025-05-20',
    maturityDate: '2027-05-20',
    archived: false,
    transactions: [
      { id: 'inv_tx_4', investmentId: 'inv_cdb_110', type: 'Aporte', amount: 20000, date: '2025-05-20', notes: 'Aporte CDB 110% CDI' },
    ],
  },
];

// Seed Goals
const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal_reserva',
    name: 'Reserva de Emergência 6 Meses',
    category: 'Reserva Emergência',
    targetAmount: 60000,
    currentAmount: 45000,
    targetDate: '2026-12-31',
    color: '#10B981',
    archived: false,
  },
  {
    id: 'goal_carro',
    name: 'Troca de Veículo SUV',
    category: 'Carro',
    targetAmount: 120000,
    currentAmount: 55000,
    targetDate: '2027-06-30',
    color: '#3B82F6',
    archived: false,
  },
  {
    id: 'goal_viagem',
    name: 'Viagem em Família para Europa',
    category: 'Viagem',
    targetAmount: 35000,
    currentAmount: 18000,
    targetDate: '2027-09-15',
    color: '#8B5CF6',
    archived: false,
  },
];

// Seed Audit Logs
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_01',
    timestamp: new Date().toISOString(),
    userId: 'user_admin_01',
    userName: 'davischio',
    userRole: 'Administrador',
    module: 'usuarios',
    action: 'Inclusão',
    details: 'Verificação automática e criação do usuário administrador davischio',
    ip: '127.0.0.1',
  },
];

interface FinancialStore {
  // Current session
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (username: string, pass: string) => boolean;
  logout: () => void;

  // State slices
  users: User[];
  banks: Bank[];
  cards: Card[];
  cardInvoices: CardInvoice[];
  categories: Category[];
  subcategories: Subcategory[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  loans: Loan[];
  investments: Investment[];
  goals: Goal[];
  transfers: Transfer[];
  trashBin: TrashItem[];
  auditLogs: AuditLog[];
  settings: SystemSettings;

  // Actions - Users
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string, permanent?: boolean) => void;
  resetUserPassword: (id: string, newPass: string) => void;

  // Actions - Banks
  recalculateBankBalances: () => void;
  addBank: (bank: Omit<Bank, 'id' | 'updatedAt' | 'archived'>) => void;
  updateBank: (id: string, updates: Partial<Bank>) => void;
  deleteBankSmart: (id: string, mode: 'transfer' | 'deactivate' | 'delete', targetBankId?: string) => void;

  // Actions - Cards & Invoices
  addCard: (card: Omit<Card, 'id' | 'limitAvailable' | 'limitUsed' | 'archived'>) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCardSmart: (id: string, mode: 'deactivate' | 'delete') => boolean;
  payCardInvoice: (cardId: string, month: number, year: number, fromBankId: string) => boolean;

  // Actions - Categories & Subcategories
  addCategory: (cat: Omit<Category, 'id' | 'archived'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  deleteCategorySmart: (id: string, reassignCategoryId?: string) => void;
  addSubcategory: (sub: Omit<Subcategory, 'id' | 'archived'>) => void;
  updateSubcategory: (id: string, updates: Partial<Subcategory>) => void;
  deleteSubcategory: (id: string) => void;

  // Actions - Incomes
  addIncome: (income: Omit<Income, 'id' | 'archived' | 'createdAt' | 'createdBy'>) => void;
  updateIncome: (id: string, updates: Partial<Income>) => void;
  deleteIncome: (id: string) => void;

  // Actions - Fixed & Variable Expenses
  addFixedExpense: (exp: Omit<FixedExpense, 'id' | 'archived'>) => void;
  updateFixedExpense: (id: string, updates: Partial<FixedExpense>) => void;
  deleteFixedExpense: (id: string) => void;
  addVariableExpense: (exp: Omit<VariableExpense, 'id' | 'archived'>) => void;
  updateVariableExpense: (id: string, updates: Partial<VariableExpense>) => void;
  deleteVariableExpense: (id: string) => void;

  // Actions - Loans
  addLoan: (loan: Omit<Loan, 'id' | 'archived'>) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  deleteLoanSmart: (id: string) => boolean;
  payLoanInstallment: (
    loanId: string,
    installmentNumber: number,
    paymentSourceId?: string
  ) => { success: boolean; error?: string };
  updateLoanInstallmentStatus: (
    loanId: string,
    installmentNumber: number,
    newStatus: InstallmentStatus,
    paidAmountVal?: number,
    paymentSourceId?: string
  ) => { success: boolean; error?: string };
  earlyPayoffLoan: (
    loanId: string,
    payUntilInstallment: number,
    paymentSourceId?: string
  ) => { success: boolean; error?: string };
  applyExtraAmortizationLoan: (
    loanId: string,
    extraAmount: number,
    extraDate: string,
    mode: 'reduce_term' | 'reduce_installment',
    paymentSourceId?: string
  ) => { success: boolean; error?: string };
  deleteLoan: (id: string) => void;

  // Actions - Investments
  addInvestment: (inv: Omit<Investment, 'id' | 'archived' | 'transactions'>) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  addInvestmentTransaction: (investmentId: string, tx: Omit<InvestmentTransaction, 'id' | 'investmentId'>) => void;
  depositInvestment: (investmentId: string, amount: number, fromBankId: string) => void;
  withdrawInvestment: (investmentId: string, amount: number, toBankId: string) => void;
  deleteInvestment: (id: string) => void;
  recalculateInvestmentYields: (marketRates?: { cdi?: number; selic?: number; ipca?: number }) => void;

  // Actions - Goals
  addGoal: (goal: Omit<Goal, 'id' | 'archived'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  depositToGoal: (goalId: string, amount: number, fromBankId: string) => void;
  contributeToGoal: (goalId: string, amount: number, fromBankId?: string) => void;
  deleteGoal: (id: string) => void;

  // Actions - Transfers
  addTransfer: (transfer: Omit<Transfer, 'id' | 'archived'>) => void;

  // Actions - Users & Auth
  toggleBlockUser: (id: string) => void;
  changeOwnPassword: (currentPass: string, newPass: string) => boolean;

  // Actions - Trash Bin & Audit
  restoreTrashItem: (id: string) => void;
  purgeTrashItem: (id: string) => void;
  restoreArchivedItem: (id: string) => void;
  permanentlyDeleteItem: (id: string) => void;
  clearTrashBin: () => void;
  logAudit: (module: SystemModule, action: any, details: string, previousValue?: string, newValue?: string) => void;

  // Actions - Settings & Backup
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  exportBackup: () => void;
  importBackup: (jsonData: string) => boolean;
  restoreBackupFromJSON: (jsonData: string) => boolean;
  resetToFactoryData: () => void;
  resetToInitialSeed: () => void;
}

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      currentUser: null, // Require login on access
      users: INITIAL_USERS,
      banks: INITIAL_BANKS,
      cards: INITIAL_CARDS,
      cardInvoices: [],
      categories: INITIAL_CATEGORIES,
      subcategories: INITIAL_SUBCATEGORIES,
      incomes: INITIAL_INCOMES,
      fixedExpenses: INITIAL_FIXED_EXPENSES,
      variableExpenses: INITIAL_VARIABLE_EXPENSES,
      loans: INITIAL_LOANS,
      investments: INITIAL_INVESTMENTS,
      goals: INITIAL_GOALS,
      transfers: [],
      trashBin: [],
      auditLogs: INITIAL_AUDIT_LOGS,
      settings: {
        theme: 'light',
        autoBackup: true,
        backupFrequency: 'daily',
        trashRetentionDays: 90,
        requirePin: false,
        pinCode: '1234',
        defaultCurrency: 'BRL',
        lastBackupDate: new Date().toISOString(),
      },

      setCurrentUser: (user) => set({ currentUser: user }),

      login: (username, pass) => {
        const user = get().users.find(
          (u) => u.username.toLowerCase() === username.toLowerCase() && u.status === 'Ativo'
        );
        if (user && verifyPassword(pass, user.passwordHash)) {
          const updatedUser = { ...user, lastLogin: new Date().toISOString() };
          set((state) => ({
            currentUser: updatedUser,
            users: state.users.map((u) => (u.id === user.id ? updatedUser : u)),
          }));
          get().logAudit('usuarios', 'Login', `Usuário ${username} realizou login com sucesso`);
          return true;
        }
        return false;
      },

      logout: () => set({ currentUser: null }),

      // Audit Logging Helper
      logAudit: (module, action, details, previousValue, newValue) => {
        const curUser = get().currentUser;
        const newLog: AuditLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          userId: curUser?.id || 'system',
          userName: curUser?.username || 'Sistema',
          userRole: curUser?.role || 'Administrador',
          module,
          action,
          details,
          previousValue: previousValue ?? null,
          newValue: newValue ?? null,
          ip: '127.0.0.1',
        };
        set((state) => ({ auditLogs: [newLog, ...state.auditLogs] }));
        saveDocToFirestore('auditLogs', newLog);
      },

      // Users
      addUser: (userData) => {
        const id = `user_${Date.now()}`;
        const newUser: User = {
          ...userData,
          id,
          passwordHash: hashPassword(userData.passwordHash || 'Mudar123@'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, newUser] }));
        saveDocToFirestore('users', newUser);
        get().logAudit('usuarios', 'Inclusão', `Usuário ${newUser.username} criado com perfil ${newUser.role}`);
      },

      updateUser: (id, updates) => {
        const oldUser = get().users.find((u) => u.id === id);
        const updatedPassHash = updates.passwordHash ? hashPassword(updates.passwordHash) : undefined;
        const updatedUser = oldUser ? { ...oldUser, ...updates, passwordHash: updatedPassHash || oldUser.passwordHash } : null;
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? (updatedUser as User) : u)),
        }));
        if (updatedUser) saveDocToFirestore('users', updatedUser);
        get().logAudit('usuarios', 'Alteração', `Usuário ${oldUser?.username} atualizado`, JSON.stringify(oldUser), JSON.stringify(updates));
      },

      deleteUser: (id) => {
        const user = get().users.find((u) => u.id === id);
        if (!user) return;
        deleteDocFromFirestore('users', id);
        set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
        get().logAudit('usuarios', 'Exclusão', `Usuário ${user.username} excluído definitivamente`);
      },

      resetUserPassword: (id, newPass) => {
        const user = get().users.find((u) => u.id === id);
        if (!user) return;
        const newHash = hashPassword(newPass);
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, passwordHash: newHash } : u)),
        }));
        get().logAudit('usuarios', 'Alteração', `Senha do usuário ${user.username} foi resetada pelo Administrador`);
      },

      // Banks
      recalculateBankBalances: () => {
        const updatedBanks = recalculateAllBankBalances(get());
        set({ banks: updatedBanks });
        updatedBanks.forEach((b) => saveDocToFirestore('banks', b));
      },

      addBank: (bankData) => {
        const newBank: Bank = {
          ...bankData,
          id: `bank_${Date.now()}`,
          archived: false,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ banks: [...state.banks, newBank] }));
        saveDocToFirestore('banks', newBank);
        get().recalculateBankBalances();
        get().logAudit('bancos', 'Inclusão', `Banco ${newBank.name} cadastrado com saldo R$ ${newBank.initialBalance}`);
      },

      updateBank: (id, updates) => {
        const bank = get().banks.find((b) => b.id === id);
        const updated = bank ? { ...bank, ...updates, updatedAt: new Date().toISOString() } : null;
        set((state) => ({
          banks: state.banks.map((b) => (b.id === id ? (updated as Bank) : b)),
        }));
        if (updated) {
          saveDocToFirestore('banks', updated);
          get().recalculateBankBalances();
        }
        get().logAudit('bancos', 'Alteração', `Dados do banco ID ${id} atualizados`);
      },

      deleteBankSmart: (id, mode, targetBankId) => {
        const bank = get().banks.find((b) => b.id === id);
        if (!bank) return;

        if (mode === 'deactivate') {
          const updated = { ...bank, status: 'Inativo' as const };
          set((state) => ({
            banks: state.banks.map((b) => (b.id === id ? updated : b)),
          }));
          saveDocToFirestore('banks', updated);
          get().logAudit('bancos', 'Alteração', `Banco ${bank.name} desativado`);
        } else if (mode === 'transfer' && targetBankId) {
          deleteDocFromFirestore('banks', id);
          set((state) => ({
            incomes: state.incomes.map((i) => (i.bankId === id ? { ...i, bankId: targetBankId } : i)),
            fixedExpenses: state.fixedExpenses.map((f) => (f.bankId === id ? { ...f, bankId: targetBankId } : f)),
            variableExpenses: state.variableExpenses.map((v) => (v.bankId === id ? { ...v, bankId: targetBankId } : v)),
            banks: state.banks.filter((b) => b.id !== id),
          }));
          get().recalculateBankBalances();
          get().logAudit('bancos', 'Exclusão', `Banco ${bank.name} removido definitivamente e movimentações transferidas para o banco ID ${targetBankId}`);
        } else {
          deleteDocFromFirestore('banks', id);
          set((state) => ({
            banks: state.banks.filter((b) => b.id !== id),
          }));
          get().recalculateBankBalances();
          get().logAudit('bancos', 'Exclusão', `Banco ${bank.name} excluído definitivamente`);
        }
      },

      // Cards
      addCard: (cardData) => {
        const newCard: Card = {
          ...cardData,
          id: `card_${Date.now()}`,
          limitUsed: 0,
          limitAvailable: cardData.limitTotal,
          archived: false,
        };
        set((state) => ({ cards: [...state.cards, newCard] }));
        saveDocToFirestore('cards', newCard);
        get().logAudit('cartoes', 'Inclusão', `Cartão ${newCard.name} cadastrado com limite de R$ ${newCard.limitTotal}`);
      },

      updateCard: (id, updates) => {
        const oldCard = get().cards.find((c) => c.id === id);
        if (!oldCard) return;
        const limitTotal = updates.limitTotal ?? oldCard.limitTotal;
        const limitUsed = updates.limitUsed ?? oldCard.limitUsed;
        const limitAvailable = limitTotal - limitUsed;
        const updatedCard = { ...oldCard, ...updates, limitTotal, limitUsed, limitAvailable };

        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? updatedCard : c)),
        }));
        saveDocToFirestore('cards', updatedCard);
        get().logAudit('cartoes', 'Alteração', `Cartão ID ${id} atualizado`);
      },

      deleteCardSmart: (id, mode) => {
        const card = get().cards.find((c) => c.id === id);
        if (!card) return false;

        if (mode === 'deactivate') {
          const deactivatedCard = { ...card, status: 'Inativo' as const };
          set((state) => ({
            cards: state.cards.map((c) => (c.id === id ? deactivatedCard : c)),
          }));
          saveDocToFirestore('cards', deactivatedCard);
          get().logAudit('cartoes', 'Alteração', `Cartão ${card.name} desativado`);
        } else {
          deleteDocFromFirestore('cards', id);
          set((state) => ({
            cards: state.cards.filter((c) => c.id !== id),
          }));
          get().logAudit('cartoes', 'Exclusão', `Cartão ${card.name} excluído definitivamente`);
        }
        return true;
      },

      payCardInvoice: (cardId, month, year, fromBankId) => {
        const card = get().cards.find((c) => c.id === cardId);
        const bank = get().banks.find((b) => b.id === fromBankId);
        if (!card || !bank) return false;

        const invoiceAmount = card.limitUsed;
        if (invoiceAmount <= 0) return true;

        // Reset card used limit
        const updatedCard = { ...card, limitUsed: 0, limitAvailable: card.limitTotal };
        set((state) => ({
          cards: state.cards.map((c) => (c.id === cardId ? updatedCard : c)),
        }));
        saveDocToFirestore('cards', updatedCard);

        // Record variable expense for the invoice payment
        const defaultCatId =
          get().categories.find((c) => c.name.toLowerCase().includes('cartão') || c.name.toLowerCase().includes('fatura'))?.id ||
          get().categories[0]?.id ||
          'cat_despesas';

        get().addVariableExpense({
          description: `Pagamento Fatura ${card.name}`,
          categoryId: defaultCatId,
          amount: invoiceAmount,
          date: getCurrentDateFormatted(),
          paymentMethod: 'Débito',
          bankId: fromBankId,
          status: 'Pago',
          notes: `Pagamento de fatura do cartão ${card.name}`,
        });

        get().logAudit(
          'cartoes',
          'Pagamento',
          `Fatura do cartão ${card.name} no valor de R$ ${invoiceAmount} paga utilizando a conta ${bank.name}`
        );

        return true;
      },

      // Categories
      addCategory: (catData) => {
        const newCat: Category = {
          ...catData,
          id: `cat_${Date.now()}`,
          archived: false,
        };
        set((state) => ({ categories: [...state.categories, newCat] }));
        saveDocToFirestore('categories', newCat);
        get().logAudit('categorias', 'Inclusão', `Categoria ${newCat.name} criada`);
      },

      updateCategory: (id, updates) => {
        const cat = get().categories.find((c) => c.id === id);
        const updated = cat ? { ...cat, ...updates } : null;
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? (updated as Category) : c)),
        }));
        if (updated) saveDocToFirestore('categories', updated);
        get().logAudit('categorias', 'Alteração', `Categoria ID ${id} atualizada`);
      },

      deleteCategorySmart: (id, reassignCategoryId) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) return;

        deleteDocFromFirestore('categories', id);
        if (reassignCategoryId) {
          set((state) => ({
            incomes: state.incomes.map((i) => (i.categoryId === id ? { ...i, categoryId: reassignCategoryId } : i)),
            fixedExpenses: state.fixedExpenses.map((f) => (f.categoryId === id ? { ...f, categoryId: reassignCategoryId } : f)),
            variableExpenses: state.variableExpenses.map((v) =>
              v.categoryId === id ? { ...v, categoryId: reassignCategoryId } : v
            ),
          }));
        }

        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));

        get().logAudit('categorias', 'Exclusão', `Categoria ${cat.name} excluída definitivamente`);
      },

      addSubcategory: (subData) => {
        const newSub: Subcategory = {
          ...subData,
          id: `sub_${Date.now()}`,
          archived: false,
        };
        set((state) => ({ subcategories: [...state.subcategories, newSub] }));
        saveDocToFirestore('subcategories', newSub);
        get().logAudit('subcategorias', 'Inclusão', `Subcategoria ${newSub.name} criada`);
      },

      updateSubcategory: (id, updates) => {
        const sub = get().subcategories.find((s) => s.id === id);
        const updated = sub ? { ...sub, ...updates } : null;
        set((state) => ({
          subcategories: state.subcategories.map((s) => (s.id === id ? (updated as Subcategory) : s)),
        }));
        if (updated) saveDocToFirestore('subcategories', updated);
      },

      deleteSubcategory: (id) => {
        const sub = get().subcategories.find((s) => s.id === id);
        if (!sub) return;
        deleteDocFromFirestore('subcategories', id);
        set((state) => ({
          subcategories: state.subcategories.filter((s) => s.id !== id),
        }));
        get().logAudit('subcategorias', 'Exclusão', `Subcategoria ${sub.name} excluída definitivamente`);
      },

      // Incomes
      addIncome: (incomeData) => {
        const newIncome: Income = {
          ...incomeData,
          id: `inc_${Date.now()}`,
          archived: false,
          createdAt: new Date().toISOString(),
          createdBy: get().currentUser?.username || 'davischio',
        };

        set((state) => ({
          incomes: [...state.incomes, newIncome],
        }));
        saveDocToFirestore('incomes', newIncome);
        get().recalculateBankBalances();

        get().logAudit('receitas', 'Inclusão', `Receita "${newIncome.description}" no valor de R$ ${newIncome.amount} lançada`);
      },

      updateIncome: (id, updates) => {
        const oldInc = get().incomes.find((i) => i.id === id);
        if (!oldInc) return;

        const updatedInc = { ...oldInc, ...updates };
        set((state) => ({
          incomes: state.incomes.map((i) => (i.id === id ? updatedInc : i)),
        }));
        saveDocToFirestore('incomes', updatedInc);
        get().recalculateBankBalances();

        get().logAudit('receitas', 'Alteração', `Receita "${oldInc.description}" atualizada`);
      },

      deleteIncome: (id) => {
        const inc = get().incomes.find((i) => i.id === id);
        if (!inc) return;

        deleteDocFromFirestore('incomes', id);

        set((state) => ({
          incomes: state.incomes.filter((i) => i.id !== id),
        }));
        get().recalculateBankBalances();

        get().logAudit('receitas', 'Exclusão', `Receita "${inc.description}" excluída definitivamente`);
      },

      // Fixed Expenses
      addFixedExpense: (expData) => {
        const newExp: FixedExpense = {
          ...expData,
          id: `fix_${Date.now()}`,
          archived: false,
        };

        let cards = get().cards;
        let banks = get().banks;

        if (expData.paymentMethod === 'Cartão' && expData.cardId) {
          cards = cards.map((c) => {
            if (c.id === expData.cardId) {
              const used = c.limitUsed + expData.amount;
              const updated = { ...c, limitUsed: used, limitAvailable: c.limitTotal - used };
              saveDocToFirestore('cards', updated);
              return updated;
            }
            return c;
          });
        } else if (expData.status === 'Pago' && expData.bankId) {
          banks = banks.map((b) => {
            if (b.id === expData.bankId) {
              const updated = { ...b, currentBalance: b.currentBalance - expData.amount };
              saveDocToFirestore('banks', updated);
              return updated;
            }
            return b;
          });
        }

        set((state) => ({
          cards,
          banks,
          fixedExpenses: [...state.fixedExpenses, newExp],
        }));
        saveDocToFirestore('fixedExpenses', newExp);
        get().recalculateBankBalances();

        get().logAudit('contas_fixas', 'Inclusão', `Conta fixa "${newExp.description}" lançada (R$ ${newExp.amount})`);
      },

      updateFixedExpense: (id, updates) => {
        const oldExp = get().fixedExpenses.find((f) => f.id === id);
        if (!oldExp) return;
        const updated = { ...oldExp, ...updates };

        let cards = get().cards;

        // Card limit adjustments
        if (oldExp.paymentMethod === 'Cartão' && oldExp.cardId) {
          cards = cards.map((c) => {
            if (c.id === oldExp.cardId) {
              const used = Math.max(0, c.limitUsed - oldExp.amount);
              return { ...c, limitUsed: used, limitAvailable: c.limitTotal - used };
            }
            return c;
          });
        }

        if (updated.paymentMethod === 'Cartão' && updated.cardId) {
          cards = cards.map((c) => {
            if (c.id === updated.cardId) {
              const used = c.limitUsed + updated.amount;
              return { ...c, limitUsed: used, limitAvailable: c.limitTotal - used };
            }
            return c;
          });
        }

        cards.forEach((c) => saveDocToFirestore('cards', c));

        set((state) => ({
          cards,
          fixedExpenses: state.fixedExpenses.map((f) => (f.id === id ? updated : f)),
        }));
        saveDocToFirestore('fixedExpenses', updated);
        get().recalculateBankBalances();

        get().logAudit('contas_fixas', 'Alteração', `Conta fixa "${updated.description}" atualizada`);
      },

      deleteFixedExpense: (id) => {
        const exp = get().fixedExpenses.find((f) => f.id === id);
        if (!exp) return;

        deleteDocFromFirestore('fixedExpenses', id);

        let cards = get().cards;

        if (exp.paymentMethod === 'Cartão' && exp.cardId) {
          cards = cards.map((c) => {
            if (c.id === exp.cardId) {
              const used = Math.max(0, c.limitUsed - exp.amount);
              const updated = { ...c, limitUsed: used, limitAvailable: c.limitTotal - used };
              saveDocToFirestore('cards', updated);
              return updated;
            }
            return c;
          });
        }

        set((state) => ({
          cards,
          fixedExpenses: state.fixedExpenses.filter((f) => f.id !== id),
        }));
        get().recalculateBankBalances();

        get().logAudit('contas_fixas', 'Exclusão', `Conta fixa "${exp.description}" excluída definitivamente`);
      },

      // Variable Expenses
      addVariableExpense: (expData) => {
        const newExp: VariableExpense = {
          ...expData,
          id: `var_${Date.now()}`,
          archived: false,
        };

        let cards = get().cards;

        if (expData.paymentMethod === 'Cartão' && expData.cardId) {
          cards = cards.map((c) => {
            if (c.id === expData.cardId) {
              const used = c.limitUsed + expData.amount;
              const updated = { ...c, limitUsed: used, limitAvailable: c.limitTotal - used };
              saveDocToFirestore('cards', updated);
              return updated;
            }
            return c;
          });
        }

        set((state) => ({
          cards,
          variableExpenses: [...state.variableExpenses, newExp],
        }));
        saveDocToFirestore('variableExpenses', newExp);
        get().recalculateBankBalances();

        get().logAudit('contas_variaveis', 'Inclusão', `Conta variável "${newExp.description}" lançada (R$ ${newExp.amount})`);
      },

      updateVariableExpense: (id, updates) => {
        const exp = get().variableExpenses.find((v) => v.id === id);
        if (!exp) return;
        const updated = { ...exp, ...updates };

        let cards = get().cards;

        // Revert old amount from old card if it was a card expense
        if (exp.paymentMethod === 'Cartão' && exp.cardId) {
          cards = cards.map((c) => {
            if (c.id === exp.cardId) {
              const used = Math.max(0, c.limitUsed - exp.amount);
              return { ...c, limitUsed: used, limitAvailable: c.limitTotal - used };
            }
            return c;
          });
        }

        // Apply new amount to new card if updated is a card expense
        if (updated.paymentMethod === 'Cartão' && updated.cardId) {
          cards = cards.map((c) => {
            if (c.id === updated.cardId) {
              const used = c.limitUsed + updated.amount;
              return { ...c, limitUsed: used, limitAvailable: c.limitTotal - used };
            }
            return c;
          });
        }

        cards.forEach((c) => saveDocToFirestore('cards', c));

        set((state) => ({
          cards,
          variableExpenses: state.variableExpenses.map((v) => (v.id === id ? updated : v)),
        }));
        saveDocToFirestore('variableExpenses', updated);
        get().recalculateBankBalances();

        get().logAudit('contas_variaveis', 'Alteração', `Conta variável "${updated.description}" atualizada`);
      },

      deleteVariableExpense: (id) => {
        const exp = get().variableExpenses.find((v) => v.id === id);
        if (!exp) return;

        deleteDocFromFirestore('variableExpenses', id);

        let cards = get().cards;

        if (exp.paymentMethod === 'Cartão' && exp.cardId) {
          cards = cards.map((c) => {
            if (c.id === exp.cardId) {
              const used = Math.max(0, c.limitUsed - exp.amount);
              const updated = { ...c, limitUsed: used, limitAvailable: c.limitTotal - used };
              saveDocToFirestore('cards', updated);
              return updated;
            }
            return c;
          });
        }

        set((state) => ({
          cards,
          variableExpenses: state.variableExpenses.filter((v) => v.id !== id),
        }));
        get().recalculateBankBalances();

        get().logAudit('contas_variaveis', 'Exclusão', `Conta variável "${exp.description}" excluída definitivamente`);
      },

      // Loans
      addLoan: (loanData) => {
        const id = `loan_${Date.now()}`;
        const netReceived = loanData.netAmountReceived || loanData.contractedAmount;

        let installments: LoanInstallment[] = [];
        const startDate = loanData.contractDate || getCurrentDateFormatted();
        const firstDue = loanData.firstDueDate;

        if (loanData.amortizationSystem === 'SAC') {
          installments = calculateSACSchedule(
            loanData.contractedAmount,
            loanData.interestRateMonthly,
            loanData.installmentsTotal,
            startDate,
            loanData.iofAmount || 0,
            loanData.insuranceAmount || 0,
            loanData.feesAmount || 0,
            firstDue
          );
        } else if (loanData.amortizationSystem === 'Personalizado') {
          installments = calculateCustomSchedule(
            loanData.contractedAmount,
            loanData.interestRateMonthly,
            loanData.installmentsTotal,
            startDate,
            loanData.iofAmount || 0,
            loanData.insuranceAmount || 0,
            loanData.feesAmount || 0,
            firstDue
          );
        } else {
          installments = calculatePRICESchedule(
            loanData.contractedAmount,
            loanData.interestRateMonthly,
            loanData.installmentsTotal,
            startDate,
            loanData.iofAmount || 0,
            loanData.insuranceAmount || 0,
            loanData.feesAmount || 0,
            firstDue
          );
        }

        const yearlyInterest = Math.round((Math.pow(1 + loanData.interestRateMonthly / 100, 12) - 1) * 10000) / 100;

        const newLoan: Loan = {
          ...loanData,
          id,
          netAmountReceived: netReceived,
          interestRateYearly: loanData.interestRateYearly || yearlyInterest,
          cetRateYearly: loanData.cetRateYearly || (yearlyInterest + 1.5),
          iofAmount: loanData.iofAmount || 0,
          insuranceAmount: loanData.insuranceAmount || 0,
          feesAmount: loanData.feesAmount || 0,
          installmentsPaid: 0,
          installmentAmount: installments[0]?.amount || 0,
          outstandingBalance: loanData.contractedAmount,
          paidAmount: 0,
          paidInterest: 0,
          paidAmortization: 0,
          status: 'Ativo',
          installments,
          archived: false,
        };

        set((state) => ({ loans: [...state.loans, newLoan] }));
        saveDocToFirestore('loans', newLoan);
        get().recalculateBankBalances();
        get().logAudit('emprestimos', 'Inclusão', `Empréstimo ${newLoan.type} contratado no valor de R$ ${newLoan.contractedAmount} e creditado R$ ${netReceived} no banco.`);
      },

      updateLoan: (id, updates) => {
        const loan = get().loans.find((l) => l.id === id);
        if (!loan) return;
        let updated: Loan = { ...loan, ...updates };

        const termsChanged =
          updates.contractedAmount !== undefined ||
          updates.interestRateMonthly !== undefined ||
          updates.installmentsTotal !== undefined ||
          updates.amortizationSystem !== undefined ||
          updates.feesAmount !== undefined ||
          updates.contractDate !== undefined ||
          updates.firstDueDate !== undefined;

        if (!updated.installments || updated.installments.length === 0 || termsChanged) {
          let newInstallments: LoanInstallment[] = [];
          const startDate = updated.contractDate || getCurrentDateFormatted();
          const firstDue = updated.firstDueDate;

          if (updated.amortizationSystem === 'SAC') {
            newInstallments = calculateSACSchedule(
              updated.contractedAmount,
              updated.interestRateMonthly,
              updated.installmentsTotal,
              startDate,
              updated.iofAmount || 0,
              updated.insuranceAmount || 0,
              updated.feesAmount || 0,
              firstDue
            );
          } else if (updated.amortizationSystem === 'Personalizado') {
            newInstallments = calculateCustomSchedule(
              updated.contractedAmount,
              updated.interestRateMonthly,
              updated.installmentsTotal,
              startDate,
              updated.iofAmount || 0,
              updated.insuranceAmount || 0,
              updated.feesAmount || 0,
              firstDue
            );
          } else {
            newInstallments = calculatePRICESchedule(
              updated.contractedAmount,
              updated.interestRateMonthly,
              updated.installmentsTotal,
              startDate,
              updated.iofAmount || 0,
              updated.insuranceAmount || 0,
              updated.feesAmount || 0,
              firstDue
            );
          }
          if (loan.installments && loan.installments.length > 0 && !termsChanged) {
            updated.installments = loan.installments;
          } else {
            updated.installments = newInstallments;
            updated.installmentAmount = newInstallments[0]?.amount || updated.installmentAmount;
          }
        }

        set((state) => ({
          loans: state.loans.map((l) => (l.id === id ? updated : l)),
        }));
        saveDocToFirestore('loans', updated);
        get().recalculateBankBalances();
        get().logAudit('emprestimos', 'Alteração', `Empréstimo ID ${id} atualizado`);
      },

      deleteLoanSmart: (id) => {
        const loan = get().loans.find((l) => l.id === id);
        if (!loan) return false;

        deleteDocFromFirestore('loans', id);

        set((state) => ({
          loans: state.loans.filter((l) => l.id !== id),
        }));
        get().recalculateBankBalances();

        get().logAudit('emprestimos', 'Exclusão', `Empréstimo ID ${id} excluído definitivamente`);
        return true;
      },

      updateLoanInstallmentStatus: (loanId, installmentNumber, newStatus, paidAmountVal, paymentSourceId) => {
        const loan = get().loans.find((l) => l.id === loanId);
        if (!loan) return { success: false, error: 'Empréstimo não encontrado.' };

        const targetInst = loan.installments.find((i) => i.number === installmentNumber);
        if (!targetInst) return { success: false, error: 'Parcela não encontrada.' };

        const prevStatus = targetInst.status;
        const isNowPaid = newStatus === 'Paga' || newStatus === 'Antecipada' || newStatus === 'Quitada';
        const wasPaid = prevStatus === 'Paga' || prevStatus === 'Antecipada' || prevStatus === 'Quitada';

        const amountToDebit = paidAmountVal !== undefined ? paidAmountVal : targetInst.amount;

        const sourceId = paymentSourceId || targetInst.paymentBankId || targetInst.paymentCardId || loan.bankId;
        const bank = get().banks.find((b) => b.id === sourceId);
        const card = get().cards.find((c) => c.id === sourceId);

        // Balance / limit validation for payments
        if (isNowPaid && !wasPaid) {
          if (bank) {
            if (bank.currentBalance < amountToDebit) {
              return {
                success: false,
                error: `Pagamento Rejeitado: Saldo insuficiente na conta "${bank.name}". Saldo disponível: R$ ${bank.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Valor da parcela: R$ ${amountToDebit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
              };
            }
          } else if (card) {
            if (card.limitAvailable < amountToDebit) {
              return {
                success: false,
                error: `Pagamento Rejeitado: Limite insuficiente no cartão "${card.name}". Limite disponível: R$ ${card.limitAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Valor da parcela: R$ ${amountToDebit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
              };
            }
            // Update credit card used/available limit
            const newUsed = card.limitUsed + amountToDebit;
            const newAvailable = Math.max(0, card.limitTotal - newUsed);
            const updatedCard = { ...card, limitUsed: newUsed, limitAvailable: newAvailable };
            set((state) => ({ cards: state.cards.map((c) => (c.id === card.id ? updatedCard : c)) }));
            saveDocToFirestore('cards', updatedCard);
          }
        } else if (!isNowPaid && wasPaid) {
          // Reverting payment
          if (card) {
            const newUsed = Math.max(0, card.limitUsed - targetInst.paidAmount);
            const newAvailable = card.limitTotal - newUsed;
            const updatedCard = { ...card, limitUsed: newUsed, limitAvailable: newAvailable };
            set((state) => ({ cards: state.cards.map((c) => (c.id === card.id ? updatedCard : c)) }));
            saveDocToFirestore('cards', updatedCard);
          }
        }

        const updatedInstallments = loan.installments.map((inst) => {
          if (inst.number === installmentNumber) {
            return {
              ...inst,
              status: newStatus,
              paidAmount: isNowPaid ? amountToDebit : 0,
              paidDate: isNowPaid ? (inst.paidDate || getCurrentDateFormatted()) : undefined,
              paymentBankId: bank ? bank.id : undefined,
              paymentCardId: card ? card.id : undefined,
            };
          }
          return inst;
        });

        const paidInsts = updatedInstallments.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada');
        const installmentsPaid = paidInsts.length;

        let schedule = loan.installments;
        if (!schedule || schedule.length === 0 || !schedule[0]?.principal) {
          const startDate = loan.contractDate || getCurrentDateFormatted();
          if (loan.amortizationSystem === 'SAC') {
            schedule = calculateSACSchedule(loan.contractedAmount, loan.interestRateMonthly, loan.installmentsTotal, startDate, loan.iofAmount || 0, loan.insuranceAmount || 0, loan.feesAmount || 0, loan.firstDueDate);
          } else if (loan.amortizationSystem === 'Personalizado') {
            schedule = calculateCustomSchedule(loan.contractedAmount, loan.interestRateMonthly, loan.installmentsTotal, startDate, loan.iofAmount || 0, loan.insuranceAmount || 0, loan.feesAmount || 0, loan.firstDueDate);
          } else {
            schedule = calculatePRICESchedule(loan.contractedAmount, loan.interestRateMonthly, loan.installmentsTotal, startDate, loan.iofAmount || 0, loan.insuranceAmount || 0, loan.feesAmount || 0, loan.firstDueDate);
          }
        }

        let calcPaidAmort = 0;
        let calcPaidInterest = 0;
        let calcPaidAmt = 0;

        for (const pInst of paidInsts) {
          const match = schedule.find((s) => s.number === pInst.number);
          const pVal = (pInst.principal && pInst.principal > 0) ? pInst.principal : (match?.principal || 0);
          const iVal = (pInst.interest && pInst.interest > 0) ? pInst.interest : (match?.interest || 0);
          const amtVal = pInst.paidAmount || pInst.amount || (match?.amount || 0);

          calcPaidAmort += pVal;
          calcPaidInterest += iVal;
          calcPaidAmt += amtVal;
        }

        const totalPaidAmt = Math.round(calcPaidAmt * 100) / 100;
        const totalPaidInterest = Math.round(calcPaidInterest * 100) / 100;
        const totalPaidAmort = Math.round(calcPaidAmort * 100) / 100;
        const outstandingBalance = Math.round(Math.max(0, loan.contractedAmount - totalPaidAmort) * 100) / 100;
        const isQuitado = installmentsPaid >= loan.installmentsTotal || (outstandingBalance <= 0 && loan.contractedAmount > 0);

        const updatedLoan = {
          ...loan,
          installmentsPaid,
          paidAmount: totalPaidAmt,
          paidInterest: totalPaidInterest,
          paidAmortization: totalPaidAmort,
          outstandingBalance,
          status: isQuitado ? ('Quitado' as const) : ('Ativo' as const),
          installments: updatedInstallments,
        };

        set((state) => ({
          loans: state.loans.map((l) => (l.id === loanId ? updatedLoan : l)),
        }));
        saveDocToFirestore('loans', updatedLoan);
        get().recalculateBankBalances();

        get().logAudit(
          'emprestimos',
          'Alteração',
          `Status da parcela ${installmentNumber} do empréstimo alterado para ${newStatus}`
        );

        return { success: true };
      },

      payLoanInstallment: (loanId, installmentNumber, paymentSourceId) => {
        const loan = get().loans.find((l) => l.id === loanId);
        if (!loan) return { success: false, error: 'Empréstimo não encontrado.' };
        const targetInst = loan.installments.find((i) => i.number === installmentNumber);
        if (!targetInst) return { success: false, error: 'Parcela não encontrada.' };
        return get().updateLoanInstallmentStatus(loanId, installmentNumber, 'Paga', targetInst.amount, paymentSourceId);
      },

      earlyPayoffLoan: (loanId, payUntilInstallment, paymentSourceId) => {
        const loan = get().loans.find((l) => l.id === loanId);
        if (!loan) return { success: false, error: 'Empréstimo não encontrado.' };

        const sourceId = paymentSourceId || loan.bankId;
        const bank = get().banks.find((b) => b.id === sourceId);
        const card = get().cards.find((c) => c.id === sourceId);

        const unpaidInsts = loan.installments.filter(
          (i) => i.number > payUntilInstallment && i.status !== 'Paga' && i.status !== 'Antecipada' && i.status !== 'Quitada'
        );
        const netPayoffVal = unpaidInsts.reduce((acc, i) => acc + i.principal + i.iof + i.insurance + i.fees, 0);

        if (bank) {
          if (bank.currentBalance < netPayoffVal) {
            return {
              success: false,
              error: `Quitação Rejeitada: Saldo insuficiente na conta "${bank.name}". Saldo disponível: R$ ${bank.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Valor necessário: R$ ${netPayoffVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            };
          }
        } else if (card) {
          if (card.limitAvailable < netPayoffVal) {
            return {
              success: false,
              error: `Quitação Rejeitada: Limite insuficiente no cartão "${card.name}". Limite disponível: R$ ${card.limitAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Valor necessário: R$ ${netPayoffVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            };
          }
          const newUsed = card.limitUsed + netPayoffVal;
          const newAvailable = Math.max(0, card.limitTotal - newUsed);
          const updatedCard = { ...card, limitUsed: newUsed, limitAvailable: newAvailable };
          set((state) => ({ cards: state.cards.map((c) => (c.id === card.id ? updatedCard : c)) }));
          saveDocToFirestore('cards', updatedCard);
        }

        const updatedInstallments = loan.installments.map((inst) => {
          if (inst.number > payUntilInstallment && inst.status !== 'Paga') {
            return {
              ...inst,
              status: 'Quitada' as const,
              paidAmount: inst.principal + inst.iof + inst.insurance + inst.fees,
              paidDate: getCurrentDateFormatted(),
              paymentBankId: bank ? bank.id : undefined,
              paymentCardId: card ? card.id : undefined,
            };
          }
          return inst;
        });

        const paidInsts = updatedInstallments.filter((i) => i.status === 'Paga' || i.status === 'Antecipada' || i.status === 'Quitada');
        const totalPaidAmt = paidInsts.reduce((acc, i) => acc + i.paidAmount, 0);
        const totalPaidInterest = paidInsts.reduce((acc, i) => acc + i.interest, 0);
        const totalPaidAmort = paidInsts.reduce((acc, i) => acc + i.principal, 0);

        const updatedLoan = {
          ...loan,
          installmentsPaid: loan.installmentsTotal,
          paidAmount: totalPaidAmt,
          paidInterest: totalPaidInterest,
          paidAmortization: totalPaidAmort,
          outstandingBalance: 0,
          status: 'Quitado' as const,
          installments: updatedInstallments,
        };

        set((state) => ({
          loans: state.loans.map((l) => (l.id === loanId ? updatedLoan : l)),
        }));

        saveDocToFirestore('loans', updatedLoan);
        get().recalculateBankBalances();

        get().logAudit(
          'emprestimos',
          'Quitação',
          `Quitação antecipada do empréstimo (${loan.type}) realizada por R$ ${netPayoffVal}`
        );

        return { success: true };
      },

      applyExtraAmortizationLoan: (loanId, extraAmount, extraDate, mode, paymentSourceId) => {
        const loan = get().loans.find((l) => l.id === loanId);
        if (!loan || extraAmount <= 0) return { success: false, error: 'Valor inválido para amortização.' };

        const sourceId = paymentSourceId || loan.bankId;
        const bank = get().banks.find((b) => b.id === sourceId);
        const card = get().cards.find((c) => c.id === sourceId);

        if (bank) {
          if (bank.currentBalance < extraAmount) {
            return {
              success: false,
              error: `Amortização Rejeitada: Saldo insuficiente na conta "${bank.name}". Saldo disponível: R$ ${bank.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Valor: R$ ${extraAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            };
          }
        } else if (card) {
          if (card.limitAvailable < extraAmount) {
            return {
              success: false,
              error: `Amortização Rejeitada: Limite insuficiente no cartão "${card.name}". Limite disponível: R$ ${card.limitAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Valor: R$ ${extraAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            };
          }
          const newUsed = card.limitUsed + extraAmount;
          const newAvailable = Math.max(0, card.limitTotal - newUsed);
          const updatedCard = { ...card, limitUsed: newUsed, limitAvailable: newAvailable };
          set((state) => ({ cards: state.cards.map((c) => (c.id === card.id ? updatedCard : c)) }));
          saveDocToFirestore('cards', updatedCard);
        }

        const details = calculateExtraAmortizationDetails(loan, extraAmount, extraDate, mode);

        const isQuitado = details.newBalance <= 0;
        const updatedLoan: Loan = {
          ...loan,
          outstandingBalance: details.newBalance,
          installmentsTotal: details.newInstallments.length,
          installmentAmount: details.newInstallmentAmount > 0 ? details.newInstallmentAmount : loan.installmentAmount,
          status: isQuitado ? 'Quitado' : loan.status,
          installments: details.newInstallments,
        };

        set((state) => ({
          loans: state.loans.map((l) => (l.id === loanId ? updatedLoan : l)),
        }));

        saveDocToFirestore('loans', updatedLoan);
        get().recalculateBankBalances();

        get().logAudit(
          'emprestimos',
          'Alteração',
          `Amortização extra de R$ ${extraAmount} no empréstimo (${loan.type}). Economia de R$ ${details.interestSaved} (${details.savingsPercent}%)`
        );

        return { success: true };
      },

      deleteLoan: (id) => {
        const loan = get().loans.find((l) => l.id === id);
        if (!loan) return;

        deleteDocFromFirestore('loans', id);

        set((state) => ({
          loans: state.loans.filter((l) => l.id !== id),
        }));

        get().logAudit('emprestimos', 'Exclusão', `Empréstimo ID ${id} excluído definitivamente`);
      },

      // Investments
      addInvestment: (invData) => {
        const id = `inv_${Date.now()}`;
        const newInv: Investment = {
          ...invData,
          id,
          archived: false,
          transactions: [
            {
              id: `tx_${Date.now()}`,
              investmentId: id,
              type: 'Aporte',
              amount: invData.appliedAmount,
              date: invData.applicationDate,
              notes: 'Aporte inicial',
            },
          ],
        };

        set((state) => ({ investments: [...state.investments, newInv] }));
        get().logAudit('investimentos', 'Inclusão', `Investimento ${newInv.type} na instituição ${newInv.institution} cadastrado`);
      },

      updateInvestment: (id, updates) => {
        set((state) => ({
          investments: state.investments.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        }));
        get().logAudit('investimentos', 'Alteração', `Investimento ID ${id} atualizado`);
      },

      addInvestmentTransaction: (investmentId, txData) => {
        const inv = get().investments.find((i) => i.id === investmentId);
        if (!inv) return;

        const newTx: InvestmentTransaction = {
          ...txData,
          id: `tx_${Date.now()}`,
          investmentId,
        };

        let newCurrentAmount = inv.currentAmount;
        let newAppliedAmount = inv.appliedAmount;

        if (txData.type === 'Aporte') {
          newCurrentAmount += txData.amount;
          newAppliedAmount += txData.amount;
        } else if (txData.type === 'Resgate') {
          newCurrentAmount = Math.max(0, newCurrentAmount - txData.amount);
        } else if (txData.type === 'Rendimento') {
          newCurrentAmount += txData.amount;
        }

        const newYieldAcc = newCurrentAmount - newAppliedAmount;

        set((state) => ({
          investments: state.investments.map((i) =>
            i.id === investmentId
              ? {
                  ...i,
                  currentAmount: newCurrentAmount,
                  appliedAmount: newAppliedAmount,
                  yieldAccumulated: newYieldAcc,
                  transactions: [newTx, ...i.transactions],
                }
              : i
          ),
        }));

        get().logAudit('investimentos', 'Alteração', `Transação de ${txData.type} no valor de R$ ${txData.amount} registrada`);
      },

      deleteInvestment: (id) => {
        const inv = get().investments.find((i) => i.id === id);
        if (!inv) return;

        deleteDocFromFirestore('investments', id);

        set((state) => ({
          investments: state.investments.filter((i) => i.id !== id),
        }));

        get().logAudit('investimentos', 'Exclusão', `Investimento ${inv.type} excluído definitivamente`);
      },

      recalculateInvestmentYields: (marketRates) => {
        const cdi = marketRates?.cdi ?? 10.40;
        const selic = marketRates?.selic ?? 10.50;
        const ipca = marketRates?.ipca ?? 4.00;

        const updatedInvestments = get().investments.map((inv) => {
          const indexer = inv.indexer || (inv.type === 'Tesouro Direto' ? 'Selic' : 'CDI');
          const multiplier = inv.interestRate || 100;

          let annualRate = 10.0;
          if (indexer === 'CDI') {
            annualRate = (cdi * multiplier) / 100;
          } else if (indexer === 'Selic') {
            annualRate = (selic * multiplier) / 100;
          } else if (indexer === 'IPCA') {
            annualRate = ipca + (inv.interestRate || 6.0);
          } else if (indexer === 'Prefixado') {
            annualRate = inv.interestRate || 12.0;
          } else {
            annualRate = inv.interestRate || 10.0;
          }

          const monthlyRate = annualRate / 12;

          // Estimate elapsed months since application
          const appDate = new Date(inv.applicationDate || '2025-01-01');
          const now = new Date();
          const elapsedMonths = Math.max(
            1,
            (now.getFullYear() - appDate.getFullYear()) * 12 + (now.getMonth() - appDate.getMonth())
          );

          const yieldMonthly = Math.round(inv.appliedAmount * (monthlyRate / 100) * 100) / 100;
          const yieldYearly = Math.round(inv.appliedAmount * (annualRate / 100) * 100) / 100;
          const yieldAccumulated = Math.round(inv.appliedAmount * Math.pow(1 + monthlyRate / 100, elapsedMonths) - inv.appliedAmount);
          const currentAmount = Math.round((inv.appliedAmount + yieldAccumulated) * 100) / 100;

          const updated: Investment = {
            ...inv,
            indexer,
            yieldPercent: Math.round(annualRate * 100) / 100,
            yieldMonthly,
            yieldYearly,
            yieldAccumulated: Math.max(0, yieldAccumulated),
            currentAmount: Math.max(inv.appliedAmount, currentAmount),
          };

          saveDocToFirestore('investments', updated);
          return updated;
        });

        set({ investments: updatedInvestments });
        get().logAudit(
          'investimentos',
          'Alteração',
          `Taxas oficiais e rendimentos atualizados automaticamente (CDI: ${cdi}%, Selic: ${selic}%, IPCA: ${ipca}%)`
        );
      },

      // Goals
      addGoal: (goalData) => {
        const newGoal: Goal = {
          ...goalData,
          id: `goal_${Date.now()}`,
          archived: false,
        };
        set((state) => ({ goals: [...state.goals, newGoal] }));
        get().logAudit('metas', 'Inclusão', `Meta "${newGoal.name}" criada com objetivo de R$ ${newGoal.targetAmount}`);
      },

      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      depositToGoal: (goalId, amount, fromBankId) => {
        const goal = get().goals.find((g) => g.id === goalId);
        const bank = get().banks.find((b) => b.id === fromBankId);
        if (!goal || !bank) return;

        const updatedGoalAmount = goal.currentAmount + amount;
        const updatedBankBalance = bank.currentBalance - amount;

        set((state) => ({
          banks: state.banks.map((b) => (b.id === fromBankId ? { ...b, currentBalance: updatedBankBalance } : b)),
          goals: state.goals.map((g) => (g.id === goalId ? { ...g, currentAmount: updatedGoalAmount } : g)),
        }));

        get().logAudit('metas', 'Alteração', `Aporte de R$ ${amount} realizado na meta "${goal.name}" via banco ${bank.name}`);
      },

      deleteGoal: (id) => {
        const goal = get().goals.find((g) => g.id === id);
        if (!goal) return;

        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
          trashBin: [
            {
              id: `trash_${Date.now()}`,
              originalId: id,
              module: 'metas',
              itemTitle: goal.name,
              originalData: goal,
              deletedAt: new Date().toISOString(),
              deletedBy: get().currentUser?.username || 'Admin',
            },
            ...state.trashBin,
          ],
        }));

        get().logAudit('metas', 'Exclusão', `Meta "${goal.name}" removida`);
      },

      // Transfers
      addTransfer: (transferData) => {
        const originBank = get().banks.find((b) => b.id === transferData.originBankId);
        const destBank = get().banks.find((b) => b.id === transferData.destinationBankId);
        if (!originBank || !destBank) return;

        const newTransfer: Transfer = {
          ...transferData,
          id: `trf_${Date.now()}`,
          archived: false,
        };

        set((state) => ({
          transfers: [...state.transfers, newTransfer],
        }));
        saveDocToFirestore('transfers', newTransfer);
        get().recalculateBankBalances();

        get().logAudit(
          'transferencias',
          'Inclusão',
          `Transferência de R$ ${transferData.amount} de ${originBank.name} para ${destBank.name}`
        );
      },

      // Trash Bin Restore & Purge
      restoreTrashItem: (id) => {
        const item = get().trashBin.find((t) => t.id === id);
        if (!item) return;

        deleteDocFromFirestore('trashBin', id);

        const { module, originalData } = item;

        const moduleToCollection: Record<string, string> = {
          usuarios: 'users',
          bancos: 'banks',
          cartoes: 'cards',
          categorias: 'categories',
          subcategorias: 'subcategories',
          receitas: 'incomes',
          contas_fixas: 'fixedExpenses',
          contas_variaveis: 'variableExpenses',
          emprestimos: 'loans',
          investimentos: 'investments',
          metas: 'goals',
        };

        const colName = moduleToCollection[module];
        if (colName && originalData && originalData.id) {
          saveDocToFirestore(colName, originalData);
        }

        set((state) => {
          let updatedState: Partial<FinancialStore> = {
            trashBin: state.trashBin.filter((t) => t.id !== id),
          };

          if (module === 'usuarios') updatedState.users = [...state.users, originalData];
          if (module === 'bancos') updatedState.banks = [...state.banks, originalData];
          if (module === 'cartoes') updatedState.cards = [...state.cards, originalData];
          if (module === 'categorias') updatedState.categories = [...state.categories, originalData];
          if (module === 'subcategorias') updatedState.subcategories = [...state.subcategories, originalData];
          if (module === 'receitas') updatedState.incomes = [...state.incomes, originalData];
          if (module === 'contas_fixas') updatedState.fixedExpenses = [...state.fixedExpenses, originalData];
          if (module === 'contas_variaveis') updatedState.variableExpenses = [...state.variableExpenses, originalData];
          if (module === 'emprestimos') updatedState.loans = [...state.loans, originalData];
          if (module === 'investimentos') updatedState.investments = [...state.investments, originalData];
          if (module === 'metas') updatedState.goals = [...state.goals, originalData];

          return updatedState as any;
        });

        get().recalculateBankBalances();
        get().logAudit(module, 'Restauração', `Item "${item.itemTitle}" restaurado da lixeira`);
      },

      purgeTrashItem: (id) => {
        const item = get().trashBin.find((t) => t.id === id);
        deleteDocFromFirestore('trashBin', id);

        if (item && item.originalId) {
          const moduleToCollection: Record<string, string> = {
            usuarios: 'users',
            bancos: 'banks',
            cartoes: 'cards',
            categorias: 'categories',
            subcategorias: 'subcategories',
            receitas: 'incomes',
            contas_fixas: 'fixedExpenses',
            contas_variaveis: 'variableExpenses',
            emprestimos: 'loans',
            investimentos: 'investments',
            metas: 'goals',
          };
          const colName = moduleToCollection[item.module];
          if (colName) {
            deleteDocFromFirestore(colName, item.originalId);
          }
        }

        set((state) => ({
          trashBin: state.trashBin.filter((t) => t.id !== id),
        }));
        if (item) {
          get().logAudit(item.module, 'Exclusão', `Item "${item.itemTitle}" excluído permanentemente da lixeira`);
        }
      },

      clearTrashBin: () => {
        const moduleToCollection: Record<string, string> = {
          usuarios: 'users',
          bancos: 'banks',
          cartoes: 'cards',
          categorias: 'categories',
          subcategorias: 'subcategories',
          receitas: 'incomes',
          contas_fixas: 'fixedExpenses',
          contas_variaveis: 'variableExpenses',
          emprestimos: 'loans',
          investimentos: 'investments',
          metas: 'goals',
        };

        get().trashBin.forEach((t) => {
          deleteDocFromFirestore('trashBin', t.id);
          if (t.originalId) {
            const colName = moduleToCollection[t.module];
            if (colName) deleteDocFromFirestore(colName, t.originalId);
          }
        });
        set({ trashBin: [] });
        get().logAudit('configuracoes', 'Exclusão', 'Lixeira esvaziada completamente');
      },

      updateSettings: (newSettings) => {
        set((state) => ({ settings: { ...state.settings, ...newSettings } }));
        get().logAudit('configuracoes', 'Alteração', 'Configurações do sistema foram alteradas');
      },

      restoreBackupFromJSON: (jsonData) => {
        try {
          const parsed = JSON.parse(jsonData);
          if (parsed.users && parsed.banks && parsed.categories) {
            set({
              users: parsed.users || [],
              banks: parsed.banks || [],
              cards: parsed.cards || [],
              categories: parsed.categories || [],
              subcategories: parsed.subcategories || [],
              incomes: parsed.incomes || [],
              fixedExpenses: parsed.fixedExpenses || [],
              variableExpenses: parsed.variableExpenses || [],
              loans: parsed.loans || [],
              investments: parsed.investments || [],
              goals: parsed.goals || [],
              transfers: parsed.transfers || [],
              settings: parsed.settings || get().settings,
            });
            get().logAudit('configuracoes', 'Backup', 'Restauração de backup realizada com sucesso');
            return true;
          }
        } catch (e) {
          console.error('Backup restore failed', e);
        }
        return false;
      },

      deleteCategory: (id) => {
        get().deleteCategorySmart(id);
      },

      depositInvestment: (investmentId, amount, fromBankId) => {
        get().addInvestmentTransaction(investmentId, {
          type: 'Aporte',
          amount,
          date: getCurrentDateFormatted(),
          notes: 'Aporte realizado via sistema',
        });
        if (fromBankId) {
          const bank = get().banks.find((b) => b.id === fromBankId);
          if (bank) {
            get().updateBank(fromBankId, { currentBalance: bank.currentBalance - amount });
          }
        }
      },

      withdrawInvestment: (investmentId, amount, toBankId) => {
        get().addInvestmentTransaction(investmentId, {
          type: 'Resgate',
          amount,
          date: getCurrentDateFormatted(),
          notes: 'Resgate de investimento',
        });
        if (toBankId) {
          const bank = get().banks.find((b) => b.id === toBankId);
          if (bank) {
            get().updateBank(toBankId, { currentBalance: bank.currentBalance + amount });
          }
        }
      },

      contributeToGoal: (goalId, amount, fromBankId) => {
        const goal = get().goals.find((g) => g.id === goalId);
        if (!goal) return;
        get().updateGoal(goalId, { currentAmount: goal.currentAmount + amount });
        if (fromBankId) {
          const bank = get().banks.find((b) => b.id === fromBankId);
          if (bank) {
            get().updateBank(fromBankId, { currentBalance: bank.currentBalance - amount });
          }
        }
        get().logAudit('metas', 'Inclusão', `Aporte de R$ ${amount} na meta "${goal.name}"`);
      },

      toggleBlockUser: (id) => {
        const user = get().users.find((u) => u.id === id);
        if (!user) return;
        const newStatus = user.status === 'Ativo' ? 'Bloqueado' : 'Ativo';
        get().updateUser(id, { status: newStatus });
        get().logAudit('usuarios', 'Bloqueio', `Status do usuário @${user.username} alterado para ${newStatus}`);
      },

      changeOwnPassword: (currentPass, newPass) => {
        const currentUser = get().currentUser;
        if (!currentUser) return false;
        const valid = verifyPassword(currentPass, currentUser.passwordHash);
        if (!valid) return false;
        const newHash = hashPassword(newPass);
        get().updateUser(currentUser.id, { passwordHash: newHash });
        get().logAudit('usuarios', 'Alteração', `Usuário @${currentUser.username} alterou sua própria senha`);
        return true;
      },

      theme: 'light',
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: nextTheme });
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      restoreArchivedItem: (id) => {
        get().restoreTrashItem(id);
      },

      permanentlyDeleteItem: (id) => {
        get().purgeTrashItem(id);
      },

      exportBackup: () => {
        const state = get();
        const exportData = {
          users: state.users,
          banks: state.banks,
          cards: state.cards,
          cardInvoices: state.cardInvoices,
          categories: state.categories,
          subcategories: state.subcategories,
          incomes: state.incomes,
          fixedExpenses: state.fixedExpenses,
          variableExpenses: state.variableExpenses,
          loans: state.loans,
          investments: state.investments,
          goals: state.goals,
          transfers: state.transfers,
          trashBin: state.trashBin,
          auditLogs: state.auditLogs,
          settings: state.settings,
          exportedAt: new Date().toISOString(),
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(exportData, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `backup_finanzpro_${getCurrentDateFormatted()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        get().logAudit('configuracoes', 'Backup', 'Download de backup completo do sistema realizado');
      },

      importBackup: (jsonData) => {
        return get().restoreBackupFromJSON(jsonData);
      },

      resetToFactoryData: () => {
        set({
          users: INITIAL_USERS,
          banks: INITIAL_BANKS,
          cards: INITIAL_CARDS,
          categories: INITIAL_CATEGORIES,
          subcategories: INITIAL_SUBCATEGORIES,
          incomes: INITIAL_INCOMES,
          fixedExpenses: INITIAL_FIXED_EXPENSES,
          variableExpenses: INITIAL_VARIABLE_EXPENSES,
          loans: INITIAL_LOANS,
          investments: INITIAL_INVESTMENTS,
          goals: INITIAL_GOALS,
          transfers: [],
          trashBin: [],
          auditLogs: INITIAL_AUDIT_LOGS,
        });
      },

      resetToInitialSeed: () => {
        get().resetToFactoryData();
      },
    }),
    {
      name: 'financial_system_storage_v1',
      partialize: (state) => {
        const { currentUser, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Ensure all initial seed variable expenses exist if missing in local storage
        if (state.variableExpenses) {
          const existingVarIds = new Set(state.variableExpenses.map((v) => v.id));
          const missingVar = INITIAL_VARIABLE_EXPENSES.filter((v) => !existingVarIds.has(v.id));
          if (missingVar.length > 0) {
            state.variableExpenses = [...state.variableExpenses, ...missingVar];
          }
        } else {
          state.variableExpenses = INITIAL_VARIABLE_EXPENSES;
        }

        // Ensure all initial seed fixed expenses exist if missing in local storage
        if (state.fixedExpenses) {
          const existingFixIds = new Set(state.fixedExpenses.map((f) => f.id));
          const missingFix = INITIAL_FIXED_EXPENSES.filter((f) => !existingFixIds.has(f.id));
          if (missingFix.length > 0) {
            state.fixedExpenses = [...state.fixedExpenses, ...missingFix];
          }
        } else {
          state.fixedExpenses = INITIAL_FIXED_EXPENSES;
        }

        state.recalculateBankBalances();
      },
    }
  )
);
