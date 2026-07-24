export type UserRole = 'Administrador' | 'Usuário Financeiro' | 'Usuário Consulta' | 'Auditor' | 'Usuário Comum';
export type UserStatus = 'Ativo' | 'Bloqueado';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
  manage: boolean;
}

export interface UserPermissions {
  dashboard: ModulePermissions;
  receitas: ModulePermissions;
  contas_fixas: ModulePermissions;
  contas_variaveis: ModulePermissions;
  bancos: ModulePermissions;
  cartoes: ModulePermissions;
  emprestimos: ModulePermissions;
  investimentos: ModulePermissions;
  metas: ModulePermissions;
  categorias: ModulePermissions;
  subcategorias: ModulePermissions;
  relatorios: ModulePermissions;
  usuarios: ModulePermissions;
  configuracoes: ModulePermissions;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string;
  pin?: string;
  permissions: UserPermissions;
  createdAt: string;
  lastLogin?: string;
}

export type AccountType = 'Corrente' | 'Poupança' | 'Pagamentos' | 'Investimentos' | 'Outros';

export interface Bank {
  id: string;
  userId?: string;
  name: string;
  institution: string;
  agency: string;
  account: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  color: string;
  icon: string;
  status: 'Ativo' | 'Inativo';
  archived: boolean;
  updatedAt: string;
}

export type CardNetwork = 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Outros';

export interface Card {
  id: string;
  userId?: string;
  name: string;
  bankId: string;
  network: CardNetwork;
  limitTotal: number;
  limitUsed: number;
  limitAvailable: number;
  closingDay: number; // 1-31
  dueDay: number; // 1-31
  color: string;
  icon: string;
  status: 'Ativo' | 'Inativo';
  archived: boolean;
}

export interface CardPurchase {
  id: string;
  cardId: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  installmentsTotal: number;
  installmentCurrent: number;
  isRecurring?: boolean;
}

export interface CardInvoice {
  id: string;
  userId?: string;
  cardId: string;
  month: number; // 1-12
  year: number;
  amount: number;
  status: 'Aberta' | 'Paga' | 'Atrasada';
  paidDate?: string;
  paidFromBankId?: string;
  purchases: CardPurchase[];
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  type: 'Despesa' | 'Receita' | 'Ambos';
  color: string;
  icon: string;
  isSystem?: boolean;
  archived: boolean;
}

export interface Subcategory {
  id: string;
  userId?: string;
  categoryId: string;
  name: string;
  archived: boolean;
}

export interface Income {
  id: string;
  userId?: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  bankId?: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  notes?: string;
  attachmentName?: string;
  archived: boolean;
  createdAt: string;
  createdBy: string;
}

export type Periodicity = 'Mensal' | 'Semanal' | 'Anual';
export type PaymentMethod = 'Dinheiro' | 'Pix' | 'Débito' | 'Boleto' | 'Cartão';
export type ExpenseStatus = 'Pago' | 'Pendente' | 'Atrasado';

export interface FixedExpense {
  id: string;
  userId?: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  dueDay: number;
  periodicity: Periodicity;
  paymentMethod: PaymentMethod;
  bankId?: string;
  cardId?: string;
  status: ExpenseStatus;
  receiptName?: string;
  lastPaidDate?: string;
  archived: boolean;
}

export interface VariableExpense {
  id: string;
  userId?: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  bankId?: string;
  cardId?: string;
  status: ExpenseStatus;
  receiptName?: string;
  archived: boolean;
  installmentsCount?: number;
  currentInstallment?: number;
  installmentAmount?: number;
  notes?: string;
}

export type LoanType = 'CDC' | 'Consignado' | 'Financiamento' | 'Crédito Pessoal' | 'Capital de Giro' | 'Outros';
export type AmortizationSystem = 'PRICE' | 'SAC' | 'Personalizado';

export type InstallmentStatus = 'Pendente' | 'Paga' | 'Atrasada' | 'Antecipada' | 'Quitada' | 'Renegociada';

export interface LoanInstallment {
  number: number;
  dueDate: string;
  amount: number; // Prestação
  principal: number; // Amortização
  interest: number; // Juros
  iof: number;
  insurance: number;
  fees: number;
  paidAmount: number; // Total Pago
  remainingBalance: number; // Saldo Devedor
  status: InstallmentStatus;
  paidDate?: string;
  paymentBankId?: string;
  paymentCardId?: string;
}

export interface ConsignadoDetails {
  iofTotal: number;
  insuranceTotal: number;
  monthlyFee: number;
}

export interface Loan {
  id: string;
  userId?: string;
  bankId: string;
  contractNumber?: string;
  contractDate?: string; // Data do empréstimo / contratação (YYYY-MM-DD)
  firstDueDate?: string; // Data do vencimento da 1ª parcela (YYYY-MM-DD)
  type: LoanType | string;
  customType?: string;
  contractedAmount: number; // Valor contratado
  netAmountReceived: number; // Valor líquido recebido
  interestRateMonthly: number; // Taxa mensal %
  interestRateYearly: number; // Taxa anual %
  cetRateYearly: number; // CET % a.a.
  iofAmount: number; // IOF
  insuranceAmount: number; // Seguro
  feesAmount?: number; // Encargos
  amortizationSystem: AmortizationSystem;
  installmentsTotal: number;
  installmentsPaid: number;
  installmentAmount: number;
  outstandingBalance: number;
  paidAmount: number;
  paidInterest: number;
  paidAmortization: number;
  status: 'Ativo' | 'Quitado' | 'Encerrado';
  consignadoDetails?: ConsignadoDetails;
  installments: LoanInstallment[];
  archived: boolean;
}

export type InvestmentType =
  | 'Tesouro Direto'
  | 'CDB'
  | 'LCI'
  | 'LCA'
  | 'CRI'
  | 'CRA'
  | 'ETF'
  | 'FII'
  | 'Fundos'
  | 'Ações'
  | 'Poupança'
  | 'Cripto'
  | 'Outros';

export type LiquidityType = 'Diária' | 'No Vencimento' | 'D+1' | 'D+30';

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  type: 'Aporte' | 'Resgate' | 'Rendimento';
  amount: number;
  date: string;
  notes?: string;
}

export interface Investment {
  id: string;
  userId?: string;
  institution: string;
  type: InvestmentType;
  indexer?: 'CDI' | 'Selic' | 'IPCA' | 'Prefixado' | 'Outros';
  interestRate?: number; // e.g. 100 (% do CDI) or 12.5 (% a.a.)
  appliedAmount: number;
  currentAmount: number;
  yieldPercent: number; // rentabilidade atual (%)
  yieldAccumulated: number; // rendimento acumulado (R$)
  yieldMonthly?: number; // rendimento mensal (R$)
  yieldYearly?: number; // rendimento anual (R$)
  liquidity: LiquidityType;
  applicationDate: string;
  maturityDate?: string;
  archived: boolean;
  transactions: InvestmentTransaction[];
}

export interface Goal {
  id: string;
  userId?: string;
  name: string;
  category: 'Reserva Emergência' | 'Casa' | 'Carro' | 'Viagem' | 'Investimentos' | 'Outros';
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  color: string;
  archived: boolean;
}

export interface Transfer {
  id: string;
  userId?: string;
  originBankId: string;
  destinationBankId: string;
  amount: number;
  date: string;
  description: string;
  archived: boolean;
}

export type SystemModule =
  | 'bancos'
  | 'cartoes'
  | 'categorias'
  | 'subcategorias'
  | 'receitas'
  | 'contas_fixas'
  | 'contas_variaveis'
  | 'emprestimos'
  | 'investimentos'
  | 'metas'
  | 'usuarios'
  | 'configuracoes'
  | 'transferencias';

export interface TrashItem {
  id: string;
  userId?: string;
  originalId: string;
  module: SystemModule;
  itemTitle: string;
  originalData: any;
  deletedAt: string;
  deletedBy: string;
}

export type AuditAction =
  | 'Inclusão'
  | 'Alteração'
  | 'Exclusão'
  | 'Restauração'
  | 'Bloqueio'
  | 'Backup'
  | 'Login'
  | 'Pagamento'
  | 'Quitação';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  module: SystemModule;
  action: AuditAction;
  details: string;
  previousValue?: string;
  newValue?: string;
  ip?: string;
}

export interface SystemSettings {
  theme: 'light' | 'dark';
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  trashRetentionDays: number;
  requirePin: boolean;
  pinCode?: string;
  defaultCurrency: string;
  lastBackupDate?: string;
}

export interface ReconciliationItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Entrada' | 'Saída';
  matchedCategoryId?: string;
  matchedSubcategoryId?: string;
  matchedBankId?: string;
  status: 'Pendente' | 'Conciliado' | 'Ignorado';
}
