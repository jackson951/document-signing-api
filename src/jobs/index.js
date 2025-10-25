// jobs/index.js
const cron = require("node-cron");
const revokeExpiredEnvelopes = require("./revokeExpiredEnvelopes.job");
const autoArchiveCompleted = require("./autoArchiveCompleted.job");

// Schedule the job to run every hour
cron.schedule("0 * * * *", async () => {
  await revokeExpiredEnvelopes();
});

// Run daily at 2AM
cron.schedule("0 2 * * *", async () => {
  await autoArchiveCompleted();
});
console.log("🧠 Envelope jobs scheduler running...");
