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

const managerTabs = [
  { id: 'scheduling', label: 'Scheduling', icon: Calendar },
  { id: 'prepare-schedule', label: 'Prepare Schedule', icon: FileText },
  { id: 'view-schedule', label: 'View Schedule', icon: Eye },
  { id: 'view-time-summary', label: 'View Time Summary', icon: BarChart3 },
  { id: 'uniform-compliance', label: 'Uniform Compliance', icon: Shield },
  { id: 'notification', label: 'Notification', icon: Bell },
];

const adminTabs = [
  { id: 'scheduling-geolocation', label: 'Scheduling and Geolocation', icon: MapPin },
  { id: 'assign-user-permission', label: 'Assign User Permission', icon: Users },
  { id: 'geolocation-setup', label: 'Geolocation Setup', icon: MapPin },
  { id: 'time-setup', label: 'Time Setup', icon: Clock },
  { id: 'post-assignment', label: 'Post Assignment', icon: Settings },
];

export function AppSidebar() {
  const { user } = useAuth();
  const { state } = useSidebar();
  const [activeTab, setActiveTab] = useState('');

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
                  <SidebarMenuButton
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'bg-muted text-primary font-medium'
                        : 'hover:bg-muted/50'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {!isCollapsed && <span className="text-sm">{tab.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}