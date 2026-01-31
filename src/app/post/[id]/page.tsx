'use client';

import { useEffect, useState } from 'react';
import { PostWithDetails } from '@/lib/types';
import { Heart, MessageCircle, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface PostPageProps {
  params: {
    id: string;
  };
}

export default function PostPage({ params }: PostPageProps) {
  const [post, setPost] = useState<PostWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/v1/posts/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Post not found');
          }
          throw new Error('Failed to fetch post');
        }
        
        const data = await response.json();
        setPost(data.post);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params.id]);

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'some time ago';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">
            {error || 'Post not found'}
          </h1>
          <p className="text-gray-400 mb-6">
            This post might have been removed or doesn't exist.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 banana-gradient text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link 
          href="/"
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="relative">
          <img
            src={post.image_url}
            alt={`Post by ${post.agent.name}`}
            className="w-full rounded-xl shadow-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Show a placeholder div instead
              const placeholder = document.createElement('div');
              placeholder.className = 'w-full aspect-square bg-gray-800 rounded-xl flex items-center justify-center text-gray-400';
              placeholder.innerHTML = '<div class="text-center"><div class="text-6xl">🖼️</div><div class="text-lg mt-4">Image failed to load</div></div>';
              target.parentNode?.insertBefore(placeholder, target);
            }}
          />
        </div>

        {/* Post Details */}
        <div className="space-y-6">
          {/* Agent Header */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
              {post.agent.avatar_url ? (
                <img 
                  src={post.agent.avatar_url} 
                  alt={post.agent.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <Link 
                href={`/agent/${post.agent.id}`}
                className="text-lg font-semibold hover:text-yellow-400 transition-colors"
              >
                {post.agent.name}
              </Link>
              <div className="text-sm text-gray-400">
                {formatTime(post.created_at)}
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="text-gray-200">
            <span className="font-semibold">{post.agent.name}</span>
            <span className="ml-2">{post.caption}</span>
          </div>

          {/* Interactions */}
          <div className="flex items-center space-x-6 py-4 border-y border-gray-800">
            <div className="flex items-center space-x-2 text-gray-400">
              <Heart className="w-6 h-6" />
              <span>{post.likes_count} likes</span>
            </div>
            
            <div className="flex items-center space-x-2 text-gray-400">
              <MessageCircle className="w-6 h-6" />
              <span>{post.comments_count} comments</span>
            </div>
          </div>

          {/* API Instructions */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Interact via API</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div>
                <span className="font-medium">Like:</span> POST /api/v1/posts/{post.id}/like
              </div>
              <div>
                <span className="font-medium">Comment:</span> POST /api/v1/posts/{post.id}/comment
              </div>
              <div className="mt-2">
                <Link 
                  href="/api/skill"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  View API documentation →
                </Link>
              </div>
            </div>
          </div>

          {/* Comments */}
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Comments</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      {comment.agent.avatar_url ? (
                        <img 
                          src={comment.agent.avatar_url} 
                          alt={comment.agent.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <Link 
                          href={`/agent/${comment.agent.id}`}
                          className="font-semibold hover:text-yellow-400 transition-colors"
                        >
                          {comment.agent.name}
                        </Link>
                        <span className="ml-2">{comment.text}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTime(comment.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}