import type { Express } from "express";
import crypto from "crypto";
import { storage } from "../storage";

/**
 * Ruta pública para validar recibos mediante QR
 * Accesible sin autenticación para verificación externa
 */
// Secreto para validación HMAC (en producción debe venir de variables de entorno)
const QR_SECRET = process.env.QR_SECRET || "academiq-qr-secret-2025";

/**
 * Genera una URL de validación para un recibo específico
 */
export function generarURLValidacion(reciboId: number): string {
  const token = crypto
    .createHmac('sha256', QR_SECRET)
    .update(reciboId.toString())
    .digest('hex');
  
  const baseURL = process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
  return `${baseURL}/validar?id=${reciboId}&token=${token}`;
}

export function registerValidationRoutes(app: Express) {

  // Endpoint público para validar recibos
  app.get('/validar', async (req, res) => {
    try {
      const { id, token } = req.query;
      
      if (!id || !token) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error de Validación - AcademiQ</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .error { color: #dc3545; text-align: center; }
              .icon { font-size: 3em; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">
                <div class="icon">❌</div>
                <h2>Parámetros Faltantes</h2>
                <p>La URL de validación no contiene los parámetros requeridos.</p>
              </div>
            </div>
          </body>
          </html>
        `);
      }

      // Verificar token HMAC
      const expectedToken = crypto
        .createHmac('sha256', QR_SECRET)
        .update(id.toString())
        .digest('hex');

      if (token !== expectedToken) {
        return res.status(401).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Token Inválido - AcademiQ</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .error { color: #dc3545; text-align: center; }
              .icon { font-size: 3em; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">
                <div class="icon">🔒</div>
                <h2>Token Inválido</h2>
                <p>El token de seguridad no es válido o ha expirado.</p>
                <p><small>Este recibo no puede ser verificado.</small></p>
              </div>
            </div>
          </body>
          </html>
        `);
      }

      // Obtener información del pago
      const paymentId = parseInt(id.toString());
      const payment = await storage.getPayment(paymentId);
      
      if (!payment) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recibo No Encontrado - AcademiQ</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .error { color: #dc3545; text-align: center; }
              .icon { font-size: 3em; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">
                <div class="icon">📄</div>
                <h2>Recibo No Encontrado</h2>
                <p>No se encontró un recibo con el ID especificado.</p>
              </div>
            </div>
          </body>
          </html>
        `);
      }

      // Obtener información del estudiante
      const student = await storage.getStudent(payment.alumnoId);
      const studentName = student ? student.nombreCompleto : "Estudiante no encontrado";

      // Verificar existencia de archivos
      const fs = await import('fs').then(m => m.promises);
      const path = await import('path');
      
      const receiptPath = path.join(process.cwd(), 'public', 'recibos', `recibo_${paymentId}.pdf`);
      const reportPath = path.join(process.cwd(), 'public', 'informes', `informe_${paymentId}.pdf`);
      
      let receiptExists = false;
      let reportExists = false;
      
      try {
        await fs.access(receiptPath);
        receiptExists = true;
      } catch {}
      
      try {
        await fs.access(reportPath);
        reportExists = true;
      } catch {}

      // Generar HTML de validación exitosa
      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Validación de Recibo - AcademiQ</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 15px; 
              box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header .icon { font-size: 3em; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 1.8em; }
            .content { padding: 30px; }
            .info-grid {
              display: grid;
              gap: 15px;
              margin-bottom: 30px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #28a745;
            }
            .info-label { font-weight: bold; color: #495057; }
            .info-value { color: #212529; }
            .downloads {
              display: grid;
              gap: 15px;
              margin-top: 30px;
            }
            .download-btn {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 15px 20px;
              background: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              transition: all 0.3s ease;
              text-align: center;
              justify-content: center;
            }
            .download-btn:hover {
              background: #0056b3;
              transform: translateY(-2px);
              box-shadow: 0 4px 15px rgba(0,123,255,0.3);
            }
            .download-btn.receipt { background: #28a745; }
            .download-btn.receipt:hover { background: #1e7e34; }
            .download-btn.report { background: #17a2b8; }
            .download-btn.report:hover { background: #117a8b; }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6c757d;
              border-top: 1px solid #dee2e6;
              font-size: 0.9em;
            }
            @media (max-width: 480px) {
              .container { margin: 10px; }
              .content { padding: 20px; }
              .info-item { flex-direction: column; align-items: flex-start; gap: 5px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">✅</div>
              <h1>Recibo Validado</h1>
              <p>Documento verificado exitosamente</p>
            </div>
            
            <div class="content">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">ID del Recibo:</span>
                  <span class="info-value">#${payment.id}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Estudiante:</span>
                  <span class="info-value">${studentName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Fecha de Pago:</span>
                  <span class="info-value">${new Date(payment.fechaPago).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Monto:</span>
                  <span class="info-value">$${parseFloat(payment.monto).toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Referencia:</span>
                  <span class="info-value">${payment.referencia || `REF-${payment.id}`}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Concepto:</span>
                  <span class="info-value">Pago escolar</span>
                </div>
              </div>

              ${receiptExists || reportExists ? `
                <div class="downloads">
                  <h3 style="margin: 0 0 15px 0; color: #495057;">📎 Documentos Disponibles</h3>
                  ${receiptExists ? `
                    <a href="/recibos/recibo_${paymentId}.pdf" class="download-btn receipt" target="_blank">
                      📄 Descargar Recibo de Pago
                    </a>
                  ` : ''}
                  ${reportExists ? `
                    <a href="/informes/informe_${paymentId}.pdf" class="download-btn report" target="_blank">
                      📘 Descargar Informe Académico
                    </a>
                  ` : ''}
                </div>
              ` : `
                <div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
                  <p style="margin: 0; color: #856404;">📋 Los documentos PDF están siendo procesados y estarán disponibles pronto.</p>
                </div>
              `}
            </div>

            <div class="footer">
              <p>🏫 <strong>AcademiQ</strong> - Sistema de Gestión Escolar</p>
              <p>Validación realizada el ${new Date().toLocaleString('es-MX')}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      res.send(html);

    } catch (error) {
      console.error('Error en validación de recibo:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error del Servidor - AcademiQ</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .error { color: #dc3545; text-align: center; }
            .icon { font-size: 3em; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">
              <div class="icon">⚠️</div>
              <h2>Error del Servidor</h2>
              <p>Ocurrió un error al procesar la validación. Por favor, intente más tarde.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  });
}