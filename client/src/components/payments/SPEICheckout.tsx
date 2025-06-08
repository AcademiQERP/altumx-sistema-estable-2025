import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, Copy, Download, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// Componente principal para pagos SPEI
interface SPEIPendingPayment {
  pendingPaymentId: number;
  reference: string;
  amount: string;
  alumnoId?: number; // Para mapear con las respuestas del API
  studentId?: number; // Para uso en el componente
  conceptoId?: number; // Para mapear con las respuestas del API
  conceptId?: number; // Para uso en el componente
  clabe: string;
  bankName: string;
  accountHolder: string;
  expirationDate: string;
  fechaVencimiento?: string; // Para mapear con las respuestas del API
  estado?: 'pendiente_confirmacion' | 'verificado' | 'caducado' | 'pagado'; // Para mapear con las respuestas del API
  status: 'pendiente_confirmacion' | 'verificado' | 'caducado' | 'pagado';
  paymentId?: number | null;
  referencia?: string; // Para mapear con las respuestas del API
}

// Interfaces para tipado de respuestas API
interface SPEIStatusResponse {
  success: boolean;
  data?: {
    pendingPaymentId: number;
    reference: string;
    status: 'pendiente_confirmacion' | 'verificado' | 'caducado' | 'pagado';
    studentId: number;
    conceptId: number;
    amount: string;
    expirationDate: string;
    paymentId: number | null;
    receiptUrl: string | null;
  };
  error?: string;
}

interface ReceiptResponse {
  success: boolean;
  receiptUrl: string;
  error?: string;
}

export default function SPEICheckout({
  debtId,
  studentId,
  amount,
  concept,
  onSuccess,
  onCancel
}: {
  debtId: number;
  studentId: number;
  amount: number;
  concept: string;
  onSuccess: (pendingPaymentId: number) => void;
  onCancel: () => void;
}): JSX.Element {
  // Todos los state hooks primero
  const [conceptId, setConceptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speiData, setSpeiData] = useState<SPEIPendingPayment | null>(null);
  const [showStatusCheck, setShowStatusCheck] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  
  // Hooks del contexto
  const { toast } = useToast();
  
  // React Query hooks
  const { 
    data: paymentStatus,
    isLoading: checkingStatus,
    error: statusError,
    refetch: refreshStatus
  } = useQuery<SPEIStatusResponse>({
    queryKey: [`/api/spei/estado/${speiData?.pendingPaymentId}`],
    enabled: showStatusCheck && !!speiData?.pendingPaymentId,
    refetchInterval: speiData?.status === 'pagado' ? false : 30000, // Refrescar cada 30 segundos si no está pagado
  });
  
  const {
    data: receiptData,
    isLoading: loadingReceipt,
    refetch: refetchReceipt,
  } = useQuery<ReceiptResponse>({
    queryKey: [`/api/padres/recibo/${paymentId}`],
    enabled: !!paymentId,
    staleTime: 0, // No guardar en caché para siempre obtener datos frescos
    retry: 3,
    retryDelay: 1000,
  });

  // Efecto para actualizar el estado del pago cuando cambia
  useEffect(() => {
    if (paymentStatus?.success && paymentStatus.data) {
      // Actualizar el estado con los datos más recientes
      if (paymentStatus.data.status === 'pagado' && paymentStatus.data.paymentId) {
        setPaymentId(paymentStatus.data.paymentId);
        
        // Actualizar la información de SPEI con la nueva información
        setSpeiData(prevData => {
          if (!prevData) return null;
          
          return {
            ...prevData,
            status: 'pagado',
            paymentId: paymentStatus.data?.paymentId
          };
        });
      }
    }
  }, [paymentStatus]);

  // Efecto para obtener el debtId y extraer el conceptId
  useEffect(() => {
    const fetchDebtDetails = async () => {
      try {
        setLoading(true);
        // Si tenemos debtId, obtenemos los detalles
        if (debtId) {
          const response = await apiRequest("GET", `/api/students/${studentId}/debts`);
          const debts = await response.json();
          const currentDebt = debts.find((d: any) => d.id === debtId);
          if (currentDebt) {
            setConceptId(currentDebt.conceptoId);
          } else {
            throw new Error("No se encontró el adeudo especificado");
          }
        }
      } catch (error) {
        console.error("Error al obtener detalles del adeudo:", error);
        setError("No se pudo obtener información del adeudo");
        setLoading(false); // Importante: actualizamos loading en caso de error
      }
    };
    
    fetchDebtDetails();
  }, [debtId, studentId]);

  // Efecto para generar la referencia SPEI
  useEffect(() => {
    const generateSPEIReference = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!conceptId) {
          return; // Esperamos a tener el conceptId
        }
        
        // Generar referencia SPEI
        const response = await apiRequest("POST", "/api/spei/generar-referencia", {
          debtId,
          studentId,
          conceptId: conceptId, // Usando el conceptId obtenido
          amount
        });
        
        const data = await response.json();
        
        if (data.success && data.paymentInfo) {
          setSpeiData(data.paymentInfo);
        } else {
          throw new Error(data.error || "No se pudo generar la referencia SPEI");
        }
      } catch (error) {
        console.error("Error al generar referencia SPEI:", error);
        // Crear un mensaje amigable para el usuario
        let mensajeError = "Hubo un problema al generar la referencia de pago. Por favor, intenta nuevamente más tarde o contacta con el área administrativa.";
        
        // Si hay un mensaje específico, mostrarlo
        if ((error as Error).message && (error as Error).message.includes("No se proporcionó")) {
          mensajeError = (error as Error).message;
        }
        
        setError(mensajeError);
      } finally {
        setLoading(false);
      }
    };

    if (conceptId) {
      generateSPEIReference();
    }
  }, [debtId, studentId, amount, conceptId]);

  // Handlers (funciones para manejar eventos)
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copiado al portapapeles",
          description: `${label} copiado correctamente`,
          duration: 3000,
        });
      },
      (err) => {
        console.error("Error al copiar al portapapeles:", err);
        toast({
          title: "Error",
          description: "No se pudo copiar el texto",
          variant: "destructive",
          duration: 3000,
        });
      }
    );
  };

  const handleDownloadReceipt = async () => {
    // Si no tenemos datos o no hay URL, intentar refrescar
    if (!receiptData?.success || !receiptData.receiptUrl) {
      toast({
        title: "Cargando recibo",
        description: "Intentando obtener el recibo...",
        duration: 3000,
      });
      try {
        await refetchReceipt();
        return; // Esperar al siguiente render con los datos actualizados
      } catch (error) {
        console.error("Error al refrescar datos del recibo:", error);
        toast({
          title: "Error al cargar recibo",
          description: "No pudimos obtener información del recibo. Por favor, intenta nuevamente más tarde.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
    }
    
    // Tenemos datos y URL, proceder a descargar
    try {
      console.log("🔍 Intentando descargar recibo de:", receiptData.receiptUrl);
      
      console.log("🔍 Utilizando apiRequest para manejar autenticación automáticamente");
      
      // Utilizar apiRequest para manejar automáticamente la autenticación
      const response = await apiRequest("GET", receiptData.receiptUrl);
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Sesión expirada",
            description: "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión para continuar.",
            variant: "destructive",
            duration: 5000,
          });
          // Aquí podríamos redirigir a login si es necesario
          return;
        } else if (response.status === 404) {
          toast({
            title: "Recibo no disponible",
            description: "El recibo aún no está disponible. Estará disponible una vez se confirme el pago.",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }
        
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
  };
  
  // Renderizado condicional
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Error al generar referencia</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se pudo procesar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Volver
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!speiData) {
    return null;
  }
  
  // Vista para verificar el estado del pago
  if (showStatusCheck) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Estado del pago SPEI</CardTitle>
          <CardDescription>Pago de {concept}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {checkingStatus ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Verificando el estado de tu pago...</p>
            </div>
          ) : statusError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error al verificar el pago</AlertTitle>
              <AlertDescription>
                No pudimos verificar el estado de tu pago. Por favor, intenta nuevamente más tarde.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {speiData.status === 'pagado' ? (
                <Alert className="bg-green-50 border-green-200">
                  <AlertTitle className="text-green-800 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Pago confirmado
                  </AlertTitle>
                  <AlertDescription className="text-green-700">
                    Tu pago ha sido recibido y procesado correctamente. Puedes descargar tu recibo desde este panel.
                  </AlertDescription>
                </Alert>
              ) : speiData.status === 'caducado' ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Referencia vencida</AlertTitle>
                  <AlertDescription>
                    Esta referencia de pago ha expirado. Por favor, genera una nueva referencia para realizar el pago.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTitle className="text-amber-800 flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    Pago pendiente
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    No hemos detectado tu pago todavía. Si ya realizaste la transferencia, puede tomar algunos minutos en procesarse.
                    La página se actualizará automáticamente.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 gap-3 p-4 rounded-md border bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Referencia:</span>
                  <span className="font-mono font-semibold">{speiData.reference}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monto:</span>
                  <span className="font-semibold">${parseFloat(speiData.amount).toFixed(2)} MXN</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Estado:</span>
                  <span className={`font-semibold ${
                    speiData.status === 'pagado' 
                      ? 'text-green-600' 
                      : speiData.status === 'caducado' 
                        ? 'text-red-600' 
                        : 'text-amber-600'
                  }`}>
                    {speiData.status === 'pagado' 
                      ? 'Pagado' 
                      : speiData.status === 'caducado' 
                        ? 'Vencido' 
                        : 'Pendiente'}
                  </span>
                </div>
              </div>
            </>
          )}
          
          {speiData.status === 'pagado' && (
            <div className="mt-4">
              {loadingReceipt ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                  <span>Cargando recibo...</span>
                </div>
              ) : receiptData?.success ? (
                <Button 
                  onClick={handleDownloadReceipt} 
                  className="w-full" 
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar recibo
                </Button>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error al cargar recibo</AlertTitle>
                  <AlertDescription>
                    No pudimos cargar tu recibo. Por favor, intenta nuevamente más tarde.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {speiData.status !== 'pagado' && (
            <Button 
              className="w-full"
              variant="outline"
              onClick={() => refreshStatus()}
              disabled={checkingStatus}
            >
              {checkingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Verificando...
                </>
              ) : (
                <>Actualizar estado</>
              )}
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={onCancel}
            className="w-full"
          >
            {speiData.status === 'pagado' ? 'Cerrar' : 'Cancelar'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Vista para mostrar las instrucciones de pago
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Pago por SPEI</CardTitle>
        <CardDescription>Pago de {concept}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTitle className="text-blue-800 flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Instrucciones de pago
          </AlertTitle>
          <AlertDescription className="text-blue-700">
            Utiliza los siguientes datos para realizar tu transferencia SPEI desde tu banca en línea.
            La referencia es válida hasta el {format(new Date(speiData.expirationDate), "PPP", { locale: es })}.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 gap-3 p-4 rounded-md border bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Banco:</span>
              <span className="font-semibold">{speiData.bankName}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Beneficiario:</span>
              <span className="font-semibold">{speiData.accountHolder}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">CLABE:</span>
              <div className="flex items-center">
                <span className="font-mono font-semibold mr-2">{speiData.clabe}</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleCopy(speiData.clabe, "CLABE")}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Monto:</span>
              <span className="font-semibold">${parseFloat(speiData.amount).toFixed(2)} MXN</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Referencia:</span>
              <div className="flex items-center">
                <span className="font-mono font-semibold mr-2">{speiData.reference}</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleCopy(speiData.reference, "Referencia")}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Fecha límite:</span>
              <span className="font-semibold">
                {format(new Date(speiData.expirationDate), "PPP", { locale: es })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
          <p className="font-medium mb-2">Importante:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Es necesario incluir la referencia exacta en tu transferencia.</li>
            <li>El monto debe ser exacto para que el pago se procese correctamente.</li>
            <li>El tiempo de confirmación puede variar dependiendo de tu banco.</li>
            <li>Recibirás un correo de confirmación cuando el pago se procese.</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          className="w-full"
          variant="outline"
          onClick={() => setShowStatusCheck(true)}
        >
          Ya realicé mi pago (Verificar estado)
        </Button>
        <Button 
          className="w-full"
          variant="default"
          onClick={() => onSuccess(speiData.pendingPaymentId)}
        >
          Guardar y continuar
        </Button>
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="w-full"
        >
          Cancelar
        </Button>
      </CardFooter>
    </Card>
  );
}