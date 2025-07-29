import React from 'react';

const ParentDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Parent Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sample Card 1 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-blue-800 mb-2">
              Total Users
            </h3>
            <p className="text-3xl font-bold text-blue-600">1,234</p>
            <p className="text-sm text-blue-600 mt-2">+12% from last month</p>
          </div>

          {/* Sample Card 2 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              Active Sessions
            </h3>
            <p className="text-3xl font-bold text-green-600">567</p>
            <p className="text-sm text-green-600 mt-2">+8% from last week</p>
          </div>

          {/* Sample Card 3 */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-purple-800 mb-2">
              Total Revenue
            </h3>
            <p className="text-3xl font-bold text-purple-600">$45,678</p>
            <p className="text-sm text-purple-600 mt-2">+15% from last quarter</p>
          </div>
        </div>

        {/* Sample Table */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Recent Activity
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">User</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">Action</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">Time</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-4">John Doe</td>
                  <td className="py-2 px-4">Login</td>
                  <td className="py-2 px-4">2 minutes ago</td>
                  <td className="py-2 px-4">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      Success
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-4">Jane Smith</td>
                  <td className="py-2 px-4">Data Update</td>
                  <td className="py-2 px-4">5 minutes ago</td>
                  <td className="py-2 px-4">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      Success
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-4">Bob Johnson</td>
                  <td className="py-2 px-4">Report Generation</td>
                  <td className="py-2 px-4">10 minutes ago</td>
                  <td className="py-2 px-4">
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                      Pending
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Sample Content */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome to Parent Dashboard
          </h2>
          <p className="text-gray-600 leading-relaxed">
            This is a dummy Parent Dashboard component created for demonstration purposes. 
            It includes sample data cards, a recent activity table, and placeholder content 
            to show how the dashboard would look with real data.
          </p>
          <p className="text-gray-600 leading-relaxed mt-4">
            The dashboard provides an overview of key metrics and recent activities, 
            allowing administrators to quickly assess the system's status and user activity.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard; 