import { CronJob } from 'cron';
import { getExpiredReferences } from './spei-service';
import { storage } from '../storage';
import { registerCronJob } from '../cron';
import { log } from '../vite';

/**
 * Tarea para caducar referencias SPEI expiradas
 */
async function expireOldSPEIReferences() {
  try {
    log('[SPEI] Ejecutando tarea programada para caducar referencias SPEI expiradas');
    
    // Obtener todas las referencias vencidas
    const expiredReferences = await getExpiredReferences();
    
    if (expiredReferences.length === 0) {
      log('[SPEI] No se encontraron referencias SPEI vencidas');
      return;
    }
    
    log(`[SPEI] Se encontraron ${expiredReferences.length} referencias SPEI vencidas`);
    
    // Actualizar el estado de cada referencia a "caducado" y registrar trazabilidad
    let updatedCount = 0;
    for (const payment of expiredReferences) {
      // Solo actualizar si no está en estado "pagado" o "caducado"
      if (payment.estado !== 'pagado' && payment.estado !== 'caducado') {
        await storage.updatePendingPayment(payment.id, {
          estado: 'caducado',
          observaciones: payment.observaciones 
            ? `${payment.observaciones}. Caducado automáticamente el ${new Date().toISOString()}` 
            : `Caducado automáticamente el ${new Date().toISOString()}`
        });
        
        // Registramos en la bitácora de auditoría
        try {
          // Usamos un ID de sistema válido (mismo que se usa en spei-webhook-service.ts)
          const systemUserId = '2124a40b-b6d5-4789-9017-f6b1fef05acf';
          
          await storage.createAuditLog({
            action: 'referencia_caducada',
            resource: 'pago_pendiente',
            userId: systemUserId,
            userRole: 'admin',
            userName: 'Sistema Automatizado',
            details: JSON.stringify({
              referencia: payment.referencia,
              fechaVencimiento: payment.fechaVencimiento,
              fechaCaducidad: new Date().toISOString()
            }),
            status: 'success'
          });
        } catch (auditError) {
          log(`[SPEI] Error al crear registro de auditoría: ${auditError instanceof Error ? auditError.message : String(auditError)}`);
        }
        
        updatedCount++;
      }
    }
    
    log(`[SPEI] Se actualizaron ${updatedCount} referencias SPEI a estado "caducado"`);
  } catch (error) {
    log(`[SPEI] Error al caducar referencias SPEI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Inicia todas las tareas programadas
 */
export function startScheduledTasks() {
  // Configurar la tarea de caducidad de referencias SPEI para que se ejecute diariamente a las 02:00 AM
  const expireReferencesJob = new CronJob(
    '0 2 * * *', // Cron pattern: minuto hora día-del-mes mes día-de-la-semana
    expireOldSPEIReferences,
    null, // onComplete
    false, // start
    'America/Mexico_City' // timezone
  );
  
  // Registrar el trabajo cron para seguimiento y gestión centralizada
  registerCronJob(
    expireReferencesJob, 
    'spei-expiracion-referencias', 
    'Caduca automáticamente las referencias SPEI vencidas'
  );
  
  // Inicia la tarea programada
  expireReferencesJob.start();
  
  log('[SPEI] Tarea programada de caducidad de referencias iniciada');
  
  // También ejecutamos la tarea una vez al iniciar el servidor
  // para asegurarnos de que las referencias vencidas se actualicen
  expireOldSPEIReferences();
}