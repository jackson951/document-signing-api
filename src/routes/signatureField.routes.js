const express = require("express");
const router = express.Router();
const signatureFieldController = require("../controllers/signatureField.controller");
const { authenticate } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Signature Fields
 *   description: Manage signature field placements on documents
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SignatureField:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         pageNumber:
 *           type: integer
 *           example: 1
 *         x:
 *           type: number
 *           example: 200
 *         y:
 *           type: number
 *           example: 150
 *         width:
 *           type: number
 *           example: 120
 *         height:
 *           type: number
 *           example: 40
 *         type:
 *           type: string
 *           enum: [SIGNATURE, INITIALS, TEXT, DATE]
 *         signerId:
 *           type: string
 *           format: uuid
 *           example: "c5d6d2af-9a4e-42a0-9507-5b38f18d7b2e"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     SignatureFieldCreateRequest:
 *       type: object
 *       required:
 *         - signingRequestId
 *         - fields
 *       properties:
 *         signingRequestId:
 *           type: string
 *           format: uuid
 *           example: "a2f8436b-43b1-45a2-bde1-b6f20e3d0b5a"
 *         fields:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - signerId
 *               - pageNumber
 *               - x
 *               - y
 *               - width
 *               - height
 *             properties:
 *               signerId:
 *                 type: string
 *                 format: uuid
 *               pageNumber:
 *                 type: integer
 *               x:
 *                 type: number
 *               y:
 *                 type: number
 *               width:
 *                 type: number
 *               height:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [SIGNATURE, INITIALS, TEXT, DATE]
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *         title:
 *           type: string
 *         status:
 *           type: integer
 *         detail:
 *           type: string
 */

/**
 * @swagger
 * /signature-fields:
 *   post:
 *     summary: Create signature fields for a signing request
 *     tags: [Signature Fields]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignatureFieldCreateRequest'
 *     responses:
 *       201:
 *         description: Signature fields created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Signature fields created successfully
 *                 count:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: Missing or invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized access
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
router.post("/", authenticate, signatureFieldController.createSignatureFields);

/**
 * @swagger
 * /signature-fields/{signingRequestId}:
 *   get:
 *     summary: Get all signature fields for a signing request
 *     tags: [Signature Fields]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: signingRequestId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the signing request
 *     responses:
 *       200:
 *         description: Successfully retrieved signature fields
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SignatureField'
 *       401:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No signature fields found
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
router.get(
  "/:signingRequestId",
  authenticate,
  signatureFieldController.getSignatureFields
);

/**
 * @swagger
 * /signature-fields/{fieldId}:
 *   delete:
 *     summary: Delete a specific signature field by ID
 *     tags: [Signature Fields]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fieldId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the signature field to delete
 *     responses:
 *       200:
 *         description: Signature field deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Signature field deleted successfully
 *                 fieldId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Missing or invalid fieldId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Signature field not found
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
router.delete(
  "/:fieldId",
  authenticate,
  signatureFieldController.deleteSignatureField
);

module.exports = router;
