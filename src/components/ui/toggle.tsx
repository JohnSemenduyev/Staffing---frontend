import React from "react";

interface ToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "small" | "medium" | "big";
}

const ToggleSwitch: React.FC<ToggleProps> = ({
  enabled,
  onToggle,
  label,
  disabled = false,
  size = "big", // default
}) => {
  // Small
  if (size === "small") {
    return (
      <div className="inline-flex items-center">
        {label && <span className="text-gray-400 mr-2 text-xs">{label}</span>}
        <button
          type="button"
          onClick={disabled ? undefined : () => onToggle(!enabled)}
          disabled={disabled}
          className={`relative inline-flex items-center h-[20px] w-[40px] rounded-full transition-colors duration-300 focus:outline-none ${
            enabled ? "bg-blue-600" : "bg-gray-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`absolute h-[16px] w-[16px] bg-white rounded-full transition-transform duration-300 ${
              enabled ? "translate-x-[20px]" : "translate-x-[2px]"
            }`}
          />
        </button>
      </div>
    );
  }

  // Medium
  if (size === "medium") {
    return (
      <div className="inline-flex items-center">
        {label && <span className="text-gray-400 mr-2 text-sm">{label}</span>}
        <button
          type="button"
          onClick={disabled ? undefined : () => onToggle(!enabled)}
          disabled={disabled}
          className={`relative inline-flex items-center h-[28px] w-[56px] rounded-full transition-colors duration-300 focus:outline-none ${
            enabled ? "bg-blue-600" : "bg-gray-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`absolute h-[20px] w-[20px] bg-white rounded-full transition-transform duration-300 ${
              enabled ? "translate-x-[28px]" : "translate-x-[4px]"
            }`}
          />
        </button>
      </div>
    );
  }

  // Big (or default) -> ORIGINAL style with border + bg
  const containerHeight = "h-[32px] text-sm w-full";

  return (
    <div
      className={`p-2 flex items-center rounded-md justify-between transition focus-within:ring-2 focus-within:ring-[#004175]  border border-gray-300 ${containerHeight}`}
    >
      {label && <span className="text-gray-600">{label}</span>}
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
