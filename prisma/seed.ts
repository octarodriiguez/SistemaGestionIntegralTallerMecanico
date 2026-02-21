import { PrismaClient, ProcedureName, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  // Limpiar base de datos (opcional - comentar en producción)
  console.log("🗑️  Limpiando datos existentes...");
  await prisma.procedureAlert.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.distributorTransaction.deleteMany();
  await prisma.distributor.deleteMany();
  await prisma.procedureType.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // USUARIOS
  // ============================================
  console.log("👤 Creando usuarios...");

  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@taller.com",
      name: "Administrador",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Usuario creado: ${admin.email}`);

  // ============================================
  // TIPOS DE TRÁMITES CON PRECIOS
  // ============================================
  console.log("📋 Creando tipos de trámites...");

  const procedureTypes = await Promise.all([
    prisma.procedureType.create({
      data: {
        name: ProcedureName.OBLEA,
        displayName: "Renovación de Oblea",
        currentPrice: 15000,
        description: "Renovación de oblea de GNC (vigencia 6-12 meses)",
      },
    }),
    prisma.procedureType.create({
      data: {
        name: ProcedureName.PRUEBA_HIDRAULICA,
        displayName: "Prueba Hidráulica",
        currentPrice: 25000,
        description: "Prueba hidráulica del tanque de GNC",
      },
    }),
    prisma.procedureType.create({
      data: {
        name: ProcedureName.CONVERSION,
        displayName: "Conversión a GNC",
        currentPrice: 350000,
        description: "Conversión completa de vehículo a GNC",
      },
    }),
    prisma.procedureType.create({
      data: {
        name: ProcedureName.MODIFICACION,
        displayName: "Modificación",
        currentPrice: 50000,
        description: "Modificación de instalación existente",
      },
    }),
    prisma.procedureType.create({
      data: {
        name: ProcedureName.DESMONTAJE,
        displayName: "Desmontaje",
        currentPrice: 30000,
        description: "Desmontaje de equipo de GNC",
      },
    }),
  ]);

  console.log(`✅ ${procedureTypes.length} tipos de trámites creados`);

  // ============================================
  // DISTRIBUIDORAS
  // ============================================
  console.log("🏢 Creando distribuidoras...");

  const distributors = await Promise.all([
    prisma.distributor.create({
      data: {
        name: "GNC Express",
        contact: "Juan Pérez",
        phone: "+54 351 123-4567",
        email: "contacto@gncexpress.com",
        address: "Av. Colón 1234, Córdoba",
      },
    }),
    prisma.distributor.create({
      data: {
        name: "AutoGas Sur",
        contact: "María González",
        phone: "+54 351 234-5678",
        email: "info@autogassur.com",
        address: "Bv. San Juan 567, Córdoba",
      },
    }),
    prisma.distributor.create({
      data: {
        name: "Repuestos GNC Total",
        contact: "Carlos Rodríguez",
        phone: "+54 351 345-6789",
        email: "ventas@gnctotal.com",
        address: "Av. Circunvalación Km 8, Córdoba",
      },
    }),
  ]);

  console.log(`✅ ${distributors.length} distribuidoras creadas`);

  // ============================================
  // CLIENTES DE EJEMPLO
  // ============================================
  console.log("👥 Creando clientes de ejemplo...");

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        firstName: "Roberto",
        lastName: "Fernández",
        phone: "+54 351 456-7890",
        email: "roberto.fernandez@email.com",
        address: "Calle Falsa 123, Córdoba",
      },
    }),
    prisma.client.create({
      data: {
        firstName: "Ana",
        lastName: "Martínez",
        phone: "+54 351 567-8901",
        email: "ana.martinez@email.com",
        address: "Av. Libertad 456, Córdoba",
      },
    }),
    prisma.client.create({
      data: {
        firstName: "Luis",
        lastName: "García",
        phone: "+54 351 678-9012",
        email: "luis.garcia@email.com",
        address: "Bv. Illia 789, Córdoba",
      },
    }),
  ]);

  console.log(`✅ ${clients.length} clientes creados`);

  // ============================================
  // VEHÍCULOS
  // ============================================
  console.log("🚗 Creando vehículos...");

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        clientId: clients[0].id,
        brand: "Fiat",
        model: "Cronos",
        year: 2020,
        domain: "AB123CD",
        color: "Blanco",
      },
    }),
    prisma.vehicle.create({
      data: {
        clientId: clients[0].id,
        brand: "Chevrolet",
        model: "Onix",
        year: 2019,
        domain: "AC456EF",
        color: "Gris",
      },
    }),
    prisma.vehicle.create({
      data: {
        clientId: clients[1].id,
        brand: "Volkswagen",
        model: "Gol",
        year: 2018,
        domain: "AD789GH",
        color: "Rojo",
      },
    }),
    prisma.vehicle.create({
      data: {
        clientId: clients[2].id,
        brand: "Toyota",
        model: "Etios",
        year: 2021,
        domain: "AE012IJ",
        color: "Negro",
      },
    }),
  ]);

  console.log(`✅ ${vehicles.length} vehículos creados`);

  // ============================================
  // PROCEDIMIENTOS (OBLEAS)
  // ============================================
  console.log("📝 Creando procedimientos de ejemplo...");

  const obleaType = procedureTypes.find((pt) => pt.name === ProcedureName.OBLEA)!;

  // Oblea que vence pronto (para generar alerta)
  const procedure1 = await prisma.procedure.create({
    data: {
      vehicleId: vehicles[0].id,
      procedureTypeId: obleaType.id,
      distributorId: distributors[0].id,
      price: 15000,
      paid: true,
      paymentMethod: "TRANSFER",
      procedureDate: new Date("2025-08-15"),
      expirationDate: new Date("2026-02-28"), // Vence este mes
    },
  });

  // Oblea válida
  const procedure2 = await prisma.procedure.create({
    data: {
      vehicleId: vehicles[1].id,
      procedureTypeId: obleaType.id,
      distributorId: distributors[0].id,
      price: 15000,
      paid: true,
      paymentMethod: "CASH",
      procedureDate: new Date("2025-10-20"),
      expirationDate: new Date("2026-04-20"),
    },
  });

  // Oblea vencida
  const procedure3 = await prisma.procedure.create({
    data: {
      vehicleId: vehicles[2].id,
      procedureTypeId: obleaType.id,
      distributorId: distributors[1].id,
      price: 14500,
      paid: false,
      procedureDate: new Date("2025-01-10"),
      expirationDate: new Date("2026-01-10"), // Ya vencida
    },
  });

  console.log("✅ Procedimientos creados");

  // ============================================
  // ALERTAS
  // ============================================
  console.log("🔔 Creando alertas...");

  await prisma.procedureAlert.create({
    data: {
      vehicleId: vehicles[0].id,
      procedureId: procedure1.id,
      expirationDate: procedure1.expirationDate!,
      status: "PENDING",
    },
  });

  await prisma.procedureAlert.create({
    data: {
      vehicleId: vehicles[2].id,
      procedureId: procedure3.id,
      expirationDate: procedure3.expirationDate!,
      status: "PENDING",
    },
  });

  console.log("✅ Alertas creadas");

  // ============================================
  // TRANSACCIONES CON DISTRIBUIDORAS
  // ============================================
  console.log("💰 Creando transacciones...");

  await Promise.all([
    prisma.distributorTransaction.create({
      data: {
        distributorId: distributors[0].id,
        type: "PURCHASE",
        description: "Compra de cilindros",
        amount: 50000,
        quantity: 5,
        unitPrice: 10000,
        transactionDate: new Date("2025-12-01"),
      },
    }),
    prisma.distributorTransaction.create({
      data: {
        distributorId: distributors[0].id,
        type: "PAYMENT",
        description: "Pago parcial",
        amount: 25000,
        paymentMethod: "TRANSFER",
        transactionDate: new Date("2025-12-15"),
      },
    }),
    prisma.distributorTransaction.create({
      data: {
        distributorId: distributors[1].id,
        type: "PURCHASE",
        description: "Repuestos varios",
        amount: 35000,
        transactionDate: new Date("2026-01-05"),
      },
    }),
  ]);

  console.log("✅ Transacciones creadas");

  // ============================================
  // CONFIGURACIÓN DEL SISTEMA
  // ============================================
  console.log("⚙️  Creando configuración del sistema...");

  await Promise.all([
    prisma.systemConfig.create({
      data: {
        key: "receipt_counter_recibo",
        value: "1",
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: "receipt_counter_presupuesto",
        value: "1",
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: "receipt_counter_garantia",
        value: "1",
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: "alert_days_before_expiration",
        value: "30",
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: "company_name",
        value: "Taller GNC - Cosquín",
      },
    }),
    prisma.systemConfig.create({
      data: {
        key: "company_phone",
        value: "+54 3541 123456",
      },
    }),
  ]);

  console.log("✅ Configuración del sistema creada");

  console.log("\n🎉 Seed completado exitosamente!");
  console.log("\n📊 Resumen:");
  console.log(`   - ${await prisma.user.count()} usuarios`);
  console.log(`   - ${await prisma.client.count()} clientes`);
  console.log(`   - ${await prisma.vehicle.count()} vehículos`);
  console.log(`   - ${await prisma.distributor.count()} distribuidoras`);
  console.log(`   - ${await prisma.procedureType.count()} tipos de trámites`);
  console.log(`   - ${await prisma.procedure.count()} procedimientos`);
  console.log(`   - ${await prisma.procedureAlert.count()} alertas`);
  console.log(`   - ${await prisma.distributorTransaction.count()} transacciones`);
  console.log("\n🔐 Credenciales de acceso:");
  console.log(`   Email: admin@taller.com`);
  console.log(`   Password: admin123`);
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
