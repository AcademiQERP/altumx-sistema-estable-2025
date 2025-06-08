import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  PlusCircle, Search, Edit, Trash2, Presentation, RefreshCcw,
  MoreHorizontal, BookOpen, Users
} from "lucide-react";
import { Teacher, Subject, SubjectAssignment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProfesoresList() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  // Consulta para obtener profesores
  const { 
    data: teachers = [], 
    isLoading: isLoadingTeachers, 
    isError: isErrorTeachers, 
    refetch: refetchTeachers 
  } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  // Consulta para obtener materias
  const { 
    data: subjects = [], 
    isLoading: isLoadingSubjects 
  } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Consulta para obtener asignaciones
  const { 
    data: assignments = [], 
    isLoading: isLoadingAssignments 
  } = useQuery<SubjectAssignment[]>({
    queryKey: ["/api/assignments"],
  });

  // Mutación para eliminar un profesor
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/teachers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      toast({
        title: "Profesor eliminado",
        description: "El profesor ha sido eliminado correctamente",
      });
      setTeacherToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el profesor",
        variant: "destructive",
      });
    },
  });

  // Ya no necesitamos la función getTeacherSubjects ya que no mostramos materias asignadas

  // Filtrar profesores por término de búsqueda
  const filteredTeachers = teachers.filter((teacher) =>
    teacher.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.correo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para obtener iniciales de nombre
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Función para manejar eliminación
  const handleDeleteTeacher = () => {
    if (teacherToDelete) {
      deleteMutation.mutate(teacherToDelete.id);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Profesores</h1>
          <div className="flex items-center text-sm">
            <Link href="/">
              <span className="text-primary cursor-pointer">Inicio</span>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Profesores</span>
          </div>
        </div>
        <Link href="/profesores/nuevo">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Profesor
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Profesores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar profesor..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetchTeachers()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          {isErrorTeachers && (
            <div className="flex flex-col items-center justify-center py-8">
              <Presentation className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Error al cargar profesores</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar la lista de profesores
              </p>
              <Button variant="outline" onClick={() => refetchTeachers()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
            </div>
          )}

          {!isErrorTeachers && (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo Electrónico</TableHead>
                    <TableHead>Materia Principal</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTeachers || isLoadingSubjects || isLoadingAssignments ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No se encontraron profesores
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      return (
                        <TableRow key={teacher.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2 bg-blue-100 text-primary">
                                <AvatarFallback>{getInitials(teacher.nombreCompleto)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{teacher.nombreCompleto}</span>
                            </div>
                          </TableCell>
                          <TableCell>{teacher.correo}</TableCell>
                          <TableCell>{teacher.materiaPrincipal || "No especificada"}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/profesores/${teacher.id}/grupos`)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  Ver grupos asignados
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/profesores/${teacher.id}/materias`)}>
                                  <BookOpen className="mr-2 h-4 w-4" />
                                  Ver materias asignadas
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/profesores/${teacher.id}/editar`)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setTeacherToDelete(teacher)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!teacherToDelete} onOpenChange={() => setTeacherToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar al profesor {teacherToDelete?.nombreCompleto}?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteTeacher}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}