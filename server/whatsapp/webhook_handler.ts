import { Request, Response } from 'express';
import { whatsapp } from './whatsapp_service.ts';
import { waLogger } from './whatsapp_logger.ts';
import { orchestrateMessage } from '../agents/orchestrator.ts';
import { db } from '../database/db.ts';

// In-memory deduplication cache: messageId -> timestamp (ms)
const processedMessageIds = new Map<string, number>();
const DEDUPLICATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Prune deduplication cache periodically
 */
function pruneDeduplicationCache() {
  const now = Date.now();
  for (const [id, time] of processedMessageIds.entries()) {
    if (now - time > DEDUPLICATION_TTL_MS) {
      processedMessageIds.delete(id);
    }
  }
}

/**
 * 1. Verification Handshake for Meta WhatsApp Cloud API
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
 *
 * Meta calls this when configuring the Webhook URL in Meta Developer Dashboard.
 * - hub.mode: 'subscribe'
 * - hub.verify_token: Token configured in Meta Developer App & server env
 * - hub.challenge: Random challenge string to echo back
 */
export function handleWebhookVerification(req: Request, res: Response) {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const expectedToken = whatsapp.getVerifyToken();

  // If no hub.mode is provided (e.g. browser access, Cloud Run uptime check, monitoring)
  if (!mode) {
    waLogger.debug('webhook_verification', 'Health/status check on webhook endpoint', {
      details: { ip: req.ip, userAgent: req.get('user-agent') },
    });
    return res.status(200).json({
      status: 'online',
      service: 'WhatsApp Cloud API Webhook Handler',
      mode: 'ready',
      apiVersion: 'v21.0',
      verifyTokenConfigured: Boolean(expectedToken),
      endpoints: ['/webhook/whatsapp', '/webhook', '/api/webhook', '/api/webhook/whatsapp'],
    });
  }

  // Meta verification handshake
  if (mode === 'subscribe' && token === expectedToken) {
    waLogger.info('webhook_verification', 'Meta Webhook verification handshake succeeded', {
      details: {
        mode,
        receivedTokenSnippet: token ? `${token.slice(0, 3)}***` : '',
        challengeSnippet: challenge ? `${challenge.slice(0, 8)}...` : '',
        ip: req.ip,
      },
    });

    // Meta strictly expects plain-text response containing only the challenge string with HTTP 200
    return res.status(200).send(challenge);
  } else {
    waLogger.warn('webhook_verification', 'Meta Webhook verification failed: Token mismatch or invalid mode', {
      details: {
        mode,
        receivedToken: token,
        expectedToken,
        ip: req.ip,
      },
    });

    return res.status(403).json({
      error: 'Forbidden: Verification token mismatch',
      receivedMode: mode,
    });
  }
}

/**
 * 2. Incoming WhatsApp Webhook Events (Messages, Statuses, Interactive replies)
 */
export async function handleIncomingWebhook(req: Request, res: Response) {
  // CRITICAL: Meta Cloud API requires an immediate 200 OK acknowledgment.
  // Delaying or returning non-200 causes Meta to flood retries and eventually disable the webhook.
  res.status(200).json({ status: 'EVENT_RECEIVED' });

  const body = req.body;
  if (!body || typeof body !== 'object') {
    waLogger.debug('incoming_message', 'Empty or non-object webhook payload received');
    return;
  }

  // Prune old entries in deduplication cache
  pruneDeduplicationCache();

  try {
    const entries = Array.isArray(body.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // ------------------------------------------------------------------
        // Edge Case A: Account/Business Level Errors reported in Webhook
        // ------------------------------------------------------------------
        if (value.errors && Array.isArray(value.errors)) {
          for (const err of value.errors) {
            waLogger.error('api_error', `Meta Webhook reported error: ${err.title || err.message}`, {
              metaErrorCode: err.code,
              details: err,
            });
          }
        }

        // ------------------------------------------------------------------
        // Edge Case B: Message Status Updates (sent, delivered, read, failed)
        // ------------------------------------------------------------------
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const { id: wamid, status, recipient_id, errors } = statusObj;

            if (status === 'failed') {
              const primaryError = errors?.[0] || {};
              const errorCode = primaryError.code;
              const errorTitle = primaryError.title || 'Message Undeliverable';
              const errorMsg = primaryError.message || primaryError.error_data?.details || 'Delivery rejected by WhatsApp';

              waLogger.error('delivery_failure', `Message delivery failed to ${recipient_id}: ${errorTitle} (${errorMsg})`, {
                phone: recipient_id,
                messageId: wamid,
                metaErrorCode: errorCode,
                details: statusObj,
              });

              db.updateMessageDeliveryStatus(wamid, 'failed', `${errorTitle}: ${errorMsg}`);
            } else {
              waLogger.info('status_receipt', `Message ${wamid} status: ${status} for +${recipient_id}`, {
                phone: recipient_id,
                messageId: wamid,
                details: { status, timestamp: statusObj.timestamp },
              });

              db.updateMessageDeliveryStatus(wamid, status);
            }
          }
        }

        // ------------------------------------------------------------------
        // Edge Case C: Incoming Student Messages
        // ------------------------------------------------------------------
        if (!value.messages || !Array.isArray(value.messages)) {
          continue;
        }

        const senderContact = value.contacts?.[0];
        const senderName = senderContact?.profile?.name || 'Student';

        for (const msg of value.messages) {
          const fromPhone = whatsapp.cleanPhone(msg.from || '');
          const messageId = msg.id || ('temp_msg_' + Date.now());

          if (!fromPhone) {
            waLogger.warn('incoming_message', 'Dropped message with invalid/empty sender phone number', {
              details: msg,
            });
            continue;
          }

          // ----------------------------------------------------------------
          // Edge Case D: Message Deduplication
          // ----------------------------------------------------------------
          if (processedMessageIds.has(messageId)) {
            waLogger.debug('incoming_message', `Skipped duplicate WhatsApp message: ${messageId}`, {
              phone: fromPhone,
              messageId,
            });
            continue;
          }
          processedMessageIds.set(messageId, Date.now());

          // Handle message types gracefully
          const msgType = msg.type;
          let text = '';
          let mediaType: 'text' | 'image' | 'interactive' | 'audio' | 'document' = 'text';
          let mediaBase64: string | undefined;
          let mimeType: string | undefined;

          try {
            switch (msgType) {
              case 'text': {
                text = (msg.text?.body || '').trim();
                mediaType = 'text';
                break;
              }

              case 'interactive': {
                mediaType = 'interactive';
                if (msg.interactive?.button_reply) {
                  text = msg.interactive.button_reply.title || msg.interactive.button_reply.id || '';
                } else if (msg.interactive?.list_reply) {
                  text = msg.interactive.list_reply.title || msg.interactive.list_reply.id || '';
                }
                break;
              }

              case 'button': {
                mediaType = 'interactive';
                text = msg.button?.text || '';
                break;
              }

              case 'image': {
                mediaType = 'image';
                text = msg.image?.caption || 'Solve question from this photo';
                mimeType = msg.image?.mime_type || 'image/jpeg';

                if (msg.image?.id) {
                  const downloaded = await whatsapp.downloadMedia(msg.image.id);
                  if (downloaded) {
                    mediaBase64 = downloaded.base64;
                    mimeType = downloaded.mimeType;
                  } else {
                    // Graceful fallback if image download failed
                    waLogger.warn('media_download', `Could not download image ID ${msg.image.id} for ${fromPhone}`, {
                      phone: fromPhone,
                    });
                    await whatsapp.sendTextMessage(
                      fromPhone,
                      `📸 *Photo Received*: I noticed you sent a question photo, but I couldn't download it from WhatsApp servers. Please resend the image or type out your question!`
                    );
                    continue;
                  }
                }
                break;
              }

              case 'audio': {
                mediaType = 'audio';
                text = 'Voice question';
                mimeType = msg.audio?.mime_type || 'audio/ogg';

                if (msg.audio?.id) {
                  const downloaded = await whatsapp.downloadMedia(msg.audio.id);
                  if (downloaded) {
                    mediaBase64 = downloaded.base64;
                    mimeType = downloaded.mimeType;
                  } else {
                    waLogger.warn('media_download', `Could not download audio ID ${msg.audio.id} for ${fromPhone}`, {
                      phone: fromPhone,
                    });
                    await whatsapp.sendTextMessage(
                      fromPhone,
                      `🎙️ *Voice Note Received*: I couldn't download your audio note from WhatsApp servers. Please try recording again or type your question!`
                    );
                    continue;
                  }
                }
                break;
              }

              case 'document': {
                mediaType = 'document';
                const docName = msg.document?.filename || 'Document';
                const caption = msg.document?.caption ? `\nCaption: ${msg.document.caption}` : '';

                waLogger.info('incoming_message', `Document received from ${fromPhone}: ${docName}`, {
                  phone: fromPhone,
                  messageId,
                });

                await whatsapp.sendTextMessage(
                  fromPhone,
                  `📄 *Document Received*: _${docName}_${caption}\n\nTo ask a specific doubt from this document, take a screenshot of the exact problem or type the topic you'd like me to explain!`
                );
                continue;
              }

              case 'reaction': {
                // Emoji reaction to a previous message (e.g. 👍, ❤️)
                // Do NOT invoke the AI tutor with a full lesson, just log receipt
                waLogger.info('incoming_message', `Emoji reaction received from ${fromPhone}: ${msg.reaction?.emoji || '👍'}`, {
                  phone: fromPhone,
                  messageId,
                  details: msg.reaction,
                });
                continue;
              }

              case 'location': {
                waLogger.info('incoming_message', `Location received from ${fromPhone}`, {
                  phone: fromPhone,
                  messageId,
                });
                await whatsapp.sendTextMessage(
                  fromPhone,
                  `📍 Thanks for sharing! As your AI Study Tutor, I'm here to help with your academic subjects, doubts, and exam prep. Type any question or send */quiz* to begin!`
                );
                continue;
              }

              case 'contacts': {
                waLogger.info('incoming_message', `Contact card received from ${fromPhone}`, {
                  phone: fromPhone,
                  messageId,
                });
                await whatsapp.sendTextMessage(
                  fromPhone,
                  `👤 Contact card received. Let me know if there's any topic or problem you'd like to study!`
                );
                continue;
              }

              case 'sticker': {
                waLogger.info('incoming_message', `Sticker received from ${fromPhone}`, {
                  phone: fromPhone,
                  messageId,
                });
                await whatsapp.sendTextMessage(
                  fromPhone,
                  `🎉 Nice sticker! When you're ready to study, send your question or type */quiz* to test your knowledge.`
                );
                continue;
              }

              default: {
                waLogger.info('incoming_message', `Unhandled/unknown message type: ${msgType} from ${fromPhone}`, {
                  phone: fromPhone,
                  messageId,
                  details: msg,
                });
                await whatsapp.sendTextMessage(
                  fromPhone,
                  `👋 Hello ${senderName}! I received your message. You can send questions as text, take photos of textbook problems, or send voice notes. Type */help* for commands!`
                );
                continue;
              }
            }

            // Fallback for empty text
            if (!text && !mediaBase64) {
              text = 'Hello';
            }

            waLogger.info('incoming_message', `Processing message from ${fromPhone} (${senderName}): "${text.slice(0, 60)}"`, {
              phone: fromPhone,
              messageId,
              details: { mediaType },
            });

            // Route to AI Agent Orchestrator
            await orchestrateMessage({
              fromPhone,
              senderName,
              text,
              mediaType,
              mediaBase64,
              mimeType,
            });
          } catch (msgErr: any) {
            waLogger.error('incoming_message', `Error processing message from ${fromPhone}: ${msgErr.message}`, {
              phone: fromPhone,
              messageId,
              details: msgErr,
            });

            // Send friendly error response so student is not left hanging
            await whatsapp.sendTextMessage(
              fromPhone,
              `⚠️ I encountered a temporary issue processing that question. Please try asking again or type */menu* to see available options.`
            );
          }
        }
      }
    }
  } catch (err: any) {
    waLogger.error('api_error', `Fatal exception parsing WhatsApp webhook payload: ${err.message}`, {
      details: err,
    });
  }
}
