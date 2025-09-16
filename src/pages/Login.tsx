import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/LoginContext';
import {toast} from 'sonner'
import { MdLogin } from "react-icons/md";
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
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { token, role, login, logout } = useAuth();

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(username, password);  // ✅ Await login here
    // console.log(result);
    if (result.success) {
      const storedRole = localStorage.getItem('role'); // ✅ Get role from localStorage
      let redirectPath = '/';
      if (storedRole === 'admin') {
        redirectPath = '/assign-user-permission';
      } else if (storedRole === 'manager') {
        redirectPath = '/prepare-schedule';
      }

      toast.success("login Successfull")

      navigate(redirectPath);
    } else {
      
      toast.error("Failed To login");
    }

    setIsLoading(false);
  };

  const handleSignupRedirect = () => {
    navigate('/signup'); // Redirect to signup page
  };

  // Role Selection Screen - COMMENTED OUT FOR NOW
  // if (!selectedRole) {
  //   return (
  //     <div className="h-screen flex flex-col md:flex-row overflow-hidden">
  //       {/* Left Side - Logo (Fixed) */}
  //       <div className="flex w-full md:w-[65%] bg-white flex-col items-center justify-center p-5 h-[40vh] md:h-full">
  //         <div className="flex items-center justify-center w-full h-full">
  //           <img 
  //             src={img}
  //             alt="Maximal Security - Complete Logo" 
  //             className="w-[90%] md:w-[90%] h-auto object-contain max-h-[35vh] md:max-h-[80vh]" 
  //           />
  //         </div>
  //       </div>

  //       {/* Right Side - Role Selection */}
  //       <div className="flex justify-center items-center bg-[#004175] w-full md:w-[35%] h-[60vh] md:h-full p-6">
  //         <div className="w-full max-w-md text-center">
  //           {/* Role Selection Header */}
  //           <h2 className="text-3xl font-bold text-white mb-8"> Select User </h2>
  //           
  //           {/* Role Buttons */}
  //           <div className="space-y-4">
  //             {roleOptions.map((role) => (
  //               <Button
  //                 key={role.value}
  //                 onClick={() => handleRoleSelect(role.value)}
  //                 variant="outline"
  //                 size="lg"
  //                 className="w-full border-white text-white hover:bg-white hover:text-[#004175]"
  //               >
  //                 {role.label}
  //               </Button>
  //             ))}
  //           </div>

  //           {/* Sign Up Link */}
  //           <div className="mt-8">
  //             <p className="text-white text-sm mb-2">
  //               Don't have an account?
  //             </p>
  //             <Button
  //               type="button"
  //               onClick={handleSignupRedirect}
  //               variant="link"
  //               className="text-white hover:underline font-medium"
  //             >
  //               Sign Up
  //             </Button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Login Form Screen
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
          {/* Login Header */}
          <h2 className="text-3xl font-bold text-center text-[#004175] mb-2">
            {roleOptions.find(r => r.value === selectedRole)?.label} Login
          </h2>
          <p className="text-sm text-center text-gray-600 mb-6">Glad you're back!</p>

          {/* Login Form */}
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

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
              />
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

          {/* Back to Role Selection - COMMENTED OUT FOR NOW */}
          {/* <div className="text-center text-sm mt-4">
            <Button
              type="button"
              onClick={handleBackToRoleSelection}
              variant="link"
              className="text-[#004175] hover:text-blue-600 font-medium"
            >
              ← Back to Role Selection
            </Button>
          </div> */}

          {/* Alternative: Signup Section at Bottom */}
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