/**
 * Final Professional Academic Report Generator
 * Implements unified styling, QR integration, and complete visual consistency
 */

const { jsPDF } = require("jspdf");
const QRCode = require("qrcode");
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');

// Generate secure HMAC-SHA256 token for QR validation
function generarTokenSeguro(informeId) {
  const secretKey = 'academiq-qr-secret-2025';
  return crypto.createHmac('sha256', secretKey).update(informeId.toString()).digest('hex');
}

// Generate validation URL for QR code
function generarURLValidacion(informeId) {
  const token = generarTokenSeguro(informeId);
  const baseUrl = 'https://b6b54b41-1576-4f1a-a2d6-a0641b3572d0-00-3fqsaxdymujt.riker.replit.dev';
  return `${baseUrl}/validar?id=${informeId}&token=${token}`;
}

/**
 * Generates final professional academic report with QR integration
 */
async function generateFinalProfessionalReport(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions and margins
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  const bottomMargin = 30;
  
  // Unified institutional color palette
  const colors = {
    institutionalBlue: [0, 73, 144],    // #004990 - All headers
    darkGray: [85, 85, 85],             // #555555 - Body text
    lightGray: [153, 153, 153],         // #999999 - Secondary text
    black: [0, 0, 0],                   // Primary text
    white: [255, 255, 255]
  };
  
  let y = 25;
  
  // Function to check if we need a new page
  function checkPageBreak(requiredSpace) {
    if (y + requiredSpace > pageHeight - bottomMargin) {
      doc.addPage();
      y = 25;
      return true;
    }
    return false;
  }
  
  // Function for consistent section headers
  function addSectionHeader(title) {
    checkPageBreak(20);
    doc.setTextColor(...colors.institutionalBlue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), margin, y);
    y += 12;
  }
  
  // === HEADER SECTION ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REPORTE DE DESARROLLO INTEGRAL", margin, y);
  
  y += 15;
  
  // === DATOS DEL ALUMNO ===
  addSectionHeader("DATOS DEL ALUMNO");
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nombre: ${reportData.studentName}`, margin + 5, y);
  y += 6;
  doc.text(`Grado Escolar: Preparatoria`, margin + 5, y);
  y += 6;
  doc.text(`Periodo Evaluado: ${reportData.period}`, margin + 5, y);
  
  y += 20;
  
  // === FORTALEZAS Y AREAS A FORTALECER ===
  addSectionHeader("FORTALEZAS Y AREAS A FORTALECER");
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FORTALEZAS", margin, y);
  y += 10;
  
  const fortalezas = [
    {
      titulo: "Excelencia Matematica:",
      detalle: "Demuestra comprension solida de conceptos algebraicos y resolucion analitica de problemas complejos con metodologia estructurada."
    },
    {
      titulo: "Comunicacion y Expresion:",
      detalle: "Sobresale en analisis literario y redaccion academica, mostrando capacidad critica excepcional en interpretacion de textos."
    },
    {
      titulo: "Pensamiento Cientifico:",
      detalle: "Participa activamente en experimentos de laboratorio, aplicando metodo cientifico con precision y curiosidad investigativa."
    },
    {
      titulo: "Analisis Historico:",
      detalle: "Desarrolla pensamiento critico sobresaliente en el analisis de procesos historicos y contextualizacion de eventos."
    },
    {
      titulo: "Competencia Multilingue:",
      detalle: "Progreso notable en conversacion y comprension auditiva en ingles, demostrando fluidez comunicativa creciente."
    },
    {
      titulo: "Liderazgo Academico:",
      detalle: "Mantiene promedio destacado de 8.5, reflejando consistencia, responsabilidad y compromiso con la excelencia educativa."
    }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  fortalezas.forEach((fortaleza) => {
    checkPageBreak(25);
    doc.text("•", margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(fortaleza.titulo, margin + 12, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    const detalleLines = doc.splitTextToSize(`Observacion: ${fortaleza.detalle}`, contentWidth - 20);
    detalleLines.forEach((line) => {
      checkPageBreak(8);
      doc.text(line, margin + 15, y);
      y += 4;
    });
    y += 3;
  });
  
  y += 8;
  
  // AREAS A FORTALECER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("AREAS A FORTALECER", margin, y);
  y += 10;
  
  const areasAFortalecer = [
    {
      titulo: "Optimizacion en Matematicas:",
      recomendacion: "Expandir tecnicas avanzadas de resolucion para alcanzar niveles de excelencia superiores en calculo y analisis."
    },
    {
      titulo: "Perfeccionamiento Literario:",
      recomendacion: "Incorporar analisis de literatura clasica contemporanea para enriquecer perspectiva critica y estilo expresivo."
    },
    {
      titulo: "Profundizacion Cientifica:",
      recomendacion: "Desarrollar proyectos de investigacion independientes para consolidar metodologia cientifica y pensamiento innovador."
    }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  areasAFortalecer.forEach((area) => {
    checkPageBreak(25);
    doc.text("•", margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(area.titulo, margin + 12, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    const recomendacionLines = doc.splitTextToSize(`Recomendacion: ${area.recomendacion}`, contentWidth - 20);
    recomendacionLines.forEach((line) => {
      checkPageBreak(8);
      doc.text(line, margin + 15, y);
      y += 4;
    });
    y += 3;
  });
  
  y += 15;
  
  // === ESCALA DE PROGRESO ===
  addSectionHeader("ESCALA DE PROGRESO");
  
  const escalas = [
    { icono: "🌟", nivel: "OPTIMO:", descripcion: "El alumno supera las expectativas, demostrando alta autonomia, precision y creatividad en cada area de aprendizaje." },
    { icono: "✅", nivel: "SATISFACTORIO:", descripcion: "El alumno cumple con los objetivos basicos y muestra competencias adecuadas, aunque aun requiere apoyo en ciertos aspectos." },
    { icono: "⚡", nivel: "EN PROCESO:", descripcion: "El alumno muestra avances notables, pero necesita refuerzo y practica adicional para consolidar sus habilidades de forma independiente." },
    { icono: "🔴", nivel: "INICIAL:", descripcion: "El alumno se encuentra en las etapas iniciales de aprendizaje y requiere intervencion significativa para desarrollar las competencias basicas." }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  escalas.forEach((escala) => {
    checkPageBreak(20);
    doc.text("•", margin + 5, y);
    doc.text(escala.icono, margin + 12, y);
    doc.setFont("helvetica", "bold");
    doc.text(escala.nivel, margin + 20, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    const descripcionLines = doc.splitTextToSize(escala.descripcion, contentWidth - 25);
    descripcionLines.forEach((line) => {
      checkPageBreak(8);
      doc.text(line, margin + 25, y);
      y += 4;
    });
    y += 2;
  });
  
  y += 15;
  
  // === AREAS DE DESARROLLO Y EVALUACION ===
  addSectionHeader("AREAS DE DESARROLLO Y EVALUACION");
  
  const areas = [
    { materia: "Matematicas:", nivel: "🌟", evaluacion: "OPTIMO", comentario: "Demuestra comprension excepcional de conceptos algebraicos y resolucion analitica." },
    { materia: "Espanol:", nivel: "🌟", evaluacion: "OPTIMO", comentario: "Sobresale en analisis literario y redaccion academica con perspectiva critica." },
    { materia: "Ciencias:", nivel: "✅", evaluacion: "SATISFACTORIO", comentario: "Participacion activa en experimentos con aplicacion correcta del metodo cientifico." },
    { materia: "Historia:", nivel: "🌟", evaluacion: "OPTIMO", comentario: "Analisis critico sobresaliente de procesos historicos y contextualizacion." },
    { materia: "Ingles:", nivel: "✅", evaluacion: "SATISFACTORIO", comentario: "Progreso notable en conversacion y comprension auditiva avanzada." }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  areas.forEach((area) => {
    checkPageBreak(25);
    doc.text("•", margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(area.materia, margin + 12, y);
    y += 5;
    
    doc.text(`Nivel: ${area.nivel} ${area.evaluacion}`, margin + 20, y);
    y += 4;
    
    doc.setFont("helvetica", "normal");
    const comentarioLines = doc.splitTextToSize(`Comentario: ${area.comentario}`, contentWidth - 25);
    comentarioLines.forEach((line) => {
      checkPageBreak(8);
      doc.text(line, margin + 20, y);
      y += 4;
    });
    y += 3;
  });
  
  y += 10;
  
  // === OBSERVACIONES INDIVIDUALES ===
  addSectionHeader("OBSERVACIONES INDIVIDUALES");
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const observaciones = `${reportData.studentName} demuestra un desempeno academico excepcional y consistente. Su capacidad analitica en matematicas y ciencias, combinada con su expresion literaria sobresaliente, refleja un perfil estudiantil integral y prometedor. Se destaca su participacion activa en actividades experimentales y su progreso continuo en competencias multilingues, evidenciando compromiso genuino con la excelencia academica.`;
  
  const observacionesLines = doc.splitTextToSize(observaciones, contentWidth);
  observacionesLines.forEach((line) => {
    checkPageBreak(8);
    doc.text(line, margin, y);
    y += 4;
  });
  
  y += 15;
  
  // === METAS ALCANZADAS ===
  addSectionHeader("METAS ALCANZADAS");
  
  const metas = [
    "Mantener promedio academico superior a 8.5 con consistencia en todas las materias",
    "Desarrollar pensamiento critico avanzado en analisis literario e historico",
    "Aplicar metodologia cientifica correcta en experimentos de laboratorio",
    "Demostrar progreso significativo en competencias comunicativas en ingles"
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  metas.forEach((meta) => {
    checkPageBreak(15);
    doc.text("•", margin + 5, y);
    const metaLines = doc.splitTextToSize(meta, contentWidth - 15);
    metaLines.forEach((line) => {
      checkPageBreak(8);
      doc.text(line, margin + 12, y);
      y += 4;
    });
    y += 2;
  });
  
  y += 15;
  
  // === PLAN DE SEGUIMIENTO ===
  addSectionHeader("PLAN DE SEGUIMIENTO");
  
  const planSeguimiento = [
    { area: "Matematicas Avanzadas:", accion: "Implementar problemas de mayor complejidad para potenciar capacidades analiticas superiores." },
    { area: "Expresion Literaria:", accion: "Incorporar analisis de obras clasicas contemporaneas para enriquecer perspectiva critica." },
    { area: "Investigacion Cientifica:", accion: "Desarrollar proyectos independientes que consoliden metodologia y pensamiento innovador." }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  planSeguimiento.forEach((plan, index) => {
    checkPageBreak(20);
    doc.text(`${index + 1}.`, margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(plan.area, margin + 12, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    const accionLines = doc.splitTextToSize(plan.accion, contentWidth - 20);
    accionLines.forEach((line) => {
      checkPageBreak(8);
      doc.text(line, margin + 15, y);
      y += 4;
    });
    y += 3;
  });
  
  y += 15;
  
  // === RECONOCIMIENTO ESPECIAL DEL MAESTRO ===
  addSectionHeader("RECONOCIMIENTO ESPECIAL DEL MAESTRO");
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  const reconocimiento = `"${reportData.studentName} demuestra un compromiso excepcional con la excelencia academica y un potencial sobresaliente para alcanzar logros significativos. Su dedicacion, pensamiento critico y capacidad analitica la posicionan como una estudiante ejemplar que inspira a sus companeros y enorgullece a la institucion."`;
  
  const reconocimientoLines = doc.splitTextToSize(reconocimiento, contentWidth);
  reconocimientoLines.forEach((line) => {
    checkPageBreak(8);
    doc.text(line, margin, y);
    y += 4;
  });
  
  y += 15;
  
  // === CONCLUSION FINAL ===
  addSectionHeader("CONCLUSION FINAL");
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const conclusion = `${reportData.studentName} ha demostrado un progreso academico excepcional durante este periodo evaluativo. Su desempeno consistente, reflejado en un promedio de ${reportData.average}, evidencia dedicacion, responsabilidad y compromiso genuino con la excelencia educativa. El Sistema Educativo Altum reconoce su potencial sobresaliente y reafirma su compromiso de acompanarla en su crecimiento academico y personal hacia el logro de sus metas educativas superiores.`;
  
  const conclusionLines = doc.splitTextToSize(conclusion, contentWidth);
  conclusionLines.forEach((line) => {
    checkPageBreak(8);
    doc.text(line, margin, y);
    y += 4;
  });
  
  y += 20;
  
  // === INFORMACION DE PAGO ASOCIADO ===
  checkPageBreak(30);
  addSectionHeader("INFORMACION DE PAGO ASOCIADO");
  
  doc.setTextColor(...colors.darkGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Recibo ID: ${reportData.paymentId} | Monto: $${reportData.paymentAmount.toLocaleString('es-MX')}.00 MXN`, margin, y);
  y += 5;
  doc.text(`Referencia: ${reportData.paymentReference} | Fecha de pago: 1 de junio de 2025`, margin, y);
  
  y += 25;
  
  // === QR CODE VALIDATION ===
  checkPageBreak(50);
  
  // Generate QR code
  const validationUrl = generarURLValidacion(reportData.id);
  const qrCodeBuffer = await QRCode.toBuffer(validationUrl, {
    type: 'png',
    width: 100,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  // Position QR code centered
  const qrSize = 40;
  const qrX = (pageWidth - qrSize) / 2;
  doc.addImage(qrCodeBuffer, 'PNG', qrX, y, qrSize, qrSize);
  
  y += qrSize + 8;
  
  // QR validation text
  doc.setTextColor(...colors.lightGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Escanea este codigo QR para validar este informe en linea.", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.text("Verificacion disponible 24/7 - SISTEMA EDUCATIVO ALTUM", pageWidth / 2, y, { align: "center" });
  
  return doc;
}

async function main() {
  try {
    console.log('📋 Generando informe académico final con QR integrado...');
    
    const reportData = {
      id: 17,
      studentId: 4,
      studentName: 'Andrea Cebreros Contreras',
      period: 'Junio 2025',
      average: 8.5,
      paymentId: 17,
      paymentAmount: 5000,
      paymentReference: 'pi_AndreaSimulado'
    };

    const doc = await generateFinalProfessionalReport(reportData);
    
    // Save to filesystem
    const informesDir = path.join(process.cwd(), 'public', 'informes');
    if (!fs.existsSync(informesDir)) {
      fs.mkdirSync(informesDir, { recursive: true });
    }
    
    const filename = `informe_${reportData.id}.pdf`;
    const filepath = path.join(informesDir, filename);
    
    // Write PDF to file
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filepath, pdfBuffer);
    
    console.log('✅ Informe final con QR generado exitosamente');
    console.log(`📁 Archivo: /informes/informe_17.pdf`);
    console.log(`🎯 Características: Estilo unificado, QR funcional, información de pago completa`);
    console.log(`📊 Estudiante: ${reportData.studentName} | Promedio: ${reportData.average}`);
    console.log(`🔗 QR URL: ${generarURLValidacion(reportData.id)}`);
  } catch (error) {
    console.error('❌ Error generando informe final:', error);
    process.exit(1);
  }
}

main();