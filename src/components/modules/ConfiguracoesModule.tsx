import React, { useState } from 'react';
import { useFinancialStore } from '../../services/storage';
import { CategoriasModule } from './CategoriasModule';
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Shield,
  Palette,
  CheckCircle,
  Globe,
  Laptop,
  Smartphone,
  Key,
  Lock,
  Plus,
  Trash2,
  Check,
  Ban,
  Radio,
  Wifi,
  ShieldAlert,
  Fingerprint,
  FolderTree,
} from 'lucide-react';

interface AllowedIP {
  id: string;
  ipRange: string;
  description: string;
  status: 'Liberado' | 'Bloqueado';
  createdAt: string;
}

interface ActiveDevice {
  id: string;
  deviceName: string;
  os: string;
  browser: string;
  ip: string;
  location: string;
  firstAccess: string;
  lastAccess: string;
  status: 'Autorizado' | 'Bloqueado';
  currentSession?: boolean;
}

interface ConfiguracoesModuleProps {
  initialTab?: 'geral' | 'categorias' | 'ip' | 'dispositivos' | 'seguranca';
}

export const ConfiguracoesModule: React.FC<ConfiguracoesModuleProps> = ({ initialTab = 'geral' }) => {
  const { theme, toggleTheme, currentUser } = useFinancialStore();

  const [activeTab, setActiveTab] = useState<'geral' | 'categorias' | 'ip' | 'dispositivos' | 'seguranca'>(initialTab);
  const [saved, setSaved] = useState(false);
  const [currency] = useState('BRL (R$)');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(3);
  const [unrestrictedAccess, setUnrestrictedAccess] = useState(true);
  const [twoFactorAdmin, setTwoFactorAdmin] = useState(true);

  // IP Control State
  const [ipList, setIpList] = useState<AllowedIP[]>([
    { id: 'ip_1', ipRange: '192.168.1.0/24', description: 'Rede Local Escritório Central', status: 'Liberado', createdAt: '2026-01-10' },
    { id: 'ip_2', ipRange: '187.54.120.45', description: 'IP Fixo Servidor VPN', status: 'Liberado', createdAt: '2026-02-01' },
    { id: 'ip_3', ipRange: '45.12.88.0/22', description: 'Bloco Suspeito Internacional', status: 'Bloqueado', createdAt: '2026-06-15' },
  ]);
  const [newIpRange, setNewIpRange] = useState('');
  const [newIpDesc, setNewIpDesc] = useState('');

  // Device Control State
  const [deviceList, setDeviceList] = useState<ActiveDevice[]>([
    {
      id: 'dev_1',
      deviceName: 'MacBook Pro 16" (Davi Admin)',
      os: 'macOS Sonoma 14.5',
      browser: 'Chrome 126.0',
      ip: '187.54.120.45',
      location: 'São Paulo, BR',
      firstAccess: '2026-01-01 10:00',
      lastAccess: 'Agora (Sessão Atual)',
      status: 'Autorizado',
      currentSession: true,
    },
    {
      id: 'dev_2',
      deviceName: 'Dell XPS 15 (Financeiro)',
      os: 'Windows 11 Pro',
      browser: 'Edge 125.0',
      ip: '192.168.1.105',
      location: 'São Paulo, BR',
      firstAccess: '2026-02-15 08:30',
      lastAccess: '2026-07-22 18:45',
      status: 'Autorizado',
      currentSession: false,
    },
    {
      id: 'dev_3',
      deviceName: 'iPhone 15 Pro Max',
      os: 'iOS 17.5',
      browser: 'Safari Mobile',
      ip: '177.12.44.18',
      location: 'Campinas, BR',
      firstAccess: '2026-03-04 14:12',
      lastAccess: '2026-07-23 01:20',
      status: 'Autorizado',
      currentSession: false,
    },
  ]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddIP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpRange) return;
    setIpList((prev) => [
      ...prev,
      {
        id: `ip_${Date.now()}`,
        ipRange: newIpRange,
        description: newIpDesc || 'Regra de IP personalizada',
        status: 'Liberado',
        createdAt: new Date().toISOString().substring(0, 10),
      },
    ]);
    setNewIpRange('');
    setNewIpDesc('');
  };

  const toggleIpStatus = (id: string) => {
    setIpList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: item.status === 'Liberado' ? 'Bloqueado' : 'Liberado' } : item
      )
    );
  };

  const removeIp = (id: string) => {
    setIpList((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleDeviceStatus = (id: string) => {
    setDeviceList((prev) =>
      prev.map((dev) =>
        dev.id === id ? { ...dev, status: dev.status === 'Autorizado' ? 'Bloqueado' : 'Autorizado' } : dev
      )
    );
  };

  const disconnectDevice = (id: string) => {
    setDeviceList((prev) => prev.filter((dev) => dev.id !== id));
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Painel de Configurações, Segurança & Controle de Acesso
            </h2>
            <p className="text-xs text-slate-500">
              Ajuste temas, notificações, restrições de IP, controle de dispositivos e autenticação 2FA
            </p>
          </div>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Configurações atualizadas com sucesso!</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'geral'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" /> Geral & Aparência
        </button>
        <button
          onClick={() => setActiveTab('categorias')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'categorias'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderTree className="w-4 h-4" /> Categorias & Subcategorias
        </button>
        <button
          onClick={() => setActiveTab('ip')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'ip'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" /> Controle de IP & Redes
        </button>
        <button
          onClick={() => setActiveTab('dispositivos')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'dispositivos'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" /> Dispositivos & Sessões
        </button>
        <button
          onClick={() => setActiveTab('seguranca')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'seguranca'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Segurança & 2FA
        </button>
      </div>

      {/* TAB: CATEGORIAS */}
      {activeTab === 'categorias' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <CategoriasModule />
        </div>
      )}

      {/* TAB 1: GERAL */}
      {activeTab === 'geral' && (
        <form onSubmit={handleSave} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm">
              <Palette className="w-4 h-4 text-blue-500" />
              Tema & Aparência Visual
            </h3>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">Modo Escuro / Claro</p>
                <p className="text-[11px] text-slate-500">Alterne entre o visual dark confort para visão noturna e light elegante</p>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-2 font-bold"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="w-4 h-4 text-purple-400" />
                    <span>Escuro</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Claro</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4 text-amber-500" />
              Alertas & Notificações de Vencimento
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Ativar alertas sonoros e visuais no painel</span>
              </label>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notificar com antecedência de:
                </label>
                <select
                  value={notifyDaysBefore}
                  onChange={(e) => setNotifyDaysBefore(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value={1}>1 dia antes do vencimento</option>
                  <option value={3}>3 dias antes do vencimento</option>
                  <option value={5}>5 dias antes do vencimento</option>
                  <option value={7}>7 dias antes do vencimento</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
            >
              Salvar Preferências
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: CONTROLE DE IP */}
      {activeTab === 'ip' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" /> Política de Acesso por Endereço IP
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure se o sistema deve permitir acesso irrestrito de qualquer rede ou filtrar por faixas de IP liberadas/bloqueadas.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
              <input
                type="checkbox"
                checked={unrestrictedAccess}
                onChange={(e) => setUnrestrictedAccess(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>Permitir Acesso Irrestrito (Qualquer IP)</span>
            </label>
          </div>

          {/* Form to Add New IP / Range */}
          <form onSubmit={handleAddIP} className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" /> Cadastrar Novo IP ou Faixa CIDR
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço IP / Faixa CIDR</label>
                <input
                  type="text"
                  required
                  value={newIpRange}
                  onChange={(e) => setNewIpRange(e.target.value)}
                  placeholder="Ex: 192.168.1.100 ou 10.0.0.0/16"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Identificação</label>
                <input
                  type="text"
                  value={newIpDesc}
                  onChange={(e) => setNewIpDesc(e.target.value)}
                  placeholder="Ex: IP Filial Rio de Janeiro"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
              >
                Cadastrar Regra de IP
              </button>
            </div>
          </form>

          {/* List of IP Rules */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Regras de IP Cadastradas ({ipList.length})</h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {ipList.map((rule) => (
                <div key={rule.id} className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        rule.status === 'Liberado'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-slate-900 dark:text-white text-xs">{rule.ipRange}</p>
                      <p className="text-[11px] text-slate-500">{rule.description} • Criado em {rule.createdAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleIpStatus(rule.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        rule.status === 'Liberado'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {rule.status}
                    </button>
                    <button
                      onClick={() => removeIp(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPOSITIVOS & SESSÕES */}
      {activeTab === 'dispositivos' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <Laptop className="w-4 h-4 text-purple-600" /> Dispositivos Registrados & Sessões Ativas
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Monitore computadores, celulares e navegadores conectados. Você pode desprover acessos e encerrar sessões remotamente.
            </p>
          </div>

          <div className="space-y-3">
            {deviceList.map((dev) => (
              <div
                key={dev.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold shrink-0">
                    {dev.os.includes('iOS') || dev.os.includes('Android') ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">{dev.deviceName}</h4>
                      {dev.currentSession && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          Sessão Atual
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {dev.os} • {dev.browser} • IP: <span className="font-mono">{dev.ip}</span> ({dev.location})
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      1º Acesso: {dev.firstAccess} | Último Acesso: {dev.lastAccess}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDeviceStatus(dev.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs ${
                      dev.status === 'Autorizado'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {dev.status}
                  </button>

                  {!dev.currentSession && (
                    <button
                      onClick={() => disconnectDevice(dev.id)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl font-bold text-xs"
                    >
                      Desconectar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SEGURANÇA & 2FA */}
      {activeTab === 'seguranca' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <ShieldAlert className="w-4 h-4 text-emerald-600" /> Parâmetros de Segurança do Servidor
            </h3>

            {/* 2FA Card */}
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-emerald-600" /> Autenticação em Dois Fatores (2FA) para Administradores
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exige validação por código OTP no primeiro acesso ou novo dispositivo conectado.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorAdmin}
                  onChange={(e) => setTwoFactorAdmin(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            {/* Encryption & Hash info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Algoritmo de Hash das Senhas</span>
                <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Argon2id / bcrypt (Salt 12 rounds)</p>
                <p className="text-[11px] text-slate-400">Garante resistência contra rainbow tables e ataques de força bruta.</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Bloqueio Por Tentativas Inválidas</span>
                <p className="font-mono text-blue-600 dark:text-blue-400 font-bold">Máximo 5 tentativas consecutivas</p>
                <p className="text-[11px] text-slate-400">Mensagens genéricas sem revelar se o erro é usuário ou senha.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
