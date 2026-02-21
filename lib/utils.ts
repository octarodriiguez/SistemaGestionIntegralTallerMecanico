import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases de Tailwind CSS de manera inteligente
 * Evita conflictos entre clases y permite override
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda (Pesos argentinos)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount)
}

/**
 * Formatea una fecha al formato argentino
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj)
}

/**
 * Limpia un número de teléfono para dejarlo solo en dígitos
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

/**
 * Genera un enlace de WhatsApp Web con mensaje pre-completado
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanedPhone = cleanPhone(phone)
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`
}
