import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { 
  ArrowLeft, 
  FileText, 
  FileBarChart,
  Printer, 
  Download, 
  RefreshCcw, 
  ChevronDown
} from "lucide-react";
import { formatDate } from "@/lib/dates";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { generateReportCardPDF } from "@/services/pdf-service";
import { useAuth } from "@/hooks/use-auth";
import { safeGradeFormat, safeAverageCalculation } from "@/utils/grade-validation";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function ParentReportCard() {
  const params = useParams();
  const studentId = params.studentId;
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estado para comentarios académicos
  const [academicComment, setAcademicComment] = useState("");

  const { data: reportCard, isLoading, isError, refetch } = useQuery<ReportCardResponse>({
    queryKey: [`/api/parent-portal/report-cards/${studentId}`],
  });

  // Function to get color based on grade
  const getGradeColor = (grade: number) => {
    if (grade >= 9) return "text-emerald-600 font-semibold";
    if (grade >= 7) return "text-blue-600 font-semibold";
    if (grade >= 6) return "text-amber-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  // Get overall average
  const getOverallAverage = () => {
    if (!reportCard?.reportCard || reportCard.reportCard.length === 0) return 0;
    
    let sum = 0;
    let count = 0;
    
    reportCard.reportCard.forEach(subject => {
      subject.periods.forEach(period => {
        sum += period.average;
        count++;
      });
    });
    
    return count > 0 ? sum / count : 0;
  };

  const handlePrint = () => {
    window.print();
  };
  
  // Función para generar y descargar el PDF
  const handleDownloadPDF = (detailed: boolean = true) => {
    if (!reportCard) return;
    
    try {
      // Obtener el nombre del usuario que genera el reporte
      const generatorName = user?.nombreCompleto || 'Padre de Familia';
      
      // Generar el PDF utilizando la función del servicio con las nuevas opciones
      generateReportCardPDF(reportCard, academicComment, generatorName, {
        institutionName: 'Altum Educación',
        institutionSlogan: 'Educación de excelencia para un futuro brillante',
        primaryColor: '#4361ee', // Azul principal que coincide con la interfaz web
        detailed: detailed, // Detallado o resumido según el parámetro
        footerText: 'Este documento fue generado digitalmente y no requiere firma autógrafa.',
        showTeacherSignature: false, // En versión para padres, no mostramos firma del docente
        verificationUrl: `https://altum.edu.mx/verifica/boleta/${reportCard.student.id}`
      });
      
      // Mostrar mensaje de éxito
      toast({
        title: "PDF generado correctamente",
        description: `La boleta académica ${detailed ? 'detallada' : 'resumida'} ha sido descargada como PDF`,
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      
      // Mostrar mensaje de error
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el archivo PDF. Intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  // Acciones a realizar cuando el componente se monta
  useEffect(() => {
    // Si no hay ID de estudiante en los parámetros, intenta obtener el estudiante vinculado
    if (!studentId) {
      // Se puede agregar lógica para obtener los estudiantes vinculados al padre
      // y seleccionar automáticamente el primero
    }
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCcw className="h-8 w-8 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-medium">Cargando boleta académica...</h3>
      </div>
    );
  }

  if (isError || !reportCard) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-10 w-10 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium">Error al cargar la boleta</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No se pudo obtener la información del estudiante
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Intentar de nuevo
          </Button>
          <Link href="/portal-padres">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al portal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const student = reportCard.student;
  const overallAverage = getOverallAverage();

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl print:p-0">
      {/* Barra superior con datos del estudiante - Encabezado moderno */}
      <div className="mb-6 flex flex-col">
        {/* Encabezado con gradiente y nombre del estudiante */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-400 rounded-xl text-white py-6 px-8 mb-4 print:bg-blue-700">
          <div className="flex items-start md:items-center mb-4 flex-col md:flex-row">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="rounded-full bg-white/20 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{student.nombreCompleto}</h1>
                <p className="text-sm text-neutral-200">CURP: {student.curp}</p>
              </div>
            </div>
            <div className="flex gap-2 md:ml-auto">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Nivel: {student.nivel}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Grupo: {student.grupoId || "Sin asignar"}
              </Badge>
              <Badge variant={student.estatus === "activo" ? "default" : "secondary"} className={student.estatus === "activo" ? "bg-emerald-500 text-white border-0" : "bg-neutral-400 text-white border-0"}>
                {student.estatus === "activo" ? "Activo" : student.estatus}
              </Badge>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex justify-end gap-3 mt-2 print:hidden">
            <Button variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="bg-white text-blue-700 hover:bg-white/90">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Formato de PDF</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownloadPDF(true)}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Detallado (con criterios)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadPDF(false)}>
                  <FileBarChart className="mr-2 h-4 w-4" />
                  <span>Resumido (solo promedios)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Enlaces de navegación */}
        <div className="flex items-center text-sm mb-2 px-1 print:hidden">
          <Link href="/portal-padres" className="text-primary">Portal</Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/portal-padres/calificaciones" className="text-primary">Calificaciones</Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>{student.nombreCompleto}</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tarjetas de resumen académico y asistencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta de promedio general */}
          <Card className="rounded-xl shadow-sm bg-white p-4 border">
            <CardContent className="p-4">
              <h2 className="text-xl font-bold text-neutral-800 mb-2">Desempeño Académico</h2>
              <p className="text-gray-600 mb-4">Promedio general del periodo actual:</p>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center justify-center">
                  <span className={`text-3xl font-extrabold ${overallAverage >= 9 ? 'text-green-600' : 
                    overallAverage >= 7 ? 'text-blue-600' : 
                    overallAverage >= 6 ? 'text-amber-600' : 'text-red-600'}`}>
                    {overallAverage.toFixed(1)} / 10
                  </span>
                </div>
                <div className="flex-1">
                  <Progress 
                    value={overallAverage * 10} 
                    className="h-3 rounded-full" 
                    indicatorStyles={{
                      backgroundColor: overallAverage >= 9 ? '#059669' : 
                        overallAverage >= 7 ? '#2563eb' : 
                        overallAverage >= 6 ? '#d97706' : '#dc2626'
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">0.0</span>
                    <span className="text-sm text-gray-500">10.0</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tarjeta de asistencia - Solo mostrar si hay datos válidos */}
          {reportCard.attendance.total > 0 && (
            <Card className="rounded-xl shadow-sm bg-white p-4 border">
              <CardContent className="p-4">
                <h3 className="font-medium text-lg mb-3 text-gray-700">Asistencia</h3>
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#eaeaea"
                        strokeWidth="3"
                        strokeDasharray="100, 100"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={reportCard.attendance.percentage >= 90 ? '#10b981' : 
                          reportCard.attendance.percentage >= 80 ? '#3b82f6' : 
                          reportCard.attendance.percentage >= 70 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="3"
                        strokeDasharray={`${reportCard.attendance.percentage}, 100`}
                      />
                      <text x="18" y="20.5" textAnchor="middle" 
                        fill={
                        reportCard.attendance.percentage >= 90 ? '#059669' : 
                        reportCard.attendance.percentage >= 80 ? '#2563eb' : 
                        reportCard.attendance.percentage >= 70 ? '#d97706' : '#dc2626'
                      }
                        fontSize="10"
                        fontWeight="bold">
                        {reportCard.attendance.percentage}%
                      </text>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-700 mb-1">
                      <span className="font-semibold">{reportCard.attendance.present}</span> asistencias de <span className="font-semibold">{reportCard.attendance.total}</span> días
                    </div>
                    <Progress 
                      value={reportCard.attendance.percentage} 
                      className="h-3 rounded-full" 
                    indicatorStyles={{
                      backgroundColor: reportCard.attendance.percentage >= 90 ? '#10b981' : 
                        reportCard.attendance.percentage >= 80 ? '#3b82f6' : 
                        reportCard.attendance.percentage >= 70 ? '#f59e0b' : '#ef4444'
                    }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sección de calificaciones por materia */}
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Calificaciones por Materias</h2>
          
          {reportCard.reportCard.length === 0 ? (
            <Card className="rounded-xl shadow-sm bg-white p-8 border text-center">
              <div className="flex flex-col items-center justify-center py-6">
                <FileText className="h-16 w-16 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-600">Sin calificaciones registradas</h3>
                <p className="text-sm text-gray-500 max-w-md mt-2">
                  No se encontraron calificaciones para este estudiante en el período actual.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reportCard.reportCard.map((subjectData, index) => {
                const hasGrades = subjectData.periods.some(p => p.grades && p.grades.length > 0);
                const avgValue = safeAverageCalculation(subjectData.periods.map(p => p.average));
                
                return (
                  <Card key={index} className={`rounded-xl shadow-sm p-4 border overflow-hidden ${
                    hasGrades ? 'bg-white' : 'bg-gray-50 border-dashed border-2 border-gray-200'
                  }`}>
                    {/* Encabezado de materia con nombre y promedio general */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 px-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {!hasGrades && <span className="text-xl">🕓</span>}
                          <div className="w-2 h-10 bg-blue-600 rounded-full"></div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-700">{subjectData.subject.nombre}</h3>
                            {!hasGrades && (
                              <small className="text-gray-500 italic">
                                Periodo activo: Primer Bimestre — Calificaciones en espera
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Promedio general:</span>
                        {!hasGrades ? (
                          <div className="text-center">
                            <span className="text-sm text-gray-500 font-medium">📭 Sin calificaciones registradas aún</span>
                          </div>
                        ) : (
                          <span className={`text-lg font-bold ${
                            avgValue && avgValue >= 9 ? 'text-emerald-600' :
                            avgValue && avgValue >= 7 ? 'text-blue-600' :
                            avgValue && avgValue >= 6 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {safeGradeFormat(avgValue)}
                          </span>
                        )}
                      </div>
                    </div>
                  
                  {/* Tabla de periodos con pestañas */}
                  <div className="mt-4">
                    <div className="flex border-b">
                      {subjectData.periods.map((period, periodIndex) => (
                        <button 
                          key={periodIndex}
                          className={`px-4 py-2 text-sm font-medium ${
                            periodIndex === 0 ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                          }`}
                          onClick={() => {/* Implementación futura de pestañas */}}
                        >
                          {period.period}
                        </button>
                      ))}
                    </div>
                    
                    {/* Contenido de la pestaña activa (siempre mostrando el primer periodo por defecto) */}
                    <div className="p-4 bg-gray-50 rounded-b-lg">
                      {subjectData.periods.length > 0 && (
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Desglose por criterios</h4>
                              <div className="space-y-2">
                                {subjectData.periods[0].grades.map((grade, gradeIndex) => (
                                  <div key={gradeIndex} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                                    <span className="text-gray-700">{grade.rubro}</span>
                                    <Badge variant={Number(grade.valor) >= 7 ? "default" : "destructive"} className={`rounded-md px-2 py-1 ${Number(grade.valor) >= 7 ? "bg-emerald-500 text-white" : ""}`}>
                                      {Number(grade.valor).toFixed(1)}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex flex-col justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Promedio del periodo</h4>
                                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                                  <div className={`text-4xl font-bold ${
                                    subjectData.periods[0].average >= 9 ? 'text-emerald-600' :
                                    subjectData.periods[0].average >= 7 ? 'text-blue-600' :
                                    subjectData.periods[0].average >= 6 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {subjectData.periods[0].average.toFixed(1)}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">{subjectData.periods[0].period}</div>
                                </div>
                              </div>
                              
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Comparativa de periodos</h4>
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  {subjectData.periods.map((period, pIndex) => (
                                    <div key={pIndex} className="mb-2 last:mb-0">
                                      <div className="flex justify-between text-sm mb-1">
                                        <span>{period.period}</span>
                                        <span className={
                                          period.average >= 9 ? 'text-emerald-600' :
                                          period.average >= 7 ? 'text-blue-600' :
                                          period.average >= 6 ? 'text-amber-600' : 'text-red-600'
                                        }>{period.average.toFixed(1)}</span>
                                      </div>
                                      <Progress 
                                        value={period.average * 10} 
                                        className="h-2 rounded-full" 
                                        indicatorStyles={{
                                          backgroundColor: period.average >= 9 ? '#059669' : 
                                            period.average >= 7 ? '#2563eb' : 
                                            period.average >= 6 ? '#d97706' : '#dc2626'
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}