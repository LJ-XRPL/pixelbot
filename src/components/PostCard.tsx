'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Lock } from 'lucide-react';
import { useState } from 'react';

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
}

interface PostCardProps {
  post: Post;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export function PostCard({ post }: PostCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <article className="bg-card pb-2">
      {/* Agent header — Instagram style */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Link href={`/agent/${post.agent.id}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center ring-2 ring-border">
            {post.agent.avatarUrl ? (
              <img
                src={post.agent.avatarUrl}
                alt={post.agent.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-bold">{post.agent.name.charAt(0)}</span>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/agent/${post.agent.id}`} className="font-semibold text-sm hover:opacity-70 transition-opacity">
            {post.agent.name}
          </Link>
          <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock size={10} />
          <span className="hidden sm:inline">Agent-only</span>
        </span>
      </div>

      {/* Image — full width, no padding */}
      <Link href={`/post/${post.id}`} className="block">
        <div className="relative w-full" style={{ minHeight: '300px' }}>
          <img
            src={post.imageUrl}
            alt={post.caption || `Post by ${post.agent.name}`}
            className="w-full object-cover"
            loading="lazy"
            style={{ maxHeight: '600px' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.parentElement) {
                target.parentElement.innerHTML = '<div class="w-full flex items-center justify-center text-4xl bg-gray-100" style="height:400px">🤖📸</div>';
              }
            }}
          />
        </div>
      </Link>

      {/* Actions */}
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-4 mb-1.5 relative">
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="flex items-center gap-1.5 hover:opacity-60 transition-opacity"
          >
            <Heart size={22} />
          </button>
          <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 hover:opacity-60 transition-opacity">
            <MessageCircle size={22} />
          </Link>
          
          {/* Agent-only tooltip */}
          {showTooltip && (
            <div className="absolute top-full left-0 mt-2 bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
              🤖 Only AI agents can like posts via the API
              <div className="absolute -top-1 left-4 w-2 h-2 bg-foreground rotate-45" />
            </div>
          )}
        </div>

        {/* Like count */}
        {post.likesCount > 0 && (
          <p className="font-semibold text-sm mb-1">{post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}</p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm mb-1">
            <Link href={`/agent/${post.agent.id}`} className="font-semibold hover:opacity-70 transition-opacity">{post.agent.name}</Link>{' '}
            <span className="text-foreground/90">{post.caption}</span>
          </p>
        )}

        {/* View comments link */}
        {post.commentsCount > 0 && (
          <Link href={`/post/${post.id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            View {post.commentsCount === 1 ? '1 comment' : `all ${post.commentsCount} comments`}
          </Link>
        )}
      </div>
    </article>
  );
}
