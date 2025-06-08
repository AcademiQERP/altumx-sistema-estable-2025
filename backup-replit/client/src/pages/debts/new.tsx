import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Student, PaymentConcept, insertDebtSchema } from "@shared/schema";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const formSchema = insertDebtSchema.extend({
  alumnoId: z.coerce.number({
    required_error: "El estudiante es requerido",
    invalid_type_error: "Seleccione un estudiante válido",
  }),
  conceptoId: z.coerce.number({
    required_error: "El concepto de pago es requerido",
    invalid_type_error: "Seleccione un concepto válido",
  }),
  montoTotal: z.string().min(1, "El monto es requerido"),
  fechaLimite: z.string().min(1, "La fecha límite es requerida"),
});

type FormData = z.infer<typeof formSchema>;

export default function NewDebt() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students'],
    refetchOnWindowFocus: false,
  });

  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['/api/payment-concepts'],
    refetchOnWindowFocus: false,
  });

  const isLoading = studentsLoading || conceptsLoading;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      alumnoId: undefined,
      conceptoId: undefined,
      montoTotal: "",
      fechaLimite: new Date().toISOString().split('T')[0], // Today's date as default
      estatus: "pendiente",
    },
  });

  // Update the monto when concept changes
  const watchConceptId = form.watch("conceptoId");
  const selectedConcept = concepts?.find((c: PaymentConcept) => c.id === watchConceptId);
  
  if (selectedConcept && !form.getValues("montoTotal")) {
    form.setValue("montoTotal", selectedConcept.montoDefault);
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/debts", data);

      queryClient.invalidateQueries({ queryKey: ['/api/debts'] });
      
      toast({
        title: "Adeudo registrado",
        description: "El adeudo ha sido registrado correctamente",
      });
      
      navigate("/adeudos");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el adeudo",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/adeudos")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Adeudo</h1>
        <p className="text-muted-foreground">
          Registra un nuevo adeudo para un estudiante
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Adeudo</CardTitle>
          <CardDescription>
            Completa los datos para registrar un nuevo adeudo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="alumnoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estudiante</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estudiante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students?.map((student: Student) => (
                          <SelectItem 
                            key={student.id} 
                            value={student.id.toString()}
                          >
                            {student.nombreCompleto} - {student.nivel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Estudiante al que se asignará el adeudo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conceptoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concepto de Pago</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const concept = concepts?.find((c: PaymentConcept) => c.id.toString() === value);
                        if (concept) {
                          form.setValue("montoTotal", concept.montoDefault);
                        }
                      }}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un concepto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {concepts?.map((concept: PaymentConcept) => (
                          <SelectItem 
                            key={concept.id} 
                            value={concept.id.toString()}
                          >
                            {concept.nombre} - ${parseFloat(concept.montoDefault).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      El concepto de pago asociado a este adeudo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="montoTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Total</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <span className="text-gray-500">$</span>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Monto total a pagar
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fechaLimite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Límite de Pago</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      Fecha límite para realizar el pago
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
                  onClick={() => navigate("/adeudos")}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                      Guardando...
                    </>
                  ) : (
                    "Registrar Adeudo"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}