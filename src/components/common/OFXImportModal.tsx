import React, { useState } from 'react';
import { Upload, FileCode, CheckCircle, AlertCircle, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { useFinancialStore } from '../../services/storage';
import { ReconciliationItem } from '../../types';
import { parseOFXFile, parseCSVBankFile, formatCurrency } from '../../lib/utils';

interface OFXImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OFXImportModal: React.FC<OFXImportModalProps> = ({ isOpen, onClose }) => {
  const { banks, categories, subcategories, addIncome, addVariableExpense } = useFinancialStore();

  const [selectedBankId, setSelectedBankId] = useState<string>(banks[0]?.id || '');
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      let parsed: ReconciliationItem[] = [];
      if (file.name.toLowerCase().endsWith('.ofx')) {
        parsed = parseOFXFile(text);
      } else {
        parsed = parseCSVBankFile(text);
      }

      setItems(parsed);
    };

    reader.readAsText(file);
  };

  const handleReconcileItem = (
    itemId: string,
    catId: string,
    subCatId?: string
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, matchedCategoryId: catId, matchedSubcategoryId: subCatId, status: 'Conciliado' }
          : i
      )
    );
  };

  const handleExecuteImport = () => {
    const targetBank = banks.find((b) => b.id === selectedBankId);
    if (!targetBank) return;

    let count = 0;
    items.forEach((item) => {
      if (item.status === 'Ignorado') return;

      const catId = item.matchedCategoryId || categories[0]?.id || 'cat_outros';

      if (item.type === 'Entrada') {
        addIncome({
          description: `[Extrato] ${item.description}`,
          categoryId: catId,
          subcategoryId: item.matchedSubcategoryId,
          bankId: selectedBankId,
          amount: item.amount,
          date: item.date,
          isRecurring: false,
          notes: `Importado do extrato ${fileName}`,
        });
        count++;
      } else {
        addVariableExpense({
          description: `[Extrato] ${item.description}`,
          categoryId: catId,
          subcategoryId: item.matchedSubcategoryId,
          amount: item.amount,
          date: item.date,
          paymentMethod: 'Débito',
          bankId: selectedBankId,
          status: 'Pago',
        });
        count++;
      }
    });

    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      setItems([]);
      setFileName('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Importação & Conciliação OFX / CSV</h3>
            <p className="text-xs text-slate-500">Importe extratos bancários e faça o de-para automático das categorias</p>
          </div>
        </div>

        {importSuccess ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Extrato Conciliado com Sucesso!</h4>
            <p className="text-xs text-slate-500">
              Os lançamentos foram salvos e os saldos das contas foram atualizados.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Step 1: Select Bank & Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Selecione a Conta Bancária de Destino
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.institution})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  2. Upload do Arquivo (.OFX ou .CSV)
                </label>
                <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors">
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>{fileName || 'Escolher Extrato Bancário...'}</span>
                  <input type="file" accept=".ofx,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Step 2: Reconciliation Table */}
            {items.length > 0 && (
              <div>
                <div className="flex items-center justify-between my-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Lançamentos Identificados ({items.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">Ajuste as categorias antes de confirmar</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="p-2.5">Data</th>
                        <th className="p-2.5">Descrição Extrato</th>
                        <th className="p-2.5">Tipo</th>
                        <th className="p-2.5">Valor</th>
                        <th className="p-2.5">Categoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-mono text-slate-500">{item.date}</td>
                          <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                          <td className="p-2.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.type === 'Entrada'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td
                            className={`p-2.5 font-bold font-mono ${
                              item.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="p-2.5">
                            <select
                              value={item.matchedCategoryId || ''}
                              onChange={(e) => handleReconcileItem(item.id, e.target.value)}
                              className="text-xs p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                              <option value="">Selecione a Categoria...</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!importSuccess && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={items.length === 0}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Confirmar & Conciliar Extrato</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
