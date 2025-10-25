// controllers/document.controller.js
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "PDF file is required",
      });
    }

    const { organizationId } = req.user;
    const { title = req.file.originalname } = req.body;

    const document = await prisma.document.create({
      data: {
        title,
        fileUrl: `/uploads/${req.file.filename}`,
        status: "DRAFT",
        organizationId,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        action: "DOCUMENT_UPLOADED",
        performedBy: req.user.id,
        ipAddress: req.ip,
      },
    });

    res.status(201).json({
      id: document.id,
      title: document.title,
      fileUrl: document.fileUrl,
      status: document.status,
      createdAt: document.createdAt,
    });
  } catch (error) {
    console.error("Upload document error:", error);
    if (req.file) fs.unlinkSync(req.file.path); // cleanup
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to upload document",
    });
  }
};

const getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const doc = await prisma.document.findFirst({
      where: { id, organizationId },
    });

    if (!doc) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Document not found",
      });
    }

    res.json(doc);
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to retrieve document",
    });
  }
};

/**
 * Get all documents for the organization (Admin only)
 */
const getAllDocuments = async (req, res) => {
  try {
    const { organizationId, role } = req.user;

    // Only allow ADMIN role
    if (role !== "ADMIN") {
      return res.status(403).json({
        type: "https://api.example.com/errors/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Only administrators can access all documents.",
      });
    }

    const documents = await prisma.document.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        signingRequests: {
          include: { signers: true },
        },
      },
    });

    res.status(200).json({
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Get all documents error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to retrieve documents.",
    });
  }
};

module.exports = { uploadDocument, getDocument, getAllDocuments };
