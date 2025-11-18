# Semantic Tensegrities

**An Speculative Theory of Synthetic Meaning**

A generative installation exploring computational linguistics, semantic relationships, and the concept of semantic tensegrity - how meaning emerges from the structural tension and compression between words, concepts, and relationships.

Powered by OpenAI Realtime model (GPT-4o) and OpenAI TTS, designed in p5.js.

Concept and development by [Marlon Barrios Solano](https://marlonbarrios.github.io/)

## 🌐 Live App

**Experience the installation:** [https://semantic-tensegrities.vercel.app/](https://semantic-tensegrities.vercel.app/)

The live application is hosted on Vercel and ready to use. Simply visit the link above to start exploring semantic relationships through interactive network visualizations.

## Concept

**Semantic Tensegrities** is an interactive installation that visualizes language as a network of semantic relationships. The work explores how meaning emerges from the structural tension and compression between words, concepts, and relationships - similar to how tensegrity structures maintain integrity through balanced forces.

The installation generates texts about computational linguistics, probability distributions, language models, and semantic analysis. These texts are then visualized as dynamic networks where words become nodes connected by semantic relationships, creating a living, pulsating visualization of meaning.

## Features

### Multi-Language Support
- **30 Languages Available**: English, Spanish, French, German, Italian, Portuguese, Japanese, Chinese, Korean, Arabic, Turkish, Croatian, Serbian, Russian, Hindi, Dutch, Polish, Swedish, Norwegian, Danish, Finnish, Greek, Hebrew, Vietnamese, Indonesian, Thai, Czech, Romanian, Hungarian, Bulgarian
- **Language Menu**: Dropdown menu on the landing page (top right) to select your preferred language
- **Fully Translated Interface**: All UI elements, instructions, loading animations, and generated content adapt to the selected language
- **Language-Aware Network**: Word extraction and visualization work correctly for all languages, including CJK characters, Arabic, Cyrillic, and Turkish
- **Language-Aware Ticker**: Ticker direction adapts to language (LTR for most, RTL for Arabic, vertical for CJK languages)
- **Language-Aware System Prompts**: System prompts reflect on grammatical structures, morphological systems, and writing systems specific to each language
- **Language-Specific Generation**: Text generation uses native system prompts and generation prompts for each language, ensuring culturally and linguistically appropriate content
- **Loading Animation**: Animated loading words appear in the selected language during text generation
- **Mobile-Adapted Instructions**: Instructions automatically adapt for mobile devices (tap instead of click, pinch to zoom, etc.)

### Text Generation
- **Automatic Generation Cycle**: Once started, the system automatically generates new texts when the previous one finishes being read
- **Varied Prompts**: Each generation uses different starting prompts to ensure variety
- **Word-Based Generation**: Click on any word in the network to generate new text exploring that concept
- **Semantic Tensegrity Focus**: All generated texts explore computational linguistics and semantic relationships

### Network Visualization
- **Dynamic Word Network**: Words are visualized as nodes connected by semantic relationships
- **Auto-Highlighting**: Network relationships automatically highlight, cycling through nodes every second
- **Pulsating Animation**: Nodes and edges pulse with life, creating an organic, living visualization
- **Floating Movement**: Words float with complex multi-frequency oscillations for dynamic, organic movement
- **Interactive Exploration**: Hover over nodes to see relationships, click and drag to explore the network
- **Semantic Clustering**: Words are positioned based on their semantic relationships (language, space, latent dimensions)
- **Ensured Connectivity**: All nodes are guaranteed to be connected in the network visualization
- **Collapse Animation**: Clicking a word triggers a playful collapse animation where all words converge to a point
- **Network Birth**: New networks emerge from the center with a gradual, organic birth animation
- **Thinking Indicator**: A floating "thinking" word appears when spacebar is pressed, pulsating throughout the experience

### Audio Experience
- **OpenAI Text-to-Speech**: Generated texts are read aloud using OpenAI's TTS API with natural-sounding voices (tts-1-hd model)
- **Voice Selection**: Dropdown menu to select from available OpenAI TTS voices (alloy, echo, fable, onyx, nova, shimmer)
- **Heartbeat Drone**: Heartbeat sound activated only when spacebar is pressed, creating an ambient atmosphere
- **Bouncing Sound**: Sound effect plays when the network first appears
- **Collapse Sound**: "Whoosh" sound effect plays when words collapse
- **Automatic Reading**: Text is automatically read when generated, synchronized with the ticker display
- **Single Voice Playback**: System ensures only one voice plays at a time, preventing overlapping audio
- **Sound Toggle**: Icon button to mute/unmute all sounds
- **Sound Control**: All sounds stop when home button is pressed or system is reset

### Visual Elements
- **Ticker Display**: Scrolling text shows the text being spoken (only visible when voice is active)
  - Horizontal scrolling (right to left) for most languages
  - Right-to-left scrolling for Arabic and Hebrew
  - Vertical scrolling (bottom to top) for Japanese, Chinese, and Korean
- **Loading Animation**: Animated word network appears during first text generation with words in the selected language (language, space, latent, network, semantic, dimension, embedding, vector, meaning, text, navigation, technology)
- **Membrane**: Organic, pulsing membrane surrounds the network visualization, creating a boundary that breathes with the semantic structure
- **Auto-Zoom**: Network automatically zooms to fit the screen when first generated
- **Dark/Light Mode**: Toggle between light and dark color schemes (top left button)
- **Smooth Transitions**: Seamless transitions between generations

### Interaction
- **Spacebar**: Press spacebar to start/reset the system and begin automatic generation cycle (also activates heartbeat sound)
- **Mobile**: Tap anywhere on the landing page to start on mobile devices
- **Word Clicking**: Click on any word in the network to generate new text based on that concept (stops auto-generation and triggers collapse animation)
- **Network Navigation**: 
  - **Desktop**: Click and drag to pan, scroll to zoom, hover to see relationships
  - **Mobile**: Drag to pan, pinch to zoom, tap words to see relationships
- **Language Selection**: Use the dropdown menu on the landing page (top right) to select your language
- **Voice Selection**: Use the voice dropdown menu (next to language menu, top right) to select your preferred TTS voice
- **Sound Toggle**: Click the sound icon button (top right) to mute/unmute all sounds
- **Home Button**: Click the home button (top right, when network is visible) to return to landing page and stop all generation/sound
- **Dark/Light Mode**: Toggle between color schemes using the button in the top left

## Setup

### Prerequisites
- Node.js (version 16 or later recommended)
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd entropic2_haiku-mondrian
```

2. Install dependencies:
```bash
npm install
```

3. Set your OpenAI API key:
   - Create a `.env` file in the root directory
   - Add your OpenAI API key: `VITE_OPENAI_KEY=your_api_key_here`
   - Or set it directly in `sketch.js` (for local development only)

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173/`

## How to Use

### Getting Started
1. **Select Language**: Use the dropdown menu on the top right of the landing page to select your preferred language
2. **Toggle Theme** (optional): Use the dark/light mode button in the top left to switch color schemes
3. **Start Generation**: Press the **SPACEBAR** to begin the automatic generation cycle (this also activates the heartbeat sound)
4. **Watch and Listen**: The system will generate text, visualize it as a network, and read it aloud automatically

### During Generation
- **Loading Animation**: Animated words appear in your selected language while text is being generated
- **Network Visualization**: Once generated, words appear as a pulsating network with semantic relationships
- **Automatic Reading**: The text is automatically read aloud, and the ticker scrolls at the bottom

### Interaction
- **Explore Network**: Move your mouse over words to see their relationships highlighted
- **Click Words**: Click on any word to generate new text exploring that concept (this stops auto-generation)
- **Navigate**: Click and drag to pan the network, scroll to zoom in/out
- **Return Home**: Click the home button (top right) to return to the landing page and stop all generation/sound
- **Reset**: Press spacebar again to reset the system and start fresh

### Auto-Generation
- Once started with spacebar, the system automatically generates new texts when the current one finishes being read
- This creates a continuous cycle of generation → visualization → reading → generation
- Clicking a word stops auto-generation and generates text based on that word instead

## Technologies Used

- **p5.js**: Creative coding framework for visualization and interaction
- **OpenAI Realtime Model (GPT-4o)**: Advanced language model for text generation
- **OpenAI TTS API**: Text-to-speech for natural voice reading
- **Web Audio API**: Sound synthesis for heartbeat and effects
- **Vite**: Development server and build tool

## Technical Details

### Network Visualization
- Words are extracted from generated text using language-aware parsing
- Semantic vectors position words in 2D space based on conceptual relationships
- Edges connect words based on semantic similarity, conceptual relationships, and proximity
- Physics simulation creates organic movement and interaction

### Language Support
- **30 Languages**: Full support for English, Spanish, French, German, Italian, Portuguese, Japanese, Chinese, Korean, Arabic, Turkish, Croatian, Serbian, Russian, Hindi, Dutch, Polish, Swedish, Norwegian, Danish, Finnish, Greek, Hebrew, Vietnamese, Indonesian, Thai, Czech, Romanian, Hungarian, Bulgarian
- **Latin Scripts**: English, Spanish, French, German, Italian, Portuguese, Croatian, Dutch, Polish, Swedish, Norwegian, Danish, Finnish, Czech, Romanian, Hungarian, Vietnamese, Indonesian use Unicode word patterns
- **Cyrillic Scripts**: Serbian, Russian, Bulgarian use Cyrillic script with proper character handling
- **CJK Scripts**: Japanese, Chinese, and Korean use character-based extraction with optimized handling to prevent system overload
- **RTL Scripts**: Arabic, Hebrew use right-to-left text direction with appropriate ticker scrolling
- **Complex Scripts**: Hindi, Thai use proper character handling for complex writing systems
- **Agglutinative Languages**: Turkish, Finnish, Hungarian support with proper word boundary detection
- **Stop Words**: Language-specific stop word filtering for cleaner visualizations
- **Frequency Calculation**: Accurate word frequency counting for all language types
- **CJK Optimization**: Limited node and edge counts for CJK languages to maintain browser performance
- **Mobile Detection**: Automatic detection of mobile devices with adapted instructions and interactions
- **Complete Translations**: All 30 languages have full UI translations, system prompts, and generation prompts for native-language text generation

### Audio System
- Heartbeat sound uses Web Audio API with sine wave oscillators
- OpenAI TTS provides natural-sounding voice synthesis
- Audio context management ensures proper playback on user interaction
- Automatic audio cleanup when new generation starts
- Voice playback protection prevents simultaneous voice playback
- Proper cleanup and disconnection of audio sources when stopping
- Error handling for audio playback failures

## Customization

You can customize various aspects of the installation:

- **System Prompts**: Modify the system prompts in `getSystemPrompt()` to change the style and focus of generated texts
- **Generation Prompts**: Adjust the prompt variations in `getGenerationPrompts()` for different text styles
- **Network Parameters**: Tune physics constants, spring strengths, and visual effects in `visualizeNetwork()`
- **Audio Settings**: Adjust heartbeat frequency, volume, and TTS voice settings
- **Visual Styling**: Modify colors, fonts, sizes, and animation parameters throughout the code

## Contributing

Contributions are welcome! Whether you're:
- Adding new language support
- Improving network visualization
- Enhancing audio experiences
- Fixing bugs
- Adding new features

Please feel free to fork the repository and submit pull requests.

## License

MIT License

Copyright (c) 2024 Marlon Barrios Solano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
