// routes/webhook.routes.js
const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhook.controller");
const { authenticate } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: Manage webhook endpoints for event notifications
 */

/**
 * @swagger
 * /webhooks:
 *   post:
 *     summary: Register a new webhook
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               eventTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               url: "https://yourapp.com/webhook"
 *               eventTypes: ["document.signed", "envelope.completed"]
 *     responses:
 *       201:
 *         description: Webhook created
 *       400:
 *         $ref: '#/components/responses/InvalidInput'
 */
router.post("/", authenticate, webhookController.createWebhook);

/**
 * @swagger
 * /webhooks:
 *   get:
 *     summary: List all webhooks
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   url:
 *                     type: string
 *                   eventTypes:
 *                     type: array
 *                     items:
 *                       type: string
 */
router.get("/", authenticate, webhookController.listWebhooks);

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Webhook deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", authenticate, webhookController.deleteWebhook);

/**
 * @swagger
 * /webhooks/{id}/test:
 *   post:
 *     summary: Test a webhook with a ping event
 *     tags: [Webhooks]
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
 *         description: Test event sent
 */
router.post("/:id/test", authenticate, webhookController.testWebhook);

module.exports = router;
