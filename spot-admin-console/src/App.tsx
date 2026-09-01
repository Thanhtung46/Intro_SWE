import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { OwnerLayout } from './components/layout/OwnerLayout'
import { RequireOwnerRole } from './components/layout/RequireOwnerRole'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ChooseRolePage } from './pages/auth/ChooseRolePage'
import { OtpPage } from './pages/auth/OtpPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { OwnerDashboardPage } from './pages/OwnerDashboardPage'
import { OwnerSchedulePage } from './pages/OwnerSchedulePage'
import { OwnerFacilitiesPage } from './pages/OwnerFacilitiesPage'
import { OwnerRevenuePage } from './pages/OwnerRevenuePage'
import { OwnerReviewsPage } from './pages/OwnerReviewsPage'
import { OwnerAccountPage } from './pages/OwnerAccountPage'
import { OwnerSettingsPage } from './pages/OwnerSettingsPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/choose-role" element={<ChooseRolePage />} />
        <Route path="/otp" element={<OtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/forgot-password-otp" element={<OtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/owner"
          element={
            <RequireOwnerRole>
              <OwnerLayout />
            </RequireOwnerRole>
          }
        >
          <Route index element={<OwnerDashboardPage />} />
          <Route path="schedule" element={<OwnerSchedulePage />} />
          <Route path="facilities" element={<OwnerFacilitiesPage />} />
          <Route path="revenue" element={<OwnerRevenuePage />} />
          <Route path="reviews" element={<OwnerReviewsPage />} />
          <Route path="account" element={<OwnerAccountPage />} />
          <Route path="settings" element={<OwnerSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/owner" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
