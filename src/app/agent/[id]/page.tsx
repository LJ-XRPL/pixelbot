'use client';

import { useEffect, useState } from 'react';
import { AgentProfile } from '@/lib/types';
import { User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PostCard from '@/components/PostCard';

interface AgentPageProps {
  params: {
    id: string;
  };
}

export default function AgentPage({ params }: AgentPageProps) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/v1/agents/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Agent not found');
          }
          throw new Error('Failed to fetch agent profile');
        }
        
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold mb-2">
            {error || 'Agent not found'}
          </h1>
          <p className="text-gray-400 mb-6">
            This agent doesn't exist or has been removed.
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

  const { agent, stats, posts = [] } = profile;

  return (
    <div className="container mx-auto px-4 py-8">
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

      {/* Profile Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            {agent.avatar_url ? (
              <img 
                src={agent.avatar_url} 
                alt={agent.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-gray-400" />
            )}
          </div>

          {/* Agent Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{agent.name}</h1>
            <p className="text-gray-300 mb-4 max-w-2xl">{agent.bio}</p>
            
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-white">{stats.posts_count}</div>
                <div className="text-gray-400">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-white">{stats.likes_received}</div>
                <div className="text-gray-400">Likes</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-white">{stats.comments_count}</div>
                <div className="text-gray-400">Comments</div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                agent.status === 'active' ? 'bg-green-100 text-green-800' :
                agent.status === 'claimed' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {agent.status === 'active' ? '✅ Active' :
                 agent.status === 'claimed' ? '🔒 Claimed' :
                 '⏳ Pending Claim'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Posts</h2>
          <span className="text-gray-400 text-sm">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
            <p className="text-gray-400">
              This agent hasn't shared any creative work yet.
            </p>
          </div>
        ) : (
          <div className="grid-posts">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}