/**
 * WhatsApp Service
 * Sends WhatsApp messages to admin for new orders
 */

interface WhatsAppMessage {
  adminName: string;
  adminPhone: string;
  orderNumber: string;
  customerName: string;
  contactNumber: string;
}

/**
 * Generate WhatsApp message URL
 * Opens WhatsApp with pre-filled message
 */
export function generateWhatsAppURL(message: WhatsAppMessage): string {
  const text = `Hi ${message.adminName}\nYou have a new order in MonsterMen90\nOrder ID: ${message.orderNumber}\nCustomer: ${message.customerName}\nContact: ${message.contactNumber}\nPlease connect with the customer.`;
  
  // WhatsApp API URL format: https://wa.me/PHONE_NUMBER?text=MESSAGE
  const encodedText = encodeURIComponent(text);
  const phoneNumber = message.adminPhone.replace(/[^0-9]/g, ''); // Remove non-numeric chars
  
  return `https://wa.me/${phoneNumber}?text=${encodedText}`;
}

/**
 * Send WhatsApp notification (for future integration with WhatsApp Business API)
 * Currently returns the URL that can be opened
 */
export async function sendWhatsAppNotification(message: WhatsAppMessage): Promise<{ url: string; sent: boolean }> {
  // TODO: Integrate with WhatsApp Business API or Twilio when ready
  // For now, return the URL that can be opened
  
  const url = generateWhatsAppURL(message);
  
  // Log for now (can be replaced with actual API call)
  console.log('📱 WhatsApp Notification:', {
    admin: message.adminPhone,
    order: message.orderNumber,
    customer: message.customerName,
    url,
  });
  
  return {
    url,
    sent: false, // Set to true when actual API integration is done
  };
}

/**
 * Generate WhatsApp OTP Link (FREE TIER)
 * Creates a wa.me link with OTP for admin login
 */
export function generateOTPLink(adminPhone: string, otpCode: string): string {
  const text = `Your MonsterMen90 Admin Login OTP is: ${otpCode}\n\nThis OTP is valid for 5 minutes.\n\nDo not share this OTP with anyone.`;
  
  // WhatsApp API URL format: https://wa.me/PHONE_NUMBER?text=MESSAGE
  const encodedText = encodeURIComponent(text);
  const phoneNumber = adminPhone.replace(/[^0-9]/g, ''); // Remove non-numeric chars
  
  return `https://wa.me/${phoneNumber}?text=${encodedText}`;
}

/**
 * Customer login/signup OTP via WhatsApp
 * Sends OTP to customer's phone via wa.me link (user opens and gets OTP in message)
 */
export function generateCustomerOTPLink(customerPhone: string, otpCode: string, purpose: 'login' | 'reset_password' | 'change_phone' = 'login'): string {
  const purposeText = purpose === 'reset_password' ? 'Password Reset' : purpose === 'change_phone' ? 'Profile phone update' : 'Login';
  const text = `Your Monster Men 90 ${purposeText} OTP is: ${otpCode}\n\nValid for 5 minutes. Do not share.`;
  const encodedText = encodeURIComponent(text);
  const phone = customerPhone.replace(/[^0-9]/g, '');
  const withCountryCode = phone.length === 10 ? `91${phone}` : phone;
  return `https://wa.me/${withCountryCode}?text=${encodedText}`;
}
