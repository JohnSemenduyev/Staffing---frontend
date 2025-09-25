import { ReactNode, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/LoginContext";
import { Button } from "./ui/button";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { role, token, isLoading, changeRoles } = useAuth();
  const navigate = useNavigate();
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token || !role) return;

   if (!allowedRoles.includes(role)) {
  setIsCheckingAccess(true);
  setIsAuthorized(null);

  try {
    changeRoles?.(role);
    setIsCheckingAccess(false);
    setIsAuthorized(true);
    handleRedirect();
  } catch {
    setIsCheckingAccess(false);
    setIsAuthorized(false);
  }
} else {
  setIsAuthorized(true);
  setIsCheckingAccess(false);
}
    // eslint-disable-next-line
  }, [role, token, allowedRoles]);

  const handleRedirect = () => {
    if (role === "admin") {
      navigate("/assign-user-permission", { replace: true });
    } else if (role === "manager") {
      navigate("/prepare-schedule", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    if (isCheckingAccess || isAuthorized === null) {
      // Show spinner while checking
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <h1 className="text-2xl font-bold text-red-600">
            🚫 Wait... while we check if you are authorized to access this page with selected role
          </h1>
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-gray-700">Checking authorization...</span>
          </div>
        </div>
      );
    }
    if (isAuthorized === false) {
      // Show not authorized message
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <h1 className="text-2xl font-bold text-red-600">
            🚫 You are not authorized for this role
          </h1>
          <Button
            onClick={handleRedirect}
            variant="primary"
          >
            Go Back
          </Button>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;