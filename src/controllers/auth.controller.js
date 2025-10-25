const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const prisma = new PrismaClient();
const config = require("../config");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      return res.status(401).json({
        type: "https://api.example.com/errors/invalid-credentials",
        title: "Invalid credentials",
        status: 401,
        detail: "No user found with this email address",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        type: "https://api.example.com/errors/invalid-credentials",
        title: "Invalid credentials",
        status: 401,
        detail: "Incorrect password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword,
      organization: user.organization,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred during login",
    });
  }
};

const createApiKey = async (req, res) => {
  try {
    const { description, expiresAt } = req.body;
    const { organizationId, userId } = req.user;

    if (expiresAt && isNaN(new Date(expiresAt).getTime())) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "Invalid expiration date format",
      });
    }

    const apiKey = uuidv4().replace(/-/g, "");

    const createdKey = await prisma.apiKey.create({
      data: {
        key: apiKey,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        organizationId,
        userId,
      },
    });

    res.status(201).json({
      id: createdKey.id,
      key: createdKey.key,
      description: createdKey.description,
      expiresAt: createdKey.expiresAt,
      createdAt: createdKey.createdAt,
    });
  } catch (error) {
    console.error("Create API key error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred while creating API key",
    });
  }
};

const listApiKeys = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId },
      select: {
        id: true,
        key: true,
        description: true,
        expiresAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(apiKeys);
  } catch (error) {
    console.error("List API keys error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred while listing API keys",
    });
  }
};

const revokeApiKey = async (req, res) => {
  try {
    const { apiKeyId } = req.params;
    const { organizationId } = req.user;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey || apiKey.organizationId !== organizationId) {
      return res.status(404).json({
        type: "https://api.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "API key not found or not authorized",
      });
    }

    await prisma.apiKey.delete({
      where: { id: apiKeyId },
    });

    res.status(204).end();
  } catch (error) {
    console.error("Revoke API key error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred while revoking API key",
    });
  }
};

const createOAuthClient = async (req, res) => {
  try {
    const { name, redirectUris: rawRedirectUris } = req.body;
    const { organizationId, role } = req.user;

    // Optional: extra role check (middleware should handle this)
    if (role !== "ADMIN") {
      return res.status(403).json({
        type: "https://api.example.com/errors/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Only admins can create OAuth clients",
      });
    }

    if (!name || !rawRedirectUris || !Array.isArray(rawRedirectUris)) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "Name and redirectUris (array) are required",
      });
    }

    // ✅ TRIM and validate
    const redirectUris = rawRedirectUris.map((uri) => uri.trim());

    if (redirectUris.length === 0 || redirectUris.some((uri) => uri === "")) {
      return res.status(400).json({
        type: "https://api.example.com/errors/invalid-input",
        title: "Invalid Input",
        status: 400,
        detail: "Redirect URIs cannot be empty",
      });
    }

    for (const uri of redirectUris) {
      try {
        new URL(uri);
      } catch (err) {
        return res.status(400).json({
          type: "https://api.example.com/errors/invalid-input",
          title: "Invalid Input",
          status: 400,
          detail: `Invalid redirect URI: "${uri}"`,
        });
      }
    }

    const clientId = uuidv4();
    const clientSecret = uuidv4().replace(/-/g, "");

    const client = await prisma.oAuthClient.create({
      data: {
        clientId,
        clientSecret,
        name,
        redirectUris: JSON.stringify(redirectUris), // now clean
        organizationId,
      },
    });

    res.status(201).json({
      id: client.id,
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      name: client.name,
      redirectUris: JSON.parse(client.redirectUris),
      createdAt: client.createdAt,
    });
  } catch (error) {
    console.error("Create OAuth client error:", error);
    res.status(500).json({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred while creating OAuth client",
    });
  }
};
module.exports = {
  login,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  createOAuthClient,
};
