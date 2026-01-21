import React from "react";
import { Button } from "./button";

interface WarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

export const WarningModal: React.FC<WarningModalProps> = ({
    isOpen,
    onClose,
    message,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative">
                <h2 className="text-lg font-semibold mb-4 text-center text-red-600">Warning</h2>
                <p className="text-center text-gray-700 mb-6">{message}</p>
                <div className="flex justify-center">
                    <Button
                        onClick={onClose}
                        variant="primary"
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};
