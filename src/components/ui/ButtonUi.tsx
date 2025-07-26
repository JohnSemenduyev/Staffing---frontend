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
      className="inline-flex items-center px-4 py-1 border border-[#004175] text-[#004175] hover:bg-[#004175]/10 disabled:border-[#004175]/30 disabled:text-[#004175]/40 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#004175] focus:ring-offset-2 whitespace-nowrap"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-[#004175] border-t-transparent rounded-full animate-spin mr-2" />
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