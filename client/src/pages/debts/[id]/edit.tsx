import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Student, PaymentConcept, insertDebtSchema, Debt } from "@shared/schema";

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

export default function EditDebt() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [, params] = useRoute("/adeudos/:id/editar");
  const id = params?.id ? parseInt(params.id) : 0;

  // Fetch the debt to edit
  const { data: debt, isLoading: debtLoading } = useQuery({
    queryKey: [`/api/debts/${id}`],
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students'],
    refetchOnWindowFocus: false,
  });

  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['/api/payment-concepts'],
    refetchOnWindowFocus: false,
  });

  const isLoading = studentsLoading || conceptsLoading || debtLoading;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      alumnoId: undefined,
      conceptoId: undefined,
      montoTotal: "",
      fechaLimite: new Date().toISOString().split('T')[0],
      estatus: "pendiente",
    },
  });

  // Update form values when debt data is fetched
  useEffect(() => {
    if (debt) {
      form.reset({
        alumnoId: debt.alumnoId,
        conceptoId: debt.conceptoId,
        montoTotal: debt.montoTotal,
        fechaLimite: new Date(debt.fechaLimite).toISOString().split('T')[0],
        estatus: debt.pagado ? "pagado" : "pendiente",
      });
    }
  }, [debt, form]);

  // Update the monto when concept changes
  const watchConceptId = form.watch("conceptoId");
  const selectedConcept = concepts?.find((c: PaymentConcept) => c.id === watchConceptId);
  
  if (selectedConcept && !form.getValues("montoTotal")) {
    form.setValue("montoTotal", selectedConcept.montoDefault);
  }

  async function onSubmit(data: FormData) {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      await apiRequest("PUT", `/api/debts/${id}`, data);

      queryClient.invalidateQueries({ queryKey: ['/api/debts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/debts/${id}`] });
      
      toast({
        title: "Adeudo actualizado",
        description: "El adeudo ha sido actualizado correctamente",
      });
      
      navigate("/adeudos");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el adeudo",
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

  if (!debt && !debtLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-red-500">
            <p className="text-lg font-medium">El adeudo no fue encontrado</p>
            <p className="mt-2">El adeudo que intentas editar no existe o ha sido eliminado.</p>
            <Button 
              onClick={() => navigate("/adeudos")} 
              className="mt-4"
            >
              Volver a la lista de adeudos
            </Button>
          </div>
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
        <h1 className="text-3xl font-bold tracking-tight">Editar Adeudo</h1>
        <p className="text-muted-foreground">
          Modifica la información del adeudo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Adeudo</CardTitle>
          <CardDescription>
            Actualiza los datos del adeudo según sea necesario
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
                      value={field.value?.toString()}
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
                      Estudiante al que está asignado el adeudo
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
                      value={field.value?.toString()}
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
                          value={field.value || ""}
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
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Fecha límite para realizar el pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {debt && debt.pagado && (
                <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Adeudo Pagado</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Este adeudo ya ha sido marcado como pagado. La modificación de estos datos podría afectar reportes financieros o estados de cuenta.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                    "Guardar Cambios"
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