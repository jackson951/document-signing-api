// jobs/autoArchiveCompleted.job.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");
const fs = require("fs");

async function autoArchiveCompleted() {
  console.log(`[${new Date().toISOString()}] 🗄️ Running auto-archive job...`);

  try {
    // 1️⃣ Fetch all completed envelopes older than 7 days
    const completedEnvelopes = await prisma.envelope.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
      },
      include: {
        document: true,
      },
    });

    if (completedEnvelopes.length === 0) {
      console.log("✅ No completed envelopes to archive.");
      return;
    }

    console.log(`📦 Found ${completedEnvelopes.length} envelopes to archive.`);

    for (const env of completedEnvelopes) {
      const document = env.document;
      if (!document) continue;

      // 2️⃣ Optional: move file to archive folder (for dev/local)
      const uploadsDir = path.join(__dirname, "../uploads");
      const archiveDir = path.join(__dirname, "../uploads/archives");

      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const sourcePath = path.join(uploadsDir, path.basename(document.fileUrl));
      const destPath = path.join(archiveDir, path.basename(document.fileUrl));

      if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, destPath);
      }

      // 3️⃣ Update document & envelope statuses
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "ARCHIVED" },
      });

      await prisma.envelope.update({
        where: { id: env.id },
        data: { status: "ARCHIVED" },
      });

      // 4️⃣ Create an audit log
      await prisma.auditLog.create({
        data: {
          documentId: document.id,
          envelopeId: env.id,
          action: "DOCUMENT_ARCHIVED",
          performedBy: "SYSTEM",
          ipAddress: "127.0.0.1",
          details: `Document auto-archived after completion.`,
        },
      });

      console.log(`🗂️ Archived document: ${document.title}`);
    }

    console.log("✅ Auto-archive job completed successfully.");
  } catch (error) {
    console.error("❌ Error in auto-archive job:", error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { autoArchiveCompleted };
