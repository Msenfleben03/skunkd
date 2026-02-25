# **Cribbage: Get Pegged\! \- Development Report**

## **Implementation Overview**

This artifact implements a full-featured single-player Cribbage game using React. The application is contained within a single file (App.jsx) to ensure portability and stability within the preview environment, now featuring advanced Large Language Model (LLM) integrations via the Gemini API.

### **Core Features Implemented**

1. **Game Engine**: A custom state machine manages the complex flow of Cribbage phases:  
   * DEALING \-\> DISCARD \-\> CUT \-\> PEGGING \-\> SHOW \-\> RESET  
   * Implements the "Show" sequence correctly: Non-dealer \-\> Dealer \-\> Crib.  
   * Robust "Go" handling correctly awards points and resets the count when neither player can play without exceeding 31\.  
2. **Scoring System**: A robust scoring function (scoreHand and scorePegging) calculates points for:  
   * Fifteens (using combinatorial subset sums)  
   * Pairs, Pairs Royal, Double Pairs Royal  
   * Runs (including complex multipliers for overlapping sequences)  
   * Flushes (differentiating between Hand and Crib rules)  
   * Nobs and His Heels  
3. **Gemini AI Integrations (LLM Features)**:  
   * **Dynamic Personas**: Players can choose their opponent before the game (e.g., *The Shark*, *Blackbeard*, *Sir John*, or *Grandma*). The AI dynamically adjusts its tone to match the selection.  
   * **Strategic Hints (✨ Hint)**: During the discard phase, players can ask the AI for advice. Gemini evaluates the 6-card hand and crib ownership to recommend the best 2 cards to discard, responding in the active persona's voice.  
   * **Cribbage Coach (✨ Explain Score)**: During the "Show" phase, Gemini can generate a step-by-step mathematical breakdown of how a hand scored its points, helping new players learn the complex scoring rules.  
   * **Dynamic Trash Talk**: The AI reacts to game events (big hands, lucky cuts) with context-aware, PG-13 insults or brags generated on the fly.  
   * **Match Recap**: At the end of the game, Gemini generates an energetic, 1920s sports-radio style commentary summarizing the victory or defeat.  
4. **Visual Interface**:  
   * **Aesthetic**: "Retro Card Room" theme with felt green textures, wood accents, and gold highlights.  
   * **Realistic SVG Cribbage Board**: Replaced the simplified progress bar with a fully rendered, auto-scrolling wooden cribbage board. It features 121 holes, skunk/double-skunk lines, and animated leapfrogging pegs for both players.  
   * **Animations**: CSS transitions handle card fanning, pegging pile placement, and smooth phase changes.

### **Technical Details**

* **State Management**: useReducer handles the complex game state transitions, ensuring atomic updates for scoring, turn-passing, and phase changes.  
* **LLM Architecture**: Uses the gemini-2.5-flash-preview model via the generateContent API with a built-in exponential backoff retry system to ensure reliable text generation.  
* **Asset Generation**: All visual assets (cards, chips, avatars, wooden board) are generated natively using CSS gradients, inline SVGs, and Lucide React icons to avoid external image dependencies.

### **Known Constraints & Future Improvements**

* **Animation Fidelity**: While highly functional, card animations use simple CSS transforms. A physics-based library (like framer-motion) would provide smoother dealing arcs in a production build.  
* **AI Depth (Gameplay)**: The current AI uses heuristics for card playing/discarding. A future version could implement MCTS (Monte Carlo Tree Search) for "perfect" mathematical play.  
* **Audio**: Sound effects are currently stubbed out for this visual prototype.

### **How to Play**

1. **Select Persona**: Choose your AI opponent to set the flavor of the game.  
2. **Start**: Click "Deal Cards" to begin the hand.  
3. **Discard**: Tap 2 cards to select them for the crib. (Use "✨ Hint" if you need help\!). Tap "Send to Crib".  
4. **Cut**: Tap "Cut Deck" to reveal the starter card.  
5. **Pegging**: Tap cards in your hand to play them. Try to hit exactly 15 or 31\. Use the "GO" button if you cannot legally play a card.  
6. **The Show**: Click "Next" to step through the hand counting phase. (Use "✨ Explain Score" to see the math breakdown).  
7. **Win**: First to 121 points wins instantly\!