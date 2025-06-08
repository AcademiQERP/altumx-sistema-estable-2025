import { Link } from "wouter";
import { GraduationCap } from "lucide-react";
import StudentForm from "@/components/students/StudentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewStudent() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Registrar Nuevo Estudiante</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <a className="text-primary">Inicio</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/estudiantes">
            <a className="text-primary">Estudiantes</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Nuevo</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <GraduationCap className="mr-2 h-5 w-5" />
            Datos del Estudiante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StudentForm />
        </CardContent>
      </Card>
    </>
  );
}
