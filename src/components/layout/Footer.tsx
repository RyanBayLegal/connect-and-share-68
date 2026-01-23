import { Phone, Mail, MapPin } from "lucide-react";
import bayLegalLogo from "@/assets/bay-legal-logo.webp";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={bayLegalLogo} 
                alt="Bay Legal" 
                className="h-10 w-10 rounded bg-white/10 p-1"
              />
              <span className="text-xl font-bold">Bay Legal</span>
            </div>
            <p className="text-sm text-primary-foreground/70">
              Your Knowledge Base for Policies, Resources, and Support
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-accent">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/directory" className="hover:text-accent transition-colors">Employee Directory</a></li>
              <li><a href="/documents" className="hover:text-accent transition-colors">Document Library</a></li>
              <li><a href="/wiki" className="hover:text-accent transition-colors">Knowledge Base</a></li>
              <li><a href="/announcements" className="hover:text-accent transition-colors">Announcements</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-accent">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/tasks" className="hover:text-accent transition-colors">Task Management</a></li>
              <li><a href="/events" className="hover:text-accent transition-colors">Company Events</a></li>
              <li><a href="/messages" className="hover:text-accent transition-colors">Messages</a></li>
              <li><a href="/settings" className="hover:text-accent transition-colors">Settings</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-accent">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <span>(510) 250-5270</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                <span>info@baylegal.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <span>1735 Telegraph Ave<br />Oakland, CA 94612</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} Bay Legal, PC. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-primary-foreground/60">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-accent transition-colors">IT Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
