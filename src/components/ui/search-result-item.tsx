import React from "react";

export type SearchResultItemProps = {
  // Main title, e.g., full name or client name
  primaryText: string;
  // Secondary line, e.g., address or label
  secondaryText?: string;
  // Optional precomputed initials; if not provided, computed from primaryText
  initials?: string;
  // Row index to keep zebra stripes consistent when used in lists
  index?: number;
  onSelect?: () => void;
  className?: string;
};

const computeInitials = (text: string) => {
  if (!text) return "";
  const parts = text.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  primaryText,
  secondaryText,
  initials,
  index = 0,
  onSelect,
  className = "",
}) => {
  const isEven = index % 2 === 0;
  const badge = (initials ?? computeInitials(primaryText)).slice(0, 2);

  return (
    <div
      onMouseDown={onSelect}
      className={`p-3 cursor-pointer flex items-center space-x-3 ${
        isEven ? "bg-white" : "bg-gray-50"
      } hover:bg-gray-100 transition-colors duration-150 z-50 ${className}`}
    >
      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-medium">{badge}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-blue-800 text-sm truncate">{primaryText || "-"}</div>
        {secondaryText ? (
          <div className="text-xs text-gray-500 break-words whitespace-normal">{secondaryText}</div>
        ) : null}
      </div>
    </div>
  );
};

// Optional wrapper to standardize dropdown container
export type SearchResultsDropdownProps = {
  show: boolean;
  children: React.ReactNode;
  maxHeightClass?: string; // e.g., "max-h-60"
};

export const SearchResultsDropdown: React.FC<SearchResultsDropdownProps> = ({
  show,
  children,
  maxHeightClass = "max-h-60",
}) => {
  if (!show) return null;
  return (
    <div
      className={`absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg ${maxHeightClass} overflow-y-auto z-50 font-sans`}
    >
      {children}
    </div>
  );
};