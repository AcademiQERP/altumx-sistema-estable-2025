import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface SimulationBannerProps {
  userType: "profesor" | "padre";
  userName: string;
}

export function SimulationBanner({ userType, userName }: SimulationBannerProps) {
  const [, setLocation] = useLocation();

  const handleBackToAdmin = () => {
    setLocation("/");
  };

  return (
    <div className="bg-blue-100 border-b-2 border-blue-200 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              🔒 Estás visualizando el portal como administrador
            </p>
            <p className="text-xs text-blue-700">
              Vista simulada de <strong>{userName}</strong> • Esta vista es solo de lectura y no afecta a ningún usuario real
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackToAdmin}
          className="bg-white hover:bg-gray-50 border-blue-300 text-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel de Administrador
        </Button>
      </div>
    </div>
  );
}