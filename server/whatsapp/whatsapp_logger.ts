import { WhatsAppLogEntry } from '../../src/types/index.ts';

/**
 * Remediation advice dictionary for common Meta WhatsApp Cloud API errors
 */
const META_ERROR_REMEDIATION: Record<number, string> = {
  190: 'Access token expired or revoked. Generate a permanent System User Token in Meta Business Manager with whatsapp_business_messaging and whatsapp_business_management permissions.',
  131030: 'Recipient phone number not allowed in Sandbox mode. In Meta Developer Dashboard > WhatsApp > API Setup, add this phone number under "To" recipient list.',
  131026: 'Message Undeliverable. Ensure the phone number is active on WhatsApp, includes the correct country code, and has not blocked the business number.',
  131047: '24-hour customer care window has expired. You cannot send free-form text outside 24h of the user\'s last message; initiate with a pre-approved Meta Message Template.',
  130429: 'Cloud API rate limit exceeded. Reduce concurrent message dispatch volume or request a tier upgrade in Meta WhatsApp Manager.',
  100: 'Invalid parameter in request payload. Verify recipient phone format (digits only with country code) and interactive button constraints (max 20 characters per button title, max 3 buttons).',
  132000: 'Template error. The specified message template does not exist in the configured WABA or the parameters count/types mismatch.',
  133010: 'Phone number ID not registered or deregistered from Cloud API.',
};

export class WhatsAppLogger {
  private logs: WhatsAppLogEntry[] = [];
  private maxLogs = 250;

  /**
   * Log an event with structured metadata
   */
  log(entry: Omit<WhatsAppLogEntry, 'id' | 'timestamp'>): WhatsAppLogEntry {
    const code = Number(entry.metaErrorCode);
    const remediation =
      entry.remediation ||
      (code && META_ERROR_REMEDIATION[code]) ||
      undefined;

    const fullEntry: WhatsAppLogEntry = {
      ...entry,
      id: 'walog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      remediation,
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.length = this.maxLogs;
    }

    // Output to server console with formatted prefix
    const prefix = `[WhatsApp-${entry.category}]`;
    if (entry.level === 'error') {
      console.error(`${prefix} ❌ ${entry.message}`, {
        phone: entry.phone,
        code: entry.metaErrorCode,
        remediation: fullEntry.remediation,
        details: entry.details,
      });
    } else if (entry.level === 'warn') {
      console.warn(`${prefix} ⚠️ ${entry.message}`, {
        phone: entry.phone,
        code: entry.metaErrorCode,
        details: entry.details,
      });
    } else {
      console.log(`${prefix} ℹ️ ${entry.message}`, entry.phone ? `(${entry.phone})` : '');
    }

    return fullEntry;
  }

  info(
    category: WhatsAppLogEntry['category'],
    message: string,
    meta?: Partial<Omit<WhatsAppLogEntry, 'id' | 'timestamp' | 'level' | 'category' | 'message'>>
  ) {
    return this.log({ level: 'info', category, message, ...meta });
  }

  warn(
    category: WhatsAppLogEntry['category'],
    message: string,
    meta?: Partial<Omit<WhatsAppLogEntry, 'id' | 'timestamp' | 'level' | 'category' | 'message'>>
  ) {
    return this.log({ level: 'warn', category, message, ...meta });
  }

  error(
    category: WhatsAppLogEntry['category'],
    message: string,
    meta?: Partial<Omit<WhatsAppLogEntry, 'id' | 'timestamp' | 'level' | 'category' | 'message'>>
  ) {
    return this.log({ level: 'error', category, message, ...meta });
  }

  debug(
    category: WhatsAppLogEntry['category'],
    message: string,
    meta?: Partial<Omit<WhatsAppLogEntry, 'id' | 'timestamp' | 'level' | 'category' | 'message'>>
  ) {
    return this.log({ level: 'debug', category, message, ...meta });
  }

  getLogs(filter?: {
    level?: string;
    category?: string;
    search?: string;
    phone?: string;
    limit?: number;
  }): WhatsAppLogEntry[] {
    let result = [...this.logs];

    if (filter?.level && filter.level !== 'all') {
      result = result.filter((l) => l.level === filter.level);
    }

    if (filter?.category && filter.category !== 'all') {
      result = result.filter((l) => l.category === filter.category);
    }

    if (filter?.phone) {
      const clean = filter.phone.replace(/[^\d]/g, '');
      result = result.filter((l) => l.phone && l.phone.includes(clean));
    }

    if (filter?.search) {
      const search = filter.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(search) ||
          (l.phone && l.phone.includes(search)) ||
          (l.remediation && l.remediation.toLowerCase().includes(search)) ||
          (l.messageId && l.messageId.toLowerCase().includes(search))
      );
    }

    const limit = filter?.limit || 100;
    return result.slice(0, limit);
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStats() {
    const errorCount = this.logs.filter((l) => l.level === 'error').length;
    const warnCount = this.logs.filter((l) => l.level === 'warn').length;
    const lastError = this.logs.find((l) => l.level === 'error');

    const categoryBreakdown: Record<string, number> = {};
    for (const l of this.logs) {
      categoryBreakdown[l.category] = (categoryBreakdown[l.category] || 0) + 1;
    }

    return {
      totalLogs: this.logs.length,
      errorCount,
      warnCount,
      lastError: lastError
        ? {
            message: lastError.message,
            timestamp: lastError.timestamp,
            code: lastError.metaErrorCode,
            remediation: lastError.remediation,
          }
        : null,
      categoryBreakdown,
    };
  }
}

export const waLogger = new WhatsAppLogger();
