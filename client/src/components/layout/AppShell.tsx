import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import TeacherSidebar from "./TeacherSidebar";
import Header from "./Header";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import FinanceWelcomeCard from "@/components/financials/FinanceWelcomeCard";
import CommunicationWelcomeCard from "@/components/financials/CommunicationWelcomeCard";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFinanceWelcome, setShowFinanceWelcome] = useState(false);
  const [showCommunicationWelcome, setShowCommunicationWelcome] = useState(false);
  const { user } = useAuth();
  const [location] = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Determinar qué tipo de sidebar mostrar
  const isParentPortal = location.startsWith("/portal-padres");
  const isTeacher = user && user.rol === "docente";
  const isParent = user && user.rol === "padre";
  
  // Decidir qué barra lateral mostrar según el rol
  const showTeacherSidebar = isTeacher && !isParentPortal;
  const showAdminSidebar = !isParentPortal && user && !isParent && !isTeacher;
  const showParentSidebar = isParent || isParentPortal;
  
  // Solo para depuración
  console.log("Rol de usuario en AppShell:", user?.rol);
  console.log("¿Mostrar sidebar de docente?", showTeacherSidebar);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar para pantallas medianas y grandes */}
      {(showAdminSidebar || showParentSidebar) && (
        <div className={`bg-white w-64 shadow-lg fixed inset-y-0 left-0 z-20 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out`}>
          <Sidebar 
            showParentView={showParentSidebar} 
            onShowFinanceWelcome={() => setShowFinanceWelcome(true)}
            onShowCommunicationWelcome={() => setShowCommunicationWelcome(true)}
          />
        </div>
      )}
      
      {/* Sidebar para docentes */}
      {showTeacherSidebar && (
        <div className={`w-64 fixed inset-y-0 left-0 z-20 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 ease-in-out`}>
          <TeacherSidebar />
        </div>
      )}

      {/* Overlay para cerrar el sidebar en móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className={`flex-1 flex flex-col overflow-hidden ${(showAdminSidebar || showParentSidebar || showTeacherSidebar) ? 'md:ml-64' : ''}`}>
        <Header toggleSidebar={toggleSidebar} />
        
        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#FAFAFA]">
          {/* Tarjeta de bienvenida del módulo de Finanzas */}
          {showFinanceWelcome && (
            <div className="mb-6">
              <FinanceWelcomeCard 
                forceShow={true} 
                onClose={() => setShowFinanceWelcome(false)} 
              />
            </div>
          )}
          
          {/* Tarjeta de bienvenida del módulo de Comunicación */}
          {showCommunicationWelcome && (
            <div className="mb-6">
              <CommunicationWelcomeCard 
                forceShow={true} 
                onClose={() => setShowCommunicationWelcome(false)} 
              />
            </div>
          )}
          {children}
        </main>
        
        {/* Asistente IA tipo Chat */}
        {user && <AssistantChat />}
      </div>
    </div>
  );
}
