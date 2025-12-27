import { pgTable, text, real, integer, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const actionModeEnum = pgEnum('action_mode', ['auto_block', 'dashboard', 'email_digest']);
export const flaggedStatusEnum = pgEnum('flagged_status', ['pending', 'blocked', 'muted', 'dismissed']);
export const interactionTypeEnum = pgEnum('interaction_type', ['reply', 'mention', 'quote']);

// Users table - stores authenticated Bluesky users
export const users = pgTable('users', {
	did: text('did').primaryKey(), // Bluesky DID (decentralized identifier)
	handle: text('handle').notNull(),
	email: text('email'),
	actionMode: actionModeEnum('action_mode').notNull().default('dashboard'),
	toxicityThreshold: real('toxicity_threshold').notNull().default(0.7),
	monitoringEnabled: boolean('monitoring_enabled').notNull().default(true),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Flagged users table - users identified as potentially toxic
export const flaggedUsers = pgTable('flagged_users', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	ownerDid: text('owner_did')
		.notNull()
		.references(() => users.did, { onDelete: 'cascade' }),
	flaggedDid: text('flagged_did').notNull(),
	flaggedHandle: text('flagged_handle'), // Cached for display
	aggregateToxicityScore: real('aggregate_toxicity_score').notNull().default(0),
	toxicPostCount: integer('toxic_post_count').notNull().default(0),
	status: flaggedStatusEnum('status').notNull().default('pending'),
	firstDetectedAt: timestamp('first_detected_at').notNull().defaultNow(),
	lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
	actionTakenAt: timestamp('action_taken_at'),
	notificationSentAt: timestamp('notification_sent_at')
});

// Toxic evidence table - individual toxic posts/interactions
export const toxicEvidence = pgTable('toxic_evidence', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	flaggedUserId: integer('flagged_user_id')
		.notNull()
		.references(() => flaggedUsers.id, { onDelete: 'cascade' }),
	postUri: text('post_uri').notNull(),
	postText: text('post_text').notNull(),
	toxicityScores: jsonb('toxicity_scores').notNull(), // { toxic, severe_toxic, obscene, threat, insult, identity_attack }
	primaryCategory: text('primary_category').notNull(), // The highest-scoring category
	interactionType: interactionTypeEnum('interaction_type').notNull(),
	analyzedAt: timestamp('analyzed_at').notNull().defaultNow()
});

// Type exports for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type FlaggedUser = typeof flaggedUsers.$inferSelect;
export type NewFlaggedUser = typeof flaggedUsers.$inferInsert;
export type ToxicEvidence = typeof toxicEvidence.$inferSelect;
export type NewToxicEvidence = typeof toxicEvidence.$inferInsert;

// Toxicity scores type
export type ToxicityScores = {
	toxic: number;
	severe_toxic: number;
	obscene: number;
	threat: number;
	insult: number;
	identity_attack: number;
};
