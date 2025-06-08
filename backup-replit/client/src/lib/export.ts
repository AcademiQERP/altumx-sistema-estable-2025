// Utilidades para exportar reportes a PDF y Excel
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Debt, Payment, Student, Grade, Attendance } from '@shared/schema';

// Función simple para descargar un PDF
export function downloadPDF(filename: string, content?: string): void {
  try {
    // Si no hay contenido específico, creamos un PDF simple
    if (!content) {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Agregar título
      doc.setFontSize(18);
      doc.text(filename.replace('.pdf', '').replace(/_/g, ' '), pageWidth / 2, 15, { align: 'center' });
      
      // Agregar fecha
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, pageWidth / 2, 22, { align: 'center' });
      
      // Sello de institución
      doc.setFontSize(12);
      doc.text('Escuela Intelligence', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Documento oficial - Sistema de Gestión Académica', pageWidth / 2, 40, { align: 'center' });
      
      // Guardar el documento
      doc.save(filename);
      return;
    }
    
    // Si hay contenido específico, lo usamos como base64
    const blob = new Blob([content], { type: 'application/pdf' });
    saveAs(blob, filename);
    
    console.log(`PDF "${filename}" generado y descargado correctamente`);
  } catch (error) {
    console.error('Error al generar y descargar el PDF:', error);
    alert('Ocurrió un error al generar el documento. Por favor, inténtalo nuevamente.');
  }
}

// Tipos de exportación
type ExportType = 'pdf' | 'excel';

// Interfaces para los datos a exportar
export interface ReportData {
  title: string;
  subtitle?: string;
  institution?: string;
  date: string;
  data: any[];
  columns: { header: string; key: string }[];
}

// Interfaz para los reportes académicos
export interface AcademicReportData {
  grupoNombre: string;
  nivel: string;
  periodo: string;
  promedioGeneral: number;
  distribucionCalificaciones: { rango: string; cantidad: number; porcentaje: number }[];
}

// Interfaz para los reportes de asistencia
export interface AttendanceReportData {
  grupoNombre: string;
  periodo: string;
  porcentajeAsistencia: number;
  registrosPorFecha: { fecha: string; porcentaje: number }[];
  alumnosConMasFaltas: { alumnoId: number; nombreCompleto: string; faltas: number; retardos: number }[];
}

// Interfaz para los reportes financieros
export interface FinancialReportData {
  grupoNombre?: string;
  nivel?: string;
  periodo: string;
  porcentajePagado: number;
  totalAdeudos: number;
  totalPagado: number;
  adeudosPorConcepto: { conceptoId: number; nombreConcepto: string; monto: number; porcentaje: number }[];
  alumnosConAdeudos: { alumnoId: number; nombreCompleto: string; montoAdeudo: number; diasVencimiento: number }[];
}

// Función para exportar a PDF
export function exportToPDF(reportData: ReportData): void {
  // Verificar que existen datos para exportar
  if (!reportData || !Array.isArray(reportData.data) || reportData.data.length === 0) {
    console.error('No hay datos disponibles para exportar a PDF');
    alert('No hay datos disponibles para exportar. Por favor, verifica los filtros aplicados.');
    return;
  }

  // Verificar que existen columnas
  if (!Array.isArray(reportData.columns) || reportData.columns.length === 0) {
    console.error('No hay definición de columnas para exportar a PDF');
    alert('Error en la estructura del reporte. Por favor, inténtalo nuevamente.');
    return;
  }

  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Agregar cabecera del reporte
    doc.setFontSize(18);
    doc.text(reportData.title || 'Reporte', pageWidth / 2, 15, { align: 'center' });
    
    if (reportData.subtitle) {
      doc.setFontSize(12);
      doc.text(reportData.subtitle, pageWidth / 2, 22, { align: 'center' });
    }
    
    if (reportData.institution) {
      doc.setFontSize(10);
      doc.text(reportData.institution, pageWidth / 2, 28, { align: 'center' });
    }
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${reportData.date || new Date().toLocaleDateString('es-MX')}`, pageWidth / 2, 35, { align: 'center' });
    
    // Preparar los encabezados y datos para la tabla de manera segura
    const headers = reportData.columns.map(col => col.header);
    const rows = [];
    
    // Procesar las filas de manera segura
    if (Array.isArray(reportData.data)) {
      reportData.data.forEach(item => {
        if (item) {
          const row = reportData.columns.map(col => {
            const value = item[col.key];
            return value !== undefined && value !== null ? value : '';
          });
          rows.push(row);
        }
      });
    }
    
    // Agregar la tabla al documento
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    });
    
    // Guardar el documento
    doc.save(`${(reportData.title || 'Reporte').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    alert('Ocurrió un error al generar el PDF. Por favor, inténtalo nuevamente.');
  }
}

// Función para exportar a Excel
export function exportToExcel(reportData: ReportData): void {
  // Verificar que existen datos para exportar
  if (!reportData || !Array.isArray(reportData.data) || reportData.data.length === 0) {
    console.error('No hay datos disponibles para exportar a Excel');
    alert('No hay datos disponibles para exportar. Por favor, verifica los filtros aplicados.');
    return;
  }

  // Verificar que existen columnas
  if (!Array.isArray(reportData.columns) || reportData.columns.length === 0) {
    console.error('No hay definición de columnas para exportar a Excel');
    alert('Error en la estructura del reporte. Por favor, inténtalo nuevamente.');
    return;
  }
  
  try {
    // Preparar los datos para Excel
    const wsData: any[] = [
      // Título como primera fila
      [reportData.title || 'Reporte'],
      // Subtítulo como segunda fila si existe
      reportData.subtitle ? [reportData.subtitle] : [],
      // Institución como tercera fila si existe
      reportData.institution ? [reportData.institution] : [],
      // Fecha como cuarta fila
      [`Fecha: ${reportData.date || new Date().toLocaleDateString('es-MX')}`],
      // Fila vacía
      [],
      // Encabezados de columnas
      reportData.columns.map(col => col.header)
    ];
    
    // Agregar filas de datos de manera segura
    if (Array.isArray(reportData.data)) {
      reportData.data.forEach(item => {
        if (item) {
          const row = reportData.columns.map(col => {
            const value = item[col.key];
            return value !== undefined && value !== null ? value : '';
          });
          wsData.push(row);
        }
      });
    }
    
    // Crear libro y hoja de cálculo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    
    // Guardar el archivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${(reportData.title || 'Reporte').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    
    console.log(`Reporte "${reportData.title}" exportado exitosamente a Excel`);
  } catch (error) {
    console.error('Error al generar el Excel:', error);
    alert('Ocurrió un error al generar el Excel. Por favor, inténtalo nuevamente.');
  }
}

// Función principal para exportar reportes
export function exportReport(data: any, type: ExportType, reportType: 'academic' | 'attendance' | 'financial' | 'summary'): void {
  // Obtener la fecha actual
  const currentDate = new Date().toLocaleDateString('es-MX');
  
  switch (reportType) {
    case 'academic':
      // Exportar reporte académico
      exportAcademicReport(data, type, currentDate);
      break;
    case 'attendance':
      // Exportar reporte de asistencia
      exportAttendanceReport(data, type, currentDate);
      break;
    case 'financial':
      // Exportar reporte financiero
      exportFinancialReport(data, type, currentDate);
      break;
    case 'summary':
      // Exportar resumen general
      exportSummaryReport(data, type, currentDate);
      break;
    default:
      console.error('Tipo de reporte no soportado');
  }
}

// Función para exportar reporte académico
function exportAcademicReport(data: AcademicReportData[], type: ExportType, date: string): void {
  // Validar que existen datos para exportar
  if (!Array.isArray(data) || data.length === 0) {
    console.error('No hay datos disponibles para exportar reporte académico');
    alert('No hay datos disponibles para exportar. Por favor, verifica los filtros aplicados.');
    return;
  }

  try {
    const reportData: ReportData = {
      title: 'Reporte de Rendimiento Académico',
      subtitle: data.length === 1 ? `Grupo: ${data[0]?.grupoNombre || 'N/A'} - ${data[0]?.nivel || 'N/A'}` : 'Todos los grupos',
      institution: 'Escuela Intelligence',
      date,
      data: [],
      columns: [
        { header: 'Grupo', key: 'grupo' },
        { header: 'Nivel', key: 'nivel' },
        { header: 'Periodo', key: 'periodo' },
        { header: 'Promedio General', key: 'promedio' },
        { header: 'Alumnos 9-10', key: 'excelente' },
        { header: 'Alumnos 7-8.9', key: 'bueno' },
        { header: 'Alumnos <7', key: 'insuficiente' }
      ]
    };

    // Transformar datos para la exportación de manera segura
    data.forEach(report => {
      // Verificar que existe la propiedad distribucionCalificaciones y es un array
      if (!report || !Array.isArray(report.distribucionCalificaciones)) {
        return;
      }

      const excelentes = report.distribucionCalificaciones.find(d => d?.rango === '9-10')?.cantidad || 0;
      const buenos = report.distribucionCalificaciones.find(d => d?.rango === '7-8.9')?.cantidad || 0;
      const insuficientes = report.distribucionCalificaciones.find(d => d?.rango === '0-6.9')?.cantidad || 0;
      
      reportData.data.push({
        grupo: report.grupoNombre || 'N/A',
        nivel: report.nivel || 'N/A',
        periodo: report.periodo || 'N/A',
        promedio: report.promedioGeneral ? report.promedioGeneral.toFixed(2) : '0.00',
        excelente: excelentes,
        bueno: buenos,
        insuficiente: insuficientes
      });
    });

    // Verificar si hay datos procesados para exportar
    if (reportData.data.length === 0) {
      console.error('No hay datos disponibles para exportar después del procesamiento');
      alert('No hay datos válidos para exportar. Por favor, verifica los filtros aplicados.');
      return;
    }

    // Exportar según el tipo seleccionado
    if (type === 'pdf') {
      exportToPDF(reportData);
    } else {
      exportToExcel(reportData);
    }
  } catch (error) {
    console.error('Error al procesar reporte académico:', error);
    alert('Ocurrió un error al procesar el reporte. Por favor, inténtalo nuevamente.');
  }
}

// Función para exportar reporte de asistencia
function exportAttendanceReport(data: AttendanceReportData[], type: ExportType, date: string): void {
  // Validar que existen datos para exportar
  if (!Array.isArray(data) || data.length === 0) {
    console.error('No hay datos disponibles para exportar reporte de asistencia');
    alert('No hay datos disponibles para exportar. Por favor, verifica los filtros aplicados.');
    return;
  }

  try {
    const reportData: ReportData = {
      title: 'Reporte de Asistencia',
      subtitle: data.length === 1 ? `Grupo: ${data[0]?.grupoNombre || 'N/A'}` : 'Todos los grupos',
      institution: 'Escuela Intelligence',
      date,
      data: [],
      columns: [
        { header: 'Grupo', key: 'grupo' },
        { header: 'Periodo', key: 'periodo' },
        { header: 'Porcentaje Asistencia', key: 'porcentaje' },
        { header: 'Alumno con Más Faltas', key: 'alumno' },
        { header: 'Faltas', key: 'faltas' },
        { header: 'Retardos', key: 'retardos' }
      ]
    };

    // Transformar datos para la exportación de manera segura
    data.forEach(report => {
      if (!report) {
        return;
      }
      
      // Verificar que existe la propiedad alumnosConMasFaltas y es un array
      const alumnosArray = Array.isArray(report.alumnosConMasFaltas) ? report.alumnosConMasFaltas : [];
      const alumnoMasFaltas = alumnosArray[0] || { nombreCompleto: 'N/A', faltas: 0, retardos: 0 };
      
      reportData.data.push({
        grupo: report.grupoNombre || 'N/A',
        periodo: report.periodo || 'N/A',
        porcentaje: report.porcentajeAsistencia !== undefined ? `${report.porcentajeAsistencia.toFixed(2)}%` : 'N/A',
        alumno: alumnoMasFaltas.nombreCompleto || 'N/A',
        faltas: alumnoMasFaltas.faltas !== undefined ? alumnoMasFaltas.faltas : 0,
        retardos: alumnoMasFaltas.retardos !== undefined ? alumnoMasFaltas.retardos : 0
      });
    });

    // Verificar si hay datos procesados para exportar
    if (reportData.data.length === 0) {
      console.error('No hay datos disponibles para exportar después del procesamiento');
      alert('No hay datos válidos para exportar. Por favor, verifica los filtros aplicados.');
      return;
    }

    // Exportar según el tipo seleccionado
    if (type === 'pdf') {
      exportToPDF(reportData);
    } else {
      exportToExcel(reportData);
    }
  } catch (error) {
    console.error('Error al procesar reporte de asistencia:', error);
    alert('Ocurrió un error al procesar el reporte. Por favor, inténtalo nuevamente.');
  }
}

// Función para exportar reporte financiero
function exportFinancialReport(data: FinancialReportData, type: ExportType, date: string): void {
  // Validar que existen datos para exportar
  if (!data) {
    console.error('No hay datos disponibles para exportar reporte financiero');
    alert('No hay datos disponibles para exportar. Por favor, verifica los filtros aplicados.');
    return;
  }

  try {
    const reportData: ReportData = {
      title: 'Reporte Financiero',
      subtitle: data.grupoNombre ? `Grupo: ${data.grupoNombre} - ${data.nivel || 'N/A'}` : 'Reporte Financiero Institucional',
      institution: 'Escuela Intelligence',
      date,
      data: [],
      columns: [
        { header: 'Concepto', key: 'concepto' },
        { header: 'Monto', key: 'monto' },
        { header: 'Porcentaje', key: 'porcentaje' }
      ]
    };

    // Transformar datos para la exportación de manera segura
    if (Array.isArray(data.adeudosPorConcepto)) {
      data.adeudosPorConcepto.forEach(concepto => {
        if (!concepto) return;
        
        reportData.data.push({
          concepto: concepto.nombreConcepto || 'N/A',
          monto: typeof concepto.monto === 'number' 
            ? `$${concepto.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` 
            : '$0.00',
          porcentaje: typeof concepto.porcentaje === 'number' 
            ? `${concepto.porcentaje.toFixed(2)}%` 
            : '0.00%'
        });
      });
    }

    // Verificar si hay datos procesados para exportar
    if (reportData.data.length === 0 && !Array.isArray(data.adeudosPorConcepto)) {
      console.error('No hay detalles de conceptos para exportar');
      alert('No hay detalles de conceptos para exportar. Los datos pueden estar incompletos.');
      return;
    }

    // Agregar fila de totales de manera segura
    reportData.data.push({
      concepto: 'TOTAL ADEUDOS',
      monto: typeof data.totalAdeudos === 'number' 
        ? `$${data.totalAdeudos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` 
        : '$0.00',
      porcentaje: '100%'
    });
    
    reportData.data.push({
      concepto: 'TOTAL PAGADO',
      monto: typeof data.totalPagado === 'number' 
        ? `$${data.totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` 
        : '$0.00',
      porcentaje: typeof data.porcentajePagado === 'number' 
        ? `${data.porcentajePagado.toFixed(2)}%` 
        : '0.00%'
    });

    // Exportar según el tipo seleccionado
    if (type === 'pdf') {
      exportToPDF(reportData);
    } else {
      exportToExcel(reportData);
    }
  } catch (error) {
    console.error('Error al procesar reporte financiero:', error);
    alert('Ocurrió un error al procesar el reporte. Por favor, inténtalo nuevamente.');
  }
}

// Función para exportar resumen general
function exportSummaryReport(data: any, type: ExportType, date: string): void {
  // Validar que existen datos para exportar
  if (!data) {
    console.error('No hay datos disponibles para exportar resumen general');
    alert('No hay datos disponibles para exportar. Por favor, verifica los filtros aplicados.');
    return;
  }

  try {
    const reportData: ReportData = {
      title: 'Resumen General Institucional',
      institution: 'Escuela Intelligence',
      date,
      data: [],
      columns: [
        { header: 'Indicador', key: 'indicador' },
        { header: 'Valor', key: 'valor' }
      ]
    };

    // Transformar datos para la exportación de manera segura
    if (typeof data.promedioGeneral === 'number') {
      reportData.data.push({ 
        indicador: 'Promedio General', 
        valor: data.promedioGeneral.toFixed(2) 
      });
    } else {
      reportData.data.push({ 
        indicador: 'Promedio General', 
        valor: 'N/A' 
      });
    }

    if (typeof data.asistenciaMedia === 'number') {
      reportData.data.push({ 
        indicador: 'Asistencia Media', 
        valor: `${data.asistenciaMedia.toFixed(2)}%` 
      });
    } else {
      reportData.data.push({ 
        indicador: 'Asistencia Media', 
        valor: 'N/A' 
      });
    }

    if (typeof data.recuperacionFinanciera === 'number') {
      reportData.data.push({ 
        indicador: 'Recuperación Financiera', 
        valor: `${data.recuperacionFinanciera.toFixed(2)}%` 
      });
    } else {
      reportData.data.push({ 
        indicador: 'Recuperación Financiera', 
        valor: 'N/A' 
      });
    }

    if (Array.isArray(data.mejoresGrupos)) {
      reportData.data.push({ 
        indicador: 'Grupos Totales', 
        valor: data.mejoresGrupos.length 
      });

      // Agregar los mejores grupos de manera segura
      data.mejoresGrupos.forEach((grupo: any, index: number) => {
        if (!grupo) return;
        
        const nombreGrupo = grupo.grupoNombre || 'Grupo sin nombre';
        const promedio = typeof grupo.promedio === 'number' ? grupo.promedio.toFixed(2) : 'N/A';
        
        reportData.data.push({
          indicador: `Grupo ${index + 1}`,
          valor: `${nombreGrupo} (${promedio})`
        });
      });
    } else {
      reportData.data.push({ 
        indicador: 'Grupos Totales', 
        valor: '0' 
      });
    }

    // Verificar si hay datos procesados para exportar
    if (reportData.data.length === 0) {
      console.error('No hay datos disponibles para exportar después del procesamiento');
      alert('No hay datos válidos para exportar. Por favor, verifica los filtros aplicados.');
      return;
    }

    // Exportar según el tipo seleccionado
    if (type === 'pdf') {
      exportToPDF(reportData);
    } else {
      exportToExcel(reportData);
    }
  } catch (error) {
    console.error('Error al procesar resumen general:', error);
    alert('Ocurrió un error al procesar el reporte. Por favor, inténtalo nuevamente.');
  }
}