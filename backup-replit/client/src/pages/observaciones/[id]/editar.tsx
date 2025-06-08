import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";

// Esquema para validar el formulario de observación (para edición)
const editObservacionSchema = z.object({
  categoria: z.string().optional(),
  contenido: z.string().min(10, {
    message: "La observación debe tener al menos 10 caracteres",
  }).max(500, {
    message: "La observación no debe exceder los 500 caracteres",
  }),
});

export default function EditarObservacion() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/observaciones/:id/editar");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const observacionId = params?.id;

  // Redireccionar si el usuario no tiene el rol adecuado
  if (user && !["admin", "docente"].includes(user.rol)) {
    navigate("/");
    return null;
  }

  // Obtener los detalles de la observación a editar
  const { 
    data: observacion, 
    isLoading, 
    error,
    isError
  } = useQuery({
    queryKey: ["/api/observaciones", observacionId],
    enabled: !!observacionId,
  });

  // Configurar el formulario con la validación
  const form = useForm<z.infer<typeof editObservacionSchema>>({
    resolver: zodResolver(editObservacionSchema),
    defaultValues: {
      categoria: "",
      contenido: "",
    },
  });

  // Cargar los datos existentes en el formulario cuando se obtiene la observación
  useEffect(() => {
    if (observacion) {
      form.reset({
        categoria: observacion.categoria || "sin_categoria",
        contenido: observacion.contenido,
      });
    }
  }, [observacion, form]);

  // Verificar si el usuario tiene permisos para editar esta observación
  useEffect(() => {
    if (observacion && user) {
      const hasPermission = user.rol === "admin" || 
        (user.rol === "docente" && user.profesorId === observacion.profesorId);
      
      if (!hasPermission) {
        toast({
          title: "Acceso denegado",
          description: "No tiene permisos para editar esta observación.",
          variant: "destructive",
        });
        navigate(`/observaciones/${observacionId}`);
      }
    }
  }, [observacion, user, observacionId, navigate, toast]);

  // Mutación para actualizar la observación
  const updateObservacionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editObservacionSchema>) => {
      return await apiRequest(`/api/observaciones/${observacionId}`, {
        method: "PUT",
        data: {
          categoria: data.categoria === "sin_categoria" ? null : data.categoria,
          contenido: data.contenido,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Observación actualizada",
        description: "La observación ha sido actualizada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/observaciones"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/observaciones", observacionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/profesores", user?.profesorId, "observaciones"] 
      });
      navigate(`/observaciones/${observacionId}`);
    },
    onError: (error) => {
      console.error("Error al actualizar observación:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la observación. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Manejar el envío del formulario
  const onSubmit = (data: z.infer<typeof editObservacionSchema>) => {
    updateObservacionMutation.mutate(data);
  };

  // Si hay un error al cargar los datos, mostrar mensaje
  if (isError) {
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
          <h1 className="text-3xl font-bold tracking-tight">Editar Observación</h1>
        </div>
        
        <Separator />
        
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
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => navigate(`/observaciones/${observacionId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Editar Observación</h1>
      </div>
      
      <Separator />
      
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Editar observación</CardTitle>
            <CardDescription>
              Modifique los detalles de la observación registrada previamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {observacion && (
              <div className="mb-6 text-sm">
                <p><strong>Estudiante:</strong> {observacion.alumnoNombre || `ID: ${observacion.alumnoId}`}</p>
                <p><strong>Grupo:</strong> {observacion.grupoNombre || `ID: ${observacion.grupoId}`}</p>
                <p><strong>Materia:</strong> {observacion.materiaNombre || `ID: ${observacion.materiaId}`}</p>
                <p><strong>Fecha de registro:</strong> {new Date(observacion.fechaCreacion).toLocaleDateString()}</p>
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Categoría */}
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría (opcional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sin_categoria">Sin categoría</SelectItem>
                          <SelectItem value="académica">Académica</SelectItem>
                          <SelectItem value="comportamiento">Comportamiento</SelectItem>
                          <SelectItem value="asistencia">Asistencia</SelectItem>
                          <SelectItem value="desempeño">Desempeño</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Categoría de la observación (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contenido de la observación */}
                <FormField
                  control={form.control}
                  name="contenido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observación</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ingrese la observación sobre el estudiante"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Ingrese los detalles de la observación (mínimo 10 caracteres)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="mr-2"
                    onClick={() => navigate(`/observaciones/${observacionId}`)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateObservacionMutation.isPending}
                  >
                    {updateObservacionMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}