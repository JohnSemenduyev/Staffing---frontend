import React from "react";

interface ActualTableHeaderProps {
    selectedUserId?: number;
    dateColumns: { date: string; display: string }[];
}

export const ActualTableHeader: React.FC<ActualTableHeaderProps> = ({
    selectedUserId,
    dateColumns,
}) => {
    return (
        <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
            <tr className="h-[41px]" style={{ lineHeight: '16px' }}>
                <th className="px-4 py-2 text-left border border-gray-300 whitespace-nowrap">
                    {selectedUserId ? "Client Name" : "Employee Name"}
                </th>
                {dateColumns.map(dateCol => (
                    <th key={dateCol.date} className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap relative" style={{ minWidth: '120px' }}>
                        <span>{dateCol.display}</span>
                    </th>
                ))}
                <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap">
                    Total
                </th>
                <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap w-16">
                    Actions
                </th>
            </tr>
        </thead>
    );
};
