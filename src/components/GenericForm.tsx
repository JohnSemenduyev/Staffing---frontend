import React from "react";
import { Plus, ChevronDown } from "lucide-react";

export interface FormField {
  key: string;
  type: 'text' | 'number' | 'select' | 'autocomplete' | 'readonly';
  placeholder?: string;
  label?: string;
  required?: boolean;
  min?: string | number;
  options?: { value: string | number; label: string }[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchResults?: any[];
  isLoading?: boolean;
  onSelect?: (item: any) => void;
  showDropdown?: boolean;
  renderDropdownItem?: (item: any, index: number) => React.ReactNode;
  readOnly?: boolean;
  className?: string;
}

interface GenericFormProps {
  fields: FormField[];
  formData: { [key: string]: any };
  errors: { [key: string]: string };
  onFieldChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  submitIcon?: React.ReactNode;
  gridCols?: number;
}

export const GenericForm: React.FC<GenericFormProps> = ({
  fields,
  formData,
  errors,
  onFieldChange,
  onSubmit,
  submitLabel = "Submit",
  isSubmitting = false,
  submitIcon = <Plus className="w-4 h-4 mr-2" />,
  gridCols = 5
}) => {
  const fieldInputClasses = "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  const renderField = (field: FormField) => {
    const fieldValue = formData[field.key] || '';
    const hasError = errors[field.key];

    switch (field.type) {
      case 'autocomplete':
        return (
          <div className="relative">
            <input
              type="text"
              value={field.searchValue || ''}
              onFocus={() => field.onSearchChange && field.onSearchChange(field.searchValue || '')}
              onChange={(e) => field.onSearchChange && field.onSearchChange(e.target.value)}
              placeholder={field.placeholder}
              className={fieldInputClasses}
            />
            {hasError && (
              <span className="text-xs text-red-500 block">{hasError}</span>
            )}
            {field.showDropdown && field.searchValue && field.searchValue.length >= 2 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
                {field.isLoading ? (
                  <div className="p-2 text-sm text-gray-500">Loading...</div>
                ) : field.searchResults?.length === 0 ? (
                  <div className="p-2 text-gray-500 text-sm">No results found</div>
                ) : (
                  field.searchResults?.map((item, index) => (
                    <div
                      key={index}
                      onMouseDown={() => field.onSelect && field.onSelect(item)}
                      className={`cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
                    >
                      {field.renderDropdownItem ? field.renderDropdownItem(item, index) : (
                        <div className="p-4 text-sm">{item.name || item.label || item.toString()}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );

      case 'select':
        return (
          <div>
            <div className="relative">
              <select
                value={fieldValue}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                className={`${fieldInputClasses} appearance-none`}
              >
                <option value="">{field.placeholder || `Select ${field.label}`}</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {hasError && (
              <span className="text-xs text-red-500">{hasError}</span>
            )}
          </div>
        );

      case 'readonly':
        return (
          <div>
            <input
              type="text"
              value={fieldValue}
              placeholder={field.placeholder}
              readOnly
              className={`${fieldInputClasses} bg-gray-50 ${field.className || ''}`}
            />
          </div>
        );

      case 'number':
        return (
          <div>
            <input
              type="number"
              value={fieldValue}
              onChange={(e) => onFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              min={field.min}
              className={fieldInputClasses}
            />
            {hasError && (
              <span className="text-xs text-red-500">{hasError}</span>
            )}
          </div>
        );

      default: // text
        return (
          <div>
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => onFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={fieldInputClasses}
            />
            {hasError && (
              <span className="text-xs text-red-500">{hasError}</span>
            )}
          </div>
        );
    }
  };

  // Calculate total items needed (fields + button)
  const totalItems = fields.length + 1; // +1 for submit button
  const lastRowFieldCount = fields.length % gridCols;
  const shouldButtonBeInSameRow = lastRowFieldCount > 0 && lastRowFieldCount < gridCols;
  const shouldButtonBeInNewRow = lastRowFieldCount === 0;

  // Create all grid items
  const allItems = [];
  
  // Add all fields
  fields.forEach((field, index) => {
    allItems.push(
      <div key={field.key}>
        {renderField(field)}
      </div>
    );
  });

  allItems.push(
    <div key="submit-button" className="flex justify-start">
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center px-6 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap min-w-[160px]"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Loading...
          </>
        ) : (
          <>
            {submitIcon}
            {submitLabel}
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <form onSubmit={onSubmit} autoComplete="off">
        <div className={`grid grid-cols-${gridCols} gap-4 items-start`}>
          {allItems}
        </div>
      </form>
    </div>
  );
};