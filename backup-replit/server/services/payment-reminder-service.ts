import { storage } from '../storage';
import sgMail from '@sendgrid/mail';
import { debts, parentStudentRelations, students, users, paymentConcepts, emailLogs } from '@shared/schema';
import { db } from '../db';
import { eq, and, lte, lt, gte, or, ne, isNull, desc } from 'drizzle-orm';
import { format, addDays, isAfter, isBefore, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

// Interfaces para el servicio de recordatorios
interface EmailData {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

interface DebtWithDetails {
  id: number;
  montoTotal: string;
  fechaLimite: string;
  studentId: number;
  studentName: string;
  conceptName: string;
  parentEmails: string[];
  diasVencimiento: number;
  nivelRiesgo: 'bajo' | 'medio' | 'alto';
}

interface ReminderResult {
  success: number;
  errors: number;
  omitted: number;
  message: string;
  sentTo?: string[];
  errorDetails?: string[];
  omittedDetails?: string[];
  lastRunTimestamp?: Date;
}

/**
 * Verifica si ya se envió un recordatorio hoy para el mismo adeudo
 */
/**
 * Verifica si ya se envió un recordatorio en las últimas 24 horas para el mismo adeudo
 * - Ayuda a prevenir envíos duplicados de recordatorios
 * - Verifica en un período de 24 horas en lugar de solo el día actual
 */
async function isReminderRecentlySent(debtId: number): Promise<boolean> {
  // Calcular fecha/hora 24 horas atrás
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  
  // Buscar cualquier recordatorio enviado en las últimas 24 horas
  const logs = await db
    .select()
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.debtId, debtId),
        gte(emailLogs.sentAt, oneDayAgo),
        eq(emailLogs.status, 'enviado')
      )
    );
  
  const recentlySent = logs.length > 0;
  console.log(`Verificando recordatorios previos para adeudo #${debtId} en las últimas 24 horas: ${recentlySent ? 'YA ENVIADO' : 'No enviado aún'}`);
  
  // Si hay logs, mostrar el último envío
  if (recentlySent && logs[0]?.sentAt) {
    const lastSentDate = new Date(logs[0].sentAt);
    const hoursAgo = Math.round((new Date().getTime() - lastSentDate.getTime()) / (1000 * 60 * 60));
    console.log(`  → Último recordatorio enviado hace ${hoursAgo} horas (${lastSentDate.toLocaleString('es-MX')})`);
  }
  
  return recentlySent;
}

/**
 * Determina el nivel de riesgo basado en los días de vencimiento
 */
function determineRiskLevel(diasVencimiento: number): 'bajo' | 'medio' | 'alto' {
  if (diasVencimiento <= 0) { // No vencido aún, próximo a vencer
    return 'bajo';
  } else if (diasVencimiento <= 15) { // Vencido recientemente
    return 'medio';
  } else { // Vencido por más tiempo
    return 'alto';
  }
}

/**
 * Envía recordatorios de pagos vencidos o próximos a vencer
 */
export async function sendPaymentReminders(): Promise<ReminderResult> {
  console.log('Iniciando proceso de envío de recordatorios de pagos...');
  
  const today = new Date();
  const threeDaysLater = addDays(today, 3);
  
  // Formatear fechas para consulta en la base de datos
  const todayStr = format(today, 'yyyy-MM-dd');
  const threeDaysLaterStr = format(threeDaysLater, 'yyyy-MM-dd');
  
  try {
    // 1. Obtener adeudos pendientes o vencidos
    const relevantDebts = await db
      .select({
        id: debts.id,
        alumnoId: debts.alumnoId,
        conceptoId: debts.conceptoId,
        montoTotal: debts.montoTotal,
        fechaLimite: debts.fechaLimite,
        estatus: debts.estatus
      })
      .from(debts)
      .where(
        and(
          or(
            eq(debts.estatus, 'pendiente'),
            eq(debts.estatus, 'vencido'),
            eq(debts.estatus, 'parcial')
          ),
          or(
            // Próximos a vencer en los siguientes 3 días
            and(
              gte(debts.fechaLimite, todayStr),
              lte(debts.fechaLimite, threeDaysLaterStr)
            ),
            // O ya vencidos
            lt(debts.fechaLimite, todayStr)
          )
        )
      );
      
    console.log(`Se encontraron ${relevantDebts.length} adeudos relevantes para enviar recordatorios`);

    if (relevantDebts.length === 0) {
      return { 
        success: 0, 
        errors: 0, 
        omitted: 0,
        message: 'No se encontraron adeudos pendientes o vencidos para notificar',
        lastRunTimestamp: new Date()
      };
    }
    
    // 2. Recopilar detalles necesarios para cada adeudo
    const debtsWithDetails: DebtWithDetails[] = [];
    const omittedDebts: { id: number; studentName: string; reason: string }[] = [];
    let omittedCount = 0;
    
    for (const debt of relevantDebts) {
      try {
        // Verificar si ya se envió un recordatorio en las últimas 24 horas para este adeudo
        const recentlySent = await isReminderRecentlySent(debt.id);
        if (recentlySent) {
          const reason = "Ya se envió un recordatorio en las últimas 24 horas";
          console.log(`Ya se envió un recordatorio en las últimas 24 horas para el adeudo ${debt.id} - omitiendo`);
          omittedCount++;
          
          // Obtener información del estudiante para el log si está disponible
          let studentName = `Adeudo ID: ${debt.id}`;
          let studentId = debt.alumnoId;
          try {
            const student = await storage.getStudent(debt.alumnoId);
            if (student) {
              studentName = student.nombreCompleto;
              studentId = student.id;
            }
          } catch (e) {
            console.warn(`No se pudo obtener información del estudiante para el adeudo ${debt.id}:`, e);
          }
          
          omittedDebts.push({
            id: debt.id,
            studentName: studentName,
            reason: reason
          });
          
          // Registrar en los logs el recordatorio omitido por ser reciente
          try {
            await storage.createEmailLog({
              studentId: studentId,
              paymentId: 0,
              debtId: debt.id,
              conceptName: "Recordatorio de pago",
              dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
              recipientEmails: "",
              status: 'omitido',
              sentAt: new Date(),
              errorMessage: reason
            });
          } catch (logError) {
            console.error('Error al registrar omisión por recordatorio reciente:', logError);
          }
          
          continue;
        }
        
        // Obtener datos del estudiante
        const student = await storage.getStudent(debt.alumnoId);
        if (!student) {
          const reason = "No se encontró información del estudiante";
          console.error(`No se encontró el estudiante con ID ${debt.alumnoId}`);
          omittedCount++;
          omittedDebts.push({
            id: debt.id,
            studentName: `ID: ${debt.alumnoId}`,
            reason: reason
          });
          
          // Registrar el adeudo omitido en los logs
          await storage.createEmailLog({
            studentId: debt.alumnoId,
            paymentId: 0,
            debtId: debt.id,
            conceptName: "",
            dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
            recipientEmails: "",
            status: 'omitido',
            sentAt: new Date(),
            errorMessage: reason
          });
          continue;
        }
        
        // Obtener datos del concepto de pago
        const concept = await storage.getPaymentConcept(debt.conceptoId);
        if (!concept) {
          const reason = "No se encontró el concepto de pago";
          console.error(`No se encontró el concepto de pago con ID ${debt.conceptoId}`);
          omittedCount++;
          omittedDebts.push({
            id: debt.id,
            studentName: student.nombreCompleto,
            reason: reason
          });
          
          // Registrar en los logs
          await storage.createEmailLog({
            studentId: student.id,
            paymentId: 0,
            debtId: debt.id,
            conceptName: `Concepto ID: ${debt.conceptoId}`,
            dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
            recipientEmails: "",
            status: 'omitido',
            sentAt: new Date(),
            errorMessage: reason
          });
          continue;
        }
        
        // Obtener relaciones padre-estudiante
        const relations = await storage.getRelationsByStudent(debt.alumnoId);
        if (!relations || relations.length === 0) {
          const reason = "No tiene tutores registrados";
          console.error(`No se encontraron padres/tutores para el estudiante ${student.nombreCompleto}`);
          omittedCount++;
          omittedDebts.push({
            id: debt.id,
            studentName: student.nombreCompleto,
            reason: reason
          });
          
          // Registrar en los logs
          await storage.createEmailLog({
            studentId: student.id,
            paymentId: 0,
            debtId: debt.id,
            conceptName: concept.nombre,
            dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
            recipientEmails: "",
            status: 'omitido',
            sentAt: new Date(),
            errorMessage: reason
          });
          continue;
        }
        
        // Obtener emails de padres/tutores
        const parentEmails: string[] = [];
        for (const relation of relations) {
          const parent = await storage.getUser(relation.padreId);
          if (parent && parent.correo) {
            parentEmails.push(parent.correo);
          }
        }
        
        if (parentEmails.length === 0) {
          const reason = "Sus tutores no tienen correo registrado";
          console.error(`No se encontraron emails de padres/tutores para el estudiante ${student.nombreCompleto}`);
          omittedCount++;
          omittedDebts.push({
            id: debt.id,
            studentName: student.nombreCompleto,
            reason: reason
          });
          
          // Registrar en los logs
          await storage.createEmailLog({
            studentId: student.id,
            paymentId: 0,
            debtId: debt.id,
            conceptName: concept.nombre,
            dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
            recipientEmails: "",
            status: 'omitido',
            sentAt: new Date(),
            errorMessage: reason
          });
          continue;
        }
        
        // Calcular días de vencimiento o días hasta vencimiento
        const fechaLimite = new Date(debt.fechaLimite);
        const diasVencimiento = differenceInDays(today, fechaLimite);
        
        // Determinar nivel de riesgo
        const nivelRiesgo = determineRiskLevel(diasVencimiento);
        
        // Agregar a la lista de adeudos con detalles
        debtsWithDetails.push({
          id: debt.id,
          montoTotal: debt.montoTotal,
          fechaLimite: debt.fechaLimite,
          studentId: student.id,
          studentName: student.nombreCompleto,
          conceptName: concept.nombre,
          parentEmails: parentEmails,
          diasVencimiento: diasVencimiento,
          nivelRiesgo: nivelRiesgo
        });
      } catch (error) {
        const reason = `Error inesperado: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`Error al procesar detalles del adeudo ${debt.id}:`, error);
        omittedCount++;
        omittedDebts.push({
          id: debt.id,
          studentName: `Adeudo ID: ${debt.id}`,
          reason: reason
        });
        
        // Intentar registrar en los logs
        try {
          await storage.createEmailLog({
            studentId: debt.alumnoId,
            paymentId: 0,
            debtId: debt.id,
            conceptName: "",
            dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
            recipientEmails: "",
            status: 'omitido',
            sentAt: new Date(),
            errorMessage: reason
          });
        } catch (logError) {
          console.error('Error al registrar adeudo omitido en logs:', logError);
        }
      }
    }
    
    console.log(`Se procesaron ${debtsWithDetails.length} adeudos con todos los detalles necesarios`);
    console.log(`Se omitieron ${omittedCount} adeudos por falta de información completa`);
    
    // 3. Enviar recordatorios para cada adeudo
    let successCount = 0;
    let errorCount = 0;
    const sentTo: string[] = [];
    const errorDetails: string[] = [];
    
    const schoolName = "Instituto EduMex";
    
    for (const debt of debtsWithDetails) {
      try {
        const formattedAmount = parseFloat(debt.montoTotal).toLocaleString('es-MX', {
          style: 'currency',
          currency: 'MXN'
        });
        
        const formattedDate = format(new Date(debt.fechaLimite), 'PPP', { locale: es });
        
        // Determinar el tipo de mensaje según si es vencido o próximo a vencer
        const isOverdue = debt.diasVencimiento > 0;
        const statusText = isOverdue ? 
          `<strong class="highlight-red">VENCIDO por ${debt.diasVencimiento} día(s)</strong>` : 
          `<strong class="highlight-orange">Próximo a vencer en ${-debt.diasVencimiento} día(s)</strong>`;
        
        // Determinar el color de riesgo
        const riskColor = debt.nivelRiesgo === 'alto' ? '#dc2626' : 
                          debt.nivelRiesgo === 'medio' ? '#ea580c' : 
                          '#0ea5e9';
        
        const emailData: EmailData = {
          to: debt.parentEmails.join(', '),
          from: 'noreply@sendgrid.net', // Usando la dirección verificada en SendGrid
          subject: isOverdue ? 
            `URGENTE: Pago vencido - ${debt.studentName}` : 
            `Recordatorio de pago próximo a vencer - ${debt.studentName}`,
          text: `
Estimado(a) padre/tutor de ${debt.studentName}:

Le recordamos que tiene un pago ${isOverdue ? 'VENCIDO' : 'próximo a vencer'} correspondiente a:

Concepto: ${debt.conceptName}
Monto: ${formattedAmount}
Fecha límite: ${formattedDate}
Estado: ${isOverdue ? 'VENCIDO por ' + debt.diasVencimiento + ' día(s)' : 'Próximo a vencer en ' + (-debt.diasVencimiento) + ' día(s)'}
Nivel de riesgo: ${debt.nivelRiesgo.toUpperCase()}

Por favor, realice el pago lo antes posible para evitar recargos adicionales y mantener los servicios educativos sin interrupciones.

Puede realizar su pago directamente en la administración de la escuela o a través de transferencia bancaria.

Este es un recordatorio automático del sistema EduMex ERP. Si ya ha realizado su pago, favor de ignorar este mensaje.

Saludos cordiales,
${schoolName}
          `,
          html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
    .payment-details { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
    .risk-indicator { 
      display: inline-block; 
      color: white; 
      padding: 5px 10px; 
      border-radius: 3px; 
      font-weight: bold; 
      background-color: ${riskColor}; 
    }
    .highlight-red { color: #dc2626; }
    .highlight-orange { color: #ea580c; }
    .actions { background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${schoolName}</h2>
      <p>${isOverdue ? 'Notificación de Pago Vencido' : 'Recordatorio de Pago Próximo a Vencer'}</p>
    </div>
    
    <p>Estimado(a) padre/tutor de <strong>${debt.studentName}</strong>:</p>
    
    <p>Le recordamos que tiene un pago <span class="${isOverdue ? 'highlight-red' : 'highlight-orange'}">${isOverdue ? 'VENCIDO' : 'próximo a vencer'}</span> correspondiente a:</p>
    
    <div class="payment-details">
      <p><strong>Concepto:</strong> ${debt.conceptName}</p>
      <p><strong>Monto:</strong> ${formattedAmount}</p>
      <p><strong>Fecha límite:</strong> ${formattedDate}</p>
      <p><strong>Estado:</strong> ${statusText}</p>
      <p><strong>Nivel de riesgo:</strong> <span class="risk-indicator">${debt.nivelRiesgo.toUpperCase()}</span></p>
    </div>
    
    <div class="actions">
      <p>Por favor, realice el pago lo antes posible para evitar recargos adicionales y mantener los servicios educativos sin interrupciones.</p>
      <p>Puede realizar su pago directamente en la administración de la escuela o a través de transferencia bancaria.</p>
    </div>
    
    <p><em>Este es un recordatorio automático del sistema EduMex ERP. Si ya ha realizado su pago, favor de ignorar este mensaje.</em></p>
    
    <p>Saludos cordiales,<br>${schoolName}</p>
    
    <div class="footer">
      <p>Este es un correo automático, por favor no responda a este mensaje.</p>
    </div>
  </div>
</body>
</html>
          `
        };

        // Enviar el correo
        await sgMail.send(emailData);
        successCount++;
        sentTo.push(debt.parentEmails.join(', '));
        
        // Registrar el envío exitoso
        await storage.createEmailLog({
          studentId: debt.studentId,
          paymentId: 0,
          debtId: debt.id,
          conceptName: debt.conceptName,
          dueDate: new Date(debt.fechaLimite),
          recipientEmails: debt.parentEmails.join(', '),
          status: 'enviado',
          sentAt: new Date(),
          errorMessage: null
        });
        
        console.log(`✓ Recordatorio enviado exitosamente para ${debt.studentName} a ${debt.parentEmails.join(', ')}`);
        
      } catch (error) {
        console.error(`Error al enviar recordatorio para ${debt.studentName}:`, error);
        errorCount++;
        let errorCode = 'desconocido';
        let errorResponseBody = '';
        let errorDetails = [];
        let detailedError = '';
        
        // Extraer detalles específicos del error de SendGrid si están disponibles
        if (error.code) {
          errorCode = error.code;
        }
        
        if (error.response && error.response.body) {
          console.log('Detalles completos del error de SendGrid:', JSON.stringify(error.response.body, null, 2));
          errorResponseBody = JSON.stringify(error.response.body);
          
          if (error.response.body.errors && Array.isArray(error.response.body.errors)) {
            errorDetails = error.response.body.errors;
            console.log('Errores específicos de SendGrid:', JSON.stringify(errorDetails, null, 2));
            // Formatea los detalles del error para mejor legibilidad
            detailedError = errorDetails.map(err => 
              `${err.message || 'Error desconocido'} (${err.field || 'sin campo'})`
            ).join('; ');
          }
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        errorDetails.push(`${debt.studentName}: ${errorMessage} - Code: ${errorCode} ${detailedError ? '- ' + detailedError : ''}`);
        
        // Registrar el error en los logs con información extendida
        try {
          await storage.createEmailLog({
            studentId: debt.studentId,
            paymentId: 0,
            debtId: debt.id,
            conceptName: debt.conceptName,
            dueDate: new Date(debt.fechaLimite),
            recipientEmails: debt.parentEmails.join(', '),
            status: 'error',
            sentAt: new Date(),
            errorMessage: `Error ${errorCode}: ${errorMessage}${detailedError ? ' - ' + detailedError : ''}${errorResponseBody ? ' - ' + errorResponseBody : ''}`
          });
        } catch (logError) {
          console.error('Error al registrar error de envío en logs:', logError);
        }
      }
    }
    
    // 4. Crear resultado
    const result: ReminderResult = {
      success: successCount,
      errors: errorCount,
      omitted: omittedCount,
      message: `Proceso de recordatorios ejecutado. Enviados: ${successCount}, Errores: ${errorCount}, Omitidos: ${omittedCount}`,
      sentTo: sentTo,
      errorDetails: errorDetails,
      omittedDetails: omittedDebts.map(d => `${d.studentName}: ${d.reason}`),
      lastRunTimestamp: new Date()
    };
    
    console.log(`✓ Proceso de recordatorios completado: ${result.message}`);
    return result;
    
  } catch (error) {
    console.error('Error general en el proceso de recordatorios:', error);
    return { 
      success: 0, 
      errors: 1, 
      omitted: 0,
      message: `Error en el proceso de recordatorios: ${error instanceof Error ? error.message : String(error)}`,
      errorDetails: [error instanceof Error ? error.stack || error.message : String(error)],
      lastRunTimestamp: new Date()
    };
  }
}

/**
 * Estado global para rastrear la última ejecución
 */
export const reminderState = {
  lastRun: null as Date | null,
  result: null as ReminderResult | null,
  
  /**
   * Marca que se ejecutó el proceso
   */
  setLastRun(result: ReminderResult): void {
    this.lastRun = new Date();
    this.result = result;
  },
  
  /**
   * Verifica si ya se ejecutó hoy
   */
  hasRunToday(): boolean {
    if (!this.lastRun) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastRunDate = new Date(this.lastRun);
    lastRunDate.setHours(0, 0, 0, 0);
    
    return today.getTime() === lastRunDate.getTime();
  }
};