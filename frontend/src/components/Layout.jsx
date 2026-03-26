import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/budget', label: 'Budget', icon: '📋' },
  { path: '/transactions', label: 'Transaktioner', icon: '💳' },
  { path: '/loans', label: 'Lån & Bolån', icon: '🏦' },
  { path: '/leasing', label: 'Leasing', icon: '🚗' },
  { path: '/savings', label: 'Sparkonton', icon: '💰' },
  { path: '/scenarios', label: 'Scenarion', icon: '🔮' },
  { path: '/settings', label: 'Inställningar', icon: '⚙️' },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-gray-900 text-white
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">MyBudget</h1>
          <p className="text-gray-400 text-sm">Hushållsekonomi</p>
        </div>

        <nav className="p-2">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1
                transition-colors text-sm
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
              `}
              end={item.path === '/'}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-semibold text-gray-900">MyBudget</h1>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
