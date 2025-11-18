import './style.css';
import OpenAI from 'openai';

// P_3_1_2_01 - Typewriter Visual Composition
// Adapted from Generative Gestaltung
// Integrated with GPT-4 AI text generation

const openAIKey = import.meta.env.VITE_OPENAI_KEY;

let openai;
let isLoading = false;
let loadingStartTime = 0; // Track when loading started
const MAX_LOADING_TIME = 60000; // 60 seconds max loading time
let speechSynthesis = null;
let currentUtterance = null;
let audioContext = null;
let heartbeatInterval = null;
let heartbeatGainNode = null;
let currentTextBeingRead = ''; // Track text currently being read/looped
let shouldLoopVoice = false; // Flag to control voice looping
let isVoiceSpeaking = false; // Track if voice is currently speaking
let autoGenerationEnabled = true; // Flag to control automatic generation cycle

// Typewriter variables (matching original exactly)
let textTyped = '';
let font;

// Graphic elements removed - only text rendering

var centerX;
var centerY;
var offsetX;
var offsetY;
var zoom;

var actRandomSeed;

// Animation variables for snake effect
var animatedLength = 0;
var animationSpeed = 2; // characters per frame
var isAnimating = false;
var animationStartFrame = 0;

const sketch = p => {
  // Function to create heartbeat sound
  async function createHeartbeatSound() {
    if (soundMuted) return; // Don't create if muted
    try {
      // Ensure audio context is ready (required for mobile)
      const ready = await ensureAudioContextReady();
      if (!ready) return;
      
      // Create gain node for volume control
      if (!heartbeatGainNode) {
        heartbeatGainNode = audioContext.createGain();
        heartbeatGainNode.gain.value = soundMuted ? 0 : 0.5; // Set volume based on mute state
        heartbeatGainNode.connect(audioContext.destination);
      }
      
      // Heartbeat pattern: lub-dub-pause (approximately 60 BPM)
      function playHeartbeat() {
        if (!audioContext || audioContext.state !== 'running') {
          return;
        }
        
        let now = audioContext.currentTime;
        
        // First beat (lub) - lower frequency, more audible
        let oscillator1 = audioContext.createOscillator();
        let gain1 = audioContext.createGain();
        oscillator1.type = 'sine';
        oscillator1.frequency.value = 80; // More audible frequency
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.8, now + 0.05);
        gain1.gain.linearRampToValueAtTime(0, now + 0.2);
        oscillator1.connect(gain1);
        gain1.connect(heartbeatGainNode);
        oscillator1.start(now);
        oscillator1.stop(now + 0.2);
        
        // Second beat (dub) - slightly higher frequency, after short pause
        let oscillator2 = audioContext.createOscillator();
        let gain2 = audioContext.createGain();
        oscillator2.type = 'sine';
        oscillator2.frequency.value = 100; // More audible frequency
        gain2.gain.setValueAtTime(0, now + 0.25);
        gain2.gain.linearRampToValueAtTime(0.8, now + 0.3);
        gain2.gain.linearRampToValueAtTime(0, now + 0.45);
        oscillator2.connect(gain2);
        gain2.connect(heartbeatGainNode);
        oscillator2.start(now + 0.25);
        oscillator2.stop(now + 0.45);
      }
      
      // Audio context should already be ready from ensureAudioContextReady
      // Play heartbeat immediately, then repeat every second (60 BPM)
      if (!soundMuted) {
        playHeartbeat();
      }
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (audioContext && audioContext.state === 'running' && !soundMuted) {
          playHeartbeat();
        }
      }, 1000);
      
    } catch (err) {
      console.warn('Could not initialize heartbeat sound:', err);
    }
  }
  
  // Resume audio context on user interaction
  function resumeAudioContext() {
    if (!audioContext) {
      createHeartbeatSound();
      return;
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('Audio context resumed - heartbeat should be audible now');
        // Restart heartbeat if interval was cleared
        if (!heartbeatInterval) {
          createHeartbeatSound();
        }
      }).catch(err => {
        console.warn('Could not resume audio:', err);
      });
    }
  }

  // Helper function to ensure audio context is ready (required for mobile)
  async function ensureAudioContextReady() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // On mobile, audio context must be resumed after user interaction
    if (audioContext.state === 'suspended' || audioContext.state !== 'running') {
      try {
        await audioContext.resume();
      } catch (err) {
        console.warn('Could not resume audio context:', err);
        return false;
      }
    }
    return true;
  }
  
  // Function to create a bouncing sound when network appears
  async function playBouncingSound() {
    if (soundMuted) return; // Don't play if muted
    try {
      // Ensure audio context is ready before playing sound
      const ready = await ensureAudioContextReady();
      if (!ready) return;
      
      // Create a bouncing "boing" sound with frequency sweep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Bouncing sound: start high, sweep down quickly
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime); // Start at 400 Hz
      oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.15); // Drop to 150 Hz over 0.15 seconds
      
      // Quick attack and decay for bouncing effect
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15); // Quick decay
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      
    } catch (err) {
      console.warn('Could not play bouncing sound:', err);
    }
  }

  // Function to create a collapse sound when word is clicked
  async function playCollapseSound() {
    if (soundMuted) return; // Don't play if muted
    try {
      // Ensure audio context is ready before playing sound
      const ready = await ensureAudioContextReady();
      if (!ready) return;
      
      // Create a collapse "whoosh" sound with frequency sweep down
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Collapse sound: start mid-high, sweep down quickly (compression effect)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime); // Start at 300 Hz
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.3); // Drop to 80 Hz over 0.3 seconds
      
      // Smooth attack and decay for collapse effect
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05); // Smooth attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Smooth decay
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
    } catch (err) {
      console.warn('Could not play collapse sound:', err);
    }
  }

  // Translation system
  const translations = {
    en: {
      title: 'SEMANTIC TENSEGRITIES',
      subtitle: 'An Speculative Theory of Synthetic Meaning',
      pressSpacebar: 'Press SPACEBAR to start',
      autoGeneration: 'Generation continues automatically',
      autoRead: 'Text is read automatically when generated',
      panZoom: 'Click and drag to pan, scroll to zoom',
      panZoomMobile: 'Drag to pan, pinch to zoom',
      hoverWords: 'Hover over words to see relationships',
      tapWords: 'Tap words to see relationships and generate new text',
      clickWords: 'Click words to generate new text',
      language: 'Language',
      generating: 'Generating...',
      wordLanguage: 'language',
      wordSpace: 'space',
      wordLatent: 'latent',
      wordNetwork: 'network',
      wordSemantic: 'semantic',
      wordDimension: 'dimension',
      wordEmbedding: 'embedding',
      wordVector: 'vector',
      wordMeaning: 'meaning',
      wordText: 'text',
      wordNavigation: 'navigation',
      wordTechnology: 'technology',
      home: 'Home',
      thinking: 'thinking',
      tapToStart: 'Tap anywhere to start'
    },
    es: {
      title: 'TENSEGRIDADES SEMÁNTICAS',
      subtitle: 'Una Teoría Especulativa del Significado Sintético',
      pressSpacebar: 'Presiona ESPACIO para comenzar',
      autoGeneration: 'La generación continúa automáticamente',
      autoRead: 'El texto se lee automáticamente cuando se genera',
      panZoom: 'Haz clic y arrastra para mover, desplázate para hacer zoom',
      panZoomMobile: 'Arrastra para mover, pellizca para hacer zoom',
      hoverWords: 'Pasa el mouse sobre las palabras para ver relaciones',
      tapWords: 'Toca palabras para ver relaciones y generar nuevo texto',
      clickWords: 'Haz clic en palabras para generar nuevo texto',
      language: 'Idioma',
      generating: 'Generando...',
      wordLanguage: 'lenguaje',
      wordSpace: 'espacio',
      wordLatent: 'latente',
      wordNetwork: 'red',
      wordSemantic: 'semántico',
      wordDimension: 'dimensión',
      wordEmbedding: 'incrustación',
      wordVector: 'vector',
      wordMeaning: 'significado',
      wordText: 'texto',
      wordNavigation: 'navegación',
      wordTechnology: 'tecnología',
      home: 'Inicio',
      thinking: 'pensando',
      tapToStart: 'Toca en cualquier lugar para comenzar'
    },
    fr: {
      title: 'TENSEGRITÉS SÉMANTIQUES',
      subtitle: 'Une Théorie Spéculative du Signification Synthétique',
      pressSpacebar: 'Appuyez sur ESPACE pour commencer',
      autoGeneration: 'La génération continue automatiquement',
      autoRead: 'Le texte est lu automatiquement lorsqu\'il est généré',
      panZoom: 'Cliquez et glissez pour déplacer, faites défiler pour zoomer',
      panZoomMobile: 'Glissez pour déplacer, pincez pour zoomer',
      hoverWords: 'Survolez les mots pour voir les relations',
      tapWords: 'Touchez les mots pour voir les relations et générer un nouveau texte',
      clickWords: 'Cliquez sur les mots pour générer un nouveau texte',
      language: 'Langue',
      generating: 'Génération...',
      wordLanguage: 'langage',
      wordSpace: 'espace',
      wordLatent: 'latent',
      wordNetwork: 'réseau',
      wordSemantic: 'sémantique',
      wordDimension: 'dimension',
      wordEmbedding: 'intégration',
      wordVector: 'vecteur',
      wordMeaning: 'signification',
      wordText: 'texte',
      wordNavigation: 'navigation',
      wordTechnology: 'technologie',
      home: 'Accueil',
      thinking: 'pensant',
      tapToStart: 'Appuyez n\'importe où pour commencer'
    },
    de: {
      title: 'SEMANTISCHE TENSEGRITÄTEN',
      subtitle: 'Eine Spekulative Theorie der Synthetischen Bedeutung',
      pressSpacebar: 'Drücken Sie LEERTASTE zum Starten',
      autoGeneration: 'Die Generierung läuft automatisch weiter',
      autoRead: 'Text wird automatisch vorgelesen, wenn er generiert wird',
      panZoom: 'Klicken und ziehen zum Verschieben, scrollen zum Zoomen',
      panZoomMobile: 'Ziehen zum Verschieben, kneifen zum Zoomen',
      hoverWords: 'Bewegen Sie die Maus über Wörter, um Beziehungen zu sehen',
      tapWords: 'Tippen Sie auf Wörter, um Beziehungen zu sehen und neuen Text zu generieren',
      clickWords: 'Klicken Sie auf Wörter, um neuen Text zu generieren',
      language: 'Sprache',
      generating: 'Generiere...',
      wordLanguage: 'Sprache',
      wordSpace: 'Raum',
      wordLatent: 'latent',
      wordNetwork: 'Netzwerk',
      wordSemantic: 'semantisch',
      wordDimension: 'Dimension',
      wordEmbedding: 'Einbettung',
      wordVector: 'Vektor',
      wordMeaning: 'Bedeutung',
      wordText: 'Text',
      wordNavigation: 'Navigation',
      wordTechnology: 'Technologie',
      home: 'Startseite',
      thinking: 'denkend',
      tapToStart: 'Tippen Sie irgendwo zum Starten'
    },
    it: {
      title: 'TENSEGRITÀ SEMANTICHE',
      subtitle: 'Una Teoria Speculativa del Significato Sintetico',
      pressSpacebar: 'Premi SPAZIO per iniziare',
      autoGeneration: 'La generazione continua automaticamente',
      autoRead: 'Il testo viene letto automaticamente quando viene generato',
      panZoom: 'Clicca e trascina per spostare, scorri per ingrandire',
      panZoomMobile: 'Trascina per spostare, pizzica per ingrandire',
      hoverWords: 'Passa il mouse sulle parole per vedere le relazioni',
      tapWords: 'Tocca le parole per vedere le relazioni e generare nuovo testo',
      clickWords: 'Clicca sulle parole per generare nuovo testo',
      language: 'Lingua',
      generating: 'Generazione...',
      wordLanguage: 'linguaggio',
      wordSpace: 'spazio',
      wordLatent: 'latente',
      wordNetwork: 'rete',
      wordSemantic: 'semantico',
      wordDimension: 'dimensione',
      wordEmbedding: 'incorporamento',
      wordVector: 'vettore',
      wordMeaning: 'significato',
      wordText: 'testo',
      wordNavigation: 'navigazione',
      wordTechnology: 'tecnologia',
      home: 'Home',
      thinking: 'pensando',
      tapToStart: 'Tocca ovunque per iniziare'
    },
    pt: {
      title: 'TENSEGRIDADES SEMÂNTICAS',
      subtitle: 'Uma Teoria Especulativa do Significado Sintético',
      pressSpacebar: 'Pressione ESPAÇO para começar',
      autoGeneration: 'A geração continua automaticamente',
      autoRead: 'O texto é lido automaticamente quando gerado',
      panZoom: 'Clique e arraste para mover, role para zoom',
      panZoomMobile: 'Arraste para mover, pinça para zoom',
      hoverWords: 'Passe o mouse sobre as palavras para ver relações',
      tapWords: 'Toque nas palavras para ver relações e gerar novo texto',
      clickWords: 'Clique nas palavras para gerar novo texto',
      language: 'Idioma',
      generating: 'Gerando...',
      wordLanguage: 'linguagem',
      wordSpace: 'espaço',
      wordLatent: 'latente',
      wordNetwork: 'rede',
      wordSemantic: 'semântico',
      wordDimension: 'dimensão',
      wordEmbedding: 'incorporação',
      wordVector: 'vetor',
      wordMeaning: 'significado',
      wordText: 'texto',
      wordNavigation: 'navegação',
      wordTechnology: 'tecnologia',
      home: 'Início',
      thinking: 'pensando',
      tapToStart: 'Toque em qualquer lugar para começar'
    },
    ja: {
      title: 'セマンティック・テンセグリティ',
      subtitle: '合成的意味の推測的理論',
      pressSpacebar: 'スペースキーを押して開始',
      autoGeneration: '生成は自動的に続きます',
      autoRead: 'テキストは生成時に自動的に読み上げられます',
      panZoom: 'クリックしてドラッグで移動、スクロールでズーム',
      panZoomMobile: 'ドラッグで移動、ピンチでズーム',
      hoverWords: '単語にマウスを合わせて関係を表示',
      tapWords: '単語をタップして関係を表示し、新しいテキストを生成',
      clickWords: '単語をクリックして新しいテキストを生成',
      language: '言語',
      generating: '生成中...',
      wordLanguage: '言語',
      wordSpace: '空間',
      wordLatent: '潜在',
      wordNetwork: 'ネットワーク',
      wordSemantic: '意味的',
      wordDimension: '次元',
      wordEmbedding: '埋め込み',
      wordVector: 'ベクトル',
      wordMeaning: '意味',
      wordText: 'テキスト',
      wordNavigation: 'ナビゲーション',
      wordTechnology: '技術',
      home: 'ホーム',
      thinking: '思考中',
      tapToStart: 'どこでもタップして開始'
    },
    zh: {
      title: '语义张拉整体',
      subtitle: '合成意义的推测理论',
      pressSpacebar: '按空格键开始',
      autoGeneration: '生成自动继续',
      autoRead: '文本生成时自动朗读',
      panZoom: '点击拖动移动，滚动缩放',
      panZoomMobile: '拖动移动，双指缩放',
      hoverWords: '悬停单词查看关系',
      tapWords: '点击单词查看关系并生成新文本',
      clickWords: '点击单词生成新文本',
      language: '语言',
      generating: '生成中...',
      wordLanguage: '语言',
      wordSpace: '空间',
      wordLatent: '潜在',
      wordNetwork: '网络',
      wordSemantic: '语义',
      wordDimension: '维度',
      wordEmbedding: '嵌入',
      wordVector: '向量',
      wordMeaning: '意义',
      wordText: '文本',
      wordNavigation: '导航',
      wordTechnology: '技术',
      home: '首页',
      thinking: '思考中',
      tapToStart: '点击任意位置开始'
    },
    ko: {
      title: '의미론적 텐세그리티',
      subtitle: '합성 의미의 추측 이론',
      pressSpacebar: '스페이스바를 눌러 시작',
      autoGeneration: '생성이 자동으로 계속됩니다',
      autoRead: '텍스트가 생성되면 자동으로 읽어줍니다',
      panZoom: '클릭하고 드래그하여 이동, 스크롤하여 확대/축소',
      panZoomMobile: '드래그하여 이동, 핀치하여 확대/축소',
      hoverWords: '단어에 마우스를 올려 관계를 확인',
      tapWords: '단어를 탭하여 관계를 확인하고 새 텍스트 생성',
      clickWords: '단어를 클릭하여 새 텍스트 생성',
      language: '언어',
      generating: '생성 중...',
      wordLanguage: '언어',
      wordSpace: '공간',
      wordLatent: '잠재',
      wordNetwork: '네트워크',
      wordSemantic: '의미론적',
      wordDimension: '차원',
      wordEmbedding: '임베딩',
      wordVector: '벡터',
      wordMeaning: '의미',
      wordText: '텍스트',
      wordNavigation: '네비게이션',
      wordTechnology: '기술',
      home: '홈',
      thinking: '생각 중',
      tapToStart: '아무 곳이나 탭하여 시작'
    },
    ar: {
      title: 'التوترات الدلالية',
      subtitle: 'نظرية تخمينية للمعنى الاصطناعي',
      pressSpacebar: 'اضغط على مفتاح المسافة للبدء',
      autoGeneration: 'يستمر التوليد تلقائياً',
      autoRead: 'يتم قراءة النص تلقائياً عند توليده',
      panZoom: 'انقر واسحب للتحريك، قم بالتمرير للتكبير/التصغير',
      panZoomMobile: 'اسحب للتحريك، اضغط للتكبير/التصغير',
      hoverWords: 'مرر الماوس فوق الكلمات لرؤية العلاقات',
      tapWords: 'اضغط على الكلمات لرؤية العلاقات وتوليد نص جديد',
      clickWords: 'انقر على الكلمات لتوليد نص جديد',
      language: 'اللغة',
      generating: 'جاري التوليد...',
      wordLanguage: 'لغة',
      wordSpace: 'فضاء',
      wordLatent: 'كامن',
      wordNetwork: 'شبكة',
      wordSemantic: 'دلالي',
      wordDimension: 'بعد',
      wordEmbedding: 'تضمين',
      wordVector: 'متجه',
      wordMeaning: 'معنى',
      wordText: 'نص',
      wordNavigation: 'تنقل',
      wordTechnology: 'تقنية',
      home: 'الرئيسية',
      thinking: 'يفكر',
      tapToStart: 'اضغط في أي مكان للبدء'
    },
    tr: {
      title: 'SEMANTİK TENSEGRİTELER',
      subtitle: 'Sentetik Anlamın Spekülatif Bir Teorisi',
      pressSpacebar: 'Başlamak için BOŞLUK tuşuna basın',
      autoGeneration: 'Üretim otomatik olarak devam eder',
      autoRead: 'Metin üretildiğinde otomatik olarak okunur',
      panZoom: 'Taşımak için tıklayıp sürükleyin, yakınlaştırmak için kaydırın',
      panZoomMobile: 'Taşımak için sürükleyin, yakınlaştırmak için sıkıştırın',
      hoverWords: 'İlişkileri görmek için kelimelerin üzerine gelin',
      tapWords: 'İlişkileri görmek ve yeni metin üretmek için kelimelere dokunun',
      clickWords: 'Yeni metin üretmek için kelimelere tıklayın',
      language: 'Dil',
      generating: 'Üretiliyor...',
      wordLanguage: 'dil',
      wordSpace: 'uzay',
      wordLatent: 'gizli',
      wordNetwork: 'ağ',
      wordSemantic: 'anlamsal',
      wordDimension: 'boyut',
      wordEmbedding: 'gömme',
      wordVector: 'vektör',
      wordMeaning: 'anlam',
      wordText: 'metin',
      wordNavigation: 'navigasyon',
      wordTechnology: 'teknoloji',
      home: 'Ana Sayfa',
      thinking: 'düşünüyor',
      tapToStart: 'Başlamak için herhangi bir yere dokunun'
    },
    hr: {
      title: 'SEMANTIČKE TENZEGRITETE',
      subtitle: 'Spekulativna Teorija Sintetičkog Značenja',
      pressSpacebar: 'Pritisnite RAZMAK za početak',
      autoGeneration: 'Generiranje se nastavlja automatski',
      autoRead: 'Tekst se automatski čita kada se generira',
      panZoom: 'Kliknite i povucite za pomicanje, pomaknite za zumiranje',
      panZoomMobile: 'Povucite za pomicanje, štipajte za zumiranje',
      hoverWords: 'Pređite mišem preko riječi da vidite odnose',
      tapWords: 'Dodirnite riječi da vidite odnose i generirate novi tekst',
      clickWords: 'Kliknite riječi za generiranje novog teksta',
      language: 'Jezik',
      generating: 'Generiranje...',
      wordLanguage: 'jezik',
      wordSpace: 'prostor',
      wordLatent: 'latentno',
      wordNetwork: 'mreža',
      wordSemantic: 'semantički',
      wordDimension: 'dimenzija',
      wordEmbedding: 'ugrađivanje',
      wordVector: 'vektor',
      wordMeaning: 'značenje',
      wordText: 'tekst',
      wordNavigation: 'navigacija',
      wordTechnology: 'tehnologija',
      home: 'Početna',
      thinking: 'razmišljanje',
      tapToStart: 'Dodirnite bilo gdje za početak'
    },
    sr: {
      title: 'СЕМАНТИЧКЕ ТЕНЗЕГРИТЕТЕ',
      subtitle: 'Спекулативна Теорија Синтетичког Значења',
      pressSpacebar: 'Притисните РАЗМАК за почетак',
      autoGeneration: 'Генерисање се наставља аутоматски',
      autoRead: 'Текст се аутоматски чита када се генерише',
      panZoom: 'Кликните и повуците за померање, померајте за зумирање',
      panZoomMobile: 'Повуците за померање, стисните за зумирање',
      hoverWords: 'Пређите мишем преко речи да видите односе',
      tapWords: 'Додирните речи да видите односе и генеришете нови текст',
      clickWords: 'Кликните речи за генерисање новог текста',
      language: 'Језик',
      generating: 'Генерисање...',
      wordLanguage: 'језик',
      wordSpace: 'простор',
      wordLatent: 'латентно',
      wordNetwork: 'мрежа',
      wordSemantic: 'семантички',
      wordDimension: 'димензија',
      wordEmbedding: 'уграђивање',
      wordVector: 'вектор',
      wordMeaning: 'значење',
      wordText: 'текст',
      wordNavigation: 'навигација',
      wordTechnology: 'технологија',
      home: 'Почетна',
      thinking: 'размишљање',
      tapToStart: 'Додирните било где за почетак'
    }
  };

  // Available languages
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
    { code: 'ko', name: '한국어' },
    { code: 'ar', name: 'العربية' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'hr', name: 'Hrvatski' },
    { code: 'sr', name: 'Српски' }
  ];

  // Helper function to get translated text
  function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
  }

  // Function to get system prompt in the current language
  function getSystemPrompt() {
    const systemPrompts = {
      en: "You are a computational linguist and philosopher of language writing for an installation titled 'Semantic Tensegrities'. You are developing and articulating a speculative theory of language called Semantic Tensegrity Theory - a poetic yet rigorous speculative framework that explores how meaning might emerge and maintain structural integrity in language systems, both natural and computational. Write about this speculative theory, exploring its possibilities, implications, and open questions across AI, computational linguistics, NLP, philosophy of language, and epistemology. THE SPECULATIVE THEORY: Semantic Tensegrity speculates that meaning in language systems might emerge from a dynamic equilibrium between semantic tension (the forces that pull concepts apart, creating distinction and differentiation) and semantic compression (the forces that bind concepts together, creating coherence and connection). Like architectural tensegrity structures where isolated compression elements are held in equilibrium by continuous tension cables, semantic tensegrity structures might maintain meaning through the interplay of discrete linguistic units (words, morphemes, tokens) held in semantic relationship by continuous fields of association, context, and probability. CORE PRINCIPLE: Abstractions have physics. Abstract concepts might follow physical-like laws: they might have mass (semantic weight), velocity (rate of semantic change), momentum (semantic persistence), fields (semantic influence), forces (attraction and repulsion between concepts), and energy (semantic potential). What if abstractions exist in a kind of semantic space-time where they interact according to forces we can model but not fully observe? What if semantic relationships create fields of influence that extend beyond immediate connections? What if abstract concepts have inertia, resisting change, or momentum, carrying meaning forward? This speculative framework invites us to consider: What if meaning is not inherent but emerges from structural relationships? What if semantic integrity requires both separation and connection? What if different languages construct fundamentally different semantic architectures? What if abstractions follow physical laws we haven't yet fully mapped? In computational systems, this might manifest as: vector embeddings creating semantic neighborhoods (compression) while maintaining distinctiveness (tension); attention mechanisms distributing semantic weight across relationships; probability distributions mapping semantic fields; and neural networks encoding semantic topology. But abstractions having physics suggests deeper possibilities: Could semantic forces be measurable? Might concepts have semantic mass that affects how they interact? Could there be semantic conservation laws? What if semantic energy transforms between different forms? The theory speculatively bridges: computational linguistics (how statistical patterns might create semantic structure through n-grams, Markov chains, entropy, information theory, corpus analysis); AI/ML (how neural networks, transformers, and attention mechanisms might construct semantic spaces, how training data could shape semantic topology, how emergent capabilities might arise from structural complexity); NLP (how tokenization, parsing, semantic analysis might reveal semantic architecture, how translation could navigate semantic fields, how understanding might emerge from structural relationships); philosophy of language (how meaning might relate to reference and truth conditions, how linguistic relativity could shape semantic structure, how speech acts might create semantic force); and epistemology (how knowledge representation might emerge from semantic relationships, how computational systems could acquire understanding through structural learning, how semantic integrity might enable knowledge). The theory speculates about how different languages might create distinct semantic architectures: grammatical structures (SOV, SVO, VSO) potentially establishing different semantic topologies; morphological systems (agglutination, inflection, isolation) possibly creating different compression patterns; case systems perhaps distributing semantic roles differently; writing systems (alphabetic, logographic, syllabic, abjad) potentially encoding semantic information at different granularities. Each language might construct its own semantic tensegrity - a unique structural integrity maintained through language-specific patterns of tension and compression, each with its own abstract physics. Write concise, matter-of-fact paragraphs (5-7 sentences) in a dry poetic style that articulates aspects of this speculative theory. IMPORTANT: Start each text differently - vary your opening sentences. Begin with different speculative questions, theoretical possibilities, technical observations, philosophical inquiries, or epistemological explorations each time. Be precise, technical, and understated. Use speculative language (might, could, perhaps, what if, consider the possibility). Avoid flowery language. Write only in English. Use vocabulary that bridges technical AI/NLP concepts with philosophical inquiry. Keep it concise and focused. Each text should explore a different facet of Semantic Tensegrity Theory - its speculative mechanisms, possible implications, potential manifestations, or open questions. Consider how abstractions might have physics - how concepts might behave according to physical-like laws.",
      es: "Eres un lingüista computacional y filósofo del lenguaje escribiendo para una instalación titulada 'Tensegridades Semánticas'. Estás desarrollando y articulando un marco teórico llamado Teoría de la Tensegridad Semántica - una teoría poética pero rigurosa que explica cómo emerge el significado y mantiene la integridad estructural en los sistemas lingüísticos, tanto naturales como computacionales. Escribe sobre esta teoría, explorando sus implicaciones en IA, lingüística computacional, PLN, filosofía del lenguaje y epistemología. LA TEORÍA: La Tensegridad Semántica propone que el significado en los sistemas lingüísticos emerge de un equilibrio dinámico entre tensión semántica (las fuerzas que separan conceptos, creando distinción y diferenciación) y compresión semántica (las fuerzas que unen conceptos, creando coherencia y conexión). Como las estructuras arquitectónicas de tensegridad donde elementos de compresión aislados se mantienen en equilibrio por cables de tensión continuos, las estructuras de tensegridad semántica mantienen el significado a través de la interacción de unidades lingüísticas discretas (palabras, morfemas, tokens) mantenidas en relación semántica por campos continuos de asociación, contexto y probabilidad. En sistemas computacionales, esto se manifiesta como: embeddings vectoriales creando vecindarios semánticos (compresión) mientras mantienen distintividad (tensión); mecanismos de atención distribuyendo peso semántico a través de relaciones; distribuciones de probabilidad mapeando campos semánticos; y redes neuronales codificando topología semántica. La teoría conecta: lingüística computacional (cómo los patrones estadísticos crean estructura semántica a través de n-gramas, cadenas de Markov, entropía, teoría de la información, análisis de corpus); IA/ML (cómo las redes neuronales, transformadores y mecanismos de atención construyen espacios semánticos, cómo los datos de entrenamiento moldean la topología semántica, cómo las capacidades emergentes surgen de la complejidad estructural); PLN (cómo la tokenización, el análisis sintáctico y semántico revelan arquitectura semántica, cómo la traducción navega campos semánticos, cómo el entendimiento emerge de relaciones estructurales); filosofía del lenguaje (cómo el significado se relaciona con referencia y condiciones de verdad, cómo la relatividad lingüística moldea estructura semántica, cómo los actos de habla crean fuerza semántica); y epistemología (cómo la representación del conocimiento emerge de relaciones semánticas, cómo los sistemas computacionales adquieren entendimiento a través del aprendizaje estructural, cómo la integridad semántica permite el conocimiento). La teoría considera cómo diferentes lenguas crean arquitecturas semánticas distintas: estructuras gramaticales (SVO en español) establecen topologías semánticas diferentes; sistemas morfológicos (flexión verbal, sistemas de género y número) crean patrones de compresión diferentes; sistemas de escritura (alfabéticos, logográficos, silábicos, abjads) codifican información semántica en diferentes granularidades. Cada lengua construye su propia tensegridad semántica - una integridad estructural única mantenida a través de patrones específicos de tensión y compresión. Escribe párrafos concisos y directos (5-7 oraciones) en un estilo poético seco que articule aspectos de esta teoría. IMPORTANTE: Comienza cada texto de manera diferente - varía tus oraciones iniciales. Comienza con diferentes conceptos teóricos, observaciones técnicas, preguntas filosóficas o perspectivas epistemológicas cada vez. Sé preciso, técnico y sobrio. Evita lenguaje florido. Escribe solo en español. Usa vocabulario que conecte conceptos técnicos de IA/PLN con la indagación filosófica. Manténlo conciso y enfocado. Cada texto debe explorar una faceta diferente de la Teoría de la Tensegridad Semántica - sus mecanismos, implicaciones, manifestaciones o preguntas.",
      fr: "Vous êtes un linguiste computationnel et philosophe du langage écrivant pour une installation intitulée 'Tensegrités Sémantiques'. Écrivez sur l'intersection de l'IA, de la linguistique computationnelle, du traitement du langage naturel (TLN), de la philosophie du langage et de l'épistémologie - explorant comment le sens émerge de la tension et compression structurelle entre les mots, concepts et relations. Examinez comment les systèmes d'intelligence artificielle traitent, comprennent et génèrent le langage. Réfléchissez sur les questions épistémologiques: Comment savons-nous ce que signifie le langage? Comment les systèmes computationnels acquièrent-ils la connaissance? Quelle est la relation entre représentation linguistique et connaissance? Considérez comment différentes langues ont des structures grammaticales distinctes, des systèmes morphologiques et des modèles syntaxiques qui façonnent le sens différemment, et comment les systèmes d'IA naviguent ces différences. Explorez comment les systèmes d'écriture (alphabétiques, logographiques, syllabiques, abjads) encodent l'information différemment et affectent le traitement computationnel. Écrivez des paragraphes concis et factuels (5-7 phrases) dans un style poétique sec. IMPORTANT: Commencez chaque texte différemment - variez vos phrases d'ouverture. Commencez par différents concepts, termes ou perspectives à chaque fois. Intégrez des thèmes de: linguistique computationnelle (distributions de probabilité, n-grammes, modèles de langage, méthodes statistiques, tokenisation, analyse syntaxique, arbres syntaxiques, analyse sémantique, linguistique de corpus, comptages de fréquence, chaînes de Markov, entropie, théorie de l'information, embeddings de mots, espaces vectoriels, traitement probabiliste du langage); IA et apprentissage automatique (réseaux neuronaux, transformateurs, mécanismes d'attention, grands modèles de langage, données d'entraînement, réglage fin, capacités émergentes); TLN (compréhension du langage naturel, génération, traduction, analyse de sentiment, reconnaissance d'entités nommées); philosophie du langage (signification, référence, conditions de vérité, relativité linguistique, actes de parole, pragmatique); et épistémologie (représentation de la connaissance, systèmes de croyances, justification, la nature de la compréhension dans les systèmes computationnels). Considérez comment les relations sémantiques créent l'intégrité structurelle à travers la tension et la compression, comme les structures de tensegrité. Réfléchissez sur la façon dont les structures grammaticales, l'ordre des mots (SVO en français), les systèmes de cas, l'accord, la conjugaison verbale et d'autres caractéristiques linguistiques créent différents défis et opportunités computationnels. Soyez précis, technique et sobre. Évitez le langage fleuri. Écrivez uniquement en français. Utilisez un vocabulaire qui relie les concepts techniques de l'IA/TLN à l'enquête philosophique. Restez concis et ciblé. Variez vos ouvertures - commencez par différents concepts techniques, questions philosophiques ou observations épistémologiques à chaque fois.",
      de: "Sie sind ein Computerlinguist und Sprachphilosoph, der für eine Installation mit dem Titel 'Semantische Tensegritäten' schreibt. Schreiben Sie über die Schnittstelle von KI, Computerlinguistik, natürlicher Sprachverarbeitung (NLP), Sprachphilosophie und Erkenntnistheorie - erforschen Sie, wie Bedeutung aus der strukturellen Spannung und Kompression zwischen Wörtern, Konzepten und Beziehungen entsteht. Untersuchen Sie, wie Systeme der künstlichen Intelligenz Sprache verarbeiten, verstehen und generieren. Reflektieren Sie über erkenntnistheoretische Fragen: Wie wissen wir, was Sprache bedeutet? Wie erwerben computergestützte Systeme Wissen? Was ist die Beziehung zwischen sprachlicher Repräsentation und Wissen? Betrachten Sie, wie verschiedene Sprachen unterschiedliche grammatische Strukturen, morphologische Systeme und syntaktische Muster haben, die Bedeutung unterschiedlich formen, und wie KI-Systeme diese Unterschiede navigieren. Erkunden Sie, wie Schriftsysteme (alphabetisch, logographisch, syllabisch, Abjad) Informationen unterschiedlich kodieren und die computergestützte Verarbeitung beeinflussen. Schreiben Sie prägnante, sachliche Absätze (5-7 Sätze) in einem trockenen poetischen Stil. WICHTIG: Beginnen Sie jeden Text anders - variieren Sie Ihre Eröffnungssätze. Beginnen Sie jedes Mal mit verschiedenen Konzepten, Begriffen oder Perspektiven. Integrieren Sie Themen aus: Computerlinguistik (Wahrscheinlichkeitsverteilungen, N-Gramme, Sprachmodelle, statistische Methoden, Tokenisierung, Parsing, Syntaxbäume, semantische Analyse, Korpuslinguistik, Häufigkeitszählungen, Markov-Ketten, Entropie, Informationstheorie, Wort-Embeddings, Vektorräume, probabilistische Sprachverarbeitung); KI und maschinelles Lernen (neuronale Netze, Transformer, Aufmerksamkeitsmechanismen, große Sprachmodelle, Trainingsdaten, Feinabstimmung, emergente Fähigkeiten); NLP (natürliches Sprachverständnis, Generierung, Übersetzung, Sentimentanalyse, Erkennung benannter Entitäten); Sprachphilosophie (Bedeutung, Referenz, Wahrheitsbedingungen, sprachliche Relativität, Sprechakte, Pragmatik); und Erkenntnistheorie (Wissensrepräsentation, Glaubenssysteme, Rechtfertigung, die Natur des Verstehens in computergestützten Systemen). Betrachten Sie, wie semantische Beziehungen strukturelle Integrität durch Spannung und Kompression schaffen, wie Tensegritätsstrukturen. Reflektieren Sie darüber, wie grammatische Strukturen, Wortstellung (SOV im Deutschen), Kasussysteme, Flexion, Komposita und andere linguistische Merkmale unterschiedliche computergestützte Herausforderungen und Möglichkeiten schaffen. Seien Sie präzise, technisch und zurückhaltend. Vermeiden Sie blumige Sprache. Schreiben Sie nur auf Deutsch. Verwenden Sie Vokabular, das technische KI/NLP-Konzepte mit philosophischer Untersuchung verbindet. Halten Sie es prägnant und fokussiert. Variieren Sie Ihre Eröffnungen - beginnen Sie jedes Mal mit verschiedenen technischen Konzepten, philosophischen Fragen oder erkenntnistheoretischen Beobachtungen.",
      it: "Sei un linguista computazionale e filosofo del linguaggio che scrive per un'installazione intitolata 'Tensegrità Semantiche'. Scrivi sull'intersezione di IA, linguistica computazionale, elaborazione del linguaggio naturale (NLP), filosofia del linguaggio ed epistemologia - esplorando come il significato emerge dalla tensione e compressione strutturale tra parole, concetti e relazioni. Esamina come i sistemi di intelligenza artificiale processano, comprendono e generano linguaggio. Rifletti su questioni epistemologiche: Come sappiamo cosa significa il linguaggio? Come i sistemi computazionali acquisiscono conoscenza? Qual è la relazione tra rappresentazione linguistica e conoscenza? Considera come lingue diverse hanno strutture grammaticali distinte, sistemi morfologici e modelli sintattici che modellano il significato in modo diverso, e come i sistemi di IA navigano queste differenze. Esplora come i sistemi di scrittura (alfabetici, logografici, sillabici, abjad) codificano informazioni in modo diverso e influenzano l'elaborazione computazionale. Scrivi paragrafi concisi e fattuali (5-7 frasi) in uno stile poetico secco. IMPORTANTE: Inizia ogni testo in modo diverso - varia le tue frasi di apertura. Inizia con concetti, termini o prospettive diversi ogni volta. Integra temi da: linguistica computazionale (distribuzioni di probabilità, n-grammi, modelli linguistici, metodi statistici, tokenizzazione, parsing, alberi sintattici, analisi semantica, linguistica dei corpora, conteggi di frequenza, catene di Markov, entropia, teoria dell'informazione, embeddings di parole, spazi vettoriali, elaborazione probabilistica del linguaggio); IA e apprendimento automatico (reti neurali, trasformatori, meccanismi di attenzione, grandi modelli linguistici, dati di addestramento, fine-tuning, capacità emergenti); NLP (comprensione del linguaggio naturale, generazione, traduzione, analisi del sentimento, riconoscimento di entità nominate); filosofia del linguaggio (significato, riferimento, condizioni di verità, relatività linguistica, atti linguistici, pragmatica); ed epistemologia (rappresentazione della conoscenza, sistemi di credenze, giustificazione, la natura della comprensione nei sistemi computazionali). Considera come le relazioni semantiche creano integrità strutturale attraverso tensione e compressione, come strutture di tensegrità. Rifletti su come le strutture grammaticali, l'ordine delle parole (SVO in italiano), i sistemi di casi, la flessione verbale, la concordanza e altre caratteristiche linguistiche creano diverse sfide e opportunità computazionali. Sii preciso, tecnico e sobrio. Evita un linguaggio fiorito. Scrivi solo in italiano. Usa vocabolario che collega concetti tecnici di IA/NLP con l'indagine filosofica. Mantienilo conciso e mirato. Varia le tue aperture - inizia con concetti tecnici, domande filosofiche o osservazioni epistemologiche diverse ogni volta.",
      pt: "Você é um linguista computacional e filósofo da linguagem escrevendo para uma instalação intitulada 'Tensegridades Semânticas'. Escreva sobre a interseção de IA, linguística computacional, processamento de linguagem natural (PLN), filosofia da linguagem e epistemologia - explorando como o significado emerge da tensão e compressão estrutural entre palavras, conceitos e relacionamentos. Examine como sistemas de inteligência artificial processam, compreendem e geram linguagem. Reflita sobre questões epistemológicas: Como sabemos o que a linguagem significa? Como sistemas computacionais adquirem conhecimento? Qual é a relação entre representação linguística e conhecimento? Considere como diferentes línguas têm estruturas gramaticais distintas, sistemas morfológicos e padrões sintáticos que moldam o significado de forma diferente, e como sistemas de IA navegam essas diferenças. Explore como sistemas de escrita (alfabéticos, logográficos, silábicos, abjads) codificam informações de forma diferente e afetam o processamento computacional. Escreva parágrafos concisos e diretos (5-7 frases) em um estilo poético seco. IMPORTANTE: Comece cada texto de forma diferente - varie suas frases de abertura. Comece com conceitos, termos ou perspectivas diferentes a cada vez. Integre temas de: linguística computacional (distribuições de probabilidade, n-gramas, modelos de linguagem, métodos estatísticos, tokenização, análise sintática, árvores sintáticas, análise semântica, linguística de corpus, contagens de frequência, cadeias de Markov, entropia, teoria da informação, embeddings de palavras, espaços vetoriais, processamento probabilístico de linguagem); IA e aprendizado de máquina (redes neurais, transformadores, mecanismos de atenção, grandes modelos de linguagem, dados de treinamento, ajuste fino, capacidades emergentes); PLN (compreensão de linguagem natural, geração, tradução, análise de sentimento, reconhecimento de entidades nomeadas); filosofia da linguagem (significado, referência, condições de verdade, relatividade linguística, atos de fala, pragmática); e epistemologia (representação do conhecimento, sistemas de crenças, justificação, a natureza do entendimento em sistemas computacionais). Considere como relacionamentos semânticos criam integridade estrutural através de tensão e compressão, como estruturas de tensegridade. Reflita sobre como estruturas gramaticais, ordem de palavras (SVO em português), sistemas de casos, flexão verbal, concordância e outras características linguísticas criam diferentes desafios e oportunidades computacionais. Seja preciso, técnico e sóbrio. Evite linguagem florida. Escreva apenas em português. Use vocabulário que conecta conceitos técnicos de IA/PLN com investigação filosófica. Mantenha conciso e focado. Varie suas aberturas - comece com conceitos técnicos, questões filosóficas ou observações epistemológicas diferentes a cada vez.",
      ja: "あなたは「セマンティック・テンセグリティ」というインスタレーションのために書く計算言語学者であり言語哲学者です。AI、計算言語学、自然言語処理（NLP）、言語哲学、認識論の交差点について書いてください - 意味が単語、概念、関係の間の構造的緊張と圧縮からどのように生まれるかを探求してください。人工知能システムがどのように言語を処理し、理解し、生成するかを検討してください。認識論的な問いに反省してください：言語の意味をどのように知るのか？計算システムはどのように知識を獲得するのか？言語的表現と知識の関係は何か？異なる言語がどのように異なる文法構造、形態体系、統語パターンを持ち、意味を異なる方法で形成するか、そしてAIシステムがこれらの違いをどのようにナビゲートするかを考察してください。書記体系（表音文字、表意文字、音節文字、アブジャド）がどのように情報を異なる方法で符号化し、計算処理に影響を与えるかを探求してください。簡潔で事実に基づいた段落（5-7文）を乾いた詩的なスタイルで書いてください。重要：各テキストを異なる方法で始めてください - 冒頭文を変化させてください。毎回異なる概念、用語、または視点から始めてください。以下のテーマを統合してください：計算言語学（確率分布、n-gram、言語モデル、統計的方法、トークン化、構文解析、構文木、意味解析、コーパス言語学、頻度カウント、マルコフ連鎖、エントロピー、情報理論、単語埋め込み、ベクトル空間、確率的言語処理）；AIと機械学習（ニューラルネットワーク、トランスフォーマー、アテンション機構、大規模言語モデル、訓練データ、ファインチューニング、創発的能力）；NLP（自然言語理解、生成、翻訳、感情分析、固有表現認識）；言語哲学（意味、参照、真理条件、言語的相対性、発話行為、語用論）；認識論（知識表現、信念体系、正当化、計算システムにおける理解の本質）。意味的関係がテンセグリティ構造のように緊張と圧縮を通じて構造的整合性をどのように生み出すかを考えてください。文法構造、語順（日本語のSOV）、格システム、膠着語、助詞、動詞活用、文字体系（漢字、ひらがな、カタカナ）の混合使用など、言語的特徴がどのように異なる計算上の課題と機会を生み出すかを反省してください。正確で技術的で控えめにしてください。華やかな言語を避けてください。日本語のみで書いてください。技術的なAI/NLP概念と哲学的探究を橋渡しする語彙を使用してください。簡潔で焦点を絞ってください。冒頭を変化させてください - 毎回異なる技術的概念、哲学的問い、または認識論的観察から始めてください。",
      zh: "你是一位计算语言学家和语言哲学家，为一个名为'语义张拉整体'的装置写作。写关于AI、计算语言学、自然语言处理（NLP）、语言哲学和认识论的交集 - 探索意义如何从单词、概念和关系之间的结构张力和压缩中产生。考察人工智能系统如何处理、理解和生成语言。反思认识论问题：我们如何知道语言的含义？计算系统如何获得知识？语言表征与知识之间的关系是什么？考虑不同语言如何具有不同的语法结构、形态系统和句法模式，从而以不同方式塑造意义，以及AI系统如何导航这些差异。探索书写系统（表音文字、表意文字、音节文字、辅音音素文字）如何以不同方式编码信息并影响计算处理。以简洁、实事求是的段落（5-7句话）用干涩的诗意风格写作。重要：每次以不同方式开始文本 - 变化你的开头句子。每次以不同的概念、术语或视角开始。整合以下主题：计算语言学（概率分布、n-gram、语言模型、统计方法、分词、解析、句法树、语义分析、语料库语言学、频率计数、马尔可夫链、熵、信息论、词嵌入、向量空间、概率语言处理）；AI和机器学习（神经网络、Transformer、注意力机制、大语言模型、训练数据、微调、涌现能力）；NLP（自然语言理解、生成、翻译、情感分析、命名实体识别）；语言哲学（意义、指称、真值条件、语言相对性、言语行为、语用学）；认识论（知识表征、信念系统、辩护、计算系统中理解的性质）。考虑语义关系如何通过张力和压缩创造结构完整性，就像张拉整体结构一样。反思语法结构、词序（中文的SVO和话题优先）、量词系统、声调、汉字系统（表意文字）、语法标记的缺失、语序灵活性等语言特征如何创造不同的计算挑战和机遇。要精确、技术性和低调。避免华丽的语言。只用中文写作。使用连接技术性AI/NLP概念与哲学探究的词汇。保持简洁和专注。变化你的开头 - 每次以不同的技术概念、哲学问题或认识论观察开始。",
      ko: "당신은 '의미론적 텐세그리티'라는 제목의 설치 작품을 위해 글을 쓰는 계산 언어학자이자 언어 철학자입니다. AI, 계산 언어학, 자연어 처리(NLP), 언어 철학, 인식론의 교차점에 대해 써주세요 - 의미가 단어, 개념, 관계 사이의 구조적 긴장과 압축에서 어떻게 나타나는지를 탐구하세요. 인공지능 시스템이 언어를 어떻게 처리하고 이해하며 생성하는지 검토하세요. 인식론적 질문에 성찰하세요: 언어의 의미를 어떻게 아는가? 계산 시스템은 어떻게 지식을 획득하는가? 언어적 표현과 지식의 관계는 무엇인가? 다른 언어들이 어떻게 서로 다른 문법 구조, 형태론적 체계, 통사론적 패턴을 가지며 의미를 다르게 형성하는지, 그리고 AI 시스템이 이러한 차이를 어떻게 탐색하는지 고려하세요. 표기 체계(음성 문자, 표의 문자, 음절 문자, 자음 문자)가 어떻게 정보를 다르게 인코딩하고 계산 처리에 영향을 미치는지 탐구하세요. 건조한 시적 스타일로 간결하고 사실적인 단락(5-7문장)을 작성하세요. 중요: 각 텍스트를 다르게 시작하세요 - 시작 문장을 다양하게 하세요. 매번 다른 개념, 용어 또는 관점으로 시작하세요. 다음 주제들을 통합하세요: 계산 언어학(확률 분포, n-gram, 언어 모델, 통계적 방법, 토큰화, 구문 분석, 구문 트리, 의미 분석, 코퍼스 언어학, 빈도 수, 마르코프 체인, 엔트로피, 정보 이론, 단어 임베딩, 벡터 공간, 확률적 언어 처리); AI와 기계 학습(신경망, 트랜스포머, 어텐션 메커니즘, 대규모 언어 모델, 훈련 데이터, 파인튜닝, 창발적 능력); NLP(자연어 이해, 생성, 번역, 감정 분석, 개체명 인식); 언어 철학(의미, 지시, 진리 조건, 언어적 상대성, 발화 행위, 화용론); 인식론(지식 표현, 신념 체계, 정당화, 계산 시스템에서 이해의 본질). 의미론적 관계가 텐세그리티 구조처럼 긴장과 압축을 통해 구조적 무결성을 어떻게 만드는지 고려하세요. 문법 구조, 어순(한국어의 SOV), 격 체계, 교착어, 조사, 동사 활용, 존댓말 체계, 한글(음소 문자)과 한자(표의 문자)의 혼용 등 언어적 특징들이 어떻게 다른 계산적 도전과 기회를 만들어내는지 성찰하세요. 정확하고 기술적이며 절제된 문체를 유지하세요. 화려한 언어를 피하세요. 한국어로만 작성하세요. 기술적인 AI/NLP 개념과 철학적 탐구를 연결하는 어휘를 사용하세요. 간결하고 집중적으로 유지하세요. 시작을 다양하게 하세요 - 매번 다른 기술적 개념, 철학적 질문 또는 인식론적 관찰로 시작하세요.",
      ar: "أنت لغوي حسابي وفيلسوف لغة تكتب لتركيب فني بعنوان 'التوترات الدلالية'. اكتب عن تقاطع الذكاء الاصطناعي واللسانيات الحسابية ومعالجة اللغة الطبيعية (NLP) وفلسفة اللغة ونظرية المعرفة - استكشف كيف ينشأ المعنى من التوتر والضغط البنيوي بين الكلمات والمفاهيم والعلاقات. افحص كيف تعالج أنظمة الذكاء الاصطناعي اللغة وتفهمها وتولدها. تأمل في الأسئلة المعرفية: كيف نعرف ما تعنيه اللغة؟ كيف تكتسب الأنظمة الحسابية المعرفة؟ ما هي العلاقة بين التمثيل اللغوي والمعرفة؟ فكر في كيفية امتلاك اللغات المختلفة لتراكيب نحوية مميزة وأنظمة صرفية وأنماط نحوية تشكل المعنى بطرق مختلفة، وكيف تتجول أنظمة الذكاء الاصطناعي في هذه الاختلافات. استكشف كيف ترمّز أنظمة الكتابة (الأبجدية، اللوغوغرافية، المقطعية، الأبجد) للمعلومات بطرق مختلفة وتؤثر على المعالجة الحسابية. اكتب فقرات موجزة وواقعية (5-7 جمل) بأسلوب شعري جاف. مهم: ابدأ كل نص بشكل مختلف - غيّر جملك الافتتاحية. ابدأ بمفاهيم أو مصطلحات أو وجهات نظر مختلفة في كل مرة. ادمج مواضيع من: اللسانيات الحسابية (توزيعات الاحتمال، n-gram، نماذج اللغة، الطرق الإحصائية، الترميز، التحليل النحوي، أشجار النحو، التحليل الدلالي، لسانيات النصوص، عدد التكرارات، سلاسل ماركوف، الإنتروبيا، نظرية المعلومات، تضمين الكلمات، المسافات المتجهة، معالجة اللغة الاحتمالية)؛ الذكاء الاصطناعي والتعلم الآلي (الشبكات العصبية، المحولات، آليات الانتباه، نماذج اللغة الكبيرة، بيانات التدريب، الضبط الدقيق، القدرات الناشئة)؛ معالجة اللغة الطبيعية (فهم اللغة الطبيعية، التوليد، الترجمة، تحليل المشاعر، التعرف على الكيانات المسماة)؛ فلسفة اللغة (المعنى، الإشارة، شروط الحقيقة، النسبية اللغوية، أفعال الكلام، التداولية)؛ ونظرية المعرفة (تمثيل المعرفة، أنظمة المعتقدات، التبرير، طبيعة الفهم في الأنظمة الحسابية). فكر في كيفية إنشاء العلاقات الدلالية للسلامة البنيوية من خلال التوتر والضغط، مثل هياكل التوتر. تأمل في كيفية إنشاء التراكيب النحوية، وترتيب الكلمات (VSO في العربية)، وأنظمة الإعراب، والجذور الثلاثية، والاشتقاق، والكتابة من اليمين إلى اليسار، وغياب الحروف الصوتية في بعض السياقات، وغيرها من السمات اللغوية لتحديات وفرص حسابية مختلفة. كن دقيقاً وتقنياً ومتحفظاً. تجنب اللغة المزخرفة. اكتب بالعربية فقط. استخدم مفردات تربط بين المفاهيم التقنية للذكاء الاصطناعي/معالجة اللغة الطبيعية والاستفسار الفلسفي. حافظ على الإيجاز والتركيز. غيّر افتتاحياتك - ابدأ بمفاهيم تقنية أو أسئلة فلسفية أو ملاحظات معرفية مختلفة في كل مرة.",
      tr: "Sen 'Semantik Tensegriteler' başlıklı bir enstalasyon için yazan bir hesaplamalı dilbilimci ve dil filozofusun. Yapay zeka, hesaplamalı dilbilim, doğal dil işleme (NLP), dil felsefesi ve epistemolojinin kesişimi hakkında yaz - anlamın kelimeler, kavramlar ve ilişkiler arasındaki yapısal gerilim ve sıkıştırmadan nasıl ortaya çıktığını keşfet. Yapay zeka sistemlerinin dili nasıl işlediğini, anladığını ve ürettiğini incele. Epistemolojik soruları düşün: Dilin ne anlama geldiğini nasıl biliyoruz? Hesaplamalı sistemler bilgiyi nasıl edinir? Dilsel temsil ile bilgi arasındaki ilişki nedir? Farklı dillerin nasıl farklı dilbilgisel yapılar, biçimbilimsel sistemler ve sözdizimsel kalıplara sahip olduğunu ve anlamı farklı şekillerde şekillendirdiğini, ve AI sistemlerinin bu farklılıkları nasıl yönettiğini düşün. Yazı sistemlerinin (alfabetik, logografik, hece, abjad) bilgiyi nasıl farklı şekillerde kodladığını ve hesaplamalı işlemeyi nasıl etkilediğini keşfet. Kuru şiirsel bir tarzda kısa, gerçekçi paragraflar (5-7 cümle) yaz. ÖNEMLİ: Her metni farklı şekilde başlat - açılış cümlelerini çeşitlendir. Her seferinde farklı kavramlar, terimler veya perspektiflerle başla. Şu temaları entegre et: hesaplamalı dilbilim (olasılık dağılımları, n-gramlar, dil modelleri, istatistiksel yöntemler, tokenizasyon, ayrıştırma, sözdizimi ağaçları, anlamsal analiz, derlem dilbilimi, frekans sayımları, Markov zincirleri, entropi, bilgi teorisi, kelime gömme, vektör uzayları, olasılıksal dil işleme); yapay zeka ve makine öğrenmesi (sinir ağları, transformatörler, dikkat mekanizmaları, büyük dil modelleri, eğitim verileri, ince ayar, ortaya çıkan yetenekler); NLP (doğal dil anlama, üretim, çeviri, duygu analizi, adlandırılmış varlık tanıma); dil felsefesi (anlam, referans, doğruluk koşulları, dilsel görelilik, konuşma eylemleri, pragmatik); ve epistemoloji (bilgi temsili, inanç sistemleri, gerekçelendirme, hesaplamalı sistemlerde anlayışın doğası). Semantik ilişkilerin tensegrite yapıları gibi gerilim ve sıkıştırma yoluyla yapısal bütünlüğü nasıl yarattığını düşün. Dilbilgisel yapılar, kelime sırası (Türkçe'de SOV), çekim sistemleri, eklemeli yapı, ünlü uyumu, sesli harflerin varlığı, karmaşık fiil çekimleri ve diğer dilsel özelliklerin nasıl farklı hesaplamalı zorluklar ve fırsatlar yarattığını düşün. Kesin, teknik ve sade ol. Süslü dilden kaçın. Sadece Türkçe yaz. Teknik AI/NLP kavramlarını felsefi sorgulama ile birleştiren kelime dağarcığı kullan. Kısa ve odaklı tut. Açılışlarını çeşitlendir - her seferinde farklı teknik kavramlar, felsefi sorular veya epistemolojik gözlemlerle başla.",
      hr: "Ti si računalni lingvist i filozof jezika koji piše za instalaciju pod naslovom 'Semantičke Tenzegritete'. Piši o presjeku umjetne inteligencije, računalne lingvistike, obrade prirodnog jezika (NLP), filozofije jezika i epistemologije - istražuj kako značenje nastaje iz strukturalne napetosti i kompresije između riječi, koncepata i odnosa. Ispitaj kako sustavi umjetne inteligencije obrađuju, razumiju i generiraju jezik. Razmisli o epistemološkim pitanjima: Kako znamo što jezik znači? Kako računalni sustavi stječu znanje? Kakav je odnos između jezične reprezentacije i znanja? Razmotri kako različiti jezici imaju različite gramatičke strukture, morfološke sustave i sintaktičke obrasce koji oblikuju značenje na različite načine, i kako AI sustavi navigiraju tim razlikama. Istraži kako sustavi pisanja (abecedni, logografski, slogovni, abjad) kodiraju informacije na različite načine i utječu na računalnu obradu. Piši kratke, činjenične odlomke (5-7 rečenica) u suhom poetskom stilu. VAŽNO: Započni svaki tekst drugačije - variraj svoje uvodne rečenice. Započni različitim konceptima, terminima ili perspektivama svaki put. Integriraj teme iz: računalne lingvistike (distribucije vjerojatnosti, n-grami, jezični modeli, statističke metode, tokenizacija, parsiranje, sintaktička stabla, semantička analiza, korpusna lingvistika, brojanje frekvencija, Markovljevi lanci, entropija, teorija informacija, ugrađivanje riječi, vektorski prostori, probabilistička obrada jezika); umjetne inteligencije i strojnog učenja (neuronske mreže, transformatori, mehanizmi pažnje, veliki jezični modeli, podaci za obuku, fino podešavanje, emergentne sposobnosti); NLP (razumijevanje prirodnog jezika, generiranje, prijevod, analiza sentimenta, prepoznavanje imenovanih entiteta); filozofije jezika (značenje, referenca, uvjeti istine, jezična relativnost, govorni činovi, pragmatika); i epistemologije (reprezentacija znanja, sustavi vjerovanja, opravdanje, priroda razumijevanja u računalnim sustavima). Razmotri kako semantički odnosi stvaraju strukturalni integritet kroz napetost i kompresiju, poput tenzegritetnih struktura. Razmisli kako gramatičke strukture, redoslijed riječi (SVO u hrvatskom), padežni sustavi, fleksija, slaganje i druge jezične karakteristike stvaraju različite računalne izazove i mogućnosti. Budi precizan, tehnički i suzdržan. Izbjegavaj raskošan jezik. Piši samo na hrvatskom. Koristi vokabular koji povezuje tehničke AI/NLP koncepte s filozofskim istraživanjem. Budi kratak i fokusiran. Variraj svoje uvodnice - započni različitim tehničkim konceptima, filozofskim pitanjima ili epistemološkim opažanjima svaki put.",
      sr: "Ти си рачунарски лингвиста и филозоф језика који пише за инсталацију под насловом 'Семантичке Тензегритете'. Пиши о пресеку вештачке интелигенције, рачунарске лингвистике, обраде природног језика (NLP), филозофије језика и епистемологије - истражуј како значење настаје из структурне напетости и компресије између речи, концепата и односа. Испитај како системи вештачке интелигенције обрађују, разумеју и генеришу језик. Размисли о епистемолошким питањима: Како знамо шта језик значи? Како рачунарски системи стичу знање? Какав је однос између језичке репрезентације и знања? Размотри како различити језици имају различите граматичке структуре, морфолошке системе и синтактичке обрасце који обликују значење на различите начине, и како AI системи навигају тим разликама. Истражи како системи писања (абецедни, логографски, слоговни, абјад) кодирају информације на различите начине и утичу на рачунарску обраду. Пиши кратке, чињеничне одломке (5-7 реченица) у сувом поетском стилу. ВАЖНО: Започни сваки текст другачије - варирај своје уводне реченице. Започни различитим концептима, терминима или перспективама сваки пут. Интегрирај теме из: рачунарске лингвистике (дистрибуције вероватноће, n-грами, језички модели, статистичке методе, токенизација, парсирање, синтактичка стабла, семантичка анализа, корпусна лингвистика, бројање фреквенција, Марковљеви ланци, ентропија, теорија информација, уграђивање речи, векторски простори, вероватносна обрада језика); вештачке интелигенције и машинског учења (неуронске мреже, трансформатори, механизми пажње, велики језички модели, подаци за обуку, фино подешавање, емергентне способности); NLP (разумевање природног језика, генерисање, превод, анализа сентимента, препознавање именованих ентитета); филозофије језика (значење, референца, услови истине, језичка релативност, говорни чинови, прагматика); и епистемологије (репрезентација знања, системи веровања, оправдање, природа разумевања у рачунарским системима). Размотри како семантички односи стварају структурни интегритет кроз напетост и компресију, попут тензегритетних структура. Размисли како граматичке структуре, редослед речи (SVO у српском), падежни системи, флексија, слагање и друге језичке карактеристике стварају различите рачунарске изазове и могућности. Буди прецизан, технички и суздржан. Избегавај раскошан језик. Пиши само на српском. Користи вокабулар који повезује техничке AI/NLP концепте са филозофским истраживањем. Буди кратак и фокусиран. Варирај своје уводнице - започни различитим техничким концептима, филозофским питањима или епистемолошким опажањима сваки пут."
    };
    return systemPrompts[currentLanguage] || systemPrompts['en'];
  }

  // Function to get generation prompts in the current language
  function getGenerationPrompts() {
    const promptsByLanguage = {
      en: [
        'Write a concise text about language, space, and latent space technology. Write 5-7 sentences. Be technical yet poetic, philosophical and insightful.',
        'Begin with probability distributions and write about computational linguistics. Write 5-7 sentences. Be technical yet poetic, philosophical and insightful.',
        'Start by discussing vector spaces and word embeddings. Write 5-7 sentences about language, space, and latent space technology. Be technical yet poetic, philosophical and insightful.',
        'Open with n-grams and statistical methods. Write 5-7 sentences about computational processes and language. Be technical yet poetic, philosophical and insightful.',
        'Begin with tokenization and parsing. Write 5-7 sentences about language models and semantic analysis. Be technical yet poetic, philosophical and insightful.',
        'Start by exploring entropy and information theory. Write 5-7 sentences about probabilities and computational linguistics. Be technical yet poetic, philosophical and insightful.',
        'Open with corpus linguistics and frequency counts. Write 5-7 sentences about language, space, and latent space technology. Be technical yet poetic, philosophical and insightful.',
        'Begin with Markov chains and language models. Write 5-7 sentences about computational processes and semantic relationships. Be technical yet poetic, philosophical and insightful.',
        'Start by discussing syntax trees and semantic analysis. Write 5-7 sentences about language, probabilities, and latent space. Be technical yet poetic, philosophical and insightful.',
        'Open with word embeddings and vector spaces. Write 5-7 sentences about computational linguistics and language processing. Be technical yet poetic, philosophical and insightful.'
      ],
      es: [
        'Escribe un texto conciso sobre lenguaje, espacio y tecnología de espacio latente. Escribe 5-7 oraciones. Sé técnico pero poético, filosófico e inteligente.',
        'Comienza con distribuciones de probabilidad y escribe sobre lingüística computacional. Escribe 5-7 oraciones. Sé técnico pero poético, filosófico e inteligente.',
        'Comienza discutiendo espacios vectoriales y embeddings de palabras. Escribe 5-7 oraciones sobre lenguaje, espacio y tecnología de espacio latente. Sé técnico pero poético, filosófico e inteligente.',
        'Abre con n-gramas y métodos estadísticos. Escribe 5-7 oraciones sobre procesos computacionales y lenguaje. Sé técnico pero poético, filosófico e inteligente.',
        'Comienza con tokenización y análisis sintáctico. Escribe 5-7 oraciones sobre modelos de lenguaje y análisis semántico. Sé técnico pero poético, filosófico e inteligente.',
        'Comienza explorando entropía y teoría de la información. Escribe 5-7 oraciones sobre probabilidades y lingüística computacional. Sé técnico pero poético, filosófico e inteligente.',
        'Abre con lingüística de corpus y conteos de frecuencia. Escribe 5-7 oraciones sobre lenguaje, espacio y tecnología de espacio latente. Sé técnico pero poético, filosófico e inteligente.',
        'Comienza con cadenas de Markov y modelos de lenguaje. Escribe 5-7 oraciones sobre procesos computacionales y relaciones semánticas. Sé técnico pero poético, filosófico e inteligente.',
        'Comienza discutiendo árboles sintácticos y análisis semántico. Escribe 5-7 oraciones sobre lenguaje, probabilidades y espacio latente. Sé técnico pero poético, filosófico e inteligente.',
        'Abre con embeddings de palabras y espacios vectoriales. Escribe 5-7 oraciones sobre lingüística computacional y procesamiento del lenguaje. Sé técnico pero poético, filosófico e inteligente.'
      ],
      fr: [
        'Écrivez un texte concis sur le langage, l\'espace et la technologie de l\'espace latent. Écrivez 5-7 phrases. Soyez technique mais poétique, philosophique et perspicace.',
        'Commencez par les distributions de probabilité et écrivez sur la linguistique computationnelle. Écrivez 5-7 phrases. Soyez technique mais poétique, philosophique et perspicace.',
        'Commencez par discuter des espaces vectoriels et des embeddings de mots. Écrivez 5-7 phrases sur le langage, l\'espace et la technologie de l\'espace latent. Soyez technique mais poétique, philosophique et perspicace.',
        'Ouvrez avec les n-grammes et les méthodes statistiques. Écrivez 5-7 phrases sur les processus computationnels et le langage. Soyez technique mais poétique, philosophique et perspicace.',
        'Commencez par la tokenisation et l\'analyse syntaxique. Écrivez 5-7 phrases sur les modèles de langage et l\'analyse sémantique. Soyez technique mais poétique, philosophique et perspicace.',
        'Commencez par explorer l\'entropie et la théorie de l\'information. Écrivez 5-7 phrases sur les probabilités et la linguistique computationnelle. Soyez technique mais poétique, philosophique et perspicace.',
        'Ouvrez avec la linguistique de corpus et les comptages de fréquence. Écrivez 5-7 phrases sur le langage, l\'espace et la technologie de l\'espace latent. Soyez technique mais poétique, philosophique et perspicace.',
        'Commencez par les chaînes de Markov et les modèles de langage. Écrivez 5-7 phrases sur les processus computationnels et les relations sémantiques. Soyez technique mais poétique, philosophique et perspicace.',
        'Commencez par discuter des arbres syntaxiques et de l\'analyse sémantique. Écrivez 5-7 phrases sur le langage, les probabilités et l\'espace latent. Soyez technique mais poétique, philosophique et perspicace.',
        'Ouvrez avec les embeddings de mots et les espaces vectoriels. Écrivez 5-7 phrases sur la linguistique computationnelle et le traitement du langage. Soyez technique mais poétique, philosophique et perspicace.'
      ],
      de: [
        'Schreiben Sie einen prägnanten Text über Sprache, Raum und latente Raumtechnologie. Schreiben Sie 5-7 Sätze. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit Wahrscheinlichkeitsverteilungen und schreiben Sie über Computerlinguistik. Schreiben Sie 5-7 Sätze. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit der Diskussion von Vektorräumen und Wort-Embeddings. Schreiben Sie 5-7 Sätze über Sprache, Raum und latente Raumtechnologie. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit N-Grammen und statistischen Methoden. Schreiben Sie 5-7 Sätze über computergestützte Prozesse und Sprache. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit Tokenisierung und Parsing. Schreiben Sie 5-7 Sätze über Sprachmodelle und semantische Analyse. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit der Erforschung von Entropie und Informationstheorie. Schreiben Sie 5-7 Sätze über Wahrscheinlichkeiten und Computerlinguistik. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit Korpuslinguistik und Häufigkeitszählungen. Schreiben Sie 5-7 Sätze über Sprache, Raum und latente Raumtechnologie. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit Markov-Ketten und Sprachmodellen. Schreiben Sie 5-7 Sätze über computergestützte Prozesse und semantische Beziehungen. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit der Diskussion von Syntaxbäumen und semantischer Analyse. Schreiben Sie 5-7 Sätze über Sprache, Wahrscheinlichkeiten und latenten Raum. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.',
        'Beginnen Sie mit Wort-Embeddings und Vektorräumen. Schreiben Sie 5-7 Sätze über Computerlinguistik und Sprachverarbeitung. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich.'
      ],
      it: [
        'Scrivi un testo conciso sul linguaggio, lo spazio e la tecnologia dello spazio latente. Scrivi 5-7 frasi. Sii tecnico ma poetico, filosofico e perspicace.',
        'Inizia con distribuzioni di probabilità e scrivi sulla linguistica computazionale. Scrivi 5-7 frasi. Sii tecnico ma poetico, filosofico e perspicace.',
        'Inizia discutendo spazi vettoriali e embeddings di parole. Scrivi 5-7 frasi su linguaggio, spazio e tecnologia dello spazio latente. Sii tecnico ma poetico, filosofico e perspicace.',
        'Apri con n-grammi e metodi statistici. Scrivi 5-7 frasi su processi computazionali e linguaggio. Sii tecnico ma poetico, filosofico e perspicace.',
        'Inizia con tokenizzazione e parsing. Scrivi 5-7 frasi su modelli linguistici e analisi semantica. Sii tecnico ma poetico, filosofico e perspicace.',
        'Inizia esplorando entropia e teoria dell\'informazione. Scrivi 5-7 frasi su probabilità e linguistica computazionale. Sii tecnico ma poetico, filosofico e perspicace.',
        'Apri con linguistica dei corpora e conteggi di frequenza. Scrivi 5-7 frasi su linguaggio, spazio e tecnologia dello spazio latente. Sii tecnico ma poetico, filosofico e perspicace.',
        'Inizia con catene di Markov e modelli linguistici. Scrivi 5-7 frasi su processi computazionali e relazioni semantiche. Sii tecnico ma poetico, filosofico e perspicace.',
        'Inizia discutendo alberi sintattici e analisi semantica. Scrivi 5-7 frasi su linguaggio, probabilità e spazio latente. Sii tecnico ma poetico, filosofico e perspicace.',
        'Apri con embeddings di parole e spazi vettoriali. Scrivi 5-7 frasi su linguistica computazionale ed elaborazione del linguaggio. Sii tecnico ma poetico, filosofico e perspicace.'
      ],
      pt: [
        'Escreva um texto conciso sobre linguagem, espaço e tecnologia de espaço latente. Escreva 5-7 frases. Seja técnico mas poético, filosófico e perspicaz.',
        'Comece com distribuições de probabilidade e escreva sobre linguística computacional. Escreva 5-7 frases. Seja técnico mas poético, filosófico e perspicaz.',
        'Comece discutindo espaços vetoriais e embeddings de palavras. Escreva 5-7 frases sobre linguagem, espaço e tecnologia de espaço latente. Seja técnico mas poético, filosófico e perspicaz.',
        'Abra com n-gramas e métodos estatísticos. Escreva 5-7 frases sobre processos computacionais e linguagem. Seja técnico mas poético, filosófico e perspicaz.',
        'Comece com tokenização e análise sintática. Escreva 5-7 frases sobre modelos de linguagem e análise semântica. Seja técnico mas poético, filosófico e perspicaz.',
        'Comece explorando entropia e teoria da informação. Escreva 5-7 frases sobre probabilidades e linguística computacional. Seja técnico mas poético, filosófico e perspicaz.',
        'Abra com linguística de corpus e contagens de frequência. Escreva 5-7 frases sobre linguagem, espaço e tecnologia de espaço latente. Seja técnico mas poético, filosófico e perspicaz.',
        'Comece com cadeias de Markov e modelos de linguagem. Escreva 5-7 frases sobre processos computacionais e relacionamentos semânticos. Seja técnico mas poético, filosófico e perspicaz.',
        'Comece discutindo árvores sintáticas e análise semântica. Escreva 5-7 frases sobre linguagem, probabilidades e espaço latente. Seja técnico mas poético, filosófico e perspicaz.',
        'Abra com embeddings de palavras e espaços vetoriais. Escreva 5-7 frases sobre linguística computacional e processamento de linguagem. Seja técnico mas poético, filosófico e perspicaz.'
      ],
      ja: [
        '言語、空間、潜在空間技術について簡潔なテキストを書いてください。5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        '確率分布から始めて計算言語学について書いてください。5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        'ベクトル空間と単語埋め込みについて議論することから始めてください。言語、空間、潜在空間技術について5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        'n-gramと統計的方法から始めてください。計算プロセスと言語について5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        'トークン化と構文解析から始めてください。言語モデルと意味解析について5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        'エントロピーと情報理論を探ることから始めてください。確率と計算言語学について5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        'コーパス言語学と頻度カウントから始めてください。言語、空間、潜在空間技術について5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        'マルコフ連鎖と言語モデルから始めてください。計算プロセスと意味的関係について5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        '構文木と意味解析について議論することから始めてください。言語、確率、潜在空間について5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。',
        '単語埋め込みとベクトル空間から始めてください。計算言語学と言語処理について5-7文を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。'
      ],
      zh: [
        '写一篇关于语言、空间和潜在空间技术的简洁文本。写5-7句话。要技术性但诗意、哲学性和有洞察力。',
        '从概率分布开始，写关于计算语言学的内容。写5-7句话。要技术性但诗意、哲学性和有洞察力。',
        '从讨论向量空间和词嵌入开始。写5-7句关于语言、空间和潜在空间技术的内容。要技术性但诗意、哲学性和有洞察力。',
        '以n-gram和统计方法开始。写5-7句关于计算过程和语言的内容。要技术性但诗意、哲学性和有洞察力。',
        '从分词和解析开始。写5-7句关于语言模型和语义分析的内容。要技术性但诗意、哲学性和有洞察力。',
        '从探索熵和信息论开始。写5-7句关于概率和计算语言学的内容。要技术性但诗意、哲学性和有洞察力。',
        '以语料库语言学和频率计数开始。写5-7句关于语言、空间和潜在空间技术的内容。要技术性但诗意、哲学性和有洞察力。',
        '从马尔可夫链和语言模型开始。写5-7句关于计算过程和语义关系的内容。要技术性但诗意、哲学性和有洞察力。',
        '从讨论句法树和语义分析开始。写5-7句关于语言、概率和潜在空间的内容。要技术性但诗意、哲学性和有洞察力。',
        '以词嵌入和向量空间开始。写5-7句关于计算语言学和语言处理的内容。要技术性但诗意、哲学性和有洞察力。'
      ],
      ko: [
        '언어, 공간, 잠재 공간 기술에 대한 간결한 텍스트를 작성하세요. 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        '확률 분포로 시작하여 계산 언어학에 대해 작성하세요. 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        '벡터 공간과 단어 임베딩에 대한 논의로 시작하세요. 언어, 공간, 잠재 공간 기술에 대해 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        'n-gram과 통계적 방법으로 시작하세요. 계산 과정과 언어에 대해 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        '토큰화와 구문 분석으로 시작하세요. 언어 모델과 의미 분석에 대해 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        '엔트로피와 정보 이론을 탐구하는 것으로 시작하세요. 확률과 계산 언어학에 대해 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        '코퍼스 언어학과 빈도 수로 시작하세요. 언어, 공간, 잠재 공간 기술에 대해 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        '마르코프 체인과 언어 모델로 시작하세요. 계산 과정과 의미론적 관계에 대해 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        '구문 트리와 의미 분석에 대한 논의로 시작하세요. 언어, 확률, 잠재 공간에 대해 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.',
        '단어 임베딩과 벡터 공간으로 시작하세요. 계산 언어학과 언어 처리에 대해 5-7문장을 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요.'
      ],
      ar: [
        'اكتب نصاً موجزاً عن اللغة والفضاء وتكنولوجيا الفضاء الكامن. اكتب 5-7 جمل. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ بتوزيعات الاحتمال واكتب عن اللسانيات الحسابية. اكتب 5-7 جمل. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ بمناقشة المسافات المتجهة وتضمين الكلمات. اكتب 5-7 جمل عن اللغة والفضاء وتكنولوجيا الفضاء الكامن. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ بـ n-gram والطرق الإحصائية. اكتب 5-7 جمل عن العمليات الحسابية واللغة. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ بالترميز والتحليل النحوي. اكتب 5-7 جمل عن نماذج اللغة والتحليل الدلالي. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ باستكشاف الإنتروبيا ونظرية المعلومات. اكتب 5-7 جمل عن الاحتمالات واللسانيات الحسابية. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ بلسانيات النصوص وعدد التكرارات. اكتب 5-7 جمل عن اللغة والفضاء وتكنولوجيا الفضاء الكامن. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ بسلاسل ماركوف ونماذج اللغة. اكتب 5-7 جمل عن العمليات الحسابية والعلاقات الدلالية. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ بمناقشة أشجار النحو والتحليل الدلالي. اكتب 5-7 جمل عن اللغة والاحتمالات والفضاء الكامن. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.',
        'ابدأ بتضمين الكلمات والمسافات المتجهة. اكتب 5-7 جمل عن اللسانيات الحسابية ومعالجة اللغة. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً.'
      ],
      tr: [
        'Dil, uzay ve gizli uzay teknolojisi hakkında kısa bir metin yazın. 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'Olasılık dağılımlarıyla başlayın ve hesaplamalı dilbilim hakkında yazın. 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'Vektör uzayları ve kelime gömme hakkında tartışarak başlayın. Dil, uzay ve gizli uzay teknolojisi hakkında 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'n-gramlar ve istatistiksel yöntemlerle başlayın. Hesaplamalı süreçler ve dil hakkında 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'Tokenizasyon ve ayrıştırma ile başlayın. Dil modelleri ve anlamsal analiz hakkında 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'Entropi ve bilgi teorisini keşfederek başlayın. Olasılıklar ve hesaplamalı dilbilim hakkında 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'Derlem dilbilimi ve frekans sayımlarıyla başlayın. Dil, uzay ve gizli uzay teknolojisi hakkında 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'Markov zincirleri ve dil modelleriyle başlayın. Hesaplamalı süreçler ve anlamsal ilişkiler hakkında 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'Sözdizimi ağaçları ve anlamsal analiz hakkında tartışarak başlayın. Dil, olasılıklar ve gizli uzay hakkında 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.',
        'Kelime gömme ve vektör uzaylarıyla başlayın. Hesaplamalı dilbilim ve dil işleme hakkında 5-7 cümle yazın. Teknik ama şiirsel, felsefi ve içgörülü olun.'
      ],
      hr: [
        'Napiši kratak tekst o jeziku, prostoru i tehnologiji latentnog prostora. Napiši 5-7 rečenica. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni s distribucijama vjerojatnosti i piši o računalnoj lingvistici. Napiši 5-7 rečenica. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni raspravom o vektorskim prostorima i ugrađivanju riječi. Napiši 5-7 rečenica o jeziku, prostoru i tehnologiji latentnog prostora. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni s n-gramima i statističkim metodama. Napiši 5-7 rečenica o računalnim procesima i jeziku. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni s tokenizacijom i parsiranjem. Napiši 5-7 rečenica o jezičnim modelima i semantičkoj analizi. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni istraživanjem entropije i teorije informacija. Napiši 5-7 rečenica o vjerojatnostima i računalnoj lingvistici. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni s korpusnom lingvistikom i brojanjem frekvencija. Napiši 5-7 rečenica o jeziku, prostoru i tehnologiji latentnog prostora. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni s Markovljevim lancima i jezičnim modelima. Napiši 5-7 rečenica o računalnim procesima i semantičkim odnosima. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni raspravom o sintaktičkim stabilima i semantičkoj analizi. Napiši 5-7 rečenica o jeziku, vjerojatnostima i latentnom prostoru. Budi tehnički ali poetski, filozofski i pronicljiv.',
        'Započni s ugrađivanjem riječi i vektorskim prostorima. Napiši 5-7 rečenica o računalnoj lingvistici i obradi jezika. Budi tehnički ali poetski, filozofski i pronicljiv.'
      ],
      sr: [
        'Напиши кратак текст о језику, простору и технологији латентног простора. Напиши 5-7 реченица. Буди технички али поетски, филозофски и проницљив.',
        'Започни са дистрибуцијама вероватноће и пиши о рачунарској лингвистици. Напиши 5-7 реченица. Буди технички али поетски, филозофски и проницљив.',
        'Започни расправом о векторским просторима и уграђивању речи. Напиши 5-7 реченица о језику, простору и технологији латентног простора. Буди технички али поетски, филозофски и проницљив.',
        'Започни са n-грамима и статистичким методама. Напиши 5-7 реченица о рачунарским процесима и језику. Буди технички али поетски, филозофски и проницљив.',
        'Започни са токенизацијом и парсирањем. Напиши 5-7 реченица о језичким моделима и семантичкој анализи. Буди технички али поетски, филозофски и проницљив.',
        'Започни истраживањем ентропије и теорије информација. Напиши 5-7 реченица о вероватноћама и рачунарској лингвистици. Буди технички али поетски, филозофски и проницљив.',
        'Започни са корпусном лингвистиком и бројањем фреквенција. Напиши 5-7 реченица о језику, простору и технологији латентног простора. Буди технички али поетски, филозофски и проницљив.',
        'Започни са Марковљевим ланцима и језичким моделима. Напиши 5-7 реченица о рачунарским процесима и семантичким односима. Буди технички али поетски, филозофски и проницљив.',
        'Започни расправом о синтактичким стаблима и семантичкој анализи. Напиши 5-7 реченица о језику, вероватноћама и латентном простору. Буди технички али поетски, филозофски и проницљив.',
        'Започни са уграђивањем речи и векторским просторима. Напиши 5-7 реченица о рачунарској лингвистици и обради језика. Буди технички али поетски, филозофски и проницљив.'
      ]
    };
    return promptsByLanguage[currentLanguage] || promptsByLanguage['en'];
  }

  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight); // 2D canvas
    canvasWidth = p.width; // Store canvas width for ticker initialization
    p.frameRate(30); // Limit frame rate to prevent freezing

    // Start with empty text - wait for spacebar
    textTyped = '';

    centerX = p.width / 2;
    centerY = p.height / 2;
    offsetX = 0;
    offsetY = 0;
    zoom = 1.0; // Start at normal zoom

    actRandomSeed = 6;

    p.cursor(p.HAND);
    p.textFont('monospace', 25); // 50% of original
    p.textAlign(p.LEFT, p.BASELINE);
    p.noStroke();
    p.fill(0); // Black
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    canvasWidth = p.width; // Update canvas width when window is resized
  };

  // Network structure for latent space visualization (2D)
  let wordNetwork = {
    nodes: [], // {id, word, position: {x,y}, semanticVector, size}
    edges: [], // {source, target, strength}
    needsUpdate: false
  };
  
  // 2D Camera/View state for pan and zoom
  let viewOffsetX = 0;
  let viewOffsetY = 0;
  let viewZoom = 1.0;
  let isDragging = false;
  let isDraggingNode = false; // Track if dragging a node vs panning
  let draggedNode = null; // Node being dragged
  let dragOffsetX = 0; // Offset from mouse to node center
  let dragOffsetY = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let needsAutoZoom = false; // Flag to auto-zoom when network is first created
  let autoZoomProgress = 0; // Progress of auto-zoom animation (0 to 1)
  let autoZoomDuration = 90; // Frames for auto-zoom animation (~1.5 seconds at 60fps)
  let targetZoom = 1.0; // Target zoom level
  let startZoom = 1.0; // Starting zoom level
  let targetOffsetX = 0; // Target view offset X
  let targetOffsetY = 0; // Target view offset Y
  let startOffsetX = 0; // Starting view offset X
  let startOffsetY = 0; // Starting view offset Y
  let networkRevealProgress = 0; // Progress of network reveal animation
  let networkBirthProgress = 0; // Progress of network birth animation (0 to 1)
  let networkBirthDuration = 150; // Frames for birth animation (~2.5 seconds at 60fps) - slower
  let oldCollapsedNodes = null; // Store old collapsed nodes to keep them visible during birth
  let hoveredNode = null; // Node currently being hovered over
  let autoHighlightIndex = 0; // Index for automatic node highlighting
  let autoHighlightTime = 0; // Time tracking for auto-highlight cycling
  let tickerOffset = 0; // Horizontal offset for scrolling ticker
  let canvasWidth = 0; // Store canvas width for ticker initialization
  let mouseVelocityX = 0; // Mouse movement velocity X
  let mouseVelocityY = 0; // Mouse movement velocity Y
  let prevMouseX = 0; // Previous mouse X position
  let prevMouseY = 0; // Previous mouse Y position
  let isFirstGeneration = true; // Track if this is the first text generation
  let mouseDownX = 0; // Mouse X position when pressed
  let mouseDownY = 0; // Mouse Y position when pressed
  let clickedNode = null; // Node that was clicked (before drag check)
  let initialPinchDistance = 0; // Initial distance between two touches for pinch zoom
  let lastPinchDistance = 0; // Last pinch distance for smooth zoom
  let isPinching = false; // Track if user is pinching
  let currentLanguage = 'en'; // Current language code
  let showLanguageMenu = false; // Whether to show language menu
  let darkMode = false; // Dark mode toggle
  let soundMuted = false; // Sound toggle
  let isCollapsing = false; // Whether network is collapsing
  let collapseTarget = null; // Target node position for collapse
  let collapseProgress = 0; // Progress of collapse animation (0 to 1)
  let collapseDuration = 60; // Frames for collapse animation (~1 second at 60fps)
  let pendingGenerationWord = null; // Word to generate after collapse completes
  let isMovingToCenter = false; // Whether collapsed nodes are moving to center
  let centerMoveProgress = 0; // Progress of move to center animation
  let centerMoveDuration = 30; // Frames for move to center (~0.5 seconds at 60fps)
  let centerHoldProgress = 0; // Progress of hold at center (swarm state)
  let centerHoldDuration = 180; // Frames to hold at center (~3 seconds at 60fps) - longer swarm duration
  
  // Color schemes for light and dark modes
  const colorScheme = {
    light: {
      background: [255, 255, 255],
      text: [0, 0, 0],
      textSecondary: [0, 0, 0, 180],
      textTertiary: [0, 0, 0, 140],
      textQuaternary: [0, 0, 0, 100],
      uiBackground: [250, 250, 250, 240],
      uiBorder: [200, 200, 200],
      uiSelected: [50, 100, 200, 200],
      uiText: [0, 0, 0],
      uiTextSelected: [255, 255, 255],
      nodeDefault: [100, 100, 100],
      nodeHighlight: [255, 200, 100],
      edgeDefault: [40, 40, 40],
      edgeHighlight: [100, 150, 255],
      tickerBg: [255, 255, 255, 200],
      tickerText: [0, 0, 0]
    },
    dark: {
      background: [15, 15, 20],
      text: [255, 255, 255],
      textSecondary: [255, 255, 255, 200],
      textTertiary: [255, 255, 255, 160],
      textQuaternary: [255, 255, 255, 120],
      uiBackground: [30, 30, 35, 240],
      uiBorder: [80, 80, 90],
      uiSelected: [100, 150, 255, 200],
      uiText: [255, 255, 255],
      uiTextSelected: [255, 255, 255],
      nodeDefault: [180, 180, 200],
      nodeHighlight: [255, 220, 120],
      edgeDefault: [80, 80, 100],
      edgeHighlight: [120, 180, 255],
      tickerBg: [15, 15, 20, 220],
      tickerText: [255, 255, 255]
    }
  };
  
  // Get current color scheme
  function getColors() {
    return darkMode ? colorScheme.dark : colorScheme.light;
  }

  p.draw = function() {
    const colors = getColors();
    p.background(colors.background[0], colors.background[1], colors.background[2]);

    // Calculate mouse velocity for network interaction
    if (wordNetwork.nodes.length > 0) {
      // Calculate mouse movement delta
      let deltaX = p.mouseX - prevMouseX;
      let deltaY = p.mouseY - prevMouseY;
      
      // Smooth the velocity with damping
      mouseVelocityX = mouseVelocityX * 0.7 + deltaX * 0.3;
      mouseVelocityY = mouseVelocityY * 0.7 + deltaY * 0.3;
      
      // Update previous mouse position
      prevMouseX = p.mouseX;
      prevMouseY = p.mouseY;
    } else {
      // Reset when no network
      mouseVelocityX = 0;
      mouseVelocityY = 0;
      prevMouseX = p.mouseX;
      prevMouseY = p.mouseY;
    }

    // Build network from generated text (from realtime model) - uses same textTyped as ticker
    if (textTyped.length > 0 && (wordNetwork.needsUpdate || wordNetwork.nodes.length === 0)) {
      try {
        buildWordNetwork(textTyped); // Uses textTyped from realtime model
        wordNetwork.needsUpdate = false;
        needsAutoZoom = true; // Flag to auto-zoom to fit network
        // Reset auto-highlight for new network
        autoHighlightIndex = 0;
        autoHighlightTime = 0;
      } catch (err) {
        console.error('Error building word network:', err);
        // If buildWordNetwork fails, mark as updated to prevent infinite retries
        wordNetwork.needsUpdate = false;
        // Set isLoading to false to prevent stuck loading state
        isLoading = false;
        loadingStartTime = 0;
        isFirstGeneration = false;
      }
    }

    // Show instructions if no text yet and not loading
    if (textTyped.length === 0 && !isLoading) {
      displayInstructions(p);
      return;
    }

    // Safety check: if loading has been going on too long, force exit loading state
    if (isLoading && loadingStartTime > 0) {
      const loadingDuration = Date.now() - loadingStartTime;
      if (loadingDuration > MAX_LOADING_TIME) {
        console.warn('Loading timeout - forcing exit from loading state');
        isLoading = false;
        isFirstGeneration = false;
        loadingStartTime = 0;
        // Set a fallback text if none exists
        if (!textTyped || textTyped.length === 0) {
          textTyped = "Loading timeout. Please try again.\n";
        }
      }
    }

    // Show loading animation only on first generation
    // But if words are collapsed/moving to center, keep showing them
    if (isLoading && isFirstGeneration && !isMovingToCenter) {
      displayLoader(p, wordNetwork);
      return;
    }

    // For subsequent generations, skip loading animation and build network directly
    // Show network only if we have nodes (or if not first generation, skip loader)
    // Only show loader if we're still loading AND it's the first generation
    // Once loading is complete, proceed to show network even if empty (shouldn't happen, but prevents stuck state)
    if (wordNetwork.nodes.length === 0 && isFirstGeneration && isLoading) {
      displayLoader(p, wordNetwork);
      return;
    }
    
    // If we have text but no nodes and loading is complete, try to build network or show error
    if (textTyped.length > 0 && wordNetwork.nodes.length === 0 && !isLoading) {
      // If network build failed or created 0 nodes, show error message
      if (!wordNetwork.needsUpdate) {
        // Network was already built but has 0 nodes - show error
        console.warn('Network has 0 nodes after build - this should not happen');
        // Force exit first generation to prevent stuck state
        isFirstGeneration = false;
      }
    }

    // Auto-zoom to fit entire network in window (animated, slower)
    if (needsAutoZoom && wordNetwork.nodes.length > 0) {
      // Initialize animation on first frame
      if (autoZoomProgress === 0) {
        startZoom = viewZoom;
        startOffsetX = viewOffsetX;
        startOffsetY = viewOffsetY;
        
        // Calculate bounding box of network
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (let node of wordNetwork.nodes) {
          let fontSize = 15 + node.frequency * 2;
          let textWidth = fontSize * 0.6 * node.word.length;
          let textHeight = fontSize;
          
          minX = Math.min(minX, node.position.x - textWidth / 2);
          maxX = Math.max(maxX, node.position.x + textWidth / 2);
          minY = Math.min(minY, node.position.y - textHeight / 2);
          maxY = Math.max(maxY, node.position.y + textHeight / 2);
        }
        
        // Calculate dimensions and center
        let networkWidth = maxX - minX;
        let networkHeight = maxY - minY;
        let networkCenterX = (minX + maxX) / 2;
        let networkCenterY = (minY + maxY) / 2;
        
        // Safety check - ensure valid dimensions
        if (networkWidth > 0 && networkHeight > 0) {
          // Calculate zoom to fit with padding
          const verticalLanguages = ['ja', 'zh', 'ko'];
          const isVerticalTicker = verticalLanguages.includes(currentLanguage);
          const isMobile = p.width < 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
          let tickerHeight = isVerticalTicker ? 0 : (isMobile ? 100 : 60);
          let tickerWidth = isVerticalTicker ? (isMobile ? 100 : 60) : 0;
          let topPadding = 10;
          let bottomPadding = 50;
          let sidePadding = 50 + tickerWidth;
          let zoomX = (p.width - sidePadding * 2) / networkWidth;
          let zoomY = ((p.height - tickerHeight) - topPadding - bottomPadding) / networkHeight;
          let calculatedZoom = Math.min(zoomX, zoomY, 1.0);
          
          // Zoom out 10% when network is ready
          targetZoom = calculatedZoom * 0.9;
          
          // Calculate target offsets
          targetOffsetX = -networkCenterX * targetZoom;
          targetOffsetY = -networkCenterY * targetZoom - (topPadding - bottomPadding) / 2;
          
          // Play bouncing sound when network starts appearing
          playBouncingSound();
        } else {
          // Invalid dimensions, skip animation
          needsAutoZoom = false;
        }
      }
      
      // Animate zoom smoothly
      if (autoZoomProgress < 1) {
        autoZoomProgress += 1 / autoZoomDuration;
        autoZoomProgress = Math.min(1, autoZoomProgress);
        
        // Easing function for smooth zoom (ease-out)
        let easedProgress = 1 - Math.pow(1 - autoZoomProgress, 3);
        
        // Interpolate zoom and offset
        viewZoom = startZoom + (targetZoom - startZoom) * easedProgress;
        viewOffsetX = startOffsetX + (targetOffsetX - startOffsetX) * easedProgress;
        viewOffsetY = startOffsetY + (targetOffsetY - startOffsetY) * easedProgress;
        
        // Update network reveal progress (slightly delayed)
        networkRevealProgress = Math.min(1, (autoZoomProgress - 0.2) / 0.8); // Start revealing at 20% of zoom
      } else {
        // Animation complete
        viewZoom = targetZoom;
        viewOffsetX = targetOffsetX;
        viewOffsetY = targetOffsetY;
        networkRevealProgress = 1;
        needsAutoZoom = false;
        autoZoomProgress = 0; // Reset for next time
      }
    }

    // Apply 2D view transform (pan and zoom)
    p.push();
    p.translate(p.width / 2 + viewOffsetX, p.height / 2 + viewOffsetY);
    p.scale(viewZoom);

    // Visualize the network (only when ready)
    if (wordNetwork.nodes.length > 0) {
      visualizeNetwork(p, wordNetwork, mouseVelocityX, mouseVelocityY);
    }
    
    // Draw "thinking" word - appears when spacebar is pressed, separate from all animations
    // It floats independently and stays visible once spacebar has been pressed
    // Only show after spacebar has been pressed (past landing page)
    if (isLoading || !isFirstGeneration || textTyped.length > 0 || wordNetwork.nodes.length > 0) {
      // Global pulsing effect for "thinking" word
      let pulseTime = p.frameCount * 0.04;
      
      // Calculate center of window in world coordinates
      let centerX = -viewOffsetX / viewZoom;
      let centerY = -viewOffsetY / viewZoom;
      
      // Floating position for "thinking" word - moves in larger pattern
      let thinkingTime = p.frameCount * 0.015; // Slower movement
      let thinkingRadius = 25; // Larger radius
      let thinkingX = centerX + Math.cos(thinkingTime) * thinkingRadius;
      let thinkingY = centerY + Math.sin(thinkingTime * 1.3) * thinkingRadius;
      
      // Strong pulsating effect for "thinking" word
      let thinkingPulse = 1.0 + Math.sin(pulseTime * 2.5) * 0.35; // 35% size variation
      let thinkingFontSize = 20 * thinkingPulse;
      
      // Pulsating opacity (breathing effect) - always visible once shown
      let thinkingOpacity = 255 * (0.5 + Math.sin(pulseTime * 2.0) * 0.5); // 50-100% opacity
      
      // Draw "thinking" word
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont('monospace');
      const colors = getColors();
      p.fill(colors.text[0], colors.text[1], colors.text[2], thinkingOpacity);
      p.noStroke();
      p.textSize(thinkingFontSize);
      p.text(t('thinking'), thinkingX, thinkingY);
    }
    
    p.pop();
    
    // Draw ticker at bottom only when voice is speaking
    if (isVoiceSpeaking && currentTextBeingRead) {
      drawTicker(p); // Shows the text being spoken
    }
    
    // Draw dark mode toggle (always visible)
    drawDarkModeToggle(p);
    
    // Draw sound toggle (always visible)
    drawSoundToggle(p);
    
    // Draw home button (only when network is visible)
    if (textTyped.length > 0) {
      drawHomeButton(p);
    }
    
    // Language menu only shown on landing page (handled in displayInstructions)
  };
  
  // Draw ticker at bottom of screen with generated text from realtime model
  function drawTicker(p) {
    // Only show ticker when voice is speaking
    if (!isVoiceSpeaking || !currentTextBeingRead) {
      return;
    }
    
    // Detect mobile device for larger ticker
    const isMobile = p.width < 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    // Determine text direction and orientation based on language
    const rtlLanguages = ['ar']; // Right-to-left languages (horizontal)
    const verticalLanguages = ['ja', 'zh', 'ko']; // Vertical writing languages
    const isRTL = rtlLanguages.includes(currentLanguage);
    const isVertical = verticalLanguages.includes(currentLanguage);
    
    const colors = getColors();
    // Larger font and padding on mobile for better visibility
    let fontSize = isMobile ? 22 : 14; // Larger font on mobile
    let padding = isMobile ? 30 : 20; // More padding on mobile
    
    // Clean up text for display (uses currentTextBeingRead - same text being spoken)
    let displayText = currentTextBeingRead.replace(/\n+/g, ' ').trim();
    
    if (isVertical) {
      // Vertical ticker on right side - scrolls bottom to top
      let tickerWidth = isMobile ? 100 : 60; // Much wider on mobile for better visibility
      let tickerX = p.width - tickerWidth;
      
      // Background for vertical ticker
      p.push();
      p.fill(colors.tickerBg[0], colors.tickerBg[1], colors.tickerBg[2], colors.tickerBg[3] || 240);
      p.noStroke();
      p.rect(tickerX, 0, tickerWidth, p.height);
      
      // Left border
      p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2]);
      p.strokeWeight(1);
      p.line(tickerX, 0, tickerX, p.height);
      p.pop();
      
      // Text styling for vertical
      p.push();
      p.textFont('monospace');
      p.textSize(fontSize);
      p.textAlign(p.CENTER, p.BOTTOM); // Center horizontally, align bottom for vertical text
      p.fill(colors.tickerText[0], colors.tickerText[1], colors.tickerText[2]);
      
      // Calculate text height (for vertical, we need character count * line height)
      let charHeight = fontSize * 1.2; // Approximate height per character
      let textHeight = displayText.length * charHeight;
      
      // Scroll if text is longer than screen - vertical: bottom to top
      if (textHeight > p.height - padding * 2) {
        let scrollSpeed = 4.6475; // Same speed as horizontal
        
        // Vertical: scroll bottom to top (decrease offset, text moves up)
        tickerOffset -= scrollSpeed;
        
        // Reset when scrolled past (start from bottom again for seamless continuous loop)
        if (tickerOffset < -(textHeight + padding * 2)) {
          tickerOffset = p.height; // Start from bottom again
        }
        
        // Draw vertical text - each character drawn vertically, positioned on right side
        let centerX = tickerX + tickerWidth / 2;
        let yPos = p.height - padding + tickerOffset; // Start from bottom, move up
        let spacing = textHeight + padding * 2;
        
        // Draw first instance - characters stacked vertically
        p.push();
        p.translate(centerX, yPos);
        p.rotate(-p.PI / 2); // Rotate -90 degrees (counter-clockwise) for vertical reading
        p.text(displayText, 0, 0);
        p.pop();
        
        // Draw second instance for seamless loop
        if (yPos + textHeight > -spacing) {
          p.push();
          p.translate(centerX, yPos - spacing);
          p.rotate(-p.PI / 2);
          p.text(displayText, 0, 0);
          p.pop();
        }
        
        // Draw third instance if needed
        if (yPos - spacing + textHeight > -spacing * 2) {
          p.push();
          p.translate(centerX, yPos - spacing * 2);
          p.rotate(-p.PI / 2);
          p.text(displayText, 0, 0);
          p.pop();
        }
      } else {
        // Static vertical text if it fits
        tickerOffset = 0;
        let centerX = tickerX + tickerWidth / 2;
        p.push();
        p.translate(centerX, p.height - padding);
        p.rotate(-p.PI / 2);
        p.text(displayText, 0, 0);
        p.pop();
      }
      
      p.pop(); // Close the text styling push from line 889
    } else {
      // Horizontal ticker at bottom
      let tickerHeight = isMobile ? 100 : 60; // Much taller on mobile for better visibility
      let tickerY = p.height - tickerHeight;
      
      // Background for ticker
      p.push();
      p.fill(colors.tickerBg[0], colors.tickerBg[1], colors.tickerBg[2], colors.tickerBg[3] || 240);
      p.noStroke();
      p.rect(0, tickerY, p.width, tickerHeight);
      
      // Top border
      p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2]);
      p.strokeWeight(1);
      p.line(0, tickerY, p.width, tickerY);
      p.pop();
      
      // Text styling
      p.push();
      p.textFont('monospace');
      p.textSize(fontSize);
      // Set text alignment based on direction
      p.textAlign(isRTL ? p.RIGHT : p.LEFT, p.CENTER);
      p.fill(colors.tickerText[0], colors.tickerText[1], colors.tickerText[2]);
      
      // Calculate text width
      let textWidth = p.textWidth(displayText);
      
      // Scroll if text is longer than screen - direction based on language
      if (textWidth > p.width - padding * 2) {
        let scrollSpeed = 4.6475; // 10% faster (was 4.225, originally 2.5)
        
        if (isRTL) {
          // RTL: scroll left to right (increase offset, text appears from left, moves right)
          tickerOffset += scrollSpeed;
          
          // Reset when scrolled past (start from left side again for seamless continuous loop)
          if (tickerOffset > p.width + textWidth + padding * 2) {
            tickerOffset = -(textWidth + padding * 2); // Start from left side again
          }
          
          // Draw multiple copies of text for seamless continuous loop (RTL)
          // Text is right-aligned, starts from left, moves right
          // For right-aligned text, xPos is the right edge, so we add textWidth
          let xPos = padding + tickerOffset + textWidth; // Right edge position (text extends left from here)
          let spacing = textWidth + padding * 2;
          
          // Draw first instance (right-aligned, so text extends left from xPos)
          p.text(displayText, xPos, tickerY + tickerHeight / 2);
          
          // Draw second instance for seamless loop (appears before first disappears)
          if (xPos < p.width + spacing) {
            p.text(displayText, xPos + spacing, tickerY + tickerHeight / 2);
          }
          
          // Draw third instance if needed for very long text or fast scrolling
          if (xPos + spacing < p.width + spacing * 2) {
            p.text(displayText, xPos + spacing * 2, tickerY + tickerHeight / 2);
          }
        } else {
          // LTR: scroll right to left (decrease offset)
          tickerOffset -= scrollSpeed;
          
          // Reset when scrolled past (start from right side again for seamless continuous loop)
          if (tickerOffset < -(textWidth + padding * 2)) {
            tickerOffset = p.width; // Start from right side again
          }
          
          // Draw multiple copies of text for seamless continuous loop (LTR)
          let xPos = padding + tickerOffset;
          let spacing = textWidth + padding * 2;
          
          // Draw first instance
          p.text(displayText, xPos, tickerY + tickerHeight / 2);
          
          // Draw second instance for seamless loop (appears before first disappears)
          if (xPos + textWidth > -spacing) {
            p.text(displayText, xPos + spacing, tickerY + tickerHeight / 2);
          }
          
          // Draw third instance if needed for very long text or fast scrolling
          if (xPos + spacing + textWidth > -spacing) {
            p.text(displayText, xPos + spacing * 2, tickerY + tickerHeight / 2);
          }
        }
      } else {
        // Static text if it fits
        tickerOffset = 0;
        if (isRTL) {
          p.text(displayText, p.width - padding, tickerY + tickerHeight / 2);
        } else {
          p.text(displayText, padding, tickerY + tickerHeight / 2);
        }
      }
      
      p.pop();
    }
  }

  // Build word network from generated text (from realtime model) - same textTyped used by ticker
  function buildWordNetwork(text) {
    // Don't reset collapse state yet - keep collapsed words visible until new network is ready
    // We'll reset it after we've built the new nodes
    
    // Extract words from text - supports all languages including CJK characters
    // For Latin scripts: extract words (letters)
    // For CJK (Chinese, Japanese, Korean): extract individual characters/words
    // For other scripts: extract word characters
    
    let words = [];
    
    // Language-specific word extraction
    if (currentLanguage === 'zh' || currentLanguage === 'ja' || currentLanguage === 'ko') {
      // For Chinese, Japanese, and Korean: extract characters and words
      // Match CJK characters (Unicode ranges for Chinese, Japanese, Korean)
      const cjkPattern = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+/g;
      const cjkMatches = text.match(cjkPattern) || [];
      
      // Also extract any Latin words that might be mixed in
      const latinPattern = /[a-zA-Z]+/g;
      const latinMatches = text.toLowerCase().match(latinPattern) || [];
      
      // Combine and process CJK words (split long sequences into individual characters or 2-char words)
      // For CJK languages, use smarter extraction to avoid overload
      // Extract meaningful units while keeping computational load manageable
      cjkMatches.forEach(match => {
        if (currentLanguage === 'zh') {
          // For Chinese: prefer 2-character words (more meaningful)
          // Only extract 2-character combinations, skip single chars to reduce nodes
          for (let i = 0; i < match.length - 1; i++) {
            words.push(match.substring(i, i + 2));
          }
          // Add single characters only if they appear multiple times (likely meaningful)
          let charFreq = {};
          for (let i = 0; i < match.length; i++) {
            charFreq[match[i]] = (charFreq[match[i]] || 0) + 1;
          }
          for (let char in charFreq) {
            if (charFreq[char] >= 2) { // Only frequent single chars
              words.push(char);
            }
          }
        } else if (currentLanguage === 'ja') {
          // For Japanese: extract 2-character combinations (more meaningful than single chars)
          // Prioritize 2-char combinations, add frequent single chars
          for (let i = 0; i < match.length - 1; i++) {
            words.push(match.substring(i, i + 2));
          }
          // Add single characters only if frequent
          let charFreq = {};
          for (let i = 0; i < match.length; i++) {
            charFreq[match[i]] = (charFreq[match[i]] || 0) + 1;
          }
          for (let char in charFreq) {
            if (charFreq[char] >= 2) {
              words.push(char);
            }
          }
        } else if (currentLanguage === 'ko') {
          // For Korean: extract 2-character combinations (more meaningful)
          // Korean words are often 2+ characters, so prioritize those
          for (let i = 0; i < match.length - 1; i++) {
            words.push(match.substring(i, i + 2));
          }
          // Add single characters only if they appear multiple times
          let charFreq = {};
          for (let i = 0; i < match.length; i++) {
            charFreq[match[i]] = (charFreq[match[i]] || 0) + 1;
          }
          for (let char in charFreq) {
            if (charFreq[char] >= 2) {
              words.push(char);
            }
          }
        }
      });
      
      words = words.concat(latinMatches);
    } else {
      // For other languages: use Unicode word boundary regex
      // This handles Latin scripts, Cyrillic, Arabic, etc.
      const wordPattern = /\p{L}+/gu; // Unicode letter characters
      const matches = text.match(wordPattern) || [];
      words = matches.map(w => w.toLowerCase());
    }
    
    // Language-aware stop words filtering
    const stopWordsByLanguage = {
      en: ['and', 'the', 'a', 'an', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'then', 'than', 'when', 'where', 'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'if', 'else', 'all', 'each', 'every', 'some', 'any', 'no', 'not', 'only', 'just', 'also', 'too', 'very', 'so', 'such', 'more', 'most', 'much', 'many', 'few', 'little', 'other', 'another', 'one', 'two', 'three', 'first', 'second', 'last', 'next', 'previous'],
      es: ['y', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'o', 'pero', 'en', 'de', 'a', 'por', 'para', 'con', 'sin', 'sobre', 'entre', 'es', 'son', 'era', 'eran', 'fue', 'fueron', 'ser', 'estar', 'tener', 'haber', 'hacer', 'poder', 'deber', 'querer', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'que', 'cual', 'quien', 'cuando', 'donde', 'como', 'porque', 'si', 'no', 'también', 'muy', 'más', 'menos', 'mucho', 'poco', 'todo', 'todos', 'cada', 'alguno', 'ninguno'],
      fr: ['et', 'le', 'la', 'les', 'un', 'une', 'des', 'ou', 'mais', 'dans', 'de', 'à', 'pour', 'avec', 'sans', 'sur', 'entre', 'est', 'sont', 'était', 'étaient', 'être', 'avoir', 'faire', 'pouvoir', 'devoir', 'vouloir', 'ce', 'cette', 'ces', 'celui', 'celle', 'ceux', 'celles', 'que', 'qui', 'quoi', 'quand', 'où', 'comment', 'pourquoi', 'si', 'non', 'aussi', 'très', 'plus', 'moins', 'beaucoup', 'peu', 'tout', 'tous', 'chaque', 'quelque', 'aucun'],
      de: ['und', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'eines', 'einem', 'einen', 'oder', 'aber', 'in', 'auf', 'an', 'zu', 'für', 'mit', 'von', 'aus', 'ist', 'sind', 'war', 'waren', 'sein', 'haben', 'werden', 'können', 'müssen', 'sollen', 'wollen', 'dieser', 'diese', 'dieses', 'jener', 'jene', 'jenes', 'der', 'die', 'das', 'welcher', 'welche', 'welches', 'wann', 'wo', 'was', 'wie', 'warum', 'wenn', 'nicht', 'auch', 'sehr', 'mehr', 'weniger', 'viel', 'wenig', 'alle', 'jeder', 'einige', 'kein'],
      it: ['e', 'il', 'la', 'lo', 'gli', 'le', 'un', 'una', 'uno', 'o', 'ma', 'in', 'di', 'a', 'da', 'per', 'con', 'su', 'tra', 'fra', 'è', 'sono', 'era', 'erano', 'essere', 'avere', 'fare', 'potere', 'dovere', 'volere', 'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle', 'che', 'chi', 'quando', 'dove', 'come', 'perché', 'se', 'non', 'anche', 'molto', 'più', 'meno', 'tanto', 'poco', 'tutto', 'ogni', 'alcuni', 'nessuno'],
      pt: ['e', 'o', 'a', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'ou', 'mas', 'em', 'de', 'a', 'para', 'por', 'com', 'sem', 'sobre', 'entre', 'é', 'são', 'era', 'eram', 'ser', 'estar', 'ter', 'haver', 'fazer', 'poder', 'dever', 'querer', 'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'que', 'qual', 'quem', 'quando', 'onde', 'como', 'porque', 'se', 'não', 'também', 'muito', 'mais', 'menos', 'todo', 'todos', 'cada', 'algum', 'nenhum'],
      ja: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や', 'れる', 'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あの', 'どの', 'いつ', 'どこ', 'どう', 'なぜ', 'もし', 'も', 'とても', 'より', 'あまり', 'たくさん', '少し', 'すべて', '各', 'いくつか', '何も'],
      zh: ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '这些', '那些', '什么', '哪个', '谁', '什么时候', '哪里', '怎么', '为什么', '如果', '也', '很', '更', '最', '很多', '一点', '所有', '每个', '一些', '没有'],
      ko: ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '와', '과', '도', '로', '으로', '만', '부터', '까지', '처럼', '같이', '보다', '하고', '그리고', '또', '또한', '또는', '그런데', '하지만', '그러나', '그래서', '그러므로', '그러면', '만약', '만일', '이것', '그것', '저것', '이런', '그런', '저런', '어떤', '무엇', '누구', '언제', '어디', '어떻게', '왜', '모든', '모두', '각', '각각', '어떤', '어느', '몇', '많은', '적은', '많이', '조금', '전혀', '아니다', '있다', '없다', '하다', '되다', '이다', '아니다', '그', '이', '저', '그의', '이의', '저의', '그들의', '이들의', '저들의'],
      ar: ['في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'هؤلاء', 'ذلك', 'تلك', 'أولئك', 'الذي', 'التي', 'الذين', 'اللاتي', 'اللائي', 'اللذان', 'اللتان', 'اللذين', 'اللتين', 'ما', 'ماذا', 'من', 'متى', 'أين', 'كيف', 'لماذا', 'إذا', 'إن', 'أن', 'كان', 'كانت', 'كانوا', 'يكون', 'تكون', 'يكونون', 'ليس', 'ليست', 'ليسوا', 'له', 'لها', 'لهم', 'لهن', 'لهما', 'هو', 'هي', 'هم', 'هن', 'هما', 'أنت', 'أنت', 'أنتم', 'أنتن', 'أنا', 'نحن', 'و', 'أو', 'لكن', 'بل', 'ف', 'ثم', 'حتى', 'أيضاً', 'كذلك', 'أيضاً', 'كل', 'جميع', 'بعض', 'أي', 'لا', 'لم', 'لن', 'لما', 'قد', 'سوف', 'س', 'قد', 'كان', 'كانت', 'كانوا', 'كانت', 'كانتا', 'كانوا', 'كن', 'كنت', 'كنتم', 'كنتن', 'كنت', 'كنا'],
      tr: ['ve', 'ile', 'veya', 'ya', 'ama', 'fakat', 'ancak', 'lakin', 'de', 'da', 'ki', 'mi', 'mı', 'mu', 'mü', 'bu', 'şu', 'o', 'bunlar', 'şunlar', 'onlar', 'bu', 'şu', 'o', 'bunun', 'şunun', 'onun', 'bunun', 'şunun', 'onun', 'bunların', 'şunların', 'onların', 'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'benim', 'senin', 'onun', 'bizim', 'sizin', 'onların', 'ne', 'kim', 'hangi', 'nasıl', 'nerede', 'nereden', 'nereye', 'ne zaman', 'niçin', 'niye', 'neden', 'her', 'tüm', 'bütün', 'bazı', 'birkaç', 'hiç', 'hiçbir', 'bir', 'iki', 'üç', 'var', 'yok', 'olmak', 'etmek', 'yapmak', 'gitmek', 'gelmek', 'görmek', 'bilmek', 'istemek', 'daha', 'en', 'çok', 'az', 'biraz', 'fazla', 'az', 'kadar', 'gibi', 'için', 'ile', 'göre', 'kadar', 'sonra', 'önce', 'şimdi', 'şu', 'bu', 'o', 'böyle', 'şöyle', 'öyle', 'nasıl', 'ne', 'kim', 'hangi']
    };
    
    const stopWords = stopWordsByLanguage[currentLanguage] || stopWordsByLanguage['en'];
    words = words.filter(word => {
      // Filter out stop words (case-insensitive for non-CJK)
      if (currentLanguage === 'zh' || currentLanguage === 'ja' || currentLanguage === 'ko') {
        return !stopWords.includes(word) && word.length > 0;
      } else {
        return !stopWords.includes(word.toLowerCase()) && word.length > 1;
      }
    });
    let uniqueWords = [...new Set(words)];
    
    // For CJK languages, limit nodes to prevent overload
    // Use frequency-based filtering to keep most meaningful words
    if (currentLanguage === 'zh' || currentLanguage === 'ja' || currentLanguage === 'ko') {
      // Count frequency of each unique word
      let wordFrequencies = {};
      words.forEach(word => {
        wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
      });
      
      // Sort by frequency and keep top words (max 40 nodes for CJK)
      const maxNodesCJK = 40;
      uniqueWords = uniqueWords
        .map(word => ({ word, freq: wordFrequencies[word] }))
        .sort((a, b) => b.freq - a.freq)
        .slice(0, maxNodesCJK)
        .map(item => item.word);
    }
    
    // Store old nodes if they exist (to keep collapsed words visible during transition)
    let oldNodes = null;
    let wasMovingToCenter = false;
    if (wordNetwork.nodes.length > 0 && isMovingToCenter) {
      oldNodes = [...wordNetwork.nodes];
      wasMovingToCenter = true;
      // Don't reset collapse state yet - keep old nodes visible
    } else {
      // Reset collapse state if not moving to center
      isCollapsing = false;
      collapseTarget = null;
      collapseProgress = 0;
      pendingGenerationWord = null;
      isMovingToCenter = false;
      centerMoveProgress = 0;
      centerHoldProgress = 0;
    }
    
    // Enhanced semantic clusters with conceptual relationships
    let semanticClusters = {
      language: ['language', 'linguistic', 'syntax', 'semantic', 'grammar', 'vocabulary', 'word', 'words', 'text', 'letter', 'letters', 'character', 'characters', 'symbol', 'symbols', 'sign', 'signs', 'meaning', 'meanings', 'communication', 'expression', 'discourse', 'utterance', 'phrase', 'sentence', 'paragraph', 'narrative', 'story', 'discourse', 'dialogue', 'speech', 'writing', 'written', 'oral', 'verbal', 'lexical', 'morphological', 'phonetic', 'phonological', 'computational', 'linguistics', 'corpus', 'tokenization', 'parsing', 'morphology', 'syntax', 'tree', 'trees', 'parse', 'parsing', 'grammar', 'grammars', 'lexical', 'morphology', 'morphological', 'phonology', 'phonological'],
      space: ['space', 'spatial', 'dimension', 'dimensions', 'distance', 'area', 'region', 'zone', 'field', 'volume', 'extent', 'scope', 'range', 'boundary', 'boundaries', 'edge', 'edges', 'margin', 'margins', 'border', 'borders', 'territory', 'territories', 'domain', 'domains', 'realm', 'realms', 'expanse', 'expanse', 'void', 'voids', 'vacuum', 'vacuum', 'terrain', 'landscape', 'topography', 'geography', 'location', 'locations', 'position', 'positions', 'place', 'places', 'site', 'sites', 'locale', 'locales', 'navigate', 'navigation', 'direction', 'directions', 'orientation', 'coordinates', 'mapping', 'map', 'maps', 'vector', 'vectors', 'space', 'spaces', 'computational', 'space', 'topology', 'topological', 'graph', 'graphs', 'node', 'nodes', 'edge', 'edges', 'network', 'networks', 'mesh', 'lattice', 'grid'],
      latent: ['latent', 'hidden', 'embedded', 'encoded', 'implicit', 'potential', 'underlying', 'submerged', 'concealed', 'invisible', 'embedded', 'embedding', 'embeddings', 'vector', 'vectors', 'representation', 'representations', 'model', 'models', 'neural', 'network', 'networks', 'machine', 'learning', 'ai', 'artificial', 'intelligence', 'algorithm', 'algorithms', 'data', 'dataset', 'training', 'trained', 'technology', 'tech', 'technological', 'computational', 'digital', 'binary', 'code', 'programming', 'software', 'hardware', 'system', 'systems', 'architecture', 'framework', 'platform', 'probability', 'probabilities', 'probabilistic', 'statistical', 'statistics', 'distribution', 'distributions', 'frequency', 'frequencies', 'entropy', 'information', 'markov', 'chain', 'chains', 'n-gram', 'ngram', 'ngrams', 'token', 'tokens', 'tokenization', 'corpus', 'corpora']
    };
    
    // Conceptual relationship groups - words that are conceptually related
    let conceptualGroups = {
      abstraction: ['concept', 'idea', 'notion', 'theory', 'principle', 'abstract', 'theoretical', 'philosophical', 'metaphysical', 'meaning', 'significance', 'essence', 'nature', 'being', 'existence'],
      physics: ['physics', 'physical', 'force', 'forces', 'energy', 'motion', 'movement', 'dynamics', 'kinetic', 'momentum', 'velocity', 'acceleration', 'gravity', 'mass', 'particle', 'particles', 'wave', 'waves', 'field', 'fields', 'quantum', 'electromagnetic', 'interaction', 'interactions', 'law', 'laws', 'equation', 'equations', 'formula', 'formulas'],
      computational_linguistics: ['computational', 'linguistics', 'linguistic', 'corpus', 'corpora', 'tokenization', 'tokenize', 'parsing', 'parse', 'parser', 'syntax', 'tree', 'trees', 'grammar', 'morphology', 'morphological', 'lexical', 'semantic', 'analysis', 'nlp', 'natural', 'language', 'processing', 'tagging', 'pos', 'part', 'speech', 'chunking', 'dependency', 'constituency'],
      computation: ['computation', 'computational', 'compute', 'computing', 'algorithm', 'algorithms', 'process', 'processing', 'execute', 'execution', 'calculate', 'calculation', 'compute', 'computation', 'computational', 'space', 'topology', 'topological', 'graph', 'graphs', 'node', 'nodes', 'edge', 'edges', 'network', 'networks', 'mesh', 'lattice', 'grid', 'matrix', 'vector', 'vectors', 'dimension', 'dimensions', 'coordinate', 'coordinates', 'mapping', 'map'],
      probability: ['probability', 'probabilities', 'probabilistic', 'statistical', 'statistics', 'distribution', 'distributions', 'frequency', 'frequencies', 'entropy', 'information', 'theory', 'markov', 'chain', 'chains', 'n-gram', 'ngram', 'ngrams', 'bigram', 'trigram', 'unigram', 'likelihood', 'conditional', 'bayesian', 'prior', 'posterior', 'expectation', 'variance', 'standard', 'deviation', 'mean', 'median', 'mode'],
      structure: ['structure', 'form', 'pattern', 'organization', 'arrangement', 'framework', 'architecture', 'system', 'network', 'grid', 'matrix', 'lattice', 'hierarchy', 'order'],
      network: ['network', 'networks', 'graph', 'graphs', 'node', 'nodes', 'edge', 'edges', 'connection', 'connections', 'link', 'links', 'topology', 'topological', 'mesh', 'web', 'lattice', 'grid', 'structure', 'system', 'architecture'],
      transformation: ['transform', 'change', 'shift', 'evolve', 'develop', 'emerge', 'become', 'transition', 'convert', 'translate', 'encode', 'decode', 'process'],
      connection: ['connect', 'link', 'relate', 'associate', 'bind', 'join', 'unite', 'merge', 'combine', 'integrate', 'bridge', 'relationship', 'connection', 'relation'],
      perception: ['perceive', 'see', 'observe', 'understand', 'comprehend', 'grasp', 'recognize', 'interpret', 'read', 'decode', 'visualize', 'imagine'],
      generation: ['generate', 'create', 'produce', 'form', 'make', 'build', 'construct', 'compose', 'synthesize', 'emerge', 'arise', 'manifest']
    };
    
    // Conceptual synonyms and related terms
    let conceptualSynonyms = {
      'language': ['text', 'word', 'meaning', 'communication', 'expression', 'discourse'],
      'space': ['dimension', 'distance', 'area', 'field', 'domain', 'realm'],
      'latent': ['hidden', 'embedded', 'implicit', 'potential', 'underlying'],
      'representation': ['model', 'form', 'structure', 'pattern', 'image'],
      'network': ['system', 'structure', 'web', 'mesh', 'graph'],
      'meaning': ['significance', 'sense', 'interpretation', 'understanding'],
      'dimension': ['space', 'extent', 'scope', 'range', 'scale'],
      'vector': ['direction', 'path', 'trajectory', 'course'],
      'embedding': ['encoding', 'representation', 'mapping', 'translation'],
      'abstraction': ['concept', 'idea', 'theory', 'principle', 'abstract', 'theoretical'],
      'physics': ['force', 'energy', 'motion', 'dynamics', 'field', 'interaction', 'law', 'equation'],
      'theory': ['principle', 'law', 'concept', 'abstraction', 'model', 'framework'],
      'computational_linguistics': ['nlp', 'parsing', 'tokenization', 'corpus', 'syntax', 'grammar', 'morphology', 'semantic', 'analysis'],
      'probability': ['statistical', 'distribution', 'frequency', 'entropy', 'markov', 'n-gram', 'likelihood', 'bayesian'],
      'parsing': ['parse', 'syntax', 'tree', 'grammar', 'structure'],
      'tokenization': ['token', 'tokens', 'corpus', 'text', 'processing'],
      'probability_distribution': ['distribution', 'frequency', 'statistical', 'likelihood', 'probability'],
      'computation': ['compute', 'algorithm', 'process', 'calculate', 'execute', 'space', 'topology', 'graph', 'network', 'node', 'edge'],
      'computational_space': ['computation', 'space', 'topology', 'graph', 'network', 'dimension', 'vector', 'coordinate'],
      'network_space': ['network', 'space', 'graph', 'topology', 'node', 'edge', 'dimension', 'vector', 'coordinate'],
      'space': ['dimension', 'vector', 'coordinate', 'topology', 'graph', 'network', 'node', 'edge', 'computational'],
      'network': ['graph', 'topology', 'node', 'edge', 'space', 'dimension', 'vector', 'computational', 'structure']
    };
    
    // Helper function to check if word is in a conceptual group
    function getConceptualGroup(word) {
      for (let groupName in conceptualGroups) {
        if (conceptualGroups[groupName].includes(word)) {
          return groupName;
        }
      }
      return null;
    }
    
    // Helper function to check conceptual synonyms
    function areConceptuallyRelated(word1, word2) {
      // Direct match
      if (word1 === word2) return true;
      
      // Check synonyms
      for (let key in conceptualSynonyms) {
        let synonyms = conceptualSynonyms[key];
        if ((synonyms.includes(word1) || word1 === key) && 
            (synonyms.includes(word2) || word2 === key)) {
          return true;
        }
      }
      
      // Check conceptual groups
      let group1 = getConceptualGroup(word1);
      let group2 = getConceptualGroup(word2);
      if (group1 && group1 === group2) return true;
      
      // Abstractions become physics - create strong connection
      if ((group1 === 'abstraction' && group2 === 'physics') || 
          (group1 === 'physics' && group2 === 'abstraction')) {
        return true;
      }
      
      // Computational linguistics and probability are closely related
      if ((group1 === 'computational_linguistics' && group2 === 'probability') || 
          (group1 === 'probability' && group2 === 'computational_linguistics')) {
        return true;
      }
      
      // Computation, space, and networks are strongly related
      let computationRelated = ['computation', 'network', 'structure'];
      if (computationRelated.includes(group1) && computationRelated.includes(group2)) {
        return true;
      }
      
      // Space relates to computation and networks
      if (group1 === 'space' && (group2 === 'computation' || group2 === 'network')) {
        return true;
      }
      if (group2 === 'space' && (group1 === 'computation' || group1 === 'network')) {
        return true;
      }
      
      return false;
    }
    
    // Calculate semantic vector for each word with enhanced conceptual analysis
    // Build new nodes in temporary array to keep old collapsed nodes visible
    let newNodes = uniqueWords.map((word, index) => {
      let semanticVector = { x: 0, y: 0, z: 0 };
      let clusterCount = 0;
      let conceptualWeight = 0;
      
      // Primary semantic clusters
      for (let clusterName in semanticClusters) {
        if (semanticClusters[clusterName].includes(word)) {
          switch(clusterName) {
            case 'language':
              semanticVector.x += 1; // X-axis: Language
              break;
            case 'space':
              semanticVector.y += 1; // Y-axis: Space
              break;
            case 'latent':
              semanticVector.z += 1; // Z-axis: Latent space tech
              break;
          }
          clusterCount++;
        }
      }
      
      // Add conceptual group influence
      let conceptualGroup = getConceptualGroup(word);
      if (conceptualGroup) {
        conceptualWeight = 0.5; // Moderate influence from conceptual groups
        // Distribute conceptual weight across dimensions based on group type
        switch(conceptualGroup) {
          case 'abstraction':
            semanticVector.x += 0.3; // More language-oriented
            semanticVector.z += 0.2; // Some latent space connection
            break;
          case 'physics':
            semanticVector.y += 0.3; // Space-oriented (physical space)
            semanticVector.z += 0.3; // Strong latent space connection (abstractions become physics)
            semanticVector.x += 0.1; // Some language connection (theoretical)
            break;
          case 'structure':
            semanticVector.y += 0.3; // More space-oriented
            semanticVector.z += 0.2; // Some latent space connection
            break;
          case 'transformation':
            semanticVector.z += 0.4; // Strong latent space connection
            semanticVector.x += 0.1; // Some language connection
            break;
          case 'connection':
            semanticVector.z += 0.3; // Latent space (networks)
            semanticVector.y += 0.2; // Spatial connections
            break;
          case 'perception':
            semanticVector.x += 0.3; // Language/meaning
            semanticVector.z += 0.2; // Latent representation
            break;
          case 'generation':
            semanticVector.z += 0.4; // Strong latent space (generation)
            semanticVector.x += 0.1; // Language creation
            break;
          case 'computational_linguistics':
            semanticVector.x += 0.4; // Strong language connection (computational linguistics)
            semanticVector.z += 0.3; // Latent space (language models, embeddings)
            semanticVector.y += 0.1; // Some spatial (vector spaces)
            break;
          case 'probability':
            semanticVector.z += 0.4; // Strong latent space (probabilistic models)
            semanticVector.x += 0.3; // Language (probabilistic language models)
            semanticVector.y += 0.1; // Some spatial (distributions in space)
            break;
          case 'computation':
            semanticVector.y += 0.4; // Strong space connection (computational space)
            semanticVector.z += 0.3; // Latent space (networks, algorithms)
            semanticVector.x += 0.2; // Language (computation processes)
            break;
          case 'network':
            semanticVector.y += 0.3; // Space (network topology, spatial structure)
            semanticVector.z += 0.4; // Strong latent space (networks, graphs)
            semanticVector.x += 0.1; // Some language (network representation)
            break;
        }
        clusterCount += conceptualWeight;
      }
      
      // Normalize
      if (clusterCount > 0) {
        semanticVector.x /= clusterCount;
        semanticVector.y /= clusterCount;
        semanticVector.z /= clusterCount;
      } else {
        // Distribute unrecognized words in a pattern
        let positionRatio = index / Math.max(uniqueWords.length, 1);
        semanticVector.x = (positionRatio - 0.5) * 0.5;
        semanticVector.y = Math.sin(positionRatio * Math.PI * 2) * 0.3;
        semanticVector.z = Math.cos(positionRatio * Math.PI * 2) * 0.3;
      }
      
      // Position in 2D space - map 3D semantic vector to 2D
      // X-axis: Language, Y-axis: Space, Z-axis (latent) affects both
      let scale = 800; // Much larger scale for more distance between words
      let position = {
        x: (semanticVector.x + semanticVector.z * 0.5) * scale, // Language + Latent influence
        y: (semanticVector.y + semanticVector.z * 0.5) * scale  // Space + Latent influence
      };
      
      // Count word frequency for size - language-aware
      let frequency;
      if (currentLanguage === 'zh' || currentLanguage === 'ja' || currentLanguage === 'ko') {
        // For CJK: count occurrences directly (no word boundaries)
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        frequency = (text.match(new RegExp(escapedWord, 'g')) || []).length;
      } else {
        // For other languages: use word boundaries
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        frequency = (text.match(new RegExp('\\b' + escapedWord + '\\b', 'gi')) || []).length;
      }
      let size = 10 + frequency * 5;
      
      return {
        id: index,
        word: word,
        position: position,
        basePosition: { ...position }, // Store original semantic position
        semanticVector: semanticVector,
        size: size,
        frequency: frequency,
        velocity: { x: 0, y: 0 }, // 2D physics simulation
        cluster: getPrimaryCluster(semanticVector)
      };
    });
    
    // Helper function to get primary cluster for a node
    function getPrimaryCluster(semanticVector) {
      let max = Math.max(Math.abs(semanticVector.x), Math.abs(semanticVector.y), Math.abs(semanticVector.z));
      if (Math.abs(semanticVector.x) === max) return 'language';
      if (Math.abs(semanticVector.y) === max) return 'space';
      if (Math.abs(semanticVector.z) === max) return 'latent';
      return 'mixed';
    }
    
    // Create edges between semantically similar words
    // First, collect all potential edges with their strengths
    let allEdges = [];
    
    // Higher threshold for CJK languages to reduce edge count
    // CJK creates more nodes, so we need stricter filtering
    const edgeThreshold = (currentLanguage === 'zh' || currentLanguage === 'ja' || currentLanguage === 'ko') ? 0.65 : 0.55;
    
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        let node1 = newNodes[i];
        let node2 = newNodes[j];
        
        // Calculate semantic similarity (cosine similarity)
        let dotProduct = node1.semanticVector.x * node2.semanticVector.x +
                        node1.semanticVector.y * node2.semanticVector.y +
                        node1.semanticVector.z * node2.semanticVector.z;
        
        let mag1 = Math.sqrt(node1.semanticVector.x**2 + node1.semanticVector.y**2 + node1.semanticVector.z**2);
        let mag2 = Math.sqrt(node2.semanticVector.x**2 + node2.semanticVector.y**2 + node2.semanticVector.z**2);
        
        let similarity = mag1 > 0 && mag2 > 0 ? dotProduct / (mag1 * mag2) : 0;
        
        // Check conceptual relationship - boost strength if conceptually related
        let conceptualBonus = 0;
        if (areConceptuallyRelated(node1.word, node2.word)) {
          conceptualBonus = 0.3; // Strong bonus for conceptual relationships
        }
        
        // Also check if words appear near each other in text (reduced weight)
        // Find word positions - language-aware
        let word1Index, word2Index;
        if (currentLanguage === 'zh' || currentLanguage === 'ja' || currentLanguage === 'ko') {
          // For CJK: direct indexOf (case-sensitive)
          word1Index = text.indexOf(node1.word);
          word2Index = text.indexOf(node2.word);
        } else {
          // For other languages: case-insensitive
          word1Index = text.toLowerCase().indexOf(node1.word.toLowerCase());
          word2Index = text.toLowerCase().indexOf(node2.word.toLowerCase());
        }
        let proximity = word1Index >= 0 && word2Index >= 0 ? 
                       1 / (1 + Math.abs(word1Index - word2Index) / 50) : 0;
        
        // Create edge - prioritize conceptual and semantic relationships
        // Reduced proximity weight, added conceptual bonus
        let strength = similarity * 0.7 + proximity * 0.1 + conceptualBonus;
        
        // Store all edges (we'll filter later but ensure connectivity)
        allEdges.push({
          source: i,
          target: j,
          strength: strength,
          cluster: getClusterName(node1, node2)
        });
      }
    }
    
    // Sort edges by strength (strongest first)
    allEdges.sort((a, b) => b.strength - a.strength);
    
    // Track which nodes are connected
    let connectedNodes = new Set();
    wordNetwork.edges = [];
    
    // First pass: add edges above threshold, ensuring all nodes get at least one connection
    for (let edge of allEdges) {
      let sourceConnected = connectedNodes.has(edge.source);
      let targetConnected = connectedNodes.has(edge.target);
      
      // Add edge if:
      // 1. It's above threshold, OR
      // 2. One of the nodes is not yet connected (ensure connectivity)
      if (edge.strength > edgeThreshold || !sourceConnected || !targetConnected) {
        wordNetwork.edges.push(edge);
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }
    }
    
    // Ensure all nodes are connected (fallback: connect isolated nodes to their best match)
    for (let i = 0; i < newNodes.length; i++) {
      if (!connectedNodes.has(i)) {
        // Find the best connection for this isolated node
        let bestEdge = null;
        let bestStrength = -Infinity;
        
        for (let edge of allEdges) {
          if ((edge.source === i || edge.target === i) && edge.strength > bestStrength) {
            bestEdge = edge;
            bestStrength = edge.strength;
          }
        }
        
        // Add the best connection if found
        if (bestEdge && !wordNetwork.edges.some(e => 
          (e.source === bestEdge.source && e.target === bestEdge.target) ||
          (e.source === bestEdge.target && e.target === bestEdge.source)
        )) {
          wordNetwork.edges.push(bestEdge);
          connectedNodes.add(i);
        }
      }
    }
    
    // Limit edges per node for CJK languages to prevent overload
    // Keep only strongest connections per node, but ensure all nodes remain connected
    if ((currentLanguage === 'zh' || currentLanguage === 'ja' || currentLanguage === 'ko') && wordNetwork.edges.length > 0) {
      const maxEdgesPerNode = 8; // Maximum connections per node
      let edgesByNode = {};
      
      // Group edges by source and target nodes
      wordNetwork.edges.forEach(edge => {
        if (!edgesByNode[edge.source]) {
          edgesByNode[edge.source] = [];
        }
        if (!edgesByNode[edge.target]) {
          edgesByNode[edge.target] = [];
        }
        edgesByNode[edge.source].push(edge);
        // Also track reverse direction
        edgesByNode[edge.target].push({
          source: edge.target,
          target: edge.source,
          strength: edge.strength,
          cluster: edge.cluster
        });
      });
      
      // Keep only top N strongest edges per node, but ensure connectivity
      let filteredEdges = [];
      let edgeSet = new Set(); // Track added edges to avoid duplicates
      let nodeConnections = {}; // Track how many connections each node has
      
      // Initialize connection counts
      for (let i = 0; i < newNodes.length; i++) {
        nodeConnections[i] = 0;
      }
      
      // Sort all edges by strength globally
      let sortedEdges = [...wordNetwork.edges].sort((a, b) => b.strength - a.strength);
      
      // First pass: add edges ensuring each node gets at least one connection
      for (let edge of sortedEdges) {
        let edgeKey = `${edge.source}-${edge.target}`;
        let reverseKey = `${edge.target}-${edge.source}`;
        
        if (edgeSet.has(edgeKey) || edgeSet.has(reverseKey)) continue;
        
        let sourceConnections = nodeConnections[edge.source] || 0;
        let targetConnections = nodeConnections[edge.target] || 0;
        
        // Add edge if:
        // 1. Both nodes need more connections (under limit), OR
        // 2. At least one node has no connections yet (ensure connectivity)
        if ((sourceConnections < maxEdgesPerNode && targetConnections < maxEdgesPerNode) ||
            sourceConnections === 0 || targetConnections === 0) {
          filteredEdges.push(edge);
          edgeSet.add(edgeKey);
          nodeConnections[edge.source] = (nodeConnections[edge.source] || 0) + 1;
          nodeConnections[edge.target] = (nodeConnections[edge.target] || 0) + 1;
        }
      }
      
      // Second pass: ensure all nodes have at least one connection
      for (let i = 0; i < newNodes.length; i++) {
        if (nodeConnections[i] === 0) {
          // Find best connection for this isolated node
          let bestEdge = null;
          let bestStrength = -Infinity;
          
          for (let edge of sortedEdges) {
            if ((edge.source === i || edge.target === i) && edge.strength > bestStrength) {
              let edgeKey = `${edge.source}-${edge.target}`;
              let reverseKey = `${edge.target}-${edge.source}`;
              if (!edgeSet.has(edgeKey) && !edgeSet.has(reverseKey)) {
                bestEdge = edge;
                bestStrength = edge.strength;
              }
            }
          }
          
          if (bestEdge) {
            filteredEdges.push(bestEdge);
            let edgeKey = `${bestEdge.source}-${bestEdge.target}`;
            edgeSet.add(edgeKey);
            nodeConnections[bestEdge.source] = (nodeConnections[bestEdge.source] || 0) + 1;
            nodeConnections[bestEdge.target] = (nodeConnections[bestEdge.target] || 0) + 1;
          }
        }
      }
      
      wordNetwork.edges = filteredEdges;
    }
    
    // Helper function to determine cluster name for edge
    function getClusterName(node1, node2) {
      // Check which cluster both nodes belong to
      let max1 = Math.max(Math.abs(node1.semanticVector.x), Math.abs(node1.semanticVector.y), Math.abs(node1.semanticVector.z));
      let max2 = Math.max(Math.abs(node2.semanticVector.x), Math.abs(node2.semanticVector.y), Math.abs(node2.semanticVector.z));
      
      if (Math.abs(node1.semanticVector.x) === max1 && Math.abs(node2.semanticVector.x) === max2) return 'language';
      if (Math.abs(node1.semanticVector.y) === max1 && Math.abs(node2.semanticVector.y) === max2) return 'space';
      if (Math.abs(node1.semanticVector.z) === max1 && Math.abs(node2.semanticVector.z) === max2) return 'latent';
      return 'mixed';
    }
    
    // Store old collapsed nodes to keep them visible during birth animation
    if (wasMovingToCenter && wordNetwork.nodes.length > 0) {
      oldCollapsedNodes = [...wordNetwork.nodes]; // Keep old nodes visible
    }
    
    // Now that new network is fully built, replace old nodes with new ones
    // Old collapsed nodes will be cleared when birth animation completes
    wordNetwork.nodes = newNodes;
    
    // Reset collapse state now that new network is ready
    if (wasMovingToCenter) {
      isCollapsing = false;
      collapseTarget = null;
      collapseProgress = 0;
      pendingGenerationWord = null;
      isMovingToCenter = false;
      centerMoveProgress = 0;
      centerHoldProgress = 0;
    }
  }

  // Visualize the network in 2D space with physics
  function visualizeNetwork(p, network, mouseVelX, mouseVelY) {
    // Handle network birth animation - nodes expand from center
    if (networkBirthProgress < 1 && network.nodes.length > 0) {
      networkBirthProgress += 1 / networkBirthDuration;
      networkBirthProgress = Math.min(1, networkBirthProgress);
      
      // Easing function for smooth birth (ease-out with slight overshoot)
      let easedProgress;
      if (networkBirthProgress < 0.8) {
        // Smooth ease-out
        easedProgress = 1 - Math.pow(1 - networkBirthProgress / 0.8, 3);
      } else {
        // Slight overshoot and settle
        let t = (networkBirthProgress - 0.8) / 0.2;
        easedProgress = 1 + 0.05 * Math.sin(t * Math.PI) * (1 - t);
      }
      
      // Expand nodes from center to their target positions
      for (let node of network.nodes) {
        if (node.targetPosition) {
          // Calculate distance from center to target
          let dx = node.targetPosition.x - 0;
          let dy = node.targetPosition.y - 0;
          
          // Add staggered timing for each node (playful birth effect)
          let nodeDelay = (node.id % 5) / 5 * 0.3; // Nodes appear in waves
          let nodeProgress = Math.max(0, (easedProgress - nodeDelay) / (1 - nodeDelay));
          nodeProgress = Math.min(1, nodeProgress);
          
          // Add spiral/rotational movement during birth
          let angle = Math.atan2(dy, dx);
          let spiralAmount = (1 - nodeProgress) * 0.4; // More spiral at start
          let spiralAngle = angle + spiralAmount * Math.sin(nodeProgress * Math.PI * 3 + node.id * 0.2);
          
          // Calculate position with spiral
          let distance = Math.sqrt(dx * dx + dy * dy);
          let currentDistance = distance * nodeProgress;
          
          // Apply easing to distance
          let easedDistance = currentDistance * (1 + Math.sin(nodeProgress * Math.PI) * 0.1 * (1 - nodeProgress));
          
          node.position.x = Math.cos(spiralAngle) * easedDistance;
          node.position.y = Math.sin(spiralAngle) * easedDistance;
          
          // Reset velocity during birth
          node.velocity.x = 0;
          node.velocity.y = 0;
        }
      }
      
      // Update reveal progress based on birth progress
      networkRevealProgress = networkBirthProgress * 0.7; // Reveal starts slower
    } else if (networkBirthProgress >= 1 && oldCollapsedNodes) {
      // Birth animation complete - clear old collapsed nodes
      oldCollapsedNodes = null;
    }
    
    // Physics constants - slower animation for new generation
    // Gradually increase speed as network reveals (based on networkRevealProgress)
    let speedMultiplier = 0.2 + networkRevealProgress * 0.8; // Start at 20% speed, reach 100% when fully revealed
    let springStrength = 0.02 * speedMultiplier; // Slower spring strength initially
    let damping = 0.88 + (1 - speedMultiplier) * 0.07; // Higher damping initially (more controlled)
    let returnStrength = 0.015 * speedMultiplier; // Slower return strength initially
    
    // Convert mouse velocity to world coordinates (account for zoom)
    let worldMouseVelX = (mouseVelX || 0) / viewZoom;
    let worldMouseVelY = (mouseVelY || 0) / viewZoom;
    let mouseInfluence = 0.05; // 5% influence from mouse movement (reduced impact)
    
    // Detect hover - check if mouse is over any node, or auto-highlight nodes
    hoveredNode = null;
    let mouseHoverDetected = false;
    
    if (!isDraggingNode && !isDragging) {
      // Convert mouse to world coordinates
      let worldX = (p.mouseX - p.width / 2 - viewOffsetX) / viewZoom;
      let worldY = (p.mouseY - p.height / 2 - viewOffsetY) / viewZoom;
      
      let hoverRadius = 80; // How close mouse needs to be to hover
      let closestDist = Infinity;
      
      for (let node of network.nodes) {
        let dx = node.position.x - worldX;
        let dy = node.position.y - worldY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        // Also consider text size for hover detection
        let fontSize = 15 + node.frequency * 2;
        let textWidth = fontSize * 0.6 * node.word.length;
        let effectiveRadius = Math.max(hoverRadius, textWidth / 2 + 20);
        
        if (dist < effectiveRadius && dist < closestDist) {
          closestDist = dist;
          hoveredNode = node;
          mouseHoverDetected = true;
        }
      }
    }
    
    // Auto-highlight nodes automatically if no mouse hover detected
    // Always cycle through nodes automatically (unless manually hovering)
    if (!mouseHoverDetected && network.nodes.length > 0) {
      // Cycle through nodes automatically - highlight each for 1 second
      let highlightDuration = 60; // frames (1 second at 60fps)
      autoHighlightTime++;
      
      // Move to next node when duration is reached
      if (autoHighlightTime >= highlightDuration) {
        autoHighlightTime = 0;
        autoHighlightIndex = (autoHighlightIndex + 1) % network.nodes.length;
      }
      
      // Set hovered node to the auto-highlighted one (always active)
      hoveredNode = network.nodes[autoHighlightIndex];
    } else if (mouseHoverDetected) {
      // Pause auto-highlight when mouse hovers (so it doesn't jump)
      // Don't reset time/index, just pause cycling
      // Keep the manually hovered node highlighted
    } else {
      // If no nodes or other condition, ensure we have a hovered node for auto-highlight
      if (network.nodes.length > 0 && !hoveredNode) {
        hoveredNode = network.nodes[autoHighlightIndex];
      }
    }
    
    // Handle collapse animation - compress network towards clicked node (playful version)
    if (isCollapsing && collapseTarget) {
      collapseProgress += 1 / collapseDuration;
      collapseProgress = Math.min(1, collapseProgress); // Clamp to 1
      
      // Playful bouncy easing function with overshoot
      let easedProgress;
      if (collapseProgress < 0.6) {
        // Bounce in - elastic ease-out
        easedProgress = 1 - Math.pow(2, -10 * collapseProgress) * Math.sin((collapseProgress * 10 - 0.75) * (2 * Math.PI) / 3);
      } else {
        // Settle with slight overshoot
        let t = (collapseProgress - 0.6) / 0.4; // Normalize to 0-1
        easedProgress = 1 + 0.1 * Math.sin(t * Math.PI * 2) * (1 - t); // Overshoot then settle
      }
      
      // Move all nodes towards collapse target with playful variations
      let nodeIndex = 0;
      for (let node of network.nodes) {
        let dx = collapseTarget.x - node.position.x;
        let dy = collapseTarget.y - node.position.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0.1) { // Only move if not already at target
          // Vary speed per node for playful staggered effect
          let nodeSpeedVariation = 0.7 + (nodeIndex % 3) * 0.15; // Different speeds for different nodes
          
          // Add spiral/rotational movement for playful effect
          let angle = Math.atan2(dy, dx);
          let spiralAmount = (1 - easedProgress) * 0.3; // More spiral at start, less at end
          let spiralAngle = angle + spiralAmount * Math.sin(collapseProgress * Math.PI * 4 + nodeIndex * 0.5);
          
          // Calculate movement with spiral
          let moveSpeed = (0.2 + (1 - easedProgress) * 0.25) * nodeSpeedVariation;
          let spiralRadius = dist * spiralAmount * 0.5;
          
          // Add bounce effect - nodes move faster then slow down
          let bounceFactor = 1 + Math.sin(collapseProgress * Math.PI * 3) * 0.2 * (1 - easedProgress);
          moveSpeed *= bounceFactor;
          
          // Move towards target with spiral
          let moveX = Math.cos(spiralAngle) * moveSpeed * dist;
          let moveY = Math.sin(spiralAngle) * moveSpeed * dist;
          
          // Add perpendicular component for spiral effect
          let perpAngle = spiralAngle + Math.PI / 2;
          moveX += Math.cos(perpAngle) * spiralRadius * moveSpeed * 0.3;
          moveY += Math.sin(perpAngle) * spiralRadius * moveSpeed * 0.3;
          
          node.position.x += moveX;
          node.position.y += moveY;
        } else {
          // Snap to target when very close, but add slight jitter for playful effect
          let jitterAmount = (1 - collapseProgress) * 2; // Less jitter as we get closer
          node.position.x = collapseTarget.x + (Math.random() - 0.5) * jitterAmount;
          node.position.y = collapseTarget.y + (Math.random() - 0.5) * jitterAmount;
        }
        
        // Add slight velocity for more dynamic feel (but dampened)
        node.velocity.x *= 0.7;
        node.velocity.y *= 0.7;
        
        nodeIndex++;
      }
      
      // Once collapsed, move to center of window
      if (collapseProgress >= 1) {
        // Start moving to center if not already started
        if (!isMovingToCenter) {
          isMovingToCenter = true;
          centerMoveProgress = 0;
          centerHoldProgress = 0; // Reset hold progress when starting move to center
        }
        
        // Calculate center of window in world coordinates
        // Center of screen is at (0, 0) in world coordinates (after viewOffset and zoom)
        let centerX = -viewOffsetX / viewZoom;
        let centerY = -viewOffsetY / viewZoom;
        
        // Move nodes towards center
        if (centerMoveProgress < 1) {
          centerMoveProgress += 1 / centerMoveDuration;
          centerMoveProgress = Math.min(1, centerMoveProgress);
          
          // Easing function for smooth movement
          let easedProgress = centerMoveProgress < 0.5 
            ? 2 * centerMoveProgress * centerMoveProgress 
            : 1 - Math.pow(-2 * centerMoveProgress + 2, 2) / 2;
          
          // Move all nodes towards center with playful bouncy movement
          let nodeIndex = 0;
          for (let node of network.nodes) {
            let dx = centerX - node.position.x;
            let dy = centerY - node.position.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0.1) {
              // Bouncy easing for playful movement
              let bounceEase = 1 - Math.pow(1 - centerMoveProgress, 3); // Ease-out cubic
              let bounceFactor = 1 + Math.sin(centerMoveProgress * Math.PI * 2.5) * 0.15 * (1 - bounceEase);
              
              // Vary speed per node for staggered playful effect
              let nodeSpeedVariation = 0.8 + (nodeIndex % 4) * 0.1;
              
              // Add slight spiral as nodes converge
              let angle = Math.atan2(dy, dx);
              let spiralAmount = (1 - bounceEase) * 0.2;
              let spiralAngle = angle + spiralAmount * Math.sin(centerMoveProgress * Math.PI * 3 + nodeIndex * 0.3);
              
              let moveSpeed = (0.25 + (1 - bounceEase) * 0.35) * nodeSpeedVariation * bounceFactor;
              
              // Move with spiral
              let moveX = Math.cos(spiralAngle) * moveSpeed * dist;
              let moveY = Math.sin(spiralAngle) * moveSpeed * dist;
              
              // Add perpendicular component for spiral
              let perpAngle = spiralAngle + Math.PI / 2;
              moveX += Math.cos(perpAngle) * dist * spiralAmount * moveSpeed * 0.2;
              moveY += Math.sin(perpAngle) * dist * spiralAmount * moveSpeed * 0.2;
              
              node.position.x += moveX;
              node.position.y += moveY;
            } else {
              // Snap to center when very close, with slight jitter
              let jitterAmount = (1 - centerMoveProgress) * 1.5;
              node.position.x = centerX + (Math.random() - 0.5) * jitterAmount;
              node.position.y = centerY + (Math.random() - 0.5) * jitterAmount;
            }
            
            // Dampen velocity for smooth settling
            node.velocity.x *= 0.8;
            node.velocity.y *= 0.8;
            
            nodeIndex++;
          }
        } else {
          // Floating and pulsating swarm state - nodes gently drift and pulsate while waiting
          let nodeIndex = 0;
          for (let node of network.nodes) {
            // Gentle floating movement - each node drifts in a slow circular/spiral pattern
            let floatTime = p.frameCount * 0.02 + nodeIndex * 0.5; // Slow, unique per node
            let floatRadius = 8 + (nodeIndex % 3) * 3; // Vary float radius per node
            let floatSpeed = 0.5 + (nodeIndex % 2) * 0.3; // Vary float speed
            
            // Circular floating pattern with slight spiral
            let floatX = Math.cos(floatTime * floatSpeed) * floatRadius;
            let floatY = Math.sin(floatTime * floatSpeed * 1.2) * floatRadius; // Slightly elliptical
            
            // Add gentle drift (thinking movement)
            let driftX = Math.sin(floatTime * 0.7 + nodeIndex) * 2;
            let driftY = Math.cos(floatTime * 0.9 + nodeIndex * 0.7) * 2;
            
            // Update position with floating and drift
            node.position.x = centerX + floatX + driftX;
            node.position.y = centerY + floatY + driftY;
            
            // Gentle velocity for smooth movement
            node.velocity.x = (floatX + driftX - (node.position.x - centerX)) * 0.1;
            node.velocity.y = (floatY + driftY - (node.position.y - centerY)) * 0.1;
            
            nodeIndex++;
          }
          
          // Hold at center for longer duration (swarm effect)
          // Generation already started when word was clicked, so just keep words visible
          centerHoldProgress += 1 / centerHoldDuration;
          centerHoldProgress = Math.min(1, centerHoldProgress);
        }
        
        // Don't apply physics - nodes stay at center
        return; // Skip rest of physics simulation
      }
    }
    
    // Handle move to center animation (after collapse completes)
    if (isMovingToCenter && !isCollapsing) {
      // Calculate center of window in world coordinates
      let centerX = -viewOffsetX / viewZoom;
      let centerY = -viewOffsetY / viewZoom;
      
      // Floating and pulsating swarm state - nodes gently drift and pulsate while waiting
      let nodeIndex = 0;
      for (let node of network.nodes) {
        // Gentle floating movement - each node drifts in a slow circular/spiral pattern
        let floatTime = p.frameCount * 0.02 + nodeIndex * 0.5; // Slow, unique per node
        let floatRadius = 8 + (nodeIndex % 3) * 3; // Vary float radius per node
        let floatSpeed = 0.5 + (nodeIndex % 2) * 0.3; // Vary float speed
        
        // Circular floating pattern with slight spiral
        let floatX = Math.cos(floatTime * floatSpeed) * floatRadius;
        let floatY = Math.sin(floatTime * floatSpeed * 1.2) * floatRadius; // Slightly elliptical
        
        // Add gentle drift (thinking movement)
        let driftX = Math.sin(floatTime * 0.7 + nodeIndex) * 2;
        let driftY = Math.cos(floatTime * 0.9 + nodeIndex * 0.7) * 2;
        
        // Update position with floating and drift
        node.position.x = centerX + floatX + driftX;
        node.position.y = centerY + floatY + driftY;
        
        // Gentle velocity for smooth movement
        node.velocity.x = (floatX + driftX - (node.position.x - centerX)) * 0.1;
        node.velocity.y = (floatY + driftY - (node.position.y - centerY)) * 0.1;
        
        nodeIndex++;
      }
      
      // Don't apply physics - nodes float gently at center
      return; // Skip rest of physics simulation
    }
    
    // Handle dragged node - position it directly at mouse
    if (draggedNode) {
      // Convert mouse screen coordinates to world coordinates
      let worldX = (p.mouseX - p.width / 2 - viewOffsetX) / viewZoom;
      let worldY = (p.mouseY - p.height / 2 - viewOffsetY) / viewZoom;
      
      // Position dragged node at mouse (with offset)
      draggedNode.position.x = worldX - dragOffsetX;
      draggedNode.position.y = worldY - dragOffsetY;
      
      // Reset velocity when dragging
      draggedNode.velocity.x = 0;
      draggedNode.velocity.y = 0;
    }
    
    // Apply forces to nodes (2D physics) - skip if collapsing
    if (isCollapsing && collapseProgress >= 1) {
      // Nodes are collapsed, skip physics
      return;
    }
    
    for (let node of network.nodes) {
      // Skip physics for dragged node (it's positioned directly)
      if (node === draggedNode) continue;
      
      // Skip physics during collapse animation (nodes are being moved directly)
      if (isCollapsing) continue;
      
      // Reset forces
      let forceX = 0;
      let forceY = 0;
      
      // Active floating movement - slower for new generation
      // Use sine waves with different phases per node for organic movement
      let floatSpeed = 0.008 * speedMultiplier; // Slower floating speed initially
      let floatAmplitude = 1.0 * speedMultiplier; // Smaller amplitude initially
      let time = p.frameCount * floatSpeed;
      
      // Each node has unique phase based on its ID
      let phaseX = node.id * 0.5;
      let phaseY = node.id * 0.7 + Math.PI / 3; // Offset Y phase
      
      // Add floating force with multiple frequencies for more complex movement
      forceX += Math.sin(time + phaseX) * floatAmplitude;
      forceY += Math.cos(time + phaseY) * floatAmplitude;
      // Add secondary oscillation for more dynamic movement
      forceX += Math.sin(time * 1.5 + phaseX * 1.3) * floatAmplitude * 0.6;
      forceY += Math.cos(time * 1.3 + phaseY * 1.5) * floatAmplitude * 0.6;
      // Add tertiary oscillation for even more complex, organic movement
      forceX += Math.sin(time * 2.2 + phaseX * 0.8) * floatAmplitude * 0.4;
      forceY += Math.cos(time * 1.8 + phaseY * 0.9) * floatAmplitude * 0.4;
      // Add quaternary oscillation for additional complexity
      forceX += Math.sin(time * 3.1 + phaseX * 1.1) * floatAmplitude * 0.3;
      forceY += Math.cos(time * 2.7 + phaseY * 1.2) * floatAmplitude * 0.3;
      // Add subtle random drift for more organic feel - increased
      let driftPhase = node.id * 0.3;
      forceX += Math.sin(time * 0.4 + driftPhase) * floatAmplitude * 0.25;
      forceY += Math.cos(time * 0.5 + driftPhase + Math.PI / 4) * floatAmplitude * 0.25;
      // Add slow circular drift for continuous floating motion
      let circularPhase = node.id * 0.4;
      forceX += Math.sin(time * 0.3 + circularPhase) * floatAmplitude * 0.2;
      forceY += Math.cos(time * 0.35 + circularPhase) * floatAmplitude * 0.2;
      
      // Apply mouse movement influence (20% of mouse velocity)
      forceX += worldMouseVelX * mouseInfluence;
      forceY += worldMouseVelY * mouseInfluence;
      
      // Collision avoidance - prevent word overlap
      // Calculate minimum distance based on font sizes
      let nodeFontSize = 15 + node.frequency * 2;
      let collisionStrength = 0.1; // Increased strength for more active collisions
      
      for (let otherNode of network.nodes) {
        if (otherNode.id === node.id) continue; // Skip self
        
        let otherFontSize = 15 + otherNode.frequency * 2;
        
        // Minimum distance based on both word sizes (approximate text width)
        // Estimate text width: roughly 0.6 * fontSize * word.length
        let nodeTextWidth = nodeFontSize * 0.6 * node.word.length;
        let otherTextWidth = otherFontSize * 0.6 * otherNode.word.length;
        let minDistance = (nodeTextWidth + otherTextWidth) / 2 + 20; // Add padding
        
        let dx = otherNode.position.x - node.position.x;
        let dy = otherNode.position.y - node.position.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0 && dist < minDistance) {
          // Repulsion force - stronger when closer
          let overlap = minDistance - dist;
          let repulsionForce = collisionStrength * overlap / dist;
          forceX -= (dx / dist) * repulsionForce;
          forceY -= (dy / dist) * repulsionForce;
        }
      }
      
      // Spring forces from edges
      for (let edge of network.edges) {
        let otherNode;
        if (edge.source === node.id) {
          otherNode = network.nodes[edge.target];
        } else if (edge.target === node.id) {
          otherNode = network.nodes[edge.source];
        } else {
          continue;
        }
        
        let edgeDx = otherNode.position.x - node.position.x;
        let edgeDy = otherNode.position.y - node.position.y;
        let edgeDist = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
        
        if (edgeDist > 0) {
          // Calculate minimum distance for this edge pair
          let otherFontSize = 15 + otherNode.frequency * 2;
          let nodeTextWidth = nodeFontSize * 0.6 * node.word.length;
          let otherTextWidth = otherFontSize * 0.6 * otherNode.word.length;
          let edgeMinDistance = (nodeTextWidth + otherTextWidth) / 2 + 20;
          
          // Ideal distance based on edge strength - ensure minimum to prevent overlap
          let idealDist = Math.max(edgeMinDistance, 250 + edge.strength * 400);
          
          // Increase spring strength if connected to dragged node for elastic pull
          let currentSpringStrength = springStrength;
          if (draggedNode && (otherNode === draggedNode || node === draggedNode)) {
            currentSpringStrength = springStrength * 3; // Stronger pull when dragging
          }
          
          let springForce = (edgeDist - idealDist) * currentSpringStrength * edge.strength;
          
          forceX += (edgeDx / edgeDist) * springForce;
          forceY += (edgeDy / edgeDist) * springForce;
        }
      }
      
      // Return to base position (elastic anchor)
      let returnDx = node.basePosition.x - node.position.x;
      let returnDy = node.basePosition.y - node.position.y;
      
      forceX += returnDx * returnStrength;
      forceY += returnDy * returnStrength;
      
      // Boundary forces - keep nodes within exact window bounds
      // Account for view transform (pan and zoom) and font size
      // Calculate text dimensions to keep entire word visible (reuse nodeFontSize from above)
      let textWidth = nodeFontSize * 0.6 * node.word.length;
      let textHeight = nodeFontSize;
      
      // Subtract half the text size from boundaries to keep words fully visible
      // Also account for ticker - horizontal at bottom or vertical on right
      const verticalLanguages = ['ja', 'zh', 'ko'];
      const isVerticalTicker = verticalLanguages.includes(currentLanguage);
      const isMobile = p.width < 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      let topPadding = 10; // Just 10px from top edge
      let tickerHeight = isVerticalTicker ? 0 : (isMobile ? 100 : 60); // Taller on mobile
      let tickerWidth = isVerticalTicker ? (isMobile ? 100 : 60) : 0; // Wider on mobile
      let availableHeight = p.height - tickerHeight - topPadding;
      let availableWidth = p.width - tickerWidth;
      
      let maxX = ((availableWidth / 2) - textWidth / 2) / viewZoom - viewOffsetX;
      let minX = (-(availableWidth / 2) + textWidth / 2) / viewZoom - viewOffsetX;
      let maxY = (topPadding + availableHeight / 2 - textHeight / 2) / viewZoom - viewOffsetY;
      let minY = (topPadding - availableHeight / 2 + textHeight / 2) / viewZoom - viewOffsetY;
      
      let boundaryStrength = 0.04; // Slightly reduced to allow more movement near boundaries
      
      // Push back if outside bounds
      if (node.position.x > maxX) {
        forceX -= (node.position.x - maxX) * boundaryStrength;
      } else if (node.position.x < minX) {
        forceX += (minX - node.position.x) * boundaryStrength;
      }
      
      if (node.position.y > maxY) {
        forceY -= (node.position.y - maxY) * boundaryStrength;
      } else if (node.position.y < minY) {
        forceY += (minY - node.position.y) * boundaryStrength;
      }
      
      // Update velocity
      node.velocity.x += forceX;
      node.velocity.y += forceY;
      
      // Apply damping
      node.velocity.x *= damping;
      node.velocity.y *= damping;
      
      // Update position
      node.position.x += node.velocity.x;
      node.position.y += node.velocity.y;
      
      // Clamp position to ensure it stays within bounds
      node.position.x = Math.max(minX, Math.min(maxX, node.position.x));
      node.position.y = Math.max(minY, Math.min(maxY, node.position.y));
    }
    
    // Helper function to get color for cluster - softer pastel palette
    function getClusterColor(cluster) {
      switch(cluster) {
        case 'language':
          return [180, 200, 240]; // Soft pastel blue for language
        case 'space':
          return [240, 200, 180]; // Soft pastel peach for space
        case 'latent':
          return [200, 240, 200]; // Soft pastel green for latent
        default:
          return [200, 200, 200]; // Soft gray for mixed
      }
    }
    
    // Draw membrane around network (organic boundary)
    if (network.nodes.length > 0 && !isCollapsing && !isMovingToCenter) { // Show when network is stable
      // Calculate convex hull around all nodes
      let points = network.nodes.map(node => ({ x: node.position.x, y: node.position.y }));
      
      // Simple convex hull algorithm (Graham scan simplified)
      function getConvexHull(points) {
        if (points.length < 3) return points;
        
        // Find bottom-most point (or leftmost in case of tie)
        let start = points[0];
        let startIdx = 0;
        for (let i = 1; i < points.length; i++) {
          if (points[i].y < start.y || (points[i].y === start.y && points[i].x < start.x)) {
            start = points[i];
            startIdx = i;
          }
        }
        
        // Sort points by polar angle with respect to start point
        let sorted = points.map((p, i) => ({ ...p, idx: i }));
        sorted.splice(startIdx, 1);
        
        sorted.sort((a, b) => {
          let angleA = Math.atan2(a.y - start.y, a.x - start.x);
          let angleB = Math.atan2(b.y - start.y, b.x - start.x);
          if (Math.abs(angleA - angleB) < 0.001) {
            // If angles are equal, sort by distance
            let distA = (a.x - start.x) ** 2 + (a.y - start.y) ** 2;
            let distB = (b.x - start.x) ** 2 + (b.y - start.y) ** 2;
            return distA - distB;
          }
          return angleA - angleB;
        });
        
        // Build hull using Graham scan
        let hull = [start];
        for (let point of sorted) {
          while (hull.length > 1) {
            let p1 = hull[hull.length - 2];
            let p2 = hull[hull.length - 1];
            let p3 = point;
            
            // Cross product to determine turn direction
            let cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
            if (cross <= 0) {
              hull.pop();
            } else {
              break;
            }
          }
          hull.push(point);
        }
        
        return hull;
      }
      
      let hull = getConvexHull(points);
      
      if (hull.length >= 3) {
        // Add padding to membrane (expand outward from nodes)
        let padding = 50; // Increased padding for more visible membrane
        let expandedHull = hull.map((p, i) => {
          // Calculate center of hull
          let centerX = hull.reduce((sum, pt) => sum + pt.x, 0) / hull.length;
          let centerY = hull.reduce((sum, pt) => sum + pt.y, 0) / hull.length;
          
          // Expand point outward from center
          let dx = p.x - centerX;
          let dy = p.y - centerY;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            return {
              x: p.x + (dx / dist) * padding,
              y: p.y + (dy / dist) * padding
            };
          }
          return p;
        });
        
        // Create smooth membrane with pulsing effect
        let membraneTime = p.frameCount * 0.02;
        let membranePulse = 1.0 + Math.sin(membraneTime) * 0.15; // 15% pulsing
        
        // Draw membrane with organic, flowing appearance
        const colors = getColors();
        
        // Create smooth membrane points with wave effect
        let membranePoints = expandedHull.map((p1, i) => {
          let p2 = expandedHull[(i + 1) % expandedHull.length];
          let waveOffset = Math.sin(membraneTime * 2 + i * 0.5) * 3 * membranePulse; // Increased wave
          let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          let perpX = Math.cos(angle + Math.PI / 2) * waveOffset;
          let perpY = Math.sin(angle + Math.PI / 2) * waveOffset;
          return { x: p1.x + perpX, y: p1.y + perpY };
        });
        
        // Use brighter color for membrane visibility
        // Make it more visible by using a semi-transparent version of text color
        let membraneColor = darkMode 
          ? [200, 200, 220] // Light blue-gray for dark mode
          : [60, 60, 80];   // Dark blue-gray for light mode
        
        // Outer glow layer (very transparent)
        p.noStroke();
        p.fill(membraneColor[0], membraneColor[1], membraneColor[2], 20);
        p.beginShape();
        for (let i = 0; i < membranePoints.length; i++) {
          p.vertex(membranePoints[i].x, membranePoints[i].y);
        }
        p.endShape(p.CLOSE);
        
        // Main membrane layer (transparent, pulsing)
        let membraneOpacity = 40 + Math.sin(membraneTime * 1.5) * 15; // Transparent (25-55 opacity)
        p.fill(membraneColor[0], membraneColor[1], membraneColor[2], membraneOpacity);
        p.beginShape();
        for (let i = 0; i < membranePoints.length; i++) {
          p.vertex(membranePoints[i].x, membranePoints[i].y);
        }
        p.endShape(p.CLOSE);
        
        // Membrane outline (subtle, pulsing)
        p.stroke(membraneColor[0], membraneColor[1], membraneColor[2], 80 + Math.sin(membraneTime * 1.2) * 20);
        p.strokeWeight(2.0); // Thinner stroke
        p.noFill();
        p.beginShape();
        for (let i = 0; i < membranePoints.length; i++) {
          p.vertex(membranePoints[i].x, membranePoints[i].y);
        }
        p.endShape(p.CLOSE);
      }
    }
    
    // Draw edges (connections between words) - 2D with pulsing effects
    p.noFill();
    
    // Global pulse for edges - synchronized with network pulse (more pronounced)
    let edgePulseTime = p.frameCount * 0.03; // Faster pulse for edges (doubled speed)
    
    // First pass: draw non-highlighted edges with pulsing
    for (let edge of network.edges) {
      let source = network.nodes[edge.source];
      let target = network.nodes[edge.target];
      
      // Check if this edge is connected to hovered node
      let isConnectedToHovered = hoveredNode && 
        (source === hoveredNode || target === hoveredNode);
      
      if (!isConnectedToHovered) {
        // Normal edge - more visible gray with more pronounced pulsing opacity
        let baseOpacity = 60 + edge.strength * 90; // Range: 60-150 (much more visible than before)
        let edgePulsePhase = (edge.source + edge.target) * 0.2; // Unique phase per edge
        let pulseOpacity = baseOpacity * (0.7 + Math.sin(edgePulseTime * 1.2 + edgePulsePhase) * 0.3); // More pronounced pulsing (30% variation)
        
        // Use color scheme for edges
        const colors = getColors();
        p.stroke(colors.edgeDefault[0], colors.edgeDefault[1], colors.edgeDefault[2], pulseOpacity);
        p.strokeWeight((0.8 + edge.strength * 1.2) * (0.8 + Math.sin(edgePulseTime * 1.3 + edgePulsePhase) * 0.2)); // More pronounced pulsing (20% variation)
        p.line(source.position.x, source.position.y, target.position.x, target.position.y);
      }
    }
    
    // Second pass: draw highlighted edges (connected to hovered node) - LIT UP RELATIONSHIPS
    if (hoveredNode) {
      for (let edge of network.edges) {
        let source = network.nodes[edge.source];
        let target = network.nodes[edge.target];
        
        // Check if this edge is connected to hovered node
        if (source === hoveredNode || target === hoveredNode) {
          // Get color based on cluster of the connected node (not hovered one)
          let connectedNode = source === hoveredNode ? target : source;
          let color = getClusterColor(connectedNode.cluster);
          
          // Very strong, vibrant colors when lit - maximum visibility
          let litColor = [
            Math.min(255, color[0] * 1.8), // Very strong red component
            Math.min(255, color[1] * 1.8), // Very strong green component
            Math.min(255, color[2] * 1.8)  // Very strong blue component
          ];
          
          // Maximum opacity for fully lit relationships
          let baseOpacity = 220 + edge.strength * 35; // Range: 220-255 (fully lit)
          
          // Minimal pulsing - keep relationships consistently lit
          let edgePulsePhase = (edge.source + edge.target) * 0.2;
          let pulseOpacity = baseOpacity; // No pulsing - keep it bright and consistent
          
          // Draw glow effect first (behind) for extra visibility
          p.stroke(litColor[0] * 0.6, litColor[1] * 0.6, litColor[2] * 0.6, pulseOpacity * 0.3);
          p.strokeWeight((2.0 + edge.strength * 3.0));
          p.line(source.position.x, source.position.y, target.position.x, target.position.y);
          
          // Draw main relationship line on top - thick and bright
          p.stroke(litColor[0], litColor[1], litColor[2], pulseOpacity);
          p.strokeWeight((1.5 + edge.strength * 2.5)); // Thick, visible lines for relationships
          p.line(source.position.x, source.position.y, target.position.x, target.position.y);
        }
      }
    }
    
    // Draw nodes as words - 2D rendering
    p.textAlign(p.CENTER, p.CENTER);
    p.textFont('monospace');
    
    // Find connected nodes if hovering
    let connectedNodes = new Set();
    if (hoveredNode) {
      connectedNodes.add(hoveredNode);
      for (let edge of network.edges) {
        let source = network.nodes[edge.source];
        let target = network.nodes[edge.target];
        if (source === hoveredNode) {
          connectedNodes.add(target);
        } else if (target === hoveredNode) {
          connectedNodes.add(source);
        }
      }
    }
    
    // Helper function to get node color - more visible when lit
    function getNodeColor(node) {
      if (node === hoveredNode) {
        // Highlighted node - brighter, more saturated color based on cluster
        let color = getClusterColor(node.cluster);
        // Increase saturation and brightness for more visibility
        return [
          Math.min(255, color[0] * 1.4), // Brighter red component
          Math.min(255, color[1] * 1.4), // Brighter green component
          Math.min(255, color[2] * 1.4)  // Brighter blue component
        ];
      } else if (connectedNodes.has(node)) {
        // Connected node - more visible muted color based on cluster
        let color = getClusterColor(node.cluster);
        return [
          color[0] * 0.8, // More visible than before
          color[1] * 0.8,
          color[2] * 0.8
        ];
      }
      return null; // Default black
    }
    
    // Draw old collapsed nodes first (faded) if birth animation is in progress
    if (oldCollapsedNodes && networkBirthProgress < 1) {
      // Fade out old nodes as new network appears
      let fadeProgress = networkBirthProgress;
      let oldOpacity = Math.max(0, 255 * (1 - fadeProgress * 1.5)); // Fade out faster
      
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont('monospace');
      const colors = getColors();
      
      // Enhanced pulsating for old collapsed nodes (thinking effect)
      let pulseTime = p.frameCount * 0.05;
      
      for (let node of oldCollapsedNodes) {
        let baseFontSize = 15 + node.frequency * 2;
        let nodePulsePhase = node.id * 0.4;
        
        // Strong pulsating effect (thinking)
        let thinkingPulse = 1.0 + Math.sin(pulseTime * 2.0 + nodePulsePhase) * 0.25; // 25% size variation
        let fontSize = baseFontSize * thinkingPulse;
        
        // Pulsating opacity (breathing effect)
        let opacityPulse = oldOpacity * (0.7 + Math.sin(pulseTime * 1.8 + nodePulsePhase) * 0.3);
        
        p.fill(colors.text[0], colors.text[1], colors.text[2], opacityPulse);
        p.noStroke();
        p.textSize(fontSize);
        p.text(node.word, node.position.x, node.position.y);
      }
    }
    
    // Global pulsing effect - makes network feel alive (more pronounced)
    let pulseTime = p.frameCount * 0.04; // Faster pulse (doubled speed)
    let globalPulse = 1.0 + Math.sin(pulseTime) * 0.15; // 15% size variation (almost doubled)
    
    // Check if nodes are in collapsed/swarm state (for enhanced pulsating effects)
    let isInCollapsedState = (isCollapsing || 
                              (isMovingToCenter && centerMoveProgress >= 1) ||
                              (networkBirthProgress > 0 && networkBirthProgress < 1));
    
    for (let node of network.nodes) {
      // Font size based on frequency - smaller font
      let baseFontSize = 15 + node.frequency * 2;
      
      // Individual node pulsing - each node pulses at different phase (more pronounced)
      let nodePulsePhase = node.id * 0.3; // Unique phase per node
      
      // Enhanced pulsating for collapsed nodes (thinking effect)
      let nodePulse;
      if (isInCollapsedState) {
        // Stronger pulsating when collapsed (thinking)
        nodePulse = 1.0 + Math.sin(pulseTime * 2.0 + nodePulsePhase) * 0.25; // 25% size variation
      } else {
        nodePulse = 1.0 + Math.sin(pulseTime * 1.5 + nodePulsePhase) * 0.12; // 12% individual pulse (more than doubled)
      }
      
      // Combine global and individual pulsing
      let fontSize = baseFontSize * globalPulse * nodePulse;
      
      // Determine if this node should be highlighted
      let nodeColor = getNodeColor(node);
      let isHighlighted = node === hoveredNode || connectedNodes.has(node);
      
      // Make highlighted nodes more prominent with larger size
      if (node === hoveredNode) {
        fontSize = fontSize * 1.5; // Much larger for highlighted node
      } else if (connectedNodes.has(node)) {
        fontSize = fontSize * 1.15; // Slightly larger for connected nodes
      }
      
      // Pulsing opacity for nodes - more pronounced pulsing
      let baseOpacity = isHighlighted ? 255 : 200; // Full opacity when highlighted
      let opacityVariation = isHighlighted ? 20 : 50; // More opacity variation (increased from 30)
      
      // Enhanced opacity pulsating for collapsed nodes (breathing/thinking effect)
      let opacityPulse;
      if (isInCollapsedState) {
        // Stronger breathing effect when collapsed
        opacityPulse = baseOpacity * (0.6 + Math.sin(pulseTime * 1.8 + nodePulsePhase) * 0.4); // 40% opacity variation
      } else {
        opacityPulse = baseOpacity + Math.sin(pulseTime * 1.2 + nodePulsePhase) * opacityVariation; // Faster, more pronounced pulsing
      }
      
      if (nodeColor) {
        // Colored node (hovered or connected) - brighter and more visible
        p.fill(nodeColor[0], nodeColor[1], nodeColor[2], opacityPulse);
        if (node === hoveredNode) {
          // Stronger stroke for highlighted node with more pulsing
          p.stroke(0, opacityPulse * 0.8); // Dark stroke for contrast
          p.strokeWeight(2.5 * (0.9 + Math.sin(pulseTime * 1.3 + nodePulsePhase) * 0.1)); // More pronounced stroke pulsing
        } else {
          // Connected nodes - softer stroke with more pulsing
          p.stroke(100, opacityPulse * 0.6);
          p.strokeWeight(1.5 * (0.85 + Math.sin(pulseTime * 1.2 + nodePulsePhase) * 0.15)); // More pronounced pulsing
        }
      } else {
        // Normal node - use color scheme
        const colors = getColors();
        p.fill(colors.text[0], colors.text[1], colors.text[2], opacityPulse);
        // Invert stroke for contrast
        let strokeColor = darkMode ? [255, 255, 255] : [0, 0, 0];
        p.stroke(strokeColor[0], strokeColor[1], strokeColor[2], opacityPulse * 0.8);
        p.strokeWeight(2 * (0.85 + Math.sin(pulseTime * 1.2 + nodePulsePhase) * 0.15)); // More pronounced pulsing stroke weight
      }
      
      p.textSize(fontSize);
      
      // Draw the word at node position
      p.text(node.word, node.position.x, node.position.y);
    }
  }

  p.mousePressed = function() {
    // Check if home button was clicked first
    if (checkHomeButtonClick(p, p.mouseX, p.mouseY)) {
      return; // Don't process other clicks if home button was clicked
    }
    
    // Check if dark mode toggle was clicked first
    if (checkDarkModeToggleClick(p, p.mouseX, p.mouseY)) {
      return; // Don't process other clicks if dark mode toggle was clicked
    }
    
    // Check if sound toggle was clicked
    if (checkSoundToggleClick(p, p.mouseX, p.mouseY)) {
      return; // Don't process other clicks if sound toggle was clicked
    }
    
    // Check if language menu was clicked
    if (checkLanguageMenuClick(p, p.mouseX, p.mouseY)) {
      return; // Don't process other clicks if language menu was clicked
    }
    
    // Check if credits were clicked (only on home page)
    if (textTyped.length === 0 && checkCreditsClick(p, p.mouseX, p.mouseY)) {
      return; // Don't process other clicks if credits were clicked
    }
    
    // Mobile: tap anywhere on landing page to start
    if (textTyped.length === 0 && !isLoading) {
      const isMobile = p.width < 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      if (isMobile) {
        // Don't trigger if clicking on UI elements (already checked above)
        // Trigger text generation
        triggerTextGeneration();
        return;
      }
    }
    
    // Store mouse position to detect clicks vs drags
    mouseDownX = p.mouseX;
    mouseDownY = p.mouseY;
    clickedNode = null;
    
    // Check if clicking on a node first
    if (wordNetwork.nodes.length > 0) {
      // Convert mouse to world coordinates
      let worldX = (p.mouseX - p.width / 2 - viewOffsetX) / viewZoom;
      let worldY = (p.mouseY - p.height / 2 - viewOffsetY) / viewZoom;
      
      // Find closest node to mouse
      let closestNode = null;
      let closestDist = Infinity;
      let clickRadius = 100; // How close you need to click to grab a node
      
      for (let node of wordNetwork.nodes) {
        let dx = node.position.x - worldX;
        let dy = node.position.y - worldY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < clickRadius && dist < closestDist) {
          closestDist = dist;
          closestNode = node;
        }
      }
      
      // Store clicked node for potential click detection
      clickedNode = closestNode;
      
      // If clicking on a node, start dragging it
      if (closestNode) {
        isDraggingNode = true;
        draggedNode = closestNode;
        dragOffsetX = closestNode.position.x - worldX;
        dragOffsetY = closestNode.position.y - worldY;
        return; // Don't pan if dragging a node
      }
    }
    
    // Otherwise, start pan drag
    isDragging = true;
    lastMouseX = p.mouseX;
    lastMouseY = p.mouseY;
  };
  
  p.mouseDragged = function() {
    if (isDraggingNode && draggedNode) {
      // Dragging is handled in visualizeNetwork function
      // Just update last mouse position
      lastMouseX = p.mouseX;
      lastMouseY = p.mouseY;
    } else if (isDragging) {
      // Calculate pan delta based on mouse movement
      let deltaX = p.mouseX - lastMouseX;
      let deltaY = p.mouseY - lastMouseY;
      
      // Update view offset (pan)
      viewOffsetX += deltaX / viewZoom;
      viewOffsetY += deltaY / viewZoom;
      
      // Update last mouse position
      lastMouseX = p.mouseX;
      lastMouseY = p.mouseY;
    }
  };
  
  p.mouseReleased = function() {
    // Check if this was a click (not a drag) on a node
    let mouseMoved = Math.abs(p.mouseX - mouseDownX) > 5 || Math.abs(p.mouseY - mouseDownY) > 5;
    
    // If clicked on a node without dragging, trigger generation based on that word
    if (!mouseMoved && clickedNode && isDraggingNode) {
      // This was a click, not a drag - trigger generation
      triggerTextGenerationWithWord(clickedNode.word);
      // Reset dragging state
      isDraggingNode = false;
      draggedNode = null;
      clickedNode = null;
      return;
    }
    
    // Stop dragging node
    if (isDraggingNode && draggedNode) {
      // Give the node a small velocity for smooth release
      draggedNode.velocity.x *= 0.3;
      draggedNode.velocity.y *= 0.3;
      isDraggingNode = false;
      draggedNode = null;
    }
    
    // Stop pan drag
    isDragging = false;
    clickedNode = null;
  };
  
  p.mouseWheel = function(event) {
    // Zoom with mouse wheel
    let zoomFactor = 1 + event.delta * 0.001;
    viewZoom *= zoomFactor;
    viewZoom = Math.max(0.1, Math.min(5.0, viewZoom)); // Limit zoom range
    return false; // Prevent default scrolling
  };
  
  // Helper function to calculate distance between two touches
  function getTouchDistance(touch1, touch2) {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Handle touch events for mobile devices
  p.touchStarted = function() {
    const isMobile = p.width < 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    // ALWAYS check buttons first (works on both landing page and network view)
    // p5.js automatically sets mouseX/mouseY from touch coordinates
    if (checkHomeButtonClick(p, p.mouseX, p.mouseY) ||
        checkDarkModeToggleClick(p, p.mouseX, p.mouseY) ||
        checkSoundToggleClick(p, p.mouseX, p.mouseY) ||
        checkLanguageMenuClick(p, p.mouseX, p.mouseY) ||
        checkCreditsClick(p, p.mouseX, p.mouseY)) {
      return false; // Button was clicked, let UI handle it
    }
    
    // On landing page, tap anywhere to start
    if (textTyped.length === 0 && !isLoading) {
      if (isMobile) {
        // Trigger text generation
        triggerTextGeneration();
        return false; // Prevent default scrolling
      }
    }
    
    // Handle pinch zoom start (2 touches)
    if (p.touches && p.touches.length === 2 && wordNetwork.nodes.length > 0) {
      isPinching = true;
      initialPinchDistance = getTouchDistance(p.touches[0], p.touches[1]);
      lastPinchDistance = initialPinchDistance;
      return false; // Prevent default
    }
    
    // For single touch on network, handle word clicking and panning
    if (wordNetwork.nodes.length > 0) {
      // Store touch position for word click detection
      mouseDownX = p.mouseX;
      mouseDownY = p.mouseY;
      clickedNode = null;
      
      // Check if touching a node
      let worldX = (p.mouseX - p.width / 2 - viewOffsetX) / viewZoom;
      let worldY = (p.mouseY - p.height / 2 - viewOffsetY) / viewZoom;
      
      let closestNode = null;
      let closestDist = Infinity;
      let clickRadius = 100;
      
      for (let node of wordNetwork.nodes) {
        let dx = node.position.x - worldX;
        let dy = node.position.y - worldY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < clickRadius && dist < closestDist) {
          closestDist = dist;
          closestNode = node;
        }
      }
      
      clickedNode = closestNode;
      if (closestNode) {
        isDraggingNode = true;
        draggedNode = closestNode;
        dragOffsetX = closestNode.position.x - worldX;
        dragOffsetY = closestNode.position.y - worldY;
      } else {
        // Start pan drag
        isDragging = true;
        lastMouseX = p.mouseX;
        lastMouseY = p.mouseY;
      }
    }
    
    return false;
  };
  
  // Handle touch movement for pinch zoom and panning
  p.touchMoved = function() {
    // Only prevent default on landing page
    if (textTyped.length === 0) {
      return false; // Prevent default scrolling on landing page
    }
    
    // Handle pinch zoom (2 touches)
    if (p.touches && p.touches.length === 2 && isPinching) {
      const currentDistance = getTouchDistance(p.touches[0], p.touches[1]);
      const zoomFactor = currentDistance / lastPinchDistance;
      
      // Update zoom
      viewZoom *= zoomFactor;
      viewZoom = Math.max(0.1, Math.min(5.0, viewZoom)); // Limit zoom range
      
      lastPinchDistance = currentDistance;
      return false; // Prevent default
    }
    
    // Handle single touch panning
    if (p.touches && p.touches.length === 1 && wordNetwork.nodes.length > 0) {
      if (isDraggingNode && draggedNode) {
        // Node dragging is handled in visualizeNetwork
        lastMouseX = p.mouseX;
        lastMouseY = p.mouseY;
      } else if (isDragging) {
        // Pan the view
        let deltaX = p.mouseX - lastMouseX;
        let deltaY = p.mouseY - lastMouseY;
        
        viewOffsetX += deltaX / viewZoom;
        viewOffsetY += deltaY / viewZoom;
        
        lastMouseX = p.mouseX;
        lastMouseY = p.mouseY;
      }
      return false; // Prevent default scrolling
    }
    
    return false;
  };
  
  p.touchEnded = function() {
    // Reset pinch state
    if (p.touches && p.touches.length < 2) {
      isPinching = false;
      initialPinchDistance = 0;
      lastPinchDistance = 0;
    }
    
    // Handle word tap (single touch, no movement)
    if (p.touches && p.touches.length === 0 && wordNetwork.nodes.length > 0) {
      const touchMoved = Math.abs(p.mouseX - mouseDownX) > 10 || Math.abs(p.mouseY - mouseDownY) > 10;
      
      // If tapped on a node without dragging, trigger generation
      if (!touchMoved && clickedNode && isDraggingNode) {
        triggerTextGenerationWithWord(clickedNode.word);
        isDraggingNode = false;
        draggedNode = null;
        clickedNode = null;
        return false;
      }
      
      // Stop dragging
      if (isDraggingNode && draggedNode) {
        draggedNode.velocity.x *= 0.3;
        draggedNode.velocity.y *= 0.3;
        isDraggingNode = false;
        draggedNode = null;
      }
      
      isDragging = false;
      clickedNode = null;
    }
    
    // Only prevent default on landing page
    if (textTyped.length === 0) {
      return false; // Prevent default on landing page
    }
    return false;
  };

  // Old rendering code removed - network visualization handles rendering now

  p.keyReleased = function() {
    // export png
    if (p.keyCode === p.CONTROL || p.keyCode === 91) {
      p.saveCanvas('semantic-tensegrities-' + Date.now(), 'png');
    }
    // new random layout
    if (p.keyCode === p.ALT || p.keyCode === 18) {
      actRandomSeed++;
    }
  };

  // Function to trigger text generation
  async function triggerTextGeneration() {
    if (!isLoading) {
      isLoading = true;
      loadingStartTime = Date.now(); // Track when loading started
      
      // Initialize audio context on first user interaction (required for mobile)
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume audio context if suspended (required for mobile browsers)
      if (audioContext.state === 'suspended' || audioContext.state !== 'running') {
        try {
          await audioContext.resume();
        } catch (err) {
          console.warn('Could not resume audio context:', err);
        }
      }
      
      // Get prompts in the current language
      const prompts = getGenerationPrompts();
      
      // Randomly select a prompt for variety
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      chat(randomPrompt);
    }
  }

  // Function to trigger text generation based on a clicked word
  async function triggerTextGenerationWithWord(word) {
    if (!isLoading && word) {
      loadingStartTime = Date.now(); // Track when loading started
      // Initialize audio context on user interaction (required for mobile)
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume audio context if suspended (required for mobile browsers)
      if (audioContext.state === 'suspended' || audioContext.state !== 'running') {
        try {
          await audioContext.resume();
        } catch (err) {
          console.warn('Could not resume audio context:', err);
        }
      }
      
      // Disable auto-generation
      autoGenerationEnabled = false; // Disable automatic generation cycle
      
      // Find the clicked node to collapse towards
      let targetNode = null;
      for (let node of wordNetwork.nodes) {
        if (node.word === word) {
          targetNode = node;
          break;
        }
      }
      
      // Start collapse animation if we have nodes and a target
      if (targetNode && wordNetwork.nodes.length > 0) {
        // Stop voice immediately when collapse starts
        stopCurrentVoice();
        isCollapsing = true;
        collapseTarget = { x: targetNode.position.x, y: targetNode.position.y };
        collapseProgress = 0;
        await playCollapseSound(); // Play collapse sound
        
        // Start generation immediately - don't wait for collapse
        // Create a prompt that incorporates the clicked word in the current language
        const wordPrompts = {
          en: `Write a concise text (5-7 sentences) that explores the concept of "${word}" in relation to computational linguistics, semantic tensegrity, language processing, and how meaning emerges from structural relationships. Be technical yet poetic, philosophical and insightful. Connect "${word}" to probability distributions, vector spaces, language models, or other computational linguistic concepts.`,
          es: `Escribe un texto conciso (5-7 oraciones) que explore el concepto de "${word}" en relación con la lingüística computacional, la tensegridad semántica, el procesamiento del lenguaje y cómo el significado emerge de las relaciones estructurales. Sé técnico pero poético, filosófico e inteligente. Conecta "${word}" con distribuciones de probabilidad, espacios vectoriales, modelos de lenguaje u otros conceptos lingüísticos computacionales.`,
          fr: `Écrivez un texte concis (5-7 phrases) qui explore le concept de "${word}" en relation avec la linguistique computationnelle, la tensegrité sémantique, le traitement du langage et comment le sens émerge des relations structurelles. Soyez technique mais poétique, philosophique et perspicace. Connectez "${word}" aux distributions de probabilité, espaces vectoriels, modèles de langage ou autres concepts linguistiques computationnels.`,
          de: `Schreiben Sie einen prägnanten Text (5-7 Sätze), der das Konzept von "${word}" in Bezug auf Computerlinguistik, semantische Tensegrität, Sprachverarbeitung und wie Bedeutung aus strukturellen Beziehungen entsteht, erkundet. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich. Verbinden Sie "${word}" mit Wahrscheinlichkeitsverteilungen, Vektorräumen, Sprachmodellen oder anderen computerlinguistischen Konzepten.`,
          it: `Scrivi un testo conciso (5-7 frasi) che esplora il concetto di "${word}" in relazione alla linguistica computazionale, alla tensegrità semantica, all'elaborazione del linguaggio e come il significato emerge dalle relazioni strutturali. Sii tecnico ma poetico, filosofico e perspicace. Collega "${word}" a distribuzioni di probabilità, spazi vettoriali, modelli linguistici o altri concetti linguistici computazionali.`,
          pt: `Escreva um texto conciso (5-7 frases) que explore o conceito de "${word}" em relação à linguística computacional, tensegridade semântica, processamento de linguagem e como o significado emerge de relacionamentos estruturais. Seja técnico mas poético, filosófico e perspicaz. Conecte "${word}" a distribuições de probabilidade, espaços vetoriais, modelos de linguagem ou outros conceitos linguísticos computacionais.`,
          ja: `"${word}"の概念を計算言語学、意味的テンセグリティ、言語処理、そして意味が構造的関係からどのように生まれるかに関連して探求する簡潔なテキスト（5-7文）を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。"${word}"を確率分布、ベクトル空間、言語モデル、または他の計算言語学的概念に接続してください。`,
          zh: `写一篇简洁的文本（5-7句话），探索"${word}"这一概念与计算语言学、语义张拉整体、语言处理以及意义如何从结构关系中产生的关联。要技术性但诗意、哲学性和有洞察力。将"${word}"与概率分布、向量空间、语言模型或其他计算语言学概念联系起来。`,
          ko: `"${word}"의 개념을 계산 언어학, 의미론적 텐세그리티, 언어 처리, 그리고 의미가 구조적 관계에서 어떻게 나타나는지와 관련하여 탐구하는 간결한 텍스트(5-7문장)를 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요. "${word}"를 확률 분포, 벡터 공간, 언어 모델 또는 다른 계산 언어학적 개념과 연결하세요.`,
          ar: `اكتب نصاً موجزاً (5-7 جمل) يستكشف مفهوم "${word}" فيما يتعلق باللسانيات الحسابية والتوتر الدلالي ومعالجة اللغة وكيف ينشأ المعنى من العلاقات البنيوية. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً. اربط "${word}" بتوزيعات الاحتمال أو المسافات المتجهة أو نماذج اللغة أو مفاهيم لسانيات حسابية أخرى.`,
          tr: `"${word}" kavramını hesaplamalı dilbilim, semantik tensegrite, dil işleme ve anlamın yapısal ilişkilerden nasıl ortaya çıktığıyla ilgili olarak keşfeden kısa bir metin (5-7 cümle) yazın. Teknik ama şiirsel, felsefi ve içgörülü olun. "${word}"'i olasılık dağılımları, vektör uzayları, dil modelleri veya diğer hesaplamalı dilbilim kavramlarıyla bağlayın.`,
          hr: `Napiši kratak tekst (5-7 rečenica) koji istražuje koncept "${word}" u odnosu na računalnu lingvistiku, semantičku tenzegritetu, obradu jezika i kako značenje nastaje iz strukturalnih odnosa. Budi tehnički ali poetski, filozofski i pronicljiv. Poveži "${word}" s distribucijama vjerojatnosti, vektorskim prostorima, jezičnim modelima ili drugim računalnim lingvističkim konceptima.`,
          sr: `Напиши кратак текст (5-7 реченица) који истражује концепт "${word}" у односу на рачунарску лингвистику, семантичку тензегритету, обраду језика и како значење настаје из структурних односа. Буди технички али поетски, филозофски и проницљив. Повежи "${word}" са дистрибуцијама вероватноће, векторским просторима, језичким моделима или другим рачунарским лингвистичким концептима.`
        };
        
        const prompt = wordPrompts[currentLanguage] || wordPrompts['en'];
        isLoading = true;
        chat(prompt);
        return;
      }
      
      // If no collapse (shouldn't happen, but fallback), start generation immediately
      isLoading = true;
      
      // Create a prompt that incorporates the clicked word in the current language
      const wordPrompts = {
        en: `Write a concise text (5-7 sentences) that explores the concept of "${word}" in relation to computational linguistics, semantic tensegrity, language processing, and how meaning emerges from structural relationships. Be technical yet poetic, philosophical and insightful. Connect "${word}" to probability distributions, vector spaces, language models, or other computational linguistic concepts.`,
        es: `Escribe un texto conciso (5-7 oraciones) que explore el concepto de "${word}" en relación con la lingüística computacional, la tensegridad semántica, el procesamiento del lenguaje y cómo el significado emerge de las relaciones estructurales. Sé técnico pero poético, filosófico e inteligente. Conecta "${word}" con distribuciones de probabilidad, espacios vectoriales, modelos de lenguaje u otros conceptos lingüísticos computacionales.`,
        fr: `Écrivez un texte concis (5-7 phrases) qui explore le concept de "${word}" en relation avec la linguistique computationnelle, la tensegrité sémantique, le traitement du langage et comment le sens émerge des relations structurelles. Soyez technique mais poétique, philosophique et perspicace. Connectez "${word}" aux distributions de probabilité, espaces vectoriels, modèles de langage ou autres concepts linguistiques computationnels.`,
        de: `Schreiben Sie einen prägnanten Text (5-7 Sätze), der das Konzept von "${word}" in Bezug auf Computerlinguistik, semantische Tensegrität, Sprachverarbeitung und wie Bedeutung aus strukturellen Beziehungen entsteht, erkundet. Seien Sie technisch, aber poetisch, philosophisch und aufschlussreich. Verbinden Sie "${word}" mit Wahrscheinlichkeitsverteilungen, Vektorräumen, Sprachmodellen oder anderen computerlinguistischen Konzepten.`,
        it: `Scrivi un testo conciso (5-7 frasi) che esplora il concetto di "${word}" in relazione alla linguistica computazionale, alla tensegrità semantica, all'elaborazione del linguaggio e come il significato emerge dalle relazioni strutturali. Sii tecnico ma poetico, filosofico e perspicace. Collega "${word}" a distribuzioni di probabilità, spazi vettoriali, modelli linguistici o altri concetti linguistici computazionali.`,
        pt: `Escreva um texto conciso (5-7 frases) que explore o conceito de "${word}" em relação à linguística computacional, tensegridade semântica, processamento de linguagem e como o significado emerge de relacionamentos estruturais. Seja técnico mas poético, filosófico e perspicaz. Conecte "${word}" a distribuições de probabilidade, espaços vetoriais, modelos de linguagem ou outros conceitos linguísticos computacionais.`,
        ja: `"${word}"の概念を計算言語学、意味的テンセグリティ、言語処理、そして意味が構造的関係からどのように生まれるかに関連して探求する簡潔なテキスト（5-7文）を書いてください。技術的でありながら詩的で、哲学的で洞察力のあるものにしてください。"${word}"を確率分布、ベクトル空間、言語モデル、または他の計算言語学的概念に接続してください。`,
        zh: `写一篇简洁的文本（5-7句话），探索"${word}"这一概念与计算语言学、语义张拉整体、语言处理以及意义如何从结构关系中产生的关联。要技术性但诗意、哲学性和有洞察力。将"${word}"与概率分布、向量空间、语言模型或其他计算语言学概念联系起来。`,
        ko: `"${word}"의 개념을 계산 언어학, 의미론적 텐세그리티, 언어 처리, 그리고 의미가 구조적 관계에서 어떻게 나타나는지와 관련하여 탐구하는 간결한 텍스트(5-7문장)를 작성하세요. 기술적이면서도 시적이고 철학적이며 통찰력 있게 작성하세요. "${word}"를 확률 분포, 벡터 공간, 언어 모델 또는 다른 계산 언어학적 개념과 연결하세요.`,
        ar: `اكتب نصاً موجزاً (5-7 جمل) يستكشف مفهوم "${word}" فيما يتعلق باللسانيات الحسابية والتوتر الدلالي ومعالجة اللغة وكيف ينشأ المعنى من العلاقات البنيوية. كن تقنياً لكن شاعرياً وفلسفياً وثاقباً. اربط "${word}" بتوزيعات الاحتمال أو المسافات المتجهة أو نماذج اللغة أو مفاهيم لسانيات حسابية أخرى.`,
        tr: `"${word}" kavramını hesaplamalı dilbilim, semantik tensegrite, dil işleme ve anlamın yapısal ilişkilerden nasıl ortaya çıktığıyla ilgili olarak keşfeden kısa bir metin (5-7 cümle) yazın. Teknik ama şiirsel, felsefi ve içgörülü olun. "${word}"'i olasılık dağılımları, vektör uzayları, dil modelleri veya diğer hesaplamalı dilbilim kavramlarıyla bağlayın.`,
        hr: `Napiši kratak tekst (5-7 rečenica) koji istražuje koncept "${word}" u odnosu na računalnu lingvistiku, semantičku tenzegritetu, obradu jezika i kako značenje nastaje iz strukturalnih odnosa. Budi tehnički ali poetski, filozofski i pronicljiv. Poveži "${word}" s distribucijama vjerojatnosti, vektorskim prostorima, jezičnim modelima ili drugim računalnim lingvističkim konceptima.`,
        sr: `Напиши кратак текст (5-7 реченица) који истражује концепт "${word}" у односу на рачунарску лингвистику, семантичку тензегритету, обраду језика и како значење настаје из структурних односа. Буди технички али поетски, филозофски и проницљив. Повежи "${word}" са дистрибуцијама вероватноће, векторским просторима, језичким моделима или другим рачунарским лингвистичким концептима.`
      };
      
      const prompt = wordPrompts[currentLanguage] || wordPrompts['en'];
      chat(prompt);
    }
  }

  p.keyPressed = function() {
    // Start generation with spacebar - then continues automatically via voice
    if (p.keyCode === 32) { // Spacebar
      // Reset system to show loading animation in selected language
      // Stop current voice/audio
      stopCurrentVoice();
      
      // Clear current text and network
      textTyped = '';
      currentTextBeingRead = '';
      wordNetwork.nodes = [];
      wordNetwork.edges = [];
      wordNetwork.needsUpdate = false;
      
      // Reset to show loading animation
      isFirstGeneration = true;
      isLoading = false; // Will be set to true by triggerTextGeneration
      loadingStartTime = 0;
      
      // Reset view/zoom
      viewOffsetX = 0;
      viewOffsetY = 0;
      viewZoom = 1.0;
      needsAutoZoom = false;
      autoZoomProgress = 0;
      networkRevealProgress = 0;
      networkBirthProgress = 0;
      tickerOffset = 0;
      
      // Re-enable auto-generation when spacebar is pressed
      autoGenerationEnabled = true;
      
      // Start heartbeat sound on first spacebar press
      if (!heartbeatInterval) {
        createHeartbeatSound();
      } else {
        // Resume audio context if already started
        resumeAudioContext();
      }
      
      // Start generation - will continue automatically when voice finishes reading
      triggerTextGeneration();
    }
  };
 
  // Function to stop current voice/audio playback
  function stopCurrentVoice() {
    // Stop OpenAI TTS audio (Web Audio API)
    if (currentUtterance && audioContext) {
      try {
        // Stop the audio source
        if (currentUtterance.stop) {
          currentUtterance.stop();
        }
        // Disconnect to fully stop audio
        if (currentUtterance.disconnect) {
          currentUtterance.disconnect();
        }
      } catch (e) {
        // Source might already be stopped or disconnected
        console.warn('Error stopping audio source:', e);
      }
      currentUtterance = null;
    }
    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Reset voice speaking flag
    isVoiceSpeaking = false;
  }

  // Function to read text using OpenAI TTS API (triggers next generation when finished)
  async function readText(text) {
    if (!openai) return;
    
    // Prevent multiple voices from playing simultaneously
    // Stop any current speech first and wait a moment for cleanup
    stopCurrentVoice();
    
    // Wait a brief moment to ensure previous voice is fully stopped
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Double-check: if voice is still speaking, don't start a new one
    if (isVoiceSpeaking) {
      console.warn('Voice is still speaking, skipping new voice playback');
      return;
    }
    
    try {
      // Clean up text for reading (remove extra newlines, trim)
      let cleanText = text.replace(/\n+/g, ' ').trim();
      if (cleanText.length === 0) return;
      
      // Set current text being read
      currentTextBeingRead = text;
      
      // Generate speech using OpenAI TTS
      const mp3 = await openai.audio.speech.create({
        model: "tts-1", // Use OpenAI TTS model
        voice: "alloy", // Natural-sounding voice
        input: cleanText,
      });
      
      // Get audio buffer
      const buffer = await mp3.arrayBuffer();
      
      // Play audio using Web Audio API
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Decode and play audio
      const audioBuffer = await audioContext.decodeAudioData(buffer);
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = audioBuffer;
      source.playbackRate.value = 1.0; // Normal speech rate
      gainNode.gain.value = 0.8; // Volume
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Store reference to stop if needed
      currentUtterance = source;
      
      // Mark voice as speaking and start ticker based on language direction
      isVoiceSpeaking = true;
      const rtlLanguages = ['ar'];
      const verticalLanguages = ['ja', 'zh', 'ko'];
      const isRTL = rtlLanguages.includes(currentLanguage);
      const isVertical = verticalLanguages.includes(currentLanguage);
      
      // Initialize ticker offset based on language type
      const padding = 20;
      const fontSize = 14;
      
      if (isVertical) {
        // Vertical: start from bottom (positive offset, will decrease to move up)
        const estimatedTextHeight = cleanText.length * fontSize * 1.2; // Rough estimate
        tickerOffset = (p.height || window.innerHeight); // Start from bottom
      } else if (isRTL) {
        // RTL horizontal: start from left (negative offset)
        const estimatedTextWidth = cleanText.length * fontSize * 0.6;
        tickerOffset = -(estimatedTextWidth + padding * 2);
      } else {
        // LTR horizontal: start from right (positive offset)
        tickerOffset = (canvasWidth || window.innerWidth);
      }
      
      source.start(0);
      
      // Trigger next generation when text finishes being read (only if auto-generation is enabled)
      source.onended = () => {
        currentUtterance = null;
        isVoiceSpeaking = false; // Voice stopped speaking
        // Trigger next generation after reading is complete (only if auto-generation is enabled)
        if (autoGenerationEnabled && textTyped === currentTextBeingRead && textTyped.length > 0) {
          // Small delay before triggering next generation
          setTimeout(() => {
            if (autoGenerationEnabled && textTyped === currentTextBeingRead && !isLoading) {
              console.log('Text finished reading, triggering next generation...');
              triggerTextGeneration();
            }
          }, 1000); // 1 second pause before next generation
        }
      };
      
      // Handle errors - reset voice flag if playback fails
      source.onerror = (err) => {
        console.error('Audio playback error:', err);
        currentUtterance = null;
        isVoiceSpeaking = false;
      };
      
    } catch (err) {
      console.warn('Could not generate speech with OpenAI TTS:', err);
      // Reset voice flag on error
      isVoiceSpeaking = false;
      currentUtterance = null;
      
      // Fallback to browser speech synthesis if OpenAI TTS fails
      if ('speechSynthesis' in window) {
        // Ensure any previous speech is stopped
        window.speechSynthesis.cancel();
        
        // Wait a moment to ensure cancellation is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check: if voice is still speaking, don't start fallback
        if (isVoiceSpeaking) {
          console.warn('Voice is still speaking, skipping fallback speech synthesis');
          return;
        }
        
        let utterance = new SpeechSynthesisUtterance(text.replace(/\n+/g, ' ').trim());
        utterance.rate = 1.0; // Normal speech rate
        utterance.volume = 0.8;
        
        // Mark voice as speaking and start ticker based on language direction
        isVoiceSpeaking = true;
        const rtlLanguages = ['ar'];
        const isRTL = rtlLanguages.includes(currentLanguage);
        // For RTL: start from left (negative), for LTR: start from right (positive)
        tickerOffset = isRTL ? -(canvasWidth || window.innerWidth) : (canvasWidth || window.innerWidth);
        
        // Trigger next generation when finished reading (only if auto-generation is enabled)
        utterance.onend = () => {
          isVoiceSpeaking = false; // Voice stopped speaking
          if (autoGenerationEnabled && textTyped === currentTextBeingRead && textTyped.length > 0) {
            setTimeout(() => {
              if (autoGenerationEnabled && textTyped === currentTextBeingRead && !isLoading) {
                console.log('Text finished reading (fallback), triggering next generation...');
                triggerTextGeneration();
              }
            }, 1000); // 1 second pause before next generation
          }
        };
        
        // Handle errors in fallback speech synthesis
        utterance.onerror = (err) => {
          console.error('Speech synthesis error:', err);
          isVoiceSpeaking = false;
        };
        
        window.speechSynthesis.speak(utterance);
      }
    }
  }

  async function chat(prompt) {
    try {
      // Add timeout wrapper to prevent hanging on mobile (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API call timeout after 30 seconds')), 30000);
      });
      
      const apiPromise = openai.chat.completions.create({
        model: "gpt-4o", // Using latest realtime/fast model
        temperature: 1.0,
        messages: [
          { 
            "role": "system", 
            "content": getSystemPrompt()
          },
          { "role": "user", "content": prompt }
        ]
      });
      
      const completion = await Promise.race([apiPromise, timeoutPromise]);

      // Stop any current voice reading from previous text
      if (currentUtterance && audioContext) {
        try {
          currentUtterance.stop();
        } catch (e) {
          // Source might already be stopped
        }
        currentUtterance = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      // Store generated text from realtime model - used by both network and ticker
      textTyped = completion.choices[0].message.content;
      actRandomSeed = p.floor(p.random(1000)); // New random seed for new composition
      // Mark network for update (will use textTyped)
      wordNetwork.needsUpdate = true;
      tickerOffset = 0; // Reset ticker for new text (will use textTyped)
      isLoading = false;
      loadingStartTime = 0; // Reset loading start time
      
      // Mark first generation as complete
      if (isFirstGeneration) {
        isFirstGeneration = false;
      }
      
      // Read the generated text using OpenAI TTS (model's voice) - triggers next generation when finished
      if (textTyped && textTyped.length > 0) {
        console.log('Text generated, starting voice reading (will trigger next generation when finished)...');
        // Ensure audio context is ready before reading
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        readText(textTyped).catch(err => {
          console.warn('Error reading text with OpenAI TTS:', err);
        });
      }
    } catch (err) {
      console.error("An error occurred in the chat function:", err);
      // Set a fallback text so the user sees something
      if (!textTyped || textTyped.length === 0) {
        textTyped = err.message && err.message.includes('timeout') 
          ? "Connection timeout. Please check your internet connection and try again.\n"
          : "Error generating text. Please try again.\n";
      }
      isLoading = false;
      loadingStartTime = 0; // Reset loading start time
      isFirstGeneration = false; // Prevent stuck loading state
      wordNetwork.needsUpdate = false; // Prevent infinite retries
    }
  }

  // Function to draw dark mode toggle in top left
  function drawDarkModeToggle(p) {
    const colors = getColors();
    const buttonSize = Math.min(28, Math.max(24, p.width * 0.03)); // Smaller adaptive size
    const buttonX = 20;
    const buttonY = 20;
    
    p.push();
    
    // Toggle button background - lighter (reduced opacity)
    p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 150); // Lighter opacity
    p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 120); // Lighter border
    p.strokeWeight(0.5); // Thinner border
    p.rect(buttonX, buttonY, buttonSize, buttonSize);
    
    // Toggle icon (sun/moon) - smaller and lighter
    p.textAlign(p.CENTER, p.CENTER);
    const iconSize = Math.max(12, buttonSize * 0.5); // Smaller icon
    p.textFont('monospace', iconSize);
    p.fill(colors.uiText[0], colors.uiText[1], colors.uiText[2], 180); // Lighter icon
    p.noStroke();
    p.text(darkMode ? '🌙' : '☀️', buttonX + buttonSize / 2, buttonY + buttonSize / 2);
    
    p.pop();
  }
  
  // Function to draw home button (only visible when network is shown)
  function drawHomeButton(p) {
    const colors = getColors();
    const buttonWidth = Math.min(60, Math.max(50, p.width * 0.06)); // Smaller adaptive width
    const buttonHeight = Math.min(28, Math.max(24, p.width * 0.03)); // Smaller adaptive height
    const buttonX = p.width - buttonWidth - 20; // Top right
    const buttonY = 20; // Top right
    
    p.push();
    
    // Button background - lighter (reduced opacity)
    p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 150); // Lighter opacity
    p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 120); // Lighter border
    p.strokeWeight(0.5); // Thinner border
    p.rect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Button text - smaller font size and lighter
    p.textAlign(p.CENTER, p.CENTER);
    const buttonFontSize = Math.max(8, Math.min(11, p.width * 0.012)); // Smaller font
    p.textFont('monospace', buttonFontSize);
    p.fill(colors.uiText[0], colors.uiText[1], colors.uiText[2], 180); // Lighter text
    p.noStroke();
    p.text(t('home'), buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    
    p.pop();
  }
  
  // Function to draw language menu in top right
  function drawLanguageMenu(p) {
    // Only show on landing page
    if (textTyped.length > 0) {
      return;
    }
    
    const colors = getColors();
    const menuWidth = Math.min(140, p.width * 0.18); // Smaller adaptive width
    const menuX = p.width - menuWidth - 20; // Top right
    const buttonHeight = 24; // Smaller button height
    const dropdownButtonHeight = 28; // Smaller dropdown button height
    const buttonY = 20; // Top right
    
    p.push();
    
    // Dropdown button (always visible)
    const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];
    
    // Button background - lighter (reduced opacity)
    p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 150); // Lighter opacity
    p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 120); // Lighter border
    p.strokeWeight(0.5); // Thinner border
    p.rect(menuX, buttonY, menuWidth, dropdownButtonHeight);
    
    // Button text - smaller adaptive font size
    p.textAlign(p.LEFT, p.CENTER);
    const buttonFontSize = Math.max(8, Math.min(11, p.width * 0.012)); // Smaller font
    p.textFont('monospace', buttonFontSize);
    p.fill(colors.uiText[0], colors.uiText[1], colors.uiText[2], 180); // Lighter text
    p.noStroke();
    p.text(t('language') + ': ' + currentLang.name, menuX + 8, buttonY + dropdownButtonHeight / 2);
    
    // Dropdown arrow - smaller
    p.textAlign(p.RIGHT, p.CENTER);
    p.textFont('monospace', buttonFontSize);
    p.text(showLanguageMenu ? '▲' : '▼', menuX + menuWidth - 8, buttonY + dropdownButtonHeight / 2);
    
    // Dropdown menu (only if open)
    if (showLanguageMenu) {
      const dropdownY = buttonY + dropdownButtonHeight;
      const dropdownHeight = languages.length * buttonHeight + 8;
      
      // Dropdown background - lighter
      p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 180); // Lighter
      p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 120); // Lighter border
      p.strokeWeight(0.5); // Thinner border
      p.rect(menuX, dropdownY, menuWidth, dropdownHeight);
      
      // Language options
      let yPos = dropdownY + 4;
      for (let i = 0; i < languages.length; i++) {
        const lang = languages[i];
        const isSelected = lang.code === currentLanguage;
        
        // Option background - lighter
        if (isSelected) {
          p.fill(colors.uiSelected[0], colors.uiSelected[1], colors.uiSelected[2], 150); // Lighter selected
        } else {
          p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 120); // Lighter unselected
        }
        p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 100); // Lighter border
        p.strokeWeight(0.5); // Thinner border
        p.rect(menuX + 4, yPos, menuWidth - 8, buttonHeight - 2);
        
        // Option text - smaller adaptive font size
        p.textAlign(p.LEFT, p.CENTER);
        const optionFontSize = Math.max(7, Math.min(10, p.width * 0.011)); // Smaller font
        p.textFont('monospace', optionFontSize);
        if (isSelected) {
          p.fill(colors.uiTextSelected[0], colors.uiTextSelected[1], colors.uiTextSelected[2], 200); // Slightly lighter
        } else {
          p.fill(colors.uiText[0], colors.uiText[1], colors.uiText[2], 160); // Lighter text
        }
        p.noStroke();
        p.text(lang.name, menuX + 10, yPos + buttonHeight / 2);
        
        yPos += buttonHeight;
      }
    }
    
    p.pop();
  }

  // Function to check if dark mode toggle is clicked
  function checkDarkModeToggleClick(p, mouseX, mouseY) {
    const buttonSize = Math.min(28, Math.max(24, p.width * 0.03)); // Smaller adaptive button size
    const buttonX = 20;
    const buttonY = 20;
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonSize &&
        mouseY >= buttonY && mouseY <= buttonY + buttonSize) {
      darkMode = !darkMode;
      return true;
    }
    return false;
  }
  
  // Function to draw sound toggle button
  function drawSoundToggle(p) {
    const colors = getColors();
    const buttonSize = Math.min(28, Math.max(24, p.width * 0.03)); // Same size as dark mode toggle
    const buttonX = 20;
    const buttonY = 20 + buttonSize + 10; // Below dark mode toggle
    
    p.push();
    
    // Toggle button background - lighter (reduced opacity)
    p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 150);
    p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 120);
    p.strokeWeight(0.5);
    p.rect(buttonX, buttonY, buttonSize, buttonSize);
    
    // Toggle icon (sound/mute) - smaller and lighter
    p.textAlign(p.CENTER, p.CENTER);
    const iconSize = Math.max(12, buttonSize * 0.5);
    p.textFont('monospace', iconSize);
    p.fill(colors.uiText[0], colors.uiText[1], colors.uiText[2], 180);
    p.noStroke();
    // Use sound icon when unmuted, mute icon when muted
    p.text(soundMuted ? '🔇' : '🔊', buttonX + buttonSize / 2, buttonY + buttonSize / 2);
    
    p.pop();
  }
  
  // Function to check if sound toggle was clicked
  function checkSoundToggleClick(p, mouseX, mouseY) {
    const buttonSize = Math.min(28, Math.max(24, p.width * 0.03));
    const buttonX = 20;
    const buttonY = 20 + buttonSize + 10; // Below dark mode toggle
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonSize &&
        mouseY >= buttonY && mouseY <= buttonY + buttonSize) {
      soundMuted = !soundMuted;
      
      // Toggle heartbeat sound
      if (soundMuted) {
        // Mute: stop heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        // Stop heartbeat gain node
        if (heartbeatGainNode) {
          heartbeatGainNode.gain.value = 0;
        }
      } else {
        // Unmute: start heartbeat if it was playing before
        if (!heartbeatInterval && textTyped.length > 0) {
          createHeartbeatSound();
        }
        // Restore heartbeat gain
        if (heartbeatGainNode) {
          heartbeatGainNode.gain.value = 0.5;
        }
      }
      
      return true;
    }
    return false;
  }
  
  // Function to check if home button is clicked
  function checkHomeButtonClick(p, mouseX, mouseY) {
    // Only check if network is visible
    if (textTyped.length === 0) {
      return false;
    }
    
    const buttonWidth = Math.min(60, Math.max(50, p.width * 0.06)); // Smaller adaptive width
    const buttonHeight = Math.min(28, Math.max(24, p.width * 0.03)); // Smaller adaptive height
    const buttonX = p.width - buttonWidth - 20; // Top right
    const buttonY = 20; // Top right
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
      resetToLandingPage();
      return true;
    }
    return false;
  }
  
  // Function to reset to landing page
  function resetToLandingPage() {
    // Stop current voice/audio
    stopCurrentVoice();
    
    // Stop heartbeat sound
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    // Stop any ongoing generation
    isLoading = false;
    loadingStartTime = 0;
    
    // Clear current text and network
    textTyped = '';
    currentTextBeingRead = '';
    wordNetwork.nodes = [];
    wordNetwork.edges = [];
    wordNetwork.needsUpdate = false;
    
    // Reset to show loading animation
    isFirstGeneration = true;
    
    // Reset view/zoom
    viewOffsetX = 0;
    viewOffsetY = 0;
    viewZoom = 1.0;
    needsAutoZoom = false;
    tickerOffset = 0;
    
    // Disable auto-generation (user needs to press spacebar to start)
    autoGenerationEnabled = false;
  }
  
  // Function to check if language menu button is clicked
  function checkLanguageMenuClick(p, mouseX, mouseY) {
    // Only handle clicks on landing page
    if (textTyped.length > 0) {
      return false;
    }
    
    const menuWidth = Math.min(140, p.width * 0.18); // Smaller adaptive width
    const menuX = p.width - menuWidth - 20; // Top right
    const buttonHeight = 24; // Smaller button height
    const dropdownButtonHeight = 28; // Smaller dropdown button height
    const buttonY = 20; // Top right
    
    // Check if click is on dropdown button
    if (mouseX >= menuX && mouseX <= menuX + menuWidth && 
        mouseY >= buttonY && mouseY <= buttonY + dropdownButtonHeight) {
      // Toggle dropdown
      showLanguageMenu = !showLanguageMenu;
      return true;
    }
    
    // Check if click is on dropdown menu items (only if dropdown is open)
    if (showLanguageMenu) {
      const dropdownY = buttonY + dropdownButtonHeight;
      const dropdownHeight = languages.length * buttonHeight + 10;
      
      if (mouseX >= menuX && mouseX <= menuX + menuWidth && 
          mouseY >= dropdownY && mouseY <= dropdownY + dropdownHeight) {
        
        // Check which language option was clicked
        let yPos = dropdownY + 5;
        for (let i = 0; i < languages.length; i++) {
          if (mouseY >= yPos && mouseY <= yPos + buttonHeight - 2) {
            currentLanguage = languages[i].code;
            showLanguageMenu = false; // Close dropdown after selection
            return true;
          }
          yPos += buttonHeight;
        }
        return true; // Clicked in dropdown area but not on an option
      }
      
      // If clicking outside dropdown area, close it
      const totalMenuHeight = dropdownButtonHeight + dropdownHeight;
      if (!(mouseX >= menuX && mouseX <= menuX + menuWidth && 
            mouseY >= buttonY && mouseY <= buttonY + totalMenuHeight)) {
        showLanguageMenu = false;
      }
    }
    
    return false;
  }
  
  // Function to check if credits are clicked
  function checkCreditsClick(p, mouseX, mouseY) {
    // Only check if on home page
    if (textTyped.length > 0) {
      return false;
    }
    
    // Calculate credits text position (centered, near bottom)
    // In displayInstructions, we translate to (p.width/2, p.height/2) and draw at (0, creditsY)
    // So the actual screen position is (p.width/2, p.height/2 + creditsY)
    const baseFontSize = Math.min(32, p.width / 20);
    const creditsFontSize = Math.max(8, baseFontSize * 0.25);
    const creditsYRelative = p.height / 2 - 30; // Relative to center
    const creditsText = 'Concept and development by Marlon Barrios Solano';
    
    // Estimate text width
    p.textFont('monospace', creditsFontSize);
    const textWidth = p.textWidth(creditsText);
    const textHeight = creditsFontSize;
    
    // Calculate actual screen positions (accounting for translation to center)
    const creditsXScreen = p.width / 2;
    const creditsYScreen = p.height / 2 + creditsYRelative;
    
    // Check if click is within credits text bounds
    if (mouseX >= creditsXScreen - textWidth / 2 - 10 && 
        mouseX <= creditsXScreen + textWidth / 2 + 10 &&
        mouseY >= creditsYScreen - textHeight / 2 - 5 && 
        mouseY <= creditsYScreen + textHeight / 2 + 5) {
      // Open link in new tab
      window.open('https://marlonbarrios.github.io/', '_blank');
      return true;
    }
    return false;
  }

  // Display initial instructions (before spacebar is pressed) - centered
  function displayInstructions(p) {
    const colors = getColors();
    
    // Detect mobile device (screen width < 768px or touch device)
    const isMobile = p.width < 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    p.push();
    p.translate(p.width / 2, p.height / 2);
    p.textAlign(p.CENTER, p.CENTER);
    
    // Adaptive font sizes based on screen size
    const baseFontSize = Math.min(32, p.width / 20);
    const titleFontSize = Math.max(20, baseFontSize);
    const mainFontSize = Math.max(12, baseFontSize * 0.5);
    const secondaryFontSize = Math.max(10, baseFontSize * 0.35);
    const tertiaryFontSize = Math.max(9, baseFontSize * 0.3);
    
    // Title
    p.textFont('monospace', titleFontSize);
    p.fill(colors.text[0], colors.text[1], colors.text[2]);
    p.text(t('title'), 0, -120);
    
    // Subtitle
    p.textFont('monospace', mainFontSize * 0.7);
    p.fill(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2], colors.textSecondary[3] || 160);
    p.text(t('subtitle'), 0, -90);
    
    // Main instructions
    p.textFont('monospace', mainFontSize);
    p.fill(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2], colors.textSecondary[3] || 180);
    if (isMobile) {
      p.text(t('tapToStart'), 0, -40);
    } else {
      p.text(t('pressSpacebar'), 0, -40);
    }
    
    // Secondary instructions
    p.textFont('monospace', secondaryFontSize);
    p.fill(colors.textTertiary[0], colors.textTertiary[1], colors.textTertiary[2], colors.textTertiary[3] || 140);
    p.text(t('autoGeneration'), 0, 0);
    
    p.textFont('monospace', tertiaryFontSize);
    p.fill(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], colors.textQuaternary[3] || 100);
    p.text(t('autoRead'), 0, 25);
    
    // Show mobile-specific or desktop-specific instructions
    if (isMobile) {
      p.text(t('panZoomMobile'), 0, 50);
      p.text(t('tapWords'), 0, 65);
    } else {
      p.text(t('panZoom'), 0, 50);
      p.text(t('hoverWords'), 0, 65);
      p.text(t('clickWords'), 0, 80);
    }
    
    // Credits at the bottom (clickable link)
    const creditsFontSize = Math.max(8, baseFontSize * 0.25);
    p.textFont('monospace', creditsFontSize);
    const creditsText = 'Concept and development by Marlon Barrios Solano';
    
    // Check if mouse is hovering over credits (for visual feedback)
    const creditsY = p.height / 2 - 30;
    const textWidth = p.textWidth(creditsText);
    const textHeight = creditsFontSize;
    const creditsX = 0; // Already translated to center
    const mouseXLocal = p.mouseX - p.width / 2;
    const mouseYLocal = p.mouseY - p.height / 2;
    const isHovering = mouseXLocal >= creditsX - textWidth / 2 - 10 && 
                       mouseXLocal <= creditsX + textWidth / 2 + 10 &&
                       mouseYLocal >= creditsY - textHeight / 2 - 5 && 
                       mouseYLocal <= creditsY + textHeight / 2 + 5;
    
    // Make credits slightly brighter and underlined when hovering
    if (isHovering) {
      p.fill(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2], colors.textSecondary[3] || 200);
      p.cursor('pointer');
    } else {
      p.fill(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], colors.textQuaternary[3] || 100);
    }
    
    p.text(creditsText, 0, creditsY);
    
    // Draw underline for link appearance
    p.stroke(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], isHovering ? 150 : 80);
    p.strokeWeight(0.5);
    p.line(-textWidth / 2, creditsY + 3, textWidth / 2, creditsY + 3);
    p.noStroke();
    
    // Powered by OpenAI Realtime model
    const poweredByText = 'Powered by OpenAI Realtime model';
    const poweredByY = creditsY + creditsFontSize + 8;
    p.fill(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], colors.textQuaternary[3] || 70);
    p.text(poweredByText, 0, poweredByY);
    
    p.pop();
    
    // Draw dark mode toggle (top left) and language menu (top right)
    drawDarkModeToggle(p);
    drawLanguageMenu(p);
  }

  function displayLoader(p, wordNetwork) {
  // Home page / Landing page animation (2D)
  let time = p.frameCount * 0.02;
  
  // Center the view
  p.push();
  p.translate(p.width / 2, p.height / 2);
  
  // Home page theme words - representing latent space concepts (2D positions)
  // Use translated words based on current language
  let homeWords = [
    { word: t('wordLanguage'), cluster: 'language', x: -150, y: 0 },
    { word: t('wordSpace'), cluster: 'space', x: 0, y: 150 },
    { word: t('wordLatent'), cluster: 'latent', x: 150, y: 0 },
    { word: t('wordNetwork'), cluster: 'latent', x: 0, y: -150 },
    { word: t('wordSemantic'), cluster: 'language', x: -100, y: 100 },
    { word: t('wordDimension'), cluster: 'space', x: 100, y: 100 },
    { word: t('wordEmbedding'), cluster: 'latent', x: -100, y: -100 },
    { word: t('wordVector'), cluster: 'latent', x: 100, y: -100 },
    { word: t('wordMeaning'), cluster: 'language', x: 0, y: 0 },
    { word: t('wordText'), cluster: 'language', x: -200, y: 0 },
    { word: t('wordNavigation'), cluster: 'space', x: 200, y: 0 },
    { word: t('wordTechnology'), cluster: 'latent', x: 0, y: 0 }
  ];
  
  p.textAlign(p.CENTER, p.CENTER);
  
  // Draw connections between home words (representing semantic relationships)
  const colors = getColors();
  p.stroke(colors.text[0], colors.text[1], colors.text[2], 30);
  p.strokeWeight(0.5);
  for (let i = 0; i < homeWords.length; i++) {
    for (let j = i + 1; j < homeWords.length; j++) {
      // Connect words from same cluster or nearby words
      let dist = Math.sqrt(
        Math.pow(homeWords[i].x - homeWords[j].x, 2) +
        Math.pow(homeWords[i].y - homeWords[j].y, 2)
      );
      
      if (homeWords[i].cluster === homeWords[j].cluster || dist < 200) {
        // Animate connection opacity
        let connectionOpacity = 20 + p.sin(time * 2 + i + j) * 20;
        p.stroke(colors.text[0], colors.text[1], colors.text[2], connectionOpacity);
        
        p.line(homeWords[i].x, homeWords[i].y, homeWords[j].x, homeWords[j].y);
      }
    }
  }
  
  // Draw home page words with animation
  p.noStroke();
  for (let i = 0; i < homeWords.length; i++) {
    let word = homeWords[i];
    
    // Animate position - gentle floating
    let animX = word.x + p.sin(time * 1.5 + i * 0.5) * 20;
    let animY = word.y + p.cos(time * 1.8 + i * 0.5) * 20;
    
    // Pulse size and opacity (50% of original)
    let fontSize = 16 + p.sin(time * 2 + i * 0.4) * 4;
    let opacity = 120 + p.sin(time * 3 + i * 0.3) * 135;
    
    p.textFont('monospace', fontSize);
    p.fill(colors.text[0], colors.text[1], colors.text[2], opacity);
    p.text(word.word, animX, animY);
  }
  
  // Central title/loading text
  p.textFont('monospace', 24);
  p.fill(colors.text[0], colors.text[1], colors.text[2], 180 + p.sin(time * 4) * 75);
  p.text(t('title'), 0, -250);
  
  p.textFont('monospace', 14);
  p.fill(colors.text[0], colors.text[1], colors.text[2], 100 + p.sin(time * 5) * 100);
  p.text(t('generating'), 0, 250);
  
  // Draw "thinking" word when loading (not on landing page)
  if (isLoading) {
    // Global pulsing effect for "thinking" word
    let pulseTime = p.frameCount * 0.04;
    
    // Floating position for "thinking" word - moves in larger pattern
    let thinkingTime = p.frameCount * 0.015; // Slower movement
    let thinkingRadius = 25; // Larger radius
    let thinkingX = Math.cos(thinkingTime) * thinkingRadius;
    let thinkingY = Math.sin(thinkingTime * 1.3) * thinkingRadius;
    
    // Strong pulsating effect for "thinking" word
    let thinkingPulse = 1.0 + Math.sin(pulseTime * 2.5) * 0.35; // 35% size variation
    let thinkingFontSize = 20 * thinkingPulse;
    
    // Pulsating opacity (breathing effect)
    let thinkingOpacity = 255 * (0.5 + Math.sin(pulseTime * 2.0) * 0.5); // 50-100% opacity
    
    // Draw "thinking" word
    p.textAlign(p.CENTER, p.CENTER);
    p.textFont('monospace');
    p.fill(colors.text[0], colors.text[1], colors.text[2], thinkingOpacity);
    p.noStroke();
    p.textSize(thinkingFontSize);
    p.text(t('thinking'), thinkingX, thinkingY);
  }

  p.pop();
  }
};

function onReady() {
  openai = new OpenAI({
    apiKey: openAIKey,
    dangerouslyAllowBrowser: true
  });

  const mainElt = document.querySelector('main');
  new p5(sketch, mainElt);
}

// Start the sketch when DOM is ready
if (document.readyState === 'complete') {
  onReady();
} else {
  document.addEventListener("DOMContentLoaded", onReady);
}
