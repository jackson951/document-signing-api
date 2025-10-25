// routes/document.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  uploadDocument,
  getDocument,
  getAllDocuments,
} = require("../controllers/document.controller");
const { authenticate } = require("../middleware/auth");

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Upload a new PDF document
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 fileUrl:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/InvalidInput'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", authenticate, upload.single("file"), uploadDocument);

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get document metadata
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 fileUrl:
 *                   type: string
 *                 status:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", authenticate, getDocument);

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get all documents for the organization (Admin only)
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all organization documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 *       403:
 *         description: Forbidden (non-admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authenticate, getAllDocuments);

module.exports = router;
