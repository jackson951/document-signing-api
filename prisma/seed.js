const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hash the password
  const saltRounds = 10;
  const plainPassword = "password123";
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  // Create an organization
  const organization = await prisma.organization.create({
    data: {
      name: "Test Organization",
      domain: "example.com",
    },
  });

  console.log(`✅ Created organization: ${organization.name}`);

  // Create a user (ADMIN role for full access)
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      organization: {
        connect: { id: organization.id },
      },
    },
  });

  console.log(`✅ Created user: ${user.email} (password: ${plainPassword})`);

  console.log("🎉 Seeding completed!");
}

async function cleanup() {
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(cleanup);
