import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Transfer } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatCurrency, formatDate, getCurrentDateFormatted } from '../../lib/utils';
import { ArrowRightLeft, X } from 'lucide-react';

export const TransferenciasModule: React.FC = () => {
  const { transfers, banks, addTransfer } = useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originBankId, setOriginBankId] = useState(banks[0]?.id || '');
  const [destinationBankId, setDestinationBankId] = useState(banks[1]?.id || banks[0]?.id || '');
  const [amount, setAmount] = useState<number>(1000);
  const [date, setDate] = useState(getCurrentDateFormatted());
  const [description, setDescription] = useState('Transferência Entre Contas');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (originBankId === destinationBankId) {
      alert('A conta de origem e destino devem ser diferentes!');
      return;
    }
    addTransfer({
      originBankId,
      destinationBankId,
      amount,
      date,
      description,
    });
    setIsModalOpen(false);
  };

  const columns: Column<Transfer>[] = [
    {
      header: 'Descrição / Data',
      accessor: (r) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100">{r.description}</p>
          <span className="text-[11px] text-slate-400 font-mono">{formatDate(r.date)}</span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Conta Origem (Débito)',
      accessor: (r) => {
        const b = banks.find((bk) => bk.id === r.originBankId);
        return <span className="font-semibold text-rose-600 dark:text-rose-400">{b?.name || '-'}</span>;
      },
    },
    {
      header: 'Conta Destino (Crédito)',
      accessor: (r) => {
        const b = banks.find((bk) => bk.id === r.destinationBankId);
        return <span className="font-semibold text-emerald-600 dark:text-emerald-400">{b?.name || '-'}</span>;
      },
    },
    {
      header: 'Valor Transferido',
      accessor: (r) => <span className="font-black text-slate-900 dark:text-white">{formatCurrency(r.amount)}</span>,
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Transferências entre Contas"
        subtitle="Movimentações internas com atualização simultânea de saldos bancários"
        columns={columns}
        data={transfers}
        idKey="id"
        onAdd={() => {
          setOriginBankId(banks[0]?.id || '');
          setDestinationBankId(banks[1]?.id || banks[0]?.id || '');
          setAmount(1000);
          setDate(getCurrentDateFormatted());
          setDescription('Transferência Entre Contas');
          setIsModalOpen(true);
        }}
        exportFilename="transferencias_internas"
      />

      {/* Transfer Modal */}
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
              🔄 Realizar Transferência entre Contas
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-rose-600 dark:text-rose-400 mb-1">Conta de Origem (Saída)</label>
                  <select
                    required
                    value={originBankId}
                    onChange={(e) => setOriginBankId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({formatCurrency(b.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    Conta Destino (Entrada)
                  </label>
                  <select
                    required
                    value={destinationBankId}
                    onChange={(e) => setDestinationBankId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({formatCurrency(b.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
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
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Transferir Agora</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
