import mongoose from "mongoose";
import SavingsGoal from "../models/SavingsGoal.js";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
import { generateGoalSuggestions } from "../agents/savingsGoalAgent.js";
import ApiError from "../utils/ApiError.js";
import { createNotification } from "./notificationService.js";

/**
 * Creates a new savings goal.
 */
export const createGoal = async (userId, data) => {
  const { title, targetAmount, currentSavings = 0, deadline, category = "General" } = data;

  if (!title || !targetAmount || !deadline) {
    throw ApiError.badRequest("title, targetAmount, and deadline are required.");
  }

  const isCompleted = Number(currentSavings) >= Number(targetAmount);
  const status = isCompleted ? "completed" : "in_progress";

  const goal = await SavingsGoal.create({
    user: userId,
    title,
    targetAmount: Number(targetAmount),
    currentSavings: Number(currentSavings),
    deadline: new Date(deadline),
    category,
    status,
  });

  if (isCompleted) {
    createNotification(userId, {
      type: "goal_achieved",
      title: "Savings Goal Achieved! 🎉",
      message: `Congratulations! You reached your savings target of ₹${Number(targetAmount).toLocaleString()} for "${title}".`,
      severity: "success",
      metadata: { goalId: goal._id, title },
    }).catch(() => {});
  }

  return goal.toObject();
};

/**
 * Returns all savings goals for a user.
 */
export const getGoals = async (userId) => {
  const goals = await SavingsGoal.find({ user: userId })
    .sort({ createdAt: -1 });

  return goals.map((g) => g.toObject());
};

/**
 * Updates an existing goal.
 */
export const updateGoal = async (userId, goalId, updateData) => {
  const goal = await SavingsGoal.findOne({ _id: goalId, user: userId });
  if (!goal) throw ApiError.notFound("Savings goal not found.");

  if (updateData.title) goal.title = updateData.title;
  if (updateData.targetAmount !== undefined) goal.targetAmount = Number(updateData.targetAmount);
  if (updateData.currentSavings !== undefined) goal.currentSavings = Number(updateData.currentSavings);
  if (updateData.deadline) goal.deadline = new Date(updateData.deadline);
  if (updateData.category) goal.category = updateData.category;
  if (updateData.status) goal.status = updateData.status;

  const wasCompleted = goal.status === "completed";
  if (goal.currentSavings >= goal.targetAmount) {
    goal.status = "completed";
    if (!wasCompleted) {
      createNotification(userId, {
        type: "goal_achieved",
        title: "Savings Goal Achieved! 🎉",
        message: `Congratulations! You reached your target of ₹${goal.targetAmount.toLocaleString()} for "${goal.title}".`,
        severity: "success",
        metadata: { goalId: goal._id, title: goal.title },
      }).catch(() => {});
    }
  }

  await goal.save();
  return goal.toObject();
};

/**
 * Deposits/adds funds to a goal.
 */
export const addFunds = async (userId, goalId, amount) => {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw ApiError.badRequest("Amount must be a positive number.");
  }

  const goal = await SavingsGoal.findOne({ _id: goalId, user: userId });
  if (!goal) throw ApiError.notFound("Savings goal not found.");

  const wasCompleted = goal.status === "completed";
  goal.currentSavings += numAmount;

  if (goal.currentSavings >= goal.targetAmount) {
    goal.status = "completed";
    if (!wasCompleted) {
      createNotification(userId, {
        type: "goal_achieved",
        title: "Savings Goal Achieved! 🎉",
        message: `Congratulations! You reached your target of ₹${goal.targetAmount.toLocaleString()} for "${goal.title}".`,
        severity: "success",
        metadata: { goalId: goal._id, title: goal.title },
      }).catch(() => {});
    }
  }

  await goal.save();
  return goal.toObject();
};

/**
 * Deletes a goal.
 */
export const deleteGoal = async (userId, goalId) => {
  const goal = await SavingsGoal.findOneAndDelete({ _id: goalId, user: userId });
  if (!goal) throw ApiError.notFound("Savings goal not found.");
  return { id: goalId };
};

/**
 * Generates AI suggestions to reach goal faster.
 */
export const generateGoalAISuggestions = async (userId, goalId) => {
  const goal = await SavingsGoal.findOne({ _id: goalId, user: userId });
  if (!goal) throw ApiError.notFound("Savings goal not found.");

  const user = await User.findById(userId).lean();
  const userObjId = new mongoose.Types.ObjectId(userId);

  // Aggregates for context
  const [totalsAgg, topCatAgg] = await Promise.all([
    Expense.aggregate([
      { $match: { user: userObjId } },
      { $group: { _id: null, totalSpent: { $sum: "$amount" } } }
    ]),
    Expense.aggregate([
      { $match: { user: userObjId } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 3 }
    ])
  ]);

  const userContext = {
    monthlyIncome: user?.monthlyIncome || 3000,
    avgMonthlySpend: totalsAgg[0]?.totalSpent ? Math.round(totalsAgg[0].totalSpent / 3) : 2000,
    topCategories: topCatAgg.map(c => ({ category: c._id, total: c.total }))
  };

  const suggestions = await generateGoalSuggestions(goal, userContext);

  goal.aiSuggestions = suggestions;
  await goal.save();

  return goal.toObject();
};
