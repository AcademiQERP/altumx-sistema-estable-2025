import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, Search, BookOpen, Users, CalendarDays, RefreshCcw, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function TeacherGroups() {
  const [match, params] = useRoute("/profesores/:id/grupos");
  const [, navigate] = useLocation();
  const teacherId = params?.id;
  const [searchTerm, setSearchTerm] = React.useState("");
  const [groupToDelete, setGroupToDelete] = React.useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const { toast } = useToast();

  // Obtener detalles del profesor
  const { 
    data: teacher, 
    isLoading: isLoadingTeacher,
    error: teacherError
  } = useQuery({
    queryKey: [`/api/teachers/${teacherId}`],
    enabled: !!teacherId
  });

  // Obtener los grupos asignados al profesor mediante la tabla group_teachers
  const {
    data: assignedGroups = [],
    isLoading: isLoadingAssignedGroups,
    error: assignedGroupsError,
    refetch: refetchAssignedGroups
  } = useQuery({
    queryKey: [`/api/teachers/${teacherId}/groups`],
    enabled: !!teacherId
  });

  // Obtener asignaciones de materias del profesor
  const { 
    data: assignmentsResponse, 
    isLoading: isLoadingAssignments, 
    error: assignmentsError
  } = useQuery({
    queryKey: [`/api/subject-assignments/teacher/${teacherId}`],
    enabled: !!teacherId
  });
  
  // Aseguramos que assignments sea siempre un array
  const assignments = React.useMemo(() => {
    if (!assignmentsResponse) return [];
    if (Array.isArray(assignmentsResponse)) return assignmentsResponse;
    // Si la respuesta es un objeto con una propiedad 'data' que es un array, usar ese array
    if (assignmentsResponse && typeof assignmentsResponse === 'object' && 'data' in assignmentsResponse) {
      return Array.isArray(assignmentsResponse.data) ? assignmentsResponse.data : [];
    }
    // En cualquier otro caso, devolver un array vacío
    console.warn("Formato inesperado para assignments:", assignmentsResponse);
    return [];
  }, [assignmentsResponse]);

  // Obtener todas las materias para obtener más información
  const { 
    data: subjects = [], 
    isLoading: isLoadingSubjects
  } = useQuery({
    queryKey: ["/api/subjects"],
  });

  // Mutation para eliminar una asignación de grupo a profesor
  const removeGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await apiRequest(
        "DELETE", 
        `/api/groups/${groupId}/teachers/${teacherId}`
      );
    },
    onSuccess: () => {
      toast({
        title: "Grupo desasignado",
        description: "El grupo ha sido desasignado del profesor correctamente.",
        variant: "default",
      });
      // Actualizar datos
      refetchAllData();
      // Cerrar diálogo
      setConfirmDialogOpen(false);
      setGroupToDelete(null);
    },
    onError: (error) => {
      console.error("Error al desasignar grupo:", error);
      toast({
        title: "Error",
        description: "No se pudo desasignar el grupo del profesor. Inténtelo de nuevo.",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
    }
  });

  // Función para abrir el diálogo de confirmación
  const openDeleteConfirm = (groupId: number) => {
    setGroupToDelete(groupId);
    setConfirmDialogOpen(true);
  };

  // Función para confirmar la eliminación
  const confirmDelete = () => {
    if (groupToDelete !== null) {
      removeGroupMutation.mutate(groupToDelete);
    }
  };

  // Función para obtener el nombre de la materia
  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.nombre || "Materia desconocida";
  };

  // Función para obtener el nombre del grupo a eliminar
  const getGroupNameToDelete = () => {
    // Forzamos el tipo para que TypeScript sepa que es un array
    const groups = Array.isArray(assignedGroups) ? assignedGroups : [];
    const group = groups.find(g => g.id === groupToDelete);
    return group ? group.nombre : "este grupo";
  };

  // Combinar los datos de grupos asignados con asignaciones de materias
  const combinedGroupData = React.useMemo(() => {
    if (!assignedGroups || assignedGroups.length === 0) {
      return [];
    }
    
    return assignedGroups.map(group => {
      // Encontrar las materias que el profesor imparte en este grupo
      const groupSubjects = assignments
        .filter(assignment => assignment.grupoId === group.id)
        .map(assignment => ({
          id: assignment.materiaId,
          name: getSubjectName(assignment.materiaId)
        }));

      return {
        groupId: group.id,
        groupName: group.nombre,
        level: group.nivel,
        cicloEscolar: group.cicloEscolar,
        subjects: groupSubjects
      };
    });
  }, [assignedGroups, assignments, subjects]);

  // Filtrar grupos por término de búsqueda
  const filteredGroups = React.useMemo(() => {
    if (!searchTerm) {
      return combinedGroupData;
    }
    
    return combinedGroupData.filter(group => {
      // Buscar en el nombre del grupo, nivel o ciclo escolar
      const groupMatches = 
        group.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.cicloEscolar && group.cicloEscolar.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Buscar en los nombres de las materias
      const subjectMatches = group.subjects.some(subject => 
        subject.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return groupMatches || subjectMatches;
    });
  }, [combinedGroupData, searchTerm]);

  // Refrescar todos los datos relacionados
  const refetchAllData = () => {
    refetchAssignedGroups();
    queryClient.invalidateQueries({ queryKey: [`/api/subject-assignments/teacher/${teacherId}`] });
  };

  const isLoading = isLoadingTeacher || isLoadingAssignedGroups || isLoadingAssignments || isLoadingSubjects;
  const hasError = teacherError || assignedGroupsError || assignmentsError;

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profesores")}
          className="mr-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Grupos asignados</h1>
          {teacher && <p className="text-muted-foreground">Profesor: {teacher.nombreCompleto}</p>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Grupos asignados al profesor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar grupos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={refetchAllData}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          {hasError && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-destructive mb-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium">Error al cargar datos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar los grupos asignados
              </p>
              <Button variant="outline" onClick={refetchAllData}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
            </div>
          )}

          {!hasError && (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Ciclo Escolar</TableHead>
                    <TableHead>Materias asignadas</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        {searchTerm ? "No se encontraron grupos que coincidan con la búsqueda" : "No hay grupos asignados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups.map((group) => (
                      <TableRow key={group.groupId} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-5 w-5 mr-2 text-primary" />
                            <span className="font-medium">{group.groupName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-ring/30 bg-background">
                            {group.level}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            <CalendarDays className="w-3 h-3 mr-1" />
                            {group.cicloEscolar || "No especificado"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.subjects.length === 0 ? (
                              <span className="text-muted-foreground text-sm italic">
                                No hay materias asignadas
                              </span>
                            ) : (
                              group.subjects.map((subject, idx) => (
                                <div 
                                  key={idx} 
                                  className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground mr-1"
                                >
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  {subject.name}
                                </div>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteConfirm(group.groupId)}
                            title="Eliminar asignación"
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación para eliminar grupo */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirmar eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar la asignación del grupo <strong>{getGroupNameToDelete()}</strong> del profesor <strong>{teacher?.nombreCompleto}</strong>?
              <br /><br />
              <span className="font-medium">Esta acción no puede deshacerse y solo elimina la relación, no el grupo ni el profesor.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeGroupMutation.isPending ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar asignación"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}