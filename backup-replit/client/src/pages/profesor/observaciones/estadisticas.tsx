import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  BarChart3,
  FileText,
  BookOpen,
  Users,
  Calendar,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { 
  BarChart,
  PieChart,
  Pie,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function ObservacionesEstadisticas() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [periodoFiltro, setPeriodoFiltro] = useState("todos");
  const [grupoFiltro, setGrupoFiltro] = useState("todos");

  // Obtener estadísticas de observaciones
  const {
    data: estadisticas,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/academic-observer/estadisticas", { 
      profesorId: user?.profesorId,
      periodo: periodoFiltro !== "todos" ? periodoFiltro : undefined,
      grupoId: grupoFiltro !== "todos" ? parseInt(grupoFiltro) : undefined
    }],
    enabled: !!user?.profesorId,
  });

  // Obtener grupos asignados al profesor
  const { data: gruposAsignados } = useQuery({
    queryKey: ["/api/profesor/grupos-asignados"],
    enabled: !!user?.id,
  });

  // Función para volver al listado de observaciones
  const volverALista = () => {
    navigate("/profesor/observaciones");
  };

  // Periodos académicos para el filtro
  const periodos = [
    { id: "todos", nombre: "Todos los periodos" },
    { id: "1er_bimestre", nombre: "1er Bimestre" },
    { id: "2do_bimestre", nombre: "2do Bimestre" },
    { id: "3er_bimestre", nombre: "3er Bimestre" },
    { id: "4to_bimestre", nombre: "4to Bimestre" },
    { id: "5to_bimestre", nombre: "5to Bimestre" },
    { id: "semestre_1", nombre: "1er Semestre" },
    { id: "semestre_2", nombre: "2do Semestre" },
  ];

  // Colores para gráficas
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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
              Error al cargar estadísticas
            </CardTitle>
            <CardDescription>
              Ha ocurrido un error al intentar cargar las estadísticas de las observaciones
              académicas. Por favor, intenta nuevamente más tarde.
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

  // Si no hay estadísticas disponibles
  if (!estadisticas) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={volverALista}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Estadísticas de Observaciones</h1>
        </div>
        
        <Card className="max-w-4xl mx-auto p-8 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium">No hay estadísticas disponibles</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Todavía no se han generado suficientes observaciones para mostrar estadísticas.
            Genera algunas observaciones académicas para ver las estadísticas.
          </p>
          <Button onClick={() => navigate("/profesor/observaciones/nueva")}>
            Generar Nueva Observación
          </Button>
        </Card>
      </div>
    );
  }

  // Preparar datos para gráficas
  const observacionesPorMateria = estadisticas.observacionesPorMateria || [];
  const observacionesPorGrupo = estadisticas.observacionesPorGrupo || [];
  const observacionesPorMes = estadisticas.observacionesPorMes || [];
  const temasPopulares = estadisticas.temasPopulares || [];

  // Formatear las estadísticas
  const datosGraficaMaterias = observacionesPorMateria.map((item: any) => ({
    name: item.nombre || "Sin nombre",
    value: item.cantidad,
  }));

  const datosGraficaGrupos = observacionesPorGrupo.map((item: any) => ({
    name: item.nombre || "Sin nombre",
    value: item.cantidad,
  }));

  const datosGraficaMeses = observacionesPorMes.map((item: any) => ({
    name: item.mes || "Sin fecha",
    Observaciones: item.cantidad,
  }));

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={volverALista}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Estadísticas de Observaciones</h1>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Filtros de Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                value={periodoFiltro}
                onValueChange={(value) => setPeriodoFiltro(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((periodo) => (
                    <SelectItem key={periodo.id} value={periodo.id}>
                      {periodo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={grupoFiltro}
                onValueChange={(value) => setGrupoFiltro(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los grupos</SelectItem>
                  {gruposAsignados?.map((grupo: any) => (
                    <SelectItem key={grupo.id} value={grupo.id.toString()}>
                      {grupo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Observaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-primary opacity-80" />
              <div className="text-3xl font-bold">
                {estadisticas.totalObservaciones || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Materias Analizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <BookOpen className="h-8 w-8 text-green-600 opacity-80" />
              <div className="text-3xl font-bold">
                {observacionesPorMateria.length || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alumnos Evaluados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-blue-600 opacity-80" />
              <div className="text-3xl font-bold">
                {estadisticas.alumnosEvaluados || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Último Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Calendar className="h-8 w-8 text-amber-600 opacity-80" />
              <div className="text-3xl font-bold">
                {(observacionesPorMes[0]?.cantidad || 0)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas de Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Observaciones por Materia</CardTitle>
            <CardDescription>
              Distribución de observaciones generadas por cada materia
            </CardDescription>
            <Separator className="my-1" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosGraficaMaterias}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {datosGraficaMaterias.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observaciones por Grupo</CardTitle>
            <CardDescription>
              Distribución de observaciones generadas por cada grupo
            </CardDescription>
            <Separator className="my-1" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosGraficaGrupos}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {datosGraficaGrupos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica de Tendencia Temporal */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tendencia Temporal</CardTitle>
          <CardDescription>
            Evolución de la cantidad de observaciones generadas por mes
          </CardDescription>
          <Separator className="my-1" />
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosGraficaMeses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Observaciones" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Temas Populares */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-amber-500" />
            Temas Más Utilizados
          </CardTitle>
          <CardDescription>
            Los temas más frecuentemente utilizados en las observaciones generadas
          </CardDescription>
          <Separator className="my-1" />
        </CardHeader>
        <CardContent>
          {temasPopulares.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tema</TableHead>
                  <TableHead className="text-right">Observaciones</TableHead>
                  <TableHead className="text-right">Porcentaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {temasPopulares.map((tema: any, index: number) => (
                  <TableRow key={`tema-${index}`}>
                    <TableCell className="font-medium">{tema.nombre || "Sin nombre"}</TableCell>
                    <TableCell className="text-right">{tema.cantidad}</TableCell>
                    <TableCell className="text-right">
                      {((tema.cantidad / estadisticas.totalObservaciones) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No hay datos de temas disponibles
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}