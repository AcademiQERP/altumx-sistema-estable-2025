import { Link } from "wouter";
import { ClipboardCheck } from "lucide-react";
import AttendanceForm from "@/components/attendance/AttendanceForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewAttendance() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Registrar Nueva Asistencia</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <a className="text-primary">Inicio</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/asistencias">
            <a className="text-primary">Asistencias</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Nueva</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <ClipboardCheck className="mr-2 h-5 w-5" />
            Registro de Asistencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceForm />
        </CardContent>
      </Card>
    </>
  );
}
