import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Componente ErrorBoundary para capturar errores en la renderización
 * y mostrar una interfaz de recuperación amigable
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Se podría implementar logging de errores a un servicio externo
    console.error('Error en componente:', error);
    console.error('Información del error:', errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  navigateToHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Si existe un fallback personalizado, lo usamos
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI predeterminada para errores
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Card className="w-[450px] shadow-lg">
            <CardHeader className="bg-red-50 border-b">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <CardTitle className="text-red-800">
                  Ocurrió un error inesperado
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-4">
              <p className="text-gray-600 mb-4">
                Lo sentimos, ha ocurrido un problema al cargar esta página. 
                El equipo técnico ha sido notificado.
              </p>
              {this.state.error && (
                <div className="bg-gray-100 p-3 rounded text-xs text-gray-700 font-mono overflow-auto max-h-[200px]">
                  {this.state.error.toString()}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button 
                variant="outline" 
                onClick={this.navigateToHome}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Ir al inicio
              </Button>
              <Button 
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Intentar nuevamente
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;