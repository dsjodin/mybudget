import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MonthlyView from './pages/MonthlyView'
import Transactions from './pages/Transactions'
import Mortgages from './pages/Mortgages'
import Cars from './pages/Cars'
import Savings from './pages/Savings'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/budget" element={<MonthlyView />} />
        <Route path="/mortgages" element={<Mortgages />} />
        <Route path="/cars" element={<Cars />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
