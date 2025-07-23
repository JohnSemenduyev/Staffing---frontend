// import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Toaster } from "./components/ui/toaster";
import AuthRedirect from "./pages/AuthRedirect";
import AppLayout from "./pages/AppLayout";
import { SchedulingAndGeolocation } from "./pages/Admin/Scheduling&Geolocation";
import AssignUserPermission from "./pages/Admin/AssignUserPermission";
import { GeoLocationSetup } from "./pages/Admin/GeoLocationSetup";
import { TimeSetup } from "./pages/Admin/TimeSetup";
import { PostAssignment } from "./pages/Admin/PostAssignment";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route path="/scheduling-geolocation" element={<SchedulingAndGeolocation />} />
            <Route path="/assign-user-permission" element={<AssignUserPermission />} />
            <Route path="/geolocation-setup" element={<GeoLocationSetup />} />
            <Route path="/time-setup" element={<TimeSetup />} />
            <Route path="/post-assignment" element={<PostAssignment />} />

            {/* You can add manager tabs here too */}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
