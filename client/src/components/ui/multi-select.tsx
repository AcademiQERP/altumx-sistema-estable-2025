import * as React from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export type Option = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

interface MultiSelectProps {
  options: Option[];
  selected: Option[];
  onChange: (selected: Option[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  badgeClassName?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar...",
  emptyText = "No hay elementos disponibles",
  className,
  badgeClassName,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (option: Option) => {
    onChange(selected.filter((item) => item.value !== option.value));
  };

  const handleSelect = (option: Option) => {
    if (selected.some((item) => item.value === option.value)) {
      onChange(selected.filter((item) => item.value !== option.value));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-[38px] h-auto py-2 px-3",
            selected.length > 0 ? "h-auto flex-wrap" : "",
            className
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((option) => (
                <Badge 
                  key={option.value} 
                  variant="secondary" 
                  className={cn("flex gap-1 items-center py-1 pl-2 pr-1", badgeClassName)}
                >
                  {option.label}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselect(option);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command className="w-full">
          <CommandInput placeholder="Buscar..." />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                disabled={option.disabled}
                onSelect={() => handleSelect(option)}
                className={cn(
                  "flex items-center gap-2",
                  option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                )}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border",
                    selected.some((item) => item.value === option.value)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary opacity-50"
                  )}
                >
                  {selected.some((item) => item.value === option.value) && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
                <span>{option.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}