// routes/envelope.routes.js
const express = require("express");
const router = express.Router();
const {
  createEnvelope,
  sendEnvelope,
  getEnvelope,
  resendInvitation,
  revokeEnvelope,
} = require("../controllers/envelope.controller");
const { authenticate } = require("../middleware/auth");

/**
 * @swagger
 * /envelopes:
 *   post:
 *     summary: Create a signing envelope
 *     tags: [Envelopes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentId:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               signers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *     responses:
 *       201:
 *         description: Envelope created
 *       400:
 *         $ref: '#/components/responses/InvalidInput'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/", authenticate, createEnvelope);

/**
 * @swagger
 * /envelopes/{id}/send:
 *   post:
 *     summary: Send envelope to signers
 *     tags: [Envelopes]
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
 *         description: Envelope sent
 *       400:
 *         $ref: '#/components/responses/InvalidState'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/send", authenticate, sendEnvelope);

/**
 * @swagger
 * /envelopes/{id}/resend-invitation:
 *   post:
 *     summary: Resend invitation to a specific signer
 *     tags: [Envelopes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Envelope ID
 *       - in: query
 *         name: signerEmail
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email of the signer to resend invitation to
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 *       400:
 *         $ref: '#/components/responses/InvalidInput'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/resend-invitation", authenticate, resendInvitation);

/**
 * @swagger
 * /envelopes/{id}:
 *   get:
 *     summary: Get envelope details
 *     tags: [Envelopes]
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
 *         description: Envelope data
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", authenticate, getEnvelope);

/**
 * @swagger
 * /envelopes/{id}/revoke:
 *   patch:
 *     summary: Revoke or invalidate a sent envelope
 *     tags: [Envelopes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Envelope ID to revoke
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Signer requested cancellation
 *     responses:
 *       200:
 *         description: Envelope revoked successfully
 *       400:
 *         description: Invalid state (already completed or revoked)
 *       404:
 *         description: Envelope not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/revoke", authenticate, revokeEnvelope);

module.exports = router;
