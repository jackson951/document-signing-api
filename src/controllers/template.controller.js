// controllers/template.controller.js
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Create a new template from uploaded PDF
 */
const createTemplate = async (req, res) => {
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
    const { name = req.file.originalname.replace(/\.[^/.]+$/, "") } = req.body;

    const template = await prisma.template.create({
      data: {
        // Fixed: Added 'data' property
        name,
        fileUrl: `/uploads/${req.file.filename}`,
        organizationId,
      },
    });

    res.status(201).json({
      id: template.id,
      name: template.name,
      fileUrl: template.fileUrl,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    });
  } catch (error) {
    console.error("Create template error:", error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path); // cleanup
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
    }
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to create template",
    });
  }
};

/**
 * List all templates for the organization
 */
const listTemplates = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const templates = await prisma.template.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(templates);
  } catch (error) {
    console.error("List templates error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to list templates",
    });
  }
};

/**
 * Get a single template by ID
 */
const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const template = await prisma.template.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!template) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Template not found",
      });
    }

    res.json(template);
  } catch (error) {
    console.error("Get template error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to retrieve template",
    });
  }
};

/**
 * Update a template (name only; file replacement not supported in basic version)
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { organizationId } = req.user;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "Valid name is required",
      });
    }

    const template = await prisma.template.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Template not found",
      });
    }

    const updated = await prisma.template.update({
      where: { id },
      data: { name: name.trim() }, // Fixed: Added 'data' property
    });

    res.json({
      id: updated.id,
      name: updated.name,
      fileUrl: updated.fileUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("Update template error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to update template",
    });
  }
};

/**
 * Delete a template
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const template = await prisma.template.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Template not found",
      });
    }

    // Delete file from disk
    const filename = path.basename(template.fileUrl);
    const filePath = path.join(__dirname, "..", "uploads", filename);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileError) {
        console.error("File deletion error:", fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    await prisma.template.delete({
      where: { id },
    });

    res.status(204).end();
  } catch (error) {
    console.error("Delete template error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to delete template",
    });
  }
};

module.exports = {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
};
