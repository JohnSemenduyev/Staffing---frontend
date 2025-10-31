// import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Toaster } from "./components/ui/toaster";
import AuthRedirect from "./pages/AuthRedirect";
import AppLayout from "./pages/AppLayout";

import { GeoLocationSetup } from "./pages/Admin/GeoLocationSetup";
import { TimeSetup } from "./pages/Admin/TimeSetup";
import { PostAssignment } from "./pages/Admin/PostAssignment";
import { GeoLocationProvider } from "./context/GeoLocationContext";
import { TimeSetupProvider } from "./context/TimeStemp";
import { PrepareSchedule } from "./pages/Manager/PrepareSchedule";
import { ViewSchedule } from "./pages/Manager/ViewSchedule";
import { Summary } from "./pages/Manager/Summary";
import { UniformCompliance } from "./pages/Manager/UniformCompliance";
import { Notification } from "./pages/Manager/Notification";
import { PostAssignProvider } from "./context/PostAssignm";
import AssignmentNew from "./pages/Admin/AssignmentNew";
import { AssignmentProvider } from "./context/Assignment";
import { Client } from "./pages/Admin/Client";
import { Manager } from "./pages/Admin/Manager";
import { Guard } from "./pages/Admin/Guard";
import { Admin } from "./pages/Admin/Admin";
import { UserProvider } from "./context/UserContext";
import { ClientProvider } from "./context/ClientContext";
import { AddressProvider } from "./context/AddressContext";
import { ScheduleSessionProvider } from "./context/ScheduleContext";
import { ClientSessionProvider } from "./context/ViewSchedule";
import ClientList from "./pages/Admin/ClientList";
import { ScheduleSessionProviderClient } from "./context/ClientList";
import { UniformComplianceProvider } from "./context/unifromCompliace";
import { AuthProvider } from "./context/LoginContext";
import { ViewTimeSummaryProvider } from "./context/ViewTimeSummaryContext";
import { NotificationsProvider } from "./context/NotificatoinContext";
import Signup from "./pages/Signup";
import { UserRegistrationProvider } from "./context/SignupContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminVerify from "./pages/AdminVerify";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <ScheduleSessionProvider>
        <AssignmentProvider>
          <AddressProvider>
            <ClientProvider>
              <UserProvider>
                <GeoLocationProvider>
                  <TimeSetupProvider>
                    <PostAssignProvider>
                      <ClientSessionProvider>
                        <ViewTimeSummaryProvider>
                          <ScheduleSessionProviderClient>
                            <UniformComplianceProvider>
                              <AuthProvider>
                                <UserRegistrationProvider>
                                  <NotificationsProvider>
                                    <BrowserRouter>
                                      <Routes>
                                        <Route path="/" element={<AuthRedirect />} />
                                        <Route path="/login" element={<Login />} />
                                        <Route path="/signup" element={<Signup />} />
                                        <Route path="/api/admin/verify" element={<AdminVerify />} />

                                        <Route element={<AppLayout />}>
                                          <Route path="/assign-user-permission" element={<ProtectedRoute allowedRoles={["admin"]}>  <AssignmentNew /> </ProtectedRoute>
                                          }
                                          />
                                          <Route
                                            path="/geolocation-setup"
                                            element={
                                              <ProtectedRoute allowedRoles={["admin"]}>
                                                <GeoLocationSetup />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/time-setup"
                                            element={
                                              <ProtectedRoute allowedRoles={["admin"]}>
                                                <TimeSetup />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/post-assignment"
                                            element={
                                              <ProtectedRoute allowedRoles={["admin"]}>
                                                <PostAssignment />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/client"
                                            element={
                                              <ProtectedRoute allowedRoles={["admin"]}>
                                                <Client />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/manager"
                                            element={
                                              <ProtectedRoute allowedRoles={["admin"]}>
                                                <Manager />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/guard"
                                            element={
                                              <ProtectedRoute allowedRoles={["admin"]}>
                                                <Guard />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/admin"
                                            element={
                                              <ProtectedRoute allowedRoles={["admin"]}>
                                                <Admin />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/clientlist"
                                            element={
                                              <ProtectedRoute allowedRoles={["admin"]}>
                                                <ClientList />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/prepare-schedule"
                                            element={
                                              <ProtectedRoute allowedRoles={["manager"]}>
                                                <PrepareSchedule />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/view-schedule"
                                            element={
                                              <ProtectedRoute allowedRoles={["manager"]}>
                                                <ViewSchedule />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/view-time-summary"
                                            element={
                                              <ProtectedRoute allowedRoles={["manager"]}>
                                                <Summary />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/uniform-compliance"
                                            element={
                                              <ProtectedRoute allowedRoles={["manager"]}>
                                                <UniformCompliance />
                                              </ProtectedRoute>
                                            }
                                          />
                                          <Route
                                            path="/notification"
                                            element={
                                              <ProtectedRoute allowedRoles={["manager"]}>
                                                <Notification />
                                              </ProtectedRoute>
                                            }
                                          />
                                        </Route>

                                        <Route path="*" element={<NotFound />} />
                                      </Routes>
                                    </BrowserRouter>
                                  </NotificationsProvider>
                                </UserRegistrationProvider>
                              </AuthProvider>
                            </UniformComplianceProvider>
                          </ScheduleSessionProviderClient>
                        </ViewTimeSummaryProvider>
                      </ClientSessionProvider>
                    </PostAssignProvider>
                  </TimeSetupProvider>
                </GeoLocationProvider>
              </UserProvider>
            </ClientProvider>
          </AddressProvider>
        </AssignmentProvider>
      </ScheduleSessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
