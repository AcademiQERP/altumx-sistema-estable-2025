import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import WeeklyScheduleGrid from "@/components/schedule/WeeklyScheduleGrid";
import { Button } from "@/components/ui/button";
import { XCircle, Clock, Calendar } from "lucide-react";

export default function TeacherSchedulePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError(null);

        // Realizar la petición para obtener el horario del profesor autenticado
        const response = await apiRequest("GET", "/api/profesor/horario");
        
        if (!response.ok) {
          // Si la respuesta no es 2xx, leemos el cuerpo para obtener el mensaje de error
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al cargar el horario");
        }

        const data = await response.json();
        setSchedules(data);
      } catch (err) {
        console.error("Error al cargar el horario:", err);
        setError(err instanceof Error ? err.message : "Error al cargar el horario");
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Error al cargar el horario",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [toast]);

  // Manejar el caso de error (no se encuentra el profesor)
  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <Clock className="mr-2 h-6 w-6 text-primary" />
              Horario Semanal
            </CardTitle>
            <CardDescription>
              Vista de su horario de clases asignado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <XCircle className="h-20 w-20 text-destructive mb-4" />
              <h3 className="text-xl font-bold mb-2">No se pudo cargar el horario</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                {error === "No se encontró un registro de profesor asociado a su cuenta de usuario" 
                  ? "Su cuenta de usuario no está asociada a ningún registro de profesor en el sistema. Por favor contacte al administrador."
                  : error}
              </p>
              
              {user?.rol === "admin" && (
                <div className="mt-4">
                  <p className="mb-2 text-muted-foreground">Como administrador, puede crear nuevos registros de profesor o asociar usuarios existentes.</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = "/profesores/nuevo"}
                    >
                      Crear nuevo profesor
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = "/profesores"}
                    >
                      Ver profesores
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar estado de carga
  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <Clock className="mr-2 h-6 w-6 text-primary" />
              Horario Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin w-12 h-12 border-t-2 border-primary rounded-full mb-4"></div>
              <p>Cargando su horario...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center">
            <Clock className="mr-2 h-6 w-6 text-primary" />
            Horario Semanal
          </CardTitle>
          <CardDescription>
            Vista de su horario de clases asignado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-20 w-20 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">Sin clases asignadas</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Actualmente no tiene clases asignadas en su horario. Cuando se le asignen clases, aparecerán en esta vista.
              </p>
            </div>
          ) : (
            <div>
              <WeeklyScheduleGrid schedules={schedules} isTeacherView={true} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}