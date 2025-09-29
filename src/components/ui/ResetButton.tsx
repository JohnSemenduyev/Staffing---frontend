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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleResetClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    setIsModalOpen(false);
    onClick();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleResetClick}
        disabled={disabled}
        variant="outline"
        className={className}
      >
        <RotateCcw className="w-4 h-4 mr-1" />
        {text}
      </Button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleCancel}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-10">
            <div className="flex items-start gap-4">
              {/* <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div> */}
              <div className="flex-1">
                {/* <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {confirmTitle}
                </h3> */}
                <p className="text-sm text-gray-600 mb-6">
                  {confirmMessage}
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    onClick={handleCancel}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResetButton;