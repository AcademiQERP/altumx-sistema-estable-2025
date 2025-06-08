/**
 * Academic Report Generator - CAROL Design Template
 * Based on AGUILAR OCHOA CAROL.pdf structure and visual design
 */

const { jsPDF } = require("jspdf");
const fs = require('fs');
const path = require('path');

/**
 * Generates academic report using CAROL design template
 */
function generateCarolDesignReport(reportData) {
  const doc = new jsPDF();
  
  // Page dimensions and margins
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Institutional color palette
  const colors = {
    institutionalBlue: [0, 73, 144],    // #004990
    darkGray: [85, 85, 85],             // #555555
    lightGray: [153, 153, 153],         // #999999
    veryLightGray: [245, 245, 245],     // #F5F5F5
    white: [255, 255, 255],
    black: [0, 0, 0]
  };
  
  let y = 25;
  
  // === HEADER SECTION ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("🌟 Reporte de Desarrollo Integral", margin, y);
  
  y += 15;
  
  // Student data section
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("👤 Datos del Alumno", margin, y);
  
  y += 10;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`● Nombre: ${reportData.studentName}`, margin + 5, y);
  y += 6;
  doc.text(`● Grado Escolar: Preparatoria`, margin + 5, y);
  y += 6;
  doc.text(`● Periodo Evaluado: ${reportData.period}`, margin + 5, y);
  
  y += 20;
  
  // === FORTALEZAS SECTION ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("📚 Fortalezas y Áreas a Fortalecer", margin, y);
  
  y += 12;
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("🌟 Fortalezas", margin, y);
  
  y += 10;
  
  const fortalezas = [
    {
      titulo: "Excelencia Matemática:",
      detalle: "Demuestra comprensión sólida de conceptos algebraicos y resolución analítica de problemas complejos con metodología estructurada."
    },
    {
      titulo: "Comunicación y Expresión:",
      detalle: "Sobresale en análisis literario y redacción académica, mostrando capacidad crítica excepcional en interpretación de textos."
    },
    {
      titulo: "Pensamiento Científico:",
      detalle: "Participa activamente en experimentos de laboratorio, aplicando método científico con precisión y curiosidad investigativa."
    },
    {
      titulo: "Análisis Histórico:",
      detalle: "Desarrolla pensamiento crítico sobresaliente en el análisis de procesos históricos y contextualización de eventos."
    },
    {
      titulo: "Competencia Multilingüe:",
      detalle: "Progreso notable en conversación y comprensión auditiva en inglés, demostrando fluidez comunicativa creciente."
    },
    {
      titulo: "Liderazgo Académico:",
      detalle: "Mantiene promedio destacado de 8.5, reflejando consistencia, responsabilidad y compromiso con la excelencia educativa."
    }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  fortalezas.forEach((fortaleza) => {
    doc.text("●", margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(fortaleza.titulo, margin + 12, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    const detalleLines = doc.splitTextToSize(`○ Observación: ${fortaleza.detalle}`, contentWidth - 20);
    detalleLines.forEach((line) => {
      doc.text(line, margin + 15, y);
      y += 4;
    });
    y += 3;
  });
  
  y += 8;
  
  // === AREAS A FORTALECER ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("⚠️ Áreas a Fortalecer", margin, y);
  
  y += 10;
  
  const areasAFortalecer = [
    {
      titulo: "Optimización en Matemáticas:",
      recomendacion: "Expandir técnicas avanzadas de resolución para alcanzar niveles de excelencia superiores en cálculo y análisis."
    },
    {
      titulo: "Perfeccionamiento Literario:",
      recomendacion: "Incorporar análisis de literatura clásica contemporánea para enriquecer perspectiva crítica y estilo expresivo."
    },
    {
      titulo: "Profundización Científica:",
      recomendacion: "Desarrollar proyectos de investigación independientes para consolidar metodología científica y pensamiento innovador."
    }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  areasAFortalecer.forEach((area) => {
    doc.text("●", margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(area.titulo, margin + 12, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    const recomendacionLines = doc.splitTextToSize(`○ Recomendación: ${area.recomendacion}`, contentWidth - 20);
    recomendacionLines.forEach((line) => {
      doc.text(line, margin + 15, y);
      y += 4;
    });
    y += 3;
  });
  
  y += 15;
  
  // === ESCALA DE PROGRESO ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("📊 Escala de Progreso", margin, y);
  
  y += 12;
  
  const escalas = [
    { icono: "🌟", nivel: "Óptimo:", descripcion: "El alumno supera las expectativas, demostrando alta autonomía, precisión y creatividad en cada área de aprendizaje." },
    { icono: "✅", nivel: "Satisfactorio:", descripcion: "El alumno cumple con los objetivos básicos y muestra competencias adecuadas, aunque aún requiere apoyo en ciertos aspectos." },
    { icono: "⚡", nivel: "En proceso:", descripcion: "El alumno muestra avances notables, pero necesita refuerzo y práctica adicional para consolidar sus habilidades de forma independiente." },
    { icono: "🔴", nivel: "Inicial:", descripcion: "El alumno se encuentra en las etapas iniciales de aprendizaje y requiere intervención significativa para desarrollar las competencias básicas." }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  escalas.forEach((escala) => {
    doc.text("●", margin + 5, y);
    doc.text(escala.icono, margin + 12, y);
    doc.setFont("helvetica", "bold");
    doc.text(escala.nivel, margin + 20, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    const descripcionLines = doc.splitTextToSize(escala.descripcion, contentWidth - 25);
    descripcionLines.forEach((line) => {
      doc.text(line, margin + 25, y);
      y += 4;
    });
    y += 2;
  });
  
  y += 15;
  
  // === AREAS DE DESARROLLO Y EVALUACION ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("📌 Áreas de Desarrollo y Evaluación", margin, y);
  
  y += 12;
  
  const areas = [
    { icono: "📖", materia: "Matemáticas:", nivel: "🌟", evaluacion: "Óptimo", comentario: "Demuestra comprensión excepcional de conceptos algebraicos y resolución analítica." },
    { icono: "🧮", materia: "Español:", nivel: "🌟", evaluacion: "Óptimo", comentario: "Sobresale en análisis literario y redacción académica con perspectiva crítica." },
    { icono: "🗣", materia: "Ciencias:", nivel: "✅", evaluacion: "Satisfactorio", comentario: "Participación activa en experimentos con aplicación correcta del método científico." },
    { icono: "🤝", materia: "Historia:", nivel: "🌟", evaluacion: "Óptimo", comentario: "Análisis crítico sobresaliente de procesos históricos y contextualización." },
    { icono: "⚽", materia: "Inglés:", nivel: "✅", evaluacion: "Satisfactorio", comentario: "Progreso notable en conversación y comprensión auditiva avanzada." }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  areas.forEach((area) => {
    doc.text("●", margin + 5, y);
    doc.text(area.icono, margin + 12, y);
    doc.setFont("helvetica", "bold");
    doc.text(area.materia, margin + 20, y);
    y += 5;
    
    doc.text(`○ Nivel: ${area.nivel} ${area.evaluacion}`, margin + 25, y);
    y += 4;
    
    doc.setFont("helvetica", "normal");
    const comentarioLines = doc.splitTextToSize(`○ Comentario: ${area.comentario}`, contentWidth - 30);
    comentarioLines.forEach((line) => {
      doc.text(line, margin + 25, y);
      y += 4;
    });
    y += 3;
  });
  
  y += 10;
  
  // === OBSERVACIONES INDIVIDUALES ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("📝 Observaciones Individuales", margin, y);
  
  y += 10;
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const observaciones = `${reportData.studentName} demuestra un desempeño académico excepcional y consistente. Su capacidad analítica en matemáticas y ciencias, combinada con su expresión literaria sobresaliente, refleja un perfil estudiantil integral y prometedor. Se destaca su participación activa en actividades experimentales y su progreso continuo en competencias multilingües, evidenciando compromiso genuino con la excelencia académica.`;
  
  const observacionesLines = doc.splitTextToSize(observaciones, contentWidth);
  observacionesLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });
  
  y += 15;
  
  // === METAS ALCANZADAS ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("🎯 Metas Alcanzadas", margin, y);
  
  y += 10;
  
  const metas = [
    "Mantener promedio académico superior a 8.5 con consistencia en todas las materias",
    "Desarrollar pensamiento crítico avanzado en análisis literario e histórico",
    "Aplicar metodología científica correcta en experimentos de laboratorio",
    "Demostrar progreso significativo en competencias comunicativas en inglés"
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  metas.forEach((meta) => {
    doc.text("●", margin + 5, y);
    const metaLines = doc.splitTextToSize(meta, contentWidth - 15);
    metaLines.forEach((line) => {
      doc.text(line, margin + 12, y);
      y += 4;
    });
    y += 2;
  });
  
  y += 15;
  
  // === PLAN DE SEGUIMIENTO ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("🚀 Plan de Seguimiento", margin, y);
  
  y += 10;
  
  const planSeguimiento = [
    { area: "Matemáticas Avanzadas:", accion: "Implementar problemas de mayor complejidad para potenciar capacidades analíticas superiores." },
    { area: "Expresión Literaria:", accion: "Incorporar análisis de obras clásicas contemporáneas para enriquecer perspectiva crítica." },
    { area: "Investigación Científica:", accion: "Desarrollar proyectos independientes que consoliden metodología y pensamiento innovador." }
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  planSeguimiento.forEach((plan, index) => {
    doc.text(`${index + 1}.`, margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(plan.area, margin + 12, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    const accionLines = doc.splitTextToSize(`○ ${plan.accion}`, contentWidth - 20);
    accionLines.forEach((line) => {
      doc.text(line, margin + 15, y);
      y += 4;
    });
    y += 3;
  });
  
  y += 15;
  
  // === RECONOCIMIENTO ESPECIAL ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("🌟 Reconocimiento Especial del Maestro", margin, y);
  
  y += 10;
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  const reconocimiento = `"${reportData.studentName} demuestra un compromiso excepcional con la excelencia académica y un potencial sobresaliente para alcanzar logros significativos. Su dedicación, pensamiento crítico y capacidad analítica la posicionan como una estudiante ejemplar que inspira a sus compañeros y enorgullece a la institución."`;
  
  const reconocimientoLines = doc.splitTextToSize(reconocimiento, contentWidth);
  reconocimientoLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });
  
  y += 15;
  
  // === CONCLUSION FINAL ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("✨ Conclusión Final", margin, y);
  
  y += 10;
  
  doc.setTextColor(...colors.black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const conclusion = `${reportData.studentName} ha demostrado un progreso académico excepcional durante este periodo evaluativo. Su desempeño consistente, reflejado en un promedio de ${reportData.average}, evidencia dedicación, responsabilidad y compromiso genuino con la excelencia educativa. El Sistema Educativo Altum reconoce su potencial sobresaliente y reafirma su compromiso de acompañarla en su crecimiento académico y personal hacia el logro de sus metas educativas superiores.`;
  
  const conclusionLines = doc.splitTextToSize(conclusion, contentWidth);
  conclusionLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });
  
  y += 10;
  
  // === INFORMACION DE PAGO ===
  doc.setTextColor(...colors.institutionalBlue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("💳 INFORMACIÓN DE PAGO ASOCIADO", margin, y);
  
  y += 8;
  
  doc.setTextColor(...colors.darkGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Recibo ID: ${reportData.paymentId} | Monto: $${reportData.paymentAmount.toLocaleString('es-MX')} MXN | Referencia: ${reportData.paymentReference}`, margin, y);
  
  // === QR CODE VALIDATION ===
  const qrY = pageHeight - 35;
  
  doc.setTextColor(...colors.lightGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Escanea este código QR para validar este informe en línea.", pageWidth / 2, qrY, { align: "center" });
  doc.text("Verificación disponible 24/7 – SISTEMA EDUCATIVO ALTUM", pageWidth / 2, qrY + 4, { align: "center" });
  
  return doc;
}

async function main() {
  try {
    console.log('📋 Generando informe académico con diseño CAROL...');
    
    const reportData = {
      id: 17,
      studentId: 4,
      studentName: 'Andrea Cebreros Contreras',
      period: 'Junio 2025',
      average: 8.5,
      paymentId: 17,
      paymentAmount: 55000,
      paymentReference: 'pi_AndreaSimulado'
    };

    const doc = generateCarolDesignReport(reportData);
    
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
    
    console.log('✅ Informe con diseño CAROL generado exitosamente');
    console.log(`📁 Archivo: /informes/informe_17.pdf`);
    console.log(`🎯 Diseño: Basado en plantilla AGUILAR OCHOA CAROL`);
    console.log(`📊 Estudiante: ${reportData.studentName} | Promedio: ${reportData.average}`);
  } catch (error) {
    console.error('❌ Error generando informe con diseño CAROL:', error);
    process.exit(1);
  }
}

main();