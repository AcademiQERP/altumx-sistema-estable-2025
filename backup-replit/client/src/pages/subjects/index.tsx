import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PlusCircle, Search, Edit, Trash2, BookOpen, RefreshCcw } from "lucide-react";
import { Subject } from "@shared/schema";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubjectsList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("todos");
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const { data: subjects, isLoading, isError, refetch } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Filter subjects by search term and level
  const filteredSubjects = subjects?.filter(subject => {
    const matchesSearch = subject.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "todos" || subject.nivel === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const handleDeleteSubject = async () => {
    if (subjectToDelete) {
      try {
        await apiRequest("DELETE", `/api/subjects/${subjectToDelete.id}`);
        toast({
          title: "Materia eliminada",
          description: "La materia ha sido eliminada correctamente",
        });
        refetch();
        setSubjectToDelete(null);
      } catch (error: any) {
        console.error("Error al eliminar materia:", error);
        
        // Obtener el mensaje de error específico si lo hay
        const responseData = error.response?.data || {};
        
        // Manejar diferentes tipos de errores de restricción
        if (error.status === 409) {
          // Conflicto por dependencias
          let errorMessage = responseData.message || "No se puede eliminar la materia porque está en uso";
          
          // Mostrar mensaje específico basado en el código de error
          switch (responseData.code) {
            case "SUBJECT_IN_USE_ASSIGNMENTS":
              errorMessage = "No se puede eliminar la materia porque está asignada a uno o más profesores";
              break;
            case "SUBJECT_IN_USE_SCHEDULES":
              errorMessage = "No se puede eliminar la materia porque está usada en uno o más horarios";
              break;
            case "SUBJECT_IN_USE_GRADES":
              errorMessage = "No se puede eliminar la materia porque tiene calificaciones asociadas";
              break;
            case "SUBJECT_IN_USE_CRITERIA":
              errorMessage = "No se puede eliminar la materia porque tiene criterios de evaluación asociados";
              break;
          }
          
          toast({
            title: "Materia en uso",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          // Otros errores (500, etc.)
          toast({
            title: "Error",
            description: responseData.message || "No se pudo eliminar la materia. Inténtelo de nuevo más tarde.",
            variant: "destructive",
          });
        }
        
        setSubjectToDelete(null);
      }
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Materias</h1>
          <div className="flex items-center text-sm">
            <Link href="/">
              <span className="text-primary cursor-pointer">Inicio</span>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Materias</span>
          </div>
        </div>
        <Link href="/materias/nueva">
          <Button className="cursor-pointer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Materia
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Materias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar materia..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los niveles</SelectItem>
                  <SelectItem value="Preescolar">Preescolar</SelectItem>
                  <SelectItem value="Primaria">Primaria</SelectItem>
                  <SelectItem value="Secundaria">Secundaria</SelectItem>
                  <SelectItem value="Preparatoria">Preparatoria</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isError && (
            <div className="flex flex-col items-center justify-center py-8">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Error al cargar materias</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar la lista de materias
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={3} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredSubjects?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No se encontraron materias
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubjects?.map((subject) => (
                      <TableRow key={subject.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{subject.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50">
                            {subject.nivel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/materias/${subject.id}/editar`}>
                            <Button variant="ghost" size="icon" className="text-primary hover:text-blue-700">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-red-700"
                            onClick={() => setSubjectToDelete(subject)}
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
      <Dialog open={!!subjectToDelete} onOpenChange={() => setSubjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar la materia {subjectToDelete?.nombre}?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteSubject}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
