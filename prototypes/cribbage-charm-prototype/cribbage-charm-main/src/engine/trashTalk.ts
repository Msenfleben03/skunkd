const lines: Record<string, string[]> = {
  aiBigHand: [
    "Read 'em and weep! Suckling himself would applaud!",
    "That's how a REAL card shark plays! 🦈",
    "I'd say sorry, but Sir John never apologized either.",
    "My grandma learned that one on a submarine!",
    "Even the USS Wahoo crew would tip their caps! 🎖️",
    "Ka-CHING! That's what £20,000 in 1630 looks like! 💰",
    "They don't call me Muggins for nothing!",
    "Is it hot in here or is it just my hand? 🔥",
    "Noddy called — it wants its dignity back.",
  ],
  aiZero: [
    "Well, THAT was embarrassing… even for a poet's descendant.",
    "Let's pretend that never happened. Like Suckling's coup attempt.",
    "I've got nineteen! …Wait, that means zero. Blast.",
    "I blame the dealer. Oh wait, that's me.",
    "My cards are staging a mutiny. Very un-Navy of them.",
    "Zero?! I demand a recount! Call the muggins rule!",
    "The cards have forsaken me worse than Parliament forsook Suckling.",
    "I've seen better hands on a clock.",
  ],
  playerBigHand: [
    "Beginner's luck, obviously. Suckling dealt from marked decks.",
    "Don't get used to it, sport. The house always wins.",
    "Okay okay — even a squirrel finds a nut sometimes.",
    "I wasn't even trying. Ask any Cavalier — it's called style.",
    "Lucky break. The starter giveth, the starter taketh away.",
    "Well aren't YOU fancy. Real Terry Francona energy.",
    "Impressive. Now do it 216,579 more times for the 29.",
    "I'll allow it… this once. Don't push your luck, pone.",
  ],
  playerZero: [
    "HAHAHAHA! Nineteen points! Classic you! 🤣",
    "Maybe cards aren't your thing? Sir John would be embarrassed.",
    "Goose egg! My favorite! That's worse than five-card cribbage!",
    "I've seen better plays from a drunk Cavalier poet.",
    "Zero! You're making this too easy! Left in the lurch!",
    "Don't quit your day job. Stick to dominoes.",
    "Is that your final answer? Because WOW. Skunky. 🦨",
    "The look on your face right now… priceless. Streets behind!",
  ],
  aiTakesLead: [
    "See ya at the finish line! I'm streets ahead! 🏃‍♂️",
    "I'm coming for that 121! Level pegging is SO last hand!",
    "Front runner coming through! Beep beep! 🚗💨",
    "Dust. Eating it. That's you, pone.",
    "The Theory of 26 says you're behind schedule!",
  ],
  playerTakesLead: [
    "Enjoy the view up there. It won't last.",
    "I'm lulling you into a false sense of security. Classic Suckling move.",
    "The comeback will be LEGENDARY. Like O'Kane on the Tang!",
    "Leading? How quaint. Don't count your pegs before they're pegged!",
    "Remember: first dealer wins 56% of the time. Math is on my side.",
  ],
  hisHeels: [
    "His Heels! Two for me, baby! 👢 Named after the Jack's actual heels!",
    "Jack starter! Two for his heels! That's dealer's privilege since 1630!",
    "Well well well — the Jack shows his heels! Two points, me!",
  ],
  skunkWarning: [
    "Skunk territory! Can you smell that? 🦨 Below 91 is a SKUNK!",
    "Looking a little skunky over there… double stakes in tournament play!",
    "Better pick up the pace or you're getting SKUNKED! It's in the rules since 1674!",
    "You're in the stinkhole zone! Even Charles Dickens would wince!",
  ],
  twentyNine: [
    "TWENTY-NINE?! The perfect hand! That's 1 in 216,580! I've been ROBBED!",
    "The legendary 29! J-5-5-5 with the matching five! Call the ACC — you're in Club 29!",
    "Just like O'Kane on the USS Wahoo! Someone frame those cards! 🎖️",
  ],
  aiWins: [
    "Better luck next time, pone! 🏆 Muggins McGee reigns supreme!",
    "GG EZ. Sir John Suckling smiles from beyond! Want a rematch?",
    "Muggins McGee strikes again! That's how we do it since 1630!",
    "Don't feel bad. I learned from a 400-year lineage of cheaters.",
    "I'd like to thank the crib… and my ancestor's marked decks.",
  ],
  playerWins: [
    "I let you win. Obviously. Very Cavalier of me.",
    "Rematch. NOW. Sir John demands satisfaction!",
    "This isn't over… the pone always has the advantage in close games! 😤",
    "You won the battle, not the war! 9 deals is a long game!",
    "Fine. Take your victory. But I've still got the board on my submarine. 🎖️",
  ],
  retorts: [
    "Oh, you think you're funny? Suckling was funnier. And he was a POET.",
    "Talk is cheap. Cards don't lie. Unlike Sir John's marked decks.",
    "Keep talking. I'll keep scoring. That's the muggins way.",
    "Is that the best you've got? My grandmother plays crib on a submarine.",
    "Cute. Real cute. Now watch me peg out.",
    "Bold words for someone about to get pegged. Since 1630, baby.",
    "You kiss your mother with that mouth? Very un-Navy.",
    "I'm rubber, you're glue. And you're about to be left in the lurch.",
  ],
};

export const playerTaunts = [
  "Is that all you've got, Muggins? Sir John would be ashamed!",
  "My grandmother plays better — and she learned on a submarine!",
  "Prepare to get PEGGED! 400 years of tradition! 🔩",
  "Muggins? More like SLUGGINS! Even Noddy was faster!",
  "I could win this blindfolded! Like O'Kane in the Yellow Sea!",
  "Your crib smells like defeat and skunk! 🦨",
  "Did you learn from Cotton's Compleat Gamester? The BAD edition?",
  "Keep dealing. I'll keep winning. Streets ahead!",
  "You couldn't score in a pub with no gambling license!",
  "121 here I come! First to peg out wins! 🚀",
  "I've got nineteen! …Oh wait, that's YOUR score! 😂",
  "Even Dickens wrote better hands than yours!",
];

export function getTrashTalk(trigger: string): string {
  const pool = lines[trigger];
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRetort(): string {
  return lines.retorts[Math.floor(Math.random() * lines.retorts.length)];
}
