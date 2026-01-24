import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Maximize2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClockifyWidgetProps {
  compact?: boolean;
}

export function ClockifyWidget({ compact = false }: ClockifyWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Compact variant for header placement - opens modal on click
  if (compact) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(true)}
        >
          <Clock className="h-5 w-5" />
        </Button>

        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-2 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Clockify Time Tracker
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open("https://app.clockify.me/tracker", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 h-[calc(85vh-60px)]">
              <iframe
                src="https://app.clockify.me/tracker"
                className="w-full h-full border-0"
                title="Clockify Time Tracker"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full card variant for dashboard placement
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Clockify
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open("https://app.clockify.me/tracker", "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        {/* Compact embedded view */}
        <div className="h-[300px] relative">
          <iframe
            src="https://app.clockify.me/tracker"
            className="w-full h-full border-0"
            title="Clockify Time Tracker"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
          {/* Click overlay to open expanded view on mobile */}
          <div 
            className="absolute inset-0 md:hidden cursor-pointer"
            onClick={() => setIsExpanded(true)}
          />
        </div>
      </CardContent>

      {/* Expanded modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Clockify Time Tracker
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open("https://app.clockify.me/tracker", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 h-[calc(85vh-60px)]">
            <iframe
              src="https://app.clockify.me/tracker"
              className="w-full h-full border-0"
              title="Clockify Time Tracker"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
