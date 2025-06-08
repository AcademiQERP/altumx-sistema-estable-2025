import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Student } from "@shared/schema";

export default function RecentStudents() {
  const { data: students, isLoading, isError } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-green-50/30">
      <CardHeader className="flex flex-row justify-between items-center pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          👥 Alumnos Recientes
        </CardTitle>
        <Link href="/estudiantes" className="text-blue-600 text-sm hover:text-blue-800 font-medium hover:underline transition-colors">
          Ver todos →
        </Link>
      </CardHeader>
      <CardContent>
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50/50">
                <TableHead className="font-semibold text-gray-700">Alumno</TableHead>
                <TableHead className="font-semibold text-gray-700">CURP</TableHead>
                <TableHead className="font-semibold text-gray-700">Grupo</TableHead>
                <TableHead className="font-semibold text-gray-700">Nivel</TableHead>
                <TableHead className="font-semibold text-gray-700">Estado</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                Array(4).fill(0).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full mr-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {isError && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    Error al cargar los estudiantes
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && students?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No hay estudiantes registrados
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && students?.slice(0, 5).map((student) => (
                <TableRow key={student.id} className="hover:bg-blue-50/30 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 shadow-sm">
                        <AvatarFallback className="font-semibold">{getInitials(student.nombreCompleto)}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <div className="text-sm font-semibold text-gray-800">{student.nombreCompleto}</div>
                        <div className="text-xs text-gray-500">Estudiante</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 font-mono">{student.curp}</TableCell>
                  <TableCell className="text-sm">
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                      {student.grupoId || "No asignado"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      {student.nivel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`${
                        student.estatus === "activo" 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      } font-medium`} 
                      variant="outline"
                    >
                      {student.estatus === "activo" ? "✓ Activo" : student.estatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
