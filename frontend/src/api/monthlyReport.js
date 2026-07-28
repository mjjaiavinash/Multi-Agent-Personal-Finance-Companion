import api from "./axiosInstance";

/** POST /api/v1/monthly-report/generate */
export const generateMonthlyReport = (year, month, monthlyIncome = 0, forceRegenerate = false) =>
  api.post("/monthly-report/generate", { year, month, monthlyIncome, forceRegenerate });

/** GET /api/v1/monthly-report/:year/:month */
export const getMonthlyReport = (year, month) =>
  api.get(`/monthly-report/${year}/${month}`);

/** GET /api/v1/monthly-report/list */
export const listMonthlyReports = () =>
  api.get("/monthly-report/list");

/** GET /api/v1/monthly-report/:year/:month/pdf — responseType blob for download */
export const downloadMonthlyReportPDF = (year, month) =>
  api.get(`/monthly-report/${year}/${month}/pdf`, { responseType: "blob" });
