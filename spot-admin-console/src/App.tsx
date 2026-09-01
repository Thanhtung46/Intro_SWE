import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { OwnerLayout } from './components/layout/OwnerLayout'
import { RequireOwnerRole } from './components/layout/RequireOwnerRole'
import { LoginPage } from './pages/LoginPage'
import { OwnerDashboardPage } from './pages/OwnerDashboardPage'
import { OwnerSchedulePage } from './pages/OwnerSchedulePage'
import { OwnerFacilitiesPage } from './pages/OwnerFacilitiesPage'
import { OwnerRevenuePage } from './pages/OwnerRevenuePage'
import { OwnerReviewsPage } from './pages/OwnerReviewsPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/owner" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
