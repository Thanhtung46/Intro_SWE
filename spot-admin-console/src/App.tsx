import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Admin Dashboard</div>} />
        <Route path="/users" element={<div>Users Management</div>} />
        <Route path="/venues" element={<div>Venues Management</div>} />
        <Route path="/bookings" element={<div>Bookings</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
