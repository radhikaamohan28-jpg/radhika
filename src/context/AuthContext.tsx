import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  updateCurrentUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS: Record<UserRole, { email: string; pass: string; title: string; desc: string }> = {
  ADMIN: {
    email: 'admin@genomics.lab',
    pass: 'Admin@123',
    title: 'Radhika loosu',
    desc: 'System Administrator & Laboratory Director',
  },
  LAB_TECHNICIAN: {
    email: 'labtech@genomics.lab',
    pass: 'LabTech@123',
    title: 'Marcus Vance',
    desc: 'Senior Molecular Biology Lab Technician',
  },
  BIOINFORMATICS_ANALYST: {
    email: 'bioanalyst@genomics.lab',
    pass: 'BioAnalyst@123',
    title: 'Elena Rostova',
    desc: 'Staff Computational Genomics Scientist',
  },
  REVIEWER: {
    email: 'reviewer@genomics.lab',
    pass: 'Reviewer@123',
    title: 'Dr. Aris Thorne',
    desc: 'Senior Reviewer & Medical Geneticist',
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.auth.getMe();
        setUser(response.user);
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        clearStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const response = await api.auth.login({ email, password: pass });
      setStoredToken(response.token);
      setToken(response.token);
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    api.auth.logout().catch(() => {});
  };

  const switchDemoRole = async (role: UserRole) => {
    const creds = DEMO_ACCOUNTS[role];
    if (creds) {
      await login(creds.email, creds.pass);
    }
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const updateCurrentUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchDemoRole, hasRole, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
