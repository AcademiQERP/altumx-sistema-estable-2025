import React from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

export default function ObservacionDetail() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/observaciones/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const observacionId = params?.id;

  // Redireccionar si el usuario no tiene el rol adecuado
  if (user && !["admin", "docente"].includes(user.rol)) {
    navigate("/");
    return null;
  }

  // Obtener los detalles de la observación
  const { data: observacion, isLoading, error } = useQuery({
    queryKey: ["/api/observaciones", observacionId],
    enabled: !!observacionId,
    onSuccess: (data) => {
      console.log("Datos de observación recibidos:", JSON.stringify(data, null, 2));
    },
    onError: (err) => {
      console.error("Error al obtener observación:", err);
    }
  });

  // Mutación para eliminar una observación
  const deleteObservacionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/observaciones/${observacionId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Observación eliminada",
        description: "La observación ha sido eliminada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/observaciones"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/profesores", user?.profesorId, "observaciones"] 
      });
      navigate("/observaciones");
    },
    onError: (error) => {
      console.error("Error al eliminar observación:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la observación. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Función para formatear la categoría como Badge
  const getCategoryBadge = (categoria) => {
    // Si la categoría es "sin_categoria", tratarla como null
    if (categoria === "sin_categoria") {
      categoria = null;
    }
    
    const colorMap = {
      "académica": "bg-blue-100 text-blue-800",
      "comportamiento": "bg-yellow-100 text-yellow-800",
      "asistencia": "bg-red-100 text-red-800",
      "desempeño": "bg-green-100 text-green-800",
      "otro": "bg-gray-100 text-gray-800"
    };
    
    const color = colorMap[categoria?.toLowerCase()] || colorMap.otro;
    
    return (
      <Badge className={color}>
        {categoria || "Sin categoría"}
      </Badge>
    );
  };

  // Verificar si el usuario tiene permisos para editar/eliminar
  const hasEditPermission = () => {
    if (!user || !observacion) {
      console.log("No hay usuario o no hay observación cargada");
      return false;
    }
    
    if (user.rol === "admin") {
      console.log("Usuario es admin, tiene permisos");
      return true;
    }
    
    const hasPermission = user.rol === "docente" && user.profesorId === observacion.profesorId;
    console.log("Verificando permisos docente:", {
      userRol: user.rol,
      userProfesorId: user.profesorId,
      observacionProfesorId: observacion.profesorId,
      tienePermiso: hasPermission
    });
    
    return hasPermission;
  };

  // Manejar la eliminación de la observación
  const handleDelete = () => {
    deleteObservacionMutation.mutate();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => navigate("/observaciones")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Detalle de Observación</h1>
      </div>
      
      <Separator />
      
      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}
      
      {error && (
        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error al cargar la observación. Por favor, intente nuevamente más tarde.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/observaciones")}>
              Volver al listado
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {!isLoading && observacion && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Observación de estudiante</CardTitle>
                <CardDescription>
                  Registrada el {formatFecha(observacion.fechaCreacion)}
                </CardDescription>
              </div>
              {getCategoryBadge(observacion.categoria)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Estudiante</h3>
                  <p className="mt-1">{observacion.alumnoNombre || `ID: ${observacion.alumnoId}`}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Grupo</h3>
                  <p className="mt-1">{observacion.grupoNombre || `ID: ${observacion.grupoId}`}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Materia</h3>
                  <p className="mt-1">{observacion.materiaNombre || `ID: ${observacion.materiaId}`}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Profesor</h3>
                  <p className="mt-1">{observacion.profesorNombre || `ID: ${observacion.profesorId}`}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Observación</h3>
                <p className="mt-1 whitespace-pre-line">{observacion.contenido}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate("/observaciones")}>
              Volver al listado
            </Button>
            
            {hasEditPermission() && (
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/observaciones/${observacion.id}/editar`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. La observación será eliminada permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}