import React from 'react';
import { Empresa } from '../types/database';
import { CompanyThemeConfig, DEFAULT_COMPANY, getCompanyById, getCompanyBySlug } from '../config/companies';

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
 * Suporta busca por objeto da empresa, slug string ('bello', 'frango-ouro', 'levo', 'pluma') ou id.
 * O variant="card" renderiza o contêiner institucional com o fundo padronizado da empresa.
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
  let target: CompanyThemeConfig | undefined;

  if (typeof company === 'string') {
    const normalized = company.toLowerCase().trim();
    if (normalized === 'frango-ouro' || normalized === 'frango_ouro') {
      target = getCompanyBySlug('ouro');
    } else {
      const bySlug = getCompanyBySlug(normalized);
      target = bySlug && bySlug.slug === normalized ? bySlug : getCompanyById(normalized);
    }
  } else if (company && typeof company === 'object') {
    target = (company as any).logoBoxBg ? (company as CompanyThemeConfig) : getCompanyById(company.id);
  }

  if (!target && companyId) {
    target = getCompanyById(companyId);
  } else if (!target && slug) {
    target = getCompanyBySlug(slug);
  }

  if (!target) {
    target = DEFAULT_COMPANY;
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
