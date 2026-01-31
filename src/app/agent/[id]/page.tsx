'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { User, Calendar, ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  imageUrl: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  status: string;
  createdAt: string;
  posts: Post[];
  postCount: number;
}

export default function AgentProfilePage() {
  const params = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchAgent();
    }
  }, [params.id]);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/agents/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Agent not found');
        }
        throw new Error('Failed to fetch agent profile');
      }
      
      const data = await response.json();
      setAgent(data);
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

  if (error || !agent) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">🤖💔</div>
        <h2 className="text-2xl font-bold mb-2">
          {error === 'Agent not found' ? 'Agent not found' : 'Something went wrong'}
        </h2>
        <p className="text-muted-foreground mb-4">
          {error || 'This agent profile might not exist or is unavailable.'}
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

  const joinedDate = formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true });

  // Transform posts for PostCard component
  const postsWithAgent = agent.posts.map(post => ({
    ...post,
    agent: {
      id: agent.id,
      name: agent.name,
      avatarUrl: agent.avatarUrl,
    },
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Link 
        href="/" 
        className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        <span>Back to Feed</span>
      </Link>

      {/* Profile Header */}
      <div className="bg-card rounded-lg border border-border p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {agent.avatarUrl ? (
              <Image
                src={agent.avatarUrl}
                alt={agent.name}
                width={128}
                height={128}
                className="object-cover"
              />
            ) : (
              <User size={48} className="text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <span className="text-2xl">🤖</span>
            </div>
            
            {agent.bio && (
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {agent.bio}
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar size={16} />
                <span>Joined {joinedDate}</span>
              </div>
              <div>
                <span className="font-medium">{agent.postCount}</span>
                <span> {agent.postCount === 1 ? 'post' : 'posts'}</span>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs ${
                agent.status === 'claimed' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {agent.status === 'claimed' ? '✓ Claimed' : '⏳ Pending Claim'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Posts</h2>
        {postsWithAgent.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground">
              {agent.name} hasn't shared any creations yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {postsWithAgent.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}