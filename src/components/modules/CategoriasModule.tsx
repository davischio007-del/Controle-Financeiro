import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { Category, Subcategory } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { SmartDeleteModal } from '../common/SmartDeleteModal';
import { X, Tag, FolderTree } from 'lucide-react';

export const CategoriasModule: React.FC = () => {
  const {
    categories,
    subcategories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
  } = useFinancialStore();

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'Despesa' | 'Receita' | 'Ambos'>('Despesa');
  const [catColor, setCatColor] = useState('#EF4444');

  // Subcategory Form
  const [subName, setSubName] = useState('');
  const [subCatId, setSubCatId] = useState('');

  const openAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType('Despesa');
    setCatColor('#EF4444');
    setIsCatModalOpen(true);
  };

  const openEditCategory = (item: Category) => {
    setEditingCategory(item);
    setCatName(item.name);
    setCatType(item.type);
    setCatColor(item.color);
    setIsCatModalOpen(true);
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: catName,
        type: catType,
        color: catColor,
      });
    } else {
      addCategory({
        name: catName,
        type: catType,
        color: catColor,
        icon: 'Tag',
      });
    }
    setIsCatModalOpen(false);
  };

  const handleSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCatId || !subName) return;
    addSubcategory({
      categoryId: subCatId,
      name: subName,
    });
    setSubName('');
    setIsSubModalOpen(false);
  };

  const catColumns: Column<Category>[] = [
    {
      header: 'Categoria',
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ backgroundColor: r.color }}
          >
            <Tag className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-100">{r.name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Tipo',
      accessor: (r) => (
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            r.type === 'Receita'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          {r.type}
        </span>
      ),
    },
    {
      header: 'Subcategorias Vinculadas',
      accessor: (r) => {
        const subs = subcategories.filter((s) => s.categoryId === r.id);
        return (
          <div className="flex flex-wrap gap-1">
            {subs.length === 0 ? (
              <span className="text-slate-400 text-[11px]">Nenhuma</span>
            ) : (
              subs.map((s) => (
                <span
                  key={s.id}
                  className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md"
                >
                  {s.name}
                </span>
              ))
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        title="Categorias & Subcategorias"
        subtitle="Classificação orçamentária para análises precisas nos relatórios"
        columns={catColumns}
        data={categories}
        idKey="id"
        onAdd={openAddCategory}
        onEdit={openEditCategory}
        onDelete={(item) => setDeleteCatTarget(item)}
        exportFilename="categorias_financeiras"
        customHeaderActions={
          <button
            onClick={() => {
              setSubCatId(categories[0]?.id || '');
              setSubName('');
              setIsSubModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
          >
            <FolderTree className="w-4 h-4" />
            <span>➕ Nova Subcategoria</span>
          </button>
        }
      />

      {/* Add Subcategory Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsSubModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              ➕ Adicionar Subcategoria
            </h3>

            <form onSubmit={handleSubSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria Pai</label>
                <select
                  required
                  value={subCatId}
                  onChange={(e) => setSubCatId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Subcategoria</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Ex: Combustível, Hortifruti, Manutenção"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md"
                >
                  Salvar Subcategoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCatModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingCategory ? '✏️ Editar Categoria' : '➕ Nova Categoria'}
            </h3>

            <form onSubmit={handleCatSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Alimentação, Habitação, Lazer"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Categoria</label>
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Despesa">Despesa</option>
                    <option value="Receita">Receita</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cor</label>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full h-9 rounded-xl cursor-pointer border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Delete Modal */}
      <SmartDeleteModal
        isOpen={!!deleteCatTarget}
        onClose={() => setDeleteCatTarget(null)}
        title="Excluir Categoria"
        itemName={deleteCatTarget?.name || ''}
        moduleType="geral"
        onConfirm={() => {
          if (deleteCatTarget) deleteCategory(deleteCatTarget.id);
        }}
      />
    </div>
  );
};
