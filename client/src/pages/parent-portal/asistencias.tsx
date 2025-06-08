import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, ArrowLeft, Info } from 'lucide-react';

export default function AsistenciasPage() {
  const [, navigate] = useLocation();

  // Verificar si el módulo está habilitado
  const isAttendanceModuleEnabled = import.meta.env.VITE_SHOW_ATTENDANCE_MODULE === 'true';

  useEffect(() => {
    // Si el módulo no está habilitado, redirigir al dashboard después de mostrar el mensaje
    if (!isAttendanceModuleEnabled) {
      const timer = setTimeout(() => {
        navigate('/portal-padres/dashboard');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isAttendanceModuleEnabled, navigate]);

  // Si el módulo está habilitado, mostrar el contenido normal de asistencias
  if (isAttendanceModuleEnabled) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Asistencias
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Consulta el registro de asistencias de tu hijo/a
            </p>
          </div>
          
          {/* Aquí iría el contenido normal del módulo de asistencias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Registro de Asistencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                El módulo de asistencias está funcionando correctamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Si el módulo está deshabilitado, mostrar mensaje informativo
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
              <Info className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-orange-800 dark:text-orange-200">
              Módulo Temporalmente Deshabilitado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/10 dark:border-orange-800">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                El módulo de Asistencias se encuentra actualmente deshabilitado para mejorar tu experiencia de navegación.
              </AlertDescription>
            </Alert>
            
            <div className="text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                Mientras este módulo no esté disponible, puedes utilizar las otras secciones del portal:
              </p>
              <ul className="text-sm space-y-1 text-left max-w-md mx-auto">
                <li>• Boleta Académica</li>
                <li>• Estado de Cuenta</li>
                <li>• Historial de Pagos</li>
                <li>• Tareas y Asignaciones</li>
                <li>• Avisos Escolares</li>
              </ul>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={() => navigate('/portal-padres/dashboard')}
                className="bg-primary hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Regresar al Dashboard
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Serás redirigido automáticamente en unos segundos...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}