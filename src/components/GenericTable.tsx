import React, { useMemo, useState } from "react";
import { FaCaretUp } from "react-icons/fa"
import { FaCaretDown } from "react-icons/fa"
import { ChevronDown, ChevronUp } from "lucide-react";
import {Eye} from "lucide-react";
import { Trash2, Printer, Share2, Plus, Type } from "lucide-react";

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
  tableHeight?: string; // New prop to control table height
}

export const GenericTable: React.FC<GenericTableProps> = ({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = "No records found matching your search criteria.",
  searchable = true,
  className = "",
  tableHeight = "400px", // Default height
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

  return (
    <div className={`w-full mt-2 ${className}`}>
      <div 
        className="relative w-full rounded-2xl border border-gray-200 shadow-xl"
        style={{ height: tableHeight, minHeight: tableHeight }}
      >
        <div className="w-full h-full overflow-auto rounded-2xl">
          <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans">
          <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
            {/* Header Row */}
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap ${column.headerClassName || ''}`}
                  style={{ 
                    width: column.width || 'auto',
                    minWidth: column.width || 'auto'
                  }}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && (
                      <div className="pl-1"><span className="text-white/40 cursor-pointer"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" className="-mb-1 " height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path></svg></span><span className="text-white/40 cursor-pointer"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path></svg></span></div>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-2 sm:px-3 py-3 text-left whitespace-nowrap" style={{ width: 'auto', minWidth: 'auto' }}>
                  Actions
                </th>
              )}
            </tr>
            {searchable && (
              <tr className="bg-white text-gray-700 font-sans w-full">
                {columns.map((column) => (
                  <th key={`search-${column.key}`} className="px-1 sm:px-2 py-2 text-left">
                    {column.searchable ? (
                      <input
                        placeholder={column.searchPlaceholder || `Search ${column.label.toLowerCase()}`}
                        className="w-40 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                {actions.length > 0 && <th className="px-1 sm:px-2 py-2"></th>}
              </tr>
            )}
          </thead>
          <tbody className="relative">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  className="relative p-0"
                  style={{ height: `calc(${tableHeight} - 150px)` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-500">Loading...</span>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {filteredAndSortedData.map((record, index) => (
                  <tr
                    key={record.id || index}
                    className={`hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    {columns.map((column) => {
                      const value = getNestedValue(record, column.key);
                      return (
                        <td
                          key={column.key}
                          className={`px-4 py-3 border-b border-gray-100 whitespace-nowrap ${column.className || ''}`}
                          style={{ 
                            width: column.width || 'auto',
                            minWidth: column.width || 'auto'
                          }}
                        >
                          {column.render ? column.render(value, record) : (value || "-")}
                        </td>
                      );
                    })}
                    {actions.length > 0 && (
                      <td className="px-1 sm:px-2 py-3 whitespace-nowrap" style={{ width: 'auto', minWidth: 'auto' }}>
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
                      className="px-4 py-8 text-center text-gray-500 bg-white whitespace-nowrap"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};