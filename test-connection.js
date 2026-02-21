const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Conexión exitosa a Supabase!");
    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error de conexión:", error.message);
  }
}

testConnection();
