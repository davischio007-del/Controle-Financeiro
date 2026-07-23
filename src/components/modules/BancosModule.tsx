import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Bank, AccountType } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency, formatDate } from '../../lib/utils';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import { OFXImportModal } from '../common/OFXImportModal';
import { Plus, X, Landmark, FileCode, ArrowRightLeft } from 'lucide-react';

export const BancosModule: React.FC = () => {
  const { banks, addBank, updateBank, deleteBankSmart, incomes, fixedExpenses, variableExpenses } =
    useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOFXModalOpen, setIsOFXModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Bank | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<Bank | null>(null);

  // Form
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [type, setType] = useState<AccountType>('Corrente');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [color, setColor] = useState('#3B82F6');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setInstitution('');
    setAgency('');
    setAccount('');
    setType('Corrente');
    setInitialBalance(0);
    setCurrentBalance(0);
    setColor('#3B82F6');
    setStatus('Ativo');
    setIsModalOpen(true);
  };

  const openEditModal = (item: Bank) => {
    setEditingItem(item);
    setName(item.name);
    setInstitution(item.institution);
    setAgency(item.agency);
    setAccount(item.account);
    setType(item.type);
    setInitialBalance(item.initialBalance);
    setCurrentBalance(item.currentBalance);
    setColor(item.color);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateBank(editingItem.id, {
        name,
        institution,
        agency,
        account,
        type,
        initialBalance,
        currentBalance,
        color,
        status,
      });
    } else {
      addBank({
        name,
        institution,
        agency,
        account,
        type,
        initialBalance,
        currentBalance: initialBalance,
        color,
        icon: 'Landmark',
        status,
      });
    }
    setIsModalOpen(false);
  };

  // Check if bank has movements
  const bankHasMovements = (bankId: string) => {
    const hasInc = incomes.some((i) => i.bankId === bankId);
    const hasFix = fixedExpenses.some((f) => f.bankId === bankId);
    const hasVar = variableExpenses.some((v) => v.bankId === bankId);
    return hasInc || hasFix || hasVar;
  };

  const columns: Column<Bank>[] = [
    {
      header: 'Instituição / Nome',
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ backgroundColor: r.color }}
          >
            {r.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{r.name}</p>
            <p className="text-[11px] text-slate-400">{r.institution}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Agência / Conta',
      accessor: (r) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          Ag {r.agency} / Cc {r.account}
        </span>
      ),
    },
    {
      header: 'Tipo',
      accessor: (r) => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {r.type}
        </span>
      ),
    },
    {
      header: 'Saldo Atual',
      accessor: (r) => (
        <span className={`font-black ${r.currentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(r.currentBalance)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Status',
      accessor: (r) => (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            r.status === 'Ativo'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Bancos & Contas Bancárias"
        subtitle="Contas correntes, digitais, investimentos e conciliação bancária OFX/CSV"
        columns={columns}
        data={banks}
        idKey="id"
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={(item) => setDeleteItemTarget(item)}
        exportFilename="contas_bancarias"
        customHeaderActions={
          <button
            onClick={() => setIsOFXModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
          >
            <FileCode className="w-4 h-4" />
            <span>Importar Extrato OFX/CSV</span>
          </button>
        }
      />

      {/* OFX Import Modal */}
      <OFXImportModal isOpen={isOFXModalOpen} onClose={() => setIsOFXModalOpen(false)} />

      {/* Add/Edit Bank Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingItem ? '✏️ Editar Banco' : '➕ Novo Banco'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Itaú Unibanco, Nubank Principal"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Instituição</label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ex: Banco Itaú S.A."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Conta</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Corrente">Corrente</option>
                    <option value="Poupança">Poupança</option>
                    <option value="Pagamentos">Pagamentos</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Agência</label>
                  <input
                    type="text"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    placeholder="0001"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número da Conta</label>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="12345-6"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cor Identificadora</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-xs">{color}</span>
                  </div>
                </div>
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
                  Salvar Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Delete Modal */}
      <SmartDeleteModal
        isOpen={!!deleteItemTarget}
        onClose={() => setDeleteItemTarget(null)}
        title="Excluir Conta Bancária"
        itemName={deleteItemTarget?.name || ''}
        moduleType="bancos"
        hasActiveData={deleteItemTarget ? bankHasMovements(deleteItemTarget.id) : false}
        availableBanks={banks.filter((b) => b.id !== deleteItemTarget?.id)}
        onConfirm={(option, targetBankId) => {
          if (deleteItemTarget) {
            deleteBankSmart(deleteItemTarget.id, option as any, targetBankId);
          }
        }}
      />
    </div>
  );
};
