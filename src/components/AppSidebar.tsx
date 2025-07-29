import { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Settings,
  Bell,
  Shield,
  FileText,
  Eye,
  BarChart3,
  Menu,
  LogOut,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '../components/ui/sidebar';
import { useAuth } from '../hooks/useAuth';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

const managerTabs = [
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: Calendar,
    children: [
      { id: 'prepare-schedule', label: 'Prepare Schedule', icon: FileText, path: '/prepare-schedule' },
      { id: 'view-schedule', label: 'View Schedule', icon: Eye, path: '/view-schedule' },
      { id: 'view-time-summary', label: 'View Time Summary', icon: BarChart3, path: '/view-time-summary' },
      { id: 'uniform-compliance', label: 'Uniform Compliance', icon: Shield, path: '/uniform-compliance' },
      { id: 'notification', label: 'Notification', icon: Bell, path: '/notification' },
    ],
  },
];

const adminTabs = [
  {
    id: 'scheduling-geolocation',
    label: 'Scheduling and Geolocation',
    icon: MapPin,
    children: [
      { id: 'assign-user-permission', label: 'Assign User Permission', icon: Users, path: '/assign-user-permission' },
      { id: 'geolocation-setup', label: 'Geolocation Setup', icon: MapPin, path: '/geolocation-setup' },
      { id: 'time-setup', label: 'Time Setup', icon: Clock, path: '/time-setup' },
      { id: 'post-assignment', label: 'Post Assignment', icon: Settings, path: '/post-assignment' },
    ],
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();

  if (!user) return null;

  const tabs = user.role === 'manager' ? managerTabs : adminTabs;
  const portalTitle = user.role === 'manager' ? 'Manager Portal' : 'Scheduling - Admin Portal';
  const isCollapsed = state === 'collapsed';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Collapsed Sidebar Toggle Button */}
      {isCollapsed && (
        <div className="fixed top-2 left-4 z-50">
          <button
            onClick={toggleSidebar}
            className="p-2 bg-white text-black rounded-md hover:bg-opacity-90 transition-all duration-200"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      )}

      <Sidebar collapsible="icon" className="w-64">
        <SidebarHeader className="px-0 py-6 relative">
          <h1 className="text-xl font-bold block text-white text-center">
            {portalTitle}
          </h1>
        </SidebarHeader>

        <SidebarContent className="px-0">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {tabs.map((group) => (
                  <div key={group.id}>
                    {group.children.map((tab) => {
                      const isActive = location.pathname === tab.path;
                      return (
                        <SidebarMenuItem key={tab.id} className="px-4">
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={`
                              text-white text-left w-full
                              ${isActive ? 'bg-white/20' : 'text-white/90 hover:text-white hover:bg-white/10'}
                              transition-all duration-200
                              py-3 px-4 rounded-lg
                              flex items-center gap-3
                              text-sm font-normal
                            `}
                          >
                            <NavLink to={tab.path} className="flex items-center gap-3 w-full">
                              <tab.icon className="w-5 h-5 flex-shrink-0" />
                              <span className="truncate">{tab.label}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </div>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Logout button aligned like tabs */}
          <SidebarGroup>
            <SidebarGroupContent className="px-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="
                      text-white/90 hover:text-white hover:bg-white/10
                      transition-all duration-200
                      py-3 px-4 rounded-lg
                      flex items-center gap-3
                      text-sm font-normal w-full
                    "
                  >
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      <LogOut className="w-5 h-5 flex-shrink-0" />
                      <span>Logout</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}