
# Document Signing API

A robust **Document Signing API** built with **Node.js**, **Express**, and **Prisma** for managing documents, templates, and electronic signatures. Designed for developers, companies, and SaaS applications to integrate secure and auditable document signing workflows into their systems.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Document Management**
  - Upload, organize, and manage multiple documents
  - Maintain multiple document versions for audit trails
- **Signing Workflow**
  - Create signing requests
  - Add multiple signers
  - Support for signature fields: click, draw, type, image, initial, date, signature
- **User & Organization Management**
  - Role-based users: Admin, Developer, Signer
  - Organization-level API keys and OAuth clients
- **Audit Logging**
  - Track actions performed on documents
- **Webhook Notifications**
  - Notify external systems on signing events
- **Billing & Usage Tracking**
  - Subscription plans with usage records
  - API rate limiting
- **Swagger API Documentation**
  - Available at `/api-docs`  

---

## Tech Stack

- **Node.js** + **Express** – Backend API
- **Prisma ORM** – Database modeling and migrations
- **SQLite** – Default database for development (can switch to PostgreSQL/MySQL)
- **Swagger** – API documentation
- **Nodemon** – Live reloading during development

---

## Getting Started

### Prerequisites

- Node.js v20+
- npm or yarn
- Git

### Installation

```bash
git clone https://github.com/yourusername/document-signing-api.git
cd document-signing-api
npm install
````

### Database Setup

```bash
npx prisma migrate dev --name init
npx prisma generate
```

This will create the SQLite database (`dev.db`) and generate the Prisma client.

---

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
DATABASE_URL="file:./dev.db"
```

---

## Running the API

```bash
npm run dev
```

Server will run at `http://localhost:3000`.

Swagger documentation available at:

```
http://localhost:3000/api-docs
```

---

## API Endpoints

### **Users & Authentication**

* `POST /auth/signup` – Create user
* `POST /auth/login` – Login user
* `GET /users` – List users

### **Documents**

* `POST /documents` – Upload document
* `GET /documents/:id` – Get document details
* `PUT /documents/:id` – Update document
* `DELETE /documents/:id` – Delete document

### **Signing Requests**

* `POST /signing-requests` – Create signing request
* `GET /signing-requests/:id` – Get signing request
* `POST /signature-fields` – Add signature fields
* `GET /signature-fields/:signingRequestId` – List signature fields
* `DELETE /signature-fields/:fieldId` – Delete a signature field

### **Templates, Webhooks, Subscriptions, Audit Logs**

All endpoints are fully documented in Swagger UI.

---

## Usage

* Use this API to integrate **electronic signatures** into your application.
* Supports **auditable and legal-compliant document signing workflows**.
* Extendable to support custom **signature types, webhook events, and subscription plans**.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## Contact

* Author: **JACKSON KHUTO**
* GitHub: [https://github.com/jackson951](https://github.com/jackson951)
* Email: [jacksonkhuto591@gmail.com](mailto:jacksonkhuto591@gmail.com)

