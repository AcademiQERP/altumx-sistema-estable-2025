import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PlusCircle, Search, Edit, Trash2, ClipboardCheck, RefreshCcw } from "lucide-react";
import { Attendance, Student } from "@shared/schema";
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

export default function AttendanceList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceToDelete, setAttendanceToDelete] = useState<Attendance | null>(null);

  const { data: attendanceRecords, isLoading: isLoadingAttendance, isError: isErrorAttendance, refetch } = useQuery<Attendance[]>({
    queryKey: ["/api/profesor/attendance"],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Find student name by ID
  const getStudentName = (id: number) => {
    const student = students?.find(s => s.id === id);
    return student?.nombreCompleto || "Desconocido";
  };

  // Filter attendance by search term
  const filteredAttendance = attendanceRecords?.filter(record => {
    const studentName = getStudentName(record.alumnoId);
    const date = new Date(record.fecha).toLocaleDateString();
    
    return (
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      date.includes(searchTerm) ||
      (record.justificacion && record.justificacion.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleDeleteAttendance = async () => {
    if (attendanceToDelete) {
      try {
        await apiRequest("DELETE", `/api/attendance/${attendanceToDelete.id}`);
        toast({
          title: "Registro eliminado",
          description: "El registro de asistencia ha sido eliminado correctamente",
        });
        refetch();
        setAttendanceToDelete(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar el registro",
          variant: "destructive",
        });
      }
    }
  };

  const isLoading = isLoadingAttendance || !students;
  const isError = isErrorAttendance;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Registro de Asistencias</h1>
          <div className="flex items-center text-sm">
            <Link href="/">
              <a className="text-primary">Inicio</a>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Asistencias</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled className="opacity-75" title="Función en desarrollo">
            📊 Ver Resumen por Alumno
          </Button>
          <Link href="/asistencias/nueva">
            <a>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Asistencia
              </Button>
            </a>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Asistencias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar registro..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filtros visuales (placeholders) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select disabled className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background pr-8 opacity-60 cursor-not-allowed">
                  <option>Todos los grupos</option>
                </select>
                <Badge className="absolute -top-2 -right-2 text-[10px]">Próximamente</Badge>
              </div>
              
              <div className="relative">
                <Button variant="outline" className="opacity-60 cursor-not-allowed" disabled>
                  Seleccionar fechas
                </Button>
                <Badge className="absolute -top-2 -right-2 text-[10px]">Próximamente</Badge>
              </div>
              
              <div className="relative">
                <select disabled className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background pr-8 opacity-60 cursor-not-allowed">
                  <option>Todos los estados</option>
                </select>
                <Badge className="absolute -top-2 -right-2 text-[10px]">Próximamente</Badge>
              </div>
              
              <Button variant="outline" size="icon" onClick={() => refetch()} title="Actualizar lista">
                <RefreshCcw className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" disabled title="Próximamente disponible">
                📥 Exportar PDF
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <div></div> {/* Espaciador */}
            <Button variant="outline" disabled className="opacity-75" title="Función en desarrollo">
              📊 Ver Resumen por Alumno
            </Button>
          </div>

          {isError && (
            <div className="flex flex-col items-center justify-center py-8">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Error al cargar asistencias</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ocurrió un error al cargar la lista de asistencias
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
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead>Justificación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex justify-center">
                            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredAttendance?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        {!attendanceRecords ? (
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-lg font-medium mb-2">No tienes grupos activos asignados</p>
                            <p className="text-sm text-muted-foreground max-w-md">
                              No se encontraron grupos activos asignados a tu perfil docente.
                              Contacta al administrador para obtener acceso a tus grupos.
                            </p>
                          </div>
                        ) : (
                          "No se encontraron registros de asistencia"
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance?.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{getStudentName(record.alumnoId)}</TableCell>
                        <TableCell>{formatDate(record.fecha)}</TableCell>
                        <TableCell>
                          {record.justificacion ? (
                            <Badge className="bg-[#fff8e1] text-amber-700 hover:bg-[#fff8e1] hover:text-amber-700 border-0">
                              🟡 Justificada
                            </Badge>
                          ) : (
                            <Badge className={`${
                              record.asistencia 
                                ? "bg-[#e6f4ea] text-green-700 hover:bg-[#e6f4ea] hover:text-green-700" 
                                : "bg-[#fdecea] text-red-700 hover:bg-[#fdecea] hover:text-red-700"
                              } border-0`}
                            >
                              {record.asistencia ? "🟢 Presente" : "🔴 Ausente"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.justificacion ? record.justificacion : 
                           <span className="text-muted-foreground text-sm italic">Sin justificación</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-primary hover:text-blue-700">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-red-700"
                            onClick={() => setAttendanceToDelete(record)}
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
      <Dialog open={!!attendanceToDelete} onOpenChange={() => setAttendanceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar este registro de asistencia?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAttendance}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
