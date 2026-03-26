import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import Modal from '../components/Modal'
import Card from '../components/Card'
import { formatSEK, formatPercent, formatDate } from '../utils/format'

export default function Savings() {
  const [accounts, setAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showTxnModal, setShowTxnModal] = useState(null)
  const [showHistory, setShowHistory] = useState(null)
  const [txnHistory, setTxnHistory] = useState([])
  const [form, setForm] = useState({ name: '', current_balance: '', interest_rate: '' })
  const [txnForm, setTxnForm] = useState({ amount: '', date: '', description: '' })
  const [txnType, setTxnType] = useState('deposit')

  useEffect(() => { loadAccounts() }, [])

  const loadAccounts = () => api.getSavingsAccounts().then(setAccounts)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      current_balance: parseFloat(form.current_balance) || 0,
      interest_rate: parseFloat(form.interest_rate) / 100 || 0,
    }
    if (editing) {
      await api.updateSavingsAccount(editing, data)
    } else {
      await api.createSavingsAccount(data)
    }
    setShowForm(false)
    setEditing(null)
    loadAccounts()
  }

  const handleDelete = async (id) => {
    if (confirm('Ta bort detta sparkonto?')) {
      await api.deleteSavingsAccount(id)
      loadAccounts()
    }
  }

  const handleTxn = async (e) => {
    e.preventDefault()
    const amount = parseFloat(txnForm.amount) * (txnType === 'withdrawal' ? -1 : 1)
    await api.addSavingsTransaction(showTxnModal.id, {
      amount,
      date: txnForm.date,
      description: txnForm.description,
    })
    setShowTxnModal(null)
    loadAccounts()
  }

  const openTxn = (account, type) => {
    setTxnType(type)
    setTxnForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '' })
    setShowTxnModal(account)
  }

  const openHistory = async (account) => {
    const txns = await api.getSavingsTransactions(account.id)
    setTxnHistory(txns)
    setShowHistory(account)
  }

  const totalSavings = accounts.reduce((s, a) => s + a.current_balance, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sparkonton</h1>
        <button onClick={() => { setForm({ name: '', current_balance: '', interest_rate: '' }); setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          + Nytt konto
        </button>
      </div>

      <div className="mb-6">
        <Card title="Totalt sparande" value={formatSEK(totalSavings)} color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(a => (
          <div key={a.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold">{a.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => {
                  setForm({ name: a.name, current_balance: String(a.current_balance), interest_rate: String(a.interest_rate * 100) })
                  setEditing(a.id); setShowForm(true)
                }} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Ändra</button>
                <button onClick={() => handleDelete(a.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Ta bort</button>
              </div>
            </div>

            <p className="text-3xl font-bold text-green-700 mb-1">{formatSEK(a.current_balance)}</p>
            {a.interest_rate > 0 && (
              <p className="text-sm text-gray-500">Ränta: {formatPercent(a.interest_rate)}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => openTxn(a, 'deposit')}
                className="flex-1 text-sm px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                Insättning
              </button>
              <button onClick={() => openTxn(a, 'withdrawal')}
                className="flex-1 text-sm px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                Uttag
              </button>
              <button onClick={() => openHistory(a)}
                className="text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                Historik
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <p className="text-center py-12 text-gray-500">Inga sparkonton ännu.</p>
      )}

      {/* Create/Edit Account */}
      {showForm && (
        <Modal title={editing ? 'Ändra sparkonto' : 'Nytt sparkonto'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Namn</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required placeholder="t.ex. Sparkonto" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Startsaldo (SEK)</label>
              <input type="number" value={form.current_balance} onChange={e => setForm({ ...form, current_balance: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ränta (%)</label>
              <input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" placeholder="0" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Spara</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transaction Modal */}
      {showTxnModal && (
        <Modal title={`${txnType === 'deposit' ? 'Insättning' : 'Uttag'} — ${showTxnModal.name}`}
          onClose={() => setShowTxnModal(null)}>
          <form onSubmit={handleTxn} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Belopp (SEK)</label>
              <input type="number" step="0.01" value={txnForm.amount}
                onChange={e => setTxnForm({ ...txnForm, amount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Datum</label>
              <input type="date" value={txnForm.date}
                onChange={e => setTxnForm({ ...txnForm, date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beskrivning</label>
              <input type="text" value={txnForm.description}
                onChange={e => setTxnForm({ ...txnForm, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowTxnModal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className={`px-4 py-2 text-white rounded-lg ${txnType === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {txnType === 'deposit' ? 'Sätt in' : 'Ta ut'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transaction History */}
      {showHistory && (
        <Modal title={`Historik — ${showHistory.name}`} onClose={() => setShowHistory(null)}>
          {txnHistory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={[...txnHistory].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatSEK(v)} />
                  <Area type="monotone" dataKey="balance_after" stroke="#10b981" fill="#d1fae5" />
                </AreaChart>
              </ResponsiveContainer>
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">Datum</th>
                    <th className="py-2">Beskrivning</th>
                    <th className="py-2 text-right">Belopp</th>
                    <th className="py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {txnHistory.map(t => (
                    <tr key={t.id} className="border-b">
                      <td className="py-1.5">{formatDate(t.date)}</td>
                      <td className="py-1.5 text-gray-600">{t.description || '-'}</td>
                      <td className={`py-1.5 text-right ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.amount >= 0 ? '+' : ''}{formatSEK(t.amount)}
                      </td>
                      <td className="py-1.5 text-right font-medium">{formatSEK(t.balance_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">Ingen historik ännu</p>
          )}
        </Modal>
      )}
    </div>
  )
}
