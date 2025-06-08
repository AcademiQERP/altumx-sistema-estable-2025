import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Clock, User, Building2, AlertCircle, Loader2, 
  FileCheck, BookOpen, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WeeklyScheduleGridProps {
  groupId?: number;
  groupName?: string;
  schedules?: Schedule[];
  isTeacherView?: boolean;
}

// Interfaz para los horarios
interface Schedule {
  id: number;
  grupoId: number;
  grupoNombre: string;
  materiaId: number;
  materiaNombre: string;
  profesorId: number | null;
  profesorNombre: string | null;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  modo: string | null;
  estatus: string;
}

// Horarios de inicio, desde 7:00 hasta 15:00
const timeSlots = [
  "07:00", "08:00", "09:00", "10:00", "11:00", 
  "12:00", "13:00", "14:00", "15:00"
];

// Días de la semana
const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

// Colores por modalidad
const modeColors: Record<string, string> = {
  "Presencial": "bg-green-100 border-green-300 text-green-800",
  "Virtual": "bg-blue-100 border-blue-300 text-blue-800",
  "Híbrido": "bg-purple-100 border-purple-300 text-purple-800",
  "default": "bg-gray-100 border-gray-300 text-gray-800"
};

// Colores para diferentes materias (generación dinámica)
const getSubjectColor = (subjectId: number): string => {
  const colors = [
    "bg-blue-100 border-blue-300 text-blue-800",
    "bg-green-100 border-green-300 text-green-800",
    "bg-amber-100 border-amber-300 text-amber-800",
    "bg-red-100 border-red-300 text-red-800",
    "bg-purple-100 border-purple-300 text-purple-800",
    "bg-teal-100 border-teal-300 text-teal-800",
    "bg-pink-100 border-pink-300 text-pink-800",
    "bg-indigo-100 border-indigo-300 text-indigo-800",
  ];
  
  return colors[subjectId % colors.length];
};

// Componente principal
function WeeklyScheduleGrid({ groupId, groupName, schedules: providedSchedules, isTeacherView = false }: WeeklyScheduleGridProps) {
  // Consulta para obtener los horarios solo si no se proporcionaron externamente y si hay un groupId
  const { 
    data: fetchedSchedules, 
    isLoading: isLoadingSchedules,
    error: schedulesError,
    refetch: refetchSchedules
  } = useQuery({
    queryKey: ['/api/groups', groupId, 'schedules'],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/groups/${groupId}/schedules`);
      return res.json() as Promise<Schedule[]>;
    },
    enabled: !!groupId && !isNaN(groupId) && !providedSchedules,
  });
  
  // Usar los horarios proporcionados si existen, de lo contrario usar los obtenidos por la consulta
  const schedules = providedSchedules || fetchedSchedules;

  // Manejar errores
  useEffect(() => {
    if (schedulesError) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios del grupo",
        variant: "destructive"
      });
    }
  }, [schedulesError]);

  // Función para convertir hora (HH:MM) a minutos desde las 00:00
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Función para determinar la posición y duración de una clase en la cuadrícula
  const getClassPosition = (startHour: string, endHour: string) => {
    // Convertir las horas a minutos desde las 00:00
    const startMinutes = timeToMinutes(startHour);
    const endMinutes = timeToMinutes(endHour);
    
    // Obtener la primera hora de la cuadrícula (07:00) en minutos
    const gridStartMinutes = timeToMinutes(timeSlots[0]); // 07:00 = 420 minutos
    
    // Calcular la posición relativa (en minutos) desde el inicio de la cuadrícula
    const startPositionMinutes = startMinutes - gridStartMinutes; 
    
    // Calcular la duración de la clase en minutos
    const durationMinutes = endMinutes - startMinutes;
    
    // Convertir a horas decimales para un posicionamiento más preciso
    // Esto permite manejar correctamente tiempos como 08:05
    const startRow = startPositionMinutes / 60;
    const duration = durationMinutes / 60;
    
    // Impresión para depuración (se puede eliminar en producción)
    console.log(`Cálculo para ${startHour}-${endHour}:`, {
      startMinutes,
      endMinutes,
      gridStartMinutes,
      startPositionMinutes,
      startRow,
      duration,
      durationMinutes
    });
    
    // Si algo está mal con los cálculos, utilizar valores predeterminados
    if (isNaN(startRow) || isNaN(duration) || startRow < 0 || duration <= 0) {
      console.warn(`Datos de horario inválidos: ${startHour} - ${endHour}`);
      return { startRow: 0, duration: 1, durationMinutes: 60 };
    }
    
    // Convertir durationMinutes a píxeles exactos (1 minuto = 1 píxel)
    const durationPixels = durationMinutes;
    
    return { 
      startRow, 
      duration, 
      durationMinutes: durationPixels // Ya estamos calculando en píxeles (1 minuto = 1 píxel)
    };
  };
  
  // Función para renderizar las clases en un día específico
  const renderClassesForDay = (day: string) => {
    if (!schedules || isLoadingSchedules) return null;
    
    return schedules
      .filter(schedule => schedule.diaSemana.toLowerCase() === day.toLowerCase())
      .map(schedule => {
        const { startRow, duration, durationMinutes } = getClassPosition(schedule.horaInicio, schedule.horaFin);
        const colorClass = schedule.modo ? modeColors[schedule.modo] || modeColors.default : getSubjectColor(schedule.materiaId);
        
        // Factor de escala: 1 hora = 60px
        const PIXELS_PER_HOUR = 60;
        const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60; // 1 minuto = 1px

        // Calcular altura exacta basada en la duración real
        // Para 1 hora (60 minutos) = 60 píxeles
        const exactHeight = durationMinutes * PIXELS_PER_MINUTE;
        
        // Para contenido mínimo necesario (en caso de clases muy cortas)
        const hasActionButtons = isTeacherView;
        const contentMinHeight = hasActionButtons ? 110 : 90;
        
        // Si el bloque es demasiado pequeño para mostrar todo el contenido,
        // agregar un scroll interno y no expandirlo más allá de su duración real
        const needsScroll = exactHeight < contentMinHeight;
        
        // Clases adicionales basadas en si necesitamos scroll
        const additionalClasses = needsScroll ? "overflow-y-auto" : "";
        
        return (
          <div 
            key={schedule.id}
            className={`absolute border rounded-md px-3 py-2 shadow-sm ${colorClass} w-full left-0 right-0 ${additionalClasses}`}
            style={{
              top: `calc(${startRow * 60}px)`,
              height: `${exactHeight}px`, // Altura exacta basada en la duración real
              zIndex: 10,
              // Sin minHeight para mantener la proporción exacta
            }}
          >
            {/* Nombre de materia */}
            <div className="font-medium leading-normal">
              {schedule.materiaNombre || "Clase sin nombre"}
            </div>
            
            {/* Nombre de grupo con ícono */}
            <div className="text-xs mt-1 flex items-start gap-1 leading-normal">
              <Building2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="text-ellipsis font-medium">
                {schedule.grupoNombre || "Grupo no asignado"}
              </span>
            </div>
            
            {/* Profesor */}
            <div className="text-xs mt-1 flex items-start gap-1 leading-normal">
              <User className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="text-ellipsis">{schedule.profesorNombre || "Profesor no asignado"}</span>
            </div>
            
            {/* Horario */}
            <div className="text-xs mt-1 flex items-start gap-1">
              <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{schedule.horaInicio} - {schedule.horaFin}</span>
            </div>
            
            {/* Modalidad */}
            <div className="text-xs mt-1">
              <Badge variant="outline" className="text-xs py-0 px-1">
                {schedule.modo || "Sin modalidad"}
              </Badge>
            </div>
            
            {/* Botones de acción rápida */}
            {isTeacherView && (
              <div className="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-gray-200">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 rounded-full hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/asistencias?grupoId=${schedule.grupoId}&materiaId=${schedule.materiaId}`;
                        }}
                      >
                        <FileCheck className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Registrar asistencia</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 rounded-full hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/tareas?grupoId=${schedule.grupoId}&materiaId=${schedule.materiaId}`;
                        }}
                      >
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Administrar tareas</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 rounded-full hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/calificaciones?grupoId=${schedule.grupoId}&materiaId=${schedule.materiaId}`;
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Ver calificaciones</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        );
      });
  };

  const renderHeader = () => {
    if (isTeacherView) {
      return (
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">
            Mi Horario Semanal
          </h1>
        </div>
      );
    }
    
    if (groupId && groupName) {
      return (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/grupos/${groupId}/horario`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al horario
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            Horario Semanal: {groupName}
          </h1>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">
          Horario Semanal
        </h1>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        {renderHeader()}
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Vista de calendario semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-w-full w-full">
            <div className="min-h-[600px] w-full">
              {/* Grid de horarios */}
              <div className="grid grid-cols-6 border border-gray-200 rounded-md">
                {/* Encabezado con días de la semana */}
                <div className="border-b border-r border-gray-200 p-2 font-medium bg-gray-50 sticky top-0 left-0 z-10"></div>
                {weekDays.map(day => (
                  <div key={day} className="border-b border-r border-gray-200 p-3 font-medium bg-gray-50 text-center sticky top-0 z-10">
                    {day}
                  </div>
                ))}
                
                {/* Filas de horarios */}
                {timeSlots.map((time, index) => (
                  <div key={time} className="contents">
                    {/* Columna de hora */}
                    <div className="border-b last:border-b-0 border-r border-gray-200 p-2 font-mono text-sm text-gray-600 h-[60px] sticky left-0 bg-white z-10 flex items-center">
                      {time}
                    </div>
                    
                    {/* Celdas para cada día - Se eliminó la clase last:border-r-0 para que el viernes muestre bordes */}
                    {weekDays.map(day => (
                      <div 
                        key={`${day}-${time}`} 
                        className="border-b border-r border-gray-200 relative h-[60px]"
                      >
                        {/* Aquí se renderizarán las clases */}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Clases (superpuestas en el grid) */}
              <div className="relative -mt-[calc(9*60px)] pointer-events-none">
                {weekDays.map((day, dayIndex) => (
                  <div 
                    key={day} 
                    className="absolute pointer-events-auto"
                    style={{ 
                      left: `calc(${100/6}% + ${dayIndex * (100 / 6)}%)`, 
                      width: `calc(${100 / 6}%)`,
                      height: '100%',
                      // Eliminado translateX para evitar desplazamiento
                    }}
                  >
                    {renderClassesForDay(day)}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Estado de carga o mensaje sin horarios */}
          {isLoadingSchedules ? (
            <div className="flex flex-col items-center justify-center mt-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Cargando horarios...</p>
            </div>
          ) : schedules && schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center border rounded-md bg-muted/20 p-8 mt-4">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No hay clases programadas</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                {isTeacherView 
                  ? "No se encontraron clases asignadas a su horario."
                  : "No se encontraron clases programadas para este grupo."}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

// Exportación por defecto para compatibilidad
export default WeeklyScheduleGrid;