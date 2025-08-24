import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { Plus } from 'lucide-react';
import AddressComponent, { AddressData } from '../components/Address';
import { useUserRegistration } from '../context/SignupContext';
import img from "../assets/images/Logo.webp";

interface SignupFormData {
  name: string;
  lastname: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role: string;
  company?: string; // Added company field for clients
  addresses: AddressData[];
}

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

const Signup = () => {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    lastname: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: '',
    company: '',
    addresses: [{ address: '', city: '', state: '', zipcode: '' }]
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createUser, createClientRegistration, loading: contextLoading } = useUserRegistration();

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
    setFormData(prev => ({
      ...prev,
      role: role,
      // Reset addresses when role changes
      addresses: [{ address: '', city: '', state: '', zipcode: '' }]
    }));
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setFormData(prev => ({
      ...prev,
      role: '',
      addresses: [{ address: '', city: '', state: '', zipcode: '' }]
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setFormData(prev => ({
      ...prev,
      role: newRole,
      // Reset addresses when role changes
      addresses: [{ address: '', city: '', state: '', zipcode: '' }]
    }));
  };

  const handleAddressChange = (index: number, updatedAddress: AddressData) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((addr, i) => 
        i === index ? updatedAddress : addr
      )
    }));
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, { address: '', city: '', state: '', zipcode: '' }]
    }));
  };

  const removeAddress = (index: number) => {
    if (formData.addresses.length > 1) {
      setFormData(prev => ({
        ...prev,
        addresses: prev.addresses.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (!formData.name || !formData.lastname || !formData.email || !formData.phoneNumber || !formData.role || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Password validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate addresses
    const invalidAddresses = formData.addresses.some(addr => 
      !addr.address || !addr.city || !addr.state || !addr.zipcode
    );

    if (invalidAddresses) {
      toast({
        title: "Error",
        description: "Please fill in all address fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (formData.role === 'client') {
        // Handle client role with actual API call
        const clientData = {
          name: formData.name,
          lastName: formData.lastname,
          email: formData.email,
          phone: formData.phoneNumber,
          company: formData.company || undefined,
          password: formData.password,
          role: formData.role.toLowerCase() as 'client',
          addresses: formData.addresses.map((addr, index) => ({
            label: `Address ${index + 1}`, // Default label
            address: addr.address,
            city: addr.city,
            state: addr.state,
            pincode: addr.zipcode, // Map zipcode to pincode
            industry: undefined // Optional field
          }))
        };

        // console.log('🚀 Client Registration Data:', clientData);

        const result = await createClientRegistration(clientData);

        if (result.success) {
          toast({
            title: "Account created successfully",
            description: "Welcome to Maximal Security! Please login with your credentials.",
          });
          navigate('/login');
        } else {
          toast({
            title: "Signup failed",
            description: result.error || "Failed to create client account. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Handle admin, manager, guard roles with existing API call
        const userData = {
          name: formData.name,
          lastName: formData.lastname,
          email: formData.email,
          phone: formData.phoneNumber,
          password: formData.password,
          role: formData.role.toLowerCase() as 'admin' | 'manager' | 'guard',
          address: formData.addresses[0].address,
          city: formData.addresses[0].city,
          state: formData.addresses[0].state,
          zipcode: formData.addresses[0].zipcode,
        };

        // console.log('🚀 User Registration Data:', userData);

        const result = await createUser(userData);

        if (result.success) {
          toast({
            title: "Account created successfully",
            description: "Welcome to Maximal Security! Please login with your credentials.",
          });
          navigate('/login');
        } else {
          toast({
            title: "Signup failed",
            description: result.error || "Failed to create account. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('❌ Signup Error:', error);
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

  const isClient = formData.role === 'client';

  // Role Selection Screen
  if (!selectedRole) {
    return (
      <div className="h-screen flex flex-col md:flex-row overflow-hidden">
        {/* Left Side - Logo (Fixed) */}
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
            {/* Role Selection Header */}
            <h2 className="text-3xl font-bold text-white mb-8">Select User</h2>
            
            {/* Role Buttons */}
            <div className="space-y-4">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className="w-full py-3 px-6 bg-transparent border border-white text-white rounded-md hover:bg-white hover:text-[#004175] transition-colors duration-200 font-medium"
                >
                  {role.label}
                </button>
              ))}
            </div>

            {/* Back to Login */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-white hover:underline font-medium"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signup Form Screen
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Left Side - Logo (Fixed) */}
      <div className="flex w-full md:w-[65%] bg-white flex-col items-center justify-center p-5 h-[40vh] md:h-full">
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src={img}
            alt="Maximal Security - Complete Logo" 
            className="w-[90%] md:w-[90%] h-auto object-contain max-h-[35vh] md:max-h-[80vh]" 
          />
        </div>
      </div>

      {/* Right Side - Signup Form (Scrollable) */}
      <div className="flex justify-center items-start bg-[#004175] w-full md:w-[35%] h-[60vh] md:h-full overflow-y-auto">
        <div className="w-full max-w-md p-6 my-4 mx-4">
          {/* Signup Header */}
          <h2 className="text-3xl font-bold text-center text-white mb-2">{roleOptions.find(r => r.value === selectedRole)?.label} Sign Up</h2>
          <p className="text-sm text-center text-gray-300 mb-6">Create your account to get started!</p>

         

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="First Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleInputChange}
                  placeholder="Last Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="Phone Number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                required
              />
            </div>

            {/* Company Field - Only for Clients */}
            {isClient && (
              <div>
                <input
                  type="text"
                  name="company"
                  value={formData.company || ''}
                  onChange={handleInputChange}
                  placeholder="Company"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                />
              </div>
            )}

                         {/* Address Section - Different for each role */}
             {isClient ? (
               // Client: Single address with custom styling (no white background)
               <div className="space-y-4">
                                  {formData.addresses.map((address, index) => (
                   <div key={index} className="space-y-4">
                     {/* Address Fields */}
                     <div className="space-y-4">
                      <input
                        type="text"
                        value={address.address}
                        onChange={(e) => handleAddressChange(index, { ...address, address: e.target.value })}
                        placeholder="Street Address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                        required
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) => handleAddressChange(index, { ...address, city: e.target.value })}
                          placeholder="City"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                          required
                        />
                        <input
                          type="text"
                          value={address.state}
                          onChange={(e) => handleAddressChange(index, { ...address, state: e.target.value })}
                          placeholder="State"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                          required
                        />
                      </div>
                      
                      <input
                        type="text"
                        value={address.zipcode}
                        onChange={(e) => handleAddressChange(index, { ...address, zipcode: e.target.value })}
                        placeholder="Zip Code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Non-client roles: Simple address fields
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.addresses[0].address}
                  onChange={(e) => handleAddressChange(0, { ...formData.addresses[0], address: e.target.value })}
                  placeholder="Street Address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                  required
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.addresses[0].city}
                    onChange={(e) => handleAddressChange(0, { ...formData.addresses[0], city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                    required
                  />
                  <input
                    type="text"
                    value={formData.addresses[0].state}
                    onChange={(e) => handleAddressChange(0, { ...formData.addresses[0], state: e.target.value })}
                    placeholder="State"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                    required
                  />
                </div>
                
                <input
                  type="text"
                  value={formData.addresses[0].zipcode}
                  onChange={(e) => handleAddressChange(0, { ...formData.addresses[0], zipcode: e.target.value })}
                  placeholder="Zip Code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                  required
                />
              </div>
            )}

            {/* Password */}
            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                required
              />
            </div>

                         {/* Confirm Password */}
             <div>
               <input
                 type="password"
                 name="confirmPassword"
                 value={formData.confirmPassword}
                 onChange={handleInputChange}
                 placeholder="Confirm Password"
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-white text-gray-900 text-sm"
                 required
               />
             </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full py-2 px-4 rounded-md transition cursor-pointer bg-white text-[#004175] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed mt-6 font-medium"
              disabled={isLoading || contextLoading}
            >
              {(isLoading || contextLoading) ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Back to Role Selection */}
            <div className="text-center text-sm mt-4">
              <button
                type="button"
                onClick={handleBackToRoleSelection}
                className="text-white hover:text-yellow-300 font-medium"
              >
                ← Back to Role Selection
              </button>
            </div>

            {/* Back to Login */}
            <div className="text-center text-sm mt-2">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-white hover:text-yellow-300 font-medium"
              >
                Already have an account? <span className="font-semibold">Sign In</span>
              </button>
            </div>
          </form>

          {/* Terms and Privacy */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-300">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-white hover:text-yellow-300 underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-white hover:text-yellow-300 underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;