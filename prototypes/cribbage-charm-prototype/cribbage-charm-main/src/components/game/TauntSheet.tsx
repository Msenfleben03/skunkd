import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playerTaunts } from '@/engine/trashTalk';

const GIPHY_KEY = 'dc6zaTOxFJmzC';
const CATEGORIES = ['cribbage', 'card game', 'celebration', 'trash talk', 'loser', 'winner'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSendTaunt: (text: string) => void;
  onSendGif: (url: string) => void;
}

export function TauntSheet({ open, onClose, onSendTaunt, onSendGif }: Props) {
  const [tab, setTab] = useState<'taunts' | 'gifs'>('taunts');
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=9&rating=pg`
      );
      const d = await r.json();
      setGifs(d.data || []);
    } catch {
      setGifs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && tab === 'gifs' && gifs.length === 0) search('card game');
  }, [open, tab]);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="bg-card border-border max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-foreground font-display">Trash Talk 🎤</SheetTitle>
        </SheetHeader>

        <div className="flex gap-2 mt-3 mb-3">
          <Button size="sm" variant={tab === 'taunts' ? 'default' : 'outline'}
            onClick={() => setTab('taunts')}>Taunts</Button>
          <Button size="sm" variant={tab === 'gifs' ? 'default' : 'outline'}
            onClick={() => setTab('gifs')}>GIFs</Button>
        </div>

        {tab === 'taunts' && (
          <div className="grid grid-cols-1 gap-1.5 max-h-[45vh] overflow-y-auto pb-4">
            {playerTaunts.map((t, i) => (
              <button key={i} onClick={() => { onSendTaunt(t); onClose(); }}
                className="text-left px-3 py-2.5 rounded-lg bg-muted hover:bg-accent text-sm text-foreground transition-colors">
                {t}
              </button>
            ))}
          </div>
        )}

        {tab === 'gifs' && (
          <div className="pb-4">
            <div className="flex gap-2 mb-2">
              <Input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search GIFs..." className="bg-muted text-foreground"
                onKeyDown={e => e.key === 'Enter' && search(query)} />
              <Button size="sm" onClick={() => search(query)}>🔍</Button>
            </div>
            <div className="flex gap-1 flex-wrap mb-3">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => { setQuery(c); search(c); }}
                  className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-accent transition-colors capitalize">
                  {c}
                </button>
              ))}
            </div>
            {loading && <p className="text-center text-muted-foreground text-sm py-4">Loading…</p>}
            <div className="grid grid-cols-3 gap-1.5 max-h-[35vh] overflow-y-auto">
              {gifs.map((g: any) => (
                <button key={g.id} onClick={() => { onSendGif(g.images.fixed_height.url); onClose(); }}
                  className="rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all">
                  <img src={g.images.fixed_height_small.url} alt="" className="w-full h-auto" loading="lazy" />
                </button>
              ))}
            </div>
            {!loading && gifs.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">No GIFs found</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
