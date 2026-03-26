import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { formatSEK, formatPercent, currentYear, currentMonth, MONTHS_SHORT } from '../utils/format'

export default function MonthlyView() {
  const [year, setYear] = useState(currentYear())
  const [months, setMonths] = useState(() => {
    const m = currentMonth()
    return m >= 3 ? [m - 2, m - 1, m] : m === 2 ? [1, 2] : [1]
  })
  const [data, setData] = useState(null)
  const [editingCell, setEditingCell] = useState(null) // { categoryId, month }
  const [editValue, setEditValue] = useState('')
  const [showDistModal, setShowDistModal] = useState(false)
  const [distSettings, setDistSettings] = useState(null)

  const loadData = useCallback(() => {
    api.getMonthlyView(year, months.join(',')).then(setData)
  }, [year, months])

  useEffect(() => {
    loadData()
    api.getDistributionSettings().then(setDistSettings)
  }, [loadData])

  const handleCellClick = (categoryId, month, currentValue) => {
    setEditingCell({ categoryId, month })
    setEditValue(currentValue ? String(currentValue) : '')
  }

  const handleCellSave = async () => {
    if (!editingCell) return
    const { categoryId, month } = editingCell
    const value = parseFloat(editValue) || 0

    // Find existing transaction for this category+month or create new
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

    setEditingCell(null)
    loadData()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCellSave()
    if (e.key === 'Escape') setEditingCell(null)
  }

  const addMonth = () => {
    const last = months[months.length - 1]
    if (last < 12) setMonths([...months, last + 1])
  }

  const removeMonth = (m) => {
    if (months.length > 1) setMonths(months.filter(x => x !== m))
  }

  if (!data) return <div className="text-center py-12 text-gray-500">Laddar...</div>

  // Defensive defaults for all nested data
  const incomeSections = data.income?.sections || []
  const expenseSections = data.expenses?.sections || []
  const incomeTotals = data.income?.totals || {}
  const expenseTotals = data.expenses?.totals || {}
  const mortgages = data.ungrouped_loans?.mortgages || []
  const carLoans = data.ungrouped_loans?.car_loans || []
  const consumerLoans = data.ungrouped_loans?.consumer_loans || []
  const ungroupedLeasing = data.ungrouped_leasing || []
  const linkedCategories = data.linked_categories || {}
  const grandTotals = data.grand_totals || {}
  const remainingData = data.remaining || {}
  const distData = data.distribution || {}
  const distPerMonth = distData.per_month || {}
  const paymentAccounts = data.payment_accounts || []

  const colCount = months.length

  const EditableCell = ({ categoryId, month, value }) => {
    const isEditing = editingCell?.categoryId === categoryId && editingCell?.month === month
    if (isEditing) {
      return (
        <input
          type="number"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleCellSave}
          onKeyDown={handleKeyDown}
          className="w-24 text-right border-2 border-blue-400 rounded px-1.5 py-0.5 text-sm bg-blue-50 focus:outline-none"
          autoFocus
        />
      )
    }
    const displayVal = value || 0
    return (
      <span
        className={`cursor-pointer hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors text-sm ${displayVal === 0 ? 'text-gray-300' : ''}`}
        onClick={() => handleCellClick(categoryId, month, value)}
        title="Klicka for att andra"
      >
        {displayVal === 0 ? '-' : formatSEK(displayVal)}
      </span>
    )
  }

  const MonthAmounts = ({ amounts, categoryId, editable = true }) => (
    months.map(m => (
      <td key={m} className="py-1.5 px-2 text-right">
        {editable ? (
          <EditableCell categoryId={categoryId} month={m} value={amounts?.[String(m)] || 0} />
        ) : (
          <span className="text-sm">{formatSEK(amounts?.[String(m)] || 0)}</span>
        )}
      </td>
    ))
  )

  const StaticMonthValues = ({ values }) => (
    months.map(m => (
      <td key={m} className="py-1.5 px-2 text-right text-sm font-semibold">
        {formatSEK(values?.[String(m)] || values || 0)}
      </td>
    ))
  )

  const FixedMonthValue = ({ value }) => (
    months.map(m => (
      <td key={m} className="py-1.5 px-2 text-right text-sm">
        {formatSEK(value)}
      </td>
    ))
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Manadsvy {year}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDistModal(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            Fordelning
          </button>
          <button onClick={() => setYear(year - 1)}
            className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900">&laquo;</button>
          <span className="font-medium">{year}</span>
          <button onClick={() => setYear(year + 1)}
            className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900">&raquo;</button>
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-sm text-gray-600">
              <th className="py-3 px-3 text-left min-w-[200px]">Post</th>
              {months.map(m => (
                <th key={m} className="py-3 px-2 text-right min-w-[100px]">
                  <div className="flex items-center justify-end gap-1">
                    {months.length > 1 && (
                      <button onClick={() => removeMonth(m)}
                        className="text-gray-300 hover:text-red-500 text-xs" title="Ta bort manad">x</button>
                    )}
                    <span>{MONTHS_SHORT[m - 1]}</span>
                  </div>
                </th>
              ))}
              <th className="py-3 px-2 w-10">
                {months[months.length - 1] < 12 && (
                  <button onClick={addMonth}
                    className="text-blue-500 hover:text-blue-700 text-sm font-bold" title="Lagg till manad">+</button>
                )}
              </th>
            </tr>
          </thead>

          {/* ── INCOME ── */}
          <tbody>
            <tr className="bg-green-50 border-b">
              <td colSpan={colCount + 2} className="py-2 px-3 font-bold text-green-800 text-sm uppercase tracking-wide">
                Inkomster
              </td>
            </tr>
          </tbody>
          {incomeSections.map(section => (
            <tbody key={section.id}>
              {section.items.length > 1 && (
                <tr className="bg-green-50/40 border-b">
                  <td className="py-1.5 px-3 font-semibold text-sm text-green-700">{section.name}</td>
                  <StaticMonthValues values={section.subtotals} />
                  <td></td>
                </tr>
              )}
              {section.items.map(item => (
                <tr key={item.id} className="border-b hover:bg-green-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">{item.name}</td>
                  <MonthAmounts amounts={item.amounts} categoryId={item.id} />
                  <td></td>
                </tr>
              ))}
            </tbody>
          ))}
          <tbody>
            <tr className="bg-green-100 border-b font-bold">
              <td className="py-2 px-3">Summa inkomster</td>
              <StaticMonthValues values={incomeTotals} />
              <td></td>
            </tr>
          </tbody>

          {/* ── MORTGAGES ── */}
          {(mortgages.length > 0 || (linkedCategories.mortgage || []).length > 0) && (
            <tbody>
              <tr className="bg-yellow-50 border-b">
                <td colSpan={colCount + 2} className="py-2 px-3 font-bold text-yellow-800 text-sm uppercase tracking-wide">
                  Bolan
                </td>
              </tr>
              {mortgages.length > 0 && (
                <tr className="border-b bg-yellow-50/30 text-xs text-gray-500">
                  <td className="py-1 px-3 pl-6">Lan</td>
                  {months.map(m => (
                    <td key={m} className="py-1 px-2 text-right">Ranta</td>
                  ))}
                  <td></td>
                </tr>
              )}
              {mortgages.map(loan => (
                <tr key={loan.id} className="border-b hover:bg-yellow-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">
                    {loan.name}
                    {loan.lender && <span className="text-gray-400 ml-1 text-xs">({loan.lender})</span>}
                    <span className="text-gray-400 ml-1 text-xs">{formatPercent(loan.rate)}</span>
                  </td>
                  <FixedMonthValue value={loan.interest} />
                  <td></td>
                </tr>
              ))}
              {mortgages.some(l => l.amortization > 0) && (
                <tr className="border-b hover:bg-yellow-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">Amortering</td>
                  <FixedMonthValue value={mortgages.reduce((s, l) => s + l.amortization, 0)} />
                  <td></td>
                </tr>
              )}
              {(linkedCategories.mortgage || []).map(item => (
                <tr key={`linked-${item.id}`} className="border-b hover:bg-yellow-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">{item.name}</td>
                  <MonthAmounts amounts={item.amounts} categoryId={item.id} />
                  <td></td>
                </tr>
              ))}
              <tr className="bg-yellow-50/50 border-b font-semibold text-sm">
                <td className="py-1.5 px-3">Summa bolan</td>
                {months.map(m => {
                  const loanCost = mortgages.reduce((s, l) => s + l.interest + l.amortization, 0)
                  const linkedCost = (linkedCategories.mortgage || []).reduce((s, c) => s + (c.amounts?.[String(m)] || 0), 0)
                  return (
                    <td key={m} className="py-1.5 px-2 text-right text-sm font-semibold">
                      {formatSEK(loanCost + linkedCost)}
                    </td>
                  )
                })}
                <td></td>
              </tr>
            </tbody>
          )}

          {/* ── CAR LOANS ── */}
          {(carLoans.length > 0 || ungroupedLeasing.length > 0 || (linkedCategories.cars || []).length > 0) && (
            <tbody>
              <tr className="bg-purple-50 border-b">
                <td colSpan={colCount + 2} className="py-2 px-3 font-bold text-purple-800 text-sm uppercase tracking-wide">
                  Bilar
                </td>
              </tr>
              {carLoans.map(loan => (
                <tr key={loan.id} className="border-b hover:bg-purple-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">
                    {loan.name}
                    <span className="text-gray-400 ml-1 text-xs">(lan {formatPercent(loan.rate)})</span>
                  </td>
                  <FixedMonthValue value={loan.interest + loan.amortization} />
                  <td></td>
                </tr>
              ))}
              {ungroupedLeasing.map(item => (
                <tr key={item.id} className="border-b hover:bg-purple-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">
                    {item.name}
                    <span className="text-gray-400 ml-1 text-xs">(leasing)</span>
                  </td>
                  <FixedMonthValue value={item.monthly_cost} />
                  <td></td>
                </tr>
              ))}
              {(linkedCategories.cars || []).map(item => (
                <tr key={`linked-${item.id}`} className="border-b hover:bg-purple-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">{item.name}</td>
                  <MonthAmounts amounts={item.amounts} categoryId={item.id} />
                  <td></td>
                </tr>
              ))}
              <tr className="bg-purple-50/50 border-b font-semibold text-sm">
                <td className="py-1.5 px-3">Summa bilar</td>
                {months.map(m => {
                  const loanCost = carLoans.reduce((s, l) => s + l.interest + l.amortization, 0)
                  const leasingCost = ungroupedLeasing.reduce((s, l) => s + l.monthly_cost, 0)
                  const linkedCost = (linkedCategories.cars || []).reduce((s, c) => s + (c.amounts?.[String(m)] || 0), 0)
                  return (
                    <td key={m} className="py-1.5 px-2 text-right text-sm font-semibold">
                      {formatSEK(loanCost + leasingCost + linkedCost)}
                    </td>
                  )
                })}
                <td></td>
              </tr>
            </tbody>
          )}

          {/* ── CONSUMER LOANS ── */}
          {(consumerLoans.length > 0 || (linkedCategories.consumer_loan || []).length > 0) && (
            <tbody>
              <tr className="bg-orange-50 border-b">
                <td colSpan={colCount + 2} className="py-2 px-3 font-bold text-orange-800 text-sm uppercase tracking-wide">
                  Konsumtionslan
                </td>
              </tr>
              {consumerLoans.map(loan => (
                <tr key={loan.id} className="border-b hover:bg-orange-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">
                    {loan.name}
                    <span className="text-gray-400 ml-1 text-xs">({formatPercent(loan.rate)})</span>
                  </td>
                  <FixedMonthValue value={loan.interest + loan.amortization} />
                  <td></td>
                </tr>
              ))}
              {(linkedCategories.consumer_loan || []).map(item => (
                <tr key={`linked-${item.id}`} className="border-b hover:bg-orange-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">{item.name}</td>
                  <MonthAmounts amounts={item.amounts} categoryId={item.id} />
                  <td></td>
                </tr>
              ))}
              <tr className="bg-orange-50/50 border-b font-semibold text-sm">
                <td className="py-1.5 px-3">Summa konsumtionslan</td>
                {months.map(m => {
                  const loanCost = consumerLoans.reduce((s, l) => s + l.interest + l.amortization, 0)
                  const linkedCost = (linkedCategories.consumer_loan || []).reduce((s, c) => s + (c.amounts?.[String(m)] || 0), 0)
                  return (
                    <td key={m} className="py-1.5 px-2 text-right text-sm font-semibold">
                      {formatSEK(loanCost + linkedCost)}
                    </td>
                  )
                })}
                <td></td>
              </tr>
            </tbody>
          )}

          {/* ── EXPENSES BY SECTION ── */}
          {expenseSections.map(section => (
            <tbody key={section.id}>
              <tr className="bg-red-50 border-b">
                <td colSpan={colCount + 2} className="py-2 px-3 font-bold text-red-800 text-sm uppercase tracking-wide">
                  {section.name}
                </td>
              </tr>
              {(section.fixed_items || []).map(fi => (
                <tr key={fi.id} className="border-b hover:bg-red-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">
                    {fi.name}
                    {fi.is_loan && fi.detail && (
                      <span className="text-gray-400 ml-1 text-xs">({fi.detail})</span>
                    )}
                    {fi.is_leasing && (
                      <span className="text-gray-400 ml-1 text-xs">(leasing)</span>
                    )}
                  </td>
                  <FixedMonthValue value={fi.fixed_value} />
                  <td></td>
                </tr>
              ))}
              {section.items.map(item => (
                <tr key={item.id} className="border-b hover:bg-red-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm">{item.name}</td>
                  <MonthAmounts amounts={item.amounts} categoryId={item.id} />
                  <td></td>
                </tr>
              ))}
              <tr className="bg-red-50/50 border-b font-semibold text-sm">
                <td className="py-1.5 px-3">Summa {section.name.toLowerCase()}</td>
                <StaticMonthValues values={section.subtotals} />
                <td></td>
              </tr>
            </tbody>
          ))}

          {/* ── GRAND TOTAL ── */}
          <tbody>
            <tr className="bg-gray-200 border-b border-gray-400 font-bold text-base">
              <td className="py-3 px-3">Total kostnad</td>
              <StaticMonthValues values={grandTotals} />
              <td></td>
            </tr>
          </tbody>

          {/* ── REMAINING ── */}
          <tbody>
            <tr className="bg-blue-100 border-b font-bold text-lg">
              <td className="py-3 px-3 text-blue-900">Kvar</td>
              {months.map(m => {
                const val = remainingData[String(m)] || 0
                return (
                  <td key={m} className={`py-3 px-2 text-right ${val >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                    {formatSEK(val)}
                  </td>
                )
              })}
              <td></td>
            </tr>
          </tbody>

          {/* ── DISTRIBUTION ── */}
          <tbody>
            <tr className="bg-indigo-50 border-b">
              <td colSpan={colCount + 2} className="py-2 px-3 font-bold text-indigo-800 text-sm uppercase tracking-wide">
                Fordelning
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-1.5 px-3 pl-6 text-sm">
                Fickpengar ({(distData.pocket_money_persons || 0)} x {formatSEK((distData.pocket_money_per_person || 0))})
              </td>
              <FixedMonthValue value={-(distData.pocket_money_total || 0)} />
              <td></td>
            </tr>
            <tr className="border-b font-semibold">
              <td className="py-1.5 px-3 pl-6 text-sm">Att fordela</td>
              {months.map(m => (
                <td key={m} className="py-1.5 px-2 text-right text-sm">
                  {formatSEK(distPerMonth[String(m)]?.distributable || 0)}
                </td>
              ))}
              <td></td>
            </tr>
            {distPerMonth[String(months[0])]?.accounts?.map(acc => (
              <tr key={acc.id} className="border-b hover:bg-indigo-50/30">
                <td className="py-1.5 px-3 pl-6 text-sm">
                  {acc.name}
                  <span className="text-gray-400 ml-1 text-xs">({acc.percentage}%)</span>
                  <span className="text-gray-400 ml-2 text-xs">Saldo: {formatSEK(acc.current_balance)}</span>
                </td>
                {months.map(m => {
                  const mAcc = distPerMonth[String(m)]?.accounts?.find(a => a.id === acc.id)
                  return (
                    <td key={m} className="py-1.5 px-2 text-right text-sm text-green-600">
                      +{formatSEK(mAcc?.amount || 0)}
                    </td>
                  )
                })}
                <td></td>
              </tr>
            ))}
            {(!distPerMonth[String(months[0])]?.accounts?.length) && (
              <tr className="border-b">
                <td colSpan={colCount + 2} className="py-3 px-3 pl-6 text-sm text-gray-400 italic">
                  Ingen fordelning konfigurerad. Klicka "Fordelning" ovan.
                </td>
              </tr>
            )}
          </tbody>

          {/* ── PAYMENT ACCOUNT SUMMARY ── */}
          {paymentAccounts.length > 0 && (
            <tbody>
              <tr className="bg-teal-50 border-b border-t-2 border-gray-300">
                <td colSpan={colCount + 2} className="py-2 px-3 font-bold text-teal-800 text-sm uppercase tracking-wide">
                  Per betalningskonto
                </td>
              </tr>
              {paymentAccounts.map(account => (
                <tr key={account.id} className="border-b hover:bg-teal-50/30">
                  <td className="py-1.5 px-3 pl-6 text-sm font-medium">{account.name}</td>
                  {months.map(m => (
                    <td key={m} className="py-1.5 px-2 text-right text-sm">
                      {formatSEK(account.totals?.[String(m)] || 0)}
                    </td>
                  ))}
                  <td></td>
                </tr>
              ))}
              <tr className="border-b bg-teal-50/50 font-semibold text-sm">
                <td className="py-1.5 px-3">Ej tilldelat konto</td>
                {months.map(m => {
                  const assigned = paymentAccounts.reduce((s, a) => s + (a.totals?.[String(m)] || 0), 0)
                  const total = grandTotals[String(m)] || 0
                  const unassigned = total - assigned
                  return (
                    <td key={m} className="py-1.5 px-2 text-right text-sm text-gray-400">
                      {unassigned !== 0 ? formatSEK(unassigned) : '-'}
                    </td>
                  )
                })}
                <td></td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      <p className="text-sm text-gray-500 mt-3">
        Klicka pa ett belopp for att andra det. Tryck + for att lagga till manader.
      </p>

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
    <Modal title="Fordelningsinstallningar" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div>
          <h3 className="font-semibold text-sm mb-2">Fordelning av resterande belopp</h3>
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
                className="text-red-500 hover:text-red-700 text-sm px-1">Ta bort</button>
            </div>
          ))}

          <div className={`text-sm mt-1 ${Math.abs(totalPct - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
            Totalt: {totalPct}% {Math.abs(totalPct - 100) >= 0.01 && '(ska vara 100%)'}
          </div>

          {availableAccounts.length > 0 && (
            <div className="flex gap-2 mt-3">
              <select value={addAccountId} onChange={e => setAddAccountId(e.target.value)}
                className="flex-1 border rounded px-2 py-1.5 text-sm">
                <option value="">Lagg till konto...</option>
                {availableAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button type="button" onClick={handleAdd}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">Lagg till</button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
          <button type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Spara</button>
        </div>
      </form>
    </Modal>
  )
}
