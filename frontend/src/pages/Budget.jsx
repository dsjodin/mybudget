import { useState, useEffect } from 'react'
import { api } from '../api/client'
import MonthPicker from '../components/MonthPicker'
import Modal from '../components/Modal'
import { formatSEK, currentYear, currentMonth, MONTHS_SHORT } from '../utils/format'

export default function Budget() {
  const [year, setYear] = useState(currentYear())
  const [month, setMonth] = useState(currentMonth())
  const [categories, setCategories] = useState([])
  const [budgetItems, setBudgetItems] = useState([])
  const [transactions, setTransactions] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTarget, setCopyTarget] = useState({ year: currentYear(), month: currentMonth() + 1 })

  useEffect(() => { api.getCategories().then(setCategories) }, [])

  useEffect(() => {
    Promise.all([
      api.getBudget(year, month),
      api.getTransactions(year, month),
    ]).then(([b, t]) => {
      setBudgetItems(b)
      setTransactions(t)
    })
  }, [year, month])

  const getBudgetAmount = (categoryId) => {
    const item = budgetItems.find(b => b.category_id === categoryId && b.month === month)
    const yearlyItem = budgetItems.find(b => b.category_id === categoryId && b.month === null)
    if (item) return item.amount
    if (yearlyItem) return yearlyItem.amount / 12
    return 0
  }

  const getActualAmount = (categoryId) => {
    return transactions
      .filter(t => t.category_id === categoryId)
      .reduce((sum, t) => sum + t.amount, 0)
  }

  const handleCellClick = (categoryId) => {
    const item = budgetItems.find(b => b.category_id === categoryId && b.month === month)
    setEditingCell(categoryId)
    setEditValue(item ? String(item.amount) : '')
  }

  const handleCellSave = async (categoryId) => {
    if (editValue !== '') {
      await api.saveBudgetItem({
        category_id: categoryId,
        year,
        month,
        amount: parseFloat(editValue),
      })
    }
    setEditingCell(null)
    const b = await api.getBudget(year, month)
    setBudgetItems(b)
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

  // Group categories by parent
  const topLevel = categories.filter(c => !c.parent_id)
  const getChildren = (parentId) => categories.filter(c => c.parent_id === parentId)

  const renderCategoryRow = (cat, indent = 0) => {
    const children = getChildren(cat.id)
    const isParent = children.length > 0
    const budget = getBudgetAmount(cat.id)
    const actual = getActualAmount(cat.id)
    const diff = budget - actual

    // Sum children for parent totals
    let totalBudget = budget
    let totalActual = actual
    if (isParent) {
      children.forEach(child => {
        totalBudget += getBudgetAmount(child.id)
        totalActual += getActualAmount(child.id)
      })
    }

    return (
      <tbody key={cat.id}>
        <tr className={`border-b ${isParent ? 'bg-gray-50 font-semibold' : 'hover:bg-blue-50'}`}>
          <td className="py-2 px-3" style={{ paddingLeft: `${indent * 24 + 12}px` }}>
            {cat.name}
          </td>
          <td className="py-2 px-3 text-right">
            {editingCell === cat.id ? (
              <input
                type="number"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => handleCellSave(cat.id)}
                onKeyDown={e => e.key === 'Enter' && handleCellSave(cat.id)}
                className="w-24 text-right border rounded px-2 py-0.5 text-sm"
                autoFocus
              />
            ) : (
              <span
                className="cursor-pointer hover:bg-blue-100 px-2 py-0.5 rounded"
                onClick={() => handleCellClick(cat.id)}
              >
                {isParent ? formatSEK(totalBudget) : formatSEK(budget)}
              </span>
            )}
          </td>
          <td className="py-2 px-3 text-right">
            {isParent ? formatSEK(totalActual) : formatSEK(actual)}
          </td>
          <td className={`py-2 px-3 text-right ${(isParent ? totalBudget - totalActual : diff) < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatSEK(isParent ? totalBudget - totalActual : diff)}
          </td>
        </tr>
        {children.map(child => (
          <tr key={child.id} className="border-b hover:bg-blue-50">
            <td className="py-2 px-3 pl-9 text-sm">{child.name}</td>
            <td className="py-2 px-3 text-right">
              {editingCell === child.id ? (
                <input
                  type="number"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => handleCellSave(child.id)}
                  onKeyDown={e => e.key === 'Enter' && handleCellSave(child.id)}
                  className="w-24 text-right border rounded px-2 py-0.5 text-sm"
                  autoFocus
                />
              ) : (
                <span
                  className="cursor-pointer hover:bg-blue-100 px-2 py-0.5 rounded text-sm"
                  onClick={() => handleCellClick(child.id)}
                >
                  {formatSEK(getBudgetAmount(child.id))}
                </span>
              )}
            </td>
            <td className="py-2 px-3 text-right text-sm">{formatSEK(getActualAmount(child.id))}</td>
            <td className={`py-2 px-3 text-right text-sm ${getBudgetAmount(child.id) - getActualAmount(child.id) < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatSEK(getBudgetAmount(child.id) - getActualAmount(child.id))}
            </td>
          </tr>
        ))}
      </tbody>
    )
  }

  // Grand totals
  const incomeCategories = categories.filter(c => c.category_type === 'income')
  const expenseCategories = categories.filter(c => c.category_type === 'expense')
  const totalIncomeBudget = incomeCategories.reduce((s, c) => s + getBudgetAmount(c.id), 0)
  const totalIncomeActual = incomeCategories.reduce((s, c) => s + getActualAmount(c.id), 0)
  const totalExpenseBudget = expenseCategories.reduce((s, c) => s + getBudgetAmount(c.id), 0)
  const totalExpenseActual = expenseCategories.reduce((s, c) => s + getActualAmount(c.id), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCopyModal(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Kopiera månad
          </button>
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
              <th className="py-3 px-3">Kategori</th>
              <th className="py-3 px-3 text-right">Budget</th>
              <th className="py-3 px-3 text-right">Verklig</th>
              <th className="py-3 px-3 text-right">Differens</th>
            </tr>
          </thead>

          {/* Income section */}
          <tbody>
            <tr className="bg-green-50 border-b">
              <td colSpan={4} className="py-2 px-3 font-bold text-green-800">Inkomster</td>
            </tr>
          </tbody>
          {topLevel.filter(c => c.category_type === 'income').map(cat => renderCategoryRow(cat))}
          <tbody>
            <tr className="bg-green-50 border-b font-bold">
              <td className="py-2 px-3">Summa inkomster</td>
              <td className="py-2 px-3 text-right">{formatSEK(totalIncomeBudget)}</td>
              <td className="py-2 px-3 text-right">{formatSEK(totalIncomeActual)}</td>
              <td className="py-2 px-3 text-right">{formatSEK(totalIncomeBudget - totalIncomeActual)}</td>
            </tr>
          </tbody>

          {/* Expense section */}
          <tbody>
            <tr className="bg-red-50 border-b">
              <td colSpan={4} className="py-2 px-3 font-bold text-red-800">Utgifter</td>
            </tr>
          </tbody>
          {topLevel.filter(c => c.category_type === 'expense').map(cat => renderCategoryRow(cat))}
          <tbody>
            <tr className="bg-red-50 border-b font-bold">
              <td className="py-2 px-3">Summa utgifter</td>
              <td className="py-2 px-3 text-right">{formatSEK(totalExpenseBudget)}</td>
              <td className="py-2 px-3 text-right">{formatSEK(totalExpenseActual)}</td>
              <td className="py-2 px-3 text-right">{formatSEK(totalExpenseBudget - totalExpenseActual)}</td>
            </tr>
          </tbody>

          {/* Bottom line */}
          <tbody>
            <tr className="bg-blue-50 font-bold text-lg">
              <td className="py-3 px-3">Kvar</td>
              <td className="py-3 px-3 text-right">{formatSEK(totalIncomeBudget - totalExpenseBudget)}</td>
              <td className="py-3 px-3 text-right">{formatSEK(totalIncomeActual - totalExpenseActual)}</td>
              <td className="py-3 px-3 text-right"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 mt-3">Klicka på en budgetsiffra för att ändra den.</p>

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
