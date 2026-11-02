import React from 'react';
import { Empresa } from '../types/database';
import { CompanyThemeConfig, findCompany } from '../config/companies';

export interface CompanyLogoProps {
  company?: Empresa | CompanyThemeConfig | string | null;
  companyId?: string;
  slug?: string;
  className?: string;
  containerClassName?: string;
  height?: number | string;
  alt?: string;
  variant?: 'image' | 'card';
  withBorder?: boolean;
  style?: React.CSSProperties;
}

/**
 * Componente Centralizado e Reutilizável de Logo Corporativa Multiempresa
 * 
 * Reutiliza exatamente o asset oficial de cada empresa:
 * - Bello Alimentos: /logos/bello.png (fundo institucional azul #2D57A3)
 * - Frango Ouro: /logos/frango_ouro.png (fundo branco #ffffff)
 * - Levo Alimentos: /logos/levo.png (fundo branco #ffffff)
 * - Pluma Agroavícola: /logos/pluma.png (fundo institucional verde #18433A)
 * 
 * Suporta busca por objeto da empresa, slug string ('bello', 'frango_ouro', 'ouro', 'levo', 'pluma') ou id.
 * O variant="card" renderiza o contêiner institucional com o fundo padronizado da empresa.
 * 
 * Regra 14: Evita a "piscada" da logo Bello. Se a empresa não estiver definida,
 * renderiza um skeleton neutro em vez de forçar a logo Bello como fallback.
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  companyId,
  slug,
  className = 'h-9 w-auto',
  containerClassName = '',
  height,
  alt,
  variant = 'image',
  withBorder = false,
  style
}) => {
  let target: CompanyThemeConfig | null = null;

  if (typeof company === 'string') {
    target = findCompany(company);
  } else if (company && typeof company === 'object') {
    target = (company as any).logoBoxBg 
      ? (company as CompanyThemeConfig) 
      : (findCompany((company as any).slug) || findCompany(company.id));
  }

  if (!target && companyId) {
    target = findCompany(companyId);
  } else if (!target && slug) {
    target = findCompany(slug);
  }

  // Tenta recuperar do localStorage (chave de persistência ativa) se nenhuma empresa foi passada
  if (!target && typeof window !== 'undefined') {
    const savedSlug = localStorage.getItem('active_company_slug');
    const savedId = localStorage.getItem('active_company_id');
    target = findCompany(savedSlug) || findCompany(savedId);
  }

  // Regra 14: Se ainda não houver empresa identificada, exibe espaço reservado neutro (skeleton)
  // JAMAIS exibir logo de outra empresa durante o carregamento!
  if (!target) {
    if (variant === 'card') {
      return (
        <div
          className={`flex items-center justify-center rounded-xl overflow-hidden bg-slate-800/80 border border-slate-700/60 animate-pulse ${containerClassName}`}
          style={{
            minWidth: '90px',
            ...style
          }}
        >
          <div className={`flex items-center justify-center ${className}`} style={{ height: height || undefined }}>
            <div className="w-14 h-4 bg-slate-700/60 rounded" />
          </div>
        </div>
      );
    }
    return (
      <div 
        className={`flex items-center justify-center bg-slate-800/80 rounded animate-pulse ${className}`}
        style={{ height: height || undefined, ...style }}
      >
        <div className="w-14 h-4 bg-slate-700/60 rounded" />
      </div>
    );
  }

  const logoSrc = target.logo_path || '/logos/bello.png';
  const logoAlt = alt || target.nome || 'Logo da Empresa';
  const companySlug = target.slug;

  // Equalização proporcional aprovada no menu principal
  let scaleClass = 'scale-100';
  if (companySlug === 'bello') {
    scaleClass = 'scale-[1.20]';
  } else if (companySlug === 'pluma') {
    scaleClass = 'scale-[1.22]';
  }

  const imgElement = (
    <div className={`flex items-center justify-center overflow-hidden ${className}`} style={{ height: height || undefined }}>
      <img
        src={logoSrc}
        alt={logoAlt}
        className={`max-h-full max-w-full object-contain select-none transition-transform duration-200 ${scaleClass}`}
      />
    </div>
  );

  if (variant === 'card') {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden shadow-md transition-all ${containerClassName}`}
        style={{
          backgroundColor: target.logoBoxBg || '#ffffff',
          borderColor: withBorder ? (target.cor_destaque || '#38bdf8') : undefined,
          ...style
        }}
      >
        {imgElement}
      </div>
    );
  }

  return imgElement;
};
