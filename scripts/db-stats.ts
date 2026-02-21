import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function showDatabaseStats() {
  console.log("\n📊 ESTADÍSTICAS DE LA BASE DE DATOS\n");
  console.log("=".repeat(50));

  try {
    // Contar registros en cada tabla
    const stats = {
      users: await prisma.user.count(),
      clients: await prisma.client.count(),
      vehicles: await prisma.vehicle.count(),
      procedureTypes: await prisma.procedureType.count(),
      procedures: await prisma.procedure.count(),
      distributors: await prisma.distributor.count(),
      transactions: await prisma.distributorTransaction.count(),
      receipts: await prisma.receipt.count(),
      alerts: await prisma.procedureAlert.count(),
      priceHistory: await prisma.priceHistory.count(),
      systemConfig: await prisma.systemConfig.count(),
    };

    console.log("\n USUARIOS Y CLIENTES");
    console.log(`   Usuarios:           ${stats.users}`);
    console.log(`   Clientes:           ${stats.clients}`);
    console.log(`   Vehículos:          ${stats.vehicles}`);

    console.log("\n TRÁMITES");
    console.log(`   Tipos de trámites:  ${stats.procedureTypes}`);
    console.log(`   Procedimientos:     ${stats.procedures}`);

    console.log("\n DISTRIBUIDORAS");
    console.log(`   Distribuidoras:     ${stats.distributors}`);
    console.log(`   Transacciones:      ${stats.transactions}`);

    console.log("\n COMPROBANTES Y ALERTAS");
    console.log(`   Comprobantes:       ${stats.receipts}`);
    console.log(`   Alertas:            ${stats.alerts}`);

    console.log("\n  SISTEMA");
    console.log(`   Historial precios:  ${stats.priceHistory}`);
    console.log(`   Configuraciones:    ${stats.systemConfig}`);

    // Alertas pendientes
    const pendingAlerts = await prisma.procedureAlert.count({
      where: { status: "PENDING" },
    });

    console.log("\n🔔 ALERTAS PENDIENTES");
    console.log(`   Vencimientos por notificar: ${pendingAlerts}`);

    // Cuenta corriente con distribuidoras
    console.log("\n💰 CUENTA CORRIENTE");

    const distributors = await prisma.distributor.findMany({
      include: {
        transactions: true,
      },
    });

    for (const dist of distributors) {
      const balance = dist.transactions.reduce((acc, t) => {
        return t.type === "PURCHASE" ? acc + Number(t.amount) : acc - Number(t.amount);
      }, 0);

      console.log(`   ${dist.name}: $${balance.toFixed(2)}`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Consulta completada\n");
  } catch (error) {
    console.error("❌ Error al consultar la base de datos:", error);
  } finally {
    await prisma.$disconnect();
  }
}

showDatabaseStats();
