import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format date in local timezone (YYYY-MM-DD)
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Utility function to format date string in local timezone (YYYY-MM-DD)
export const formatDateStringLocal = (dateString: string): string => {
  if (!dateString) return '';
  return formatDateLocal(new Date(dateString));
};

// Utility function to format time display for UI
// Shows 24:00 instead of 00:00 for better UX
export const formatTimeDisplay = (timeString: string): string => {
  if (!timeString) return '';
  
  // If time is 00:00, display as 24:00 for better UX
  if (timeString === '00:00') {
    return '24:00';
  }
  
  return timeString;
};
