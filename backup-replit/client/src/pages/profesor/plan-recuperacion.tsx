import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  FileDown, 
  RefreshCw, 
  AlertCircle,
  Users,
  GraduationCap,
  Calendar,
  CheckCircle2,
  BookOpen,
  Lightbulb,
  BarChart3,
  BookMarked,
  Megaphone,
  Library
} from "lucide-react";
import { GroupStatsSummary } from "@/components/teacher/GroupStatsSummary";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { generateOriginalRecoveryPlanPDF } from "@/services/recovery-plan-pdf";

interface Group {
  id: number;
  nombre: string;
  nivel: string;
}

interface Student {
  id: number;
  nombre: string;
  promedio: number;
  asistencia: number;
  nivelRiesgo: "alto" | "medio" | "bajo";
}

interface GroupStats {
  total: number;
  promedio: number;
  asistencia: number;
  pasRate: number;
  riesgo: number;
}

interface ActionItem {
  titulo: string;
  descripcion: string;
  fechaLimite?: string;
  responsable?: string;
  estado?: "pendiente" | "completado";
}

interface StudentPlan {
  materiasDificultad: { 
    nombre: string; 
    promedio: number; 
    descripcion: string;
  }[];
  accionesMejora: ActionItem[];
  actividadesRefuerzo: string[];
  recomendacionesPadres: string[];
}

interface RecoveryPlan {
  fechaGeneracion: string;
  grupoId: number;
  grupoNombre: string;
  nivel: string;
  profesorNombre: string;
  cicloEscolar: string;
  periodo: string;
  resumenEstadistico: {
    promedioGeneral: number;
    porcentajeAsistencia: number;
    porcentajeAprobacion: number;
    estudiantesEnRiesgo: number;
    totalEstudiantes: number;
  };
  estudiantes: {
    id: number;
    nombre: string;
    promedio: number;
    asistencia: number;
    nivelRiesgo: "alto" | "medio" | "bajo";
    plan: StudentPlan;
  }[];
}

const RecoveryPlanPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});

  // Función para alternar la expansión de una sección
  const toggleExpand = (sectionId: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Función para parsear el texto de IA y extraer secciones
  const parseAIContent = (content: any) => {
    // Validar que el contenido exista
    if (!content) {
      console.warn('parseAIContent: Contenido no disponible (null o undefined)');
      return {
        'error': {
          title: "Contenido no disponible",
          content: ["No hay contenido para mostrar. Intente generar un nuevo plan."],
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />
        }
      };
    }
    
    // Si recibimos un objeto JSON en lugar de texto, verificamos si tiene la estructura esperada
    if (typeof content !== 'string') {
      console.warn('parseAIContent: El contenido no es texto, se recibió:', typeof content);
      
      // Si es un objeto JSON estructurado, intentamos interpretarlo directamente
      if (typeof content === 'object') {
        try {
          // Verificar si es un objeto con la estructura correcta para renderizar
          const result: {[key: string]: {title: string, content: string[], icon: React.ReactNode}} = {};
          
          // Intentamos mapear el objeto JSON a nuestro formato esperado 
          if (content.diagnostico) {
            result['diagnostico'] = {
              title: "Diagnóstico Académico",
              content: Array.isArray(content.diagnostico) ? content.diagnostico : [String(content.diagnostico)],
              icon: <BarChart3 className="h-5 w-5 text-[#5893D4]" />
            };
          }
          
          if (content.estrategias) {
            result['estrategias'] = {
              title: "Estrategias de Intervención",
              content: Array.isArray(content.estrategias) ? content.estrategias : [String(content.estrategias)],
              icon: <Lightbulb className="h-5 w-5 text-[#5893D4]" />
            };
          }
          
          // Si encontramos alguna sección, lo devolvemos
          if (Object.keys(result).length > 0) {
            return result;
          }
          
          // Si no pudimos interpretar el objeto JSON, mostramos un error
          return {
            'error': {
              title: "Formato no reconocido",
              content: ["El contenido está en un formato que no pudo ser procesado. Intente generar un nuevo plan."],
              icon: <AlertCircle className="h-5 w-5 text-amber-500" />
            }
          };
        } catch (objError) {
          console.error("Error al procesar objeto JSON:", objError);
        }
      }
      
      // Si no es un objeto o no pudimos interpretarlo, mostramos mensaje de error
      return {
        'error': {
          title: "Contenido con formato incorrecto",
          content: ["El tipo de contenido recibido no es el esperado. Intente generar un nuevo plan."],
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />
        }
      };
    }

    // A partir de aquí procesamos el contenido como texto (string)
    // Expresiones regulares para diferentes secciones del plan de recuperación
    const sections: {[key: string]: {title: string, regex: RegExp, icon: React.ReactNode}} = {
      diagnostico: {
        title: "Diagnóstico Académico",
        regex: /(?:Diagnóstico académico|Análisis de la situación|Situación actual)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <BarChart3 className="h-5 w-5 text-[#5893D4]" />
      },
      estrategias: {
        title: "Estrategias de Intervención",
        regex: /(?:Estrategias de intervención|Plan de acción|Estrategias recomendadas|Acciones recomendadas)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <Lightbulb className="h-5 w-5 text-[#5893D4]" />
      },
      actividades: {
        title: "Actividades de Refuerzo",
        regex: /(?:Actividades de refuerzo|Actividades académicas|Ejercicios recomendados|Actividades sugeridas)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <BookOpen className="h-5 w-5 text-[#5893D4]" />
      },
      recursos: {
        title: "Recursos Educativos",
        regex: /(?:Recursos educativos|Materiales de apoyo|Herramientas recomendadas|Recursos sugeridos)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <Library className="h-5 w-5 text-[#5893D4]" />
      },
      padres: {
        title: "Recomendaciones para Padres",
        regex: /(?:Recomendaciones para padres|Apoyo familiar|Sugerencias para la familia|Participación de los padres)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <Megaphone className="h-5 w-5 text-amber-500" />
      }
    };

    const result: {[key: string]: {title: string, content: string[], icon: React.ReactNode}} = {};
    
    try {
      // Extraer cada sección del texto
      Object.entries(sections).forEach(([key, section]) => {
        try {
          const match = content.match(section.regex);
          if (match && match[1]) {
            const contentText = match[1].trim();
            
            // Dividir el contenido en viñetas si es posible
            let items: string[] = [];
            
            try {
              // Intentar encontrar viñetas numeradas (1., 2., etc.)
              if (contentText.match(/^\d+\.\s/m)) {
                items = contentText
                  .split(/\n+/)
                  .map(line => line.trim())
                  .filter(line => line.length > 0)
                  .map(line => line.replace(/^\d+\.\s*/, '')); // Quitar números
              } 
              // Intentar encontrar viñetas con asteriscos o guiones
              else if (contentText.match(/^[•\-*]\s/m)) {
                items = contentText
                  .split(/\n+/)
                  .map(line => line.trim())
                  .filter(line => line.length > 0)
                  .map(line => line.replace(/^[•\-*]\s*/, '')); // Quitar viñetas existentes
              }
              // Si no hay viñetas, intentar separar por párrafos
              else {
                items = contentText
                  .split(/\n{2,}/) // Separar por líneas en blanco
                  .map(paragraph => paragraph.replace(/\n/g, ' ').trim()) // Unir líneas en párrafos
                  .filter(paragraph => paragraph.length > 0);
                  
                // Si solo hay un párrafo largo, intentar dividirlo en oraciones
                if (items.length === 1 && items[0].length > 150) {
                  items = items[0]
                    .split(/(?<=[.!?])\s+/)
                    .filter(sentence => sentence.length > 0);
                }
              }
            } catch (itemsError) {
              console.error("Error al procesar items:", itemsError);
              items = ["Error al procesar el contenido de esta sección"];
            }
            
            // Asegurarse de que items siempre tenga al menos un elemento
            if (items.length === 0) {
              items = ["No hay contenido específico para esta sección"];
            }
            
            result[key] = {
              title: section.title,
              content: items,
              icon: section.icon
            };
          }
        } catch (sectionError) {
          console.error(`Error al procesar sección ${key}:`, sectionError);
          // Continuamos con la siguiente sección
        }
      });
      
      // Si no se encontró ninguna sección, crear una genérica
      if (Object.keys(result).length === 0) {
        try {
          // Verificar que content tenga contenido antes de procesarlo
          const contentToProcess = content.trim() 
            ? content.trim() 
            : "No hay contenido disponible para mostrar";
          
          const genericContent = contentToProcess
            .split(/\n+/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[•\-*]\d+\.\s*/, ''));
          
          // Si no hay elementos después del procesamiento, agregar un mensaje predeterminado
          if (genericContent.length === 0) {
            genericContent.push("No hay contenido específico para mostrar");
          }
          
          result['general'] = {
            title: "Plan de Recuperación",
            content: genericContent,
            icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
          };
        } catch (genericError) {
          console.error("Error al crear sección genérica:", genericError);
          
          result['error'] = {
            title: "Error al procesar contenido",
            content: ["No se pudo procesar correctamente el contenido. Intente generar un nuevo plan."],
            icon: <AlertCircle className="h-5 w-5 text-red-500" />
          };
        }
      }
    } catch (mainError) {
      console.error("Error principal al parsear el contenido de IA:", mainError);
      
      result['error'] = {
        title: "Error al procesar el contenido",
        content: ["No se pudo procesar correctamente el contenido del plan. Por favor, intente generar un nuevo plan."],
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />
      };
    }
    
    return result;
  };
  // Consultar grupos asignados al profesor
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['/api/profesor/grupos-asignados'],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Seleccionar automáticamente el primer grupo si no hay uno seleccionado
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Consultar planes de recuperación existentes para el grupo seleccionado
  const { 
    data: recoveryPlan, 
    isLoading: isLoadingPlan,
    refetch: refetchPlan
  } = useQuery({
    queryKey: ['/api/teacher-assistant/recovery-plan', selectedGroupId],
    enabled: !!selectedGroupId,
    staleTime: 60 * 1000, // 1 minuto
  });

  // Efecto para seleccionar automáticamente el primer estudiante después de cargar el plan
  useEffect(() => {
    if (recoveryPlan?.success && recoveryPlan.result) {
      // Comprobar si estamos trabajando con el formato JSON estructurado
      if (recoveryPlan.format === 'json') {
        console.log('Plan de recuperación en formato JSON:', recoveryPlan.result);
        if (recoveryPlan.result.estudiantes && 
            Array.isArray(recoveryPlan.result.estudiantes) && 
            recoveryPlan.result.estudiantes.length > 0 && 
            !selectedStudent) {
          setSelectedStudent(recoveryPlan.result.estudiantes[0].id);
        }
      } 
      // Formato de texto antiguo
      else if (typeof recoveryPlan.result === 'string') {
        console.log('Plan de recuperación en formato texto (legacy)');
        // Aquí se podría implementar un parser del texto si fuera necesario
        // Por ahora no seleccionamos ningún estudiante automáticamente
      }
    }
  }, [recoveryPlan, selectedStudent]);

  // Mutación para generar nuevo plan de recuperación
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) return null;
      
      const response = await apiRequest(
        "POST", 
        "/api/teacher-assistant/recovery-plan", 
        { 
          teacherId: (window as any).profesorId || 0,
          groupId: selectedGroupId 
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al generar plan de recuperación");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.success) {
        toast({
          title: "Plan generado",
          description: "El plan de recuperación académica se ha generado correctamente.",
        });
        
        console.log('Respuesta de generación de plan:', data);
        console.log('Formato de respuesta:', data.format);
        
        // Almacenar el texto generado por IA para mostrarlo en la interfaz si es formato texto
        if (data.format === 'text' && data.result && typeof data.result === 'string') {
          console.log('Almacenando contenido de formato texto');
          setAiGeneratedContent(data.result);
        } else if (data.format === 'json') {
          console.log('Detectado formato JSON estructurado en generación');
          // No necesitamos hacer nada especial aquí, ya que usaremos directamente la estructura JSON
          setAiGeneratedContent(null); // Limpiamos el texto para usar solo JSON
        }
        
        // Invalidar consulta de planes para refrescar datos
        queryClient.invalidateQueries({
          queryKey: ['/api/teacher-assistant/recovery-plan', selectedGroupId]
        });

        // Forzar refetch para actualizar UI inmediatamente
        refetchPlan();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el plan de recuperación",
        variant: "destructive",
      });
    }
  });

  // Si no hay grupos asignados, mostrar mensaje
  if (!isLoadingGroups && groups.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan de Recuperación Académica</CardTitle>
            <CardDescription>Asistente educativo IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No hay grupos asignados</h3>
              <p className="text-gray-500 mt-1">
                No se encontraron grupos asignados a tu perfil docente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parsear el contenido generado por IA si existe
  const parsedAIContent = aiGeneratedContent 
    ? parseAIContent(aiGeneratedContent) 
    : {};
    
  // Parsear datos del plan si existen
  const planData: RecoveryPlan | null = useMemo(() => {
    if (!recoveryPlan?.success) return null;
    
    // Verificar si la respuesta ya viene en formato JSON estructurado
    if (recoveryPlan.format === 'json') {
      console.log('Plan de recuperación en formato JSON estructurado:', recoveryPlan.result);
      
      // Asegurar que la propiedad estudiantes siempre sea un array (incluso vacío)
      if (recoveryPlan.result) {
        // Validar y garantizar que siempre exista un array de estudiantes
        const result = {
          ...recoveryPlan.result,
          estudiantes: Array.isArray(recoveryPlan.result.estudiantes) 
            ? recoveryPlan.result.estudiantes 
            : []
        };
        
        console.log('Estructura JSON validada con array de estudiantes:', 
          `${result.estudiantes.length} estudiantes encontrados`);
        return result;
      }
    }

    // Si es formato texto, devolvemos null o podríamos implementar un parser
    if (typeof recoveryPlan.result === 'string') {
      console.log('Plan de recuperación en formato texto, no procesamos para JSON');
      // Aquí se podría implementar un parser del texto a estructura JSON
      return null;
    }
    
    // Asegurar que el resultado siempre tenga una propiedad estudiantes como array
    if (recoveryPlan.result && typeof recoveryPlan.result === 'object') {
      return {
        ...recoveryPlan.result,
        estudiantes: Array.isArray(recoveryPlan.result.estudiantes) 
          ? recoveryPlan.result.estudiantes 
          : []
      };
    }
    
    return null;
  }, [recoveryPlan]);

  // Obtener estadísticas del grupo seleccionado para mostrar en la interfaz
  const groupStats: GroupStats | null = planData && planData.resumenEstadistico ? {
    total: planData.resumenEstadistico.totalEstudiantes || 0,
    promedio: planData.resumenEstadistico.promedioGeneral || 0,
    asistencia: planData.resumenEstadistico.porcentajeAsistencia || 0,
    pasRate: planData.resumenEstadistico.porcentajeAprobacion || 0,
    riesgo: planData.resumenEstadistico.estudiantesEnRiesgo || 0
  } : null;

  // Encontrar estudiante seleccionado con validación robusta y garantizar que el plan es completo
  const currentStudent = useMemo(() => {
    // Verificar que planData y sus estudiantes existen y son un array
    if (!planData || !planData.estudiantes || !Array.isArray(planData.estudiantes)) {
      return undefined;
    }
    
    // Encontrar el estudiante seleccionado
    const student = planData.estudiantes.find(student => student.id === selectedStudent);
    
    // Si no se encontró estudiante, devolver undefined
    if (!student) {
      return undefined;
    }
    
    // Garantizar que el plan del estudiante tiene la estructura correcta
    // creando un objeto con valores predeterminados seguros si son necesarios
    return {
      ...student,
      // Asegurar que nombre, promedio y asistencia tengan valores válidos
      nombre: student.nombre || 'Estudiante',
      promedio: typeof student.promedio === 'number' ? student.promedio : 0,
      asistencia: typeof student.asistencia === 'number' ? student.asistencia : 0,
      nivelRiesgo: student.nivelRiesgo || 'bajo',
      // Garantizar que el plan existe con todas sus propiedades
      plan: {
        // Valores por defecto seguros para todas las propiedades del plan
        materiasDificultad: Array.isArray(student.plan?.materiasDificultad) 
          ? student.plan.materiasDificultad 
          : [],
        accionesMejora: Array.isArray(student.plan?.accionesMejora)
          ? student.plan.accionesMejora
          : [],
        actividadesRefuerzo: Array.isArray(student.plan?.actividadesRefuerzo)
          ? student.plan.actividadesRefuerzo
          : [],
        recomendacionesPadres: Array.isArray(student.plan?.recomendacionesPadres)
          ? student.plan.recomendacionesPadres
          : []
      }
    };
  }, [planData, selectedStudent]);

  // Obtener iniciales para el avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Función para obtener color según nivel de riesgo
  const getRiskBadgeColor = (risk: string) => {
    switch(risk) {
      case 'alto': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'medio': return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'bajo': return 'bg-green-100 text-green-800 hover:bg-green-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  // Manejar descarga de PDF para un estudiante
  const handleDownloadPDF = () => {
    if (!planData || !currentStudent) return;
    
    try {
      generateOriginalRecoveryPlanPDF(planData, currentStudent);
      toast({
        title: "PDF generado",
        description: "El documento se ha descargado correctamente."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el PDF del plan de recuperación",
        variant: "destructive",
      });
    }
  };

  // Mostrar la interfaz principal
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <GraduationCap className="mr-2 h-6 w-6 text-[#5893D4]" />
            Plan de Recuperación Académica
          </h1>
          <p className="text-muted-foreground">
            Asistente educativo con IA para mejorar el rendimiento de estudiantes en riesgo
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select
            value={selectedGroupId?.toString()}
            onValueChange={(value) => setSelectedGroupId(parseInt(value))}
            disabled={isLoadingGroups}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar grupo" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group: Group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.nombre} ({group.nivel})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="default" 
            onClick={() => generateMutation.mutate()} 
            disabled={!selectedGroupId || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Plan
              </>
            )}
          </Button>
        </div>
      </div>

      {selectedGroupId && groupStats && planData ? (
        <>
          {/* Resumen del grupo y métricas */}
          <GroupStatsSummary
            groupName={planData.grupoNombre}
            level={planData.nivel}
            studentCount={groupStats.total}
            averageGrade={groupStats.promedio}
            attendance={groupStats.asistencia}
            riskStudents={groupStats.riesgo}
            passRate={groupStats.pasRate}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            {/* Lista de estudiantes en la columna izquierda */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
                  Estudiantes en Riesgo
                </CardTitle>
                <CardDescription>
                  Selecciona un estudiante para ver su plan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {!planData?.estudiantes || !Array.isArray(planData.estudiantes) || planData.estudiantes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No hay estudiantes en riesgo
                  </p>
                ) : (
                  <div className="space-y-1">
                    {planData.estudiantes.map(student => (
                      <div 
                        key={student.id}
                        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                          selectedStudent === student.id 
                            ? 'bg-[#1F3C88] text-white' 
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedStudent(student.id)}
                      >
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className={
                            selectedStudent === student.id 
                              ? 'bg-white text-[#1F3C88]' 
                              : 'bg-[#5893D4] text-white'
                          }>
                            {getInitials(student.nombre)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-sm">
                          <div className="font-medium truncate">{student.nombre}</div>
                          <div className={
                            selectedStudent === student.id 
                              ? 'text-blue-100' 
                              : 'text-muted-foreground'
                          }>
                            Promedio: {student.promedio.toFixed(1)}
                          </div>
                        </div>
                        <Badge className={`ml-auto ${
                          selectedStudent === student.id 
                            ? 'bg-white text-[#1F3C88]' 
                            : getRiskBadgeColor(student.nivelRiesgo)
                        }`}>
                          {student.nivelRiesgo}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detalles del plan de recuperación en las tres columnas de la derecha */}
            {currentStudent ? (
              <Card className="lg:col-span-3">
                <CardHeader className="pb-3">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle className="text-xl">{currentStudent.nombre}</CardTitle>
                      <CardDescription className="mt-1">
                        Promedio: {currentStudent.promedio.toFixed(1)} | 
                        Asistencia: {currentStudent.asistencia.toFixed(1)}% | 
                        Riesgo: <span className="font-medium text-amber-600">{currentStudent.nivelRiesgo}</span>
                      </CardDescription>
                    </div>
                    <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                      <FileDown className="mr-2 h-4 w-4" />
                      Descargar PDF
                    </Button>
                  </div>
                  <Separator className="my-4" />
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Materias con dificultad */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
                      Materias con dificultad
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentStudent.plan && Array.isArray(currentStudent.plan.materiasDificultad) 
                        ? currentStudent.plan.materiasDificultad.map((materia, index) => (
                          <Card key={index} className="bg-amber-50 border-amber-200">
                            <CardHeader className="pb-2 pt-4">
                              <CardTitle className="text-base flex justify-between">
                                <span>{materia.nombre || 'Materia sin nombre'}</span>
                                <Badge variant="outline" className="bg-white">
                                  {typeof materia.promedio === 'number' 
                                    ? materia.promedio.toFixed(1) 
                                    : '0.0'}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 text-sm">
                              <p>{materia.descripcion || 'Sin descripción disponible'}</p>
                            </CardContent>
                          </Card>
                        ))
                        : <p className="col-span-2 text-center text-muted-foreground py-4">No hay materias con dificultad disponibles</p>
                      }
                    </div>
                  </div>

                  {/* Acciones de mejora */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <CheckCircle2 className="mr-2 h-5 w-5 text-[#5893D4]" />
                      Acciones de mejora
                    </h3>
                    <Accordion type="single" collapsible className="w-full">
                      {currentStudent.plan && Array.isArray(currentStudent.plan.accionesMejora) 
                        ? currentStudent.plan.accionesMejora.map((accion, index) => (
                          <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-base font-medium py-2">
                              {accion.titulo || 'Acción de mejora'}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-1">
                                <p className="text-sm">{accion.descripcion || 'Sin descripción disponible'}</p>
                                {accion.fechaLimite && (
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Fecha límite: {accion.fechaLimite}
                                  </div>
                                )}
                                {accion.responsable && (
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Users className="h-3 w-3 mr-1" />
                                    Responsable: {accion.responsable}
                                  </div>
                                )}
                                {accion.estado && (
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Estado: {accion.estado}
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))
                        : <p className="text-center text-muted-foreground py-4">No hay acciones de mejora disponibles</p>
                      }
                    </Accordion>
                  </div>

                  {/* Actividades de refuerzo y recomendaciones */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Actividades de refuerzo */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Actividades de refuerzo</h3>
                      <ul className="space-y-2">
                        {currentStudent.plan && Array.isArray(currentStudent.plan.actividadesRefuerzo) 
                          ? currentStudent.plan.actividadesRefuerzo.map((actividad, index) => (
                            <li key={index} className="text-sm border-l-2 border-[#5893D4] pl-3 py-1">
                              {typeof actividad === 'string' ? actividad : 'Actividad no especificada'}
                            </li>
                          ))
                          : <li className="text-center text-muted-foreground py-2">No hay actividades de refuerzo disponibles</li>
                        }
                      </ul>
                    </div>

                    {/* Recomendaciones para padres */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Recomendaciones para padres</h3>
                      <ul className="space-y-2">
                        {currentStudent.plan && Array.isArray(currentStudent.plan.recomendacionesPadres) 
                          ? currentStudent.plan.recomendacionesPadres.map((recomendacion, index) => (
                            <li key={index} className="text-sm border-l-2 border-[#5893D4] pl-3 py-1">
                              {typeof recomendacion === 'string' ? recomendacion : 'Recomendación no especificada'}
                            </li>
                          ))
                          : <li className="text-center text-muted-foreground py-2">No hay recomendaciones para padres disponibles</li>
                        }
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="lg:col-span-3">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Selecciona un estudiante</h3>
                    <p className="text-gray-500 mt-1 max-w-md mx-auto">
                      Elige un estudiante del panel izquierdo para ver su plan de recuperación académica personalizado.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Fecha de generación */}
          <div className="text-xs text-muted-foreground text-right mt-2">
            Generado el: {planData && planData.fechaGeneracion ? formatDate(planData.fechaGeneracion) : formatDate(new Date().toISOString())}
          </div>
        </>
      ) : aiGeneratedContent ? (
        /* Visualización del contenido generado por IA en tiempo real */
        <div className="mt-6 space-y-6">
          <div className="bg-[#E8F4FD] px-4 py-3 rounded-lg border border-[#5893D4] mb-6">
            <p className="text-sm text-[#1F3C88] font-medium flex items-center">
              <Sparkles className="mr-2 h-4 w-4" />
              Plan de recuperación generado por el asistente de IA
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {Object.entries(parsedAIContent).map(([key, section]) => {
              const isExpandedState = isExpanded[key] || false;
              const maxVisibleItems = 5;
              // Validar que section.content sea un array antes de operaciones
              const contentArray = section && section.content && Array.isArray(section.content) ? section.content : [];
              const hasMoreContent = contentArray.length > maxVisibleItems;
              const displayedContent = isExpandedState 
                ? contentArray 
                : contentArray.slice(0, maxVisibleItems);
              
              return (
                <Card key={key} className="bg-[#F0F2F5] hover:shadow-md transition-shadow overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      {section.icon}
                      <span className="ml-2">{section.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {displayedContent.map((item, index) => (
                        <li key={index} className="text-sm border-l-2 border-[#5893D4] pl-3 py-1 bg-white rounded shadow-sm">
                          {item}
                        </li>
                      ))}
                    </ul>
                    
                    {hasMoreContent && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-3 w-full text-sm"
                        onClick={() => toggleExpand(key)}
                      >
                        {isExpandedState ? "Ver menos" : `Ver ${contentArray.length - maxVisibleItems} más`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={() => generateMutation.mutate()} variant="outline" className="mr-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerar Plan
            </Button>
          </div>
          
          {/* Fecha de generación */}
          <div className="text-xs text-muted-foreground text-right mt-2">
            Generado el: {formatDate(new Date().toISOString())}
          </div>
        </div>
      ) : (
        <Card className="mt-6">
          <CardContent className="pt-6">
            {isLoadingPlan ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
                <p>Cargando plan de recuperación...</p>
              </div>
            ) : generateMutation.isPending ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
                <p>Generando plan de recuperación académica...</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No hay planes de recuperación disponibles</h3>
                <p className="text-gray-500 mt-1 mb-6">
                  Selecciona un grupo y genera un nuevo plan de recuperación académica.
                </p>
                <Button 
                  variant="default" 
                  onClick={() => generateMutation.mutate()} 
                  disabled={!selectedGroupId || generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generar Plan
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecoveryPlanPage;