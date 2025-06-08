import { Link } from "wouter";
import { BarChart } from "lucide-react";
import GradeForm from "@/components/grades/GradeForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NewGrade() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Registrar Nueva Calificación</h1>
        <p className="text-muted-foreground text-sm mb-3">
          Completa los campos requeridos para asignar una calificación individual por criterio.
        </p>
        <div className="flex items-center text-sm">
          <Link href="/">
            <a className="text-primary">Inicio</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/calificaciones">
            <a className="text-primary">Calificaciones</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Nueva</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <BarChart className="mr-2 h-5 w-5" />
            Datos de la Calificación
          </CardTitle>
          <CardDescription>
            El registro de calificaciones permite una evaluación individualizada por alumno
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GradeForm />
        </CardContent>
      </Card>
    </>
  );
}
