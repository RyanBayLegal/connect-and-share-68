import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink, Sparkles } from "lucide-react";

export function ChatGPTWidget() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          ChatGPT Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-lg overflow-hidden flex flex-col items-center justify-center text-center p-8"
          style={{ height: "280px" }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">AI-Powered Assistance</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Get instant help with questions, writing, analysis, and more using ChatGPT.
          </p>
          <Button
            onClick={() => window.open("https://chat.openai.com", "_blank")}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open ChatGPT
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Opens in a new tab • Sign in with your OpenAI account
        </p>
      </CardContent>
    </Card>
  );
}
