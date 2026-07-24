import React, { useState } from 'react';
import { useFinancialStore, USER_PERMISSIONS } from '../../services/storage';
import { User, UserRole } from '../../types';
import { DataTable, Column } from '../common/DataTable';
import { formatDate } from '../../lib/utils';
import { Key, Lock, X, Ban, Trash2 } from 'lucide-react';

export const UsuariosModule: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser, toggleBlockUser, resetUserPassword, changeOwnPassword } =
    useFinancialStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isOwnPassModalOpen, setIsOwnPassModalOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [targetPasswordUser, setTargetPasswordUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // User Form
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Usuário Comum');
  const [password, setPassword] = useState('');

  // Password Modals
  const [newPassword, setNewPassword] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [ownNewPass, setOwnNewPass] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  const openAddUser = () => {
    setEditingUser(null);
    setUsername('');
    setName('');
    setEmail('');
    setRole('Usuário Comum');
    setPassword('Snoop123@');
    setIsModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, {
        name,
        email,
        role,
      });
    } else {
      addUser({
        username,
        name,
        email,
        role,
        status: 'Ativo',
        passwordHash: password,
        permissions: USER_PERMISSIONS,
      });
    }
    setIsModalOpen(false);
  };

  const handleResetPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPasswordUser || !newPassword) return;
    resetUserPassword(targetPasswordUser.id, newPassword);
    setPassSuccess(true);
    setTimeout(() => {
      setPassSuccess(false);
      setTargetPasswordUser(null);
      setIsPasswordModalOpen(false);
    }, 1200);
  };

  const handleChangeOwnPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !ownNewPass) return;
    const ok = changeOwnPassword(currentPass, ownNewPass);
    if (ok) {
      setPassSuccess(true);
      setTimeout(() => {
        setPassSuccess(false);
        setIsOwnPassModalOpen(false);
      }, 1200);
    } else {
      alert('Senha atual incorreta!');
    }
  };

  const columns: Column<User>[] = [
    {
      header: 'Usuário / Nome',
      accessor: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
            {r.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{r.name}</p>
            <p className="text-[11px] text-slate-400">@{r.username} • {r.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Perfil / Nível de Acesso',
      accessor: (r) => (
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
            r.role === 'Administrador'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
          }`}
        >
          {r.role}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Status',
      accessor: (r) => (
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
            r.status === 'Ativo'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      header: 'Último Acesso',
      accessor: (r) => <span className="font-mono text-slate-500 text-xs">{r.lastLogin ? formatDate(r.lastLogin) : '-'}</span>,
    },
    {
      header: 'Ações de Segurança',
      accessor: (r) => (
        <div className="flex items-center gap-1">
          {currentUser?.role === 'Administrador' ? (
            <>
              <button
                onClick={() => {
                  setTargetPasswordUser(r);
                  setNewPassword('Snoop123@');
                  setIsPasswordModalOpen(true);
                }}
                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg"
                title="Resetar Senha"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
              {r.id !== currentUser?.id && (
                <>
                  <button
                    onClick={() => toggleBlockUser(r.id)}
                    className={`p-1.5 rounded-lg ${
                      r.status === 'Ativo'
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
                    }`}
                    title={r.status === 'Ativo' ? 'Bloquear Usuário' : 'Desbloquear Usuário'}
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setUserToDelete(r)}
                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 rounded-lg transition-colors"
                    title="Excluir Usuário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Sua Conta</span>
          )}
        </div>
      ),
    },
  ];

  const isAdmin = currentUser?.role === 'Administrador';

  return (
    <div className="space-y-6">
      <DataTable
        title={isAdmin ? "Controle de Usuários & Permissões" : "Minhas Informações Pessoais"}
        subtitle={
          isAdmin
            ? "Gerencie administradores, usuários comuns, alteração de senhas e permissões do sistema"
            : "Visualização e gestão das suas informações pessoais e credenciais de acesso"
        }
        columns={columns}
        data={users}
        idKey="id"
        onAdd={currentUser?.role === 'Administrador' ? openAddUser : undefined}
        onEdit={currentUser?.role === 'Administrador' ? openEditUser : undefined}
        onDelete={
          currentUser?.role === 'Administrador'
            ? (u) => {
                if (u.id === currentUser?.id) {
                  alert('Não é possível excluir a sua própria conta enquanto estiver conectado!');
                  return;
                }
                setUserToDelete(u);
              }
            : undefined
        }
        exportFilename="usuarios_sistema"
        customHeaderActions={
          <button
            onClick={() => {
              setCurrentPass('');
              setOwnNewPass('');
              setIsOwnPassModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span>Alterar Minha Senha</span>
          </button>
        }
      />

      {/* Change Own Password Modal */}
      {isOwnPassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsOwnPassModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">🔐 Alterar Minha Senha</h3>

            {passSuccess ? (
              <p className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                Senha alterada com sucesso!
              </p>
            ) : (
              <form onSubmit={handleChangeOwnPass} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Senha Atual</label>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={ownNewPass}
                    onChange={(e) => setOwnNewPass(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsOwnPassModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
                  >
                    Salvar Nova Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reset Target User Password Modal */}
      {isPasswordModalOpen && targetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              🔑 Resetar Senha do Usuário
            </h3>
            <p className="text-xs text-slate-500 mb-4">Usuário: @{targetPasswordUser.username}</p>

            {passSuccess ? (
              <p className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                Senha redefinida com hash bcrypt com sucesso!
              </p>
            ) : (
              <form onSubmit={handleResetPass} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Senha Provisória</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                  >
                    Redefinir Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
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
              {editingUser ? '✏️ Editar Perfil do Usuário' : '➕ Novo Usuário do Sistema'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {!editingUser && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome de Usuário (Login)</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: joaosilva"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@empresa.com"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Perfil de Acesso</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="Administrador">Administrador (Acesso Total)</option>
                  <option value="Usuário Financeiro">Usuário Financeiro (Lançamentos e Edição)</option>
                  <option value="Usuário Consulta">Usuário Consulta (Apenas Visualização)</option>
                  <option value="Auditor">Auditor (Relatórios e Audit Logs)</option>
                  <option value="Usuário Comum">Usuário Comum</option>
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Senha Inicial</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              )}

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
                  className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setUserToDelete(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Excluir Usuário do Sistema</h3>
                <p className="text-xs text-slate-500">@{userToDelete.username}</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl mb-5 space-y-2">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                Tem certeza de que deseja excluir o usuário <span className="text-red-600 dark:text-red-400 font-bold">{userToDelete.name}</span>?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Esta ação revogará permanentemente o acesso deste usuário, apagando suas credenciais de acesso do sistema.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteUser(userToDelete.id);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
