import { useState } from "react";
import { Check, ChevronsUpDown, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/types/database";

interface ManagerSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  employees: Profile[];
  excludeId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ManagerSelect({
  value,
  onValueChange,
  employees,
  excludeId,
  placeholder = "Select manager...",
  disabled = false,
}: ManagerSelectProps) {
  const [open, setOpen] = useState(false);

  // Filter out the excluded employee and sort alphabetically
  const availableEmployees = employees
    .filter((e) => e.id !== excludeId)
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );

  // Find the selected employee
  const selectedEmployee = value
    ? employees.find((e) => e.id === value)
    : null;

  const getEmployeeLabel = (employee: Profile) => {
    const name = `${employee.first_name} ${employee.last_name}`;
    return employee.department?.name ? `${name} (${employee.department.name})` : name;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedEmployee ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {selectedEmployee.first_name[0]}
                  {selectedEmployee.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{getEmployeeLabel(selectedEmployee)}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {/* No Manager option */}
              <CommandItem
                value="no-manager"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
              >
                <UserX className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>No Manager</span>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>

              {/* Employee options */}
              {availableEmployees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={`${employee.first_name} ${employee.last_name} ${employee.department?.name || ""}`}
                  onSelect={() => {
                    onValueChange(employee.id);
                    setOpen(false);
                  }}
                >
                  <Avatar className="mr-2 h-5 w-5">
                    <AvatarImage src={employee.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {employee.first_name[0]}
                      {employee.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{getEmployeeLabel(employee)}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === employee.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
