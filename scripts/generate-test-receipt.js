/**
 * Script para generar un recibo de prueba con datos simulados
 * Propósito: Demostrar el sistema de validación QR sin afectar datos reales
 */

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Función para generar token de validación
function generarToken(id) {
  const SECRET_KEY = process.env.SECRET_KEY || 'CAMBIAME_EN_PRODUCCION';
  const payload = `id=${id}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

// Función para generar URL de validación
function generarURLValidacion(id) {
  const token = generarToken(id);
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/validar?id=${id}&token=${token}`;
}

async function generateTestReceipt() {
  console.log('🧪 Generando recibo de prueba con datos simulados...');
  
  // Datos simulados del pago
  const mockPayment = {
    id: 9999,
    monto: '1234.00',
    fechaPago: new Date().toISOString(),
    metodoPago: 'Transferencia SPEI',
    referencia: 'TEST-REF-2025-001',
    concepto: 'Prueba de validación - Mensualidad Enero',
    estatus: 'completado',
    alumnoId: 99999,
    cicloEscolar: '2024-2025'
  };

  try {
    // Crear directorio de recibos si no existe
    const receiptsDir = path.join(process.cwd(), 'public', 'receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    // Configurar documento PDF
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });
    
    // Generar URL de validación segura con token HMAC-SHA256
    const validationUrl = generarURLValidacion(mockPayment.id);
    
    // Generar código QR como buffer de imagen
    const qrCodeBuffer = await QRCode.toBuffer(validationUrl, {
      type: 'png',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Configurar stream de escritura
    const filename = `recibo_test_${mockPayment.id}_${Date.now()}.pdf`;
    const filepath = path.join(receiptsDir, filename);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // ENCABEZADO
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#1e40af')
       .text('AcademiQ', 50, 50);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Sistema de Gestión Escolar', 50, 75);

    // TÍTULO DEL RECIBO
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('RECIBO DE PAGO - DEMOSTRACIÓN', 50, 120);

    // INFORMACIÓN DEL ESTUDIANTE
    const studentSectionY = 160;
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .text('INFORMACIÓN DEL ESTUDIANTE', 50, studentSectionY);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Estudiante:', 50, studentSectionY + 25)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('Alumno de Ejemplo', 120, studentSectionY + 25);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Matrícula:', 50, studentSectionY + 40)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('TEST-001', 120, studentSectionY + 40);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Nivel:', 50, studentSectionY + 55)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('Preparatoria', 120, studentSectionY + 55);

    // INFORMACIÓN DEL TUTOR
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Tutor:', 300, studentSectionY + 25)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('Tutor Demo', 350, studentSectionY + 25);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Email:', 300, studentSectionY + 40)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('demo@ejemplo.com', 350, studentSectionY + 40);

    // Agregar código QR en la esquina superior derecha
    const qrX = doc.page.width - 140;
    const qrY = studentSectionY + 20;
    doc.image(qrCodeBuffer, qrX, qrY, { width: 80, height: 80 });
    
    // Etiqueta para el código QR
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Escanea para validar', qrX - 5, qrY + 85, { width: 90, align: 'center' });

    // INFORMACIÓN DEL PAGO
    const paymentSectionY = studentSectionY + 120;
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .text('INFORMACIÓN DEL PAGO', 50, paymentSectionY);

    // Información del pago en formato profesional
    const paymentInfoY = paymentSectionY + 30;
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Recibo #:', 50, paymentInfoY)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text(mockPayment.id.toString(), 120, paymentInfoY);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Fecha:', 300, paymentInfoY)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text(format(new Date(mockPayment.fechaPago), "dd 'de' MMMM 'de' yyyy", { locale: es }), 350, paymentInfoY);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Método:', 50, paymentInfoY + 20)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text(mockPayment.metodoPago, 120, paymentInfoY + 20);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Referencia:', 300, paymentInfoY + 20)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text(mockPayment.referencia, 350, paymentInfoY + 20);

    // CONCEPTO Y MONTO
    const conceptSectionY = paymentInfoY + 60;
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .text('CONCEPTO DE PAGO', 50, conceptSectionY);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#111827')
       .text('• Mensualidad Enero 2025', 50, conceptSectionY + 25);

    // MONTO TOTAL
    const amountSectionY = conceptSectionY + 60;
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#059669')
       .text('TOTAL PAGADO:', 50, amountSectionY);
    
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#059669')
       .text(`$${parseFloat(mockPayment.monto).toLocaleString('es-MX')} MXN`, 200, amountSectionY);

    // PIE DE PÁGINA
    const footerY = doc.page.height - 100;
    
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Este es un recibo de demostración generado por AcademiQ', 50, footerY)
       .text('Sistema de Gestión Escolar - Validación con código QR', 50, footerY + 15)
       .text(`Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, 50, footerY + 30);

    // Finalizar documento
    doc.end();

    // Esperar a que termine la escritura
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    console.log('✅ Recibo de prueba generado exitosamente');
    console.log(`📄 Ubicación: ${filepath}`);
    console.log(`🔗 ID de prueba: ${mockPayment.id}`);
    console.log('🔐 URL de validación:');
    console.log(validationUrl);
    console.log('');
    console.log('📱 El código QR en el PDF contiene esta URL para validación');
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Error generando recibo de prueba:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTestReceipt()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

export { generateTestReceipt };