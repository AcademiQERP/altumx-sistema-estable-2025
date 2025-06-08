import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  Plus,
  FileText,
  Filter,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ObservacionesIndex() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [filtro, setFiltro] = useState("");
  const [alumnoFiltro, setAlumnoFiltro] = useState<string | null>(null);
  const [materiaFiltro, setMateriaFiltro] = useState<string | null>(null);
  const [periodoFiltro, setPeriodoFiltro] = useState<string | null>(null);

  // Obtener observaciones del profesor actual
  const {
    data: observaciones,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/academic-observer/observaciones/profesor", user?.profesorId],
    enabled: !!user?.profesorId,
  });

  // Obtener lista de alumnos
  const { data: alumnos } = useQuery({
    queryKey: ["/api/students"],
    select: (data) => {
      return data.filter((alumno: any) => alumno.estatus === "activo");
    },
  });

  // Obtener lista de materias
  const { data: materias } = useQuery({
    queryKey: ["/api/subjects"],
  });

  // Manejar tanto objetos simples como arrays de observaciones
  const observacionesArray = observaciones 
    ? Array.isArray(observaciones) 
      ? observaciones 
      : [observaciones] // Si recibimos un solo objeto, lo convertimos en array
    : [];

  // Filtrar las observaciones
  const observacionesFiltradas = observacionesArray.filter((obs: any) => {
    // Filtro de texto
    const filtroTexto =
      filtro === "" ||
      (obs.alumnoNombre &&
        obs.alumnoNombre.toLowerCase().includes(filtro.toLowerCase())) ||
      (obs.materiaNombre &&
        obs.materiaNombre.toLowerCase().includes(filtro.toLowerCase())) ||
      (obs.contenido &&
        obs.contenido.toLowerCase().includes(filtro.toLowerCase()));

    // Filtro por alumno
    const filtroAlumno =
      !alumnoFiltro || obs.alumnoId.toString() === alumnoFiltro;

    // Filtro por materia
    const filtroMateria =
      !materiaFiltro || obs.materiaId.toString() === materiaFiltro;

    // Filtro por periodo
    const filtroPeriodo = !periodoFiltro || obs.periodo === periodoFiltro;

    return filtroTexto && filtroAlumno && filtroMateria && filtroPeriodo;
  });

  // Periodos académicos para el filtro
  const periodos = [
    { id: "1er_bimestre", nombre: "1er Bimestre" },
    { id: "2do_bimestre", nombre: "2do Bimestre" },
    { id: "3er_bimestre", nombre: "3er Bimestre" },
    { id: "4to_bimestre", nombre: "4to Bimestre" },
    { id: "5to_bimestre", nombre: "5to Bimestre" },
    { id: "semestre_1", nombre: "1er Semestre" },
    { id: "semestre_2", nombre: "2do Semestre" },
  ];

  // Ir a la página de nueva observación
  const irANuevaObservacion = () => {
    navigate("/profesor/observaciones/nueva");
  };

  // Ver detalle de una observación
  const verObservacion = (id: string) => {
    navigate(`/profesor/observaciones/${id}`);
  };

  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si hay error, mostrar mensaje
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="text-red-600">
              Error al cargar observaciones
            </CardTitle>
            <CardDescription>
              Ha ocurrido un error al intentar cargar las observaciones académicas.
              Por favor, intenta nuevamente más tarde.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Intentar nuevamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Observaciones Académicas</h1>
          <p className="text-sm text-muted-foreground">
            Administra y consulta las observaciones académicas generadas
          </p>
        </div>
        <Button
          onClick={irANuevaObservacion}
          className="mt-2 md:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Observación
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre de alumno, materia o contenido..."
                  className="pl-9"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Select
                value={alumnoFiltro || "_all"}
                onValueChange={(value) =>
                  setAlumnoFiltro(value !== "_all" ? value : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por alumno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos los alumnos</SelectItem>
                  {alumnos?.map((alumno: any) => (
                    <SelectItem key={alumno.id} value={alumno.id.toString()}>
                      {alumno.nombreCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={materiaFiltro || "_all"}
                onValueChange={(value) =>
                  setMateriaFiltro(value !== "_all" ? value : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por materia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas las materias</SelectItem>
                  {materias?.map((materia: any) => (
                    <SelectItem key={materia.id} value={materia.id.toString()}>
                      {materia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={periodoFiltro || "_all"}
                onValueChange={(value) =>
                  setPeriodoFiltro(value !== "_all" ? value : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos los periodos</SelectItem>
                  {periodos.map((periodo) => (
                    <SelectItem key={periodo.id} value={periodo.id}>
                      {periodo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {observacionesFiltradas.length === 0 ? (
        <Card className="p-8 flex flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No hay observaciones</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {(observaciones && observacionesArray.length > 0)
              ? "No se encontraron observaciones con los filtros seleccionados"
              : "Aún no has generado ninguna observación académica"}
          </p>
          <Button onClick={irANuevaObservacion}>
            <Plus className="mr-2 h-4 w-4" />
            Generar Nueva Observación
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Listado de Observaciones</CardTitle>
              <Badge variant="outline" className="ml-2">
                {observacionesFiltradas.length}{" "}
                {observacionesFiltradas.length === 1
                  ? "observación"
                  : "observaciones"}
              </Badge>
            </div>
            <Separator className="mt-2" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Materia</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observacionesFiltradas.map((obs: any) => (
                    <TableRow key={obs.id}>
                      <TableCell className="font-medium">{obs.id.substring(0, 8)}...</TableCell>
                      <TableCell>{obs.alumnoNombre || "No disponible"}</TableCell>
                      <TableCell>
                        {obs.materiaNombre || "No disponible"}
                      </TableCell>
                      <TableCell>
                        {periodos.find((p) => p.id === obs.periodo)?.nombre ||
                          obs.periodo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {obs.fecha
                            ? new Date(obs.fecha).toLocaleDateString("es-MX")
                            : "No disponible"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => verObservacion(obs.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}