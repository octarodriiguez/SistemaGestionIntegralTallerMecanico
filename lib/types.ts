// Tipos globales del proyecto

/**
 * Tipos de trámites disponibles
 */
export type ProcedureType = 
  | 'OBLEA'
  | 'PRUEBA_HIDRAULICA'
  | 'CONVERSION'
  | 'MODIFICACION'
  | 'DESMONTAJE';

/**
 * Tipos de comprobantes
 */
export type ReceiptType = 
  | 'RECEIPT'    // Recibo
  | 'BUDGET'     // Presupuesto
  | 'WARRANTY';  // Garantía

/**
 * Métodos de pago
 */
export type PaymentMethod = 
  | 'CASH'       // Efectivo
  | 'TRANSFER';  // Transferencia

/**
 * Tipos de transacción con distribuidoras
 */
export type TransactionType = 
  | 'PURCHASE'   // Compra de insumos
  | 'PAYMENT';   // Pago a distribuidora

/**
 * Estados de alerta
 */
export type AlertStatus = 
  | 'PENDING'    // Pendiente de notificar
  | 'NOTIFIED'   // Cliente notificado
  | 'COMPLETED'; // Trámite renovado

/**
 * Roles de usuario
 */
export type UserRole = 
  | 'ADMIN'
  | 'OPERATOR';
