import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { downloadPDF } from "@/lib/export";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
// Importamos los servicios específicos para generar boletas y planes de recuperación
import { generateReportCardPDF } from "@/services/pdf-service";
import { generateRecoveryPlanPDF } from "@/services/recovery-plan-pdf";
import { generateParentReportPDF, downloadParentReport, sendParentReportByEmail } from "@/services/parent-report-pdf";
// Importamos el servicio de recomendaciones y su componente visual
import { generateRecommendations, getClaudeRecommendations } from "@/services/recommendations-service";
import { RecommendationBlock, Recommendation } from "@/components/observaciones/RecommendationBlock";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  LineChart, 
  ArrowLeft,
  Mail,
  BookOpen,
  History,
  FileBarChart,
  ScrollText,
  AlertTriangle,
  Download,
  Info as InfoIcon,
  Sparkles
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SubtemaEvaluacion {
  id: number;
  completado: boolean;
  comentario: string;
}

interface SubtemaCompleto extends SubtemaEvaluacion {
  titulo: string;
  descripcion: string;
}

interface Materia {
  id: number;
  nombre: string;
  promedio: number;
  estado: "optimo" | "satisfactorio" | "enProceso" | "inicial";
}

interface SeguimientoAlumno {
  id: number;
  nombre: string;
  grupoId: number;
  grupoNombre: string;
  nivel: string;
  promedio: number;
  estado: "completo" | "incompleto" | "sin_iniciar";
  progreso: {
    completados: number;
    total: number;
    porcentaje: number;
  };
  materias: Materia[];
  subtemas: {
    [materiaId: string]: SubtemaCompleto[];
  };
  periodosAnteriores?: {
    [periodoId: string]: {
      nombre: string;
      fecha: string;
      promedio: number;
      materias: {
        id: number;
        nombre: string;
        promedio: number;
      }[];
    }
  };
  reportesGenerados?: {
    id: string;
    nombre: string;
    fecha: string;
    tipo: string;
    url: string;
  }[];
}

// Color según el estado
const getEstadoMateriaColor = (estado: string) => {
  switch (estado) {
    case "optimo": return "bg-green-500";
    case "satisfactorio": return "bg-blue-500";
    case "enProceso": return "bg-yellow-500";
    case "inicial": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

// Etiqueta para el estado
const getEstadoMateriaLabel = (estado: string) => {
  switch (estado) {
    case "optimo": return "Óptimo";
    case "satisfactorio": return "Satisfactorio";
    case "enProceso": return "En Proceso";
    case "inicial": return "Inicial";
    default: return "No evaluado";
  }
};

// Interfaz para el plan de recuperación preliminar
interface RecoveryPlanPreview {
  student: {
    id: number;
    nombre: string;
    grupo: string;
    nivel: string;
  };
  teacher: string;
  date: string;
  materiasEnRiesgo: {
    nombre: string;
    promedio: number;
    estado: string;
    subtemas: {
      titulo: string;
      descripcion: string;
      completado: boolean;
      comentario: string;
    }[];
    periodos?: {
      numero: number;
      promedio: number;
      enRiesgo: boolean;
    }[];
    esParaFortalecimiento?: boolean; // Nuevo campo para indicar si es para fortalecimiento en vez de recuperación
  }[];
  recommendations: string[];
  goals: string[];
  // Nuevo campo para recomendaciones de IA
  aiRecommendations?: string;
  // Flags para casos especiales
  isTestStudent?: boolean;
  isIncomplete?: boolean;
  dataError?: boolean;
  errorMessage?: string;
}

export default function SeguimientoAlumnoPage() {
  const params = useParams();
  
  // Estados para recomendaciones con IA
  const [aiRecommendations, setAiRecommendations] = useState<string>("");
  const [isLoadingAiRecommendations, setIsLoadingAiRecommendations] = useState<boolean>(false);
  // Estados para informes para padres
  const [isGeneratingParentReport, setIsGeneratingParentReport] = useState<boolean>(false);
  const [isSendingParentReport, setIsSendingParentReport] = useState<boolean>(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth(); // Añadimos el hook para acceder a los datos del usuario autenticado
  const alumnoId = parseInt(params.id);
  
  // Pestaña actual
  const [activeTab, setActiveTab] = useState("progreso");
  
  // Estado para almacenar la vista previa del plan de recuperación
  const [recoveryPlanPreview, setRecoveryPlanPreview] = useState<RecoveryPlanPreview | null>(null);
  
  // Estado para controlar si se está generando la vista previa
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  // Estado para controlar si el alumno no requiere plan de recuperación
  const [noRecoveryPlanNeeded, setNoRecoveryPlanNeeded] = useState<{
    student: { id: number; nombre: string; grupo?: string; nivel?: string };
    teacher: string;
    date: string;
  } | null>(null);
  
  // Consulta para obtener los datos de seguimiento del alumno
  const { data: alumno, isLoading, error } = useQuery({
    queryKey: ['/api/academic-observer/seguimiento-alumno', alumnoId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/academic-observer/seguimiento-alumno/${alumnoId}`);
      if (!response.ok) {
        throw new Error("Error al obtener datos del alumno");
      }
      return response.json() as Promise<SeguimientoAlumno>;
    }
  });
  
  // Función para volver a la vista de grupo
  const volverAGrupo = () => {
    navigate("/profesor/observaciones/seguimiento-grupo");
  };

  // Función para cargar recomendaciones mediante IA (Claude)
  const loadAIRecommendations = async () => {
    if (!alumno) return;
    
    try {
      setIsLoadingAiRecommendations(true);
      
      // Crear un objeto StudentPerformance con los datos del alumno
      const studentData = {
        id: alumno.id,
        nombre: alumno.nombre,
        grado: alumno.grupoNombre || "No especificado",
        promedio: alumno.promedio / 10, // Convertir a escala de 10
        observacionesAdicionales: "",
        materias: alumno.materias.map(m => ({
          id: m.id,
          nombre: m.nombre,
          promedio: m.promedio / 10 // Convertir a escala de 10
        }))
      };
      
      // Llamar al servicio para generar recomendaciones con IA
      // La función ahora maneja internamente los fallbacks para desarrollo
      const aiRecomendacionesText = await getClaudeRecommendations(studentData);
      setAiRecommendations(aiRecomendacionesText);
    } catch (error) {
      console.error("Error en generateRecommendationsAI:", error);
      toast({
        title: "Error",
        description: "No se pudieron generar recomendaciones con IA. Se utilizará el sistema estándar.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAiRecommendations(false);
    }
  };
  
  // Efecto para cargar recomendaciones con IA cuando los datos del alumno estén disponibles
  useEffect(() => {
    if (alumno && alumno.id && !aiRecommendations && !isLoadingAiRecommendations) {
      // Cargar recomendaciones IA para TODOS los alumnos, incluso los de buen rendimiento
      // Ahora ya no filtramos por materias de bajo rendimiento
      loadAIRecommendations();
    }
  }, [alumno]);
  
  // Función para generar y descargar el informe para padres
  const handleDownloadParentReport = async () => {
    if (!alumno || !aiRecommendations) return;
    
    try {
      setIsGeneratingParentReport(true);
      
      // Crear un objeto con los datos del estudiante
      const studentData = {
        id: alumno.id,
        nombre: alumno.nombre,
        grado: alumno.grupoNombre || "No especificado",
        promedio: alumno.promedio / 10, // Convertir a escala de 10
        materias: alumno.materias.map(m => ({
          id: m.id,
          nombre: m.nombre,
          promedio: m.promedio / 10 // Convertir a escala de 10
        }))
      };
      
      // Obtener el nombre del profesor autenticado
      const teacherName = user?.nombreCompleto || "Docente";
      
      // Generar el PDF
      const doc = generateParentReportPDF(studentData, aiRecommendations, teacherName);
      
      // Descargar el PDF
      downloadParentReport(doc, alumno.nombre);
      
      toast({
        title: "Informe generado",
        description: "El informe para padres se ha generado y descargado correctamente.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al generar informe para padres:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el informe para padres. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingParentReport(false);
    }
  };
  
  // Función para enviar el informe por correo al tutor
  const handleSendParentReport = async () => {
    if (!alumno || !aiRecommendations || !alumno.tutorEmail) return;
    
    try {
      setIsSendingParentReport(true);
      
      // Crear un objeto con los datos del estudiante
      const studentData = {
        id: alumno.id,
        nombre: alumno.nombre,
        grado: alumno.grupoNombre || "No especificado",
        promedio: alumno.promedio / 10,
        materias: alumno.materias.map(m => ({
          id: m.id,
          nombre: m.nombre,
          promedio: m.promedio / 10
        }))
      };
      
      // Obtener el nombre del profesor autenticado
      const teacherName = user?.nombreCompleto || "Docente";
      
      // Generar el PDF (pero no lo descargamos)
      const doc = generateParentReportPDF(studentData, aiRecommendations, teacherName);
      
      // Enviar el PDF por correo usando nuestro servicio
      const result = await sendParentReportByEmail(
        doc,
        alumno.nombre,
        alumno.tutorEmail,
        teacherName
      );
      
      if (result.success) {
        toast({
          title: "Informe enviado",
          description: `El informe se ha enviado correctamente a ${alumno.tutorEmail}.`,
          variant: "default"
        });
      } else {
        throw new Error(result.message || "Error al enviar el informe");
      }
    } catch (error) {
      console.error("Error al enviar informe para padres:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el informe al tutor. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSendingParentReport(false);
    }
  };
  
  // Función para generar la vista previa del plan de recuperación
  const generarVistaPreviaRecuperacion = async () => {
    if (!alumno) return;
    
    setIsGeneratingPreview(true);
    try {
      // Validar si el alumno tiene estructura completa para generar un plan válido
      if (alumnoId > 5) {
        // Los IDs 6 y 7 son estudiantes de prueba sin estructura completa
        // En lugar de un error, configuramos un mensaje amigable en la tarjeta
        setRecoveryPlanPreview(null);
        setNoRecoveryPlanNeeded(null);
        
        toast({
          title: "Alumno de prueba",
          description: "Este alumno es un registro de prueba y no tiene datos académicos suficientes para generar un plan de recuperación.",
          variant: "warning",
        });
        
        // Mostrar mensaje de estructura insuficiente pero en formato de tarjeta amigable
        setRecoveryPlanPreview({
          student: {
            id: alumno.id,
            nombre: alumno.nombre,
            grupo: alumno.grupoNombre || "Sin grupo asignado",
            nivel: alumno.nivel || "No especificado"
          },
          teacher: user?.nombreCompleto || "Profesor",
          date: new Date().toISOString(),
          materiasEnRiesgo: [],
          recommendations: [],
          goals: [],
          isTestStudent: true // Propiedad especial para alumnos de prueba
        });
        
        setActiveTab("reportes");
        return;
      }
      
      // Si las materias del alumno están vacías, también mostrar mensaje amigable
      if (!alumno.materias || alumno.materias.length === 0) {
        setRecoveryPlanPreview({
          student: {
            id: alumno.id,
            nombre: alumno.nombre,
            grupo: alumno.grupoNombre || "Sin grupo asignado",
            nivel: alumno.nivel || "No especificado"
          },
          teacher: user?.nombreCompleto || "Profesor",
          date: new Date().toISOString(),
          materiasEnRiesgo: [],
          recommendations: [],
          goals: [],
          isIncomplete: true // Propiedad para alumnos sin datos completos
        });
        
        setActiveTab("reportes");
        return;
      }
      
      // Obtener datos académicos adicionales para el alumno
      const response = await apiRequest("GET", `/api/report-cards/${alumnoId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Crear una tarjeta visual en lugar de mostrar error
          setRecoveryPlanPreview({
            student: {
              id: alumno.id,
              nombre: alumno.nombre,
              grupo: alumno.grupoNombre || "Sin grupo asignado",
              nivel: alumno.nivel || "No especificado"
            },
            teacher: user?.nombreCompleto || "Profesor",
            date: new Date().toISOString(),
            materiasEnRiesgo: [],
            recommendations: [],
            goals: [],
            dataError: true, // Propiedad para error de datos
            errorMessage: `No se encontraron datos académicos para este estudiante.`
          });
          
          setActiveTab("reportes");
          return;
        }
        throw new Error("No se pudieron obtener los datos para el plan de recuperación");
      }
      
      const reportCardData = await response.json();
      
      // Identificar materias en riesgo (por debajo de 7.0 en cualquier periodo)
      let materiasEnRiesgo = reportCardData.reportCard
        .filter(subject => {
          // Verificar si algún periodo tiene promedio menor a 7.0
          // Normalizar promedios a base 10 si es necesario
          const tieneAlgunPeriodoEnRiesgo = subject.periods.some(period => {
            const promedio = period.average > 10 ? period.average / 10 : period.average; 
            return promedio < 7.0;
          });
          
          // También verificar el promedio general como precaución
          const promedioGeneral = subject.periods.reduce((sum, period) => {
            const promedio = period.average > 10 ? period.average / 10 : period.average;
            return sum + promedio;
          }, 0) / Math.max(1, subject.periods.length);
          
          return tieneAlgunPeriodoEnRiesgo || promedioGeneral < 7.0;
        })
        .map(subject => ({
          nombre: subject.subject.nombre,
          // Calculamos el promedio general para mostrarlo en la interfaz (normalizado a base 10)
          promedio: subject.periods.reduce((sum, period) => {
            const promedio = period.average > 10 ? period.average / 10 : period.average;
            return sum + promedio;
          }, 0) / Math.max(1, subject.periods.length),
          // Agregamos información de periodos individuales para mostrar cuáles están en riesgo
          periodos: subject.periods.map(period => ({
            numero: period.period,
            promedio: period.average > 10 ? period.average / 10 : period.average,
            enRiesgo: (period.average > 10 ? period.average / 10 : period.average) < 7.0
          }))
        }));
      
      // CAMBIO: Ahora todos los alumnos requieren plan de recuperación
      // Si no hay materias en riesgo, usamos todas las materias con buen rendimiento
      if (materiasEnRiesgo.length === 0) {
        // Pero incluimos todas las materias del alumno como "materias para fortalecimiento"
        materiasEnRiesgo = alumno.materias.map(subject => ({
          nombre: subject.nombre,
          promedio: subject.promedio,
          periodos: [{ numero: 1, promedio: subject.promedio, enRiesgo: false }],
          esParaFortalecimiento: true // Indicador de que es para fortalecimiento, no recuperación
        }));
      }
      
      // Siempre reiniciamos el estado de "no requiere plan"
      setNoRecoveryPlanNeeded(null);
      
      // Enriquecer con datos de subtemas y estado de Academic Observer
      const materiasCompletas = materiasEnRiesgo.map(materia => {
        // Buscar la materia correspondiente en los datos de Academic Observer
        const materiaAO = alumno.materias.find(m => m.nombre === materia.nombre);
        
        if (!materiaAO) {
          return {
            ...materia,
            estado: "inicial",
            subtemas: []
          };
        }
        
        // Obtener subtemas relacionados con esta materia
        const subtemasMateria = alumno.subtemas[materiaAO.id] || [];
        
        return {
          ...materia,
          estado: materiaAO.estado,
          subtemas: subtemasMateria
        };
      });
      
      // Obtener el nombre del profesor desde el contexto de autenticación
      const teacherName = user?.nombreCompleto || "Docente";
      
      // Crear el objeto de vista previa del plan
      const planPreview: RecoveryPlanPreview = {
        student: {
          id: alumno.id,
          nombre: alumno.nombre,
          grupo: alumno.grupoNombre,
          nivel: alumno.nivel
        },
        teacher: teacherName,
        date: new Date().toISOString(),
        materiasEnRiesgo: materiasCompletas,
        recommendations: [
          "Asistir a asesorías con el profesor de la materia",
          "Repasar los temas vistos en clase diariamente",
          "Realizar ejercicios adicionales de práctica",
          "Formar grupos de estudio con compañeros"
        ],
        goals: [
          "Mejorar la comprensión de los temas fundamentales",
          "Entregar todas las tareas pendientes",
          "Participar activamente en clase",
          "Aprobar los exámenes de recuperación"
        ],
        // Incluir recomendaciones de IA si están disponibles
        aiRecommendations: aiRecommendations || undefined
      };
      
      // Asegurar que se actualice el estado y la interfaz de usuario
      setRecoveryPlanPreview(planPreview);
      
      // Cambiar a la pestaña de reportes para mostrar la vista previa
      setActiveTab("reportes");
      
      toast({
        title: "Vista previa generada",
        description: "Se ha generado la vista previa del plan de recuperación académica.",
        variant: "success",
      });
      
      // Pequeño retraso para asegurar que React actualice el estado
      setTimeout(() => {
        const reportesTab = document.querySelector('[data-state="active"][value="reportes"]');
        if (reportesTab) {
          // Hacer scroll al contenedor de reportes si es necesario
          reportesTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
    } catch (error) {
      console.error("Error al generar vista previa del plan:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar la vista previa del plan de recuperación.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="sm" onClick={volverAGrupo}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a seguimiento grupal
          </Button>
          <Skeleton className="h-8 w-80" />
        </div>
        
        <div className="space-y-8">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }
  
  if (error || !alumno) {
    return (
      <div className="container py-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="sm" onClick={volverAGrupo}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a seguimiento grupal
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudieron cargar los datos del alumno. {error instanceof Error ? error.message : "Error desconocido"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="sm" onClick={volverAGrupo}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a seguimiento grupal
        </Button>
        <h1 className="text-2xl font-bold">Seguimiento Individual: {alumno.nombre}</h1>
      </div>
      
      {/* Encabezado con información del alumno */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{alumno.nombre}</CardTitle>
              <CardDescription>
                Grupo: {alumno.grupoNombre} • Nivel: {alumno.nivel}
              </CardDescription>
            </div>
            <Badge className={
              alumno.estado === "completo" ? "bg-green-500" :
              alumno.estado === "incompleto" ? "bg-yellow-500" :
              "bg-red-500"
            }>
              {alumno.estado === "completo" ? "Evaluación Completa" :
               alumno.estado === "incompleto" ? "Evaluación Incompleta" :
               "Sin Evaluar"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Promedio General</p>
              <div className="flex items-center">
                <div className="text-2xl font-bold mr-2">{(alumno.promedio > 10 ? alumno.promedio / 10 : alumno.promedio).toFixed(1)}</div>
                <Badge className={
                  (alumno.promedio > 10 ? alumno.promedio / 10 : alumno.promedio) >= 9.0 ? "bg-green-500" :
                  (alumno.promedio > 10 ? alumno.promedio / 10 : alumno.promedio) >= 8.0 ? "bg-blue-500" :
                  (alumno.promedio > 10 ? alumno.promedio / 10 : alumno.promedio) >= 7.0 ? "bg-yellow-500" :
                  "bg-red-500"
                }>
                  {(alumno.promedio > 10 ? alumno.promedio / 10 : alumno.promedio) >= 9.0 ? "Óptimo" :
                   (alumno.promedio > 10 ? alumno.promedio / 10 : alumno.promedio) >= 8.0 ? "Satisfactorio" :
                   (alumno.promedio > 10 ? alumno.promedio / 10 : alumno.promedio) >= 7.0 ? "En Proceso" :
                   "Inicial"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Progreso de Evaluación</p>
              <div className="space-y-1">
                <Progress value={alumno.progreso.porcentaje} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {alumno.progreso.completados} de {alumno.progreso.total} subtemas ({alumno.progreso.porcentaje}%)
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Reportes Generados</p>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{alumno.reportesGenerados?.length || 0} documentos</Badge>
                <Button variant="ghost" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  Ver todos
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Pestañas para diferentes vistas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="progreso">
            <BarChart className="h-4 w-4 mr-2" />
            Progreso General
          </TabsTrigger>
          <TabsTrigger value="subtemas">
            <BookOpen className="h-4 w-4 mr-2" />
            Evaluación por Subtemas
          </TabsTrigger>
          <TabsTrigger value="historial">
            <History className="h-4 w-4 mr-2" />
            Historial Comparativo
          </TabsTrigger>
          <TabsTrigger value="reportes">
            <FileBarChart className="h-4 w-4 mr-2" />
            Reportes Generados
          </TabsTrigger>
        </TabsList>
        
        {/* Contenido de la pestaña Progreso General */}
        <TabsContent value="progreso" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Desempeño por Materias</CardTitle>
              <CardDescription>Resumen del rendimiento académico por materia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Listado de materias */}
                {alumno.materias.map(materia => (
                  <div key={materia.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{materia.nombre}</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-lg font-bold">{(materia.promedio / 10).toFixed(1)}</div>
                        <Badge className={getEstadoMateriaColor(materia.estado)}>
                          {getEstadoMateriaLabel(materia.estado)}
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={materia.promedio} 
                      max={100}
                      className={`h-2 ${
                        materia.estado === "optimo" ? "bg-green-100" :
                        materia.estado === "satisfactorio" ? "bg-blue-100" :
                        materia.estado === "enProceso" ? "bg-yellow-100" :
                        "bg-red-100"
                      }`}
                    />
                    <div className="text-xs text-muted-foreground">
                      Subtemas evaluados: {
                        alumno.subtemas[materia.id]?.filter(s => s.completado).length || 0
                      } de {alumno.subtemas[materia.id]?.length || 0}
                    </div>
                    
                    {/* Mostrar recomendaciones si el promedio es menor a 7.0 */}
                    {materia.promedio < 70 && (
                      <div className="mt-4">
                        {/* Generar recomendaciones para esta materia específica */}
                        <RecommendationBlock 
                          recommendations={generateRecommendations(materia.nombre, materia.promedio/10)}
                          compact={true}
                        />
                      </div>
                    )}
                    <Separator className="my-2" />
                  </div>
                ))}
                
                {/* Card única para recomendaciones IA y botón de informe para padres */}
                <Card className="mt-8 border border-primary/20 shadow-md">
                  <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardTitle className="text-lg flex gap-2 items-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span>🎓 Recomendación Académica Generada con IA</span>
                    </CardTitle>
                    <CardDescription>
                      Este informe resume el progreso académico general del estudiante e incluye recomendaciones personalizadas generadas por inteligencia artificial.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Bloque de recomendaciones IA */}
                    <div className="mb-6 bg-primary/5 p-4 rounded-md border border-primary/10">
                      <div className="whitespace-pre-line text-sm leading-relaxed">
                        {isLoadingAiRecommendations ? (
                          <div className="flex items-center gap-2 justify-center py-6">
                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                            <span>Generando recomendaciones personalizadas...</span>
                          </div>
                        ) : (
                          aiRecommendations
                        )}
                      </div>
                    </div>
                    
                    {/* Botones para generar informe para padres (versión consolidada) */}
                    {!isLoadingAiRecommendations && (
                      <div className="flex gap-3 justify-end">
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2"
                          onClick={handleDownloadParentReport}
                          disabled={isGeneratingParentReport || isSendingParentReport}
                        >
                          {isGeneratingParentReport ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                              <span>Generando informe...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              <span>📄 Descargar Informe para Padres</span>
                            </>
                          )}
                        </Button>
                        
                        {/* Solo mostrar si hay correo del tutor registrado */}
                        {alumno?.tutorEmail && (
                          <Button 
                            variant="default" 
                            className="flex items-center gap-2"
                            onClick={handleSendParentReport}
                            disabled={isGeneratingParentReport || isSendingParentReport}
                          >
                            {isSendingParentReport ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Enviando por email...</span>
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4" />
                                <span>Enviar al Tutor</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contenido de la pestaña Evaluación por Subtemas */}
        <TabsContent value="subtemas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evaluación Detallada por Subtemas</CardTitle>
              <CardDescription>Observaciones específicas por cada área evaluada</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {alumno.materias.map(materia => (
                  <AccordionItem key={materia.id} value={`materia-${materia.id}`}>
                    <AccordionTrigger className="px-4">
                      <div className="flex items-center">
                        <span className="font-medium">{materia.nombre}</span>
                        <Badge className={`ml-2 ${getEstadoMateriaColor(materia.estado)}`}>
                          {getEstadoMateriaLabel(materia.estado)}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subtema</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Comentario</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alumno.subtemas[materia.id]?.map(subtema => (
                            <TableRow key={subtema.id}>
                              <TableCell className="font-medium">{subtema.titulo}</TableCell>
                              <TableCell className="text-sm">{subtema.descripcion}</TableCell>
                              <TableCell>
                                {subtema.completado ? (
                                  <Badge className="bg-green-500">Completado</Badge>
                                ) : (
                                  <Badge variant="outline">Pendiente</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {subtema.comentario || "Sin comentarios"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contenido de la pestaña Historial Comparativo */}
        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial Académico</CardTitle>
              <CardDescription>Comparativa de rendimiento a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              {alumno.periodosAnteriores ? (
                <div className="space-y-8">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Materia</TableHead>
                          {Object.entries(alumno.periodosAnteriores).map(([periodoId, periodo]) => (
                            <TableHead key={periodoId}>{periodo.nombre}</TableHead>
                          ))}
                          <TableHead>Actual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alumno.materias.map(materia => (
                          <TableRow key={materia.id}>
                            <TableCell className="font-medium">{materia.nombre}</TableCell>
                            {Object.entries(alumno.periodosAnteriores || {}).map(([periodoId, periodo]) => {
                              const historicaMateria = periodo.materias.find(m => m.id === materia.id);
                              return (
                                <TableCell key={periodoId}>
                                  {historicaMateria ? (
                                    <div className="flex items-center space-x-2">
                                      <span>{(historicaMateria.promedio > 10 ? historicaMateria.promedio / 10 : historicaMateria.promedio).toFixed(1)}</span>
                                    </div>
                                  ) : "N/A"}
                                </TableCell>
                              );
                            })}
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold">{(materia.promedio > 10 ? materia.promedio / 10 : materia.promedio).toFixed(1)}</span>
                                <Badge className={getEstadoMateriaColor(materia.estado)}>
                                  {getEstadoMateriaLabel(materia.estado)}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-bold">Promedio General</TableCell>
                          {Object.entries(alumno.periodosAnteriores || {}).map(([periodoId, periodo]) => (
                            <TableCell key={periodoId} className="font-bold">
                              {(periodo.promedio > 10 ? periodo.promedio / 10 : periodo.promedio).toFixed(1)}
                            </TableCell>
                          ))}
                          <TableCell className="font-bold">{(alumno.promedio > 10 ? alumno.promedio / 10 : alumno.promedio).toFixed(1)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Análisis de Tendencia</h3>
                    <div className="text-sm text-muted-foreground">
                      <p>Este análisis muestra la evolución del rendimiento académico a lo largo del tiempo.</p>
                      <p className="mt-2">Se recomienda revisar materias con tendencia a la baja.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTitle>Sin historial disponible</AlertTitle>
                  <AlertDescription>
                    No hay periodos anteriores registrados para este alumno.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contenido de la pestaña Reportes Generados */}
        <TabsContent value="reportes" className="space-y-6">
          {/* Componente que muestra cuando NO se requiere plan de recuperación */}
          {noRecoveryPlanNeeded && (
            <Card>
              <CardHeader className="bg-green-50 border-b border-green-100">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                      Plan de Fortalecimiento Académico
                    </CardTitle>
                    <CardDescription>
                      Generado el {new Date(noRecoveryPlanNeeded.date).toLocaleDateString()} por {noRecoveryPlanNeeded.teacher}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    Estrategias de desarrollo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Estudiante:</p>
                    <p className="font-medium">{noRecoveryPlanNeeded.student.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Grupo:</p>
                    <p className="font-medium">{noRecoveryPlanNeeded.student.grupo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nivel:</p>
                    <p className="font-medium">{noRecoveryPlanNeeded.student.nivel}</p>
                  </div>
                </div>
                
                <Alert className="mb-6 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>Plan de fortalecimiento académico</AlertTitle>
                  <AlertDescription>
                    Este alumno tiene un buen desempeño académico con todas sus materias aprobadas satisfactoriamente.
                    Para continuar con su desarrollo, se recomienda implementar un plan de fortalecimiento académico 
                    que consolide y potencialice sus logros actuales.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2 mb-6">
                  <h4 className="font-medium">Criterios aplicados:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>Calificaciones por debajo de 7.0 se consideran de riesgo</li>
                    <li>Se evalúan todas las materias del periodo actual</li>
                    <li>Se consideran las evaluaciones de todos los criterios</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 bg-gray-50 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center"
                  onClick={() => {
                    // Generar comprobante PDF de rendimiento satisfactorio
                    const doc = new jsPDF();
                    const pageWidth = doc.internal.pageSize.width;
                    
                    // Encabezado
                    doc.setFillColor(41, 171, 135); // Color verde
                    doc.rect(0, 0, pageWidth, 40, "F");
                    
                    // Título
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(18);
                    doc.setFont("helvetica", "bold");
                    doc.text("PLAN DE FORTALECIMIENTO ACADÉMICO", pageWidth / 2, 20, { align: "center" });
                    
                    doc.setFontSize(14);
                    doc.text("Estrategias para el Desarrollo Continuo", pageWidth / 2, 30, { align: "center" });
                    
                    // Información del estudiante
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "normal");
                    
                    doc.text(`Estudiante: ${noRecoveryPlanNeeded.student.nombre}`, 20, 60);
                    doc.text(`Grupo: ${noRecoveryPlanNeeded.student.grupo}`, 20, 70);
                    doc.text(`Nivel: ${noRecoveryPlanNeeded.student.nivel}`, 20, 80);
                    doc.text(`Fecha: ${new Date(noRecoveryPlanNeeded.date).toLocaleDateString()}`, 20, 90);
                    doc.text(`Docente: ${noRecoveryPlanNeeded.teacher}`, 20, 100);
                    
                    // Mensaje principal
                    doc.setFillColor(240, 249, 244); // Color verde muy claro
                    doc.setDrawColor(41, 171, 135); // Borde verde
                    doc.roundedRect(20, 120, pageWidth - 40, 85, 3, 3, "FD");
                    
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(41, 171, 135);
                    doc.text("PLAN DE FORTALECIMIENTO ACADÉMICO", pageWidth / 2, 135, { align: "center" });
                    
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(0, 0, 0);
                    doc.text("El alumno presenta un rendimiento satisfactorio en todas las materias.", 30, 150);
                    doc.text("Se recomienda fortalecer sus habilidades mediante las siguientes estrategias:", 30, 160);
                    doc.text("• Participación en proyectos extracurriculares según área de interés", 30, 175);
                    doc.text("• Actividades de enriquecimiento académico", 30, 185);
                    doc.text("• Desarrollo de habilidades de liderazgo e investigación", 30, 195);
                    
                    // Criterios aplicados
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.text("Criterios aplicados:", 20, 190);
                    
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    doc.text("• Calificaciones por debajo de 7.0 se consideran de riesgo", 30, 200);
                    doc.text("• Se evalúan todas las materias del periodo actual", 30, 210);
                    doc.text("• Se consideran las evaluaciones de todos los criterios", 30, 220);
                    
                    // Firma
                    doc.line(pageWidth / 2 - 40, 260, pageWidth / 2 + 40, 260);
                    doc.setFontSize(10);
                    doc.text(noRecoveryPlanNeeded.teacher, pageWidth / 2, 270, { align: "center" });
                    doc.text("Docente", pageWidth / 2, 275, { align: "center" });
                    
                    // Guardar el documento
                    doc.save(`Plan_Fortalecimiento_${noRecoveryPlanNeeded.student.nombre.replace(/\s+/g, '_')}.pdf`);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar plan de fortalecimiento
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Vista previa del plan de recuperación cuando está disponible */}
          {recoveryPlanPreview && (
            <Card>
              <CardHeader className={`bg-amber-50 border-b ${recoveryPlanPreview.isTestStudent || recoveryPlanPreview.isIncomplete || recoveryPlanPreview.dataError ? 'border-gray-200' : 'border-amber-100'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {recoveryPlanPreview.isTestStudent || recoveryPlanPreview.isIncomplete || recoveryPlanPreview.dataError ? (
                        <InfoIcon className="h-5 w-5 mr-2 text-blue-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                      )}
                      Evaluación de Rendimiento
                    </CardTitle>
                    <CardDescription>
                      Creado el {new Date(recoveryPlanPreview.date).toLocaleDateString()} por {recoveryPlanPreview.teacher}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={
                    recoveryPlanPreview.isTestStudent || recoveryPlanPreview.isIncomplete || recoveryPlanPreview.dataError
                      ? "text-blue-600 border-blue-200 bg-blue-50"
                      : "text-amber-600 border-amber-200 bg-amber-50"
                  }>
                    {recoveryPlanPreview.isTestStudent || recoveryPlanPreview.isIncomplete || recoveryPlanPreview.dataError
                      ? "Información"
                      : "Requiere atención"
                    }
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Estudiante:</p>
                    <p className="font-medium">{recoveryPlanPreview.student.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Grupo:</p>
                    <p className="font-medium">{recoveryPlanPreview.student.grupo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nivel:</p>
                    <p className="font-medium">{recoveryPlanPreview.student.nivel}</p>
                  </div>
                </div>
                
                {/* Condición para estudiantes de prueba */}
                {recoveryPlanPreview.isTestStudent && (
                  <Alert className="mb-6 bg-blue-50 border-blue-200">
                    <InfoIcon className="h-4 w-4 text-blue-500" />
                    <AlertTitle>Estudiante de prueba</AlertTitle>
                    <AlertDescription>
                      Este alumno es un registro de prueba y no tiene datos académicos suficientes para generar un plan de recuperación. Los estudiantes con ID mayor a 5 son considerados registros de prueba.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Condición para estudiantes sin datos completos */}
                {recoveryPlanPreview.isIncomplete && (
                  <Alert className="mb-6 bg-blue-50 border-blue-200">
                    <InfoIcon className="h-4 w-4 text-blue-500" />
                    <AlertTitle>Datos académicos incompletos</AlertTitle>
                    <AlertDescription>
                      Este alumno no tiene información académica completa. Se requiere registrar materias y calificaciones para poder generar un plan de recuperación.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Condición para error de datos */}
                {recoveryPlanPreview.dataError && (
                  <Alert className="mb-6 bg-blue-50 border-blue-200">
                    <InfoIcon className="h-4 w-4 text-blue-500" />
                    <AlertTitle>Error de datos</AlertTitle>
                    <AlertDescription>
                      {recoveryPlanPreview.errorMessage || "No se pudieron obtener los datos académicos necesarios para generar el plan de recuperación."}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Caso normal: mostrar alerta de plan de recuperación o fortalecimiento */}
                {!recoveryPlanPreview.isTestStudent && !recoveryPlanPreview.isIncomplete && !recoveryPlanPreview.dataError && (
                  <Alert className={`mb-6 ${
                    // Si todas las materias son para fortalecimiento, usar fondo verde. De lo contrario, usar fondo ámbar (alertas)
                    recoveryPlanPreview.materiasEnRiesgo.every(m => m.esParaFortalecimiento) 
                      ? "bg-green-50 border-green-200" 
                      : "bg-amber-50 border-amber-200"
                  }`}>
                    {recoveryPlanPreview.materiasEnRiesgo.every(m => m.esParaFortalecimiento) 
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : <AlertTriangle className="h-4 w-4 text-amber-500" />
                    }
                    <AlertTitle>
                      {recoveryPlanPreview.materiasEnRiesgo.every(m => m.esParaFortalecimiento)
                        ? "Plan de fortalecimiento académico"
                        : "Se requiere plan de recuperación"
                      }
                    </AlertTitle>
                    <AlertDescription>
                      {recoveryPlanPreview.materiasEnRiesgo.every(m => m.esParaFortalecimiento)
                        ? "Este alumno tiene un buen desempeño académico. El plan incluirá recomendaciones para fortalecer y mantener su rendimiento actual."
                        : "Este alumno tiene materias o periodos específicos con calificación por debajo del mínimo requerido (7.0). Se recomienda implementar un plan de recuperación académica enfocado en los periodos y subtemas de bajo rendimiento."
                      }
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Materias incluidas en el plan (recuperación o fortalecimiento) - solo mostrar si hay datos válidos */}
                {!recoveryPlanPreview.isTestStudent && !recoveryPlanPreview.isIncomplete && !recoveryPlanPreview.dataError && recoveryPlanPreview.materiasEnRiesgo.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      {recoveryPlanPreview.materiasEnRiesgo.every(m => m.esParaFortalecimiento) 
                        ? "MATERIAS PARA FORTALECIMIENTO ACADÉMICO"
                        : "MATERIAS QUE REQUIEREN RECUPERACIÓN"
                      }
                    </h3>
                    <div className="space-y-4">
                      {recoveryPlanPreview.materiasEnRiesgo.map((materia, idx) => (
                        <div key={idx} className="border rounded-md p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">{materia.nombre}</h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold">{(materia.promedio > 10 ? materia.promedio / 10 : materia.promedio).toFixed(1)}</span>
                              <Badge className={
                                materia.estado === "optimo" ? "bg-green-500" :
                                materia.estado === "satisfactorio" ? "bg-blue-500" :
                                materia.estado === "enProceso" ? "bg-yellow-500" :
                                "bg-red-500"
                              }>
                                {getEstadoMateriaLabel(materia.estado)}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Mostrar información de periodos en riesgo */}
                          {materia.periodos && materia.periodos.length > 0 && (
                            <div className="mt-2 mb-3">
                              <p className="text-sm text-muted-foreground mb-2">Periodos con bajo rendimiento:</p>
                              <div className="flex flex-wrap gap-2">
                                {materia.periodos.map((periodo, pidx) => (
                                  periodo.enRiesgo && (
                                    <Badge key={pidx} variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                      Periodo {periodo.numero}: {(periodo.promedio > 10 ? periodo.promedio / 10 : periodo.promedio).toFixed(1)}
                                    </Badge>
                                  )
                                ))}
                                {!materia.periodos.some(p => p.enRiesgo) && (
                                  <span className="text-xs text-muted-foreground italic">
                                    Promedio general bajo, pero ningún periodo específico en riesgo
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Mostrar subtemas relevantes */}
                          {materia.subtemas && materia.subtemas.length > 0 ? (
                            <div className="mt-2">
                              <p className="text-sm text-muted-foreground mb-2">Subtemas a reforzar:</p>
                              <div className="ml-4 space-y-2">
                                {materia.subtemas.map((subtema, sidx) => (
                                  <div key={sidx} className="flex items-start">
                                    <div className="min-w-4 mt-1 mr-2">
                                      {!subtema.completado ? (
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{subtema.titulo}</p>
                                      <p className="text-xs text-muted-foreground">{subtema.descripcion}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No hay subtemas específicos identificados.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recomendaciones y objetivos - solo mostrar si hay datos válidos */}
                {!recoveryPlanPreview.isTestStudent && !recoveryPlanPreview.isIncomplete && !recoveryPlanPreview.dataError && (
                  <>
                    {/* Recomendaciones Personalizadas */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">📌 RECOMENDACIONES PERSONALIZADAS</h3>
                      
                      {/* Generamos recomendaciones automáticas en tiempo real para la vista previa */}
                      {(() => {
                        // Datos del estudiante para generar recomendaciones
                        const studentData = {
                          id: recoveryPlanPreview.student.id,
                          nombre: recoveryPlanPreview.student.nombre,
                          promedio: recoveryPlanPreview.materiasEnRiesgo.reduce((sum, mat) => sum + mat.promedio, 0) / 
                                   Math.max(1, recoveryPlanPreview.materiasEnRiesgo.length),
                          materias: recoveryPlanPreview.materiasEnRiesgo.map(mat => ({
                            id: 0, // Sin ID confiable usamos 0
                            nombre: mat.nombre,
                            promedio: mat.promedio
                          }))
                        };
                        
                        // Generar recomendaciones personalizadas
                        const recommendations = generateRecommendations(studentData);
                        
                        return (
                          <div className="mt-4 space-y-4">
                            <RecommendationBlock recommendations={recommendations} />
                          </div>
                        );
                      })()}
                      
                      {/* Añadir sección de recomendaciones IA si están disponibles */}
                      {recoveryPlanPreview.aiRecommendations && (
                        <div className="mt-6 relative">
                          <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center">
                            <span className="text-blue-600 mr-1">📌</span> RECOMENDACIONES IA
                          </h3>
                          
                          <div className="rounded-lg overflow-hidden border border-blue-200 shadow-md">
                            {/* Encabezado con degradado */}
                            <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 flex items-center">
                              <Sparkles className="h-5 w-5 text-white mr-2" />
                              <h4 className="text-white font-medium text-base">Recomendaciones generadas por Claude</h4>
                            </div>
                            
                            {/* Contenido con fondo claro */}
                            <div className="bg-blue-50 p-5 border-l-4 border-blue-400">
                              <div className="whitespace-pre-line text-sm text-slate-800 leading-relaxed">
                                {recoveryPlanPreview.aiRecommendations}
                              </div>
                              <div className="mt-4 flex items-center text-xs text-slate-500 bg-white p-2 rounded-md shadow-sm">
                                <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full h-5 w-5 mr-2">
                                  <Sparkles className="h-3 w-3" />
                                </span>
                                <span className="italic">
                                  Análisis personalizado basado en el rendimiento académico - Generado con Inteligencia Artificial
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Indicador visual de elemento IA */}
                          <div className="absolute -top-2 -right-2 bg-blue-100 text-blue-800 rounded-full p-1 shadow">
                            <Sparkles className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                      
                      {/* Mantener recomendaciones generales como respaldo si las hay */}
                      {recoveryPlanPreview.recommendations && recoveryPlanPreview.recommendations.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2">RECOMENDACIONES GENERALES</h4>
                          <ul className="ml-5 space-y-1 list-disc">
                            {recoveryPlanPreview.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-sm">{typeof rec === 'string' ? rec : rec.descripcion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {/* Objetivos */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">OBJETIVOS DEL PLAN</h3>
                      <ul className="ml-5 space-y-1 list-disc">
                        {recoveryPlanPreview.goals.map((goal, idx) => (
                          <li key={idx} className="text-sm">{goal}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                
                {/* Criterios aplicados - mostrar en todos los casos para consistencia */}
                <div className="space-y-2 mb-6">
                  <h4 className="font-medium">Criterios aplicados:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>Calificaciones por debajo de 7.0 se consideran de riesgo</li>
                    <li>Se evalúan todas las materias del periodo actual</li>
                    <li>Se consideran las evaluaciones de todos los criterios</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3 bg-gray-50 border-t">
                {/* Mensaje informativo sobre estado de IA */}
                {!recoveryPlanPreview.isTestStudent && !recoveryPlanPreview.isIncomplete && !recoveryPlanPreview.dataError && (
                  <div className="w-full pt-1">
                    {recoveryPlanPreview.aiRecommendations ? (
                      <div className="flex items-center text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                        <span className="mr-1">✅</span> Este PDF incluirá recomendaciones generadas por IA (Claude)
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                        <span className="mr-1">⚠️</span> Este PDF no incluirá IA debido a conexión inactiva
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex w-full justify-end space-x-2 pt-2">
                  <Button variant="outline" onClick={() => setRecoveryPlanPreview(null)}>
                    Cerrar
                  </Button>
                  
                  {/* Solo mostrar los botones de descarga si es un plan de recuperación real */}
                  {!recoveryPlanPreview.isTestStudent && !recoveryPlanPreview.isIncomplete && !recoveryPlanPreview.dataError && (
                    <>
                      {/* Función para generar PDF con configuraciones específicas */}
                      {(() => {
                        // Función compartida para generar el PDF
                        const generatePDF = (includeAI: boolean) => {
                          // Construir el objeto de datos para el plan de recuperación y generar PDF
                          const studentData = {
                            id: recoveryPlanPreview.student.id,
                            nombre: recoveryPlanPreview.student.nombre,
                            promedio: recoveryPlanPreview.materiasEnRiesgo.reduce((sum, mat) => sum + mat.promedio, 0) / recoveryPlanPreview.materiasEnRiesgo.length,
                            materias: recoveryPlanPreview.materiasEnRiesgo.map(mat => ({
                              id: 0, // Como los datos no tienen ID confiable, usamos 0
                              nombre: mat.nombre,
                              promedio: mat.promedio
                            }))
                          };
                          
                          // Generar recomendaciones automáticas
                          const autoRecommendations = generateRecommendations(studentData);
                          
                          const recoveryPlanData = {
                            student: {
                              ...recoveryPlanPreview.student,
                              promedio: studentData.promedio
                            },
                            teacher: recoveryPlanPreview.teacher,
                            subjects: recoveryPlanPreview.materiasEnRiesgo.map(m => ({
                              nombre: m.nombre,
                              promedio: m.promedio
                            })),
                            date: recoveryPlanPreview.date,
                            recommendations: autoRecommendations, // Usamos las recomendaciones automáticas
                            goals: recoveryPlanPreview.goals,
                            autoGenerateRecommendations: false, // Ya generamos las recomendaciones aquí
                            // Incluir recomendaciones de IA solo si se solicita
                            aiRecommendations: includeAI ? recoveryPlanPreview.aiRecommendations : undefined
                          };
                          
                          // Generar el PDF con los datos validados
                          generateRecoveryPlanPDF(recoveryPlanData);
                          
                          toast({
                            title: "Plan generado",
                            description: includeAI && recoveryPlanPreview.aiRecommendations
                              ? "Plan de recuperación con IA generado correctamente."
                              : "Plan de recuperación sin IA generado correctamente.",
                            variant: "success",
                          });
                        };
                        
                        // Verificar si hay recomendaciones de IA disponibles
                        const aiAvailable = !!recoveryPlanPreview.aiRecommendations;
                        
                        return (
                          <>
                            {/* Botón principal para descargar con IA (si disponible) */}
                            <Button 
                              className="flex items-center" 
                              onClick={() => generatePDF(true)}
                              variant={aiAvailable ? "default" : "outline"}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {aiAvailable 
                                ? "Generar PDF con IA" 
                                : "Generar PDF"}
                            </Button>
                            
                            {/* Botón alternativo para generar sin IA, solo mostrar si IA está disponible */}
                            {aiAvailable && (
                              <Button 
                                className="flex items-center" 
                                variant="outline" 
                                onClick={() => generatePDF(false)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Generar sin IA
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>
          )}
          
          {/* Reportes y documentos existentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ScrollText className="h-5 w-5 mr-2 text-muted-foreground" />
                Reportes y Documentos Previos
              </CardTitle>
              <CardDescription>Historial de documentos generados para este alumno</CardDescription>
            </CardHeader>
            <CardContent>
              {alumno.reportesGenerados && alumno.reportesGenerados.length > 0 ? (
                <div className="space-y-4">
                  {alumno.reportesGenerados.map(reporte => (
                    <Card key={reporte.id} className="overflow-hidden">
                      <div className="flex items-center p-4">
                        <div className="mr-4">
                          {reporte.tipo === 'boleta' ? (
                            <ScrollText className="h-10 w-10 text-blue-500" />
                          ) : reporte.tipo === 'recuperacion' ? (
                            <FileBarChart className="h-10 w-10 text-yellow-500" />
                          ) : (
                            <FileText className="h-10 w-10 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{reporte.nombre}</h4>
                          <p className="text-sm text-muted-foreground">
                            Generado el {new Date(reporte.fecha).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertTitle>Sin reportes disponibles</AlertTitle>
                  <AlertDescription>
                    No hay reportes generados para este alumno.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Generar Nuevo Reporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    className="w-full flex items-center justify-center" 
                    variant="outline"
                    onClick={async () => {
                      toast({
                        title: "Generando boleta",
                        description: "La boleta de calificaciones se está generando...",
                      });
                      
                      try {
                        // Obtener datos completos del alumno para la boleta
                        // Usamos params.id para acceder al parámetro de la URL
                        const alumnoId = Number(params.id);
                        const response = await apiRequest("GET", `/api/report-cards/${alumnoId}`);
                        
                        if (!response.ok) {
                          throw new Error("No se pudieron obtener los datos para la boleta");
                        }
                        
                        const reportCardData = await response.json();
                        
                        // Nombre del profesor desde el contexto de autenticación
                        const teacherName = user?.nombreCompleto || "Docente";
                        
                        // Generar la boleta usando el servicio adecuado
                        generateReportCardPDF(
                          reportCardData,
                          `Observaciones generadas automáticamente para ${alumno.nombre}`,
                          teacherName,
                          {
                            detailed: true,
                            institutionName: "Altum Educación",
                            institutionSlogan: "Educación de excelencia",
                            primaryColor: "#1F3C88",
                            footerText: "Documento oficial generado por el sistema de gestión académica",
                            showTeacherSignature: true
                          }
                        );
                        
                        toast({
                          title: "Boleta generada",
                          description: "La boleta de calificaciones se ha generado correctamente.",
                          variant: "success",
                        });
                      } catch (error) {
                        console.error("Error al generar boleta:", error);
                        toast({
                          title: "Error",
                          description: "No se pudo generar la boleta de calificaciones. Los datos podrían no estar disponibles.",
                          variant: "destructive",
                        });
                        
                        // Como fallback, generamos un PDF simple con los datos disponibles
                        // Usamos los datos del alumno obtenidos de la consulta a academic-observer
                        downloadPDF(`Boleta_${alumno.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
                      }
                      
                      // Mantenemos la pestaña actual
                      setActiveTab("reportes");
                    }}
                  >
                    <ScrollText className="h-4 w-4 mr-2" />
                    Generar Boleta de Calificaciones
                  </Button>
                  <Button 
                    className="w-full flex items-center justify-center" 
                    variant="outline"
                    onClick={() => generarVistaPreviaRecuperacion()}
                    disabled={isGeneratingPreview}
                  >
                    <FileBarChart className="h-4 w-4 mr-2" />
                    {isGeneratingPreview ? "Generando vista previa..." : "Plan de Recuperación"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
  
  // Efecto para generar automáticamente la vista previa del plan cuando se cargan los datos del alumno
  useEffect(() => {
    if (alumno && !recoveryPlanPreview && !noRecoveryPlanNeeded && !isGeneratingPreview) {
      // Generamos automáticamente el plan para tenerlo listo cuando el usuario lo necesite
      generarVistaPreviaRecuperacion();
    }
  }, [alumno, recoveryPlanPreview, noRecoveryPlanNeeded, isGeneratingPreview]);
}