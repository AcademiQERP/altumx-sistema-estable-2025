import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Student, Group } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Esquema de validación
const studentSchema = z.object({
  nombreCompleto: z.string().min(1, "El nombre es requerido"),
  curp: z.string().min(1, "La CURP es requerida"),
  fechaNacimiento: z.string().min(1, "La fecha de nacimiento es requerida"),
  genero: z.string().min(1, "El género es requerido"),
  nivel: z.string().min(1, "El nivel educativo es requerido"),
  grupoId: z.coerce.number().optional(),
  estatus: z.string().default("activo"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function EditStudent() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: student, isLoading, error } = useQuery<Student>({
    queryKey: [`/api/students/${id}`],
    enabled: !!id,
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    refetchOnWindowFocus: false,
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      nombreCompleto: '',
      curp: '',
      fechaNacimiento: '',
      genero: '',
      nivel: '',
      estatus: 'activo',
    },
  });

  // Actualizar los valores del formulario cuando se cargan los datos del estudiante
  useEffect(() => {
    if (student) {
      form.reset({
        nombreCompleto: student.nombreCompleto,
        curp: student.curp,
        fechaNacimiento: student.fechaNacimiento,
        genero: student.genero,
        nivel: student.nivel,
        grupoId: student.grupoId,
        estatus: student.estatus,
      });
    }
  }, [student, form]);

  const mutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      return await apiRequest("PATCH", `/api/students/${id}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Estudiante actualizado",
        description: "Los datos del estudiante han sido actualizados correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${id}`] });
      navigate("/estudiantes");
    },
    onError: (error) => {
      console.error("Error al actualizar estudiante:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estudiante. Por favor, intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StudentFormValues) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2">Cargando información del estudiante...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h3 className="text-lg font-medium mb-2">Error al cargar estudiante</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No se pudo cargar la información del estudiante
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate("/estudiantes")}>
            Volver a la lista
          </Button>
          <Button onClick={() => window.location.reload()}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Editar Estudiante</h1>
          <div className="flex items-center text-sm">
            <Link to="/">
              <span className="text-primary cursor-pointer">Inicio</span>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <Link to="/estudiantes">
              <span className="text-primary cursor-pointer">Estudiantes</span>
            </Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Editar</span>
          </div>
        </div>
        <Link to="/estudiantes">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Estudiante</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nombreCompleto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="curp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CURP</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fechaNacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genero"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Género</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Masculino" />
                            </FormControl>
                            <FormLabel className="font-normal">Masculino</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Femenino" />
                            </FormControl>
                            <FormLabel className="font-normal">Femenino</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nivel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel Educativo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un nivel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Preescolar">Preescolar</SelectItem>
                          <SelectItem value="Primaria">Primaria</SelectItem>
                          <SelectItem value="Secundaria">Secundaria</SelectItem>
                          <SelectItem value="Preparatoria">Preparatoria</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grupoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grupo</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "0" ? null : parseInt(value))}
                        defaultValue={field.value?.toString() || "0"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un grupo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Sin grupo</SelectItem>
                          {groups?.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        El grupo al que pertenece el estudiante
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estatus</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estatus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="inactivo">Inactivo</SelectItem>
                          <SelectItem value="suspendido">Suspendido</SelectItem>
                          <SelectItem value="egresado">Egresado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/estudiantes")}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}