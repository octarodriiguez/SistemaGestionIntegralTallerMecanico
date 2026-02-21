/**
 * Constantes globales de la aplicación
 */

export const APP_NAME = 'Sistema de Gestión - Taller GNC';
export const APP_VERSION = '0.1.0';

/**
 * Configuración de paginación
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

/**
 * Duración de validez de obleas en meses
 */
export const OBLEA_VALIDITY_MONTHS = {
  MIN: 6,
  MAX: 12,
  DEFAULT: 12,
} as const;

/**
 * Configuración de alertas
 */
export const ALERTS = {
  // Días de anticipación para alertar vencimientos
  WARNING_DAYS_BEFORE: 30,
  // Días después del vencimiento para seguir alertando
  WARNING_DAYS_AFTER: 15,
} as const;

/**
 * Límites de scraping
 */
export const SCRAPING = {
  // Segundos entre cada request para no sobrecargar el servidor
  DELAY_BETWEEN_REQUESTS: 2,
  // Máximo de reintentos en caso de error
  MAX_RETRIES: 3,
  // Timeout para cada request (milisegundos)
  TIMEOUT: 30000,
} as const;

/**
 * Formatos de fecha
 */
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DATABASE: 'yyyy-MM-dd',
  DATETIME: 'dd/MM/yyyy HH:mm',
} as const;

/**
 * Expresiones regulares
 */
export const REGEX = {
  // Dominio de vehículo argentino (ej: ABC123 o AB123CD)
  VEHICLE_DOMAIN: /^[A-Z]{2,3}[0-9]{3}([A-Z]{2})?$/,
  // Teléfono argentino
  PHONE: /^(?:(?:00)?549?)?0?(?:11|[2368]\d)(?:(?=\d{0,2}15)\d{2})??\d{8}$/,
  // Email
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

/**
 * Mensajes de WhatsApp predefinidos
 */
export const WHATSAPP_TEMPLATES = {
  OBLEA_VENCIMIENTO: (clientName: string, expirationDate: string) =>
    `Hola ${clientName}! Te recordamos que tu oblea vence el ${expirationDate}. No olvides renovarla para circular sin inconvenientes. ¡Agenda tu turno!`,
  OBLEA_VENCIDA: (clientName: string, expirationDate: string) =>
    `Hola ${clientName}! Tu oblea venció el ${expirationDate}. Comunicate con nosotros para renovarla cuanto antes.`,
} as const;

/**
 * URLs externas
 */
export const EXTERNAL_URLS = {
  ENARGAS_CONSULTA: 'https://www.enargas.gob.ar/secciones/gas-natural-comprimido/consulta-dominio.php',
} as const;
