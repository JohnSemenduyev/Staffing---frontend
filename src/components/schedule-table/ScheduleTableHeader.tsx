import React from "react";

interface ScheduleTableHeaderProps {
    selectedUserId?: number;
    dateColumns: { date: string; display: string }[];
    isEditMode?: boolean;
}

export const ScheduleTableHeader: React.FC<ScheduleTableHeaderProps> = ({
    selectedUserId,
    dateColumns,
    isEditMode = false,
}) => {
    return (
        <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
            <tr className="h-[41px]" style={{ lineHeight: "16px" }}>
                <th className="px-4 py-2 text-left border border-gray-300 whitespace-nowrap">
                    {selectedUserId ? "Client Name" : "Employee Name"}
                </th>
                {dateColumns.map((dateCol) => (
                    <th
                        key={dateCol.date}
                        className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap"
                        style={{ minWidth: "120px" }}
                    >
                        {dateCol.display}
                    </th>
                ))}
                <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap">
                    Total
                </th>
                <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap w-16">
                    Auto
                </th>
                {isEditMode && (
                    <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap w-16">
                        Actions
                    </th>
                )}
            </tr>
        </thead>
    );
};
