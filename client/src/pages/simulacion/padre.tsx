import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SimulationBanner } from "@/components/simulation/SimulationBanner";
import { Student } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  MessageSquare, 
  FileText,
  BookOpen,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

export default function SimulatedParentPortal() {
  const { parentId } = useParams<{ parentId: string }>();
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

  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Extraer el ID del estudiante del parentId simulado
  const studentId = parentId?.replace('parent-', '');
  const selectedStudent = students?.find(s => s.id.toString() === studentId);

  if (!selectedStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              Padre de familia no encontrado o aún no tiene datos registrados en el sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parentName = `Padre/Madre de ${selectedStudent.nombreCompleto}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <SimulationBanner 
        userType="padre" 
        userName={parentName} 
      />
      
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header del Portal Familiar */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Familiar
          </h1>
          <p className="text-gray-600">
            Resumen general de la información escolar de tus hijos
          </p>
        </div>

        {/* Tarjetas de estudiantes */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Mis hijos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="opacity-75">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedStudent.nombreCompleto}</h3>
                    <p className="text-sm text-gray-600">{selectedStudent.nivel} • 5to grado</p>
                  </div>
                  <Badge variant="secondary">📊 Solo lectura</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <Button disabled size="sm" variant="outline">
                    <FileText className="w-4 h-4 mr-1" />
                    Ver Boletas
                  </Button>
                  <Button disabled size="sm" variant="outline">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Estado de Cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Resumen financiero */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adeudo actual</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">$0.00 MXN</div>
              <Badge variant="secondary" className="mt-1">📊 Solo lectura</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagado este mes</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">$6,500.00 MXN</div>
              <Badge variant="secondary" className="mt-1">📊 Solo lectura</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Asistencia</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <Badge variant="secondary" className="mt-1">📊 Solo lectura</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tareas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Completadas: 5/1</div>
              <Badge variant="secondary" className="mt-1">📊 Solo lectura</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda */}
          <div className="lg:col-span-2 space-y-6">
            {/* Próximas tareas */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Próximas tareas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border-l-4 border-yellow-400 pl-4 py-2">
                    <h4 className="font-medium">Investigación sobre la Inteligencia Artificial</h4>
                    <p className="text-sm text-gray-600">Matemáticas • Pendiente</p>
                    <p className="text-xs text-gray-500">Fecha límite: Próximamente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avisos escolares recientes */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Avisos escolares recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay avisos recientes</p>
                  <p className="text-sm text-gray-400">Mantente al día con las comunicaciones escolares</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* Accesos rápidos */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle>Accesos rápidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button disabled className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Boletas Académicas
                </Button>
                <Button disabled className="w-full justify-start" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Resumen IA
                </Button>
                <Button disabled className="w-full justify-start" variant="outline">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Estado de Cuenta
                </Button>
                <Button disabled className="w-full justify-start" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chatbot
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