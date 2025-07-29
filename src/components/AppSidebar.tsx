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
  X,
  ChevronDown,
  ChevronRight,
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
    {
      id: 'Parent',
      label: 'Parent Dashboard',
      icon: BarChart3,
      children: [
        { id: 'parent-dashboard', label: 'Parent Dashboard', icon: BarChart3, path: '/parent-dashboard' },
        { id: 'parent-dashboard', label: 'Parent Dashboard', icon: BarChart3, path: '/parent-dashboard' },
      ],
    }
];


export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (!user) return null;

  const tabs = user.role === 'manager' ? managerTabs : adminTabs;
  const portalTitle = user.role === 'manager' ? 'Manager Portal' : 'Scheduling - Admin Portal';
  const isCollapsed = state === 'collapsed';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  return (
    <>
      {/* Mobile Menu Toggle Button - Always visible on mobile */}
      <div className="fixed top-2 left-4 z-50 md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white text-black rounded-md hover:bg-opacity-90 transition-all duration-200 shadow-lg"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Desktop Collapsed Sidebar Toggle Button */}
      {isCollapsed && (
        <div className="fixed top-2 left-4 z-50 hidden md:block">
          <button
            onClick={toggleSidebar}
            className="p-2 bg-white text-black rounded-md hover:bg-opacity-90 transition-all duration-200"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-[#004175] z-50 transform transition-transform duration-300 ease-in-out md:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <h1 className="text-xl font-bold text-white">
              {portalTitle}
            </h1>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 text-white hover:bg-white/10 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {tabs.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                return (
                  <div key={group.id} className="space-y-1">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full text-left py-3 px-4 rounded-lg flex items-center justify-between text-sm font-normal text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <group.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="truncate">{group.label}</span>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {isExpanded && (
                      <div className="ml-6 space-y-1">
                        {group.children.map((tab) => {
                          const isActive = location.pathname === tab.path;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                navigate(tab.path);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`
                                w-full text-left py-2 px-4 rounded-lg
                                flex items-center gap-3 text-sm font-normal
                                transition-all duration-200
                                ${isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}
                              `}
                            >
                              <tab.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Logout button */}
            <div className="mt-8">
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="
                  w-full text-left py-3 px-4 rounded-lg
                  flex items-center gap-3 text-sm font-normal
                  text-white/90 hover:text-white hover:bg-white/10
                  transition-all duration-200
                "
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <Sidebar collapsible="icon" className="w-80 hidden md:block">
        <SidebarHeader className="px-0 py-6 relative">
          <h1 className="text-xl font-bold block text-white text-center">
            {portalTitle}
          </h1>
        </SidebarHeader>

        <SidebarContent className="px-0">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {tabs.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  return (
                    <div key={group.id} className="space-y-1">
                      <SidebarMenuItem className="px-4">
                        <SidebarMenuButton
                          onClick={() => toggleGroup(group.id)}
                          className="
                            text-white/90 hover:text-white hover:bg-white/10
                            transition-all duration-200
                            py-3 px-4 rounded-lg
                            flex items-center justify-between
                            text-sm font-normal w-full
                          "
                        >
                          <div className="flex items-center gap-3">
                            <group.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="truncate">{group.label}</span>
                          </div>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {isExpanded && (
                        <div className="ml-4 space-y-1">
                          {group.children.map((tab) => {
                            const isActive = location.pathname === tab.path;
                            return (
                              <SidebarMenuItem key={tab.id} className="px-4">
                                <SidebarMenuButton
                                  asChild
                                  isActive={isActive}
                                  className={`
                                    text-white text-left w-full
                                    ${isActive ? 'bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/10'}
                                    transition-all duration-200
                                    py-2 px-4 rounded-lg
                                    flex items-center gap-3
                                    text-sm font-normal
                                  `}
                                >
                                  <NavLink to={tab.path} className="flex items-center gap-3 w-full">
                                    <tab.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{tab.label}</span>
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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