import React from "react";
import { FaFileExport, FaFilePdf, FaRegEdit } from "react-icons/fa";
import { Send } from "lucide-react";

interface ActualTableControlsProps {
    isEditMode: boolean;
    hasChanges?: boolean;
    isPublishing: boolean;
    isPrinting: boolean;
    onPublish: () => void;
    onPrint: () => void;
    onDownloadExcel: () => void;
    onToggleEditMode: () => void;
    handleEditModeToggle: () => void;
    logEditableCells?: () => void;
}

export const ActualTableControls: React.FC<ActualTableControlsProps> = ({
    isEditMode,
    hasChanges,
    isPublishing,
    isPrinting,
    onPublish,
    onPrint,
    onDownloadExcel,
    onToggleEditMode,
    handleEditModeToggle,
    logEditableCells
}) => {
    return (
        <div className="flex justify-between items-center gap-2 p-4 border-t bg-gray-50 rounded-b-2xl">
            {/* Publish/Cancel button - Leftmost */}
            {isEditMode ? (
                <div className="flex gap-2">
                    <button
                        onClick={onPublish}
                        disabled={isPublishing || !hasChanges}
                        className="inline-flex items-center px-4 py-2 text-white bg-[#004175] hover:bg-[#00325d] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium shadow-sm"
                        title="Publish Actual Time"
                    >
                        {isPublishing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Save
                            </>
                        )}
                    </button>
                    <button
                        onClick={onToggleEditMode}
                        className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
                        title="Cancel Edit Mode"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <button
                    onClick={onPublish}
                    disabled={true}
                    className="inline-flex items-center px-4 py-2 text-white bg-gray-400 cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
                    title="Enter edit mode to publish"
                >
                    <Send className="w-4 h-4 mr-2" />
                    Save
                </button>
            )}

            {/* Print, Download and Edit buttons - Right side */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onPrint}
                    disabled={isPrinting}
                    className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    title="Print Report"
                >
                    {isPrinting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                            <span className="text-sm">Preparing...</span>
                        </>
                    ) : (
                        <FaFilePdf className="w-5 h-5" />
                    )}
                </button>

                <button
                    onClick={onDownloadExcel}
                    className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    title="Download Excel"
                >
                    <FaFileExport className="w-5 h-5" />
                </button>

                <button
                    onClick={() => {
                        logEditableCells?.();
                        handleEditModeToggle();
                    }}
                    className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isEditMode
                        ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500'
                        }`}
                    title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
                >
                    <FaRegEdit className="w-5 h-5" color={isEditMode ? "blue" : undefined} />
                </button>
            </div>
        </div>
    );
};
