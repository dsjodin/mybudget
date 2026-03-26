import { useState, useEffect } from 'react'
import { api } from '../api/client'
import MonthPicker from '../components/MonthPicker'
import Modal from '../components/Modal'
import { formatSEK, formatDate, currentYear, currentMonth } from '../utils/format'

export default function Transactions() {
  const [year, setYear] = useState(currentYear())
  const [month, setMonth] = useState(currentMonth())
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ category_id: '', date: '', amount: '', description: '' })

  useEffect(() => { api.getCategories().then(setCategories) }, [])
  useEffect(() => { loadTransactions() }, [year, month])

  const loadTransactions = () => api.getTransactions(year, month).then(setTransactions)

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '?'

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, amount: parseFloat(form.amount), category_id: parseInt(form.category_id) }
    if (editing) {
      await api.updateTransaction(editing, data)
    } else {
      await api.createTransaction(data)
    }
    setShowForm(false)
    setEditing(null)
    setForm({ category_id: '', date: '', amount: '', description: '' })
    loadTransactions()
  }

  const handleEdit = (t) => {
    setForm({ category_id: String(t.category_id), date: t.date, amount: String(t.amount), description: t.description || '' })
    setEditing(t.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Ta bort denna transaktion?')) {
      await api.deleteTransaction(id)
      loadTransactions()
    }
  }

  const openNew = () => {
    const today = new Date().toISOString().split('T')[0]
    setForm({ category_id: categories[0]?.id || '', date: today, amount: '', description: '' })
    setEditing(null)
    setShowForm(true)
  }

  const total = transactions.reduce((s, t) => s + t.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Transaktioner</h1>
        <div className="flex items-center gap-3">
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            + Ny transaktion
          </button>
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-600">
              <th className="py-3 px-3">Datum</th>
              <th className="py-3 px-3">Kategori</th>
              <th className="py-3 px-3">Beskrivning</th>
              <th className="py-3 px-3 text-right">Belopp</th>
              <th className="py-3 px-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">Inga transaktioner denna månad</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-3">{formatDate(t.date)}</td>
                <td className="py-2 px-3">{getCategoryName(t.category_id)}</td>
                <td className="py-2 px-3 text-gray-600">{t.description || '-'}</td>
                <td className="py-2 px-3 text-right font-medium">{formatSEK(t.amount)}</td>
                <td className="py-2 px-3 text-right">
                  <button onClick={() => handleEdit(t)} className="text-blue-600 hover:underline mr-2">Ändra</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:underline">Ta bort</button>
                </td>
              </tr>
            ))}
          </tbody>
          {transactions.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={3} className="py-2 px-3">Totalt</td>
                <td className="py-2 px-3 text-right">{formatSEK(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Ändra transaktion' : 'Ny transaktion'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required>
                <option value="">Välj kategori...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Datum</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Belopp (SEK)</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beskrivning</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editing ? 'Spara' : 'Lägg till'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
