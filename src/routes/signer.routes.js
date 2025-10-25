// routes/signer.routes.js
const express = require("express");
const router = express.Router();
const signerController = require("../controllers/signer.controller");
const { authenticate } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Signers
 *   description: Manage signers and signing actions
 */

/**
 * @swagger
 * /signers/{id}:
 *   get:
 *     summary: Get signer details (internal)
 *     tags: [Signers]
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
 *         description: Signer details
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", authenticate, signerController.getSigner);

/**
 * @swagger
 * /signers/{id}/sign:
 *   put:
 *     summary: Sign a document (public — uses token)
 *     tags: [Signers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               signatureType:
 *                 type: string
 *                 enum: [CLICK, TYPE, DRAW, IMAGE]
 *                 default: CLICK
 *     responses:
 *       201:
 *         description: Signed successfully
 *       400:
 *         $ref: '#/components/responses/InvalidInput'
 *       401:
 *         $ref: '#/components/responses/InvalidToken'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put("/:id/sign", signerController.signDocument);

/**
 * @swagger
 * /signers/{id}/decline:
 *   put:
 *     summary: Decline to sign (public — uses token)
 *     tags: [Signers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Declined successfully
 *       401:
 *         $ref: '#/components/responses/InvalidToken'
 */
router.put("/:id/decline", signerController.declineSignature);

module.exports = router;
