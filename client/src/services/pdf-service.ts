import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Interfaz que define la estructura de datos esperada para la boleta académica
 */
interface ReportCardResponse {
  student: {
    id: number;
    nombreCompleto: string;
    curp: string;
    fechaNacimiento: string;
    genero: string;
    grupoId: number;
    nivel: string;
    estatus: string;
  };
  reportCard: {
    subject: {
      id: number;
      nombre: string;
      nivel: string;
    };
    periods: {
      period: string;
      average: number;
      grades: {
        id: number;
        alumnoId: number;
        materiaId: number;
        rubro: string;
        valor: number;
        periodo: string;
      }[];
    }[];
  }[];
  attendance: {
    total: number;
    present: number;
    percentage: number;
  };
}

// Configuración de la boleta académica
interface ReportCardConfig {
  logoUrl?: string;
  institutionName?: string;
  institutionSlogan?: string;
  primaryColor?: string;
  secondaryColor?: string;
  verificationUrl?: string;
  footerText?: string;
  showTeacherSignature?: boolean;
  detailed?: boolean; // Si es true, muestra todos los detalles; si es false, muestra versión resumida
}

// Función para generar el PDF de la boleta académica
export const generateReportCardPDF = (
  reportCardData: ReportCardResponse, 
  academicComment?: string,
  createdBy: string = 'Administrador del Sistema',
  config: ReportCardConfig = {}
): void => {
  const { student, reportCard, attendance } = reportCardData;
  
  // Configuración con valores por defecto
  const pdfConfig = {
    logoUrl: config.logoUrl || '', // Por defecto, no hay logo
    institutionName: config.institutionName || 'EduMex ERP',
    institutionSlogan: config.institutionSlogan || 'Sistema de Gestión Educativa',
    primaryColor: config.primaryColor || "#4361ee", // Azul moderno
    secondaryColor: config.secondaryColor || "#6b7280", // Gris
    verificationUrl: config.verificationUrl || `https://altum.edu.mx/verifica/boleta/${student.id}`,
    footerText: config.footerText || 'Este documento fue generado digitalmente por el sistema académico.',
    showTeacherSignature: config.showTeacherSignature !== undefined ? config.showTeacherSignature : true,
    detailed: config.detailed !== undefined ? config.detailed : true
  };
  
  // Calcular promedio general
  let totalAverage = 0;
  let totalSubjects = 0;
  
  reportCard.forEach(subject => {
    // Solo contamos una vez cada materia para el promedio general
    if (subject.periods.length > 0) {
      const subjectAverage = subject.periods.reduce((sum, period) => sum + period.average, 0) / subject.periods.length;
      totalAverage += subjectAverage;
      totalSubjects++;
    }
  });
  
  // Aseguramos que corresponda con la escala mostrada en la interfaz (0-100)
  const overallAverage = totalSubjects > 0 ? totalAverage / totalSubjects : 0;
  
  // Crear un nuevo documento PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Usar fuente moderna (Helvetica viene por defecto)
  doc.setFont('helvetica', 'normal');
  
  // Función auxiliar para agregar texto con formato
  const addText = (text: string, x: number, y: number, options?: {
    fontSize?: number;
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
    color?: string;
    align?: 'left' | 'center' | 'right';
  }) => {
    const { fontSize = 10, fontStyle = 'normal', color = '#000000', align = 'left' } = options || {};
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color);
    
    if (align === 'center') {
      const textWidth = doc.getTextWidth(text);
      x = (doc.internal.pageSize.width - textWidth) / 2;
    } else if (align === 'right') {
      const textWidth = doc.getTextWidth(text);
      x = doc.internal.pageSize.width - textWidth - x;
    }
    
    doc.text(text, x, y);
  };

  // Función para obtener color según calificación (valores en escala 10 o 100)
  const getGradeColor = (grade: number) => {
    // Primero normalizamos la calificación a escala 10 si está en escala 100
    const normalizedGrade = grade > 10 ? grade / 10 : grade;
    
    if (normalizedGrade >= 9) return "#059669"; // Verde esmeralda
    if (normalizedGrade >= 7) return "#2563eb"; // Azul
    if (normalizedGrade >= 6) return "#d97706"; // Ámbar
    return "#dc2626"; // Rojo
  };

  // Función para dibujar una barra de progreso
  const drawProgressBar = (x: number, y: number, width: number, height: number, percentage: number, color: string) => {
    // Barra de fondo (gris claro)
    doc.setFillColor("#f3f4f6");
    doc.roundedRect(x, y, width, height, 1, 1, 'F');
    
    // Barra de progreso
    const progressWidth = (percentage / 100) * width;
    if (progressWidth > 0) {
      doc.setFillColor(color);
      doc.roundedRect(x, y, progressWidth, height, 1, 1, 'F');
    }
  };

  // Función para dibujar un gráfico circular (para asistencia)
  const drawCircularProgress = (centerX: number, centerY: number, radius: number, percentage: number, color: string) => {
    const startAngle = -90; // Comienza en la parte superior
    const endAngle = startAngle + (percentage / 100) * 360;
    
    // Dibujar círculo de fondo completo (gris claro)
    doc.setDrawColor("#f3f4f6");
    doc.setLineWidth(1.5);
    doc.circle(centerX, centerY, radius, 'S');
    
    // Dibujar arco de progreso
    if (percentage > 0) {
      doc.setDrawColor(color);
      doc.setLineWidth(2);
      
      // Convertir ángulos a radianes
      const startRadians = (startAngle * Math.PI) / 180;
      const endRadians = (endAngle * Math.PI) / 180;
      
      // Calcular puntos para el arco
      const startX = centerX + radius * Math.cos(startRadians);
      const startY = centerY + radius * Math.sin(startRadians);
      const endX = centerX + radius * Math.cos(endRadians);
      const endY = centerY + radius * Math.sin(endRadians);
      
      // Dibujar arco (aproximación con líneas)
      const segments = Math.max(10, Math.floor(percentage / 5)); // Más segmentos para arcos más grandes
      let lastX = startX;
      let lastY = startY;
      
      for (let i = 1; i <= segments; i++) {
        const angle = startRadians + (i / segments) * (endRadians - startRadians);
        const currentX = centerX + radius * Math.cos(angle);
        const currentY = centerY + radius * Math.sin(angle);
        doc.line(lastX, lastY, currentX, currentY);
        lastX = currentX;
        lastY = currentY;
      }
    }
    
    // Texto del porcentaje en el centro
    const percentageText = `${percentage}%`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(color);
    
    // Centrar texto
    const textWidth = doc.getTextWidth(percentageText);
    doc.text(percentageText, centerX - (textWidth / 2), centerY + 1);
  };
  
  // Función para crear un QR code simple (simulación ya que jsPDF no tiene soporte nativo para QR)
  const drawQRCode = (x: number, y: number, size: number, url: string) => {
    // Dibujar un cuadrado con borde para simular el QR
    doc.setDrawColor("#000000");
    doc.setLineWidth(0.5);
    doc.rect(x, y, size, size, 'S');
    
    // Agregar patrón interno simple para simular QR
    const cellSize = size / 5;
    doc.setFillColor("#000000");
    
    // Algunos patrones aleatorios para que parezca un QR
    // Esquinas
    doc.rect(x + cellSize * 0, y + cellSize * 0, cellSize * 2, cellSize * 2, 'F');
    doc.rect(x + cellSize * 3, y + cellSize * 0, cellSize * 2, cellSize * 2, 'F');
    doc.rect(x + cellSize * 0, y + cellSize * 3, cellSize * 2, cellSize * 2, 'F');
    
    // Patrones interiores
    doc.rect(x + cellSize * 1, y + cellSize * 1, cellSize, cellSize, 'F');
    doc.rect(x + cellSize * 3, y + cellSize * 3, cellSize, cellSize, 'F');
    doc.rect(x + cellSize * 2, y + cellSize * 2, cellSize, cellSize, 'F');
    doc.rect(x + cellSize * 1, y + cellSize * 3, cellSize, cellSize, 'F');
    doc.rect(x + cellSize * 2, y + cellSize * 0, cellSize, cellSize, 'F');
    
    // Texto para explicar el QR
    doc.setFontSize(6);
    doc.setTextColor("#000000");
    doc.text("Escanea para verificar", x, y + size + 4);
    
    // URL corta debajo
    const shortUrl = url.replace(/^https?:\/\//, '');
    doc.setFontSize(5);
    doc.text(shortUrl, x, y + size + 8);
  };
  
  // Función para agregar un logo educativo genérico
  const drawEducationLogo = (x: number, y: number, width: number, height: number) => {
    // Dibujamos un birrete/gorro de graduación simple
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Colores
    doc.setDrawColor(pdfConfig.primaryColor);
    doc.setFillColor(pdfConfig.primaryColor);
    doc.setLineWidth(1);
    
    // Base del birrete (rectángulo)
    doc.rect(centerX - width * 0.4, centerY - height * 0.1, width * 0.8, height * 0.2, 'F');
    
    // Parte superior del birrete (cuadrado)
    doc.rect(centerX - width * 0.3, centerY - height * 0.3, width * 0.6, height * 0.2, 'F');
    
    // Borla
    doc.setFillColor("#ffffff");
    doc.circle(centerX + width * 0.15, centerY - height * 0.1, width * 0.08, 'F');
    
    // Línea adicional decorativa
    doc.setDrawColor(pdfConfig.primaryColor);
    doc.line(centerX - width * 0.3, centerY + height * 0.2, centerX + width * 0.3, centerY + height * 0.2);
  };
  
  // Encabezado con gradiente azul
  // Simulamos gradiente con rectángulos de diferentes tonalidades
  const headerHeight = 35;
  const headerY = 10;
  
  // Convertir color hex a RGB para uso en jsPDF
  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };
  
  // Colores para el gradiente
  const primaryRgb = hexToRgb(pdfConfig.primaryColor);
  const gradient = [
    `rgb(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]})`,
    `rgb(${Math.min(255, primaryRgb[0] + 20)}, ${Math.min(255, primaryRgb[1] + 20)}, ${Math.min(255, primaryRgb[2] + 40)})`
  ];
  
  // Fondo del encabezado (simulación de gradiente)
  doc.setFillColor(gradient[0]);
  doc.roundedRect(10, headerY, 190, headerHeight, 3, 3, 'F');
  
  // Sombra sutil (línea inferior)
  doc.setDrawColor("#e5e7eb");
  doc.setLineWidth(0.5);
  doc.line(10, headerY + headerHeight + 1, 200, headerY + headerHeight + 1);
  
  // Logo institucional (si se proporciona URL) o logo genérico
  if (pdfConfig.logoUrl) {
    // Si se proporciona un logo, lo añadiríamos aquí
    try {
      doc.addImage(pdfConfig.logoUrl, 'PNG', 15, headerY + 5, 25, 25);
    } catch (error) {
      // Si falla al cargar el logo, usar el genérico
      drawEducationLogo(15, headerY + 5, 25, 25);
    }
  } else {
    // Logo genérico si no hay URL
    drawEducationLogo(15, headerY + 5, 25, 25);
  }
  
  // Información del estudiante en el encabezado
  doc.setTextColor("#ffffff");
  
  // Nombre del estudiante (grande y destacado)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(student.nombreCompleto, 50, headerY + 15);
  
  // Información adicional del estudiante
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`CURP: ${student.curp || 'No especificado'}`, 50, headerY + 22);
  
  // Badges para nivel, grupo y estatus
  const drawBadge = (text: string, x: number, y: number, width: number = 30) => {
    doc.setFillColor("#ffffff33"); // Blanco semitransparente
    doc.roundedRect(x, y, width, 7, 3, 3, 'F');
    doc.setTextColor("#ffffff");
    doc.setFontSize(8);
    doc.text(text, x + 3, y + 5);
  };
  
  drawBadge(`Nivel: ${student.nivel}`, 50, headerY + 25);
  drawBadge(`Grupo: ${student.grupoId}`, 90, headerY + 25);
  drawBadge(`Estatus: ${student.estatus}`, 130, headerY + 25);
  
  // Título de la boleta
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BOLETA ACADÉMICA', 105, headerY + headerHeight + 10, { align: 'center' });
  
  // Ajustar posición inicial después del encabezado
  let yPosition = headerY + headerHeight + 20;
  
  // Añadir sección de resumen académico (con tarjetas modernas)
  const cardsStartY = yPosition;
  const cardWidth = 85;
  const cardHeight = 30;
  const cardPadding = 5;
  
  // Tarjeta para el promedio general
  doc.setFillColor("#ffffff");
  doc.setDrawColor("#e5e7eb");
  doc.setLineWidth(0.5);
  doc.roundedRect(15, cardsStartY, cardWidth, cardHeight, 3, 3, 'FD');
  
  // Título de la tarjeta
  doc.setTextColor("#6b7280");
  doc.setFontSize(10);
  doc.text("Promedio General", 15 + cardPadding, cardsStartY + 8);
  
  // Aseguramos que el promedio se muestre en escala 10
  const displayOverallAverage = overallAverage > 10 ? overallAverage / 10 : overallAverage;
  
  // Valor del promedio (grande y con color)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(getGradeColor(displayOverallAverage));
  doc.text(displayOverallAverage.toFixed(1), 15 + cardPadding, cardsStartY + 25);
  
  // Texto adicional "de 10.0"
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor("#9ca3af");
  doc.text("de 10.0", 15 + cardPadding + doc.getTextWidth(displayOverallAverage.toFixed(1)) + 5, cardsStartY + 25);
  
  // Barra de progreso para el promedio
  const gradeColor = getGradeColor(displayOverallAverage);
  // Calcular el porcentaje basado en escala 10 (0-10 → 0-100%)
  const progressPercentage = (displayOverallAverage / 10) * 100;
  drawProgressBar(15 + cardPadding, cardsStartY + cardHeight - 8, cardWidth - (cardPadding * 2), 3, progressPercentage, gradeColor);
  
  // Indicadores mínimo y máximo en escala 10
  doc.setFontSize(6);
  doc.text("0.0", 15 + cardPadding, cardsStartY + cardHeight - 2);
  doc.text("10.0", 15 + cardWidth - 15, cardsStartY + cardHeight - 2);
  
  // Tarjeta para asistencia
  doc.setFillColor("#ffffff");
  doc.setDrawColor("#e5e7eb");
  doc.roundedRect(110, cardsStartY, cardWidth, cardHeight, 3, 3, 'FD');
  
  // Título de la tarjeta
  doc.setTextColor("#6b7280");
  doc.setFontSize(10);
  doc.text("Asistencia", 110 + cardPadding, cardsStartY + 8);
  
  // Gráfico circular para asistencia
  const attendanceColor = attendance.percentage >= 90 ? "#059669" : 
                          attendance.percentage >= 80 ? "#2563eb" : 
                          attendance.percentage >= 70 ? "#f59e0b" : "#dc2626";
  drawCircularProgress(125, cardsStartY + 18, 8, attendance.percentage, attendanceColor);
  
  // Texto descriptivo de asistencia
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor("#000000");
  doc.text(`${attendance.present} asistencias de ${attendance.total} días`, 140, cardsStartY + 15);
  
  // Barra de progreso para asistencia
  drawProgressBar(140, cardsStartY + 18, 50, 3, attendance.percentage, attendanceColor);
  
  // Actualizar posición Y después de las tarjetas
  yPosition = cardsStartY + cardHeight + 15;
  
  // Título para la sección de materias
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pdfConfig.primaryColor);
  doc.text("Materias y Calificaciones", 15, yPosition);
  yPosition += 10;
  
  // Mostrar solo el resumen si no se solicita la versión detallada
  if (!pdfConfig.detailed) {
    // Tabla resumida de materias
    const tableData: any[][] = [];
    
    reportCard.forEach(subject => {
      // Calcular promedio general de la materia
      const subjectAverage = subject.periods.reduce((sum, period) => sum + period.average, 0) / subject.periods.length;
      
      // Aseguramos que el promedio se muestre en escala 10
      const displayAverage = subjectAverage > 10 ? subjectAverage / 10 : subjectAverage;
      
      tableData.push([
        { content: subject.subject.nombre, styles: { fontStyle: 'bold' } },
        { content: displayAverage.toFixed(1), styles: { 
          fontStyle: 'bold',
          textColor: getGradeColor(displayAverage),
          halign: 'center'
        }}
      ]);
    });
    
    // Añadir la tabla al documento
    autoTable(doc, {
      startY: yPosition,
      head: [['Materia', 'Promedio General']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 40, halign: 'center' }
      },
      headStyles: {
        fillColor: hexToRgb(pdfConfig.primaryColor),
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold'
      }
    });
    
    // Actualizar la posición Y después de la tabla
    // @ts-ignore
    yPosition = doc.lastAutoTable.finalY + 15;
  } else {
    // Versión detallada: Mostrar todas las materias con su desglose por periodo
    const uniquePeriods = new Set<string>();
    reportCard.forEach(subject => {
      subject.periods.forEach(period => {
        uniquePeriods.add(period.period);
      });
    });
    const periodsList = Array.from(uniquePeriods).sort();
    
    // Para cada materia, mostrar sus calificaciones por periodo
    reportCard.forEach((subject, subjectIndex) => {
      // Verificar si necesitamos una nueva página
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Rectángulo para el nombre de la materia
      doc.setFillColor("#f9fafb");
      doc.roundedRect(15, yPosition, 180, 10, 1, 1, 'F');
      
      // Línea lateral de color para la materia
      doc.setFillColor(pdfConfig.primaryColor);
      doc.rect(15, yPosition, 3, 10, 'F');
      
      // Nombre de la materia
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor("#111827");
      doc.text(subject.subject.nombre, 25, yPosition + 7);
      
      // Promedio general de la materia
      // Calculamos el promedio y lo normalizamos a escala 100
      const subjectAverage = subject.periods.reduce((sum, period) => sum + period.average, 0) / subject.periods.length;
      const displaySubjectAverage = subjectAverage <= 10 ? subjectAverage * 10 : subjectAverage;
      
      doc.setFontSize(9);
      doc.text("Promedio:", 150, yPosition + 7);
      doc.setTextColor(getGradeColor(displaySubjectAverage));
      doc.text(displaySubjectAverage.toFixed(1), 175, yPosition + 7);
      
      yPosition += 15;
      
      // Verificar espacio disponible para las tablas
      let hasRoom = true;
      let periodCount = 0;
      
      // Para cada periodo, mostrar sus calificaciones
      periodsList.forEach(periodName => {
        const periodData = subject.periods.find(p => p.period === periodName);
        
        if (periodData) {
          periodCount++;
          
          // Verificar si hay espacio suficiente para toda la tabla del periodo
          const estimatedRowCount = periodData.grades.length + 2; // +2 por encabezado y promedio
          const estimatedHeight = (estimatedRowCount * 8) + 15; // estimación muy aproximada
          
          if (yPosition + estimatedHeight > 280) {
            if (hasRoom) {
              doc.addPage();
              yPosition = 20;
              hasRoom = true;
            }
          }
          
          if (hasRoom) {
            // Título del periodo
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor("#4b5563");
            doc.text(`Periodo: ${periodName}`, 20, yPosition);
            yPosition += 5;
            
            // Datos para la tabla
            const tableData: any[][] = [];
            
            // Filas para cada calificación
            periodData.grades.forEach(grade => {
              // Aseguramos que la calificación se muestre en escala 10
              const gradeValue = Number(grade.valor);
              const displayGrade = gradeValue > 10 ? gradeValue / 10 : gradeValue;
              
              tableData.push([
                grade.rubro,
                { content: displayGrade.toFixed(1), styles: { 
                  fontStyle: 'bold',
                  textColor: getGradeColor(displayGrade),
                  halign: 'center'
                }}
              ]);
            });
            
            // Añadir la tabla al documento
            autoTable(doc, {
              startY: yPosition,
              head: [['Criterio', 'Calificación']],
              body: tableData,
              theme: 'grid',
              styles: {
                fontSize: 9,
                cellPadding: 3
              },
              columnStyles: {
                0: { cellWidth: 120 },
                1: { cellWidth: 30, halign: 'center' }
              },
              footStyles: {
                fillColor: [249, 250, 251] as [number, number, number],
                textColor: getGradeColor(periodData.average <= 10 ? periodData.average * 10 : periodData.average),
                fontStyle: 'bold'
              },
              foot: [[
                'Promedio del periodo',
                { content: (periodData.average <= 10 ? periodData.average * 10 : periodData.average).toFixed(1), styles: { halign: 'center' } }
              ]],
              headStyles: {
                fillColor: [209, 213, 219] as [number, number, number],
                textColor: [55, 65, 81] as [number, number, number],
                fontStyle: 'bold'
              },
              margin: { left: 20 }
            });
            
            // Actualizar la posición Y después de la tabla
            // @ts-ignore
            yPosition = doc.lastAutoTable.finalY + 10;
          }
        }
      });
      
      // Si la materia tiene gráfico comparativo de periodos
      if (subject.periods.length > 1 && hasRoom) {
        // Verificar si necesitamos una nueva página
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Título para la comparativa
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor("#6b7280");
        doc.text("Comparativa de periodos", 20, yPosition);
        yPosition += 8;
        
        // Gráfico comparativo (barras horizontales)
        subject.periods.forEach((period, idx) => {
          const barWidth = 100;
          const barHeight = 4;
          const barY = yPosition + (idx * 10);
          
          // Etiqueta del periodo
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor("#000000");
          doc.text(period.period, 20, barY);
          
          // Barra de progreso
          drawProgressBar(45, barY - 3, barWidth, barHeight, period.average * 10, getGradeColor(period.average));
          
          // Valor numérico
          doc.setFontSize(8);
          doc.setTextColor(getGradeColor(period.average));
          doc.text(period.average.toFixed(1), 150, barY);
        });
        
        yPosition += (subject.periods.length * 10) + 5;
      }
      
      // Espacio entre materias
      yPosition += 10;
      
      // Línea separadora entre materias si no es la última
      if (subjectIndex < reportCard.length - 1) {
        doc.setDrawColor("#e5e7eb");
        doc.setLineWidth(0.2);
        doc.line(15, yPosition - 5, 195, yPosition - 5);
      }
    });
  }
  
  // Comentario académico
  if (academicComment) {
    // Verificar si necesitamos una nueva página
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Encabezado del comentario
    doc.setFillColor("#f9fafb");
    doc.roundedRect(15, yPosition, 180, 10, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(pdfConfig.primaryColor);
    doc.text("Comentario Académico", 20, yPosition + 7);
    
    yPosition += 15;
    
    // Limpiar cualquier formato que pueda tener el comentario
    const cleanComment = academicComment.replace(/^#.*$/gm, '').trim();
    
    // Caja para el comentario
    doc.setFillColor("#ffffff");
    doc.setDrawColor("#e5e7eb");
    doc.roundedRect(15, yPosition, 180, 30, 2, 2, 'FD');
    
    // Dividir el comentario en líneas para que quepa en el PDF
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor("#374151");
    const textLines = doc.splitTextToSize(cleanComment, 170);
    doc.text(textLines, 20, yPosition + 7);
    
    // Actualizar la posición Y después del comentario
    yPosition += 35;
  }
  
  // Pie de página en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Línea separadora para el pie de página
    doc.setDrawColor("#e5e7eb");
    doc.setLineWidth(0.5);
    doc.line(15, 280, 195, 280);
    
    // Logo pequeño a la izquierda
    drawEducationLogo(15, 282, 10, 10);
    
    // QR code en la esquina inferior derecha
    drawQRCode(175, 280, 15, pdfConfig.verificationUrl);
    
    // Información institucional
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(pdfConfig.primaryColor);
    doc.text(pdfConfig.institutionName, 30, 285);
    
    // Lema institucional
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(pdfConfig.secondaryColor);
    doc.text(pdfConfig.institutionSlogan, 30, 290);
    
    // Frase del pie de página
    doc.setFontSize(7);
    doc.text(pdfConfig.footerText, 95, 285, { align: 'center' });
    
    // Folio único para el documento
    const folio = `BOL-${student.id}-${Date.now().toString().substring(7)}`;
    doc.text(`Folio: ${folio}`, 95, 290, { align: 'center' });
    
    // Fecha de generación
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Fecha de emisión: ${formattedDate}`, 30, 295);
    
    // Número de página
    doc.text(`Página ${i} de ${totalPages}`, 175, 295);
  }
  
  // Si se requiere firma del docente, añadir espacio
  if (pdfConfig.showTeacherSignature) {
    // Ir a la última página
    doc.setPage(totalPages);
    
    // Verificar si hay espacio suficiente
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Espacio para firma
    doc.setDrawColor("#e5e7eb");
    doc.line(70, yPosition + 20, 140, yPosition + 20);
    
    // Texto para firma
    doc.setFontSize(9);
    doc.setTextColor("#6b7280");
    doc.text(`${createdBy}`, 105, yPosition + 30, { align: 'center' });
    doc.setFontSize(8);
    doc.text("Firma del docente", 105, yPosition + 35, { align: 'center' });
  }
  
  // Generar nombre del archivo
  const studentNameFormatted = student.nombreCompleto.replace(/\s+/g, '_');
  const fileName = `Boleta_Academica_${studentNameFormatted}.pdf`;
  
  // Guardar y descargar el PDF
  doc.save(fileName);
};