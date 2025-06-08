import { useState, useEffect, useRef } from "react";
import { useLocation, useRouter, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { InfoIcon, CreditCard, Clock, ArrowUpRight, FileText, ChevronRight, CheckCircle, ExternalLink, Circle, User, School } from "lucide-react";
import StudentAutocomplete from "@/components/students/StudentAutocomplete";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Función auxiliar para obtener los parámetros de la URL
function useQueryParams() {
  // Utilizamos directamente window.location.search para obtener todos los parámetros de la URL
  const searchParams = new URLSearchParams(window.location.search);
  
  // Obtenemos los parámetros específicos y los convertimos a los tipos correctos
  const studentId = searchParams.get("studentId");
  const alumnoId = searchParams.get("alumnoId");  // Soporte para alumnoId
  const conceptId = searchParams.get("conceptId");
  const conceptoId = searchParams.get("conceptoId"); // Soporte para conceptoId
  const amount = searchParams.get("amount");
  const adeudoId = searchParams.get("adeudoId");
  
  // Para mantener compatibilidad, usamos studentId o alumnoId (alumnoId tiene prioridad)
  const finalStudentId = alumnoId || studentId;
  // Para mantener compatibilidad, usamos conceptId o conceptoId (conceptoId tiene prioridad)
  const finalConceptId = conceptId || conceptoId;
  
  // Logs para depuración
  if (finalStudentId || finalConceptId || amount || adeudoId) {
    console.log("Parámetros URL encontrados:", { 
      studentId: finalStudentId, 
      conceptId: finalConceptId, 
      amount, 
      adeudoId 
    });
  }
  
  // Devolvemos valores convertidos a los tipos correctos
  return {
    studentId: finalStudentId ? parseInt(finalStudentId) : undefined,
    conceptId: finalConceptId ? parseInt(finalConceptId) : undefined,
    // Los siguientes valores son para compatibilidad interna del formulario
    alumnoId: finalStudentId ? parseInt(finalStudentId) : undefined,
    conceptoId: finalConceptId ? parseInt(finalConceptId) : undefined,
    amount: amount ? parseFloat(amount) : undefined,
    adeudoId: adeudoId ? parseInt(adeudoId) : undefined
  };
}
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Student, PaymentConcept, Debt, insertPaymentSchema, Payment } from "@shared/schema";

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
import { Textarea } from "@/components/ui/textarea";
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
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ReceiptPreview from "@/components/payments/ReceiptPreview";
import { generateFolio, generateReceiptPDF } from "@/utils/pdf-utils";

const formSchema = insertPaymentSchema.extend({
  alumnoId: z.coerce.number({
    required_error: "El estudiante es requerido",
    invalid_type_error: "Seleccione un estudiante válido",
  }),
  conceptoId: z.coerce.number({
    required_error: "El concepto de pago es requerido",
    invalid_type_error: "Seleccione un concepto válido",
  }),
  monto: z.string().min(1, "El monto es requerido"),
  fechaPago: z.string().min(1, "La fecha de pago es requerida"),
  metodoPago: z.string().min(1, "El método de pago es requerido"),
  referencia: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  adeudoId: z.coerce.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewPayment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentType, setPaymentType] = useState<'concept' | 'debt'>('concept');
  const [, navigate] = useLocation();
  const router = useQueryParams(); // Usamos nuestra función personalizada
  const [receiptData, setReceiptData] = useState<{
    payment: Payment | null;
    studentName: string;
    conceptName: string;
    folio: string;
  }>({
    payment: null,
    studentName: '',
    conceptName: '',
    folio: ''
  });
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Obtener parámetros usando nuestro hook personalizado
  // Ya están convertidos a los tipos correctos (número)
  // Usamos los parámetros "conceptoId" aquí para garantizar compatibilidad con el formulario
  const { studentId, conceptId, conceptoId, amount, adeudoId, alumnoId } = router;
  
  // Para debugging
  console.log("Valores de formdata:", { studentId, conceptId, conceptoId, alumnoId, amount });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students'],
    refetchOnWindowFocus: false,
  });

  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['/api/payment-concepts'],
    refetchOnWindowFocus: false,
  });

  const { data: allDebts, isLoading: debtsLoading } = useQuery({
    queryKey: ['/api/debts'],
    refetchOnWindowFocus: false,
  });
  
  // Consulta para obtener todos los pagos - solo se usará para filtrar por estudiante
  const { data: allPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/payments'],
    refetchOnWindowFocus: false,
  });

  const isLoading = studentsLoading || conceptsLoading || debtsLoading || paymentsLoading;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      alumnoId: undefined,
      conceptoId: undefined,
      monto: "",
      fechaPago: new Date().toISOString().split('T')[0], // Today's date as default
      metodoPago: "efectivo",
      referencia: "",
      observaciones: "",
    },
  });

  // Watches
  const watchStudentId = form.watch("alumnoId");
  const watchConceptId = form.watch("conceptoId");
  
  // Filter debts by selected student - convertimos a string para comparación segura
  const studentDebts = watchStudentId 
    ? allDebts?.filter((debt: Debt) => {
        return String(debt.alumnoId) === String(watchStudentId) && debt.estatus !== "pagado";
      })
    : [];

  // Handle pre-filled data from URL params
  useEffect(() => {
    // Solo proceder cuando los datos necesarios están cargados
    // Usamos conceptoId si existe, o conceptId como respaldo para garantizar compatibilidad
    const finalConceptId = conceptoId || conceptId;
    // Usamos alumnoId si existe, o studentId como respaldo para garantizar compatibilidad
    const finalStudentId = alumnoId || studentId;
    
    if (students?.length > 0 && concepts?.length > 0 && finalStudentId && finalConceptId && amount) {
      const student = students.find((s) => s.id === Number(finalStudentId));
      const concept = concepts.find((c) => c.id === Number(finalConceptId));
      
      console.log("Prellenando pago por concepto:", { 
        studentId: finalStudentId, 
        conceptId: finalConceptId, 
        amount 
      });
      console.log("Datos encontrados:", { 
        selectedStudent: student?.nombreCompleto, 
        selectedConcept: concept?.nombre 
      });
      
      if (student && concept) {
        // Set payment type to concept
        setPaymentType('concept');
        
        // Establecemos los valores en el formulario
        form.setValue("alumnoId", Number(finalStudentId));
        form.setValue("conceptoId", Number(finalConceptId));
        // Convertir de número a string para asegurar compatibilidad con el input
        const montoStr = typeof amount === 'number' ? amount.toString() : amount.toString();
        form.setValue("monto", montoStr);
        
        // Delay para asegurar que los selects se actualicen
        setTimeout(() => {
          console.log("Valores establecidos en el formulario:", {
            alumnoId: form.getValues("alumnoId"),
            conceptoId: form.getValues("conceptoId"),
            monto: form.getValues("monto")
          });
        }, 500);
        
        // Show a toast
        toast({
          title: "Pago por concepto",
          description: `Prellenado automático para ${student.nombreCompleto} - ${concept.nombre}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Atención",
          description: "No se pudieron encontrar todos los datos para prellenar el formulario",
          variant: "destructive"
        });
      }
    }
  }, [students, concepts, studentId, conceptId, conceptoId, alumnoId, amount, form, toast]);
  
  // Manejo por separado para pagos de adeudos
  useEffect(() => {
    if (adeudoId && allDebts && allDebts.length > 0) {
      const debt = allDebts.find((d: Debt) => d.id === Number(adeudoId));
      
      console.log("Buscando adeudo con ID:", adeudoId, "Encontrado:", !!debt);
      
      if (debt) {
        // Set payment type to debt
        setPaymentType('debt');
        
        // Set student ID
        form.setValue("alumnoId", debt.alumnoId);
        
        // Set concept ID
        form.setValue("conceptoId", debt.conceptoId);
        
        // Set debt ID
        form.setValue("adeudoId", Number(adeudoId));
        
        // Set amount
        form.setValue("monto", debt.montoTotal);
        
        // Focus on the payment method
        setTimeout(() => {
          const metodoPagoElement = document.querySelector('input[name="metodoPago"]');
          if (metodoPagoElement) {
            (metodoPagoElement as HTMLInputElement).focus();
          }
        }, 500);
        
        // Show a toast
        toast({
          title: "Pago de adeudo",
          description: "El formulario se ha completado automáticamente con los datos del adeudo seleccionado",
        });
      }
    }
  }, [adeudoId, allDebts, form, toast]);

  // Update the monto when concept changes
  useEffect(() => {
    if (paymentType === 'concept' && watchConceptId) {
      const selectedConcept = concepts?.find((c: PaymentConcept) => c.id === watchConceptId);
      if (selectedConcept) {
        form.setValue("monto", selectedConcept.montoDefault);
      }
    }
  }, [watchConceptId, concepts, paymentType, form]);

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      // If paying a debt, ensure the adeudoId is included
      if (paymentType === 'debt') {
        const selectedDebtId = form.getValues("adeudoId");
        if (!selectedDebtId) {
          throw new Error("Debe seleccionar un adeudo");
        }
      } else {
        // If paying a concept directly, remove the adeudoId if it was set
        data.adeudoId = undefined;
      }

      // Register the payment
      const response = await apiRequest(
        "POST", 
        "/api/payments", 
        data
      );
      
      const paymentResponse = await response.json();

      // Generate a folio
      const folio = generateFolio();
      
      // Get student name and concept name
      // No necesitamos convertir los IDs porque ya deberían ser números
      const selectedStudent = students?.find((s: Student) => s.id === data.alumnoId);
      const selectedConcept = concepts?.find((c: PaymentConcept) => c.id === data.conceptoId);
      
      if (selectedStudent && selectedConcept && paymentResponse) {
        // Set receipt data
        setReceiptData({
          payment: paymentResponse,
          studentName: selectedStudent.nombreCompleto,
          conceptName: selectedConcept.nombre,
          folio
        });
        
        // We need a small delay to ensure the state is updated and the component is rendered
        setTimeout(() => {
          if (receiptRef.current) {
            // Generate and download the PDF
            generateReceiptPDF({
              payment: paymentResponse,
              studentName: selectedStudent.nombreCompleto,
              conceptName: selectedConcept.nombre,
              receiptRef
            });
          }
        }, 300);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/debts'] });
      
      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado correctamente y el recibo ha sido generado",
      });
      
      // Delay navigation slightly to allow PDF generation to complete
      setTimeout(() => {
        navigate("/payments");
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      });
      console.error(error);
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
      {/* Mostrar alerta cuando hay parámetros de URL */}
      {(studentId || conceptId || alumnoId || conceptoId || amount || adeudoId) && (
        <Alert variant="info" className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Formulario prellenado automáticamente</AlertTitle>
          <AlertDescription>
            {adeudoId ? (
              "Se ha cargado la información del adeudo seleccionado. Complete los datos restantes para registrar el pago."
            ) : (
              "Se han precargado los datos del pago a realizar. Verifique la información y complete los campos restantes."
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Mostramos los pagos recientes del alumno seleccionado si hay uno */}
      {form.watch("alumnoId") && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-500" />
              Historial de Pagos Recientes
            </h3>
            <Link to={`/payments?alumnoId=${form.watch("alumnoId")}`}>
              <Button variant="outline" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-900 transition-all">
                <ArrowUpRight className="mr-1 h-4 w-4 text-blue-500" />
                Ver historial completo
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {Array.isArray(allPayments) && allPayments
              .filter(payment => Number(payment.alumnoId) === Number(form.watch("alumnoId")))
              .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
              .slice(0, 3)
              .map(payment => {
                const concept = concepts?.find((c) => Number(c.id) === Number(payment.conceptoId));
                return (
                  <div key={payment.id} className="border rounded-md p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{concept?.nombre || 'Concepto no encontrado'}</p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {new Date(payment.fechaPago).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                          <div className="h-1 w-1 mx-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          {payment.metodoPago}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600 dark:text-blue-400">${payment.monto}</p>
                        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900 px-2 py-1 text-xs font-medium text-green-800 dark:text-green-300 mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Pagado
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
            {Array.isArray(allPayments) && allPayments.filter(payment => Number(payment.alumnoId) === Number(form.watch("alumnoId"))).length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-muted-foreground">Este estudiante no tiene pagos registrados</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Hidden Receipt Preview for PDF generation - will not be visible on screen */}
      <div className="hidden">
        {receiptData.payment && (
          <ReceiptPreview
            ref={receiptRef}
            payment={receiptData.payment}
            studentName={receiptData.studentName}
            conceptName={receiptData.conceptName}
            folio={receiptData.folio}
          />
        )}
      </div>
      
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/payments")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Registrar Pago</h1>
        <p className="text-muted-foreground">
          Registra un nuevo pago para un estudiante
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Pago</CardTitle>
              <CardDescription>
                Datos básicos del pago a registrar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="alumnoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estudiante <span className="text-red-500">*</span></FormLabel>
                    <StudentAutocomplete
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Reset concept if payment type is debt
                        if (paymentType === 'debt') {
                          setPaymentType('concept');
                        }
                      }}
                      placeholder="Buscar estudiante..."
                      allStudents={students}
                    />
                    <FormDescription>
                      Estudiante que realiza el pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Historial reciente de pagos */}
              {watchStudentId && allPayments && (
                <div className="mb-4 bg-slate-50 dark:bg-slate-900 border rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-blue-500" />
                      Historial reciente de pagos
                    </h3>
                    <Link href={`/pagos?studentId=${watchStudentId}`}>
                      <span className="text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer">
                        Ver historial completo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </span>
                    </Link>
                  </div>
                  
                  {Array.isArray(allPayments) && allPayments
                    .filter((payment) => Number(payment.alumnoId) === Number(watchStudentId))
                    .slice(0, 3)
                    .map((payment, index) => {
                      const concept = Array.isArray(concepts) ? 
                        concepts.find(c => c.id === payment.conceptoId) : null;
                      return (
                        <div key={payment.id} className={`py-2 ${index !== 0 ? 'border-t' : ''}`}>
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{concept?.nombre || 'Concepto desconocido'}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payment.fechaPago).toLocaleDateString()} - {payment.metodoPago}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">${payment.monto}</p>
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                Pagado
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                  {Array.isArray(allPayments) && allPayments.filter(payment => Number(payment.alumnoId) === Number(watchStudentId)).length === 0 && (
                    <p className="text-sm text-muted-foreground">Este estudiante no tiene pagos registrados</p>
                  )}
                </div>
              )}
              
              <div className="border rounded-md p-4">
                <Tabs 
                  defaultValue="concept" 
                  value="concept"
                  onValueChange={(value) => setPaymentType(value as 'concept' | 'debt')}
                >
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="concept">Pago de Adeudo</TabsTrigger>
                  </TabsList>
                  <TabsContent value="concept">
                    <div className="space-y-4 pt-4">
                      {watchStudentId && studentDebts && studentDebts.length > 0 ? (
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 mb-4">
                          <h3 className="text-md font-medium mb-2">Adeudos pendientes encontrados</h3>
                          <div className="divide-y">
                            {studentDebts.map((debt: Debt) => {
                              const concept = concepts?.find((c: PaymentConcept) => c.id === debt.conceptoId);
                              return (
                                <div key={debt.id} className="py-2 flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">{concept?.nombre || 'Concepto desconocido'}</p>
                                    <p className="text-sm text-muted-foreground">Fecha límite: {new Date(debt.fechaLimite).toLocaleDateString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">${debt.montoTotal}</p>
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                      Pendiente
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : watchStudentId ? (
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 mb-4">
                          <h3 className="text-md font-medium mb-2">Sin adeudos pendientes</h3>
                          <p className="text-sm">Este estudiante no tiene adeudos pendientes registrados en el sistema.</p>
                        </div>
                      ) : null}
                      
                      <FormField
                        control={form.control}
                        name="conceptoId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Concepto de Pago <span className="text-red-500">*</span></FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                const concept = concepts?.find((c: PaymentConcept) => c.id.toString() === value);
                                if (concept && concept.montoBase) {
                                  form.setValue("monto", concept.montoBase);
                                }
                              }}
                              value={field.value !== undefined ? field.value.toString() : ""}
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
                                    {concept.nombre} - ${concept.montoBase || concept.montoDefault}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Concepto por el que se registra el pago
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="debt">
                    <div className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="adeudoId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adeudo a pagar <span className="text-red-500">*</span></FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(Number(value));
                                // Buscar el adeudo seleccionado
                                const debt = allDebts?.find((d: Debt) => d.id.toString() === value);
                                if (debt) {
                                  // Actualizar el concepto y el monto automáticamente
                                  form.setValue("conceptoId", debt.conceptoId);
                                  form.setValue("monto", debt.montoTotal);
                                }
                              }}
                              value={field.value !== undefined ? field.value.toString() : ""}
                              disabled={!studentDebts || studentDebts.length === 0}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    !studentDebts || studentDebts.length === 0
                                      ? "No hay adeudos pendientes para este estudiante"
                                      : "Selecciona un adeudo"
                                  } />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {studentDebts?.map((debt: Debt) => {
                                  const concept = concepts?.find((c: PaymentConcept) => c.id === debt.conceptoId);
                                  return (
                                    <SelectItem
                                      key={debt.id}
                                      value={debt.id.toString()}
                                    >
                                      {concept?.nombre || "Concepto desconocido"} - ${debt.montoTotal}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Seleccione el adeudo que desea pagar
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <span className="mr-2 text-gray-500">$</span>
                        <Input
                          placeholder="0.00"
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Monto del pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaPago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Pago <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                      />
                    </FormControl>
                    <FormDescription>
                      Fecha en la que se realizó el pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metodoPago"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Método de Pago <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="efectivo" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Efectivo
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="transferencia" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Transferencia
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="spei" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            SPEI
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="cheque" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Cheque
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Método mediante el cual se realizó el pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Número de referencia o identificador del pago"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Número de referencia o identificador del pago (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Información adicional sobre el pago"
                        className="min-h-[80px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Información adicional sobre el pago
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 w-full">
              {/* Tarjeta de Resumen de Pago */}
              {(form.formState.isDirty && form.watch("alumnoId") && form.watch("conceptoId") && form.watch("monto")) && (
                <div className="w-full bg-blue-50 dark:bg-slate-800 rounded-lg p-4 border border-blue-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-lg font-semibold mb-3 flex items-center text-blue-700 dark:text-blue-400">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Resumen de Pago
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-blue-100 dark:border-slate-700 pt-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Estudiante:</p>
                      <p className="font-medium">
                        {students && Array.isArray(students) && form.watch("alumnoId") 
                          ? students.find((s) => Number(s.id) === Number(form.watch("alumnoId")))?.nombreCompleto 
                          : 'No seleccionado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Concepto:</p>
                      <p className="font-medium">
                        {concepts && Array.isArray(concepts) && form.watch("conceptoId") 
                          ? concepts.find((c) => Number(c.id) === Number(form.watch("conceptoId")))?.nombre 
                          : 'No seleccionado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Total:</p>
                      <p className="font-bold text-lg">${form.watch("monto")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Pago:</p>
                      <p className="font-medium">{form.watch("fechaPago")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Método de Pago:</p>
                      <p className="font-medium capitalize">{form.watch("metodoPago") || 'No seleccionado'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botones de acción */}
              <div className="flex justify-end w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="mr-2"
                  onClick={() => navigate("/payments")}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <div className="relative group">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !form.formState.isDirty || !form.formState.isValid}
                    className={`${form.formState.isDirty && form.formState.isValid 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 hover:shadow-lg animate-pulse' 
                      : 'bg-gray-400 text-white'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        </span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Registrar Pago
                      </>
                    )}
                  </Button>
                  {(!form.formState.isDirty || !form.formState.isValid) && (
                    <div className="absolute bottom-full mb-2 right-0 bg-black text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-48">
                      Completa los campos obligatorios para continuar.
                    </div>
                  )}
                </div>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
