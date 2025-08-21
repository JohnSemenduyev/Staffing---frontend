import React, { useState } from "react";
import { CustomDatePicker } from "../../../components/CustomDatePicker";
import { PeriodEndDateModalProps } from "./types";

export const PeriodEndDateModal: React.FC<PeriodEndDateModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false 
}) => {
  const [selectedDate, setSelectedDate] = useState("");

  const handleSubmit = () => {
    if (selectedDate && !isLoading) {
      onSubmit(selectedDate);
      // Remove the onClose() call here - let the parent component control when to close
    }
  };

  const handleCurrentWeek = () => {
    if (isLoading) return;
    
    const today = new Date();
    const day = today.getDay();
    const daysSinceThursday = (day + 3) % 7; 
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysSinceThursday);
    startOfWeek.setHours(0, 0, 0, 0);

    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(startOfWeek.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${dayOfMonth}`;
    setSelectedDate(formatted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-center">Period End Date</h2>
        <CustomDatePicker
          value={selectedDate}
          onChange={(field, value) => setSelectedDate(value)}
          placeholder="Select Date"
          className="mb-4"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={!selectedDate || isLoading}
          className={`w-full py-2 rounded mb-4 text-white transition-colors ${
            isLoading || !selectedDate 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Loading...
            </div>
          ) : (
            'Enter'
          )}
        </button>

        <div className="flex justify-between">
          <button
            onClick={handleCurrentWeek}
            disabled={isLoading}
            className={`w-[48%] py-2 rounded text-white transition-colors ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
            }`}
          >
            Current Week
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`w-[48%] py-2 rounded text-white transition-colors ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
            }`}
          >
            Return
          </button>
        </div>
      </div>
    </div>
  );
};
