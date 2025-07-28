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
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: Calendar,
    children: [
      { id: 'prepare-schedule', label: 'Prepare Schedule', icon: FileText, path: "/prepare-schedule" },
      { id: 'view-schedule', label: 'View Schedule', icon: Eye, path: "/view-schedule" },
      { id: 'view-time-summary', label: 'View Time Summary', icon: BarChart3, path: "/view-time-summary" },
      { id: 'uniform-compliance', label: 'Uniform Compliance', icon: Shield, path: "/uniform-compliance" },
      { id: 'notification', label: 'Notification', icon: Bell, path: "/notification" },
    ],
  }
];

const adminTabs = [
  {
    id: 'scheduling-geolocation',
    label: 'Scheduling and Geolocation',
    icon: MapPin,
    children: [
      { id: 'assign-user-permission', label: 'Assign User Permission', icon: Users, path: "/assign-user-permission" },
      { id: 'geolocation-setup', label: 'Geolocation Setup', icon: MapPin, path: "/geolocation-setup" },
      { id: 'time-setup', label: 'Time Setup', icon: Clock, path: "/time-setup" },
      { id: 'post-assignment', label: 'Post Assignment', icon: Settings, path: "/post-assignment" },
    ],
  }
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
      <SidebarHeader className="px-2">
        <h1 className="text-2xl font-bold mb-6 block text-white">
          {!isCollapsed ? portalTitle : (user.role === 'manager' ? 'MP' : 'AP')}
        </h1>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map((group) => (
                <div key={group.id} className="mb-4">
                  {/* Parent Tab Header */}
                  <div className={`
                    flex items-center gap-3 px-2 py-4 mb-3
                    text-white font-bold text-base
                    ${isCollapsed ? 'justify-center' : ''}
                  `}>
                    {/* <group.icon className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0`} /> */}
                    {!isCollapsed && (
                      <span className="uppercase tracking-wide text-md">
                        {group.label}
                      </span>
                    )}
                  </div>
                  
                  {/* Child Items */}
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <div className="space-y-1">
                        {group.children.map((tab) => {
                          const isActive = location.pathname === tab.path;
                          return (
                            <SidebarMenuItem key={tab.id}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={isCollapsed ? tab.label : undefined}
                                className={`
                                  text-white text-opacity-90 hover:text-opacity-100
                                  hover:bg-white hover:bg-opacity-10
                                  ${isActive ? 'bg-white bg-opacity-20 text-white' : ''}
                                  transition-all duration-200
                                  py-3 px-2
                                `}
                              >
                                <NavLink to={tab.path} className="flex items-center gap-3 w-full">
                                  <tab.icon className="w-5 h-5 flex-shrink-0" />
                                  {!isCollapsed && (
                                    <span className="text-md font-medium truncate">
                                      {tab.label}
                                    </span>
                                  )}
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}