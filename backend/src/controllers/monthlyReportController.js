import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse  from "../utils/ApiResponse.js";
import ApiError     from "../utils/ApiError.js";
import * as svc     from "../services/monthlyReportService.js";
import { generateMonthlyReportPDF } from "../services/pdfService.js";

/** POST /api/v1/monthly-report/generate */
export const generate = asyncHandler(async (req, res) => {
  const { year, month, monthlyIncome = 0, forceRegenerate = false } = req.body;

  const y = parseInt(year);
  const m = parseInt(month);

  if (!y || !m || isNaN(y) || isNaN(m)) {
    throw ApiError.badRequest("year and month are required integers.");
  }

  const result = await svc.generateReport(req.user._id, y, m, Number(monthlyIncome) || 0, Boolean(forceRegenerate));
  ApiResponse.ok(res, { report: result }, "Monthly report generated successfully.");
});

/** GET /api/v1/monthly-report/:year/:month */
export const getReport = asyncHandler(async (req, res) => {
  const { year, month } = req.params;
  const reportMonth = `${year}-${String(month).padStart(2, "0")}`;
  const result = await svc.getReport(req.user._id, reportMonth);
  ApiResponse.ok(res, { report: result }, result ? "Report retrieved." : "No report found for this month.");
});

/** GET /api/v1/monthly-report/list */
export const list = asyncHandler(async (req, res) => {
  const result = await svc.listReports(req.user._id);
  ApiResponse.ok(res, { reports: result }, "Report list retrieved.");
});

/** GET /api/v1/monthly-report/:year/:month/pdf */
export const downloadPDF = asyncHandler(async (req, res) => {
  const { year, month } = req.params;
  const y = parseInt(year);
  const m = parseInt(month);

  if (!y || !m || isNaN(y) || isNaN(m)) {
    throw ApiError.badRequest("year and month are required integers.");
  }

  const reportMonth = `${y}-${String(m).padStart(2, "0")}`;
  let report = await svc.getReport(req.user._id, reportMonth);

  // If report doesn't exist yet, generate it
  if (!report) {
    report = await svc.generateReport(req.user._id, y, m, req.user?.monthlyIncome || 0, false);
  }

  if (!report) {
    throw ApiError.notFound("No report data available for this month.");
  }

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const label = `${MONTH_NAMES[m - 1]} ${y}`;

  const doc = generateMonthlyReportPDF(report, req.user, label);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="SpendSense_AI_Report_${reportMonth}.pdf"`);

  doc.pipe(res);
  doc.end();
});
