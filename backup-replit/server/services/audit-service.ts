/**
 * Servicio para registro de auditoría
 * Permite registrar eventos importantes del sistema para seguimiento y auditoría
 */

import { InsertAuditLog } from '@shared/schema';
import { storage } from '../storage';

/**
 * Registra un evento en el sistema de auditoría
 * @param action Acción realizada (ej. GENERAR_REFERENCIA, CONFIRMAR_PAGO)
 * @param resource Recurso afectado (ej. SPEI, PAYMENT)
 * @param details Detalles adicionales (se guardan como JSON)
 * @param userId ID del usuario que realizó la acción (puede ser null para eventos del sistema)
 * @param status Estado de la operación ('success', 'error', 'warning')
 * @param errorMessage Mensaje de error (opcional)
 * @returns El registro de auditoría creado
 */
export async function auditLog(
  action: string, 
  resource: string, 
  details: any, 
  userId: string | null,
  status: 'success' | 'error' | 'warning' = 'success',
  errorMessage: string | null = null
) {
  try {
    // Datos de auditoría a insertar
    const auditData: InsertAuditLog = {
      userName: userId ? 'Usuario Autenticado' : 'Sistema',
      userRole: userId ? 'role_user' : 'system',
      action,
      resource,
      details: details ? JSON.stringify(details) : null,
      status,
      userId: userId, // Sólo pasamos userId si existe, sino null
      ipAddress: null, // En un entorno real, se capturaría del request
      errorMessage
    };

    // Guardar en base de datos
    const result = await storage.createAuditLog(auditData);
    
    // Registrar en consola para depuración
    console.log(`[AUDIT] ${action} en ${resource}: ${status}`);
    
    return result;
  } catch (error) {
    // En caso de error al guardar la auditoría, al menos lo registramos en consola
    console.error(`[AUDIT ERROR] No se pudo guardar acción ${action}:`, error);
    console.error(`[AUDIT ERROR] Recurso: ${resource}`);
    return null;
  }
}

/**
 * Registra un evento de error en el sistema de auditoría
 * @param action Acción que produjo el error
 * @param resource Recurso afectado
 * @param error Objeto de error o mensaje
 * @param details Datos adicionales
 * @param userId ID del usuario relacionado (si aplica)
 * @returns El registro de auditoría creado
 */
export async function auditError(
  action: string,
  resource: string,
  error: Error | string,
  details: any,
  userId: string | null
) {
  try {
    // Extraer mensaje de error
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Datos de auditoría a insertar
    const auditData: InsertAuditLog = {
      userName: userId ? 'Usuario Autenticado' : 'Sistema',
      userRole: userId ? 'role_user' : 'system',
      action: `ERROR_${action}`,
      resource,
      details: details ? JSON.stringify(details) : null,
      status: 'error',
      userId: null, // No intentamos convertir "sistema" en un UUID
      ipAddress: null,
      errorMessage
    };

    // Guardar en base de datos
    const result = await storage.createAuditLog(auditData);
    
    // Registrar en consola para depuración
    console.error(`[AUDIT ERROR] ${action} en ${resource}: ${errorMessage}`);
    
    return result;
  } catch (error) {
    // En caso de error al guardar la auditoría, al menos lo registramos en consola
    console.error(`[AUDIT ERROR] No se pudo guardar error de ${action}:`, error);
    console.error(`[AUDIT ERROR] Recurso: ${resource}`);
    return null;
  }
}