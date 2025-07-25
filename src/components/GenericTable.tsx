import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  render?: (value: any, record: any) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
}

export interface TableAction {
  label: string;
  icon: React.ReactNode;
  onClick: (record: any) => void;
  className?: string;
  title?: string;
}

interface GenericTableProps {
  data: any[];
  columns: TableColumn[];
  actions?: TableAction[];
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  searchable?: boolean;
  className?: string;
}

export const GenericTable: React.FC<GenericTableProps> = ({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = "No records found matching your search criteria.",
  searchable = true,
  className = ""
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter((record) => {
      return columns.every((column) => {
        if (!column.searchable || !searchTerms[column.key]) return true;
        
        const value = getNestedValue(record, column.key);
        const searchTerm = searchTerms[column.key].toLowerCase();
        
        if (value === null || value === undefined) return false;
        
        return value.toString().toLowerCase().includes(searchTerm);
      });
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key!);
        const bValue = getNestedValue(b, sortConfig.key!);

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Convert to appropriate types for comparison
        let aCompare: any = aValue;
        let bCompare: any = bValue;

        if (typeof aValue === "string" && typeof bValue === "string") {
          aCompare = aValue.toLowerCase();
          bCompare = bValue.toLowerCase();
        } else if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
          aCompare = Number(aValue);
          bCompare = Number(bValue);
        }

        if (aCompare < bCompare) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aCompare > bCompare) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerms, sortConfig, columns]);

  if (loading) {
    return (
      <div className="w-full max-w-full mt-10">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-full mt-10 ${className}`}>
      <div className="relative w-full overflow-x-auto rounded-2xl border border-gray-200 shadow-xl">
        <table className="min-w-full table-auto text-sm text-gray-800 font-sans">
          <thead className="bg-[#004175] text-white text-xs font-sans">
            {/* Header Row */}
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 sm:px-4 py-3 text-left whitespace-nowrap ${column.headerClassName || ''}`}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && (
                      <div className="pl-1">
                        <span
                          className={`cursor-pointer ${
                            sortConfig.key === column.key && sortConfig.direction === "asc"
                              ? "text-white"
                              : "text-white/40"
                          }`}
                          onClick={() => handleSort(column.key)}
                        >
                          <ChevronUp className="-mb-1 w-4 h-4" />
                        </span>
                        <span
                          className={`cursor-pointer ${
                            sortConfig.key === column.key && sortConfig.direction === "desc"
                              ? "text-white"
                              : "text-white/40"
                          }`}
                          onClick={() => handleSort(column.key)}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>

            {/* Search Row */}
            {searchable && (
              <tr className="bg-white text-gray-700 font-sans w-full">
                {columns.map((column) => (
                  <th key={`search-${column.key}`} className="px-2 sm:px-4 py-2 text-left">
                    {column.searchable ? (
                      <input
                        placeholder={column.searchPlaceholder || `Search ${column.label.toLowerCase()}`}
                        className="w-full max-w-[120px] sm:max-w-[160px] md:max-w-[200px] px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400"
                        type="text"
                        value={searchTerms[column.key] || ''}
                        onChange={(e) =>
                          setSearchTerms((prev) => ({
                            ...prev,
                            [column.key]: e.target.value,
                          }))
                        }
                      />
                    ) : null}
                  </th>
                ))}
                {actions.length > 0 && <th className="px-2 sm:px-4 py-2"></th>}
              </tr>
            )}
          </thead>

          <tbody>
            {filteredAndSortedData.map((record, index) => (
              <tr
                key={record.id || index}
                className={`hover:bg-blue-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                {columns.map((column) => {
                  const value = getNestedValue(record, column.key);
                  return (
                    <td
                      key={column.key}
                      className={`px-2 sm:px-4 py-3 ${column.className || ''}`}
                    >
                      {column.render ? column.render(value, record) : (value || "-")}
                    </td>
                  );
                })}
                {actions.length > 0 && (
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {actions.map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          onClick={() => action.onClick(record)}
                          className={action.className || "text-blue-500 hover:text-blue-700"}
                          title={action.title || action.label}
                        >
                          {action.icon}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredAndSortedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500 bg-white"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};