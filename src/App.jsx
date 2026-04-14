import { HashRouter, Routes, Route } from 'react-router-dom'
import FanPage from './pages/FanPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<FanPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </HashRouter>
  )
}
