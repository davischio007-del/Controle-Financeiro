import React, { useState, useEffect } from 'react';
import { useFinancialStore } from './services/storage';
import { initFirebaseSync } from './services/firebaseSync';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { LoginModal } from './components/auth/LoginModal';

// Modules
import { Dashboard } from './components/dashboard/Dashboard';
import { ReceitasModule } from './components/modules/ReceitasModule';
import { ContasFixasModule } from './components/modules/ContasFixasModule';
import { ContasVariaveisModule } from './components/modules/ContasVariaveisModule';
import { BancosModule } from './components/modules/BancosModule';
import { CartoesModule } from './components/modules/CartoesModule';
import { EmprestimosModule } from './components/modules/EmprestimosModule';
import { InvestimentosModule } from './components/modules/InvestimentosModule';
import { MetasModule } from './components/modules/MetasModule';
import { CategoriasModule } from './components/modules/CategoriasModule';
import { TransferenciasModule } from './components/modules/TransferenciasModule';
import { RelatoriosModule } from './components/modules/RelatoriosModule';
import { UsuariosModule } from './components/modules/UsuariosModule';
import { ConfiguracoesModule } from './components/modules/ConfiguracoesModule';
import { BackupModule } from './components/modules/BackupModule';
import { AuditoriaModule } from './components/modules/AuditoriaModule';

export function App() {
  const { currentUser } = useFinancialStore();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [selectedCardInvoiceId, setSelectedCardInvoiceId] = useState<string | undefined>();

  useEffect(() => {
    initFirebaseSync();
  }, []);

  const handleOpenCardInvoice = (cardId: string) => {
    setSelectedCardInvoiceId(cardId);
    setActiveModule('cartoes');
  };

  if (!currentUser) {
    return <LoginModal />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col md:flex-row">
      {/* Navigation Sidebar */}
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <Header activeModule={activeModule} setActiveModule={setActiveModule} />

        {/* Dynamic Module Renderer */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {activeModule === 'dashboard' && (
            <Dashboard setActiveModule={setActiveModule} onOpenCardInvoice={handleOpenCardInvoice} />
          )}

          {activeModule === 'receitas' && <ReceitasModule />}
          {activeModule === 'contas_fixas' && <ContasFixasModule />}
          {activeModule === 'contas_variaveis' && <ContasVariaveisModule />}
          {activeModule === 'bancos' && <BancosModule />}
          {activeModule === 'cartoes' && (
            <CartoesModule selectedCardIdForInvoice={selectedCardInvoiceId} />
          )}
          {activeModule === 'emprestimos' && <EmprestimosModule />}
          {activeModule === 'investimentos' && <InvestimentosModule />}
          {activeModule === 'metas' && <MetasModule />}
          {(activeModule === 'categorias' || activeModule === 'subcategorias') && (
            <ConfiguracoesModule initialTab="categorias" />
          )}
          {activeModule === 'transferencias' && <TransferenciasModule />}
          {activeModule === 'relatorios' && <RelatoriosModule />}
          {activeModule === 'usuarios' && <UsuariosModule />}
          {activeModule === 'configuracoes' && <ConfiguracoesModule initialTab="geral" />}
          {activeModule === 'backup' && <BackupModule />}
          {activeModule === 'auditoria' && <AuditoriaModule />}
        </main>
      </div>
    </div>
  );
}

export default App;
