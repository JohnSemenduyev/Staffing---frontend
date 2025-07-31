import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (!formData.name || !formData.email || !formData.role || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Add your signup API call here
      // const response = await signupAPI(formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Account created successfully",
        description: "Welcome to Maximal Security! Please login with your credentials.",
      });

      // Redirect to login page
      navigate('/login');
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Logo */}
      <div className="flex w-full md:w-[65%] bg-white flex-col items-center justify-center p-5 min-h-[40vh] md:min-h-screen">
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src="src/assets/images/Logo.webp" 
            alt="Maximal Security - Complete Logo" 
            className="w-[90%] md:w-[90%] h-auto object-contain max-h-[35vh] md:max-h-[80vh]" 
          />
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex justify-center items-center bg-[#004175] w-full md:w-[35%] min-h-[60vh] md:min-h-screen p-6 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          {/* Signup Header */}
          <h2 className="text-3xl font-bold text-center text-[#004175] mb-2">Sign Up</h2>
          <p className="text-sm text-center text-gray-600 mb-6">Create your account to get started!</p>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] bg-white"
                required
              >
                <option value="">Select your role</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
                <option value="security">Security Officer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-2 px-4 rounded-md transition cursor-pointer bg-[#004175] text-white hover:bg-[#00325d] mt-6"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="text-center text-sm mt-4">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-[#004175] hover:underline font-medium"
              >
                Already have an account? <span className="font-semibold">Sign In</span>
              </button>
            </div>
          </form>

          {/* Terms and Privacy */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-[#004175] hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-[#004175] hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;