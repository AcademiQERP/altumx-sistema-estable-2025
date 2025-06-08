import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PlusCircle, Search, Edit, Trash2, LinkIcon, RefreshCcw } from "lucide-react";
import { SubjectAssignment, Group, Subject, Teacher } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssignmentsList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [assignmentToDelete, setAssignmentToDelete] = useState<SubjectAssignment | null>(null);

  const { data: assignments, isLoading: isLoadingAssignments, isError: isErrorAssignments, refetch } = useQuery<SubjectAssignment[]>({
    queryKey: ["/api/assignments"],
  });

  const { data: groups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  // Find group, subject, and teacher names by their IDs
  const getGroupName = (id: number) => {
    const group = groups?.find(g => g.id === id);
    return group?.nombre || "Desconocido";
  };

  const getSubjectName = (id: number) => {
    const subject = subjects?.find(s => s.id === id);
    return subject?.nombre || "Desconocida";
  };

  const getTeacherName = (id: number) => {
    const teacher = teachers?.find(t => t.id === id);
    return teacher?.nombreCompleto || "Desconocido";
  };

  // Filter assignments by search term
  const filteredAssignments = assignments?.filter(assignment => {
    const groupName = getGroupName(assignment.grupoId);
    const subjectName = getSubjectName(assignment.materiaId);
    const teacherName = getTeacherName(assignment.profesorId);
    
    return (
      groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacherName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleDeleteAssignment = async () => {
    if (assignmentToDelete) {
      try {
        await apiRequest("DELETE", `/api/assignments/${assignmentToDelete.id}`);
        toast({
          title: "Asignación eliminada",
          description: "La asignación ha sido eliminada correctamente",
        });
        refetch();
        setAssignmentToDelete(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la asignación",
          variant: "destructive",
        });
      }
    }
  };

  const isLoading = isLoadingAssignments || !groups || !subjects || !teachers;
  const isError = isErrorAssignments;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Asignaciones de Materias</h1>
          <div className="flex items-center text-sm">
            <Link href="/">
              <a className="text-primary">Inicio</a>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Asignaciones</span>
          </div>
        </div>
        <Link href="/asignaciones/nueva">
          <a>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Asignación
            </Button>
          </a>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Asignaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar asignación..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isError && (
            <div className="flex flex-col items-center justify-center py-8">
              <LinkIcon className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Error al cargar asignaciones</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar la lista de asignaciones
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
            </div>
          )}

          {!isError && (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Materia</TableHead>
                    <TableHead>Profesor</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredAssignments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No se encontraron asignaciones
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments?.map((assignment) => (
                      <TableRow key={assignment.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{getGroupName(assignment.grupoId)}</TableCell>
                        <TableCell>{getSubjectName(assignment.materiaId)}</TableCell>
                        <TableCell>{getTeacherName(assignment.profesorId)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-primary hover:text-blue-700">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-red-700"
                            onClick={() => setAssignmentToDelete(assignment)}
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

      {/* Confirm Delete Dialog */}
      <Dialog open={!!assignmentToDelete} onOpenChange={() => setAssignmentToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar esta asignación?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAssignment}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
