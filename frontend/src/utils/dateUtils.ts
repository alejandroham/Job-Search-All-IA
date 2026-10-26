/**
 * Date and offer expiration utilities.
 * Handles publication date, deadline, and expiration state cleanly
 * without fabricating missing information.
 */

export type OfferExpirationState = 'published' | 'expiring_soon' | 'expired' | 'no_deadline';

export interface OfferBadgeInfo {
  state: OfferExpirationState;
  label: string;
  badgeClass: string;
  isExpired: boolean;
}

export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr || dateStr.trim() === '') {
    return 'No disponible';
  }

  // Handle common ISO or simple date strings
  try {
    const cleanStr = dateStr.trim().replace(' ', 'T');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) {
      // Return raw string if already human readable (e.g. "Hace 3 días")
      return dateStr;
    }
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function getOfferExpirationBadge(deadlineStr?: string | null): OfferBadgeInfo {
  if (!deadlineStr || deadlineStr.trim() === '') {
    return {
      state: 'no_deadline',
      label: 'Sin fecha de término conocida',
      badgeClass: 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-black/5 dark:border-white/5',
      isExpired: false
    };
  }

  try {
    const cleanStr = deadlineStr.trim().replace(' ', 'T');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) {
      return {
        state: 'no_deadline',
        label: 'Sin fecha de término conocida',
        badgeClass: 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-black/5 dark:border-white/5',
        isExpired: false
      };
    }

    const now = new Date();
    // Compare date midnight
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        state: 'expired',
        label: 'Oferta Vencida',
        badgeClass: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50',
        isExpired: true
      };
    }

    if (diffDays <= 3) {
      return {
        state: 'expiring_soon',
        label: `Próxima a vencer (${diffDays === 0 ? 'Hoy' : `${diffDays}d`})`,
        badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 animate-pulse font-medium',
        isExpired: false
      };
    }

    return {
      state: 'published',
      label: `Publicada (Cierra en ${diffDays}d)`,
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-medium',
      isExpired: false
    };
  } catch {
    return {
      state: 'no_deadline',
      label: 'Sin fecha de término conocida',
      badgeClass: 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-black/5 dark:border-white/5',
      isExpired: false
    };
  }
}
