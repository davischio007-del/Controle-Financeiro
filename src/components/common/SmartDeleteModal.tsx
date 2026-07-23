import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ArrowRightLeft, X } from 'lucide-react';
import { Bank, Category } from '../../types';

interface SmartDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemName: string;
  moduleType: 'bancos' | 'cartoes' | 'categorias' | 'emprestimos' | 'geral';
  hasActiveData?: boolean;
  availableBanks?: Bank[];
  availableCategories?: Category[];
  onConfirm: (option: 'delete' | 'deactivate' | 'transfer' | 'reassign', targetId?: string) => void;
}

export const SmartDeleteModal: React.FC<SmartDeleteModalProps> = ({
  isOpen,
  onClose,
  title,
  itemName,
  moduleType,
  hasActiveData = false,
  availableBanks = [],
  availableCategories = [],
  onConfirm,
}) => {
  const [selectedOption, setSelectedOption] = useState<'delete' | 'deactivate' | 'transfer' | 'reassign'>(
    hasActiveData && (moduleType === 'cartoes' || moduleType === 'emprestimos') ? 'deactivate' : 'delete'
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  if (!isOpen) return null;

  const handleExecute = () => {
    onConfirm(selectedOption, selectedTargetId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500">Exclusão Inteligente & Integridade Referencial</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          Você selecionou o item <strong className="text-slate-900 dark:text-white">"{itemName}"</strong>. Por favor, escolha a ação desejada:
        </p>

        {/* Custom Rules based on Module */}
        <div className="space-y-3 mb-6">
          {/* Card Integrity warning */}
          {moduleType === 'cartoes' && hasActiveData && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-800 dark:text-red-300 mb-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>
                Este cartão possui faturas ou saldo de limite utilizado. Para garantir a integridade dos históricos, não é permitido excluir permanentemente.
              </span>
            </div>
          )}

          {/* Loan Integrity warning */}
          {moduleType === 'emprestimos' && hasActiveData && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-800 dark:text-red-300 mb-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>
                Este empréstimo possui parcelas pagas registradas. Para preservar os lançamentos contábeis, ele será encerrado ao invés de excluído.
              </span>
            </div>
          )}

          {/* Radio Options */}
          {!(moduleType === 'cartoes' && hasActiveData) && !(moduleType === 'emprestimos' && hasActiveData) && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
              <input
                type="radio"
                name="smart_delete"
                value="delete"
                checked={selectedOption === 'delete'}
                onChange={() => setSelectedOption('delete')}
                className="w-4 h-4 text-red-600"
              />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  🗑️ Excluir permanentemente / Enviar para Lixeira
                </p>
                <p className="text-[11px] text-slate-500">O registro será movido para a lixeira por 90 dias.</p>
              </div>
            </label>
          )}

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
            <input
              type="radio"
              name="smart_delete"
              value="deactivate"
              checked={selectedOption === 'deactivate'}
              onChange={() => setSelectedOption('deactivate')}
              className="w-4 h-4 text-amber-600"
            />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                🔒 Apenas desativar / encerrar cadastro
              </p>
              <p className="text-[11px] text-slate-500">
                O cadastro ficará inativo mas todo o histórico financeiro será mantido.
              </p>
            </div>
          </label>

          {/* Bank Transfer Movements Option */}
          {moduleType === 'bancos' && availableBanks.length > 0 && (
            <div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="radio"
                  name="smart_delete"
                  value="transfer"
                  checked={selectedOption === 'transfer'}
                  onChange={() => setSelectedOption('transfer')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    🔄 Transferir movimentações para outro banco
                  </p>
                  <p className="text-[11px] text-slate-500">Mover lançamentos existentes para outra conta bancária.</p>
                </div>
              </label>

              {selectedOption === 'transfer' && (
                <div className="ml-7 mt-2">
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Selecione a conta de destino...</option>
                    {availableBanks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.institution})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Category Reassign Option */}
          {moduleType === 'categorias' && availableCategories.length > 0 && (
            <div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="radio"
                  name="smart_delete"
                  value="reassign"
                  checked={selectedOption === 'reassign'}
                  onChange={() => setSelectedOption('reassign')}
                  className="w-4 h-4 text-indigo-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    🏷️ Reorganizar lançamentos em outra categoria
                  </p>
                  <p className="text-[11px] text-slate-500">Mover despesas e receitas para outra categoria.</p>
                </div>
              </label>

              {selectedOption === 'reassign' && (
                <div className="ml-7 mt-2">
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Selecione a nova categoria...</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleExecute}
            disabled={
              (selectedOption === 'transfer' && !selectedTargetId) ||
              (selectedOption === 'reassign' && !selectedTargetId)
            }
            className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
          >
            Confirmar Operação
          </button>
        </div>
      </div>
    </div>
  );
};
