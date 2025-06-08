import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, queryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Lightbulb, Loader2 } from "lucide-react";

// Definición del esquema de validación del formulario
const formSchema = z.object({
  alumnoId: z.string({
    required_error: "Debes seleccionar un alumno",
  }),
  materiaId: z.string({
    required_error: "Debes seleccionar una materia",
  }),
  periodo: z.string({
    required_error: "Debes seleccionar un periodo",
  }),
  temaId: z.string().optional(),
  contexto: z.string().min(10, "El contexto debe tener al menos 10 caracteres").max(500, "El contexto no debe exceder 500 caracteres"),
});

// Tipo para la observación generada
interface ObservacionGenerada {
  id: string;
  alumnoId: number;
  materiaId: number;
  periodo: string;
  temaId?: number;
  temaNombre?: string;
  fecha: string;
  contenido: string;
}

// Componente principal de la página
export default function NuevaObservacion() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [observacionGenerada, setObservacionGenerada] = useState<ObservacionGenerada | null>(null);
  
  // Inicialización del formulario con el esquema de validación
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      alumnoId: "",
      materiaId: "",
      periodo: "",
      temaId: "",
      contexto: "",
    },
  });
  
  // Consulta para obtener los alumnos (estudiantes)
  const estudiantesQuery = useQuery({
    queryKey: ["/api/students"],
    enabled: !!user,
  });
  
  // Consulta para obtener las materias
  const materiasQuery = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!user,
  });
  
  // Consulta para obtener los temas o subtemas
  const temasQuery = useQuery({
    queryKey: ["/api/academic-observer/subtemas"],
    enabled: !!user,
  });
  
  // Mutación para generar la observación
  const generarObservacionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Obtener los nombres de alumno y materia para enviarlos en la solicitud
      const alumnoNombre = estudiantesQuery.data?.find(
        (e: any) => e.id === parseInt(data.alumnoId)
      )?.nombreCompleto;
      
      const materiaNombre = materiasQuery.data?.find(
        (m: any) => m.id === parseInt(data.materiaId)
      )?.nombre;
      
      const response = await apiRequest("POST", "/api/academic-observer/generar-observacion", {
        alumnoId: parseInt(data.alumnoId),
        alumnoNombre: alumnoNombre,
        materiaId: parseInt(data.materiaId),
        materiaNombre: materiaNombre,
        periodo: data.periodo,
        temaId: data.temaId ? parseInt(data.temaId) : undefined,
        contexto: data.contexto,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setObservacionGenerada(data);
      toast({
        title: "Observación generada correctamente",
        description: "Se ha generado una nueva observación académica con éxito.",
      });
    },
    onError: (error) => {
      console.error("Error al generar observación:", error);
      toast({
        title: "Error al generar la observación",
        description: "No se pudo generar la observación. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    },
  });
  
  // Función para manejar el envío del formulario
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    generarObservacionMutation.mutate(data);
  };
  
  // Ver detalles de la observación generada
  const verDetalles = () => {
    if (observacionGenerada) {
      navigate(`/profesor/observaciones/${observacionGenerada.id}`);
    }
  };
  
  // Generar nueva observación (limpiar estado actual)
  const generarNueva = () => {
    setObservacionGenerada(null);
    form.reset();
  };
  
  return (
    <div className="container py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Nueva Observación Académica</h1>
        <p className="text-muted-foreground">
          Genera observaciones académicas personalizadas para los alumnos utilizando inteligencia artificial.
        </p>
      </div>
      
      <Separator className="my-6" />
      
      {!observacionGenerada ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Formulario de Generación
            </CardTitle>
            <CardDescription>
              Completa el formulario con la información del alumno y el contexto para generar una observación académica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Campo de selección de alumno */}
                  <FormField
                    control={form.control}
                    name="alumnoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alumno</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={estudiantesQuery.isLoading || generarObservacionMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un alumno" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {estudiantesQuery.isSuccess && estudiantesQuery.data?.map((estudiante: any) => (
                              <SelectItem key={estudiante.id} value={estudiante.id.toString()}>
                                {estudiante.nombreCompleto}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Selecciona el alumno para el que deseas generar la observación.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Campo de selección de materia */}
                  <FormField
                    control={form.control}
                    name="materiaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Materia</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={materiasQuery.isLoading || generarObservacionMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una materia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materiasQuery.isSuccess && materiasQuery.data?.map((materia: any) => (
                              <SelectItem key={materia.id} value={materia.id.toString()}>
                                {materia.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Selecciona la materia relacionada con la observación.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Campo de selección de periodo */}
                  <FormField
                    control={form.control}
                    name="periodo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Periodo</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={generarObservacionMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un periodo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1er_bimestre">1er Bimestre</SelectItem>
                            <SelectItem value="2do_bimestre">2do Bimestre</SelectItem>
                            <SelectItem value="3er_bimestre">3er Bimestre</SelectItem>
                            <SelectItem value="4to_bimestre">4to Bimestre</SelectItem>
                            <SelectItem value="5to_bimestre">5to Bimestre</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Selecciona el periodo académico correspondiente.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Campo de selección de tema o área */}
                  <FormField
                    control={form.control}
                    name="temaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tema o Área (Opcional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={temasQuery.isLoading || generarObservacionMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un tema o área" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {temasQuery.isSuccess && temasQuery.data?.map((tema: any) => (
                              <SelectItem key={tema.id} value={tema.id.toString()}>
                                {tema.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Puedes seleccionar un tema o área específica para enfocar la observación.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Campo de contexto */}
                <FormField
                  control={form.control}
                  name="contexto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contexto</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el contexto o situación específica del alumno que deseas destacar en la observación..."
                          className="min-h-[120px]"
                          {...field}
                          disabled={generarObservacionMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Proporciona detalles relevantes sobre el desempeño, comportamiento o situación del alumno para generar una observación más precisa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={generarObservacionMutation.isPending}
                >
                  {generarObservacionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando observación...
                    </>
                  ) : (
                    <>Generar Observación</>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Lightbulb className="h-5 w-5" />
              Observación Generada
            </CardTitle>
            <CardDescription>
              La observación ha sido generada exitosamente. Revisa el contenido a continuación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Alumno:</h3>
              <p>{estudiantesQuery.data?.find((e: any) => e.id === parseInt(form.getValues("alumnoId")))?.nombreCompleto || "Alumno"}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Materia:</h3>
              <p>{materiasQuery.data?.find((m: any) => m.id === parseInt(form.getValues("materiaId")))?.nombre || "Materia"}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Periodo:</h3>
              <p>
                {form.getValues("periodo") === "1er_bimestre" && "1er Bimestre"}
                {form.getValues("periodo") === "2do_bimestre" && "2do Bimestre"}
                {form.getValues("periodo") === "3er_bimestre" && "3er Bimestre"}
                {form.getValues("periodo") === "4to_bimestre" && "4to Bimestre"}
                {form.getValues("periodo") === "5to_bimestre" && "5to Bimestre"}
              </p>
            </div>
            
            {observacionGenerada.temaId && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Tema o Área:</h3>
                <p>{observacionGenerada.temaNombre || "Tema"}</p>
              </div>
            )}
            
            <Separator className="my-4" />
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Contenido de la Observación:</h3>
              <div className="p-4 bg-accent/50 rounded-md whitespace-pre-line">
                {observacionGenerada.contenido}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button variant="outline" onClick={generarNueva}>
              Generar Nueva Observación
            </Button>
            <Button onClick={verDetalles}>
              Ver Detalles Completos
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}