import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyOTPPage from './pages/VerifyOTPPage';
import SetPasswordPage from './pages/SetPasswordPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import TankInventory from './pages/TankInventory';
import DemandDataEntry from './pages/DemandDataEntry';
import DemandViewData from './pages/DemandViewData';
import AdminDemandApprovals from './pages/AdminDemandApprovals';
import AIForecasting from './pages/AIForecasting';
import RecommendationsInbox from './pages/RecommendationsInbox';
import OrganizationShipments from './pages/OrganizationShipments';
import CostPerformancePage from './pages/CostPerformancePage';
import OperatorLayout from './pages/operator/OperatorLayout';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import BulkUpdates from './pages/operator/BulkUpdates';
import ShipmentActions from './pages/operator/ShipmentActions';
import ViewData from './pages/operator/ViewData';
import OperatorRecommendations from './pages/operator/Recommendations';
import DockManagement from './pages/operator/DockManagement';
import SanctionedListPage from './pages/SanctionedListPage';
import ShipmentRequestCreatePage from './pages/organization/ShipmentRequestCreatePage';
import ShipmentRequestsPage from './pages/organization/ShipmentRequestsPage';
import ShipmentRequestReviewPage from './pages/ShipmentRequestReviewPage';
import ImportRequestCreatePage from './pages/operator/ImportRequestCreatePage';
import OperatorImportRequestsPage from './pages/operator/ImportRequestsPage';
import OrganizationImportRequestsPage from './pages/organization/ImportRequestsPage';
import ImportRequestReviewPage from './pages/ImportRequestReviewPage';
import OperatorShipmentRequestsPage from './pages/operator/OperatorShipmentRequestsPage';
import NotificationCenterPage from './pages/NotificationCenterPage';
import GlobalAlertListener from './components/GlobalAlertListener';
import { SocketProvider } from './context/SocketProvider';
import CostAnalytics from './pages/CostAnalytics';
import DailyPlanningDashboard from './pages/DailyPlanningDashboard';
import SupplyPlanHistory from './pages/SupplyPlanHistory';
import MarineRoutePlanner from './pages/MarineRoutePlanner';
import AdminApprovePage from './pages/AdminApprovePage';
function App() {
  return (
    <SocketProvider>
      <Router>
        <GlobalAlertListener />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            },
          }}
        />
        <Routes>
          {/* Auth */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/admin/approve-request" element={<AdminApprovePage />} />

          {/* Main Dashboard (Admin / Analyst / all roles) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="tanks" element={<TankInventory />} />
            <Route path="demand/entry" element={<DemandDataEntry />} />
            <Route path="demand/view" element={<DemandViewData />} />
            <Route path="demand/approvals" element={<AdminDemandApprovals />} />
            <Route path="forecast" element={<AIForecasting />} />
            <Route path="recommendations" element={<RecommendationsInbox />} />
            <Route path="shipments" element={<OrganizationShipments />} />
            <Route path="analytics/cost-performance" element={<CostPerformancePage />} />
            <Route path="admin/sanctioned-list" element={<SanctionedListPage adminMode />} />
            <Route path="sanctioned-list" element={<SanctionedListPage />} />
            <Route path="shipment-requests" element={<ShipmentRequestsPage />} />
            <Route path="shipment-requests/:id" element={<ShipmentRequestReviewPage />} />
            <Route path="import-requests" element={<OrganizationImportRequestsPage />} />
            <Route path="import-requests/:id" element={<ImportRequestReviewPage />} />
            <Route path="notifications" element={<NotificationCenterPage />} />
            <Route path="cost-analytics" element={<CostAnalytics />} />
            <Route path="supply-planning" element={<DailyPlanningDashboard />} />
            <Route path="supply-planning/history" element={<SupplyPlanHistory />} />
            <Route path="marine-route" element={<MarineRoutePlanner />} />
          </Route>

          <Route path="/organization" element={<DashboardLayout />}>
            <Route path="shipment-requests/create" element={<ShipmentRequestCreatePage />} />
            <Route path="shipment-requests" element={<ShipmentRequestsPage />} />
            <Route path="shipment-requests/:id" element={<ShipmentRequestReviewPage />} />
            <Route path="import-requests" element={<OrganizationImportRequestsPage />} />
            <Route path="import-requests/:id" element={<ImportRequestReviewPage />} />
          </Route>

          {/* Operator Module: Real-Time Shipment Tracking & Bulk Updates */}
          <Route path="/operator" element={<OperatorLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OperatorDashboard />} />
            <Route path="recommendations" element={<OperatorRecommendations />} />
            <Route path="bulk-updates" element={<BulkUpdates />} />
            <Route path="shipment-actions" element={<ShipmentActions />} />
            <Route path="dock-management" element={<DockManagement />} />
            <Route path="view-data" element={<ViewData />} />
            <Route path="shipment-requests" element={<OperatorShipmentRequestsPage />} />
            <Route path="shipment-requests/:id" element={<ShipmentRequestReviewPage />} />
            <Route path="import-requests" element={<OperatorImportRequestsPage />} />
            <Route path="import-requests/create" element={<ImportRequestCreatePage />} />
            <Route path="import-requests/:id" element={<ImportRequestReviewPage />} />
            <Route path="cost-analytics" element={<CostAnalytics />} />
            <Route path="sanctioned-list" element={<SanctionedListPage />} />
            <Route path="supply-planning" element={<DailyPlanningDashboard />} />
            <Route path="supply-planning/history" element={<SupplyPlanHistory />} />
            <Route path="notifications" element={<NotificationCenterPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="/sanctioned-list" element={<Navigate to="/dashboard/sanctioned-list" replace />} />
          <Route path="/admin/sanctioned-list" element={<Navigate to="/dashboard/admin/sanctioned-list" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
