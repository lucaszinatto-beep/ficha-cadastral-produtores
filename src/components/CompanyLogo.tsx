import React from 'react';
import { Empresa } from '../types/database';
import { DEFAULT_COMPANY, getCompanyById, getCompanyBySlug } from '../config/companies';

interface CompanyLogoProps {
  company?: Empresa | null;
  companyId?: string;
  slug?: string;
  className?: string;
  height?: number | string;
  alt?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  companyId,
  slug,
  className = 'h-10 w-auto',
  height,
  alt
}) => {
  let target = company;

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

  // Equalização proporcional da área visual interna das 4 logos dentro do container idêntico
  // Referência visual aprovada: Levo Alimentos e Frango Ouro (escala 100%)
  // Bello e Pluma possuem margens internas em seus arquivos originais e são equalizadas sem distorção nem corte
  let scaleClass = 'scale-100';
  if (companySlug === 'bello') {
    scaleClass = 'scale-[1.20]';
  } else if (companySlug === 'pluma') {
    scaleClass = 'scale-[1.22]';
  }

  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`} style={{ height: height || undefined }}>
      <img
        src={logoSrc}
        alt={logoAlt}
        className={`max-h-full max-w-full object-contain select-none transition-transform duration-200 ${scaleClass}`}
      />
    </div>
  );
};
