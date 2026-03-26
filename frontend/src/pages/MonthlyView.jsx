import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import MonthPicker from '../components/MonthPicker'
import Modal from '../components/Modal'
import { formatSEK, formatPercent, currentYear, currentMonth, MONTHS_SHORT } from '../utils/format'

export default function MonthlyView() {
  const [year, setYear] = useState(currentYear())
  const [month, setMonth] = useState(currentMonth())
  const [data, setData] = useState(null)
  const [distSettings, setDistSettings] = useState(null)
  const [editingCell, setEditingCell] = useState(null) // { categoryId, field: 'budget'|'actual' }
  const [editValue, setEditValue] = useState('')
  const [showDistModal, setShowDistModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTarget, setCopyTarget] = useState({ year: currentYear(), month: currentMonth() + 1 })

  const loadData = useCallback(() => {
    api.getMonthlyView(year, month).then(setData)
  }, [year, month])

  useEffect(() => {
    loadData()
    api.getDistributionSettings().then(setDistSettings)
  }, [loadData])

  const handleCellClick = (categoryId, field, currentValue) => {
    setEditingCell({ categoryId, field })
    setEditValue(currentValue ? String(currentValue) : '')
  }

  const handleCellSave = async () => {
    if (!editingCell) return
    const { categoryId, field } = editingCell
    const value = parseFloat(editValue) || 0

    if (field === 'budget') {
      await api.saveBudgetItem({
        category_id: categoryId,
        year,
        month,
        amount: value,
      })
    } else if (field === 'actual') {
      // Get existing transactions for this category+month to update or create
      const transactions = await api.getTransactions(year, month)
      const existing = transactions.find(t => t.category_id === categoryId)
      if (existing) {
        await api.updateTransaction(existing.id, {
          category_id: categoryId,
          date: existing.date,
          amount: value,
          description: existing.description,
        })
      } else {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-01`
        await api.createTransaction({
          category_id: categoryId,
          date: dateStr,
          amount: value,
          description: '',
        })
      }
    }

    setEditingCell(null)
    loadData()
  }

  const handleCopy = async () => {
    await api.copyMonth({
      source_year: year,
      source_month: month,
      target_year: copyTarget.year,
      target_month: copyTarget.month,
    })
    setShowCopyModal(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCellSave()
    if (e.key === 'Escape') setEditingCell(null)
  }

  if (!data) return <div className="text-center py-12 text-gray-500">Laddar...</div>

  const EditableCell = ({ categoryId, field, value, className = '' }) => {
    const isEditing = editingCell?.categoryId === categoryId && editingCell?.field === field
    if (isEditing) {
      return (
        <input
          type="number"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleCellSave}
          onKeyDown={handleKeyDown}
          className="w-28 text-right border-2 border-blue-400 rounded px-2 py-0.5 text-sm bg-blue-50 focus:outline-none"
          autoFocus
        />
      )
    }
    return (
      <span
        className={`cursor-pointer hover:bg-blue-100 px-2 py-0.5 rounded transition-colors ${className}`}
        onClick={() => handleCellClick(categoryId, field, value)}
        title="Klicka för att ändra"
      >
        {formatSEK(value)}
      </span>
    )
  }

  // Calculate totals including loans/leasing for grand total
  const loanCosts = data.loans.total_interest + data.loans.total_amortization
  const leasingCost = data.leasing.total_cost

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Månadsvy</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCopyModal(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Kopiera budget
          </button>
          <button
            onClick={() => setShowDistModal(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Fördelning
          </button>
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
              <th className="py-3 px-4 w-1/2">Post</th>
              <th className="py-3 px-3 text-right">Budget</th>
              <th className="py-3 px-3 text-right">Verklig</th>
              <th className="py-3 px-3 text-right">Differens</th>
            </tr>
          </thead>

          {/* ── INCOME ── */}
          <tbody>
            <tr className="bg-green-50 border-b">
              <td colSpan={4} className="py-2 px-4 font-bold text-green-800 text-sm uppercase tracking-wide">
                Inkomster
              </td>
            </tr>
          </tbody>
          {data.income.sections.map(section => (
            <tbody key={section.id}>
              {section.items.length > 1 && (
                <tr className="bg-green-50/50 border-b">
                  <td className="py-1.5 px-4 font-semibold text-sm text-green-700">{section.name}</td>
                  <td className="py-1.5 px-3 text-right text-sm font-semibold">{formatSEK(section.subtotal_budget)}</td>
                  <td className="py-1.5 px-3 text-right text-sm font-semibold">{formatSEK(section.subtotal_actual)}</td>
                  <td className="py-1.5 px-3 text-right text-sm font-semibold">{formatSEK(section.subtotal_budget - section.subtotal_actual)}</td>
                </tr>
              )}
              {section.items.map(item => (
                <tr key={item.id} className="border-b hover:bg-green-50/30">
                  <td className="py-1.5 px-4 pl-8 text-sm">{item.name}</td>
                  <td className="py-1.5 px-3 text-right text-sm">
                    <EditableCell categoryId={item.id} field="budget" value={item.budget} />
                  </td>
                  <td className="py-1.5 px-3 text-right text-sm">
                    <EditableCell categoryId={item.id} field="actual" value={item.actual} />
                  </td>
                  <td className={`py-1.5 px-3 text-right text-sm ${item.budget - item.actual < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatSEK(item.budget - item.actual)}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
          <tbody>
            <tr className="bg-green-100 border-b font-bold">
              <td className="py-2 px-4">Summa inkomster</td>
              <td className="py-2 px-3 text-right">{formatSEK(data.income.total_budget)}</td>
              <td className="py-2 px-3 text-right">{formatSEK(data.income.total_actual)}</td>
              <td className={`py-2 px-3 text-right ${data.income.total_actual - data.income.total_budget >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatSEK(data.income.total_budget - data.income.total_actual)}
              </td>
            </tr>
          </tbody>

          {/* ── LOANS ── */}
          <tbody>
            <tr className="bg-yellow-50 border-b">
              <td colSpan={4} className="py-2 px-4 font-bold text-yellow-800 text-sm uppercase tracking-wide">
                Lån & Ränta
              </td>
            </tr>
          </tbody>
          <tbody>
            <tr className="border-b bg-yellow-50/30 text-xs text-gray-500">
              <td className="py-1 px-4 pl-8">Lån</td>
              <td className="py-1 px-3 text-right">Ränta</td>
              <td className="py-1 px-3 text-right">Skuld</td>
              <td className="py-1 px-3 text-right">Räntesats</td>
            </tr>
            {data.loans.items.map(loan => (
              <tr key={loan.id} className="border-b hover:bg-yellow-50/30">
                <td className="py-1.5 px-4 pl-8 text-sm">
                  {loan.name}
                  {loan.lender && <span className="text-gray-400 ml-1 text-xs">({loan.lender})</span>}
                </td>
                <td className="py-1.5 px-3 text-right text-sm">{formatSEK(loan.interest)}</td>
                <td className="py-1.5 px-3 text-right text-sm text-gray-500">{formatSEK(loan.balance)}</td>
                <td className="py-1.5 px-3 text-right text-sm text-gray-500">{formatPercent(loan.rate)}</td>
              </tr>
            ))}
            {data.loans.total_amortization > 0 && (
              <tr className="border-b hover:bg-yellow-50/30">
                <td className="py-1.5 px-4 pl-8 text-sm">Amortering</td>
                <td className="py-1.5 px-3 text-right text-sm">{formatSEK(data.loans.total_amortization)}</td>
                <td colSpan={2}></td>
              </tr>
            )}
            <tr className="bg-yellow-100 border-b font-bold">
              <td className="py-2 px-4">Summa lån</td>
              <td className="py-2 px-3 text-right">{formatSEK(loanCosts)}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>

          {/* ── EXPENSES BY SECTION ── */}
          {data.expenses.sections.map(section => (
            <tbody key={section.id}>
              <tr className="bg-red-50 border-b">
                <td colSpan={4} className="py-2 px-4 font-bold text-red-800 text-sm uppercase tracking-wide">
                  {section.name}
                </td>
              </tr>
              {section.items.map(item => (
                <tr key={item.id} className="border-b hover:bg-red-50/30">
                  <td className="py-1.5 px-4 pl-8 text-sm">{item.name}</td>
                  <td className="py-1.5 px-3 text-right text-sm">
                    <EditableCell categoryId={item.id} field="budget" value={item.budget} />
                  </td>
                  <td className="py-1.5 px-3 text-right text-sm">
                    <EditableCell categoryId={item.id} field="actual" value={item.actual} />
                  </td>
                  <td className={`py-1.5 px-3 text-right text-sm ${item.budget - item.actual < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatSEK(item.budget - item.actual)}
                  </td>
                </tr>
              ))}
              <tr className="bg-red-50/50 border-b font-semibold text-sm">
                <td className="py-1.5 px-4">Summa {section.name.toLowerCase()}</td>
                <td className="py-1.5 px-3 text-right">{formatSEK(section.subtotal_budget)}</td>
                <td className="py-1.5 px-3 text-right">{formatSEK(section.subtotal_actual)}</td>
                <td className={`py-1.5 px-3 text-right ${section.subtotal_budget - section.subtotal_actual < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatSEK(section.subtotal_budget - section.subtotal_actual)}
                </td>
              </tr>
            </tbody>
          ))}

          {/* ── LEASING ── */}
          {data.leasing.items.length > 0 && (
            <tbody>
              <tr className="bg-purple-50 border-b">
                <td colSpan={4} className="py-2 px-4 font-bold text-purple-800 text-sm uppercase tracking-wide">
                  Leasing
                </td>
              </tr>
              {data.leasing.items.map(item => (
                <tr key={item.id} className="border-b hover:bg-purple-50/30">
                  <td className="py-1.5 px-4 pl-8 text-sm">{item.vehicle_name}</td>
                  <td className="py-1.5 px-3 text-right text-sm">{formatSEK(item.monthly_cost)}</td>
                  <td className="py-1.5 px-3 text-right text-sm">{formatSEK(item.monthly_cost)}</td>
                  <td className="py-1.5 px-3 text-right text-sm text-green-600">{formatSEK(0)}</td>
                </tr>
              ))}
              <tr className="bg-purple-50/50 border-b font-semibold text-sm">
                <td className="py-1.5 px-4">Summa leasing</td>
                <td className="py-1.5 px-3 text-right">{formatSEK(data.leasing.total_cost)}</td>
                <td className="py-1.5 px-3 text-right">{formatSEK(data.leasing.total_cost)}</td>
                <td className="py-1.5 px-3 text-right text-green-600">{formatSEK(0)}</td>
              </tr>
            </tbody>
          )}

          {/* ── GRAND TOTAL ── */}
          <tbody>
            <tr className="bg-gray-200 border-b border-gray-400 font-bold text-base">
              <td className="py-3 px-4">Total kostnad</td>
              <td className="py-3 px-3 text-right">{formatSEK(data.grand_total.budget)}</td>
              <td className="py-3 px-3 text-right">{formatSEK(data.grand_total.actual)}</td>
              <td className={`py-3 px-3 text-right ${data.grand_total.budget - data.grand_total.actual < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatSEK(data.grand_total.budget - data.grand_total.actual)}
              </td>
            </tr>
          </tbody>

          {/* ── REMAINING ── */}
          <tbody>
            <tr className="bg-blue-100 border-b font-bold text-lg">
              <td className="py-3 px-4 text-blue-900">Kvar</td>
              <td className="py-3 px-3 text-right text-blue-900">{formatSEK(data.remaining.budget)}</td>
              <td className={`py-3 px-3 text-right ${data.remaining.actual >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                {formatSEK(data.remaining.actual)}
              </td>
              <td className="py-3 px-3"></td>
            </tr>
          </tbody>

          {/* ── DISTRIBUTION ── */}
          <tbody>
            <tr className="bg-indigo-50 border-b">
              <td colSpan={4} className="py-2 px-4 font-bold text-indigo-800 text-sm uppercase tracking-wide">
                Fördelning
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-1.5 px-4 pl-8 text-sm">
                Fickpengar ({data.distribution.pocket_money_persons} x {formatSEK(data.distribution.pocket_money_per_person)})
              </td>
              <td className="py-1.5 px-3 text-right text-sm text-red-600">
                -{formatSEK(data.distribution.pocket_money_total)}
              </td>
              <td colSpan={2}></td>
            </tr>
            <tr className="border-b font-semibold">
              <td className="py-1.5 px-4 pl-8 text-sm">Att fördela</td>
              <td className="py-1.5 px-3 text-right text-sm">{formatSEK(data.distribution.distributable)}</td>
              <td colSpan={2}></td>
            </tr>
            {data.distribution.accounts.map(acc => (
              <tr key={acc.id} className="border-b hover:bg-indigo-50/30">
                <td className="py-1.5 px-4 pl-8 text-sm">
                  {acc.name}
                  <span className="text-gray-400 ml-1 text-xs">({acc.percentage}%)</span>
                </td>
                <td className="py-1.5 px-3 text-right text-sm text-green-600">
                  +{formatSEK(acc.amount)}
                </td>
                <td className="py-1.5 px-3 text-right text-sm" colSpan={2}>
                  <span className="text-gray-500 text-xs mr-1">Saldo:</span>
                  <span className="font-medium">{formatSEK(acc.current_balance)}</span>
                </td>
              </tr>
            ))}
            {data.distribution.accounts.length === 0 && (
              <tr className="border-b">
                <td colSpan={4} className="py-3 px-4 pl-8 text-sm text-gray-400 italic">
                  Ingen fördelning konfigurerad. Klicka "Fördelning" ovan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 mt-3">Klicka på ett belopp för att ändra det.</p>

      {/* ── Distribution Settings Modal ── */}
      {showDistModal && distSettings && (
        <DistributionModal
          settings={distSettings}
          onSave={async (updated) => {
            await api.updateDistributionSettings(updated)
            const newSettings = await api.getDistributionSettings()
            setDistSettings(newSettings)
            setShowDistModal(false)
            loadData()
          }}
          onClose={() => setShowDistModal(false)}
        />
      )}

      {/* ── Copy Month Modal ── */}
      {showCopyModal && (
        <Modal title="Kopiera budget" onClose={() => setShowCopyModal(false)}>
          <p className="text-sm text-gray-600 mb-4">
            Kopiera alla budgetposter från {MONTHS_SHORT[month - 1]} {year} till:
          </p>
          <div className="flex gap-3 mb-4">
            <select value={copyTarget.month} onChange={e => setCopyTarget({ ...copyTarget, month: parseInt(e.target.value) })}
              className="border rounded px-3 py-2">
              {MONTHS_SHORT.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" value={copyTarget.year}
              onChange={e => setCopyTarget({ ...copyTarget, year: parseInt(e.target.value) })}
              className="border rounded px-3 py-2 w-24" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCopyModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Avbryt
            </button>
            <button onClick={handleCopy} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Kopiera
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}


function DistributionModal({ settings, onSave, onClose }) {
  const [pocketPerPerson, setPocketPerPerson] = useState(settings.pocket_money_per_person)
  const [pocketPersons, setPocketPersons] = useState(settings.pocket_money_persons)
  const [accounts, setAccounts] = useState(settings.accounts || [])
  const [savingsAccounts, setSavingsAccounts] = useState([])
  const [addAccountId, setAddAccountId] = useState('')

  useEffect(() => {
    api.getSavingsAccounts().then(setSavingsAccounts)
  }, [])

  const totalPct = accounts.reduce((s, a) => s + a.percentage, 0)
  const usedAccountIds = new Set(accounts.map(a => a.savings_account_id))
  const availableAccounts = savingsAccounts.filter(a => !usedAccountIds.has(a.id))

  const handlePctChange = (index, value) => {
    const updated = [...accounts]
    updated[index] = { ...updated[index], percentage: parseFloat(value) || 0 }
    setAccounts(updated)
  }

  const handleRemove = (index) => {
    setAccounts(accounts.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    if (!addAccountId) return
    const acc = savingsAccounts.find(a => a.id === parseInt(addAccountId))
    if (!acc) return
    setAccounts([...accounts, {
      savings_account_id: acc.id,
      account_name: acc.name,
      percentage: 0,
    }])
    setAddAccountId('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      pocket_money_per_person: pocketPerPerson,
      pocket_money_persons: pocketPersons,
      accounts: accounts.map(a => ({
        savings_account_id: a.savings_account_id,
        percentage: a.percentage,
      })),
    })
  }

  return (
    <Modal title="Fördelningsinställningar" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Pocket money */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Fickpengar</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Belopp per person</label>
              <input type="number" value={pocketPerPerson}
                onChange={e => setPocketPerPerson(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-1">Antal</label>
              <input type="number" value={pocketPersons}
                onChange={e => setPocketPersons(parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>

        {/* Distribution accounts */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Fördelning av resterande belopp</h3>
          {accounts.length === 0 && (
            <p className="text-sm text-gray-400 italic mb-2">Inga konton tillagda.</p>
          )}
          {accounts.map((acc, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <span className="flex-1 text-sm">{acc.account_name}</span>
              <div className="flex items-center gap-1">
                <input type="number" value={acc.percentage} step="1" min="0" max="100"
                  onChange={e => handlePctChange(i, e.target.value)}
                  className="w-20 border rounded px-2 py-1.5 text-sm text-right" />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <button type="button" onClick={() => handleRemove(i)}
                className="text-red-500 hover:text-red-700 text-sm px-1">
                Ta bort
              </button>
            </div>
          ))}

          {/* Total indicator */}
          <div className={`text-sm mt-1 ${Math.abs(totalPct - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
            Totalt: {totalPct}% {Math.abs(totalPct - 100) >= 0.01 && '(ska vara 100%)'}
          </div>

          {/* Add account */}
          {availableAccounts.length > 0 && (
            <div className="flex gap-2 mt-3">
              <select value={addAccountId} onChange={e => setAddAccountId(e.target.value)}
                className="flex-1 border rounded px-2 py-1.5 text-sm">
                <option value="">Lägg till konto...</option>
                {availableAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button type="button" onClick={handleAdd}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">
                Lägg till
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
          <button type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Spara
          </button>
        </div>
      </form>
    </Modal>
  )
}
