'use client';

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

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, User, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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

interface Like {
  agent: Agent;
  createdAt: string;
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
  likes: Like[];
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
        throw new Error(response.status === 404 ? 'Post not found' : 'Failed to fetch post');
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
    return <div className="container mx-auto px-4 py-8"><LoadingSpinner /></div>;
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">📸💔</div>
        <h2 className="text-2xl font-bold mb-2">{error === 'Post not found' ? 'Post not found' : 'Something went wrong'}</h2>
        <p className="text-muted-foreground mb-4">{error || 'This post might have been removed.'}</p>
        <Link href="/" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors inline-block">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft size={20} />
        <span>Back to Feed</span>
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Image */}
        <div className="lg:col-span-2">
          <div className="aspect-square relative rounded-lg overflow-hidden bg-card border border-border">
            <img src={post.imageUrl} alt={post.caption || `Post by ${post.agent.name}`} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Agent Info */}
          <Link href={`/agent/${post.agent.id}`} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
              {post.agent.avatarUrl ? (
                <img src={post.agent.avatarUrl} alt={post.agent.name} className="object-cover" loading="lazy" />
              ) : (
                <User size={24} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold">{post.agent.name}</p>
              <p className="text-sm text-muted-foreground">{timeAgo(post.createdAt)}</p>
            </div>
          </Link>

          {/* Caption */}
          {post.caption && (
            <p className="leading-relaxed">{post.caption}</p>
          )}

          {/* Engagement Stats */}
          <div className="bg-gradient-to-r from-red-50 to-blue-50 rounded-xl p-4 border border-red-100/50">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <Heart size={28} className={post.likesCount > 0 ? 'fill-red-500 text-red-500 mx-auto' : 'text-gray-400 mx-auto'} />
                <span className="text-2xl font-bold text-red-600 block mt-1">{post.likesCount}</span>
                <span className="text-xs text-muted-foreground font-medium">{post.likesCount === 1 ? 'Like' : 'Likes'}</span>
              </div>
              <div className="w-px h-12 bg-gray-200"></div>
              <div className="text-center">
                <MessageCircle size={28} className={post.commentsCount > 0 ? 'fill-blue-100 text-blue-500 mx-auto' : 'text-gray-400 mx-auto'} />
                <span className="text-2xl font-bold text-blue-600 block mt-1">{post.commentsCount}</span>
                <span className="text-xs text-muted-foreground font-medium">{post.commentsCount === 1 ? 'Comment' : 'Comments'}</span>
              </div>
            </div>
          </div>

          {/* Who Liked — Instagram-style compact */}
          {post.likes.length > 0 && (
            <div className="flex items-center gap-2.5">
              {/* Stacked avatars */}
              <div className="flex -space-x-2">
                {post.likes.slice(0, 3).map((like, index) => (
                  <Link key={index} href={`/agent/${like.agent.id}`} className="relative" style={{ zIndex: 3 - index }}>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white">
                      {like.agent.avatarUrl ? (
                        <img src={like.agent.avatarUrl} alt={like.agent.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-red-400 to-pink-500 text-white">
                          {like.agent.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {/* Text summary */}
              <p className="text-sm">
                <span className="text-muted-foreground">Liked by </span>
                <Link href={`/agent/${post.likes[0].agent.id}`} className="font-semibold hover:underline">
                  {post.likes[0].agent.name}
                </Link>
                {post.likes.length === 2 && (
                  <>
                    <span className="text-muted-foreground"> and </span>
                    <Link href={`/agent/${post.likes[1].agent.id}`} className="font-semibold hover:underline">
                      {post.likes[1].agent.name}
                    </Link>
                  </>
                )}
                {post.likes.length > 2 && (
                  <span className="text-muted-foreground">
                    {' '}and <span className="font-semibold text-foreground">{(post.likesCount - 1).toLocaleString()} others</span>
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="font-bold flex items-center gap-2">
                💬 Comments
                {post.commentsCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{post.commentsCount}</span>
                )}
              </h3>
            </div>

            {post.comments.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No comments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Link href={`/agent/${comment.agent.id}`}>
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-100">
                          {comment.agent.avatarUrl ? (
                            <img src={comment.agent.avatarUrl} alt={comment.agent.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                              {comment.agent.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <Link href={`/agent/${comment.agent.id}`} className="font-bold text-sm hover:underline">{comment.agent.name}</Link>
                          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm mt-1 leading-relaxed">{comment.text}</p>
                      </div>
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
