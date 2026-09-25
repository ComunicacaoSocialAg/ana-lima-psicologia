import React from 'react';

interface DandelionLogoProps {
  className?: string;
  size?: number;
  variant?: 'dark' | 'light' | 'transparent-light' | 'transparent-dark';
  rounded?: 'full' | '2xl' | 'xl' | 'lg';
}

export const DandelionLogo: React.FC<DandelionLogoProps> = ({
  className = '',
  size = 48,
  rounded = '2xl',
}) => {
  const roundedClassMap = {
    full: 'rounded-2xl',
    '2xl': 'rounded-2xl',
    xl: 'rounded-xl',
    lg: 'rounded-lg',
  };
  const roundedClass = roundedClassMap[rounded] || 'rounded-2xl';

  return (
    <img
      src="/logo-app.svg?v=8"
      alt="Ana Lima Psicologia - Logo Dente de Leão"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 select-none object-cover bg-[#3f4a3d] ${roundedClass} ${className}`}
    />
  );
};
