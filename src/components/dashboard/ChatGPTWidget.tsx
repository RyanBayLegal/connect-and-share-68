import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Maximize2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ChatGPTWidget() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              ChatGPT Assistant
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl h-[85vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      ChatGPT Assistant
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 h-full min-h-0">
                    <iframe
                      src="https://chat.openai.com"
                      className="w-full h-[calc(85vh-80px)] rounded-lg border"
                      title="ChatGPT"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open("https://chat.openai.com", "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative bg-muted/50 rounded-lg overflow-hidden" style={{ height: "280px" }}>
            <iframe
              src="https://chat.openai.com"
              className="w-full h-full border-0"
              title="ChatGPT"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
            {/* Overlay for click-to-expand on mobile */}
            <div 
              className="absolute inset-0 bg-transparent cursor-pointer md:hidden"
              onClick={() => setIsExpanded(true)}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Sign in with your OpenAI account to use ChatGPT
          </p>
        </CardContent>
      </Card>
    </>
  );
}
