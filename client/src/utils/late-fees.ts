/**
 * Utilidades para el cálculo de recargos por mora
 */

export interface LateFeesConfig {
  recargoHabilitado: boolean;
  porcentajeRecargoMora: number;
}

export interface DebtWithLateFee {
  id: number;
  alumnoId: number;
  conceptoId: number;
  montoTotal: number;
  fechaLimite: string;
  estatus: string;
  concepto?: {
    nombre: string;
    exentoDeRecargo?: boolean;
  };
  // Campos calculados
  estaVencido: boolean;
  tieneRecargo: boolean;
  montoRecargo: number;
  totalConRecargo: number;
}

/**
 * Configuración por defecto (se puede obtener de la base de datos)
 */
const DEFAULT_CONFIG: LateFeesConfig = {
  recargoHabilitado: true,
  porcentajeRecargoMora: 10 // 10%
};

/**
 * Verifica si un adeudo está vencido
 */
export function isDebtOverdue(fechaLimite: string): boolean {
  const today = new Date();
  const dueDate = new Date(fechaLimite);
  return dueDate < today;
}

/**
 * Calcula el recargo por mora para un adeudo
 */
export function calculateLateFee(
  monto: number,
  fechaLimite: string,
  estatus: string,
  config: LateFeesConfig = DEFAULT_CONFIG,
  exentoDeRecargo: boolean = false
): number {
  // No aplica recargo si está deshabilitado
  if (!config.recargoHabilitado) {
    return 0;
  }

  // No aplica recargo si el concepto está exento
  if (exentoDeRecargo) {
    return 0;
  }

  // No aplica recargo si no está pendiente
  if (estatus !== 'pendiente') {
    return 0;
  }

  // No aplica recargo si no está vencido
  if (!isDebtOverdue(fechaLimite)) {
    return 0;
  }

  return monto * (config.porcentajeRecargoMora / 100);
}

/**
 * Procesa un adeudo agregando información de recargo
 */
export function processDebtWithLateFee(
  debt: any,
  config: LateFeesConfig = DEFAULT_CONFIG
): DebtWithLateFee {
  const estaVencido = isDebtOverdue(debt.fechaLimite);
  const exentoDeRecargo = debt.concepto?.exentoDeRecargo || false;
  
  const montoRecargo = calculateLateFee(
    debt.montoTotal,
    debt.fechaLimite,
    debt.estatus,
    config,
    exentoDeRecargo
  );
  
  const tieneRecargo = montoRecargo > 0;
  const totalConRecargo = debt.montoTotal + montoRecargo;

  return {
    ...debt,
    estaVencido,
    tieneRecargo,
    montoRecargo,
    totalConRecargo
  };
}

/**
 * Procesa una lista de adeudos agregando información de recargos
 */
export function processDebtsWithLateFees(
  debts: any[],
  config: LateFeesConfig = DEFAULT_CONFIG
): DebtWithLateFee[] {
  return debts.map(debt => processDebtWithLateFee(debt, config));
}

/**
 * Calcula el total de adeudos incluyendo recargos
 */
export function calculateTotalWithLateFees(
  debts: any[],
  config: LateFeesConfig = DEFAULT_CONFIG
): {
  totalOriginal: number;
  totalRecargos: number;
  totalFinal: number;
  adeudosConRecargo: number;
} {
  const processedDebts = processDebtsWithLateFees(debts, config);
  
  const totalOriginal = processedDebts.reduce((sum, debt) => sum + debt.montoTotal, 0);
  const totalRecargos = processedDebts.reduce((sum, debt) => sum + debt.montoRecargo, 0);
  const totalFinal = totalOriginal + totalRecargos;
  const adeudosConRecargo = processedDebts.filter(debt => debt.tieneRecargo).length;

  return {
    totalOriginal,
    totalRecargos,
    totalFinal,
    adeudosConRecargo
  };
}

/**
 * Formatea el monto como moneda mexicana
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

/**
 * Obtiene la configuración de recargos (simulada, se puede reemplazar con llamada a API)
 */
export function getLateFeesConfig(): Promise<LateFeesConfig> {
  // En una implementación real, esto vendría de la API
  return Promise.resolve(DEFAULT_CONFIG);
}