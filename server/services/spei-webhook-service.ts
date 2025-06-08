/**
 * Servicio para manejar webhooks de confirmación SPEI
 * Simula la recepción de pagos SPEI desde una integración bancaria
 */

import { v4 as uuidv4 } from 'uuid';
import { reconcileSPEIPayment } from './spei-service';
import { storage } from '../storage';
import { auditLog, auditError } from './audit-service';
import { receiptGenerator } from './receipt-generator';
import { sendGrid } from './sendgrid-service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos para el webhook
interface SPEIWebhookPayload {
  reference: string;
  amount: number;
  paymentDate: string;
  transactionId: string;
  bankName?: string;
  accountFrom?: string;
}

/**
 * Procesa un webhook de confirmación de pago SPEI
 * @param payload Los datos recibidos del webhook
 * @param apiKey Clave de API para validar la autenticidad de la solicitud
 * @returns Resultado del procesamiento
 */
export async function processSPEIWebhook(payload: SPEIWebhookPayload, apiKey: string) {
  try {
    // Simulación de verificación de seguridad (en producción se validaría la firma con una clave compartida)
    if (!validateWebhookSignature(apiKey)) {
      await auditLog('SPEI_WEBHOOK', 'Intento de acceso no autorizado', {
        payload,
        error: 'API Key inválida o no autorizada'
      }, null);
      
      return {
        success: false,
        error: 'No autorizado',
        code: 'UNAUTHORIZED'
      };
    }

    // Validar que los campos requeridos estén presentes
    if (!payload.reference || !payload.amount || !payload.paymentDate || !payload.transactionId) {
      await auditLog('SPEI_WEBHOOK', 'Datos de webhook incompletos', {
        payload,
        error: 'Campos obligatorios faltantes'
      }, null);
      
      return {
        success: false,
        error: 'Datos incompletos',
        code: 'INVALID_PAYLOAD'
      };
    }

    // Verificar que la referencia existe
    const pendingPayment = await storage.getPendingPaymentByReference(payload.reference);
    if (!pendingPayment) {
      await auditLog('SPEI_WEBHOOK', 'Referencia no encontrada', {
        payload,
        error: 'La referencia proporcionada no existe en el sistema'
      }, null);
      
      return {
        success: false,
        error: 'Referencia no encontrada',
        code: 'REFERENCE_NOT_FOUND'
      };
    }

    // Verificar que la referencia no ha sido pagada ya
    if (pendingPayment.estado === 'pagado') {
      await auditLog('SPEI_WEBHOOK', 'Referencia ya pagada', {
        payload,
        pendingPaymentId: pendingPayment.id,
        reference: payload.reference
      }, null);
      
      return {
        success: false,
        error: 'Esta referencia ya ha sido pagada',
        code: 'ALREADY_PAID'
      };
    }

    // Verificar que la referencia no ha caducado
    const now = new Date();
    const expirationDate = new Date(pendingPayment.fechaVencimiento);
    if (now > expirationDate && pendingPayment.estado !== 'verificado') {
      await auditLog('SPEI_WEBHOOK', 'Referencia caducada', {
        payload,
        pendingPaymentId: pendingPayment.id,
        reference: payload.reference,
        expirationDate: expirationDate.toISOString()
      }, null);
      
      await storage.updatePendingPayment(pendingPayment.id, {
        estado: 'caducado',
        observaciones: 'Caducado al recibir webhook de pago'
      });
      
      return {
        success: false,
        error: 'La referencia ha caducado',
        code: 'REFERENCE_EXPIRED'
      };
    }

    // Usamos el ID de un usuario administrador para la confirmación
    // En un sistema real, se crearía un usuario específico para integraciones o sistema
    const systemUserId = '2124a40b-b6d5-4789-9017-f6b1fef05acf'; // ID del usuario admin Fernando Cebreros
    
    // Convertir la fecha de pago a objeto Date
    const paymentDate = new Date(payload.paymentDate);
    
    // Reconciliar el pago (actualizar estatus, crear registro de pago, etc.)
    const reconciliationResult = await reconcileSPEIPayment(
      payload.reference,
      payload.amount,
      paymentDate,
      systemUserId
    );

    if (!reconciliationResult.success) {
      await auditLog('SPEI_WEBHOOK', 'Error en conciliación de pago', {
        payload,
        error: reconciliationResult.error,
        pendingPaymentId: pendingPayment.id
      }, null);
      
      return {
        success: false,
        error: reconciliationResult.error,
        code: 'RECONCILIATION_ERROR'
      };
    }

    // Registrar el evento de conciliación exitosa
    await auditLog('SPEI_WEBHOOK', 'Pago SPEI procesado correctamente', {
      payload,
      pendingPaymentId: pendingPayment.id,
      paymentId: reconciliationResult.paymentId,
      studentId: reconciliationResult.studentId,
      conceptId: reconciliationResult.conceptId,
      debtId: reconciliationResult.debtId,
      transactionId: payload.transactionId
    }, null);

    // Devolver resultado exitoso
    return {
      success: true,
      reference: payload.reference,
      pendingPaymentId: pendingPayment.id,
      paymentId: reconciliationResult.paymentId,
      code: 'PAYMENT_PROCESSED'
    };
  } catch (error: any) {
    console.error('Error al procesar webhook SPEI:', error);
    
    const errorMessage = error?.message || 'Error desconocido';
    await auditError('SPEI_WEBHOOK', 'WEBHOOK', errorMessage, {
      payload
    }, null);
    
    return {
      success: false,
      error: 'Error interno al procesar el pago',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Simula el envío de una confirmación de pago SPEI para pruebas
 * @param reference Referencia SPEI a pagar
 * @returns Resultado de la operación
 */
export async function simulatePaymentConfirmation(reference: string) {
  try {
    // Obtener el pago pendiente
    const pendingPayment = await storage.getPendingPaymentByReference(reference);
    if (!pendingPayment) {
      return {
        success: false,
        error: 'Referencia no encontrada'
      };
    }

    // Crear datos simulados de un pago
    const simulatedPayload: SPEIWebhookPayload = {
      reference: reference,
      amount: parseFloat(pendingPayment.montoEsperado),
      paymentDate: new Date().toISOString(),
      transactionId: `SIM-${uuidv4().substring(0, 8).toUpperCase()}`,
      bankName: 'Banco Simulado',
      accountFrom: '123456789012345678'
    };

    // Llamar al procesador de webhook con una clave API simulada
    const apiKey = 'sk_test_simulatedApiKey123456';
    const result = await processSPEIWebhook(simulatedPayload, apiKey);
    
    // Si el pago fue procesado correctamente, generar recibo y enviar por correo
    if (result.success && result.paymentId) {
      try {
        // Obtener el pago generado
        const payment = await storage.getPayment(result.paymentId);
        if (!payment) {
          console.error(`No se encontró el pago con ID ${result.paymentId}`);
          return result;
        }
        
        // Generar el recibo PDF
        const pdfPath = await receiptGenerator.generateReceipt(payment);
        
        // Actualizar el registro de pago con la URL del PDF
        await storage.updatePayment(payment.id, {
          pdfUrl: pdfPath
        });
        
        // Obtener información del estudiante
        const student = await storage.getStudent(payment.alumnoId);
        if (!student) {
          console.error(`No se encontró el estudiante con ID ${payment.alumnoId}`);
          return { ...result, receiptUrl: pdfPath };
        }
        
        // Obtener información del padre/tutor
        const parentRelations = await storage.getRelationsByStudent(payment.alumnoId);
        if (parentRelations.length === 0) {
          console.error(`No se encontraron relaciones para el estudiante ${payment.alumnoId}`);
          return { ...result, receiptUrl: pdfPath };
        }
        
        const parentUser = await storage.getUser(parentRelations[0].padreId);
        if (!parentUser) {
          console.error(`No se encontró el padre/tutor con ID ${parentRelations[0].padreId}`);
          return { ...result, receiptUrl: pdfPath };
        }
        
        // Obtener el concepto de pago
        const concept = await storage.getPaymentConcept(payment.conceptoId);
        
        // Formatear la fecha de pago
        const formattedPaymentDate = format(new Date(payment.fechaPago), "PPP", { locale: es });
        
        // Enviar el recibo por correo
        const emailSent = await sendGrid.sendReceiptEmail({
          to: parentUser.correo,
          studentName: student.nombreCompleto,
          paymentAmount: parseFloat(payment.monto),
          paymentDate: formattedPaymentDate,
          paymentId: payment.id,
          pdfPath
        });
        
        // Guardar el registro de correo enviado
        if (emailSent) {
          await storage.createEmailLog({
            studentId: student.id,
            paymentId: payment.id,
            status: 'enviado',
            debtId: result.debtId,
            conceptName: concept ? concept.nombre : null,
            dueDate: null,
            recipientEmails: parentUser.correo,
            guardianEmail: parentUser.correo,
            subject: `Confirmación de pago SPEI - ${student.nombreCompleto}`,
            sentAt: new Date(),
            errorMessage: null
          });
          
          await auditLog('SPEI_WEBHOOK', 'Correo de confirmación enviado', {
            paymentId: payment.id,
            studentId: student.id,
            email: parentUser.correo,
            pdfPath
          }, null);
        }
        
        // Devolver el resultado con la URL del recibo
        return {
          ...result,
          receiptUrl: pdfPath,
          emailSent
        };
      } catch (receiptError: any) {
        console.error('Error al generar/enviar el recibo:', receiptError);
        await auditError('SPEI_WEBHOOK', 'RECEIPT_GENERATION', receiptError.message, {
          paymentId: result.paymentId,
          reference
        }, null);
        return result;
      }
    }

    return result;
  } catch (error: any) {
    console.error('Error al simular confirmación de pago:', error);
    
    const errorMessage = error?.message || 'Error desconocido';
    await auditError('SPEI_WEBHOOK', 'SIMULATE_PAYMENT', errorMessage, {
      reference
    }, null);
    
    return {
      success: false,
      error: 'Error al simular la confirmación de pago'
    };
  }
}

/**
 * Valida la firma del webhook (simulado)
 * @param apiKey Clave API a validar
 * @returns Booleano indicando si la firma es válida
 */
function validateWebhookSignature(apiKey: string): boolean {
  // En un sistema real, se validaría con una clave compartida y un algoritmo de firma
  // Para esta simulación, aceptamos cualquier apiKey que comience con "sk_" (convencion típica)
  return typeof apiKey === 'string' && apiKey.startsWith('sk_');
}