// import { LogOut } from "lucide-react"
// import { Button } from "./ui/button"
// import { useAuth } from "../hooks/useAuth";
// import { useNavigate } from "react-router-dom";
// import { useEffect } from "react";

// export const Headers = () => {
//     const { user, isAuthenticated, isLoading, logout } = useAuth();
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (!isLoading && (!isAuthenticated || !user)) {
//       navigate('/login');
//     }
//   }, [isAuthenticated, user, navigate, isLoading]);

//   if (isLoading) {
//     return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
//   }

//   if (!isAuthenticated || !user) {
//     return null;
//   }

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   const portalTitle = user.role === 'manager' ? 'Manager Portal' : 'Admin Portal';
//     return(
//         <header className="border-b bg-card p-4">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-4">
//                 {/* <SidebarTrigger /> */}
//                 <h1 className="text-2xl font-bold text-foreground">{portalTitle}</h1>
//               </div>
//               <div className="flex items-center gap-4">
//                 <span className="text-sm text-muted-foreground">
//                   Welcome, {user.username}
//                 </span>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={handleLogout}
//                   className="flex items-center gap-2"
//                 >
//                   <LogOut className="h-4 w-4" />
//                   Logout
//                 </Button>
//               </div>
//             </div>
//           </header>
//     )
// }

import { LogOut } from "lucide-react"
import { Button } from "./ui/button"
import { SidebarTrigger } from "./ui/sidebar"
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export const Headers = () => {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate, isLoading]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return(
    <header className="border-b border-[#004175]/20 bg-[#004175] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Mobile sidebar trigger */}
          <SidebarTrigger className="md:hidden text-white hover:bg-[#00325d]" />
          {/* You can remove the title here since it's now in the sidebar */}
          <div className="hidden md:block">
            {/* Optional: Add breadcrumbs or page title here instead */}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/80">
            Welcome, {user.username}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2 border-white/20 bg-transparent text-white hover:bg-[#00325d] hover:text-white hover:border-white/30 transition-all duration-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}