import React, { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { CustomDatePicker } from "../../../components/CustomDatePicker";
import ToggleSwitch from "../../../components/ui/toggle";
import { useSearchUsers } from "../../../hooks/useSearchUser";
import { useDebounce } from "../../../hooks/useDebounce";
import { useToast } from "../../../hooks/use-toast";
import { FormData, User, ScheduleItem, WeekRange } from "./types";
import { 
    inputClasses, 
    validateForm, 
    calculateHours, 
    sortShiftsByTime,
    getWeekRangeFromDate 
  } from "./utils";
import { ErrorMessage } from "../../../components/ui/error-message";
interface AddGuardFormProps {
  scheduleData: ScheduleItem[];
  setScheduleData: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  currentWeekRange: WeekRange | null;
  isEditMode: boolean;
}

export const AddGuardForm: React.FC<AddGuardFormProps> = ({
  scheduleData,
  setScheduleData,
  currentWeekRange,
  isEditMode
}) => {
  const [form, setForm] = useState<FormData>({
    userId: "",
    date: "",
    starttime: "",
    endtime: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const [applyAllWeek, setApplyAllWeek] = useState(false);
  const { toast: hookToast } = useToast();

  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  
    // Check week range when date changes
    if (field === 'date' && value && currentWeekRange) {
      const selectedDate = new Date(value);
      const weekRange = getWeekRangeFromDate(selectedDate);
  
      const existingWeekStart = currentWeekRange.startOfWeek.toISOString().split('T')[0];
      const newWeekStart = weekRange.startOfWeek.toISOString().split('T')[0];
  
      if (existingWeekStart !== newWeekStart) {
        hookToast({
          title: "Invalid Date Selection",
          description: "Please select a date from the same week (Thursday to Wednesday) as the existing schedule!",
          variant: "destructive",
        });
        setForm(f => ({ ...f, date: "" }));
        return;
      }
    }
  };
  const handleUserSelect = (user: User) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    setUserSearch(user.name);
    setShowUserDropdown(false);
    setErrors((e) => ({ ...e, userId: undefined, overlap: undefined }));
  };

  const resetAddGuardForm = () => {
    setForm({
      userId: "",
      date: "",
      starttime: "",
      endtime: ""
    });
    setUserSearch("");
    setAuto(false);
    setErrors({});
    setApplyAllWeek(false);

    hookToast({
      title: "Form Reset",
      description: "Add guard form has been reset successfully.",
    });
  };

  const onSubmitAddGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm(form, scheduleData);
    setErrors(formErrors);
  
    if (Object.keys(formErrors).length > 0) return;
  
    setSubmitLoader(true);
  
    try {
      // Get user details from the hook data
      const selectedUser = searchedUsers.find(u => String(u.id) === form.userId);
  
      if (!selectedUser) {
        hookToast({
          title: "Error",
          description: "Selected user not found.",
          variant: "destructive",
        });
        return;
      }
  
      // Create a copy of current schedule data to work with
      const updatedScheduleData = [...scheduleData];
      const newShift = {
        id: Date.now(),
        startTime: form.starttime,
        endTime: form.endtime,
        hours: calculateHours(form.starttime, form.endtime),
      };
  
      if (applyAllWeek && currentWeekRange) {
        // Add for each day in the week (Thu-Wed)
        const startDate = new Date(currentWeekRange.startOfWeek);
        
        for (let i = 0; i < 7; i++) {
          const dateObj = new Date(startDate);
          dateObj.setDate(startDate.getDate() + i);
          const dateStr = dateObj.toISOString().split('T')[0];
          
          // Check if user already has a schedule for this date
          const existingScheduleIndex = updatedScheduleData.findIndex(
            item => item.userId === Number(form.userId) && item.startDate === dateStr
          );
  
          if (existingScheduleIndex !== -1) {
            // Add new shift to existing schedule
            const newShifts = [
              ...updatedScheduleData[existingScheduleIndex].shifts,
              {
                ...newShift,
                id: Date.now() + i, // Ensure unique ID
                date: dateStr,
              }
            ];
  
            // Sort shifts by time when adding
            updatedScheduleData[existingScheduleIndex] = {
              ...updatedScheduleData[existingScheduleIndex],
              shifts: sortShiftsByTime(newShifts)
            };
          } else {
            // Create new schedule for this day
            updatedScheduleData.push({
              id: Date.now() + i,
              clientId: scheduleData[0]?.clientId || 0,
              addressId: scheduleData[0]?.addressId || 0,
              userId: Number(form.userId),
              startDate: dateStr,
              auto,
              shifts: [
                {
                  ...newShift,
                  id: Date.now() + i,
                  date: dateStr,
                },
              ],
              clientName: scheduleData[0]?.clientName || "Unknown Client",
              address: scheduleData[0]?.address || "Unknown Address",
              userName: selectedUser.name,
              userPhone: selectedUser.phone || '',
            });
          }
        }
      } else {
        // Single day entry
        const existingScheduleIndex = updatedScheduleData.findIndex(
          item => item.userId === Number(form.userId) && item.startDate === form.date
        );
  
        if (existingScheduleIndex !== -1) {
          // Add new shift to existing schedule
          const newShifts = [
            ...updatedScheduleData[existingScheduleIndex].shifts,
            {
              ...newShift,
              date: form.date,
            }
          ];
  
          // Sort shifts by time when adding
          updatedScheduleData[existingScheduleIndex] = {
            ...updatedScheduleData[existingScheduleIndex],
            shifts: sortShiftsByTime(newShifts)
          };
        } else {
          // Create new schedule
          updatedScheduleData.push({
            id: Date.now(),
            clientId: scheduleData[0]?.clientId || 0,
            addressId: scheduleData[0]?.addressId || 0,
            userId: Number(form.userId),
            startDate: form.date,
            auto,
            shifts: [
              {
                ...newShift,
                date: form.date,
              },
            ],
            clientName: scheduleData[0]?.clientName || "Unknown Client",
            address: scheduleData[0]?.address || "Unknown Address",
            userName: selectedUser.name,
            userPhone: selectedUser.phone || '',
          });
        }
      }
  
      // Update schedule data and re-render table
      setScheduleData(updatedScheduleData);
  
      resetAddGuardForm();
  
      hookToast({
        title: "Success",
        description: "New guard shift added successfully!",
      });
    } catch (err) {
      console.error("Error adding guard shift:", err);
      hookToast({
        title: "Error",
        description: "Failed to add guard shift.",
        variant: "destructive",
      });
    } finally {
      setSubmitLoader(false);
    }
  };

  if (!isEditMode) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 mb-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Edit Schedule</h3>

      <form onSubmit={onSubmitAddGuard} autoComplete="off">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">

          {/* User Search */}
          <div className="relative">
            <input
              type="text"
              value={userSearch}
              onFocus={() => setShowUserDropdown(true)}
              onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
              onChange={e => {
                setUserSearch(e.target.value);
                setForm(f => ({ ...f, userId: "" }));
              }}
              placeholder="Guard Name"
              className={inputClasses}
            />
            {errors.userId && (
              <ErrorMessage message={errors.userId} />
            )}
            {showUserDropdown && userSearch.length >= 2 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                {loadingUsers ? (
                  <div className="p-2 text-sm text-gray-500">Searching guards...</div>
                ) : searchedUsers.length === 0 ? (
                  <div className="p-2 text-gray-500 text-sm">No guards found</div>
                ) : (
                  searchedUsers.map(user => (
                    <div
                      key={user.id}
                      className="p-2 cursor-pointer text-sm hover:bg-gray-50"
                      onMouseDown={() => handleUserSelect(user)}
                    >
                      {user.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center">
            <div className="flex items-center flex-row w-full ">
              <CustomDatePicker
              value={form.date}
              onChange={handleFormChange}
              placeholder="Select Date"
              minDate={currentWeekRange?.startOfWeek.toISOString().split('T')[0]}
              maxDate={currentWeekRange?.endOfWeek.toISOString().split('T')[0]}
            />
            
            <div className="flex items-center m-2 space-x-2">
              <input
                id="applyAllWeek"
                type="checkbox"
                checked={applyAllWeek}
                disabled={!form.date}
                onChange={e => setApplyAllWeek(e.target.checked)}
                className={`w-4 h-4 rounded ${form.date
                    ? "accent-blue-600 focus:ring-blue-500 border-gray-300"
                    : "accent-gray-400 border-gray-200 cursor-not-allowed"
                  }`}
              />
              <label
                htmlFor="applyAllWeek"
                className={`text-xs whitespace-nowrap ${form.date
                    ? "text-gray-600 cursor-pointer"
                    : "text-gray-400 cursor-not-allowed"
                  }`}
              >
                All Week
              </label>
            </div>
            </div>
            
            {errors.date && (
              <ErrorMessage message={errors.date} />
            )}
          </div>

          {/* Start Time */}
          <div>
            <input
              type={form.starttime ? "time" : "text"}
              value={form.starttime}
              onChange={(e) => handleFormChange("starttime", e.target.value)}
              placeholder="Start Time"
              step="60"
              onFocus={(e) => {
                e.target.type = "time";
                e.target.showPicker?.();
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  e.target.type = "text";
                }
              }}
              className={`${inputClasses} ${form.starttime ? "text-black" : "text-gray-500"}`}
            />
            {errors.starttime && (
              <ErrorMessage message={errors.starttime} />
            )}
          </div>

          {/* End Time */}
          <div>
            <input
              type={form.endtime ? "time" : "text"}
              value={form.endtime}
              onChange={(e) => handleFormChange("endtime", e.target.value)}
              placeholder="End Time"
              onFocus={(e) => {
                e.target.type = "time";
                e.target.showPicker?.();
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  e.target.type = "text";
                }
              }}
              className={`${inputClasses} ${form.endtime ? "text-black" : "text-gray-500"}`}
            />
            {errors.endtime && (
              <ErrorMessage message={errors.endtime} />
            )}
            {errors.overlap && (
              <ErrorMessage message={errors.overlap} />
            )}
          </div>

          {/* Auto Toggle and Buttons */}
          <div className="flex items-center gap-2">
            <ToggleSwitch enabled={auto} onToggle={setAuto} label="Auto" />

            <button
              type="submit"
              disabled={submitLoader}
              className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
            >
              {submitLoader ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </>
              )}
            </button>

            {(form.date || form.starttime || form.endtime || form.userId || auto) && (
              <button
                type="button"
                onClick={resetAddGuardForm}
                className="inline-flex items-center px-4 py-1 border border-gray-400 text-gray-600 hover:bg-gray-50 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
