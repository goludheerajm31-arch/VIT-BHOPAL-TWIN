import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  tooltip?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'md',
  showText = true,
  className = '',
  tooltip = 'Verified VIT Bhopal Official Organization',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs tracking-tight ${sizeClasses[size]} ${className}`}
    >
      <ShieldCheck className={`${iconSizes[size]} text-blue-600 shrink-0`} />
      {showText && <span>✓ Verified Publisher</span>}
    </span>
  );
};
