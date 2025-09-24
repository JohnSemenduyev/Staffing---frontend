// src/components/ProtectedRoute.tsx
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/LoginContext";
import { Button } from "./ui/button";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { role, token, isLoading } = useAuth();
  const navigate = useNavigate();
const [countdown, setCountdown] = useState(5);

useEffect(() => {
  setCountdown(5);

  if (!token || !role) return;

  if (!allowedRoles.includes(role)) {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }
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

  
  // if (isLoading || role === null) {
  //   return <div>Loading...</div>; // or spinner component
  // }
  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-2xl font-bold text-red-600">
          🚫 Wait... while we check if you are authorized to access this page with selected role
        </h1>
        <p className="text-gray-700">
          Redirecting you to your accessible page in{" "}
          <span className="font-semibold">{countdown}</span> seconds...
        </p>
        <Button
          onClick={handleRedirect}
          variant="primary"
        >
          Go Back Now
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
