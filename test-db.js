const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking database connection...");
    const userCount = await prisma.user.count();
    console.log(`Database connected! User count: ${userCount}`);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
