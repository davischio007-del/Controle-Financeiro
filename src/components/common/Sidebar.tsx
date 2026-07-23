import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import {
  LayoutDashboard,
  TrendingUp,
  CalendarCheck,
  Receipt,
  Landmark,
  CreditCard,
  Banknote,
  PieChart,
  Target,
  FolderTree,
  Tag,
  ArrowRightLeft,
  BarChart3,
  Users,
  Settings,
  Database,
  Trash2,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const { currentUser, trashBin, fixedExpenses } = useFinancialStore();
  const pendingFixed = fixedExpenses.filter((f) => f.status === 'Pendente').length;

  const [collapsed, setCollapsed] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'Administrador';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'receitas', label: 'Receitas', icon: TrendingUp, color: 'text-emerald-500' },
    {
      id: 'contas_fixas',
      label: 'Contas Fixas',
      icon: CalendarCheck,
      badge: pendingFixed > 0 ? pendingFixed : undefined,
      color: 'text-amber-500',
    },
    { id: 'contas_variaveis', label: 'Contas Variáveis', icon: Receipt, color: 'text-rose-500' },
    { id: 'bancos', label: 'Bancos & Contas', icon: Landmark, color: 'text-blue-500' },
    { id: 'cartoes', label: 'Cartões & Faturas', icon: CreditCard, color: 'text-purple-500' },
    { id: 'emprestimos', label: 'Empréstimos', icon: Banknote, color: 'text-red-500' },
    { id: 'investimentos', label: 'Investimentos', icon: PieChart, color: 'text-indigo-500' },
    { id: 'metas', label: 'Metas Financeiras', icon: Target, color: 'text-teal-500' },
    { id: 'transferencias', label: 'Transferências', icon: ArrowRightLeft, color: 'text-cyan-500' },
    { id: 'categorias', label: 'Categorias', icon: FolderTree },
    { id: 'subcategorias', label: 'Subcategorias', icon: Tag },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  ];

  const adminNavItems = [
    { id: 'usuarios', label: 'Usuários', icon: Users, adminOnly: true },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
    { id: 'backup', label: 'Backup & Nuvem', icon: Database },
    { id: 'lixeira', label: 'Lixeira', icon: Trash2, badge: trashBin.length > 0 ? trashBin.length : undefined },
    { id: 'auditoria', label: 'Auditoria & Logs', icon: FileCheck2 },
  ];

  return (
    <aside
      className={`relative z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } min-h-screen select-none`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-wider uppercase">
                FINANZ <span className="text-blue-600 dark:text-blue-400">PRO</span>
              </h2>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Gestão Financeira</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Wallet className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1">
          {!collapsed && (
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Módulos Principais
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:bg-blue-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color || 'text-slate-500'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge !== undefined && (
                  <span
                    className={`ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

        <div className="px-2 py-1">
          {!collapsed && (
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Sistema & Gestão
            </p>
          )}
          {adminNavItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge !== undefined && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer system status */}
      {!collapsed && (
        <div className="p-3 m-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sistema Criptografado</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Hash SHA256 & Sessão Segura</p>
        </div>
      )}
    </aside>
  );
};
