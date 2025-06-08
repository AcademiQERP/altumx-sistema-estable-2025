import { useState, useEffect } from "react";
import { X, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WelcomeCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function WelcomeCard({ id, title, children }: WelcomeCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar si el mensaje ya se mostró antes
    const hasSeenMessage = localStorage.getItem(`welcome_${id}_seen`);
    if (!hasSeenMessage) {
      setIsVisible(true);
    }
  }, [id]);

  const handleDismiss = () => {
    // Guardar en localStorage que el usuario ya vio este mensaje
    localStorage.setItem(`welcome_${id}_seen`, "true");
    setIsVisible(false);
  };

  const handleShow = () => {
    setIsVisible(true);
  };

  if (!isVisible) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleShow}
        className="flex items-center gap-1 text-muted-foreground hover:text-primary mb-4"
      >
        <HelpCircle className="h-4 w-4" />
        <span>¿Cómo funciona el {title}?</span>
      </Button>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5 mb-6 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <CardTitle className="text-lg font-medium text-primary">{title}</CardTitle>
        <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" onClick={handleDismiss}>
          Entendido
        </Button>
      </CardFooter>
    </Card>
  );
}