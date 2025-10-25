// controllers/webhook.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createWebhook = async (req, res) => {
  try {
    const { url, eventTypes } = req.body;
    const { organizationId } = req.user;

    if (!url || !eventTypes) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "url and eventTypes are required",
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "url must be a valid URL",
      });
    }

    if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "eventTypes must be a non-empty array",
      });
    }

    const webhook = await prisma.webhook.create({
      data: {
        url,
        eventTypes: JSON.stringify(eventTypes),
        organizationId,
      },
    });

    res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      eventTypes: JSON.parse(webhook.eventTypes),
      createdAt: webhook.createdAt,
    });
  } catch (error) {
    console.error("Create webhook error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to create webhook",
    });
  }
};

const listWebhooks = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const webhooks = await prisma.webhook.findMany({
      where: { organizationId },
      select: {
        id: true,
        url: true,
        eventTypes: true,
        createdAt: true,
      },
    });

    // Parse eventTypes from JSON string
    const result = webhooks.map((w) => ({
      ...w,
      eventTypes: JSON.parse(w.eventTypes),
    }));

    res.json(result);
  } catch (error) {
    console.error("List webhooks error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to list webhooks",
    });
  }
};

const deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const webhook = await prisma.webhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Webhook not found",
      });
    }

    await prisma.webhook.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error("Delete webhook error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to delete webhook",
    });
  }
};

// Optional: test delivery (sends a ping event)
const testWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const webhook = await prisma.webhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Webhook not found",
      });
    }

    // In real implementation: enqueue webhook delivery job
    // For now: simulate
    const testEvent = {
      id: "evt_test_" + Date.now(),
      eventType: "webhook.test",
      timestamp: new Date().toISOString(),
      data: { message: "Webhook test successful" },
    };

    res.json({
      message: "Webhook test event queued",
      event: testEvent,
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "Failed to test webhook",
    });
  }
};

module.exports = {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  testWebhook,
};
