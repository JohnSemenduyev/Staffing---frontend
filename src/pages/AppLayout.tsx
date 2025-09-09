// src/pages/AppLayout.tsx

import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider } from "../components/ui/sidebar";
import { AppSidebar } from "../components/AppSidebar";
import { useAuth } from "../hooks/useAuth";
import { Headers } from "../components/Headers";

const AppLayout = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      navigate("/login");
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated || !user) return null;

  return (
    <SidebarProvider>
      <div className="flex w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="lg:flex-1 overflow-y-auto bg-gray-100">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
