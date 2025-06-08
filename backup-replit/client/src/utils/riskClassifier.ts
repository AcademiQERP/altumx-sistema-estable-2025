// Tipos para el clasificador de riesgo
export type PaymentHistory = {
  id: number;
  studentId: number;
  dueDate: string;
  paymentDate: string | null;
  amount: string;
  status: string;
  concept?: string;
};

export type ReminderHistory = {
  id: number;
  studentId: number;
  status: string;
  sentAt: string;
};

export type RiskLevel = 'low' | 'medium' | 'high';

export type RiskClassification = {
  studentId: number;
  studentName: string;
  totalPayments: number;
  totalDebts: number;
  latePayments: number;
  currentOverdueDebts: number;
  riskLevel: RiskLevel;
  suggestedAction: string;
  averageDelayDays: number;
};

// Configuración de umbrales para la clasificación de riesgo
export const riskThresholds = {
  // Umbral para riesgo medio (en días de retraso)
  mediumRiskDelayThreshold: 5,
  // Número de pagos tardíos para riesgo medio
  mediumRiskLatePaymentsCount: 2,
  // Número de deudas vencidas para riesgo alto
  highRiskOverdueDebtsCount: 2
};

/**
 * Calcula los días de retraso entre la fecha de vencimiento y la fecha de pago
 * @param dueDate Fecha de vencimiento
 * @param paymentDate Fecha de pago
 * @returns Número de días de retraso (0 si pagó a tiempo o aún no vence)
 */
export function calculateDelayDays(dueDate: string, paymentDate: string | null): number {
  if (!paymentDate) return 0;
  
  const dueDateTime = new Date(dueDate).getTime();
  const paymentDateTime = new Date(paymentDate).getTime();
  
  // Calcular la diferencia en días
  const diffTime = paymentDateTime - dueDateTime;
  
  // Si el pago fue antes o en la fecha límite, no hay retraso
  if (diffTime <= 0) return 0;
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Determina si un pago se considera tardío según el umbral configurado
 */
export function isLatePayment(dueDate: string, paymentDate: string | null): boolean {
  if (!paymentDate) return false;
  const delayDays = calculateDelayDays(dueDate, paymentDate);
  return delayDays > riskThresholds.mediumRiskDelayThreshold;
}

/**
 * Clasifica el nivel de riesgo de un estudiante basado en su historial de pagos
 */
export function classifyStudentRisk(
  studentId: number,
  studentName: string,
  payments: PaymentHistory[],
  currentDebts: PaymentHistory[],
  reminders?: ReminderHistory[]
): RiskClassification {
  
  // Filtrar pagos del estudiante
  const studentPayments = payments.filter(p => p.studentId === studentId);
  
  // Filtrar deudas actuales del estudiante
  const studentDebts = currentDebts.filter(d => d.studentId === studentId);
  
  // Contar pagos tardíos
  const latePayments = studentPayments.filter(
    payment => isLatePayment(payment.dueDate, payment.paymentDate)
  );
  
  // Calcular el promedio de días de retraso
  const totalDelayDays = studentPayments
    .map(payment => calculateDelayDays(payment.dueDate, payment.paymentDate))
    .reduce((sum, days) => sum + days, 0);
  
  const averageDelayDays = studentPayments.length > 0 
    ? Math.round(totalDelayDays / studentPayments.length) 
    : 0;
  
  // Contar deudas vencidas actuales
  const now = new Date();
  const overdueDebts = studentDebts.filter(debt => {
    const dueDate = new Date(debt.dueDate);
    return dueDate < now && debt.status !== 'pagado';
  });
  
  // Clasificar el nivel de riesgo
  let riskLevel: RiskLevel = 'low';
  let suggestedAction = 'Ninguna acción requerida';
  
  // Riesgo alto: 2+ deudas vencidas o historial de morosidad significativo
  if (
    overdueDebts.length >= riskThresholds.highRiskOverdueDebtsCount || 
    (latePayments.length > riskThresholds.mediumRiskLatePaymentsCount && averageDelayDays > 10)
  ) {
    riskLevel = 'high';
    suggestedAction = 'Contactar inmediatamente';
  } 
  // Riesgo medio: 2+ pagos tardíos, pero sin adeudos vencidos actuales graves
  else if (
    latePayments.length >= riskThresholds.mediumRiskLatePaymentsCount || 
    overdueDebts.length === 1
  ) {
    riskLevel = 'medium';
    suggestedAction = 'Enviar recordatorio';
  }
  // Riesgo bajo: pagos puntuales o solo 1 pago tardío menor al umbral
  else {
    riskLevel = 'low';
    suggestedAction = 'Monitoreo regular';
  }
  
  return {
    studentId,
    studentName,
    totalPayments: studentPayments.length,
    totalDebts: studentDebts.length,
    latePayments: latePayments.length,
    currentOverdueDebts: overdueDebts.length,
    riskLevel,
    suggestedAction,
    averageDelayDays
  };
}

/**
 * Clasifica a todos los estudiantes según su nivel de riesgo
 */
export function classifyAllStudentsRisk(
  students: { id: number; nombreCompleto: string }[],
  payments: PaymentHistory[],
  debts: PaymentHistory[],
  reminders?: ReminderHistory[]
): RiskClassification[] {
  return students.map(student => {
    return classifyStudentRisk(
      student.id,
      student.nombreCompleto,
      payments,
      debts,
      reminders
    );
  });
}