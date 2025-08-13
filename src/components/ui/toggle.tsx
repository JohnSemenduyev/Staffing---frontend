import React from "react";

interface ToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleProps> = ({ enabled, onToggle, label, disabled = false }) => {
  return (
    <div className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white flex items-center justify-between transition focus-within:ring-2 focus-within:ring-blue-600">
      {label && <span className="text-sm text-gray-400 ">{label}</span>}
      <button
        type="button"
        onClick={disabled ? undefined : () => onToggle(!enabled)}
        disabled={disabled}
        className={`relative inline-flex items-center h-5 w-10 rounded-full transition-colors duration-300 focus:outline-none ${
          enabled ? "bg-blue-600" : "bg-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${
            enabled ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;
