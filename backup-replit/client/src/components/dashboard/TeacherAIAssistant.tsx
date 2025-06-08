import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Lightbulb, Brain, RefreshCw, Download, AlertCircle, FileText } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { generateEnhancedRecoveryPlanPDF } from "@/services/recovery-plan-pdf";
import { generateRecommendationsFromText } from "@/services/recommendations-pdf";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface TeacherAIAssistantProps {
  groupId?: number;
}

type RecommendationResponse = {
  success: boolean;
  result?: string;
  error?: string;
};

type RecoveryPlanResponse = {
  success: boolean;
  result?: string;
  error?: string;
};

// Interfaces para los datos de calificaciones y asistencia
interface GradesStats {
  promedioGeneral: string;
  porcentajeAprobados: string;
  totalAlumnos: number;
  alumnosAprobados: number;
  mejoresAlumnos: Array<{
    alumnoId: number;
    nombreAlumno: string;
    promedio: number;
  }>;
}

interface AttendanceStats {
  porcentajeAsistencia: string;
  asistenciaHoy: {
    fecha: string;
    presente: number;
    total: number;
  };
  alumnosMenosAsistencia: Array<{
    alumnoId: number;
    nombreAlumno: string;
    porcentaje: number;
  }>;
}

interface Assignment {
  id: number;
  grupoId: number;
  materiaId: number;
  profesorId: number;
}

function TeacherAIAssistant({ groupId }: TeacherAIAssistantProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);
  const [isRecoveryPlanOpen, setIsRecoveryPlanOpen] = useState(false);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Estado para almacenar las respuestas generadas
  const [recommendationsResult, setRecommendationsResult] = useState<string | undefined>(undefined);
  const [recoveryPlanResult, setRecoveryPlanResult] = useState<string | undefined>(undefined);
  
  // Estado para almacenar los grupos disponibles del profesor
  const [availableGroups, setAvailableGroups] = useState<Array<{id: number, nombre: string}>>([]);
  
  // Referencias para los elementos que contendrán el contenido a exportar como PDF
  const recommendationsContentRef = useRef<HTMLDivElement>(null);
  const recoveryPlanContentRef = useRef<HTMLDivElement>(null);
  
  // Consulta para obtener los grupos asignados al profesor
  const teacherGroupsQuery = useQuery({
    queryKey: ['/api/profesor/grupos-asignados'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', '/api/profesor/grupos-asignados');
      return response.json() as Promise<Array<{id: number, nombre: string}>>;
    },
    staleTime: 60000, // Mantener datos por 1 minuto
    enabled: !!user?.id
  });
  
  // Efecto para establecer los grupos disponibles
  useEffect(() => {
    if (teacherGroupsQuery.data && teacherGroupsQuery.data.length > 0) {
      // Filtrar solo grupos activos (no archivados)
      const activeGroups = teacherGroupsQuery.data.filter(g => !g.nombre.toLowerCase().includes('archivado'));
      setAvailableGroups(activeGroups);
      
      if ((!groupId || isNaN(Number(groupId))) && activeGroups.length > 0) {
        console.log('Grupo recomendado disponible:', activeGroups[0].id, activeGroups[0].nombre);
      }
    }
  }, [teacherGroupsQuery.data, groupId]);
  
  // Consulta para obtener datos actualizados de calificaciones
  const gradesQuery = useQuery({
    queryKey: ['/api/profesor/grades/stats', groupId],
    queryFn: async () => {
      // Solo realizar la solicitud si groupId es un valor válido
      if (!groupId || isNaN(Number(groupId))) {
        return { noGroupSelected: true } as any;
      }
      const response = await apiRequest('GET', `/api/profesor/grades/stats?groupId=${groupId}`);
      return response.json() as Promise<GradesStats>;
    },
    staleTime: 0, // No usar caché, siempre obtener datos frescos
    // Solo habilitar la consulta si hay un groupId válido
    enabled: !!groupId && !isNaN(Number(groupId)) && !!user?.profesorId
  });
  
  // Consulta para obtener datos actualizados de asistencia
  const attendanceQuery = useQuery({
    queryKey: ['/api/profesor/attendance/stats', groupId],
    queryFn: async () => {
      // Solo realizar la solicitud si groupId es un valor válido
      if (!groupId || isNaN(Number(groupId))) {
        return { noGroupSelected: true } as any;
      }
      const response = await apiRequest('GET', `/api/profesor/attendance/stats?groupId=${groupId}`);
      return response.json() as Promise<AttendanceStats>;
    },
    staleTime: 0, // No usar caché, siempre obtener datos frescos
    // Solo habilitar la consulta si hay un groupId válido
    enabled: !!groupId && !isNaN(Number(groupId)) && !!user?.profesorId
  });
  
  // Consulta para obtener asignaciones actualizadas
  const assignmentsQuery = useQuery({
    queryKey: ['/api/profesor/assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', `/api/profesor/assignments/${user.id}`);
      return response.json() as Promise<Assignment[]>;
    },
    staleTime: 0, // No usar caché, siempre obtener datos frescos
    enabled: !!user?.id && !!user?.profesorId
  });
  
  // Función para verificar que los datos estén completos y correctos
  const verifyDataIntegrity = () => {
    // Verificar si las consultas están en proceso o han tenido error
    if (gradesQuery.isPending || attendanceQuery.isPending || assignmentsQuery.isPending) {
      setAlertMessage('Cargando datos necesarios para generar contenido. Por favor, espere...');
      setIsAlertVisible(true);
      return false;
    }
    
    if (gradesQuery.isError || attendanceQuery.isError || assignmentsQuery.isError) {
      setAlertMessage('Error al obtener datos actualizados. Por favor, actualice la página e intente nuevamente.');
      setIsAlertVisible(true);
      return false;
    }
    
    // Verificación simplificada: Solo verificamos que existan asignaciones de profesor
    const assignmentsData = assignmentsQuery.data as Assignment[] | [];
    
    if (!assignmentsData || !assignmentsData.length) {
      setAlertMessage('No se encontraron asignaciones para este profesor. Por favor, contacte al administrador del sistema.');
      setIsAlertVisible(true);
      return false;
    }
    
    // Si llegamos aquí, permitimos continuar aunque haya datos parciales
    setIsAlertVisible(false);
    return true;
  };
  
  // Función para descargar las recomendaciones como PDF con formato mejorado
  const handleDownloadRecommendationsPDF = async () => {
    if (!recommendationsResult) return;
    
    try {
      // Obtenemos datos para personalizar el PDF
      const teacherName = user?.nombreCompleto || 'Docente';
      const selectedGroup = availableGroups.find(g => g.id === Number(groupId));
      const groupName = selectedGroup ? selectedGroup.nombre : 'Grupo';
      
      // Generamos el PDF con diseño mejorado
      const pdf = generateRecommendationsFromText(
        recommendationsResult,
        teacherName,
        groupName
      );
      
      // Nombre personalizado para el PDF
      pdf.save(`recomendaciones-${groupName.toLowerCase()}-${teacherName.split(' ')[0].toLowerCase()}.pdf`);
      
      toast({
        title: "¡PDF generado con éxito!",
        description: "Las Recomendaciones Académicas se han guardado como PDF con formato profesional.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error al generar PDF mejorado:', error);
      
      // Si falla el PDF mejorado, intentamos con el método simple como respaldo
      try {
        if (!recommendationsContentRef.current) return;
        
        const element = recommendationsContentRef.current;
        const canvas = await html2canvas(element, {
          scale: 2, // Mejor calidad
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Calculamos las dimensiones para que se ajuste bien al PDF
        const imgWidth = 210; // A4 width in mm (210mm x 297mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Nombre personalizado para el PDF
        const nombreDocente = user?.nombreCompleto || 'docente';
        pdf.save(`recomendaciones-docente-${nombreDocente.split(' ')[0].toLowerCase()}.pdf`);
        
        toast({
          title: "PDF generado con formato básico",
          description: "Se ha usado el formato simple debido a un error en el formato avanzado.",
          variant: "default"
        });
      } catch (fallbackError) {
        console.error('Error en fallback para generar PDF:', fallbackError);
        toast({
          title: "Error al generar PDF",
          description: "No se pudo generar el archivo PDF. Intente nuevamente.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Función para descargar el plan de recuperación como PDF mejorado
  const handleDownloadRecoveryPlanPDF = async () => {
    if (!recoveryPlanResult) return;
    
    try {
      // Importamos dinámicamente el servicio de PDF
      const { generateEnhancedRecoveryPlanPDF } = await import('../../services/recovery-plan-pdf');
      
      // Obtenemos datos para personalizar el PDF
      const teacherName = user?.nombreCompleto || 'Docente';
      const selectedGroup = availableGroups.find(g => g.id === Number(groupId));
      const groupName = selectedGroup ? selectedGroup.nombre : 'Grupo';
      
      // Generamos el PDF con diseño mejorado
      const pdf = generateEnhancedRecoveryPlanPDF(
        recoveryPlanResult,
        teacherName,
        groupName
      );
      
      // Nombre personalizado para el PDF
      pdf.save(`plan-recuperacion-${groupName.toLowerCase()}-${teacherName.split(' ')[0].toLowerCase()}.pdf`);
      
      toast({
        title: "¡PDF generado con éxito!",
        description: "El Plan de Recuperación Académica se ha guardado como PDF con formato profesional.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      
      // Si falla el PDF mejorado, intentamos con el método simple como respaldo
      try {
        if (!recoveryPlanContentRef.current) return;
        
        const element = recoveryPlanContentRef.current;
        const canvas = await html2canvas(element, {
          scale: 2, // Mejor calidad
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Calculamos las dimensiones para que se ajuste bien al PDF
        const imgWidth = 210; // A4 width in mm (210mm x 297mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Nombre personalizado para el PDF
        const nombreDocente = user?.nombreCompleto || 'docente';
        pdf.save(`plan-recuperacion-docente-${nombreDocente.split(' ')[0].toLowerCase()}.pdf`);
        
        toast({
          title: "PDF generado con formato básico",
          description: "Se ha usado el formato simple debido a un error en el formato avanzado.",
          variant: "default"
        });
      } catch (fallbackError) {
        console.error('Error en fallback para generar PDF:', fallbackError);
        toast({
          title: "Error al generar PDF",
          description: "No se pudo generar el archivo PDF. Intente nuevamente.",
          variant: "destructive"
        });
      }
    }
  };

  // Mutación para solicitar recomendaciones
  const recommendationsMutation = useMutation({
    mutationFn: async () => {
      // Usamos el profesorId que viene del objeto user (lo agregamos en auth.ts)
      if (!user?.profesorId) {
        throw new Error("ID de profesor no disponible. Por favor, inicie sesión nuevamente.");
      }
      
      // Verificamos que haya un groupId válido
      if (!groupId || isNaN(Number(groupId))) {
        throw new Error("Por favor, selecciona un grupo antes de generar recomendaciones.");
      }
      
      const teacherId = Number(user.profesorId); // Convertir a número explícitamente
      const groupIdNumber = Number(groupId); // Convertir a número explícitamente
      console.log("Usando teacherId:", teacherId, "y groupId:", groupIdNumber, "para recomendaciones");
      
      // Obtener los datos actualizados directamente antes de enviar la solicitud
      const gradesResponse = await apiRequest('GET', `/api/profesor/grades/stats?groupId=${groupIdNumber}`);
      const gradesData = await gradesResponse.json();
      
      const attendanceResponse = await apiRequest('GET', `/api/profesor/attendance/stats?groupId=${groupIdNumber}`);
      const attendanceData = await attendanceResponse.json();
      
      const assignmentsResponse = await apiRequest('GET', `/api/profesor/assignments/${user.id}`);
      const assignmentsData = await assignmentsResponse.json();
      
      console.log("Datos actualizados a enviar:", {
        gradesData,
        attendanceData,
        assignmentsData: assignmentsData.length
      });
      
      // Enviar tanto el ID como los datos actualizados al backend
      const response = await apiRequest('POST', '/api/teacher-assistant/recommendations', { 
        teacherId, // Enviamos el teacherId convertido a número
        groupId: groupIdNumber, // Aseguramos que groupId sea un número válido
        // Enviamos los datos actualizados junto con la solicitud
        currentData: {
          grades: gradesData,
          attendance: attendanceData,
          assignments: assignmentsData
        }
      });
      
      return await response.json();
    },
    onSuccess: (data: RecommendationResponse) => {
      if (data.success && data.result) {
        // Almacenar el resultado directamente de la respuesta POST
        setRecommendationsResult(data.result);
        // Abrir el diálogo para mostrar el resultado
        setIsRecommendationsOpen(true);
      } else {
        toast({
          title: "Error al generar recomendaciones",
          description: data.error || "La respuesta no contiene recomendaciones",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error al obtener recomendaciones",
        description: error.message || "No se pudieron generar las recomendaciones",
        variant: "destructive"
      });
    }
  });

  // Mutación para solicitar plan de recuperación
  const recoveryPlanMutation = useMutation({
    mutationFn: async () => {
      // Usamos el profesorId que viene del objeto user (lo agregamos en auth.ts)
      if (!user?.profesorId) {
        throw new Error("ID de profesor no disponible. Por favor, inicie sesión nuevamente.");
      }
      
      // Verificamos que haya un groupId válido
      if (!groupId || isNaN(Number(groupId))) {
        throw new Error("Por favor, selecciona un grupo antes de generar el plan de recuperación.");
      }
      
      const teacherId = Number(user.profesorId); // Convertir a número explícitamente
      const groupIdNumber = Number(groupId); // Convertir a número explícitamente
      console.log("Usando teacherId:", teacherId, "y groupId:", groupIdNumber, "para plan de recuperación");
      
      // Obtener los datos actualizados directamente antes de enviar la solicitud
      const gradesResponse = await apiRequest('GET', `/api/profesor/grades/stats?groupId=${groupIdNumber}`);
      const gradesData = await gradesResponse.json();
      
      const attendanceResponse = await apiRequest('GET', `/api/profesor/attendance/stats?groupId=${groupIdNumber}`);
      const attendanceData = await attendanceResponse.json();
      
      const assignmentsResponse = await apiRequest('GET', `/api/profesor/assignments/${user.id}`);
      const assignmentsData = await assignmentsResponse.json();
      
      console.log("Datos actualizados a enviar para plan de recuperación:", {
        gradesData,
        attendanceData,
        assignmentsData: assignmentsData.length
      });
      
      // Enviar tanto el ID como los datos actualizados al backend
      const response = await apiRequest('POST', '/api/teacher-assistant/recovery-plan', { 
        teacherId, // Enviamos el teacherId convertido a número
        groupId: groupIdNumber, // Aseguramos que groupId sea un número válido
        // Enviamos los datos actualizados junto con la solicitud
        currentData: {
          grades: gradesData,
          attendance: attendanceData,
          assignments: assignmentsData
        }
      });
      
      return await response.json();
    },
    onSuccess: (data: RecoveryPlanResponse) => {
      if (data.success && data.result) {
        // Almacenar el resultado directamente de la respuesta POST
        setRecoveryPlanResult(data.result);
        // Abrir el diálogo para mostrar el resultado
        setIsRecoveryPlanOpen(true);
      } else {
        toast({
          title: "Error al generar plan de recuperación",
          description: data.error || "La respuesta no contiene un plan de recuperación",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error al obtener plan de recuperación",
        description: error.message || "No se pudo generar el plan de recuperación",
        variant: "destructive"
      });
    }
  });

  // Manejador mejorado para solicitar recomendaciones con validación previa de datos
  const handleRequestRecommendations = async () => {
    if (recommendationsMutation.isPending) return;
    
    // Validar que hay un grupo seleccionado
    if (!groupId || isNaN(Number(groupId))) {
      toast({
        title: "Grupo no seleccionado",
        description: "Por favor, selecciona un grupo antes de generar recomendaciones.",
        variant: "default"
      });
      return;
    }
    
    // Forzamos la actualización de los datos antes de generar el contenido
    await Promise.all([
      gradesQuery.refetch(),
      attendanceQuery.refetch(),
      assignmentsQuery.refetch()
    ]);
    
    // Verificamos la integridad de los datos antes de continuar
    if (!verifyDataIntegrity()) {
      return; // Si hay problemas con los datos, se muestra la alerta y no continuamos
    }
    
    // Si hay un problema de datos, no continuamos con la generación
    if (isAlertVisible) return;
    
    // Limpiar resultados anteriores para no usar datos desactualizados
    setRecommendationsResult(undefined);
    
    // Generar nuevas recomendaciones con datos frescos
    recommendationsMutation.mutate();
    
    // Abrir el diálogo que mostrará el indicador de carga hasta recibir la respuesta
    setIsRecommendationsOpen(true);
  };

  // Manejador mejorado para solicitar plan de recuperación con validación previa de datos
  const handleRequestRecoveryPlan = async () => {
    if (recoveryPlanMutation.isPending) return;
    
    // Validar que hay un grupo seleccionado
    if (!groupId || isNaN(Number(groupId))) {
      toast({
        title: "Grupo no seleccionado",
        description: "Por favor, selecciona un grupo antes de generar el plan de recuperación.",
        variant: "default"
      });
      return;
    }
    
    // Forzamos la actualización de los datos antes de generar el contenido
    await Promise.all([
      gradesQuery.refetch(),
      attendanceQuery.refetch(),
      assignmentsQuery.refetch()
    ]);
    
    // Verificamos la integridad de los datos antes de continuar
    if (!verifyDataIntegrity()) {
      return; // Si hay problemas con los datos, se muestra la alerta y no continuamos
    }
    
    // Si hay un problema de datos, no continuamos con la generación
    if (isAlertVisible) return;
    
    // Limpiar resultados anteriores para no usar datos desactualizados
    setRecoveryPlanResult(undefined);
    
    // Generar nuevo plan con datos frescos
    recoveryPlanMutation.mutate();
    
    // Abrir el diálogo que mostrará el indicador de carga hasta recibir la respuesta
    setIsRecoveryPlanOpen(true);
  };

  return (
    <>
      {isAlertVisible && (
        <Alert className="mb-4" variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Información</AlertTitle>
          <AlertDescription>
            {alertMessage}
          </AlertDescription>
        </Alert>
      )}
      
      {(!groupId || isNaN(Number(groupId))) && (
        <Alert className="mb-4" variant="default">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Selección de grupo requerida</AlertTitle>
          <AlertDescription>
            {availableGroups.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Por favor, selecciona un grupo en el selector de la parte superior para generar 
                  recomendaciones y planes de recuperación personalizados.
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Grupos disponibles:</p>
                  <div className="flex flex-wrap gap-1">
                    {availableGroups.map(group => (
                      <Badge key={group.id} variant="outline" className="bg-blue-50">
                        {group.nombre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {teacherGroupsQuery.isLoading 
                    ? "Cargando grupos asignados..." 
                    : teacherGroupsQuery.isError 
                      ? "Error al cargar los grupos. Intenta recargar la página." 
                      : "No tienes grupos asignados. Contacta al administrador para obtener acceso."}
                </p>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-indigo-950 dark:to-blue-900">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Asistente educativo IA
              </CardTitle>
              <CardDescription>
                Recomendaciones personalizadas basadas en el desempeño de tus estudiantes
              </CardDescription>
            </div>
            <Badge className="bg-indigo-100 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              IA
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>Recomendaciones pedagógicas</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Recibe sugerencias adaptadas al desempeño de tu grupo y estudiantes
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-emerald-500" />
                <span>Plan de recuperación</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Obtén planes detallados para estudiantes en situación académica crítica
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={handleRequestRecommendations}
            disabled={recommendationsMutation.isPending || !groupId || isNaN(Number(groupId))}
            title={!groupId ? "Selecciona un grupo primero" : "Ver recomendaciones pedagógicas"}
          >
            {recommendationsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>Ver recomendaciones</>
            )}
          </Button>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={handleRequestRecoveryPlan}
            disabled={recoveryPlanMutation.isPending || !groupId || isNaN(Number(groupId))}
            title={!groupId ? "Selecciona un grupo primero" : "Ver plan de recuperación o plan de apoyo académico"}
          >
            {recoveryPlanMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>Ver plan personalizado</>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Diálogo para mostrar las recomendaciones */}
      <Dialog 
        open={isRecommendationsOpen} 
        onOpenChange={setIsRecommendationsOpen}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recomendaciones Pedagógicas
            </DialogTitle>
            <DialogDescription>
              Sugerencias personalizadas para mejorar el rendimiento académico
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">
              {recommendationsMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Generando recomendaciones personalizadas...</p>
                </div>
              ) : !recommendationsResult ? (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground">
                    No hay recomendaciones disponibles. Haga clic en "Generar recomendaciones".
                  </p>
                  <Button 
                    onClick={() => recommendationsMutation.mutate()}
                    className="mt-4"
                    disabled={recommendationsMutation.isPending || !groupId || isNaN(Number(groupId))}
                    title={!groupId ? "Selecciona un grupo primero" : "Generar recomendaciones pedagógicas"}
                  >
                    {recommendationsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>Generar recomendaciones</>
                    )}
                  </Button>
                </div>
              ) : (
                <div ref={recommendationsContentRef} className="prose prose-slate dark:prose-invert max-w-none">
                  {recommendationsResult.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index}>{line.replace('# ', '')}</h1>;
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index}>{line.replace('## ', '')}</h2>;
                    } else if (line.startsWith('### ')) {
                      return <h3 key={index}>{line.replace('### ', '')}</h3>;
                    } else if (line.startsWith('- ')) {
                      return <li key={index}>{line.replace('- ', '')}</li>;
                    } else if (line.trim() === '') {
                      return <br key={index} />;
                    } else {
                      return <p key={index}>{line}</p>;
                    }
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
          {recommendationsResult && (
            <DialogFooter className="mt-4 pt-3 border-t">
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleDownloadRecommendationsPDF}
              >
                <FileText className="h-4 w-4" />
                Guardar con Formato Profesional
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para mostrar el plan de recuperación */}
      <Dialog 
        open={isRecoveryPlanOpen} 
        onOpenChange={setIsRecoveryPlanOpen}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              Plan de Recuperación Académica
            </DialogTitle>
            <DialogDescription>
              Estrategias de apoyo según el desempeño de cada estudiante
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">
              {recoveryPlanMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Generando plan de recuperación...</p>
                </div>
              ) : !recoveryPlanResult ? (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground">
                    No hay plan de recuperación disponible. Haga clic en "Generar plan".
                  </p>
                  <Button 
                    onClick={() => recoveryPlanMutation.mutate()}
                    className="mt-4"
                    disabled={recoveryPlanMutation.isPending || !groupId || isNaN(Number(groupId))}
                    title={!groupId ? "Selecciona un grupo primero" : "Generar plan de recuperación académica"}
                  >
                    {recoveryPlanMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>Generar plan</>
                    )}
                  </Button>
                </div>
              ) : (
                <div ref={recoveryPlanContentRef} className="prose prose-slate dark:prose-invert max-w-none">
                  {recoveryPlanResult.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index}>{line.replace('# ', '')}</h1>;
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index}>{line.replace('## ', '')}</h2>;
                    } else if (line.startsWith('### ')) {
                      return <h3 key={index}>{line.replace('### ', '')}</h3>;
                    } else if (line.startsWith('- ')) {
                      return <li key={index}>{line.replace('- ', '')}</li>;
                    } else if (line.trim() === '') {
                      return <br key={index} />;
                    } else {
                      return <p key={index}>{line}</p>;
                    }
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
          {recoveryPlanResult && (
            <DialogFooter className="mt-4 pt-3 border-t">
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleDownloadRecoveryPlanPDF}
              >
                <FileText className="h-4 w-4" />
                Guardar con Formato Profesional
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TeacherAIAssistant;