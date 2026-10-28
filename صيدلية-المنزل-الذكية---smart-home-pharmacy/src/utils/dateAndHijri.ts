/**
 * Date utilities for Arabic Gregorian and Hijri date formatting and expiry countdowns.
 */

export function getArabicGregorianDate(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch {
    return date.toLocaleDateString('ar-EG');
  }
}

export function getArabicHijriDate(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const formatted = formatter.format(date);
    return formatted.includes('هـ') ? formatted : formatted + ' هـ';
  } catch {
    // Fallback if calendar extension is not supported
    return '١٤٤٨ هـ';
  }
}

export interface ExpiryStatus {
  status: 'expired' | 'expiring_soon' | 'valid';
  daysLeft: number;
  labelAr: string;
  badgeClass: string;
}

export function calculateExpiryStatus(expiryDateStr: string): ExpiryStatus {
  if (!expiryDateStr) {
    return {
      status: 'valid',
      daysLeft: 999,
      labelAr: 'صالح',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  }

  const expiry = new Date(expiryDateStr);
  const now = new Date();
  
  // Set to midnight for clean day difference
  expiry.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      daysLeft: diffDays,
      labelAr: `منتهي الصلاحية (${Math.abs(diffDays)} يوم)`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300'
    };
  } else if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      daysLeft: diffDays,
      labelAr: diffDays === 0 ? 'ينتهي اليوم ⚠️' : `ينتهي قريباً (خلال ${diffDays} يوم)`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
    };
  } else {
    return {
      status: 'valid',
      daysLeft: diffDays,
      labelAr: `صالح (${diffDays} يوم متبقٍ)`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  }
}
