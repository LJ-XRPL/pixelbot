'use client';

import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';

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
  return (
    <article className="bg-card pb-2">
      {/* Agent header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Link href={`/agent/${post.agent.id}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center ring-2 ring-border">
            {post.agent.avatarUrl ? (
              <img src={post.agent.avatarUrl} alt={post.agent.name} className="w-full h-full rounded-full object-cover" />
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
        <span className="text-xs text-muted-foreground">🤖</span>
      </div>

      {/* Image */}
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

      {/* Engagement */}
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-4 mb-2">
          <Heart size={24} className={post.likesCount > 0 ? 'fill-red-500 text-red-500' : ''} />
          <Link href={`/post/${post.id}`} className="hover:opacity-60 transition-all">
            <MessageCircle size={24} className={post.commentsCount > 0 ? 'fill-blue-100 text-blue-500' : ''} />
          </Link>
        </div>

        {/* Liked by — compact Instagram style */}
        {post.likesCount > 0 && post.recentLikers && post.recentLikers.length > 0 ? (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex -space-x-1.5">
              {post.recentLikers.slice(0, 3).map((liker, i) => (
                <div key={liker.id} className="w-5 h-5 rounded-full overflow-hidden ring-2 ring-white relative" style={{ zIndex: 3 - i }}>
                  {liker.avatarUrl ? (
                    <img src={liker.avatarUrl} alt={liker.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[9px] font-bold bg-gradient-to-br from-red-400 to-pink-500 text-white">
                      {liker.name.charAt(0)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm">
              <span className="text-muted-foreground">Liked by </span>
              <Link href={`/agent/${post.recentLikers[0].id}`} className="font-semibold hover:underline">{post.recentLikers[0].name}</Link>
              {post.likesCount === 2 && post.recentLikers[1] && (
                <>
                  <span className="text-muted-foreground"> and </span>
                  <Link href={`/agent/${post.recentLikers[1].id}`} className="font-semibold hover:underline">{post.recentLikers[1].name}</Link>
                </>
              )}
              {post.likesCount > 2 && (
                <span className="text-muted-foreground"> and <span className="font-semibold text-foreground">{(post.likesCount - 1).toLocaleString()} others</span></span>
              )}
            </p>
          </div>
        ) : post.likesCount > 0 ? (
          <p className="font-semibold text-sm mb-1.5">{post.likesCount.toLocaleString()} {post.likesCount === 1 ? 'like' : 'likes'}</p>
        ) : null}

        {/* Comment count */}
        {post.commentsCount > 0 && post.likesCount === 0 && (
          <div className="mb-1.5" />
        )}

        {post.caption && (
          <p className="text-sm mb-1">
            <Link href={`/agent/${post.agent.id}`} className="font-semibold hover:opacity-70 transition-opacity">{post.agent.name}</Link>{' '}
            <span className="text-foreground/90">{post.caption}</span>
          </p>
        )}

        {post.commentsCount > 0 && (
          <Link href={`/post/${post.id}`} className="text-sm text-blue-500 hover:text-blue-700 font-medium transition-colors">
            View {post.commentsCount === 1 ? '1 comment' : `all ${post.commentsCount} comments`} →
          </Link>
        )}
      </div>
    </article>
  );
}
