import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Clock, 
  CalendarDays, 
  UserCircle, 
  BookOpen, 
  Pencil, 
  Trash2, 
  AlertCircle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createAuthHeaders } from "@/services/auth-service";
import AddClassForm from "@/components/schedule/AddClassForm";
import EditClassForm from "@/components/schedule/EditClassForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Definir interfaz para los horarios
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
  modo: string;
  estatus: string;
}

// Definir interfaz para el grupo
interface Group {
  id: number;
  nombre: string;
  nivel: string;
  cicloEscolar: string;
}

// Mapeo de días de la semana para ordenar correctamente
const dayOrder: Record<string, number> = {
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5,
  "Sábado": 6,
  "Domingo": 7
};

// Array de días por defecto para usar si no hay datos
const defaultDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

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

// Mapeo de modalidades a colores
const modeColors: Record<string, string> = {
  "Presencial": "bg-green-100 text-green-800 border-green-300",
  "Virtual": "bg-blue-100 text-blue-800 border-blue-300",
  "Híbrido": "bg-purple-100 text-purple-800 border-purple-300"
};

export default function GroupSchedule() {
  const { id } = useParams<{ id: string }>();
  const groupId = parseInt(id);
  const [selectedDay, setSelectedDay] = useState<string>("Lunes");
  const [activeDay, setActiveDay] = useState<string>("Lunes");
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Consulta para obtener información del grupo
  const { 
    data: group, 
    isLoading: isLoadingGroup,
    error: groupError
  } = useQuery({
    queryKey: ['/api/groups', groupId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/groups/${groupId}`);
      return res.json() as Promise<Group>;
    },
    enabled: !!groupId && !isNaN(groupId)
  });
  
  // Consulta para obtener horarios del grupo filtrados por día
  const { 
    data: schedules, 
    isLoading: isLoadingSchedules,
    error: schedulesError,
    refetch: refetchSchedules
  } = useQuery({
    queryKey: ['/api/schedules', groupId, selectedDay],
    queryFn: async () => {
      // Convertir el formato "Lunes" a minúsculas para el API
      const dayParam = selectedDay.toLowerCase();
      const res = await apiRequest("GET", `/api/groups/${groupId}/schedules?day=${dayParam}`);
      return res.json() as Promise<Schedule[]>;
    },
    enabled: !!groupId && !isNaN(groupId)
  });
  
  // Actualizar la consulta cuando cambia el día seleccionado
  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    setActiveDay(day);
  };
  
  // Mostrar error si hay problemas al cargar
  useEffect(() => {
    if (groupError) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información del grupo",
        variant: "destructive"
      });
    }
    
    if (schedulesError) {
      toast({
        title: "Error",
        description: "No se pudo cargar los horarios del grupo",
        variant: "destructive"
      });
    }
  }, [groupError, schedulesError]);
  
  // Ordenar horarios por hora de inicio
  useEffect(() => {
    if (schedules && schedules.length > 0) {
      schedules.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    }
  }, [schedules]);
  
  // Función para abrir el modal de edición
  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsEditModalOpen(true);
  };
  
  // Función para confirmar la eliminación
  const handleDelete = (schedule: Schedule) => {
    setDeletingSchedule(schedule);
    setIsDeleteDialogOpen(true);
  };
  
  // Función para eliminar la clase
  const confirmDelete = async () => {
    if (!deletingSchedule) return;
    
    try {
      const res = await apiRequest(
        "DELETE", 
        `/api/groups/${groupId}/schedules/${deletingSchedule.id}`
      );
      
      if (res.ok) {
        toast({
          title: "Clase eliminada",
          description: "La clase ha sido eliminada del horario",
        });
        setIsDeleteDialogOpen(false);
        setDeletingSchedule(null);
        refetchSchedules();
      } else {
        const error = await res.json();
        throw new Error(error.message || "Error al eliminar la clase");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la clase",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/grupos">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a grupos
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {isLoadingGroup ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              `Horario: ${group?.nombre || 'Grupo no encontrado'}`
            )}
          </h1>
        </div>
        
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/grupos/${groupId}/horario/visual`}>
            <CalendarDays className="h-4 w-4 mr-1" />
            🗓️ Vista semanal
          </Link>
        </Button>
      </div>
      
      {/* Información del grupo */}
      {isLoadingGroup ? (
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ) : group ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información del Grupo</CardTitle>
            <CardDescription>Detalles del grupo y su horario semanal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Ciclo Escolar:</span> {group.cicloEscolar}
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Nivel:</span> {group.nivel}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Grupo no encontrado</CardTitle>
            <CardDescription>No se pudo encontrar la información del grupo solicitado</CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {/* Tabs para seleccionar el día */}
      <Tabs value={activeDay} onValueChange={handleDayChange} className="mb-6">
        <TabsList className="grid grid-cols-5 md:w-auto w-full">
          {defaultDays.map(day => (
            <TabsTrigger key={day} value={day}>
              {day}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {defaultDays.map(day => (
          <TabsContent key={day} value={day} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Horario del {day}
                </CardTitle>
                <CardDescription>
                  Clases programadas para este día
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSchedules ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(index => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : schedules && schedules.length > 0 ? (
                  <div className="space-y-3">
                    {schedules.map(schedule => (
                      <div 
                        key={schedule.id} 
                        className={`p-3 rounded-md border flex flex-col md:flex-row items-start md:items-center gap-4 ${getSubjectColor(schedule.materiaId)} group relative`}
                      >
                        <div className="flex items-center gap-2 min-w-32">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">
                            {schedule.horaInicio} - {schedule.horaFin}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-bold">{schedule.materiaNombre}</div>
                          {schedule.profesorNombre && (
                            <div className="text-sm flex items-center gap-1 mt-1">
                              <UserCircle className="h-3 w-3" />
                              {schedule.profesorNombre}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${modeColors[schedule.modo] || 'bg-gray-100'}`}>
                            {schedule.modo || 'No especificado'}
                          </Badge>
                          
                          {/* Botones de acción (aparecen al hacer hover) */}
                          <div className="hidden group-hover:flex items-center gap-2 sm:ml-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full bg-white/80 hover:bg-white"
                              onClick={() => handleEdit(schedule)}
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full bg-white/80 hover:bg-white"
                              onClick={() => handleDelete(schedule)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Agregar clase - Formulario */}
                    <AddClassForm 
                      groupId={groupId}
                      selectedDay={selectedDay}
                      onSuccess={() => refetchSchedules()}
                      schedules={schedules}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center py-6 text-muted-foreground">
                      No hay clases programadas para este día
                    </p>
                    
                    {/* Agregar clase - Formulario */}
                    <AddClassForm 
                      groupId={groupId}
                      selectedDay={selectedDay}
                      onSuccess={() => refetchSchedules()}
                      schedules={[]}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Modal de edición */}
      {editingSchedule && (
        <EditClassForm 
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          schedule={editingSchedule}
          groupId={groupId}
          onSuccess={() => {
            refetchSchedules();
            setEditingSchedule(null);
          }}
          allSchedules={schedules || []}
        />
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la clase de {deletingSchedule?.materiaNombre} 
              de {deletingSchedule?.horaInicio} a {deletingSchedule?.horaFin} 
              el día {deletingSchedule?.diaSemana}.
              <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-yellow-700">
                  Esta acción no se puede deshacer
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}