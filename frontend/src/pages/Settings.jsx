import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Modal from '../components/Modal'
import { CATEGORY_TYPES, BUDGET_MODES } from '../utils/constants'

export default function Settings() {
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', parent_id: '', category_type: 'expense', budget_mode: 'monthly', sort_order: 0,
  })

  useEffect(() => { loadCategories() }, [])

  const loadCategories = () => api.getCategories().then(setCategories)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...form,
      parent_id: form.parent_id ? parseInt(form.parent_id) : null,
      sort_order: parseInt(form.sort_order),
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
      alert('Kan inte ta bort en kategori som har underkategorier. Ta bort underkategorierna först.')
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
      category_type: cat.category_type, budget_mode: cat.budget_mode, sort_order: cat.sort_order,
    })
    setEditing(cat.id)
    setShowForm(true)
  }

  const openNew = (parentId = null, type = 'expense') => {
    setForm({ name: '', parent_id: parentId ? String(parentId) : '', category_type: type, budget_mode: 'monthly', sort_order: 0 })
    setEditing(null)
    setShowForm(true)
  }

  const topLevel = categories.filter(c => !c.parent_id)
  const getChildren = (parentId) => categories.filter(c => c.parent_id === parentId)

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
            <p className="p-4 text-gray-500 text-sm">Inga kategorier ännu</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-600">
                  <th className="py-2 px-3">Namn</th>
                  <th className="py-2 px-3">Budgettyp</th>
                  <th className="py-2 px-3 text-right">Ordning</th>
                  <th className="py-2 px-3 w-40"></th>
                </tr>
              </thead>
              <tbody>
                {cats.map(cat => (
                  <>
                    <tr key={cat.id} className="border-b bg-gray-50/50 font-medium">
                      <td className="py-2 px-3">{cat.name}</td>
                      <td className="py-2 px-3 text-gray-500">{BUDGET_MODES[cat.budget_mode]}</td>
                      <td className="py-2 px-3 text-right text-gray-500">{cat.sort_order}</td>
                      <td className="py-2 px-3 text-right">
                        <button onClick={() => openNew(cat.id, type)}
                          className="text-blue-600 hover:underline mr-2 text-xs">+ Under</button>
                        <button onClick={() => openEdit(cat)}
                          className="text-blue-600 hover:underline mr-2 text-xs">Ändra</button>
                        <button onClick={() => handleDelete(cat.id)}
                          className="text-red-600 hover:underline text-xs">Ta bort</button>
                      </td>
                    </tr>
                    {getChildren(cat.id).map(child => (
                      <tr key={child.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 pl-8 text-gray-700">{child.name}</td>
                        <td className="py-2 px-3 text-gray-500">{BUDGET_MODES[child.budget_mode]}</td>
                        <td className="py-2 px-3 text-right text-gray-500">{child.sort_order}</td>
                        <td className="py-2 px-3 text-right">
                          <button onClick={() => openEdit(child)}
                            className="text-blue-600 hover:underline mr-2 text-xs">Ändra</button>
                          <button onClick={() => handleDelete(child.id)}
                            className="text-red-600 hover:underline text-xs">Ta bort</button>
                        </td>
                      </tr>
                    ))}
                  </>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inställningar</h1>

      {renderGroup('income', 'Inkomstkategorier')}
      {renderGroup('expense', 'Utgiftskategorier')}
      {renderGroup('savings', 'Sparandekategorier')}

      {showForm && (
        <Modal title={editing ? 'Ändra kategori' : 'Ny kategori'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Namn</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" required placeholder="t.ex. Boendekostnader" />
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
              <label className="block text-sm font-medium mb-1">Överordnad kategori</label>
              <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2">
                <option value="">Ingen (toppnivå)</option>
                {topLevel.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
    </div>
  )
}
