const Analytics = require("../models/Analytics");
const CreatorProfile = require("../models/CreatorProfile");

const startOfDay = (date = new Date()) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const sameDay = (first, second) => startOfDay(first).getTime() === startOfDay(second).getTime();

const monthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

// Ensures every creator has a single analytics document.
const ensureAnalytics = async (creatorId) =>
  Analytics.findOneAndUpdate(
    { creator: creatorId },
    { $setOnInsert: { creator: creatorId } },
    { new: true, upsert: true }
  );

// Applies analytics increments to totals, daily stats, monthly revenue, and creator counters.
const incrementAnalytics = async (creatorId, increments = {}) => {
  const analytics = await ensureAnalytics(creatorId);
  const today = startOfDay();
  const currentMonth = monthKey(today);

  Object.entries(increments).forEach(([key, value]) => {
    analytics[key] = (analytics[key] || 0) + value;
  });

  let dailyStat = analytics.dailyStats.find((stat) => sameDay(stat.date, today));
  if (!dailyStat) {
    analytics.dailyStats.push({
      date: today,
      profileViews: 0,
      serviceClicks: 0,
      purchases: 0,
      revenue: 0
    });
    dailyStat = analytics.dailyStats[analytics.dailyStats.length - 1];
  }

  Object.entries(increments).forEach(([key, value]) => {
    dailyStat[key] = (dailyStat[key] || 0) + value;
  });

  if (increments.revenue) {
    let monthly = analytics.monthlyRevenue.find((item) => item.month === currentMonth);
    if (!monthly) {
      analytics.monthlyRevenue.push({ month: currentMonth, revenue: 0 });
      monthly = analytics.monthlyRevenue[analytics.monthlyRevenue.length - 1];
    }
    monthly.revenue += increments.revenue;
  }

  await analytics.save();

  const creatorIncrements = {};
  if (increments.profileViews) creatorIncrements.profileViews = increments.profileViews;
  if (increments.serviceClicks) creatorIncrements.serviceClicks = increments.serviceClicks;
  if (increments.purchases) creatorIncrements.purchases = increments.purchases;
  if (increments.revenue) creatorIncrements.totalEarnings = increments.revenue;

  if (Object.keys(creatorIncrements).length > 0) {
    await CreatorProfile.findByIdAndUpdate(creatorId, { $inc: creatorIncrements });
  }

  return analytics;
};

const recordProfileView = (creatorId) => incrementAnalytics(creatorId, { profileViews: 1 });

const recordServiceClick = (creatorId) => incrementAnalytics(creatorId, { serviceClicks: 1 });

const recordPurchase = (creatorId, amount) =>
  incrementAnalytics(creatorId, {
    purchases: 1,
    revenue: Number(amount || 0)
  });

// Returns normalized analytics payloads for dashboards.
const getCreatorAnalytics = async (creatorId) => {
  const analytics = await ensureAnalytics(creatorId);

  return {
    totals: {
      profileViews: analytics.profileViews,
      serviceClicks: analytics.serviceClicks,
      purchases: analytics.purchases,
      revenue: analytics.revenue
    },
    dailyStats: analytics.dailyStats.sort((a, b) => b.date - a.date),
    monthlyRevenue: analytics.monthlyRevenue.sort((a, b) => a.month.localeCompare(b.month))
  };
};

module.exports = {
  ensureAnalytics,
  recordProfileView,
  recordServiceClick,
  recordPurchase,
  getCreatorAnalytics
};
