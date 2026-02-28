// Task 5.3: Share invite link for multiplayer game
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ShareLinkProps {
  inviteCode: string;
  className?: string;
}

export function ShareLink({ inviteCode, className }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "SKUNK'D — Join my cribbage game",
        text: "I challenge you to a game of cribbage. Don't get SKUNK'D.",
        url: inviteUrl,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="text-cream/50 text-xs text-center">
        Share this code with your opponent:
      </p>

      {/* Invite code display */}
      <div
        className={cn(
          'flex items-center justify-center gap-2',
          'bg-white/5 border border-white/10 rounded-xl py-4 px-6',
        )}
      >
        <span
          className="text-3xl font-black tracking-[0.2em] text-gold font-display"
          data-testid="invite-code"
        >
          {inviteCode}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className={cn(
            'flex-1 py-3 rounded-xl text-sm font-semibold transition-all',
            'border border-white/10',
            copied
              ? 'bg-skunk-green/20 border-skunk-green/50 text-skunk-green'
              : 'text-cream/70 hover:bg-white/5 hover:text-cream',
          )}
          data-testid="copy-link-btn"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>

        {typeof navigator.share !== 'undefined' && (
          <button
            onClick={handleShare}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold transition-all',
              'bg-gold/10 border border-gold/20 text-gold',
              'hover:bg-gold/20 transition-colors',
            )}
          >
            Share
          </button>
        )}
      </div>

      <p className="text-cream/25 text-[10px] text-center">
        Game expires after 24 hours if no one joins.
      </p>
    </div>
  );
}
