/**
 * Expense Categorizer Prompt — v1
 *
 * Design principles:
 *  - Categories are explicitly defined with descriptions to reduce ambiguity
 *  - Few-shot examples anchor Gemini to the expected output format
 *  - Strict JSON-only instruction prevents markdown wrapping
 *  - Confidence score forces the model to express uncertainty
 *  - Fallback to "Other" is explicitly instructed for unknown inputs
 */

export const AGENT_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transport",
  "Bills & Utilities",
  "Entertainment",
  "Education",
  "Healthcare",
  "Housing & EMI",
  "Travel",
  "Other",
];

const CATEGORY_DEFINITIONS = `
- Food & Dining     : Restaurants, cafes, groceries, food delivery, lunch, dinner, snacks, coffee, Swiggy, Zomato
- Shopping          : Clothing, electronics, household items, online shopping, Amazon, Flipkart, apparel
- Transport         : Fuel, petrol, taxi, Uber, Ola, bus, train, flight, parking, commuting
- Healthcare        : Doctor visits, pharmacy, medicines, hospital, health insurance, dental, medical
- Bills & Utilities : Electricity, water, internet, phone, broadband, recharges, utility bills
- Entertainment     : Movies, Netflix, concerts, games, streaming services, sports, leisure, outings
- Education         : Tuition, books, courses, workshops, notebooks, school supplies, learning
- Housing & EMI     : Rent, home loan EMI, maintenance, housing, apartment bills
- Travel            : Vacation, hotel bookings, weekend trips, tours, flights
- Other             : Anything that does not clearly fit the above categories
`.trim();

const FEW_SHOT_EXAMPLES = `
Input: { "title": "McDonald's dinner", "amount": 12.50, "notes": "" }
Output: { "category": "Food", "confidence": 0.99, "reasoning": "Fast food restaurant purchase." }

Input: { "title": "Uber ride to airport", "amount": 34.00, "notes": "early morning flight" }
Output: { "category": "Transport", "confidence": 0.98, "reasoning": "Ride-share service for travel." }

Input: { "title": "Netflix subscription", "amount": 15.99, "notes": "monthly" }
Output: { "category": "Bills", "confidence": 0.95, "reasoning": "Recurring streaming subscription treated as a bill." }

Input: { "title": "Paracetamol and vitamins", "amount": 8.40, "notes": "pharmacy" }
Output: { "category": "Healthcare", "confidence": 0.97, "reasoning": "Pharmacy purchase of medicine and supplements." }

Input: { "title": "Random stuff", "amount": 5.00, "notes": "" }
Output: { "category": "Other", "confidence": 0.55, "reasoning": "Insufficient information to determine a specific category." }
`.trim();

export const buildCategorizerPrompt = (expense) => `
Classify this expense into ONE category: ${AGENT_CATEGORIES.join(", ")}.
Expense: Title="${expense.title}", Amount=${expense.amount || 0}
Categories:
- Food & Dining: Food, dining, lunch, dinner, cafe, coffee, groceries, Swiggy, Zomato
- Transport: Fuel, petrol, Uber, Ola, cab, flight, train, bus, transport
- Bills & Utilities: Wifi, broadband, electricity, mobile, bills
- Entertainment: Movies, Netflix, games, tickets, show
- Education: Books, courses, tuition, notebooks, school
- Healthcare: Medicines, doctor, pharmacy, medical, health
- Housing & EMI: Rent, EMI, home loan, maintenance
- Shopping: Apparel, clothes, shoes, Amazon, Flipkart, shopping
- Travel: Hotel, trip, vacation
- Other: Anything else

Return ONLY raw JSON:
{"category": "<category>", "confidence": 0.95, "reasoning": "<one sentence>"}
`.trim();

export const buildBatchCategorizerPrompt = (expenses) => `
Classify each expense in JSON array into ONE of: ${AGENT_CATEGORIES.join(", ")}.
Inputs: ${JSON.stringify(expenses.map(e => ({ id: e.id, title: e.title, amount: e.amount })))}

Return ONLY JSON array of objects:
[{"id": "<id>", "category": "<category>", "confidence": 0.95, "reasoning": "<sentence>"}]
`.trim();
