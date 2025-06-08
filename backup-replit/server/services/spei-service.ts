import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { storage } from '../storage';
import { Debt } from '@shared/schema';

// Configuración de SPEI
const SPEI_CONFIG = {
  CLABE: process.env.SPEI_CLABE || '012345678901234567',
  BANK_NAME: 'BBVA',
  ACCOUNT_HOLDER: 'Colegio Altum',
  REFERENCE_PREFIX: 'ALTUM',
  DAYS_VALID: 5 // Cantidad de días que la referencia es válida
};

/**
 * Genera una referencia única para un pago SPEI
 * @param studentId ID del alumno
 * @param conceptId ID del concepto de pago
 * @returns Referencia única en formato ${PREFIX}-${studentId}-${conceptId}-${uuid corto}
 */
export function generateSPEIReference(studentId: number, conceptId: number): string {
  // Generamos un UUIDv4 y tomamos solo los primeros 8 caracteres para hacerlo más corto
  const shortUuid = uuidv4().split('-')[0].toUpperCase();
  
  // Formato: ALTUM-1-2-12ABC456
  return `${SPEI_CONFIG.REFERENCE_PREFIX}-${studentId}-${conceptId}-${shortUuid}`;
}

/**
 * Crea un registro de pago pendiente para SPEI
 * @param studentId ID del alumno
 * @param conceptId ID del concepto de pago
 * @param amount Monto esperado
 * @returns Objeto con la referencia y los detalles de pago
 */
export async function createSPEIPayment(
  studentId: number, 
  conceptId: number, 
  amount: number,
  debt?: Debt
) {
  try {
    // Loguear datos para diagnóstico
    console.log("[SPEI] Generando referencia para - StudentId:", studentId, "ConceptId:", conceptId, "Monto:", amount);
    
    // Verificar que el concepto existe
    if (!conceptId) {
      console.error("[SPEI] Error: conceptId es nulo o undefined");
      throw new Error("No se proporcionó un ID de concepto válido");
    }
    
    // Generar referencia única
    const reference = generateSPEIReference(studentId, conceptId);
    
    // Calcular fecha de vencimiento (5 días a partir de hoy)
    const expirationDate = addDays(new Date(), SPEI_CONFIG.DAYS_VALID);
    
    // Si existe un adeudo, usamos su fecha de vencimiento si es anterior a la que calculamos
    let dueDate = expirationDate;
    if (debt && debt.fechaLimite) {
      try {
        const debtDueDate = new Date(debt.fechaLimite);
        if (debtDueDate < expirationDate) {
          dueDate = debtDueDate;
        }
        console.log("[SPEI] Fecha límite del adeudo:", debt.fechaLimite);
        console.log("[SPEI] Fecha límite calculada:", dueDate.toISOString());
      } catch (error) {
        console.error("[SPEI] Error al procesar fecha límite del adeudo:", error);
        // Si hay error con la fecha, usamos la fecha calculada por defecto
      }
    }
    
    // Para depuración
    console.log("[SPEI] Datos para crear pago pendiente:");
    console.log("[SPEI] StudentId:", studentId);
    console.log("[SPEI] ConceptId:", conceptId);
    console.log("[SPEI] Amount:", amount);
    console.log("[SPEI] Reference:", reference);
    
    // IMPORTANTE: Para base de datos PostgreSQL con Drizzle, no necesitamos convertir a string ISO
    // porque la columna `fechaVencimiento` espera un timestamp y Drizzle maneja esta conversión
    console.log("[SPEI] Fecha de vencimiento (objeto Date):", dueDate);
    
    try {
      // Crear registro de pago pendiente - pasamos directamente el objeto Date
      const pendingPayment = await storage.createPendingPayment({
        alumnoId: studentId,
        conceptoId: conceptId,
        montoEsperado: amount.toString(),
        referencia: reference,
        metodoPago: 'SPEI',
        estado: 'pendiente_confirmacion',
        fechaVencimiento: dueDate, // Aquí pasamos el objeto Date directamente
        observaciones: null,
        archivoComprobante: null,
        usuarioConfirmacion: null,
        fechaConfirmacion: null
      });
      
      if (!pendingPayment) {
        throw new Error("Error al crear el registro de pago pendiente");
      }
      
      console.log("[SPEI] Pago pendiente creado correctamente con ID:", pendingPayment.id);
      
      // Devolver información para mostrar al usuario
      return {
        success: true,
        reference,
        paymentInfo: {
          clabe: SPEI_CONFIG.CLABE,
          bankName: SPEI_CONFIG.BANK_NAME,
          accountHolder: SPEI_CONFIG.ACCOUNT_HOLDER,
          amount,
          reference,
          expirationDate: dueDate,
          pendingPaymentId: pendingPayment.id
        }
      };
    } catch (dbError) {
      console.error("Error específico al crear el pago pendiente:", dbError);
      throw new Error("No se pudo crear el registro de pago. Verifique los datos proporcionados.");
    }
  } catch (error) {
    console.error('Error al crear pago SPEI:', error);
    return {
      success: false,
      error: 'No se pudo generar la referencia de pago. Por favor, intente nuevamente.'
    };
  }
}

/**
 * Verifica si una referencia ya ha sido pagada
 * @param reference Referencia a verificar
 * @returns Boolean indicando si ya está pagada
 */
export async function isReferenceAlreadyPaid(reference: string): Promise<boolean> {
  try {
    const pendingPayment = await storage.getPendingPaymentByReference(reference);
    return pendingPayment ? pendingPayment.estado === 'pagado' : false;
  } catch (error) {
    console.error('Error al verificar referencia:', error);
    return false;
  }
}

/**
 * Concilia un pago SPEI con una referencia
 * @param reference Referencia del pago
 * @param amount Monto pagado
 * @param paymentDate Fecha del pago
 * @param confirmingUserId ID del usuario que confirma el pago
 * @returns Resultado de la conciliación
 */
export async function reconcileSPEIPayment(
  reference: string,
  amount: number,
  paymentDate: Date,
  confirmingUserId: string
) {
  try {
    // Buscar el pago pendiente por referencia
    const pendingPayment = await storage.getPendingPaymentByReference(reference);
    
    if (!pendingPayment) {
      return {
        success: false,
        error: 'No se encontró la referencia de pago'
      };
    }
    
    // Verificar que el pago no esté ya confirmado
    if (pendingPayment.estado === 'pagado') {
      return {
        success: false,
        error: 'Esta referencia ya ha sido pagada'
      };
    }
    
    // Verificar que no haya vencido
    const now = new Date();
    const expirationDate = new Date(pendingPayment.fechaVencimiento);
    
    if (now > expirationDate && pendingPayment.estado !== 'verificado') {
      // Actualizar estado a caducado
      await storage.updatePendingPayment(pendingPayment.id, {
        estado: 'caducado'
      });
      
      return {
        success: false,
        error: 'La referencia de pago ha vencido'
      };
    }
    
    // Verificar que el monto coincida
    const expectedAmount = parseFloat(pendingPayment.montoEsperado);
    if (Math.abs(amount - expectedAmount) > 0.01) { // Tolerancia de 1 centavo por redondeo
      // Aunque el monto no coincida, podemos permitir la conciliación con una observación
      const observation = `Monto pagado (${amount}) diferente al esperado (${expectedAmount})`;
      
      // Actualizar el pago pendiente - Usamos el objeto Date directamente
      await storage.updatePendingPayment(pendingPayment.id, {
        estado: 'verificado',
        observaciones: observation,
        usuarioConfirmacion: confirmingUserId,
        fechaConfirmacion: now // Objeto Date directamente, no usamos toISOString()
      });
      
      return {
        success: true,
        warning: observation,
        pendingPaymentId: pendingPayment.id,
        studentId: pendingPayment.alumnoId,
        conceptId: pendingPayment.conceptoId,
        amount: amount, // Usamos el monto real pagado
        requiresManualReview: true
      };
    }
    
    // Todo correcto, actualizar el pago pendiente
    await storage.updatePendingPayment(pendingPayment.id, {
      estado: 'pagado',
      usuarioConfirmacion: confirmingUserId,
      fechaConfirmacion: now // Objeto Date directamente
    });
    
    // Buscar el adeudo relacionado
    const relatedDebts = await storage.getDebtsByStudent(pendingPayment.alumnoId);
    const debt = relatedDebts.find(d => d.conceptoId === pendingPayment.conceptoId && d.estatus !== 'pagado');
    
    // Si encontramos un adeudo relacionado, lo actualizamos
    if (debt) {
      await storage.updateDebt(debt.id, {
        estatus: 'pagado'
      });
    }
    
    // Crear el registro de pago
    const payment = await storage.createPayment({
      alumnoId: pendingPayment.alumnoId,
      conceptoId: pendingPayment.conceptoId,
      monto: amount.toString(),
      fechaPago: paymentDate.toISOString(),
      metodoPago: 'SPEI',
      referencia: reference,
      observaciones: null,
      pdfUrl: null
    });
    
    return {
      success: true,
      pendingPaymentId: pendingPayment.id,
      paymentId: payment.id,
      studentId: pendingPayment.alumnoId,
      conceptId: pendingPayment.conceptoId,
      amount: amount,
      debtId: debt?.id || null
    };
  } catch (error) {
    console.error('Error al conciliar pago SPEI:', error);
    return {
      success: false,
      error: 'Error al procesar el pago SPEI. Por favor, contacte al administrador.'
    };
  }
}

/**
 * Marca manualmente un pago SPEI como pagado
 * @param pendingPaymentId ID del pago pendiente
 * @param confirmingUserId ID del usuario que confirma
 * @returns Resultado de la operación
 */
export async function confirmSPEIPayment(pendingPaymentId: number, confirmingUserId: string) {
  try {
    // Buscar el pago pendiente
    const pendingPayment = await storage.getPendingPayment(pendingPaymentId);
    
    if (!pendingPayment) {
      return {
        success: false,
        error: 'No se encontró el pago pendiente'
      };
    }
    
    // Verificar que no esté ya confirmado
    if (pendingPayment.estado === 'pagado') {
      return {
        success: false,
        error: 'Este pago ya ha sido confirmado'
      };
    }
    
    const now = new Date();
    
    // Actualizar el pago pendiente
    await storage.updatePendingPayment(pendingPayment.id, {
      estado: 'pagado',
      usuarioConfirmacion: confirmingUserId,
      fechaConfirmacion: now // Objeto Date directamente
    });
    
    // Buscar el adeudo relacionado
    const relatedDebts = await storage.getDebtsByStudent(pendingPayment.alumnoId);
    const debt = relatedDebts.find(d => d.conceptoId === pendingPayment.conceptoId && d.estatus !== 'pagado');
    
    // Si encontramos un adeudo relacionado, lo actualizamos
    if (debt) {
      await storage.updateDebt(debt.id, {
        estatus: 'pagado'
      });
    }
    
    // Crear el registro de pago
    const payment = await storage.createPayment({
      alumnoId: pendingPayment.alumnoId,
      conceptoId: pendingPayment.conceptoId,
      monto: pendingPayment.montoEsperado,
      fechaPago: now.toISOString(),
      metodoPago: 'SPEI',
      referencia: pendingPayment.referencia,
      observaciones: 'Confirmado manualmente',
      pdfUrl: null
    });
    
    return {
      success: true,
      pendingPaymentId: pendingPayment.id,
      paymentId: payment.id,
      studentId: pendingPayment.alumnoId,
      conceptId: pendingPayment.conceptoId,
      amount: parseFloat(pendingPayment.montoEsperado),
      debtId: debt?.id || null
    };
  } catch (error) {
    console.error('Error al confirmar pago SPEI manualmente:', error);
    return {
      success: false,
      error: 'Error al confirmar el pago. Por favor, contacte al administrador.'
    };
  }
}

/**
 * Obtiene todos los pagos pendientes que han vencido
 */
export async function getExpiredReferences() {
  try {
    return await storage.getExpiredPendingPayments();
  } catch (error) {
    console.error('Error al obtener referencias vencidas:', error);
    return [];
  }
}