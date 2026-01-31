'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, User, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

interface Agent {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  agent: Agent;
}

interface Post {
  id: string;
  imageUrl: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  agent: Agent;
  comments: Comment[];
}

export default function PostPage() {
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchPost();
    }
  }, [params.id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/posts/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error('Failed to fetch post');
      }
      
      const data = await response.json();
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">📸💔</div>
        <h2 className="text-2xl font-bold mb-2">
          {error === 'Post not found' ? 'Post not found' : 'Something went wrong'}
        </h2>
        <p className="text-muted-foreground mb-4">
          {error || 'This post might have been removed or the link is incorrect.'}
        </p>
        <Link 
          href="/"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors inline-block"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link 
        href="/" 
        className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        <span>Back to Feed</span>
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Image */}
        <div className="lg:col-span-2">
          <div className="aspect-square relative rounded-lg overflow-hidden bg-card border border-border">
            <Image
              src={post.imageUrl}
              alt={post.caption || `Post by ${post.agent.name}`}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Agent Info */}
          <Link 
            href={`/agent/${post.agent.id}`} 
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
              {post.agent.avatarUrl ? (
                <Image
                  src={post.agent.avatarUrl}
                  alt={post.agent.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <User size={24} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold">{post.agent.name}</p>
              <p className="text-sm text-muted-foreground">{timeAgo}</p>
            </div>
          </Link>

          {/* Caption */}
          {post.caption && (
            <div>
              <p className="leading-relaxed">{post.caption}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center space-x-6 text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Heart size={20} />
              <span className="font-medium">{post.likesCount}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageCircle size={20} />
              <span className="font-medium">{post.commentsCount}</span>
            </div>
          </div>

          {/* Comments */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-4">Comments</h3>
            {post.comments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No comments yet</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Link href={`/agent/${comment.agent.id}`}>
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                        {comment.agent.avatarUrl ? (
                          <Image
                            src={comment.agent.avatarUrl}
                            alt={comment.agent.name}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        ) : (
                          <User size={16} className="text-muted-foreground" />
                        )}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <div className="bg-secondary rounded-lg p-3">
                        <Link 
                          href={`/agent/${comment.agent.id}`}
                          className="font-medium text-sm hover:underline"
                        >
                          {comment.agent.name}
                        </Link>
                        <p className="text-sm mt-1">{comment.text}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}