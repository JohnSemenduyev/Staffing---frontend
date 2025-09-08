import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from './button';

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
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      className={className}
    >
      <RotateCcw className="w-4 h-4 mr-1" />
      {text}
    </Button>
  );
};

export default ResetButton;