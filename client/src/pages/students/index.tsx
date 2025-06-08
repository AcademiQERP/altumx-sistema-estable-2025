import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  PlusCircle, Search, Edit, Trash2, GraduationCap, RefreshCcw,
  MoreHorizontal, Receipt, CreditCard, Users 
} from "lucide-react";
import { Student } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dates";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function StudentsList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("todos");
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const { data: students, isLoading, isError, refetch } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Filter students by search term and level
  const filteredStudents = students?.filter(student => {
    const matchesSearch = student.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.curp.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "todos" || student.nivel === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const handleDeleteStudent = async () => {
    if (studentToDelete) {
      try {
        await apiRequest("DELETE", `/api/students/${studentToDelete.id}`);
        toast({
          title: "Estudiante eliminado",
          description: "El estudiante ha sido eliminado correctamente",
        });
        refetch();
        setStudentToDelete(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar el estudiante",
          variant: "destructive",
        });
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Estudiantes</h1>
          <div className="flex items-center text-sm">
            <Link href="/">
              <a className="text-primary">Inicio</a>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Estudiantes</span>
          </div>
        </div>
        <Link href="/estudiantes/nuevo">
          <a>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Estudiante
            </Button>
          </a>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Estudiantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar estudiante..."
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
              <GraduationCap className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Error al cargar estudiantes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar la lista de estudiantes
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
                    <TableHead>CURP</TableHead>
                    <TableHead>Fecha de Nacimiento</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredStudents?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No se encontraron estudiantes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents?.map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2 bg-blue-100 text-primary">
                              <AvatarFallback>{getInitials(student.nombreCompleto)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.nombreCompleto}</span>
                          </div>
                        </TableCell>
                        <TableCell>{student.curp}</TableCell>
                        <TableCell>{formatDate(student.fechaNacimiento)}</TableCell>
                        <TableCell>{student.grupoId || "Sin asignar"}</TableCell>
                        <TableCell>{student.nivel}</TableCell>
                        <TableCell>
                          <Badge variant={student.estatus === "activo" ? "success" : "secondary"}>
                            {student.estatus === "activo" ? "Activo" : student.estatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/payments/history/${student.id}`} className="cursor-pointer">
                                  <Receipt className="mr-2 h-4 w-4" />
                                  Historial de pagos
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/account-statement/${student.id}`} className="cursor-pointer">
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Estado de cuenta
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link to={`/estudiantes/${student.id}/editar`}>
                                  <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </Button>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/estudiantes/${student.id}`}>
                                  <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                                    <Users className="mr-2 h-4 w-4" />
                                    Ver Perfil
                                  </Button>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Button 
                                  variant="ghost" 
                                  className="w-full justify-start p-0 h-auto text-destructive"
                                  onClick={() => setStudentToDelete(student)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </Button>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      <Dialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar al estudiante {studentToDelete?.nombreCompleto}?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteStudent}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
