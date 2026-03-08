import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Directory from "./pages/Directory";
import Announcements from "./pages/Announcements";
import Documents from "./pages/Documents";
import Messages from "./pages/Messages";
import Tasks from "./pages/Tasks";
import Wiki from "./pages/Wiki";
import Events from "./pages/Events";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import DepartmentHub from "./pages/DepartmentHub";
import Training from "./pages/Training";
import TeamProgress from "./pages/TeamProgress";
import HROnboarding from "./pages/HROnboarding";
import TrainingManagement from "./pages/TrainingManagement";
import TimeTracking from "./pages/TimeTracking";
import TimeManagement from "./pages/TimeManagement";
import HRSettings from "./pages/HRSettings";
import Payroll from "./pages/Payroll";
import HRDashboard from "./pages/HRDashboard";
import MyHR from "./pages/MyHR";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout><Dashboard /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/directory"
              element={
                <ProtectedRoute>
                  <AppLayout><Directory /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute>
                  <AppLayout><Announcements /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <AppLayout><Documents /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <AppLayout><Messages /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <AppLayout><Tasks /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/wiki"
              element={
                <ProtectedRoute>
                  <AppLayout><Wiki /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <AppLayout><Events /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout><Settings /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRoles={["super_admin"]}>
                  <AppLayout><Admin /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/department"
              element={
                <ProtectedRoute>
                  <AppLayout><DepartmentHub /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/training"
              element={
                <ProtectedRoute>
                  <AppLayout><Training /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/team-progress"
              element={
                <ProtectedRoute>
                  <AppLayout><TeamProgress /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr-onboarding"
              element={
                <ProtectedRoute>
                  <AppLayout><HROnboarding /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/training-management"
              element={
                <ProtectedRoute>
                  <AppLayout><TrainingManagement /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/time-tracking"
              element={
                <ProtectedRoute>
                  <AppLayout><TimeTracking /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/time-management"
              element={
                <ProtectedRoute>
                  <AppLayout><TimeManagement /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr-settings"
              element={
                <ProtectedRoute>
                  <AppLayout><HRSettings /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute>
                  <AppLayout><Payroll /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr-dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout><HRDashboard /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-hr"
              element={
                <ProtectedRoute>
                  <AppLayout><MyHR /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
