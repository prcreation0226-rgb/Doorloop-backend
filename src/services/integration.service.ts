import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/crypto';
import { AppError } from '../utils/appError';

export class IntegrationService {
  /**
   * Fetch all integrations for a company (with sensitive tokens masked)
   */
  async getCompanyIntegrations(companyId: string) {
    const dbIntegrations = await prisma.companyIntegration.findMany({
      where: { companyId },
    });

    const activeIntegrationsMap = new Map(dbIntegrations.map(i => [i.provider, i]));

    // We support TWILIO and WHATSAPP
    return [
      {
        id: 'int-twilio',
        name: 'Twilio SMS',
        provider: 'TWILIO',
        category: 'Communications',
        description: 'Configure Twilio to send tenant notices, announcements, and booking alerts via SMS.',
        logo: '💬',
        status: activeIntegrationsMap.get('TWILIO')?.status || 'Inactive',
        accountSid: activeIntegrationsMap.get('TWILIO')?.accountSid || '',
        senderId: activeIntegrationsMap.get('TWILIO')?.senderId || '',
        hasToken: !!activeIntegrationsMap.get('TWILIO')?.encryptedAuthToken,
      },
      {
        id: 'int-whatsapp',
        name: 'WhatsApp Business (Meta API)',
        provider: 'WHATSAPP',
        category: 'Communications',
        description: 'Configure Meta Cloud API to broadcast automated messages directly to tenant WhatsApp accounts.',
        logo: '📱',
        status: activeIntegrationsMap.get('WHATSAPP')?.status || 'Inactive',
        accountSid: activeIntegrationsMap.get('WHATSAPP')?.accountSid || '', // Phone Number ID
        senderId: activeIntegrationsMap.get('WHATSAPP')?.senderId || '', // Business Account ID
        hasToken: !!activeIntegrationsMap.get('WHATSAPP')?.encryptedAuthToken,
      }
    ];
  }

  /**
   * Save or Update integration settings
   */
  async updateCompanyIntegration(
    companyId: string,
    provider: 'TWILIO' | 'WHATSAPP',
    data: {
      accountSid: string;
      senderId: string;
      authToken?: string;
      status?: string;
    }
  ) {
    const existing = await prisma.companyIntegration.findUnique({
      where: {
        companyId_provider: { companyId, provider }
      }
    });

    let encryptedAuthToken = existing?.encryptedAuthToken || null;
    let encryptionIv = existing?.encryptionIv || null;

    // Only encrypt and update token if it is provided and is not masked
    if (data.authToken && data.authToken !== '******') {
      const encrypted = encrypt(data.authToken);
      encryptedAuthToken = encrypted.encryptedText;
      encryptionIv = encrypted.iv;
    }

    if (existing) {
      return prisma.companyIntegration.update({
        where: { id: existing.id },
        data: {
          accountSid: data.accountSid,
          senderId: data.senderId,
          encryptedAuthToken,
          encryptionIv,
          status: data.status || existing.status,
        }
      });
    } else {
      return prisma.companyIntegration.create({
        data: {
          companyId,
          provider,
          accountSid: data.accountSid,
          senderId: data.senderId,
          encryptedAuthToken,
          encryptionIv,
          status: data.status || 'Inactive',
        }
      });
    }
  }

  /**
   * Live test of credentials by calling Twilio or Facebook API
   */
  async testCredentials(
    provider: 'TWILIO' | 'WHATSAPP',
    credentials: {
      accountSid: string;
      senderId: string;
      authToken: string;
      companyId: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    let rawToken = credentials.authToken;

    // If masked token is sent, retrieve and decrypt the existing one
    if (rawToken === '******') {
      const existing = await prisma.companyIntegration.findUnique({
        where: {
          companyId_provider: { companyId: credentials.companyId, provider }
        }
      });
      if (!existing || !existing.encryptedAuthToken || !existing.encryptionIv) {
        return { success: false, message: 'Missing saved token to test.' };
      }
      try {
        rawToken = decrypt(existing.encryptedAuthToken, existing.encryptionIv);
      } catch (err) {
        return { success: false, message: 'Decryption failed for saved credentials.' };
      }
    }

    if (provider === 'TWILIO') {
      try {
        const authHeader = Buffer.from(`${credentials.accountSid}:${rawToken}`).toString('base64');
        const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}.json`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authHeader}`,
          }
        });

        if (response.status === 200) {
          return { success: true, message: 'Twilio connection successful! Credentials verified.' };
        } else {
          const body: any = await response.json().catch(() => ({}));
          return {
            success: false,
            message: body.message || `Twilio authentication failed with status code ${response.status}.`
          };
        }
      } catch (error: any) {
        return { success: false, message: `Twilio verification failed: ${error.message}` };
      }
    } else if (provider === 'WHATSAPP') {
      try {
        // WhatsApp API uses Phone Number ID (accountSid) and System Access Token (authToken)
        // Let's call Meta's endpoint to verify the phone ID details
        const url = `https://graph.facebook.com/v20.0/${credentials.accountSid}?access_token=${rawToken}`;
        const response = await fetch(url, { method: 'GET' });

        if (response.status === 200) {
          return { success: true, message: 'WhatsApp Cloud API connection successful! Credentials verified.' };
        } else {
          const body: any = await response.json().catch(() => ({}));
          const errorMsg = body.error?.message || `Meta authentication failed with status ${response.status}.`;
          return { success: false, message: errorMsg };
        }
      } catch (error: any) {
        return { success: false, message: `WhatsApp Meta API verification failed: ${error.message}` };
      }
    }

    return { success: false, message: 'Unsupported provider.' };
  }
}

export const integrationService = new IntegrationService();
