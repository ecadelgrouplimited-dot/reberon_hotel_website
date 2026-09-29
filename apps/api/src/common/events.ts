/** Internal domain events (EventEmitter2). */
export const Events = {
  ContentChanged: 'content.changed',
  EnquiryCreated: 'enquiry.created',
  WaitlistCreated: 'waitlist.created',
  MediaUploaded: 'media.uploaded',
} as const;

export interface ContentChangedEvent {
  tags: string[];
}
export interface EnquiryCreatedEvent {
  conversationId: string;
}
export interface WaitlistCreatedEvent {
  entryId: string;
}
