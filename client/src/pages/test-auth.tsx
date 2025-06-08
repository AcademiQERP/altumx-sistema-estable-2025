import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAuthToken } from "@/services/auth-service";
import { AlertCircle, Check, XCircle } from "lucide-react";

export default function TestAuth() {
  const [testResults, setTestResults] = useState<{[key: string]: {success: boolean, response?: any, error?: string}}>({});
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  
  // Obtener token de autenticación
  const token = getAuthToken();
  
  // Lista de endpoints para probar
  const endpoints = [
    { name: "Me (Profile)", url: "/api/me" },
    { name: "Grupos Asignados", url: "/api/profesor/grupos-asignados" },
    { name: "Materias Asignadas", url: "/api/profesor/materias-asignadas/2" },
    { name: "Estudiantes por Grupo", url: "/api/students/group/2" },
    { name: "Calificaciones Tradicionales", url: "/api/grades/group/2/subject/2" },
    { name: "Calificaciones por Criterio", url: "/api/grades-criteria/group/2/subject/2" },
  ];
  
  // Función para probar un endpoint
  const testEndpoint = async (endpoint: string, name: string) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    try {
      console.log(`🧪 Testeando endpoint: ${endpoint}`);
      console.log(`🔑 Usando token: ${token ? `${token.substring(0, 15)}...` : "No disponible"}`);
      
      // Probar con diferentes métodos de autenticación
      const responses = await Promise.all([
        // 1. Usando fetch directamente con Bearer token
        fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then(res => ({ 
          method: "fetch-direct", 
          status: res.status, 
          ok: res.ok,
          text: res.status === 401 ? res.text() : null
        })),
        
        // 2. Usando fetch con objeto de headers
        fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).then(res => ({ 
          method: "fetch-headers", 
          status: res.status, 
          ok: res.ok,
          text: res.status === 401 ? res.text() : null
        })),
      ]);
      
      // Mostrar resultados
      console.log(`✅ Resultados para ${endpoint}:`, responses);
      
      // Verificar si algún método tuvo éxito
      const anySuccess = responses.some(r => r.ok);
      
      setTestResults(prev => ({
        ...prev,
        [name]: {
          success: anySuccess,
          response: responses,
          error: anySuccess ? undefined : "Todos los métodos fallaron"
        }
      }));
    } catch (error) {
      console.error(`❌ Error testeando ${endpoint}:`, error);
      setTestResults(prev => ({
        ...prev,
        [name]: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };
  
  // Ejecutar todas las pruebas
  const runAllTests = () => {
    endpoints.forEach(endpoint => {
      testEndpoint(endpoint.url, endpoint.name);
    });
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Prueba de Autenticación en Endpoints</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información del Token</CardTitle>
          <CardDescription>Estado del token de autenticación</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-2">
            <strong>Token disponible:</strong> {token ? "Sí ✅" : "No ❌"}
          </p>
          {token && (
            <>
              <p className="mb-2">
                <strong>Primeros caracteres:</strong> {token.substring(0, 15)}...
              </p>
              <p className="mb-2">
                <strong>Longitud:</strong> {token.length} caracteres
              </p>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={runAllTests}>Probar Todos los Endpoints</Button>
        </CardFooter>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        {endpoints.map((endpoint) => (
          <Card key={endpoint.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {testResults[endpoint.name]?.success === true && <Check className="h-5 w-5 text-green-500" />}
                {testResults[endpoint.name]?.success === false && <XCircle className="h-5 w-5 text-red-500" />}
                {endpoint.name}
              </CardTitle>
              <CardDescription>{endpoint.url}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading[endpoint.name] ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : testResults[endpoint.name] ? (
                testResults[endpoint.name].success ? (
                  <p className="text-green-600">✅ Endpoint accesible correctamente</p>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error de autenticación</AlertTitle>
                    <AlertDescription>
                      {testResults[endpoint.name].error || "No se pudo acceder al endpoint"}
                    </AlertDescription>
                  </Alert>
                )
              ) : (
                <p className="text-muted-foreground">Endpoint no probado todavía</p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => testEndpoint(endpoint.url, endpoint.name)}
                disabled={loading[endpoint.name]}
                variant="outline"
              >
                Probar Endpoint
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}