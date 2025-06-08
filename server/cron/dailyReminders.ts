import { CronJob } from 'cron';
import { sendUpcomingPaymentReminders } from '../services/email-service';
import { storage } from '../storage';
import { logger } from '../logger';

// Variable de entorno para activar/desactivar el cron job
const ENABLE_REMINDER_CRON = process.env.ENABLE_REMINDER_CRON !== 'false';

// Configuración para ejecutar el cron job diariamente a las 8:00 AM
// El formato es: segundo minuto hora día-del-mes mes día-de-la-semana
const DAILY_SCHEDULE = '0 0 8 * * *'; // Todos los días a las 8:00 AM

/**
 * Ejecuta el proceso diario de recordatorios de pago
 * - Clasifica a los alumnos por nivel de riesgo
 * - Envía recordatorios para adeudos próximos a vencer
 * - Registra resultados en la base de datos
 */
export async function executeDailyReminders(): Promise<{
  success: boolean;
  message: string;
  reminderResults?: {
    sent: number;
    errors: number;
    omitted: number;
  };
}> {
  try {
    logger.info('Iniciando proceso automático diario de recordatorios de pago');
    
    // Obtener fecha actual para registro
    const now = new Date();
    
    // Enviar recordatorios de pagos próximos a vencer
    logger.info('Enviando recordatorios de pagos próximos a vencer');
    const reminderResults = await sendUpcomingPaymentReminders();
    
    // Registrar ejecución del cron en el sistema
    await storage.createEmailLog({
      studentId: 0, // No aplica para este registro
      paymentId: 0, // No aplica para este registro
      debtId: 0, // No aplica para este registro
      recipientEmails: '',
      guardianEmail: '', 
      subject: 'Ejecución automática de recordatorios',
      conceptName: 'CRON',
      status: 'enviado', // Solo puede ser 'enviado', 'error' o 'omitido'
      sentAt: new Date(),
      errorMessage: `Proceso automático ejecutado el ${now.toLocaleString('es-MX')}. Recordatorios: ${reminderResults.success} enviados, ${reminderResults.errors} errores, ${reminderResults.omitted} omitidos.`
    });
    
    logger.info('Proceso automático de recordatorios completado exitosamente');
    
    return {
      success: true,
      message: 'Proceso automático de recordatorios ejecutado exitosamente',
      reminderResults: {
        sent: reminderResults.success,
        errors: reminderResults.errors,
        omitted: reminderResults.omitted
      }
    };
  } catch (error) {
    const errorMessage = `Error en el proceso automático de recordatorios: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMessage, error);
    
    // Registrar el error en el sistema
    try {
      await storage.createEmailLog({
        studentId: 0,
        paymentId: 0,
        debtId: 0,
        recipientEmails: '',
        guardianEmail: '',
        subject: 'Error en ejecución automática',
        conceptName: 'CRON_ERROR',
        status: 'error', // Este valor ya es correcto (enviado, error, omitido)
        sentAt: new Date(),
        errorMessage: errorMessage
      });
    } catch (logError) {
      logger.error('Error al registrar fallo del cron en los logs:', logError);
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * Crea y configura el cron job para ejecutar los recordatorios diariamente
 */
export function setupDailyRemindersCron(): CronJob | null {
  if (!ENABLE_REMINDER_CRON) {
    logger.info('Cron de recordatorios desactivado por configuración');
    return null;
  }
  
  logger.info(`Configurando cron de recordatorios para ejecutarse ${DAILY_SCHEDULE}`);
  
  const job = new CronJob(
    DAILY_SCHEDULE,
    async function() {
      logger.info('Ejecutando cron de recordatorios automáticos');
      try {
        await executeDailyReminders();
      } catch (error) {
        logger.error('Error durante la ejecución del cron:', error);
      }
    },
    null, // onComplete
    true, // start
    'America/Mexico_City' // timezone - usar la zona horaria de México
  );
  
  return job;
}