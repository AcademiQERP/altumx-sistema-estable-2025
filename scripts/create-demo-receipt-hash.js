/**
 * Script para crear el hash de integridad del recibo de demostración (ID 9999)
 * Este script genera un PDF de demostración y almacena su hash SHA256 en la base de datos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DocumentIntegrityService } from '../server/services/document-integrity-service.ts';
import { generateReceiptPDF } from '../server/services/receipt-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createDemoReceiptHash() {
  try {
    console.log('🎯 Iniciando creación de hash para recibo de demostración...');

    // Datos del recibo de demostración
    const demoReceipt = {
      id: 9999,
      monto: '1234.00',
      concepto: 'Mensualidad Enero 2025',
      fechaPago: new Date(),
      metodoPago: 'Transferencia SPEI',
      referencia: 'TEST-REF-2025-001'
    };

    const demoStudent = {
      nombreCompleto: 'Alumno de Ejemplo',
      nivel: 'Preparatoria'
    };

    // Generar el PDF de demostración
    console.log('📄 Generando PDF de demostración...');
    const pdfBuffer = await generateReceiptPDF(demoReceipt, demoStudent);

    // Crear directorio temporal si no existe
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Guardar PDF temporalmente
    const tempPdfPath = path.join(tempDir, 'demo-receipt-9999.pdf');
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    console.log('🔐 Calculando hash SHA256...');
    
    // Almacenar el hash en la base de datos
    const success = await DocumentIntegrityService.storeDocumentHash(
      'receipt',
      9999,
      tempPdfPath,
      pdfBuffer
    );

    if (success) {
      console.log('✅ Hash de integridad almacenado correctamente para recibo de demostración');
      
      // Verificar que funciona
      const verification = await DocumentIntegrityService.verifyDocumentIntegrity('receipt', 9999);
      console.log('🔍 Verificación de prueba:', verification);
    } else {
      console.error('❌ Error al almacenar el hash de integridad');
    }

    // Limpiar archivo temporal
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
      console.log('🧹 Archivo temporal eliminado');
    }

  } catch (error) {
    console.error('❌ Error en el script:', error);
  }
}

// Ejecutar el script
createDemoReceiptHash();