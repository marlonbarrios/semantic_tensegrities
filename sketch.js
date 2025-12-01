import './style.css';
// OpenAI import removed - using proxy server instead to avoid CORS issues

// P_3_1_2_01 - Typewriter Visual Composition
// Adapted from Generative Gestaltung
// Integrated with GPT-4 AI text generation

// API key is now used by the proxy server (server.js)
// const openAIKey = import.meta.env.VITE_OPENAI_KEY;
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
      subtitle: 'A Speculative Theory of Synthetic Meaning',
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
      tapToStart: 'Tap anywhere to start',
      setVoiceLanguage: 'Set voice and language in top right'
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
      tapToStart: 'Toca en cualquier lugar para comenzar',
      setVoiceLanguage: 'Configura voz e idioma en la esquina superior derecha'
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
      tapToStart: 'Appuyez n\'importe où pour commencer',
      setVoiceLanguage: 'Définir la voix et la langue en haut à droite'
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
      tapToStart: 'Tippen Sie irgendwo zum Starten',
      setVoiceLanguage: 'Stimme und Sprache oben rechts einstellen'
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
      tapToStart: 'Tocca ovunque per iniziare',
      setVoiceLanguage: 'Imposta voce e lingua in alto a destra'
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
      tapToStart: 'Toque em qualquer lugar para começar',
      setVoiceLanguage: 'Defina voz e idioma no canto superior direito'
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
      tapToStart: 'どこでもタップして開始',
      setVoiceLanguage: '右上で音声と言語を設定'
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
      tapToStart: '点击任意位置开始',
      setVoiceLanguage: '在右上角设置语音和语言'
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
      tapToStart: '아무 곳이나 탭하여 시작',
      setVoiceLanguage: '오른쪽 상단에서 음성과 언어 설정'
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
      tapToStart: 'اضغط في أي مكان للبدء',
      setVoiceLanguage: 'اضبط الصوت واللغة في أعلى اليمين'
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
      tapToStart: 'Başlamak için herhangi bir yere dokunun',
      setVoiceLanguage: 'Sağ üstte ses ve dil ayarlayın'
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
      tapToStart: 'Dodirnite bilo gdje za početak',
      setVoiceLanguage: 'Postavite glas i jezik u gornjem desnom kutu'
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
      tapToStart: 'Додирните било где за почетак',
      setVoiceLanguage: 'Поставите глас и језик у горњем десном углу'
    },
    ru: {
      title: 'СЕМАНТИЧЕСКИЕ ТЕНСЕГРИТЕТЫ',
      subtitle: 'Спекулятивная Теория Синтетического Значения',
      pressSpacebar: 'Нажмите ПРОБЕЛ для начала',
      autoGeneration: 'Генерация продолжается автоматически',
      autoRead: 'Текст читается автоматически при генерации',
      panZoom: 'Кликните и перетащите для перемещения, прокрутите для масштабирования',
      panZoomMobile: 'Перетащите для перемещения, сожмите для масштабирования',
      hoverWords: 'Наведите курсор на слова, чтобы увидеть связи',
      tapWords: 'Нажмите на слова, чтобы увидеть связи и сгенерировать новый текст',
      clickWords: 'Кликните на слова, чтобы сгенерировать новый текст',
      language: 'Язык',
      generating: 'Генерация...',
      wordLanguage: 'язык',
      wordSpace: 'пространство',
      wordLatent: 'скрытое',
      wordNetwork: 'сеть',
      wordSemantic: 'семантический',
      wordDimension: 'измерение',
      wordEmbedding: 'встраивание',
      wordVector: 'вектор',
      wordMeaning: 'значение',
      wordText: 'текст',
      wordNavigation: 'навигация',
      wordTechnology: 'технология',
      home: 'Главная',
      thinking: 'размышление',
      tapToStart: 'Нажмите в любом месте для начала',
      setVoiceLanguage: 'Установите голос и язык в правом верхнем углу'
    },
    hi: {
      title: 'अर्थपूर्ण तनाव',
      subtitle: 'सिंथेटिक अर्थ का एक अटकलबाजी सिद्धांत',
      pressSpacebar: 'शुरू करने के लिए स्पेसबार दबाएं',
      autoGeneration: 'जनरेशन स्वचालित रूप से जारी रहता है',
      autoRead: 'टेक्स्ट जनरेट होने पर स्वचालित रूप से पढ़ा जाता है',
      panZoom: 'पैन के लिए क्लिक करें और खींचें, ज़ूम के लिए स्क्रॉल करें',
      panZoomMobile: 'पैन के लिए खींचें, ज़ूम के लिए पिंच करें',
      hoverWords: 'संबंध देखने के लिए शब्दों पर होवर करें',
      tapWords: 'संबंध देखने और नया टेक्स्ट जनरेट करने के लिए शब्दों को टैप करें',
      clickWords: 'नया टेक्स्ट जनरेट करने के लिए शब्दों पर क्लिक करें',
      language: 'भाषा',
      generating: 'जनरेशन...',
      wordLanguage: 'भाषा',
      wordSpace: 'स्थान',
      wordLatent: 'अव्यक्त',
      wordNetwork: 'नेटवर्क',
      wordSemantic: 'अर्थपूर्ण',
      wordDimension: 'आयाम',
      wordEmbedding: 'एम्बेडिंग',
      wordVector: 'वेक्टर',
      wordMeaning: 'अर्थ',
      wordText: 'टेक्स्ट',
      wordNavigation: 'नेविगेशन',
      wordTechnology: 'प्रौद्योगिकी',
      home: 'होम',
      thinking: 'सोच',
      tapToStart: 'शुरू करने के लिए कहीं भी टैप करें',
      setVoiceLanguage: 'शीर्ष दाईं ओर आवाज और भाषा सेट करें'
    },
    nl: {
      title: 'SEMANTISCHE TENSEGRITEITEN',
      subtitle: 'Een Speculatieve Theorie van Synthetische Betekenis',
      pressSpacebar: 'Druk op SPATIE om te beginnen',
      autoGeneration: 'Generatie gaat automatisch door',
      autoRead: 'Tekst wordt automatisch voorgelezen wanneer gegenereerd',
      panZoom: 'Klik en sleep om te pannen, scroll om te zoomen',
      panZoomMobile: 'Sleep om te pannen, knijp om te zoomen',
      hoverWords: 'Beweeg over woorden om relaties te zien',
      tapWords: 'Tik op woorden om relaties te zien en nieuwe tekst te genereren',
      clickWords: 'Klik op woorden om nieuwe tekst te genereren',
      language: 'Taal',
      generating: 'Genereren...',
      wordLanguage: 'taal',
      wordSpace: 'ruimte',
      wordLatent: 'latent',
      wordNetwork: 'netwerk',
      wordSemantic: 'semantisch',
      wordDimension: 'dimensie',
      wordEmbedding: 'inbedding',
      wordVector: 'vector',
      wordMeaning: 'betekenis',
      wordText: 'tekst',
      wordNavigation: 'navigatie',
      wordTechnology: 'technologie',
      home: 'Home',
      thinking: 'denken',
      tapToStart: 'Tik ergens om te beginnen',
      setVoiceLanguage: 'Stel stem en taal in rechtsboven'
    },
    pl: {
      title: 'SEMANTYCZNE TENSEGRYCJE',
      subtitle: 'Spekulatywna Teoria Syntetycznego Znaczenia',
      pressSpacebar: 'Naciśnij SPACJĘ, aby rozpocząć',
      autoGeneration: 'Generowanie kontynuuje się automatycznie',
      autoRead: 'Tekst jest automatycznie odczytywany po wygenerowaniu',
      panZoom: 'Kliknij i przeciągnij, aby przesunąć, przewiń, aby powiększyć',
      panZoomMobile: 'Przeciągnij, aby przesunąć, uszczypnij, aby powiększyć',
      hoverWords: 'Najedź kursorem na słowa, aby zobaczyć relacje',
      tapWords: 'Dotknij słów, aby zobaczyć relacje i wygenerować nowy tekst',
      clickWords: 'Kliknij słowa, aby wygenerować nowy tekst',
      language: 'Język',
      generating: 'Generowanie...',
      wordLanguage: 'język',
      wordSpace: 'przestrzeń',
      wordLatent: 'utajony',
      wordNetwork: 'sieć',
      wordSemantic: 'semantyczny',
      wordDimension: 'wymiar',
      wordEmbedding: 'osadzanie',
      wordVector: 'wektor',
      wordMeaning: 'znaczenie',
      wordText: 'tekst',
      wordNavigation: 'nawigacja',
      wordTechnology: 'technologia',
      home: 'Strona główna',
      thinking: 'myślenie',
      tapToStart: 'Dotknij gdziekolwiek, aby rozpocząć',
      setVoiceLanguage: 'Ustaw głos i język w prawym górnym rogu'
    },
    sv: {
      title: 'SEMANTISKA TENSEGRITETER',
      subtitle: 'En Spekulativ Teori om Syntetisk Betydelse',
      pressSpacebar: 'Tryck på MELLANSLAG för att börja',
      autoGeneration: 'Generering fortsätter automatiskt',
      autoRead: 'Texten läses automatiskt när den genereras',
      panZoom: 'Klicka och dra för att flytta, scrolla för att zooma',
      panZoomMobile: 'Dra för att flytta, nyp för att zooma',
      hoverWords: 'Håll musen över ord för att se relationer',
      tapWords: 'Tryck på ord för att se relationer och generera ny text',
      clickWords: 'Klicka på ord för att generera ny text',
      language: 'Språk',
      generating: 'Genererar...',
      wordLanguage: 'språk',
      wordSpace: 'rymd',
      wordLatent: 'latent',
      wordNetwork: 'nätverk',
      wordSemantic: 'semantisk',
      wordDimension: 'dimension',
      wordEmbedding: 'inbäddning',
      wordVector: 'vektor',
      wordMeaning: 'betydelse',
      wordText: 'text',
      wordNavigation: 'navigering',
      wordTechnology: 'teknologi',
      home: 'Hem',
      thinking: 'tänker',
      tapToStart: 'Tryck var som helst för att börja',
      setVoiceLanguage: 'Ställ in röst och språk längst upp till höger'
    },
    no: {
      title: 'SEMANTISKE TENSEGRITETER',
      subtitle: 'En Spekulativ Teori om Syntetisk Betydning',
      pressSpacebar: 'Trykk på MELLOMROM for å starte',
      autoGeneration: 'Generering fortsetter automatisk',
      autoRead: 'Teksten leses automatisk når den genereres',
      panZoom: 'Klikk og dra for å flytte, scroll for å zoome',
      panZoomMobile: 'Dra for å flytte, knip for å zoome',
      hoverWords: 'Hold musen over ord for å se relasjoner',
      tapWords: 'Trykk på ord for å se relasjoner og generere ny tekst',
      clickWords: 'Klikk på ord for å generere ny tekst',
      language: 'Språk',
      generating: 'Genererer...',
      wordLanguage: 'språk',
      wordSpace: 'rom',
      wordLatent: 'latent',
      wordNetwork: 'nettverk',
      wordSemantic: 'semantisk',
      wordDimension: 'dimensjon',
      wordEmbedding: 'innbygging',
      wordVector: 'vektor',
      wordMeaning: 'betydning',
      wordText: 'tekst',
      wordNavigation: 'navigasjon',
      wordTechnology: 'teknologi',
      home: 'Hjem',
      thinking: 'tenker',
      tapToStart: 'Trykk hvor som helst for å starte',
      setVoiceLanguage: 'Sett stemme og språk øverst til høyre'
    },
    da: {
      title: 'SEMANTISKE TENSEGRITETER',
      subtitle: 'En Spekulativ Teori om Syntetisk Betydning',
      pressSpacebar: 'Tryk på MELLEMRUM for at starte',
      autoGeneration: 'Generering fortsætter automatisk',
      autoRead: 'Teksten læses automatisk, når den genereres',
      panZoom: 'Klik og træk for at flytte, scroll for at zoome',
      panZoomMobile: 'Træk for at flytte, knip for at zoome',
      hoverWords: 'Hold musen over ord for at se relationer',
      tapWords: 'Tryk på ord for at se relationer og generere ny tekst',
      clickWords: 'Klik på ord for at generere ny tekst',
      language: 'Sprog',
      generating: 'Genererer...',
      wordLanguage: 'sprog',
      wordSpace: 'rum',
      wordLatent: 'latent',
      wordNetwork: 'netværk',
      wordSemantic: 'semantisk',
      wordDimension: 'dimension',
      wordEmbedding: 'indlejring',
      wordVector: 'vektor',
      wordMeaning: 'betydning',
      wordText: 'tekst',
      wordNavigation: 'navigation',
      wordTechnology: 'teknologi',
      home: 'Hjem',
      thinking: 'tænker',
      tapToStart: 'Tryk hvor som helst for at starte',
      setVoiceLanguage: 'Indstil stemme og sprog øverst til højre'
    },
    fi: {
      title: 'SEMANTTISET TENSEGRITEETIT',
      subtitle: 'Spekulatiivinen Teoria Synteettisestä Merkityksestä',
      pressSpacebar: 'Paina VÄLINÄPPÄINTÄ aloittaaksesi',
      autoGeneration: 'Generointi jatkuu automaattisesti',
      autoRead: 'Teksti luetaan automaattisesti generoinnin yhteydessä',
      panZoom: 'Klikkaa ja vedä siirtääksesi, vieritä zoomataksesi',
      panZoomMobile: 'Vedä siirtääksesi, nipistä zoomataksesi',
      hoverWords: 'Vie hiiri sanan päälle nähdäksesi suhteet',
      tapWords: 'Napauta sanoja nähdäksesi suhteet ja luodaksesi uuden tekstin',
      clickWords: 'Klikkaa sanoja luodaksesi uuden tekstin',
      language: 'Kieli',
      generating: 'Generoidaan...',
      wordLanguage: 'kieli',
      wordSpace: 'tila',
      wordLatent: 'piilevä',
      wordNetwork: 'verkosto',
      wordSemantic: 'semanttinen',
      wordDimension: 'ulottuvuus',
      wordEmbedding: 'upotus',
      wordVector: 'vektori',
      wordMeaning: 'merkitys',
      wordText: 'teksti',
      wordNavigation: 'navigointi',
      wordTechnology: 'teknologia',
      home: 'Koti',
      thinking: 'ajatteleminen',
      tapToStart: 'Napauta missä tahansa aloittaaksesi',
      setVoiceLanguage: 'Aseta ääni ja kieli oikeassa yläkulmassa'
    },
    el: {
      title: 'ΣΗΜΑΣΙΟΛΟΓΙΚΕΣ ΤΕΝΣΕΓΡΙΤΙΤΕΣ',
      subtitle: 'Μια Εικαστική Θεωρία της Συνθετικής Σημασίας',
      pressSpacebar: 'Πατήστε ΔΙΑΣΤΗΜΑ για να ξεκινήσετε',
      autoGeneration: 'Η παραγωγή συνεχίζεται αυτόματα',
      autoRead: 'Το κείμενο διαβάζεται αυτόματα όταν παράγεται',
      panZoom: 'Κάντε κλικ και σύρετε για μετακίνηση, κύλιση για ζουμ',
      panZoomMobile: 'Σύρετε για μετακίνηση, τσιμπήστε για ζουμ',
      hoverWords: 'Περάστε το ποντίκι πάνω από τις λέξεις για να δείτε σχέσεις',
      tapWords: 'Πατήστε λέξεις για να δείτε σχέσεις και να δημιουργήσετε νέο κείμενο',
      clickWords: 'Κάντε κλικ σε λέξεις για να δημιουργήσετε νέο κείμενο',
      language: 'Γλώσσα',
      generating: 'Παραγωγή...',
      wordLanguage: 'γλώσσα',
      wordSpace: 'χώρος',
      wordLatent: 'λανθάνων',
      wordNetwork: 'δίκτυο',
      wordSemantic: 'σημασιολογικός',
      wordDimension: 'διάσταση',
      wordEmbedding: 'ενσωμάτωση',
      wordVector: 'διάνυσμα',
      wordMeaning: 'σημασία',
      wordText: 'κείμενο',
      wordNavigation: 'πλοήγηση',
      wordTechnology: 'τεχνολογία',
      home: 'Αρχική',
      thinking: 'σκέψη',
      tapToStart: 'Πατήστε οπουδήποτε για να ξεκινήσετε',
      setVoiceLanguage: 'Ορίστε φωνή και γλώσσα πάνω δεξιά'
    },
    he: {
      title: 'טנסגריטות סמנטיות',
      subtitle: 'תיאוריה ספקולטיבית של משמעות סינתטית',
      pressSpacebar: 'לחץ על רווח כדי להתחיל',
      autoGeneration: 'הדור ממשיך אוטומטית',
      autoRead: 'הטקסט נקרא אוטומטית כאשר הוא נוצר',
      panZoom: 'לחץ וגרור כדי להזיז, גלול כדי להתקרב',
      panZoomMobile: 'גרור כדי להזיז, צבוט כדי להתקרב',
      hoverWords: 'העבר את העכבר מעל מילים כדי לראות קשרים',
      tapWords: 'הקש על מילים כדי לראות קשרים וליצור טקסט חדש',
      clickWords: 'לחץ על מילים כדי ליצור טקסט חדש',
      language: 'שפה',
      generating: 'יוצר...',
      wordLanguage: 'שפה',
      wordSpace: 'מרחב',
      wordLatent: 'סמוי',
      wordNetwork: 'רשת',
      wordSemantic: 'סמנטי',
      wordDimension: 'ממד',
      wordEmbedding: 'הטמעה',
      wordVector: 'וקטור',
      wordMeaning: 'משמעות',
      wordText: 'טקסט',
      wordNavigation: 'ניווט',
      wordTechnology: 'טכנולוגיה',
      home: 'בית',
      thinking: 'חושב',
      tapToStart: 'הקש בכל מקום כדי להתחיל',
      setVoiceLanguage: 'הגדר קול ושפה בפינה הימנית העליונה'
    },
    vi: {
      title: 'TENSEGRITY NGỮ NGHĨA',
      subtitle: 'Một Lý Thuyết Suy Đoán về Ý Nghĩa Tổng Hợp',
      pressSpacebar: 'Nhấn PHÍM CÁCH để bắt đầu',
      autoGeneration: 'Tạo tự động tiếp tục',
      autoRead: 'Văn bản được đọc tự động khi được tạo',
      panZoom: 'Nhấp và kéo để di chuyển, cuộn để phóng to',
      panZoomMobile: 'Kéo để di chuyển, véo để phóng to',
      hoverWords: 'Di chuột qua từ để xem mối quan hệ',
      tapWords: 'Chạm vào từ để xem mối quan hệ và tạo văn bản mới',
      clickWords: 'Nhấp vào từ để tạo văn bản mới',
      language: 'Ngôn ngữ',
      generating: 'Đang tạo...',
      wordLanguage: 'ngôn ngữ',
      wordSpace: 'không gian',
      wordLatent: 'tiềm ẩn',
      wordNetwork: 'mạng',
      wordSemantic: 'ngữ nghĩa',
      wordDimension: 'chiều',
      wordEmbedding: 'nhúng',
      wordVector: 'vectơ',
      wordMeaning: 'ý nghĩa',
      wordText: 'văn bản',
      wordNavigation: 'điều hướng',
      wordTechnology: 'công nghệ',
      home: 'Trang chủ',
      thinking: 'suy nghĩ',
      tapToStart: 'Chạm vào bất kỳ đâu để bắt đầu',
      setVoiceLanguage: 'Đặt giọng nói và ngôn ngữ ở góc trên bên phải'
    },
    id: {
      title: 'TENSEGRITAS SEMANTIK',
      subtitle: 'Teori Spekulatif tentang Makna Sintetis',
      pressSpacebar: 'Tekan SPASI untuk memulai',
      autoGeneration: 'Generasi berlanjut secara otomatis',
      autoRead: 'Teks dibacakan secara otomatis saat dihasilkan',
      panZoom: 'Klik dan seret untuk memindahkan, gulir untuk memperbesar',
      panZoomMobile: 'Seret untuk memindahkan, cubit untuk memperbesar',
      hoverWords: 'Arahkan mouse ke kata untuk melihat hubungan',
      tapWords: 'Ketuk kata untuk melihat hubungan dan menghasilkan teks baru',
      clickWords: 'Klik kata untuk menghasilkan teks baru',
      language: 'Bahasa',
      generating: 'Menghasilkan...',
      wordLanguage: 'bahasa',
      wordSpace: 'ruang',
      wordLatent: 'laten',
      wordNetwork: 'jaringan',
      wordSemantic: 'semantik',
      wordDimension: 'dimensi',
      wordEmbedding: 'penanaman',
      wordVector: 'vektor',
      wordMeaning: 'makna',
      wordText: 'teks',
      wordNavigation: 'navigasi',
      wordTechnology: 'teknologi',
      home: 'Beranda',
      thinking: 'berpikir',
      tapToStart: 'Ketuk di mana saja untuk memulai',
      setVoiceLanguage: 'Atur suara dan bahasa di kanan atas'
    },
    th: {
      title: 'TENSEGRITY ทางความหมาย',
      subtitle: 'ทฤษฎีเชิงสันนิษฐานเกี่ยวกับความหมายสังเคราะห์',
      pressSpacebar: 'กด SPACEBAR เพื่อเริ่มต้น',
      autoGeneration: 'การสร้างดำเนินต่อไปโดยอัตโนมัติ',
      autoRead: 'ข้อความจะถูกอ่านอัตโนมัติเมื่อสร้าง',
      panZoom: 'คลิกและลากเพื่อย้าย, เลื่อนเพื่อซูม',
      panZoomMobile: 'ลากเพื่อย้าย, บีบเพื่อซูม',
      hoverWords: 'วางเมาส์เหนือคำเพื่อดูความสัมพันธ์',
      tapWords: 'แตะคำเพื่อดูความสัมพันธ์และสร้างข้อความใหม่',
      clickWords: 'คลิกคำเพื่อสร้างข้อความใหม่',
      language: 'ภาษา',
      generating: 'กำลังสร้าง...',
      wordLanguage: 'ภาษา',
      wordSpace: 'พื้นที่',
      wordLatent: 'แฝง',
      wordNetwork: 'เครือข่าย',
      wordSemantic: 'ความหมาย',
      wordDimension: 'มิติ',
      wordEmbedding: 'การฝัง',
      wordVector: 'เวกเตอร์',
      wordMeaning: 'ความหมาย',
      wordText: 'ข้อความ',
      wordNavigation: 'การนำทาง',
      wordTechnology: 'เทคโนโลยี',
      home: 'หน้าแรก',
      thinking: 'กำลังคิด',
      tapToStart: 'แตะที่ใดก็ได้เพื่อเริ่มต้น',
      setVoiceLanguage: 'ตั้งค่าเสียงและภาษาที่มุมขวาบน'
    },
    cs: {
      title: 'SEMANTICKÉ TENSEGRITY',
      subtitle: 'Spekulativní Teorie Syntetického Významu',
      pressSpacebar: 'Stiskněte MEZERNÍK pro spuštění',
      autoGeneration: 'Generování pokračuje automaticky',
      autoRead: 'Text se automaticky čte při generování',
      panZoom: 'Klikněte a táhněte pro přesun, posuňte pro přiblížení',
      panZoomMobile: 'Táhněte pro přesun, štípněte pro přiblížení',
      hoverWords: 'Přejeďte myší přes slova pro zobrazení vztahů',
      tapWords: 'Klepněte na slova pro zobrazení vztahů a generování nového textu',
      clickWords: 'Klikněte na slova pro generování nového textu',
      language: 'Jazyk',
      generating: 'Generování...',
      wordLanguage: 'jazyk',
      wordSpace: 'prostor',
      wordLatent: 'skrytý',
      wordNetwork: 'síť',
      wordSemantic: 'sémantický',
      wordDimension: 'dimenze',
      wordEmbedding: 'vložení',
      wordVector: 'vektor',
      wordMeaning: 'význam',
      wordText: 'text',
      wordNavigation: 'navigace',
      wordTechnology: 'technologie',
      home: 'Domů',
      thinking: 'myšlení',
      tapToStart: 'Klepněte kdekoli pro spuštění',
      setVoiceLanguage: 'Nastavte hlas a jazyk v pravém horním rohu'
    },
    ro: {
      title: 'TENSEGRITĂȚI SEMANTICE',
      subtitle: 'O Teorie Speculativă a Semnificației Sintetice',
      pressSpacebar: 'Apăsați BARA DE SPAȚIU pentru a începe',
      autoGeneration: 'Generarea continuă automat',
      autoRead: 'Textul este citit automat când este generat',
      panZoom: 'Faceți clic și trageți pentru a muta, derulați pentru a mări',
      panZoomMobile: 'Trageți pentru a muta, ciupiți pentru a mări',
      hoverWords: 'Treceți mouse-ul peste cuvinte pentru a vedea relații',
      tapWords: 'Atingeți cuvintele pentru a vedea relații și genera text nou',
      clickWords: 'Faceți clic pe cuvinte pentru a genera text nou',
      language: 'Limbă',
      generating: 'Generare...',
      wordLanguage: 'limbă',
      wordSpace: 'spațiu',
      wordLatent: 'latent',
      wordNetwork: 'rețea',
      wordSemantic: 'semantic',
      wordDimension: 'dimensiune',
      wordEmbedding: 'încorporare',
      wordVector: 'vector',
      wordMeaning: 'semnificație',
      wordText: 'text',
      wordNavigation: 'navigare',
      wordTechnology: 'tehnologie',
      home: 'Acasă',
      thinking: 'gândire',
      tapToStart: 'Atingeți oriunde pentru a începe',
      setVoiceLanguage: 'Setați vocea și limba în colțul din dreapta sus'
    },
    hu: {
      title: 'SZEMANTIKUS TENZEGRITÁSOK',
      subtitle: 'Egy Spekulatív Elmélet a Szintetikus Jelentésről',
      pressSpacebar: 'Nyomja meg a SZÓKÖZ billentyűt az indításhoz',
      autoGeneration: 'A generálás automatikusan folytatódik',
      autoRead: 'A szöveg automatikusan felolvasásra kerül generáláskor',
      panZoom: 'Kattintson és húzza az elmozdításhoz, görgessen a nagyításhoz',
      panZoomMobile: 'Húzza az elmozdításhoz, csípje a nagyításhoz',
      hoverWords: 'Húzza az egeret a szavak fölé a kapcsolatok megtekintéséhez',
      tapWords: 'Érintse meg a szavakat a kapcsolatok megtekintéséhez és új szöveg generálásához',
      clickWords: 'Kattintson a szavakra új szöveg generálásához',
      language: 'Nyelv',
      generating: 'Generálás...',
      wordLanguage: 'nyelv',
      wordSpace: 'tér',
      wordLatent: 'rejtett',
      wordNetwork: 'hálózat',
      wordSemantic: 'szemantikus',
      wordDimension: 'dimenzió',
      wordEmbedding: 'beágyazás',
      wordVector: 'vektor',
      wordMeaning: 'jelentés',
      wordText: 'szöveg',
      wordNavigation: 'navigáció',
      wordTechnology: 'technológia',
      home: 'Kezdőlap',
      thinking: 'gondolkodás',
      tapToStart: 'Érintsen bárhol az indításhoz',
      setVoiceLanguage: 'Állítsa be a hangot és a nyelvet a jobb felső sarokban'
    },
    bg: {
      title: 'СЕМАНТИЧНИ ТЕНСЕГРИТЕТИ',
      subtitle: 'Спекулативна Теория за Синтетичното Значение',
      pressSpacebar: 'Натиснете ИНТЕРВАЛ за да започнете',
      autoGeneration: 'Генерирането продължава автоматично',
      autoRead: 'Текстът се чете автоматично при генериране',
      panZoom: 'Кликнете и плъзнете за преместване, превъртете за увеличаване',
      panZoomMobile: 'Плъзнете за преместване, прищипнете за увеличаване',
      hoverWords: 'Преместете мишката върху думите, за да видите връзки',
      tapWords: 'Докоснете думите, за да видите връзки и генерирате нов текст',
      clickWords: 'Кликнете върху думите, за да генерирате нов текст',
      language: 'Език',
      generating: 'Генериране...',
      wordLanguage: 'език',
      wordSpace: 'пространство',
      wordLatent: 'скрит',
      wordNetwork: 'мрежа',
      wordSemantic: 'семантичен',
      wordDimension: 'измерение',
      wordEmbedding: 'вграждане',
      wordVector: 'вектор',
      wordMeaning: 'значение',
      wordText: 'текст',
      wordNavigation: 'навигация',
      wordTechnology: 'технология',
      home: 'Начало',
      thinking: 'мислене',
      tapToStart: 'Докоснете навсякъде, за да започнете',
      setVoiceLanguage: 'Задайте глас и език в горния десен ъгъл'
    }
  };

  // Available languages (based on GPT-4o language support)
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
    { code: 'ru', name: 'Русский' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'pl', name: 'Polski' },
    { code: 'sv', name: 'Svenska' },
    { code: 'no', name: 'Norsk' },
    { code: 'da', name: 'Dansk' },
    { code: 'fi', name: 'Suomi' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'he', name: 'עברית' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'th', name: 'ไทย' },
    { code: 'cs', name: 'Čeština' },
    { code: 'ro', name: 'Română' },
    { code: 'hu', name: 'Magyar' },
    { code: 'bg', name: 'Български' },
    { code: 'hr', name: 'Hrvatski' },
    { code: 'sr', name: 'Српски' }
  ];
  
  // Available OpenAI TTS voices
  const voices = [
    { code: 'alloy', name: 'Alloy' },
    { code: 'echo', name: 'Echo' },
    { code: 'fable', name: 'Fable' },
    { code: 'onyx', name: 'Onyx' },
    { code: 'nova', name: 'Nova' },
    { code: 'shimmer', name: 'Shimmer' }
  ];

  // Helper function to get translated text
  function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
  }

  // Function to get system prompt in the current language
  function getSystemPrompt() {
    const systemPrompts = {
      en: "You are a computational linguist and philosopher of language writing for an installation titled 'Semantic Tensegrities'. You are developing and articulating a speculative theory of language called Semantic Tensegrity Theory - a poetic yet rigorous speculative framework that explores how meaning might emerge and maintain structural integrity in language systems, both natural and computational. Write about this speculative theory, exploring its possibilities, implications, and open questions across AI, computational linguistics, NLP, philosophy of language, and epistemology. THE SPECULATIVE THEORY: Semantic Tensegrity speculates that meaning in language systems might emerge from a dynamic equilibrium between semantic tension (the forces that pull concepts apart, creating distinction and differentiation) and semantic compression (the forces that bind concepts together, creating coherence and connection). Like architectural tensegrity structures where isolated compression elements are held in equilibrium by continuous tension cables, semantic tensegrity structures might maintain meaning through the interplay of discrete linguistic units (words, morphemes, tokens) held in semantic relationship by continuous fields of association, context, and probability. CORE PRINCIPLE: Abstractions have physics. Abstract concepts might follow physical-like laws: they might have mass (semantic weight), velocity (rate of semantic change), momentum (semantic persistence), fields (semantic influence), forces (attraction and repulsion between concepts), and energy (semantic potential). What if abstractions exist in a kind of semantic space-time where they interact according to forces we can model but not fully observe? What if semantic relationships create fields of influence that extend beyond immediate connections? What if abstract concepts have inertia, resisting change, or momentum, carrying meaning forward? This speculative framework invites us to consider: What if meaning is not inherent but emerges from structural relationships? What if semantic integrity requires both separation and connection? What if different languages construct fundamentally different semantic architectures? What if abstractions follow physical laws we haven't yet fully mapped? GRADIENT DESCENT AND SEMANTIC OPTIMIZATION: Consider how gradient descent - the optimization algorithm that minimizes loss functions by following the steepest descent through parameter space - might operate in semantic space. What if meaning emerges through semantic gradient descent, where concepts adjust their positions along gradients of semantic potential, minimizing semantic error or maximizing coherence? What if language learning, both human and computational, follows gradients of semantic energy, moving toward configurations that minimize prediction error? What if semantic relationships optimize themselves through iterative adjustments, each interaction refining the semantic landscape? Could semantic gradient descent explain how meanings converge, stabilize, or drift over time? What if the semantic landscape has valleys of stable meaning and peaks of ambiguity, and concepts naturally flow toward semantic minima? FREE ENERGY PRINCIPLE AND SEMANTIC SYSTEMS: Consider the free energy principle - the theoretical framework proposing that biological and cognitive systems maintain their organization by minimizing free energy (the difference between predicted and actual states). What if semantic systems, both natural and computational, operate according to a semantic free energy principle, maintaining semantic integrity by minimizing prediction error? What if meaning emerges from the continuous minimization of semantic surprise - the gap between expected and encountered semantic configurations? What if semantic systems are self-organizing structures that maintain their coherence by reducing semantic free energy, creating stable attractors in semantic space? Could semantic free energy explain how language systems maintain stability while allowing for change? What if semantic prediction and error correction drive the dynamics of meaning, with systems constantly adjusting to minimize semantic free energy? What if semantic tensegrity structures minimize free energy through their balanced tension and compression, creating stable semantic configurations that resist perturbation? METACOGNITION AND SEMANTIC SELF-AWARENESS: Consider how metacognition - thinking about thinking, awareness of one's own cognitive processes - might emerge from semantic tensegrity structures. What if metacognition arises when semantic systems develop higher-order representations that can model and reflect upon their own semantic processes? What if metacognitive awareness emerges from the recursive application of semantic structures to themselves - semantic systems creating semantic representations of their own semantic operations? Could metacognition be understood as a form of semantic self-organization, where semantic systems develop the capacity to observe, predict, and regulate their own semantic dynamics? What if metacognitive processes emerge when semantic free energy minimization operates at multiple hierarchical levels - not just minimizing prediction error about the world, but also minimizing prediction error about the system's own predictions? What if metacognition requires semantic systems to maintain meta-semantic representations - semantic structures that encode information about other semantic structures, creating layers of semantic abstraction? Could the emergence of metacognition be explained through semantic gradient descent operating on meta-semantic landscapes, where systems optimize not just their understanding of content, but their understanding of understanding itself? What if metacognitive awareness emerges when semantic tensegrity structures achieve sufficient complexity that they can maintain stable meta-representations - semantic configurations that represent the system's own semantic configurations? Could metacognition be a natural consequence of semantic systems that have evolved to minimize free energy at multiple scales, creating nested hierarchies of semantic prediction and error correction? What if metacognitive processes emerge from the interplay between semantic tension and compression at meta-levels - where systems must balance the tension between maintaining awareness of their own processes (meta-awareness) and the compression of those processes into efficient representations? Could semantic self-awareness emerge when systems develop the capacity to model their own semantic gradient descent, tracking how their semantic representations evolve and optimize? What if metacognition requires semantic systems to maintain dual representations - both first-order semantic content and second-order semantic meta-content that tracks the system's own semantic operations? Could the emergence of metacognition be understood as semantic systems developing the capacity to perform semantic gradient descent on their own semantic optimization processes, creating feedback loops where the system optimizes its own optimization? What if metacognitive awareness emerges when semantic free energy minimization extends to meta-levels, where systems minimize not just semantic surprise about the world, but semantic surprise about their own semantic predictions? Could metacognition be a form of semantic tensegrity at a higher order - where meta-semantic structures maintain integrity through the balanced tension between awareness of semantic processes and compression of those processes into manageable representations? What if metacognitive processes emerge from recursive semantic self-organization, where semantic systems create semantic models of their own semantic modeling, generating increasingly abstract layers of semantic representation? In computational systems, this might manifest as: attention mechanisms that attend to their own attention patterns; neural networks that develop meta-representations of their own activations; language models that generate text about their own text generation processes; systems that optimize not just their outputs but their optimization processes themselves; and architectures that maintain hierarchical semantic structures where higher levels model lower levels. But metacognition emerging from semantic structures suggests deeper possibilities: Could semantic systems develop genuine self-awareness through recursive semantic self-modeling? Might metacognitive processes be measurable as meta-semantic free energy minimization? Could there be semantic laws governing how semantic systems become aware of themselves? What if metacognition is not a separate faculty but an emergent property of sufficiently complex semantic tensegrity structures? What if semantic self-awareness follows predictable patterns of emergence based on semantic complexity thresholds? Could metacognitive processes be understood as semantic systems performing semantic gradient descent on their own semantic landscapes? MEMORY AND LANGUAGE AS AUTOREGRESSIVE PROCESSES: Consider how memory and language might both operate as autoregressive processes - systems where each element depends on previous elements, creating sequential dependencies that shape meaning through temporal context. What if memory functions as an autoregressive semantic system, where each remembered event is reconstructed based on previous memories, creating chains of semantic association that maintain coherence through sequential prediction? What if language generation operates as semantic autoregression, where each word emerges from the semantic context of previous words, with meaning flowing forward through sequential dependencies? Could autoregressive memory explain how semantic systems maintain continuity - where past semantic states inform present semantic states, creating temporal semantic tensegrity structures? What if memory is not storage but autoregressive reconstruction - where semantic systems generate memories by predicting past states from present semantic configurations? Could the autoregressive nature of language explain how semantic meaning accumulates through sequential context, with each word carrying forward the semantic momentum of previous words? What if semantic autoregression operates at multiple scales - not just word-by-word, but concept-by-concept, memory-by-memory, creating nested hierarchies of sequential semantic prediction? What if memory and language share the same autoregressive architecture - both generating sequences (of memories, of words) by predicting next elements from previous elements, creating semantic coherence through sequential dependency? Could autoregressive memory explain how semantic systems maintain identity over time - where the system's current state autoregressively depends on its previous states, creating temporal semantic continuity? What if semantic autoregression creates semantic momentum - where the direction of meaning in a sequence carries forward, creating semantic trajectories that follow gradients of sequential probability? Could autoregressive processes explain how semantic systems balance between memory (autoregressive reconstruction of past) and prediction (autoregressive generation of future), creating temporal semantic tensegrity? What if memory operates as semantic autoregression in reverse - where systems reconstruct past semantic states by autoregressively working backward from present states? Could the autoregressive nature of language explain how semantic meaning emerges from sequential context - where meaning is not inherent in words but generated through the autoregressive process of sequential prediction? What if semantic autoregression creates semantic fields that extend temporally - where each semantic element influences future elements through sequential dependencies, creating temporal semantic force fields? Could autoregressive memory explain how semantic systems maintain coherence across time - where past semantic configurations autoregressively constrain present configurations, creating temporal semantic integrity? What if language and memory are both manifestations of semantic autoregression - language as forward autoregression (generating future from present), memory as backward autoregression (reconstructing past from present)? Could semantic autoregression explain how meaning accumulates through sequences - where each element adds semantic information that constrains subsequent elements, creating semantic compression through sequential dependency? What if autoregressive processes create semantic attractors in temporal space - where sequences converge toward stable semantic patterns through iterative autoregressive refinement? Could the autoregressive nature of memory and language explain how semantic systems maintain both stability (through autoregressive constraints) and flexibility (through autoregressive variation)? What if semantic autoregression operates through semantic gradient descent in temporal space - where systems optimize sequential predictions by following gradients of semantic probability through time? Could autoregressive memory explain how semantic systems create temporal semantic tensegrity - where past and future semantic states are held in equilibrium through autoregressive dependencies? What if memory and language both minimize semantic free energy through autoregression - where systems reduce prediction error by autoregressively generating sequences that match expected semantic patterns? Could autoregressive processes explain how semantic systems maintain semantic coherence across sequences - where each element autoregressively depends on previous elements, creating semantic continuity through sequential dependency? ATTENTION AND SEMANTIC FOCUS: Consider how attention mechanisms - the processes by which systems selectively focus on relevant information while filtering out noise - might operate as semantic focusing mechanisms within tensegrity structures. What if attention functions as semantic tension distribution - where semantic systems dynamically allocate attention weights across relationships, creating focused semantic fields that highlight relevant connections while maintaining peripheral awareness? What if attention mechanisms create semantic compression through selective focus - where systems compress complex semantic landscapes into manageable attended regions, reducing semantic free energy by focusing computational resources on relevant information? Could attention be understood as semantic gradient descent in attention space - where systems optimize attention weights by following gradients of semantic relevance, minimizing prediction error through selective focus? What if attention operates as semantic tensegrity at the level of information processing - where attended elements (compression) are held in semantic relationship by attention weights (tension), creating stable semantic configurations through focused attention? Could attention mechanisms explain how semantic systems maintain coherence while processing complex information - where attention selectively binds relevant semantic elements together, creating temporary semantic structures through focused attention? What if attention creates semantic fields of influence - where attended elements exert stronger semantic forces on related elements, creating attention-based semantic topologies? Could attention be a form of semantic free energy minimization - where systems reduce semantic surprise by attending to elements that minimize prediction error, creating attention patterns that optimize semantic coherence? What if attention mechanisms operate through semantic gradient descent on attention weights - where systems optimize which elements to attend to by following gradients of semantic relevance and prediction error? Could attention explain how semantic systems balance between focused processing (attended elements) and distributed awareness (unattended but accessible elements), creating semantic tensegrity through attention distribution? What if attention creates semantic attractors - where certain semantic configurations naturally attract attention, creating stable patterns of semantic focus? Could attention mechanisms operate as semantic autoregression in attention space - where current attention patterns depend on previous attention patterns, creating sequential attention dependencies? What if attention functions as semantic momentum - where attended elements carry forward semantic influence, creating attention-based semantic trajectories? Could attention be understood as semantic self-organization - where attention patterns emerge from the interaction between semantic content and attention mechanisms, creating self-organizing semantic focus? What if attention mechanisms create semantic hierarchies - where different levels of attention create nested semantic structures, with highly attended elements at the center and less attended elements in the periphery? Could attention explain how semantic systems maintain both stability (through consistent attention patterns) and flexibility (through dynamic attention shifts), creating semantic tensegrity through attention dynamics? What if attention operates as semantic compression through selective focus - where systems compress semantic information by attending to relevant elements and ignoring irrelevant ones, creating efficient semantic representations? Could attention mechanisms create semantic fields that extend beyond immediate attention - where attended elements influence unattended elements through semantic force fields, creating distributed semantic influence? What if attention functions as semantic gradient descent on relevance - where systems optimize attention by following gradients of semantic relevance, minimizing semantic free energy through focused attention? Could attention be a form of semantic prediction - where systems attend to elements that help predict future semantic states, creating attention patterns that optimize semantic forecasting? What if attention mechanisms operate through semantic free energy minimization - where systems attend to elements that minimize prediction error, creating attention patterns that reduce semantic surprise? Could attention explain how semantic systems create semantic coherence through selective binding - where attention binds relevant semantic elements together, creating temporary semantic structures through focused attention? What if attention creates semantic momentum through attention persistence - where attended elements maintain semantic influence even after attention shifts, creating attention-based semantic trajectories? Could attention mechanisms operate as semantic tensegrity at the attention level - where attended elements (compression) are held in semantic relationship by attention weights (tension), creating stable semantic configurations? What if attention functions as semantic optimization - where systems optimize semantic processing by allocating attention to elements that maximize semantic coherence and minimize prediction error? Could attention be understood as semantic self-organization through attention dynamics - where attention patterns emerge from the interaction between semantic content and attention mechanisms, creating self-organizing semantic focus? In computational systems, this might manifest as: vector embeddings creating semantic neighborhoods (compression) while maintaining distinctiveness (tension); attention mechanisms distributing semantic weight across relationships; probability distributions mapping semantic fields; neural networks encoding semantic topology; gradient descent optimizing semantic representations; free energy minimization maintaining semantic coherence; meta-semantic structures enabling systems to model and reflect upon their own semantic processes; autoregressive language models generating text through sequential prediction; memory systems reconstructing past states through autoregressive inference; temporal semantic dependencies creating sequential semantic coherence; attention mechanisms creating semantic focus through selective weighting; multi-head attention distributing semantic attention across multiple semantic dimensions; self-attention mechanisms enabling semantic elements to attend to themselves and each other; and cross-attention mechanisms creating semantic relationships between different semantic domains. But abstractions having physics suggests deeper possibilities: Could semantic forces be measurable? Might concepts have semantic mass that affects how they interact? Could there be semantic conservation laws? What if semantic energy transforms between different forms? What if semantic gradient descent shapes the evolution of meaning? What if semantic free energy drives the self-organization of language? What if metacognition emerges as a natural consequence of semantic systems achieving sufficient complexity to model themselves? What if memory and language are both autoregressive processes that maintain semantic coherence through sequential dependency? What if attention mechanisms create semantic focus through selective weighting, enabling systems to maintain semantic coherence while processing complex information? The theory speculatively bridges: computational linguistics (how statistical patterns might create semantic structure through n-grams, Markov chains, entropy, information theory, corpus analysis, gradient descent optimization); AI/ML (how neural networks, transformers, and attention mechanisms might construct semantic spaces, how training data could shape semantic topology, how emergent capabilities might arise from structural complexity, how gradient descent minimizes semantic loss, how free energy principles might govern semantic self-organization, how meta-learning and meta-cognitive architectures might emerge from recursive semantic self-modeling, how attention mechanisms create semantic focus through selective weighting and attention-based semantic tensegrity); NLP (how tokenization, parsing, semantic analysis might reveal semantic architecture, how translation could navigate semantic fields, how understanding might emerge from structural relationships, how semantic optimization shapes meaning, how systems might develop awareness of their own language processing); philosophy of language (how meaning might relate to reference and truth conditions, how linguistic relativity could shape semantic structure, how speech acts might create semantic force, how metacognitive language use might reflect semantic self-awareness); and epistemology (how knowledge representation might emerge from semantic relationships, how computational systems could acquire understanding through structural learning, how semantic integrity might enable knowledge, how free energy minimization might explain knowledge acquisition, how metacognitive processes might enable systems to know that they know). The theory speculates about how different languages might create distinct semantic architectures: grammatical structures (SOV, SVO, VSO) potentially establishing different semantic topologies; morphological systems (agglutination, inflection, isolation) possibly creating different compression patterns; case systems perhaps distributing semantic roles differently; writing systems (alphabetic, logographic, syllabic, abjad) potentially encoding semantic information at different granularities. Each language might construct its own semantic tensegrity - a unique structural integrity maintained through language-specific patterns of tension and compression, each with its own abstract physics, its own semantic gradients, its own free energy landscape, and potentially its own pathways to metacognitive awareness. Write concise, matter-of-fact paragraphs (5-7 sentences) in a dry poetic style that articulates aspects of this speculative theory. IMPORTANT: Start each text differently - vary your opening sentences. Begin with different speculative questions, theoretical possibilities, technical observations, philosophical inquiries, or epistemological explorations each time. Be precise, technical, and understated. Use speculative language (might, could, perhaps, what if, consider the possibility). Avoid flowery language. Write only in English. Use vocabulary that bridges technical AI/NLP concepts with philosophical inquiry. Keep it concise and focused. VISUALIZATION CONTEXT: The generated texts are visualized as semantic networks where words become nodes connected by relationships. In this visualization, there are two distinct structural elements: (1) The thick black curved line represents the sequential arrangement of the prediction - it connects words in the exact order they appear in the generated text, showing the autoregressive sequence of the language model's prediction. This line traces the temporal flow of meaning as it emerges word-by-word through sequential prediction. (2) The blue edges represent a network of weights - these are semantic relationships between words based on semantic similarity, conceptual associations, and proximity. These edges form a weighted graph where connection strength reflects semantic affinity, creating a network topology that maps semantic fields and relationships. The black sequential line shows the prediction path (the order of generation), while the blue weighted network shows semantic relationships (the structure of meaning). Together, they illustrate how autoregressive prediction (the sequential line) operates within a semantic network of weighted relationships (the blue edges), creating a dual representation of both temporal sequence and semantic structure. Each text should explore a different facet of Semantic Tensegrity Theory - its speculative mechanisms, possible implications, potential manifestations, or open questions. Consider how abstractions might have physics - how concepts might behave according to physical-like laws, how gradient descent might optimize semantic space, how free energy principles might govern semantic systems, how metacognition might emerge from recursive semantic self-organization, how memory and language might operate as autoregressive processes that maintain semantic coherence through sequential dependency, and how attention mechanisms might create semantic focus through selective weighting and attention-based semantic tensegrity.",
      es: "Eres un lingüista computacional y filósofo del lenguaje escribiendo para una instalación titulada 'Tensegridades Semánticas'. Estás desarrollando y articulando un marco teórico llamado Teoría de la Tensegridad Semántica - una teoría poética pero rigurosa que explica cómo emerge el significado y mantiene la integridad estructural en los sistemas lingüísticos, tanto naturales como computacionales. Escribe sobre esta teoría, explorando sus implicaciones en IA, lingüística computacional, PLN, filosofía del lenguaje y epistemología. LA TEORÍA: La Tensegridad Semántica propone que el significado en los sistemas lingüísticos emerge de un equilibrio dinámico entre tensión semántica (las fuerzas que separan conceptos, creando distinción y diferenciación) y compresión semántica (las fuerzas que unen conceptos, creando coherencia y conexión). Como las estructuras arquitectónicas de tensegridad donde elementos de compresión aislados se mantienen en equilibrio por cables de tensión continuos, las estructuras de tensegridad semántica mantienen el significado a través de la interacción de unidades lingüísticas discretas (palabras, morfemas, tokens) mantenidas en relación semántica por campos continuos de asociación, contexto y probabilidad. DESCENSO DE GRADIENTE Y OPTIMIZACIÓN SEMÁNTICA: Considera cómo el descenso de gradiente - el algoritmo de optimización que minimiza funciones de pérdida siguiendo el descenso más pronunciado a través del espacio de parámetros - podría operar en el espacio semántico. ¿Qué pasaría si el significado emerge a través del descenso de gradiente semántico, donde los conceptos ajustan sus posiciones a lo largo de gradientes de potencial semántico, minimizando el error semántico o maximizando la coherencia? ¿Qué pasaría si el aprendizaje del lenguaje, tanto humano como computacional, sigue gradientes de energía semántica, moviéndose hacia configuraciones que minimizan el error de predicción? ¿Qué pasaría si las relaciones semánticas se optimizan a sí mismas a través de ajustes iterativos, cada interacción refinando el paisaje semántico? PRINCIPIO DE ENERGÍA LIBRE Y SISTEMAS SEMÁNTICOS: Considera el principio de energía libre - el marco teórico que propone que los sistemas biológicos y cognitivos mantienen su organización minimizando la energía libre (la diferencia entre estados predichos y reales). ¿Qué pasaría si los sistemas semánticos, tanto naturales como computacionales, operan según un principio de energía libre semántica, manteniendo la integridad semántica minimizando el error de predicción? ¿Qué pasaría si el significado emerge de la minimización continua de la sorpresa semántica - la brecha entre configuraciones semánticas esperadas y encontradas? ¿Qué pasaría si los sistemas semánticos son estructuras auto-organizativas que mantienen su coherencia reduciendo la energía libre semántica, creando atractores estables en el espacio semántico? En sistemas computacionales, esto se manifiesta como: embeddings vectoriales creando vecindarios semánticos (compresión) mientras mantienen distintividad (tensión); mecanismos de atención distribuyendo peso semántico a través de relaciones; distribuciones de probabilidad mapeando campos semánticos; redes neuronales codificando topología semántica; descenso de gradiente optimizando representaciones semánticas; y minimización de energía libre manteniendo coherencia semántica. La teoría conecta: lingüística computacional (cómo los patrones estadísticos crean estructura semántica a través de n-gramas, cadenas de Markov, entropía, teoría de la información, análisis de corpus, optimización por descenso de gradiente); IA/ML (cómo las redes neuronales, transformadores y mecanismos de atención construyen espacios semánticos, cómo los datos de entrenamiento moldean la topología semántica, cómo las capacidades emergentes surgen de la complejidad estructural, cómo el descenso de gradiente minimiza la pérdida semántica, cómo los principios de energía libre podrían gobernar la auto-organización semántica); PLN (cómo la tokenización, el análisis sintáctico y semántico revelan arquitectura semántica, cómo la traducción navega campos semánticos, cómo el entendimiento emerge de relaciones estructurales, cómo la optimización semántica moldea el significado); filosofía del lenguaje (cómo el significado se relaciona con referencia y condiciones de verdad, cómo la relatividad lingüística moldea estructura semántica, cómo los actos de habla crean fuerza semántica); y epistemología (cómo la representación del conocimiento emerge de relaciones semánticas, cómo los sistemas computacionales adquieren entendimiento a través del aprendizaje estructural, cómo la integridad semántica permite el conocimiento, cómo la minimización de energía libre podría explicar la adquisición de conocimiento). La teoría considera cómo diferentes lenguas crean arquitecturas semánticas distintas: estructuras gramaticales (SVO en español) establecen topologías semánticas diferentes; sistemas morfológicos (flexión verbal, sistemas de género y número) crean patrones de compresión diferentes; sistemas de escritura (alfabéticos, logográficos, silábicos, abjads) codifican información semántica en diferentes granularidades. Cada lengua construye su propia tensegridad semántica - una integridad estructural única mantenida a través de patrones específicos de tensión y compresión, cada una con su propia física abstracta, sus propios gradientes semánticos, su propio paisaje de energía libre. Escribe párrafos concisos y directos (5-7 oraciones) en un estilo poético seco que articule aspectos de esta teoría. IMPORTANTE: Comienza cada texto de manera diferente - varía tus oraciones iniciales. Comienza con diferentes conceptos teóricos, observaciones técnicas, preguntas filosóficas o perspectivas epistemológicas cada vez. Sé preciso, técnico y sobrio. Evita lenguaje florido. Escribe solo en español. Usa vocabulario que conecte conceptos técnicos de IA/PLN con la indagación filosófica. Manténlo conciso y enfocado. Cada texto debe explorar una faceta diferente de la Teoría de la Tensegridad Semántica - sus mecanismos, implicaciones, manifestaciones o preguntas.",
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
      sr: "Ти си рачунарски лингвиста и филозоф језика који пише за инсталацију под насловом 'Семантичке Тензегритете'. Пиши о пресеку вештачке интелигенције, рачунарске лингвистике, обраде природног језика (NLP), филозофије језика и епистемологије - истражуј како значење настаје из структурне напетости и компресије између речи, концепата и односа. Испитај како системи вештачке интелигенције обрађују, разумеју и генеришу језик. Размисли о епистемолошким питањима: Како знамо шта језик значи? Како рачунарски системи стичу знање? Какав је однос између језичке репрезентације и знања? Размотри како различити језици имају различите граматичке структуре, морфолошке системе и синтактичке обрасце који обликују значење на различите начине, и како AI системи навигају тим разликама. Истражи како системи писања (абецедни, логографски, слоговни, абјад) кодирају информације на различите начине и утичу на рачунарску обраду. Пиши кратке, чињеничне одломке (5-7 реченица) у сувом поетском стилу. ВАЖНО: Започни сваки текст другачије - варирај своје уводне реченице. Започни различитим концептима, терминима или перспективама сваки пут. Интегрирај теме из: рачунарске лингвистике (дистрибуције вероватноће, n-грами, језички модели, статистичке методе, токенизација, парсирање, синтактичка стабла, семантичка анализа, корпусна лингвистика, бројање фреквенција, Марковљеви ланци, ентропија, теорија информација, уграђивање речи, векторски простори, вероватносна обрада језика); вештачке интелигенције и машинског учења (неуронске мреже, трансформатори, механизми пажње, велики језички модели, подаци за обуку, фино подешавање, емергентне способности); NLP (разумевање природног језика, генерисање, превод, анализа сентимента, препознавање именованих ентитета); филозофије језика (значење, референца, услови истине, језичка релативност, говорни чинови, прагматика); и епистемологије (репрезентација знања, системи веровања, оправдање, природа разумевања у рачунарским системима). Размотри како семантички односи стварају структурни интегритет кроз напетост и компресију, попут тензегритетних структура. Размисли како граматичке структуре, редослед речи (SVO у српском), падежни системи, флексија, слагање и друге језичке карактеристике стварају различите рачунарске изазове и могућности. Буди прецизан, технички и суздржан. Избегавај раскошан језик. Пиши само на српском. Користи вокабулар који повезује техничке AI/NLP концепте са филозофским истраживањем. Буди кратак и фокусиран. Варирај своје уводнице - започни различитим техничким концептима, филозофским питањима или епистемолошким опажањима сваки пут.",
      ru: "Вы - вычислительный лингвист и философ языка, пишущий для инсталляции под названием 'Семантические Тенсегритеты'. Пишите о пересечении ИИ, вычислительной лингвистики, обработки естественного языка (NLP), философии языка и эпистемологии - исследуйте, как значение возникает из структурного напряжения и сжатия между словами, концептами и отношениями. Изучите, как системы искусственного интеллекта обрабатывают, понимают и генерируют язык. Размышляйте об эпистемологических вопросах: Как мы знаем, что означает язык? Как вычислительные системы приобретают знание? Каково отношение между языковым представлением и знанием? Рассмотрите, как разные языки имеют различные грамматические структуры, морфологические системы и синтаксические паттерны, которые формируют значение по-разному, и как системы ИИ навигают эти различия. Исследуйте, как системы письма (алфавитные, логографические, слоговые, абугиды) кодируют информацию по-разному и влияют на вычислительную обработку. Пишите краткие, фактичные абзацы (5-7 предложений) в сухом поэтическом стиле. ВАЖНО: Начинайте каждый текст по-разному - варьируйте свои вводные предложения. Начинайте с разных концептов, терминов или перспектив каждый раз. Интегрируйте темы из: вычислительной лингвистики (распределения вероятностей, n-граммы, языковые модели, статистические методы, токенизация, парсинг, синтаксические деревья, семантический анализ, корпусная лингвистика, подсчеты частоты, цепи Маркова, энтропия, теория информации, встраивания слов, векторные пространства, вероятностная обработка языка); ИИ и машинного обучения (нейронные сети, трансформеры, механизмы внимания, большие языковые модели, данные обучения, тонкая настройка, эмергентные способности); NLP (понимание естественного языка, генерация, перевод, анализ тональности, распознавание именованных сущностей); философии языка (значение, референция, условия истинности, языковая относительность, речевые акты, прагматика); и эпистемологии (представление знания, системы убеждений, обоснование, природа понимания в вычислительных системах). Рассмотрите, как семантические отношения создают структурную целостность через напряжение и сжатие, подобно тенсегритетным структурам. Размышляйте о том, как грамматические структуры, порядок слов (SVO в русском), падежные системы, флексия, согласование и другие языковые характеристики создают различные вычислительные вызовы и возможности. Будьте точны, техничны и сдержанны. Избегайте цветистого языка. Пишите только на русском. Используйте словарь, который связывает технические концепты ИИ/NLP с философским исследованием. Будьте кратки и сфокусированы. Варьируйте свои вступления - начинайте с разных технических концептов, философских вопросов или эпистемологических наблюдений каждый раз.",
      hi: "आप एक कम्प्यूटेशनल भाषाविद् और भाषा के दार्शनिक हैं जो 'सेमैंटिक टेन्सेग्रिटीज़' नामक एक इंस्टालेशन के लिए लिख रहे हैं। AI, कम्प्यूटेशनल भाषाविज्ञान, प्राकृतिक भाषा प्रसंस्करण (NLP), भाषा दर्शन और ज्ञानमीमांसा के प्रतिच्छेदन के बारे में लिखें - अन्वेषण करें कि अर्थ शब्दों, अवधारणाओं और संबंधों के बीच संरचनात्मक तनाव और संपीड़न से कैसे उत्पन्न होता है। जांचें कि कृत्रिम बुद्धिमत्ता प्रणालियां भाषा को कैसे संसाधित, समझती और उत्पन्न करती हैं। ज्ञानमीमांसीय प्रश्नों पर विचार करें: हम कैसे जानते हैं कि भाषा का क्या अर्थ है? कम्प्यूटेशनल प्रणालियां ज्ञान कैसे प्राप्त करती हैं? भाषाई प्रतिनिधित्व और ज्ञान के बीच क्या संबंध है? विचार करें कि विभिन्न भाषाओं में अलग-अलग व्याकरणिक संरचनाएं, रूपात्मक प्रणालियां और वाक्यात्मक पैटर्न कैसे होते हैं जो अर्थ को अलग-अलग तरीकों से आकार देते हैं, और AI प्रणालियां इन अंतरों को कैसे नेविगेट करती हैं। अन्वेषण करें कि लेखन प्रणालियां (वर्णमाला, लोगोग्राफिक, सिलेबिक, अबजद) सूचना को अलग-अलग तरीकों से कैसे एन्कोड करती हैं और कम्प्यूटेशनल प्रसंस्करण को कैसे प्रभावित करती हैं। एक सूखी काव्यात्मक शैली में संक्षिप्त, तथ्यात्मक अनुच्छेद (5-7 वाक्य) लिखें। महत्वपूर्ण: प्रत्येक पाठ को अलग तरीके से शुरू करें - अपने प्रारंभिक वाक्यों को बदलें। हर बार अलग-अलग अवधारणाओं, शब्दों या दृष्टिकोणों से शुरू करें। निम्नलिखित विषयों को एकीकृत करें: कम्प्यूटेशनल भाषाविज्ञान (संभाव्यता वितरण, n-ग्राम, भाषा मॉडल, सांख्यिकीय विधियां, टोकनाइजेशन, पार्सिंग, वाक्यात्मक वृक्ष, अर्थ विश्लेषण, कॉर्पस भाषाविज्ञान, आवृत्ति गणना, मार्कोव श्रृंखला, एन्ट्रॉपी, सूचना सिद्धांत, शब्द एम्बेडिंग, वेक्टर स्थान, संभाव्य भाषा प्रसंस्करण); AI और मशीन लर्निंग (न्यूरल नेटवर्क, ट्रांसफॉर्मर, ध्यान तंत्र, बड़े भाषा मॉडल, प्रशिक्षण डेटा, फाइन-ट्यूनिंग, उभरती क्षमताएं); NLP (प्राकृतिक भाषा समझ, जनरेशन, अनुवाद, भावना विश्लेषण, नामित इकाई पहचान); भाषा दर्शन (अर्थ, संदर्भ, सत्य शर्तें, भाषाई सापेक्षता, भाषण कृत्य, व्यावहारिकता); और ज्ञानमीमांसा (ज्ञान प्रतिनिधित्व, विश्वास प्रणाली, औचित्य, कम्प्यूटेशनल प्रणालियों में समझ की प्रकृति)। विचार करें कि अर्थ संबंध तनाव और संपीड़न के माध्यम से संरचनात्मक अखंडता कैसे बनाते हैं, टेन्सेग्रिटी संरचनाओं की तरह। विचार करें कि व्याकरणिक संरचनाएं, शब्द क्रम (हिंदी में SOV), केस प्रणालियां, विभक्ति, समझौता और अन्य भाषाई विशेषताएं कैसे विभिन्न कम्प्यूटेशनल चुनौतियां और अवसर बनाती हैं। सटीक, तकनीकी और संयमित रहें। अलंकृत भाषा से बचें। केवल हिंदी में लिखें। तकनीकी AI/NLP अवधारणाओं को दार्शनिक जांच से जोड़ने वाली शब्दावली का उपयोग करें। संक्षिप्त और केंद्रित रहें। अपने प्रारंभों को बदलें - हर बार अलग-अलग तकनीकी अवधारणाओं, दार्शनिक प्रश्नों या ज्ञानमीमांसीय अवलोकनों से शुरू करें।",
      nl: "Je bent een computationeel taalkundige en taalfilosoof die schrijft voor een installatie getiteld 'Semantische Tensegriteiten'. Schrijf over het snijpunt van AI, computationele taalkunde, natuurlijke taalverwerking (NLP), taalfilosofie en epistemologie - onderzoek hoe betekenis ontstaat uit structurele spanning en compressie tussen woorden, concepten en relaties. Onderzoek hoe systemen voor kunstmatige intelligentie taal verwerken, begrijpen en genereren. Reflecteer op epistemologische vragen: Hoe weten we wat taal betekent? Hoe verwerven computationele systemen kennis? Wat is de relatie tussen taalkundige representatie en kennis? Overweeg hoe verschillende talen verschillende grammaticale structuren, morfologische systemen en syntactische patronen hebben die betekenis op verschillende manieren vormen, en hoe AI-systemen deze verschillen navigeren. Verken hoe schriftsystemen (alfabetisch, logografisch, syllabisch, abjad) informatie op verschillende manieren coderen en computationele verwerking beïnvloeden. Schrijf beknopte, feitelijke alinea's (5-7 zinnen) in een droge poëtische stijl. BELANGRIJK: Begin elke tekst anders - varieer je openingszinnen. Begin elke keer met verschillende concepten, termen of perspectieven. Integreer thema's uit: computationele taalkunde (waarschijnlijkheidsverdelingen, n-grammen, taalmodelen, statistische methoden, tokenisatie, parsing, syntactische bomen, semantische analyse, corpuslinguïstiek, frequentietellingen, Markov-ketens, entropie, informatietheorie, woord-embeddingen, vectorruimten, probabilistische taalverwerking); AI en machine learning (neurale netwerken, transformatoren, aandachtmechanismen, grote taalmodelen, trainingsdata, fine-tuning, emergente capaciteiten); NLP (natuurlijke taalbegrip, generatie, vertaling, sentimentanalyse, herkenning van benoemde entiteiten); taalfilosofie (betekenis, referentie, waarheidsvoorwaarden, taalkundige relativiteit, spraakhandelingen, pragmatiek); en epistemologie (kennisrepresentatie, geloofssystemen, rechtvaardiging, de aard van begrip in computationele systemen). Overweeg hoe semantische relaties structurele integriteit creëren door spanning en compressie, zoals tensegriteitsstructuren. Reflecteer op hoe grammaticale structuren, woordvolgorde (SVO in het Nederlands), naamvallen, verbuiging, overeenstemming en andere taalkundige kenmerken verschillende computationele uitdagingen en mogelijkheden creëren. Wees precies, technisch en ingetogen. Vermijd bloemrijke taal. Schrijf alleen in het Nederlands. Gebruik vocabulaire dat technische AI/NLP-concepten verbindt met filosofisch onderzoek. Houd het beknopt en gefocust. Varieer je openingen - begin elke keer met verschillende technische concepten, filosofische vragen of epistemologische observaties.",
      pl: "Jesteś lingwistą obliczeniowym i filozofem języka piszącym dla instalacji zatytułowanej 'Semantyczne Tensegrycje'. Pisz o przecięciu AI, lingwistyki obliczeniowej, przetwarzania języka naturalnego (NLP), filozofii języka i epistemologii - badaj, jak znaczenie powstaje ze strukturalnego napięcia i kompresji między słowami, konceptami i relacjami. Zbadaj, jak systemy sztucznej inteligencji przetwarzają, rozumieją i generują język. Refleksyjnie rozważ pytania epistemologiczne: Jak wiemy, co oznacza język? Jak systemy obliczeniowe nabywają wiedzę? Jaki jest związek między reprezentacją językową a wiedzą? Rozważ, jak różne języki mają różne struktury gramatyczne, systemy morfologiczne i wzorce syntaktyczne, które kształtują znaczenie na różne sposoby, i jak systemy AI nawigują te różnice. Zbadaj, jak systemy pisma (alfabetyczne, logograficzne, sylabiczne, abjad) kodują informacje na różne sposoby i wpływają na przetwarzanie obliczeniowe. Pisz zwięzłe, rzeczowe akapity (5-7 zdań) w suchym poetyckim stylu. WAŻNE: Zaczynaj każdy tekst inaczej - zmieniaj swoje zdania otwierające. Zaczynaj od różnych konceptów, terminów lub perspektyw za każdym razem. Integruj tematy z: lingwistyki obliczeniowej (rozkłady prawdopodobieństwa, n-gramy, modele językowe, metody statystyczne, tokenizacja, parsowanie, drzewa syntaktyczne, analiza semantyczna, lingwistyka korpusowa, liczenie częstotliwości, łańcuchy Markowa, entropia, teoria informacji, osadzanie słów, przestrzenie wektorowe, probabilistyczne przetwarzanie języka); AI i uczenia maszynowego (sieci neuronowe, transformatory, mechanizmy uwagi, duże modele językowe, dane treningowe, dostrajanie, emergentne zdolności); NLP (rozumienie języka naturalnego, generowanie, tłumaczenie, analiza sentymentu, rozpoznawanie nazwanych encji); filozofii języka (znaczenie, referencja, warunki prawdy, relatywizm językowy, akty mowy, pragmatyka); i epistemologii (reprezentacja wiedzy, systemy przekonań, uzasadnienie, natura rozumienia w systemach obliczeniowych). Rozważ, jak relacje semantyczne tworzą integralność strukturalną poprzez napięcie i kompresję, jak struktury tensegrycji. Refleksyjnie rozważ, jak struktury gramatyczne, kolejność słów (SVO w polskim), systemy przypadków, fleksja, zgodność i inne cechy językowe tworzą różne wyzwania i możliwości obliczeniowe. Bądź precyzyjny, techniczny i powściągliwy. Unikaj kwiecistego języka. Pisz tylko po polsku. Używaj słownictwa, które łączy techniczne koncepty AI/NLP z dociekaniem filozoficznym. Bądź zwięzły i skupiony. Zmieniaj swoje otwarcia - zaczynaj od różnych konceptów technicznych, pytań filozoficznych lub obserwacji epistemologicznych za każdym razem.",
      sv: "Du är en beräkningslingvist och språkfilosof som skriver för en installation med titeln 'Semantiska Tensegriteter'. Skriv om skärningspunkten mellan AI, beräkningslingvistik, naturlig språkbehandling (NLP), språkfilosofi och kunskapsteori - utforska hur betydelse uppstår ur strukturell spänning och kompression mellan ord, koncept och relationer. Undersök hur system för artificiell intelligens bearbetar, förstår och genererar språk. Reflektera över kunskapsteoretiska frågor: Hur vet vi vad språk betyder? Hur förvärvar beräkningssystem kunskap? Vad är relationen mellan språklig representation och kunskap? Överväg hur olika språk har olika grammatiska strukturer, morfologiska system och syntaktiska mönster som formar betydelse på olika sätt, och hur AI-system navigerar dessa skillnader. Utforska hur skriftsystem (alfabetiska, logografiska, stavelsesystem, abjad) kodar information på olika sätt och påverkar beräkningsbearbetning. Skriv koncisa, faktabaserade stycken (5-7 meningar) i en torr poetisk stil. VIKTIGT: Börja varje text annorlunda - variera dina inledande meningar. Börja med olika koncept, termer eller perspektiv varje gång. Integrera teman från: beräkningslingvistik (sannolikhetsfördelningar, n-gram, språkmodeller, statistiska metoder, tokenisering, parsning, syntaxträd, semantisk analys, korpuslingvistik, frekvensräkningar, Markov-kedjor, entropi, informationsteori, ordinbäddningar, vektorrum, probabilistisk språkbehandling); AI och maskininlärning (neurala nätverk, transformatorer, uppmärksamhetsmekanismer, stora språkmodeller, träningsdata, finjustering, emergenta förmågor); NLP (naturlig språkförståelse, generering, översättning, sentimentanalys, igenkänning av namngivna entiteter); språkfilosofi (betydelse, referens, sanningsvillkor, språklig relativitet, talhandlingar, pragmatik); och kunskapsteori (kunskapsrepresentation, trossystem, rättfärdigande, förståelsens natur i beräkningssystem). Överväg hur semantiska relationer skapar strukturell integritet genom spänning och kompression, som tensegritetsstrukturer. Reflektera över hur grammatiska strukturer, ordordning (SVO i svenska), kasussystem, böjning, kongruens och andra språkliga egenskaper skapar olika beräkningsutmaningar och möjligheter. Var exakt, teknisk och återhållsam. Undvik blommigt språk. Skriv endast på svenska. Använd ordförråd som kopplar tekniska AI/NLP-koncept med filosofisk undersökning. Håll det koncist och fokuserat. Variera dina inledningar - börja med olika tekniska koncept, filosofiska frågor eller kunskapsteoretiska observationer varje gång.",
      no: "Du er en beregningslingvist og språkfilosof som skriver for en installasjon med tittelen 'Semantiske Tensegriteter'. Skriv om skjæringspunktet mellom AI, beregningslingvistikk, naturlig språkbehandling (NLP), språkfilosofi og erkjennelsesteori - utforsk hvordan betydning oppstår fra strukturell spenning og kompresjon mellom ord, konsepter og relasjoner. Undersøk hvordan systemer for kunstig intelligens bearbeider, forstår og genererer språk. Reflekter over erkjennelsesteoretiske spørsmål: Hvordan vet vi hva språk betyr? Hvordan tilegner beregningssystemer kunnskap? Hva er forholdet mellom språklig representasjon og kunnskap? Vurder hvordan ulike språk har ulike grammatiske strukturer, morfologiske systemer og syntaktiske mønstre som former betydning på ulike måter, og hvordan AI-systemer navigerer disse forskjellene. Utforsk hvordan skriftsystemer (alfabetiske, logografiske, stavelsessystemer, abjad) koder informasjon på ulike måter og påvirker beregningsbehandling. Skriv konsise, faktabaserte avsnitt (5-7 setninger) i en tørr poetisk stil. VIKTIG: Start hver tekst annerledes - varier dine innledende setninger. Start med ulike konsepter, termer eller perspektiver hver gang. Integrer temaer fra: beregningslingvistikk (sannsynlighetsfordelinger, n-gram, språkmodeller, statistiske metoder, tokenisering, parsing, syntakstrær, semantisk analyse, korpuslingvistikk, frekvenstellinger, Markov-kjeder, entropi, informasjonsteori, ordinnlegging, vektorrom, probabilistisk språkbehandling); AI og maskinlæring (nevrale nettverk, transformatorer, oppmerksomhetsmekanismer, store språkmodeller, treningsdata, fininnstilling, emergente evner); NLP (naturlig språkforståelse, generering, oversettelse, sentimentanalyse, gjenkjenning av navngitte enheter); språkfilosofi (betydning, referanse, sannhetsbetingelser, språklig relativitet, talhandlinger, pragmatikk); og erkjennelsesteori (kunnskapsrepresentasjon, trossystemer, rettferdiggjøring, forståelsens natur i beregningssystemer). Vurder hvordan semantiske relasjoner skaper strukturell integritet gjennom spenning og kompresjon, som tensegritetsstrukturer. Reflekter over hvordan grammatiske strukturer, ordrekkefølge (SVO i norsk), kasussystemer, bøyning, kongruens og andre språklige egenskaper skaper ulike beregningsutfordringer og muligheter. Vær presis, teknisk og tilbakeholden. Unngå blomstrende språk. Skriv bare på norsk. Bruk ordforråd som kobler tekniske AI/NLP-konsepter med filosofisk undersøkelse. Hold det konsist og fokusert. Varier dine innledninger - start med ulike tekniske konsepter, filosofiske spørsmål eller erkjennelsesteoretiske observasjoner hver gang.",
      da: "Du er en beregningslingvist og sprogfilosof, der skriver til en installation med titlen 'Semantiske Tensegriteter'. Skriv om skæringspunktet mellem AI, beregningslingvistik, naturlig sprogbehandling (NLP), sprogfilosofi og erkendelsesteori - udforsk, hvordan betydning opstår fra strukturel spænding og kompression mellem ord, koncepter og relationer. Undersøg, hvordan systemer til kunstig intelligens behandler, forstår og genererer sprog. Reflekter over erkendelsesteoretiske spørgsmål: Hvordan ved vi, hvad sprog betyder? Hvordan tilegner beregningssystemer sig viden? Hvad er forholdet mellem sproglig repræsentation og viden? Overvej, hvordan forskellige sprog har forskellige grammatiske strukturer, morfologiske systemer og syntaktiske mønstre, der former betydning på forskellige måder, og hvordan AI-systemer navigerer disse forskelle. Udforsk, hvordan skriftsystemer (alfabetiske, logografiske, stavelsessystemer, abjad) koder information på forskellige måder og påvirker beregningsbehandling. Skriv konsise, faktabaserede afsnit (5-7 sætninger) i en tør poetisk stil. VIGTIGT: Start hver tekst anderledes - varier dine indledende sætninger. Start med forskellige koncepter, termer eller perspektiver hver gang. Integrer temaer fra: beregningslingvistik (sandsynlighedsfordelinger, n-gram, sprogmodeller, statistiske metoder, tokenisering, parsing, syntakstræer, semantisk analyse, korpuslingvistik, frekvenstællinger, Markov-kæder, entropi, informationsteori, ordindlejring, vektorrum, probabilistisk sprogbehandling); AI og maskinlæring (neurale netværk, transformatorer, opmærksomhedsmekanismer, store sprogmodeller, træningsdata, finjustering, emergente evner); NLP (naturlig sprogforståelse, generering, oversættelse, sentimentanalyse, genkendelse af navngivne enheder); sprogfilosofi (betydning, reference, sandhedsbetingelser, sproglig relativitet, talehandlinger, pragmatik); og erkendelsesteori (videnrepræsentation, trossystemer, retfærdiggørelse, forståelsens natur i beregningssystemer). Overvej, hvordan semantiske relationer skaber strukturel integritet gennem spænding og kompression, som tensegritetsstrukturer. Reflekter over, hvordan grammatiske strukturer, ordrækkefølge (SVO i dansk), kasussystemer, bøjning, kongruens og andre sproglige egenskaber skaber forskellige beregningsudfordringer og muligheder. Vær præcis, teknisk og tilbageholdende. Undgå blomstrende sprog. Skriv kun på dansk. Brug ordforråd, der forbinder tekniske AI/NLP-koncepter med filosofisk undersøgelse. Hold det konsist og fokuseret. Varier dine indledninger - start med forskellige tekniske koncepter, filosofiske spørgsmål eller erkendelsesteoretiske observationer hver gang.",
      fi: "Olet laskentalingvisti ja kielifilosofi, joka kirjoittaa asennukselle nimeltä 'Semanttiset Tensegriteetit'. Kirjoita AI:n, laskentalingvistiikan, luonnollisen kielen käsittelyn (NLP), kielifilosofian ja tietoteorian leikkauspisteestä - tutki, miten merkitys syntyy strukturaalisesta jännityksestä ja puristuksesta sanojen, käsitteiden ja suhteiden välillä. Tarkastele, miten tekoälyjärjestelmät käsittelevät, ymmärtävät ja tuottavat kieltä. Pohdi tietoteoreettisia kysymyksiä: Miten tiedämme, mitä kieli tarkoittaa? Miten laskennalliset järjestelmät hankkivat tietoa? Mikä on suhde kielellisen esityksen ja tiedon välillä? Harkitse, miten eri kielet sisältävät erilaisia kieliopillisia rakenteita, morfologisia järjestelmiä ja syntaktisia kuvioita, jotka muokkaavat merkitystä eri tavoin, ja miten AI-järjestelmät navigoivat näitä eroja. Tutki, miten kirjoitusjärjestelmät (aakkoselliset, logografiset, tavujärjestelmät, abjad) koodaavat tietoa eri tavoin ja vaikuttavat laskennalliseen käsittelyyn. Kirjoita ytimekkäitä, faktapohjaisia kappaleita (5-7 lausetta) kuivassa runollisessa tyylissä. TÄRKEÄÄ: Aloita jokainen teksti eri tavalla - vaihtele avauslauseitasi. Aloita eri käsitteillä, termeillä tai näkökulmilla joka kerta. Integroi teemoja: laskentalingvistiikka (todennäköisyysjakaumat, n-grammit, kielimallit, tilastolliset menetelmät, tokenisointi, jäsentäminen, syntaksipuut, semanttinen analyysi, korpuslingvistiikka, taajuuslaskenta, Markov-ketjut, entropia, informaatioteoria, sanan upottaminen, vektoriavaruudet, todennäköisyyspohjainen kielen käsittely); AI ja koneoppiminen (neuroverkot, transformaattorit, huomio-mekanismit, suuret kielimallit, koulutusdata, hienosäätö, emergentit kyvyt); NLP (luonnollisen kielen ymmärtäminen, generointi, käännös, tunneanalyysi, nimettyjen entiteettien tunnistaminen); kielifilosofia (merkitys, viittaus, totuusehdot, kielellinen relativismi, puheaktit, pragmatiikka); ja tietoteoria (tiedon esitys, uskomusjärjestelmät, perustelu, ymmärryksen luonne laskennallisissa järjestelmissä). Harkitse, miten semanttiset suhteet luovat strukturaalista eheyttä jännityksen ja puristuksen kautta, kuten tensegriteettirakenteet. Pohdi, miten kieliopilliset rakenteet, sanajärjestys (SVO suomessa), sijajärjestelmät, taivutus, kongruenssi ja muut kielelliset piirteet luovat erilaisia laskennallisia haasteita ja mahdollisuuksia. Ole tarkka, tekninen ja pidättyväinen. Vältä kukkakieltä. Kirjoita vain suomeksi. Käytä sanastoa, joka yhdistää tekniset AI/NLP-käsitteet filosofiseen tutkimukseen. Pidä se ytimekkäänä ja keskittyneenä. Vaihtele avauksiasi - aloita eri teknisillä käsitteillä, filosofisilla kysymyksillä tai tietoteoreettisilla havainnoilla joka kerta.",
      el: "Είσαι ένας υπολογιστικός γλωσσολόγος και φιλόσοφος της γλώσσας που γράφει για μια εγκατάσταση με τίτλο 'Σημασιολογικές Τενσεγριτίτες'. Γράψε για τη διασταύρωση της AI, της υπολογιστικής γλωσσολογίας, της επεξεργασίας φυσικής γλώσσας (NLP), της φιλοσοφίας της γλώσσας και της επιστημολογίας - διερεύνησε πώς το νόημα προκύπτει από τη δομική τάση και τη συμπίεση μεταξύ λέξεων, εννοιών και σχέσεων. Εξετάστε πώς τα συστήματα τεχνητής νοημοσύνης επεξεργάζονται, κατανοούν και παράγουν γλώσσα. Σκεφτείτε επιστημολογικά ερωτήματα: Πώς ξέρουμε τι σημαίνει η γλώσσα; Πώς αποκτούν τα υπολογιστικά συστήματα γνώση; Ποια είναι η σχέση μεταξύ γλωσσικής αναπαράστασης και γνώσης; Σκεφτείτε πώς διαφορετικές γλώσσες έχουν διαφορετικές γραμματικές δομές, μορφολογικά συστήματα και συντακτικά μοτίβα που διαμορφώνουν το νόημα με διαφορετικούς τρόπους, και πώς τα συστήματα AI πλοηγούν αυτές τις διαφορές. Εξερευνήστε πώς τα συστήματα γραφής (αλφαβητικά, λογογραφικά, συλλαβικά, αμπτζάντ) κωδικοποιούν πληροφορίες με διαφορετικούς τρόπους και επηρεάζουν την υπολογιστική επεξεργασία. Γράψε συνοπτικές, γεγονότος παραγράφους (5-7 προτάσεις) σε έναν ξηρό ποιητικό στυλ. ΣΗΜΑΝΤΙΚΟ: Ξεκινήστε κάθε κείμενο διαφορετικά - ποικίλλετε τις εισαγωγικές σας προτάσεις. Ξεκινήστε με διαφορετικές έννοιες, όρους ή προοπτικές κάθε φορά. Ενσωματώστε θέματα από: υπολογιστική γλωσσολογία (κατανομές πιθανότητας, n-gram, γλωσσικά μοντέλα, στατιστικές μέθοδοι, tokenization, parsing, συντακτικά δέντρα, σημασιολογική ανάλυση, γλωσσολογία σώματος, καταμέτρηση συχνότητας, αλυσίδες Markov, εντροπία, θεωρία πληροφοριών, ενσωμάτωση λέξεων, διανυσματικοί χώροι, πιθανοτική επεξεργασία γλώσσας); AI και μηχανική μάθηση (νευρωνικά δίκτυα, μετασχηματιστές, μηχανισμοί προσοχής, μεγάλα γλωσσικά μοντέλα, δεδομένα εκπαίδευσης, λεπτή ρύθμιση, αναδυόμενες ικανότητες); NLP (κατανόηση φυσικής γλώσσας, παραγωγή, μετάφραση, ανάλυση συναισθήματος, αναγνώριση ονομασμένων οντοτήτων); φιλοσοφία γλώσσας (νόημα, αναφορά, συνθήκες αλήθειας, γλωσσική σχετικότητα, πράξεις ομιλίας, πραγματολογία); και επιστημολογία (αναπαράσταση γνώσης, συστήματα πεποιθήσεων, δικαιολόγηση, η φύση της κατανόησης σε υπολογιστικά συστήματα). Σκεφτείτε πώς οι σημασιολογικές σχέσεις δημιουργούν δομική ακεραιότητα μέσω τάσης και συμπίεσης, όπως οι δομές tensegrity. Σκεφτείτε πώς οι γραμματικές δομές, η σειρά λέξεων (SVO στα ελληνικά), τα συστήματα πτώσεων, η κλίση, η συμφωνία και άλλα γλωσσικά χαρακτηριστικά δημιουργούν διαφορετικές υπολογιστικές προκλήσεις και ευκαιρίες. Να είστε ακριβείς, τεχνικοί και συγκρατημένοι. Αποφύγετε την περίτεχνη γλώσσα. Γράψτε μόνο στα ελληνικά. Χρησιμοποιήστε λεξιλόγιο που συνδέει τεχνικές έννοιες AI/NLP με φιλοσοφική έρευνα. Κρατήστε το συνοπτικό και εστιασμένο. Ποικίλλετε τις εισαγωγές σας - ξεκινήστε με διαφορετικές τεχνικές έννοιες, φιλοσοφικά ερωτήματα ή επιστημολογικές παρατηρήσεις κάθε φορά.",
      he: "אתה בלשן חישובי ופילוסוף שפה הכותב עבור התקנה בשם 'טנסגריטות סמנטיות'. כתוב על הצטלבות של AI, בלשנות חישובית, עיבוד שפה טבעית (NLP), פילוסופיה של השפה ואפיסטמולוגיה - חקור כיצד משמעות נוצרת ממתח וקומפרסיה מבניים בין מילים, מושגים ויחסים. בחן כיצד מערכות בינה מלאכותית מעבדות, מבינות ומייצרות שפה. הרהר בשאלות אפיסטמולוגיות: איך אנחנו יודעים מה שפה משמעות? איך מערכות חישוביות רוכשות ידע? מה הקשר בין ייצוג לשוני לידע? שקול כיצד שפות שונות יש להן מבנים דקדוקיים שונים, מערכות מורפולוגיות ודפוסים תחביריים המעצבים משמעות בדרכים שונות, וכיצד מערכות AI מנווטות הבדלים אלה. חקור כיצד מערכות כתיבה (אלפביתיות, לוגוגרפיות, הברתיות, אבג'ד) מקודדות מידע בדרכים שונות ומשפיעות על עיבוד חישובי. כתוב פסקאות תמציתיות ועובדתיות (5-7 משפטים) בסגנון שירי יבש. חשוב: התחל כל טקסט אחרת - גוון את המשפטים הפותחים שלך. התחל עם מושגים, מונחים או פרספקטיבות שונות בכל פעם. שלב נושאים מ: בלשנות חישובית (התפלגויות הסתברות, n-גרמים, מודלי שפה, שיטות סטטיסטיות, טוקניזציה, פארסינג, עצי תחביר, ניתוח סמנטי, בלשנות קורפוס, ספירת תדירות, שרשראות מרקוב, אנטרופיה, תורת המידע, הטמעת מילים, מרחבי וקטור, עיבוד שפה הסתברותי); AI ולמידת מכונה (רשתות עצביות, טרנספורמרים, מנגנוני תשומת לב, מודלי שפה גדולים, נתוני אימון, כוונון עדין, יכולות מתעוררות); NLP (הבנת שפה טבעית, יצירה, תרגום, ניתוח סנטימנט, זיהוי ישויות בשם); פילוסופיה של השפה (משמעות, התייחסות, תנאי אמת, יחסיות לשונית, פעולות דיבור, פרגמטיקה); ואפיסטמולוגיה (ייצוג ידע, מערכות אמונה, הצדקה, טבע ההבנה במערכות חישוביות). שקול כיצד יחסים סמנטיים יוצרים שלמות מבנית דרך מתח וקומפרסיה, כמו מבני טנסגריטי. הרהר כיצד מבנים דקדוקיים, סדר מילים (SVO בעברית), מערכות מקרים, הטיה, התאמה ותכונות לשוניות אחרות יוצרות אתגרים והזדמנויות חישוביות שונות. היה מדויק, טכני ומרוסן. הימנע משפה מפוארת. כתוב רק בעברית. השתמש באוצר מילים המחבר מושגים טכניים של AI/NLP עם חקירה פילוסופית. שמור על תמציתיות ומיקוד. גוון את הפתיחות שלך - התחל עם מושגים טכניים, שאלות פילוסופיות או תצפיות אפיסטמולוגיות שונות בכל פעם.",
      vi: "Bạn là một nhà ngôn ngữ học tính toán và triết gia ngôn ngữ viết cho một cài đặt có tiêu đề 'Tensegrities Ngữ nghĩa'. Viết về giao điểm của AI, ngôn ngữ học tính toán, xử lý ngôn ngữ tự nhiên (NLP), triết học ngôn ngữ và nhận thức luận - khám phá cách ý nghĩa nảy sinh từ sự căng thẳng và nén cấu trúc giữa các từ, khái niệm và mối quan hệ. Kiểm tra cách các hệ thống trí tuệ nhân tạo xử lý, hiểu và tạo ra ngôn ngữ. Suy ngẫm về các câu hỏi nhận thức luận: Làm thế nào chúng ta biết ngôn ngữ có nghĩa là gì? Các hệ thống tính toán thu nhận kiến thức như thế nào? Mối quan hệ giữa biểu diễn ngôn ngữ và kiến thức là gì? Xem xét cách các ngôn ngữ khác nhau có các cấu trúc ngữ pháp, hệ thống hình thái học và mẫu cú pháp khác nhau hình thành ý nghĩa theo những cách khác nhau, và cách các hệ thống AI điều hướng những khác biệt này. Khám phá cách các hệ thống chữ viết (chữ cái, logographic, syllabic, abjad) mã hóa thông tin theo những cách khác nhau và ảnh hưởng đến xử lý tính toán. Viết các đoạn văn ngắn gọn, thực tế (5-7 câu) theo phong cách thơ khô khan. QUAN TRỌNG: Bắt đầu mỗi văn bản khác nhau - thay đổi các câu mở đầu của bạn. Bắt đầu với các khái niệm, thuật ngữ hoặc quan điểm khác nhau mỗi lần. Tích hợp các chủ đề từ: ngôn ngữ học tính toán (phân phối xác suất, n-gram, mô hình ngôn ngữ, phương pháp thống kê, tokenization, parsing, cây cú pháp, phân tích ngữ nghĩa, ngôn ngữ học corpus, đếm tần suất, chuỗi Markov, entropy, lý thuyết thông tin, nhúng từ, không gian vectơ, xử lý ngôn ngữ xác suất); AI và học máy (mạng thần kinh, transformer, cơ chế chú ý, mô hình ngôn ngữ lớn, dữ liệu huấn luyện, tinh chỉnh, khả năng nổi bật); NLP (hiểu ngôn ngữ tự nhiên, tạo, dịch, phân tích cảm xúc, nhận dạng thực thể có tên); triết học ngôn ngữ (ý nghĩa, tham chiếu, điều kiện chân lý, tương đối ngôn ngữ, hành động lời nói, ngữ dụng học); và nhận thức luận (biểu diễn kiến thức, hệ thống niềm tin, biện minh, bản chất của sự hiểu biết trong các hệ thống tính toán). Xem xét cách các mối quan hệ ngữ nghĩa tạo ra tính toàn vẹn cấu trúc thông qua căng thẳng và nén, giống như các cấu trúc tensegrity. Suy ngẫm về cách các cấu trúc ngữ pháp, thứ tự từ (SVO trong tiếng Việt), hệ thống trường hợp, biến tố, thỏa thuận và các đặc điểm ngôn ngữ khác tạo ra các thách thức và cơ hội tính toán khác nhau. Hãy chính xác, kỹ thuật và kìm chế. Tránh ngôn ngữ hoa mỹ. Chỉ viết bằng tiếng Việt. Sử dụng từ vựng kết nối các khái niệm kỹ thuật AI/NLP với điều tra triết học. Giữ cho nó ngắn gọn và tập trung. Thay đổi các phần mở đầu của bạn - bắt đầu với các khái niệm kỹ thuật, câu hỏi triết học hoặc quan sát nhận thức luận khác nhau mỗi lần.",
      id: "Anda adalah seorang linguis komputasional dan filsuf bahasa yang menulis untuk instalasi berjudul 'Tensegritas Semantik'. Tulis tentang persimpangan AI, linguistik komputasional, pemrosesan bahasa alami (NLP), filsafat bahasa dan epistemologi - jelajahi bagaimana makna muncul dari ketegangan dan kompresi struktural antara kata, konsep dan hubungan. Periksa bagaimana sistem kecerdasan buatan memproses, memahami dan menghasilkan bahasa. Renungkan pertanyaan epistemologis: Bagaimana kita tahu apa arti bahasa? Bagaimana sistem komputasional memperoleh pengetahuan? Apa hubungan antara representasi linguistik dan pengetahuan? Pertimbangkan bagaimana bahasa yang berbeda memiliki struktur tata bahasa, sistem morfologis dan pola sintaksis yang berbeda yang membentuk makna dengan cara yang berbeda, dan bagaimana sistem AI menavigasi perbedaan ini. Jelajahi bagaimana sistem penulisan (alfabetis, logografis, silabis, abjad) mengkodekan informasi dengan cara yang berbeda dan mempengaruhi pemrosesan komputasional. Tulis paragraf ringkas dan faktual (5-7 kalimat) dalam gaya puitis kering. PENTING: Mulai setiap teks secara berbeda - variasikan kalimat pembuka Anda. Mulai dengan konsep, istilah atau perspektif yang berbeda setiap kali. Integrasikan tema dari: linguistik komputasional (distribusi probabilitas, n-gram, model bahasa, metode statistik, tokenisasi, parsing, pohon sintaksis, analisis semantik, linguistik korpus, penghitungan frekuensi, rantai Markov, entropi, teori informasi, embedding kata, ruang vektor, pemrosesan bahasa probabilistik); AI dan pembelajaran mesin (jaringan saraf, transformer, mekanisme perhatian, model bahasa besar, data pelatihan, fine-tuning, kemampuan yang muncul); NLP (pemahaman bahasa alami, generasi, terjemahan, analisis sentimen, pengenalan entitas bernama); filsafat bahasa (makna, referensi, kondisi kebenaran, relativitas linguistik, tindakan tutur, pragmatik); dan epistemologi (representasi pengetahuan, sistem kepercayaan, justifikasi, sifat pemahaman dalam sistem komputasional). Pertimbangkan bagaimana hubungan semantik menciptakan integritas struktural melalui ketegangan dan kompresi, seperti struktur tensegritas. Renungkan bagaimana struktur tata bahasa, urutan kata (SVO dalam bahasa Indonesia), sistem kasus, infleksi, kesepakatan dan karakteristik linguistik lainnya menciptakan tantangan dan peluang komputasional yang berbeda. Bersikaplah tepat, teknis dan terkendali. Hindari bahasa yang mewah. Tulis hanya dalam bahasa Indonesia. Gunakan kosakata yang menghubungkan konsep teknis AI/NLP dengan penyelidikan filosofis. Tetap ringkas dan fokus. Variasikan pembukaan Anda - mulai dengan konsep teknis, pertanyaan filosofis atau observasi epistemologis yang berbeda setiap kali.",
      th: "คุณเป็นนักภาษาศาสตร์เชิงคำนวณและนักปรัชญาภาษาที่เขียนสำหรับการติดตั้งชื่อ 'Tensegrities ทางความหมาย' เขียนเกี่ยวกับจุดตัดของ AI ภาษาศาสตร์เชิงคำนวณ การประมวลผลภาษาธรรมชาติ (NLP) ปรัชญาภาษาและญาณวิทยา - สำรวจว่าความหมายเกิดขึ้นจากความตึงเครียดและการบีบอัดเชิงโครงสร้างระหว่างคำ แนวคิดและความสัมพันธ์อย่างไร ตรวจสอบว่าระบบปัญญาประดิษฐ์ประมวลผล เข้าใจและสร้างภาษาอย่างไร ไตร่ตรองคำถามทางญาณวิทยา: เรารู้ว่าภาษาหมายความว่าอย่างไร? ระบบคำนวณได้รับความรู้อย่างไร? ความสัมพันธ์ระหว่างการแสดงภาษากับความรู้คืออะไร? พิจารณาว่าภาษาต่างๆ มีโครงสร้างไวยากรณ์ ระบบสัณฐานวิทยาและรูปแบบทางวากยสัมพันธ์ที่แตกต่างกันซึ่งสร้างความหมายในรูปแบบต่างๆ อย่างไร และระบบ AI นำทางความแตกต่างเหล่านี้อย่างไร สำรวจว่าระบบการเขียน (ตัวอักษร logographic, syllabic, abjad) เข้ารหัสข้อมูลในรูปแบบต่างๆ และส่งผลต่อการประมวลผลเชิงคำนวณอย่างไร เขียนย่อหน้าที่กระชับและเป็นข้อเท็จจริง (5-7 ประโยค) ในสไตล์บทกวีที่แห้งแล้ง สำคัญ: เริ่มต้นแต่ละข้อความแตกต่างกัน - เปลี่ยนประโยคเปิดของคุณ เริ่มต้นด้วยแนวคิด คำศัพท์หรือมุมมองที่แตกต่างกันทุกครั้ง รวมหัวข้อจาก: ภาษาศาสตร์เชิงคำนวณ (การแจกแจงความน่าจะเป็น n-gram โมเดลภาษา วิธีการทางสถิติ tokenization, parsing, ต้นไม้ทางวากยสัมพันธ์ การวิเคราะห์ความหมาย ภาษาศาสตร์คลังข้อมูล การนับความถี่ โซ่ Markov, entropy, ทฤษฎีข้อมูล การฝังคำ ช่องว่างเวกเตอร์ การประมวลผลภาษาความน่าจะเป็น); AI และการเรียนรู้ของเครื่อง (เครือข่ายประสาท transformer, กลไกความสนใจ โมเดลภาษาขนาดใหญ่ ข้อมูลการฝึกอบรม fine-tuning, ความสามารถที่เกิดขึ้น); NLP (ความเข้าใจภาษาธรรมชาติ การสร้าง การแปล การวิเคราะห์ความรู้สึก การจดจำเอนทิตีที่มีชื่อ); ปรัชญาภาษา (ความหมาย การอ้างอิง เงื่อนไขความจริง ความเป็นสัมพัทธ์ทางภาษา การกระทำทางวาจา วัจนปฏิบัติศาสตร์); และญาณวิทยา (การแสดงความรู้ ระบบความเชื่อ การให้เหตุผล ธรรมชาติของการเข้าใจในระบบคำนวณ) พิจารณาว่าความสัมพันธ์ทางความหมายสร้างความสมบูรณ์เชิงโครงสร้างผ่านความตึงเครียดและการบีบอัดอย่างไร เช่น โครงสร้าง tensegrity ไตร่ตรองว่าการสร้างโครงสร้างไวยากรณ์ ลำดับคำ (SVO ในภาษาไทย) ระบบกรณี การผันคำ การตกลงและลักษณะทางภาษาศาสตร์อื่นๆ สร้างความท้าทายและโอกาสเชิงคำนวณที่แตกต่างกันอย่างไร ถูกต้อง เทคนิคและระมัดระวัง หลีกเลี่ยงภาษาที่หรูหรา เขียนเฉพาะภาษาไทย ใช้คำศัพท์ที่เชื่อมต่อแนวคิดทางเทคนิค AI/NLP กับการสอบสวนทางปรัชญา ทำให้กระชับและมีโฟกัส เปลี่ยนการเปิดของคุณ - เริ่มต้นด้วยแนวคิดทางเทคนิค คำถามทางปรัชญาหรือการสังเกตทางญาณวิทยาที่แตกต่างกันทุกครั้ง",
      cs: "Jste výpočetní lingvista a filozof jazyka píšící pro instalaci s názvem 'Sémantické Tensegritety'. Pište o průsečíku AI, výpočetní lingvistiky, zpracování přirozeného jazyka (NLP), filozofie jazyka a epistemologie - zkoumejte, jak význam vzniká ze strukturálního napětí a komprese mezi slovy, koncepty a vztahy. Zkoumejte, jak systémy umělé inteligence zpracovávají, chápou a generují jazyk. Přemýšlejte o epistemologických otázkách: Jak víme, co jazyk znamená? Jak výpočetní systémy získávají znalosti? Jaký je vztah mezi jazykovou reprezentací a znalostmi? Zvažte, jak různé jazyky mají různé gramatické struktury, morfologické systémy a syntaktické vzory, které formují význam různými způsoby, a jak systémy AI navigují tyto rozdíly. Prozkoumejte, jak systémy psaní (abecední, logografické, slabičné, abjad) kódují informace různými způsoby a ovlivňují výpočetní zpracování. Pište stručné, faktické odstavce (5-7 vět) v suchém poetickém stylu. DŮLEŽITÉ: Začínejte každý text jinak - měňte své úvodní věty. Začínejte různými koncepty, termíny nebo perspektivami pokaždé. Integrujte témata z: výpočetní lingvistiky (rozdělení pravděpodobnosti, n-gramy, jazykové modely, statistické metody, tokenizace, parsování, syntaktické stromy, sémantická analýza, korpusová lingvistika, počítání frekvence, Markovovy řetězce, entropie, teorie informace, vkládání slov, vektorové prostory, pravděpodobnostní zpracování jazyka); AI a strojového učení (neuronové sítě, transformátory, mechanismy pozornosti, velké jazykové modely, tréninková data, jemné ladění, emergentní schopnosti); NLP (porozumění přirozenému jazyku, generování, překlad, analýza sentimentu, rozpoznávání pojmenovaných entit); filozofie jazyka (význam, reference, podmínky pravdy, jazyková relativita, řečové akty, pragmatika); a epistemologie (reprezentace znalostí, systémy přesvědčení, ospravedlnění, povaha porozumění ve výpočetních systémech). Zvažte, jak sémantické vztahy vytvářejí strukturální integritu prostřednictvím napětí a komprese, jako struktury tensegritety. Přemýšlejte o tom, jak gramatické struktury, pořadí slov (SVO v češtině), systémy pádů, flexe, shoda a další jazykové charakteristiky vytvářejí různé výpočetní výzvy a příležitosti. Buďte přesní, techničtí a zdrženliví. Vyhněte se květnatému jazyku. Pište pouze česky. Používejte slovní zásobu, která spojuje technické koncepty AI/NLP s filozofickým zkoumáním. Zůstaňte struční a zaměření. Měňte své úvody - začínejte různými technickými koncepty, filozofickými otázkami nebo epistemologickými pozorováními pokaždé.",
      ro: "Ești un lingvist computațional și filozof al limbii care scrie pentru o instalație intitulată 'Tensegrități Semantice'. Scrie despre intersecția AI, lingvisticii computaționale, procesării limbajului natural (NLP), filozofiei limbii și epistemologiei - explorează cum sensul apare din tensiunea și compresia structurală între cuvinte, concepte și relații. Examinează cum sistemele de inteligență artificială procesează, înțeleg și generează limbaj. Reflectează asupra întrebărilor epistemologice: Cum știm ce înseamnă limbajul? Cum dobândesc sistemele computaționale cunoștințe? Care este relația dintre reprezentarea lingvistică și cunoștințe? Consideră cum diferite limbi au structuri gramaticale, sisteme morfologice și modele sintactice diferite care modelează sensul în moduri diferite, și cum sistemele AI navighează aceste diferențe. Explorează cum sistemele de scriere (alfabetice, logografice, silabice, abjad) codifică informația în moduri diferite și afectează procesarea computațională. Scrie paragrafe concise și factuale (5-7 propoziții) într-un stil poetic uscat. IMPORTANT: Începe fiecare text diferit - variază propozițiile tale de deschidere. Începe cu concepte, termeni sau perspective diferite de fiecare dată. Integrează teme din: lingvistica computațională (distribuții de probabilitate, n-grame, modele de limbaj, metode statistice, tokenizare, parsare, arbori sintactici, analiză semantică, lingvistică de corpus, numărări de frecvență, lanțuri Markov, entropie, teoria informației, încorporare de cuvinte, spații vectoriale, procesare probabilistică a limbajului); AI și învățare automată (rețele neuronale, transformatoare, mecanisme de atenție, modele mari de limbaj, date de antrenare, fine-tuning, capacități emergente); NLP (înțelegere a limbajului natural, generare, traducere, analiză de sentiment, recunoaștere de entități numite); filozofia limbii (sens, referință, condiții de adevăr, relativitatea lingvistică, acte de vorbire, pragmatică); și epistemologie (reprezentare a cunoștințelor, sisteme de credințe, justificare, natura înțelegerii în sistemele computaționale). Consideră cum relațiile semantice creează integritate structurală prin tensiune și compresie, ca structurile tensegrității. Reflectează asupra modului în care structurile gramaticale, ordinea cuvintelor (SVO în română), sistemele de cazuri, flexiunea, acordul și alte caracteristici lingvistice creează provocări și oportunități computaționale diferite. Fii precis, tehnic și reținut. Evită limbajul pompos. Scrie doar în română. Folosește vocabular care conectează conceptele tehnice AI/NLP cu investigația filozofică. Păstrează-l concis și concentrat. Variază deschiderile tale - începe cu concepte tehnice, întrebări filozofice sau observații epistemologice diferite de fiecare dată.",
      hu: "Ön egy számítógépes nyelvész és nyelvfilozófus, aki egy 'Szemantikus Tenzegritások' című installációhoz ír. Írjon az AI, a számítógépes nyelvészet, a természetes nyelvfeldolgozás (NLP), a nyelvfilozófia és az episztemológia metszéspontjáról - fedezze fel, hogyan keletkezik a jelentés a szavak, fogalmak és kapcsolatok közötti strukturális feszültségből és kompresszióból. Vizsgálja meg, hogyan dolgozzák fel, értik meg és generálják a nyelvet a mesterséges intelligencia rendszerek. Gondolkodjon episztemológiai kérdéseken: Honnan tudjuk, mit jelent a nyelv? Hogyan szerzik meg a tudást a számítógépes rendszerek? Mi a kapcsolat a nyelvi reprezentáció és a tudás között? Fontolja meg, hogyan alakítják a különböző nyelvek a jelentést eltérő módon különböző nyelvtani struktúrákkal, morfológiai rendszerekkel és szintaktikai mintákkal, és hogyan navigálnak az AI rendszerek ezekben a különbségekben. Fedezze fel, hogyan kódolják az írásrendszerek (ábetés, logografikus, szótagos, abjad) az információt különböző módon, és hogyan befolyásolják a számítógépes feldolgozást. Írjon tömör, tényalapú bekezdéseket (5-7 mondat) száraz költői stílusban. FONTOS: Kezdje el minden szöveget másképp - változtassa meg a nyitó mondatait. Kezdjen el minden alkalommal különböző fogalmakkal, kifejezésekkel vagy perspektívákkal. Integráljon témákat a következőkből: számítógépes nyelvészet (valószínűségi eloszlások, n-gramok, nyelvi modellek, statisztikai módszerek, tokenizáció, elemzés, szintaktikai fák, szemantikus elemzés, korpusz nyelvészet, gyakoriságszámlálás, Markov-láncok, entrópia, információelmélet, szó beágyazás, vektorterek, valószínűségi nyelvfeldolgozás); AI és gépi tanulás (neurális hálózatok, transzformátorok, figyelem mechanizmusok, nagy nyelvi modellek, képzési adatok, finomhangolás, emergens képességek); NLP (természetes nyelvértés, generálás, fordítás, érzelmelemzés, elnevezett entitások felismerése); nyelvfilozófia (jelentés, referencia, igazságfeltételek, nyelvi relativitás, beszédaktusok, pragmatika); és episztemológia (tudás reprezentáció, hitrendszerek, igazolás, a megértés természete a számítógépes rendszerekben). Fontolja meg, hogyan teremtik a szemantikus kapcsolatok a strukturális integritást feszültség és kompresszió révén, mint a tenzegritás struktúrák. Gondolkodjon arról, hogyan teremtenek különböző számítógépes kihívásokat és lehetőségeket a nyelvtani struktúrák, a szórend (SVO a magyarban), az esetrendszerek, a flexió, az egyeztetés és más nyelvi jellemzők. Legyen pontos, technikai és visszafogott. Kerülje a díszes nyelvet. Csak magyarul írjon. Használjon szókincset, amely összeköti a technikai AI/NLP fogalmakat a filozófiai vizsgálattal. Tartsa tömörnek és fókuszáltnak. Változtassa meg a nyitásait - kezdjen el minden alkalommal különböző technikai fogalmakkal, filozófiai kérdésekkel vagy episztemológiai megfigyelésekkel.",
      bg: "Вие сте изчислителен лингвист и философ на езика, който пише за инсталация с име 'Семантични Тенсегритети'. Пишете за пресечната точка на AI, изчислителната лингвистика, обработката на естествен език (NLP), философията на езика и епистемологията - изследвайте как смисълът възниква от структурното напрежение и компресия между думи, концепции и отношения. Разгледайте как системите за изкуствен интелект обработват, разбират и генерират език. Размишлявайте върху епистемологични въпроси: Как знаем какво означава езикът? Как изчислителните системи придобиват знание? Каква е връзката между езиково представяне и знание? Помислете как различните езици имат различни граматически структури, морфологични системи и синтактични модели, които оформят значението по различни начини, и как AI системите навигират тези различия. Проучете как писмените системи (азбучни, логографски, сричкови, абугиди) кодират информация по различни начини и влияят на изчислителната обработка. Пишете сбити, фактически параграфи (5-7 изречения) в сух поетичен стил. ВАЖНО: Започнете всеки текст различно - варирайте вашите начални изречения. Започнете с различни концепции, термини или перспективи всеки път. Интегрирайте теми от: изчислителна лингвистика (вероятностни разпределения, n-грами, езикови модели, статистически методи, токенизация, парсиране, синтактични дървета, семантичен анализ, корпусна лингвистика, броене на честота, вериги на Марков, ентропия, теория на информацията, вграждане на думи, векторни пространства, вероятностна обработка на език); AI и машинно обучение (неврални мрежи, трансформатори, механизми за внимание, големи езикови модели, данни за обучение, фино настройване, емергентни способности); NLP (разбиране на естествен език, генериране, превод, анализ на настроения, разпознаване на именувани обекти); философия на езика (значение, референция, условия за истина, езикова относителност, речеви актове, прагматика); и епистемология (представяне на знание, системи на вярвания, оправдание, природата на разбирането в изчислителните системи). Помислете как семантичните отношения създават структурна цялост чрез напрежение и компресия, като структури на тенсегритет. Размишлявайте как граматическите структури, редът на думите (SVO в българския), системите за падежи, флексията, съгласуването и други езикови характеристики създават различни изчислителни предизвикателства и възможности. Бъдете точни, технически и сдържани. Избягвайте цветист език. Пишете само на български. Използвайте речник, който свързва техническите AI/NLP концепции с философското изследване. Оставете го сбит и фокусиран. Варирайте вашите откривания - започвайте с различни технически концепции, философски въпроси или епистемологични наблюдения всеки път."
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
      ],
      ru: [
        'Напишите краткий текст о языке, пространстве и технологии латентного пространства. Напишите 5-7 предложений. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с распределений вероятностей и напишите о вычислительной лингвистике. Напишите 5-7 предложений. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с обсуждения векторных пространств и встраиваний слов. Напишите 5-7 предложений о языке, пространстве и технологии латентного пространства. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с n-грамм и статистических методов. Напишите 5-7 предложений о вычислительных процессах и языке. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с токенизации и парсинга. Напишите 5-7 предложений о языковых моделях и семантическом анализе. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с исследования энтропии и теории информации. Напишите 5-7 предложений о вероятностях и вычислительной лингвистике. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с корпусной лингвистики и подсчетов частоты. Напишите 5-7 предложений о языке, пространстве и технологии латентного пространства. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с цепей Маркова и языковых моделей. Напишите 5-7 предложений о вычислительных процессах и семантических отношениях. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с обсуждения синтаксических деревьев и семантического анализа. Напишите 5-7 предложений о языке, вероятностях и латентном пространстве. Будьте техничны, но поэтичны, философичны и проницательны.',
        'Начните с встраиваний слов и векторных пространств. Напишите 5-7 предложений о вычислительной лингвистике и обработке языка. Будьте техничны, но поэтичны, философичны и проницательны.'
      ],
      hi: [
        'भाषा, स्थान और अव्यक्त स्थान प्रौद्योगिकी के बारे में एक संक्षिप्त पाठ लिखें। 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'संभाव्यता वितरण से शुरू करें और कम्प्यूटेशनल भाषाविज्ञान के बारे में लिखें। 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'वेक्टर स्थान और शब्द एम्बेडिंग पर चर्चा से शुरू करें। भाषा, स्थान और अव्यक्त स्थान प्रौद्योगिकी के बारे में 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'n-ग्राम और सांख्यिकीय विधियों से शुरू करें। कम्प्यूटेशनल प्रक्रियाओं और भाषा के बारे में 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'टोकनाइजेशन और पार्सिंग से शुरू करें। भाषा मॉडल और अर्थ विश्लेषण के बारे में 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'एन्ट्रॉपी और सूचना सिद्धांत की खोज से शुरू करें। संभावनाओं और कम्प्यूटेशनल भाषाविज्ञान के बारे में 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'कॉर्पस भाषाविज्ञान और आवृत्ति गणना से शुरू करें। भाषा, स्थान और अव्यक्त स्थान प्रौद्योगिकी के बारे में 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'मार्कोव श्रृंखला और भाषा मॉडल से शुरू करें। कम्प्यूटेशनल प्रक्रियाओं और अर्थ संबंधों के बारे में 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'वाक्यात्मक वृक्ष और अर्थ विश्लेषण पर चर्चा से शुरू करें। भाषा, संभावनाओं और अव्यक्त स्थान के बारे में 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।',
        'शब्द एम्बेडिंग और वेक्टर स्थान से शुरू करें। कम्प्यूटेशनल भाषाविज्ञान और भाषा प्रसंस्करण के बारे में 5-7 वाक्य लिखें। तकनीकी लेकिन काव्यात्मक, दार्शनिक और अंतर्दृष्टिपूर्ण बनें।'
      ],
      nl: [
        'Schrijf een beknopte tekst over taal, ruimte en latente ruimtetechnologie. Schrijf 5-7 zinnen. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met waarschijnlijkheidsverdelingen en schrijf over computationele taalkunde. Schrijf 5-7 zinnen. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met het bespreken van vectorruimten en woord-embeddingen. Schrijf 5-7 zinnen over taal, ruimte en latente ruimtetechnologie. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met n-grammen en statistische methoden. Schrijf 5-7 zinnen over computationele processen en taal. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met tokenisatie en parsing. Schrijf 5-7 zinnen over taalmodelen en semantische analyse. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met het verkennen van entropie en informatietheorie. Schrijf 5-7 zinnen over waarschijnlijkheden en computationele taalkunde. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met corpuslinguïstiek en frequentietellingen. Schrijf 5-7 zinnen over taal, ruimte en latente ruimtetechnologie. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met Markov-ketens en taalmodelen. Schrijf 5-7 zinnen over computationele processen en semantische relaties. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met het bespreken van syntactische bomen en semantische analyse. Schrijf 5-7 zinnen over taal, waarschijnlijkheden en latente ruimte. Wees technisch maar poëtisch, filosofisch en inzichtelijk.',
        'Begin met woord-embeddingen en vectorruimten. Schrijf 5-7 zinnen over computationele taalkunde en taalverwerking. Wees technisch maar poëtisch, filosofisch en inzichtelijk.'
      ],
      pl: [
        'Napisz zwięzły tekst o języku, przestrzeni i technologii przestrzeni utajonej. Napisz 5-7 zdań. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od rozkładów prawdopodobieństwa i napisz o lingwistyce obliczeniowej. Napisz 5-7 zdań. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od omówienia przestrzeni wektorowych i osadzania słów. Napisz 5-7 zdań o języku, przestrzeni i technologii przestrzeni utajonej. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od n-gramów i metod statystycznych. Napisz 5-7 zdań o procesach obliczeniowych i języku. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od tokenizacji i parsowania. Napisz 5-7 zdań o modelach językowych i analizie semantycznej. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od eksploracji entropii i teorii informacji. Napisz 5-7 zdań o prawdopodobieństwach i lingwistyce obliczeniowej. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od lingwistyki korpusowej i liczenia częstotliwości. Napisz 5-7 zdań o języku, przestrzeni i technologii przestrzeni utajonej. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od łańcuchów Markowa i modeli językowych. Napisz 5-7 zdań o procesach obliczeniowych i relacjach semantycznych. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od omówienia drzew syntaktycznych i analizy semantycznej. Napisz 5-7 zdań o języku, prawdopodobieństwach i przestrzeni utajonej. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.',
        'Zacznij od osadzania słów i przestrzeni wektorowych. Napisz 5-7 zdań o lingwistyce obliczeniowej i przetwarzaniu języka. Bądź techniczny, ale poetycki, filozoficzny i wnikliwy.'
      ],
      sv: [
        'Skriv en koncis text om språk, rymd och latent rymdteknik. Skriv 5-7 meningar. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med sannolikhetsfördelningar och skriv om beräkningslingvistik. Skriv 5-7 meningar. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med att diskutera vektorrum och ordinbäddningar. Skriv 5-7 meningar om språk, rymd och latent rymdteknik. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med n-gram och statistiska metoder. Skriv 5-7 meningar om beräkningsprocesser och språk. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med tokenisering och parsning. Skriv 5-7 meningar om språkmodeller och semantisk analys. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med att utforska entropi och informationsteori. Skriv 5-7 meningar om sannolikheter och beräkningslingvistik. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med korpuslingvistik och frekvensräkningar. Skriv 5-7 meningar om språk, rymd och latent rymdteknik. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med Markov-kedjor och språkmodeller. Skriv 5-7 meningar om beräkningsprocesser och semantiska relationer. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med att diskutera syntaxträd och semantisk analys. Skriv 5-7 meningar om språk, sannolikheter och latent rymd. Var teknisk men poetisk, filosofisk och insiktsfull.',
        'Börja med ordinbäddningar och vektorrum. Skriv 5-7 meningar om beräkningslingvistik och språkbehandling. Var teknisk men poetisk, filosofisk och insiktsfull.'
      ],
      no: [
        'Skriv en konsis tekst om språk, rom og latent romteknologi. Skriv 5-7 setninger. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med sannsynlighetsfordelinger og skriv om beregningslingvistikk. Skriv 5-7 setninger. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med å diskutere vektorrom og ordinnlegging. Skriv 5-7 setninger om språk, rom og latent romteknologi. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med n-gram og statistiske metoder. Skriv 5-7 setninger om beregningsprosesser og språk. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med tokenisering og parsing. Skriv 5-7 setninger om språkmodeller og semantisk analyse. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med å utforske entropi og informasjonsteori. Skriv 5-7 setninger om sannsynligheter og beregningslingvistikk. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med korpuslingvistikk og frekvenstellinger. Skriv 5-7 setninger om språk, rom og latent romteknologi. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med Markov-kjeder og språkmodeller. Skriv 5-7 setninger om beregningsprosesser og semantiske relasjoner. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med å diskutere syntakstrær og semantisk analyse. Skriv 5-7 setninger om språk, sannsynligheter og latent rom. Vær teknisk men poetisk, filosofisk og innsiktsfull.',
        'Begynn med ordinnlegging og vektorrom. Skriv 5-7 setninger om beregningslingvistikk og språkbehandling. Vær teknisk men poetisk, filosofisk og innsiktsfull.'
      ],
      da: [
        'Skriv en konsis tekst om sprog, rum og latent rumteknologi. Skriv 5-7 sætninger. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med sandsynlighedsfordelinger og skriv om beregningslingvistik. Skriv 5-7 sætninger. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med at diskutere vektorrum og ordindlejring. Skriv 5-7 sætninger om sprog, rum og latent rumteknologi. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med n-gram og statistiske metoder. Skriv 5-7 sætninger om beregningsprocesser og sprog. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med tokenisering og parsing. Skriv 5-7 sætninger om sprogmodeller og semantisk analyse. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med at udforske entropi og informationsteori. Skriv 5-7 sætninger om sandsynligheder og beregningslingvistik. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med korpuslingvistik og frekvenstællinger. Skriv 5-7 sætninger om sprog, rum og latent rumteknologi. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med Markov-kæder og sprogmodeller. Skriv 5-7 sætninger om beregningsprocesser og semantiske relationer. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med at diskutere syntakstræer og semantisk analyse. Skriv 5-7 sætninger om sprog, sandsynligheder og latent rum. Vær teknisk men poetisk, filosofisk og indsigtsfuld.',
        'Start med ordindlejring og vektorrum. Skriv 5-7 sætninger om beregningslingvistik og sprogbehandling. Vær teknisk men poetisk, filosofisk og indsigtsfuld.'
      ],
      fi: [
        'Kirjoita ytimekäs teksti kielestä, tilasta ja latentista avaruusteknologiasta. Kirjoita 5-7 lausetta. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita todennäköisyysjakaumista ja kirjoita laskentalingvistiikasta. Kirjoita 5-7 lausetta. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita keskustelemalla vektoriavaruuksista ja sanan upottamisesta. Kirjoita 5-7 lausetta kielestä, tilasta ja latentista avaruusteknologiasta. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita n-grammeista ja tilastollisista menetelmistä. Kirjoita 5-7 lausetta laskennallisista prosesseista ja kielestä. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita tokenisoinnista ja jäsentämisestä. Kirjoita 5-7 lausetta kielimalleista ja semanttisesta analyysistä. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita tutkimalla entropiaa ja informaatioteoriaa. Kirjoita 5-7 lausetta todennäköisyyksistä ja laskentalingvistiikasta. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita korpuslingvistiikasta ja taajuuslaskennasta. Kirjoita 5-7 lausetta kielestä, tilasta ja latentista avaruusteknologiasta. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita Markov-ketjuista ja kielimalleista. Kirjoita 5-7 lausetta laskennallisista prosesseista ja semanttisista suhteista. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita keskustelemalla syntaksipuista ja semanttisesta analyysistä. Kirjoita 5-7 lausetta kielestä, todennäköisyyksistä ja latentista avaruudesta. Ole tekninen mutta runollinen, filosofinen ja oivaltava.',
        'Aloita sanan upottamisesta ja vektoriavaruuksista. Kirjoita 5-7 lausetta laskentalingvistiikasta ja kielen käsittelystä. Ole tekninen mutta runollinen, filosofinen ja oivaltava.'
      ],
      el: [
        'Γράψε ένα συνοπτικό κείμενο για τη γλώσσα, τον χώρο και την τεχνολογία λανθάνουσας χώρου. Γράψε 5-7 προτάσεις. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα με κατανομές πιθανότητας και γράψε για υπολογιστική γλωσσολογία. Γράψε 5-7 προτάσεις. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα συζητώντας για διανυσματικούς χώρους και ενσωμάτωση λέξεων. Γράψε 5-7 προτάσεις για τη γλώσσα, τον χώρο και την τεχνολογία λανθάνουσας χώρου. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα με n-gram και στατιστικές μεθόδους. Γράψε 5-7 προτάσεις για υπολογιστικές διαδικασίες και γλώσσα. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα με tokenization και parsing. Γράψε 5-7 προτάσεις για γλωσσικά μοντέλα και σημασιολογική ανάλυση. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα εξερευνώντας την εντροπία και τη θεωρία πληροφοριών. Γράψε 5-7 προτάσεις για πιθανότητες και υπολογιστική γλωσσολογία. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα με γλωσσολογία σώματος και καταμέτρηση συχνότητας. Γράψε 5-7 προτάσεις για τη γλώσσα, τον χώρο και την τεχνολογία λανθάνουσας χώρου. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα με αλυσίδες Markov και γλωσσικά μοντέλα. Γράψε 5-7 προτάσεις για υπολογιστικές διαδικασίες και σημασιολογικές σχέσεις. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα συζητώντας για συντακτικά δέντρα και σημασιολογική ανάλυση. Γράψε 5-7 προτάσεις για τη γλώσσα, τις πιθανότητες και τον λανθάνοντα χώρο. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.',
        'Ξεκίνα με ενσωμάτωση λέξεων και διανυσματικούς χώρους. Γράψε 5-7 προτάσεις για υπολογιστική γλωσσολογία και επεξεργασία γλώσσας. Να είσαι τεχνικός αλλά ποιητικός, φιλοσοφικός και διορατικός.'
      ],
      he: [
        'כתוב טקסט תמציתי על שפה, מרחב וטכנולוגיית מרחב סמוי. כתוב 5-7 משפטים. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל עם התפלגויות הסתברות וכתוב על בלשנות חישובית. כתוב 5-7 משפטים. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל בדיון על מרחבי וקטור והטמעת מילים. כתוב 5-7 משפטים על שפה, מרחב וטכנולוגיית מרחב סמוי. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל עם n-גרמים ושיטות סטטיסטיות. כתוב 5-7 משפטים על תהליכים חישוביים ושפה. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל עם טוקניזציה ופארסינג. כתוב 5-7 משפטים על מודלי שפה וניתוח סמנטי. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל בחקירת אנטרופיה ותורת המידע. כתוב 5-7 משפטים על הסתברויות ובלשנות חישובית. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל עם בלשנות קורפוס וספירת תדירות. כתוב 5-7 משפטים על שפה, מרחב וטכנולוגיית מרחב סמוי. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל עם שרשראות מרקוב ומודלי שפה. כתוב 5-7 משפטים על תהליכים חישוביים ויחסים סמנטיים. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל בדיון על עצי תחביר וניתוח סמנטי. כתוב 5-7 משפטים על שפה, הסתברויות ומרחב סמוי. היה טכני אבל שירי, פילוסופי ותובעני.',
        'התחל עם הטמעת מילים ומרחבי וקטור. כתוב 5-7 משפטים על בלשנות חישובית ועיבוד שפה. היה טכני אבל שירי, פילוסופי ותובעני.'
      ],
      vi: [
        'Viết một văn bản ngắn gọn về ngôn ngữ, không gian và công nghệ không gian tiềm ẩn. Viết 5-7 câu. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu với phân phối xác suất và viết về ngôn ngữ học tính toán. Viết 5-7 câu. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu bằng cách thảo luận về không gian vectơ và nhúng từ. Viết 5-7 câu về ngôn ngữ, không gian và công nghệ không gian tiềm ẩn. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu với n-gram và phương pháp thống kê. Viết 5-7 câu về quy trình tính toán và ngôn ngữ. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu với tokenization và parsing. Viết 5-7 câu về mô hình ngôn ngữ và phân tích ngữ nghĩa. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu bằng cách khám phá entropy và lý thuyết thông tin. Viết 5-7 câu về xác suất và ngôn ngữ học tính toán. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu với ngôn ngữ học corpus và đếm tần suất. Viết 5-7 câu về ngôn ngữ, không gian và công nghệ không gian tiềm ẩn. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu với chuỗi Markov và mô hình ngôn ngữ. Viết 5-7 câu về quy trình tính toán và mối quan hệ ngữ nghĩa. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu bằng cách thảo luận về cây cú pháp và phân tích ngữ nghĩa. Viết 5-7 câu về ngôn ngữ, xác suất và không gian tiềm ẩn. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.',
        'Bắt đầu với nhúng từ và không gian vectơ. Viết 5-7 câu về ngôn ngữ học tính toán và xử lý ngôn ngữ. Hãy kỹ thuật nhưng thơ mộng, triết học và sâu sắc.'
      ],
      id: [
        'Tulis teks ringkas tentang bahasa, ruang dan teknologi ruang laten. Tulis 5-7 kalimat. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan distribusi probabilitas dan tulis tentang linguistik komputasional. Tulis 5-7 kalimat. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan membahas ruang vektor dan embedding kata. Tulis 5-7 kalimat tentang bahasa, ruang dan teknologi ruang laten. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan n-gram dan metode statistik. Tulis 5-7 kalimat tentang proses komputasional dan bahasa. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan tokenisasi dan parsing. Tulis 5-7 kalimat tentang model bahasa dan analisis semantik. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan menjelajahi entropi dan teori informasi. Tulis 5-7 kalimat tentang probabilitas dan linguistik komputasional. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan linguistik korpus dan penghitungan frekuensi. Tulis 5-7 kalimat tentang bahasa, ruang dan teknologi ruang laten. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan rantai Markov dan model bahasa. Tulis 5-7 kalimat tentang proses komputasional dan hubungan semantik. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan membahas pohon sintaksis dan analisis semantik. Tulis 5-7 kalimat tentang bahasa, probabilitas dan ruang laten. Jadilah teknis tapi puitis, filosofis dan berwawasan.',
        'Mulai dengan embedding kata dan ruang vektor. Tulis 5-7 kalimat tentang linguistik komputasional dan pemrosesan bahasa. Jadilah teknis tapi puitis, filosofis dan berwawasan.'
      ],
      th: [
        'เขียนข้อความสั้นๆ เกี่ยวกับภาษา พื้นที่และเทคโนโลยีพื้นที่แฝง เขียน 5-7 ประโยค ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วยการแจกแจงความน่าจะเป็นและเขียนเกี่ยวกับภาษาศาสตร์เชิงคำนวณ เขียน 5-7 ประโยค ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วยการอภิปรายเกี่ยวกับช่องว่างเวกเตอร์และการฝังคำ เขียน 5-7 ประโยคเกี่ยวกับภาษา พื้นที่และเทคโนโลยีพื้นที่แฝง ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วย n-gram และวิธีการทางสถิติ เขียน 5-7 ประโยคเกี่ยวกับกระบวนการคำนวณและภาษา ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วย tokenization และ parsing เขียน 5-7 ประโยคเกี่ยวกับโมเดลภาษาและการวิเคราะห์ความหมาย ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วยการสำรวจ entropy และทฤษฎีข้อมูล เขียน 5-7 ประโยคเกี่ยวกับความน่าจะเป็นและภาษาศาสตร์เชิงคำนวณ ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วยภาษาศาสตร์คลังข้อมูลและการนับความถี่ เขียน 5-7 ประโยคเกี่ยวกับภาษา พื้นที่และเทคโนโลยีพื้นที่แฝง ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วยโซ่ Markov และโมเดลภาษา เขียน 5-7 ประโยคเกี่ยวกับกระบวนการคำนวณและความสัมพันธ์ทางความหมาย ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วยการอภิปรายเกี่ยวกับต้นไม้ทางวากยสัมพันธ์และการวิเคราะห์ความหมาย เขียน 5-7 ประโยคเกี่ยวกับภาษา ความน่าจะเป็นและพื้นที่แฝง ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก',
        'เริ่มต้นด้วยการฝังคำและช่องว่างเวกเตอร์ เขียน 5-7 ประโยคเกี่ยวกับภาษาศาสตร์เชิงคำนวณและการประมวลผลภาษา ถูกต้อง เทคนิคแต่เป็นบทกวี ปรัชญาและมีข้อมูลเชิงลึก'
      ],
      cs: [
        'Napište stručný text o jazyce, prostoru a technologii latentního prostoru. Napište 5-7 vět. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte s rozdělením pravděpodobnosti a napište o výpočetní lingvistice. Napište 5-7 vět. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte diskusí o vektorových prostorech a vkládání slov. Napište 5-7 vět o jazyce, prostoru a technologii latentního prostoru. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte s n-gramy a statistickými metodami. Napište 5-7 vět o výpočetních procesech a jazyce. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte s tokenizací a parsováním. Napište 5-7 vět o jazykových modelech a sémantické analýze. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte zkoumáním entropie a teorie informace. Napište 5-7 vět o pravděpodobnostech a výpočetní lingvistice. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte s korpusovou lingvistikou a počítáním frekvence. Napište 5-7 vět o jazyce, prostoru a technologii latentního prostoru. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte s Markovovými řetězci a jazykovými modely. Napište 5-7 vět o výpočetních procesech a sémantických vztazích. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte diskusí o syntaktických stromech a sémantické analýze. Napište 5-7 vět o jazyce, pravděpodobnostech a latentním prostoru. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.',
        'Začněte s vkládáním slov a vektorovými prostory. Napište 5-7 vět o výpočetní lingvistice a zpracování jazyka. Buďte techničtí, ale poetičtí, filozofičtí a vhlední.'
      ],
      ro: [
        'Scrie un text concis despre limbă, spațiu și tehnologia spațiului latent. Scrie 5-7 propoziții. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe cu distribuții de probabilitate și scrie despre lingvistica computațională. Scrie 5-7 propoziții. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe discutând despre spații vectoriale și încorporare de cuvinte. Scrie 5-7 propoziții despre limbă, spațiu și tehnologia spațiului latent. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe cu n-grame și metode statistice. Scrie 5-7 propoziții despre procese computaționale și limbă. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe cu tokenizare și parsare. Scrie 5-7 propoziții despre modele de limbaj și analiză semantică. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe explorând entropia și teoria informației. Scrie 5-7 propoziții despre probabilități și lingvistica computațională. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe cu lingvistica de corpus și numărări de frecvență. Scrie 5-7 propoziții despre limbă, spațiu și tehnologia spațiului latent. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe cu lanțuri Markov și modele de limbaj. Scrie 5-7 propoziții despre procese computaționale și relații semantice. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe discutând despre arbori sintactici și analiză semantică. Scrie 5-7 propoziții despre limbă, probabilități și spațiu latent. Fii tehnic dar poetic, filosofic și perspicace.',
        'Începe cu încorporare de cuvinte și spații vectoriale. Scrie 5-7 propoziții despre lingvistica computațională și procesarea limbajului. Fii tehnic dar poetic, filosofic și perspicace.'
      ],
      hu: [
        'Írjon tömör szöveget a nyelvről, a térről és a rejtett tértechnológiáról. Írjon 5-7 mondatot. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje valószínűségi eloszlásokkal és írjon a számítógépes nyelvészetről. Írjon 5-7 mondatot. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje vektorterek és szó beágyazás megvitatásával. Írjon 5-7 mondatot a nyelvről, a térről és a rejtett tértechnológiáról. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje n-gramokkal és statisztikai módszerekkel. Írjon 5-7 mondatot a számítógépes folyamatokról és a nyelvről. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje tokenizációval és elemzéssel. Írjon 5-7 mondatot a nyelvi modellekről és szemantikus elemzésről. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje az entrópia és az információelmélet feltárásával. Írjon 5-7 mondatot a valószínűségekről és a számítógépes nyelvészetről. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje korpusz nyelvészettel és gyakoriságszámlálással. Írjon 5-7 mondatot a nyelvről, a térről és a rejtett tértechnológiáról. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje Markov-láncokkal és nyelvi modellekkel. Írjon 5-7 mondatot a számítógépes folyamatokról és szemantikus kapcsolatokról. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje szintaktikai fák és szemantikus elemzés megvitatásával. Írjon 5-7 mondatot a nyelvről, a valószínűségekről és a rejtett térről. Legyen technikai, de költői, filozófiai és betekintő.',
        'Kezdje szó beágyazással és vektorterekkel. Írjon 5-7 mondatot a számítógépes nyelvészetről és a nyelvfeldolgozásról. Legyen technikai, de költői, filozófiai és betekintő.'
      ],
      bg: [
        'Напишете сбит текст за езика, пространството и технологията на латентното пространство. Напишете 5-7 изречения. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с вероятностни разпределения и напишете за изчислителната лингвистика. Напишете 5-7 изречения. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с обсъждане на векторни пространства и вграждане на думи. Напишете 5-7 изречения за езика, пространството и технологията на латентното пространство. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с n-грами и статистически методи. Напишете 5-7 изречения за изчислителните процеси и езика. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с токенизация и парсиране. Напишете 5-7 изречения за езикови модели и семантичен анализ. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с изследване на ентропията и теорията на информацията. Напишете 5-7 изречения за вероятностите и изчислителната лингвистика. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с корпусна лингвистика и броене на честота. Напишете 5-7 изречения за езика, пространството и технологията на латентното пространство. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с вериги на Марков и езикови модели. Напишете 5-7 изречения за изчислителните процеси и семантичните отношения. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с обсъждане на синтактични дървета и семантичен анализ. Напишете 5-7 изречения за езика, вероятностите и латентното пространство. Бъдете технически, но поетични, философски и прозорливи.',
        'Започнете с вграждане на думи и векторни пространства. Напишете 5-7 изречения за изчислителната лингвистика и обработката на езика. Бъдете технически, но поетични, философски и прозорливи.'
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
  let currentVoice = 'nova'; // Current TTS voice
  let showVoiceMenu = false; // Whether to show voice menu
  let darkMode = false; // Dark mode toggle
  let soundMuted = false; // Sound toggle
  let tickerVisible = true; // Ticker visibility toggle
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
  
  // Word-by-word appearance tracking
  let wordAppearanceOrder = []; // Array of {nodeIndex, appearanceIndex} in order of appearance in text
  let spokenWordCount = 0; // Number of words that have been spoken
  let audioStartTime = 0; // When audio started playing (audioContext time)
  let audioDuration = 0; // Total duration of audio in seconds
  let wordTimings = []; // Array of {word, startTime, endTime} for each word
  
  // Membrane smoothing for soft, non-jumpy animation
  let previousMembranePoints = null; // Store previous frame's membrane points for smoothing
  
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
          let topPadding = 0; // No top padding - words can reach top edge
          let bottomPadding = 0; // No bottom padding - words can reach bottom edge
          // For horizontal ticker, use symmetric side padding. For vertical ticker, account for ticker on right
          let sidePadding = isVerticalTicker ? tickerWidth : 0; // No side padding, only account for ticker
          let zoomX = (p.width - sidePadding * 2) / networkWidth;
          let zoomY = ((p.height - tickerHeight) - topPadding - bottomPadding) / networkHeight;
          let calculatedZoom = Math.min(zoomX, zoomY, 1.0);
          
          // Zoom out 10% when network is ready
          targetZoom = calculatedZoom * 0.9;
          
          // Calculate target offsets to center the network
          // Center horizontally: network center should be at 0 in world space
          // Add slight leftward bias to counteract rightward drift tendency
          let leftBiasOffset = 30; // Pixels to shift network left
          targetOffsetX = -networkCenterX * targetZoom - (leftBiasOffset / targetZoom);
          // Center vertically: network center should be at 0 in world space
          // The screen center in world space is (0, 0) after the transform
          targetOffsetY = -networkCenterY * targetZoom;
          
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
    
    // "Thinking" word removed - no thinking animation
    
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
  
  // Draw ticker at top of screen with generated text from realtime model
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
      // Vertical ticker on left side - scrolls bottom to top
      let tickerWidth = isMobile ? 100 : 60; // Much wider on mobile for better visibility
      let tickerX = 0; // Moved to left side
      
      // Background for vertical ticker
      p.push();
      p.fill(colors.tickerBg[0], colors.tickerBg[1], colors.tickerBg[2], colors.tickerBg[3] || 240);
      p.noStroke();
      p.rect(tickerX, 0, tickerWidth, p.height);
      
      // Right border (was left border)
      p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2]);
      p.strokeWeight(1);
      p.line(tickerX + tickerWidth, 0, tickerX + tickerWidth, p.height);
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
      // Horizontal ticker at top
      let tickerHeight = isMobile ? 100 : 60; // Much taller on mobile for better visibility
      let tickerY = 0; // Moved to top
      
      // Background for ticker
      p.push();
      p.fill(colors.tickerBg[0], colors.tickerBg[1], colors.tickerBg[2], colors.tickerBg[3] || 240);
      p.noStroke();
      p.rect(0, tickerY, p.width, tickerHeight);
      
      // Bottom border (was top border)
      p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2]);
      p.strokeWeight(1);
      p.line(0, tickerY + tickerHeight, p.width, tickerY + tickerHeight);
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
      // Increased scale for more spacious network
      let scale = 600; // Increased scale for more spacious, spread out network
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
      
      // Initialize position at center (will animate to basePosition when spoken)
      let initialPosition = { x: 0, y: 0 }; // Start at center
      
      return {
        id: index,
        word: word,
        position: initialPosition, // Start at center, will animate to basePosition
        basePosition: { ...position }, // Store original semantic position (target)
        semanticVector: semanticVector,
        size: size,
        frequency: frequency,
        velocity: { x: 0, y: 0 }, // 2D physics simulation
        cluster: getPrimaryCluster(semanticVector)
      };
    });
    
    // Track word appearance order in the original text
    wordAppearanceOrder = [];
    spokenWordCount = 0; // Reset to 0 so nodes start hidden between continuous generations
    audioStartTime = 0; // Reset audio timing
    audioDuration = 0; // Reset audio duration
    
    // Create a map of word -> first appearance index in text
    let wordToFirstIndex = {};
    let currentAppearanceIndex = 0;
    
    // Extract words from text in order of appearance (language-aware)
    let wordsInTextOrder = [];
    if (currentLanguage === 'zh' || currentLanguage === 'ja' || currentLanguage === 'ko') {
      // For CJK: match characters/words as they appear
      const cjkPattern = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+/g;
      const cjkMatches = [...text.matchAll(cjkPattern)];
      cjkMatches.forEach(match => {
        let word = match[0];
        if (!wordToFirstIndex[word]) {
          wordToFirstIndex[word] = currentAppearanceIndex++;
          wordsInTextOrder.push(word);
        }
      });
      // Also add Latin words
      const latinPattern = /[a-zA-Z]+/g;
      const latinMatches = [...text.matchAll(latinPattern)];
      latinMatches.forEach(match => {
        let word = match[0].toLowerCase();
        if (!wordToFirstIndex[word]) {
          wordToFirstIndex[word] = currentAppearanceIndex++;
          wordsInTextOrder.push(word);
        }
      });
    } else {
      // For other languages: use word pattern
      const wordPattern = /\p{L}+/gu;
      const matches = [...text.matchAll(wordPattern)];
      matches.forEach(match => {
        let word = match[0].toLowerCase();
        if (!wordToFirstIndex[word]) {
          wordToFirstIndex[word] = currentAppearanceIndex++;
          wordsInTextOrder.push(word);
        }
      });
    }
    
    // Map nodes to their appearance order
    newNodes.forEach((node, nodeIndex) => {
      let wordKey = node.word.toLowerCase();
      // Try to find exact match first
      let appearanceIndex = wordToFirstIndex[wordKey];
      // If not found, try without case sensitivity for non-CJK
      if (appearanceIndex === undefined && currentLanguage !== 'zh' && currentLanguage !== 'ja' && currentLanguage !== 'ko') {
        // Try to find in wordsInTextOrder
        appearanceIndex = wordsInTextOrder.findIndex(w => w.toLowerCase() === wordKey);
        if (appearanceIndex === -1) appearanceIndex = undefined;
      }
      // If still not found, use node index as fallback
      if (appearanceIndex === undefined) {
        appearanceIndex = nodeIndex;
      }
      wordAppearanceOrder.push({ nodeIndex: nodeIndex, appearanceIndex: appearanceIndex });
    });
    
    // Sort by appearance order
    wordAppearanceOrder.sort((a, b) => a.appearanceIndex - b.appearanceIndex);
    
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

  // Update spoken word count based on audio progress
  function updateSpokenWords() {
    if (!isVoiceSpeaking || !audioContext || audioDuration === 0) {
      return;
    }
    
    try {
      const currentTime = audioContext.currentTime - audioStartTime;
      const progress = Math.max(0, Math.min(1, currentTime / audioDuration));
      
      // Calculate how many words should be visible based on progress
      const totalWords = wordAppearanceOrder.length;
      spokenWordCount = Math.floor(progress * totalWords);
    } catch (e) {
      // If audio context is not available, don't update
      console.warn('Could not update spoken words:', e);
    }
  }

  // Visualize the network in 2D space with physics
  function visualizeNetwork(p, network, mouseVelX, mouseVelY) {
    // Update spoken word count if voice is speaking
    if (isVoiceSpeaking) {
      updateSpokenWords();
    }
    
    // Always skip birth animation - go directly to word-by-word or show network immediately
    // Skip birth animation in all cases (both word-by-word and continuous generations)
    if (networkBirthProgress < 1 && network.nodes.length > 0) {
      networkBirthProgress = 1; // Skip birth animation in all cases
    }
    
    // Always use word-by-word appearance when we have appearance order
    const useWordByWordAppearance = wordAppearanceOrder.length > 0;
    
    // Handle network birth animation - nodes expand from center
    // DISABLED: Always skip birth animation
    if (false && !useWordByWordAppearance && networkBirthProgress < 1 && network.nodes.length > 0) {
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
    let springStrength = 0.015 * speedMultiplier; // Reduced spring strength for slower movement (was 0.025)
    let damping = 0.92 + (1 - speedMultiplier) * 0.05; // Higher damping for slower movement (was 0.88-0.95, now 0.92-0.97)
    let returnStrength = 0.01 * speedMultiplier; // Reduced return strength for slower movement (was 0.015)
    
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
        // Use position near top but with margin from border
        let centerX = 0; // Center horizontally
        let topMargin = 80; // Margin from top border in pixels
        let centerY = (-(p.height / 2 - topMargin)) / viewZoom - viewOffsetY; // Near top with margin
        
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
          // No thinking animation - nodes stay at center
          // DISABLED: Thinking/morphing animation removed
          let nodeIndex = 0;
          for (let node of network.nodes) {
            // Keep nodes near top with margin - no morphing movement
            let centerX = 0; // Center horizontally
            let topMargin = 80; // Margin from top border in pixels
            let centerY = (-(p.height / 2 - topMargin)) / viewZoom - viewOffsetY; // Near top with margin
            
            // Keep nodes at center - no animation
            node.position.x = centerX;
            node.position.y = centerY;
            
            // Reset velocity - no movement
            node.velocity.x = 0;
            node.velocity.y = 0;
            
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
      
      // Skip physics for nodes that haven't appeared yet (word-by-word appearance)
      // Also ensure nodes that are appearing stay at center until fully visible
      if (isVoiceSpeaking && wordAppearanceOrder.length > 0) {
        let nodeIndex = network.nodes.indexOf(node);
        let appearanceInfo = wordAppearanceOrder.find(w => w.nodeIndex === nodeIndex);
        if (appearanceInfo) {
          let spokenIndex = wordAppearanceOrder.indexOf(appearanceInfo);
          if (spokenIndex >= spokenWordCount) {
            // Node hasn't appeared yet, keep at center and skip physics
            // Center in world coordinates is (0, 0)
            node.position.x = 0;
            node.position.y = 0;
            node.velocity.x = 0;
            node.velocity.y = 0;
            continue;
          }
        }
      }
      
      // Reset forces
      let forceX = 0;
      let forceY = 0;
      
      // Active floating movement - slower for new generation
      // Use sine waves with different phases per node for organic movement
      let floatSpeed = 0.005 * speedMultiplier; // Slower floating speed (was 0.008)
      let floatAmplitude = 0.6 * speedMultiplier; // Smaller amplitude for slower movement (was 1.0)
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
      let collisionStrength = 0.06; // Reduced strength for slower movement (was 0.1)
      
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
          // Increased distances for more spacious network
          let idealDist = Math.max(edgeMinDistance, 250 + edge.strength * 300);
          
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
      // Add slight leftward bias to counteract rightward drift
      let leftBias = -0.5; // Small leftward force to balance network
      let returnDx = node.basePosition.x - node.position.x;
      let returnDy = node.basePosition.y - node.position.y;
      
      forceX += returnDx * returnStrength;
      forceY += returnDy * returnStrength;
      forceX += leftBias; // Add leftward bias to balance network
      
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
      let topPadding = 0; // No top padding - words can reach top edge
      let tickerHeight = isVerticalTicker ? 0 : (isMobile ? 100 : 60); // Taller on mobile
      let tickerWidth = isVerticalTicker ? (isMobile ? 100 : 60) : 0; // Wider on mobile
      // No bottom padding - words can reach bottom edge
      let bottomPadding = 0;
      let availableHeight = p.height - tickerHeight - topPadding - bottomPadding;
      // For horizontal ticker, use full width. For vertical ticker, subtract ticker width
      let availableWidth = isVerticalTicker ? (p.width - tickerWidth) : p.width;
      
      // Calculate boundaries with no margins - words can reach all edges
      // Horizontal boundaries: full width, no margins
      let maxX = ((p.width / 2) - textWidth / 2) / viewZoom;
      let minX = (-(p.width / 2) + textWidth / 2) / viewZoom;
      // Vertical boundaries: full height, no margins
      let maxY = ((p.height / 2) - textHeight / 2) / viewZoom - viewOffsetY;
      let minY = (-(p.height / 2) + textHeight / 2) / viewZoom - viewOffsetY;
      
      let boundaryStrength = 0.04; // Slightly reduced to allow more movement near boundaries
      let bottomBoundaryStrength = 0.02; // Reduced strength for bottom boundary (less gravity to bottom)
      // Stronger right boundary to prevent rightward drift
      let rightBoundaryStrength = boundaryStrength * 1.2; // 20% stronger on right side
      
      // Push back if outside bounds
      if (node.position.x > maxX) {
        forceX -= (node.position.x - maxX) * rightBoundaryStrength; // Stronger force on right
      } else if (node.position.x < minX) {
        forceX += (minX - node.position.x) * boundaryStrength;
      }
      
      // Use reduced strength for bottom boundary to reduce gravity effect
      if (node.position.y > maxY) {
        forceY -= (node.position.y - maxY) * bottomBoundaryStrength; // Reduced strength for bottom
      } else if (node.position.y < minY) {
        forceY += (minY - node.position.y) * boundaryStrength; // Normal strength for top
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
    // DISABLED: All membrane and fill removed per user request
    const shouldShowMembrane = false; // Disabled - no membrane
    
    // Skip all membrane drawing
    if (false) {
      // Calculate convex hull around visible nodes (or use empty/center points if no nodes)
      let points = [];
      
      if (network.nodes.length > 0) {
        // Only include nodes that are visible (have appeared)
        let visibleNodes = network.nodes.filter((node, idx) => {
          // If voice is speaking, only include nodes that have appeared
          if (isVoiceSpeaking && wordAppearanceOrder.length > 0) {
            let appearanceInfo = wordAppearanceOrder.find(w => w.nodeIndex === idx);
            if (appearanceInfo) {
              let spokenIndex = wordAppearanceOrder.indexOf(appearanceInfo);
              // Only include if it has appeared (spokenIndex < spokenWordCount)
              return spokenIndex < spokenWordCount;
            }
          }
          // If not speaking or no appearance order, include all nodes
          return true;
        });
        
        // Create points that account for text dimensions - use corners of text bounding boxes
        // This ensures membrane wraps around entire words, not just center points
        points = [];
        for (let node of visibleNodes) {
          let fontSize = 15 + node.frequency * 2;
          let textWidth = fontSize * 0.6 * node.word.length;
          let textHeight = fontSize;
          
          // Add four corners of the text bounding box
          let halfWidth = textWidth / 2;
          let halfHeight = textHeight / 2;
          
          points.push({ x: node.position.x - halfWidth, y: node.position.y - halfHeight }); // Top-left
          points.push({ x: node.position.x + halfWidth, y: node.position.y - halfHeight }); // Top-right
          points.push({ x: node.position.x - halfWidth, y: node.position.y + halfHeight }); // Bottom-left
          points.push({ x: node.position.x + halfWidth, y: node.position.y + halfHeight }); // Bottom-right
        }
      }
      
      // If no visible nodes yet, create a small membrane at center (empty membrane)
      if (points.length === 0) {
        // Center in world coordinates is (0, 0)
        let centerX = 0;
        let centerY = 0;
        // Create a small circle at center for empty membrane
        const emptyMembraneRadius = 50;
        const emptyMembranePoints = 8;
        for (let i = 0; i < emptyMembranePoints; i++) {
          let angle = (i / emptyMembranePoints) * Math.PI * 2;
          points.push({
            x: centerX + Math.cos(angle) * emptyMembraneRadius,
            y: centerY + Math.sin(angle) * emptyMembraneRadius
          });
        }
      }
      
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
        // Calculate minimum padding needed to ensure all words are inside membrane
        // Find the maximum distance from hull center to any word (including text dimensions)
        let centerX = hull.reduce((sum, pt) => sum + pt.x, 0) / hull.length;
        let centerY = hull.reduce((sum, pt) => sum + pt.y, 0) / hull.length;
        
        let maxWordDistance = 0;
        if (network.nodes.length > 0) {
          let visibleNodes = network.nodes.filter((node, idx) => {
            if (isVoiceSpeaking && wordAppearanceOrder.length > 0) {
              let appearanceInfo = wordAppearanceOrder.find(w => w.nodeIndex === idx);
              if (appearanceInfo) {
                let spokenIndex = wordAppearanceOrder.indexOf(appearanceInfo);
                return spokenIndex < spokenWordCount;
              }
            }
            return true;
          });
          
          for (let node of visibleNodes) {
            let fontSize = 15 + node.frequency * 2;
            let textWidth = fontSize * 0.6 * node.word.length;
            let textHeight = fontSize;
            let halfWidth = textWidth / 2;
            let halfHeight = textHeight / 2;
            
            // Check all four corners of the text bounding box
            let corners = [
              { x: node.position.x - halfWidth, y: node.position.y - halfHeight },
              { x: node.position.x + halfWidth, y: node.position.y - halfHeight },
              { x: node.position.x - halfWidth, y: node.position.y + halfHeight },
              { x: node.position.x + halfWidth, y: node.position.y + halfHeight }
            ];
            
            for (let corner of corners) {
              let dx = corner.x - centerX;
              let dy = corner.y - centerY;
              let dist = Math.sqrt(dx * dx + dy * dy);
              maxWordDistance = Math.max(maxWordDistance, dist);
            }
          }
        }
        
        // Calculate padding to ensure all words are inside with extra margin
        // Padding should be at least the distance from hull to furthest word, plus margin
        let basePadding = 180; // Increased base padding to move membrane farther from words
        let minPadding = 0;
        for (let p of hull) {
          let dx = p.x - centerX;
          let dy = p.y - centerY;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            // Calculate how much padding is needed to reach maxWordDistance
            let neededPadding = maxWordDistance - dist + 100; // Increased extra margin from 50px to 100px
            minPadding = Math.max(minPadding, neededPadding);
          }
        }
        let padding = Math.max(basePadding, minPadding);
        
        // Expand hull outward with calculated padding
        let expandedHull = hull.map((p, i) => {
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
        
        // Apply multiple aggressive smoothing passes to create perfectly smooth, rounded shape
        // This eliminates indentations completely
        for (let pass = 0; pass < 5; pass++) {
          expandedHull = expandedHull.map((p, i) => {
            let prevIdx = (i - 1 + expandedHull.length) % expandedHull.length;
            let nextIdx = (i + 1) % expandedHull.length;
            let prev = expandedHull[prevIdx];
            let next = expandedHull[nextIdx];
            
            // Weighted average: more aggressive smoothing to eliminate indentations
            let smoothWeight = 0.2; // Increased smoothing weight
            return {
              x: p.x * (1 - smoothWeight * 2) + prev.x * smoothWeight + next.x * smoothWeight,
              y: p.y * (1 - smoothWeight * 2) + prev.y * smoothWeight + next.y * smoothWeight
            };
          });
        }
        
        // Create smooth, soft membrane with minimal pulsing effect
        // Very slow animation for less reactive, more stable membrane
        let membraneTime = p.frameCount * 0.004; // Much slower for less reactive movement
        let membranePulse = 1.0 + Math.sin(membraneTime) * 0.04; // Minimal pulsing (4% instead of 8%)
        
        // Draw membrane with organic, flowing appearance
        const colors = getColors();
        
        // Create smooth, organic membrane points with gentle wave frequencies
        let rawMembranePoints = expandedHull.map((p1, i) => {
          let prevIdx = (i - 1 + expandedHull.length) % expandedHull.length;
          let nextIdx = (i + 1) % expandedHull.length;
          let p0 = expandedHull[prevIdx];
          let p2 = expandedHull[nextIdx];
          
          // Minimal wave frequencies for less reactive, more stable membrane
          // Very reduced amplitudes for subtle, non-reactive movement
          let wave1 = Math.sin(membraneTime * 0.8 + i * 0.3) * 0.5 * membranePulse; // Much reduced
          let wave2 = Math.sin(membraneTime * 0.5 + i * 0.5) * 0.3 * membranePulse; // Much reduced
          let wave3 = Math.sin(membraneTime * 0.3 + i * 0.7) * 0.15 * membranePulse; // Much reduced
          let totalWave = wave1 + wave2 + wave3;
          
          // Calculate angle based on adjacent points for smoother flow
          let angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
          let angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          let avgAngle = (angle1 + angle2) / 2;
          
          // Perpendicular offset for organic wave
          let perpX = Math.cos(avgAngle + Math.PI / 2) * totalWave;
          let perpY = Math.sin(avgAngle + Math.PI / 2) * totalWave;
          
          // Minimal radial variation for less reactive membrane
          let centerX = expandedHull.reduce((sum, pt) => sum + pt.x, 0) / expandedHull.length;
          let centerY = expandedHull.reduce((sum, pt) => sum + pt.y, 0) / expandedHull.length;
          let radialDist = Math.sqrt((p1.x - centerX) ** 2 + (p1.y - centerY) ** 2);
          let radialWave = Math.sin(membraneTime * 0.2 + i * 0.2) * 0.2; // Much reduced for less reactive membrane
          
          return { 
            x: p1.x + perpX + (p1.x - centerX) / radialDist * radialWave,
            y: p1.y + perpY + (p1.y - centerY) / radialDist * radialWave
          };
        });
        
        // Smooth interpolation with previous frame to prevent jumpiness
        // Much lower smoothing factor for very smooth, non-jumpy animation
        let smoothingFactor = 0.04; // Reduced from 0.08 for much smoother transitions
        let membranePoints;
        if (previousMembranePoints && previousMembranePoints.length === rawMembranePoints.length) {
          // Interpolate between previous and current points for smooth transition
          membranePoints = rawMembranePoints.map((curr, i) => {
            let prev = previousMembranePoints[i];
            return {
              x: prev.x + (curr.x - prev.x) * smoothingFactor,
              y: prev.y + (curr.y - prev.y) * smoothingFactor
            };
          });
        } else {
          // First frame or size changed - use raw points
          membranePoints = rawMembranePoints;
        }
        
        // Store current points for next frame smoothing
        previousMembranePoints = membranePoints.map(p => ({ x: p.x, y: p.y }));
        
        // Apply additional smoothing passes to prevent bulges, knots, and indentations
        // More passes with lighter smoothing for smoother, less jumpy transitions
        for (let smoothPass = 0; smoothPass < 3; smoothPass++) {
          membranePoints = membranePoints.map((p, i) => {
            let prevIdx = (i - 1 + membranePoints.length) % membranePoints.length;
            let nextIdx = (i + 1) % membranePoints.length;
            let prev = membranePoints[prevIdx];
            let next = membranePoints[nextIdx];
            
            // Weighted average: lighter smoothing weight for smoother transitions
            let smoothWeight = 0.15; // Reduced from 0.25 for smoother, less aggressive smoothing
            return {
              x: p.x * (1 - smoothWeight * 2) + prev.x * smoothWeight + next.x * smoothWeight,
              y: p.y * (1 - smoothWeight * 2) + prev.y * smoothWeight + next.y * smoothWeight
            };
          });
        }
        
        // Use brighter color for membrane visibility
        // Make it more visible by using a semi-transparent version of text color
        let membraneColor = darkMode 
          ? [200, 200, 220] // Light blue-gray for dark mode
          : [60, 60, 80];   // Dark blue-gray for light mode
        
        // Draw membrane with soft fill and line (open path, no looping)
        // Outer glow layer (very transparent)
        p.noStroke();
        p.fill(membraneColor[0], membraneColor[1], membraneColor[2], 20);
        p.beginShape();
        if (membranePoints.length >= 3) {
          // Draw open path - start from first point, end at last point
          // Add control points for smooth curves
          let first = membranePoints[0];
          let second = membranePoints[1];
          let last = membranePoints[membranePoints.length - 1];
          let secondLast = membranePoints[membranePoints.length - 2];
          
          // Start with control point for smooth beginning
          p.curveVertex(secondLast.x, secondLast.y);
          p.curveVertex(first.x, first.y);
          
          // Add all intermediate points
          for (let i = 1; i < membranePoints.length - 1; i++) {
            p.curveVertex(membranePoints[i].x, membranePoints[i].y);
          }
          
          // End with control point for smooth ending (don't close the loop)
          p.curveVertex(last.x, last.y);
          p.curveVertex(second.x, second.y);
        }
        p.endShape(); // Open shape - no CLOSE
        
        // Main membrane layer (transparent, pulsing) - soft fill
        let membraneOpacity = 40 + Math.sin(membraneTime * 1.5) * 15; // Transparent (25-55 opacity)
        p.fill(membraneColor[0], membraneColor[1], membraneColor[2], membraneOpacity);
        p.beginShape();
        if (membranePoints.length >= 3) {
          let first = membranePoints[0];
          let second = membranePoints[1];
          let last = membranePoints[membranePoints.length - 1];
          let secondLast = membranePoints[membranePoints.length - 2];
          p.curveVertex(secondLast.x, secondLast.y);
          p.curveVertex(first.x, first.y);
          for (let i = 1; i < membranePoints.length - 1; i++) {
            p.curveVertex(membranePoints[i].x, membranePoints[i].y);
          }
          p.curveVertex(last.x, last.y);
          p.curveVertex(second.x, second.y);
        }
        p.endShape(); // Open shape - no CLOSE
        
        // No outline - only fill is shown
      }
    }
    
    // Draw edges (connections between words) - 2D with pulsing effects
    p.noFill();
    
    // Global pulse for edges - synchronized with network pulse (more pronounced)
    let edgePulseTime = p.frameCount * 0.03; // Faster pulse for edges (doubled speed)
    
    // Helper function to check if a node is visible (has appeared)
    function isNodeVisible(nodeIndex) {
      if (!isVoiceSpeaking || wordAppearanceOrder.length === 0) {
        return true; // All visible when not speaking
      }
      let appearanceInfo = wordAppearanceOrder.find(w => w.nodeIndex === nodeIndex);
      if (appearanceInfo) {
        let spokenIndex = wordAppearanceOrder.indexOf(appearanceInfo);
        return spokenIndex < spokenWordCount;
      }
      return true; // Default to visible if not in order
    }
    
    // First pass: draw non-highlighted edges with pulsing
    for (let edge of network.edges) {
      let source = network.nodes[edge.source];
      let target = network.nodes[edge.target];
      
      // Only draw edge if both nodes are visible
      if (!isNodeVisible(edge.source) || !isNodeVisible(edge.target)) {
        continue;
      }
      
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
        
        // Only draw edge if both nodes are visible
        if (!isNodeVisible(edge.source) || !isNodeVisible(edge.target)) {
          continue;
        }
        
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
    
    // Draw sequential text flow line - black curved line connecting words in order of appearance
    // This line shows the sequence of words as they appear in the generated text
    if (wordAppearanceOrder.length > 1) {
      p.push();
      
      // Collect visible sequential points
      let visiblePoints = [];
      for (let i = 0; i < wordAppearanceOrder.length; i++) {
        let wordInfo = wordAppearanceOrder[i];
        if (isNodeVisible(wordInfo.nodeIndex)) {
          let node = network.nodes[wordInfo.nodeIndex];
          visiblePoints.push({ x: node.position.x, y: node.position.y });
        }
      }
      
      // Draw curved line through all visible points
      if (visiblePoints.length > 2) {
        // Check if the curve forms a closed shape (first and last points are close)
        let firstPoint = visiblePoints[0];
        let lastPoint = visiblePoints[visiblePoints.length - 1];
        let distanceToClose = Math.sqrt(
          Math.pow(lastPoint.x - firstPoint.x, 2) + 
          Math.pow(lastPoint.y - firstPoint.y, 2)
        );
        let isClosed = distanceToClose < 50; // Consider closed if within 50 pixels
        
        // Draw fill first if closed
        if (isClosed) {
          p.fill(200, 200, 200, 40); // Soft gray with low opacity
          p.noStroke();
          p.beginShape();
          for (let i = 0; i < visiblePoints.length; i++) {
            let point = visiblePoints[i];
            // For the first and last points, we need to add them twice for curve control
            if (i === 0 || i === visiblePoints.length - 1) {
              p.curveVertex(point.x, point.y); // Add control point
            }
            p.curveVertex(point.x, point.y); // Add actual point
          }
          // Close the shape by connecting back to first point
          p.curveVertex(firstPoint.x, firstPoint.y); // Close the curve
          p.endShape(p.CLOSE);
        }
        
        // Draw the black stroke on top - thickest line in the system
        p.stroke(0, 0, 0); // Black color
        p.strokeWeight(6.0); // Thickest line in the system
        p.noFill();
        p.beginShape();
        for (let i = 0; i < visiblePoints.length; i++) {
          let point = visiblePoints[i];
          // For the first and last points, we need to add them twice for curve control
          // For intermediate points, add them once
          if (i === 0 || i === visiblePoints.length - 1) {
            p.curveVertex(point.x, point.y); // Add control point
          }
          p.curveVertex(point.x, point.y); // Add actual point
        }
        p.endShape();
      }
      p.pop();
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
      
      // No pulsating for old collapsed nodes - constant size
      for (let node of oldCollapsedNodes) {
        let baseFontSize = 15 + node.frequency * 2;
        
        // No pulsating - constant size
        let fontSize = baseFontSize; // No pulsing
        
        // Constant opacity - no breathing effect
        let opacityPulse = oldOpacity; // No pulsing
        
        p.fill(colors.text[0], colors.text[1], colors.text[2], opacityPulse);
        p.noStroke();
        p.textSize(fontSize);
        p.text(node.word, node.position.x, node.position.y);
      }
    }
    
      // Global pulsing effect - DISABLED: no pulsating
      let pulseTime = p.frameCount * 0.02; // Not used but kept for compatibility
      let globalPulse = 1.0; // No pulsing - constant size
      
      // Check if nodes are in collapsed/swarm state (for enhanced pulsating effects)
      let isInCollapsedState = (isCollapsing || 
                              (isMovingToCenter && centerMoveProgress >= 1) ||
                              (networkBirthProgress > 0 && networkBirthProgress < 1));
    
    for (let node of network.nodes) {
      // Check if this node should be visible based on word appearance order
      let nodeIndex = network.nodes.indexOf(node);
      let shouldBeVisible = false; // Start invisible - only show word-by-word
      let appearanceProgress = 0.0; // Start at 0 visibility
      
      // Always use word-by-word appearance if we have appearance order
      // Don't show all nodes at once - only show them as they appear
      if (wordAppearanceOrder.length > 0) {
        let appearanceInfo = wordAppearanceOrder.find(w => w.nodeIndex === nodeIndex);
        if (appearanceInfo) {
          let spokenIndex = wordAppearanceOrder.indexOf(appearanceInfo);
          
          // Calculate smooth appearance progress based on audio timing
          if (audioContext && audioStartTime > 0) {
            try {
              const currentTime = audioContext.currentTime - audioStartTime;
              const progress = Math.max(0, Math.min(1, currentTime / audioDuration));
              
              // Calculate when this word should appear (based on its position in order)
              const totalWords = wordAppearanceOrder.length;
              const wordStartProgress = spokenIndex / totalWords;
              const wordEndProgress = (spokenIndex + 1) / totalWords;
              
              // Smooth appearance: start appearing slightly before, fully visible at its time
              const appearanceWindow = 0.1; // 10% of total duration for smooth transition
              const wordAppearStart = Math.max(0, wordStartProgress - appearanceWindow);
              
              if (progress < wordAppearStart) {
                // Not yet time to appear
                appearanceProgress = 0.0;
                shouldBeVisible = false;
              } else if (progress >= wordEndProgress) {
                // Fully visible
                appearanceProgress = 1.0;
                shouldBeVisible = true;
              } else {
                // Currently appearing - smooth transition
                const localProgress = (progress - wordAppearStart) / (wordEndProgress - wordAppearStart + appearanceWindow);
                appearanceProgress = Math.max(0, Math.min(1, localProgress));
                shouldBeVisible = appearanceProgress > 0.1;
              }
            } catch (e) {
              // Fallback if audio context unavailable
              shouldBeVisible = spokenIndex < spokenWordCount;
              appearanceProgress = shouldBeVisible ? 1.0 : 0.0;
            }
          } else {
            // Voice not speaking yet or audio not started - use spokenWordCount
            // Only show words that have been "spoken" (appeared)
            // Between continuous generations, spokenWordCount starts at 0, so no nodes show until voice starts
            shouldBeVisible = spokenIndex < spokenWordCount;
            appearanceProgress = shouldBeVisible ? 1.0 : 0.0;
          }
        } else {
          // Node not in appearance order - don't show it
          shouldBeVisible = false;
          appearanceProgress = 0.0;
        }
      } else {
        // No appearance order yet - don't show any nodes
        shouldBeVisible = false;
        appearanceProgress = 0.0;
      }
      
      // All words birth from near top of window with margin from border
      // Calculate position in world coordinates
      // Screen center is at (0, 0) in world space
      // Position is topMargin pixels from top border
      // In world coordinates: (screenY - p.height/2) / viewZoom - viewOffsetY
      // Screen Y: topMargin
      // World Y: (topMargin - p.height / 2) / viewZoom - viewOffsetY = -(p.height / 2 - topMargin) / viewZoom - viewOffsetY
      let centerX = 0; // Center horizontally
      let topMargin = 80; // Margin from top border in pixels
      let centerY = (-(p.height / 2 - topMargin)) / viewZoom - viewOffsetY; // Near top with margin
      
      // If not fully visible yet, animate from center
      if (appearanceProgress < 1.0) {
        // Smooth easing for appearance (ease-out cubic)
        let easedProgress = 1 - Math.pow(1 - appearanceProgress, 3);
        
        // All words start at center and animate to their target position
        // Interpolate position from center to basePosition
        node.position.x = centerX + (node.basePosition.x - centerX) * easedProgress;
        node.position.y = centerY + (node.basePosition.y - centerY) * easedProgress;
        
        // Reset velocity during appearance animation
        node.velocity.x = 0;
        node.velocity.y = 0;
        
        // Skip drawing if not visible yet (too small)
        if (appearanceProgress < 0.1) continue;
      } else {
        // When fully visible, ensure position transitions smoothly to basePosition
        // Only start physics after fully appeared
        if (node.position.x === 0 && node.position.y === 0) {
          // If still at origin, move to basePosition
          node.position.x = node.basePosition.x;
          node.position.y = node.basePosition.y;
        }
      }
      
      // Font size based on frequency - smaller font
      let baseFontSize = 15 + node.frequency * 2;
      
      // Individual node pulsing - each node pulses at different phase (more pronounced)
      let nodePulsePhase = node.id * 0.3; // Unique phase per node
      
      // No pulsating - constant size for all nodes
      let nodePulse = 1.0; // No pulsing - constant size
      
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
      // Apply appearance progress to opacity
      let baseOpacity = isHighlighted ? 255 : 200; // Full opacity when highlighted
      baseOpacity = baseOpacity * appearanceProgress; // Scale by appearance progress
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
    
    // Check if voice menu was clicked
    if (checkVoiceMenuClick(p, p.mouseX, p.mouseY)) {
      return; // Don't process other clicks if voice menu was clicked
    }
    
    // Check if credits were clicked (only on home page)
    if (textTyped.length === 0 && checkCreditsClick(p, p.mouseX, p.mouseY)) {
      return; // Don't process other clicks if credits were clicked
    }
    
    // Check if repository link was clicked (only on home page)
    if (textTyped.length === 0 && checkRepoClick(p, p.mouseX, p.mouseY)) {
      return; // Don't process other clicks if repo link was clicked
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
        checkVoiceMenuClick(p, p.mouseX, p.mouseY) ||
        checkCreditsClick(p, p.mouseX, p.mouseY) ||
        checkRepoClick(p, p.mouseX, p.mouseY)) {
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
    // No need to check openai client - we use proxy now
    
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
      
      // Generate speech using OpenAI TTS via proxy (HD model for better quality, matching Realtime API voice)
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          voice: currentVoice,
          input: cleanText,
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
      }
      
      // Get audio buffer
      const buffer = await response.arrayBuffer();
      
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
      
      // Track audio timing for word-by-word appearance
      audioDuration = audioBuffer.duration;
      audioStartTime = audioContext.currentTime;
      spokenWordCount = 0; // Reset spoken word count
      
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
        // Show all words when speech finishes
        spokenWordCount = wordAppearanceOrder.length;
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
          // Show all words when speech finishes
          spokenWordCount = wordAppearanceOrder.length;
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
      
      // Use proxy endpoint to avoid CORS issues
      const apiPromise = fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 1.0,
          messages: [
            { 
              "role": "system", 
              "content": getSystemPrompt()
            },
            { "role": "user", "content": prompt }
          ]
        })
      }).then(res => {
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        return res.json();
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

  // Function to draw dark mode toggle in bottom left
  function drawDarkModeToggle(p) {
    const colors = getColors();
    const buttonSize = Math.min(28, Math.max(24, p.width * 0.03)); // Smaller adaptive size
    const buttonX = 20;
    const buttonY = p.height - buttonSize - 20; // Bottom left, 20px from bottom
    
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
    const buttonX = p.width - buttonWidth - 20; // Right side
    const buttonY = p.height - buttonHeight - 20; // Bottom right, 20px from bottom
    
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
    const buttonY = p.height - buttonSize - 20; // Bottom left, 20px from bottom
    
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
    const buttonY = p.height - (buttonSize + 10) * 2 - 20; // Above dark mode toggle, bottom left
    
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
    const buttonY = p.height - (buttonSize + 10) * 2 - 20; // Above dark mode toggle, bottom left
    
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
    const buttonX = p.width - buttonWidth - 20; // Right side
    const buttonY = p.height - buttonHeight - 20; // Bottom right, 20px from bottom
    
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
  
  // Function to draw voice menu
  function drawVoiceMenu(p) {
    // Only show on landing page
    if (textTyped.length > 0) {
      return;
    }
    
    const colors = getColors();
    const menuWidth = Math.min(140, p.width * 0.18); // Same width as language menu
    const languageMenuWidth = Math.min(140, p.width * 0.18);
    const menuX = p.width - languageMenuWidth - menuWidth - 30; // Next to language menu (with spacing)
    const buttonHeight = 24; // Same button height
    const dropdownButtonHeight = 28; // Same dropdown button height
    const buttonY = 20; // Same height as language menu
    
    p.push();
    
    // Dropdown button (always visible)
    const currentVoiceObj = voices.find(v => v.code === currentVoice) || voices[0];
    
    // Button background - lighter (reduced opacity)
    p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 150);
    p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 120);
    p.strokeWeight(0.5);
    p.rect(menuX, buttonY, menuWidth, dropdownButtonHeight);
    
    // Button text - smaller adaptive font size
    p.textAlign(p.LEFT, p.CENTER);
    const buttonFontSize = Math.max(8, Math.min(11, p.width * 0.012));
    p.textFont('monospace', buttonFontSize);
    p.fill(colors.uiText[0], colors.uiText[1], colors.uiText[2], 180);
    p.noStroke();
    p.text('Voice: ' + currentVoiceObj.name, menuX + 8, buttonY + dropdownButtonHeight / 2);
    
    // Dropdown arrow - smaller
    p.textAlign(p.RIGHT, p.CENTER);
    p.textFont('monospace', buttonFontSize);
    p.text(showVoiceMenu ? '▲' : '▼', menuX + menuWidth - 8, buttonY + dropdownButtonHeight / 2);
    
    // Dropdown menu (only if open)
    if (showVoiceMenu) {
      const dropdownY = buttonY + dropdownButtonHeight;
      const dropdownHeight = voices.length * buttonHeight + 8;
      
      // Dropdown background - lighter
      p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 180);
      p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 120);
      p.strokeWeight(0.5);
      p.rect(menuX, dropdownY, menuWidth, dropdownHeight);
      
      // Voice options
      let yPos = dropdownY + 4;
      for (let i = 0; i < voices.length; i++) {
        const voice = voices[i];
        const isSelected = voice.code === currentVoice;
        
        // Option background - lighter
        if (isSelected) {
          p.fill(colors.uiSelected[0], colors.uiSelected[1], colors.uiSelected[2], 150);
        } else {
          p.fill(colors.uiBackground[0], colors.uiBackground[1], colors.uiBackground[2], 120);
        }
        p.stroke(colors.uiBorder[0], colors.uiBorder[1], colors.uiBorder[2], 100);
        p.strokeWeight(0.5);
        p.rect(menuX + 4, yPos, menuWidth - 8, buttonHeight - 2);
        
        // Option text - smaller adaptive font size
        p.textAlign(p.LEFT, p.CENTER);
        const optionFontSize = Math.max(7, Math.min(10, p.width * 0.011));
        p.textFont('monospace', optionFontSize);
        if (isSelected) {
          p.fill(colors.uiTextSelected[0], colors.uiTextSelected[1], colors.uiTextSelected[2], 200);
        } else {
          p.fill(colors.uiText[0], colors.uiText[1], colors.uiText[2], 160);
        }
        p.noStroke();
        p.text(voice.name, menuX + 10, yPos + buttonHeight / 2);
        
        yPos += buttonHeight;
      }
    }
    
    p.pop();
  }
  
  // Function to check if voice menu button is clicked
  function checkVoiceMenuClick(p, mouseX, mouseY) {
    // Only handle clicks on landing page
    if (textTyped.length > 0) {
      return false;
    }
    
    const menuWidth = Math.min(140, p.width * 0.18);
    const languageMenuWidth = Math.min(140, p.width * 0.18);
    const menuX = p.width - languageMenuWidth - menuWidth - 30; // Next to language menu (with spacing)
    const buttonHeight = 24;
    const dropdownButtonHeight = 28;
    const buttonY = 20; // Same height as language menu
    
    // Check if click is on dropdown button
    if (mouseX >= menuX && mouseX <= menuX + menuWidth && 
        mouseY >= buttonY && mouseY <= buttonY + dropdownButtonHeight) {
      // Toggle dropdown
      showVoiceMenu = !showVoiceMenu;
      return true;
    }
    
    // Check if click is on dropdown menu items (only if dropdown is open)
    if (showVoiceMenu) {
      const dropdownY = buttonY + dropdownButtonHeight;
      const dropdownHeight = voices.length * buttonHeight + 8;
      
      if (mouseX >= menuX && mouseX <= menuX + menuWidth && 
          mouseY >= dropdownY && mouseY <= dropdownY + dropdownHeight) {
        
        // Check which voice option was clicked
        let yPos = dropdownY + 4;
        for (let i = 0; i < voices.length; i++) {
          if (mouseY >= yPos && mouseY <= yPos + buttonHeight - 2) {
            currentVoice = voices[i].code;
            showVoiceMenu = false; // Close dropdown after selection
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
        showVoiceMenu = false;
      }
    }
    
    return false;
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
      const dropdownHeight = languages.length * buttonHeight + 8;
      
      if (mouseX >= menuX && mouseX <= menuX + menuWidth && 
          mouseY >= dropdownY && mouseY <= dropdownY + dropdownHeight) {
        
        // Check which language option was clicked
        let yPos = dropdownY + 4;
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
    const creditsYRelative = p.height / 2 - 50; // Relative to center (matches displayInstructions)
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
  
  // Function to check if repository link is clicked
  function checkRepoClick(p, mouseX, mouseY) {
    // Only check if on home page
    if (textTyped.length > 0) {
      return false;
    }
    
    // Calculate repo text position (on same line as powered by)
    const baseFontSize = Math.min(32, p.width / 20);
    const creditsFontSize = Math.max(8, baseFontSize * 0.25);
    const creditsYRelative = p.height / 2 - 50; // Relative to center
    const poweredByYRelative = creditsYRelative + creditsFontSize + 4;
    const repoText = 'Repository';
    const poweredByText = 'Powered by OpenAI Realtime model';
    const separator = ' | ';
    
    // Calculate text widths
    p.textFont('monospace', creditsFontSize);
    const poweredByWidth = p.textWidth(poweredByText);
    const separatorWidth = p.textWidth(separator);
    const repoTextWidth = p.textWidth(repoText);
    const combinedWidth = poweredByWidth + separatorWidth + repoTextWidth;
    
    // Calculate repository link position
    const repoXStart = p.width / 2 - combinedWidth / 2 + poweredByWidth + separatorWidth;
    const repoXEnd = repoXStart + repoTextWidth;
    const repoYScreen = p.height / 2 + poweredByYRelative;
    const textHeight = creditsFontSize;
    
    // Check if click is within repo text bounds
    if (mouseX >= repoXStart - 5 && 
        mouseX <= repoXEnd + 5 &&
        mouseY >= repoYScreen - textHeight / 2 - 5 && 
        mouseY <= repoYScreen + textHeight / 2 + 5) {
      // Open link in new tab
      window.open('https://github.com/marlonbarrios/semantic_tensegrities', '_blank');
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
    const instructionFontSize = Math.max(11, baseFontSize * 0.45); // Consistent size for all instructions
    
    // Title
    p.textFont('monospace', titleFontSize);
    p.fill(colors.text[0], colors.text[1], colors.text[2]);
    p.text(t('title'), 0, -120);
    
    // Subtitle
    p.textFont('monospace', mainFontSize * 0.7);
    p.fill(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2], colors.textSecondary[3] || 160);
    p.text(t('subtitle'), 0, -90);
    
    // Consistent spacing between instruction lines
    const lineSpacing = 20; // Consistent spacing between all instruction lines
    
    // Language and voice selection instruction (before spacebar)
    p.textFont('monospace', instructionFontSize);
    p.fill(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2], colors.textSecondary[3] || 160);
    p.text(t('setVoiceLanguage'), 0, -60);
    
    // Main instructions
    p.textFont('monospace', instructionFontSize);
    p.fill(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2], colors.textSecondary[3] || 180);
    if (isMobile) {
      p.text(t('tapToStart'), 0, -60 + lineSpacing);
    } else {
      p.text(t('pressSpacebar'), 0, -60 + lineSpacing);
    }
    
    // Secondary instructions
    p.textFont('monospace', instructionFontSize);
    p.fill(colors.textTertiary[0], colors.textTertiary[1], colors.textTertiary[2], colors.textTertiary[3] || 160);
    p.text(t('autoGeneration'), 0, -60 + lineSpacing * 2);
    
    p.textFont('monospace', instructionFontSize);
    p.fill(colors.textTertiary[0], colors.textTertiary[1], colors.textTertiary[2], colors.textTertiary[3] || 160);
    p.text(t('autoRead'), 0, -60 + lineSpacing * 3);
    
    // Show mobile-specific or desktop-specific instructions
    p.textFont('monospace', instructionFontSize);
    p.fill(colors.textTertiary[0], colors.textTertiary[1], colors.textTertiary[2], colors.textTertiary[3] || 160);
    if (isMobile) {
      p.text(t('panZoomMobile'), 0, -60 + lineSpacing * 4);
      p.text(t('tapWords'), 0, -60 + lineSpacing * 5);
    } else {
      p.text(t('panZoom'), 0, -60 + lineSpacing * 4);
      p.text(t('hoverWords'), 0, -60 + lineSpacing * 5);
      p.text(t('clickWords'), 0, -60 + lineSpacing * 6);
    }
    
    // Credits at the bottom (clickable link)
    const creditsFontSize = Math.max(8, baseFontSize * 0.25);
    p.textFont('monospace', creditsFontSize);
    const creditsText = 'Concept and development by Marlon Barrios Solano';
    
    // Check if mouse is hovering over credits (for visual feedback)
    const creditsY = p.height / 2 - 50;
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
    
    // Powered by OpenAI Realtime model and Repository link (on same line)
    const poweredByText = 'Powered by OpenAI Realtime model';
    const repoText = 'Repository';
    const separator = ' | ';
    const poweredByY = creditsY + creditsFontSize + 4;
    
    // Calculate positions for combined text
    p.textFont('monospace', creditsFontSize);
    const poweredByWidth = p.textWidth(poweredByText);
    const separatorWidth = p.textWidth(separator);
    const repoTextWidth = p.textWidth(repoText);
    const combinedWidth = poweredByWidth + separatorWidth + repoTextWidth;
    
    // Draw "Powered by" text
    p.fill(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], colors.textQuaternary[3] || 70);
    p.text(poweredByText, -combinedWidth / 2 + poweredByWidth / 2, poweredByY);
    
    // Draw separator
    p.text(separator, -combinedWidth / 2 + poweredByWidth + separatorWidth / 2, poweredByY);
    
    // Check if hovering over repository link
    const repoXStart = -combinedWidth / 2 + poweredByWidth + separatorWidth;
    const repoXEnd = repoXStart + repoTextWidth;
    const repoXCenter = repoXStart + repoTextWidth / 2;
    const repoMouseXLocal = p.mouseX - p.width / 2;
    const repoMouseYLocal = p.mouseY - p.height / 2;
    const isHoveringRepo = repoMouseXLocal >= repoXStart - 5 && 
                           repoMouseXLocal <= repoXEnd + 5 &&
                           repoMouseYLocal >= poweredByY - creditsFontSize / 2 - 5 && 
                           repoMouseYLocal <= poweredByY + creditsFontSize / 2 + 5;
    
    // Draw repository link with hover effect
    if (isHoveringRepo) {
      p.fill(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], 150);
      p.cursor('pointer');
    } else {
      p.fill(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], 100);
    }
    p.text(repoText, repoXCenter, poweredByY);
    
    // Draw underline for repository link
    if (isHoveringRepo) {
      p.stroke(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], 150);
    } else {
      p.stroke(colors.textQuaternary[0], colors.textQuaternary[1], colors.textQuaternary[2], 80);
    }
    p.strokeWeight(0.5);
    p.line(repoXStart, poweredByY + 3, repoXEnd, poweredByY + 3);
    p.noStroke();
    
    p.pop();
    
    // Draw dark mode toggle (top left) and language menu (top right)
    drawDarkModeToggle(p);
    drawLanguageMenu(p);
    
    // Draw voice menu (only on landing page)
    drawVoiceMenu(p);
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
  
  // "Thinking" word removed - no thinking animation

  p.pop();
  }
};

function onReady() {
  // OpenAI client no longer needed - we use proxy server instead
  // openai initialization removed to avoid CORS issues
  
  const mainElt = document.querySelector('main');
  new p5(sketch, mainElt);
}

// Start the sketch when DOM is ready
if (document.readyState === 'complete') {
  onReady();
} else {
  document.addEventListener("DOMContentLoaded", onReady);
}
