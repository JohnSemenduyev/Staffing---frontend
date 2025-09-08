// import React from 'react';
// import { FaRegTrashAlt } from 'react-icons/fa';

// interface AddressData {
//   address: string;
//   city: string;
//   state: string;
//   zipcode: string;
// }

// interface AddressComponentProps {
//   address: AddressData;
//   onChange: (address: AddressData) => void;
//   onRemove?: () => void;
//   showRemoveButton?: boolean;
//   index?: number;
// }

// const AddressComponent: React.FC<AddressComponentProps> = ({
//   address,
//   onChange,
//   onRemove,
//   showRemoveButton = false,
//   index
// }) => {
//   const handleInputChange = (field: keyof AddressData, value: string) => {
//     onChange({
//       ...address,
//       [field]: value
//     });
//   };

//   return (
//     <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
//       {/* Address Header */}
//       <div className="flex justify-between items-center">
//         <h4 className="text-sm font-medium text-gray-700">
//           {index !== undefined ? `Address ${index + 1}` : 'Address'}
//         </h4>
//         {showRemoveButton && onRemove && (
//           <button
//             type="button"
//             onClick={onRemove}
//             className="text-red-500 hover:text-red-700 transition-colors"
//             title="Remove Address"
//           >
//             <Trash2 size={16} />
//           </button>
//         )}
//       </div>

//       {/* Address Fields */}
//       <div className="grid grid-cols-1 gap-4">
//         {/* Street Address */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Street Address
//           </label>
//           <input
//             type="text"
//             value={address.address}
//             onChange={(e) => handleInputChange('address', e.target.value)}
//             placeholder="123 Main Street"
//             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//             required
//           />
//         </div>

//         {/* City and State Row */}
//         <div className="grid grid-cols-2 gap-3">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               City
//             </label>
//             <input
//               type="text"
//               value={address.city}
//               onChange={(e) => handleInputChange('city', e.target.value)}
//               placeholder="New York"
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//               required
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               State
//             </label>
//             <input
//               type="text"
//               value={address.state}
//               onChange={(e) => handleInputChange('state', e.target.value)}
//               placeholder="NY"
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//               required
//             />
//           </div>
//         </div>

//         {/* Zipcode */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Zip Code
//           </label>
//           <input
//             type="text"
//             value={address.zipcode}
//             onChange={(e) => handleInputChange('zipcode', e.target.value)}
//             placeholder="10001"
//             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
//             required
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AddressComponent;
// export type { AddressData };

import React from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';

interface AddressData {
  address: string;
  city: string;
  state: string;
  zipcode: string;
}

interface AddressComponentProps {
  address: AddressData;
  onChange: (address: AddressData) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  index?: number;
}

const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming'
];

const AddressComponent: React.FC<AddressComponentProps> = ({
  address,
  onChange,
  onRemove,
  showRemoveButton = false,
  index
}) => {
  const handleInputChange = (field: keyof AddressData, value: string) => {
    onChange({
      ...address,
      [field]: value
    });
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      {/* Address Header */}
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700">
          {index !== undefined ? `Address ${index + 1}` : 'Address'}
        </h4>
        {showRemoveButton && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 transition-colors"
            title="Remove Address"
          >
            <FaRegTrashAlt  size={16} />
          </button>
        )}
      </div>

      {/* Address Fields */}
      <div className="grid grid-cols-1 gap-4">
        {/* Street Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address
          </label>
          <input
            type="text"
            value={address.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="123 Main Street"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
            required
          />
        </div>

        {/* City and State Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={address.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="New York"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              value={address.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm bg-white"
              required
            >
              <option value="">Select State</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zipcode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zip Code
          </label>
          <input
            type="text"
            value={address.zipcode}
            onChange={(e) => handleInputChange('zipcode', e.target.value)}
            placeholder="10001"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] text-sm"
            required
          />
        </div>
      </div>
    </div>
  );
};

export default AddressComponent;
export type { AddressData };