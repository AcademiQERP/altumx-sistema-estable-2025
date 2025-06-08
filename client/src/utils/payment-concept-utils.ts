// Utilidades para gestionar conceptos de pago

import { PaymentConcept } from "@shared/schema";

/**
 * Calcula el estado de un concepto de pago basado en su fecha de vigencia
 * @param concept Concepto de pago a evaluar
 * @returns "activo" | "vencido" | "futuro"
 */
export function getConceptStatus(concept: PaymentConcept): "activo" | "vencido" | "futuro" {
  if (!concept.fechaInicioVigencia && !concept.fechaFinVigencia) {
    return "activo";
  }

  const now = new Date();
  const fechaInicio = concept.fechaInicioVigencia ? new Date(concept.fechaInicioVigencia) : null;
  const fechaFin = concept.fechaFinVigencia ? new Date(concept.fechaFinVigencia) : null;

  if (fechaInicio && fechaInicio > now) {
    return "futuro";
  }

  if (fechaFin && fechaFin < now) {
    return "vencido";
  }

  return "activo";
}

/**
 * Formatea el monto a un formato de moneda
 * @param amount Monto a formatear (string o number)
 * @returns Monto formateado como string (ej: $1,234.56)
 */
export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return "$0.00";
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(numericAmount);
}

/**
 * Devuelve un color basado en el estado del concepto
 * @param status Estado del concepto
 * @returns Clase CSS para el color de fondo
 */
export function getStatusColor(status: "activo" | "vencido" | "futuro"): string {
  switch (status) {
    case "activo":
      return "bg-green-100 text-green-800";
    case "vencido":
      return "bg-red-100 text-red-800";
    case "futuro":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Devuelve un texto descriptivo para el tipo de aplicación
 * @param tipoAplicacion "mensual" o "anual"
 * @returns Texto descriptivo
 */
export function getTipoAplicacionText(tipoAplicacion: string | null | undefined): string {
  if (!tipoAplicacion) return "No especificado";
  
  switch (tipoAplicacion) {
    case "mensual":
      return "Mensual";
    case "anual":
      return "Anual";
    default:
      return tipoAplicacion;
  }
}

/**
 * Devuelve un texto descriptivo para el nivel aplicable
 * @param nivel Nivel al que aplica el concepto
 * @returns Texto descriptivo
 */
export function getNivelAplicableText(nivel: string | null | undefined): string {
  if (!nivel) return "Todos los niveles";
  return nivel;
}

/**
 * Crea una copia de un concepto de pago
 * @param concept Concepto original
 * @returns Nuevo concepto con valores del original (sin id)
 */
export function clonePaymentConcept(concept: PaymentConcept): Omit<PaymentConcept, 'id' | 'createdAt'> {
  const { id, createdAt, ...conceptData } = concept;
  
  return {
    ...conceptData,
    nombre: `Copia de ${conceptData.nombre}`
  };
}

/**
 * Valida los datos de un concepto de pago
 * @param data Datos del concepto
 * @returns Objeto con errores o null si no hay errores
 */
export function validatePaymentConcept(data: Partial<PaymentConcept>): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (!data.nombre?.trim()) {
    errors.nombre = "El nombre es obligatorio";
  }

  if (!data.montoBase) {
    errors.montoBase = "El monto es obligatorio";
  } else {
    const monto = parseFloat(data.montoBase as string);
    if (isNaN(monto) || monto < 0) {
      errors.montoBase = "El monto debe ser un número positivo";
    }
  }

  if (!data.aplicaA) {
    errors.aplicaA = "Debe seleccionar a quién aplica este concepto";
  }

  if (!data.cicloEscolar) {
    errors.cicloEscolar = "El ciclo escolar es obligatorio";
  }

  if (data.fechaInicioVigencia && data.fechaFinVigencia) {
    const fechaInicio = new Date(data.fechaInicioVigencia);
    const fechaFin = new Date(data.fechaFinVigencia);
    
    if (fechaInicio > fechaFin) {
      errors.fechaFinVigencia = "La fecha de fin debe ser posterior a la fecha de inicio";
    }
  }

  return Object.keys(errors).length ? errors : null;
}