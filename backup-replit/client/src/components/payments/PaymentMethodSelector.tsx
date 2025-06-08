import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Building, Info } from "lucide-react";

type PaymentMethod = "tarjeta" | "spei";

interface PaymentMethodSelectorProps {
  onSelect: (method: PaymentMethod) => void;
  selectedMethod: PaymentMethod;
}

export default function PaymentMethodSelector({
  onSelect,
  selectedMethod
}: PaymentMethodSelectorProps) {
  const handleChange = (value: string) => {
    onSelect(value as PaymentMethod);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Selecciona tu método de pago preferido
        </span>
      </div>
      
      <RadioGroup
        value={selectedMethod}
        onValueChange={handleChange}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <RadioGroupItem
            value="tarjeta"
            id="tarjeta"
            className="peer sr-only"
          />
          <Label
            htmlFor="tarjeta"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <CreditCard className="mb-3 h-6 w-6" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium leading-none">Tarjeta de crédito/débito</p>
              <p className="text-xs text-muted-foreground">
                Pago inmediato con tarjeta
              </p>
            </div>
          </Label>
        </div>

        <div>
          <RadioGroupItem
            value="spei"
            id="spei"
            className="peer sr-only"
          />
          <Label
            htmlFor="spei"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <Building className="mb-3 h-6 w-6" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium leading-none">Transferencia SPEI</p>
              <p className="text-xs text-muted-foreground">
                Pago mediante transferencia bancaria
              </p>
            </div>
          </Label>
        </div>
      </RadioGroup>

      {selectedMethod === "spei" && (
        <Card className="mt-4 border-blue-200 bg-blue-50">
          <CardContent className="pt-4 text-sm text-blue-700">
            <p className="mb-2 font-medium">Información sobre pagos SPEI:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Recibirás una referencia única para realizar tu pago</li>
              <li>La referencia tendrá validez de 5 días</li>
              <li>Una vez realizada la transferencia, el pago será procesado automáticamente</li>
              <li>Recibirás un recibo por correo electrónico cuando se confirme el pago</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}