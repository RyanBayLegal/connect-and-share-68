import { Phone, Mail, MapPin } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

export function Footer() {
  const { branding } = useBranding();

  return (
    <footer className="glass-panel border-t border-primary/15">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.company_name}
                  className="h-10 w-10 rounded bg-primary/10 p-1 object-contain"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {branding.company_name[0]}
                </div>
              )}
              <span className="text-xl font-bold text-foreground">{branding.company_name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {branding.company_slogan}
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
              {branding.contact_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a href={`tel:${branding.contact_phone.replace(/[^\d+]/g, '')}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {branding.contact_phone}
                  </a>
                </li>
              )}
              {branding.contact_email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href={`mailto:${branding.contact_email}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {branding.contact_email}
                  </a>
                </li>
              )}
              {branding.contact_address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground whitespace-pre-line">{branding.contact_address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {branding.company_name}. All rights reserved.
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
