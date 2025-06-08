import { Request, Response, NextFunction } from 'express';
import { sendPaymentReminders, reminderState } from '../services/payment-reminder-service';

/**
 * Middleware que ejecuta el envío de recordatorios cuando un administrador inicia sesión
 * y almacena la información en el estado global (memoria)
 */
export async function processRemindersOnAdminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    // Verificar que sea un usuario válido y con rol de administrador
    if (req.user && req.user.rol === 'admin') {
      console.log('Usuario administrador autenticado, verificando si es necesario enviar recordatorios...');
      
      // Si ya se ejecutó hoy, no volver a ejecutar
      if (reminderState.hasRunToday()) {
        console.log('El proceso de recordatorios ya se ejecutó hoy. Omitiendo ejecución.');
        return next();
      }
      
      console.log('Iniciando proceso de recordatorios en segundo plano...');
      
      // Ejecutar en segundo plano para no bloquear la respuesta al usuario
      // El usuario no necesita esperar a que termine el proceso
      (async () => {
        try {
          const result = await sendPaymentReminders();
          // Almacenar resultado en el estado global
          reminderState.setLastRun(result);
          console.log('Proceso de recordatorios completado en segundo plano.');
        } catch (error) {
          console.error('Error en proceso background de recordatorios:', error);
        }
      })();
    }
    
    next();
  } catch (error) {
    console.error('Error en middleware de recordatorios:', error);
    next(); // Continuar a pesar del error para no bloquear la autenticación
  }
}