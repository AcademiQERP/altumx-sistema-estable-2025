import { CronJob } from 'cron';
import { setupDailyRemindersCron } from './dailyReminders';
import { logger } from '../logger';

// Extender la interfaz CronJob para tener tipado correcto
declare module 'cron' {
  interface CronJob {
    // La propiedad running existe en tiempo de ejecución pero no está en los tipos
    running?: boolean;
  }
}

// Almacena las instancias activas de trabajos cron
const activeCronJobs: Record<string, CronJob> = {};

/**
 * Inicializa todos los trabajos cron del sistema
 */
export function initializeCronJobs(): void {
  try {
    logger.info('Inicializando trabajos cron del sistema...');
    
    // Configurar recordatorios diarios
    const remindersCron = setupDailyRemindersCron();
    if (remindersCron) {
      activeCronJobs['dailyReminders'] = remindersCron;
      logger.info('Cron de recordatorios diarios configurado y activo');
    }
    
    // Resumen de inicialización
    const activeJobsCount = Object.keys(activeCronJobs).length;
    if (activeJobsCount > 0) {
      logger.info(`Se han inicializado ${activeJobsCount} trabajos cron`);
    } else {
      logger.warn('No se ha inicializado ningún trabajo cron');
    }
  } catch (error) {
    logger.error('Error al inicializar los trabajos cron:', error);
  }
}

/**
 * Detiene todos los trabajos cron activos
 */
export function stopAllCronJobs(): void {
  try {
    logger.info('Deteniendo todos los trabajos cron activos...');
    
    for (const jobName in activeCronJobs) {
      activeCronJobs[jobName].stop();
      logger.info(`Cron ${jobName} detenido`);
    }
    
    logger.info(`Se han detenido ${Object.keys(activeCronJobs).length} trabajos cron`);
  } catch (error) {
    logger.error('Error al detener los trabajos cron:', error);
  }
}

/**
 * Obtiene el estado de todos los trabajos cron
 */
export function getCronJobsStatus(): Record<string, {
  running: boolean;
  nextDate: Date | null;
}> {
  const status: Record<string, { running: boolean; nextDate: Date | null }> = {};
  
  for (const jobName in activeCronJobs) {
    const job = activeCronJobs[jobName];
    
    // Ahora podemos usar la propiedad running directamente porque está en la interfaz extendida
    status[jobName] = {
      running: job.running === true,
      nextDate: job.nextDate() ? new Date(job.nextDate().toString()) : null
    };
  }
  
  return status;
}

/**
 * Obtiene una instancia específica de un trabajo cron
 */
export function getCronJob(name: string): CronJob | null {
  return activeCronJobs[name] || null;
}