// controllers/signatureField.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Allowed signature types
const ALLOWED_SIGNATURE_TYPES = [
  "CLICK",
  "DRAW",
  "TYPE",
  "IMAGE",
  "INITIAL",
  "DATE",
  "SIGNATURE",
];

/**
 * Create signature fields for a document
 */
const createSignatureFields = async (req, res) => {
  try {
    const { signingRequestId, fields } = req.body;

    if (
      !signingRequestId ||
      !fields ||
      !Array.isArray(fields) ||
      fields.length === 0
    ) {
      return res.status(400).json({
        type: "https://api.example.com/errors/bad-request",
        title: "Bad Request",
        status: 400,
        detail:
          "signingRequestId and fields[] are required and fields[] cannot be empty",
      });
    }

    // Validate all fields first
    const data = [];
    for (const f of fields) {
      if (
        f.pageNumber === undefined ||
        f.x === undefined ||
        f.y === undefined ||
        f.width === undefined ||
        f.height === undefined ||
        !f.signerId
      ) {
        return res.status(400).json({
          type: "https://api.example.com/errors/bad-request",
          title: "Bad Request",
          status: 400,
          detail:
            "Each field must have pageNumber, x, y, width, height, and signerId",
        });
      }

      // Check signer exists
      const signerExists = await prisma.signer.findUnique({
        where: { id: f.signerId },
      });
      if (!signerExists) {
        return res.status(400).json({
          type: "https://api.example.com/errors/bad-request",
          title: "Bad Request",
          status: 400,
          detail: `Signer with ID ${f.signerId} does not exist`,
        });
      }

      // Validate type
      const type = (f.type?.toUpperCase() || "SIGNATURE").trim();
      if (!ALLOWED_SIGNATURE_TYPES.includes(type)) {
        return res.status(400).json({
          type: "https://api.example.com/errors/bad-request",
          title: "Bad Request",
          status: 400,
          detail: `Invalid signature type: ${type}. Allowed types: ${ALLOWED_SIGNATURE_TYPES.join(
            ", "
          )}`,
        });
      }

      data.push({
        pageNumber: f.pageNumber,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        type,
        signerId: f.signerId,
      });
    }

    // Create all signature fields
    const createdFields = await prisma.signatureField.createMany({
      data,
    });

    res.status(201).json({
      message: "Signature fields created successfully",
      count: createdFields.count,
    });
  } catch (error) {
    console.error("Create signature fields error:", error.message || error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: error.message || "Failed to create signature fields",
    });
  }
};

/**
 * Get all signature fields for a given signing request
 */
const getSignatureFields = async (req, res) => {
  try {
    const { signingRequestId } = req.params;

    if (!signingRequestId) {
      return res.status(400).json({
        type: "https://api.example.com/errors/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "signingRequestId parameter is required",
      });
    }

    // Join through Signer -> SigningRequest
    const fields = await prisma.signatureField.findMany({
      where: {
        signer: { signingRequestId },
      },
    });

    res.json(fields);
  } catch (error) {
    console.error("Get signature fields error:", error.message || error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to retrieve signature fields",
    });
  }
};

/**
 * Delete a specific signature field by its ID
 */
const deleteSignatureField = async (req, res) => {
  try {
    const { fieldId } = req.params;

    if (!fieldId) {
      return res.status(400).json({
        type: "https://api.example.com/errors/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "fieldId parameter is required",
      });
    }

    const existingField = await prisma.signatureField.findUnique({
      where: { id: fieldId },
    });

    if (!existingField) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Signature field not found",
      });
    }

    await prisma.signatureField.delete({
      where: { id: fieldId },
    });

    res.status(200).json({
      message: "Signature field deleted successfully",
      fieldId,
    });
  } catch (error) {
    console.error("Delete signature field error:", error.message || error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to delete signature field",
    });
  }
};

module.exports = {
  createSignatureFields,
  getSignatureFields,
  deleteSignatureField,
};
