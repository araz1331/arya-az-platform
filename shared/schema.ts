import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: text("display_name"),
  age: text("age"),
  gender: text("gender"),
  tokens: integer("tokens").notNull().default(0),
  recordingsCount: integer("recordings_count").notNull().default(0),
  milestone1Claimed: boolean("milestone1_claimed").notNull().default(false),
  milestone2Claimed: boolean("milestone2_claimed").notNull().default(false),
  whatsappNumber: text("whatsapp_number"),
  whatsappReminderEnabled: boolean("whatsapp_reminder_enabled").notNull().default(false),
  whatsappReminderLastSent: timestamp("whatsapp_reminder_last_sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recordings = pgTable("recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sentenceId: text("sentence_id").notNull(),
  sentenceText: text("sentence_text").notNull(),
  category: text("category").notNull(),
  duration: integer("duration").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  itemName: text("item_name").notNull(),
  tokenCost: integer("token_cost").notNull(),
  activationDate: text("activation_date").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const voiceDonations = pgTable("voice_donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  speakerName: text("speaker_name"),
  age: text("age"),
  gender: text("gender"),
  sentenceId: text("sentence_id"),
  transcription: text("transcription"),
  audioUrl: text("audio_url"),
  category: text("category"),
  duration: integer("duration").default(0),
  fileSize: integer("file_size").default(0),
  wordCount: integer("word_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const widgetMessages = pgTable("widget_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: text("profile_id"),
  sessionId: text("session_id"),
  role: text("role").notNull(),
  content: text("content"),
  contentType: text("content_type").notNull().default("text"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const smartProfiles = pgTable("smart_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  slug: varchar("slug").notNull().unique(),
  businessName: text("business_name").notNull(),
  displayName: text("display_name"),
  profession: text("profession").notNull(),
  themeColor: text("theme_color").notNull().default("#2563EB"),
  profileImageUrl: text("profile_image_url"),
  knowledgeBase: text("knowledge_base"),
  privateVault: text("private_vault"),
  knowledgeBaseRu: text("knowledge_base_ru"),
  knowledgeBaseEn: text("knowledge_base_en"),
  professionRu: text("profession_ru"),
  professionEn: text("profession_en"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isPro: boolean("is_pro").notNull().default(false),
  proExpiresAt: timestamp("pro_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
  altegioPartnerToken: text("altegio_partner_token"),
  altegioUserToken: text("altegio_user_token"),
  altegioCompanyId: text("altegio_company_id"),
  altegioAutoSend: boolean("altegio_auto_send").notNull().default(false),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  webhookAutoSend: boolean("webhook_auto_send").notNull().default(false),
  whatsappNumber: text("whatsapp_number"),
  whatsappAutoNotify: boolean("whatsapp_auto_notify").notNull().default(false),
  whatsappSummaryEnabled: boolean("whatsapp_summary_enabled").notNull().default(false),
  whatsappSummaryFrequency: text("whatsapp_summary_frequency").notNull().default("daily"),
  whatsappSummaryLastSent: timestamp("whatsapp_summary_last_sent"),
  whatsappMissedAlertsEnabled: boolean("whatsapp_missed_alerts_enabled").notNull().default(false),
  whatsappChatEnabled: boolean("whatsapp_chat_enabled").notNull().default(false),
  whatsappFollowupEnabled: boolean("whatsapp_followup_enabled").notNull().default(false),
  whatsappFollowupHours: integer("whatsapp_followup_hours").notNull().default(24),
  whatsappAppointmentConfirm: boolean("whatsapp_appointment_confirm").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull(),
  waNumber: text("wa_number").notNull(),
  sessionId: text("session_id").notNull(),
  lastInboundAt: timestamp("last_inbound_at"),
  lastOutboundAt: timestamp("last_outbound_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversations).omit({
  id: true,
  createdAt: true,
});

export type InsertWhatsappConversation = z.infer<typeof insertWhatsappConversationSchema>;
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;

export const ownerChatMessages = pgTable("owner_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOwnerChatMessageSchema = createInsertSchema(ownerChatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertOwnerChatMessage = z.infer<typeof insertOwnerChatMessageSchema>;
export type OwnerChatMessage = typeof ownerChatMessages.$inferSelect;

export const insertSmartProfileSchema = createInsertSchema(smartProfiles).omit({
  id: true,
  createdAt: true,
});

export type InsertSmartProfile = z.infer<typeof insertSmartProfileSchema>;
export type SmartProfile = typeof smartProfiles.$inferSelect;

export const insertVoiceDonationSchema = createInsertSchema(voiceDonations).omit({
  id: true,
  createdAt: true,
});

export const insertWidgetMessageSchema = createInsertSchema(widgetMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertVoiceDonation = z.infer<typeof insertVoiceDonationSchema>;
export type VoiceDonation = typeof voiceDonations.$inferSelect;
export type InsertWidgetMessage = z.infer<typeof insertWidgetMessageSchema>;
export type WidgetMessage = typeof widgetMessages.$inferSelect;

export const insertProfileSchema = createInsertSchema(profiles).omit({
  createdAt: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  createdAt: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Voucher = typeof vouchers.$inferSelect;

export interface Sentence {
  id: string;
  text: string;
  category: "anchor" | "chat" | "news" | "question" | "numbers" | "hard_words" | "commands" | "emotions" | "daily" | "tech" | "culture" | "travel" | "food" | "sports" | "weather" | "health" | "education" | "business" | "nature" | "family";
  wordCount: number;
  emotion?: "neutral" | "angry" | "happy" | "sad";
  context?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  activationDate: string;
  icon: string;
}
