import React, { useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from './button';

interface ResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  text?: string;
  confirmTitle?: string;
  confirmMessage?: string;
}

const ResetButton: React.FC<ResetButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  text = 'Reset',
  confirmTitle = 'Confirm Reset',
  confirmMessage = 'Are you sure you want to reset? This action cannot be undone.'
}) => {
  return (
    <>
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
    </>
  );
};

export default ResetButton;