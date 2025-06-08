import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

// Generar recibo para el pago de Stripe
function generateStripeReceipt() {
  const doc = new PDFDocument();
  const receiptDir = path.join(process.cwd(), 'public', 'recibos');
  const filename = 'recibo_stripe_5_8000.pdf';
  const filepath = path.join(receiptDir, filename);
  
  // Crear stream de escritura
  doc.pipe(fs.createWriteStream(filepath));
  
  // Encabezado
  doc.fontSize(18).font('Helvetica-Bold').text('SISTEMA EDUCATIVO ALTUM', 50, 50);
  doc.fontSize(14).font('Helvetica').text('RECIBO DE PAGO', 50, 80);
  doc.text('Calle Principal #123, Ciudad de México', 50, 100);
  doc.text('RFC: ALTUM123456XYZ', 50, 115);
  
  // Línea separadora
  doc.moveTo(50, 140).lineTo(550, 140).stroke();
  
  // Información del recibo
  doc.fontSize(12).font('Helvetica-Bold').text('RECIBO NO: 11', 50, 160);
  doc.font('Helvetica').text('FECHA DE EMISIÓN: 31 de mayo de 2025', 350, 160);
  
  // Información del estudiante
  doc.fontSize(14).font('Helvetica-Bold').text('INFORMACIÓN DEL ESTUDIANTE', 50, 200);
  doc.fontSize(11).font('Helvetica').text('Nombre: Emilia Soto Gómez', 50, 220);
  doc.text('ID Estudiante: 5', 50, 235);
  
  // Información del pago
  doc.fontSize(14).font('Helvetica-Bold').text('INFORMACIÓN DEL PAGO', 50, 270);
  doc.fontSize(11).font('Helvetica').text('Fecha de pago: 31 de mayo de 2025', 50, 290);
  doc.text('Método de pago: tarjeta', 50, 305);
  doc.text('Referencia: pi_3RUsC9FRrUUJd2y00ji7Lpcw', 50, 320);
  
  // Tabla de conceptos
  doc.fontSize(12).font('Helvetica-Bold');
  doc.rect(50, 350, 150, 25).fill('#4A90E2');
  doc.fillColor('white').text('Concepto', 55, 360);
  
  doc.rect(200, 350, 200, 25).fill('#4A90E2');
  doc.text('Descripción', 205, 360);
  
  doc.rect(400, 350, 100, 25).fill('#4A90E2');
  doc.text('Monto', 405, 360);
  
  // Contenido de la tabla
  doc.fillColor('black').font('Helvetica');
  doc.text('Inscripciones', 55, 385);
  doc.text('Inscripciones Preparatoria ciclo 2025-2026', 205, 385);
  doc.text('$8,000.00', 405, 385);
  
  // Total
  doc.fontSize(14).font('Helvetica-Bold');
  doc.text('Total', 450, 420);
  doc.text('$8,000.00', 450, 440);
  
  // Observaciones
  doc.fontSize(12).font('Helvetica-Bold').text('OBSERVACIONES:', 400, 480);
  doc.fontSize(10).font('Helvetica').text('Pago realizado a través del portal de padres con Stripe', 400, 500);
  
  // Pie de página
  doc.fontSize(8).text('Este documento es un comprobante de pago oficial.', 400, 550);
  doc.text('Para cualquier aclaración favor de comunicarse a admin@altum.edu.mx', 400, 565);
  
  doc.end();
  
  console.log(`Recibo generado: ${filepath}`);
}

generateStripeReceipt();