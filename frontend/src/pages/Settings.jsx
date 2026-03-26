import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { CATEGORY_TYPES, BUDGET_MODES } from '../utils/constants'

export default function Settings() {
  const [categories, setCategories] = useState([])
  const [paymentAccounts, setPaymentAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingAccount, setEditingAccount] = useState(null)
  const [form, setForm] = useState({
    name: '', parent_id: '', category_type: 'expense', budget_mode: 'monthly',
    sort_order: 0, payment_account_id: '', linked_section: '',
  })
  const [accountForm, setAccountForm] = useState({ name: '', description: '' })

  useEffect(() => {
    loadCategories()
    loadPaymentAccounts()
  }, [])

  const loadCategories = () => api.getCategories().then(setCategories)
  const loadPaymentAccounts = () => api.getPaymentAccounts().then(setPaymentAccounts)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...form,
      parent_id: form.parent_id ? parseInt(form.parent_id) : null,
      sort_order: parseInt(form.sort_order),
      payment_account_id: form.payment_account_id ? parseInt(form.payment_account_id) : null,
      linked_section: form.linked_section || null,
    }
    if (editing) {
      await api.updateCategory(editing, data)
    } else {
      await api.createCategory(data)
    }
    setShowForm(false)
    setEditing(null)
    loadCategories()
  }

  const handleDelete = async (id) => {
    const hasChildren = categories.some(c => c.parent_id === id)
    if (hasChildren) {
      alert('Kan inte ta bort en kategori som har underkategorier.')
      return
    }
    if (confirm('Ta bort denna kategori?')) {
      await api.deleteCategory(id)
      loadCategories()
    }
  }

  const openEdit = (cat) => {
    setForm({
      name: cat.name, parent_id: cat.parent_id ? String(cat.parent_id) : '',
      category_type: cat.category_type, budget_mode: cat.budget_mode,
      sort_order: cat.sort_order, payment_account_id: cat.payment_account_id ? String(cat.payment_account_id) : '',
      linked_section: cat.linked_section || '',
    })
    setEditing(cat.id)
    setShowForm(true)
  }

  const openNew = (parentId = null, type = 'expense') => {
    setForm({ name: '', parent_id: parentId ? String(parentId) : '', category_type: type, budget_mode: 'monthly', sort_order: 0, payment_account_id: '', linked_section: '' })
    setEditing(null)
    setShowForm(true)
  }

  // Payment account handlers
  const handleAccountSubmit = async (e) => {
    e.preventDefault()
    if (editingAccount) {
      await api.updatePaymentAccount(editingAccount, accountForm)
    } else {
      await api.createPaymentAccount(accountForm)
    }
    setShowAccountForm(false)
    setEditingAccount(null)
    loadPaymentAccounts()
  }

  const handleDeleteAccount = async (id) => {
    if (confirm('Ta bort detta betalningskonto?')) {
      await api.deletePaymentAccount(id)
      loadPaymentAccounts()
    }
  }

  const topLevel = categories.filter(c => !c.parent_id)
  const getChildren = (parentId) => categories.filter(c => c.parent_id === parentId)
  const getAccountName = (id) => paymentAccounts.find(a => a.id === id)?.name

  const renderGroup = (type, label) => {
    const cats = topLevel.filter(c => c.category_type === type)
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{label}</h2>
          <button onClick={() => openNew(null, type)}
            className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
            + Ny kategori
          </button>
        </div>

        <div className="bg-white rounded-xl border">
          {cats.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">Inga kategorier</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-600">
                  <th className="py-2 px-3">Namn</th>
                  <th className="py-2 px-3">Betalningskonto</th>
                  <th className="py-2 px-3 text-right">Ordning</th>
                  <th className="py-2 px-3 w-40"></th>
                </tr>
              </thead>
              <tbody>
                {cats.map(cat => (
                  <CategoryRows key={cat.id} cat={cat} children={getChildren(cat.id)}
                    getAccountName={getAccountName} openEdit={openEdit}
                    openNew={openNew} handleDelete={handleDelete} type={type} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Installningar</h1>

      {/* Payment Accounts Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Betalningskonton</h2>
          <button onClick={() => { setAccountForm({ name: '', description: '' }); setEditingAccount(null); setShowAccountForm(true) }}
            className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
            + Nytt konto
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Skapa konton som "Driftkonto" och "Betalningskonto". Koppla sedan kategorier till ratt konto for att se hur mycket som ska ut fran varje.
        </p>
        <div className="bg-white rounded-xl border">
          {paymentAccounts.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">Inga betalningskonton. Lagg till t.ex. "Driftkonto" och "Betalningskonto".</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {paymentAccounts.map(acc => (
                  <tr key={acc.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{acc.name}</td>
                    <td className="py-2 px-3 text-gray-500">{acc.description || ''}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => { setAccountForm({ name: acc.name, description: acc.description || '' }); setEditingAccount(acc.id); setShowAccountForm(true) }}
                        className="text-blue-600 hover:underline mr-2 text-xs">Andra</button>
                      <button onClick={() => handleDeleteAccount(acc.id)}
                        className="text-red-600 hover:underline text-xs">Ta bort</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {renderGroup('income', 'Inkomstkategorier')}
      {renderGroup('expense', 'Utgiftskategorier')}
      {renderGroup('savings', 'Sparandekategorier')}

      {/* Category Form */}
      {showForm && (
        <Modal title={editing ? 'Andra kategori' : 'Ny kategori'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Namn</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Typ</label>
              <select value={form.category_type} onChange={e => setForm({ ...form, category_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2">
                {Object.entries(CATEGORY_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Overordnad kategori</label>
              <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2">
                <option value="">Ingen (toppniva)</option>
                {topLevel.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Betalningskonto</label>
              <select value={form.payment_account_id} onChange={e => setForm({ ...form, payment_account_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2">
                <option value="">Inget konto</option>
                {paymentAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Vilket konto betalas denna kostnad fran?</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visa under sektion</label>
              <select value={form.linked_section} onChange={e => setForm({ ...form, linked_section: e.target.value })}
                className="w-full border rounded-lg px-3 py-2">
                <option value="">Standard (utgifter)</option>
                <option value="mortgage">Bolan</option>
                <option value="cars">Bilar</option>
                <option value="consumer_loan">Konsumtionslan</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Visa denna kategori under en specifik sektion i manadsvyn istallet for under utgifter.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Budgettyp</label>
              <select value={form.budget_mode} onChange={e => setForm({ ...form, budget_mode: e.target.value })}
                className="w-full border rounded-lg px-3 py-2">
                {Object.entries(BUDGET_MODES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sorteringsordning</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })}
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

      {/* Payment Account Form */}
      {showAccountForm && (
        <Modal title={editingAccount ? 'Andra betalningskonto' : 'Nytt betalningskonto'} onClose={() => { setShowAccountForm(false); setEditingAccount(null) }}>
          <form onSubmit={handleAccountSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Namn</label>
              <input type="text" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required placeholder="t.ex. Driftkonto" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beskrivning</label>
              <input type="text" value={accountForm.description} onChange={e => setAccountForm({ ...accountForm, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" placeholder="Valfri beskrivning" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowAccountForm(false); setEditingAccount(null) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Avbryt</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Spara</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

const SECTION_LABELS = { cars: 'Bilar', mortgage: 'Bolan', consumer_loan: 'Konsumtionslan' }

function CategoryRows({ cat, children, getAccountName, openEdit, openNew, handleDelete, type }) {
  return (
    <>
      <tr className="border-b bg-gray-50/50 font-medium">
        <td className="py-2 px-3">
          {cat.name}
          {cat.linked_section && (
            <span className="ml-2 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">{SECTION_LABELS[cat.linked_section]}</span>
          )}
        </td>
        <td className="py-2 px-3 text-gray-500 text-xs">
          {cat.payment_account_id ? (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{getAccountName(cat.payment_account_id)}</span>
          ) : '-'}
        </td>
        <td className="py-2 px-3 text-right text-gray-500">{cat.sort_order}</td>
        <td className="py-2 px-3 text-right">
          <button onClick={() => openNew(cat.id, type)}
            className="text-blue-600 hover:underline mr-2 text-xs">+ Under</button>
          <button onClick={() => openEdit(cat)}
            className="text-blue-600 hover:underline mr-2 text-xs">Andra</button>
          <button onClick={() => handleDelete(cat.id)}
            className="text-red-600 hover:underline text-xs">Ta bort</button>
        </td>
      </tr>
      {children.map(child => (
        <tr key={child.id} className="border-b hover:bg-gray-50">
          <td className="py-2 px-3 pl-8 text-gray-700">
            {child.name}
            {child.linked_section && (
              <span className="ml-2 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">{SECTION_LABELS[child.linked_section]}</span>
            )}
          </td>
          <td className="py-2 px-3 text-gray-500 text-xs">
            {child.payment_account_id ? (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{getAccountName(child.payment_account_id)}</span>
            ) : cat.payment_account_id ? (
              <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{getAccountName(cat.payment_account_id)}</span>
            ) : '-'}
          </td>
          <td className="py-2 px-3 text-right text-gray-500">{child.sort_order}</td>
          <td className="py-2 px-3 text-right">
            <button onClick={() => openEdit(child)}
              className="text-blue-600 hover:underline mr-2 text-xs">Andra</button>
            <button onClick={() => handleDelete(child.id)}
              className="text-red-600 hover:underline text-xs">Ta bort</button>
          </td>
        </tr>
      ))}
    </>
  )
}
