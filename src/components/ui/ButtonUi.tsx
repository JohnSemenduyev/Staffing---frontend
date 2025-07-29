import React from "react";

interface SubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  loadingText?: string;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  children,
  loading = false,
  disabled = false,
  icon,
  loadingText = "Loading...",
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="inline-flex items-center px-4 py-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
          {loadingText}
        </>
      ) : (
        <>
          {icon && <span className="mr-1">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default SubmitButton;