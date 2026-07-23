import React, { useState, useEffect } from 'react';
import { useFinancialStore } from '../../services/storage';
import {
  Sun,
  Moon,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Clock,
  Calendar as CalendarIcon,
  Filter,
} from 'lucide-react';

interface HeaderProps {
  globalSearch?: string;
  setGlobalSearch?: (term: string) => void;
  activeModule: string;
  setActiveModule: (mod: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  globalSearch,
  setGlobalSearch,
  activeModule,
  setActiveModule,
}) => {
  const { currentUser, logout, settings, updateSettings, fixedExpenses } =
    useFinancialStore();

  const [localSearch, setLocalSearch] = useState<string>('');
  const searchValue = globalSearch !== undefined ? globalSearch : localSearch;
  const handleSearchChange = (val: string) => {
    if (setGlobalSearch) setGlobalSearch(val);
    else setLocalSearch(val);
  };

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const isDarkMode = settings.theme === 'dark';

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Notifications logic (e.g. overdue accounts or near goal completions)
  const pendingFixed = fixedExpenses.filter((f) => f.status === 'Pendente');
  const notificationsCount = pendingFixed.length;

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3 transition-colors duration-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* User Greeting & Date/Clock */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Olá, {currentUser?.name || 'Davi Schio'} 👋
              </h1>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  currentUser?.role === 'Administrador'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                }`}
              >
                {currentUser?.role || 'Administrador'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                {currentDate}
              </span>
              <span className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {currentTime}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-auto justify-between md:justify-end">
          {/* Global Search Bar */}
          <div className="relative flex-1 md:w-64 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Pesquisa global no sistema..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            {searchValue && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
            >
              <Bell className="w-4 h-4" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationsCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Alertas Financeiros</h4>
                  <span className="text-[10px] text-slate-500">{notificationsCount} pendente(s)</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pendingFixed.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">Nenhum alerta pendente no momento!</p>
                  ) : (
                    pendingFixed.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          setActiveModule('contas_fixas');
                          setShowNotifications(false);
                        }}
                        className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 cursor-pointer hover:bg-amber-100 transition-colors"
                      >
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{f.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                          <span>Vencimento dia {f.dueDay}</span>
                          <span className="font-bold">R$ {f.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                {(currentUser?.name || 'Davi').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
                {currentUser?.username || 'davischio'}
              </span>
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50">
                <div className="p-2 border-b border-slate-200 dark:border-slate-700 mb-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-500">{currentUser?.email}</p>
                </div>

                {currentUser?.role === 'Administrador' && (
                  <button
                    onClick={() => {
                      setActiveModule('usuarios');
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    Gerenciar Usuários
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveModule('configuracoes');
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-indigo-500" />
                  Minha Conta & Segurança
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                <button
                  onClick={() => {
                    logout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Sistema
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
