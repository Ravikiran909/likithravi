/**
 * Official WhatsApp Cloud API Service
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/
 */
import { waLogger } from './whatsapp_logger.ts';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
  metaErrorCode?: number;
  remediation?: string;
  details?: any;
}

export class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private appSecret: string;
  private verifyToken: string;

  constructor() {
    this.phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
    this.accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').replace(/^Bearer\s+/i, '').trim();
    this.appSecret = (process.env.WHATSAPP_APP_SECRET || '').trim();
    this.verifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || 'learning_agent_verify_token_2026').trim();
  }

  cleanPhone(phone: string): string {
    let clean = (phone || '').replace(/[^\d]/g, '');
    if (clean.length === 10) {
      // Default to India country code 91 for standard 10-digit mobile numbers
      clean = '91' + clean;
    } else if (clean.startsWith('0') && clean.length === 11) {
      clean = '91' + clean.slice(1);
    }
    return clean;
  }

  isConfigured(): boolean {
    return (
      Boolean(this.phoneNumberId) &&
      this.phoneNumberId !== 'YOUR_WHATSAPP_PHONE_NUMBER_ID' &&
      this.phoneNumberId.length >= 10 &&
      Boolean(this.accessToken) &&
      this.accessToken !== 'YOUR_PERMANENT_OR_TEMP_ACCESS_TOKEN' &&
      this.accessToken.length > 20
    );
  }

  getStatus() {
    return {
      isConfigured: this.isConfigured(),
      phoneNumberId: this.phoneNumberId
        ? `${this.phoneNumberId.slice(0, 4)}...${this.phoneNumberId.slice(-4)}`
        : 'Not configured',
      rawPhoneNumberId: this.phoneNumberId || '',
      hasAccessToken: Boolean(
        this.accessToken &&
        this.accessToken !== 'YOUR_PERMANENT_OR_TEMP_ACCESS_TOKEN' &&
        this.accessToken.length > 20
      ),
      verifyToken: this.verifyToken,
      apiVersion: 'v21.0',
    };
  }

  updateCredentials(phoneNumberId: string, accessToken: string, verifyToken?: string) {
    const prevConfigured = this.isConfigured();
    this.phoneNumberId = (phoneNumberId || '').trim();
    this.accessToken = (accessToken || '').replace(/^Bearer\s+/i, '').trim();
    if (verifyToken) this.verifyToken = verifyToken.trim();

    waLogger.info('api_error', 'WhatsApp Cloud API credentials updated', {
      details: {
        wasConfigured: prevConfigured,
        nowConfigured: this.isConfigured(),
        phoneNumberIdLength: this.phoneNumberId.length,
        hasAccessToken: Boolean(this.accessToken),
      },
    });
  }

  getVerifyToken(): string {
    return this.verifyToken;
  }

  /**
   * Test WhatsApp Cloud API connection and token validity
   */
  async testConnection(testPhone?: string): Promise<{ ok: boolean; message: string; details?: any; remediation?: string }> {
    if (!this.phoneNumberId || !this.accessToken) {
      const msg = 'Phone Number ID or Access Token is missing in configuration.';
      waLogger.warn('api_error', msg);
      return {
        ok: false,
        message: msg,
        remediation: 'Go to Admin Dashboard > WhatsApp Live and enter your Meta Phone Number ID and Access Token.',
      };
    }

    try {
      // Check phone number details on Meta Graph API
      const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        const errorCode = data.error?.code;
        const errorMessage = data.error?.message || 'Meta API returned an error verifying Phone Number ID.';
        waLogger.error('api_error', `Meta API check failed: ${errorMessage}`, {
          metaErrorCode: errorCode,
          httpStatus: res.status,
          details: data.error,
        });

        return {
          ok: false,
          message: errorMessage,
          details: data.error,
        };
      }

      waLogger.info('api_error', 'Meta Graph API connection verified successfully', {
        details: {
          displayPhoneNumber: data.display_phone_number,
          verifiedName: data.verified_name,
          qualityRating: data.quality_rating,
        },
      });

      // If a test phone was provided, attempt sending a hello test ping
      if (testPhone) {
        const sendRes = await this.sendTextMessage(
          testPhone,
          `✅ *WhatsApp Cloud API Live Test*\n\nYour AI Learning Mentor is online and connected via Meta Cloud API.\n• Timestamp: ${new Date().toLocaleString()}\n• API Version: v21.0\n• Verified Display: ${data.display_phone_number || data.id}`
        );

        if (!sendRes.success) {
          return {
            ok: false,
            message: `Credentials are valid, but test message dispatch failed: ${sendRes.error}`,
            details: sendRes,
            remediation: sendRes.remediation,
          };
        }
      }

      return {
        ok: true,
        message: `Successfully connected to Meta Cloud API! Verified display: ${data.display_phone_number || data.id}`,
        details: data,
      };
    } catch (err: any) {
      waLogger.error('api_error', `Network error connecting to Meta Graph API: ${err.message}`, {
        details: err,
      });
      return {
        ok: false,
        message: `Network error connecting to Meta Graph API: ${err.message}`,
      };
    }
  }

  /**
   * Download media file (e.g. student homework photo or voice note) from Meta Cloud API
   */
  async downloadMedia(mediaId: string): Promise<{ base64: string; mimeType: string } | null> {
    if (!this.isConfigured() || !mediaId) {
      waLogger.warn('media_download', 'Cannot download media: WhatsApp API not configured or mediaId missing', {
        details: { mediaId, isConfigured: this.isConfigured() },
      });
      return null;
    }

    try {
      // 1. Get media URL
      const metaUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (!metaRes.ok) {
        const errorData = await metaRes.json().catch(() => ({}));
        waLogger.error('media_download', `Failed to retrieve media URL from Meta Graph API for ID: ${mediaId}`, {
          httpStatus: metaRes.status,
          details: errorData,
        });
        return null;
      }

      const metaData = await metaRes.json();
      const downloadUrl = metaData.url;
      const mimeType = metaData.mime_type || 'image/jpeg';

      if (!downloadUrl) {
        waLogger.error('media_download', `No download URL returned by Meta for media ID: ${mediaId}`);
        return null;
      }

      // 2. Fetch binary stream with auth header
      const binaryRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (!binaryRes.ok) {
        waLogger.error('media_download', `Failed to download binary stream from Meta CDN for media ID: ${mediaId}`, {
          httpStatus: binaryRes.status,
        });
        return null;
      }

      const buffer = await binaryRes.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binaryStr = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binaryStr += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binaryStr);

      waLogger.info('media_download', `Successfully downloaded media ID: ${mediaId} (${mimeType}, ${Math.round(bytes.length / 1024)} KB)`);
      return { base64, mimeType };
    } catch (err: any) {
      waLogger.error('media_download', `Exception downloading media from WhatsApp Cloud API: ${err.message}`, {
        details: err,
      });
      return null;
    }
  }

  /**
   * Send standard WhatsApp text message
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppSendResult> {
    const cleanTo = this.cleanPhone(to);

    if (!cleanTo) {
      const err = 'Recipient phone number is invalid or empty.';
      waLogger.warn('outgoing_message', err, { phone: to });
      return { success: false, error: err };
    }

    if (!text || !text.trim()) {
      const err = 'Cannot send an empty WhatsApp message.';
      waLogger.warn('outgoing_message', err, { phone: cleanTo });
      return { success: false, error: err };
    }

    if (!this.isConfigured()) {
      const simMessageId = 'wamid.simulated_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      waLogger.info('outgoing_message', `[Simulation Mode] Dispatched text message to ${cleanTo}`, {
        phone: cleanTo,
        messageId: simMessageId,
        details: { textSnippet: text.slice(0, 100) },
      });
      return {
        success: true,
        messageId: simMessageId,
        simulated: true,
      };
    }

    const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorCode = data.error?.code;
        const metaErrorMessage = data.error?.message || 'Meta Cloud API rejected message dispatch';

        waLogger.error('delivery_failure', `Meta Cloud API rejected message: ${metaErrorMessage}`, {
          phone: cleanTo,
          metaErrorCode: errorCode,
          httpStatus: response.status,
          details: data.error,
        });

        return {
          success: false,
          error: metaErrorMessage,
          metaErrorCode: errorCode,
          details: data.error,
          messageId: 'wamid.failed_' + Date.now(),
        };
      }

      const messageId = data.messages?.[0]?.id;
      waLogger.info('outgoing_message', `Successfully dispatched message to ${cleanTo}`, {
        phone: cleanTo,
        messageId,
      });

      return {
        success: true,
        messageId,
        simulated: false,
      };
    } catch (err: any) {
      waLogger.error('api_error', `Network exception sending WhatsApp message: ${err.message}`, {
        phone: cleanTo,
        details: err,
      });
      return {
        success: false,
        error: err.message || 'Network error reaching Meta Cloud API',
      };
    }
  }

  /**
   * Send interactive Quick Reply buttons (e.g. for A, B, C, D quiz questions)
   */
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[],
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppSendResult> {
    const cleanTo = this.cleanPhone(to);

    if (!this.isConfigured()) {
      const simMessageId = 'wamid.simulated_interactive_' + Date.now();
      waLogger.info('outgoing_message', `[Simulation Mode] Dispatched interactive buttons to ${cleanTo}`, {
        phone: cleanTo,
        messageId: simMessageId,
        details: { buttons: buttons.map((b) => b.title) },
      });
      return {
        success: true,
        messageId: simMessageId,
        simulated: true,
      };
    }

    const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
    // Meta allows up to 3 interactive reply buttons, each title max 20 chars
    const formattedButtons = buttons.slice(0, 3).map((b) => ({
      type: 'reply',
      reply: {
        id: (b.id || 'btn_' + Math.random().toString(36).substring(2, 6)).slice(0, 256),
        title: (b.title || 'Option').slice(0, 20),
      },
    }));

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: formattedButtons },
      },
    };

    if (headerText) {
      payload.interactive.header = { type: 'text', text: headerText.slice(0, 60) };
    }
    if (footerText) {
      payload.interactive.footer = { text: footerText.slice(0, 60) };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        waLogger.warn('outgoing_message', `Interactive buttons rejected by Meta, falling back to text format`, {
          phone: cleanTo,
          metaErrorCode: data.error?.code,
          details: data.error,
        });

        // Fallback to text message formatting if interactive buttons failed (e.g. over 3 buttons or policy)
        const fallbackText = `${bodyText}\n\n*Options:*\n` + buttons.map((b, i) => `${i + 1}️⃣ ${b.title}`).join('\n');
        return this.sendTextMessage(to, fallbackText);
      }

      const messageId = data.messages?.[0]?.id;
      waLogger.info('outgoing_message', `Dispatched interactive buttons to ${cleanTo}`, {
        phone: cleanTo,
        messageId,
      });

      return {
        success: true,
        messageId,
        simulated: false,
      };
    } catch (err: any) {
      waLogger.error('api_error', `Exception sending interactive buttons: ${err.message}`, {
        phone: cleanTo,
        details: err,
      });
      return this.sendTextMessage(to, bodyText);
    }
  }
}

export const whatsapp = new WhatsAppService();
