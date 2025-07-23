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
  useSidebar,
} from '../components/ui/sidebar';
import { useAuth } from '../hooks/useAuth';
import { NavLink } from 'react-router-dom';

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

  if (!user) return null;

  const tabs = user.role === 'manager' ? managerTabs : adminTabs;
  const portalTitle = user.role === 'manager' ? 'Manager Portal' : 'Admin Portal';
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-semibold">
            {!isCollapsed && portalTitle}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map((tab) => (
                <SidebarMenuItem key={tab.id}>
                  <NavLink
                  to={tab.path}
                  className={({ isActive }) =>
                      `${isActive ? 'bg-muted text-primary font-medium' : 'hover:bg-muted/50'} ${
                        isCollapsed ? 'justify-center' : ''
                       } flex items-center gap-2 rounded px-2 py-1.5 transition-colors`
                  }
                  >
                    <tab.icon className="h-4 w-4" />
                    {!isCollapsed && <span className="text-sm">{tab.label}</span>}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}