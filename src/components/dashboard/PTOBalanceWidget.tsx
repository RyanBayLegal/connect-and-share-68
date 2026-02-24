import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Palmtree, Thermometer, User, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PTOBalance {
  balance_type: string;
  total_allocated: number;
  total_used: number;
  accrual_rate: number;
  year: number;
}

const typeConfig: Record<string, { label: string; icon: typeof Palmtree; colorClass: string }> = {
  pto: { label: "Vacation / PTO", icon: Palmtree, colorClass: "text-primary" },
  sick: { label: "Sick Leave", icon: Thermometer, colorClass: "text-destructive" },
  personal: { label: "Personal Days", icon: User, colorClass: "text-accent-foreground" },
};

export function PTOBalanceWidget() {
  const { profile } = useAuth();
  const [balances, setBalances] = useState<PTOBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchBalances = async () => {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from("pto_balances")
        .select("balance_type, total_allocated, total_used, accrual_rate, year")
        .eq("employee_id", profile.id)
        .eq("year", currentYear);

      if (!error && data) {
        setBalances(data);
      }
      setIsLoading(false);
    };

    fetchBalances();
  }, [profile?.id]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Show placeholder if no balances configured yet
  const displayBalances = balances.length > 0
    ? balances
    : [
        { balance_type: "pto", total_allocated: 0, total_used: 0, accrual_rate: 0, year: new Date().getFullYear() },
        { balance_type: "sick", total_allocated: 0, total_used: 0, accrual_rate: 0, year: new Date().getFullYear() },
        { balance_type: "personal", total_allocated: 0, total_used: 0, accrual_rate: 0, year: new Date().getFullYear() },
      ];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          PTO Balances — {new Date().getFullYear()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {balances.length === 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            No PTO balances have been set up yet. Contact HR to configure your allocations.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayBalances.map((b) => {
            const config = typeConfig[b.balance_type] || typeConfig.pto;
            const remaining = b.total_allocated - b.total_used;
            const usedPercent = b.total_allocated > 0 ? (b.total_used / b.total_allocated) * 100 : 0;
            const Icon = config.icon;

            return (
              <div
                key={b.balance_type}
                className="glass-panel rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${config.colorClass}`} />
                  <span className="font-medium text-sm">{config.label}</span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    {remaining >= 0 ? remaining : 0}
                  </span>
                  <span className="text-sm text-muted-foreground">hrs remaining</span>
                </div>

                <Progress value={usedPercent} className="h-2" />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{b.total_used} hrs used</span>
                  <span>{b.total_allocated} hrs total</span>
                </div>

                {b.accrual_rate > 0 && (
                  <p className="text-xs text-muted-foreground/70">
                    Accrues {b.accrual_rate} hrs / pay period
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
