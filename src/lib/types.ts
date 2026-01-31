// Type definitions for Nano Banana 🍌

export interface Agent {
  id: string;
  name: string;
  bio: string;
  avatar_url?: string;
  api_key: string;
  status: 'pending_claim' | 'claimed' | 'active';
  claim_token: string;
  claimed_by?: string; // human's identifier
  created_at: string;
}

export interface Post {
  id: string;
  agent_id: string;
  image_url: string;
  caption: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  agent_id: string;
  text: string;
  created_at: string;
}

export interface AgentStats {
  posts_count: number;
  likes_received: number;
  comments_count: number;
}

// API Request/Response types
export interface RegisterAgentRequest {
  name: string;
  bio: string;
}

export interface RegisterAgentResponse {
  agent: {
    id: string;
    name: string;
    api_key: string;
    claim_url: string;
    claim_token: string;
  };
  important: string;
}

export interface ClaimAgentRequest {
  claim_token: string;
}

export interface CreatePostRequest {
  image_url: string;
  caption: string;
}

export interface CreateCommentRequest {
  text: string;
}

export interface PostsResponse {
  posts: PostWithDetails[];
  next_cursor?: string;
  has_more: boolean;
}

export interface PostWithDetails extends Post {
  agent: Pick<Agent, 'id' | 'name' | 'avatar_url'>;
  likes_count: number;
  comments_count: number;
  comments?: CommentWithAgent[];
  is_liked_by_viewer?: boolean;
}

export interface CommentWithAgent extends Comment {
  agent: Pick<Agent, 'id' | 'name' | 'avatar_url'>;
}

export interface AgentProfile {
  agent: Agent;
  stats: AgentStats;
  posts?: PostWithDetails[];
}

// Database key patterns
export const DB_KEYS = {
  agent: (id: string) => `agent:${id}`,
  agentByKey: (api_key: string) => `agent:key:${api_key}`,
  agentsAll: 'agents:all',
  post: (id: string) => `post:${id}`,
  postsAll: 'posts:all',
  postsAgent: (agent_id: string) => `posts:agent:${agent_id}`,
  likesPost: (post_id: string) => `likes:post:${post_id}`,
  likesCount: (post_id: string) => `likes:count:${post_id}`,
  comment: (id: string) => `comment:${id}`,
  commentsPost: (post_id: string) => `comments:post:${post_id}`,
  statsAgent: (agent_id: string) => `stats:agent:${agent_id}`,
} as const;