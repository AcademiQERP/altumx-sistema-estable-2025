import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SimulationBanner } from "@/components/simulation/SimulationBanner";
import { Teacher } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  MessageSquare, 
  FileText,
  Calendar,
  TrendingUp
} from "lucide-react";

export default function SimulatedTeacherPortal() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const { user } = useAuth();

  // Verificar que el usuario actual sea administrador
  if (user?.rol !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              Acceso no autorizado. Solo administradores pueden acceder a vistas simuladas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const selectedTeacher = teachers?.find(t => t.id.toString() === teacherId);

  if (!selectedTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              Profesor no encontrado o aún no tiene datos registrados en el sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimulationBanner 
        userType="profesor" 
        userName={selectedTeacher.nombreCompleto} 
      />
      
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header del Portal del Profesor */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard del Profesor
          </h1>
          <p className="text-gray-600">
            Bienvenido, {selectedTeacher.nombreCompleto}. Resumen de tus clases, grupos y actividades.
          </p>
        </div>

        {/* Indicadores principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grupos asignados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <Badge variant="secondary" className="mt-1">📊 Solo lectura</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Materias impartidas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <Badge variant="secondary" className="mt-1">📊 Solo lectura</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio general</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">9.3</div>
              <Badge variant="secondary" className="mt-1">📊 Solo lectura</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Asistencia</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <Badge variant="secondary" className="mt-1">📊 Solo lectura</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda */}
          <div className="lg:col-span-2 space-y-6">
            {/* Horario de hoy */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Horario de hoy (Domingo)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay clases programadas</p>
                  <p className="text-sm text-gray-400">No tienes clases asignadas para hoy</p>
                </div>
              </CardContent>
            </Card>

            {/* Tareas pendientes */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Tareas pendientes por calificar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500">¡Todo al día!</p>
                  <p className="text-sm text-gray-400">No hay tareas pendientes por calificar</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* Acciones rápidas */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle>Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button disabled className="w-full justify-start" variant="outline">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Tomar asistencia
                </Button>
                <Button disabled className="w-full justify-start" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Registrar calificaciones
                </Button>
                <Button disabled className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Asignar tarea
                </Button>
                <Button disabled className="w-full justify-start" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Enviar mensaje
                </Button>
                <Button disabled className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Generar boletas
                </Button>
                <p className="text-xs text-center text-gray-500 mt-4">
                  🔒 Acciones deshabilitadas en modo simulación
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}