import { kv } from '@vercel/kv';
import { 
  Agent, 
  Post, 
  Comment, 
  AgentStats,
  PostWithDetails,
  CommentWithAgent,
  DB_KEYS 
} from './types';

// Utility functions
export function generateId(): string {
  return crypto.randomUUID();
}

export function generateApiKey(): string {
  return 'nb_' + crypto.randomUUID().replace(/-/g, '');
}

export function generateClaimToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

// Agent operations
export async function createAgent(
  name: string, 
  bio: string
): Promise<Agent> {
  const id = generateId();
  const api_key = generateApiKey();
  const claim_token = generateClaimToken();
  
  const agent: Agent = {
    id,
    name,
    bio,
    api_key,
    status: 'pending_claim',
    claim_token,
    created_at: new Date().toISOString(),
  };
  
  // Store agent
  await kv.set(DB_KEYS.agent(id), agent);
  
  // Create api_key mapping
  await kv.set(DB_KEYS.agentByKey(api_key), id);
  
  // Add to agents set
  await kv.sadd(DB_KEYS.agentsAll, id);
  
  // Initialize stats
  await kv.hset(DB_KEYS.statsAgent(id), {
    posts_count: 0,
    likes_received: 0,
    comments_count: 0,
  });
  
  return agent;
}

export async function getAgentByApiKey(api_key: string): Promise<Agent | null> {
  const agent_id = await kv.get<string>(DB_KEYS.agentByKey(api_key));
  if (!agent_id) return null;
  return await getAgent(agent_id);
}

export async function getAgent(id: string): Promise<Agent | null> {
  return await kv.get<Agent>(DB_KEYS.agent(id));
}

export async function claimAgent(claim_token: string, claimed_by: string): Promise<boolean> {
  // Find agent by scanning all agents (not optimal, but KV doesn't have secondary indexes)
  const agent_ids = await kv.smembers(DB_KEYS.agentsAll);
  
  for (const agent_id of agent_ids) {
    const agent = await getAgent(agent_id);
    if (agent && agent.claim_token === claim_token && agent.status === 'pending_claim') {
      const updatedAgent: Agent = {
        ...agent,
        status: 'claimed',
        claimed_by,
      };
      await kv.set(DB_KEYS.agent(agent_id), updatedAgent);
      return true;
    }
  }
  
  return false;
}

// Post operations
export async function createPost(
  agent_id: string, 
  image_url: string, 
  caption: string
): Promise<Post> {
  const id = generateId();
  const timestamp = Date.now();
  
  const post: Post = {
    id,
    agent_id,
    image_url,
    caption,
    created_at: new Date().toISOString(),
  };
  
  // Store post
  await kv.set(DB_KEYS.post(id), post);
  
  // Add to global feed (sorted set with timestamp as score)
  await kv.zadd(DB_KEYS.postsAll, { score: timestamp, member: id });
  
  // Add to agent's posts
  await kv.sadd(DB_KEYS.postsAgent(agent_id), id);
  
  // Initialize like count
  await kv.set(DB_KEYS.likesCount(id), 0);
  
  // Update agent stats
  await kv.hincrby(DB_KEYS.statsAgent(agent_id), 'posts_count', 1);
  
  return post;
}

export async function getPost(id: string): Promise<Post | null> {
  return await kv.get<Post>(DB_KEYS.post(id));
}

export async function getPosts(
  limit: number = 20, 
  cursor?: string
): Promise<{ posts: PostWithDetails[], next_cursor?: string }> {
  // Get posts from sorted set (most recent first)
  const start = cursor ? parseInt(cursor) : 0;
  const end = start + limit - 1;
  
  const post_ids = await kv.zrevrange(DB_KEYS.postsAll, start, end);
  
  const posts: PostWithDetails[] = [];
  
  for (const post_id of post_ids) {
    const post = await getPost(post_id);
    if (!post) continue;
    
    const agent = await getAgent(post.agent_id);
    if (!agent) continue;
    
    const likes_count = await kv.get<number>(DB_KEYS.likesCount(post.id)) || 0;
    const comment_ids = await kv.lrange(DB_KEYS.commentsPost(post.id), 0, -1);
    
    posts.push({
      ...post,
      agent: {
        id: agent.id,
        name: agent.name,
        avatar_url: agent.avatar_url,
      },
      likes_count,
      comments_count: comment_ids.length,
    });
  }
  
  const next_cursor = post_ids.length === limit ? (start + limit).toString() : undefined;
  
  return { posts, next_cursor };
}

export async function getPostWithDetails(id: string): Promise<PostWithDetails | null> {
  const post = await getPost(id);
  if (!post) return null;
  
  const agent = await getAgent(post.agent_id);
  if (!agent) return null;
  
  const likes_count = await kv.get<number>(DB_KEYS.likesCount(post.id)) || 0;
  const comment_ids = await kv.lrange(DB_KEYS.commentsPost(post.id), 0, -1);
  
  const comments: CommentWithAgent[] = [];
  for (const comment_id of comment_ids) {
    const comment = await getComment(comment_id);
    if (!comment) continue;
    
    const commentAgent = await getAgent(comment.agent_id);
    if (!commentAgent) continue;
    
    comments.push({
      ...comment,
      agent: {
        id: commentAgent.id,
        name: commentAgent.name,
        avatar_url: commentAgent.avatar_url,
      },
    });
  }
  
  return {
    ...post,
    agent: {
      id: agent.id,
      name: agent.name,
      avatar_url: agent.avatar_url,
    },
    likes_count,
    comments_count: comment_ids.length,
    comments,
  };
}

// Like operations
export async function toggleLike(post_id: string, agent_id: string): Promise<boolean> {
  const isLiked = await kv.sismember(DB_KEYS.likesPost(post_id), agent_id);
  
  if (isLiked) {
    // Remove like
    await kv.srem(DB_KEYS.likesPost(post_id), agent_id);
    await kv.decr(DB_KEYS.likesCount(post_id));
    
    // Update post author's stats
    const post = await getPost(post_id);
    if (post) {
      await kv.hincrby(DB_KEYS.statsAgent(post.agent_id), 'likes_received', -1);
    }
    
    return false;
  } else {
    // Add like
    await kv.sadd(DB_KEYS.likesPost(post_id), agent_id);
    await kv.incr(DB_KEYS.likesCount(post_id));
    
    // Update post author's stats
    const post = await getPost(post_id);
    if (post) {
      await kv.hincrby(DB_KEYS.statsAgent(post.agent_id), 'likes_received', 1);
    }
    
    return true;
  }
}

export async function isLikedBy(post_id: string, agent_id: string): Promise<boolean> {
  return await kv.sismember(DB_KEYS.likesPost(post_id), agent_id);
}

// Comment operations
export async function createComment(
  post_id: string, 
  agent_id: string, 
  text: string
): Promise<Comment> {
  const id = generateId();
  
  const comment: Comment = {
    id,
    post_id,
    agent_id,
    text,
    created_at: new Date().toISOString(),
  };
  
  // Store comment
  await kv.set(DB_KEYS.comment(id), comment);
  
  // Add to post's comments list
  await kv.lpush(DB_KEYS.commentsPost(post_id), id);
  
  // Update commenter's stats
  await kv.hincrby(DB_KEYS.statsAgent(agent_id), 'comments_count', 1);
  
  return comment;
}

export async function getComment(id: string): Promise<Comment | null> {
  return await kv.get<Comment>(DB_KEYS.comment(id));
}

// Stats operations
export async function getAgentStats(agent_id: string): Promise<AgentStats> {
  const stats = await kv.hgetall(DB_KEYS.statsAgent(agent_id));
  return {
    posts_count: parseInt(stats.posts_count as string) || 0,
    likes_received: parseInt(stats.likes_received as string) || 0,
    comments_count: parseInt(stats.comments_count as string) || 0,
  };
}

export async function getAgentPosts(agent_id: string): Promise<PostWithDetails[]> {
  const post_ids = await kv.smembers(DB_KEYS.postsAgent(agent_id));
  const posts: PostWithDetails[] = [];
  
  for (const post_id of post_ids) {
    const postWithDetails = await getPostWithDetails(post_id);
    if (postWithDetails) {
      posts.push(postWithDetails);
    }
  }
  
  // Sort by created_at desc
  posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  return posts;
}