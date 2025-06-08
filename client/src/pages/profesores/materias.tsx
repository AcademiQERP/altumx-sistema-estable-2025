import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, Search, BookOpen, Users, RefreshCcw } from "lucide-react";
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

export default function TeacherSubjects() {
  const [match, params] = useRoute("/profesores/:id/materias");
  const [, navigate] = useLocation();
  const teacherId = params?.id;
  const [searchTerm, setSearchTerm] = React.useState("");

  // Obtener detalles del profesor
  const { 
    data: teacher, 
    isLoading: isLoadingTeacher,
    error: teacherError
  } = useQuery({
    queryKey: [`/api/teachers/${teacherId}`],
    enabled: !!teacherId
  });

  // Obtener asignaciones de materias del profesor
  const { 
    data: assignmentsResponse, 
    isLoading: isLoadingAssignments, 
    error: assignmentsError,
    refetch: refetchAssignments
  } = useQuery({
    queryKey: [`/api/subject-assignments/teacher/${teacherId}`],
    enabled: !!teacherId
  });
  
  // Extraer los datos de asignaciones de la respuesta
  const assignments = React.useMemo(() => {
    if (!assignmentsResponse) return [];
    
    // Si es un array directo (formato antiguo), usarlo como está
    if (Array.isArray(assignmentsResponse)) {
      return assignmentsResponse;
    }
    
    // Si es el nuevo formato con {success, data, count}, extraer la propiedad data
    if (assignmentsResponse && typeof assignmentsResponse === 'object' && 'data' in assignmentsResponse) {
      return assignmentsResponse.data || [];
    }
    
    // Si no coincide con ninguno de los formatos esperados, devolver array vacío
    console.error('Formato de respuesta no reconocido:', assignmentsResponse);
    return [];
  }, [assignmentsResponse]);

  // Obtener todos los grupos para obtener más información
  const { 
    data: groups = [], 
    isLoading: isLoadingGroups
  } = useQuery({
    queryKey: ["/api/groups"],
  });

  // Obtener todas las materias para obtener más información
  const { 
    data: subjects = [], 
    isLoading: isLoadingSubjects
  } = useQuery({
    queryKey: ["/api/subjects"],
  });

  // Obtener nombres de materias y grupos - memoizados para evitar recreaciones
  const getGroupName = React.useCallback((groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    return group?.nombre || "Grupo desconocido";
  }, [groups]);

  const getSubjectDetails = React.useCallback((subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject || { nombre: "Materia desconocida", nivel: "Desconocido" };
  }, [subjects]);

  // Filtrar materias por término de búsqueda
  const filteredAssignments = searchTerm 
    ? assignments.filter(assignment => {
        const group = getGroupName(assignment.grupoId);
        const subject = getSubjectDetails(assignment.materiaId);
        
        return (
          group.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subject.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subject.nivel.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : assignments;

  // Función para agrupar asignaciones por materia
  const groupedAssignments = React.useMemo(() => {
    // Validación adicional para evitar errores con reduce()
    if (!Array.isArray(filteredAssignments)) {
      console.error("filteredAssignments no es un array:", filteredAssignments);
      return [];
    }
    
    return filteredAssignments.reduce((acc, assignment) => {
      if (!assignment || typeof assignment !== 'object') {
        console.warn("Asignación inválida:", assignment);
        return acc;
      }
      
      try {
        const subjectDetails = getSubjectDetails(assignment.materiaId);
        const existing = acc.find(item => item.subjectId === assignment.materiaId);
        
        if (existing) {
          existing.groups.push({
            id: assignment.grupoId,
            name: getGroupName(assignment.grupoId)
          });
        } else {
          acc.push({
            subjectId: assignment.materiaId,
            subjectName: subjectDetails.nombre,
            level: subjectDetails.nivel,
            groups: [{
              id: assignment.grupoId,
              name: getGroupName(assignment.grupoId)
            }]
          });
        }
      } catch (error) {
        console.error("Error procesando asignación:", error, assignment);
      }
      
      return acc;
    }, [] as Array<{
      subjectId: number;
      subjectName: string;
      level: string;
      groups: Array<{id: number, name: string}>
    }>);
  }, [filteredAssignments, getSubjectDetails, getGroupName]);

  const isLoading = isLoadingTeacher || isLoadingAssignments || isLoadingGroups || isLoadingSubjects;
  const hasError = teacherError || assignmentsError;

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
          <h1 className="text-2xl font-bold">Materias asignadas</h1>
          {teacher && <p className="text-muted-foreground">Profesor: {teacher.nombreCompleto}</p>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Materias asignadas al profesor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar materias..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetchAssignments()}>
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
                Ocurrió un error al cargar las materias asignadas
              </p>
              <Button variant="outline" onClick={() => refetchAssignments()}>
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
                    <TableHead>Materia</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Grupos asignados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={3} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : groupedAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        {searchTerm ? "No se encontraron materias que coincidan con la búsqueda" : "No hay materias asignadas"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedAssignments.map((subject) => (
                      <TableRow key={subject.subjectId} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center">
                            <BookOpen className="h-5 w-5 mr-2 text-primary" />
                            <span className="font-medium">{subject.subjectName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{subject.level}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {subject.groups.map((group, idx) => (
                              <Badge key={idx} variant="secondary" className="mr-1">
                                <Users className="w-3 h-3 mr-1" />
                                {group.name}
                              </Badge>
                            ))}
                          </div>
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
    </div>
  );
}