import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  CompanyThemeConfig, 
  INITIAL_COMPANIES_LIST, 
  DEFAULT_COMPANY, 
  getCompanyById 
} from '../config/companies';
import { UserProfile } from '../services/profileService';

interface CompanyContextType {
  currentCompany: CompanyThemeConfig;
  userCompanies: CompanyThemeConfig[];
  allCompanies: CompanyThemeConfig[];
  isSuperAdmin: boolean;
  isLoadingCompanies: boolean;
  setCurrentCompany: (company: CompanyThemeConfig) => void;
  switchCompany: (companyId: string) => void;
  refreshUserCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'active_company_id';

const KNOWN_SUPER_ADMIN_EMAILS = [
  'lucas_zinatto@hotmail.com',
  'lucas.zinatto@belloalimentos.com.br',
  'joao.moraes@belloalimentos.com.br'
];

export const CompanyProvider: React.FC<{ 
  children: React.ReactNode;
  userProfile: UserProfile | null;
}> = ({ children, userProfile }) => {
  const [currentCompany, setCurrentCompanyState] = useState<CompanyThemeConfig>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    return getCompanyById(savedId);
  });

  const [userCompanies, setUserCompanies] = useState<CompanyThemeConfig[]>([DEFAULT_COMPANY]);
  const [allCompanies, setAllCompanies] = useState<CompanyThemeConfig[]>(INITIAL_COMPANIES_LIST);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState<boolean>(true);

  // 1. Carrega todas as empresas cadastradas no banco Supabase
  const loadAllCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped = data.map(dbEmpresa => {
          const base = getCompanyById(dbEmpresa.id);
          return {
            ...base,
            ...dbEmpresa,
          };
        });
        setAllCompanies(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Falha ao carregar empresas do banco, usando lista padrão:', e);
    }
    return INITIAL_COMPANIES_LIST;
  }, []);

  const setCurrentCompany = useCallback((company: CompanyThemeConfig) => {
    setCurrentCompanyState(company);
    localStorage.setItem(STORAGE_KEY, company.id);
  }, []);

  const switchCompany = useCallback((companyId: string) => {
    const target = getCompanyById(companyId);
    setCurrentCompany(target);
  }, [setCurrentCompany]);

  const refreshUserCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const availableCompanies = await loadAllCompanies();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserCompanies([DEFAULT_COMPANY]);
        setIsLoadingCompanies(false);
        return;
      }

      const emailNormalized = (user.email || '').toLowerCase().trim();
      const isKnownSuperAdmin = KNOWN_SUPER_ADMIN_EMAILS.includes(emailNormalized);
      const isSuperAdminUser = isKnownSuperAdmin || userProfile?.role === 'super_admin' || (userProfile?.level ?? 0) >= 100;

      // Se for Super Admin (definido pelo perfil no banco ou email conhecido)
      if (isSuperAdminUser) {
        setUserCompanies(availableCompanies);
        setIsLoadingCompanies(false);
        return;
      }

      // Buscar vínculos em usuarios_empresas
      const { data, error } = await supabase
        .from('usuarios_empresas')
        .select('empresa_id, role, level, ativo')
        .eq('user_id', user.id)
        .eq('ativo', true);

      if (error || !data || data.length === 0) {
        // Fallback seguro: vincula à Bello Alimentos para usuários pré-existentes
        setUserCompanies([DEFAULT_COMPANY]);
      } else {
        const allowedIds = new Set(data.map(d => d.empresa_id));
        const matched = availableCompanies.filter(c => allowedIds.has(c.id));
        if (matched.length > 0) {
          setUserCompanies(matched);
          // Se a empresa ativa atual não estiver na lista autorizada, seleciona a primeira autorizada
          if (!allowedIds.has(currentCompany.id)) {
            setCurrentCompany(matched[0]);
          }
        } else {
          setUserCompanies([DEFAULT_COMPANY]);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar empresas do usuário, usando padrão:', err);
      setUserCompanies([DEFAULT_COMPANY]);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [userProfile, currentCompany.id, setCurrentCompany, loadAllCompanies]);

  const isSuperAdmin = useMemo(() => {
    return userProfile?.role === 'super_admin' || (userProfile?.level ?? 0) >= 100;
  }, [userProfile]);

  useEffect(() => {
    refreshUserCompanies();
  }, [refreshUserCompanies]);

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        userCompanies,
        allCompanies,
        isSuperAdmin,
        isLoadingCompanies,
        setCurrentCompany,
        switchCompany,
        refreshUserCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
