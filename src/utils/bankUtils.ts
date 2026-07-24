import { Bank, Income, FixedExpense, VariableExpense, Transfer, Loan, Investment, Category, Subcategory } from '../types';

export interface BankMovement {
  id: string;
  date: string;
  description: string;
  categoryName: string;
  subcategoryName: string;
  type: 'Entrada' | 'Saída';
  amount: number;
  originModule?: string;
}

export interface BankStoreState {
  banks: Bank[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  transfers: Transfer[];
  loans: Loan[];
  investments: Investment[];
  categories: Category[];
  subcategories: Subcategory[];
}

/**
 * Calculates all individual bank movements (Incomes, Expenses, Transfers, Loans, Investments)
 * for a specific bank account.
 */
export function getBankMovements(bankId: string, state: BankStoreState): BankMovement[] {
  const movements: BankMovement[] = [];

  // 1. Incomes (Receitas)
  (state.incomes || [])
    .filter((i) => i.bankId === bankId && !i.archived)
    .forEach((i) => {
      const cat = state.categories?.find((c) => c.id === i.categoryId)?.name || 'Receitas';
      const sub = state.subcategories?.find((s) => s.id === i.subcategoryId)?.name || 'Geral';
      movements.push({
        id: i.id,
        date: i.date || '2026-07-01',
        description: i.description,
        categoryName: cat,
        subcategoryName: sub,
        type: 'Entrada',
        amount: Number(i.amount) || 0,
        originModule: 'receitas',
      });
    });

  // 2. Fixed Expenses (Contas Fixas - Paid, Non-Card)
  (state.fixedExpenses || [])
    .filter((f) => f.bankId === bankId && !f.archived && f.status === 'Pago' && f.paymentMethod !== 'Cartão')
    .forEach((f) => {
      const cat = state.categories?.find((c) => c.id === f.categoryId)?.name || 'Contas Fixas';
      const sub = state.subcategories?.find((s) => s.id === f.subcategoryId)?.name || 'Geral';
      movements.push({
        id: f.id,
        date: f.lastPaidDate || (f.dueDay ? `2026-07-${String(f.dueDay).padStart(2, '0')}` : '2026-07-01'),
        description: f.description,
        categoryName: cat,
        subcategoryName: sub,
        type: 'Saída',
        amount: Number(f.amount) || 0,
        originModule: 'contas_fixas',
      });
    });

  // 3. Variable Expenses (Contas Variáveis - Paid, Non-Card)
  (state.variableExpenses || [])
    .filter((v) => v.bankId === bankId && !v.archived && v.status === 'Pago' && v.paymentMethod !== 'Cartão')
    .forEach((v) => {
      const cat = state.categories?.find((c) => c.id === v.categoryId)?.name || 'Despesas';
      const sub = state.subcategories?.find((s) => s.id === v.subcategoryId)?.name || 'Geral';
      movements.push({
        id: v.id,
        date: v.date || '2026-07-01',
        description: v.description,
        categoryName: cat,
        subcategoryName: sub,
        type: 'Saída',
        amount: Number(v.amount) || 0,
        originModule: 'contas_variaveis',
      });
    });

  // 4. Transfers (Transferências)
  (state.transfers || [])
    .filter((t) => (t.originBankId === bankId || t.destinationBankId === bankId) && !t.archived)
    .forEach((t) => {
      const isIncoming = t.destinationBankId === bankId;
      movements.push({
        id: `${t.id}_${isIncoming ? 'in' : 'out'}`,
        date: t.date || '2026-07-01',
        description: isIncoming ? `Transferência Recebida: ${t.description}` : `Transferência Enviada: ${t.description}`,
        categoryName: 'Transferências',
        subcategoryName: isIncoming ? 'Entrada' : 'Saída',
        type: isIncoming ? 'Entrada' : 'Saída',
        amount: Number(t.amount) || 0,
        originModule: 'transferencias',
      });
    });

  // 5. Loans (Empréstimos - Credit release & Installment/Payoff payments)
  (state.loans || [])
    .filter((l) => !l.archived)
    .forEach((l) => {
      // Contracted loan amount credited to bank
      if (l.bankId === bankId) {
        const netReceived = Number(l.netAmountReceived || l.contractedAmount) || 0;
        if (netReceived > 0) {
          movements.push({
            id: `${l.id}_release`,
            date: l.contractDate || '2026-07-01',
            description: `Empréstimo Contratado (${l.type})`,
            categoryName: 'Empréstimos',
            subcategoryName: 'Liberação de Crédito',
            type: 'Entrada',
            amount: netReceived,
            originModule: 'emprestimos',
          });
        }
      }

      // Paid installments
      (l.installments || []).forEach((inst) => {
        if ((inst.status === 'Paga' || inst.status === 'Antecipada' || inst.status === 'Quitada') && inst.paidAmount > 0) {
          // Check if loan installment was paid via this bank
          const sourceBankId = inst.paymentBankId || (!inst.paymentCardId ? l.bankId : undefined);
          if (sourceBankId === bankId) {
            movements.push({
              id: `${l.id}_inst_${inst.number}`,
              date: inst.paidDate || inst.dueDate || '2026-07-01',
              description: `Pgto Parcela ${inst.number}/${l.installmentsTotal} (${l.type})`,
              categoryName: 'Empréstimos',
              subcategoryName: 'Pagamento Parcela',
              type: 'Saída',
              amount: Number(inst.paidAmount) || 0,
              originModule: 'emprestimos',
            });
          }
        }
      });
    });

  // 6. Investments (Investimentos - Aportes & Resgates)
  const currentBank = state.banks.find((b) => b.id === bankId);
  (state.investments || [])
    .filter((inv) => !inv.archived)
    .forEach((inv) => {
      // Match bank if institution equals bank name or bankId
      const matchesBank = currentBank && (
        currentBank.name.toLowerCase() === inv.institution.toLowerCase()
      );
      if (matchesBank) {
        (inv.transactions || []).forEach((tx) => {
          if (tx.type === 'Aporte' && tx.amount > 0) {
            movements.push({
              id: tx.id,
              date: tx.date || '2026-07-01',
              description: `Aporte Investimento: ${inv.type} (${inv.institution})`,
              categoryName: 'Investimentos',
              subcategoryName: 'Aporte',
              type: 'Saída',
              amount: Number(tx.amount) || 0,
              originModule: 'investimentos',
            });
          } else if (tx.type === 'Resgate' && tx.amount > 0) {
            movements.push({
              id: tx.id,
              date: tx.date || '2026-07-01',
              description: `Resgate Investimento: ${inv.type} (${inv.institution})`,
              categoryName: 'Investimentos',
              subcategoryName: 'Resgate',
              type: 'Entrada',
              amount: Number(tx.amount) || 0,
              originModule: 'investimentos',
            });
          }
        });
      }
    });

  // Sort by date ascending
  return movements.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculates the exact current balance for a bank based on initial balance and all movements.
 */
export function calculateBankCurrentBalance(bank: Bank, state: BankStoreState): number {
  const movements = getBankMovements(bank.id, state);
  const totalEntradas = movements
    .filter((m) => m.type === 'Entrada')
    .reduce((acc, m) => acc + m.amount, 0);
  const totalSaidas = movements
    .filter((m) => m.type === 'Saída')
    .reduce((acc, m) => acc + m.amount, 0);

  return (Number(bank.initialBalance) || 0) + totalEntradas - totalSaidas;
}

/**
 * Returns updated list of banks with recalculated current balances for all banks.
 */
export function recalculateAllBankBalances(state: BankStoreState): Bank[] {
  return (state.banks || []).map((bank) => {
    const updatedBalance = calculateBankCurrentBalance(bank, state);
    return {
      ...bank,
      currentBalance: updatedBalance,
    };
  });
}
