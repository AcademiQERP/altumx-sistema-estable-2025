import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  LayoutGrid, 
  ListFilter, 
  BarChart as BarChartIcon, 
  Table as TableIcon, 
  AlertCircle, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  FileText,
  LineChart,
  Filter,
  Check,
  FileWarning,
  Info,
  Sparkles,
  AlertTriangle,
  FileOutput,
  Receipt as ReceiptIcon
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EvaluacionDialog } from "@/components/observaciones/EvaluacionDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { GradeDisplay, getCategoryIcon, getCategoryLabel } from "@/components/grades/GradeDisplay";
import RecommendationBlock from "@/components/observaciones/RecommendationBlock";
import { generarPlanRecuperacionPDF as generarPDF, verificarRecomendacionesIA, type AlumnoData } from "@/functions/recuperacion-academica";
import { generateRecommendations } from "@/services/recommendations-service";

// Tipo para los filtros de reportes
type ReportFilters = {
  soloEvaluacionCompleta: boolean;
  requierenPlanRecuperacion: boolean;
  noRequierenPlanRecuperacion: boolean;
  promedioMinimo: number;
};

// Tipo para el resumen de reportes
type ReportSummary = {
  totalAlumnos: number;
  totalBoletas: number;
  totalPlanesRecuperacion: number;
  promedioGeneral: number;
  alumnosSeleccionados: Alumno[];
};

// Tipos para el seguimiento grupal
type Alumno = {
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
  materias: {
    id: number;
    nombre: string;
    promedio: number;
  }[];
  // Propiedad calculada que se determina en base al rendimiento
  requierePlanRecuperacion?: boolean;
};

type DistribucionNivel = {
  optimo: number;       // 90-100
  satisfactorio: number; // 80-89
  enProceso: number;     // 70-79
  inicial: number;       // <70
};

type MateriaSeguimiento = {
  id: number;
  nombre: string;
  promedio: number;
  distribucion: DistribucionNivel;
};

type SeguimientoGrupal = {
  totalAlumnos: number;
  resumen: {
    evaluacionCompleta: number;
    evaluacionIncompleta: number;
    sinIniciar: number;
    totalSubtemas: number;
  };
  materias: MateriaSeguimiento[];
  grupos: {
    id: number;
    nombre: string;
    nivel: string;
  }[];
  alumnos: Alumno[];
};

// Componente principal
export default function SeguimientoGrupoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Función para navegar a la vista detallada de un alumno
  const verDetalleAlumno = (alumnoId: number) => {
    navigate(`/profesor/seguimiento/alumno/${alumnoId}`);
  };
  
  // Función para verificar y obtener recomendaciones IA para un alumno
  const obtenerRecomendacionesIA = async (alumno: Alumno) => {
    // Mapeo del objeto alumno al tipo esperado por la función
    const alumnoData: AlumnoData = {
      id: alumno.id,
      nombre: alumno.nombre,
      promedio: alumno.promedio,
      requierePlanRecuperacion: alumno.requierePlanRecuperacion,
      materias: alumno.materias.map(mat => ({
        id: mat.id,
        nombre: mat.nombre,
        promedio: mat.promedio
      }))
    };
    
    try {
      // Utilizar la función del módulo externo
      const recomendaciones = await verificarRecomendacionesIA(alumnoData, alumnosRecomendacionesAI);
      
      // Actualizar el estado con las recomendaciones obtenidas
      if (recomendaciones) {
        setAlumnosRecomendacionesAI(prev => ({
          ...prev,
          [alumno.id]: recomendaciones
        }));
      }
      
      return recomendaciones;
    } catch (error) {
      console.error("Error al obtener recomendaciones AI:", 
        error instanceof Error ? error.message : "Error desconocido");
      
      // Marcar como null para evitar intentos repetidos
      setAlumnosRecomendacionesAI(prev => ({
        ...prev,
        [alumno.id]: null
      }));
      
      return null;
    }
  };
  
  // Función para generar PDF de plan de recuperación con/sin IA
  const generarPlanPDF = async (alumno: Alumno, includeAI = true) => {
    // Todos los alumnos pueden tener plan de recuperación, sin importar sus calificaciones
    // Se eliminó la validación que impedía generar planes para alumnos con buen promedio
    
    // Mapeo del objeto alumno al tipo esperado por la función
    const alumnoData: AlumnoData = {
      id: alumno.id,
      nombre: alumno.nombre,
      promedio: alumno.promedio,
      requierePlanRecuperacion: alumno.requierePlanRecuperacion,
      materias: alumno.materias.map(mat => ({
        id: mat.id,
        nombre: mat.nombre,
        promedio: mat.promedio
      }))
    };
    
    // Generar el plan de recuperación usando la función del módulo externo
    await generarPDF(
      alumnoData,
      user?.nombreCompleto || "Docente",
      includeAI,
      alumnosRecomendacionesAI,
      (message) => {
        toast({
          title: "Plan generado",
          description: includeAI 
            ? "Plan de recuperación con IA generado correctamente." 
            : "Plan de recuperación sin IA generado correctamente."
        });
        
        // Actualizar estado local con las recomendaciones generadas si fueron incluidas
        if (includeAI) {
          obtenerRecomendacionesIA(alumno);
        }
      },
      (errorMessage) => {
        toast({
          title: "Error",
          description: "No se pudo generar el plan de recuperación. Intente de nuevo.",
          variant: "destructive"
        });
      }
    );
  };
  
  // Estado para filtros generales
  const [filtros, setFiltros] = useState(() => {
    // Intentar cargar filtros del localStorage
    const savedFilters = localStorage.getItem('seguimiento-grupo-filtros');
    if (savedFilters) {
      try {
        return JSON.parse(savedFilters);
      } catch (e) {
        console.error("Error al parsear filtros guardados:", e);
      }
    }
    // Valores por defecto
    return {
      grupoId: "todos",
      nivel: "",
      periodo: "",
      materiaId: "",
      estadoEvaluacion: "" // Estado de evaluación: "" | "completo" | "incompleto" | "sin_iniciar"
    };
  });
  
  const [vistaActual, setVistaActual] = useState<"tabla" | "tarjetas">("tarjetas");
  
  // Estado para el diálogo de evaluación
  const [evaluacionDialogOpen, setEvaluacionDialogOpen] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  
  // Estado para almacenar recomendaciones IA por alumno - Cache de resultados
  const [alumnosRecomendacionesAI, setAlumnosRecomendacionesAI] = useState<Record<number, any>>({});
  
  // Estados para los filtros de reportes y diálogos
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilters>(() => {
    // Intentar cargar filtros del localStorage
    const savedReportFilters = localStorage.getItem('seguimiento-grupo-reportFilters');
    if (savedReportFilters) {
      try {
        return JSON.parse(savedReportFilters);
      } catch (e) {
        console.error("Error al parsear filtros de reporte guardados:", e);
      }
    }
    // Valores por defecto
    return {
      soloEvaluacionCompleta: false,
      requierenPlanRecuperacion: false,
      noRequierenPlanRecuperacion: false,
      promedioMinimo: 0
    };
  });
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  
  // Estado para almacenar los alumnos filtrados que se mostrarán en la interfaz
  const [alumnosFiltrados, setAlumnosFiltrados] = useState<Alumno[]>([]);

  // Consulta para obtener los datos de seguimiento grupal
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/academic-observer/seguimiento-grupo", filtros],
    queryFn: async () => {
      // Construimos los parámetros para la consulta, omitiendo los vacíos
      const params = new URLSearchParams();
      if (filtros.grupoId) params.append("grupoId", filtros.grupoId);
      if (filtros.nivel) params.append("nivel", filtros.nivel);
      if (filtros.periodo) params.append("periodo", filtros.periodo);
      if (filtros.materiaId) params.append("materiaId", filtros.materiaId);

      const url = `/api/academic-observer/seguimiento-grupo${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await apiRequest("GET", url);
      if (!response.ok) {
        throw new Error("Error al cargar datos de seguimiento");
      }
      return response.json() as Promise<SeguimientoGrupal>;
    },
  });
  
  // Función para garantizar que TODOS los alumnos tengan plan de recuperación
  // independientemente de sus calificaciones
  const asegurarPlanesRecuperacion = (alumnos: Alumno[]) => {
    // Ahora todos los alumnos tienen plan de recuperación
    return alumnos.map(alumno => {
      return {
        ...alumno,
        requierePlanRecuperacion: true
      };
    });
  };

  // Efecto para aplicar los filtros automáticamente cuando los datos están disponibles
  useEffect(() => {
    if (data && data.alumnos) {
      // Aplicar los filtros predeterminados automáticamente
      let alumnos = filtrarAlumnos();
      
      // Asegurar que algunos alumnos tengan plan de recuperación
      alumnos = asegurarPlanesRecuperacion(alumnos);
      
      // Actualizar el estado
      setAlumnosFiltrados(alumnos);
      
      // Pre-cargar recomendaciones de IA para los primeros 2 alumnos que requieren plan
      const alumnosConPlan = alumnos.filter(a => a.requierePlanRecuperacion);
      const alumnosAProcesar = alumnosConPlan.slice(0, 2); // Limitar a 2 para no sobrecargar
      
      // Simular que ya tenemos recomendaciones para el primer alumno (visualización inmediata)
      if (alumnosAProcesar.length > 0) {
        const primerAlumno = alumnosAProcesar[0];
        
        // Solo si no tenemos recomendaciones ya
        if (!alumnosRecomendacionesAI[primerAlumno.id]) {
          console.log(`Precargando recomendaciones IA para ${primerAlumno.nombre}`);
          
          // Actualizar inmediatamente para que se vea la UI
          setAlumnosRecomendacionesAI(prev => ({
            ...prev,
            [primerAlumno.id]: "Recomendaciones precargadas para visualización"
          }));
          
          // Luego intentar cargar las recomendaciones reales
          obtenerRecomendacionesIA(primerAlumno)
            .catch(err => console.error(`Error al precargar recomendaciones: ${err}`));
        }
      }
    }
  }, [data, reportFilters, filtros]);
  
  // Efecto para guardar los filtros en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('seguimiento-grupo-filtros', JSON.stringify(filtros));
  }, [filtros]);
  
  // Efecto para guardar los filtros de reporte en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('seguimiento-grupo-reportFilters', JSON.stringify(reportFilters));
  }, [reportFilters]);
  
  // Efecto para precargar recomendaciones de IA para alumnos que requieren plan
  useEffect(() => {
    if (data && !isLoading) {
      const alumnosConPlan = data.alumnos.filter(alumno => 
        alumno.requierePlanRecuperacion && 
        !alumnosRecomendacionesAI[alumno.id]
      );
      
      if (alumnosConPlan.length > 0) {
        // Precargar solo para el primer alumno que necesita plan de recuperación
        // para no sobrecargar el servidor con múltiples solicitudes
        obtenerRecomendacionesIA(alumnosConPlan[0]);
        
        // Mostrar mensaje informativo
        toast({
          title: "Recomendaciones IA",
          description: "Precargando recomendaciones de IA para plan de recuperación",
          variant: "default",
        });
      }
    }
  }, [data, isLoading, alumnosRecomendacionesAI]);

  // Funciones para exportar reportes individuales y grupales
  const exportarReporteIndividual = async (alumno: Alumno) => {
    if (!alumno) return;
    
    try {
      // Importar dinámicamente el servicio para evitar cargar jsPDF innecesariamente
      const { generarReporteIndividualPDF } = await import('@/services/seguimiento-grupo-pdf');
      
      // Ahora siempre incluimos recomendaciones, independientemente del promedio
      const requiereRecomendaciones = true;
      
      // Generar el PDF individual siempre con recomendaciones
      const pdfDoc = generarReporteIndividualPDF(alumno, undefined, true);
      
      // Guardar el PDF
      pdfDoc.save(`reporte-${alumno.nombre.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
      
      toast({
        title: "Reporte individual generado",
        description: `El reporte con recomendaciones personalizadas para ${alumno.nombre} ha sido exportado correctamente a PDF`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error al generar el PDF del reporte individual:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte individual en PDF. Inténtelo de nuevo más tarde.",
        variant: "destructive",
      });
    }
  };

  // Función para determinar si un alumno requiere plan de recuperación académica
  const requierePlanRecuperacion = (alumno: Alumno): boolean => {
    // Ahora todos los alumnos requieren plan de recuperación, sin importar su promedio
    return true;
  };
  
  // Función para filtrar los alumnos según los criterios actuales
  const filtrarAlumnos = () => {
    if (!data || !data.alumnos || data.alumnos.length === 0) {
      return [];
    }
    
    // Aplicar los filtros
    let alumnos = [...data.alumnos];
    
    // Calcular propiedad requierePlanRecuperacion para cada alumno
    alumnos = alumnos.map(alumno => ({
      ...alumno,
      requierePlanRecuperacion: requierePlanRecuperacion(alumno)
    }));
    
    // 0. Filtrar por grupo seleccionado
    if (filtros.grupoId && filtros.grupoId !== "todos") {
      const grupoIdNum = parseInt(filtros.grupoId);
      alumnos = alumnos.filter(a => a.grupoId === grupoIdNum);
    }
    
    // 1. Filtrar por evaluación completa
    if (reportFilters.soloEvaluacionCompleta) {
      alumnos = alumnos.filter(a => a.estado === "completo");
    }
    
    // 2. Filtrar por promedio mínimo
    if (reportFilters.promedioMinimo > 0) {
      alumnos = alumnos.filter(a => a.promedio >= reportFilters.promedioMinimo);
    }
    
    // 3. Filtrar por planes de recuperación
    const alumnosConPlanRecuperacion = alumnos.filter(a => 
      a.materias.some(m => m.promedio < 7.0)
    );
    
    const alumnosSinPlanRecuperacion = alumnos.filter(a => 
      !a.materias.some(m => m.promedio < 7.0)
    );
    
    // Aplicar filtros de plan de recuperación
    if (reportFilters.requierenPlanRecuperacion && reportFilters.noRequierenPlanRecuperacion) {
      return alumnos;
    } else if (reportFilters.requierenPlanRecuperacion) {
      return alumnosConPlanRecuperacion;
    } else if (reportFilters.noRequierenPlanRecuperacion) {
      return alumnosSinPlanRecuperacion;
    }
    
    // Si no hay filtros específicos de plan de recuperación activos, mostrar todos los alumnos
    return alumnos;
  };

  // Función para mostrar el diálogo de filtros previo a la generación de reportes
  const mostrarDialogoFiltros = () => {
    if (!data || !data.alumnos || data.alumnos.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay alumnos disponibles para generar reportes.",
        variant: "destructive"
      });
      return;
    }

    // Verificar que haya alumnos con evaluación completa
    const alumnosCompletos = data.alumnos.filter(a => a.estado === "completo");
    if (alumnosCompletos.length === 0) {
      toast({
        title: "Sin evaluaciones completas",
        description: "No hay alumnos con evaluación completa para generar reportes.",
        variant: "destructive"
      });
      return;
    }
    
    // Mostrar el diálogo de filtros
    setShowFilterDialog(true);
  };
  
  // Función para calcular el resumen de reportes basado en los filtros aplicados
  const calcularResumenReportes = () => {
    if (!data || !data.alumnos || data.alumnos.length === 0) return null;
    
    // Aplicar filtros
    let alumnosFiltrados = [...data.alumnos];
    
    // 1. Filtrar por evaluación completa
    if (reportFilters.soloEvaluacionCompleta) {
      alumnosFiltrados = alumnosFiltrados.filter(a => a.estado === "completo");
    }
    
    // 2. Filtrar por promedio mínimo
    if (reportFilters.promedioMinimo > 0) {
      alumnosFiltrados = alumnosFiltrados.filter(a => a.promedio >= reportFilters.promedioMinimo);
    }
    
    // 3. Filtrar por planes de recuperación
    const alumnosConPlanRecuperacion = alumnosFiltrados.filter(a => 
      a.materias.some(m => m.promedio < 7.0)
    );
    
    const alumnosSinPlanRecuperacion = alumnosFiltrados.filter(a => 
      !a.materias.some(m => m.promedio < 7.0)
    );
    
    let alumnosSeleccionados: Alumno[] = [];
    
    if (reportFilters.requierenPlanRecuperacion && reportFilters.noRequierenPlanRecuperacion) {
      alumnosSeleccionados = [...alumnosFiltrados];
    } else if (reportFilters.requierenPlanRecuperacion) {
      alumnosSeleccionados = [...alumnosConPlanRecuperacion];
    } else if (reportFilters.noRequierenPlanRecuperacion) {
      alumnosSeleccionados = [...alumnosSinPlanRecuperacion];
    }
    
    // 4. Filtrar alumnos de prueba (ID > 5)
    alumnosSeleccionados = alumnosSeleccionados.filter(a => a.id <= 5);
    
    // Calcular el promedio general
    const promedioGeneral = alumnosSeleccionados.length > 0 
      ? alumnosSeleccionados.reduce((sum, a) => sum + a.promedio, 0) / alumnosSeleccionados.length 
      : 0;
    
    // Generar el resumen
    return {
      totalAlumnos: alumnosSeleccionados.length,
      totalBoletas: alumnosSeleccionados.length,
      totalPlanesRecuperacion: alumnosSeleccionados.filter(a => 
        a.materias.some(m => m.promedio < 7.0)
      ).length,
      promedioGeneral,
      alumnosSeleccionados
    };
  };
  
  // Función para confirmar los filtros y mostrar el resumen
  const confirmarFiltros = () => {
    const resumen = calcularResumenReportes();
    if (!resumen || resumen.totalAlumnos === 0) {
      toast({
        title: "Sin resultados",
        description: "No hay alumnos que cumplan con los filtros seleccionados.",
        variant: "destructive"
      });
      setShowFilterDialog(false);
      return;
    }
    
    setReportSummary(resumen);
    setShowFilterDialog(false);
    setShowSummaryDialog(true);
  };
  
  // Función para generar los reportes masivos con los filtros aplicados
  const generarReportesMasivos = async () => {
    if (!reportSummary || reportSummary.alumnosSeleccionados.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay alumnos seleccionados para generar reportes.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Mostrar toast de inicio del proceso
      toast({
        title: "Preparando reportes...",
        description: `Iniciando generación de reportes para ${reportSummary.alumnosSeleccionados.length} alumnos`,
      });

      // Importar dinámicamente JSZip
      const { default: JSZip } = await import('jszip');

      const zip = new JSZip();
      let reportesGenerados = 0;
      let reportesOmitidos = 0;
      let errores: string[] = [];

      // Crear una carpeta para las boletas y otra para los planes de recuperación
      const carpetaBoletas = zip.folder("boletas_academicas") || zip;
      const carpetaPlanes = zip.folder("planes_recuperacion") || zip;

      // Identificar el nombre del grupo actual
      const grupoActual = filtros.grupoId && filtros.grupoId !== "todos" && data?.grupos 
        ? data.grupos.find(g => g.id.toString() === filtros.grupoId) 
        : null;
      const nombreGrupo = grupoActual?.nombre || "Todos los grupos";
      
      // Para cada alumno seleccionado
      for (const alumno of reportSummary.alumnosSeleccionados) {
        try {
          // Generar el archivo de texto con el enlace a la boleta
          const nombreArchivoLimpio = alumno.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const enlaceBoleta = `/report-cards/${alumno.id}`;
          
          const contenidoBoleta = `
-----------------------------------------
BOLETA ACADÉMICA: ${alumno.nombre}
-----------------------------------------
Grupo: ${alumno.grupoNombre}
Promedio general: ${alumno.promedio.toFixed(1)} ${
  alumno.promedio >= 9 ? "✅ Óptimo" :
  alumno.promedio >= 8 ? "🟦 Satisfactorio" :
  alumno.promedio >= 7 ? "⚠️ En proceso" :
  alumno.promedio >= 6 ? "🚨 Bajo" : "❌ Crítico"
}
Estado de evaluación: ${alumno.estado}
Materias evaluadas: ${alumno.materias.length}

Para ver e imprimir la boleta completa, visite:
${window.location.origin}${enlaceBoleta}

Documento generado el: ${new Date().toLocaleDateString('es-MX')}
-----------------------------------------`;
          
          carpetaBoletas.file(
            `BoletaAcademica_${nombreArchivoLimpio}.txt`, 
            contenidoBoleta
          );
          
          // Si tiene materias con promedio menor a 7, generar plan de recuperación
          const materiasBajo7 = alumno.materias.filter(m => m.promedio < 7.0);
          if (materiasBajo7.length > 0) {
            try {
              const enlacePlan = `/teacher/plan-recuperacion?studentId=${alumno.id}`;
              const contenidoPlan = `
-----------------------------------------
PLAN DE RECUPERACIÓN: ${alumno.nombre}
-----------------------------------------
Materias que requieren recuperación:
${materiasBajo7.map(m => `- ${m.nombre}: ${m.promedio.toFixed(1)} ${ 
  m.promedio >= 9 ? "🌟" : 
  m.promedio >= 8 ? "✅" : 
  m.promedio >= 7 ? "⚠️" : "🔴"
}`).join('\n')}

Para ver e imprimir el plan de recuperación completo, visite:
${window.location.origin}${enlacePlan}

Documento generado el: ${new Date().toLocaleDateString('es-MX')}
-----------------------------------------`;

              carpetaPlanes.file(
                `PlanRecuperacion_${nombreArchivoLimpio}.txt`, 
                contenidoPlan
              );
            } catch (error) {
              console.error(`Error al procesar plan de recuperación para ${alumno.nombre}:`, error);
            }
          }

          reportesGenerados++;
        } catch (error) {
          console.error(`Error al generar reportes para el alumno ${alumno.nombre}:`, error);
          errores.push(alumno.nombre);
          reportesOmitidos++;
        }
      }

      // Añadir un archivo README con instrucciones
      zip.file("README.txt", 
`ÍNDICE DE REPORTES DEL GRUPO ${nombreGrupo}
-------------------------------------------

Este archivo ZIP contiene enlaces para acceder a las boletas académicas
y planes de recuperación de los alumnos del grupo.

INSTRUCCIONES DE USO:
1. Para visualizar una boleta académica, abra el archivo correspondiente
   en la carpeta "boletas_academicas" y haga clic en el enlace proporcionado.
2. Para visualizar un plan de recuperación, abra el archivo correspondiente
   en la carpeta "planes_recuperacion" y haga clic en el enlace proporcionado.

Fecha de generación: ${new Date().toLocaleDateString('es-MX')}
`);

      // Crear un archivo index.html con interfaz mejorada
      const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Índice de Reportes - ${nombreGrupo}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    
    /* Estilos para las calificaciones */
    .grade-optimo {
      background-color: #e9f7ef;
      color: #16a34a;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .grade-satisfactorio {
      background-color: #e6f2ff;
      color: #3b82f6;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .grade-enproceso {
      background-color: #fef9e7;
      color: #eab308;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .grade-inicial {
      background-color: #fdedec;
      color: #ef4444;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    h1 {
      color: #2563EB;
      border-bottom: 2px solid #E5E7EB;
      padding-bottom: 10px;
    }
    h2 {
      color: #4B5563;
      margin-top: 25px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .summary {
      background-color: #F3F4F6;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .summary-item {
      background-color: white;
      border-radius: 6px;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-item h3 {
      margin-top: 0;
      color: #4B5563;
      font-size: 16px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #2563EB;
    }
    .student-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .student-table th, .student-table td {
      border: 1px solid #E5E7EB;
      padding: 12px 15px;
      text-align: left;
    }
    .student-table th {
      background-color: #F9FAFB;
      font-weight: bold;
    }
    .student-table tr:nth-child(even) {
      background-color: #F3F4F6;
    }
    .student-table tr:hover {
      background-color: #EFF6FF;
    }
    .links {
      display: flex;
      gap: 10px;
    }
    .btn {
      display: inline-block;
      padding: 6px 12px;
      background-color: #2563EB;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
    }
    .btn:hover {
      background-color: #1D4ED8;
    }
    .btn-secondary {
      background-color: #6B7280;
    }
    .btn-secondary:hover {
      background-color: #4B5563;
    }
    .btn-print {
      background-color: #059669;
    }
    .btn-print:hover {
      background-color: #047857;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 14px;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
      padding-top: 20px;
    }
    @media print {
      .no-print {
        display: none;
      }
      body {
        padding: 0;
        font-size: 12px;
      }
      .student-table {
        font-size: 11px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reportes Académicos - ${nombreGrupo}</h1>
    <button onclick="window.print()" class="btn btn-print no-print">Imprimir Índice</button>
  </div>
  
  <div class="summary">
    <h2>Resumen de Reportes</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <h3>Total de Alumnos</h3>
        <div class="summary-value">${reportSummary.totalAlumnos}</div>
      </div>
      <div class="summary-item">
        <h3>Boletas Generadas</h3>
        <div class="summary-value">${reportesGenerados}</div>
      </div>
      <div class="summary-item">
        <h3>Planes de Recuperación</h3>
        <div class="summary-value">${reportSummary.totalPlanesRecuperacion}</div>
      </div>
      <div class="summary-item">
        <h3>Promedio General</h3>
        <div class="summary-value ${
          reportSummary.promedioGeneral >= 9 ? "grade-optimo" :
          reportSummary.promedioGeneral >= 8 ? "grade-satisfactorio" :
          reportSummary.promedioGeneral >= 7 ? "grade-enproceso" : "grade-inicial"
        }">${reportSummary.promedioGeneral.toFixed(1)} ${
          reportSummary.promedioGeneral >= 9 ? "🌟" :
          reportSummary.promedioGeneral >= 8 ? "✅" :
          reportSummary.promedioGeneral >= 7 ? "⚠️" : "🔴"
        }</div>
      </div>
    </div>
  </div>
  
  <h2>Listado de Alumnos</h2>
  <table class="student-table">
    <thead>
      <tr>
        <th>Alumno</th>
        <th>Grupo</th>
        <th>Promedio</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      ${reportSummary.alumnosSeleccionados.map(alumno => {
        const tienePlanRecuperacion = alumno.materias.some(m => m.promedio < 7.0);
        return `
        <tr>
          <td>${alumno.nombre}</td>
          <td>${alumno.grupoNombre}</td>
          <td class="${
            alumno.promedio >= 9 ? "grade-optimo" :
            alumno.promedio >= 8 ? "grade-satisfactorio" :
            alumno.promedio >= 7 ? "grade-enproceso" : "grade-inicial"
          }">${alumno.promedio.toFixed(1)} ${
            alumno.promedio >= 9 ? "🌟" :
            alumno.promedio >= 8 ? "✅" :
            alumno.promedio >= 7 ? "⚠️" : "🔴"
          }</td>
          <td>${alumno.estado === 'completo' ? 'Completo' : alumno.estado === 'incompleto' ? 'Incompleto' : 'Sin iniciar'}</td>
          <td class="links">
            <a href="${window.location.origin}/report-cards/${alumno.id}" class="btn" target="_blank">Boleta</a>
            ${tienePlanRecuperacion ? 
              `<a href="${window.location.origin}/teacher/plan-recuperacion?studentId=${alumno.id}" class="btn btn-secondary" target="_blank">Plan</a>` : 
              ''}
          </td>
        </tr>
      `}).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Reportes generados el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}</p>
    <p>Sistema de Gestión Académica Altum</p>
  </div>
</body>
</html>
`;

      zip.file("index.html", htmlTemplate);

      // Generar el ZIP
      const content = await zip.generateAsync({ type: "blob" });
      
      // Crear un enlace para descargar el ZIP
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reportes-grupo-${nombreGrupo.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Cerrar el diálogo de resumen
      setShowSummaryDialog(false);
      
      // Mostrar un toast con el resultado
      toast({
        title: "Exportación completada",
        description: `Se generaron ${reportesGenerados} reportes correctamente. ${reportesOmitidos > 0 ? `${reportesOmitidos} reportes fueron omitidos.` : ''}`,
      });
    } catch (error) {
      console.error("Error al generar los reportes masivos:", error);
      toast({
        title: "Error en la exportación",
        description: "Ocurrió un error al generar los reportes masivos. Inténtelo de nuevo más tarde.",
        variant: "destructive",
      });
    }
  };

  // Función para mostrar el diálogo de evaluación
  const mostrarDialogoEvaluacion = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setEvaluacionDialogOpen(true);
  };

  // Función para cerrar el diálogo de evaluación y refrescar los datos
  const cerrarDialogoEvaluacion = (actualizado: boolean = false) => {
    setEvaluacionDialogOpen(false);
    if (actualizado) {
      refetch();
    }
  };

  // Datos para el gráfico de estado de evaluación
  const estadoEvaluacionData = useMemo(() => {
    if (!data || !data.resumen) return [];
    return [
      { name: 'Completa', value: data.resumen.evaluacionCompleta, color: '#16a34a' },
      { name: 'Incompleta', value: data.resumen.evaluacionIncompleta, color: '#f97316' },
      { name: 'Sin iniciar', value: data.resumen.sinIniciar, color: '#6b7280' },
    ];
  }, [data]);
  
  // Datos para el gráfico de distribución de materias
  const materiasData = useMemo(() => {
    if (!data || !data.materias) return [];
    return data.materias.map(materia => ({
      name: materia.nombre,
      promedio: Number(materia.promedio.toFixed(1)),
      optimo: materia.distribucion.optimo,
      satisfactorio: materia.distribucion.satisfactorio,
      enProceso: materia.distribucion.enProceso,
      inicial: materia.distribucion.inicial,
    }));
  }, [data]);

  // Colores para los gráficos
  const COLORS = ['#16a34a', '#f97316', '#6b7280'];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Seguimiento Grupal</h1>
          <p className="text-muted-foreground">
            Monitoreo de alumnos, evaluaciones y generación de reportes
          </p>
        </div>
        
        {/* Acciones principales */}
        <div className="flex flex-wrap gap-3">
          {/* Botón para cambiar entre vista de tabla y tarjetas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {vistaActual === "tarjetas" ? (
                  <>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    <span>Vista Tarjetas</span>
                  </>
                ) : (
                  <>
                    <TableIcon className="h-4 w-4 mr-2" />
                    <span>Vista Tabla</span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setVistaActual("tarjetas")}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span>Vista Tarjetas</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVistaActual("tabla")}>
                <TableIcon className="h-4 w-4 mr-2" />
                <span>Vista Tabla</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Botón para generar reportes */}
          {(user?.rol === "docente" || user?.rol === "admin" || user?.rol === "coordinador") && data?.alumnos && data.alumnos.length > 0 && (
            <Button 
              onClick={mostrarDialogoFiltros}
              variant="default" 
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              <span>Generar reportes del grupo</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Tarjeta de resumen general */}
      {!isLoading && data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Estado de Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="grid gap-1">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm">Completa: {data.resumen.evaluacionCompleta}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                    <span className="text-sm">Incompleta: {data.resumen.evaluacionIncompleta}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                    <span className="text-sm">Sin iniciar: {data.resumen.sinIniciar}</span>
                  </div>
                </div>
                <div className="w-24 h-24">
                  <PieChart width={100} height={100}>
                    <Pie
                      data={estadoEvaluacionData}
                      cx={50}
                      cy={50}
                      innerRadius={30}
                      outerRadius={40}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {estadoEvaluacionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-4">
                Estado de evaluación para {data.totalAlumnos} alumnos
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Progreso de Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl font-semibold">
                  {data.resumen.evaluacionCompleta + data.resumen.evaluacionIncompleta} / {data.totalAlumnos}
                </div>
                <div className="text-sm text-muted-foreground">
                  {(((data.resumen.evaluacionCompleta + data.resumen.evaluacionIncompleta) / data.totalAlumnos) * 100).toFixed(1)}%
                </div>
              </div>
              <Progress 
                value={((data.resumen.evaluacionCompleta + data.resumen.evaluacionIncompleta) / data.totalAlumnos) * 100} 
                className="h-2"
              />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{data.resumen.evaluacionCompleta + data.resumen.evaluacionIncompleta}</span>
                  <span className="text-xs text-muted-foreground">Alumnos evaluados</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{data.totalAlumnos}</span>
                  <span className="text-xs text-muted-foreground">Total alumnos</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Distribución de Promedios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs">Óptimo (9-10)</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-xs">Satisfactorio (8-8.9)</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span className="text-xs">En proceso (7-7.9)</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span className="text-xs">Inicial (6-6.9)</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={60}>
                <BarChart
                  layout="vertical"
                  data={[
                    {
                      name: "Promedios",
                      optimo: data.alumnos.filter(a => a.promedio >= 9).length,
                      satisfactorio: data.alumnos.filter(a => a.promedio >= 8 && a.promedio < 9).length,
                      enProceso: data.alumnos.filter(a => a.promedio >= 7 && a.promedio < 8).length,
                      inicial: data.alumnos.filter(a => a.promedio < 7).length,
                    }
                  ]}
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" hide />
                  <RechartsTooltip />
                  <Bar dataKey="optimo" stackId="a" fill="#16a34a" />
                  <Bar dataKey="satisfactorio" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="enProceso" stackId="a" fill="#eab308" />
                  <Bar dataKey="inicial" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                <span>Promedio general: </span>
                {data.alumnos.length > 0 ? (
                  <GradeDisplay
                    grade={data.alumnos.reduce((sum, a) => sum + a.promedio, 0) / data.alumnos.length}
                    showIcon={true}
                    showLabel={false}
                    showColor={true}
                    size="sm"
                    variant="pill"
                  />
                ) : (
                  <span>N/A</span>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help"><Info className="h-3 w-3 text-muted-foreground" /></span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm font-normal">Promedio general de todos los alumnos mostrados en la vista actual. Calculado como promedio simple entre materias.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Filtros y resumen */}
      <Card className="col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            Filtros de Visualización
            <div className="relative inline-block">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help"><Info className="h-4 w-4 text-muted-foreground" /></span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm font-normal">Ajusta los filtros para visualizar diferentes grupos de alumnos según tus necesidades.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="filters">
              <AccordionTrigger>
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Filtros personalizados</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-2">
                  {/* Filtro de selección de grupo */}
                  <div className="grid gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-sm font-medium">Grupo escolar</label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm font-normal">Filtra los alumnos que pertenecen a un grupo específico. Selecciona "Todos los grupos" para ver todos los estudiantes asignados.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <Select
                      value={filtros.grupoId}
                      onValueChange={(value) => {
                        setFiltros({
                          ...filtros,
                          grupoId: value
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Todos los grupos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los grupos</SelectItem>
                        {data?.grupos && data.grupos.map((grupo) => (
                          <SelectItem key={grupo.id} value={grupo.id.toString()}>
                            {grupo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Filtro de evaluación completa */}
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="soloEvaluacionCompleta" 
                        checked={reportFilters.soloEvaluacionCompleta}
                        onCheckedChange={(checked) => 
                          setReportFilters({
                            ...reportFilters,
                            soloEvaluacionCompleta: checked === true
                          })
                        }
                      />
                      <div className="flex items-center gap-1">
                        <label
                          htmlFor="soloEvaluacionCompleta"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Solo evaluación completa
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground" /></span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm font-normal">Evaluación completa: 27 subtemas evaluados. Muestra solo alumnos que han completado el ciclo de evaluación.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-sm font-medium">Planes de recuperación</label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm font-normal">Plan de recuperación: se genera para alumnos con materias por debajo de 7.0 como apoyo académico.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="requierenPlanRecuperacion" 
                          checked={reportFilters.requierenPlanRecuperacion}
                          onCheckedChange={(checked) => 
                            setReportFilters({
                              ...reportFilters,
                              requierenPlanRecuperacion: checked === true
                            })
                          }
                        />
                        <label
                          htmlFor="requierenPlanRecuperacion"
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Con plan de recuperación
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="noRequierenPlanRecuperacion" 
                          checked={reportFilters.noRequierenPlanRecuperacion}
                          onCheckedChange={(checked) => 
                            setReportFilters({
                              ...reportFilters,
                              noRequierenPlanRecuperacion: checked === true
                            })
                          }
                        />
                        <label
                          htmlFor="noRequierenPlanRecuperacion"
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Sin plan de recuperación
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex items-center gap-1">
                      <label htmlFor="promedioMinimo" className="text-sm font-medium">
                        Promedio mínimo
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help"><Info className="h-3.5 w-3.5 text-muted-foreground" /></span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm font-normal">Filtra alumnos por promedio académico general. Útil para identificar diferentes niveles de rendimiento.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="promedioMinimo"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={reportFilters.promedioMinimo}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setReportFilters({
                          ...reportFilters,
                          promedioMinimo: isNaN(value) ? 0 : value
                        });
                      }}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="grid gap-2 self-end">
                    <Button 
                      onClick={() => {
                        // Reestablecer los filtros
                        setReportFilters({
                          soloEvaluacionCompleta: true,
                          requierenPlanRecuperacion: true,
                          noRequierenPlanRecuperacion: true,
                          promedioMinimo: 0
                        });
                        // Aplicar los filtros
                        if (data && data.alumnos) {
                          const alumnos = filtrarAlumnos();
                          setAlumnosFiltrados(alumnos);
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      {/* Sección para mostrar los alumnos filtrados */}
      <div className="mt-6">
        {/* Contador de alumnos filtrados */}
        {!isLoading && alumnosFiltrados.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium">{alumnosFiltrados.length}</span> de <span className="font-medium">{data?.alumnos.length || 0}</span> alumnos totales
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando alumnos...</p>
          </div>
        ) : alumnosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/20">
            <Info className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron alumnos</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              No se encontraron alumnos que cumplan los filtros actuales. Intenta ajustar los criterios de búsqueda.
            </p>
          </div>
        ) : vistaActual === "tabla" ? (
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Promedio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alumnosFiltrados.map((alumno) => (
                      <TableRow key={alumno.id}>
                        <TableCell className="font-medium">{alumno.nombre}</TableCell>
                        <TableCell>{alumno.grupoNombre}</TableCell>
                        <TableCell>
                          <GradeDisplay
                            grade={alumno.promedio}
                            showIcon={true}
                            showLabel={false}
                            showColor={true}
                            size="sm"
                            variant="badge"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {alumno.estado === "completo" ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center cursor-help">
                                      <CheckCircle className="h-4 w-4 text-green-500 mr-1.5" />
                                      <span>Completo</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Todos los subtemas han sido evaluados.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : alumno.estado === "incompleto" ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center cursor-help">
                                      <Clock className="h-4 w-4 text-orange-500 mr-1.5" />
                                      <span>Incompleto</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Faltan subtemas por evaluar.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-gray-400 mr-1.5" />
                                <span>Sin iniciar</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={alumno.progreso.porcentaje} 
                              className="h-2 w-24" 
                            />
                            <span className="text-xs text-muted-foreground">
                              {alumno.progreso.completados}/{alumno.progreso.total}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => verDetalleAlumno(alumno.id)}
                              variant="outline"
                              size="icon"
                            >
                              <BarChartIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => mostrarDialogoEvaluacion(alumno)}
                              variant="outline"
                              size="icon"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => exportarReporteIndividual(alumno)}
                              variant="outline"
                              size="icon"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alumnosFiltrados.map((alumno) => (
                <Card key={alumno.id} className={`overflow-visible shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col min-h-[280px] h-auto relative cursor-pointer pt-4 pb-6
                  ${alumno.requierePlanRecuperacion 
                    ? "border-orange-200 hover:border-orange-400 hover:bg-orange-50/30" 
                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/20"}`}>
                  {/* Indicador simple en la esquina superior para mejor visibilidad */}
                  {alumno.requierePlanRecuperacion && (
                    <div className="absolute top-0 right-0 p-1 m-1 flex justify-center items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {alumnosRecomendacionesAI[alumno.id] ? (
                              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                <Sparkles className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-amber-500 text-white">
                                <ReceiptIcon className="h-4 w-4" />
                              </div>
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {alumnosRecomendacionesAI[alumno.id] ? (
                              <p>Recomendaciones IA disponibles</p>
                            ) : (
                              <p>Requiere plan de recuperación</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  
                  {/* Encabezado con nombre del alumno */}
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center space-x-2">
                        {alumno.nombre}
                        {alumno.requierePlanRecuperacion ? (
                          alumnosRecomendacionesAI[alumno.id] ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex ml-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300 rounded-full px-2 py-0.5 text-xs cursor-help">
                                    <Sparkles className="h-3.5 w-3.5 mr-1 text-blue-600" />
                                    <span className="text-xs font-medium">IA</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Informe generado automáticamente con inteligencia artificial.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex ml-2 bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 text-xs cursor-help">
                                    <ReceiptIcon className="h-3.5 w-3.5 mr-1 text-amber-600" />
                                    <span className="text-xs">Plan</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Este alumno tiene un plan de recuperación activado.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        ) : null}
                      </div>
                      <GradeDisplay
                        grade={alumno.promedio}
                        showIcon={true}
                        showLabel={false}
                        showColor={true}
                        size="sm"
                        variant="badge"
                      />
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-0 flex-grow overflow-visible flex flex-col gap-y-2">
                    {/* Grupo y estado de evaluación */}
                    <div className="flex items-center justify-between">
                      <CardDescription>{alumno.grupoNombre}</CardDescription>
                      
                      {alumno.estado === "completo" ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1 font-medium border border-green-500 bg-green-50 text-green-700 rounded-md px-2 py-0.5 cursor-help">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Completo</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Todos los subtemas han sido evaluados.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : alumno.estado === "incompleto" ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1 font-medium border border-yellow-500 bg-yellow-50 text-yellow-700 rounded-md px-2 py-0.5 cursor-help">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Incompleto</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Faltan subtemas por evaluar.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 font-medium border-red-500 bg-red-50 text-red-700 rounded-md">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Sin iniciar</span>
                        </Badge>
                      )}
                    </div>
                    
                    {/* Barra de progreso y porcentaje */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium
                          ${alumno.progreso.porcentaje > 80 
                            ? "text-green-600" 
                            : alumno.progreso.porcentaje >= 50 
                              ? "text-yellow-600" 
                              : "text-red-600"}
                        `}>
                          {alumno.progreso.porcentaje}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {alumno.progreso.completados}/{alumno.progreso.total} subtemas
                        </span>
                      </div>
                      <Progress 
                        value={alumno.progreso.porcentaje} 
                        className={`h-2 rounded-md ${
                          alumno.progreso.porcentaje > 80 
                            ? "bg-slate-200 [&>div]:bg-green-500" 
                            : alumno.progreso.porcentaje >= 50 
                              ? "bg-slate-200 [&>div]:bg-yellow-500" 
                              : "bg-slate-200 [&>div]:bg-red-500"
                        }`}
                      />
                    </div>
                    
                    {/* Alertas de intervención académica */}
                    {(alumno.promedio < 7.0 || alumno.progreso.porcentaje < 50) && (
                      <div className="mb-3">
                        <Alert variant="destructive" className="py-2 px-3 bg-red-50 border-red-200 rounded-md">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-xs font-medium">Requiere intervención académica</AlertTitle>
                          </div>
                          <AlertDescription className="text-xs mt-1">
                            {alumno.promedio < 7.0 ? 'Promedio general por debajo del mínimo aprobatorio.' : 'Evaluación incompleta con progreso insuficiente.'}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                    
                    {/* Materias destacadas */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Materias destacadas:</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {alumno.materias.slice(0, 4).map(m => (
                          <div 
                            key={m.id} 
                            className="flex justify-between items-center text-xs"
                          >
                            <span className="truncate text-muted-foreground">{m.nombre}</span>
                            <GradeDisplay
                              grade={m.promedio}
                              showIcon={false}
                              showLabel={false}
                              showColor={true}
                              size="sm"
                              variant="pill"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recomendaciones personalizadas */}
                    {alumno.promedio < 8.0 && (
                      <RecommendationBlock 
                        recommendations={generateRecommendations({
                          id: alumno.id,
                          nombre: alumno.nombre,
                          promedio: alumno.promedio,
                          materias: alumno.materias
                        })}
                        aiRecommendations={alumnosRecomendacionesAI[alumno.id] || null}
                        compact={true}
                      />
                    )}
                  </CardContent>
                  
                  {/* Botones de acción organizados por bloques */}
                  <CardFooter className="flex-col space-y-3 p-4 pt-2 border-t bg-gray-50/30 mt-auto">
                    {/* Bloque 1: Navegación académica */}
                    <div className="w-full space-y-2">
                      <div className="text-xs font-medium text-gray-600 mb-2">Navegación académica</div>
                      <div className="flex flex-col gap-2 xs:flex-row">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => {
                                  verDetalleAlumno(alumno.id);
                                  // Scroll hacia la sección de recomendación IA después de la navegación
                                  setTimeout(() => {
                                    const recomendacionElement = document.getElementById('recomendacion-ia');
                                    if (recomendacionElement) {
                                      recomendacionElement.scrollIntoView({ 
                                        behavior: 'smooth', 
                                        block: 'center' 
                                      });
                                    }
                                  }, 500);
                                }}
                                className="rounded-md flex-1 text-xs"
                              >
                                <BarChartIcon className="h-3 w-3 mr-1" />
                                📊 Ver progreso y materias
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Incluye la recomendación personalizada generada con IA</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant={alumno.estado === "completo" ? "default" : "secondary"}
                                size="sm"
                                onClick={() => mostrarDialogoEvaluacion(alumno)}
                                className="rounded-md flex-1 text-xs"
                              >
                                {alumno.estado === "completo" ? (
                                  <>
                                    <FileText className="h-3 w-3 mr-1" />
                                    📘 Ver reporte
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Evaluar
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{alumno.estado === "completo" 
                                ? "Ver reporte completo del alumno" 
                                : "Ir a capturar subtemas y calificaciones del alumno"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    {/* Bloque 2: Descargas y documentos (solo si es necesario) */}
                    {alumno.requierePlanRecuperacion && (
                      <>
                        <div className="w-full border-t border-gray-200 pt-2">
                          <div className="text-xs font-medium text-gray-600 mb-2">Descargas y documentos</div>
                          <div className="flex flex-col gap-2 xs:flex-row">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => generarPlanPDF(alumno, true)}
                                    className={`rounded-md flex-1 text-xs ${
                                      alumnosRecomendacionesAI[alumno.id] 
                                        ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0"
                                        : "bg-gradient-to-r from-indigo-400 to-purple-500 text-white border-0"
                                    }`}
                                  >
                                    <div className="flex items-center justify-center w-full">
                                      {alumnosRecomendacionesAI[alumno.id] && (
                                        <span className="mr-1">✅</span>
                                      )}
                                      📄 Descargar informe con IA
                                    </div>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Descarga el informe en PDF generado automáticamente por IA según el desempeño del alumno.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => generarPlanPDF(alumno, false)}
                                    className="rounded-md flex-1 bg-amber-50 hover:bg-amber-100 border-amber-200 text-xs"
                                  >
                                    📥 Descargar PDF
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Generar Plan de Recuperación básico (sin recomendaciones IA)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        
                        {/* Bloque 3: Etiquetas contextuales */}
                        <div className="flex justify-end space-x-2 pt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            Plan
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            IA
                          </span>
                        </div>
                      </>
                    )}
                  </CardFooter>
                </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Diálogo de evaluación */}
      {selectedAlumno && (
        <EvaluacionDialog 
          alumnoId={selectedAlumno.id}
          alumnoNombre={selectedAlumno.nombre}
          promedio={selectedAlumno.promedio}
          open={evaluacionDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              cerrarDialogoEvaluacion(false);
            }
          }}
          onEvaluacionCompleta={() => cerrarDialogoEvaluacion(true)}
        />
      )}
      
      {/* Diálogo de filtros para la generación de reportes */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros para generación de reportes</DialogTitle>
            <DialogDescription>
              Selecciona los criterios para generar reportes de alumnos
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="report-soloEvaluacionCompleta" 
                checked={reportFilters.soloEvaluacionCompleta}
                onCheckedChange={(checked) => 
                  setReportFilters({
                    ...reportFilters,
                    soloEvaluacionCompleta: checked === true
                  })
                }
              />
              <label
                htmlFor="report-soloEvaluacionCompleta"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Solo incluir alumnos con evaluación completa
              </label>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Planes de recuperación</label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="report-requierenPlanRecuperacion" 
                    checked={reportFilters.requierenPlanRecuperacion}
                    onCheckedChange={(checked) => 
                      setReportFilters({
                        ...reportFilters,
                        requierenPlanRecuperacion: checked === true
                      })
                    }
                  />
                  <label
                    htmlFor="report-requierenPlanRecuperacion"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Incluir alumnos que requieren plan de recuperación
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="report-noRequierenPlanRecuperacion" 
                    checked={reportFilters.noRequierenPlanRecuperacion}
                    onCheckedChange={(checked) => 
                      setReportFilters({
                        ...reportFilters,
                        noRequierenPlanRecuperacion: checked === true
                      })
                    }
                  />
                  <label
                    htmlFor="report-noRequierenPlanRecuperacion"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Incluir alumnos que no requieren plan de recuperación
                  </label>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid gap-2">
              <label htmlFor="report-promedioMinimo" className="text-sm font-medium">
                Promedio mínimo
              </label>
              <Input
                id="report-promedioMinimo"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={reportFilters.promedioMinimo}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setReportFilters({
                    ...reportFilters,
                    promedioMinimo: isNaN(value) ? 0 : value
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Solo incluir alumnos con promedio igual o superior al indicado
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarFiltros}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de resumen antes de generar reportes */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resumen de reportes a generar</DialogTitle>
            <DialogDescription>
              Se generarán reportes con los siguientes datos
            </DialogDescription>
          </DialogHeader>
          
          {reportSummary && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Total de alumnos</p>
                  <p className="text-2xl font-bold">{reportSummary.totalAlumnos}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Boletas a generar</p>
                  <p className="text-2xl font-bold">{reportSummary.totalBoletas}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Planes de recuperación</p>
                  <p className="text-2xl font-bold">{reportSummary.totalPlanesRecuperacion}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Promedio general</p>
                  <div className="flex items-center gap-2">
                    <GradeDisplay
                      grade={reportSummary.promedioGeneral}
                      showIcon={true}
                      showLabel={true}
                      showColor={true}
                      size="md"
                      variant="badge"
                    />
                  </div>
                </div>
              </div>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Información importante</AlertTitle>
                <AlertDescription>
                  Se generará un archivo ZIP con enlaces para acceder a las boletas académicas y planes de recuperación. Los estudiantes de prueba (ID mayor a 5) no se incluirán en la exportación.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={generarReportesMasivos}>
              <Download className="h-4 w-4 mr-2" />
              Generar reportes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}