// controllers/signer.controller.js
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const fileType = require("file-type");
const mammoth = require("mammoth");
const config = require("../config");

const prisma = new PrismaClient();

/**
 * 🧩 Helper: Convert DOCX → PDF
 */
async function convertDocxToPdf(inputPath) {
  const outputPath = inputPath.replace(/\.docx$/i, ".pdf");
  const { value } = await mammoth.convertToHtml({ path: inputPath });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const text = value.replace(/<[^>]+>/g, ""); // strip HTML tags

  page.drawText(text.slice(0, 3000), { x: 50, y: 700, font, size: 12 });
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}

/**
 * 🧩 Helper: Embed signature into PDF
 */
async function embedSignatureOnPdf(filePath, signer, signatureData) {
  const existingPdfBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Handle signature image (DRAW / IMAGE)
  let signatureImage;
  if (signer.signatureType === "DRAW" || signer.signatureType === "IMAGE") {
    const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Buffer.from(base64Data, "base64");
    signatureImage = await pdfDoc.embedPng(imageBytes);
  }

  // Loop through signer’s assigned fields
  for (const field of signer.signatureFields) {
    const page = pages[field.pageNumber - 1]; // pageNumber is 1-based

    if (signer.signatureType === "TYPE") {
      page.drawText(signatureData || `Signed by ${signer.name}`, {
        x: field.x,
        y: field.y,
        size: 14,
        font,
        color: rgb(0, 0.5, 0),
      });
    } else if (signatureImage) {
      page.drawImage(signatureImage, {
        x: field.x,
        y: field.y,
        width: field.width || 120,
        height: field.height || 40,
      });
    } else {
      // fallback (CLICK type)
      page.drawText(`✔ ${signer.name}`, {
        x: field.x,
        y: field.y,
        size: 12,
        font,
        color: rgb(0, 0.5, 0),
      });
    }
  }

  const newFilePath = filePath.replace(".pdf", `-signed-${Date.now()}.pdf`);
  fs.writeFileSync(newFilePath, await pdfDoc.save());
  return newFilePath;
}

/**
 * 🧩 Get signer (for admin or audit views)
 */
const getSigner = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const signer = await prisma.signer.findFirst({
      where: { id, signingRequest: { document: { organizationId } } },
      include: {
        signingRequest: { include: { document: true } },
        signatureFields: true,
        signature: true,
      },
    });

    if (!signer) return res.status(404).json({ message: "Signer not found" });
    res.json(signer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 🧩 Sign Document (PDF + DOCX)
 */
const signDocument = async (req, res) => {
  try {
    const { id: signerId } = req.params;
    const { token, signatureType = "CLICK", signatureData } = req.body;

    if (!token) return res.status(401).json({ message: "Missing token" });

    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.signerId !== signerId)
      return res.status(403).json({ message: "Token mismatch" });

    const signer = await prisma.signer.findUnique({
      where: { id: signerId },
      include: {
        signatureFields: true,
        signingRequest: { include: { document: true, signers: true } },
      },
    });

    if (!signer) return res.status(404).json({ message: "Signer not found" });
    if (signer.status !== "PENDING")
      return res.status(400).json({ message: "Already signed or declined" });

    // Get and detect document
    const filePath = path.join(
      __dirname,
      `../${signer.signingRequest.document.fileUrl}`
    );
    const type = await fileType.fromFile(filePath);
    let pdfPath = filePath;

    if (type?.ext === "docx") pdfPath = await convertDocxToPdf(filePath);

    // Embed signature
    const signedPdfPath = await embedSignatureOnPdf(
      pdfPath,
      signer,
      signatureData
    );

    const fileUrl = signedPdfPath.replace(path.join(__dirname, "../"), "");

    // Save signature and update DB
    await prisma.$transaction(async (tx) => {
      await tx.signature.create({
        data: {
          signerId,
          fileUrl,
          ipAddress: req.ip,
        },
      });

      await tx.signer.update({
        where: { id: signerId },
        data: { status: "SIGNED", signatureType },
      });

      const allSigners = await tx.signer.findMany({
        where: { signingRequestId: signer.signingRequestId },
      });

      const allSigned = allSigners.every((s) => s.status === "SIGNED");
      const anyDeclined = allSigners.some((s) => s.status === "DECLINED");

      if (allSigned) {
        await tx.signingRequest.update({
          where: { id: signer.signingRequestId },
          data: { status: "COMPLETED" },
        });
        await tx.document.update({
          where: { id: signer.signingRequest.documentId },
          data: { status: "COMPLETED" },
        });
      } else if (anyDeclined) {
        await tx.signingRequest.update({
          where: { id: signer.signingRequestId },
          data: { status: "DECLINED" },
        });
      }

      await tx.auditLog.create({
        data: {
          documentId: signer.signingRequest.documentId,
          action: "DOCUMENT_SIGNED",
          performedBy: signer.email,
          ipAddress: req.ip,
        },
      });
    });

    res.status(201).json({
      message: "Document signed successfully",
      signedFile: fileUrl,
    });
  } catch (err) {
    console.error("Sign document error:", err);
    res.status(500).json({ message: "Failed to sign document" });
  }
};

/**
 * 🧩 Decline Signature
 */
const declineSignature = async (req, res) => {
  try {
    const { id: signerId } = req.params;
    const { token, reason } = req.body;
    const payload = jwt.verify(token, config.jwt.secret);

    if (payload.signerId !== signerId)
      return res.status(403).json({ message: "Token mismatch" });

    await prisma.signer.update({
      where: { id: signerId },
      data: { status: "DECLINED" },
    });

    res.json({ message: "Signature declined", reason });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error declining signature" });
  }
};

/**
 * 🧩 Resend Invitation
 */
const resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const signer = await prisma.signer.findFirst({
      where: { id, signingRequest: { document: { organizationId } } },
      include: { signingRequest: { include: { document: true } } },
    });

    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const signingToken = jwt.sign(
      { signerId: signer.id, documentId: signer.signingRequest.documentId },
      config.jwt.secret,
      { expiresIn: "7d" }
    );

    console.log(`Invitation resent to ${signer.email}: ${signingToken}`);

    await prisma.auditLog.create({
      data: {
        documentId: signer.signingRequest.documentId,
        action: "INVITATION_RESENT",
        performedBy: req.user.id,
      },
    });

    res.json({
      message: "Invitation resent",
      signerEmail: signer.email,
      signingLink: `${config.app.frontendUrl}/sign?token=${signingToken}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to resend invitation" });
  }
};

module.exports = {
  getSigner,
  signDocument,
  declineSignature,
  resendInvitation,
};
