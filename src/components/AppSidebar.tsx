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
  X,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Briefcase,
  UserCog,
} from 'lucide-react';
import { MdLogout } from "react-icons/md";
import { twMerge } from "tailwind-merge";
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/LoginContext';

const managerTabs = [
  { id: 'prepare-schedule', label: 'Prepare Schedule', icon: FileText, path: '/prepare-schedule' },
  { id: 'view-schedule', label: 'View Schedule', icon: Eye, path: '/view-schedule' },
  { id: 'view-time-summary', label: 'View Time Summary', icon: BarChart3, path: '/view-time-summary' },
  { id: 'uniform-compliance', label: 'Uniform Compliance', icon: Shield, path: '/uniform-compliance' },
  { id: 'notification', label: 'Notification', icon: Bell, path: '/notification' },
];

const adminTabs = [
  {
    id: 'assign-user-permission',
    label: 'Assign User Permission',
    icon: UserCheck,
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
    icon: Users,
    children: [
      {
        id: 'parent-dashboard-1',
        label: 'Client',
        icon: Briefcase,
        path: '/client',
      },
      {
        id: 'parent-dashboard-2',
        label: 'Guard',
        icon: Shield,
        path: '/guard',
      },
      {
        id: 'parent-dashboard-3',
        label: 'Manager',
        icon: UserCog,
        path: '/manager',
      },
      {
        id: 'parent-dashboard-4',
        label: 'Administrator',
        icon: UserCheck,
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
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const { logout, role, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (!role || !token) {
    return null;
  }

  const tabs = role === 'manager' ? managerTabs : adminTabs;
  const portalTitle = role === 'manager' ? 'Manager Portal' : 'Administrator Portal';

  const onClose = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleGroup = (groupId) => {
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

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="sm:hidden fixed top-2 left-4 z-50 bg-white p-2 rounded shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu size={18} />
      </button>

      {/* Mobile Overlay */}
      <div
        className={twMerge(
          "fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden transition-opacity",
          isOpen ? "block" : "hidden"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={twMerge(
          "fixed sm:static top-0 left-0 w-64 h-full bg-[#004175] text-white p-5 z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "sm:translate-x-0 sm:block"
        )}
      >
        <h1 className="text-2xl font-bold mb-6 block text-white">
          {portalTitle}
        </h1>

        <nav className="space-y-2">
          {tabs.map((item) => {
            if (item.children) {
              // Item with children
              const isExpanded = expandedGroups.has(item.id);
              return (
                <div key={item.id}>
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className="flex items-center justify-between gap-3 px-4 py-2 rounded transition hover:bg-[#00325d] w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="text-white w-4 h-4"/>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  </button>
                  {isExpanded && (
                    <div>
                      {item.children.map((child) => {
                        const isActive = location.pathname === child.path;
                        return (
                          <button
                            key={child.id}
                            onClick={() => handleNavigation(child.path)}
                            className={twMerge(
                              "flex items-center gap-3 px-4 py-2 mt-0 rounded transition hover:bg-[#00325d] w-full text-left ml-6",
                              isActive ? "bg-[#00325d] font-semibold" : ""
                            )}
                          >
                            <child.icon className="text-white w-4 h-4"/>
                            <span className="text-sm">{child.label}</span>
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
                  onClick={() => handleNavigation(item.path)}
                  className={twMerge(
                    "flex items-center gap-3 px-4 py-2 rounded transition hover:bg-[#00325d] w-full text-left",
                    isActive ? "bg-[#00325d] font-semibold" : ""
                  )}
                >
                  <item.icon className="text-white w-4 h-4"/>
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            }
          })}
          <button
            onClick={() => {
              handleLogout();
              onClose();
            }}
            className="flex items-center gap-3 px-4 py-2 rounded transition hover:bg-[#00325d] w-full text-left"
          >
            <MdLogout size={18} />
            <span className="text-sm">Logout</span>
          </button>
        </nav>
      </aside>
    </>
  );
}