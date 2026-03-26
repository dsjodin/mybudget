const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (order) => request('/categories/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }),

  // Budget
  getBudget: (year, month) => {
    let url = `/budget?year=${year}`
    if (month) url += `&month=${month}`
    return request(url)
  },
  saveBudgetItem: (data) => request('/budget', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudgetItem: (id) => request(`/budget/${id}`, { method: 'DELETE' }),
  copyMonth: (data) => request('/budget/copy-month', { method: 'POST', body: JSON.stringify(data) }),

  // Transactions
  getTransactions: (year, month) => request(`/transactions?year=${year}&month=${month}`),
  createTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Loans
  getLoans: (type) => request(`/loans${type ? `?type=${type}` : ''}`),
  createLoan: (data) => request('/loans', { method: 'POST', body: JSON.stringify(data) }),
  updateLoan: (id, data) => request(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLoan: (id) => request(`/loans/${id}`, { method: 'DELETE' }),
  updateLoanRate: (id, data) => request(`/loans/${id}/update-rate`, { method: 'POST', body: JSON.stringify(data) }),
  getLoanRateHistory: (id) => request(`/loans/${id}/rate-history`),
  getLoanSchedule: (id, months) => request(`/loans/${id}/schedule?months=${months || 12}`),

  // Leasing
  getLeasingContracts: () => request('/leasing'),
  createLeasingContract: (data) => request('/leasing', { method: 'POST', body: JSON.stringify(data) }),
  updateLeasingContract: (id, data) => request(`/leasing/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLeasingContract: (id) => request(`/leasing/${id}`, { method: 'DELETE' }),

  // Savings
  getSavingsAccounts: () => request('/savings'),
  createSavingsAccount: (data) => request('/savings', { method: 'POST', body: JSON.stringify(data) }),
  updateSavingsAccount: (id, data) => request(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavingsAccount: (id) => request(`/savings/${id}`, { method: 'DELETE' }),
  addSavingsTransaction: (id, data) => request(`/savings/${id}/transaction`, { method: 'POST', body: JSON.stringify(data) }),
  getSavingsTransactions: (id) => request(`/savings/${id}/transactions`),
  setSavingsBalance: (id, data) => request(`/savings/${id}/set-balance`, { method: 'POST', body: JSON.stringify(data) }),

  // Monthly View
  getMonthlyView: (year, months) => request(`/monthly-view?year=${year}&months=${months}`),
  getDistributionSettings: () => request('/distribution-settings'),
  updateDistributionSettings: (data) => request('/distribution-settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard
  getDashboardSummary: (year, month) => request(`/dashboard/summary?year=${year}&month=${month}`),
  getDashboardTrends: (year) => request(`/dashboard/trends?year=${year}`),
  getDashboardDistribution: (year, month) => request(`/dashboard/distribution?year=${year}&month=${month}`),

  // Scenarios
  getScenarios: () => request('/scenarios'),
  createScenario: (data) => request('/scenarios', { method: 'POST', body: JSON.stringify(data) }),
  updateScenario: (id, data) => request(`/scenarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScenario: (id) => request(`/scenarios/${id}`, { method: 'DELETE' }),
  calculateScenario: (id, year, month) => request(`/scenarios/${id}/calculate?year=${year}&month=${month}`),
  compareScenarios: (ids, year, month) => request(`/scenarios/compare?ids=${ids.join(',')}&year=${year}&month=${month}`),
}
