import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import OrgansCatalog from "./pages/OrgansCatalog";
import PatientDashboard from "./pages/PatientDashboard";
import DonorDashboard from "./pages/DonorDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import HeadDashboard from "./pages/HeadDashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors closeButton />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/organs" element={<OrgansCatalog />} />

              <Route path="/dashboard/patient" element={
                <ProtectedRoute allowedRoles={["patient"]}><PatientDashboard /></ProtectedRoute>
              } />
              <Route path="/dashboard/donor" element={
                <ProtectedRoute allowedRoles={["donor"]}><DonorDashboard /></ProtectedRoute>
              } />
              <Route path="/dashboard/doctor" element={
                <ProtectedRoute allowedRoles={["doctor"]}><DoctorDashboard /></ProtectedRoute>
              } />
              <Route path="/dashboard/organization" element={
                <ProtectedRoute allowedRoles={["organization"]}><OrganizationDashboard /></ProtectedRoute>
              } />
              <Route path="/dashboard/head" element={
                <ProtectedRoute allowedRoles={["head"]}><HeadDashboard /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
