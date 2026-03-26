import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import Modal from '../components/Modal'
import Card from '../components/Card'
import { formatSEK, currentYear, currentMonth } from '../utils/format'
import { OVERRIDE_TYPES, COLORS } from '../utils/constants'

export default function Scenarios() {
  const [scenarios, setScenarios] = useState([])
  const [loans, setLoans] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [calcResult, setCalcResult] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [selectedForCompare, setSelectedForCompare] = useState([])
  const [form, setForm] = useState({ name: '', description: '', overrides: [] })

  useEffect(() => {
    api.getScenarios().then(setScenarios)
    api.getLoans().then(setLoans)
  }, [])

  const loadScenarios = () => api.getScenarios().then(setScenarios)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form }
    if (editing) {
      await api.updateScenario(editing, data)
    } else {
      await api.createScenario(data)
    }
    setShowForm(false)
    setEditing(null)
    loadScenarios()
  }

  const handleDelete = async (id) => {
    if (confirm('Ta bort detta scenario?')) {
      await api.deleteScenario(id)
      loadScenarios()
    }
  }

  const handleCalculate = async (scenario) => {
    const result = await api.calculateScenario(scenario.id, currentYear(), currentMonth())
    setCalcResult(result)
  }

  const handleCompare = async () => {
    if (selectedForCompare.length < 1) return
    const result = await api.compareScenarios(selectedForCompare, currentYear(), currentMonth())
    setCompareResult(result)
  }

  const toggleCompare = (id) => {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const addOverride = () => {
    setForm({
      ...form,
      overrides: [...form.overrides, { override_type: 'loan_rate', target_id: null, params: {} }],
    })
  }

  const updateOverride = (index, field, value) => {
    const updated = [...form.overrides]
    if (field === 'override_type' || field === 'target_id') {
      updated[index] = { ...updated[index], [field]: value }
    } else {
      updated[index] = { ...updated[index], params: { ...updated[index].params, [field]: parseFloat(value) } }
    }
    setForm({ ...form, overrides: updated })
  }

  const removeOverride = (index) => {
    setForm({ ...form, overrides: form.overrides.filter((_, i) => i !== index) })
  }

  const openEdit = (s) => {
    setForm({ name: s.name, description: s.description || '', overrides: s.overrides })
    setEditing(s.id)
    setShowForm(true)
  }

  const openNew = () => {
    setForm({ name: '', description: '', overrides: [] })
    setEditing(null)
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">What-if Scenarion</h1>
        <div className="flex gap-2">
          {selectedForCompare.length > 0 && (
            <button onClick={handleCompare}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
              Jämför ({selectedForCompare.length})
            </button>
          )}
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            + Nytt scenario
          </button>
        </div>
      </div>

      {/* Scenario list */}
      <div className="space-y-4">
        {scenarios.map(s => (
          <div key={s.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedForCompare.includes(s.id)}
                  onChange={() => toggleCompare(s.id)}
                  className="w-4 h-4"
                />
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.description && <p className="text-sm text-gray-500">{s.description}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleCalculate(s)}
                  className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                  Beräkna
                </button>
                <button onClick={() => openEdit(s)}
                  className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                  Ändra
                </button>
                <button onClick={() => handleDelete(s.id)}
                  className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                  Ta bort
                </button>
              </div>
            </div>

            {s.overrides.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {s.overrides.map((o, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {OVERRIDE_TYPES[o.override_type] || o.override_type}
                    {o.override_type === 'loan_rate' && o.params.rate && ` → ${(o.params.rate * 100).toFixed(2)}%`}
                    {o.override_type === 'income_change' && o.params.amount && ` ${o.params.amount > 0 ? '+' : ''}${formatSEK(o.params.amount)}`}
                    {o.override_type === 'expense_change' && o.params.amount && ` ${o.params.amount > 0 ? '+' : ''}${formatSEK(o.params.amount)}`}
                    {o.override_type === 'new_loan' && o.params.balance && ` ${formatSEK(o.params.balance)}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {scenarios.length === 0 && (
          <p className="text-center py-12 text-gray-500">
            Inga scenarion. Skapa ett för att testa "what-if" analyser.
          </p>
        )}
      </div>

      {/* Calculation Result */}
      {calcResult && (
        <Modal title={`Resultat — ${calcResult.scenario_name}`} onClose={() => setCalcResult(null)}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Nuläge</h3>
              <div className="space-y-1 text-sm">
                <p>Inkomst: <span className="font-medium">{formatSEK(calcResult.base.income)}</span></p>
                <p>Utgifter: <span className="font-medium">{formatSEK(calcResult.base.expenses)}</span></p>
                <p>Ränta: <span className="font-medium">{formatSEK(calcResult.base.interest_cost)}</span></p>
                <p>Amortering: <span className="font-medium">{formatSEK(calcResult.base.amortization)}</span></p>
                <p className="font-bold pt-1 border-t">Kvar: {formatSEK(calcResult.base.remaining)}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Med scenario</h3>
              <div className="space-y-1 text-sm">
                <p>Inkomst: <span className="font-medium">{formatSEK(calcResult.modified.income)}</span>
                  {calcResult.diff.income !== 0 && <span className={calcResult.diff.income > 0 ? 'text-green-600' : 'text-red-600'}> ({calcResult.diff.income > 0 ? '+' : ''}{formatSEK(calcResult.diff.income)})</span>}
                </p>
                <p>Utgifter: <span className="font-medium">{formatSEK(calcResult.modified.expenses)}</span>
                  {calcResult.diff.expenses !== 0 && <span className={calcResult.diff.expenses < 0 ? 'text-green-600' : 'text-red-600'}> ({calcResult.diff.expenses > 0 ? '+' : ''}{formatSEK(calcResult.diff.expenses)})</span>}
                </p>
                <p>Ränta: <span className="font-medium">{formatSEK(calcResult.modified.interest_cost)}</span>
                  {calcResult.diff.interest_cost !== 0 && <span className={calcResult.diff.interest_cost < 0 ? 'text-green-600' : 'text-red-600'}> ({calcResult.diff.interest_cost > 0 ? '+' : ''}{formatSEK(calcResult.diff.interest_cost)})</span>}
                </p>
                <p>Amortering: <span className="font-medium">{formatSEK(calcResult.modified.amortization)}</span></p>
                <p className="font-bold pt-1 border-t">Kvar: {formatSEK(calcResult.modified.remaining)}
                  <span className={calcResult.diff.remaining > 0 ? 'text-green-600' : 'text-red-600'}> ({calcResult.diff.remaining > 0 ? '+' : ''}{formatSEK(calcResult.diff.remaining)})</span>
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Comparison Result */}
      {compareResult && (
        <Modal title="Jämförelse" onClose={() => setCompareResult(null)}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={compareResult.scenarios}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatSEK(v)} />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Inkomst" />
              <Bar dataKey="expenses" fill="#ef4444" name="Utgifter" />
              <Bar dataKey="interest_cost" fill="#f59e0b" name="Ränta" />
              <Bar dataKey="remaining" fill="#3b82f6" name="Kvar" />
            </BarChart>
          </ResponsiveContainer>

          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Scenario</th>
                <th className="py-2 text-right">Inkomst</th>
                <th className="py-2 text-right">Utgifter</th>
                <th className="py-2 text-right">Ränta</th>
                <th className="py-2 text-right">Kvar</th>
              </tr>
            </thead>
            <tbody>
              {compareResult.scenarios.map((s, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1.5 font-medium">{s.name}</td>
                  <td className="py-1.5 text-right">{formatSEK(s.income)}</td>
                  <td className="py-1.5 text-right">{formatSEK(s.expenses)}</td>
                  <td className="py-1.5 text-right">{formatSEK(s.interest_cost)}</td>
                  <td className="py-1.5 text-right font-medium">{formatSEK(s.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <Modal title={editing ? 'Ändra scenario' : 'Nytt scenario'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Namn</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required placeholder="t.ex. Räntehöjning 5%" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beskrivning</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" placeholder="Valfri beskrivning" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Ändringar</label>
                <button type="button" onClick={addOverride} className="text-sm text-blue-600 hover:underline">+ Lägg till</button>
              </div>

              {form.overrides.map((o, i) => (
                <div key={i} className="border rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <select value={o.override_type} onChange={e => updateOverride(i, 'override_type', e.target.value)}
                      className="border rounded px-2 py-1 text-sm">
                      {Object.entries(OVERRIDE_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeOverride(i)} className="text-red-500 text-sm">Ta bort</button>
                  </div>

                  {o.override_type === 'loan_rate' && (
                    <div className="grid grid-cols-2 gap-2">
                      <select value={o.target_id || ''} onChange={e => updateOverride(i, 'target_id', parseInt(e.target.value))}
                        className="border rounded px-2 py-1 text-sm">
                        <option value="">Välj lån...</option>
                        {loans.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                      <input type="number" step="0.01" placeholder="Ny ränta (%)"
                        value={o.params.rate ? (o.params.rate * 100).toFixed(2) : ''}
                        onChange={e => updateOverride(i, 'rate', e.target.value / 100)}
                        className="border rounded px-2 py-1 text-sm" />
                    </div>
                  )}

                  {o.override_type === 'new_loan' && (
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="Lånebelopp"
                        value={o.params.balance || ''}
                        onChange={e => updateOverride(i, 'balance', e.target.value)}
                        className="border rounded px-2 py-1 text-sm" />
                      <input type="number" step="0.01" placeholder="Ränta (%)"
                        value={o.params.rate ? (o.params.rate * 100).toFixed(2) : ''}
                        onChange={e => updateOverride(i, 'rate', e.target.value / 100)}
                        className="border rounded px-2 py-1 text-sm" />
                      <input type="number" placeholder="Amort./mån"
                        value={o.params.monthly_amortization || ''}
                        onChange={e => updateOverride(i, 'monthly_amortization', e.target.value)}
                        className="border rounded px-2 py-1 text-sm" />
                    </div>
                  )}

                  {(o.override_type === 'income_change' || o.override_type === 'expense_change') && (
                    <input type="number" placeholder="Belopp (+ eller -)"
                      value={o.params.amount || ''}
                      onChange={e => updateOverride(i, 'amount', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm" />
                  )}
                </div>
              ))}
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
