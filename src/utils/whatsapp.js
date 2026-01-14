/**
 * WhatsApp Integration Utility
 *
 * This module provides WhatsApp alert functionality for verisiye (credit) notifications.
 * It uses the WhatsApp Business API or third-party services like Twilio, WhatsApp Cloud API, etc.
 *
 * To implement this, you need to:
 * 1. Sign up for WhatsApp Business API or Twilio
 * 2. Get API credentials
 * 3. Add credentials to .env file
 * 4. Uncomment and configure the appropriate provider below
 */

// Option 1: Using Twilio WhatsApp API
// Uncomment and install: npm install twilio
/*
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'

const client = twilio(accountSid, authToken);

export const sendWhatsAppAlert = async (customerPhone, customerName, amount) => {
  try {
    const message = `Merhaba ${customerName},\n\nVerisiye borcunuz: ${amount} TL\n\nLütfen en kısa sürede ödeme yapınız.\n\nTeşekkürler,\nOneStopPOS`;

    const result = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: `whatsapp:${customerPhone}`,
      body: message
    });

    console.log('WhatsApp message sent:', result.sid);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};
*/

// Option 2: Using WhatsApp Cloud API (Meta)
// Uncomment and install: npm install axios
/*
import axios from 'axios';

const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export const sendWhatsAppAlert = async (customerPhone, customerName, amount) => {
  try {
    const message = `Merhaba ${customerName},\n\nVerisiye borcunuz: ${amount} TL\n\nLütfen en kısa sürede ödeme yapınız.\n\nTeşekkürler,\nOneStopPOS`;

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: customerPhone,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('WhatsApp message sent:', response.data);
    return { success: true, messageId: response.data.messages[0].id };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};
*/

// Option 3: Mock implementation for development/testing
export const sendWhatsAppAlert = async (customerPhone, customerName, amount) => {
  console.log('=== MOCK WhatsApp Alert ===');
  console.log(`To: ${customerPhone}`);
  console.log(`Customer: ${customerName}`);
  console.log(`Amount: ${amount} TL`);
  console.log(`Message: Merhaba ${customerName},\n\nVerisiye borcunuz: ${amount} TL\n\nLütfen en kısa sürede ödeme yapınız.\n\nTeşekkürler,\nOneStopPOS`);
  console.log('=========================');

  // Simulate success
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    note: 'This is a mock implementation. Configure a real WhatsApp provider in production.'
  };
};

/**
 * Send bulk WhatsApp alerts to multiple customers
 */
export const sendBulkWhatsAppAlerts = async (customers) => {
  const results = [];

  for (const customer of customers) {
    const result = await sendWhatsAppAlert(
      customer.phone,
      customer.name,
      customer.total_credit
    );

    results.push({
      customerId: customer.id,
      customerName: customer.name,
      ...result
    });

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
};

/**
 * Format phone number to WhatsApp format
 * Converts various formats to international format (e.g., +905551234567)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 0, replace with country code (Turkey: +90)
  if (cleaned.startsWith('0')) {
    cleaned = '90' + cleaned.substring(1);
  }

  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
};
