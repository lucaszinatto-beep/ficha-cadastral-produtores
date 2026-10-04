import { Empresa } from '../types/database';

export interface CompanyThemeConfig extends Empresa {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  buttonGradient: string;
  buttonHoverGradient: string;
  cardBorderHover: string;
  accentHex: string;
  padraoTecnicoNome: string;
  logoBoxBg: string;
}

export const COMPANIES_CONFIG: Record<string, CompanyThemeConfig> = {
  bello: {
    id: 'e1100000-0000-0000-0000-000000000001',
    nome: 'Bello Alimentos',
    slug: 'bello',
    logo_path: '/logos/bello.png',
    cor_primaria: '#1e40af',
    cor_secundaria: '#0284c7',
    cor_destaque: '#38bdf8',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-400',
    badgeBorder: 'border-sky-500/20',
    buttonGradient: 'from-blue-600 via-sky-600 to-blue-700',
    buttonHoverGradient: 'hover:from-blue-500 hover:to-sky-500',
    cardBorderHover: 'hover:border-sky-500/70 hover:shadow-sky-500/20',
    accentHex: '#38bdf8',
    padraoTecnicoNome: 'Bello Alimentos',
    logoBoxBg: '#2D57A3',
    ativo: true,
  },
  levo: {
    id: 'e1100000-0000-0000-0000-000000000002',
    nome: 'Levo Alimentos',
    slug: 'levo',
    logo_path: '/logos/levo.png',
    cor_primaria: '#581c87',
    cor_secundaria: '#7e22ce',
    cor_destaque: '#c084fc',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/20',
    buttonGradient: 'from-purple-700 via-fuchsia-700 to-purple-800',
    buttonHoverGradient: 'hover:from-purple-600 hover:to-fuchsia-600',
    cardBorderHover: 'hover:border-purple-500/70 hover:shadow-purple-500/20',
    accentHex: '#c084fc',
    padraoTecnicoNome: 'Levo Alimentos',
    logoBoxBg: '#ffffff',
    ativo: true,
  },
  ouro: {
    id: 'e1100000-0000-0000-0000-000000000003',
    nome: 'Frango Ouro',
    slug: 'ouro',
    logo_path: '/logos/frango_ouro.png',
    cor_primaria: '#991b1b',
    cor_secundaria: '#b45309',
    cor_destaque: '#f59e0b',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/20',
    buttonGradient: 'from-red-700 via-amber-600 to-red-800',
    buttonHoverGradient: 'hover:from-red-600 hover:to-amber-500',
    cardBorderHover: 'hover:border-amber-500/70 hover:shadow-amber-500/20',
    accentHex: '#f59e0b',
    padraoTecnicoNome: 'Frango Ouro',
    logoBoxBg: '#ffffff',
    ativo: true,
  },
  pluma: {
    id: 'e1100000-0000-0000-0000-000000000004',
    nome: 'Pluma Agroavícola',
    slug: 'pluma',
    logo_path: '/logos/pluma.png',
    cor_primaria: '#14382c',
    cor_secundaria: '#166534',
    cor_destaque: '#eab308',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/20',
    buttonGradient: 'from-emerald-800 via-green-700 to-emerald-900',
    buttonHoverGradient: 'hover:from-emerald-700 hover:to-green-600',
    cardBorderHover: 'hover:border-emerald-500/70 hover:shadow-emerald-500/20',
    accentHex: '#eab308',
    padraoTecnicoNome: 'Pluma Agroavícola',
    logoBoxBg: '#18433A',
    ativo: true,
  }
};

export const INITIAL_COMPANIES_LIST: CompanyThemeConfig[] = Object.values(COMPANIES_CONFIG);

export const DEFAULT_COMPANY = COMPANIES_CONFIG.bello;

export function getCompanyById(id?: string | null): CompanyThemeConfig {
  if (!id) return DEFAULT_COMPANY;
  const found = INITIAL_COMPANIES_LIST.find(c => c.id === id);
  return found || DEFAULT_COMPANY;
}

export function getCompanyBySlug(slug?: string | null): CompanyThemeConfig {
  if (!slug) return DEFAULT_COMPANY;
  return COMPANIES_CONFIG[slug] || DEFAULT_COMPANY;
}
