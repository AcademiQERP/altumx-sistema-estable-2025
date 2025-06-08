import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useParams } from "wouter";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Debt, Student } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StripeCheckout from "@/components/payments/StripeCheckout";
import SPEICheckout from "@/components/payments/SPEICheckout";
import PaymentMethodSelector from "@/components/payments/PaymentMethodSelector";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ParentPortalPayments() {
  const params = useParams();
  const studentId = parseInt(params.studentId);
  const debtId = params.debtId ? parseInt(params.debtId) : null;
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'spei'>('tarjeta');

  // Obtener datos del estudiante
  const { 
    data: student, 
    isLoading: loadingStudent,
    error: studentError
  } = useQuery({
    queryKey: [`/api/students/${studentId}`],
    enabled: !!studentId,
    retry: 1,
    onError: (error) => {
      console.error(`Error al cargar datos del estudiante ID ${studentId}:`, error);
    }
  });

  // Obtener adeudos del estudiante
  const { 
    data: debts = [], 
    isLoading: loadingDebts,
    error: debtsError
  } = useQuery({
    queryKey: [`/api/students/${studentId}/debts`],
    enabled: !!studentId,
    retry: 1,
    onError: (error) => {
      console.error(`Error al cargar adeudos del estudiante ID ${studentId}:`, error);
    }
  });

  // Obtener conceptos de pago para mostrar nombres descriptivos
  const { 
    data: concepts = [],
    isLoading: loadingConcepts,
    error: conceptsError
  } = useQuery({
    queryKey: ['/api/payment-concepts'],
    retry: 1,
    onError: (error) => {
      console.error("Error al cargar conceptos de pago:", error);
    }
  });

  const isLoading = loadingStudent || loadingDebts || loadingConcepts;
  const error = studentError || debtsError;

  // Seleccionar un adeudo específico si se proporciona en la URL
  useEffect(() => {
    if (debtId && debts && debts.length > 0 && !selectedDebt) {
      const debt = debts.find((d: Debt) => d.id === debtId);
      if (debt) {
        setSelectedDebt(debt);
        setShowCheckout(true);
      }
    }
  }, [debtId, debts, selectedDebt]);

  // Obtener nombre del concepto de pago
  const getConceptName = (conceptId: number) => {
    if (!concepts || !Array.isArray(concepts)) return "Cargando...";
    const concept = concepts.find((c) => c.id === conceptId);
    return concept ? concept.nombre : `Concepto ID: ${conceptId}`;
  };

  // Manejar clic en pagar adeudo
  const handlePayDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowCheckout(true);
  };

  // Manejar cierre del checkout
  const handleCloseCheckout = () => {
    setShowCheckout(false);
    setSelectedDebt(null);
  };

  // Estado para almacenar la URL del recibo
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Manejar pago exitoso
  const handlePaymentSuccess = (paymentId: number, receiptUrl?: string | null) => {
    setPaymentComplete(true);
    setPaymentId(paymentId);
    
    // Guardar la URL del recibo si está disponible
    if (receiptUrl) {
      setReceiptUrl(receiptUrl);
      console.log("URL del recibo recibida en la página de pagos:", receiptUrl);
    }
    
    toast({
      title: "Pago exitoso",
      description: "El pago se ha procesado correctamente.",
      variant: "success",
    });
    
    // Invalidar queries para actualizar datos
    queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/debts`] });
    
    // Esperar 5 segundos y luego redirigir
    setTimeout(() => {
      navigate(`/parent-portal/${studentId}`);
    }, 5000);
  };

  // Si hay un error al cargar datos
  if (error && !isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/parent-portal/${studentId}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Portal
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {(error as Error).message || "No se pudieron cargar los datos. Intenta de nuevo más tarde."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Si está cargando
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Cargando información de pagos...</p>
      </div>
    );
  }

  // Si no hay un estudiante válido
  if (!student) {
    return (
      <div className="container mx-auto py-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/parent-portal")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Portal
        </Button>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Estudiante no encontrado</AlertTitle>
          <AlertDescription>
            No se encontró información para el estudiante seleccionado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Filtrar adeudos pendientes y vencidos
  const pendingDebts = Array.isArray(debts) 
    ? debts.filter((debt: Debt) => debt.estatus !== 'pagado')
    : [];

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/parent-portal/${studentId}`)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Portal
      </Button>
      
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Pagos de {student.nombreCompleto}
      </h1>
      
      {paymentComplete ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-green-600">¡Pago completado con éxito!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Tu pago ha sido procesado correctamente. Se ha enviado un recibo a tu correo electrónico.
            </p>
            {receiptUrl && (
              <div className="bg-green-50 rounded-md p-4 mb-4 border border-green-200">
                <p className="font-medium text-green-700 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recibo disponible para descarga
                </p>
                <button 
                  onClick={async () => {
                    try {
                      // Obtener el token de autenticación
                      const token = localStorage.getItem("auth_token");
                      
                      // Realizar la solicitud con los headers de autorización
                      const response = await fetch(receiptUrl, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      
                      if (!response.ok) {
                        throw new Error(`Error al descargar recibo: ${response.status} ${response.statusText}`);
                      }
                      
                      // Obtener el blob del PDF
                      const blob = await response.blob();
                      
                      // Crear una URL para el blob
                      const blobUrl = URL.createObjectURL(blob);
                      
                      // Crear un enlace y simular el clic para la descarga
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      a.download = `recibo-pago-${paymentId}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      
                      // Limpieza
                      document.body.removeChild(a);
                      URL.revokeObjectURL(blobUrl);
                      
                      toast({
                        title: "Descarga iniciada",
                        description: "El recibo se está descargando",
                        variant: "default",
                        duration: 3000,
                      });
                    } catch (error) {
                      console.error("Error al descargar recibo:", error);
                      toast({
                        title: "Error al descargar",
                        description: "No se pudo descargar el recibo. Por favor, intenta nuevamente.",
                        variant: "destructive",
                        duration: 5000,
                      });
                    }
                  }}
                  className="inline-flex items-center text-sm font-medium text-green-800 bg-green-100 hover:bg-green-200 px-3 py-2 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar recibo de pago
                </button>
              </div>
            )}
            <p className="text-muted-foreground">
              Redirigiendo al portal en unos segundos...
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate(`/parent-portal/${studentId}`)}>
              Volver al Portal
            </Button>
          </CardFooter>
        </Card>
      ) : showCheckout && selectedDebt ? (
        <div className="mb-6 space-y-6">
          {/* Primera fase - selección de método de pago */}
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar método de pago</CardTitle>
              <CardDescription>
                Selecciona cómo quieres realizar tu pago de {getConceptName(selectedDebt.conceptoId)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodSelector 
                selectedMethod={paymentMethod}
                onSelect={(method) => setPaymentMethod(method)}
              />
            </CardContent>
          </Card>

          {/* Segunda fase - procesamiento del pago según método seleccionado */}
          {paymentMethod === 'tarjeta' ? (
            <StripeCheckout
              debtId={selectedDebt.id}
              studentId={studentId}
              amount={Number(selectedDebt.montoTotal)}
              concept={getConceptName(selectedDebt.conceptoId)}
              onSuccess={handlePaymentSuccess}
              onCancel={handleCloseCheckout}
            />
          ) : (
            <SPEICheckout
              debtId={selectedDebt.id}
              studentId={studentId}
              amount={Number(selectedDebt.montoTotal)}
              concept={getConceptName(selectedDebt.conceptoId)}
              onSuccess={(pendingPaymentId) => {
                toast({
                  title: "Referencia generada con éxito",
                  description: "Se ha generado la referencia SPEI. Realiza el pago desde tu banca en línea.",
                  variant: "default",
                });
                queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/debts`] });
                setTimeout(() => {
                  navigate(`/parent-portal/${studentId}`);
                }, 5000);
              }}
              onCancel={handleCloseCheckout}
            />
          )}
        </div>
      ) : (
        <>
          {pendingDebts.length === 0 ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>No hay adeudos pendientes</CardTitle>
                <CardDescription>
                  No se encontraron adeudos pendientes para este estudiante.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Todos los pagos están al corriente. ¡Gracias!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="pending" className="w-full">
              <TabsList>
                <TabsTrigger value="pending">Adeudos Pendientes</TabsTrigger>
                <TabsTrigger value="overdue">Adeudos Vencidos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending">
                <Card>
                  <CardHeader>
                    <CardTitle>Adeudos Pendientes</CardTitle>
                    <CardDescription>
                      Adeudos con fecha límite próxima
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingDebts
                        .filter((debt: Debt) => debt.estatus !== 'vencido')
                        .map((debt: Debt) => (
                          <Card key={debt.id} className="overflow-hidden">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">
                                {getConceptName(debt.conceptoId)}
                              </CardTitle>
                              <CardDescription>
                                Fecha límite: {format(new Date(debt.fechaLimite), "PPP", { locale: es })}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <p className="text-xl font-bold text-primary">
                                ${parseFloat(debt.montoTotal).toFixed(2)} MXN
                              </p>
                            </CardContent>
                            <CardFooter>
                              <Button 
                                className="w-full" 
                                onClick={() => handlePayDebt(debt)}
                              >
                                Pagar Ahora
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      
                      {pendingDebts.filter((debt: Debt) => debt.estatus !== 'vencido').length === 0 && (
                        <div className="col-span-2 text-center py-4">
                          <p className="text-muted-foreground">No hay adeudos pendientes actualmente.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="overdue">
                <Card>
                  <CardHeader>
                    <CardTitle>Adeudos Vencidos</CardTitle>
                    <CardDescription>
                      Adeudos con fecha límite pasada
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingDebts
                        .filter((debt: Debt) => debt.estatus === 'vencido')
                        .map((debt: Debt) => (
                          <Card key={debt.id} className="overflow-hidden border-red-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">
                                {getConceptName(debt.conceptoId)}
                              </CardTitle>
                              <CardDescription className="text-red-500">
                                Vencido: {format(new Date(debt.fechaLimite), "PPP", { locale: es })}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <p className="text-xl font-bold text-red-600">
                                ${parseFloat(debt.montoTotal).toFixed(2)} MXN
                              </p>
                            </CardContent>
                            <CardFooter>
                              <Button 
                                className="w-full" 
                                variant="destructive"
                                onClick={() => handlePayDebt(debt)}
                              >
                                Pagar Urgente
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      
                      {pendingDebts.filter((debt: Debt) => debt.estatus === 'vencido').length === 0 && (
                        <div className="col-span-2 text-center py-4">
                          <p className="text-muted-foreground">No hay adeudos vencidos. ¡Gracias por estar al día!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}