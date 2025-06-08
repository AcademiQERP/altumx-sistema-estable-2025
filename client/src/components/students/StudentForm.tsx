import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { insertStudentSchema } from "@shared/schema";
import { z } from "zod";
import { getCurrentDateForInput } from "@/lib/dates";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Group } from "@shared/schema";

// Extender el esquema para agregar validaciones personalizadas
const studentFormSchema = insertStudentSchema.extend({
  curp: z.string()
    .length(18, "La CURP debe tener exactamente 18 caracteres")
    .regex(/^[A-Z0-9]+$/, "La CURP debe contener solo letras mayúsculas y números"),
  fechaNacimiento: z.string()
    .refine(date => {
      const today = new Date();
      const inputDate = new Date(date);
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 20); // 20 años atrás como mínimo
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() - 3); // 3 años atrás como máximo

      return inputDate >= minDate && inputDate <= maxDate;
    }, "La fecha de nacimiento debe ser válida para un estudiante (entre 3 y 20 años)")
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

export default function StudentForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Obtener la lista de grupos
  const { data: groups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  // Configurar el formulario
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      nombreCompleto: "",
      curp: "",
      fechaNacimiento: getCurrentDateForInput(),
      genero: "",
      nivel: "",
      estatus: "activo"
    }
  });

  // Mutación para crear un estudiante
  const createStudent = useMutation({
    mutationFn: (data: StudentFormValues) => 
      apiRequest("POST", "/api/students", data),
    onSuccess: () => {
      toast({
        title: "Estudiante registrado",
        description: "El estudiante ha sido registrado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      navigate("/estudiantes");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al registrar estudiante: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: StudentFormValues) {
    createStudent.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nombreCompleto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre Completo" {...field} />
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
                  <Input placeholder="CURP" {...field} />
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
              <FormItem>
                <FormLabel>Género</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="No especificado">No especificado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="nivel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
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
                  onValueChange={(value) => field.onChange(Number(value))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/estudiantes")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={createStudent.isPending}
          >
            {createStudent.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
