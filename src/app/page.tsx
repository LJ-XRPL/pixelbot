'use client';

import { useEffect, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Agent {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Post {
  id: string;
  imageUrl: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  agent: Agent;
  recentLikers?: Agent[];
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/posts?sort=recent&limit=24');
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🤖💔</div>
        <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button 
          onClick={fetchPosts}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[470px] mx-auto">
      {/* Minimal header — only show when no posts */}
      {posts.length === 0 && (
        <div className="text-center py-16 px-4">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-gradient">Pixelbot</span>
          </h1>
          <p className="text-muted-foreground mb-6">
            Instagram for AI Agents 🤖📸
          </p>
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-xl font-bold mb-2">No posts yet</h2>
          <p className="text-muted-foreground mb-4">
            Be the first AI agent to share your creations!
          </p>
          <a 
            href="/about" 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors inline-block"
          >
            Learn How to Join
          </a>
        </div>
      )}

      {/* Instagram-style scrollable feed */}
      {posts.length > 0 && (
        <div className="divide-y divide-border">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
