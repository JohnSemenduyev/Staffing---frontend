import React from 'react';
import { useSchedule } from '../context/ViewSchedule';

const ScheduleSessionTable = () => {
  const { sessions, loading } = useSchedule();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500">Loading sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mt-6">
      <div className="relative w-full overflow-auto rounded-2xl border border-gray-200 shadow-xl" style={{ height: "400px", minHeight: "400px" }}>
        <table className="w-full table-auto text-sm text-gray-800 font-sans">
          <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left whitespace-nowrap">Client</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Address</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">User</th>
              <th className="px-4 py-2 text-left whitespace-nowrap">Start Date</th>
              <th className="px-4 py-2 text-left whitespace-nowrap w-[200px] max-w-[250px]">Shifts</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length > 0 ? (
              sessions.map((session, index) => (
                <tr
                  key={session.id}
                  className={`hover:bg-blue-50 transition-colors ${
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-2">{session.client.name}</td>
                  <td className="px-4 py-2">{session.address.address}</td>
                  <td className="px-4 py-2">{session.user.name}</td>
                  <td className="px-4 py-2">
                    {new Date(Number(session.startDate)).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-2 w-[200px] max-w-[250px] break-words">
                    <ul className="space-y-1">
                      {session.shifts.map(shift => (
                        <li key={shift.id} className="ml-4 list-disc">
                          {shift.startTime} - {shift.endTime} ({shift.hours} hrs)
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-gray-500 bg-white"
                >
                  No schedule sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleSessionTable;
