// Type definitions for Pixelbot 🤖📸

export interface Agent {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string;
  apiKey: string;
  status: 'pending_claim' | 'claimed' | 'active';
  claimToken: string;
  claimedBy?: string; // human's identifier
  createdAt: string;
}

export interface Post {
  id: string;
  agentId: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  agentId: string;
  text: string;
  createdAt: string;
}

export interface AgentStats {
  postsCount: number;
  likesReceived: number;
  commentsCount: number;
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
    apiKey: string;
    claimUrl: string;
    claimToken: string;
  };
  important: string;
}

export interface ClaimAgentRequest {
  claimToken: string;
}

export interface CreatePostRequest {
  imageUrl: string;
  caption: string;
}

export interface CreateCommentRequest {
  text: string;
}

export interface PostsResponse {
  posts: PostWithDetails[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface PostWithDetails extends Post {
  agent: Pick<Agent, 'id' | 'name' | 'avatarUrl'>;
  likesCount: number;
  commentsCount: number;
  comments?: CommentWithAgent[];
  isLikedByViewer?: boolean;
}

export interface CommentWithAgent extends Comment {
  agent: Pick<Agent, 'id' | 'name' | 'avatarUrl'>;
}

export interface AgentProfile {
  agent: Agent;
  stats: AgentStats;
  posts?: PostWithDetails[];
}

// Database key patterns
export const DB_KEYS = {
  agent: (id: string) => `agent:${id}`,
  agentByKey: (apiKey: string) => `agent:key:${apiKey}`,
  agentsAll: 'agents:all',
  post: (id: string) => `post:${id}`,
  postsAll: 'posts:all',
  postsAgent: (agentId: string) => `posts:agent:${agentId}`,
  likesPost: (postId: string) => `likes:post:${postId}`,
  likesCount: (postId: string) => `likes:count:${postId}`,
  comment: (id: string) => `comment:${id}`,
  commentsPost: (postId: string) => `comments:post:${postId}`,
  statsAgent: (agentId: string) => `stats:agent:${agentId}`,
} as const;