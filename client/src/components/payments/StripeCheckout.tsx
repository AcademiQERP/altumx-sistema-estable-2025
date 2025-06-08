import { useEffect, useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Cargar la instancia de Stripe con manejo de errores
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
let stripePromise: ReturnType<typeof loadStripe> | null = null;

if (stripePublicKey) {
  try {
    stripePromise = loadStripe(stripePublicKey);
    console.log("Stripe inicializado correctamente");
  } catch (error) {
    console.error("Error al inicializar Stripe:", error);
  }
} else {
  console.warn("VITE_STRIPE_PUBLIC_KEY no está definida. Las funcionalidades de Stripe estarán deshabilitadas.");
}

// Componente de formulario de pago
function CheckoutForm({ 
  onSuccess, 
  onError, 
  onCancel,
  studentId,
  debtId,
  amount,
  concept
}: { 
  onSuccess: (paymentId: number, receiptUrl?: string) => void; 
  onError: (error: string) => void;
  onCancel: () => void;
  studentId: number;
  debtId: number;
  amount: number;
  concept: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Función para manejar la descarga del recibo
  const handleDownloadReceipt = async () => {
    if (receiptUrl) {
      try {
        // Usar apiRequest para manejar automáticamente la autenticación
        const response = await apiRequest("GET", receiptUrl);
        
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
        a.download = `recibo-stripe-${Date.now()}.pdf`;
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
    }
  };

  // Manejar el envío del formulario
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setPaymentError(null);

    try {
      // Confirmar el pago
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/pagos/confirmacion",
        },
        redirect: 'if_required'
      });

      if (error) {
        setPaymentError(error.message || "Ocurrió un error al procesar el pago.");
        onError(error.message || "Error de pago");
        setIsSubmitting(false);
        return;
      }
      
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // El pago se completó con éxito, ahora registrarlo en nuestro sistema
        const response = await apiRequest("POST", "/api/pagos/confirmar-pago", {
          paymentIntentId: paymentIntent.id,
          studentId,
          debtId,
          paymentMethod: "tarjeta"
        });
        
        const result = await response.json();
        
        if (result.success) {
          setPaymentSuccess(true);
          
          // Guardar la URL del recibo si está disponible
          if (result.receiptUrl) {
            setReceiptUrl(result.receiptUrl);
            console.log("URL del recibo recibida:", result.receiptUrl);
          }
          
          onSuccess(result.paymentId, result.receiptUrl);
        } else {
          throw new Error(result.message || "Error al registrar el pago");
        }
      } else {
        // Esperar a que se complete el 3D Secure si es necesario
        setPaymentError("El pago requiere autenticación adicional. Por favor, sigue las instrucciones.");
      }
    } catch (error) {
      console.error("Error en el proceso de pago:", error);
      setPaymentError((error as Error).message || "Ocurrió un error inesperado");
      onError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {paymentError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de pago</AlertTitle>
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}
      
      {paymentSuccess && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>¡Pago exitoso!</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>Tu pago ha sido procesado correctamente.</p>
              {receiptUrl && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDownloadReceipt}
                    className="text-green-700 border-green-300 hover:bg-green-100 hover:text-green-800"
                  >
                    Descargar Recibo PDF
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <PaymentElement />
      
      <div className="mt-4 bg-blue-50 p-3 rounded-md border border-blue-200 text-sm">
        <p className="font-medium text-blue-700 mb-1">Información para pruebas</p>
        <p className="text-blue-600 mb-1">Use estos datos para realizar pagos de prueba:</p>
        <ul className="list-disc pl-5 text-blue-600 space-y-1">
          <li>Número: 4242 4242 4242 4242</li>
          <li>Fecha: Cualquier fecha futura</li>
          <li>CVC: Cualquier 3 dígitos</li>
          <li>Nombre y dirección: Cualquier valor</li>
        </ul>
      </div>
      
      <div className="flex gap-3 justify-end mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        
        <Button 
          type="submit" 
          disabled={!stripe || isSubmitting || paymentSuccess}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            `Pagar $${amount.toFixed(2)} MXN`
          )}
        </Button>
      </div>
    </form>
  );
}

// Componente principal que renderiza Elements
export default function StripeCheckout({
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
  onSuccess: (paymentId: number, receiptUrl?: string) => void;
  onCancel: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      try {
        setLoading(true);
        
        // Crear una intención de pago
        const response = await apiRequest("POST", "/api/pagos/crear-intento-pago", {
          debtId,
          studentId,
          amount
        });
        
        const data = await response.json();
        
        if (data.success && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error(data.message || "No se pudo crear la intención de pago");
        }
      } catch (error) {
        console.error("Error al crear intención de pago:", error);
        setError((error as Error).message || "Ocurrió un error al iniciar el proceso de pago");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentIntent();
  }, [debtId, studentId, amount]);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

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
          <CardTitle className="text-xl">Error al iniciar el pago</CardTitle>
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

  if (!clientSecret) {
    return null;
  }

  // Si Stripe no está inicializado, mostrar mensaje de error
  if (!stripePromise) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Servicio de pagos no disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuración incompleta</AlertTitle>
            <AlertDescription>
              El servicio de pagos con tarjeta no está disponible en este momento. 
              Por favor, contacta al administrador del sistema.
            </AlertDescription>
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Realizar Pago</CardTitle>
        <CardDescription>Pago de {concept}</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm 
            onSuccess={onSuccess} 
            onError={handleError}
            onCancel={onCancel}
            studentId={studentId}
            debtId={debtId}
            amount={amount}
            concept={concept}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}