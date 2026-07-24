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
  const [selectedOption, setSelectedOption] = useState<'delete' | 'deactivate' | 'transfer' | 'reassign'>('delete');
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
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title || 'Confirmar Exclusão'}</h3>
            <p className="text-xs text-slate-500">Envio para a Lixeira</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl mb-5">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Tem certeza de que deseja enviar o item <strong className="text-slate-900 dark:text-white">"{itemName}"</strong> para a lixeira?
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Ele deixará de ser exibido nos relatórios ativos, mas você poderá restaurá-lo manualmente a qualquer momento no módulo de Lixeira.
          </p>
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
            className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-600/20 transition-all"
          >
            Enviar para Lixeira
          </button>
        </div>
      </div>
    </div>
  );
};
