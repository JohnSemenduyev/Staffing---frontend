import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  text?: string;
}

const ResetButton: React.FC<ResetButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  text = 'Reset'
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center px-2 py-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap ${className}`}
    >
      <RotateCcw className="w-4 h-4 mr-1" />
      {text}
    </button>
  );
};

export default ResetButton;