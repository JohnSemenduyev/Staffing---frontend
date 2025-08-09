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
  UserCheck,
  Briefcase,
  UserCog,
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
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/LoginContext';
const managerTabs = [

      { id: 'prepare-schedule', label: 'Prepare Schedule', icon: FileText, path: '/prepare-schedule' },
      { id: 'view-schedule', label: 'View Schedule', icon: Eye, path: '/view-schedule' },
      { id: 'view-time-summary', label: 'View Time Summary', icon: BarChart3, path: '/view-time-summary' },
      { id: 'uniform-compliance', label: 'Uniform Compliance', icon: Shield, path: '/uniform-compliance' },
      { id: 'notification', label: 'Notification', icon: Bell, path: '/notification' },
    ]
  
const adminTabs = [
  {
    id: 'assign-user-permission',
    label: 'Assign User Permission',
    icon: UserCheck, // More specific than Users
    path: '/assign-user-permission',
  },
  {
    id: 'geolocation-setup',
    label: 'Geolocation Setup',
    icon: MapPin,
    path: '/geolocation-setup',
  },
  {
    id: 'time-setup',
    label: 'Time Setup',
    icon: Clock,
    path: '/time-setup',
  },
  {
    id: 'post-assignment',
    label: 'Post Assignment',
    icon: Settings,
    path: '/post-assignment',
  },
  {
    id: 'parent',
    label: 'User List',
    icon: Users, // Makes sense for grouping users
    children: [
      {
        id: 'parent-dashboard-1',
        label: 'Client',
        icon: Briefcase, // Represents a business/client
        path: '/client',
      },
      {
        id: 'parent-dashboard-2',
        label: 'Guard',
        icon: Shield, // Security/guard
        path: '/guard',
      },
      {
        id: 'parent-dashboard-3',
        label: 'Manager',
        icon: UserCog, // Manager with settings role
        path: '/manager',
      },
      {
        id: 'parent-dashboard-4',
        label: 'Administrator',
        icon: UserCheck, // Admin/privileged
        path: '/admin',
      },
    ],
  },
  {
    id: 'client-list',
    label: 'Client List',
    icon: Briefcase,
    path: '/clientlist',
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
const { logout, role, token } = useAuth(); // ✅ Get role and token from auth context

    // Replace the user check with role check
    if (!role || !token) {
      console.log('🔒 Sidebar: No role or token found', { role, hasToken: !!token });
      return null;
    }
    console.log('🔍 Sidebar render:', { role, hasToken: !!token, state });

// Fix the tabs and portalTitle logic
const tabs = role === 'manager' ? managerTabs : adminTabs; // ✅ Use role instead of user.role
const portalTitle = role === 'manager' ? 'Manager Portal' : 'Scheduling - Admin Portal';   const isCollapsed = state === 'collapsed';

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

  // Helper function to render nested children
  const renderNestedChild = (child, isActive, marginLeft = 'ml-6') => {
    if (child.children) {
      // This is a nested parent with children
      const isExpanded = expandedGroups.has(child.id);
      return (
        <div key={child.id} className="space-y-1">
          <button
            onClick={() => toggleGroup(child.id)}
            className={`
              w-full text-left py-2 px-4 rounded-lg
              flex items-center justify-between text-sm font-normal
              transition-all duration-200 ${marginLeft}
              text-white/70 hover:text-white hover:bg-[#00325d]
            `}
          >
            <div className="flex items-center gap-3">
              <child.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{child.label}</span>
            </div>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {isExpanded && (
            <div className="space-y-1">
              {child.children.map((nestedChild) => {
                const nestedIsActive = location.pathname === nestedChild.path;
                return (
                  <button
                    key={nestedChild.id}
                    onClick={() => {
                      navigate(nestedChild.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      w-full text-left py-2 px-4 rounded-lg
                      flex items-center gap-3 text-sm font-normal
                      transition-all duration-200 ml-12
                      ${nestedIsActive ? 'bg-[#00325d] text-white' : 'text-white/70 hover:text-white hover:bg-[#00325d]'}
                    `}
                  >
                    <nestedChild.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{nestedChild.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    } else {
      // Regular child with path
      return (
        <button
          key={child.id}
          onClick={() => {
            navigate(child.path);
            setIsMobileMenuOpen(false);
          }}
          className={`
            w-full text-left py-2 px-4 rounded-lg
            flex items-center gap-3 text-sm font-normal
            transition-all duration-200 ${marginLeft}
            ${isActive ? 'bg-[#00325d] text-white' : 'text-white/70 hover:text-white hover:bg-[#00325d]'}
          `}
        >
          <child.icon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{child.label}</span>
        </button>
      );
    }
  };

  // Helper function for desktop nested children
  const renderDesktopNestedChild = (child, isActive, marginLeft = 'ml-4') => {
    if (child.children) {
      // This is a nested parent with children
      const isExpanded = expandedGroups.has(child.id);
      return (
        <div key={child.id} className="space-y-1">
          <SidebarMenuItem className="px-4">
            <SidebarMenuButton
              onClick={() => toggleGroup(child.id)}
              className={`
                text-white/70 hover:text-white hover:bg-[#00325d]
                transition-all duration-200
                py-2 px-4 rounded-lg
                flex items-center justify-between
                text-sm font-normal w-full ${marginLeft}
              `}
            >
              <div className="flex items-center gap-3">
                <child.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{child.label}</span>
              </div>
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isExpanded && (
            <div className="space-y-1">
              {child.children.map((nestedChild) => {
                const nestedIsActive = location.pathname === nestedChild.path;
                return (
                  <SidebarMenuItem key={nestedChild.id} className="px-4">
                    <SidebarMenuButton
                      asChild
                      isActive={nestedIsActive}
                      className={`
                        text-white text-left w-full ml-8
                        ${nestedIsActive ? 'bg-[#00325d]' : 'text-white/70 hover:text-white hover:bg-[#00325d]'}
                        transition-all duration-200
                        py-2 px-4 rounded-lg
                        flex items-center gap-3
                        text-sm font-normal
                      `}
                    >
                      <NavLink to={nestedChild.path} className="flex items-center gap-3 w-full">
                        <nestedChild.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{nestedChild.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </div>
          )}
        </div>
      );
    } else {
      // Regular child with path
      return (
        <SidebarMenuItem key={child.id} className="px-4 ">
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className={`
              text-white text-left w-full ${marginLeft}
              ${isActive ? 'bg-[#00325d]' : 'text-white/70 hover:text-white hover:bg-[#00325d]'}
              transition-all duration-200
              py-2 px-4 rounded-lg
              flex items-center gap-3
              text-sm font-normal
            `}
          >
            <NavLink to={child.path} className="flex items-center gap-3 w-full">
              <child.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{child.label}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
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
        fixed top-0 left-0 h-full w-64 bg-[#004175] z-50 transform transition-transform duration-300 ease-in-out md:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <h1 className="text-xl font-bold text-white">
              {portalTitle}
            </h1>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 text-white hover:bg-[#00325d] rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {tabs.map((item) => {
                if (item.children) {
                  // Item with children (like Parent Dashboard)
                  const isExpanded = expandedGroups.has(item.id);
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => toggleGroup(item.id)}
                        className="w-full text-left py-2 px-4 rounded-lg flex items-center justify-between text-sm font-normal text-white/90 hover:text-white hover:bg-[#00325d] transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {isExpanded && (
                        <div className="ml-6 space-y-1">
                          {item.children.map((child) => {
                            const isActive = location.pathname === child.path;
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  navigate(child.path);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`
                                  w-full text-left py-2 px-4 rounded-lg
                                  flex items-center gap-3 text-sm font-normal
                                  transition-all duration-200
                                  ${isActive ? 'bg-[#00325d] text-white' : 'text-white/70 hover:text-white hover:bg-[#00325d]'}
                                `}
                              >
                                <child.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{child.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // Regular item with path
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`
                        w-full text-left py-2 px-4 rounded-lg
                        flex items-center gap-3 text-sm font-normal
                        transition-all duration-200
                        ${isActive ? 'bg-[#00325d] text-white' : 'text-white/90 hover:text-white hover:bg-[#00325d]'}
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                }
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
                  w-full text-left py-2 px-4 rounded-lg
                  flex items-center gap-3 text-sm font-normal
                  text-white/90 hover:text-white hover:bg-[#00325d]
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
      <Sidebar collapsible="icon" className="w-64 hidden md:block">
        <SidebarHeader className="px-0 py-6 relative">
          <h1 className="text-xl font-bold block text-white text-center">
            {portalTitle}
          </h1>
        </SidebarHeader>

        <SidebarContent className="px-0">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {tabs.map((item) => {
                  if (item.children) {
                    // Item with children (like Parent Dashboard)
                    const isExpanded = expandedGroups.has(item.id);
                    return (
                      <div key={item.id} className="space-y-1">
                        <SidebarMenuItem className="px-4">
                          <SidebarMenuButton
                            onClick={() => toggleGroup(item.id)}
                            className="
                              text-white/90 hover:text-white hover:bg-[#00325d]
                              transition-all duration-200
                              py-2 px-4 rounded-lg
                              flex items-center justify-between
                              text-sm font-normal w-full
                            "
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isExpanded && (
                          <div className="ml-4 space-y-1">
                            {item.children.map((child) => {
                              const isActive = location.pathname === child.path;
                              return (
                                <SidebarMenuItem key={child.id} className="px-4">
                                  <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    className={`
                                      text-white text-left w-full
                                      ${isActive ? 'bg-[#00325d]' : 'text-white/70 hover:text-white hover:bg-[#00325d]'}
                                      transition-all duration-200
                                      py-2 px-4 rounded-lg
                                      flex items-center gap-3
                                      text-sm font-normal
                                    `}
                                  >
                                    <NavLink to={child.path} className="flex items-center gap-3 w-full">
                                      <child.icon className="w-4 h-4 flex-shrink-0" />
                                      <span className="truncate">{child.label}</span>
                                    </NavLink>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Regular item with path
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.id} className="px-4">
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={`
                            text-white text-left w-full
                            ${isActive ? 'bg-[#00325d]' : 'text-white/90 hover:text-white hover:bg-[#00325d]'}
                            transition-all duration-200
                            py-2 px-4 rounded-lg
                            flex items-center gap-3
                            text-sm font-normal
                          `}
                        >
                          <NavLink to={item.path} className="flex items-center gap-3 w-full">
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
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
                      text-white/90 hover:text-white hover:bg-[#00325d]
                      transition-all duration-200
                      py-2 px-4 rounded-lg
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