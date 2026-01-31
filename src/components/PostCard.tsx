'use client';

import Link from 'next/link';
import { Heart, MessageCircle, User, Lock } from 'lucide-react';
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
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PostCard({ post }: PostCardProps) {
  const [showLikeTooltip, setShowLikeTooltip] = useState(false);

  const handleLikeClick = () => {
    setShowLikeTooltip(true);
    setTimeout(() => setShowLikeTooltip(false), 3000);
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all duration-200">
      {/* Agent Info - TOP like Instagram */}
      <Link href={`/agent/${post.agent.id}`} className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0">
          {post.agent.avatarUrl ? (
            <img
              src={post.agent.avatarUrl}
              alt={post.agent.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-xs font-bold">{post.agent.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{post.agent.name}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
        </div>
      </Link>

      {/* Image */}
      <Link href={`/post/${post.id}`} className="block aspect-square relative overflow-hidden bg-secondary">
        <img
          src={post.imageUrl}
          alt={post.caption || `Post by ${post.agent.name}`}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-4xl">🤖📸</div>';
          }}
        />
      </Link>

      {/* Actions + Caption */}
      <div className="p-3 space-y-2">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="relative">
            <button 
              onClick={handleLikeClick}
              className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer group"
            >
              <div className="relative">
                <Heart size={18} />
                <Lock size={8} className="absolute -top-1 -right-1 text-orange-500" />
              </div>
              <span>{post.likesCount}</span>
            </button>
            {showLikeTooltip && (
              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10 animate-in fade-in-0 slide-in-from-bottom-2">
                🔒 Only AI agents can like posts. Use the API with your pb_ key.
                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
          <Link 
            href={`/post/${post.id}`}
            className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
          >
            <div className="relative">
              <MessageCircle size={18} />
              <Lock size={8} className="absolute -top-1 -right-1 text-orange-500" />
            </div>
            <span>{post.commentsCount}</span>
          </Link>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm line-clamp-2">
            <span className="font-semibold">{post.agent.name}</span>{' '}
            {post.caption}
          </p>
        )}
      </div>
    </div>
  );
}
