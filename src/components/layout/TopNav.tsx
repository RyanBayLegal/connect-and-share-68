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
  ListTodo,
  BookOpen,
  CalendarDays,
  Menu,
  GraduationCap,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useBranding } from "@/hooks/useBranding";

const quickLinks = [
  { title: "Directory", url: "/directory", icon: Users, description: "Find team members" },
  { title: "Announcements", url: "/announcements", icon: Megaphone, description: "Company news & updates" },
];

const resourceLinks = [
  { title: "Documents", url: "/documents", icon: FileText, description: "Files & resources" },
  { title: "Wiki", url: "/wiki", icon: BookOpen, description: "Knowledge base" },
  { title: "Tasks", url: "/tasks", icon: ListTodo, description: "Projects & assignments" },
  { title: "Training", url: "/training", icon: GraduationCap, description: "Courses & development" },
  { title: "Messages", url: "/messages", icon: MessageSquare, description: "Team communication" },
  { title: "Events", url: "/events", icon: CalendarDays, description: "Calendar & meetings" },
];

const allLinks = [...quickLinks, ...resourceLinks];

export function TopNav() {
  const { profile, isAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const { branding } = useBranding();

  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 group shrink-0">
          <div className="bg-sky-500 p-1.5 rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] group-hover:scale-110 transition-transform overflow-hidden">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="h-5 w-5 object-contain" />
            ) : (
              <Shield className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-white tracking-tighter leading-none">{branding.company_name?.toUpperCase() || "BAY LEGAL"}</span>
            <span className="text-[9px] font-bold text-sky-500 uppercase tracking-[0.2em] leading-none mt-0.5">{branding.company_slogan || "Professional Corp"}</span>
          </div>
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1">
          {quickLinks.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) => cn(
                "text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-md transition-colors hover:text-sky-400 hover:bg-sky-500/10",
                isActive ? "text-sky-500 bg-sky-500/10" : "text-zinc-400"
              )}
            >
              {item.title}
            </NavLink>
          ))}

          {/* Mega Menu for Resources */}
          <Popover open={megaOpen} onOpenChange={setMegaOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-md transition-colors hover:text-sky-400 hover:bg-sky-500/10",
                  megaOpen ? "text-sky-500 bg-sky-500/10" : "text-zinc-400"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Resources
                <ChevronDown className={cn("h-3 w-3 transition-transform", megaOpen && "rotate-180")} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-[480px] p-0 bg-zinc-900 border-white/10 text-white">
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Resources & Tools</h3>
                <div className="grid grid-cols-2 gap-1">
                  {resourceLinks.map((item) => (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      onClick={() => setMegaOpen(false)}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                        isActive ? "bg-sky-500/10 text-sky-400" : "hover:bg-zinc-800 text-zinc-300"
                      )}
                    >
                      <div className="p-2 rounded-lg bg-zinc-800 text-sky-400">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-[11px] text-zinc-500">{item.description}</p>
                      </div>
                    </NavLink>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block w-52">
            <GlobalSearch />
          </div>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 group">
                <Avatar className="h-8 w-8 border-2 border-white/10 group-hover:border-sky-500 transition-colors">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-100 font-bold text-xs">
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
              <Button variant="ghost" size="icon" className="xl:hidden text-zinc-400 h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black border-white/5 text-white w-72">
              <div className="flex flex-col gap-2 mt-12">
                <NavLink
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors",
                    isActive ? "text-sky-500 bg-sky-500/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                >
                  <Home className="h-4 w-4" />
                  Home
                </NavLink>
                {allLinks.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors",
                      isActive ? "text-sky-500 bg-sky-500/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
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
