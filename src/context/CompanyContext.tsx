import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  CompanyThemeConfig, 
  INITIAL_COMPANIES_LIST, 
  DEFAULT_COMPANY, 
  getCompanyById,
  getUnitById,
  LEVO_UNITS
} from '../config/companies';
import { CompanyUnitConfig } from '../types/database';
import { UserProfile } from '../services/profileService';

interface CompanyContextType {
  currentCompany: CompanyThemeConfig;
  currentUnit: CompanyUnitConfig | null;
  userCompanies: CompanyThemeConfig[];
  allCompanies: CompanyThemeConfig[];
  isSuperAdmin: boolean;
  isLoadingCompanies: boolean;
  userAllowedUnits: string[];
  setCurrentCompany: (company: CompanyThemeConfig, unit?: CompanyUnitConfig | null) => void;
  setCurrentUnit: (unit: CompanyUnitConfig | null) => void;
  switchCompany: (companyId: string, unitId?: string | null) => void;
  refreshUserCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'active_company_id';
const STORAGE_UNIT_KEY = 'active_unit_id';

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

  const [currentUnit, setCurrentUnitState] = useState<CompanyUnitConfig | null>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    const company = getCompanyById(savedId);
    if (company.slug === 'levo') {
      const savedUnitId = localStorage.getItem(STORAGE_UNIT_KEY);
      return getUnitById(savedUnitId) || LEVO_UNITS[0];
    }
    return null;
  });

  const [userCompanies, setUserCompanies] = useState<CompanyThemeConfig[]>([DEFAULT_COMPANY]);
  const [allCompanies, setAllCompanies] = useState<CompanyThemeConfig[]>(INITIAL_COMPANIES_LIST);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState<boolean>(true);
  const [userAllowedUnits, setUserAllowedUnits] = useState<string[]>(['*']);

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

  const setCurrentCompany = useCallback((company: CompanyThemeConfig, unit?: CompanyUnitConfig | null) => {
    setCurrentCompanyState(company);
    localStorage.setItem(STORAGE_KEY, company.id);

    if (company.slug === 'levo') {
      const targetUnit = unit || getUnitById(localStorage.getItem(STORAGE_UNIT_KEY)) || LEVO_UNITS[0];
      setCurrentUnitState(targetUnit);
      localStorage.setItem(STORAGE_UNIT_KEY, targetUnit.id);
    } else {
      setCurrentUnitState(null);
      localStorage.removeItem(STORAGE_UNIT_KEY);
    }
  }, []);

  const setCurrentUnit = useCallback((unit: CompanyUnitConfig | null) => {
    setCurrentUnitState(unit);
    if (unit) {
      localStorage.setItem(STORAGE_UNIT_KEY, unit.id);
    } else {
      localStorage.removeItem(STORAGE_UNIT_KEY);
    }
  }, []);

  const switchCompany = useCallback((companyId: string, unitId?: string | null) => {
    const target = getCompanyById(companyId);
    const targetUnit = unitId ? getUnitById(unitId) : (target.slug === 'levo' ? LEVO_UNITS[0] : null);
    setCurrentCompany(target, targetUnit);
  }, [setCurrentCompany]);

  const refreshUserCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const availableCompanies = await loadAllCompanies();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserCompanies([DEFAULT_COMPANY]);
        setUserAllowedUnits(['*']);
        setIsLoadingCompanies(false);
        return;
      }

      const emailNormalized = (user.email || '').toLowerCase().trim();
      const isKnownSuperAdmin = KNOWN_SUPER_ADMIN_EMAILS.includes(emailNormalized);
      const isSuperAdminUser = isKnownSuperAdmin || userProfile?.role === 'super_admin' || (userProfile?.level ?? 0) >= 100;

      // Se for Super Admin (definido pelo perfil no banco ou email conhecido)
      if (isSuperAdminUser) {
        setUserCompanies(availableCompanies);
        setUserAllowedUnits(['*']);
        setIsLoadingCompanies(false);
        return;
      }

      // Buscar vínculos em usuario_empresa_painel para o painel ficha_cadastral
      let allowedIds = new Set<string>();
      let allowedUnitsList: string[] = [];

      const { data: panelData, error: panelError } = await supabase
        .from('usuario_empresa_painel')
        .select('empresa_id, unidade, role, level, ativo')
        .eq('user_id', user.id)
        .eq('painel_id', 'ficha_cadastral')
        .eq('ativo', true);

      if (!panelError && panelData && panelData.length > 0) {
        allowedIds = new Set(panelData.map(d => d.empresa_id));
        allowedUnitsList = panelData
          .filter(d => d.unidade)
          .map(d => d.unidade as string);
        
        // Se houver algum registro para Levo sem unidade definida, o usuário tem acesso a todas as unidades
        const hasFullLevoAccess = panelData.some(d => {
          const c = getCompanyById(d.empresa_id);
          return c.slug === 'levo' && !d.unidade;
        });
        if (hasFullLevoAccess) {
          allowedUnitsList.push('LEVO_UMUARAMA', 'LEVO_CAPANEMA');
        }
      } else {
        // Fallback retroativo caso ainda não esteja no novo formato
        const { data: ueData } = await supabase
          .from('usuarios_empresas')
          .select('empresa_id, unidade, role, level, ativo')
          .eq('user_id', user.id)
          .eq('ativo', true);

        if (ueData && ueData.length > 0) {
          allowedIds = new Set(ueData.map(d => d.empresa_id));
          allowedUnitsList = ueData.filter(d => d.unidade).map(d => d.unidade as string);
        }
      }

      setUserAllowedUnits(allowedUnitsList.length > 0 ? allowedUnitsList : ['*']);

      if (allowedIds.size === 0) {
        // Sem empresas autorizadas no painel: default
        setUserCompanies([DEFAULT_COMPANY]);
      } else {
        const matched = availableCompanies.filter(c => allowedIds.has(c.id));
        if (matched.length > 0) {
          setUserCompanies(matched);
          // Se a empresa ativa atual não estiver na lista autorizada, seleciona a primeira autorizada
          if (!allowedIds.has(currentCompany.id)) {
            const first = matched[0];
            const firstUnit = first.slug === 'levo' 
              ? (allowedUnitsList.includes('LEVO_CAPANEMA') && !allowedUnitsList.includes('LEVO_UMUARAMA') ? LEVO_UNITS[1] : LEVO_UNITS[0])
              : null;
            setCurrentCompany(first, firstUnit);
          } else if (currentCompany.slug === 'levo' && allowedUnitsList.length > 0 && !allowedUnitsList.includes('*')) {
            // Se a unidade ativa atual não for permitida, seleciona a permitida
            if (currentUnit && !allowedUnitsList.includes(currentUnit.id)) {
              const fallbackUnit = LEVO_UNITS.find(u => allowedUnitsList.includes(u.id)) || LEVO_UNITS[0];
              setCurrentUnit(fallbackUnit);
            }
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
  }, [userProfile, currentCompany, currentUnit, setCurrentCompany, setCurrentUnit, loadAllCompanies]);

  const isSuperAdmin = useMemo(() => {
    const emailNormalized = (userProfile?.email || '').toLowerCase().trim();
    const isKnown = KNOWN_SUPER_ADMIN_EMAILS.includes(emailNormalized);
    return isKnown || userProfile?.role === 'super_admin' || (userProfile?.level ?? 0) >= 100;
  }, [userProfile]);

  useEffect(() => {
    refreshUserCompanies();
  }, [refreshUserCompanies]);

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        currentUnit,
        userCompanies,
        allCompanies,
        isSuperAdmin,
        isLoadingCompanies,
        userAllowedUnits,
        setCurrentCompany,
        setCurrentUnit,
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
