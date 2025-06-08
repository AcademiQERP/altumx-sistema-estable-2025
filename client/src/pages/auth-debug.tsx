import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { getAuthToken } from "@/services/auth-service";
import { apiRequest } from "@/lib/queryClient";

export default function AuthDebugPage() {
  const [apiResponses, setApiResponses] = useState<{endpoint: string, status: number, data: any}[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Cargar token al inicio
    setToken(getAuthToken());
  }, []);

  const testEndpoint = async (endpoint: string) => {
    try {
      setLoading(true);
      console.log(`Probando endpoint: ${endpoint}`);
      
      const response = await apiRequest("GET", endpoint);
      const data = await response.json();
      
      console.log(`Respuesta de ${endpoint}:`, data);
      
      setApiResponses(prev => [
        { endpoint, status: response.status, data },
        ...prev
      ]);
    } catch (error) {
      console.error(`Error en endpoint ${endpoint}:`, error);
      
      setApiResponses(prev => [
        { 
          endpoint, 
          status: error instanceof Response ? error.status : 500, 
          data: { error: error instanceof Error ? error.message : String(error) } 
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  };

  const testGradesEndpoint = async (groupId: number, subjectId: number) => {
    await testEndpoint(`/api/grades/group/${groupId}/subject/${subjectId}`);
  };

  const testCriteriaGradesEndpoint = async (groupId: number, subjectId: number) => {
    await testEndpoint(`/api/grades-criteria/group/${groupId}/subject/${subjectId}`);
  };

  const testProfileEndpoint = async () => {
    await testEndpoint("/api/me");
  };

  const testGroupsEndpoint = async () => {
    await testEndpoint("/api/profesor/grupos-asignados");
  };
  
  // Mostrar la cabecera Authorization explícitamente
  const testDirectFetch = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        console.error("No hay token disponible para la prueba directa");
        setApiResponses(prev => [
          { 
            endpoint: "fetch-direct", 
            status: 401, 
            data: { error: "No hay token de autenticación disponible" } 
          },
          ...prev
        ]);
        return;
      }
      
      console.log("Realizando fetch directo con token:", token.substring(0, 15) + "...");
      
      const response = await fetch("/api/grades/group/2/subject/1", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      console.log("Headers enviados:", {
        "Authorization": `Bearer ${token.substring(0, 15)}...`
      });
      
      const data = await response.json();
      
      setApiResponses(prev => [
        { endpoint: "fetch-direct", status: response.status, data },
        ...prev
      ]);
    } catch (error) {
      console.error("Error en fetch directo:", error);
      
      setApiResponses(prev => [
        { 
          endpoint: "fetch-direct", 
          status: 500, 
          data: { error: error instanceof Error ? error.message : String(error) } 
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Depuración de Autenticación</CardTitle>
          <CardDescription>Herramienta para probar acceso a endpoints protegidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Estado del token</h3>
            <div className="bg-gray-100 p-3 rounded-md overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all">
                {token ? `${token.substring(0, 20)}...` : "No hay token disponible"}
              </pre>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Button 
              onClick={testProfileEndpoint} 
              disabled={loading}
              variant="outline"
            >
              Probar /api/me
            </Button>
            
            <Button 
              onClick={testGroupsEndpoint} 
              disabled={loading}
              variant="outline"
            >
              Probar /api/profesor/grupos-asignados
            </Button>
            
            <Button 
              onClick={() => testGradesEndpoint(2, 1)} 
              disabled={loading}
              variant="outline"
            >
              Probar /api/grades/group/2/subject/1
            </Button>
            
            <Button 
              onClick={() => testCriteriaGradesEndpoint(2, 1)} 
              disabled={loading}
              variant="outline"
            >
              Probar /api/grades-criteria/group/2/subject/1
            </Button>
            
            <Button 
              onClick={testDirectFetch} 
              disabled={loading}
              variant="default"
              className="col-span-1 md:col-span-2"
            >
              Probar fetch directo con headers explícitos
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>Respuestas de las pruebas de acceso a la API</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>
              {apiResponses.length === 0 
                ? "Aún no se han realizado pruebas" 
                : "Resultados de las pruebas de endpoints"
              }
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Endpoint</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Respuesta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiResponses.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">{result.endpoint}</TableCell>
                  <TableCell className={`font-semibold ${
                    result.status >= 200 && result.status < 300 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {result.status}
                  </TableCell>
                  <TableCell className="max-w-[400px] overflow-auto">
                    <div className="max-h-[200px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}