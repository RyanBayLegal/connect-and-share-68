import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { PageTransition } from "./PageTransition";
import { Breadcrumbs } from "./Breadcrumbs";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Ambient glow orbs for glassmorphism depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/[0.07] blur-[120px] dark:bg-primary/[0.12]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/[0.05] blur-[100px] dark:bg-primary/[0.1]" />
        <div className="absolute top-[40%] right-[10%] w-[25vw] h-[25vw] rounded-full bg-accent/[0.04] blur-[80px] dark:bg-accent/[0.08]" />
      </div>
      <TopNav />
      <main className="flex-1 overflow-auto relative z-10">
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
