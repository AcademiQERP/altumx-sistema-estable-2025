import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { 
  ArrowLeft, 
  FileText, 
  FileBarChart,
  Printer, 
  Download, 
  RefreshCcw, 
  Sparkles, 
  Loader2,
  ChevronDown
} from "lucide-react";
import { formatDate } from "@/lib/dates";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { generateReportCardPDF } from "@/services/pdf-service";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

export default function ReportCardDetail() {
  const params = useParams();
  const studentId = params.id;
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estados para el diálogo de comentario académico
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [academicComment, setAcademicComment] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [teacherObservations, setTeacherObservations] = useState("");
  const [activePeriod, setActivePeriod] = useState<string | null>("2do Trimestre"); // Por defecto el 2do trimestre

  const { data: reportCard, isLoading, isError, refetch } = useQuery<ReportCardResponse>({
    queryKey: [`/api/report-cards/${studentId}`],
  });

  // Mutation para generar el comentario académico con IA
  const generateCommentMutation = useMutation({
    mutationFn: async (data: {
      idAlumno: number;
      periodo: string;
      calificaciones: Array<{ materiaId: number; valor: number }>;
      asistencia: number;
      observacionesDocente?: string;
    }) => {
      console.log("Enviando datos para generar comentario:", data);
      const response = await apiRequest(
        "POST",
        "/api/reportes/comentario-personalizado",
        data
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al generar comentario académico");
      }
      
      const result = await response.json();
      console.log("Respuesta del servidor:", result);
      return result;
    },
    onSuccess: (data) => {
      if (data && data.comentario) {
        console.log("Comentario generado correctamente");
        setAcademicComment(data.comentario);
      } else {
        console.error("La respuesta no contiene un comentario válido", data);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo generar un comentario válido"
        });
      }
    },
    onError: (error: Error) => {
      console.error("Error al generar comentario:", error);
      toast({
        variant: "destructive",
        title: "Error al generar comentario",
        description: error.message,
      });
    },
  });

  // Función para obtener periodos únicos de las materias
  const getUniquePeriods = (): string[] => {
    if (!reportCard?.reportCard) {
      console.log("No hay datos de boleta disponibles");
      return [];
    }
    
    // Array para almacenar periodos
    const periodsArray: string[] = [];
    
    // Extraer todos los periodos de todas las materias
    reportCard.reportCard.forEach(subject => {
      if (subject.periods && Array.isArray(subject.periods)) {
        subject.periods.forEach(period => {
          if (period.period) {
            periodsArray.push(period.period);
          }
        });
      }
    });
    
    // Eliminar duplicados convirtiéndolo a Set y luego de vuelta a Array
    const uniquePeriods = [...new Set(periodsArray)].sort();
    
    console.log("Periodos encontrados:", periodsArray);
    console.log("Periodos únicos:", uniquePeriods);
    
    return uniquePeriods;
  };

  // Función para abrir el diálogo de generación de comentario
  const handleGenerateComment = () => {
    const periods = getUniquePeriods();
    console.log("Periodos detectados al abrir el diálogo:", periods);
    
    // Asegurar que haya un periodo seleccionado al abrir el diálogo
    if (periods.length > 0) {
      setSelectedPeriod(periods[0]); // Seleccionar el primer periodo por defecto
    } else {
      console.log("No se encontraron periodos disponibles");
    }
    
    setShowCommentDialog(true);
  };

  // Función para generar el comentario con IA
  const handleConfirmGenerateComment = () => {
    if (!selectedPeriod || !reportCard) return;
    
    // Preparar datos para enviar a la API
    const calificaciones: Array<{ materiaId: number; valor: number }> = [];
    
    // Obtener las calificaciones promedio del periodo seleccionado para cada materia
    reportCard.reportCard.forEach(subject => {
      const periodData = subject.periods.find(p => p.period === selectedPeriod);
      if (periodData) {
        calificaciones.push({
          materiaId: subject.subject.id,
          valor: periodData.average
        });
      }
    });
    
    // Verificar si hay calificaciones para enviar
    if (calificaciones.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay calificaciones disponibles para el periodo seleccionado",
      });
      return;
    }
    
    // Llamar a la API
    generateCommentMutation.mutate({
      idAlumno: parseInt(studentId),
      periodo: selectedPeriod,
      calificaciones,
      asistencia: reportCard.attendance.percentage,
      observacionesDocente: teacherObservations.trim() || undefined
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
      const generatorName = user?.nombreCompleto || 'Administrador del Sistema';
      
      // Generar el PDF utilizando la función del servicio con las nuevas opciones
      generateReportCardPDF(reportCard, academicComment, generatorName, {
        institutionName: 'Altum Educación',
        institutionSlogan: 'Educación de excelencia para un futuro brillante',
        primaryColor: '#4361ee', // Azul principal que coincide con la interfaz web
        detailed: detailed, // Detallado o resumido según el parámetro
        footerText: 'Este documento fue generado digitalmente y no requiere firma autógrafa.',
        showTeacherSignature: true,
        verificationUrl: `https://altum.edu.mx/verifica/boleta/${reportCard.student.id}`
      });
      
      // Mostrar mensaje de éxito
      toast({
        title: "PDF generado correctamente",
        description: `La boleta académica ${detailed ? 'detallada' : 'resumida'} ha sido descargada como PDF`,
        variant: "success",
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
          <Link href="/boletas">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const student = reportCard.student;
  const overallAverage = getOverallAverage();

  return (
    <>
      {/* Barra superior con datos del estudiante - Encabezado moderno */}
      <div className="mb-6 flex flex-col">
        {/* Encabezado con gradiente y nombre del estudiante */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-400 rounded-xl text-white py-6 px-8 mb-4">
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
              <Badge variant={student.estatus === "activo" ? "success" : "secondary"} className={student.estatus === "activo" ? "bg-emerald-500 text-white border-0" : "bg-neutral-400 text-white border-0"}>
                {student.estatus === "activo" ? "Activo" : student.estatus}
              </Badge>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30" onClick={handleGenerateComment}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generar comentario con IA
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
        <div className="flex items-center text-sm mb-2 px-1">
          <Link href="/" className="text-primary">Inicio</Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/boletas" className="text-primary">Boletas</Link>
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
              <h3 className="font-medium text-lg mb-3 text-gray-700">Promedio General</h3>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center">
                      <span className={`text-5xl font-bold ${overallAverage >= 9 ? 'text-emerald-600' : 
                        overallAverage >= 7 ? 'text-blue-600' : 
                        overallAverage >= 6 ? 'text-amber-600' : 'text-red-600'}`}>
                        {overallAverage.toFixed(1)}
                      </span>
                      {/* Icono de tendencia - Se aplicaría lógica real en producción */}
                      <span className="ml-2 text-xl" title="Comparado con el trimestre anterior">
                        {overallAverage > 8.5 ? '🔼' : overallAverage < 7.5 ? '🔽' : '➖'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 mt-1">de 10.0</span>
                  </div>
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
              
              {/* Sección de Comentario Académico */}
              <div className="mt-4 border-t pt-4">
                <h3 className="font-medium text-lg mb-2 text-gray-700">Comentario Académico</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                  {academicComment ? (
                    <p className="text-sm text-gray-700">{academicComment}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No hay comentarios académicos registrados para este alumno.</p>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute top-2 right-2"
                    onClick={() => setShowCommentDialog(true)}
                  >
                    <span className="mr-1">🖊</span> Editar Comentario
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tarjeta de asistencia */}
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
              {reportCard.reportCard.map((subjectData, index) => (
                <Card key={index} className="rounded-xl shadow-sm bg-white p-4 border overflow-hidden">
                  {/* Encabezado de materia con nombre y promedio general */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 px-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-10 bg-blue-600 rounded-full"></div>
                      <h3 className="text-xl font-semibold text-gray-700">{subjectData.subject.nombre}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Promedio general:</span>
                      <span className={`text-lg font-bold ${
                        subjectData.periods.reduce((sum, p) => sum + p.average, 0) / subjectData.periods.length >= 9 ? 'text-emerald-600' :
                        subjectData.periods.reduce((sum, p) => sum + p.average, 0) / subjectData.periods.length >= 7 ? 'text-blue-600' :
                        subjectData.periods.reduce((sum, p) => sum + p.average, 0) / subjectData.periods.length >= 6 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {(subjectData.periods.reduce((sum, p) => sum + p.average, 0) / subjectData.periods.length).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Sección de Recomendación IA */}
                  <div className="mt-3 mb-2">
                    <div className="bg-gray-100 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start">
                        <span className="mr-2 text-xl">💡</span>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Recomendación IA <span className="text-xs text-gray-500 font-normal">(Próximamente)</span></h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Este espacio mostrará sugerencias personalizadas para apoyar al alumno en esta materia.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tabla de periodos con pestañas */}
                  <div className="mt-4">
                    <div className="flex border-b">
                      {subjectData.periods.map((period, periodIndex) => (
                        <button 
                          key={periodIndex}
                          className={`px-4 py-2 text-sm font-medium ${
                            activePeriod === period.period ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                          }`}
                          onClick={() => setActivePeriod(period.period)}
                        >
                          {period.period}
                        </button>
                      ))}
                    </div>
                    
                    {/* Contenido de la pestaña activa */}
                    <div className={`p-4 rounded-b-lg ${
                      activePeriod === "1er Trimestre" ? 'bg-[#E6F4EA]' : // Verde claro para 1er trimestre
                      activePeriod === "2do Trimestre" ? 'bg-[#E6F0FB]' : // Azul claro para 2do trimestre
                      activePeriod === "3er Trimestre" ? 'bg-[#F2F2F2]' : // Gris claro para 3er trimestre
                      'bg-gray-50'
                    }`}>
                      {subjectData.periods.length > 0 && (
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Desglose por criterios</h4>
                              <div className="space-y-2">
                                {/* Verificar si hay calificaciones para el periodo seleccionado */}
                                {(activePeriod ? 
                                  subjectData.periods.find(p => p.period === activePeriod)?.grades : 
                                  subjectData.periods[0].grades)?.length > 0 ? (
                                  // Mostrar calificaciones del periodo seleccionado o del primero por defecto
                                  (activePeriod ? 
                                    subjectData.periods.find(p => p.period === activePeriod)?.grades : 
                                    subjectData.periods[0].grades)?.map((grade, gradeIndex) => (
                                  <div key={gradeIndex} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                                    <span className="text-gray-700">{grade.rubro}</span>
                                    <Badge variant={Number(grade.valor) >= 7 ? "success" : "destructive"} className="rounded-md px-2 py-1">
                                      {Number(grade.valor).toFixed(1)}
                                    </Badge>
                                  </div>
                                ))) : (
                                  // Mostrar mensaje cuando no hay calificaciones en el trimestre seleccionado
                                  <div className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    <p className="text-gray-600 font-medium mb-1">No hay calificaciones disponibles</p>
                                    <p className="text-gray-500 text-sm text-center">No se han registrado calificaciones para este trimestre en esta materia.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Promedio del periodo</h4>
                                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                                  {(() => {
                                    // Obtener el periodo activo o usar el primero por defecto
                                    const displayPeriod = subjectData.periods.find(p => p.period === activePeriod) || subjectData.periods[0];
                                    return (
                                      <>
                                        <div className={`text-4xl font-bold ${
                                          displayPeriod.average >= 9 ? 'text-emerald-600' :
                                          displayPeriod.average >= 7 ? 'text-blue-600' :
                                          displayPeriod.average >= 6 ? 'text-amber-600' : 'text-red-600'
                                        }`}>
                                          {displayPeriod.average.toFixed(1)}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1">{displayPeriod.period}</div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Comparativa de periodos</h4>
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  {subjectData.periods.map((period, pIndex) => {
                                    // Definir color de fondo según el periodo
                                    const bgColor = 
                                      period.period.includes("1") ? "bg-[#E6F4EA]" : // Verde suave para 1er Trimestre
                                      period.period.includes("2") ? "bg-[#E6F0FB]" : // Azul suave para 2do Trimestre
                                      "bg-[#F2F2F2]"; // Gris claro para 3er Trimestre
                                    
                                    return (
                                      <div key={pIndex} className={`mb-2 last:mb-0 p-2 rounded-md ${bgColor}`}>
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
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diálogo para generar comentario académico */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              Generar comentario académico con IA
            </DialogTitle>
            <DialogDescription>
              Utiliza la inteligencia artificial para generar un comentario personalizado
              sobre el desempeño académico del estudiante.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Selector de periodo */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="period" className="text-right text-sm font-medium">
                Periodo
              </label>
              <select
                id="period"
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedPeriod || ""}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="" disabled>
                  Selecciona un periodo
                </option>
                {getUniquePeriods().map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Observaciones docente */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="observations" className="text-right text-sm font-medium">
                Observaciones adicionales
              </label>
              <Textarea
                id="observations"
                placeholder="Añade observaciones adicionales sobre el estudiante (opcional)"
                className="col-span-3 resize-none"
                value={teacherObservations}
                onChange={(e) => setTeacherObservations(e.target.value)}
              />
            </div>
            
            {/* Comentario generado */}
            {academicComment && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="comment" className="text-right text-sm font-medium">
                  Comentario generado
                </label>
                <Textarea
                  id="comment"
                  className="col-span-3 min-h-[120px]"
                  value={academicComment}
                  onChange={(e) => setAcademicComment(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            {generateCommentMutation.isPending ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </Button>
            ) : academicComment ? (
              <>
                <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => navigator.clipboard.writeText(academicComment)}>
                  Copiar al portapapeles
                </Button>
              </>
            ) : (
              <Button onClick={handleConfirmGenerateComment}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar comentario
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
