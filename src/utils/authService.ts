import { AppUser, DebtRecord } from '../types';

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-adm',
    nome: 'Paloma Souza',
    email: 'palomasouza@nossaoticaibirite.com.br',
    role: 'administrador',
    avatarColor: 'bg-indigo-700',
    cargo: 'Administradora Geral (Perfil 1)',
    senha: 'admin',
    horarioNotificacao: '08:00',
    notificacaoDiariaAtiva: true,
  },
  {
    id: 'user-socias',
    nome: 'Mariana & Carolina',
    email: 'diretoria@cartaotodossaude.com.br',
    role: 'socias',
    avatarColor: 'bg-amber-600',
    cargo: 'Sócias Diretoras (Perfil 2)',
    senha: 'admin',
    horarioNotificacao: '08:00',
    notificacaoDiariaAtiva: true,
  },
  {
    id: 'user-coord',
    nome: 'Fernanda Martins',
    email: 'coordenacao.cobranca@cartaotodossaude.com.br',
    role: 'coordenadora',
    avatarColor: 'bg-teal-700',
    cargo: 'Coordenadora de Cobrança (Perfil 3)',
    senha: 'admin',
    horarioNotificacao: '08:00',
    notificacaoDiariaAtiva: true,
  },
  {
    id: 'user-rosana',
    nome: 'Rosana Silva',
    email: 'rosana.cobranca@empresa.com.br',
    role: 'cobranca',
    responsavelAssociado: 'ROSANA',
    avatarColor: 'bg-emerald-600',
    cargo: 'Equipe de Cobrança (Perfil 4)',
    senha: '1234',
    horarioNotificacao: '08:30',
    notificacaoDiariaAtiva: true,
  },
  {
    id: 'user-analuiza',
    nome: 'Ana Luiza',
    email: 'analuiza.cobranca@empresa.com.br',
    role: 'cobranca',
    responsavelAssociado: 'ANA LUIZA',
    avatarColor: 'bg-blue-600',
    cargo: 'Equipe de Cobrança (Perfil 4)',
    senha: '1234',
    horarioNotificacao: '08:30',
    notificacaoDiariaAtiva: true,
  },
  {
    id: 'user-keylla',
    nome: 'Keylla Santos',
    email: 'keylla.cobranca@empresa.com.br',
    role: 'cobranca',
    responsavelAssociado: 'KEYLLA',
    avatarColor: 'bg-purple-600',
    cargo: 'Equipe de Cobrança (Perfil 4)',
    senha: '1234',
    horarioNotificacao: '08:30',
    notificacaoDiariaAtiva: true,
  },
  {
    id: 'user-fabiola',
    nome: 'Fabíola Ramos',
    email: 'fabiola.cobranca@empresa.com.br',
    role: 'cobranca',
    responsavelAssociado: 'FABIOLA',
    avatarColor: 'bg-rose-600',
    cargo: 'Equipe de Cobrança (Perfil 4)',
    senha: '1234',
    horarioNotificacao: '08:30',
    notificacaoDiariaAtiva: true,
  },
  {
    id: 'user-suporte-valora',
    nome: 'Valora Suporte & Finanças',
    email: 'valoragestaoefinancas@gmail.com',
    role: 'suporte',
    avatarColor: 'bg-slate-800',
    cargo: 'Suporte Técnico Valora',
    senha: 'admin',
    horarioNotificacao: '08:00',
    notificacaoDiariaAtiva: true,
  },
];

const STORAGE_USERS_KEY = 'valora_auth_users_v3';
const STORAGE_CURRENT_USER_KEY = 'valora_current_user_v3';
const STORAGE_AUTH_STATE_KEY = 'valora_auth_authenticated_v3';

export function isSessionAuthenticated(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_AUTH_STATE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setSessionAuthenticated(authenticated: boolean): void {
  try {
    if (authenticated) {
      localStorage.setItem(STORAGE_AUTH_STATE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_AUTH_STATE_KEY);
    }
  } catch (e) {
    console.error('Erro ao salvar estado de autenticação:', e);
  }
}

export function logoutUser(): void {
  setSessionAuthenticated(false);
}

export function getStoredUsers(): AppUser[] {
  try {
    const saved = localStorage.getItem(STORAGE_USERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure Paloma Souza and Valora Suporte exist
        let list: AppUser[] = parsed.map((u: AppUser) => ({
          ...u,
          senha: u.senha || (u.role === 'adm_master' || u.role === 'suporte' ? 'admin' : '1234'),
          horarioNotificacao: u.horarioNotificacao || '08:00',
          notificacaoDiariaAtiva: u.notificacaoDiariaAtiva !== false,
        }));

        // If palomasouza@nossaoticaibirite.com.br is not yet present, update or prepend
        const hasPaloma = list.some(u => u.email.toLowerCase() === 'palomasouza@nossaoticaibirite.com.br');
        if (!hasPaloma) {
          list = [
            DEFAULT_USERS[0],
            ...list.filter(u => u.id !== 'user-adm')
          ];
        }

        // Ensure Valora Suporte is present
        const hasSuporte = list.some(u => u.email.toLowerCase() === 'valoragestaoefinancas@gmail.com');
        if (!hasSuporte) {
          list.splice(1, 0, DEFAULT_USERS[1]);
        }

        return list;
      }
    }
  } catch (e) {
    console.error('Erro ao ler usuários salvos:', e);
  }
  return DEFAULT_USERS;
}

export function saveUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Erro ao salvar lista de usuários:', e);
  }
}

export function getCurrentUser(): AppUser {
  try {
    const saved = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AppUser;
      if (parsed && parsed.id && parsed.role) {
        return {
          ...parsed,
          senha: parsed.senha || (parsed.role === 'adm_master' ? 'admin' : '1234'),
          horarioNotificacao: parsed.horarioNotificacao || '08:00',
          notificacaoDiariaAtiva: parsed.notificacaoDiariaAtiva !== false,
        };
      }
    }
  } catch (e) {
    console.error('Erro ao carregar usuário ativo:', e);
  }
  return DEFAULT_USERS[0]; // Adm Master default
}

export function setCurrentUser(user: AppUser): void {
  try {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Erro ao salvar usuário ativo:', e);
  }
}

export function verifyUserPassword(userId: string, passwordAttempt: string): boolean {
  const users = getStoredUsers();
  const targetUser = users.find(u => u.id === userId);
  if (!targetUser) return false;
  const expected = targetUser.senha || (targetUser.role === 'adm_master' ? 'admin' : '1234');
  return targetUser ? expected === passwordAttempt.trim() : false;
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const users = getStoredUsers();
  let updated = false;
  const updatedUsers = users.map(u => {
    if (u.id === userId) {
      updated = true;
      return { ...u, senha: newPassword.trim() };
    }
    return u;
  });

  if (updated) {
    saveUsers(updatedUsers);
    // If current user is this user, also update current user
    const current = getCurrentUser();
    if (current.id === userId) {
      setCurrentUser({ ...current, senha: newPassword.trim() });
    }
  }
  return updated;
}

/**
 * Filter records according to user role:
 * - administrador / adm_master / socias / coordenadora / suporte: sees ALL records
 * - cobranca / operador: sees ONLY records assigned to their specific responsavelAssociado
 */
export function filterRecordsForUser(records: DebtRecord[], user: AppUser): DebtRecord[] {
  if (!user) return records;
  if (
    user.role === 'administrador' || 
    user.role === 'adm_master' || 
    user.role === 'socias' || 
    user.role === 'coordenadora' || 
    user.role === 'suporte'
  ) {
    return records;
  }
  const userResp = (user.responsavelAssociado || '').toUpperCase().trim();
  if (!userResp) return records;

  return records.filter(r => {
    const recordResp = (r.responsavel || '').toUpperCase().trim();
    return recordResp === userResp || recordResp.includes(userResp);
  });
}

export function canUserAccessRecord(record: DebtRecord, user: AppUser): boolean {
  if (!user) return true;
  if (
    user.role === 'administrador' || 
    user.role === 'adm_master' || 
    user.role === 'socias' || 
    user.role === 'coordenadora' || 
    user.role === 'suporte'
  ) {
    return true;
  }
  const userResp = (user.responsavelAssociado || '').toUpperCase().trim();
  const recordResp = (record.responsavel || '').toUpperCase().trim();
  return recordResp === userResp || recordResp.includes(userResp);
}

export function canUserManageUsers(user: AppUser): boolean {
  return user?.role === 'adm_master' || user?.role === 'suporte';
}

export function addNewOperator(operator: {
  nome: string;
  email: string;
  responsavelAssociado: string;
  cargo?: string;
  senha?: string;
  horarioNotificacao?: string;
  notificacaoDiariaAtiva?: boolean;
}): AppUser {
  const users = getStoredUsers();
  const colorPalette = [
    'bg-amber-600', 'bg-cyan-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600', 'bg-orange-600'
  ];
  const newColor = colorPalette[users.length % colorPalette.length];

  const newUser: AppUser = {
    id: `user-${Date.now()}`,
    nome: operator.nome.trim(),
    email: operator.email.trim(),
    role: 'operador',
    responsavelAssociado: operator.responsavelAssociado.toUpperCase().trim(),
    avatarColor: newColor,
    cargo: operator.cargo || 'Operador de Cobrança',
    senha: (operator.senha && operator.senha.trim()) ? operator.senha.trim() : '1234',
    horarioNotificacao: operator.horarioNotificacao || '08:00',
    notificacaoDiariaAtiva: operator.notificacaoDiariaAtiva !== false,
  };

  const updatedList = [...users, newUser];
  saveUsers(updatedList);
  return newUser;
}

export function updateOperatorNotificationSchedule(
  userId: string,
  horarioNotificacao: string,
  notificacaoDiariaAtiva: boolean = true
): boolean {
  const users = getStoredUsers();
  let updated = false;
  const updatedUsers = users.map(u => {
    if (u.id === userId) {
      updated = true;
      return { 
        ...u, 
        horarioNotificacao: horarioNotificacao.trim() || '08:00',
        notificacaoDiariaAtiva 
      };
    }
    return u;
  });

  if (updated) {
    saveUsers(updatedUsers);
    const current = getCurrentUser();
    if (current.id === userId) {
      setCurrentUser({ 
        ...current, 
        horarioNotificacao: horarioNotificacao.trim() || '08:00',
        notificacaoDiariaAtiva 
      });
    }
  }
  return updated;
}

