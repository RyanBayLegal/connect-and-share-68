import { Phone, Mail, MapPin } from "lucide-react";
import bayLegalLogo from "@/assets/bay-legal-logo.webp";

export function Footer() {
  return (
    <footer className="glass-panel border-t border-primary/15">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={bayLegalLogo} 
                alt="Bay Legal" 
                className="h-10 w-10 rounded bg-primary/10 p-1"
              />
              <span className="text-xl font-bold text-foreground">Bay Legal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Knowledge Base for Policies, Resources, and Support
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-primary">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/directory" className="text-muted-foreground hover:text-primary transition-colors">Employee Directory</a></li>
              <li><a href="/documents" className="text-muted-foreground hover:text-primary transition-colors">Document Library</a></li>
              <li><a href="/wiki" className="text-muted-foreground hover:text-primary transition-colors">Knowledge Base</a></li>
              <li><a href="/announcements" className="text-muted-foreground hover:text-primary transition-colors">Announcements</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-primary">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/tasks" className="text-muted-foreground hover:text-primary transition-colors">Task Management</a></li>
              <li><a href="/events" className="text-muted-foreground hover:text-primary transition-colors">Company Events</a></li>
              <li><a href="/messages" className="text-muted-foreground hover:text-primary transition-colors">Messages</a></li>
              <li><a href="/settings" className="text-muted-foreground hover:text-primary transition-colors">Settings</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-primary">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">(510) 250-5270</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">info@baylegal.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-muted-foreground">1735 Telegraph Ave<br />Oakland, CA 94612</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bay Legal, PC. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-primary transition-colors">IT Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
