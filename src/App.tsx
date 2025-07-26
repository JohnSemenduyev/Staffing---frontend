// import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Toaster } from "./components/ui/toaster";
import AuthRedirect from "./pages/AuthRedirect";
import AppLayout from "./pages/AppLayout";
import { SchedulingAndGeolocation } from "./pages/Admin/Scheduling&Geolocation";
import AssignUserPermission from "./pages/Admin/Assignment";
import { GeoLocationSetup } from "./pages/Admin/GeoLocationSetup";
import { TimeSetup } from "./pages/Admin/TimeSetup";
import { PostAssignment } from "./pages/Admin/PostAssignment";
import AssignmentCard from "./pages/Admin/Assignment";
import { GeoLocationProvider } from "./context/GeoLocationContext";
import { TimeSetupProvider } from "./context/TimeStemp";
import { Scheduling } from "./pages/Manager/Scheduling";
import { PrepareSchedule } from "./pages/Manager/PrepareSchedule";
import { ViewSchedule } from "./pages/Manager/ViewSchedule";
import { Summary } from "./pages/Manager/Summary";
import { UniformCompliance } from "./pages/Manager/UniformCompliance";
import { Notification } from "./pages/Manager/Notification";
import { PostAssignProvider } from "./context/PostAssignm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    
      <TooltipProvider>
        <Toaster  />
        <Sonner />
        <GeoLocationProvider>
          <TimeSetupProvider>
            <PostAssignProvider>
           
          <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route path="/scheduling-geolocation" element={<SchedulingAndGeolocation />} />
            <Route path="/assign-user-permission" element={<AssignmentCard />} />
            <Route path="/geolocation-setup" element={<GeoLocationSetup />} />
            <Route path="/time-setup" element={<TimeSetup />} />
            <Route path="/post-assignment" element={<PostAssignment />} />

            {/* You can add manager tabs here too */}
            <Route path="/scheduling" element={<Scheduling />} />
            <Route path="/prepare-schedule" element={<PrepareSchedule />} />
            <Route path="/view-schedule" element={<ViewSchedule />} />
            <Route path="/view-time-summary" element={<Summary />} />
            <Route path="/uniform-compliance" element={<UniformCompliance />} />
            <Route path="/notification" element={<Notification />} />

          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </PostAssignProvider>
          </TimeSetupProvider>
        </GeoLocationProvider>
    </TooltipProvider>
    
  </QueryClientProvider>
);

export default App;
