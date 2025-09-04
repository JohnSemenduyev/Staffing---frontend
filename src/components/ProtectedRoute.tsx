// src/components/ProtectedRoute.tsx
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/LoginContext";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { role, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token || !role) return;

    if (!allowedRoles.includes(role)) {
      // countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            handleRedirect();
            clearInterval(timer);
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

  if (isLoading) return <div>Loading...</div>;

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-2xl font-bold text-red-600">
          🚫 You are not authorized to access this page
        </h1>
        <p className="text-gray-700">
          Redirecting you to your accessable page in{" "}
          <span className="font-semibold">{countdown}</span> seconds...
        </p>
        <button
          onClick={handleRedirect}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back Now
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
