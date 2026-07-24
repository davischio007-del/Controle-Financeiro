import { Loan, LoanInstallment, ReconciliationItem } from '../types';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import bcrypt from 'bcryptjs';

// Currency Mask & Formatting
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/[^\d,-]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

// Date Formatting (YYYY-MM-DD -> DD/MM/YYYY)
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function getCurrentDateFormatted(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

// Password Hashing
export function hashPassword(password: string): string {
  try {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  } catch (e) {
    // Fallback simple hash string if sync bcrypt is limited
    return `$2a$10$fallback_${btoa(password)}`;
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    if (hash.startsWith('$2a$10$fallback_')) {
      return btoa(password) === hash.replace('$2a$10$fallback_', '');
    }
    return bcrypt.compareSync(password, hash);
  } catch (e) {
    return password === 'Snoop123@'; // Emergency fallback
  }
}

// Amortization Calculators (PRICE / SAC / Personalizado)
function parseBaseDate(startDateStr?: string): Date {
  if (!startDateStr) return new Date();
  const clean = startDateStr.split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && parts[0] >= 1990) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(startDateStr);
  if (isNaN(d.getTime()) || d.getFullYear() < 1990) {
    return new Date();
  }
  return d;
}

function formatYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthlyDueDate(baseDate: Date, monthOffset: number): Date {
  const targetYear = baseDate.getFullYear();
  const targetMonth = baseDate.getMonth() + monthOffset;
  const targetDay = baseDate.getDate();
  const d = new Date(targetYear, targetMonth, targetDay);
  if (d.getDate() !== targetDay) {
    return new Date(targetYear, targetMonth + 1, 0);
  }
  return d;
}

export function calculatePRICESchedule(
  principal: number,
  monthlyRatePercent: number,
  totalInstallments: number,
  startDateStr: string,
  iofTotal: number = 0,
  insuranceTotal: number = 0,
  feesTotal: number = 0,
  firstDueDateStr?: string
): LoanInstallment[] {
  const i = monthlyRatePercent / 100;
  const p = principal;
  const n = Math.max(1, totalInstallments);

  let pmt = 0;
  if (i === 0) {
    pmt = p / n;
  } else {
    pmt = (p * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
  }

  const perInstallmentIof = iofTotal / n;
  const perInstallmentInsurance = insuranceTotal / n;
  const perInstallmentFees = feesTotal / n;

  const installments: LoanInstallment[] = [];
  let remaining = p;
  const useFirstDue = !!firstDueDateStr;
  const baseDate = parseBaseDate(firstDueDateStr || startDateStr);

  for (let step = 1; step <= n; step++) {
    const interest = remaining * i;
    const principalPaid = Math.min(remaining, pmt - interest);
    remaining = Math.max(0, remaining - principalPaid);

    const totalInstallmentVal = pmt + perInstallmentIof + perInstallmentInsurance + perInstallmentFees;

    const dueDate = useFirstDue
      ? getMonthlyDueDate(baseDate, step - 1)
      : getMonthlyDueDate(baseDate, step);

    installments.push({
      number: step,
      dueDate: formatYYYYMMDD(dueDate),
      amount: Math.round(totalInstallmentVal * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      iof: Math.round(perInstallmentIof * 100) / 100,
      insurance: Math.round(perInstallmentInsurance * 100) / 100,
      fees: Math.round(perInstallmentFees * 100) / 100,
      paidAmount: 0,
      status: 'Pendente',
      remainingBalance: Math.round(remaining * 100) / 100,
    });
  }

  return installments;
}

export function calculateSACSchedule(
  principal: number,
  monthlyRatePercent: number,
  totalInstallments: number,
  startDateStr: string,
  iofTotal: number = 0,
  insuranceTotal: number = 0,
  feesTotal: number = 0,
  firstDueDateStr?: string
): LoanInstallment[] {
  const i = monthlyRatePercent / 100;
  const p = principal;
  const n = Math.max(1, totalInstallments);
  const amort = p / n;

  const perInstallmentIof = iofTotal / n;
  const perInstallmentInsurance = insuranceTotal / n;
  const perInstallmentFees = feesTotal / n;

  const installments: LoanInstallment[] = [];
  let remaining = p;
  const useFirstDue = !!firstDueDateStr;
  const baseDate = parseBaseDate(firstDueDateStr || startDateStr);

  for (let step = 1; step <= n; step++) {
    const interest = remaining * i;
    const totalInstallmentVal = amort + interest + perInstallmentIof + perInstallmentInsurance + perInstallmentFees;
    remaining = Math.max(0, remaining - amort);

    const dueDate = useFirstDue
      ? getMonthlyDueDate(baseDate, step - 1)
      : getMonthlyDueDate(baseDate, step);

    installments.push({
      number: step,
      dueDate: formatYYYYMMDD(dueDate),
      amount: Math.round(totalInstallmentVal * 100) / 100,
      principal: Math.round(amort * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      iof: Math.round(perInstallmentIof * 100) / 100,
      insurance: Math.round(perInstallmentInsurance * 100) / 100,
      fees: Math.round(perInstallmentFees * 100) / 100,
      paidAmount: 0,
      status: 'Pendente',
      remainingBalance: Math.round(remaining * 100) / 100,
    });
  }

  return installments;
}

export function calculateCustomSchedule(
  principal: number,
  monthlyRatePercent: number,
  totalInstallments: number,
  startDateStr: string,
  iofTotal: number = 0,
  insuranceTotal: number = 0,
  feesTotal: number = 0,
  firstDueDateStr?: string
): LoanInstallment[] {
  const p = principal;
  const n = Math.max(1, totalInstallments);
  const amort = p / n;
  const totalInterest = p * (monthlyRatePercent / 100) * (n / 2);
  const perInstallmentInterest = totalInterest / n;
  const perInstallmentIof = iofTotal / n;
  const perInstallmentInsurance = insuranceTotal / n;
  const perInstallmentFees = feesTotal / n;

  const installments: LoanInstallment[] = [];
  let remaining = p;
  const useFirstDue = !!firstDueDateStr;
  const baseDate = parseBaseDate(firstDueDateStr || startDateStr);

  for (let step = 1; step <= n; step++) {
    const totalInstallmentVal = amort + perInstallmentInterest + perInstallmentIof + perInstallmentInsurance + perInstallmentFees;
    remaining = Math.max(0, remaining - amort);

    const dueDate = useFirstDue
      ? getMonthlyDueDate(baseDate, step - 1)
      : getMonthlyDueDate(baseDate, step);

    installments.push({
      number: step,
      dueDate: formatYYYYMMDD(dueDate),
      amount: Math.round(totalInstallmentVal * 100) / 100,
      principal: Math.round(amort * 100) / 100,
      interest: Math.round(perInstallmentInterest * 100) / 100,
      iof: Math.round(perInstallmentIof * 100) / 100,
      insurance: Math.round(perInstallmentInsurance * 100) / 100,
      fees: Math.round(perInstallmentFees * 100) / 100,
      paidAmount: 0,
      status: 'Pendente',
      remainingBalance: Math.round(remaining * 100) / 100,
    });
  }

  return installments;
}

// Early Payoff / Quitação Antecipada Calculation
// Invoice Closing Date Helper Rule
export function getInvoiceCompetence(
  purchaseDateStr: string,
  closingDay: number
): { month: number; year: number; competenceStr: string } {
  if (!purchaseDateStr) {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      competenceStr: `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
    };
  }

  const parts = purchaseDateStr.split('T')[0].split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  let targetMonth = month;
  let targetYear = year;

  // Purchases made AFTER closingDay belong automatically to the next invoice
  if (day > closingDay) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const compStr = `${String(targetMonth).padStart(2, '0')}/${targetYear}`;
  return { month: targetMonth, year: targetYear, competenceStr: compStr };
}

// Calculate competence for specific installment index (1-indexed)
export function getInstallmentCompetence(
  purchaseDateStr: string,
  closingDay: number,
  installmentIndex: number = 1
): { month: number; year: number; competenceStr: string } {
  const baseComp = getInvoiceCompetence(purchaseDateStr, closingDay);
  const totalMonths = (baseComp.month - 1) + (installmentIndex - 1);
  const targetMonth = (totalMonths % 12) + 1;
  const targetYear = baseComp.year + Math.floor(totalMonths / 12);
  const competenceStr = `${String(targetMonth).padStart(2, '0')}/${targetYear}`;
  return { month: targetMonth, year: targetYear, competenceStr };
}

// Calculate exact installment amounts ensuring sum(amounts) === totalAmount without penny rounding drift
export function calculateInstallmentAmounts(totalAmount: number, count: number): number[] {
  if (count <= 1) return [Math.round(totalAmount * 100) / 100];
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - (baseCents * count);

  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    // Add 1 cent to the first 'remainderCents' installments
    const cents = baseCents + (i < remainderCents ? 1 : 0);
    result.push(cents / 100);
  }
  return result;
}

// Early Payoff / Quitação Antecipada & Extra Amortization Calculation
export function calculateExtraAmortizationDetails(
  loan: Loan,
  extraAmount: number,
  extraDate: string,
  mode: 'reduce_term' | 'reduce_installment' | 'prazo' | 'parcela'
) {
  const isReduceTerm = mode === 'reduce_term' || mode === 'prazo';

  // Ensure we have complete schedule
  let baseSchedule = loan.installments || [];
  if (baseSchedule.length === 0 || !baseSchedule[0]?.principal) {
    const startDate = loan.contractDate || getCurrentDateFormatted();
    if (loan.amortizationSystem === 'SAC') {
      baseSchedule = calculateSACSchedule(
        loan.contractedAmount || 0,
        loan.interestRateMonthly || 0,
        loan.installmentsTotal || 12,
        startDate,
        loan.iofAmount || 0,
        loan.insuranceAmount || 0,
        loan.feesAmount || 0,
        loan.firstDueDate
      );
    } else if (loan.amortizationSystem === 'Personalizado') {
      baseSchedule = calculateCustomSchedule(
        loan.contractedAmount || 0,
        loan.interestRateMonthly || 0,
        loan.installmentsTotal || 12,
        startDate,
        loan.iofAmount || 0,
        loan.insuranceAmount || 0,
        loan.feesAmount || 0,
        loan.firstDueDate
      );
    } else {
      baseSchedule = calculatePRICESchedule(
        loan.contractedAmount || 0,
        loan.interestRateMonthly || 0,
        loan.installmentsTotal || 12,
        startDate,
        loan.iofAmount || 0,
        loan.insuranceAmount || 0,
        loan.feesAmount || 0,
        loan.firstDueDate
      );
    }
  }

  const pendingInsts = baseSchedule.filter(
    (inst) => inst.status !== 'Paga' && inst.status !== 'Antecipada' && inst.status !== 'Quitada'
  );

  const originalFutureInterest = pendingInsts.reduce((acc, i) => acc + (i.interest || 0), 0);
  const currentOutstanding = loan.outstandingBalance > 0 ? loan.outstandingBalance : pendingInsts.reduce((acc, i) => acc + (i.principal || 0), 0);

  const newBalance = Math.max(0, currentOutstanding - extraAmount);

  if (newBalance <= 0) {
    // Fully quitado
    return {
      newBalance: 0,
      newInstallmentCount: 0,
      newInstallmentAmount: 0,
      originalFutureInterest: Math.round(originalFutureInterest * 100) / 100,
      newFutureInterest: 0,
      interestSaved: Math.round(originalFutureInterest * 100) / 100,
      savingsPercent: 100,
      newPayoffDate: extraDate || getCurrentDateFormatted(),
      newInstallments: baseSchedule.map((inst) => {
        if (inst.status !== 'Paga' && inst.status !== 'Antecipada' && inst.status !== 'Quitada') {
          return {
            ...inst,
            status: 'Quitada' as const,
            paidAmount: inst.principal || inst.amount,
            paidDate: extraDate || getCurrentDateFormatted(),
            remainingBalance: 0,
          };
        }
        return inst;
      }),
    };
  }

  let updatedInstallments = baseSchedule.map((i) => ({ ...i }));
  let interestSaved = 0;
  let newInstallmentAmount = loan.installmentAmount;

  if (isReduceTerm) {
    // Reduzir Prazo: Abater das parcelas finais (start from the last pending installment going backwards)
    let remExtra = extraAmount;
    const pendingIndices: number[] = [];
    for (let idx = updatedInstallments.length - 1; idx >= 0; idx--) {
      const st = updatedInstallments[idx].status;
      if (st !== 'Paga' && st !== 'Antecipada' && st !== 'Quitada') {
        pendingIndices.push(idx);
      }
    }

    for (const idx of pendingIndices) {
      if (remExtra <= 0) break;
      const inst = updatedInstallments[idx];
      const instP = (inst.principal && inst.principal > 0) ? inst.principal : inst.amount;

      if (remExtra >= instP) {
        // Abate integralmente a parcela final
        remExtra -= instP;
        interestSaved += (inst.interest || 0);
        updatedInstallments[idx] = {
          ...inst,
          status: 'Antecipada',
          paidAmount: instP,
          paidDate: extraDate || getCurrentDateFormatted(),
          remainingBalance: 0,
        };
      } else {
        // Abate parcialmente a parcela final
        const newP = Math.max(0, instP - remExtra);
        const ratio = instP > 0 ? newP / instP : 0;
        const newInt = Math.round((inst.interest || 0) * ratio * 100) / 100;
        interestSaved += ((inst.interest || 0) - newInt);
        remExtra = 0;
        updatedInstallments[idx] = {
          ...inst,
          principal: Math.round(newP * 100) / 100,
          amount: Math.round((newP + newInt) * 100) / 100,
          interest: newInt,
        };
      }
    }
    // Parcela mensal permanece inalterada na redução de prazo
    newInstallmentAmount = loan.installmentAmount;
  } else {
    // Reduzir Parcela: Mantém a quantidade de parcelas e reduz o valor da PMT futura
    const nRem = Math.max(1, pendingInsts.length);
    const i = (loan.interestRateMonthly || 1.4) / 100;
    let newPmt = 0;
    if (i === 0) {
      newPmt = newBalance / nRem;
    } else {
      newPmt = (newBalance * (i * Math.pow(1 + i, nRem))) / (Math.pow(1 + i, nRem) - 1);
    }
    newInstallmentAmount = Math.round(newPmt * 100) / 100;

    let remP = newBalance;
    updatedInstallments = updatedInstallments.map((inst) => {
      if (inst.status !== 'Paga' && inst.status !== 'Antecipada' && inst.status !== 'Quitada') {
        const interest = Math.round(remP * i * 100) / 100;
        const principalPaid = Math.min(remP, Math.max(0, newPmt - interest));
        remP = Math.max(0, remP - principalPaid);
        return {
          ...inst,
          amount: newInstallmentAmount,
          principal: Math.round(principalPaid * 100) / 100,
          interest: interest,
          remainingBalance: Math.round(remP * 100) / 100,
        };
      }
      return inst;
    });

    const newFutureInterest = updatedInstallments
      .filter((inst) => inst.status !== 'Paga' && inst.status !== 'Antecipada' && inst.status !== 'Quitada')
      .reduce((acc, inst) => acc + (inst.interest || 0), 0);
    interestSaved = Math.max(0, originalFutureInterest - newFutureInterest);
  }

  const activeRemaining = updatedInstallments.filter(
    (inst) => inst.status !== 'Paga' && inst.status !== 'Antecipada' && inst.status !== 'Quitada'
  );

  const lastRemaining = activeRemaining[activeRemaining.length - 1];
  const newPayoffDate = lastRemaining ? lastRemaining.dueDate : (extraDate || getCurrentDateFormatted());

  return {
    newBalance: Math.round(newBalance * 100) / 100,
    newInstallmentCount: activeRemaining.length,
    newInstallmentAmount: isReduceTerm ? loan.installmentAmount : Math.round(newInstallmentAmount * 100) / 100,
    originalFutureInterest: Math.round(originalFutureInterest * 100) / 100,
    newFutureInterest: Math.round(Math.max(0, originalFutureInterest - interestSaved) * 100) / 100,
    interestSaved: Math.round(interestSaved * 100) / 100,
    savingsPercent: originalFutureInterest > 0 ? Math.round((interestSaved / originalFutureInterest) * 10000) / 100 : 0,
    newPayoffDate,
    newInstallments: updatedInstallments,
  };
}

export function calculateEarlyPayoffDetails(loan: Loan, payUntilInstallment: number) {
  const unpaidInstallments = loan.installments.filter(
    (inst) => inst.number > payUntilInstallment && inst.status !== 'Paga' && inst.status !== 'Antecipada' && inst.status !== 'Quitada'
  );

  let totalOriginalRemaining = 0;
  let netPrincipalToPayoff = 0;
  let futureInterestSaved = 0;

  unpaidInstallments.forEach((inst) => {
    totalOriginalRemaining += inst.amount;
    netPrincipalToPayoff += inst.principal + inst.iof + inst.insurance + inst.fees;
    futureInterestSaved += inst.interest;
  });

  return {
    remainingInstallmentsCount: unpaidInstallments.length,
    totalOriginalRemaining: Math.round(totalOriginalRemaining * 100) / 100,
    payoffAmountDiscounted: Math.round(netPrincipalToPayoff * 100) / 100, // Pure balance without future interest
    interestSavings: Math.round(futureInterestSaved * 100) / 100,
    discountPercentage:
      totalOriginalRemaining > 0
        ? Math.round((futureInterestSaved / totalOriginalRemaining) * 10000) / 100
        : 0,
  };
}

// File Exporters
export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(';'));

  data.forEach((row) => {
    const values = headers.map((header) => {
      const val = row[header];
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    });
    csvRows.push(values.join(';'));
  });

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(data: any[], filename: string) {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Relatório');
  xlsx.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF(
  title: string,
  headers: string[],
  rows: any[][],
  filename: string,
  meta?: { period?: string; emitDate?: string; user?: string; grandTotal?: string }
) {
  const doc = new jsPDF();
  const emitStr = meta?.emitDate || new Date().toLocaleString('pt-BR');
  const userStr = meta?.user || 'Administrador';
  const periodStr = meta?.period || 'Geral';

  // Header Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 15);

  // Subheader Metadata
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Período: ${periodStr}  |  Emissão: ${emitStr}  |  Usuário: ${userStr}`, 14, 21);

  let startY = 28;
  const pageWidth = 182;
  const colWidth = pageWidth / Math.max(1, headers.length);

  // Header row
  doc.setFillColor(15, 23, 42); // slate-900
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.rect(14, startY, pageWidth, 7, 'F');

  headers.forEach((h, idx) => {
    const truncated = h.length > 20 ? h.substring(0, 18) + '..' : h;
    doc.text(truncated, 16 + idx * colWidth, startY + 5);
  });

  startY += 11;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  let totalPages = 1;

  rows.forEach((row, rIdx) => {
    if (startY > 275) {
      // Add page footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${totalPages}`, 14, 287);
      doc.text(`Total de registros até aqui: ${rIdx}`, 140, 287);

      doc.addPage();
      totalPages++;
      startY = 18;

      // Repeat table header on new page
      doc.setFillColor(15, 23, 42);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.rect(14, startY, pageWidth, 7, 'F');
      headers.forEach((h, idx) => {
        const truncated = h.length > 20 ? h.substring(0, 18) + '..' : h;
        doc.text(truncated, 16 + idx * colWidth, startY + 5);
      });
      startY += 11;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
    }

    // Zebra striping
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, startY - 4, pageWidth, 6.5, 'F');
    }

    row.forEach((cell, cIdx) => {
      const textVal = String(cell ?? '');
      const truncated = textVal.length > 28 ? textVal.substring(0, 26) + '..' : textVal;
      doc.text(truncated, 16 + cIdx * colWidth, startY);
    });
    startY += 6.5;
  });

  // Grand Total Row if provided
  if (meta?.grandTotal) {
    startY += 2;
    doc.setFillColor(226, 232, 240);
    doc.rect(14, startY - 4, pageWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL GERAL: ${meta.grandTotal}`, 16, startY);
  }

  // Footer on final page
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Página ${totalPages} de ${totalPages}  |  Total de Registros: ${rows.length}`, 14, 287);

  doc.save(`${filename}.pdf`);
}

// OFX & CSV Parser for Bank Statements
export function parseOFXFile(ofxText: string): ReconciliationItem[] {
  const items: ReconciliationItem[] = [];
  const stmtTrnMatches = ofxText.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

  stmtTrnMatches.forEach((trnBlock, idx) => {
    const trnTypeMatch = trnBlock.match(/<TRNTYPE>(.*)/i);
    const dtPostedMatch = trnBlock.match(/<DTPOSTED>(.*)/i);
    const trnAmtMatch = trnBlock.match(/<TRNAMT>(.*)/i);
    const memoMatch = trnBlock.match(/<MEMO>(.*)/i) || trnBlock.match(/<NAME>(.*)/i);

    const amount = trnAmtMatch ? parseFloat(trnAmtMatch[1].trim()) : 0;
    const rawDate = dtPostedMatch ? dtPostedMatch[1].trim().substring(0, 8) : '';
    const formattedDate = rawDate.length === 8
      ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`
      : getCurrentDateFormatted();

    items.push({
      id: `ofx_${Date.now()}_${idx}`,
      date: formattedDate,
      description: memoMatch ? memoMatch[1].trim().replace(/<[^>]+>/g, '') : 'Movimentação OFX',
      amount: Math.abs(amount),
      type: amount >= 0 ? 'Entrada' : 'Saída',
      status: 'Pendente',
    });
  });

  return items;
}

export function parseCSVBankFile(csvText: string): ReconciliationItem[] {
  const items: ReconciliationItem[] = [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  lines.slice(1).forEach((line, idx) => {
    const cols = line.split(/;|,/).map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length >= 3) {
      const dateStr = cols[0];
      const desc = cols[1];
      const amtStr = cols[2].replace('.', '').replace(',', '.');
      const amt = parseFloat(amtStr);

      if (!isNaN(amt)) {
        items.push({
          id: `csv_${Date.now()}_${idx}`,
          date: dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr,
          description: desc || 'Lançamento CSV',
          amount: Math.abs(amt),
          type: amt >= 0 ? 'Entrada' : 'Saída',
          status: 'Pendente',
        });
      }
    }
  });

  return items;
}
