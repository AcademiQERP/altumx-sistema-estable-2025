import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { insertAttendanceSchema } from "@shared/schema";
import { z } from "zod";
import { Student } from "@shared/schema";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Extender el esquema para validación adicional
const attendanceFormSchema = insertAttendanceSchema;
type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;

export default function AttendanceForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Obtener datos de los estudiantes
  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Configurar el formulario
  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      alumnoId: undefined,
      fecha: getCurrentDateForInput(),
      asistencia: true,
      justificacion: ""
    }
  });

  // Mutación para registrar asistencia
  const createAttendance = useMutation({
    mutationFn: (data: AttendanceFormValues) => 
      apiRequest("POST", "/api/attendance", data),
    onSuccess: () => {
      toast({
        title: "Asistencia registrada",
        description: "La asistencia ha sido registrada correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      navigate("/asistencias");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al registrar asistencia: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: AttendanceFormValues) {
    createAttendance.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="alumnoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alumno</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(Number(value))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar alumno" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {students?.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.nombreCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="asistencia"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Asistencia</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="justificacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Justificación (si aplica)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Ingrese una justificación en caso de ausencia" 
                    className="resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/asistencias")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={createAttendance.isPending}
          >
            {createAttendance.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
