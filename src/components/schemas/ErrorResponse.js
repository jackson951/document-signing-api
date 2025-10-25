class ErrorResponse extends Error {
  constructor({
    type = "about:blank",
    title,
    status = 500,
    detail,
    instance,
    additional = {},
  }) {
    super(detail || title);

    // Standard RFC 7807 fields
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;

    // Additional custom properties
    Object.assign(this, additional);
  }

  /**
   * Creates a properly formatted error response object
   * @returns {Object} RFC 7807 compliant error object
   */
  toJSON() {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: this.instance,
      ...(this.additionalProperties || {}),
    };
  }

  /**
   * Sends the error response through Express
   * @param {Response} res Express response object
   */
  send(res) {
    res.status(this.status).json(this.toJSON());
  }

  // Common error types as static methods
  static badRequest(detail, instance, additional) {
    return new ErrorResponse({
      type: "https://api.example.com/errors/bad-request",
      title: "Bad Request",
      status: 400,
      detail,
      instance,
      additional,
    });
  }

  static unauthorized(detail, instance, additional) {
    return new ErrorResponse({
      type: "https://api.example.com/errors/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail,
      instance,
      additional,
    });
  }

  static forbidden(detail, instance, additional) {
    return new ErrorResponse({
      type: "https://api.example.com/errors/forbidden",
      title: "Forbidden",
      status: 403,
      detail,
      instance,
      additional,
    });
  }

  static notFound(detail, instance, additional) {
    return new ErrorResponse({
      type: "https://api.example.com/errors/not-found",
      title: "Not Found",
      status: 404,
      detail,
      instance,
      additional,
    });
  }

  static conflict(detail, instance, additional) {
    return new ErrorResponse({
      type: "https://api.example.com/errors/conflict",
      title: "Conflict",
      status: 409,
      detail,
      instance,
      additional,
    });
  }

  static internalServerError(detail, instance, additional) {
    return new ErrorResponse({
      type: "https://api.example.com/errors/internal-server-error",
      title: "Internal Server Error",
      status: 500,
      detail,
      instance,
      additional,
    });
  }

  static fromPrismaError(error, instance) {
    if (error.code === "P2002") {
      return ErrorResponse.conflict(
        "A record with this value already exists",
        instance,
        { field: error.meta?.target?.[0] }
      );
    }

    return ErrorResponse.internalServerError(
      "Database operation failed",
      instance,
      { prismaCode: error.code }
    );
  }
}

module.exports = ErrorResponse;
