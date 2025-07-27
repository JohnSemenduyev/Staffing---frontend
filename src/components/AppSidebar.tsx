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
  BarChart3
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
  useSidebar,
} from '../components/ui/sidebar';
import { useAuth } from '../hooks/useAuth';
import { NavLink, useLocation } from 'react-router-dom';

const managerTabs = [
  { id: 'scheduling', label: 'Scheduling', icon: Calendar , path :"/scheduling"},
  { id: 'prepare-schedule', label: 'Prepare Schedule', icon: FileText , path :"/prepare-schedule"},
  { id: 'view-schedule', label: 'View Schedule', icon: Eye , path :"/view-schedule"},
  { id: 'view-time-summary', label: 'View Time Summary', icon: BarChart3 , path :"/view-time-summary"},
  { id: 'uniform-compliance', label: 'Uniform Compliance', icon: Shield , path :"/uniform-compliance"},
  { id: 'notification', label: 'Notification', icon: Bell , path :"/notification"},
];

const adminTabs = [
  { id: 'scheduling-geolocation', label: 'Scheduling and Geolocation', icon: MapPin, path :"/scheduling-geolocation" },
  { id: 'assign-user-permission', label: 'Assign User Permission', icon: Users, path : "/assign-user-permission" },
  { id: 'geolocation-setup', label: 'Geolocation Setup', icon: MapPin , path :"/geolocation-setup"},
  { id: 'time-setup', label: 'Time Setup', icon: Clock ,  path :"/time-setup"},
  { id: 'post-assignment', label: 'Post Assignment', icon: Settings , path :"/post-assignment"},
];

export function AppSidebar() {
  const { user } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();

  if (!user) return null;

  const tabs = user.role === 'manager' ? managerTabs : adminTabs;
  const portalTitle = user.role === 'manager' ? 'Manager Portal' : 'Admin Portal';
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <h1 className="text-2xl font-bold mb-6 block text-white">
          {!isCollapsed ? portalTitle : (user.role === 'manager' ? 'MP' : 'AP')}
        </h1>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                return (
                  <SidebarMenuItem key={tab.id}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={isCollapsed ? tab.label : undefined}
                    >
                      <NavLink to={tab.path}>
                        <tab.icon />
                        <span>{tab.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}