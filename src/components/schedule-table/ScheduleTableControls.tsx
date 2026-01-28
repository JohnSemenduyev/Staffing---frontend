import React from "react";
import { FaFileExport, FaFilePdf, FaRegEdit } from "react-icons/fa";
import { Send, Save } from "lucide-react";

interface ScheduleTableControlsProps {
    isEditMode: boolean;
    onPublish: () => void;
    onSave?: () => void;
    onPrint: () => void;
    onDownloadExcel: () => void;
    onToggleEditMode: () => void;
    handleEditModeToggle: () => void;
    isPublishing: boolean;
    isSaving?: boolean;
    isPrinting: boolean;
    hasChanges?: boolean;
    hasDraftData: () => boolean;
    hideActionButtons?: boolean;
}

export const ScheduleTableControls: React.FC<ScheduleTableControlsProps> = ({
    isEditMode,
    onPublish,
    onSave,
    onPrint,
    onDownloadExcel,
    onToggleEditMode,
    handleEditModeToggle,
    isPublishing,
    isSaving,
    isPrinting,
    hasChanges,
    hasDraftData,
    hideActionButtons = false,
}) => {
    return (
        <div className="flex justify-between items-center gap-2 p-4 border-t bg-gray-50 rounded-b-2xl">
            {isEditMode ? (
                <div className="flex gap-2">
                    <button
                        onClick={onPublish}
                        disabled={isPublishing || (!hasChanges && !hasDraftData())}
                        className="inline-flex items-center px-4 py-2 text-white bg-[#004175] hover:bg-[#00325d] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium shadow-sm"
                        title="Publish Schedule"
                    >
                        {isPublishing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                <span>Publishing...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Publish
                            </>
                        )}
                    </button>
                    {onSave && (
                        <button
                            onClick={onSave}
                            disabled={isSaving || !hasChanges}
                            className="inline-flex items-center px-4 py-2 text-[#004175] bg-white border border-[#004175] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#004175] focus:ring-offset-2 font-medium shadow-sm"
                            title="Save changes"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-[#004175] border-t-transparent rounded-full animate-spin mr-2" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save
                                </>
                            )}
                        </button>
                    )}
                    {!hideActionButtons && (
                        <button
                            onClick={onToggleEditMode}
                            className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
                            title="Cancel Edit Mode"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            ) : (
                <button
                    onClick={onPublish}
                    disabled={true}
                    className="inline-flex items-center px-4 py-2 text-white bg-gray-400 cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
                    title="Enter edit mode to publish"
                >
                    <Send className="w-4 h-4 mr-2" />
                    Publish
                </button>
            )}

            {!hideActionButtons && (
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
                        onClick={handleEditModeToggle}
                        className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isEditMode
                                ? "text-blue-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500"
                                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500"
                            }`}
                        title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
                    >
                        <FaRegEdit className="w-5 h-5" color="blue" />
                    </button>
                </div>
            )}
        </div>
    );
};
