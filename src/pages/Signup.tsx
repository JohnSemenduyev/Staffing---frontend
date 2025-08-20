// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useToast } from '../hooks/use-toast';
// import { Plus } from 'lucide-react';
// import AddressComponent, { AddressData } from '../components/Address';
// import { useUserRegistration } from '../context/SignupContext';
// import img from "../assets/images/Logo.webp";

// interface SignupFormData {
//   name: string;
//   lastname: string;
//   email: string;
//   phoneNumber: string;
//   password: string;
//   role: string;
//   company?: string; // Added company field for clients
//   addresses: AddressData[];
// }

// const Signup = () => {
//   const [formData, setFormData] = useState<SignupFormData>({
//     name: '',
//     lastname: '',
//     email: '',
//     phoneNumber: '',
//     password: '',
//     role: '',
//     company: '',
//     addresses: [{ address: '', city: '', state: '', zipcode: '' }]
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const navigate = useNavigate();
//   const { toast } = useToast();
//   const { createUser, createClientRegistration, loading: contextLoading } = useUserRegistration();

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const newRole = e.target.value;
//     setFormData(prev => ({
//       ...prev,
//       role: newRole,
//       // Reset addresses when role changes
//       addresses: [{ address: '', city: '', state: '', zipcode: '' }]
//     }));
//   };

//   const handleAddressChange = (index: number, updatedAddress: AddressData) => {
//     setFormData(prev => ({
//       ...prev,
//       addresses: prev.addresses.map((addr, i) => 
//         i === index ? updatedAddress : addr
//       )
//     }));
//   };

//   const addAddress = () => {
//     setFormData(prev => ({
//       ...prev,
//       addresses: [...prev.addresses, { address: '', city: '', state: '', zipcode: '' }]
//     }));
//   };

//   const removeAddress = (index: number) => {
//     if (formData.addresses.length > 1) {
//       setFormData(prev => ({
//         ...prev,
//         addresses: prev.addresses.filter((_, i) => i !== index)
//       }));
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);

//     // Basic validation
//     if (!formData.name || !formData.lastname || !formData.email || !formData.phoneNumber || !formData.role || !formData.password) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       });
//       setIsLoading(false);
//       return;
//     }

//     // Validate addresses
//     const invalidAddresses = formData.addresses.some(addr => 
//       !addr.address || !addr.city || !addr.state || !addr.zipcode
//     );

//     if (invalidAddresses) {
//       toast({
//         title: "Error",
//         description: "Please fill in all address fields",
//         variant: "destructive",
//       });
//       setIsLoading(false);
//       return;
//     }

//     try {
//       if (formData.role === 'client') {
//         // Handle client role with actual API call
//         const clientData = {
//           name: formData.name,
//           lastName: formData.lastname,
//           email: formData.email,
//           phone: formData.phoneNumber,
//           company: formData.company || undefined,
//           password: formData.password,
//           addresses: formData.addresses.map((addr, index) => ({
//             label: `Address ${index + 1}`, // Default label
//             address: addr.address,
//             city: addr.city,
//             state: addr.state,
//             pincode: addr.zipcode, // Map zipcode to pincode
//             industry: undefined // Optional field
//           }))
//         };

//         console.log('🚀 Client Registration Data:', clientData);

//         const result = await createClientRegistration(clientData);

//         if (result.success) {
//           toast({
//             title: "Account created successfully",
//             description: "Welcome to Maximal Security! Please login with your credentials.",
//           });
//           navigate('/login');
//         } else {
//           toast({
//             title: "Signup failed",
//             description: result.error || "Failed to create client account. Please try again.",
//             variant: "destructive",
//           });
//         }
//       } else {
//         // Handle admin, manager, guard roles with existing API call
//         const userData = {
//           name: formData.name,
//           lastName: formData.lastname,
//           email: formData.email,
//           phone: formData.phoneNumber,
//           password: formData.password,
//           role: formData.role.toLowerCase() as 'admin' | 'manager' | 'guard',
//           address: formData.addresses[0].address,
//           city: formData.addresses[0].city,
//           state: formData.addresses[0].state,
//           zipcode: formData.addresses[0].zipcode,
//         };

//         console.log('🚀 User Registration Data:', userData);

//         const result = await createUser(userData);

//         if (result.success) {
//           toast({
//             title: "Account created successfully",
//             description: "Welcome to Maximal Security! Please login with your credentials.",
//           });
//           navigate('/login');
//         } else {
//           toast({
//             title: "Signup failed",
//             description: result.error || "Failed to create account. Please try again.",
//             variant: "destructive",
//           });
//         }
//       }
//     } catch (error) {
//       console.error('❌ Signup Error:', error);
//       toast({
//         title: "Signup failed",
//         description: "Failed to create account. Please try again.",
//         variant: "destructive",
//       });
//     }

//     setIsLoading(false);
//   };

//   const handleBackToLogin = () => {
//     navigate('/login');
//   };

//   const isClient = formData.role === 'client';

//   return (
//     <div className="min-h-screen flex flex-col md:flex-row">
//       {/* Left Side - Logo */}
//       <div className="flex w-full md:w-[65%] bg-white flex-col items-center justify-center p-5 min-h-[40vh] md:min-h-screen">
//         <div className="flex items-center justify-center w-full h-full">
//           <img 
//             src={img}
//             alt="Maximal Security - Complete Logo" 
//             className="w-[90%] md:w-[90%] h-auto object-contain max-h-[35vh] md:max-h-[80vh]" 
//           />
//         </div>
//       </div>

//       {/* Right Side - Signup Form */}
//       <div className="flex justify-center items-start bg-[#004175] w-full md:w-[35%] min-h-[60vh] md:min-h-screen p-6 overflow-y-auto">
//         <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 my-4">
//           {/* Signup Header */}
//           <h2 className="text-3xl font-bold text-center text-[#004175] mb-2">Sign Up</h2>
//           <p className="text-sm text-center text-gray-600 mb-6">Create your account to get started!</p>

//           {/* Signup Form */}
//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* Name Row */}
//             <div className="grid grid-cols-2 gap-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   First Name
//                 </label>
//                 <input
//                   type="text"
//                   name="name"
//                   value={formData.name}
//                   onChange={handleInputChange}
//                   placeholder="John"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Last Name
//                 </label>
//                 <input
//                   type="text"
//                   name="lastname"
//                   value={formData.lastname}
//                   onChange={handleInputChange}
//                   placeholder="Doe"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//                   required
//                 />
//               </div>
//             </div>

//             {/* Email */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 name="email"
//                 value={formData.email}
//                 onChange={handleInputChange}
//                 placeholder="you@example.com"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//                 required
//               />
//             </div>

//             {/* Phone Number */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Phone Number
//               </label>
//               <input
//                 type="tel"
//                 name="phoneNumber"
//                 value={formData.phoneNumber}
//                 onChange={handleInputChange}
//                 placeholder="+1 (555) 123-4567"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//                 required
//               />
//             </div>

//             {/* Role */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Role
//               </label>
//               <select
//                 name="role"
//                 value={formData.role}
//                 onChange={handleRoleChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] bg-white text-sm"
//                 required
//               >
//                 <option value="">Select your role</option>
//                 <option value="admin">Admin</option>
//                 <option value="manager">Manager</option>
//                 <option value="guard">Guard</option>
//                 <option value="client">Client</option>
//               </select>
//             </div>

//             {/* Company Field - Only for Clients */}
//             {isClient && (
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Company
//                 </label>
//                 <input
//                   type="text"
//                   name="company"
//                   value={formData.company || ''}
//                   onChange={handleInputChange}
//                   placeholder="Your Company Name"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//                 />
//               </div>
//             )}

//             {/* Addresses Section */}
//             {formData.role && (
//               <div className="space-y-4">
//                 <div className="flex justify-between items-center">
//                   <label className="block text-sm font-medium text-gray-700">
//                     {isClient ? 'Addresses' : 'Address'}
//                   </label>
//                   {isClient && (
//                     <button
//                       type="button"
//                       onClick={addAddress}
//                       className="flex items-center gap-1 text-[#004175] hover:text-[#00325d] text-sm font-medium"
//                     >
//                       <Plus size={16} />
//                       Add Address
//                     </button>
//                   )}
//                 </div>

//                 {formData.addresses.map((address, index) => (
//                   <AddressComponent
//                     key={index}
//                     address={address}
//                     onChange={(updatedAddress) => handleAddressChange(index, updatedAddress)}
//                     onRemove={isClient ? () => removeAddress(index) : undefined}
//                     showRemoveButton={isClient && formData.addresses.length > 1}
//                     index={isClient ? index : undefined}
//                   />
//                 ))}
//               </div>
//             )}

//             {/* Password */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Password
//               </label>
//               <input
//                 type="password"
//                 name="password"
//                 value={formData.password}
//                 onChange={handleInputChange}
//                 placeholder="••••••••"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//                 required
//               />
//             </div>

//             {/* Submit Button */}
//             <button 
//               type="submit" 
//               className="w-full py-2 px-4 rounded-md transition cursor-pointer bg-[#004175] text-white hover:bg-[#00325d] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
//               disabled={isLoading || contextLoading}
//             >
//               {(isLoading || contextLoading) ? 'Creating Account...' : 'Create Account'}
//             </button>

//             {/* Back to Login */}
//             <div className="text-center text-sm mt-4">
//               <button
//                 type="button"
//                 onClick={handleBackToLogin}
//                 className="text-[#004175] hover:underline font-medium"
//               >
//                 Already have an account? <span className="font-semibold">Sign In</span>
//               </button>
//             </div>
//           </form>

//           {/* Terms and Privacy */}
//           <div className="mt-4 text-center">
//             <p className="text-xs text-gray-500">
//               By creating an account, you agree to our{' '}
//               <a href="#" className="text-[#004175] hover:underline">Terms of Service</a>
//               {' '}and{' '}
//               <a href="#" className="text-[#004175] hover:underline">Privacy Policy</a>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Signup;
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
  role: string;
  company?: string; // Added company field for clients
  addresses: AddressData[];
}

const Signup = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    lastname: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: '',
    company: '',
    addresses: [{ address: '', city: '', state: '', zipcode: '' }]
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createUser, createClientRegistration, loading: contextLoading } = useUserRegistration();

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
    if (!formData.name || !formData.lastname || !formData.email || !formData.phoneNumber || !formData.role || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
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
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 my-4 mx-4">
          {/* Signup Header */}
          <h2 className="text-3xl font-bold text-center text-[#004175] mb-2">Sign Up</h2>
          <p className="text-sm text-center text-gray-600 mb-6">Create your account to get started!</p>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
                  required
                />
              </div>
            </div>

            {/* Email */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
                required
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
                required
              />
            </div>
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleRoleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] bg-white text-sm"
                required
              >
                <option value="">Select your role</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="guard">Guard</option>
                <option value="client">Client</option>
              </select>
            </div>

            {/* Company Field - Only for Clients */}
            {isClient && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company || ''}
                  onChange={handleInputChange}
                  placeholder="Your Company Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
                />
              </div>
            )}

            {/* Addresses Section */}
            {formData.role && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    {isClient ? 'Addresses' : ''}
                  </label>
                  {isClient && (
                    <button
                      type="button"
                      onClick={addAddress}
                      className="flex items-center gap-1 text-[#004175] hover:text-[#00325d] text-sm font-medium"
                    >
                      <Plus size={16} />
                      Add Address
                    </button>
                  )}
                </div>

                {formData.addresses.map((address, index) => (
                  <AddressComponent
                    key={index}
                    address={address}
                    onChange={(updatedAddress) => handleAddressChange(index, updatedAddress)}
                    onRemove={isClient ? () => removeAddress(index) : undefined}
                    showRemoveButton={isClient && formData.addresses.length > 1}
                    index={isClient ? index : undefined}
                  />
                ))}
              </div>
            )}

            {/* Password */}
            

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full py-2 px-4 rounded-md transition cursor-pointer bg-[#004175] text-white hover:bg-[#00325d] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              disabled={isLoading || contextLoading}
            >
              {(isLoading || contextLoading) ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Back to Login */}
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
          <div className="mt-4 text-center">
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