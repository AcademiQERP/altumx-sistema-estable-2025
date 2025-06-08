import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAuthToken, setAuthToken, removeAuthToken } from '@/services/auth-service';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, RefreshCw, LogOut, KeyRound } from 'lucide-react';

export default function AuthTestPage() {
  const [token, setToken] = useState<string | null>(null);
  const [customToken, setCustomToken] = useState<string>('');
  const [testResults, setTestResults] = useState<{
    [key: string]: { success: boolean; message: string; response?: any; error?: any }
  }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState('tests');

  // Cargar token al inicio
  useEffect(() => {
    const storedToken = getAuthToken();
    setToken(storedToken);
  }, []);

  // Función para verificar el token actual
  const verifyCurrentToken = async () => {
    setLoading(prev => ({ ...prev, verify: true }));
    try {
      const currentToken = getAuthToken();
      if (!currentToken) {
        setTestResults(prev => ({
          ...prev,
          verify: {
            success: false,
            message: 'No hay token almacenado',
          }
        }));
        return;
      }

      // Intentar decodificar el token (solo la parte de payload)
      try {
        const payload = currentToken.split('.')[1];
        const decodedData = JSON.parse(atob(payload));
        console.log('Contenido del token JWT:', decodedData);
        
        // Verificar si el token está expirado
        const expiryTime = decodedData.exp * 1000; // Convertir a milisegundos
        const isExpired = Date.now() > expiryTime;
        
        if (isExpired) {
          setTestResults(prev => ({
            ...prev,
            verify: {
              success: false,
              message: 'Token expirado',
              response: {
                ...decodedData,
                expirationTime: new Date(expiryTime).toLocaleString(),
                currentTime: new Date().toLocaleString()
              }
            }
          }));
        } else {
          setTestResults(prev => ({
            ...prev,
            verify: {
              success: true,
              message: 'Token válido y no expirado',
              response: {
                ...decodedData,
                expirationTime: new Date(expiryTime).toLocaleString(),
                currentTime: new Date().toLocaleString()
              }
            }
          }));
        }
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          verify: {
            success: false,
            message: 'Error al decodificar el token',
            error
          }
        }));
      }
    } finally {
      setLoading(prev => ({ ...prev, verify: false }));
    }
  };

  // Función para probar autenticación con el servidor
  const testAuthentication = async () => {
    setLoading(prev => ({ ...prev, auth: true }));
    try {
      const currentToken = getAuthToken();
      if (!currentToken) {
        setTestResults(prev => ({
          ...prev,
          auth: {
            success: false,
            message: 'No hay token almacenado para realizar la prueba',
          }
        }));
        return;
      }

      // Hacer una solicitud a /api/me para verificar autenticación
      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(prev => ({
          ...prev,
          auth: {
            success: true,
            message: 'Autenticación exitosa con el servidor',
            response: data
          }
        }));
      } else {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Si no se puede analizar como JSON, usar el mensaje original
        }

        setTestResults(prev => ({
          ...prev,
          auth: {
            success: false,
            message: errorMessage,
            response: {
              status: response.status,
              statusText: response.statusText
            }
          }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        auth: {
          success: false,
          message: 'Error al realizar la solicitud',
          error
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, auth: false }));
    }
  };

  // Función para probar el endpoint de calificaciones específico
  const testGradesEndpoint = async () => {
    setLoading(prev => ({ ...prev, grades: true }));
    try {
      const currentToken = getAuthToken();
      if (!currentToken) {
        setTestResults(prev => ({
          ...prev,
          grades: {
            success: false,
            message: 'No hay token almacenado para realizar la prueba',
          }
        }));
        return;
      }

      // Variables de prueba
      const groupId = 2;
      const subjectId = 2;

      // Hacer una solicitud al endpoint de calificaciones
      const response = await fetch(`/api/grades/group/${groupId}/subject/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(prev => ({
          ...prev,
          grades: {
            success: true,
            message: 'Solicitud exitosa al endpoint de calificaciones',
            response: data
          }
        }));
      } else {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Si no se puede analizar como JSON, usar el mensaje original
        }

        setTestResults(prev => ({
          ...prev,
          grades: {
            success: false,
            message: errorMessage,
            response: {
              status: response.status,
              statusText: response.statusText
            }
          }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        grades: {
          success: false,
          message: 'Error al realizar la solicitud',
          error
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, grades: false }));
    }
  };

  // Función para limpiar el token
  const clearToken = () => {
    removeAuthToken();
    setToken(null);
    setTestResults({});
  };

  // Función para establecer un token personalizado
  const setCustomTokenHandler = () => {
    if (customToken.trim()) {
      setAuthToken(customToken.trim());
      setToken(customToken.trim());
      setCustomToken('');
    }
  };

  // Ejecutar todas las pruebas
  const runAllTests = () => {
    verifyCurrentToken();
    testAuthentication();
    testGradesEndpoint();
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Prueba de Autenticación</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tests">Pruebas</TabsTrigger>
          <TabsTrigger value="token">Gestión de Token</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tests" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prueba de verificación de token */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {testResults.verify?.success && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
                  {testResults.verify?.success === false && <AlertCircle className="h-5 w-5 text-red-500 mr-2" />}
                  Verificación de Token
                </CardTitle>
                <CardDescription>Verifica si el token JWT almacenado es válido y no está expirado</CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.verify ? (
                  <div>
                    <Alert variant={testResults.verify.success ? "default" : "destructive"} className="mb-4">
                      <AlertTitle>
                        {testResults.verify.success ? "Token Válido" : "Token Inválido"}
                      </AlertTitle>
                      <AlertDescription>
                        {testResults.verify.message}
                      </AlertDescription>
                    </Alert>
                    {testResults.verify.response && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Información del Token:</h4>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(testResults.verify.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No se ha verificado el token</p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={verifyCurrentToken} 
                  disabled={loading.verify || !token}
                  variant="outline"
                >
                  {loading.verify ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Verificando...</>
                  ) : (
                    <>Verificar Token</>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Prueba de autenticación con el servidor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {testResults.auth?.success && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
                  {testResults.auth?.success === false && <AlertCircle className="h-5 w-5 text-red-500 mr-2" />}
                  Autenticación con Servidor
                </CardTitle>
                <CardDescription>Prueba la autenticación con el servidor usando el endpoint /api/me</CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.auth ? (
                  <div>
                    <Alert variant={testResults.auth.success ? "default" : "destructive"} className="mb-4">
                      <AlertTitle>
                        {testResults.auth.success ? "Autenticación Exitosa" : "Error de Autenticación"}
                      </AlertTitle>
                      <AlertDescription>
                        {testResults.auth.message}
                      </AlertDescription>
                    </Alert>
                    {testResults.auth.response && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Respuesta del Servidor:</h4>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(testResults.auth.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No se ha probado la autenticación</p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={testAuthentication} 
                  disabled={loading.auth || !token}
                  variant="outline"
                >
                  {loading.auth ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Probando...</>
                  ) : (
                    <>Probar Autenticación</>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Prueba específica del endpoint de calificaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {testResults.grades?.success && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
                  {testResults.grades?.success === false && <AlertCircle className="h-5 w-5 text-red-500 mr-2" />}
                  Endpoint de Calificaciones
                </CardTitle>
                <CardDescription>Prueba el acceso al endpoint específico de calificaciones por grupo y materia</CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.grades ? (
                  <div>
                    <Alert variant={testResults.grades.success ? "default" : "destructive"} className="mb-4">
                      <AlertTitle>
                        {testResults.grades.success ? "Solicitud Exitosa" : "Error en la Solicitud"}
                      </AlertTitle>
                      <AlertDescription>
                        {testResults.grades.message}
                      </AlertDescription>
                    </Alert>
                    {testResults.grades.response && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Respuesta del Servidor:</h4>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-48">
                          {JSON.stringify(testResults.grades.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No se ha probado el endpoint de calificaciones</p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={testGradesEndpoint} 
                  disabled={loading.grades || !token}
                  variant="outline"
                >
                  {loading.grades ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Probando...</>
                  ) : (
                    <>Probar Endpoint</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={runAllTests} 
              disabled={!token || loading.verify || loading.auth || loading.grades}
            >
              Ejecutar Todas las Pruebas
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="token" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión del Token JWT</CardTitle>
              <CardDescription>Ver y administrar el token actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-semibold mb-2">Token Actual:</h3>
                  {token ? (
                    <div className="relative">
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                        {token}
                      </pre>
                      <div className="absolute top-2 right-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigator.clipboard.writeText(token)}
                          className="h-6 px-2 text-xs"
                        >
                          Copiar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No hay token almacenado</AlertTitle>
                      <AlertDescription>
                        No se encontró ningún token JWT en el almacenamiento local
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="pt-4">
                  <h3 className="text-md font-semibold mb-2">Establecer Token Personalizado:</h3>
                  <div className="flex gap-2">
                    <Input
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)}
                      placeholder="Pegar token JWT..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={setCustomTokenHandler}
                      disabled={!customToken.trim()}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Establecer
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                onClick={clearToken} 
                disabled={!token}
                variant="destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Limpiar Token
              </Button>
              
              <Button 
                onClick={verifyCurrentToken}
                disabled={!token}
                variant="outline"
              >
                Verificar Token
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}