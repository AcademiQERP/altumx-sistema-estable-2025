import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { formatFecha } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { Empty } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ObservacionesList() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Obtener lista de observaciones según el rol del usuario
  const { data: observaciones, isLoading, error } = useQuery({
    queryKey: ["/api/observaciones"],
    enabled: !!user,
  });

  // Si el usuario no tiene permisos para ver esta página, redirigir
  if (user && !["admin", "docente"].includes(user.rol)) {
    navigate("/");
    return null;
  }

  // Función para formatear la categoría como Badge
  const getCategoryBadge = (categoria: string | null | undefined) => {
    // Si la categoría es "sin_categoria", tratarla como null
    if (categoria === "sin_categoria") {
      categoria = null;
    }
    
    const colorMap: Record<string, string> = {
      "académica": "bg-blue-100 text-blue-800",
      "comportamiento": "bg-yellow-100 text-yellow-800",
      "asistencia": "bg-red-100 text-red-800",
      "desempeño": "bg-green-100 text-green-800",
      "otro": "bg-gray-100 text-gray-800"
    };
    
    const color = categoria && colorMap[categoria.toLowerCase()] ? colorMap[categoria.toLowerCase()] : colorMap.otro;
    
    return (
      <Badge className={color}>
        {categoria || "Sin categoría"}
      </Badge>
    );
  };

  // Calcular paginación
  const totalPages = observaciones ? Math.ceil(observaciones.length / itemsPerPage) : 0;
  const paginatedObservaciones = observaciones 
    ? observaciones.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Observaciones</h1>
        
        {user?.rol === "docente" && (
          <Button asChild>
            <Link href="/observaciones/nueva">Nueva Observación</Link>
          </Button>
        )}
      </div>
      
      <Separator />
      
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {error && (
        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error al cargar las observaciones. Por favor, intente nuevamente más tarde.</p>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && observaciones && observaciones.length === 0 && (
        <Empty
          title="No hay observaciones registradas"
          description={user?.rol === "docente" 
            ? "Registra la primera observación haciendo clic en el botón 'Nueva Observación'" 
            : "Aún no hay observaciones registradas en el sistema"}
          action={user?.rol === "docente" && (
            <Button asChild>
              <Link href="/observaciones/nueva">Nueva Observación</Link>
            </Button>
          )}
        />
      )}
      
      {!isLoading && observaciones && observaciones.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Observación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedObservaciones.map((obs) => (
                  <TableRow key={obs.id}>
                    <TableCell className="font-medium">
                      {formatFecha(obs.fechaCreacion)}
                    </TableCell>
                    <TableCell>{obs.alumnoNombre || `ID: ${obs.alumnoId}`}</TableCell>
                    <TableCell>{obs.grupoNombre || `ID: ${obs.grupoId}`}</TableCell>
                    <TableCell>{getCategoryBadge(obs.categoria)}</TableCell>
                    <TableCell className="max-w-md truncate">{obs.contenido}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/observaciones/${obs.id}`}>Ver</Link>
                        </Button>
                        
                        {(user?.rol === "admin" || user?.rol === "docente") && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/observaciones/${obs.id}/editar`}>Editar</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
}