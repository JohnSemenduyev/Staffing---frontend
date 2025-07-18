import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';
import { AppSidebar } from '../components/AppSidebar';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { LogOut } from 'lucide-react';

const Home = () => {
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

  const portalTitle = user.role === 'manager' ? 'Manager Portal' : 'Admin Portal';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1">
          {/* Header */}
          <header className="border-b bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold text-foreground">{portalTitle}</h1>
              </div>
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
          </header>

          {/* Main Content */}
          <main className="p-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4 text-card-foreground">
                Welcome to {portalTitle}
              </h2>
              <p className="text-muted-foreground">
                Select a section from the sidebar to get started.
              </p>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Home;