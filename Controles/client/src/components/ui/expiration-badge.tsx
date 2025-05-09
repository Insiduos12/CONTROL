import React from 'react';
import { getStatusClassName } from '@/lib/utils/date';

interface ExpirationBadgeProps {
  status: 'OK' | 'ATTENTION' | 'VENCENDO' | 'VENCIDO';
  className?: string;
}

export function ExpirationBadge({ status, className = '' }: ExpirationBadgeProps) {
  const statusText = {
    'OK': 'OK',
    'ATTENTION': 'ATENÇÃO',
    'VENCENDO': 'VENCENDO',
    'VENCIDO': 'VENCIDO'
  };
  
  return (
    <span 
      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(status)} ${className}`}
    >
      {statusText[status]}
    </span>
  );
}
