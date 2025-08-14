import React from "react";

interface ErrorMessageProps {
  message?: string;
  show?: boolean;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  show = true, 
  className = "" 
}) => {
  if (!show || !message) {
    return null;
  }

  return (
    <div className={`mt-1 flex items-center justify-start text-left w-full text-sm text-red-600 ${className}`}>
      <svg 
        className="w-4 h-4 mr-1 flex-shrink-0" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
          clipRule="evenodd" 
        />
      </svg>
      <span>{message}</span>
    </div>
  );
};

// Alternative simpler version without icon (for backward compatibility)
export const SimpleErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  show = true, 
  className = "" 
}) => {
  if (!show || !message) {
    return null;
  }

  return (
    <span className={`text-xs text-red-500 ${className}`}>
      {message}
    </span>
  );
};
