import React from 'react';

interface BelloLogoProps {
  className?: string;
  height?: number | string;
}

export const BelloLogo: React.FC<BelloLogoProps> = ({ className = 'h-10 w-auto', height }) => {
  return (
    <div className={`flex items-center ${className}`} style={{ height: height || undefined }}>
      <img
        src="/bello-logo.svg"
        alt="Bello Alimentos"
        className="h-full w-auto object-contain select-none"
      />
    </div>
  );
};
