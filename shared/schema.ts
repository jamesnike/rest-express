import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  date,
  time,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  customAvatarUrl: text("custom_avatar_url"), // AI-generated custom avatar as base64 data
  animeAvatarSeed: varchar("anime_avatar_seed").notNull().default("default"), // For generating consistent anime avatars
  location: varchar("location"),
  interests: text("interests").array().default([]), // Array of interest categories
  personality: text("personality").array().default([]), // Array of personality traits
  aiSignature: text("ai_signature"), // AI-generated user signature
  skippedEvents: integer("skipped_events").array().default([]), // Array of skipped event IDs
  eventsShownSinceSkip: integer("events_shown_since_skip").default(0), // Counter for events shown since last skip
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // Music, Sports, Arts, Food, Tech, Business, Education, Health, Entertainment, Community, Outdoor, Family, Lifestyle
  subCategory: varchar("sub_category", { length: 100 }), // Optional subcategory within each main category
  date: date("date").notNull(),
  time: time("time").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00"),
  isFree: boolean("is_free").default(true),
  eventImageUrl: varchar("event_image_url"),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  maxAttendees: integer("max_attendees"),
  capacity: integer("capacity"),
  parkingInfo: text("parking_info"),
  meetingPoint: text("meeting_point"),
  duration: varchar("duration", { length: 100 }),
  whatToBring: text("what_to_bring"),
  specialNotes: text("special_notes"),
  requirements: text("requirements"),
  contactInfo: text("contact_info"),
  cancellationPolicy: text("cancellation_policy"),
  isActive: boolean("is_active").default(true),
  isPrivateChat: boolean("is_private_chat").default(false), // Mark for 1-on-1 private chats
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event RSVPs table
export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("going"), // going, maybe, not_going
  hasLeftChat: boolean("has_left_chat").default(false), // Track if user has left the group chat
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  organizedEvents: many(events),
  rsvps: many(eventRsvps),
  chatMessages: many(chatMessages),
  messageReads: many(messageReads),
}));

export const eventRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  rsvps: many(eventRsvps),
  chatMessages: many(chatMessages),
  messageReads: many(messageReads),
}));

export const eventRsvpRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRsvps.userId],
    references: [users.id],
  }),
}));

// Chat messages table for event group chats
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  quotedMessageId: integer("quoted_message_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  event: one(events, { fields: [chatMessages.eventId], references: [events.id] }),
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
  quotedMessage: one(chatMessages, { fields: [chatMessages.quotedMessageId], references: [chatMessages.id] }),
}));

// Message reads table to track which messages users have read
export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userEventUnique: unique().on(table.userId, table.eventId),
}));

export const messageReadRelations = relations(messageReads, ({ one }) => ({
  user: one(users, { fields: [messageReads.userId], references: [users.id] }),
  event: one(events, { fields: [messageReads.eventId], references: [events.id] }),
}));

// Message favorites table to track which messages users have favorited
export const messageFavorites = pgTable("message_favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messageId: integer("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userMessageUnique: unique().on(table.userId, table.messageId),
}));

export const messageFavoriteRelations = relations(messageFavorites, ({ one }) => ({
  user: one(users, { fields: [messageFavorites.userId], references: [users.id] }),
  message: one(chatMessages, { fields: [messageFavorites.messageId], references: [chatMessages.id] }),
}));

// Saved events table to track which events users have saved
export const savedEvents = pgTable("saved_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userEventUnique: unique().on(table.userId, table.eventId),
}));

export const savedEventRelations = relations(savedEvents, ({ one }) => ({
  user: one(users, { fields: [savedEvents.userId], references: [users.id] }),
  event: one(events, { fields: [savedEvents.eventId], references: [events.id] }),
}));

// Zod schemas
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  animeAvatarSeed: true,
  location: true,
  interests: true,
  personality: true,
  aiSignature: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// External event schema for web crawl API - allows posting events without authentication
export const externalEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Allow external sources to specify organizer by email or create a default one
  organizerEmail: z.string().email().optional(),
  // Add source tracking for crawled events
  source: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

export const insertRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageReadSchema = createInsertSchema(messageReads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageFavoriteSchema = createInsertSchema(messageFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertSavedEventSchema = createInsertSchema(savedEvents).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventWithOrganizer = Event & {
  organizer: User;
  rsvpCount: number;
  userRsvpStatus?: string;
  isPrivateChat?: boolean; // Include private chat flag
};
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type ExternalEvent = z.infer<typeof externalEventSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertRsvp = z.infer<typeof insertRsvpSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatMessageWithUser = ChatMessage & {
  user: User;
  quotedMessage?: ChatMessage & { user: User };
  favorites?: Array<{
    user: User;
    createdAt: string;
  }>;
  favoritesCount?: number;
};
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type MessageRead = typeof messageReads.$inferSelect;
export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;
export type MessageFavorite = typeof messageFavorites.$inferSelect;
export type InsertMessageFavorite = z.infer<typeof insertMessageFavoriteSchema>;
export type SavedEvent = typeof savedEvents.$inferSelect;
export type InsertSavedEvent = z.infer<typeof insertSavedEventSchema>;
