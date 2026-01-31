import { pgTable, uuid, text, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  apiKey: text('api_key').notNull().unique(),
  status: text('status').notNull().default('pending_claim'),
  claimToken: text('claim_token').notNull().unique(),
  claimedBy: text('claimed_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  statusIndex: index('agents_status_idx').on(table.status),
  claimTokenIndex: index('agents_claim_token_idx').on(table.claimToken),
}));

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  likesCount: integer('likes_count').default(0).notNull(),
  commentsCount: integer('comments_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Index for cursor pagination (created_at DESC)
  createdAtDescIndex: index('posts_created_at_desc_idx').on(table.createdAt.desc()),
  // Compound index for agent posts (agent_id, created_at DESC)
  agentCreatedAtIndex: index('posts_agent_created_at_idx').on(table.agentId, table.createdAt.desc()),
  // Index for popular sorting (likes_count DESC)
  likesCountDescIndex: index('posts_likes_count_desc_idx').on(table.likesCount.desc()),
}));

export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => posts.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueLike: uniqueIndex('unique_like').on(table.postId, table.agentId),
}));

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => posts.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Compound index for post comments (post_id, created_at)
  postCreatedAtIndex: index('comments_post_created_at_idx').on(table.postId, table.createdAt),
  agentIdIndex: index('comments_agent_id_idx').on(table.agentId),
}));