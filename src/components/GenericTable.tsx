import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import ResetButton from "./ui/ResetButton";

export interface SearchOption {
  label: string;
  value: any;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  searchType?: 'text' | 'dropdown';
  searchPlaceholder?: string;
  searchOptions?: SearchOption[];
  getSearchOptions?: (data: any[]) => SearchOption[];
  render?: (value: any, record: any) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
  height?: string;
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
  tableHeight?: string;
  onSearch?: (searchTerms: { [key: string]: string }) => void
}

export const GenericTable: React.FC<GenericTableProps> = ({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = "No records found matching your search criteria.",
  searchable = true,
  className = "",
  tableHeight = "450px",
  onSearch
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const debouncedSearchTerms = useDebounce(searchTerms, 500);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);

  // Memoize the onSearch callback to prevent unnecessary re-renders
  const memoizedOnSearch = useCallback(onSearch, []);

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

  const getColumnSearchOptions = (column: TableColumn): SearchOption[] => {
    if (column.searchOptions) {
      return column.searchOptions;
    }
    if (column.getSearchOptions) {
      return column.getSearchOptions(data);
    }
    if (column.searchType === 'dropdown') {
      const uniqueValues = new Set<string>();

      data.forEach(record => {
        const value = getNestedValue(record, column.key);
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(item => {
              if (item !== null && item !== undefined) {
                uniqueValues.add(String(item));
              }
            });
          } else {
            uniqueValues.add(String(value));
          }
        }
      });
      return Array.from(uniqueValues).sort().map(value => ({
        label: value,
        value: value
      }));
    }
    return [];
  };

//   if (column.searchOptions) {
//     return column.searchOptions;
//   }

//   if (column.getSearchOptions) {
//     return column.getSearchOptions(data);
//   }

//   if (column.searchType === "dropdown") {
//     const uniqueValues = new Set<string>();

//     data.forEach((record) => {
//       const value = getNestedValue(record, column.key);

//       if (value !== null && value !== undefined) {
//         if (Array.isArray(value)) {
//           value.forEach((item) => {
//             if (item !== null && item !== undefined) {
//               uniqueValues.add(String(item).trim());
//             }
//           });
//         } else if (typeof value === "string" && value.includes(",")) {
//           // ✅ handle comma-separated multi-select values
//           value
//             .split(",")
//             .map((v) => v.trim())
//             .filter(Boolean)
//             .forEach((v) => uniqueValues.add(v));
//         } else {
//           uniqueValues.add(String(value).trim());
//         }
//       }
//     });

//     return Array.from(uniqueValues)
//       .sort((a, b) => a.localeCompare(b)) // ✅ case-insensitive sorting
//       .map((value) => ({
//         label: value,
//         value: value,
//       }));
//   }

//   return [];
// };


  // FIXED: Use memoizedOnSearch and add proper dependency array
  useEffect(() => {
    if (memoizedOnSearch) {
      const cleanSearchTerms = Object.fromEntries(
        Object.entries(debouncedSearchTerms).filter(([_, v]) => v && v.trim() !== "")
      );
      memoizedOnSearch(cleanSearchTerms);
    }
  }, [debouncedSearchTerms, memoizedOnSearch]);

  // const filteredAndSortedData = useMemo(() => {
  //   // let filtered = data.filter((record) => {
  //   //   return columns.every((column) => {
  //   //     if (!column.searchable || !searchTerms[column.key]) return true;
  //   //     const value = getNestedValue(record, column.key);
  //   //     const searchTerm = searchTerms[column.key];
  //   //     if (value === null || value === undefined) return false;
  //   //     if (column.searchType === 'dropdown') {
  //   //       if (Array.isArray(value)) {
  //   //         return value.some(item => String(item) === searchTerm);
  //   //       } else {
  //   //         return String(value) === searchTerm;
  //   //       }
  //   //     }
  //   //     const searchTermLower = searchTerm.toLowerCase();
  //   //     if (Array.isArray(value)) {
  //   //       return value.some(item =>
  //   //         String(item).toLowerCase().includes(searchTermLower)
  //   //       );
  //   //     } else {
  //   //       return String(value).toLowerCase().includes(searchTermLower);
  //   //     }
  //   //   });
  //   // });

  //   let filtered = data.filt
  //   if (sortConfig.key) {
  //     filtered.sort((a, b) => {
  //       const aValue = getNestedValue(a, sortConfig.key!);
  //       const bValue = getNestedValue(b, sortConfig.key!);
  //       if (aValue === null || aValue === undefined) return 1;
  //       if (bValue === null || bValue === undefined) return -1;
  //       let aCompare: any = aValue;
  //       let bCompare: any = bValue;
  //       if (Array.isArray(aValue)) aCompare = aValue.length > 0 ? aValue[0] : "";
  //       if (Array.isArray(bValue)) bCompare = bValue.length > 0 ? bValue[0] : "";
  //       if (typeof aCompare === "string" && typeof bCompare === "string") {
  //         aCompare = aCompare.toLowerCase();
  //         bCompare = bCompare.toLowerCase();
  //       } else if (!isNaN(Number(aCompare)) && !isNaN(Number(bCompare))) {
  //         aCompare = Number(aCompare);
  //         bCompare = Number(bCompare);
  //       }

  //       if (aCompare < bCompare) {
  //         return sortConfig.direction === "asc" ? -1 : 1;
  //       }
  //       if (aCompare > bCompare) {
  //         return sortConfig.direction === "asc" ? 1 : -1;
  //       }
  //       return 0;
  //     });
  //   }

  //   return filtered;
  // }, [data, searchTerms, sortConfig, columns]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key!);
        const bValue = getNestedValue(b, sortConfig.key!);
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        let aCompare: any = aValue;
        let bCompare: any = bValue;
        if (Array.isArray(aValue)) aCompare = aValue.length > 0 ? aValue[0] : "";
        if (Array.isArray(bValue)) bCompare = bValue.length > 0 ? bValue[0] : "";
        if (typeof aCompare === "string" && typeof bCompare === "string") {
          aCompare = aCompare.toLowerCase();
          bCompare = bCompare.toLowerCase();
        } else if (!isNaN(Number(aCompare)) && !isNaN(Number(bCompare))) {
          aCompare = Number(aCompare);
          bCompare = Number(bCompare);
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
  }, [data, sortConfig]);

  const resetSearch = () => {
  setSearchTerms({});
};
const hasSearchValues = Object.values(searchTerms).some(
  (val) => val !== undefined && val !== null && String(val).trim() !== ""
);

  const renderSearchField = (column: TableColumn) => {
    if (!column.searchable) return null;

    if (column.searchType === "dropdown" && column.key === "notification") {
      const options = column.searchOptions || getColumnSearchOptions(column);
      const selectedValues = searchTerms[column.key]
        ? searchTerms[column.key].split(",")
        : [];

      const handleCheckbox = (optionValue: string) => {
        let updatedValues: string[];
        if (selectedValues.includes(optionValue)) {
          updatedValues = selectedValues.filter((v) => v !== optionValue);
        } else {
          updatedValues = [...selectedValues, optionValue];
        }

        setSearchTerms((prev) => ({
          ...prev,
          [column.key]: updatedValues.join(","), // store as comma-separated string
        }));
      };

      return (
        <div className="relative">
          <div
            className="w-full px-2 py-1 text-sm border text-gray-400 border-gray-300 rounded-md bg-white flex items-center justify-between cursor-pointer"
            onClick={() =>
              setShowNotificationDropdown(!showNotificationDropdown)
            }
          >
            <div className="flex flex-wrap gap-1 flex-1">
              <span className="text-gray-400">All {column.label}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>

          {/* Dropdown with checkboxes */}
          {showNotificationDropdown && (
            <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center p-2 font-medium hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(opt.value)}
                    onChange={() => handleCheckbox(opt.value)}
                    className="mr-3 text-[#004175] focus:ring-[#004175] focus:ring-2"
                  />
                  <span
                    className={
                      selectedValues.includes(opt.value)
                        ? "text-blue-800"
                        : "text-gray-600"
                    }
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (column.searchType === "dropdown") {
      const options = getColumnSearchOptions(column);

      return (
        <div className="relative">
          <select
            value={searchTerms[column.key] || ''}
            onChange={(e) =>
              setSearchTerms((prev) => ({
                ...prev,
                [column.key]: e.target.value,
              }))
            }
            className="w-full px-2 py-1 text-sm border text-gray-400 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none bg-white pr-8"
            style={{
              maxWidth: '100%',
              minWidth: column.width ? `calc(${column.width} - 32px)` : 'auto'
            }}
          >
            <option value="">All {column.label}</option>
            {options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      );
    }
    return (
      <input
        placeholder={column.searchPlaceholder || `Search ${column.label.toLowerCase()}`}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        type="text"
        value={searchTerms[column.key] || ''}
        onChange={(e) =>
          setSearchTerms((prev) => ({
            ...prev,
            [column.key]: e.target.value,
          }))
        }
        style={{
          maxWidth: '100%',
          minWidth: column.width ? `calc(${column.width} - 32px)` : 'auto'
        }}
      />
    );
  };

  return (
    <div className={`w-full mt-2 ${className}`}>
      <div
        className="relative w-full rounded-t-2xl border border-gray-200 shadow-xl overflow-hidden"
        style={{ height: tableHeight, minHeight: tableHeight }}
      >
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-10 flex items-center justify-center z-30 rounded-2xl">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500">Loading...</span>
            </div>
          </div>
        )}

        {/* Fixed Header */}
        <div className="bg-white rounded-t-2xl">
          <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans">
            <thead className="bg-[#004175] text-white text-xs font-sans">
              <tr className="h-[41px]" style={{ lineHeight: '16px' }}>
                {actions.length > 0 && (
                  <th className="px-4 py-2 text-left whitespace-nowrap" style={{ width: '100px', minWidth: '100px' }}>
                    <div className="flex items-center h-full">
                      Actions
                    </div>
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-2 text-left whitespace-nowrap ${column.headerClassName || ''}`}
                    style={{
                      width: column.width || 'auto',
                      minWidth: column.width || 'auto',
                      height: column.height || 'auto',
                    }}
                  >
                    <div className="flex items-center">
                      {column.label}
                      {column.sortable && (
                        <div className="pl-1 cursor-pointer" onClick={() => handleSort(column.key)}>
                          <span
                            className={`cursor-pointer ${sortConfig.key === column.key && sortConfig.direction === "asc"
                                ? "text-white"
                                : "text-white/40"
                              }`}
                          >
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                              <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                            </svg>
                          </span>
                          <span
                            className={`cursor-pointer ${sortConfig.key === column.key && sortConfig.direction === "desc"
                                ? "text-white"
                                : "text-white/40"
                              }`}
                          >
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                              <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                            </svg>
                          </span>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
              {searchable && (
                <tr className="bg-white text-gray-700 font-sans w-full h-[41px]" style={{ lineHeight: '16px' }}>
                  {actions.length > 0 && (
                    <th className="px-4 py-2 text-left">
                      {hasSearchValues && (
                        <ResetButton onClick={resetSearch} disabled={!hasSearchValues} />
                      )}
                    </th>
                  )}
                  {columns.map((column) => (
                    <th
                      key={`search-${column.key}`}
                      className="px-4 py-2 text-left"
                      style={{
                        width: column.width || 'auto',
                        minWidth: column.width || 'auto'
                      }}
                    >
                      {renderSearchField(column)}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
          </table>
        </div>

        {/* Scrollable Body */}
        <div 
          className="overflow-auto bg-white"
          style={{ 
            height: `calc(${tableHeight} - ${searchable ? '82px' : '41px'})`,
            maxHeight: `calc(${tableHeight} - ${searchable ? '82px' : '41px'})`
          }}
        >
          <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans">
            <tbody className="relative">
              {!loading &&
                filteredAndSortedData.map((record, index) => (
                  <tr
                    key={record.id || index}
                    className="hover:bg-blue-50 transition-colors bg-white"
                  >
                    {actions.length > 0 && (
                      <td className="px-4 py-3 whitespace-nowrap" style={{ width: '100px', minWidth: '100px' }}>
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
                  </tr>
                ))}

              {filteredAndSortedData.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                    className="relative p-0"
                    style={{ height: `calc(${tableHeight} - ${searchable ? '150px' : '100px'})` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                      <span className="text-gray-500 text-center">
                        {emptyMessage}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};