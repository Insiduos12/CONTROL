import { addDays, differenceInDays, format, isAfter, isBefore, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

export function parseDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Try to parse different date formats
  try {
    // First try ISO format (yyyy-MM-dd)
    if (dateString.includes("-")) {
      return parse(dateString, "yyyy-MM-dd", new Date());
    }
    
    // Then try Brazilian format (dd/MM/yyyy)
    if (dateString.includes("/")) {
      return parse(dateString, "dd/MM/yyyy", new Date());
    }
    
    // If all fails, return current date
    return new Date();
  } catch (error) {
    console.error("Error parsing date:", error);
    return new Date();
  }
}

export function getDaysDifference(date: Date): number {
  const today = new Date();
  return differenceInDays(date, today);
}

export function getExpirationStatus(daysRemaining: number): 'OK' | 'ATTENTION' | 'VENCENDO' | 'VENCIDO' {
  if (daysRemaining < 0) return 'VENCIDO';
  if (daysRemaining <= 7) return 'VENCENDO';
  if (daysRemaining <= 15) return 'ATTENTION';
  return 'OK';
}

export function getStatusClassName(status: 'OK' | 'ATTENTION' | 'VENCENDO' | 'VENCIDO'): string {
  switch (status) {
    case 'OK':
      return 'bg-[#6abf69]/20 text-[#6abf69]';
    case 'ATTENTION':
      return 'bg-[#ffc107]/20 text-[#ffc107]';
    case 'VENCENDO':
      return 'bg-[#ff6b6b]/20 text-[#ff6b6b]';
    case 'VENCIDO':
      return 'bg-[#dc3545]/20 text-[#dc3545]';
    default:
      return 'bg-gray-200 text-gray-600';
  }
}
