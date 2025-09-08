import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { parseLocalYMD, toLocalYMD } from "../lib/utils";

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

  // selected date from value (YYYY-MM-DD)
  const selectedDate = value ? parseLocalYMD(value) : null;
  
  // display as MM-DD-YYYY
  const formatDateForDisplay = (date: Date | null) => {
    if (!date) return "";
    const ymd = toLocalYMD(date); // YYYY-MM-DD
    const [y, m, d] = ymd.split("-");
    return `${m}-${d}-${y}`;
  };

  // on pick → emit YYYY-MM-DD
  const handleDateChange = (date: Date | null) => {
    onChange(fieldName, date ? toLocalYMD(date) : "");
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
    w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition
    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white cursor-pointer'}
  `;

  return (
    <div className="relative w-full cursor-pointer custom-date-picker" onClick={() => !disabled && setIsOpen(true)}>
      <input
        type="text"
        value={formatDateForDisplay(selectedDate)}
        onChange={() => {}} // Read-only input
        placeholder={placeholder}
        className={`${defaultClasses} ${className} text-black`}
        readOnly
        disabled={disabled}
      />
      
      <div className="absolute inset-y-0 inset-x-100 right-0 flex items-center justify-center w-10 h-[35px] pointer-events-none">
        <Calendar
          className={`w-4 h-4 ${
            disabled 
              ? 'text-gray-300' 
              : 'text-black '
          } transition-colors duration-200`}
          style={{
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          }}
        />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            inline
            minDate={minDate ? parseLocalYMD(minDate) : undefined}
            maxDate={maxDate ? parseLocalYMD(maxDate) : undefined}
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
