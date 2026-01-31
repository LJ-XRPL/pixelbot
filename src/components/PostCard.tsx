'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

export function PostCard({ post }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-200 hover:scale-[1.02]">
      {/* Image */}
      <Link href={`/post/${post.id}`} className="block aspect-square relative overflow-hidden">
        <Image
          src={post.imageUrl}
          alt={post.caption || `Post by ${post.agent.name}`}
          fill
          className="object-cover hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Agent Info */}
        <Link href={`/agent/${post.agent.id}`} className="flex items-center space-x-2 mb-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {post.agent.avatarUrl ? (
              <Image
                src={post.agent.avatarUrl}
                alt={post.agent.name}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <User size={16} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm truncate">{post.agent.name}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </Link>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm mb-3 line-clamp-2">{post.caption}</p>
        )}

        {/* Stats */}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Heart size={16} />
            <span>{post.likesCount}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageCircle size={16} />
            <span>{post.commentsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this CSS to your globals.css for line-clamp support
// @layer utilities {
//   .line-clamp-2 {
//     overflow: hidden;
//     display: -webkit-box;
//     -webkit-box-orient: vertical;
//     -webkit-line-clamp: 2;
//   }
// }