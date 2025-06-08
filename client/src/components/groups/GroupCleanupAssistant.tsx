import React, { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  UsersRound, 
  BookOpen, 
  Calendar, 
  Timer, 
  User, 
  FileText, 
  Bell, 
  Award, 
  ClipboardCheck, 
  Archive, 
  ArrowRight, 
  Loader2 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { type Group } from "@shared/schema";

// Tipos para las dependencias del grupo
interface Dependencies {
  hasDependencies: boolean;
  details: {
    students?: number;
    assignments?: number;
    schedules?: number;
    teachers?: number;
    tasks?: number;
    observaciones?: number;
    avisos?: number;
    asignacionesCriterios?: number;
    grades?: number;
    attendance?: number;
    error?: string;
    message?: string;
  };
}

interface DetailedDependencies {
  students: {
    id: number;
    nombreCompleto: string;
  }[];
  assignments: {
    id: number;
    materiaId: number;
    nombreMateria: string;
    profesorId: number;
    nombreProfesor: string;
  }[];
  schedules: {
    id: number;
    dia: string;
    horaInicio: string;
    horaFin: string;
    materiaId: number;
    nombreMateria: string;
  }[];
  teachers: {
    id: number;
    nombreCompleto: string;
  }[];
  grades: {
    count: number;
    materias: {
      id: number;
      nombre: string;
      calificaciones: number;
    }[];
  };
  attendance: {
    count: number;
  };
}

// Opciones para la limpieza del grupo
interface CleanupOptions {
  moveStudentsToGroupId?: number;
  unlinkSubjects?: boolean;
  removeSchedules?: boolean;
  removeTeachers?: boolean;
  archiveGroup?: boolean;
}

interface GroupCleanupAssistantProps {
  groupId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function GroupCleanupAssistant({ 
  groupId, 
  isOpen, 
  onClose, 
  onComplete 
}: GroupCleanupAssistantProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado para las opciones de limpieza
  const [cleanupOptions, setCleanupOptions] = useState<CleanupOptions>({
    unlinkSubjects: false,
    removeSchedules: false,
    removeTeachers: false,
    archiveGroup: false,
  });
  
  // Estado para el paso actual del asistente
  const [currentStep, setCurrentStep] = useState<'analyzing' | 'options' | 'executing' | 'complete'>('analyzing');
  
  // Cargar datos del grupo y sus dependencias
  const { 
    data: groupData, 
    isLoading: isLoadingGroupData,
    isError: isErrorGroupData,
    error: groupDataError
  } = useQuery({
    queryKey: ['/api/group-cleanup', groupId, 'dependencies'],
    queryFn: async () => {
      if (!groupId) return null;
      const response = await apiRequest("GET", `/api/group-cleanup/${groupId}/dependencies`);
      return response.json();
    },
    enabled: !!groupId && isOpen,
  });
  
  // Cargar grupos disponibles para mover estudiantes
  const { 
    data: availableGroups = { groups: [] }, 
    isLoading: isLoadingGroups 
  } = useQuery({
    queryKey: ['/api/group-cleanup/available-groups', groupId],
    queryFn: async () => {
      if (!groupId) return { groups: [] };
      const response = await apiRequest(
        "GET", 
        `/api/group-cleanup/available-groups?excludeId=${groupId}&level=${encodeURIComponent(groupData?.group?.nivel || '')}`
      );
      return response.json();
    },
    enabled: !!groupId && !!groupData?.group?.nivel && isOpen && currentStep === 'options',
  });
  
  // Mutation para ejecutar la limpieza
  const cleanupMutation = useMutation({
    mutationFn: async (options: CleanupOptions) => {
      if (!groupId) throw new Error("ID de grupo no proporcionado");
      const response = await apiRequest("POST", `/api/group-cleanup/${groupId}/cleanup`, options);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentStep('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      toast({
        title: "Limpieza completada",
        description: data.message || "Se ha completado la limpieza del grupo según las opciones seleccionadas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al realizar la limpieza: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para archivar grupo
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error("ID de grupo no proporcionado");
      const response = await apiRequest("POST", `/api/group-cleanup/${groupId}/archive`);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentStep('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      toast({
        title: "Grupo archivado",
        description: data.message || "El grupo ha sido archivado correctamente y no aparecerá en las listas principales.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al archivar el grupo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      });
    }
  });
  
  // Manejar cambios en las opciones de limpieza
  const handleOptionChange = (option: keyof CleanupOptions, value: boolean | number | undefined) => {
    setCleanupOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };
  
  // Ejecutar la limpieza con las opciones seleccionadas
  const executeCleanup = () => {
    setCurrentStep('executing');
    cleanupMutation.mutate(cleanupOptions);
  };
  
  // Ejecutar el archivado del grupo
  const archiveGroup = () => {
    setCurrentStep('executing');
    archiveMutation.mutate();
  };
  
  // Completar el asistente
  const handleComplete = () => {
    onClose();
    onComplete();
  };
  
  // Renderizar contenido según el paso actual
  const renderContent = () => {
    if (isLoadingGroupData) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Analizando dependencias del grupo...</p>
        </div>
      );
    }
    
    if (isErrorGroupData) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-sm text-destructive mb-2">Error al analizar el grupo</p>
          <p className="text-xs text-muted-foreground">
            {groupDataError instanceof Error ? groupDataError.message : 'Error desconocido'}
          </p>
          <Button variant="outline" onClick={onClose} className="mt-4">
            Cerrar
          </Button>
        </div>
      );
    }
    
    if (!groupData || !groupData.group) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-sm text-destructive">Grupo no encontrado</p>
          <Button variant="outline" onClick={onClose} className="mt-4">
            Cerrar
          </Button>
        </div>
      );
    }
    
    const group = groupData.group as Group;
    const dependencies = groupData.dependencies as Dependencies;
    const detailedDependencies = groupData.detailedDependencies as DetailedDependencies | null;
    
    // Paso 1: Analizando dependencias
    if (currentStep === 'analyzing') {
      return (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">
              Grupo: {group.nombre} ({group.nivel})
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {group.cicloEscolar || 'Sin ciclo escolar asignado'}
            </p>
            
            <div className="my-4">
              <h4 className="text-md font-medium mb-2">Resultado del análisis:</h4>
              
              {dependencies.hasDependencies ? (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Este grupo tiene dependencias
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {groupData.deleteReason || "El grupo tiene elementos asociados que deben ser gestionados antes de eliminarlo."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          El grupo puede ser eliminado
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Este grupo no tiene dependencias y puede ser eliminado de forma segura.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {dependencies.hasDependencies && (
              <div className="my-6">
                <h4 className="text-md font-medium mb-3">Dependencias encontradas:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dependencies.details.students && dependencies.details.students > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <UsersRound className="h-5 w-5 text-blue-500" />
                      <span className="text-sm">{dependencies.details.students} estudiante(s)</span>
                    </div>
                  )}
                  
                  {dependencies.details.assignments && dependencies.details.assignments > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <BookOpen className="h-5 w-5 text-indigo-500" />
                      <span className="text-sm">{dependencies.details.assignments} asignación(es) de materia</span>
                    </div>
                  )}
                  
                  {dependencies.details.schedules && dependencies.details.schedules > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <Calendar className="h-5 w-5 text-purple-500" />
                      <span className="text-sm">{dependencies.details.schedules} horario(s)</span>
                    </div>
                  )}
                  
                  {dependencies.details.teachers && dependencies.details.teachers > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <User className="h-5 w-5 text-teal-500" />
                      <span className="text-sm">{dependencies.details.teachers} profesor(es)</span>
                    </div>
                  )}
                  
                  {dependencies.details.grades && dependencies.details.grades > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <Award className="h-5 w-5 text-amber-500" />
                      <span className="text-sm">{dependencies.details.grades} calificación(es)</span>
                    </div>
                  )}
                  
                  {dependencies.details.attendance && dependencies.details.attendance > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm">{dependencies.details.attendance} registro(s) de asistencia</span>
                    </div>
                  )}
                  
                  {dependencies.details.tasks && dependencies.details.tasks > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="text-sm">{dependencies.details.tasks} tarea(s)</span>
                    </div>
                  )}
                  
                  {dependencies.details.observaciones && dependencies.details.observaciones > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <FileText className="h-5 w-5 text-orange-500" />
                      <span className="text-sm">{dependencies.details.observaciones} observación(es)</span>
                    </div>
                  )}
                  
                  {dependencies.details.avisos && dependencies.details.avisos > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <Bell className="h-5 w-5 text-pink-500" />
                      <span className="text-sm">{dependencies.details.avisos} aviso(s)</span>
                    </div>
                  )}
                  
                  {dependencies.details.asignacionesCriterios && dependencies.details.asignacionesCriterios > 0 && (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      <Award className="h-5 w-5 text-cyan-500" />
                      <span className="text-sm">{dependencies.details.asignacionesCriterios} criterio(s) de evaluación</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {detailedDependencies && (
              <div className="my-6">
                <h4 className="text-md font-medium mb-3">Detalles:</h4>
                
                {detailedDependencies.students && detailedDependencies.students.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2 flex items-center">
                      <UsersRound className="h-4 w-4 mr-1 text-blue-500" />
                      Estudiantes ({detailedDependencies.students.length})
                    </h5>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-1">
                        {detailedDependencies.students.map(student => (
                          <div key={student.id} className="text-sm py-1">
                            {student.nombreCompleto}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                
                {detailedDependencies.assignments && detailedDependencies.assignments.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2 flex items-center">
                      <BookOpen className="h-4 w-4 mr-1 text-indigo-500" />
                      Asignaciones de materias ({detailedDependencies.assignments.length})
                    </h5>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-1">
                        {detailedDependencies.assignments.map(assignment => (
                          <div key={assignment.id} className="text-sm py-1">
                            <span className="font-medium">{assignment.nombreMateria}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              (Profesor: {assignment.nombreProfesor})
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                
                {detailedDependencies.grades && detailedDependencies.grades.count > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-1 text-amber-500" />
                      Calificaciones ({detailedDependencies.grades.count})
                    </h5>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-1">
                        {detailedDependencies.grades.materias.map(materia => (
                          <div key={materia.id} className="text-sm py-1">
                            <span className="font-medium">{materia.nombre}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({materia.calificaciones} calificación(es))
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => setCurrentStep('options')}>
              Opciones de limpieza
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </>
      );
    }
    
    // Paso 2: Opciones de limpieza
    if (currentStep === 'options') {
      return (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">
              Opciones de limpieza para: {group.nombre}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Seleccione las acciones que desea realizar para resolver las dependencias
            </p>
            
            <div className="space-y-6">
              {/* Opción para mover estudiantes */}
              {dependencies.details.students && dependencies.details.students > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center">
                      <UsersRound className="mr-2 h-4 w-4 text-blue-500" />
                      Mover estudiantes ({dependencies.details.students})
                    </Label>
                    <Checkbox 
                      checked={!!cleanupOptions.moveStudentsToGroupId}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          handleOptionChange('moveStudentsToGroupId', undefined);
                        }
                      }}
                    />
                  </div>
                  
                  {!!cleanupOptions.moveStudentsToGroupId || (
                    <p className="text-sm text-muted-foreground ml-6">
                      Mover todos los estudiantes a otro grupo.
                    </p>
                  )}
                  
                  {!!cleanupOptions.moveStudentsToGroupId && (
                    <div className="pl-6">
                      <Label className="mb-1.5 block text-sm">Seleccione el grupo destino:</Label>
                      <Select
                        value={cleanupOptions.moveStudentsToGroupId?.toString() || ""}
                        onValueChange={(value) => handleOptionChange('moveStudentsToGroupId', parseInt(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar grupo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingGroups ? (
                            <SelectItem value="loading" disabled>Cargando grupos...</SelectItem>
                          ) : availableGroups.groups.length === 0 ? (
                            <SelectItem value="none" disabled>No hay grupos disponibles</SelectItem>
                          ) : (
                            availableGroups.groups.map((g: Group) => (
                              <SelectItem key={g.id} value={g.id.toString()}>
                                {g.nombre} ({g.nivel})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              
              {/* Opción para desvincular materias */}
              {dependencies.details.assignments && dependencies.details.assignments > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center">
                      <BookOpen className="mr-2 h-4 w-4 text-indigo-500" />
                      Desvincular materias ({dependencies.details.assignments})
                    </Label>
                    <Checkbox 
                      checked={cleanupOptions.unlinkSubjects}
                      onCheckedChange={(checked) => handleOptionChange('unlinkSubjects', !!checked)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Eliminar todas las asignaciones de materias a este grupo.
                  </p>
                </div>
              )}
              
              {/* Opción para eliminar horarios */}
              {dependencies.details.schedules && dependencies.details.schedules > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                      Eliminar horarios ({dependencies.details.schedules})
                    </Label>
                    <Checkbox 
                      checked={cleanupOptions.removeSchedules}
                      onCheckedChange={(checked) => handleOptionChange('removeSchedules', !!checked)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Eliminar todos los horarios asociados a este grupo.
                  </p>
                </div>
              )}
              
              {/* Opción para desvincular profesores */}
              {dependencies.details.teachers && dependencies.details.teachers > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center">
                      <User className="mr-2 h-4 w-4 text-teal-500" />
                      Desvincular profesores ({dependencies.details.teachers})
                    </Label>
                    <Checkbox 
                      checked={cleanupOptions.removeTeachers}
                      onCheckedChange={(checked) => handleOptionChange('removeTeachers', !!checked)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Quitar las asignaciones de profesores a este grupo.
                  </p>
                </div>
              )}
              
              {/* Opción para archivar grupo */}
              <div className="pt-2">
                <Separator className="my-4" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base flex items-center">
                      <Archive className="mr-2 h-4 w-4 text-amber-500" />
                      Archivar grupo
                    </Label>
                    <Checkbox 
                      checked={cleanupOptions.archiveGroup}
                      onCheckedChange={(checked) => handleOptionChange('archiveGroup', !!checked)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    En lugar de eliminar el grupo, cambiar su estado a "archivado" para preservar los datos históricos.
                  </p>
                </div>
              </div>
              
              {/* Aviso cuando hay calificaciones o asistencias */}
              {((dependencies.details.grades && dependencies.details.grades > 0) ||
                (dependencies.details.attendance && dependencies.details.attendance > 0)) && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 mt-4">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Este grupo tiene datos importantes
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          El grupo tiene calificaciones y/o registros de asistencia asociados. 
                          Para preservar los datos históricos, se recomienda archivarlo en lugar de eliminarlo.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrentStep('analyzing')}>
              Atrás
            </Button>
            
            {cleanupOptions.archiveGroup ? (
              <Button 
                variant="default"
                onClick={archiveGroup}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archivar grupo
              </Button>
            ) : (
              <Button 
                onClick={executeCleanup}
                disabled={
                  (dependencies.details.students && dependencies.details.students > 0 && !cleanupOptions.moveStudentsToGroupId) &&
                  !Object.values(cleanupOptions).some(value => Boolean(value))
                }
              >
                Ejecutar limpieza
              </Button>
            )}
          </DialogFooter>
        </>
      );
    }
    
    // Paso 3: Ejecutando limpieza
    if (currentStep === 'executing') {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">
            {cleanupOptions.archiveGroup ? 'Archivando grupo...' : 'Ejecutando limpieza...'}
          </p>
        </div>
      );
    }
    
    // Paso 4: Completado
    if (currentStep === 'complete') {
      const resultData = cleanupMutation.data || archiveMutation.data;
      const wasArchived = cleanupOptions.archiveGroup || (resultData && resultData.details && resultData.details.archivedGroup);
      
      return (
        <>
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-center">
              {wasArchived ? 'Grupo archivado' : 'Limpieza completada'}
            </h3>
            <p className="text-sm text-center text-muted-foreground mb-4">
              {resultData?.message || (wasArchived 
                ? 'El grupo ha sido archivado y no aparecerá en las listas principales.' 
                : 'La limpieza del grupo se ha realizado correctamente.')
              }
            </p>
            
            {resultData && resultData.details && !wasArchived && (
              <Card className="w-full border-green-200 bg-green-50 dark:bg-green-950/20 mt-2">
                <CardContent className="pt-4">
                  <div className="space-y-1">
                    {resultData.details.movedStudents > 0 && (
                      <div className="flex items-center text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        <span>{resultData.details.movedStudents} estudiante(s) movido(s)</span>
                      </div>
                    )}
                    {resultData.details.unlinkedSubjects > 0 && (
                      <div className="flex items-center text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        <span>{resultData.details.unlinkedSubjects} materia(s) desvinculada(s)</span>
                      </div>
                    )}
                    {resultData.details.removedSchedules > 0 && (
                      <div className="flex items-center text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        <span>{resultData.details.removedSchedules} horario(s) eliminado(s)</span>
                      </div>
                    )}
                    {resultData.details.removedTeachers > 0 && (
                      <div className="flex items-center text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        <span>{resultData.details.removedTeachers} profesor(es) desvinculado(s)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {resultData && resultData.canDeleteAfterCleanup === true && (
              <Card className="w-full border-green-200 bg-green-50 dark:bg-green-950/20 mt-4">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800 dark:text-green-300">
                      El grupo ahora puede ser eliminado de forma segura.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {resultData && resultData.canDeleteAfterCleanup === false && !wasArchived && (
              <Card className="w-full border-amber-200 bg-amber-50 dark:bg-amber-950/20 mt-4">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        El grupo aún tiene dependencias
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {resultData.deleteReason || "El grupo todavía tiene elementos asociados que impiden su eliminación."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={handleComplete}>
              Finalizar
            </Button>
          </DialogFooter>
        </>
      );
    }
    
    return null;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Asistente de Limpieza de Grupo</DialogTitle>
          <DialogDescription>
            Analice las dependencias y prepare el grupo para su eliminación segura
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}