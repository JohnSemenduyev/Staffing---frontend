import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

interface CustomDatePickerProps {
  value: string;
  onChange: (field: string, value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  fieldName?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = "MM-DD-YYYY",
  className = "",
  minDate,
  maxDate,
  disabled = false,
  fieldName = "date"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Convert YYYY-MM-DD to Date object
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // Local time, midnight
  };
  
  const selectedDate = value ? parseLocalDate(value) : null;
  
  // Format date for display as MM-DD-YYYY
  const formatDateForDisplay = (date: Date | null) => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  // Handle date selection
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Format the date manually to avoid timezone conversion issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      onChange(fieldName, formattedDate);
    } else {
      onChange(fieldName, '');
    }
    // Close the calendar after date selection
    setTimeout(() => setIsOpen(false), 100);
  };

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const datePickerElement = (event.target as Element).closest('.custom-date-picker');
      if (isOpen && !datePickerElement) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use a small delay to prevent interference with date selection
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);
  
  const defaultClasses = `
    w-full
    px-3
    py-1
    border
    border-[#D2D5DAFF]
    rounded-md
    placeholder:text-gray-500
    font-normal
    focus:outline-none
    focus:ring-2
    focus:ring-[#004175]
    transition
    appearance-none
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}
  `;

  return (
    <div className="relative w-full cursor-pointer custom-date-picker" onClick={() => !disabled && setIsOpen(true)}>
      <input
        type="text"
        value={formatDateForDisplay(selectedDate)}
        onChange={() => {}} // Read-only input
        placeholder={placeholder}
        className={`${defaultClasses} ${className} text-gray-500`}
        readOnly
        disabled={disabled}
        
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white px-1">
        <Calendar
          className={`w-4 h-4 pointer-events-none ${
            disabled ? 'text-gray-300' : 'text-gray-400'
          }`}
        />
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            inline
            // minDate={minDate ? new Date(minDate) : undefined}
            // maxDate={maxDate ? new Date(maxDate) : undefined}
            dateFormat="MM/dd/yyyy"
            showYearDropdown
            scrollableYearDropdown
            yearDropdownItemNumber={15}
            onCalendarClose={() => setIsOpen(false)}

          />
        </div>
      )}
    </div>
  );
};
