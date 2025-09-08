import React, { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, X } from "lucide-react";
import { CustomDatePicker } from "./CustomDatePicker";
import { ErrorMessage } from "./ui/error-message";
import ResetButton from "./ui/ResetButton";
import { Button } from "./ui/button";

export interface FieldConfig {
  name: string;
  type: 'text' | 'date' | 'select' | 'toggle';
  placeholder?: string;
  label?: string;
  options?: Array<{ label: string; value: string | number }>;
  required?: boolean;
  className?: string;
}

export interface GenericSearchFormProps {
  fields: FieldConfig[];
  route: string;
  onSearch: (formData: { [key: string]: any }) => void;
  onReset: () => void;
  isVisible: boolean;
  loading?: boolean;
  resetKey?: string | number | boolean; // add
}

export const GenericSearchForm: React.FC<GenericSearchFormProps> = ({
  fields,
  route,
  onSearch,
  onReset,
  isVisible,
  loading = false,
  resetKey
}) => {
  const initializeForm = () => {
    const initialForm: { [key: string]: any } = {};
    fields.forEach(field => {
      if (field.type === 'toggle') {
        initialForm[field.name] = false;
      } else if (field.type === 'select') {
        initialForm[field.name] = '';
      } else {
        initialForm[field.name] = '';
      }
    });
    return initialForm;
  };

  const [form, setForm] = useState(initializeForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    setForm(initializeForm());
    setErrors({});
    setShowErrors(false);
  }, [fields, resetKey]); 
  // const fieldInputClasses =
  //   "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  const inputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setShowErrors(false);
  };

  const validate = () => {
    const e: any = {};
    fields.forEach(field => {
      if (field.required && !form[field.name]) {
        e[field.name] = `${field.label || field.placeholder || field.name} is required`;
      }
    });
    setErrors(e);
    setShowErrors(true);
    return Object.keys(e).length === 0;
  };

  const getFieldClasses = (fieldName: string) => {
    const hasError = showErrors && errors[fieldName];
    return `${inputClasses} ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    // Filter out empty values
    const searchData = Object.keys(form).reduce((acc, key) => {
      if (form[key] !== '' && form[key] !== false && form[key] !== null && form[key] !== undefined) {
        acc[key] = form[key];
      }
      return acc;
    }, {} as { [key: string]: any });
   console.log("Search Data:", searchData);
    onSearch(searchData);
  };

  const handleReset = () => {
    setForm(initializeForm());
    setErrors({});
    setShowErrors(false);
    onReset();
  };

  const hasAnyInput = Object.values(form).some(value => 
    value !== '' && value !== false && value !== null && value !== undefined
  );

  const renderField = (field: FieldConfig) => {
    switch (field.type) {
      case 'text':
        return (
          <div key={field.name}>
            <input
              type="text"
              value={form[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={field.className || getFieldClasses(field.name)}
            />
            {showErrors && errors[field.name] && (
              <ErrorMessage message={errors[field.name]} />
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.name}>
            <CustomDatePicker
              value={form[field.name] || ''}
              onChange={handleChange}
              placeholder={field.placeholder || 'Select Date'}
              fieldName={field.name}
              className={field.className || `${inputClasses} appearance-none`}
            />
            {showErrors && errors[field.name] && (
              <ErrorMessage message={errors[field.name]} />
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name}>
            <select
              value={form[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={`${field.className || getFieldClasses(field.name)} appearance-none bg-transparent ${
                form[field.name] === '' ? 'text-gray-400' : 'text-gray-900'
              }`}
            >
              <option value="" disabled hidden>
                {field.placeholder || 'Select Option'}
              </option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {showErrors && errors[field.name] && (
              <ErrorMessage message={errors[field.name]} />
            )}
          </div>
        );

      case 'toggle':
        return (
          <div key={field.name} className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form[field.name] || false}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                className="mr-3 text-[#004175] focus:ring-[#004175] focus:ring-2"
              />
              <span className="text-gray-700 text-sm">
                {field.label || field.placeholder}
              </span>
            </label>
            {showErrors && errors[field.name] && (
              <ErrorMessage message={errors[field.name]} />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Search Filters - {route}</h3>
        <button
          type="button"
          onClick={handleReset}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 items-start">
          {fields.map(renderField)}

          {/* Search and Reset Buttons */}
          <div className="flex justify-start gap-2 col-span-1">
            <Button
              type="submit"
              disabled={loading}
              variant="outline"
              className="pl-3 pr-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-1" />
                  Search
                </>
              )}
            </Button>

            {hasAnyInput && (
              <ResetButton onClick={handleReset}
                disabled={loading} />
            )}
          </div>
        </div>
      </form>
    </div>
  );
};