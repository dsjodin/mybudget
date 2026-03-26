import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { formatSEK, formatDate } from '../utils/format'

export default function Leasing() {
  const [contracts, setContracts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    vehicle_name: '', monthly_cost: '', start_date: '', end_date: '',
    term_months: '', residual_value: '', mileage_limit: '', note: '',
  })

  useEffect(() => { loadContracts() }, [])

  const loadContracts = () => api.getLeasingContracts().then(setContracts)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...form,
      monthly_cost: parseFloat(form.monthly_cost),
      term_months: parseInt(form.term_months),
      residual_value: form.residual_value ? parseFloat(form.residual_value) : null,
      mileage_limit: form.mileage_limit ? parseInt(form.mileage_limit) : null,
    }
    if (editing) {
      await api.updateLeasingContract(editing, data)
    } else {
      await api.createLeasingContract(data)
    }
    setShowForm(false)
    setEditing(null)
    loadContracts()
  }

  const handleDelete = async (id) => {
    if (confirm('Ta bort detta leasingavtal?')) {
      await api.deleteLeasingContract(id)
      loadContracts()
    }
  }

  const openEdit = (c) => {
    setForm({
      vehicle_name: c.vehicle_name, monthly_cost: String(c.monthly_cost),
      start_date: c.start_date, end_date: c.end_date, term_months: String(c.term_months),
      residual_value: c.residual_value ? String(c.residual_value) : '',
      mileage_limit: c.mileage_limit ? String(c.mileage_limit) : '', note: c.note || '',
    })
    setEditing(c.id)
    setShowForm(true)
  }

  const openNew = () => {
    setForm({ vehicle_name: '', monthly_cost: '', start_date: '', end_date: '', term_months: '', residual_value: '', mileage_limit: '', note: '' })
    setEditing(null)
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leasing</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          + Nytt avtal
        </button>
      </div>

      <div className="space-y-4">
        {contracts.map(c => (
          <div key={c.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{c.vehicle_name}</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(c.start_date)} — {formatDate(c.end_date)} ({c.term_months} mån)
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Ändra</button>
                <button onClick={() => handleDelete(c.id)} className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Ta bort</button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>{c.progress_percent}% avklarat</span>
                <span className={c.months_remaining <= 6 ? 'text-red-600 font-medium' : ''}>
                  {c.months_remaining} mån kvar
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${c.months_remaining <= 6 ? 'bg-red-500' : c.months_remaining <= 12 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${c.progress_percent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Månadskostnad</p>
                <p className="font-medium">{formatSEK(c.monthly_cost)}</p>
              </div>
              {c.residual_value && (
                <div>
                  <p className="text-gray-500">Restvärde</p>
                  <p className="font-medium">{formatSEK(c.residual_value)}</p>
                </div>
              )}
              {c.mileage_limit && (
                <div>
                  <p className="text-gray-500">Miltal/år</p>
                  <p className="font-medium">{c.mileage_limit.toLocaleString('sv-SE')} km</p>
                </div>
              )}
              {c.note && (
                <div>
                  <p className="text-gray-500">Anteckning</p>
                  <p className="font-medium">{c.note}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {contracts.length === 0 && (
          <p className="text-center py-12 text-gray-500">Inga leasingavtal. Klicka på "+ Nytt avtal" för att lägga till.</p>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Ändra leasingavtal' : 'Nytt leasingavtal'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Fordon</label>
              <input type="text" value={form.vehicle_name} onChange={e => setForm({ ...form, vehicle_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required placeholder="t.ex. Cupra Born" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Månadskostnad (SEK)</label>
              <input type="number" value={form.monthly_cost} onChange={e => setForm({ ...form, monthly_cost: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Startdatum</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slutdatum</label>
                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Period (mån)</label>
                <input type="number" value={form.term_months} onChange={e => setForm({ ...form, term_months: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Restvärde</label>
                <input type="number" value={form.residual_value} onChange={e => setForm({ ...form, residual_value: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Miltal/år</label>
                <input type="number" value={form.mileage_limit} onChange={e => setForm({ ...form, mileage_limit: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anteckning</label>
              <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Spara</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
