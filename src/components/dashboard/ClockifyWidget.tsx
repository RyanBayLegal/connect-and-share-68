import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, Timer } from "lucide-react";

interface ClockifyWidgetProps {
  compact?: boolean;
}

export function ClockifyWidget({ compact = false }: ClockifyWidgetProps) {
  const openClockify = () => window.open("https://app.clockify.me/tracker", "_blank");

  // Compact variant for header placement
  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
        onClick={openClockify}
        title="Open Clockify"
      >
        <Clock className="h-5 w-5" />
      </Button>
    );
  }

  // Full card variant for dashboard placement
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-lg overflow-hidden flex flex-col items-center justify-center text-center p-8"
          style={{ height: "280px" }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Timer className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Track Your Time</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Log hours, manage projects, and track productivity with Clockify.
          </p>
          <Button onClick={openClockify} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Clockify
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Opens in a new tab • Sign in with your Clockify account
        </p>
      </CardContent>
    </Card>
  );
}
