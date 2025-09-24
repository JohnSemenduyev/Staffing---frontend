import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/LoginContext';
import { graphQLClient, setGraphQLToken } from '../GraphqlClient';
import { ACCESS_TOKEN_REGENERATE } from '../graphql/mutation';
import { useToast } from '../hooks/use-toast';
import { MdLogin } from "react-icons/md";
import { Eye, EyeOff } from "lucide-react";
import { Button } from '../components/ui/button';
import img from "../assets/images/Logo.webp";

type RoleType = 'client' | 'admin' | 'manager' | 'guard';

interface RoleOption {
  value: RoleType;
  label: string;
}

const roleOptions: RoleOption[] = [
  { value: 'client', label: 'Client' },
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Management' },
  { value: 'guard', label: 'Security Officer' }
];

const Login = () => {
 const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<RoleType[] | null>(null);
  const navigate = useNavigate();
  const { token, roles, role, login, changeRoles } = useAuth();
  const { toast } = useToast();



const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

  const result = await login(username, password);
    if (result.success) {
      // If multiple roles, show selection screen
      // if (result.roles && result.roles.length > 0) {
        setPendingRoles(result.roles as RoleType[]);
      // } else {
      //   // Only one role, redirect immediately
      //   handleRedirect(result.roles?.[0] || role);
      // }
      toast({
        title: "Success",
        description: "Login successful",
        variant: "default"
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to login",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };
const handleRoleSelect = async (role: RoleType) => {
  setIsLoading(true);
  try {
    await changeRoles?.(role); // Only call context function
    setPendingRoles(null);
    handleRedirect(role);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to regenerate access token.",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};

  const handleSignupRedirect = () => {
    navigate('/signup'); // Redirect to signup page
  };
const handleRedirect = (role: string | null) => {
  let redirectPath = '/';
    if (role === 'admin') {
      redirectPath = '/assign-user-permission';
    } else if (role === 'manager') {
      redirectPath = '/prepare-schedule';
    }
    navigate(redirectPath);
  };
  if (pendingRoles && pendingRoles.length > 0) {
    return (
      <div className="h-screen flex flex-col md:flex-row overflow-hidden">
        {/* Left Side - Logo */}
        <div className="flex w-full md:w-[65%] bg-white flex-col items-center justify-center p-5 h-[40vh] md:h-full">
          <div className="flex items-center justify-center w-full h-full">
            <img 
              src={img}
              alt="Maximal Security - Complete Logo" 
              className="w-[90%] md:w-[90%] h-auto object-contain max-h-[35vh] md:max-h-[80vh]" 
            />
          </div>
        </div>
        {/* Right Side - Role Selection */}
        <div className="flex justify-center items-center bg-[#004175] w-full md:w-[35%] h-[60vh] md:h-full p-6">
          <div className="w-full max-w-md text-center">
            <h2 className="text-3xl font-bold text-white mb-8">Select User Role</h2>
            <div className="space-y-4">
              {pendingRoles.map((role) => (
                <Button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  variant="outline"
                  size="lg"
                  className="w-full border-white text-white hover:bg-white hover:text-[#004175]"
                >
                  {roleOptions.find((r) => r.value === role)?.label || role}
                </Button>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-white">
              Don't have an account?{' '}
              <Button 
                onClick={handleSignupRedirect}
                variant="primary"
                >
                Sign Up
              </Button>
            </p>
          </div>
          </div>
          
        </div>
      </div>
    );
  }
return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Logo */}
      <div className="flex w-full md:w-[65%] bg-white flex-col items-center justify-center p-5 min-h-[40vh] md:min-h-screen">
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src={img}
            alt="Maximal Security - Complete Logo" 
            className="w-[90%] md:w-[90%] h-auto object-contain max-h-[35vh] md:max-h-[80vh]" 
          />
        </div>
      </div>
      {/* Right Side - Login Form */}
      <div className="flex justify-center items-center bg-[#004175] w-full md:w-[35%] min-h-[60vh] md:min-h-screen p-6 overflow-y-auto">
        <div className="w-full max-w-md bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid">
          <h2 className="text-3xl font-bold text-center text-[#004175] mb-2">
            Login
          </h2>
          <p className="text-sm text-center text-gray-600 mb-6">Glad you're back!</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="E-mail"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex items-center text-sm">
              <input
                type="checkbox"
                id="remember"
                className="mr-2 h-4 w-4 text-[#004175] focus:ring-[#004175] border-gray-300 rounded"
              />
              <label htmlFor="remember" className="text-gray-700">
                Remember me
              </label>
            </div>
            <Button 
              type="submit" 
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <MdLogin className="w-4 h-4" />
                  Log In
                </>
              )}
            </Button>
            <div className="text-center">
              <a href="#" className="text-gray-600 hover:text-[#004175] text-sm">
                Forgot Password?
              </a>
            </div>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button 
                onClick={handleSignupRedirect}
                className="text-[#004175] hover:underline font-medium"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;