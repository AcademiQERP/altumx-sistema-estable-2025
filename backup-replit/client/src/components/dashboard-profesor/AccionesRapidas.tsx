import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  ClipboardList, 
  MessageCircle, 
  PenSquare, 
  UserRoundCheck 
} from "lucide-react";

export default function AccionesRapidas() {
  // Array con las acciones rápidas para mostrar
  const acciones = [
    {
      icono: <UserRoundCheck className="h-4 w-4" />,
      texto: "Tomar asistencia",
      href: "/asistencias",
      color: "bg-blue-500"
    },
    {
      icono: <PenSquare className="h-4 w-4" />,
      texto: "Calificar tareas",
      href: "/calificaciones",
      color: "bg-amber-500"
    },
    {
      icono: <ClipboardList className="h-4 w-4" />,
      texto: "Añadir observación",
      href: "/observaciones",
      color: "bg-emerald-500"
    },
    {
      icono: <MessageCircle className="h-4 w-4" />,
      texto: "Enviar mensaje",
      href: "/mensajes",
      color: "bg-purple-500"
    }
  ];

  return (
    <Card className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Acciones Rápidas</CardTitle>
        <CardDescription>
          Accesos directos a tareas frecuentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {acciones.map((accion, index) => (
            <Link key={index} href={accion.href}>
              <Button 
                variant="outline" 
                className="flex flex-col gap-2 items-center justify-center h-24 w-24 p-2 transition-all hover:border-primary/50"
              >
                <div className={`${accion.color} text-white p-2 rounded-full`}>
                  {accion.icono}
                </div>
                <span className="text-xs font-medium text-center">{accion.texto}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}