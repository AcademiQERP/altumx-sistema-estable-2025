import { CronJob } from 'cron';
import { startScheduledTasks } from './services/scheduled-tasks';
import { log } from './vite';

// Array para almacenar todos los trabajos cron
const cronJobs: CronJob[] = [];

// Mapeo para almacenar información sobre cada trabajo cron
const cronJobsInfo: Record<string, { 
  name: string; 
  description: string; 
  schedule: string;
  lastRun: Date | null;
  status: 'active' | 'inactive';
}> = {};

/**
 * Inicializa todos los trabajos cron para el servidor
 */
export function initializeCronJobs() {
  try {
    // Iniciar tareas programadas para pagos SPEI
    startScheduledTasks();
    
    log('Todos los trabajos cron han sido inicializados correctamente');
    return true;
  } catch (error) {
    log(`Error al inicializar los trabajos cron: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Detiene todos los trabajos cron
 */
export function stopAllCronJobs() {
  try {
    cronJobs.forEach(job => {
      if (job.running) {
        job.stop();
      }
    });

    // Actualizar el estado de todos los trabajos
    Object.keys(cronJobsInfo).forEach(key => {
      cronJobsInfo[key].status = 'inactive';
    });
    
    log('Todos los trabajos cron han sido detenidos correctamente');
    return true;
  } catch (error) {
    log(`Error al detener los trabajos cron: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Registra un nuevo trabajo cron para seguimiento
 * @param job El trabajo cron a registrar
 * @param name Nombre identificativo del trabajo
 * @param description Descripción de lo que hace el trabajo
 */
export function registerCronJob(
  job: CronJob, 
  name: string = 'unnamed-job', 
  description: string = 'Sin descripción'
) {
  cronJobs.push(job);
  
  // Registramos la información del trabajo
  const jobId = `job-${cronJobs.length}`;
  cronJobsInfo[jobId] = {
    name,
    description,
    schedule: job.cronTime.toString(),
    lastRun: null,
    status: job.running ? 'active' : 'inactive'
  };
}

/**
 * Obtiene el estado de todos los trabajos cron registrados
 * @returns Arreglo con información sobre los trabajos cron
 */
export function getCronJobsStatus() {
  // Actualizar el estado de cada trabajo
  cronJobs.forEach((job, index) => {
    const jobId = `job-${index + 1}`;
    if (cronJobsInfo[jobId]) {
      cronJobsInfo[jobId].status = job.running ? 'active' : 'inactive';
    }
  });
  
  return Object.keys(cronJobsInfo).map(key => ({
    id: key,
    ...cronJobsInfo[key]
  }));
}