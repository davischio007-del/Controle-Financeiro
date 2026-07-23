import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Archive,
  RotateCcw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/utils';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  filterOptions?: string[];
  filterKey?: string;
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  data: T[];
  onAdd?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onDuplicate?: (item: T) => void;
  onArchive?: (item: T) => void;
  onRestore?: (item: T) => void;
  idKey: keyof T;
  searchPlaceholder?: string;
  customHeaderActions?: React.ReactNode;
  exportFilename?: string;
}

export function DataTable<T extends Record<string, any>>({
  title,
  subtitle,
  columns,
  data,
  onAdd,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onRestore,
  idKey,
  searchPlaceholder = 'Buscar registros...',
  customHeaderActions,
  exportFilename = 'relatorio_financeiro',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Search & Filter
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Search matches
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        const matches = Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(searchLower);
        });
        if (!matches) return false;
      }

      // Column Filters matches
      for (const [key, filterVal] of Object.entries(activeFilters)) {
        if (filterVal && String(row[key]) !== filterVal) {
          return false;
        }
      }

      return true;
    });
  }, [data, search, activeFilters]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldKey);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    exportToCSV(filteredData, exportFilename);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredData, exportFilename);
  };

  const handleExportPDF = () => {
    const headers = columns.map((c) => c.header);
    const rows = filteredData.map((row) =>
      columns.map((c) => {
        if (typeof c.accessor === 'function') {
          return String(row[idKey] || '');
        }
        return String(row[c.accessor] || '');
      })
    );
    exportToPDF(title, headers, rows, exportFilename);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
      {/* Table Header Controls */}
      <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {customHeaderActions}

            {/* Export options */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={handleExportCSV}
                title="Exportar CSV"
                className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={handleExportExcel}
                title="Exportar Excel"
                className="p-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                title="Exportar PDF"
                className="p-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>

            {/* ➕ Novo Button */}
            {onAdd && (
              <button
                onClick={onAdd}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>➕ Novo Registro</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total: {filteredData.length}
            </span>

            {/* Page size select */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value={5}>5 por pág.</option>
              <option value={10}>10 por pág.</option>
              <option value={25}>25 por pág.</option>
              <option value={50}>50 por pág.</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className={`p-3.5 ${col.className || ''}`}>
                  {col.sortable && typeof col.accessor === 'string' ? (
                    <button
                      onClick={() => handleSort(col.accessor as string)}
                      className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <span>{col.header}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              ))}

              {/* Action column */}
              <th className="p-3.5 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold">Nenhum registro encontrado</p>
                    <p className="text-[11px] text-slate-400">Tente ajustar os filtros ou adicionar um novo item.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const rowId = String(row[idKey]);
                return (
                  <tr key={rowId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`p-3.5 font-medium ${col.className || ''}`}>
                        {typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor] as any)}
                      </td>
                    ))}

                    {/* Actions Menu */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
                        {onView && (
                          <button
                            onClick={() => onView(row)}
                            title="👁️ Visualizar"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            title="✏️ Editar"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onDuplicate && (
                          <button
                            onClick={() => onDuplicate(row)}
                            title="📋 Duplicar"
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onArchive && (
                          <button
                            onClick={() => onArchive(row)}
                            title="📂 Arquivar"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onRestore && (
                          <button
                            onClick={() => onRestore(row)}
                            title="♻️ Restaurar"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors font-bold"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            title="🗑️ Excluir"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          Mostrando página <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> de{' '}
          <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong>
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
