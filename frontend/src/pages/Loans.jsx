import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import Modal from '../components/Modal'
import Card from '../components/Card'
import { formatSEK, formatPercent, formatDate } from '../utils/format'
import { RATE_TYPES } from '../utils/constants'

export default function Loans() {
  const [loans, setLoans] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showRateModal, setShowRateModal] = useState(null)
  const [showSchedule, setShowSchedule] = useState(null)
  const [rateHistory, setRateHistory] = useState([])
  const [schedule, setSchedule] = useState([])
  const [rateForm, setRateForm] = useState({ rate: '', effective_date: '' })
  const [form, setForm] = useState({
    name: '', lender: '', original_amount: '', current_balance: '',
    interest_rate: '', rate_type: 'variable', start_date: '', monthly_amortization: '',
  })

  useEffect(() => { loadLoans() }, [])

  const loadLoans = () => api.getLoans().then(setLoans)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...form,
      original_amount: parseFloat(form.original_amount),
      current_balance: parseFloat(form.current_balance),
      interest_rate: parseFloat(form.interest_rate) / 100,
      monthly_amortization: parseFloat(form.monthly_amortization) || 0,
    }
    if (editing) {
      await api.updateLoan(editing, data)
    } else {
      await api.createLoan(data)
    }
    setShowForm(false)
    setEditing(null)
    loadLoans()
  }

  const handleDelete = async (id) => {
    if (confirm('Ta bort detta lån?')) {
      await api.deleteLoan(id)
      loadLoans()
    }
  }

  const openEdit = (loan) => {
    setForm({
      name: loan.name, lender: loan.lender || '', original_amount: String(loan.original_amount),
      current_balance: String(loan.current_balance), interest_rate: String(loan.interest_rate * 100),
      rate_type: loan.rate_type, start_date: loan.start_date, monthly_amortization: String(loan.monthly_amortization),
    })
    setEditing(loan.id)
    setShowForm(true)
  }

  const openNew = () => {
    setForm({ name: '', lender: '', original_amount: '', current_balance: '', interest_rate: '', rate_type: 'variable', start_date: '', monthly_amortization: '' })
    setEditing(null)
    setShowForm(true)
  }

  const openRateChange = async (loan) => {
    setShowRateModal(loan)
    setRateForm({ rate: String(loan.interest_rate * 100), effective_date: new Date().toISOString().split('T')[0] })
    const history = await api.getLoanRateHistory(loan.id)
    setRateHistory(history)
  }

  const handleRateChange = async (e) => {
    e.preventDefault()
    await api.updateLoanRate(showRateModal.id, {
      rate: parseFloat(rateForm.rate) / 100,
      effective_date: rateForm.effective_date,
    })
    setShowRateModal(null)
    loadLoans()
  }

  const openSchedule = async (loan) => {
    const s = await api.getLoanSchedule(loan.id, 60)
    setSchedule(s)
    setShowSchedule(loan)
  }

  const totalDebt = loans.reduce((s, l) => s + l.current_balance, 0)
  const totalInterest = loans.reduce((s, l) => s + l.monthly_interest_cost, 0)
  const totalAmortization = loans.reduce((s, l) => s + l.monthly_amortization, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lån & Bolån</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          + Nytt lån
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card title="Total skuld" value={formatSEK(totalDebt)} color="red" />
        <Card title="Räntekostnad/mån" value={formatSEK(totalInterest)} color="yellow" />
        <Card title="Amortering/mån" value={formatSEK(totalAmortization)} color="blue" />
      </div>

      <div className="space-y-4">
        {loans.map(loan => (
          <div key={loan.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{loan.name}</h3>
                <p className="text-sm text-gray-500">{loan.lender} — {RATE_TYPES[loan.rate_type]} ränta</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openRateChange(loan)} className="text-sm px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">
                  Ändra ränta
                </button>
                <button onClick={() => openSchedule(loan)} className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  Amorteringsplan
                </button>
                <button onClick={() => openEdit(loan)} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                  Ändra
                </button>
                <button onClick={() => handleDelete(loan.id)} className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                  Ta bort
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Skuld</p>
                <p className="font-medium">{formatSEK(loan.current_balance)}</p>
              </div>
              <div>
                <p className="text-gray-500">Ränta</p>
                <p className="font-medium">{formatPercent(loan.interest_rate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Räntekostnad/mån</p>
                <p className="font-medium">{formatSEK(loan.monthly_interest_cost)}</p>
              </div>
              <div>
                <p className="text-gray-500">Amortering/mån</p>
                <p className="font-medium">{formatSEK(loan.monthly_amortization)}</p>
              </div>
            </div>
          </div>
        ))}
        {loans.length === 0 && (
          <p className="text-center py-12 text-gray-500">Inga lån registrerade. Klicka på "+ Nytt lån" för att lägga till.</p>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Modal title={editing ? 'Ändra lån' : 'Nytt lån'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Namn</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required placeholder="t.ex. Swedbank Lån 1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Långivare</label>
              <input type="text" value={form.lender} onChange={e => setForm({ ...form, lender: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" placeholder="t.ex. Swedbank" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ursprungligt belopp</label>
                <input type="number" value={form.original_amount} onChange={e => setForm({ ...form, original_amount: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nuvarande skuld</label>
                <input type="number" value={form.current_balance} onChange={e => setForm({ ...form, current_balance: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ränta (%)</label>
                <input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required placeholder="2.50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Räntetyp</label>
                <select value={form.rate_type} onChange={e => setForm({ ...form, rate_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2">
                  <option value="variable">Rörlig</option>
                  <option value="fixed">Fast</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Startdatum</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amortering/mån</label>
                <input type="number" value={form.monthly_amortization} onChange={e => setForm({ ...form, monthly_amortization: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Spara</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Rate Change Modal */}
      {showRateModal && (
        <Modal title={`Ändra ränta — ${showRateModal.name}`} onClose={() => setShowRateModal(null)}>
          {rateHistory.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Räntehistorik</h3>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={rateHistory.map(h => ({ ...h, rate: h.rate * 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="effective_date" />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip formatter={v => `${v.toFixed(2)}%`} />
                  <Line type="stepAfter" dataKey="rate" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <form onSubmit={handleRateChange} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Ny ränta (%)</label>
              <input type="number" step="0.01" value={rateForm.rate}
                onChange={e => setRateForm({ ...rateForm, rate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Giltig från</label>
              <input type="date" value={rateForm.effective_date}
                onChange={e => setRateForm({ ...rateForm, effective_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowRateModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Ändra ränta</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Amortization Schedule Modal */}
      {showSchedule && (
        <Modal title={`Amorteringsplan — ${showSchedule.name}`} onClose={() => setShowSchedule(null)}>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 px-2">Mån</th>
                  <th className="py-2 px-2 text-right">Ränta</th>
                  <th className="py-2 px-2 text-right">Amort.</th>
                  <th className="py-2 px-2 text-right">Skuld</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(s => (
                  <tr key={s.month} className="border-b">
                    <td className="py-1.5 px-2">{s.month}</td>
                    <td className="py-1.5 px-2 text-right">{formatSEK(s.interest)}</td>
                    <td className="py-1.5 px-2 text-right">{formatSEK(s.amortization)}</td>
                    <td className="py-1.5 px-2 text-right">{formatSEK(s.balance_end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}
