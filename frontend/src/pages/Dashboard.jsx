import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import Card from '../components/Card'
import MonthPicker from '../components/MonthPicker'
import { formatSEK, MONTHS_SHORT, currentYear, currentMonth } from '../utils/format'
import { COLORS } from '../utils/constants'

export default function Dashboard() {
  const [year, setYear] = useState(currentYear())
  const [month, setMonth] = useState(currentMonth())
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState(null)
  const [distribution, setDistribution] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getDashboardSummary(year, month),
      api.getDashboardTrends(year),
      api.getDashboardDistribution(year, month),
    ]).then(([s, t, d]) => {
      setSummary(s)
      setTrends(t)
      setDistribution(d)
    }).finally(() => setLoading(false))
  }, [year, month])

  if (loading) return <div className="text-center py-12 text-gray-500">Laddar...</div>
  if (!summary) return <div className="text-center py-12 text-gray-500">Ingen data</div>

  const trendData = trends?.months?.map(m => ({
    name: MONTHS_SHORT[m.month - 1],
    'Inkomst Budget': m.income_budget,
    'Inkomst Verklig': m.income_actual,
    'Utgift Budget': m.expense_budget,
    'Utgift Verklig': m.expense_actual,
  })) || []

  const distData = distribution?.distribution?.filter(d => d.actual > 0 || d.budget > 0) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Inkomster (budget)" value={formatSEK(summary.income_budget)} color="green"
          subtitle={`Verklig: ${formatSEK(summary.income_actual)}`} />
        <Card title="Utgifter (budget)" value={formatSEK(summary.expense_budget)} color="red"
          subtitle={`Verklig: ${formatSEK(summary.expense_actual)}`} />
        <Card title="Ränta + Amortering" value={formatSEK(summary.loan_interest + summary.loan_amortization)} color="yellow"
          subtitle={`Ränta: ${formatSEK(summary.loan_interest)} | Amort: ${formatSEK(summary.loan_amortization)}`} />
        <Card title="Kvar" value={formatSEK(summary.remaining_budget)} color={summary.remaining_budget >= 0 ? 'blue' : 'red'}
          subtitle={`Verklig: ${formatSEK(summary.remaining_actual)}`} />
      </div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card title="Total skuld" value={formatSEK(summary.total_debt)} color="purple" />
        <Card title="Totalt sparande" value={formatSEK(summary.total_savings)} color="green" />
        <Card title="Leasingavtal" color="yellow">
          {summary.expiring_leasing?.length > 0 ? (
            <div className="mt-2">
              {summary.expiring_leasing.map(l => (
                <p key={l.id} className="text-sm text-yellow-800">
                  {l.vehicle_name} — {l.months_remaining} mån kvar
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">Inga avtal går ut snart</p>
          )}
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold mb-4">Månadsöversikt {year}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatSEK(v)} />
              <Legend />
              <Bar dataKey="Inkomst Verklig" fill="#10b981" />
              <Bar dataKey="Utgift Verklig" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold mb-4">Utgiftsfördelning {MONTHS_SHORT[month - 1]}</h2>
          {distData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={distData} dataKey="actual" nameKey="category_name" cx="50%" cy="50%"
                  outerRadius={100} label={({ category_name, percent }) =>
                    `${category_name} ${(percent * 100).toFixed(0)}%`
                  }>
                  {distData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => formatSEK(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Ingen data för denna period</p>
          )}
        </div>

        {/* Budget vs Actual */}
        <div className="bg-white rounded-xl border p-4 lg:col-span-2">
          <h2 className="font-semibold mb-4">Budget vs Verklig per kategori</h2>
          {summary.categories?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.categories.filter(c => c.category_type === 'expense').slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category_name" angle={-30} textAnchor="end" height={80} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatSEK(v)} />
                <Legend />
                <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                <Bar dataKey="actual" fill="#ef4444" name="Verklig" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Lägg till kategorier och budgetposter för att se data</p>
          )}
        </div>
      </div>

      {/* Savings & Loans detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold mb-3">Sparkonton</h2>
          {summary.savings_accounts?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Konto</th>
                  <th className="pb-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {summary.savings_accounts.map(a => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2">{a.name}</td>
                    <td className="py-2 text-right font-medium">{formatSEK(a.current_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-sm">Inga sparkonton ännu</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold mb-3">Lån</h2>
          {summary.loans?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Lån</th>
                  <th className="pb-2 text-right">Skuld</th>
                  <th className="pb-2 text-right">Ränta/mån</th>
                </tr>
              </thead>
              <tbody>
                {summary.loans.map(l => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-right">{formatSEK(l.current_balance)}</td>
                    <td className="py-2 text-right">{formatSEK(l.monthly_interest_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-sm">Inga lån registrerade</p>
          )}
        </div>
      </div>
    </div>
  )
}
