// src/components/ui/TimeClock.tsx
import React from "react";

type Mode = "start" | "end";
type Props = {
  mode: Mode;
  value?: string | null;        // "HH:MM" or "24:00" (end only)
  onChange: (v: string | null) => void;
  id?: string; 
  name?: string; 
  className?: string; 
  disabled?: boolean;
  stepMinutes?: number;         // default 1
  placeholder?: string;
};

export const TimeClock: React.FC<Props> = ({
  mode, value, onChange, id, name, className, disabled, stepMinutes = 1, placeholder
}) => {
  const isEnd = mode === "end";

  // For display in the HTML time input
  const displayValue = React.useMemo(() => {
    if (!value) return "";
    // For end mode: 24:00 displays as 23:59 in the input
    if (isEnd && value === "24:00") return "23:59";
    return value;
  }, [value, isEnd]);

  // For end mode: min is 00:01, max is 23:59 (which represents 24:00)
  // For start mode: min is 00:00, max is 23:59
  const min = isEnd ? "00:01" : "00:00";
  const max = "23:59";
  const step = Math.max(1, stepMinutes) * 60;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value || "";
    if (!inputValue) return onChange(null);

    if (isEnd) {
      // For end mode: if user selects 23:59, convert to 24:00
      // Otherwise, use the selected time as-is
      const finalValue = inputValue === "23:59" ? "24:00" : inputValue;
      onChange(finalValue);
    } else {
      // For start mode: use value as-is
      onChange(inputValue);
    }
  };

  return (
    <div className={className} style={{ position: "relative" }}>
      <input
        type="time"
        id={id} 
        name={name}
        disabled={disabled}
        value={displayValue}
        min={min} 
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
      />
      
      {/* Visual indicator when 24:00 is selected */}
      {isEnd && value === "24:00" && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-white px-1 pointer-events-none">
          24:00
        </div>
      )}
    </div>
  );
};