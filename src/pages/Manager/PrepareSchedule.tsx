import React, { useEffect, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import ToggleSwitch from "../../components/ui/toggle";
import { useScheduleSession } from "../../context/ScheduleContext";

const inputClasses = `
  w-full
  px-3
  py-1
  border
  border-[#d0d4d9]
  rounded-md
  placeholder:text-gray-500
  font-normal
  focus:outline-none
  focus:ring-2
  focus:ring-[#004175]
  transition
  appearance-none
`;

const getWeekRangeFromDate = (baseDate) => {
  const day = baseDate.getUTCDay();
  const daysSinceThursday = (day + 3) % 7; // Thursday = 4, so we subtract to get back to it
  const startOfWeek = new Date(baseDate);
  startOfWeek.setUTCDate(baseDate.getUTCDate() - daysSinceThursday);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6); // +6 days means 7 total days
  endOfWeek.setUTCHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
};

export const PrepareSchedule = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    userId: "",
    date: "",
    starttime: "",
    endtime: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const { createSession } = useScheduleSession();
  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [scheduleData, setScheduleData] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [currentWeekRange, setCurrentWeekRange] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [showApplyAllDropdown, setShowApplyAllDropdown] = useState(false);
  const [applyToAllDates, setApplyToAllDates] = useState(false);

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.userId) e.userId = "Required";
    if (!form.date) e.date = "Required";
    if (!form.starttime) e.starttime = "Required";
    if (!form.endtime) e.endtime = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    const savedData = localStorage.getItem('scheduleData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setScheduleData(parsedData);
        if (parsedData.length > 0) {
          // Set the week range based on existing data
          const firstDate = new Date(parsedData[0].startDate);
          setCurrentWeekRange(getWeekRangeFromDate(firstDate));
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (scheduleData.length > 0) {
      localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
    }
  }, [scheduleData]);

  const handleChange = (field, value) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
    setErrors((e) => ({ ...e, [field]: undefined }));

    // Check week range when date changes
    if (field === 'date' && value) {
      const selectedDate = new Date(value);
      const weekRange = getWeekRangeFromDate(selectedDate);
      
      // If there's existing data and it's not published, check if the week is different
      if (scheduleData.length > 0 && !isPublished && currentWeekRange) {
        const existingWeekStart = currentWeekRange.startOfWeek.toISOString().split('T')[0];
        const newWeekStart = weekRange.startOfWeek.toISOString().split('T')[0];
        
        if (existingWeekStart !== newWeekStart) {
          alert("Week can't be changed until saved data is published!");
          setForm(f => ({ ...f, date: "" }));
          return;
        }
      }
      
      setCurrentWeekRange(weekRange);
    }
  };

  const handleClientSelect = (client: { id: string | number; name: string }, addressId: number | string) => {
    setForm((f) => ({
      ...f,
      clientId: String(client.id),
      addressId: String(addressId),
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

    const selectedClient = searchedClients.find((c) => String(c.id) === String(client.id));
    const selectedAddress = selectedClient?.addresses.find((a) => String(a.id) === String(addressId));
    setSelectedAddressText(selectedAddress?.address || "");
  };

  const handleUserSelect = (user: { id: string | number; name: string }) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    setUserSearch(user.name);
    setShowUserDropdown(false);
    setErrors((e) => ({ ...e, userId: undefined }));
  };

  const calculateHours = (start: string, end: string) => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let hours = endH - startH + (endM - startM) / 60;
    if (hours < 0) hours += 24;
    return parseFloat(hours.toFixed(2));
  };

  const resetForm = () => {
    setForm({ 
      clientId: "", 
      addressId: "", 
      userId: "", 
      date: "", 
      starttime: "", 
      endtime: "" 
    });
    setClientSearch("");
    setSelectedAddressText("");
    setUserSearch("");
    setAuto(false);
    setErrors({});
    setEditingId(null);
    setCurrentWeekRange(null);
    setScheduleData([]);
    setIsPublished(false);
    setApplyToAllDates(false);
  };

  const generateDateColumns = () => {
    if (!currentWeekRange) return [];
    
    const dates = [];
    const startDate = new Date(currentWeekRange.startOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      });
    }
    return dates;
  };

  const dateColumns = generateDateColumns();

  // Group schedule data by user and date
  const getScheduleForUserAndDate = (userId, date) => {
    return scheduleData.filter(item => 
      item.userId === userId && item.startDate === date
    );
  };

  // Get unique users from schedule data
  const getUniqueUsers = () => {
    const userMap = new Map();
    scheduleData.forEach(item => {
      if (!userMap.has(item.userId)) {
        userMap.set(item.userId, {
          id: item.userId,
          name: item.userName,
          phone: item.userPhone
        });
      }
    });
    return Array.from(userMap.values());
  };

  const uniqueUsers = getUniqueUsers();

  // Calculate totals
  const calculateDayTotal = (date) => {
    return scheduleData
      .filter(item => item.startDate === date)
      .reduce((total, item) => total + item.shifts[0].hours, 0);
  };

  const calculateUserTotal = (userId) => {
    return scheduleData
      .filter(item => item.userId === userId)
      .reduce((total, item) => total + item.shifts[0].hours, 0);
  };

  const calculateGrandTotal = () => {
    return scheduleData.reduce((total, item) => total + item.shifts[0].hours, 0);
  };

  const handleUserAutoToggle = (userId, enabled) => {
    // Update auto setting for specific user's schedules
    setScheduleData(prev => prev.map(item => 
      item.userId === userId ? { ...item, auto: enabled } : item
    ));
  };

  const handlePublish = () => {
    setIsPublished(true);
    // Clear localStorage when published
    localStorage.removeItem('scheduleData');
    alert("Schedule published successfully! Employees with schedule changes will receive notifications.");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitLoader(true);

    try {
      // Get client and user details from the hook data
      const selectedClient = searchedClients.find(c => String(c.id) === form.clientId);
      const selectedAddress = selectedClient?.addresses.find(a => String(a.id) === form.addressId);
      const selectedUser = searchedUsers.find(u => String(u.id) === form.userId);

      const payload = {
        clientId: Number(form.clientId),
        addressId: Number(form.addressId),
        userId: Number(form.userId),
        startDate: form.date,
        auto,
        shifts: [
          {
            date: form.date,
            startTime: form.starttime,
            endTime: form.endtime,
            hours: calculateHours(form.starttime, form.endtime),
          },
        ],
        // Add additional data for the schedule table
        clientName: selectedClient?.name,
        address: selectedAddress?.address,
        userName: selectedUser?.name,
        userPhone: selectedUser?.phone || '', // Assuming phone might be available
      };

      const newScheduleItem = {
        id: Date.now(),
        ...payload,
      };

      setScheduleData(prev => [...prev, newScheduleItem]);

      if (scheduleData.length === 0) {
        const selectedDate = new Date(form.date);
        setCurrentWeekRange(getWeekRangeFromDate(selectedDate));
      }
      setForm({
        clientId: "",
        addressId: "",
        userId: "",
        date: "",
        starttime: "",
        endtime: "",
      });
      setClientSearch("");
      setSelectedAddressText("");
      setUserSearch("");
      setAuto(false);
      setErrors({});
      
      alert("Schedule session created successfully!");
    } catch (err) {
      console.error("Error creating schedule session:", err);
      alert("Failed to create schedule session.");
    } finally {
      setSubmitLoader(false);
    }
  };

  return (
    <div className="min-h-screen font-sans w-full p-6">
      <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
        <h2
          style={{
            fontFamily:
              'system-ui, ui-sans-serif, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            fontWeight: 600,
            fontSize: '20px',
            lineHeight: '28px',
            color: 'rgb(0, 0, 0)',
          }}
          className="mb-2"
        >
          Prepare Schedule
        </h2>
        
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-start">
            
            {/* Client Search */}
            <div className="relative">
              <input
                type="text"
                value={clientSearch}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setForm((f) => ({ ...f, clientId: "", addressId: "" }));
                  setSelectedAddressText("");
                }}
                placeholder="Client Name"
                className={inputClasses}
              />
              {errors.clientId && <span className="text-xs text-red-500">{errors.clientId}</span>}
              {errors.addressId && (
                <span className="text-xs text-red-500 block">{errors.addressId}</span>
              )}
              {showClientDropdown && clientSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-50 font-sans">
                  {loadingClients ? (
                    <div className="p-2 text-sm text-gray-500">Searching clients...</div>
                  ) : searchedClients.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">No clients found</div>
                  ) : (
                    searchedClients.flatMap((client, clientIndex) =>
                      client.addresses.map((address, addressIndex) => {
                        const isEven = (clientIndex + addressIndex) % 2 === 0;
                        return (
                          <div
                            key={`${client.id}-${address.id}`}
                            onMouseDown={() =>
                              handleClientSelect({ id: client.id, name: client.name }, address.id)
                            }
                            className={`p-4 cursor-pointer text-sm ${
                              isEven ? "bg-white" : "bg-gray-50"
                            } hover:bg-gray-100`}
                          >
                            <div className="font-semibold text-gray-600 text-base">
                              {client.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {address.label || address.address}
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}
            </div>
            <div>
              <input
                type="text"
                value={selectedAddressText}
                placeholder="Location"
                readOnly
                className={`${inputClasses}`}
              />
            </div>

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
                placeholder="User Name"
                className={inputClasses}
              />
              {errors.userId && (
                <span className="text-xs text-red-500">{errors.userId}</span>
              )}
              {showUserDropdown && userSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                  {loadingUsers ? (
                    <div className="p-2 text-sm text-gray-500">Searching users...</div>
                  ) : searchedUsers.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">No users found</div>
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
            <div>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                placeholder="Select Date"
                onFocus={(e) => e.target.showPicker?.()}
                className={`${inputClasses} ${form.date ? "text-black" : "text-gray-500"}`}
              />
              {errors.date && (
                <span className="text-xs text-red-500">{errors.date}</span>
              )}
            </div>
            <div>
              <input
                type="time"
                value={form.starttime}
                onChange={(e) => handleChange("starttime", e.target.value)}
                placeholder="Start Time"
                step="60"
                onFocus={(e) => e.target.showPicker?.()}
                className={`${inputClasses} ${form.starttime ? "text-black" : "text-gray-500"}`}
              />
              {errors.starttime && (
                <span className="text-xs text-red-500">{errors.starttime}</span>
              )}
            </div>
            <div>
              <input
                type="time"
                value={form.endtime}
                onChange={(e) => handleChange("endtime", e.target.value)}
                placeholder="End Time"
                onFocus={(e) => e.target.showPicker?.()}
                className={`${inputClasses} ${form.endtime ? "text-black" : "text-gray-500"}`}
              />
              {errors.endtime && (
                <span className="text-xs text-red-500">{errors.endtime}</span>
              )}
            </div>
            <div className="flex items-center">
              <ToggleSwitch enabled={auto} onToggle={setAuto} label="Auto" />
            </div>
            <div className="flex gap-2 justify-start">
              <button
                type="submit"
                disabled={submitLoader}
                className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
              >
                {submitLoader ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </button>
              {(form.date || form.starttime || form.endtime || form.userId || form.addressId || form.clientId || auto ) && (
                
              <button
                type="button"
                onClick={resetForm}
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

       {scheduleData.length > 0 && (
        <div className="bg-white rounded shadow-sm border">
          {/* Client Info */}
          <div className="p-4 border-b bg-gray-50">
            <div className="font-medium text-gray-800">
              {scheduleData[0]?.clientName || 'Client Name'}
            </div>
            <div className="text-sm text-gray-600">
              {scheduleData[0]?.address || 'Address'}
            </div>
            {currentWeekRange && (
              <div className="text-xs text-gray-500 mt-1">
                Week: {currentWeekRange.startOfWeek.toLocaleDateString()} - {currentWeekRange.endOfWeek.toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Employee Name
                  </th>
                  {dateColumns.map(dateCol => (
                    <th key={dateCol.date} className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 min-w-[100px]">
                      {dateCol.display}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">
                    Total
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">
                    Auto
                  </th>
                </tr>
              </thead>
              <tbody>
                {uniqueUsers.map(user => (
                  <React.Fragment key={user.id}>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="font-medium text-gray-800">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.phone}</div>
                      </td>
                      {dateColumns.map(dateCol => {
                        const daySchedules = getScheduleForUserAndDate(user.id, dateCol.date);
                        return (
                          <td key={dateCol.date} className="border border-gray-300 px-2 py-2 text-center text-sm">
                            {daySchedules.length > 0 ? (
                              <div className="space-y-1">
                                {daySchedules.map(schedule => (
                                  <div key={schedule.id} className="bg-blue-50 rounded px-2 py-1">
                                    <div className="text-xs font-medium">
                                      {schedule.shifts[0].startTime} - {schedule.shifts[0].endTime}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                        {calculateUserTotal(user.id)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <ToggleSwitch enabled={auto} onToggle={setAuto} label="Auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                        Total
                      </td>
                      {dateColumns.map(dateCol => {
                        const daySchedules = getScheduleForUserAndDate(user.id, dateCol.date);
                        const dayTotal = daySchedules.reduce((total, schedule) => 
                          total + schedule.shifts[0].hours, 0
                        );
                        return (
                          <td key={dateCol.date} className="border border-gray-300 px-2 py-2 text-center text-sm font-medium">
                            {dayTotal > 0 ? dayTotal : '-'}
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                        {calculateUserTotal(user.id)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2"></td>
                    </tr>
                  </React.Fragment>
                ))}
                {/* Grand Total Row */}
                <tr className="bg-gray-50 font-medium">
                  <td className="border border-gray-300 px-4 py-2">Grand Total</td>
                  {dateColumns.map(dateCol => (
                    <td key={dateCol.date} className="border border-gray-300 px-2 py-2 text-center">
                      {calculateDayTotal(dateCol.date) || '-'}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {calculateGrandTotal()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Publish Button */}
          <div className="p-4 border-t">
            <button 
              onClick={handlePublish}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700"
              disabled={isPublished}
            >
              {isPublished ? 'Published' : 'Publish'}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Employees who had change in the schedule should get "Your schedule has been updated!" notification after Publish is clicked.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};