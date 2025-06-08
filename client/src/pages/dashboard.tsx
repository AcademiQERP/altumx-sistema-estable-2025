import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { GraduationCap, Presentation, Users, TriangleAlert } from "lucide-react";
import { Student, Teacher, Group } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeacherSelectionModal, ParentSelectionModal } from "@/components/dashboard/PortalSelectionModals";

// Función para determinar colores dinámicos de asistencia
const getAttendanceColors = (attendanceValue: string) => {
  const numericValue = parseFloat(attendanceValue.replace('%', ''));
  
  if (numericValue >= 90) {
    return {
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
      borderColor: "border-l-green-500"
    };
  } else if (numericValue >= 80) {
    return {
      iconColor: "text-amber-500",
      bgColor: "bg-yellow-100",
      borderColor: "border-l-yellow-500"
    };
  } else {
    return {
      iconColor: "text-red-500",
      bgColor: "bg-red-100",
      borderColor: "border-l-red-500"
    };
  }
};

import StatCard from "@/components/dashboard/StatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import Calendar from "@/components/dashboard/Calendar";
import AttendanceChart from "@/components/dashboard/AttendanceChart";
import RecentStudents from "@/components/dashboard/RecentStudents";
import { FinancialRiskAlert } from "@/components/dashboard/FinancialRiskAlert";

export default function Dashboard() {
  const { user } = useAuth();
  
  // Estados para los modales de exploración de portales
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  
  // Solo administradores y coordinadores pueden ver el widget de riesgo
  const canSeeRiskWidget = user?.rol === 'admin' || user?.rol === 'coordinador';
  
  // Valor de asistencia para colores dinámicos
  const attendanceValue = "87.3%";
  const attendanceColors = getAttendanceColors(attendanceValue);
  
  // Fetch data for dashboard stats
  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: groups } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <span className="text-primary cursor-pointer">Inicio</span>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Dashboard</span>
        </div>
      </div>

      {/* Alerta de Riesgo Financiero - Solo visible para admin y coordinador */}
      {canSeeRiskWidget && (
        <div className="mb-6">
          <FinancialRiskAlert />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Alumnos"
          value={students?.length || 0}
          icon={<GraduationCap className="h-6 w-6 text-primary" />}
          iconBgColor="bg-blue-100"
          helpText="Número total de estudiantes registrados actualmente en el sistema"
          change={{
            value: "4.75% desde el mes pasado",
            type: "increase"
          }}
        />

        <StatCard
          title="Total Profesores"
          value={teachers?.length || 0}
          icon={<Presentation className="h-6 w-6 text-emerald-600" />}
          iconBgColor="bg-green-100"
          helpText="Número total de profesores activos en la institución"
          change={{
            value: "2.4% desde el mes pasado",
            type: "increase"
          }}
        />

        <StatCard
          title="Grupos Activos"
          value={groups?.length || 0}
          icon={<Users className="h-6 w-6 text-purple-600" />}
          iconBgColor="bg-purple-100"
          helpText="Grupos académicos activos en el periodo actual"
          change={{
            value: "Sin cambios desde el mes pasado",
            type: "neutral"
          }}
        />

        <StatCard
          title="Asistencia Promedio"
          value={attendanceValue}
          icon={<TriangleAlert className={`h-6 w-6 ${attendanceColors.iconColor}`} />}
          iconBgColor={attendanceColors.bgColor}
          helpText="Promedio de asistencia registrado en los últimos 7 días."
          change={{
            value: "2.1% desde el mes pasado",
            type: "decrease"
          }}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Quick Actions and Calendar */}
        <div className="lg:col-span-1 space-y-6">
          <QuickActions />
          <Calendar />
        </div>

        {/* Right Column - Attendance Chart and Recent Students */}
        <div className="lg:col-span-2 space-y-6">
          <AttendanceChart />
          <RecentStudents />
        </div>
      </div>

      {/* Sección Explorar otros portales - Solo para Administradores */}
      {user?.rol === 'admin' && (
        <div className="mt-8">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                🔍 Explorar otros portales
              </CardTitle>
              <p className="text-sm text-blue-600">
                Acceso visual a portales para supervisión y soporte (modo solo lectura)
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center gap-2 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                  onClick={() => setShowTeacherModal(true)}
                >
                  <div className="text-2xl">👨‍🏫</div>
                  <span className="font-medium">Ver como Profesor</span>
                  <span className="text-xs text-muted-foreground">Supervisar portal docente</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col items-center gap-2 border-2 border-green-200 hover:border-green-400 hover:bg-green-50"
                  onClick={() => setShowParentModal(true)}
                >
                  <div className="text-2xl">👨‍👧</div>
                  <span className="font-medium">Ver como Padre de Familia</span>
                  <span className="text-xs text-muted-foreground">Supervisar portal padres</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modales de selección para explorar portales */}
      <TeacherSelectionModal
        open={showTeacherModal}
        onOpenChange={setShowTeacherModal}
      />
      <ParentSelectionModal
        open={showParentModal}
        onOpenChange={setShowParentModal}
      />
    </>
  );
}
