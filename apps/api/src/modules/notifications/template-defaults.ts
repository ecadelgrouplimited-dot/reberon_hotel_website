import type { MessageChannel } from '@reberon/contracts';

/** The words the house starts with. The owner can change every one in Settings → Messages. */
export interface DefaultTemplate {
  key: string;
  channel: MessageChannel;
  subject?: string;
  heading?: string;
  body: string;
  actionLabel?: string;
}

/** Which variable an email's button points at. */
export const ACTION_VAR: Record<string, string> = {
  'booking.confirmed': 'stayLink',
  'booking.payment_failed': 'stayLink',
  'booking.hold_expired': 'bookAgainLink',
  'stay.pre_arrival': 'stayLink',
  'stay.thank_you': 'feedbackLink',
  'document.issued': 'documentLink',
};

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    key: 'booking.confirmed',
    channel: 'EMAIL',
    subject: 'Your stay is confirmed — {{code}}',
    heading: 'See you on the mountain, {{guestFirstName}}.',
    body: 'Your booking is confirmed. Everything you need is below; keep this email.\n\nLeave Kampala by 6:30 to miss the Jinja traffic — about six to seven hours with a lunch stop in Mbale. The last kilometre is murram; take it slowly after rain. The gate is staffed all night; call from Mbale if you will be late.\n\nQuestions? WhatsApp {{whatsapp}}.',
    actionLabel: 'See or change your stay',
  },
  { key: 'booking.confirmed', channel: 'SMS', body: '{{hotelName}}: booking {{code}} confirmed. {{arrival}} to {{departure}}, {{room}}. Balance {{balance}}. Your stay: {{stayLink}}' },
  { key: 'booking.confirmed', channel: 'WHATSAPP', body: 'Hello {{guestFirstName}}, your stay at {{hotelName}} is confirmed.\n\nBooking: {{code}}\nArrive: {{arrival}} from {{checkInTime}}\nLeave: {{departure}}\nRoom: {{room}}\nBalance at arrival: {{balance}}\n\nEverything about your stay: {{stayLink}}' },

  {
    key: 'booking.payment_failed',
    channel: 'EMAIL',
    subject: 'Your payment did not go through ({{code}})',
    heading: 'The payment did not go through.',
    body: 'Nothing was taken. Your rooms are still held until {{holdUntil}} — you can try again, or pay another way.\n\nIf it keeps failing, message us on WhatsApp ({{whatsapp}}) and we will help.',
    actionLabel: 'Try again',
  },
  { key: 'booking.payment_failed', channel: 'SMS', body: '{{code}}: your payment did not go through and nothing was taken. Rooms held until {{holdUntil}}. Try again: {{stayLink}}' },

  {
    key: 'booking.hold_expired',
    channel: 'EMAIL',
    subject: 'Your hold has ended ({{code}})',
    heading: 'We let the rooms go.',
    body: 'We held your rooms for a while but no payment arrived, so they are free for others again. Nothing was charged.\n\nIf you still want to come, start again — or message us on WhatsApp ({{whatsapp}}) and we will sort it out with you.',
    actionLabel: 'Start again',
  },
  { key: 'booking.hold_expired', channel: 'SMS', body: '{{code}}: no payment arrived, so we released the rooms. Nothing was charged. Book again: {{bookAgainLink}}' },

  {
    key: 'booking.cancelled',
    channel: 'EMAIL',
    subject: 'Your booking is cancelled ({{code}})',
    heading: 'Your booking is cancelled.',
    body: 'Your stay from {{arrival}} to {{departure}} is cancelled.\n\n{{refund}}\n\nWe hope to host you another time.',
  },
  { key: 'booking.cancelled', channel: 'SMS', body: '{{code}} ({{arrival}}) is cancelled. {{refund}}' },

  {
    key: 'stay.pre_arrival',
    channel: 'EMAIL',
    subject: 'See you tomorrow — {{code}}',
    heading: 'See you tomorrow, {{guestFirstName}}.',
    body: 'Check-in is from {{checkInTime}} on {{arrival}}.\n\nLeave Kampala by 6:30 to miss the Jinja traffic. The last kilometre is murram; take it slowly after rain. The road, stop by stop: {{directionsLink}}\n\nBalance to pay at the house: {{balance}} — mobile money, card or cash.\n\nRunning late, or want a pick-up from Mbale? WhatsApp {{whatsapp}}.',
    actionLabel: 'Your stay',
  },
  { key: 'stay.pre_arrival', channel: 'SMS', body: 'See you tomorrow, {{guestFirstName}}! Check-in from {{checkInTime}}. Balance {{balance}}. Directions: {{directionsLink}} Late? Call {{whatsapp}}' },
  { key: 'stay.pre_arrival', channel: 'WHATSAPP', body: 'Hello {{guestFirstName}}, see you tomorrow at Reberon!\n\nCheck-in from {{checkInTime}}.\nBalance at the house: {{balance}}.\nThe road, stop by stop: {{directionsLink}}\n\nRunning late or need a pick-up from Mbale? Just reply here.' },

  { key: 'stay.running_late', channel: 'SMS', body: 'Hello {{guestFirstName}}, this is {{hotelName}}. Your room ({{code}}) is ready — are you still on the way tonight? Call or WhatsApp {{whatsapp}}. The gate is open all night.' },
  { key: 'stay.running_late', channel: 'WHATSAPP', body: 'Hello {{guestFirstName}}, this is {{hotelName}}. Your room ({{code}}) is ready and waiting — are you still on the way tonight? The gate is open all night. Reply here if you need anything.' },

  {
    key: 'stay.thank_you',
    channel: 'EMAIL',
    subject: 'Thank you for staying with us',
    heading: 'Safe travels, {{guestFirstName}}.',
    body: 'Thank you for staying at {{hotelName}}. If you have a minute, tell us how it was — one tap is enough, and the owner reads every answer.',
    actionLabel: 'How was your stay?',
  },
  { key: 'stay.thank_you', channel: 'SMS', body: 'Thank you for staying at {{hotelName}}, {{guestFirstName}}. How was it? One tap: {{feedbackLink}}' },
  { key: 'stay.thank_you', channel: 'WHATSAPP', body: 'Thank you for staying at {{hotelName}}, {{guestFirstName}}. Safe travels! If you have a minute, how was it? {{feedbackLink}}' },

  {
    key: 'document.issued',
    channel: 'EMAIL',
    subject: 'Your {{documentName}}',
    heading: 'Your {{documentName}}',
    body: 'Hello {{guestFirstName}}, here is your {{documentName}} for {{amount}} (booking {{code}}). Open it to view, print or save it as a PDF.\n\nThank you — {{hotelName}}.',
    actionLabel: 'Open the document',
  },
  { key: 'document.issued', channel: 'SMS', body: '{{hotelName}}: your {{documentName}} for {{amount}} ({{code}}): {{documentLink}}' },
  { key: 'document.issued', channel: 'WHATSAPP', body: 'Hello {{guestFirstName}}, here is your {{documentName}} for {{amount}} (booking {{code}}):\n{{documentLink}}\n\nThank you — {{hotelName}}.' },

  { key: 'stay.otp', channel: 'SMS', body: '{{otp}} is your {{hotelName}} code to see your booking. It expires in 10 minutes. Never share it.' },
];
