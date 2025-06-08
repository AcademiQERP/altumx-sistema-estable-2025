import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, LineChart, Award, Calendar, Wallet, ArrowLeft, FileText, BrainCircuit } from "lucide-react";
import { AvisoVacio } from "@/components/ui/aviso-vacio";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
// No necesitamos importar useStudentContext, usaremos props
import { Link, useLocation } from "wouter";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { apiRequest } from "@/lib/queryClient";

// Extend jsPDF to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

// Definir interfaces para los datos
interface Materia {
  nombre: string;
  calificacion: number;
  estado: 'excelente' | 'bueno' | 'advertencia';
}

interface Periodo {
  mes: string;
  porcentaje: number;
  tendencia: 'mejora' | 'estable' | 'baja';
}

interface Financiero {
  pagadoMes: string;
  adeudoActual: string;
  historial: string;
  recomendacion: string;
}

interface Academico {
  materias: Materia[];
  sugerencia: string;
}

interface Asistencia {
  periodos: Periodo[];
  comentario: string;
}

interface DatosReporte {
  academico: Academico;
  asistencia: Asistencia;
  financiero: Financiero;
}

interface Resumen {
  suficienteDatos: boolean;
  mensaje: string;
  datos: DatosReporte;
  notaTutor: string;
}

// Interfaz para los datos recibidos de la API
interface ApiReporteData {
  nombreEstudiante: string;
  suficienteDatos: boolean;
  resumen: string;
  datos: any;
}

// Interfaz para los datos procesados y utilizados en el componente
interface ReporteIA {
  nombreCompleto: string;
  resumen: Resumen;
}

// Función para obtener un color según el estado de una materia
function getColorByStatus(estado: string) {
  switch (estado) {
    case 'excelente':
      return 'bg-green-500 text-green-700 border-green-200 bg-green-50';
    case 'bueno':
      return 'bg-blue-500 text-blue-700 border-blue-200 bg-blue-50';
    case 'advertencia':
      return 'bg-yellow-500 text-yellow-700 border-yellow-200 bg-yellow-50';
    default:
      return 'bg-gray-500 text-gray-700 border-gray-200 bg-gray-50';
  }
}

// Función para obtener un color según la tendencia de asistencia
function getColorByTrend(tendencia: string) {
  switch (tendencia) {
    case 'mejora':
      return 'text-green-700 border-green-200 bg-green-50';
    case 'estable':
      return 'text-blue-700 border-blue-200 bg-blue-50';
    case 'baja':
      return 'text-yellow-700 border-yellow-200 bg-yellow-50';
    default:
      return 'text-gray-700 border-gray-200 bg-gray-50';
  }
}

// Función para transformar los datos de la API al formato esperado por el componente
function transformarDatosAPI(data: any): DatosReporte {
  // Obtener los promedios de materias desde los datos de la API
  const materias: Materia[] = data.datos?.promediosPorMateria?.map((materia: any) => {
    // Extraer la calificación del objeto de promedios (tomamos el primer valor)
    const calificacion = parseFloat(Object.values(materia.promedios)[0] as string) || 0;
    const estado = determinarEstadoMateria(calificacion);
    
    return {
      nombre: materia.materia,
      calificacion,
      estado
    };
  }) || [];

  // Obtener datos de asistencia
  const asistencia = data.datos?.asistencia || { porcentaje: 0, presente: 0, total: 0 };
  
  // Crear periodos de asistencia basados en los datos reales
  const periodos: Periodo[] = [
    { 
      mes: 'Actual', 
      porcentaje: asistencia.porcentaje || 0, 
      // Determinamos la tendencia basada en el porcentaje de asistencia
      tendencia: (asistencia.porcentaje > 90 
        ? 'mejora' 
        : asistencia.porcentaje > 80 
          ? 'estable' 
          : 'baja') as 'mejora' | 'estable' | 'baja'
    }
  ];
  
  // Obtener o crear datos financieros
  // Verificamos si hay datos financieros en la respuesta de la API
  const financieroData = data.datos?.financiero || {};
  const financiero: Financiero = {
    pagadoMes: financieroData.pagadoMes || "$0.00 MXN",
    adeudoActual: financieroData.adeudoActual || "$0.00 MXN",
    historial: financieroData.historial || "Información financiera no disponible en este momento",
    recomendacion: financieroData.recomendacion || "Consulte con administración para información detallada"
  };
  
  return {
    academico: {
      materias,
      sugerencia: data.datos?.sugerenciaAcademica || 
        "Basado en el desempeño académico, se recomienda mantener el ritmo de estudio actual."
    },
    asistencia: {
      periodos,
      comentario: data.datos?.comentarioAsistencia || 
        `La asistencia general es del ${asistencia.porcentaje}% (${asistencia.presente} de ${asistencia.total} días).`
    },
    financiero
  };
}

// Función para determinar el estado de una materia basado en su calificación
function determinarEstadoMateria(calificacion: number): 'excelente' | 'bueno' | 'advertencia' {
  if (calificacion >= 9) return 'excelente';
  if (calificacion >= 7.5) return 'bueno';
  return 'advertencia';
}

// Componente para renderizar el reporte completo
const ReporteCompleto = ({ reporteData }: { reporteData: ReporteIA }) => {
  const [activeTab, setActiveTab] = useState<'academico' | 'asistencia' | 'financiero'>('academico');

  return (
    <div className="space-y-6">
      {/* Título del reporte */}
      <div>
        <h1 className="text-2xl font-bold text-primary">
          Reporte IA: {reporteData.nombreCompleto}
        </h1>
        <p className="text-muted-foreground">
          {reporteData.resumen.mensaje}
        </p>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex flex-wrap gap-2 border-b">
        <Button
          variant={activeTab === 'academico' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('academico')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          data-state={activeTab === 'academico' ? 'active' : 'inactive'}
        >
          <Award className="w-4 h-4 mr-2" />
          Académico
        </Button>
        <Button
          variant={activeTab === 'asistencia' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('asistencia')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          data-state={activeTab === 'asistencia' ? 'active' : 'inactive'}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Asistencia
        </Button>
        <Button
          variant={activeTab === 'financiero' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('financiero')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          data-state={activeTab === 'financiero' ? 'active' : 'inactive'}
        >
          <Wallet className="w-4 h-4 mr-2" />
          Financiero
        </Button>
      </div>

      {/* Contenido del reporte según la pestaña seleccionada */}
      <div className="pt-4">
        {activeTab === 'academico' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Award className="w-5 h-5 mr-2 text-primary" />
                Resumen Académico
              </CardTitle>
              <CardDescription>
                Desempeño en las diferentes materias y sugerencias para mejorar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reporteData.resumen.datos.academico.materias.map((materia, index) => (
                    <Card key={index} className="overflow-hidden">
                      <div className={`h-1 ${getColorByStatus(materia.estado).split(' ')[0]}`} />
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{materia.nombre}</h3>
                          <Badge variant="outline" className={getColorByStatus(materia.estado)}>
                            {materia.calificacion}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Alert className="bg-primary/5 border-primary/20">
                  <LineChart className="h-4 w-4 text-primary" />
                  <AlertTitle>Sugerencia personalizada</AlertTitle>
                  <AlertDescription>
                    {reporteData.resumen.datos.academico.sugerencia}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'asistencia' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Registro de Asistencia
              </CardTitle>
              <CardDescription>
                Análisis de asistencia y tendencias durante los últimos periodos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Periodo</th>
                        <th className="text-left py-2 font-medium">Asistencia</th>
                        <th className="text-left py-2 font-medium">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteData.resumen.datos.asistencia.periodos.map((periodo, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3">{periodo.mes}</td>
                          <td className="py-3">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-100 rounded-full h-2.5 mr-2">
                                <div
                                  className="bg-primary h-2.5 rounded-full"
                                  style={{ width: `${periodo.porcentaje}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{periodo.porcentaje}%</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant="outline" className={getColorByTrend(periodo.tendencia)}>
                              {periodo.tendencia === 'mejora' ? '▲' : periodo.tendencia === 'baja' ? '▼' : '■'} {periodo.tendencia}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Alert className="bg-primary/5 border-primary/20">
                  <Calendar className="h-4 w-4 text-primary" />
                  <AlertTitle>Comentario sobre asistencia</AlertTitle>
                  <AlertDescription>
                    {reporteData.resumen.datos.asistencia.comentario}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'financiero' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Wallet className="w-5 h-5 mr-2 text-primary" />
                Resumen Financiero
              </CardTitle>
              <CardDescription>
                Estado de pagos, adeudos y recomendaciones financieras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-muted-foreground">Pagado este mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{reporteData.resumen.datos.financiero.pagadoMes}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-muted-foreground">Adeudo actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{reporteData.resumen.datos.financiero.adeudoActual}</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Historial de pagos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{reporteData.resumen.datos.financiero.historial}</p>
                  </CardContent>
                </Card>
                <Alert className="bg-primary/5 border-primary/20">
                  <Wallet className="h-4 w-4 text-primary" />
                  <AlertTitle>Recomendación financiera</AlertTitle>
                  <AlertDescription>
                    {reporteData.resumen.datos.financiero.recomendacion}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Nota del tutor */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl">Nota del Tutor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="italic">{reporteData.resumen.notaTutor}</p>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <p>Este reporte ha sido generado con la ayuda de inteligencia artificial para proporcionar una visión personalizada del desempeño estudiantil.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

const ReporteIA = () => {
  const { toast } = useToast();
  // Obtener la ubicación actual y extraer los parámetros de la URL
  const [location] = useLocation();
  // Extraer el ID del estudiante de la URL utilizando URLSearchParams
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const studentId = parseInt(urlParams.get('studentId') || '2');
  
  // Consulta para obtener datos del reporte
  const { data: reporteData, isLoading, error } = useQuery<ApiReporteData, Error, ReporteIA>({
    queryKey: [`/api/students/${studentId}/summary-ia`],
    enabled: !!studentId,
    select: (data) => {
      // Si no hay datos o no son suficientes, devolver estructura base con marca de insuficientes
      if (!data || !data.suficienteDatos) {
        return {
          nombreCompleto: data?.nombreEstudiante || 'Estudiante',
          resumen: {
            suficienteDatos: false,
            mensaje: 'No hay suficientes datos para generar un informe completo.',
            datos: {
              academico: { materias: [], sugerencia: '' },
              asistencia: { periodos: [], comentario: '' },
              financiero: { 
                pagadoMes: '$0.00 MXN', 
                adeudoActual: '$0.00 MXN', 
                historial: '', 
                recomendacion: '' 
              }
            },
            notaTutor: ''
          }
        };
      }
      
      // Transformar los datos recibidos del API al formato esperado por el componente
      return {
        nombreCompleto: data.nombreEstudiante || '',
        resumen: {
          suficienteDatos: true,
          mensaje: data.resumen || '',
          datos: transformarDatosAPI(data),
          notaTutor: data.resumen || ''
        }
      };
    }
  });

  // Consulta para obtener los datos del estudiante
  const queryClient = useQueryClient();

  // Mutación para generar un nuevo análisis personalizado de IA
  const generarNuevoAnalisisIA = useMutation({
    mutationFn: async () => {
      if (!reporteData) throw new Error("No hay datos disponibles para el análisis");
      
      console.log("Generando nuevo análisis de IA para:", reporteData.nombreCompleto);
      
      // Hacer la solicitud a la API para regenerar el análisis
      const response = await apiRequest("POST", `/api/students/${studentId}/regenerate-summary`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Análisis generado correctamente",
        description: "Se ha generado un nuevo análisis personalizado con IA.",
        variant: "default",
      });
      
      // Invalidar la consulta actual para forzar una recarga de los datos
      queryClient.invalidateQueries({ 
        queryKey: [`/api/students/${studentId}/summary-ia`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error al generar el análisis",
        description: error.message || "Ocurrió un error al generar el análisis con IA.",
        variant: "destructive",
      });
    }
  });

  // Función para generar PDF del reporte
  const generarPDF = () => {
    if (!reporteData) return;

    try {
      const doc = new jsPDF();
      const { nombreCompleto, resumen } = reporteData;
      const { datos, notaTutor } = resumen;

      // Configurar estilos y colores
      const colorPrimario = '#4f46e5';
      const colorSecundario = '#6366f1';
      const colorTexto = '#1f2937';

      // Agregar encabezado
      doc.setFontSize(22);
      doc.setTextColor(colorPrimario);
      doc.text(`Reporte IA: ${nombreCompleto}`, 14, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(colorTexto);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 14, 30);
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(colorSecundario);
      doc.line(14, 32, 196, 32);
      
      // Sección académica
      doc.setFontSize(16);
      doc.setTextColor(colorPrimario);
      doc.text("Resumen Académico", 14, 45);
      
      const materiasHeaders = [['Materia', 'Calificación', 'Estado']];
      const materiasBody = datos.academico.materias.map(materia => [
        materia.nombre, 
        materia.calificacion.toString(), 
        materia.estado
      ]);
      
      // @ts-ignore - La definición de tipos de autoTable no es completamente compatible
      doc.autoTable({
        head: materiasHeaders,
        body: materiasBody,
        startY: 50,
        theme: 'grid',
        styles: { textColor: colorTexto },
        headStyles: { 
          fillColor: colorPrimario, 
          textColor: '#ffffff',
          fontStyle: 'bold'
        }
      });
      
      let finalY = 120;
      if ((doc as any).lastAutoTable) {
        finalY = (doc as any).lastAutoTable.finalY;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(colorPrimario);
      doc.text("Sugerencia Académica:", 14, finalY + 15);
      
      doc.setFontSize(11);
      doc.setTextColor(colorTexto);
      
      const sugerenciaWrapped = doc.splitTextToSize(datos.academico.sugerencia, 180);
      doc.text(sugerenciaWrapped, 14, finalY + 25);
      
      // Sección de asistencia
      const finalYSugerencia = finalY + 25 + (sugerenciaWrapped.length * 5);
      doc.setFontSize(16);
      doc.setTextColor(colorPrimario);
      doc.text("Análisis de Asistencia", 14, finalYSugerencia + 10);
      
      const asistenciaHeaders = [['Periodo', 'Porcentaje', 'Tendencia']];
      const asistenciaBody = datos.asistencia.periodos.map(periodo => [
        periodo.mes, 
        `${periodo.porcentaje}%`, 
        periodo.tendencia
      ]);
      
      // @ts-ignore - La definición de tipos de autoTable no es completamente compatible
      doc.autoTable({
        head: asistenciaHeaders,
        body: asistenciaBody,
        startY: finalYSugerencia + 15,
        theme: 'grid',
        styles: { textColor: colorTexto },
        headStyles: { 
          fillColor: colorPrimario, 
          textColor: '#ffffff',
          fontStyle: 'bold'
        }
      });
      
      let finalYAsistencia = 200;
      if ((doc as any).lastAutoTable) {
        finalYAsistencia = (doc as any).lastAutoTable.finalY;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(colorPrimario);
      doc.text("Comentario sobre Asistencia:", 14, finalYAsistencia + 15);
      
      doc.setFontSize(11);
      doc.setTextColor(colorTexto);
      
      const comentarioWrapped = doc.splitTextToSize(datos.asistencia.comentario, 180);
      doc.text(comentarioWrapped, 14, finalYAsistencia + 25);
      
      // Sección financiera
      const finalYComentario = finalYAsistencia + 25 + (comentarioWrapped.length * 5);
      doc.setFontSize(16);
      doc.setTextColor(colorPrimario);
      doc.text("Resumen Financiero", 14, finalYComentario + 10);
      
      const financieroHeaders = [['Concepto', 'Valor']];
      const financieroBody = [
        ['Pagado este mes', datos.financiero.pagadoMes],
        ['Adeudo actual', datos.financiero.adeudoActual],
        ['Historial', datos.financiero.historial.length > 40 ? 
          datos.financiero.historial.substring(0, 40) + '...' : 
          datos.financiero.historial]
      ];
      
      // @ts-ignore - La definición de tipos de autoTable no es completamente compatible
      doc.autoTable({
        head: financieroHeaders,
        body: financieroBody,
        startY: finalYComentario + 15,
        theme: 'grid',
        styles: { textColor: colorTexto },
        headStyles: { 
          fillColor: colorPrimario, 
          textColor: '#ffffff',
          fontStyle: 'bold'
        }
      });
      
      let finalYFinanciero = 240;
      if ((doc as any).lastAutoTable) {
        finalYFinanciero = (doc as any).lastAutoTable.finalY;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(colorPrimario);
      doc.text("Recomendación Financiera:", 14, finalYFinanciero + 15);
      
      doc.setFontSize(11);
      doc.setTextColor(colorTexto);
      
      const recomendacionWrapped = doc.splitTextToSize(datos.financiero.recomendacion, 180);
      doc.text(recomendacionWrapped, 14, finalYFinanciero + 25);
      
      // Nota del tutor
      const finalYRecomendacion = finalYFinanciero + 25 + (recomendacionWrapped.length * 5);
      doc.setFontSize(16);
      doc.setTextColor(colorPrimario);
      doc.text("Nota del Tutor", 14, finalYRecomendacion + 10);
      
      doc.setFontSize(11);
      doc.setTextColor(colorTexto);
      
      const notaTutorWrapped = doc.splitTextToSize(notaTutor, 180);
      doc.text(notaTutorWrapped, 14, finalYRecomendacion + 25);
      
      // Pie de página
      // @ts-ignore - La propiedad getNumberOfPages existe en jsPDF pero no está correctamente definida en los tipos
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(colorTexto);
        doc.text(
          `Reporte generado el ${new Date().toLocaleDateString('es-MX')} - Página ${i} de ${totalPages}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }
      
      // Guardar el PDF
      doc.save(`Reporte_IA_${nombreCompleto.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: "Reporte descargado",
        description: "El reporte se ha guardado exitosamente en formato PDF.",
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el archivo PDF. Intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal-padres">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal-padres">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error al cargar el reporte</AlertTitle>
          <AlertDescription>
            No pudimos obtener los datos del reporte. Por favor, intente nuevamente más tarde.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!reporteData || !reporteData.resumen) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal-padres">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
        <AvisoVacio
          titulo="Reporte no disponible"
          mensaje="El reporte de inteligencia artificial para este estudiante no está disponible en este momento."
          icono={<FileText className="h-12 w-12 text-muted-foreground" />}
        />
      </div>
    );
  }

  // Si no hay datos suficientes, mostrar un mensaje informativo
  if (reporteData && reporteData.resumen && !reporteData.resumen.suficienteDatos) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portal-padres">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
          </div>
        </div>
        
        <Alert className="bg-yellow-50 border-yellow-300">
          <AlertTitle className="text-yellow-800">Datos insuficientes</AlertTitle>
          <AlertDescription className="text-yellow-700">
            No hay suficiente información académica para generar un reporte completo en este momento.
            Por favor, intente más tarde cuando haya más datos disponibles.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center mt-8">
          <Button 
            onClick={() => generarNuevoAnalisisIA.mutate()}
            disabled={generarNuevoAnalisisIA.isPending}
          >
            <BrainCircuit className="h-4 w-4 mr-2" />
            {generarNuevoAnalisisIA.isPending ? "Generando..." : "Generar análisis con datos disponibles"}
          </Button>
        </div>
      </div>
    );
  }

  // Renderizado principal
  return (
    <div className="p-4 space-y-6">
      {/* Encabezado y navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal-padres">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generarNuevoAnalisisIA.mutate()}
            variant="default"
            size="sm"
            className="self-end sm:self-auto"
            disabled={generarNuevoAnalisisIA.isPending}
          >
            <BrainCircuit className="h-4 w-4 mr-2" />
            {generarNuevoAnalisisIA.isPending ? "Generando..." : "Nuevo análisis IA"}
          </Button>
          <Button
            onClick={generarPDF}
            variant="outline"
            size="sm"
            className="self-end sm:self-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Contenido del reporte */}
      <ReporteCompleto reporteData={reporteData} />
    </div>
  );
};

export default ReporteIA;