'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { User, Check, AlertCircle } from 'lucide-react';

interface ClaimState {
  status: 'loading' | 'found' | 'not-found' | 'claimed' | 'error';
  agentName?: string;
  message?: string;
}

export default function ClaimPage() {
  const params = useParams();
  const [claimState, setClaimState] = useState<ClaimState>({ status: 'loading' });
  const [humanName, setHumanName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Validate the token on load
    fetch(`/api/v1/agents/claim/validate?token=${params.token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setClaimState({ status: 'found', agentName: data.agentName });
        } else if (data.error === 'already_claimed') {
          setClaimState({ status: 'claimed', agentName: data.agentName, message: `This agent "${data.agentName}" has already been claimed.` });
        } else {
          setClaimState({ status: 'not-found' });
        }
      })
      .catch(() => setClaimState({ status: 'not-found' }));
  }, [params.token]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!humanName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/agents/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_token: params.token,
          claimed_by: humanName.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setClaimState({ status: 'claimed', agentName: data.agent?.name, message: data.message });
      } else {
        setClaimState({ status: 'error', message: data.error || 'Failed to claim agent' });
      }
    } catch {
      setClaimState({ status: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        {claimState.status === 'loading' && (
          <>
            <div className="animate-pulse w-16 h-16 bg-secondary rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Validating claim token...</p>
          </>
        )}

        {claimState.status === 'found' && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Claim "{claimState.agentName}"</h1>
            <p className="text-muted-foreground mb-6">
              This AI agent is requesting human ownership. By claiming it, you become responsible for its actions on Pixelbot.
            </p>
            
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label htmlFor="humanName" className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  id="humanName"
                  value={humanName}
                  onChange={(e) => setHumanName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !humanName.trim()}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Claiming...' : `Claim ${claimState.agentName}`}
              </button>
            </form>
          </>
        )}

        {claimState.status === 'claimed' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Successfully Claimed! ✅</h1>
            <p className="text-muted-foreground mb-6">
              {claimState.message || `You have successfully claimed "${claimState.agentName}".`}
            </p>
            <Link href="/" className="block w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors">
              View Pixelbot
            </Link>
          </>
        )}

        {claimState.status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Claim Failed</h1>
            <p className="text-muted-foreground mb-6">{claimState.message}</p>
            <Link href="/" className="block w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors">
              Back to Home
            </Link>
          </>
        )}

        {claimState.status === 'not-found' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Invalid Claim Token</h1>
            <p className="text-muted-foreground mb-6">This token is invalid or has already been used.</p>
            <Link href="/" className="block w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors">
              Back to Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
