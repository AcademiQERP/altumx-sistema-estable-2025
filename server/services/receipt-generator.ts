import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Payment, PaymentConcept } from '@shared/schema';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { storage } from '../storage';
import { generarURLValidacion } from '../routes/validar';

// Clase exportada para envolver la función generateReceipt
export class ReceiptGenerator {
  async generateReceipt(pago: Payment): Promise<string> {
    // Obtener información del estudiante
    const estudiante = await storage.getStudent(pago.alumnoId);
    if (!estudiante) {
      throw new Error(`No se encontró el estudiante con ID ${pago.alumnoId}`);
    }
    
    // Obtener información del concepto
    const concepto = await storage.getPaymentConcept(pago.conceptoId);
    
    // Obtener información del padre/tutor si está disponible
    let padreInfo = null;
    try {
      const vinculaciones = await storage.getRelationsByStudent(pago.alumnoId);
      if (vinculaciones && vinculaciones.length > 0) {
        const padre = await storage.getUser(vinculaciones[0].padreId);
        if (padre) {
          padreInfo = padre.nombreCompleto;
        }
      }
    } catch (error) {
      // No importa si no encontramos información del padre, es opcional
      console.log('Información del padre no disponible para el recibo');
    }
    
    // Generar el recibo
    return generateReceipt(pago, estudiante, concepto || undefined, padreInfo);
  }
}

export const receiptGenerator = new ReceiptGenerator();

/**
 * Genera un recibo en PDF para un pago usando PDFKit
 * @param pago Información del pago
 * @param estudiante Información del estudiante
 * @param concepto Información del concepto de pago
 * @returns Ruta al archivo PDF generado
 */
export async function generateReceipt(
  pago: Payment, 
  estudiante: { nombreCompleto: string; id: number },
  concepto: PaymentConcept | null,
  padreInfo: string | null = null
): Promise<string> {
  // Crear directorio si no existe
  const receiptDir = path.join(process.cwd(), 'public', 'recibos');
  if (!fs.existsSync(receiptDir)) {
    fs.mkdirSync(receiptDir, { recursive: true });
  }
  
  // Definir archivo de salida
  const filename = `recibo_${pago.id}.pdf`;
  const filepath = path.join(receiptDir, filename);
  
  // Crear un stream para escribir el PDF
  const writeStream = fs.createWriteStream(filepath);
  
  // Crear un nuevo documento PDF
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4'
  });
  
  // Generar URL de validación segura con token HMAC-SHA256
  const validationUrl = generarURLValidacion(pago.id);
  
  // Usar directamente la URL de validación para el código QR
  const qrContent = validationUrl;
  
  // Generar código QR como buffer de imagen
  const qrCodeBuffer = await QRCode.toBuffer(qrContent, {
    type: 'png',
    width: 100,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // Definir la promesa para manejar la finalización de la escritura
  return new Promise<string>((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`PDF generado exitosamente en: ${filepath}`);
      resolve(`/recibos/${filename}`);
    });
    
    writeStream.on('error', (err) => {
      console.error('Error al escribir el PDF:', err);
      reject(new Error(`No se pudo guardar el PDF: ${err.message}`));
    });
    
    // Pipe el documento al stream de escritura
    doc.pipe(writeStream);
    
    // Fecha actual formateada
    const fechaGeneracion = format(new Date(), "PPP, h:mm aaa", { locale: es });
    const fechaPago = format(new Date(pago.fechaPago), "PPP", { locale: es });
    
    // Formatear monto
    const montoFormateado = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(parseFloat(pago.monto));
    
    // Obtener el nombre del concepto
    const conceptoNombre = concepto?.nombre || `Concepto ID: ${pago.conceptoId}`;
    const conceptoDescripcion = concepto?.descripcion || '';
    
    // ENCABEZADO MODERNIZADO
    // Espacio para el logo institucional (placeholder sin texto)
    doc.rect(50, 50, 60, 40)
       .fillAndStroke('#f8f9fa', '#e9ecef');
    
    // Título principal con diseño moderno
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('SISTEMA EDUCATIVO ALTUM', 120, 55);
    
    doc.fontSize(18)
       .fillColor('#3498db')
       .text('RECIBO DE PAGO', 120, 82);
    
    // Subtítulo discreto de la plataforma
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Recibo generado automáticamente a través de la plataforma AcademiQ – https://academiq.mx', 120, 100);
    
    // Información institucional modernizada
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('Calle Principal #123, Ciudad de México', 120, 115)
       .text('RFC: ALTUM123456XYZ', 120, 128);
    
    // Línea decorativa moderna
    doc.moveTo(50, 145)
       .lineTo(doc.page.width - 50, 145)
       .lineWidth(3)
       .strokeColor('#3498db')
       .stroke();
    
    // INFORMACIÓN DEL RECIBO EN CABECERA - Sin recuadros
    doc.moveDown(2);
    const receiptHeaderY = 155;
    
    // Información del recibo sin bordes - Columna izquierda
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#6b7280')
       .text('RECIBO NO:', 50, receiptHeaderY)
       .fontSize(14)
       .fillColor('#1f2937')
       .text(pago.id.toString(), 50, receiptHeaderY + 15);
    
    // Información del recibo sin bordes - Columna derecha
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#6b7280')
       .text('FECHA DE EMISIÓN:', doc.page.width - 200, receiptHeaderY)
       .fontSize(12)
       .font('Helvetica')
       .fillColor('#1f2937')
       .text(fechaGeneracion, doc.page.width - 200, receiptHeaderY + 15);
    
    // INFORMACIÓN DEL ESTUDIANTE - Estilo carta corporativa
    doc.moveDown(3);
    const studentSectionY = doc.y + 20;
    
    // Título en mayúsculas, tipografía sobria
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('INFORMACIÓN DEL ESTUDIANTE', 50, studentSectionY);
    
    // Información sin recuadros, solo espaciado limpio
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Nombre del alumno:', 50, studentSectionY + 30)
       .font('Helvetica')
       .fillColor('#374151')
       .text(estudiante.nombreCompleto, 180, studentSectionY + 30);
    
    doc.font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('ID del estudiante:', 50, studentSectionY + 45)
       .font('Helvetica')
       .fillColor('#374151')
       .text(estudiante.id.toString(), 180, studentSectionY + 45);
    
    // Campo opcional del padre/tutor
    if (padreInfo) {
      doc.font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('Padre/Madre/Tutor:', 50, studentSectionY + 60)
         .font('Helvetica')
         .fillColor('#374151');
      
      // Si tenemos nombre completo, mostrarlo; si solo correo, formatear apropiadamente
      if (padreInfo.includes('@')) {
        doc.text(`Correo del tutor: ${padreInfo}`, 180, studentSectionY + 60);
      } else {
        doc.text(padreInfo, 180, studentSectionY + 60);
      }
    }
    
    // Agregar código QR en la esquina superior derecha de esta sección
    const qrX = doc.page.width - 140;
    const qrY = studentSectionY + 20;
    doc.image(qrCodeBuffer, qrX, qrY, { width: 80, height: 80 });
    
    // Etiqueta para el código QR
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Escanea para validar', qrX - 5, qrY + 85, { width: 90, align: 'center' });
    
    // Agregar enlace de texto clickeable con la URL completa de validación
    doc.fontSize(7)
       .font('Helvetica')
       .fillColor('#3b82f6')
       .text('O visita:', qrX - 5, qrY + 98, { width: 90, align: 'center' })
       .fontSize(6)
       .fillColor('#1d4ed8')
       .text(validationUrl, qrX - 15, qrY + 110, { width: 110, align: 'center', link: validationUrl });
    
    // INFORMACIÓN DEL PAGO - Estilo carta corporativa
    const paymentSectionY = studentSectionY + (padreInfo ? 90 : 70);
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('INFORMACIÓN DEL PAGO', 50, paymentSectionY);
    
    // Sin recuadros, solo espaciado limpio
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Fecha de pago:', 50, paymentSectionY + 30)
       .font('Helvetica')
       .fillColor('#374151')
       .text(fechaPago, 180, paymentSectionY + 30);
    
    doc.font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Método de pago:', 50, paymentSectionY + 45)
       .font('Helvetica')
       .fillColor('#374151')
       .text(pago.metodoPago, 180, paymentSectionY + 45);
    
    doc.font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Referencia:', 50, paymentSectionY + 60)
       .font('Helvetica')
       .fillColor('#374151')
       .text(pago.referencia || 'N/A', 180, paymentSectionY + 60);
    
    // DETALLE DEL PAGO - Estilo carta corporativa
    const tableStartY = paymentSectionY + 90;
    
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('DETALLE DEL PAGO', 50, tableStartY);
    
    // Solo línea separadora sutil, sin encabezados con fondo
    const headerY = tableStartY + 35;
    doc.moveTo(50, headerY + 20)
       .lineTo(doc.page.width - 50, headerY + 20)
       .strokeColor('#e5e7eb')
       .lineWidth(1)
       .stroke();
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#1f2937');
    
    const conceptoWidth = 120;
    const descripcionWidth = doc.page.width - 320;
    const montoWidth = 120;
    
    doc.text('Concepto', 50, headerY + 5, { width: conceptoWidth, align: 'left' })
       .text('Descripción', 50 + conceptoWidth + 20, headerY + 5, { width: descripcionWidth, align: 'left' })
       .text('Monto', doc.page.width - 150, headerY + 5, { width: montoWidth, align: 'right' });
    
    // Datos del pago sin recuadros
    const dataRowY = headerY + 35;
    const pagoConceptoNombre = concepto?.nombre || 'Concepto no especificado';
    const pagoConceptoDescripcion = concepto?.descripcion || 'Sin descripción';
    const pagoMontoFormateado = `$${parseFloat(pago.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#374151')
       .text(pagoConceptoNombre, 50, dataRowY + 8, { width: conceptoWidth, align: 'left' })
       .text(pagoConceptoDescripcion, 50 + conceptoWidth + 20, dataRowY + 8, { width: descripcionWidth, align: 'left' })
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text(pagoMontoFormateado, doc.page.width - 150, dataRowY + 8, { width: montoWidth, align: 'right' });
    
    // TOTAL PAGADO - Estilo carta corporativa simple
    const totalY = dataRowY + 40;
    
    // Sin recuadro, solo texto alineado a la derecha
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('Total Pagado:', doc.page.width - 200, totalY, { align: 'right' })
       .fontSize(16)
       .text(pagoMontoFormateado, doc.page.width - 200, totalY + 20, { align: 'right' });
    
    // OBSERVACIONES - Estilo carta corporativa
    if (pago.observaciones) {
      const obsY = totalY + 50;
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('OBSERVACIONES', 50, obsY);
      
      // Sin recuadro, solo párrafo tipográfico
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4b5563')
         .text(pago.observaciones, 50, obsY + 25, { 
           width: doc.page.width - 100,
           align: 'left'
         });
    }
    
    // PIE DE PÁGINA MODERNIZADO - Ajustado para mantener todo en una página
    const footerY = doc.page.height - 90;
    
    // Espacio para sello digital (futuro) - Movido más arriba
    doc.rect(50, footerY - 50, doc.page.width - 100, 25)
       .fillAndStroke('#f8f9fa', '#e9ecef');
    
    doc.fontSize(9)
       .font('Helvetica-Oblique')
       .fillColor('#6c757d')
       .text('Espacio reservado para sello digital o validación administrativa', 60, footerY - 42);
    
    // Información de contacto institucional
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('Este documento es un comprobante de pago oficial emitido por Sistema Educativo Altum.', 50, footerY + 5, { 
         width: doc.page.width - 100, 
         align: 'center' 
       })
       .text('Para cualquier aclaración favor de comunicarse a admin@altum.edu.mx', 50, footerY + 18, { 
         width: doc.page.width - 100, 
         align: 'center' 
       })
       .fontSize(7)
       .fillColor('#9ca3af')
       .text('Recibo generado automáticamente con tecnología de AcademiQ (https://academiq.mx)', 50, footerY + 30, { 
         width: doc.page.width - 100, 
         align: 'center' 
       });
    
    // Finalizar el documento PDF
    doc.end();
  });
}