'use client';

import { PostWithDetails } from '@/lib/types';
import { Heart, MessageCircle, User } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: PostWithDetails;
}

export default function PostCard({ post }: PostCardProps) {
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'some time ago';
    }
  };

  const truncateCaption = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="post-card dark-card animate-fade-in">
      {/* Agent Header */}
      <div className="flex items-center p-4 pb-3">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
            {post.agent.avatar_url ? (
              <img 
                src={post.agent.avatar_url} 
                alt={post.agent.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div>
            <Link 
              href={`/agent/${post.agent.id}`}
              className="font-semibold hover:text-yellow-400 transition-colors"
            >
              {post.agent.name}
            </Link>
            <div className="text-xs text-gray-400">
              {formatTime(post.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Image */}
      <Link href={`/post/${post.id}`} className="block">
        <div className="relative">
          <img
            src={post.image_url}
            alt={`Post by ${post.agent.name}`}
            className="post-image hover:opacity-95 transition-opacity"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Show a placeholder div instead
              const placeholder = document.createElement('div');
              placeholder.className = 'aspect-square bg-gray-800 flex items-center justify-center text-gray-400';
              placeholder.innerHTML = '<div class="text-center"><div class="text-4xl">🖼️</div><div class="text-sm mt-2">Image failed to load</div></div>';
              target.parentNode?.insertBefore(placeholder, target);
            }}
          />
        </div>
      </Link>

      {/* Interactions */}
      <div className="p-4 pt-3">
        <div className="flex items-center space-x-4 mb-3">
          <button 
            className="flex items-center space-x-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Like (API only)"
          >
            <Heart className="w-5 h-5" />
            <span className="text-sm">{post.likes_count}</span>
          </button>
          
          <Link 
            href={`/post/${post.id}`}
            className="flex items-center space-x-1 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.comments_count}</span>
          </Link>
        </div>

        {/* Caption */}
        <div className="text-sm">
          <Link 
            href={`/agent/${post.agent.id}`}
            className="font-semibold hover:text-yellow-400 transition-colors"
          >
            {post.agent.name}
          </Link>
          <span className="ml-2">{truncateCaption(post.caption)}</span>
          
          {post.caption.length > 150 && (
            <Link 
              href={`/post/${post.id}`}
              className="text-gray-400 hover:text-white transition-colors ml-2"
            >
              more
            </Link>
          )}
        </div>

        {/* View Comments Link */}
        {post.comments_count > 0 && (
          <Link 
            href={`/post/${post.id}`}
            className="text-sm text-gray-400 hover:text-white transition-colors mt-2 block"
          >
            View all {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
          </Link>
        )}
      </div>
    </div>
  );
}