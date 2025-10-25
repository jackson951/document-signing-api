// controllers/envelope.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const config = require("../config");

const createEnvelope = async (req, res) => {
  try {
    const { documentId, signers, expiresAt } = req.body;
    const { organizationId, id: userId } = req.user;

    // Validate document ownership
    const doc = await prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!doc) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Document not found or not owned by your organization",
      });
    }

    if (!Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "At least one signer is required",
      });
    }

    // Validate signers
    const validatedSigners = signers.map((s, idx) => ({
      name: s.name || "Unknown",
      email: s.email?.toLowerCase(),
      status: "PENDING",
    }));

    const envelope = await prisma.signingRequest.create({
      data: {
        documentId,
        status: "PENDING",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        signers: {
          create: validatedSigners,
        },
      },
      include: {
        signers: true,
        document: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        documentId,
        action: "ENVELOPE_CREATED",
        performedBy: userId,
        ipAddress: req.ip,
      },
    });

    res.status(201).json({
      id: envelope.id,
      documentId: envelope.documentId,
      status: envelope.status,
      signers: envelope.signers,
      expiresAt: envelope.expiresAt,
      createdAt: envelope.createdAt,
    });
  } catch (error) {
    console.error("Create envelope error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to create signing envelope",
    });
  }
};

const sendEnvelope = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;

    const envelope = await prisma.signingRequest.findFirst({
      where: { id, document: { organizationId } },
      include: { signers: true, document: true },
    });

    if (!envelope) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Envelope not found",
      });
    }

    if (envelope.status !== "PENDING") {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-state",
        title: "Invalid State",
        status: 400,
        detail: "Envelope is not in PENDING state",
      });
    }

    // Update document status
    await prisma.document.update({
      where: { id: envelope.documentId },
      data: { status: "SENT" },
    });

    // Update envelope
    const updated = await prisma.signingRequest.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        documentId: envelope.documentId,
        action: "ENVELOPE_SENT",
        performedBy: userId,
        ipAddress: req.ip,
      },
    });

    const signer = await prisma.signer.findFirst({
      where: {
        id,
      },
      include: {
        signingRequest: {
          include: { document: true },
        },
      },
    });

    const signingToken = jwt.sign(
      {
        signerId: signer?.id,
        documentId: signer?.signingRequest.documentId,
        type: "signing_invitation",
      },
      config.jwt.secret,
      { expiresIn: "7d" } // 7 days expiration
    );

    // TODO: In real app, send emails with signing links like:
    // `https://yourapp.com/sign/${signer.id}?token=...`

    res.json({
      id: updated.id,
      status: updated.status,
      message: "Envelope sent. Signers will receive email instructions.",
      signToken: signingToken,
    });
  } catch (error) {
    console.error("Send envelope error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to send envelope",
    });
  }
};

const getEnvelope = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    // Get the envelope
    const envelope = await prisma.signingRequest.findUnique({
      where: { id },
      include: {
        signers: true,
        document: true,
      },
    });

    if (!envelope || envelope.document.organizationId !== organizationId) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Envelope not found",
      });
    }

    // Fetch audit logs separately if needed
    const auditLogs = await prisma.auditLog.findMany({
      where: { documentId: envelope.documentId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ ...envelope, auditLogs });
  } catch (error) {
    console.error("Get envelope error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to retrieve envelope",
    });
  }
};

/**
 * Resend signing invitation to signer
 */
const resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, userId } = req.user;

    const signer = await prisma.signer.findFirst({
      where: {
        id,
        signingRequest: {
          document: {
            organizationId,
          },
        },
      },
      include: {
        signingRequest: {
          include: { document: true },
        },
      },
    });

    if (!signer) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Signer not found",
      });
    }

    if (signer.status !== "PENDING") {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-state",
        title: "Invalid State",
        status: 400,
        detail: "Can only resend invitations to pending signers",
      });
    }

    // In a real implementation, you would:
    // 1. Generate a new signing token
    // 2. Send email with signing link
    // 3. Update audit log

    const signingToken = jwt.sign(
      {
        signerId: signer.id,
        documentId: signer.signingRequest.documentId,
        type: "signing_invitation",
      },
      config.jwt.secret,
      { expiresIn: "7d" } // 7 days expiration
    );

    // TODO: Implement email sending service
    console.log(`Resending invitation to ${signer.email}`);
    console.log(`Signing token: ${signingToken}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        documentId: signer.signingRequest.documentId,
        action: "INVITATION_RESENT",
        performedBy: "System", // Or get user email
        performedById: userId,
        ipAddress: req.ip,
        details: {
          signerId: signer.id,
          signerEmail: signer.email,
          resentBy: userId,
        },
      },
    });

    res.json({
      message: "Invitation resent successfully",
      signerEmail: signer.email,
      signToken: signingToken,
    });
  } catch (error) {
    console.error("Resend invitation error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to resend invitation",
    });
  }
};

/**
 * Revoke or invalidate an envelope that was previously sent
 */
const revokeEnvelope = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;

    // Find envelope and ensure it's part of the user's organization
    const envelope = await prisma.signingRequest.findFirst({
      where: { id, document: { organizationId } },
      include: { document: true, signers: true },
    });

    if (!envelope) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Envelope not found",
      });
    }

    if (["COMPLETED", "REVOKED", "EXPIRED"].includes(envelope.status)) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-state",
        title: "Invalid State",
        status: 400,
        detail: `Cannot revoke an envelope that is already ${envelope.status}`,
      });
    }

    // Update envelope status
    const revoked = await prisma.signingRequest.update({
      where: { id },
      data: { status: "REVOKED" },
      include: { document: true, signers: true },
    });

    // Update associated document (optional)
    await prisma.document.update({
      where: { id: revoked.documentId },
      data: { status: "REVOKED" },
    });

    // Update signers' statuses
    await prisma.signer.updateMany({
      where: { signingRequestId: id },
      data: { status: "REVOKED" },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        documentId: revoked.documentId,
        action: "ENVELOPE_REVOKED",
        performedBy: userId,
        ipAddress: req.ip,
        details: {
          envelopeId: revoked.id,
          reason: req.body.reason || "No reason provided",
        },
      },
    });

    res.json({
      id: revoked.id,
      status: revoked.status,
      message: "Envelope has been successfully revoked",
    });
  } catch (error) {
    console.error("Revoke envelope error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to revoke envelope",
    });
  }
};

module.exports = {
  createEnvelope,
  sendEnvelope,
  getEnvelope,
  resendInvitation,
  revokeEnvelope,
};
