// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Button } from '../components/ui/button';
// import { Input } from '../components/ui/input';
// import { Label } from '../components/ui/label';
// import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
// import { useAuth } from '../hooks/useAuth';
// import { useToast } from '../hooks/use-toast';

// const Login = () => {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const { toast } = useToast();

// const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();
//   setIsLoading(true);

//   const success = login(username, password);

//   if (success) {
//     const storedUser = localStorage.getItem('admin_portal_user');
//     let redirectPath = '/';
//     if (storedUser) {
//       const user = JSON.parse(storedUser);
//       if (user.role === 'admin') {
//         redirectPath = '/assign-user-permission';
//       } else if (user.role === 'manager') {
//         redirectPath = '/prepare-schedule';
//       }
//     }

//     toast({
//       title: "Login successful",
//       description: "Welcome to the portal",
//     });

//     navigate(redirectPath);
//   } else {
//     toast({
//       title: "Login failed",
//       description: "Invalid credentials or user not authorized",
//       variant: "destructive",
//     });
//   }

//   setIsLoading(false);
// };


//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="text-center">
//           <CardTitle className="text-2xl font-bold">Admin Portal Login</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="username">Username</Label>
//               <Input
//                 id="username"
//                 type="text"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 placeholder="Enter your username"
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="password">Password</Label>
//               <Input
//                 id="password"
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="Enter your password"
//                 required
//               />
//             </div>
//             <Button type="submit" className="w-full" disabled={isLoading}>
//               {isLoading ? 'Logging in...' : 'Login'}
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default Login;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/LoginContext';
import {toast} from 'sonner'
import img from "../assets/images/Logo.webp";

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { token, role, login, logout } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(username, password);  // ✅ Await login here
    console.log(result);
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
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          {/* Login Header */}
          <h2 className="text-3xl font-bold text-center text-[#004175] mb-2">Login</h2>
          <p className="text-sm text-center text-gray-600 mb-6">Glad you're back!</p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <button 
                type="button"
                onClick={handleSignupRedirect}
                className="text-[#004175] hover:underline font-medium"
              >
                Create account
              </button>
              <a href="#" className="text-[#004175] hover:underline">
                Forgot password?
              </a>
            </div>

            <button 
              type="submit" 
              className="w-full py-2 px-4 rounded-md transition cursor-pointer bg-[#004175] text-white hover:bg-[#00325d] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Alternative: Signup Section at Bottom */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button 
                onClick={handleSignupRedirect}
                className="text-[#004175] hover:underline font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;