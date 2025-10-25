// jobs/revokeExpiredEnvelopes.job.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Job: Revoke all envelopes (signingRequests) that have expired
 */
const revokeExpiredEnvelopes = async () => {
  console.log("🕒 Running revokeExpiredEnvelopes job...");

  const now = new Date();

  try {
    // Find all envelopes past expiry and not yet revoked/completed
    const expiredEnvelopes = await prisma.signingRequest.findMany({
      where: {
        expiresAt: { lte: now },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: {
        document: true,
        signers: true,
      },
    });

    if (expiredEnvelopes.length === 0) {
      console.log("✅ No expired envelopes found.");
      return;
    }

    console.log(`⚠️ Found ${expiredEnvelopes.length} expired envelopes.`);

    for (const envelope of expiredEnvelopes) {
      await prisma.$transaction(async (tx) => {
        // Update the envelope
        await tx.signingRequest.update({
          where: { id: envelope.id },
          data: { status: "REVOKED" },
        });

        // Update related document
        await tx.document.update({
          where: { id: envelope.documentId },
          data: { status: "REVOKED" },
        });

        // Update all signers
        await tx.signer.updateMany({
          where: { signingRequestId: envelope.id },
          data: { status: "REVOKED" },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            documentId: envelope.documentId,
            action: "ENVELOPE_AUTO_REVOKED",
            performedBy: "System",
            ipAddress: "127.0.0.1",
            details: {
              envelopeId: envelope.id,
              reason: "Envelope expired automatically",
            },
          },
        });
      });

      console.log(`⏰ Envelope ${envelope.id} auto-revoked.`);
    }

    console.log("✅ revokeExpiredEnvelopes job completed successfully.");
  } catch (error) {
    console.error("❌ Error revoking expired envelopes:", error);
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = revokeExpiredEnvelopes;
