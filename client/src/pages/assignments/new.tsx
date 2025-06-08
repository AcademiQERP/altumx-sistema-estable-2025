import { Link } from "wouter";
import { LinkIcon } from "lucide-react";
import AssignmentForm from "@/components/assignments/AssignmentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewAssignment() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Crear Nueva Asignación</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <a className="text-primary">Inicio</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/asignaciones">
            <a className="text-primary">Asignaciones</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Nueva</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <LinkIcon className="mr-2 h-5 w-5" />
            Datos de la Asignación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentForm />
        </CardContent>
      </Card>
    </>
  );
}
