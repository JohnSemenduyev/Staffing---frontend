import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../hooks/useAuth';
import { LogOut } from 'lucide-react';

const AdminPortal = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const managerTabs = [
    { id: 'scheduling', label: 'Scheduling' },
    { id: 'prepare-schedule', label: 'Prepare Schedule' },
    { id: 'view-schedule', label: 'View Schedule' },
    { id: 'view-time-summary', label: 'View Time Summary' },
    { id: 'uniform-compliance', label: 'Uniform Compliance' },
    { id: 'notification', label: 'Notification' },
  ];

  const adminTabs = [
    { id: 'scheduling-geolocation', label: 'Scheduling and Geolocation' },
    { id: 'assign-user-permission', label: 'Assign User Permission' },
    { id: 'geolocation-setup', label: 'Geolocation Setup' },
    { id: 'time-setup', label: 'Time Setup' },
    { id: 'post-assignment', label: 'Post Assignment' },
  ];

  const tabs = user.role === 'manager' ? managerTabs : adminTabs;
  const portalTitle = user.role === 'manager' ? 'Manager Portal' : 'Admin Portal';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{portalTitle}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Tabs defaultValue={tabs[0].id} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 bg-muted p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-xs lg:text-sm whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4 text-card-foreground">
                  {tab.label}
                </h2>
                <p className="text-muted-foreground">
                  {tab.label} content will be displayed here.
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPortal;