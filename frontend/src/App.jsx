import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Budget from './pages/Budget'
import Transactions from './pages/Transactions'
import Loans from './pages/Loans'
import Leasing from './pages/Leasing'
import Savings from './pages/Savings'
import Scenarios from './pages/Scenarios'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/leasing" element={<Leasing />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
