import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import Card from '../components/Card'
import { formatSEK, formatPercent, formatDate } from '../utils/format'

export default function Cars() {
  const [carLoans, setCarLoans] = useState([])
  const [leasingContracts, setLeasingContracts] = useState([])
  const [paymentAccounts, setPaymentAccounts] = useState([])
  const [showLoanForm, setShowLoanForm] = useState(false)
  const [showLeasingForm, setShowLeasingForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState(null)
  const [editingLeasing, setEditingLeasing] = useState(null)
  const [loanForm, setLoanForm] = useState({
    name: '', lender: '', original_amount: '', current_balance: '',
    interest_rate: '', rate_type: 'variable', start_date: '', monthly_amortization: '',
    payment_account_id: '',
  })
  const [leasingForm, setLeasingForm] = useState({
    vehicle_name: '', monthly_cost: '', start_date: '', end_date: '',
    term_months: '', residual_value: '', mileage_limit: '', note: '',
    payment_account_id: '',
  })

  useEffect(() => { loadAll() }, [])

  const loadAll = () => {
    api.getLoans('car').then(setCarLoans)
    api.getLeasingContracts().then(setLeasingContracts)
    api.getPaymentAccounts().then(setPaymentAccounts)
  }

  // Car loan handlers
  const handleLoanSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...loanForm,
      original_amount: parseFloat(loanForm.original_amount),
      current_balance: parseFloat(loanForm.current_balance),
      interest_rate: parseFloat(loanForm.interest_rate) / 100,
      monthly_amortization: parseFloat(loanForm.monthly_amortization) || 0,
      loan_type: 'car',
      payment_account_id: loanForm.payment_account_id ? parseInt(loanForm.payment_account_id) : null,
    }
    if (editingLoan) {
      await api.updateLoan(editingLoan, data)
    } else {
      await api.createLoan(data)
    }
    setShowLoanForm(false)
    setEditingLoan(null)
    loadAll()
  }

  const handleDeleteLoan = async (id) => {
    if (confirm('Ta bort detta billan?')) {
      await api.deleteLoan(id)
      loadAll()
    }
  }

  const openEditLoan = (loan) => {
    setLoanForm({
      name: loan.name, lender: loan.lender || '', original_amount: String(loan.original_amount),
      current_balance: String(loan.current_balance), interest_rate: String(loan.interest_rate * 100),
      rate_type: loan.rate_type, start_date: loan.start_date, monthly_amortization: String(loan.monthly_amortization),
      payment_account_id: loan.payment_account_id ? String(loan.payment_account_id) : '',
    })
    setEditingLoan(loan.id)
    setShowLoanForm(true)
  }

  const openNewLoan = () => {
    setLoanForm({ name: '', lender: '', original_amount: '', current_balance: '', interest_rate: '', rate_type: 'variable', start_date: '', monthly_amortization: '', payment_account_id: '' })
    setEditingLoan(null)
    setShowLoanForm(true)
  }

  // Leasing handlers
  const handleLeasingSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...leasingForm,
      monthly_cost: parseFloat(leasingForm.monthly_cost),
      term_months: parseInt(leasingForm.term_months),
      residual_value: leasingForm.residual_value ? parseFloat(leasingForm.residual_value) : null,
      mileage_limit: leasingForm.mileage_limit ? parseInt(leasingForm.mileage_limit) : null,
      payment_account_id: leasingForm.payment_account_id ? parseInt(leasingForm.payment_account_id) : null,
    }
    if (editingLeasing) {
      await api.updateLeasingContract(editingLeasing, data)
    } else {
      await api.createLeasingContract(data)
    }
    setShowLeasingForm(false)
    setEditingLeasing(null)
    loadAll()
  }

  const handleDeleteLeasing = async (id) => {
    if (confirm('Ta bort detta leasingavtal?')) {
      await api.deleteLeasingContract(id)
      loadAll()
    }
  }

  const openEditLeasing = (c) => {
    setLeasingForm({
      vehicle_name: c.vehicle_name, monthly_cost: String(c.monthly_cost),
      start_date: c.start_date, end_date: c.end_date, term_months: String(c.term_months),
      residual_value: c.residual_value ? String(c.residual_value) : '',
      mileage_limit: c.mileage_limit ? String(c.mileage_limit) : '', note: c.note || '',
      payment_account_id: c.payment_account_id ? String(c.payment_account_id) : '',
    })
    setEditingLeasing(c.id)
    setShowLeasingForm(true)
  }

  const openNewLeasing = () => {
    setLeasingForm({ vehicle_name: '', monthly_cost: '', start_date: '', end_date: '', term_months: '', residual_value: '', mileage_limit: '', note: '', payment_account_id: '' })
    setEditingLeasing(null)
    setShowLeasingForm(true)
  }

  const totalLoanCost = carLoans.reduce((s, l) => s + l.monthly_interest_cost + l.monthly_amortization, 0)
  const totalLeasingCost = leasingContracts.reduce((s, c) => s + c.monthly_cost, 0)
  const totalMonthlyCost = totalLoanCost + totalLeasingCost

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bilar</h1>
        <div className="flex gap-2">
          <button onClick={openNewLoan} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            + Billan
          </button>
          <button onClick={openNewLeasing} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
            + Leasing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card title="Total bilkostnad/man" value={formatSEK(totalMonthlyCost)} color="purple" />
        <Card title="Billan" value={formatSEK(totalLoanCost)} subtitle={`${carLoans.length} lan`} color="blue" />
        <Card title="Leasing" value={formatSEK(totalLeasingCost)} subtitle={`${leasingContracts.length} avtal`} color="yellow" />
      </div>

      {/* Car Loans */}
      {carLoans.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Billan</h2>
          <div className="space-y-3">
            {carLoans.map(loan => (
              <div key={loan.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{loan.name}</h3>
                    {loan.lender && <p className="text-sm text-gray-500">{loan.lender}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditLoan(loan)} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Andra</button>
                    <button onClick={() => handleDeleteLoan(loan.id)} className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Ta bort</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-gray-500">Skuld</p><p className="font-medium">{formatSEK(loan.current_balance)}</p></div>
                  <div><p className="text-gray-500">Ranta</p><p className="font-medium">{formatPercent(loan.interest_rate)}</p></div>
                  <div><p className="text-gray-500">Kostnad/man</p><p className="font-medium">{formatSEK(loan.monthly_interest_cost + loan.monthly_amortization)}</p></div>
                  <div><p className="text-gray-500">Amortering/man</p><p className="font-medium">{formatSEK(loan.monthly_amortization)}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leasing contracts */}
      {leasingContracts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Leasingavtal</h2>
          <div className="space-y-3">
            {leasingContracts.map(c => (
              <div key={c.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{c.vehicle_name}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(c.start_date)} - {formatDate(c.end_date)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditLeasing(c)} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Andra</button>
                    <button onClick={() => handleDeleteLeasing(c.id)} className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Ta bort</button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>{c.progress_percent}% avklarat</span>
                    <span className={c.months_remaining <= 6 ? 'text-red-600 font-medium' : ''}>
                      {c.months_remaining} man kvar
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${c.months_remaining <= 6 ? 'bg-red-500' : c.months_remaining <= 12 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${c.progress_percent}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><p className="text-gray-500">Manadskostnad</p><p className="font-medium">{formatSEK(c.monthly_cost)}</p></div>
                  {c.residual_value && <div><p className="text-gray-500">Restvarde</p><p className="font-medium">{formatSEK(c.residual_value)}</p></div>}
                  {c.mileage_limit && <div><p className="text-gray-500">Miltal/ar</p><p className="font-medium">{c.mileage_limit.toLocaleString('sv-SE')} km</p></div>}
                  {c.note && <div><p className="text-gray-500">Anteckning</p><p className="font-medium">{c.note}</p></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {carLoans.length === 0 && leasingContracts.length === 0 && (
        <p className="text-center py-12 text-gray-500">Inga bilar registrerade. Lagg till billan eller leasing.</p>
      )}

      {/* Loan Form */}
      {showLoanForm && (
        <Modal title={editingLoan ? 'Andra billan' : 'Nytt billan'} onClose={() => { setShowLoanForm(false); setEditingLoan(null) }}>
          <form onSubmit={handleLoanSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Namn</label>
              <input type="text" value={loanForm.name} onChange={e => setLoanForm({ ...loanForm, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required placeholder="t.ex. Volvo XC60" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Langivare</label>
              <input type="text" value={loanForm.lender} onChange={e => setLoanForm({ ...loanForm, lender: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ursprungligt belopp</label>
                <input type="number" value={loanForm.original_amount} onChange={e => setLoanForm({ ...loanForm, original_amount: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nuvarande skuld</label>
                <input type="number" value={loanForm.current_balance} onChange={e => setLoanForm({ ...loanForm, current_balance: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ranta (%)</label>
                <input type="number" step="0.01" value={loanForm.interest_rate} onChange={e => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Startdatum</label>
                <input type="date" value={loanForm.start_date} onChange={e => setLoanForm({ ...loanForm, start_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amortering/man</label>
              <input type="number" value={loanForm.monthly_amortization} onChange={e => setLoanForm({ ...loanForm, monthly_amortization: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" placeholder="0" />
            </div>
            {paymentAccounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Betalningskonto</label>
                <select value={loanForm.payment_account_id} onChange={e => setLoanForm({ ...loanForm, payment_account_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2">
                  <option value="">-- Inget konto --</option>
                  {paymentAccounts.map(pa => (
                    <option key={pa.id} value={pa.id}>{pa.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowLoanForm(false); setEditingLoan(null) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Spara</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Leasing Form */}
      {showLeasingForm && (
        <Modal title={editingLeasing ? 'Andra leasingavtal' : 'Nytt leasingavtal'} onClose={() => { setShowLeasingForm(false); setEditingLeasing(null) }}>
          <form onSubmit={handleLeasingSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Fordon</label>
              <input type="text" value={leasingForm.vehicle_name} onChange={e => setLeasingForm({ ...leasingForm, vehicle_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required placeholder="t.ex. Cupra Born" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Manadskostnad (SEK)</label>
              <input type="number" value={leasingForm.monthly_cost} onChange={e => setLeasingForm({ ...leasingForm, monthly_cost: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Startdatum</label>
                <input type="date" value={leasingForm.start_date} onChange={e => setLeasingForm({ ...leasingForm, start_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slutdatum</label>
                <input type="date" value={leasingForm.end_date} onChange={e => setLeasingForm({ ...leasingForm, end_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Period (man)</label>
                <input type="number" value={leasingForm.term_months} onChange={e => setLeasingForm({ ...leasingForm, term_months: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Restvarde</label>
                <input type="number" value={leasingForm.residual_value} onChange={e => setLeasingForm({ ...leasingForm, residual_value: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Miltal/ar</label>
                <input type="number" value={leasingForm.mileage_limit} onChange={e => setLeasingForm({ ...leasingForm, mileage_limit: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anteckning</label>
              <input type="text" value={leasingForm.note} onChange={e => setLeasingForm({ ...leasingForm, note: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            {paymentAccounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Betalningskonto</label>
                <select value={leasingForm.payment_account_id} onChange={e => setLeasingForm({ ...leasingForm, payment_account_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2">
                  <option value="">-- Inget konto --</option>
                  {paymentAccounts.map(pa => (
                    <option key={pa.id} value={pa.id}>{pa.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowLeasingForm(false); setEditingLeasing(null) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Spara</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
