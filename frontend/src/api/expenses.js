import api from "./axiosInstance";

export const getExpenses    = (params) => api.get("/expenses", { params });
export const addExpense     = (data)   => api.post("/expenses", data);
export const updateExpense  = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense  = (id)     => api.delete(`/expenses/${id}`);
export const getExpenseSummary = ()    => api.get("/expenses/summary");
