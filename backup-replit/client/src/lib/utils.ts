import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatFecha(fecha: string | Date, formatString: string = "dd 'de' MMMM 'de' yyyy"): string {
  if (!fecha) return "Fecha no disponible";
  
  try {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return format(date, formatString, { locale: es });
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return "Fecha inválida";
  }
}

// Función para formatear fechas en formato legible - alias para consistencia
export function formatDate(dateString: string, withTime = true): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return date.toLocaleDateString('es-MX', options);
}
