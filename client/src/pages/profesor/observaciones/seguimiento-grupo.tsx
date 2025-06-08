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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
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
  Info
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
  
  const [filtros, setFiltros] = useState({
    grupoId: "",
    nivel: "",
    periodo: "",
    materiaId: "",
    estadoEvaluacion: "" // Nuevo filtro para el estado de evaluación: "" | "completo" | "incompleto" | "sin_iniciar"
  });
  
  const [vistaActual, setVistaActual] = useState<"tabla" | "tarjetas">("tarjetas");
  
  // Estado para el diálogo de evaluación
  const [evaluacionDialogOpen, setEvaluacionDialogOpen] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  
  // Estados para los filtros de reportes y diálogos
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    soloEvaluacionCompleta: true,
    requierenPlanRecuperacion: true,
    noRequierenPlanRecuperacion: true,
    promedioMinimo: 0
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
  
  // Efecto para aplicar los filtros automáticamente cuando los datos están disponibles
  useEffect(() => {
    if (data && data.alumnos) {
      // Aplicar los filtros predeterminados automáticamente
      const alumnos = filtrarAlumnos();
      setAlumnosFiltrados(alumnos);
    }
  }, [data]);

  // Funciones para exportar reportes individuales y grupales
  const exportarReporteIndividual = async (alumno: Alumno) => {
    if (!alumno) return;
    
    try {
      // Importar dinámicamente el servicio para evitar cargar jsPDF innecesariamente
      const { generarReporteIndividualPDF } = await import('@/services/seguimiento-grupo-pdf');
      
      // Generar el PDF individual
      const pdfDoc = generarReporteIndividualPDF(alumno);
      
      // Guardar el PDF
      pdfDoc.save(`reporte-${alumno.nombre.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
      
      toast({
        title: "Reporte individual generado",
        description: `El reporte de ${alumno.nombre} ha sido exportado correctamente a PDF`,
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

  // Función para filtrar los alumnos según los criterios actuales
  const filtrarAlumnos = () => {
    if (!data || !data.alumnos || data.alumnos.length === 0) {
      return [];
    }
    
    // Aplicar los filtros
    let alumnos = [...data.alumnos];
    
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
    
    return [];
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
      const grupoActual = filtros.grupoId && data?.grupos 
        ? data.grupos.find(g => g.id.toString() === filtros.grupoId) 
        : null;
      const nombreGrupo = grupoActual?.nombre || "todos";
      
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
Promedio general: ${alumno.promedio.toFixed(1)}
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
${materiasBajo7.map(m => `- ${m.nombre}: ${m.promedio.toFixed(1)}`).join('\n')}

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

Este archivo ZIP contiene enlaces para acceder a las boletas académicas y planes de recuperación
de los alumnos del grupo ${nombreGrupo}. Para acceder a cada documento, abra los archivos .txt
y visite los enlaces correspondientes desde el navegador cuando esté conectado al sistema.

También puede abrir el archivo index.html incluido para navegar por todos los reportes.

Fecha de generación: ${new Date().toLocaleDateString('es-MX', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}

Reportes generados: ${reportesGenerados}
Reportes omitidos: ${reportesOmitidos}

Para cualquier duda, contacte al administrador del sistema.`
      );
      
      // Crear un índice HTML más interactivo
      const fechaGeneracion = new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Crear listas de enlaces para el HTML
      const listaEnlacesBoletas = reportSummary.alumnosSeleccionados
        .map(alumno => `<li><a href="/report-cards/${alumno.id}" target="_blank">${alumno.nombre} (Promedio: ${alumno.promedio.toFixed(1)})</a></li>`)
        .join('');
      
      const listaEnlacesPlanes = reportSummary.alumnosSeleccionados
        .filter(alumno => alumno.materias.some(m => m.promedio < 7.0))
        .map(alumno => {
          const materiasBajo7 = alumno.materias.filter(m => m.promedio < 7.0);
          return `<li>
            <a href="/teacher/plan-recuperacion?studentId=${alumno.id}" target="_blank">${alumno.nombre}</a>
            <span class="materias">${materiasBajo7.map(m => m.nombre).join(', ')}</span>
          </li>`;
        })
        .join('');
      
      // Generar archivo HTML de índice
      zip.file("index.html", `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reportes del Grupo ${nombreGrupo}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1F3C88; border-bottom: 2px solid #1F3C88; padding-bottom: 10px; }
    .info { background-color: #f0f4ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .warning { background-color: #fff4e5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
    h2 { color: #333; margin-top: 30px; }
    ul { list-style-type: none; padding-left: 0; }
    li { margin-bottom: 8px; padding: 8px; border-bottom: 1px solid #eee; }
    li:hover { background-color: #f9f9f9; }
    a { color: #1F3C88; text-decoration: none; font-weight: bold; }
    a:hover { text-decoration: underline; }
    .materias { color: #666; font-size: 0.9em; margin-left: 10px; }
    .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
    .button-link { display: inline-block; background-color: #1F3C88; color: white; padding: 8px 15px; border-radius: 4px; text-decoration: none; margin-top: 10px; }
    .button-link:hover { background-color: #162955; }
    @media print {
      .no-print { display: none; }
      body { font-size: 12pt; }
      a { color: #000; text-decoration: none; }
      .info, .warning { border: 1px solid #ccc; background-color: white !important; }
    }
  </style>
</head>
<body>
  <h1>Reportes Académicos - Grupo ${nombreGrupo}</h1>
  
  <div class="info">
    <p><strong>Fecha de generación:</strong> ${fechaGeneracion}</p>
    <p><strong>Total de reportes:</strong> ${reportesGenerados}</p>
    <p><strong>Planes de recuperación:</strong> ${reportSummary.totalPlanesRecuperacion}</p>
    <p><strong>Promedio grupal:</strong> ${reportSummary.promedioGeneral.toFixed(1)}</p>
  </div>
  
  <div class="warning">
    <p><strong>Nota:</strong> Para acceder a estos reportes, debe estar conectado al sistema de gestión académica. Los enlaces abrirán las versiones más actualizadas de cada documento.</p>
  </div>
  
  <h2>Boletas Académicas</h2>
  <ul>${listaEnlacesBoletas}</ul>
  
  <h2>Planes de Recuperación</h2>
  ${listaEnlacesPlanes ? `<ul>${listaEnlacesPlanes}</ul>` : '<p>No hay alumnos que requieran plan de recuperación.</p>'}
  
  <div class="footer">
    <p>Documento generado por el sistema de gestión académica Altum Educación.</p>
    <a href="javascript:window.print()" class="button-link">Imprimir este índice</a>
  </div>
</body>
</html>
      `);
      
      // Si se generaron reportes, crear el archivo ZIP
      if (reportesGenerados > 0) {
        // Generar el archivo ZIP
        const content = await zip.generateAsync({ type: "blob" });

        // Crear enlace de descarga
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `reportes_grupo_${nombreGrupo}_${new Date().toISOString().slice(0, 10)}.zip`;
        link.click();

        // Mostrar resumen
        toast({
          title: "Reportes generados correctamente",
          description: `Se generaron ${reportesGenerados} reportes y enlaces. Se omitieron ${reportesOmitidos} alumnos de prueba.`,
          variant: "default"
        });
        
        // Liberar memoria del objeto URL después de la descarga
        setTimeout(() => {
          URL.revokeObjectURL(link.href);
        }, 1000);
      } else {
        toast({
          title: "No se generaron reportes",
          description: "No hay alumnos válidos para generar reportes. Intente seleccionar otro grupo.",
          variant: "destructive"
        });
      }

      // Si hubo errores, mostrarlos
      if (errores.length > 0) {
        toast({
          title: "Algunos reportes no pudieron generarse",
          description: `Errores en ${errores.length} reportes. Revise la consola para más detalles.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error al generar reportes masivos:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al generar los reportes. Inténtelo de nuevo más tarde.",
        variant: "destructive"
      });
    } finally {
      setShowSummaryDialog(false);
    }
  };

  // Componentes para los filtros y resúmenes de datos
  return (
    <div className="p-4 space-y-6">
      {/* Diálogo de filtros */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros para generación de reportes
            </DialogTitle>
            <DialogDescription>
              Seleccione los criterios para filtrar qué alumnos incluir en la generación masiva de reportes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="soloEvaluacionCompleta" 
                checked={reportFilters.soloEvaluacionCompleta}
                onCheckedChange={(checked) => 
                  setReportFilters(prev => ({ ...prev, soloEvaluacionCompleta: !!checked }))
                }
              />
              <label
                htmlFor="soloEvaluacionCompleta"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Incluir solo alumnos con evaluación completa (27/27 subtemas)
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="requierenPlan" 
                checked={reportFilters.requierenPlanRecuperacion}
                onCheckedChange={(checked) => 
                  setReportFilters(prev => ({ ...prev, requierenPlanRecuperacion: !!checked }))
                }
              />
              <label
                htmlFor="requierenPlan"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Incluir alumnos que requieren plan de recuperación
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="noRequierenPlan" 
                checked={reportFilters.noRequierenPlanRecuperacion}
                onCheckedChange={(checked) => 
                  setReportFilters(prev => ({ ...prev, noRequierenPlanRecuperacion: !!checked }))
                }
              />
              <label
                htmlFor="noRequierenPlan"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Incluir alumnos que no requieren plan de recuperación
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Incluir solo alumnos con promedio general mayor a:
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={reportFilters.promedioMinimo}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setReportFilters(prev => ({ 
                      ...prev, 
                      promedioMinimo: isNaN(value) ? 0 : value 
                    }))
                  }}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">Valor entre 0.0 y 10.0</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarFiltros}>
              Ver resumen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de resumen */}
      <AlertDialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumen de reportes a generar
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se generarán los siguientes reportes según los filtros aplicados:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {reportSummary && (
            <div className="space-y-4 py-4">
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>Total de alumnos:</span>
                  <Badge variant="outline">{reportSummary.totalAlumnos}</Badge>
                </li>
                <li className="flex justify-between">
                  <span>Boletas académicas:</span>
                  <Badge variant="outline">{reportSummary.totalBoletas}</Badge>
                </li>
                <li className="flex justify-between">
                  <span>Planes de recuperación:</span>
                  <Badge variant="outline">{reportSummary.totalPlanesRecuperacion}</Badge>
                </li>
                <li className="flex justify-between">
                  <span>Promedio general del grupo:</span>
                  <Badge variant="outline">{reportSummary.promedioGeneral.toFixed(1)}</Badge>
                </li>
              </ul>
              
              <div className="text-sm text-muted-foreground">
                <p>Los reportes se generarán como un archivo ZIP con carpetas organizadas y un índice HTML interactivo.</p>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={generarReportesMasivos}>
              Generar reportes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Resto del componente - opciones de filtrado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Panel de Seguimiento Grupal</h1>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="flex gap-2">
          {/* Selector de vista */}
          <div className="border rounded-md flex">
            <Button
              variant={vistaActual === "tarjetas" ? "default" : "ghost"}
              size="sm"
              onClick={() => setVistaActual("tarjetas")}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Tarjetas
            </Button>
            <Button
              variant={vistaActual === "tabla" ? "default" : "ghost"}
              size="sm"
              onClick={() => setVistaActual("tabla")}
              className="rounded-l-none"
            >
              <TableIcon className="h-4 w-4 mr-1" />
              Tabla
            </Button>
          </div>
          
          {/* Botón de filtros */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setShowFilterDialog(true)}
          >
            <ListFilter className="h-4 w-4" />
            Filtros
          </Button>

          {/* Botón para generar reportes masivos */}
          {((user?.rol === "docente" || user?.rol === "admin" || user?.rol === "coordinador") && data?.alumnos && data.alumnos.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={mostrarDialogoFiltros}
            >
              <Download className="h-4 w-4" />
              📥 Generar reportes del grupo
            </Button>
          )}
        </div>
      </div>

      {/* Sección de estadísticas y indicadores */}
      {data && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Evaluación completa */}
          <Card className="bg-green-50/50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Evaluación completa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-green-600">
                  {data.resumen?.evaluacionCompleta || 0}
                </span>
                <span className="text-sm text-muted-foreground mt-1">
                  {data.totalAlumnos ? Math.round((data.resumen?.evaluacionCompleta || 0) / data.totalAlumnos * 100) : 0}% del total
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Evaluación incompleta */}
          <Card className="bg-amber-50/50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Evaluación incompleta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-amber-600">
                  {data.resumen?.evaluacionIncompleta || 0}
                </span>
                <span className="text-sm text-muted-foreground mt-1">
                  {data.totalAlumnos ? Math.round((data.resumen?.evaluacionIncompleta || 0) / data.totalAlumnos * 100) : 0}% del total
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Sin iniciar */}
          <Card className="bg-slate-50/50 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Sin iniciar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-600">
                  {data.resumen?.sinIniciar || 0}
                </span>
                <span className="text-sm text-muted-foreground mt-1">
                  {data.totalAlumnos ? Math.round((data.resumen?.sinIniciar || 0) / data.totalAlumnos * 100) : 0}% del total
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Progreso general */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Progreso general</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center">
                {data.totalAlumnos > 0 && data.resumen ? (
                  <>
                    <div className="w-24 h-24 mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Completa', value: data.resumen.evaluacionCompleta, color: '#22c55e' },
                              { name: 'Incompleta', value: data.resumen.evaluacionIncompleta, color: '#f59e0b' },
                              { name: 'Sin iniciar', value: data.resumen.sinIniciar, color: '#94a3b8' },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[
                              { name: 'Completa', color: '#22c55e' },
                              { name: 'Incompleta', color: '#f59e0b' },
                              { name: 'Sin iniciar', color: '#94a3b8' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round((data.resumen.evaluacionCompleta / data.totalAlumnos) * 100)}% completado
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No hay datos</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Sección para mostrar los alumnos filtrados */}
      <div className="mt-6">
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
                          <Badge
                            variant={alumno.promedio >= 7.0 ? "default" : "destructive"}
                            className={`${alumno.promedio >= 7.0 ? "bg-green-600 hover:bg-green-700" : ""}`}
                          >
                            {alumno.promedio.toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alumno.estado === "completo" ? (
                            <span className="text-green-600 inline-flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" /> Completa
                            </span>
                          ) : alumno.estado === "incompleto" ? (
                            <span className="text-amber-600 inline-flex items-center">
                              <Clock className="w-3 h-3 mr-1" /> Incompleta
                            </span>
                          ) : (
                            <span className="text-slate-500 inline-flex items-center">
                              <XCircle className="w-3 h-3 mr-1" /> Sin iniciar
                            </span>
                          )}
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEvaluacionDialogOpen(true); setSelectedAlumno(alumno); }}
                              disabled={alumno.estado === "completo"}
                            >
                              Evaluar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => verDetalleAlumno(alumno.id)}
                            >
                              Ver detalles
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportarReporteIndividual(alumno)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alumnosFiltrados.map((alumno) => (
                <Card key={alumno.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center justify-between text-lg">
                      {alumno.nombre}
                      <Badge
                        variant={alumno.promedio >= 7.0 ? "default" : "destructive"}
                        className={`ml-2 ${alumno.promedio >= 7.0 ? "bg-green-600 hover:bg-green-700" : ""}`}
                      >
                        {alumno.promedio.toFixed(1)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Grupo: {alumno.grupoNombre} | Evaluación: {" "}
                      {alumno.estado === "completo" ? (
                        <span className="text-green-600 inline-flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" /> Completa
                        </span>
                      ) : alumno.estado === "incompleto" ? (
                        <span className="text-amber-600 inline-flex items-center">
                          <Clock className="w-3 h-3 mr-1" /> Incompleta
                        </span>
                      ) : (
                        <span className="text-slate-500 inline-flex items-center">
                          <XCircle className="w-3 h-3 mr-1" /> Sin iniciar
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="mb-2">
                      <p className="text-sm font-medium mb-1">Progreso de evaluación:</p>
                      <Progress
                        value={alumno.progreso.porcentaje}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {alumno.progreso.completados}/{alumno.progreso.total} subtemas completos
                      </p>
                    </div>
                    
                    {alumno.materias.some(m => m.promedio < 7.0) && (
                      <div className="mb-3 mt-4">
                        <div className="flex items-center gap-1 text-sm font-medium text-destructive">
                          <FileWarning className="h-4 w-4" />
                          Requiere plan de recuperación
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {alumno.materias
                            .filter(m => m.promedio < 7.0)
                            .map(m => (
                              <span key={m.id} className="inline-block mr-2 mb-1">
                                {m.nombre}: <strong>{m.promedio.toFixed(1)}</strong>
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verDetalleAlumno(alumno.id)}
                    >
                      Ver detalles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEvaluacionDialogOpen(true); setSelectedAlumno(alumno); }}
                      disabled={alumno.estado === "completo"}
                    >
                      Evaluar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportarReporteIndividual(alumno)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Exportar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}