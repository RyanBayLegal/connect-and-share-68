import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { PageTransition } from "./PageTransition";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 overflow-auto">
        <PageTransition>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
}
