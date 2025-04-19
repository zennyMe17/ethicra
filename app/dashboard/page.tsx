// app/dashboard/page.jsx (or pages/dashboard.jsx)
"use client";

import ProtectedRoute from '@/components/ProtectedRoute';

const DashboardPage = () => {
  return (
    <ProtectedRoute>
      <div>
        <h1>User Dashboard</h1>
        {/* Your dashboard content that only regular users should see */}
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;