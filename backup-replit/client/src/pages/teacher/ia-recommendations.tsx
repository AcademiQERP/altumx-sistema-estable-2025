import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, Calendar, User, GraduationCap, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Student {
  id: number;
  nombre: string;
  nivel: string;
}

interface Recommendation {
  id: string;
  texto: string;
  fecha_generacion: string;
  cached: boolean;
}

interface TeacherRecommendationResponse {
  student: Student;
  recommendation: Recommendation;
}

export default function TeacherIARecommendationsPage() {
  const { data: recommendations, isLoading, error } = useQuery<TeacherRecommendationResponse[]>({
    queryKey: ['/api/teacher/ia-recommendations'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recomendaciones IA - Vista Docente</h1>
            <p className="text-gray-600">Cargando recomendaciones de sus estudiantes...</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recomendaciones IA - Vista Docente</h1>
            <p className="text-gray-600">Consulta las recomendaciones académicas de sus estudiantes</p>
          </div>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Error al cargar las recomendaciones. Verifique su conexión o contacte al administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <GraduationCap className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recomendaciones IA - Vista Docente</h1>
          <p className="text-gray-600">Consulta las recomendaciones académicas de sus estudiantes</p>
        </div>
      </div>

      {!recommendations || recommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Brain className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin Recomendaciones Disponibles</h3>
            <p className="text-gray-500 text-center max-w-md">
              Aún no hay recomendaciones IA generadas para sus estudiantes asignados. 
              Las recomendaciones aparecerán aquí una vez que el administrador las genere.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Información para Docentes</h3>
            </div>
            <p className="text-sm text-blue-800">
              Estas recomendaciones han sido generadas por inteligencia artificial para apoyar el 
              desarrollo académico de sus estudiantes. Úselas como guía complementaria en su labor educativa.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((item) => (
              <Card key={item.student.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span className="text-lg">{item.student.nombre}</span>
                    </CardTitle>
                    <Badge variant="outline">
                      {item.student.nivel}
                    </Badge>
                  </div>
                  <CardDescription>
                    Estudiante ID: {item.student.id}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(item.recommendation.fecha_generacion), "d 'de' MMMM, yyyy 'a las' HH:mm", { 
                          locale: es
                        })}
                      </span>
                    </div>
                    <Badge 
                      variant={item.recommendation.cached ? "secondary" : "default"}
                      className={item.recommendation.cached ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}
                    >
                      {item.recommendation.cached ? "Simulado" : "Claude IA"}
                    </Badge>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span>Recomendación Académica</span>
                    </h4>
                    
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <div className="whitespace-pre-wrap line-clamp-6">
                        {item.recommendation.texto}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 border-t pt-2">
                    ID de recomendación: {item.recommendation.id}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Notas Pedagógicas</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Las recomendaciones están basadas en el análisis de datos académicos y patrones de aprendizaje</li>
              <li>• Utilice estas sugerencias como apoyo complementario a su experiencia docente</li>
              <li>• Para más detalles o consultas específicas, contacte al equipo administrativo</li>
            </ul>
          </div>
        </>
      )}

      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          Vista docente - Solo lectura • {recommendations?.length || 0} recomendaciones disponibles
        </p>
      </div>
    </div>
  );
}