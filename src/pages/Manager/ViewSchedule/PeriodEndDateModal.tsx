import React, { useState } from "react";
import { CustomDatePicker } from "../../../components/CustomDatePicker";
import { PeriodEndDateModalProps } from "./types";

export const PeriodEndDateModal: React.FC<PeriodEndDateModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [selectedDate, setSelectedDate] = useState("");

  const handleSubmit = () => {
    if (selectedDate) {
      onSubmit(selectedDate);
      onClose();
    }
  };

  const handleCurrentWeek = () => {
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
        />
        <button
          onClick={handleSubmit}
          className="w-full py-2 rounded mb-4 text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
        >
          Enter
        </button>

        <div className="flex justify-between">
          <button
            onClick={handleCurrentWeek}
            className="w-[48%] py-2 rounded text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
          >
            Current Week
          </button>
          <button
            onClick={onClose}
            className="w-[48%] py-2 rounded text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
          >
            Return
          </button>
        </div>
      </div>
    </div>
  );
};
