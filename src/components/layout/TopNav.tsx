import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Users,
  Megaphone,
  FileText,
  MessageSquare,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  ListTodo,
  BookOpen,
  CalendarDays,
  Menu,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import bayLegalLogo from "@/assets/bay-legal-logo.webp";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { TimeTrackingHeaderWidget } from "@/components/dashboard/TimeTrackingHeaderWidget";

const mainNavItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Directory", url: "/directory", icon: Users },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Wiki", url: "/wiki", icon: BookOpen },
  { title: "Events", url: "/events", icon: CalendarDays },
];

const libraryItems = [
  { title: "Documents", url: "/documents", icon: FileText, description: "Company files and resources" },
  { title: "Knowledge Base", url: "/wiki", icon: BookOpen, description: "Policies and procedures" },
];

const resourceItems = [
  { title: "Tasks", url: "/tasks", icon: ListTodo, description: "Project tasks and assignments" },
  { title: "Events", url: "/events", icon: CalendarDays, description: "Calendar and meetings" },
  { title: "Messages", url: "/messages", icon: MessageSquare, description: "Team communication" },
];

export function TopNav() {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : "U";

  const isActive = (url: string) => location.pathname === url;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between px-6">
        {/* Logo & Brand */}
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="bg-sky-500 p-2 rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] group-hover:scale-110 transition-transform">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-white tracking-tighter leading-none">BAY LEGAL</span>
            <span className="text-[10px] font-bold text-sky-500 uppercase tracking-[0.2em] leading-none mt-1">Professional Corp</span>
          </div>
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {["Directory", "Wiki", "Tasks", "Support"].map((item) => (
            <NavLink
              key={item}
              to={`/${item.toLowerCase()}`}
              className={({ isActive }) => cn(
                "text-sm font-bold uppercase tracking-widest transition-colors hover:text-sky-400",
                isActive ? "text-sky-500" : "text-zinc-400"
              )}
            >
              {item}
            </NavLink>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden md:block w-64">
            <GlobalSearch />
          </div>

          <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full border-2 border-black" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 group">
                <Avatar className="h-10 w-10 border-2 border-white/10 group-hover:border-sky-500 transition-colors">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-100 font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 text-white">
              <div className="px-2 py-2">
                <p className="text-sm font-bold">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-xs text-zinc-500">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem asChild className="focus:bg-sky-500/10 focus:text-sky-400">
                <NavLink to="/settings" className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4" />
                  Settings
                </NavLink>
              </DropdownMenuItem>
              {isAdmin() && (
                <DropdownMenuItem asChild className="focus:bg-sky-500/10 focus:text-sky-400">
                  <NavLink to="/admin" className="flex items-center gap-2 w-full">
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </NavLink>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Toggle */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-zinc-400">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black border-white/5 text-white">
              <div className="flex flex-col gap-6 mt-12">
                {["Home", "Directory", "Wiki", "Tasks", "Support"].map((item) => (
                  <NavLink
                    key={item}
                    to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-bold uppercase tracking-widest hover:text-sky-500 transition-colors"
                  >
                    {item}
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
