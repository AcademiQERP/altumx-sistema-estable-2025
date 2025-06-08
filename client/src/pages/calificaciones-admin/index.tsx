import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PlusCircle, Search, Edit, Trash2, BarChart, RefreshCcw } from "lucide-react";
import { Grade, Student, Subject } from "@shared/schema";
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

// Componente que contiene la vista de lista original de calificaciones
export default function GradesListAdmin() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);

  const { data: grades, isLoading: isLoadingGrades, isError: isErrorGrades, refetch } = useQuery<Grade[]>({
    queryKey: ["/api/grades"],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Find student and subject names by their IDs
  const getStudentName = (id: number) => {
    const student = students?.find(s => s.id === id);
    return student?.nombreCompleto || "Desconocido";
  };

  const getSubjectName = (id: number) => {
    const subject = subjects?.find(s => s.id === id);
    return subject?.nombre || "Desconocida";
  };

  // Filter grades by search term
  const filteredGrades = grades?.filter(grade => {
    const studentName = getStudentName(grade.alumnoId);
    const subjectName = getSubjectName(grade.materiaId);
    
    return (
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.periodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.rubro.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleDeleteGrade = async () => {
    if (gradeToDelete) {
      try {
        await apiRequest("DELETE", `/api/grades/${gradeToDelete.id}`);
        toast({
          title: "Calificación eliminada",
          description: "La calificación ha sido eliminada correctamente",
        });
        refetch();
        setGradeToDelete(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la calificación",
          variant: "destructive",
        });
      }
    }
  };

  const isLoading = isLoadingGrades || !students || !subjects;
  const isError = isErrorGrades;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Administración de Calificaciones</h1>
          <div className="flex items-center text-sm">
            <Link href="/">
              <span className="text-primary cursor-pointer">Inicio</span>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <Link href="/calificaciones">
              <span className="text-primary cursor-pointer">Calificaciones</span>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Vista Administrador</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href="/calificaciones">
            <Button variant="outline">
              Vista Docente
            </Button>
          </Link>
          <Link href="/calificaciones/nueva">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Calificación
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Calificaciones (Vista Administrador)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar calificación..."
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
              <BarChart className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Error al cargar calificaciones</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar la lista de calificaciones
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
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Materia</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Rubro</TableHead>
                    <TableHead>Calificación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredGrades?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron calificaciones
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGrades?.map((grade) => (
                      <TableRow key={grade.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{getStudentName(grade.alumnoId)}</TableCell>
                        <TableCell>{getSubjectName(grade.materiaId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50">
                            {grade.periodo}
                          </Badge>
                        </TableCell>
                        <TableCell>{grade.rubro}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={Number(grade.valor) >= 7 ? "success" : "destructive"}
                            className="font-bold"
                          >
                            {Number(grade.valor).toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            // Obtenemos el estudiante relacionado con esta calificación
                            const student = students?.find(s => s.id === grade.alumnoId);
                            // Si encontramos el estudiante, podemos obtener su grupoId
                            const grupoId = student?.grupoId;
                            
                            return (
                              <Link href={grupoId ? `/grades/group/${grupoId}/subject/${grade.materiaId}` : "#"}>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-primary hover:text-blue-700"
                                  aria-label="Editar calificación"
                                  disabled={!grupoId}
                                  title={!grupoId ? "No se encontró el grupo del estudiante" : "Editar calificaciones"}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            );
                          })()}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-red-700"
                            onClick={() => setGradeToDelete(grade)}
                            aria-label="Eliminar calificación"
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
      <Dialog open={!!gradeToDelete} onOpenChange={() => setGradeToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar esta calificación?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteGrade}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}