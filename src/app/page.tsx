'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/client';

const CARD_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1501761095374-cf0a72b89ae1?auto=format&fit=crop&w=800&q=80',
];

const FILTERS = [
  { id: 'none',     label: 'Original', css: '' },
  { id: 'vivid',    label: 'Vivid',    css: 'saturate(1.8) contrast(1.1)' },
  { id: 'warm',     label: 'Warm',     css: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id: 'cool',     label: 'Cool',     css: 'hue-rotate(30deg) saturate(1.2) brightness(1.05)' },
  { id: 'bw',       label: 'B&W',      css: 'grayscale(1) contrast(1.2)' },
  { id: 'vintage',  label: 'Vintage',  css: 'sepia(0.6) contrast(0.9) brightness(0.9)' },
  { id: 'dramatic', label: 'Dramatic', css: 'contrast(1.5) saturate(1.2) brightness(0.9)' },
  { id: 'fade',     label: 'Fade',     css: 'saturate(0.7) brightness(1.1) contrast(0.85)' },
  { id: 'golden',   label: 'Golden',   css: 'sepia(0.4) saturate(1.6) brightness(1.1) hue-rotate(-10deg)' },
  { id: 'matte',    label: 'Matte',    css: 'contrast(0.9) saturate(0.8) brightness(1.1)' },
];

const TONE_META: Record<string, { icon: string; color: string }> = {
  Adventurous: { icon: '⚡', color: 'bg-primary-fixed text-on-primary-fixed' },
  Poetic:      { icon: '🌸', color: 'bg-secondary-fixed text-on-secondary-fixed' },
  Informative: { icon: '📖', color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  Humorous:    { icon: '😄', color: 'bg-error-fixed text-on-error-fixed' },
};

const PLATFORMS = {
  instagram: { w: 1080, h: 1080, label: '📸 Instagram',  shape: 'square',   ratio: '1/1'   },
  story:     { w: 1080, h: 1920, label: '📱 Story',       shape: 'portrait', ratio: '9/16'  },
  twitter:   { w: 1200, h: 675,  label: '🐦 Twitter/X',   shape: 'landscape',ratio: '16/9'  },
  whatsapp:  { w: 1080, h: 1080, label: '💬 WhatsApp',    shape: 'square',   ratio: '1/1'   },
};

const THEMES: Record<string, { grad1: string; grad2: string; grad3: string; text: string }> = {
  instagram: { grad1: '#833ab4', grad2: '#fd1d1d', grad3: '#fcb045', text: '#fff' },
  story:     { grad1: '#0f0c29', grad2: '#302b63', grad3: '#24243e', text: '#fff' },
  twitter:   { grad1: '#1DA1F2', grad2: '#0d7bbf', grad3: '#1a1a2e', text: '#fff' },
  whatsapp:  { grad1: '#128C7E', grad2: '#075E54', grad3: '#25D366', text: '#fff' },
};

export default function ExplorePage() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('explore');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  // Explore State
  const [exploreRecords, setExploreRecords] = useState<any[]>([]);
  const [exploreSearch, setExploreSearch] = useState('');
  const [explorePage, setExplorePage] = useState(1);
  const [exploreTotalPages, setExploreTotalPages] = useState(1);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [heroTotal, setHeroTotal] = useState('12,400+');

  // Generate Wizard State
  const [step, setStep] = useState(1);
  const [driverName, setDriverName] = useState('');
  const [startingLocation, setStartingLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [tripTitle, setTripTitle] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [mood, setMood] = useState('adventurous');
  const [style, setStyle] = useState('Adventure');
  const [landmarks, setLandmarks] = useState('');
  const [highlights, setHighlights] = useState('');
  const [suggestTitleLoading, setSuggestTitleLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Output narrative
  const [lastNarrativeData, setLastNarrativeData] = useState<any>(null);
  const [photosList, setPhotosList] = useState<any[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ file: File; url: string; name: string }>>([]);

  // TTS State
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [ttsTimerText, setTtsTimerText] = useState('0:00');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [ttsSpeed, setTtsSpeed] = useState('1');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Rating State
  const [ratingVal, setRatingVal] = useState<number | null>(null);
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [ratingComment, setRatingComment] = useState('');

  // History State
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyAvgRating, setHistoryAvgRating] = useState('—');
  const [historyUniqueRoutes, setHistoryUniqueRoutes] = useState('—');

  // Analytics Dashboard State
  const [chartJsLoaded, setChartJsLoaded] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const chartInstances = useRef<any>({});

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedNarrative, setSelectedNarrative] = useState<any>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState('');

  // Photo Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSrcUrl, setEditorSrcUrl] = useState('');
  const [editorFilename, setEditorFilename] = useState('');
  const [editorPhotoId, setEditorPhotoId] = useState('');
  const [editorFilter, setEditorFilter] = useState('none');
  const [editorBrightness, setEditorBrightness] = useState(100);
  const [editorContrast, setEditorContrast] = useState(100);
  const [editorSaturation, setEditorSaturation] = useState(100);
  const [editorText, setEditorText] = useState('');
  const [editorAspect, setEditorAspect] = useState('original');
  const [editorActiveTab, setEditorActiveTab] = useState('edit');
  const [editorAiAnalyzeLoading, setEditorAiAnalyzeLoading] = useState(false);
  const [editorAiAnalysis, setEditorAiAnalysis] = useState<any>(null);
  const [editorAiGenerateDest, setEditorAiGenerateDest] = useState('');
  const [editorAiGenerateMood, setEditorAiGenerateMood] = useState('Adventurous');
  const [editorAiGeneratePrompt, setEditorAiGeneratePrompt] = useState('');
  const [editorAiGenerateLoading, setEditorAiGenerateLoading] = useState(false);
  const [editorGeneratedImgUrl, setEditorGeneratedImgUrl] = useState<string | null>(null);
  const [editorGeneratedPhotoId, setEditorGeneratedPhotoId] = useState('');

  // Social Post Studio State
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioPlatform, setStudioPlatform] = useState('instagram');
  const [studioPhotoUrl, setStudioPhotoUrl] = useState('');
  const [studioTitle, setStudioTitle] = useState('');
  const [studioCaption, setStudioCaption] = useState('');
  const [studioHashtags, setStudioHashtags] = useState<string[]>([]);
  const [studioPostIdeas, setStudioPostIdeas] = useState<string[]>([]);
  const [studioViralHook, setStudioViralHook] = useState('');
  const [studioBestTime, setStudioBestTime] = useState('');
  const [studioAllCaptions, setStudioAllCaptions] = useState<Record<string, string>>({});
  const [studioCaptionLoading, setStudioCaptionLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };

  // Listen to hash changes for SPA feel
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') || 'explore';
      setActiveView(hash);
      setMobileMenuOpen(false);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Sync speech voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Fetch explore grid
  const loadExploreGrid = async () => {
    setExploreLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(explorePage),
        limit: '9',
        search: exploreSearch,
      });
      const res = await fetch(`/api/explore?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExploreRecords(data.records || []);
        setExploreTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExploreLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'explore') {
      loadExploreGrid();
    }
  }, [activeView, explorePage, exploreSearch]);

  // Fetch history list
  const loadHistoryGrid = async () => {
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: '12',
        search: historySearch,
      });
      const res = await fetch(`/api/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data.records || []);
        setHistoryTotalPages(data.pagination?.totalPages || 1);

        // Update stats
        const total = data.pagination?.total || data.records?.length || 0;
        setHistoryTotal(total);

        if (data.records?.length > 0) {
          const ratings = data.records.map((r: any) => r.rating).filter((r: any) => r !== null);
          const avg = ratings.length ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1) : '—';
          setHistoryAvgRating(String(avg));

          const routes = new Set(data.records.map((r: any) => r.route));
          setHistoryUniqueRoutes(String(routes.size));
        } else {
          setHistoryAvgRating('—');
          setHistoryUniqueRoutes('—');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeView === 'history') {
      loadHistoryGrid();
    }
  }, [activeView, historyPage, historySearch]);

  // Handle wishlisting in Explore
  const toggleWishlistExplore = async (narrativeId: number | string) => {
    if (!user) {
      showToast('Please sign in to save stories to your Wishlist.', 'info');
      window.location.hash = '#login';
      return;
    }
    const cleanId = String(narrativeId).replace('sqlite-', '');
    try {
      const res = await fetch(`/api/wishlist/${cleanId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.added ? 'Saved to Wishlist!' : 'Removed from Wishlist.', 'success');
        loadExploreGrid();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Suggest Title using AI
  const suggestTitle = async () => {
    if (!destination) {
      showToast('Please enter a destination first.', 'info');
      return;
    }
    setSuggestTitleLoading(true);
    try {
      const res = await fetch('/api/suggest-title/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, startingLocation }),
      });
      if (res.ok) {
        const data = await res.json();
        setTripTitle(data.title);
        showToast('Suggested title generated!', 'success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestTitleLoading(false);
    }
  };

  // Handle Photo Dropzone
  const triggerBrowse = () => {
    document.getElementById('photoFileInput')?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const updated = [...uploadedPhotos];
      for (let i = 0; i < files.length; i++) {
        if (updated.length >= 20) break;
        const file = files[i];
        updated.push({
          file,
          url: URL.createObjectURL(file),
          name: file.name
        });
      }
      setUploadedPhotos(updated);
    }
  };

  const removePhoto = (index: number) => {
    const updated = [...uploadedPhotos];
    URL.revokeObjectURL(updated[index].url);
    updated.splice(index, 1);
    setUploadedPhotos(updated);
  };

  // Stepper transitions
  const goToStep = (num: number) => {
    if (num === 2) {
      if (!driverName || !destination) {
        showToast('Please fill out all required fields.', 'error');
        return;
      }
    }
    setStep(num);
  };

  // Generate narrative API triggers
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverName,
          startingLocation,
          destination,
          title: tripTitle,
          tripDate,
          vehicleType,
          mood,
          style,
          landmarks,
          highlights,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setLastNarrativeData(data);
      setStep(3);

      // Reset ratings
      setRatingVal(null);
      setRatingComment('');

      // Upload photos if any
      if (uploadedPhotos.length > 0) {
        const formData = new FormData();
        formData.append('narrativeId', String(data.id));
        uploadedPhotos.forEach(p => {
          formData.append('photos', p.file);
        });

        const uploadRes = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          setPhotosList(uploadData.photos || []);
        }
      } else {
        setPhotosList([]);
      }

      showToast('✨ Trip narrative generated successfully!', 'success');

    } catch (err: any) {
      showToast(`Generation failed: ${err.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Text-To-Speech controllers
  const toggleTTS = () => {
    if (!lastNarrativeData?.narrative) return;

    if (ttsPlaying) {
      window.speechSynthesis.pause();
      setTtsPlaying(false);
    } else {
      if (window.speechSynthesis.paused && utteranceRef.current) {
        window.speechSynthesis.resume();
        setTtsPlaying(true);
      } else {
        window.speechSynthesis.cancel();
        
        // Clean text (remove headers/formatting markers)
        const cleanText = lastNarrativeData.narrative.replace(/[#*`]/g, '');
        const utter = new SpeechSynthesisUtterance(cleanText);

        if (selectedVoice) {
          const found = voices.find(v => v.voiceURI === selectedVoice);
          if (found) utter.voice = found;
        }

        utter.rate = parseFloat(ttsSpeed);
        
        utter.onend = () => {
          setTtsPlaying(false);
          setTtsProgress(0);
          setTtsTimerText('0:00');
        };

        utter.onerror = () => {
          setTtsPlaying(false);
        };

        // Estimate progress bar duration (roughly 150 words per minute)
        const totalWords = cleanText.split(/\s+/).length;
        const totalSecs = (totalWords / 150) * 60;
        let elapsed = 0;

        const interval = setInterval(() => {
          if (!window.speechSynthesis.speaking || window.speechSynthesis.paused) {
            clearInterval(interval);
            return;
          }
          elapsed += 1;
          const prog = Math.min(100, (elapsed / totalSecs) * 100);
          setTtsProgress(prog);

          const mins = Math.floor(elapsed / 60);
          const secs = Math.floor(elapsed % 60);
          setTtsTimerText(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        }, 1000);

        utteranceRef.current = utter;
        window.speechSynthesis.speak(utter);
        setTtsPlaying(true);
      }
    }
  };

  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setTtsPlaying(false);
    setTtsProgress(0);
    setTtsTimerText('0:00');
    utteranceRef.current = null;
  };

  // Submit Rating Feedback
  const submitRating = async () => {
    if (!ratingVal) return;
    try {
      const res = await fetch(`/api/feedback/${lastNarrativeData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingVal, comment: ratingComment }),
      });
      if (res.ok) {
        showToast('Feedback submitted. Thank you!', 'success');
        setRatingVal(null);
        setRatingComment('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sharing Narrative
  const copyNarrative = () => {
    if (!lastNarrativeData?.narrative) return;
    navigator.clipboard.writeText(`${lastNarrativeData.title}\n\n${lastNarrativeData.narrative}`);
    showToast('Copied full narrative to clipboard!', 'success');
  };

  const downloadNarrative = () => {
    if (!lastNarrativeData?.narrative) return;
    const blob = new Blob([`${lastNarrativeData.title}\n\n${lastNarrativeData.narrative}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lastNarrativeData.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Narrative download started!', 'success');
  };

  // Reset Stepper wizard
  const resetWizard = () => {
    setStep(1);
    setDriverName('');
    setStartingLocation('');
    setDestination('');
    setTripTitle('');
    setTripDate('');
    setLandmarks('');
    setHighlights('');
    setUploadedPhotos([]);
    setLastNarrativeData(null);
    setPhotosList([]);
  };

  // Open Detail Modal
  const openDetailModal = async (id: number | string) => {
    const cleanId = String(id).replace('sqlite-', '');
    try {
      const res = await fetch(`/api/history/${cleanId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedNarrative(data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Profile
  const openEditProfile = () => {
    setEditDisplayName(user?.displayName || '');
    setEditPhotoURL(user?.photoURL || '');
    setEditProfileOpen(true);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editDisplayName, photoURL: editPhotoURL }),
      });
      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
        setEditProfileOpen(false);
        // Page reload to refresh state across components
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Serving Photos list
  const loadNarrativePhotos = async (nId: number | string) => {
    const cleanId = String(nId).replace('sqlite-', '');
    try {
      const res = await fetch(`/api/photos/${cleanId}`);
      if (res.ok) {
        const data = await res.json();
        setPhotosList(data.photos || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedNarrative) {
      loadNarrativePhotos(selectedNarrative.id);
    }
  }, [selectedNarrative]);

  // Photo editor tab click
  const switchEditorTab = (tab: string) => {
    setEditorActiveTab(tab);
  };

  // Open Photo Studio
  const openPhotoEditor = (srcUrl: string, filename: string, photoId: string) => {
    setEditorSrcUrl(srcUrl);
    setEditorFilename(filename || 'trip-photo.jpg');
    setEditorPhotoId(photoId || '');
    setEditorFilter('none');
    setEditorBrightness(100);
    setEditorContrast(100);
    setEditorSaturation(100);
    setEditorText('');
    setEditorAspect('original');
    setEditorActiveTab('edit');
    setEditorAiAnalysis(null);
    setEditorGeneratedImgUrl(null);
    setEditorOpen(true);
  };

  // Filter application preview styles
  const getEditorFilterStyle = () => {
    const f = FILTERS.find(x => x.id === editorFilter) || FILTERS[0];
    return {
      filter: `${f.css} brightness(${editorBrightness / 100}) contrast(${editorContrast / 100}) saturate(${editorSaturation / 100})`
    };
  };

  // AI enhance action
  const runAIAnalyze = async () => {
    setEditorAiAnalyzeLoading(true);
    setEditorAiAnalysis(null);
    try {
      const imgResp = await fetch(editorSrcUrl);
      const blob = await imgResp.blob();
      const form = new FormData();
      form.append('photo', blob, editorFilename || 'photo.jpg');
      form.append('destination', lastNarrativeData?.destination || '');
      form.append('mood', lastNarrativeData?.tone || '');
      form.append('narrative', lastNarrativeData?.narrative || '');

      const response = await fetch('/api/ai-photo/analyze', { method: 'POST', body: form });
      if (response.ok) {
        const data = await response.json();
        setEditorAiAnalysis(data);
        showToast('✨ Photo analyzed by Gemini!', 'success');
        
        // Auto-apply suggested settings
        if (data.suggestedFilter) setEditorFilter(data.suggestedFilter);
        if (data.brightness) setEditorBrightness(data.brightness);
        if (data.contrast) setEditorContrast(data.contrast);
        if (data.saturation) setEditorSaturation(data.saturation);
      }
    } catch (err: any) {
      showToast(`Analysis failed: ${err.message}`, 'error');
    } finally {
      setEditorAiAnalyzeLoading(false);
    }
  };

  // AI Image generation action
  const runAIGenerate = async () => {
    setEditorAiGenerateLoading(true);
    setEditorGeneratedImgUrl(null);
    try {
      const res = await fetch('/api/ai-photo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: editorAiGenerateDest || lastNarrativeData?.destination || '',
          mood: editorAiGenerateMood,
          prompt: editorAiGeneratePrompt,
          narrativeId: lastNarrativeData?.id || null
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditorGeneratedImgUrl(data.dataUrl);
        setEditorGeneratedPhotoId(data.photoId);
        showToast('✨ AI image generated!', 'success');
      }
    } catch (err: any) {
      showToast(`AI generation failed: ${err.message}`, 'error');
    } finally {
      setEditorAiGenerateLoading(false);
    }
  };

  const useGeneratedImage = () => {
    if (editorGeneratedImgUrl) {
      setEditorSrcUrl(editorGeneratedImgUrl);
      setEditorPhotoId(editorGeneratedPhotoId);
      setEditorActiveTab('edit');
      setEditorGeneratedImgUrl(null);
    }
  };

  // Open Social Post Studio
  const openSocialPostStudio = (url = '') => {
    const targetUrl = url || editorSrcUrl;
    setStudioPhotoUrl(targetUrl);
    setStudioTitle(lastNarrativeData?.title || lastNarrativeData?.route || 'Trip Story');
    setStudioCaption('');
    setStudioHashtags([]);
    setStudioPostIdeas([]);
    setStudioViralHook('');
    setStudioBestTime('');
    setStudioOpen(true);
    setEditorOpen(false);

    // Auto trigger captions if narrative loaded
    if (lastNarrativeData) {
      generateAICaptions(targetUrl);
    }
  };

  const generateAICaptions = async (photoUrl: string) => {
    setStudioCaptionLoading(true);
    try {
      const res = await fetch('/api/ai-photo/social-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrativeText: lastNarrativeData?.narrative || '',
          destination: lastNarrativeData?.destination || lastNarrativeData?.route || 'Trip Story',
          mood: lastNarrativeData?.tone || 'Adventurous',
          title: lastNarrativeData?.title || 'Trip Story',
          driverName: lastNarrativeData?.driverName || '',
          landmarks: lastNarrativeData?.landmarks || '',
          highlights: lastNarrativeData?.highlights || '',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStudioAllCaptions(data.captions || {});
        setStudioHashtags(data.hashtags || []);
        setStudioPostIdeas(data.postIdeas || []);
        setStudioViralHook(data.viralHook || '');
        setStudioBestTime(data.bestTime || '');

        // Set caption for active platform
        setStudioCaption(data.captions?.instagram || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStudioCaptionLoading(false);
    }
  };

  // Draw Social Studio Canvas Preview
  useEffect(() => {
    if (!studioOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const plat = PLATFORMS[studioPlatform as keyof typeof PLATFORMS] || PLATFORMS.instagram;
    const theme = THEMES[studioPlatform] || THEMES.instagram;

    // Standard preview scaling
    const maxW = Math.min(window.innerWidth - 64, 440);
    const scale = maxW / plat.w;
    canvas.width = plat.w;
    canvas.height = plat.h;
    canvas.style.width = `${plat.w * scale}px`;
    canvas.style.height = `${plat.h * scale}px`;

    const renderOverlay = () => {
      // Draw dark background gradient overlays
      const bottomGrad = ctx.createLinearGradient(0, plat.h * 0.45, 0, plat.h);
      bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bottomGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, 0, plat.w, plat.h);

      // Platform label
      ctx.font = `bold ${Math.round(plat.w * 0.028)}px "Work Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'right';
      ctx.fillText(plat.label, plat.w - 36, 60);

      // Title
      ctx.font = `bold ${Math.round(plat.w * 0.065)}px "Work Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;

      // Draw wrapped text
      let lineY = plat.h * 0.60;
      const wrapText = (text: string, x: number, maxW: number, lineH: number) => {
        const words = text.split(' ');
        let line = '';
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          const testWidth = ctx.measureText(testLine).width;
          if (testWidth > maxW && line) {
            ctx.fillText(line, x, lineY);
            line = word;
            lineY += lineH;
          } else {
            line = testLine;
          }
        }
        if (line) ctx.fillText(line, x, lineY);
      };

      wrapText(studioTitle || 'My Trip Story', 60, plat.w - 120, Math.round(plat.w * 0.075));

      // Caption
      if (studioCaption) {
        ctx.font = `${Math.round(plat.w * 0.036)}px "Work Sans", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.shadowBlur = 6;
        lineY = plat.h * 0.74;
        wrapText(studioCaption, 60, plat.w - 120, Math.round(plat.w * 0.044));
      }

      // Hashtags
      if (studioHashtags.length) {
        const tagText = studioHashtags.slice(0, 5).map(h => `#${h}`).join('  ');
        ctx.font = `600 ${Math.round(plat.w * 0.026)}px "Work Sans", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.70)';
        ctx.textAlign = 'left';
        ctx.shadowBlur = 0;
        ctx.fillText(tagText, 60, plat.h - 60);
      }

      // Branding Watermark
      ctx.font = `600 ${Math.round(plat.w * 0.024)}px "Work Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'right';
      ctx.shadowBlur = 0;
      ctx.fillText('✈ Manivtha Tours', plat.w - 36, plat.h - 36);
    };

    if (studioPhotoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const imgRatio = img.width / img.height;
        const canvRatio = plat.w / plat.h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > canvRatio) {
          sw = img.height * canvRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / canvRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, plat.w, plat.h);
        renderOverlay();
      };
      img.onerror = () => {
        // Fallback gradient
        const grad = ctx.createLinearGradient(0, 0, plat.w, plat.h);
        grad.addColorStop(0, theme.grad1);
        grad.addColorStop(0.5, theme.grad2);
        grad.addColorStop(1, theme.grad3);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, plat.w, plat.h);
        renderOverlay();
      };
      img.src = studioPhotoUrl;
    } else {
      const grad = ctx.createLinearGradient(0, 0, plat.w, plat.h);
      grad.addColorStop(0, theme.grad1);
      grad.addColorStop(0.5, theme.grad2);
      grad.addColorStop(1, theme.grad3);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, plat.w, plat.h);
      renderOverlay();
    }

  }, [studioOpen, studioPlatform, studioPhotoUrl, studioTitle, studioCaption, studioHashtags]);

  // Social Post download trigger
  const downloadSocialPost = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `manivtha-${studioPlatform}-post-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast('Social post downloaded successfully!', 'success');
  };

  // Copy social caption
  const copyStudioCaption = () => {
    const text = studioCaption;
    const tags = studioHashtags.slice(0, 10).map(h => `#${h}`).join(' ');
    navigator.clipboard.writeText(`${text}\n\n${tags}`);
    showToast('Caption and hashtags copied!', 'success');
  };

  // Fetch and display charts inside Analytics
  const loadAnalyticsDashboard = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);

        // Update KPIs
        const kpiTotalEl = document.getElementById('kpiTotal');
        if (kpiTotalEl) kpiTotalEl.textContent = String(data.kpis?.total || 0);
        const kpiRatingEl = document.getElementById('kpiRating');
        if (kpiRatingEl) kpiRatingEl.textContent = String(data.kpis?.avgRating || '—') + ' ★';
        const kpiRatedEl = document.getElementById('kpiRated');
        if (kpiRatedEl) kpiRatedEl.textContent = String(data.kpis?.ratedCount || 0);

        if (data.toneDistribution?.length > 0) {
          const kpiTopToneEl = document.getElementById('kpiTopTone');
          if (kpiTopToneEl) kpiTopToneEl.textContent = data.toneDistribution[0].tone;
        }

        // Draw tables
        const tableArea = document.getElementById('highRatedTable');
        if (tableArea) {
          if (data.recentHighRated?.length > 0) {
            tableArea.innerHTML = `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Rating</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.recentHighRated.map((r: any) => `
                    <tr>
                      <td class="font-bold">${r.driver_name || '—'}</td>
                      <td>${r.route || '—'}</td>
                      <td class="text-secondary font-bold">★ ${r.rating}</td>
                      <td>${r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          } else {
            tableArea.innerHTML = `<p class="text-on-surface-variant font-body-md p-4">No high-rated narratives yet.</p>`;
          }
        }

        // Render charts via window.Chart
        if (chartJsLoaded && (window as any).Chart) {
          const Chart = (window as any).Chart;

          // Destroy previous charts
          Object.values(chartInstances.current).forEach((c: any) => c.destroy());
          chartInstances.current = {};

          // Chart 1: Generations per Day
          const ctxDay = document.getElementById('chartPerDay') as HTMLCanvasElement;
          if (ctxDay && data.perDay) {
            chartInstances.current.day = new Chart(ctxDay, {
              type: 'line',
              data: {
                labels: data.perDay.map((r: any) => r.day),
                datasets: [{
                  label: 'Generations',
                  data: data.perDay.map((r: any) => r.count),
                  borderColor: '#0f52ba',
                  backgroundColor: 'rgba(15, 82, 186, 0.1)',
                  tension: 0.3,
                  fill: true
                }]
              },
              options: { responsive: true, maintainAspectRatio: false }
            });
          }

          // Chart 2: Tone Distribution
          const ctxTone = document.getElementById('chartTone') as HTMLCanvasElement;
          if (ctxTone && data.toneDistribution) {
            chartInstances.current.tone = new Chart(ctxTone, {
              type: 'doughnut',
              data: {
                labels: data.toneDistribution.map((r: any) => r.tone),
                datasets: [{
                  data: data.toneDistribution.map((r: any) => r.count),
                  backgroundColor: ['#003c90', '#fe6f42', '#006358', '#ba1a1a', '#737784']
                }]
              },
              options: { responsive: true, maintainAspectRatio: false }
            });
          }

          // Chart 3: Ratings
          const ctxRatings = document.getElementById('chartRatings') as HTMLCanvasElement;
          if (ctxRatings && data.ratingDist) {
            chartInstances.current.ratings = new Chart(ctxRatings, {
              type: 'bar',
              data: {
                labels: data.ratingDist.map((r: any) => `${r.rating}★`),
                datasets: [{
                  label: 'Reviews Count',
                  data: data.ratingDist.map((r: any) => r.count),
                  backgroundColor: '#fe6f42'
                }]
              },
              options: { responsive: true, maintainAspectRatio: false }
            });
          }

          // Chart 4: Routes
          const ctxRoutes = document.getElementById('chartRoutes') as HTMLCanvasElement;
          if (ctxRoutes && data.topRoutes) {
            chartInstances.current.routes = new Chart(ctxRoutes, {
              type: 'bar',
              data: {
                labels: data.topRoutes.map((r: any) => r.route.slice(0, 15) + '..'),
                datasets: [{
                  label: 'Trips',
                  data: data.topRoutes.map((r: any) => r.count),
                  backgroundColor: '#006358'
                }]
              },
              options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
            });
          }

          // Chart 5: Drivers
          const ctxDrivers = document.getElementById('chartDrivers') as HTMLCanvasElement;
          if (ctxDrivers && data.topDrivers) {
            chartInstances.current.drivers = new Chart(ctxDrivers, {
              type: 'pie',
              data: {
                labels: data.topDrivers.map((r: any) => r.driver_name),
                datasets: [{
                  data: data.topDrivers.map((r: any) => r.count),
                  backgroundColor: ['#0f52ba', '#fe6f42', '#62e2ce', '#ffdbd0', '#c3c6d5']
                }]
              },
              options: { responsive: true, maintainAspectRatio: false }
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeView === 'analytics') {
      loadAnalyticsDashboard();
    }
  }, [activeView, chartJsLoaded]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
        strategy="lazyOnload"
        onLoad={() => setChartJsLoaded(true)}
      />

      {/* Toast popup */}
      {toast.type && (
        <div
          id="toast"
          className={`show ${toast.type === 'success' ? 'success' : toast.type === 'error' ? 'error' : 'info'}`}
          role="status"
          aria-live="assertive"
        >
          {toast.message}
        </div>
      )}

      {/* GLOBAL NAVIGATION HEADER */}
      <header className="glass-nav shadow-sm sticky top-0 z-50 border-b border-outline-variant/50">
        <nav className="flex justify-between items-center w-full px-4 lg:px-margin-desktop py-4 max-w-container-max mx-auto gap-4">
          <div className="flex-shrink-0 flex items-center">
            <Link href="#explore" className="font-headline-md text-headline-md font-bold text-primary whitespace-nowrap hover:opacity-90 transition-opacity">
              Manivtha Tours
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden lg:flex flex-1 justify-evenly items-center gap-4 xl:gap-6 font-body-md">
            <Link href="#explore" className={`nav-link pb-0.5 whitespace-nowrap ${activeView === 'explore' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary transition-colors'}`}>Explore</Link>
            <Link href="#history" className={`nav-link pb-0.5 whitespace-nowrap ${activeView === 'history' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary transition-colors'}`}>My Narratives</Link>
            <Link href="#generate" className={`nav-link pb-0.5 whitespace-nowrap ${activeView === 'generate' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary transition-colors'}`}>Create New</Link>
            <Link href="#analytics" className={`nav-link pb-0.5 whitespace-nowrap ${activeView === 'analytics' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary transition-colors'}`}>Analytics</Link>
            <Link href="#about" className={`nav-link pb-0.5 whitespace-nowrap ${activeView === 'about' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary transition-colors'}`}>About</Link>
            <Link href="#contact" className={`nav-link pb-0.5 whitespace-nowrap ${activeView === 'contact' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary transition-colors'}`}>Contact</Link>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 flex-shrink-0">
            {/* Search bar */}
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-full border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>search</span>
              <input
                type="search"
                placeholder="Search stories..."
                value={exploreSearch}
                onChange={e => setExploreSearch(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm w-28 xl:w-44 font-body-md text-on-surface placeholder:text-outline outline-none"
              />
            </div>

            {/* Notifications */}
            <button className="p-2 hover:bg-surface-container rounded-lg transition-all text-on-surface-variant hover:text-primary" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>

            {/* Create CTA */}
            <Link href="#generate" className="hidden sm:flex items-center gap-2 bg-primary-container text-white px-4 md:px-5 py-2 rounded-full font-label-md text-label-md hover:shadow-primary transition-all active:scale-95">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span className="hidden md:inline">Create</span>
            </Link>

            {/* Auth displays */}
            {user ? (
              <div className="flex items-center gap-2 ml-1 relative">
                <div
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-9 h-9 rounded-full bg-primary-container overflow-hidden border-2 border-primary cursor-pointer flex items-center justify-center text-white font-bold text-sm hover:scale-105 transition-transform"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    (user.displayName || user.email || 'A')[0].toUpperCase()
                  )}
                </div>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-11 w-48 bg-white border border-outline-variant rounded-2xl shadow-ambient py-2 z-50">
                    <div className="px-4 py-2 border-b border-outline-variant/50">
                      <p className="text-xs font-bold text-on-surface truncate">{user.displayName || 'User'}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{user.email}</p>
                    </div>
                    <button onClick={openEditProfile} className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">edit</span> Edit Profile
                    </button>
                    {user.role === 'Admin' && (
                      <Link href="/admin" className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2 border-t border-outline-variant/30">
                        <span className="material-symbols-outlined text-base">security</span> Admin Panel
                      </Link>
                    )}
                    <Link href="/dashboard" className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2 border-t border-outline-variant/30">
                      <span className="material-symbols-outlined text-base">dashboard</span> Dashboard
                    </Link>
                    <button onClick={() => logout()} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container/20 transition-colors flex items-center gap-2 border-t border-outline-variant/30">
                      <span className="material-symbols-outlined text-base text-error">logout</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="bg-primary text-white px-5 py-2 rounded-full font-label-md text-label-md hover:shadow-primary transition-all">
                Sign In
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-all"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </nav>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-outline-variant bg-surface">
            <div className="flex flex-col px-4 py-3 gap-1">
              <Link href="#explore" className="nav-link py-3 px-4 rounded-xl text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors font-body-md">Explore</Link>
              <Link href="#history" className="nav-link py-3 px-4 rounded-xl text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors font-body-md">My Narratives</Link>
              <Link href="#generate" className="nav-link py-3 px-4 rounded-xl text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors font-body-md">Create New</Link>
              <Link href="#analytics" className="nav-link py-3 px-4 rounded-xl text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors font-body-md">Analytics</Link>
              <Link href="#about" className="nav-link py-3 px-4 rounded-xl text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors font-body-md">About</Link>
              <Link href="#contact" className="nav-link py-3 px-4 rounded-xl text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors font-body-md">Contact</Link>
              {user?.role === 'Admin' && (
                <Link href="/admin" className="nav-link py-3 px-4 rounded-xl text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors font-body-md">Admin Panel</Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* VIEW: EXPLORE */}
      {activeView === 'explore' && (
        <div id="view-explore" className="view active">
          {/* Hero Section */}
          <section className="relative h-[680px] md:h-[770px] flex items-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80" alt="Lake sunrise" className="w-full h-full object-cover" />
              <div className="absolute inset-0 hero-gradient"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-transparent"></div>
            </div>
            <div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
              <div className="max-w-2xl text-white">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-white/30 text-sm font-semibold text-primary mb-6">
                  <span className="material-symbols-outlined ms-filled" style={{ fontSize: '18px', color: '#fe6f42' }}>auto_awesome</span>
                  AI-Powered Storytelling
                </div>
                <h1 className="font-display-lg text-display-lg mb-6 leading-tight">
                  Your Journey,<br />
                  <span style={{ color: '#ffb59f' }}>Perfectly Narrated.</span>
                </h1>
                <p className="font-body-lg text-body-lg mb-10 text-white/90">
                  Turn your raw travel photos and scattered notes into immersive, AI-crafted narratives. Share the soul of your adventure, not just the itinerary.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="#generate" className="bg-secondary-container text-white px-8 py-4 rounded-xl font-headline-md shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 text-center">
                    Start Your Story
                  </Link>
                  <Link href="#history" className="glass-card text-on-surface px-8 py-4 rounded-xl font-headline-md border border-white/30 hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">play_circle</span>
                    My Narratives
                  </Link>
                </div>
              </div>
            </div>
            <div className="absolute bottom-12 right-8 hidden lg:block">
              <div className="glass-card p-6 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-4">
                <div className="bg-secondary-fixed w-12 h-12 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary ms-filled">auto_awesome</span>
                </div>
                <div>
                  <p className="font-bold text-primary">{heroTotal}</p>
                  <p className="text-sm text-on-surface-variant">Stories generated</p>
                </div>
              </div>
            </div>
          </section>

          {/* Bento grid */}
          <section className="py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Magic in Every Milestone</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto font-body-md">
                Our AI analyzes your trip details and emotions to craft a travelogue that feels as real as the journey itself.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <div className="bg-white p-8 rounded-3xl shadow-ambient border border-outline-variant hover:shadow-ambient-lg transition-shadow group">
                <div className="w-14 h-14 bg-primary-fixed rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-3xl">edit_note</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">Enter Trip Details</h3>
                <p className="text-on-surface-variant font-body-md">Share your route, driver, highlights, and tone. Our engine processes them instantly.</p>
              </div>
              <div className="bg-primary text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-white text-3xl">psychology</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md mb-3">AI Synthesis</h3>
                  <p className="text-white/80 font-body-md">Gemini AI analyzes context, route, and sentiment to weave a cohesive, emotive narrative.</p>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-ambient border border-outline-variant hover:shadow-ambient-lg transition-shadow group">
                <div className="w-14 h-14 bg-tertiary-fixed rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-tertiary text-3xl">record_voice_over</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">Narrate & Share</h3>
                <p className="text-on-surface-variant font-body-md">Listen to your story read aloud, rate it, copy, download, and share across platforms.</p>
              </div>
            </div>
          </section>

          {/* Explore Community Stories Grid */}
          <section className="bg-surface-container-low py-24">
            <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Recent Community Stories</h2>
                  <p className="text-on-surface-variant font-body-md">Latest road trips and journeys shared by our users.</p>
                </div>
                <Link href="#history" className="text-primary font-label-md flex items-center gap-2 hover:gap-4 transition-all">
                  View My History <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>

              {exploreLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                  <div className="bg-white rounded-3xl overflow-hidden border border-outline-variant shadow-ambient h-[420px] skeleton"></div>
                  <div className="bg-white rounded-3xl overflow-hidden border border-outline-variant shadow-ambient h-[420px] skeleton hidden md:block"></div>
                  <div className="bg-white rounded-3xl overflow-hidden border border-outline-variant shadow-ambient h-[420px] skeleton hidden lg:block"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {exploreRecords.map((rec, i) => {
                    const img = rec.image_url || CARD_IMAGES[i % CARD_IMAGES.length];
                    const tone = rec.tone || 'Adventurous';
                    const meta = TONE_META[tone] || TONE_META.Adventurous;
                    const excerpt = (rec.summary || rec.title || '').replace(/#+\s*/g, '').slice(0, 110) + '…';
                    
                    let dateStr = '';
                    if (rec.trip_date) {
                      dateStr = new Date(rec.trip_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    }

                    return (
                      <div key={rec.id} className="group bg-white rounded-3xl overflow-hidden border border-outline-variant hover:shadow-ambient-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-[480px]">
                        <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => openDetailModal(rec.id)}>
                          <img src={img} alt={rec.route} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          <div className={`absolute top-4 left-4 glass-card px-3 py-1 rounded-full text-xs font-bold ${meta.color}`}>
                            {meta.icon} {tone}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWishlistExplore(rec.id); }}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                          >
                            <span className={`material-symbols-outlined ${rec.is_wishlisted ? 'text-red-500 ms-filled' : 'text-outline-variant hover:text-red-500'}`} style={{ fontSize: '20px' }}>
                              favorite
                            </span>
                          </button>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-outline text-xs mb-2 font-label-md">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_today</span>
                                {dateStr}
                              </span>
                              <span>📍 {rec.destination || 'Hyderabad'}</span>
                            </div>
                            <h3 className="font-headline-md text-headline-md text-on-surface mb-2 cursor-pointer hover:text-primary transition-colors line-clamp-1" onClick={() => openDetailModal(rec.id)}>
                              {rec.title || rec.route}
                            </h3>
                            <p className="text-on-surface-variant font-body-md text-sm line-clamp-3 mb-4">{excerpt}</p>
                          </div>
                          <div className="border-t border-outline-variant/50 pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-[10px]">
                                {(rec.displayName || 'U')[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-on-surface leading-tight">{rec.displayName || 'Creator'}</span>
                                <span className="text-[10px] text-outline">Driver: {rec.driver_name}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              {rec.avg_rating ? (
                                <span style={{ color: '#fe6f42', fontSize: '12px', fontWeight: '700' }}>★ {rec.avg_rating} ({rec.ratings_count})</span>
                              ) : (
                                <span className="text-xs text-outline font-semibold">Unrated</span>
                              )}
                              <span className="text-[10px] text-outline mt-0.5">❤️ {rec.wishlist_count || 0} Saves · 🔗 {rec.shares_count || 0} Shares</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explore Pagination */}
              {exploreTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  <button
                    disabled={explorePage === 1}
                    onClick={() => setExplorePage(p => p - 1)}
                    className="page-btn"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: exploreTotalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setExplorePage(idx + 1)}
                      className={`page-btn ${explorePage === idx + 1 ? 'active' : ''}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    disabled={explorePage === exploreTotalPages}
                    onClick={() => setExplorePage(p => p + 1)}
                    className="page-btn"
                  >
                    &gt;
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* CTA and Footer */}
          <section className="py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
            <div className="bg-primary-container rounded-[2.5rem] p-12 md:p-24 text-center text-white relative overflow-hidden">
              <h2 className="font-display-lg text-display-lg mb-6">Ready to tell your story?</h2>
              <p className="font-body-lg text-body-lg mb-12 text-on-primary-container/90 max-w-2xl mx-auto">
                Join Manivtha's AI-powered narrative platform. Transform any trip into a compelling story in seconds.
              </p>
              <div className="flex justify-center">
                <Link href="#generate" className="bg-secondary-container text-white px-10 py-5 rounded-2xl font-headline-md shadow-2xl hover:bg-secondary transition-all active:scale-95">
                  Generate Your First Story
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* VIEW: GENERATE WIZARD */}
      {activeView === 'generate' && (
        <div id="view-generate" className="view active">
          <main className="flex-grow flex flex-col items-center py-16 px-margin-mobile md:px-margin-desktop min-h-[80vh] bg-background">
            <div className="w-full max-w-4xl">
              {/* Progress Indicator */}
              <div className="mb-12 relative">
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>1</div>
                    <span className={`font-label-md text-label-md ${step >= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>Trip Details</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>2</div>
                    <span className={`font-label-md text-label-md ${step >= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>Moments</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>3</div>
                    <span className={`font-label-md text-label-md ${step >= 3 ? 'text-primary' : 'text-on-surface-variant'}`}>Narrative</span>
                  </div>
                </div>
                <div className="absolute top-5 left-0 w-full h-0.5 bg-surface-container-high -z-0">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step - 1) * 50}%` }}></div>
                </div>
              </div>

              {/* Form card */}
              <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant overflow-hidden min-h-[500px] flex flex-col relative">
                
                {/* STEP 1 */}
                {step === 1 && (
                  <section className="p-8 md:p-12 space-y-8">
                    <div className="space-y-2">
                      <h1 className="font-headline-lg text-headline-lg text-primary">Where did your heart wander?</h1>
                      <p className="font-body-lg text-body-lg text-on-surface-variant">Let's start with the coordinates of your journey.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface block">Driver / Staff Name *</label>
                        <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g., Ravi Kumar" className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white text-on-surface font-body-md" />
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface block">Starting Location</label>
                        <input type="text" value={startingLocation} onChange={e => setStartingLocation(e.target.value)} placeholder="e.g., Hyderabad" className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white text-on-surface font-body-md" />
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface block">Destination *</label>
                        <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g., Araku Valley" className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white text-on-surface font-body-md" />
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface block">Trip Date</label>
                        <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white text-on-surface font-body-md" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="font-label-md text-label-md text-on-surface block">Trip Title</label>
                        <div className="flex gap-2">
                          <input type="text" value={tripTitle} onChange={e => setTripTitle(e.target.value)} placeholder="e.g., Scenic Araku Road Trip" className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white text-on-surface font-body-md flex-1" />
                          <button type="button" onClick={suggestTitle} disabled={suggestTitleLoading} className="bg-surface-container hover:bg-surface-container-high text-primary px-4 rounded-lg font-label-md transition-all flex items-center justify-center whitespace-nowrap min-w-[100px]">
                            {suggestTitleLoading ? 'Suggesting..' : 'Suggest'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface block">Vehicle</label>
                        <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white text-on-surface font-body-md">
                          <option value="Sedan">🚗 Sedan</option>
                          <option value="SUV">🚙 SUV</option>
                          <option value="Innova Crysta">🚕 Innova Crysta</option>
                          <option value="Tempo Traveller">🚐 Tempo Traveller</option>
                          <option value="Luxury Sedan">✨ Luxury Sedan</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface block">Mood</label>
                        <select value={mood} onChange={e => setMood(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white text-on-surface font-body-md">
                          <option value="Adventurous">⚡ Adventurous</option>
                          <option value="Poetic">🌸 Poetic</option>
                          <option value="Informative">📖 Informative</option>
                          <option value="Humorous">😄 Humorous</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button type="button" onClick={() => goToStep(2)} className="bg-secondary-container text-white px-10 py-4 rounded-full font-label-md text-label-md flex items-center gap-2 hover:shadow-lg transition-all active:scale-95">
                        Continue to Moments <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <section className="p-8 md:p-12 space-y-8">
                    <div className="space-y-2">
                      <h2 className="font-headline-lg text-headline-lg text-primary">Your captured moments</h2>
                      <p className="font-body-lg text-body-lg text-on-surface-variant">Add landmarks and highlights to enrich your narrative.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface block">Landmarks Visited</label>
                        <textarea value={landmarks} onChange={e => setLandmarks(e.target.value)} rows={3} placeholder="e.g., Borra Caves, Coffee Plantations, Katiki Waterfalls" className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary outline-none transition-all bg-white text-on-surface font-body-md resize-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-label-md text-on-surface block">Highlights</label>
                        <textarea value={highlights} onChange={e => setHighlights(e.target.value)} rows={3} placeholder="e.g., Misty morning coffee, curvy ghat roads, smooth driving by Ravi" className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary outline-none transition-all bg-white text-on-surface font-body-md resize-none" />
                      </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div>
                      <input type="file" id="photoFileInput" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                      <div
                        id="photoDropZone"
                        onClick={triggerBrowse}
                        className="p-8 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-outline-variant rounded-2xl hover:border-primary hover:bg-primary-fixed/20 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                        <div className="text-center">
                          <p className="font-bold text-on-surface">Drop photos here or click to browse</p>
                          <p className="text-xs text-outline mt-1">Up to 20 images · Max 5 MB each</p>
                        </div>
                      </div>

                      {uploadedPhotos.length > 0 && (
                        <div className="grid grid-cols-5 md:grid-cols-10 gap-3 mt-4">
                          {uploadedPhotos.map((p, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-md">
                              <img src={p.url} alt="upload" className="w-full h-full object-cover" />
                              <button onClick={(e) => { e.stopPropagation(); removePhoto(idx); }} className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-black">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex justify-between">
                      <button type="button" onClick={() => goToStep(1)} className="text-on-surface-variant px-6 py-4 rounded-full font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined">arrow_back</span> Back
                      </button>
                      <button type="button" onClick={handleGenerate} className="bg-secondary-container text-white px-10 py-4 rounded-full font-label-md text-label-md flex items-center gap-2 hover:shadow-lg transition-all active:scale-95">
                        Generate Narrative <span className="material-symbols-outlined">magic_button</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* STEP 3 */}
                {step === 3 && lastNarrativeData && (
                  <section className="p-8 md:p-12 space-y-8">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h2 className="font-headline-lg text-headline-lg text-primary">{lastNarrativeData.title}</h2>
                        <p className="font-body-lg text-body-lg text-on-surface-variant">AI-generated travel narrative</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={copyNarrative} className="p-2 hover:bg-surface-container rounded-lg text-primary" title="Copy"><span className="material-symbols-outlined">content_copy</span></button>
                        <button onClick={downloadNarrative} className="p-2 hover:bg-surface-container rounded-lg text-primary" title="Download"><span className="material-symbols-outlined">download</span></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Left Pane */}
                      <div className="md:col-span-2 space-y-6">
                        {/* TTS Player */}
                        <div className="tts-bar">
                          <button onClick={toggleTTS} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                            <span className="material-symbols-outlined">{ttsPlaying ? 'pause' : 'play_arrow'}</span>
                          </button>
                          <div className="tts-progress flex-1 bg-surface-container-high rounded-full overflow-hidden h-1">
                            <div className="bg-primary h-full transition-all" style={{ width: `${ttsProgress}%` }} />
                          </div>
                          <span className="text-sm font-label-md">{ttsTimerText}</span>
                          <button onClick={stopTTS} className="p-1 hover:bg-surface-container rounded"><span className="material-symbols-outlined">stop</span></button>
                        </div>

                        {/* Narrative body */}
                        <div className="narrative-prose p-6 bg-background rounded-xl border border-outline-variant shadow-inner text-on-surface whitespace-pre-line leading-relaxed">
                          {lastNarrativeData.narrative}
                        </div>

                        {/* Generated Photos list */}
                        {photosList.length > 0 && (
                          <div className="mt-6">
                            <h3 className="font-headline-md text-headline-md text-primary mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined">photo_library</span> Trip Photos
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {photosList.map((p: any) => (
                                <div key={p.photoId} onClick={() => openPhotoEditor(p.url, p.filename, p.photoId)} className="group relative aspect-video rounded-xl overflow-hidden shadow-md cursor-pointer border border-outline-variant hover:scale-[1.02] transition-all">
                                  <img src={p.url} alt={p.filename} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                                    Edit Photo
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Summary & Social Caption */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-5 bg-surface-container-low rounded-xl border border-outline-variant">
                            <p className="font-bold text-primary mb-1">📝 AI Summary</p>
                            <p className="text-sm text-on-surface-variant">{lastNarrativeData.summary}</p>
                          </div>
                          <div className="p-5 bg-surface-container-low rounded-xl border border-outline-variant">
                            <p className="font-bold text-primary mb-1">🏷 Social Caption</p>
                            <p className="text-sm text-on-surface-variant">{lastNarrativeData.socialCaption}</p>
                          </div>
                        </div>

                        {/* Social Studio integration */}
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary to-secondary-container text-white flex items-center justify-between gap-4 shadow-lg">
                          <div>
                            <p className="font-bold text-lg">✨ Create Social Post</p>
                            <p className="text-xs opacity-90">Design a custom template post for Instagram & Twitter</p>
                          </div>
                          <button onClick={() => openSocialPostStudio(photosList[0]?.url || '')} className="bg-white text-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-fixed transition-all shadow-md">
                            Open Studio
                          </button>
                        </div>

                        {/* Rating panel */}
                        <div className="border-t border-outline-variant pt-6 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-outline">Rate Narrative</h3>
                          <div className="flex gap-2">
                            {[1,2,3,4,5].map(v => (
                              <span
                                key={v}
                                onClick={() => setRatingVal(v)}
                                onMouseEnter={() => setRatingHover(v)}
                                onMouseLeave={() => setRatingHover(null)}
                                className={`text-3xl cursor-pointer transition-transform ${v <= (ratingHover || ratingVal || 0) ? 'text-secondary-container scale-110' : 'text-outline-variant'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          {ratingVal && (
                            <div className="flex gap-2">
                              <input type="text" value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Add comments..." className="w-full px-4 py-2 border rounded-lg" />
                              <button onClick={submitRating} className="bg-primary text-white px-4 py-2 rounded-lg font-bold">Submit</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Pane stats */}
                      <div className="space-y-6">
                        <div className="p-6 bg-primary-container text-white rounded-xl space-y-4">
                          <p className="font-bold text-lg">Saved to History</p>
                          <p className="text-sm opacity-95">This narrative has been securely synchronized with your account.</p>
                          <Link href="#history" className="block text-center w-full bg-secondary-container text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all">
                            View My History
                          </Link>
                        </div>
                        <button onClick={resetWizard} className="w-full py-3 border border-outline-variant text-on-surface-variant rounded-lg font-bold hover:bg-surface-container-low transition-all">
                          Create Another Story
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Processing Spinner Overlay */}
                {generating && (
                  <div className="absolute inset-0 glass-panel z-20 flex flex-col items-center justify-center gap-6">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <div className="text-center">
                      <p className="font-headline-md text-headline-md text-primary">Weaving your story…</p>
                      <p className="font-body-md text-on-surface-variant">Gemini AI is crafting your narrative.</p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </main>
        </div>
      )}

      {/* VIEW: MY NARRATIVES / HISTORY */}
      {activeView === 'history' && (
        <div id="view-history" className="view active">
          <main className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-12 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-gutter mb-12">
              <div className="space-y-2">
                <h1 className="font-headline-lg text-headline-lg text-on-surface">Your AI Narratives</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant">Relive your adventures through beautifully curated AI stories.</p>
              </div>
              <Link href="#generate" className="bg-secondary-container text-white px-8 py-4 rounded-xl font-label-md text-label-md flex items-center gap-2 shadow-ambient hover:shadow-lg transition-all active:scale-95">
                Create New Narrative
              </Link>
            </header>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-12">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">auto_stories</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant">Total Narratives</p>
                  <p className="font-headline-md text-headline-md">{historyTotal}</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined">route</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant">Unique Routes</p>
                  <p className="font-headline-md text-headline-md">{historyUniqueRoutes}</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">star</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant">Avg. Rating</p>
                  <p className="font-headline-md text-headline-md">{historyAvgRating}</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="mb-8">
              <input
                type="search"
                placeholder="Search history by driver, route, title..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-white text-on-surface outline-none"
              />
            </div>

            {/* Narrative grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {historyRecords.map((rec, i) => {
                const img = rec.image_url || CARD_IMAGES[i % CARD_IMAGES.length];
                return (
                  <div key={rec.id} className="bg-white rounded-3xl overflow-hidden border border-outline-variant shadow-ambient hover:shadow-ambient-lg transition-all duration-300 flex flex-col h-[400px]">
                    <div className="relative h-44 cursor-pointer" onClick={() => openDetailModal(rec.id)}>
                      <img src={img} alt="trip" className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4 bg-primary-container text-white text-xs px-3 py-1 rounded-full font-bold">
                        {rec.tone}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-outline">📍 {rec.destination || 'Hyderabad'}</p>
                        <h3 className="font-bold text-lg text-on-surface mt-1 cursor-pointer line-clamp-1" onClick={() => openDetailModal(rec.id)}>{rec.title || rec.route}</h3>
                        <p className="text-sm text-on-surface-variant line-clamp-3 mt-2">{rec.summary}</p>
                      </div>
                      <div className="border-t pt-4 flex items-center justify-between text-xs text-outline">
                        <span>Driver: {rec.driver_name}</span>
                        <span>Avg Rating: {rec.avg_rating || '—'} ★</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {historyTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {Array.from({ length: historyTotalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHistoryPage(idx + 1)}
                    className={`page-btn ${historyPage === idx + 1 ? 'active' : ''}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      )}

      {/* VIEW: ANALYTICS */}
      {activeView === 'analytics' && (
        <div id="view-analytics" className="view active">
          <main className="max-w-container-max mx-auto px-4 md:px-margin-desktop py-12 min-h-screen">
            <header className="mb-12">
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Analytics Dashboard</h1>
              <p className="font-body-md text-on-surface-variant">Real-time insights into narrative generation activity and quality.</p>
            </header>

            {/* KPI Displays */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-10">
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient flex flex-col gap-2">
                <span className="material-symbols-outlined text-secondary-container" style={{ fontSize: '28px' }}>auto_stories</span>
                <div className="font-display-lg text-3xl font-bold text-on-surface" id="kpiTotal">—</div>
                <div className="font-label-md text-label-md text-on-surface-variant">Total Stories</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient flex flex-col gap-2">
                <span className="material-symbols-outlined text-secondary-container" style={{ fontSize: '28px' }}>star</span>
                <div className="font-display-lg text-3xl font-bold text-on-surface" id="kpiRating">—</div>
                <div className="font-label-md text-label-md text-on-surface-variant">Avg. Rating</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient flex flex-col gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>record_voice_over</span>
                <div className="font-display-lg text-3xl font-bold text-on-surface" id="kpiTopTone">—</div>
                <div className="font-label-md text-label-md text-on-surface-variant">Top Tone</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient flex flex-col gap-2">
                <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '28px' }}>check_circle</span>
                <div className="font-display-lg text-3xl font-bold text-on-surface" id="kpiRated">—</div>
                <div className="font-label-md text-label-md text-on-surface-variant">Rated Stories</div>
              </div>
            </div>

            {/* Chart Canvas Holders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-8">
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient">
                <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">📈 Generations (Last 30 Days)</h3>
                <div className="h-56"><canvas id="chartPerDay"></canvas></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient">
                <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">🎭 Tone Distribution</h3>
                <div className="h-56"><canvas id="chartTone"></canvas></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient">
                <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">⭐ Rating Dist.</h3>
                <div className="h-48"><canvas id="chartRatings"></canvas></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient">
                <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">🗺️ Top Routes</h3>
                <div className="h-48"><canvas id="chartRoutes"></canvas></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient">
                <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">👤 Top Drivers</h3>
                <div className="h-48"><canvas id="chartDrivers"></canvas></div>
              </div>
            </div>

            {/* High-Rated Table */}
            <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-ambient">
              <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">🏆 Recent High-Rated (4–5 ★)</h3>
              <div className="overflow-x-auto" id="highRatedTable">
                <p className="text-on-surface-variant p-4 font-body-md">Loading…</p>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* VIEW: ABOUT */}
      {activeView === 'about' && (
        <div id="view-about" className="view active">
          <main className="flex-grow py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto min-h-[80vh]">
            <div className="bg-surface-container-lowest rounded-[2rem] p-10 md:p-16 shadow-ambient border border-outline-variant max-w-4xl mx-auto">
              <h1 className="font-display-lg text-primary mb-6 text-4xl font-bold">About Manivtha Tours</h1>
              <div className="narrative-prose leading-relaxed space-y-4">
                <p>
                  Manivtha Tours & Travels is a premium chauffeur-driven car rental service based in Hyderabad, India. We specialize in curating unforgettable road trips across South India, ensuring every journey is safe, comfortable, and memorable.
                </p>
                <p>
                  With our AI Narrative Generator, we're taking the experience a step further by helping you turn your travel memories into beautiful stories that you can keep forever.
                </p>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* VIEW: CONTACT */}
      {activeView === 'contact' && (
        <div id="view-contact" className="view active">
          <main className="flex-grow py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto min-h-[80vh]">
            <div className="bg-surface-container-lowest rounded-[2rem] p-10 md:p-16 shadow-ambient border border-outline-variant max-w-2xl mx-auto">
              <h1 className="font-display-lg text-primary mb-6 text-center text-4xl font-bold">Contact Us</h1>
              <p className="font-body-md text-on-surface-variant text-center mb-8">Have a question or want to book a trip? Let us know!</p>
              <form className="space-y-6" onSubmit={e => { e.preventDefault(); showToast('Message sent! We will get back to you shortly.', 'success'); }}>
                <div className="space-y-2">
                  <label className="font-label-md text-on-surface block">Name</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary outline-none bg-white text-on-surface" />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-on-surface block">Email</label>
                  <input type="email" required className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary outline-none bg-white text-on-surface" />
                </div>
                <div className="space-y-2">
                  <label className="font-label-md text-on-surface block">Message</label>
                  <textarea required rows={4} className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary outline-none bg-white text-on-surface" />
                </div>
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-headline-md shadow-md hover:bg-primary-container transition-all">
                  Send Message
                </button>
              </form>
            </div>
          </main>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedNarrative && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl">
            <button onClick={() => setDetailModalOpen(false)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high text-xl">&times;</button>
            <h2 className="font-bold text-2xl text-primary mb-2">{selectedNarrative.title}</h2>
            <p className="text-xs text-outline mb-6">📍 Route: {selectedNarrative.route} · Driver: {selectedNarrative.driver_name}</p>
            <div className="narrative-prose leading-relaxed whitespace-pre-line">{selectedNarrative.narrative}</div>
            
            {photosList.length > 0 && (
              <div className="mt-8">
                <p className="font-bold text-primary mb-3">Narrative Photos</p>
                <div className="grid grid-cols-3 gap-3">
                  {photosList.map((p: any) => (
                    <div key={p.photoId} className="aspect-video rounded-xl overflow-hidden shadow">
                      <img src={p.url} alt="trip" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editProfileOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative border border-outline-variant/60 shadow-2xl">
            <button onClick={() => setEditProfileOpen(false)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high text-xl">&times;</button>
            <h2 className="text-lg font-bold text-primary mb-6">Edit Profile</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Display Name</label>
                <input type="text" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-transparent text-on-surface outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Avatar URL</label>
                <input type="url" value={editPhotoURL} onChange={e => setEditPhotoURL(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-transparent text-on-surface outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditProfileOpen(false)} className="flex-1 bg-surface-container-high py-3 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI PHOTO STUDIO EDITOR MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <div>
                <h2 className="font-bold text-xl text-primary">AI Photo Studio</h2>
                <p className="text-xs text-on-surface-variant">Edit, enhance with AI, generate &amp; share</p>
              </div>
              <button onClick={() => setEditorOpen(false)} className="text-2xl font-semibold">&times;</button>
            </div>

            <div className="flex gap-2 px-6 pt-4 border-b border-outline-variant pb-4">
              <button onClick={() => switchEditorTab('edit')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${editorActiveTab === 'edit' ? 'active-tab' : 'inactive-tab'}`}>✏️ Edit</button>
              <button onClick={() => switchEditorTab('ai-enhance')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${editorActiveTab === 'ai-enhance' ? 'active-tab' : 'inactive-tab'}`}>🤖 AI Enhance</button>
              <button onClick={() => switchEditorTab('ai-generate')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${editorActiveTab === 'ai-generate' ? 'active-tab' : 'inactive-tab'}`}>✨ AI Generate</button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preview image */}
              <div className="space-y-4">
                <div id="editorPreviewWrapper" className={`relative rounded-2xl overflow-hidden bg-surface-container shadow-inner ${editorAspect === '1:1' ? 'aspect-square' : editorAspect === '4:5' ? 'aspect-[4/5]' : editorAspect === '16:9' ? 'aspect-video' : ''}`}>
                  <img src={editorSrcUrl} alt="preview" style={getEditorFilterStyle()} className="w-full object-cover max-h-[300px]" />
                  {editorText && (
                    <div className="absolute bottom-4 left-0 right-0 text-center font-bold text-white text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none px-4">
                      {editorText}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {['original', '1:1', '4:5', '16:9'].map(ratio => (
                    <button key={ratio} onClick={() => setEditorAspect(ratio)} className={`aspect-chip ${editorAspect === ratio ? 'active' : ''}`}>{ratio}</button>
                  ))}
                </div>
                <button onClick={() => openSocialPostStudio()} className="w-full bg-gradient-to-r from-primary to-secondary-container text-white py-3 rounded-xl font-bold">
                  Open Post Studio
                </button>
              </div>

              {/* Control panels */}
              <div className="space-y-6">
                {editorActiveTab === 'edit' && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Filters</p>
                      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {FILTERS.map(f => (
                          <button key={f.id} onClick={() => setEditorFilter(f.id)} className={`flex-shrink-0 flex flex-col items-center p-1 rounded-xl border-2 ${editorFilter === f.id ? 'border-primary' : 'border-transparent'}`}>
                            <div className="w-12 h-12 rounded overflow-hidden">
                              <img src={editorSrcUrl} alt={f.label} style={{ filter: f.css }} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] mt-1">{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold"><span>Brightness</span><span>{editorBrightness}%</span></div>
                        <input type="range" min="50" max="150" value={editorBrightness} onChange={e => setEditorBrightness(Number(e.target.value))} className="editor-slider" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold"><span>Contrast</span><span>{editorContrast}%</span></div>
                        <input type="range" min="50" max="150" value={editorContrast} onChange={e => setEditorContrast(Number(e.target.value))} className="editor-slider" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold"><span>Saturation</span><span>{editorSaturation}%</span></div>
                        <input type="range" min="0" max="200" value={editorSaturation} onChange={e => setEditorSaturation(Number(e.target.value))} className="editor-slider" />
                      </div>
                    </div>

                    <div className="space-y-1 pt-3 border-t">
                      <label className="text-xs font-bold text-outline block">Text Overlay</label>
                      <input type="text" value={editorText} onChange={e => setEditorText(e.target.value)} placeholder="Add caption to photo..." className="w-full px-4 py-2 border rounded-lg text-sm bg-white" />
                    </div>
                  </div>
                )}

                {editorActiveTab === 'ai-enhance' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-primary-fixed/20 border border-primary/20 rounded-xl">
                      <p className="font-bold text-primary mb-1">🤖 Gemini Photo Analysis</p>
                      <p className="text-xs text-on-surface-variant mb-4">Gemini analyzes this photo contextually to suggest optimal adjustments and write high-engagement captions.</p>
                      <button onClick={runAIAnalyze} disabled={editorAiAnalyzeLoading} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm">
                        {editorAiAnalyzeLoading ? 'Analyzing...' : 'Analyze with Gemini AI'}
                      </button>
                    </div>

                    {editorAiAnalyzeLoading && (
                      <div className="flex flex-col items-center py-6 gap-2">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-xs text-outline">Extracting visual highlights...</p>
                      </div>
                    )}

                    {editorAiAnalysis && (
                      <div className="space-y-3 p-4 bg-surface-container-low rounded-xl text-xs leading-relaxed text-on-surface-variant">
                        <p><b>Predicted Mood:</b> {editorAiAnalysis.mood}</p>
                        <p><b>Filter Suggestion:</b> {editorAiAnalysis.suggestedFilter}</p>
                        <p><b>Analysis:</b> {editorAiAnalysis.scene}</p>
                        <p><b>Tip:</b> {editorAiAnalysis.enhancement}</p>
                      </div>
                    )}
                  </div>
                )}

                {editorActiveTab === 'ai-generate' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-secondary-fixed/30 border border-secondary-container/40 rounded-xl space-y-3">
                      <p className="font-bold text-primary text-sm">🎨 AI Image Generator</p>
                      <input type="text" placeholder="Destination" value={editorAiGenerateDest} onChange={e => setEditorAiGenerateDest(e.target.value)} className="w-full px-3 py-2 border rounded text-xs" />
                      <select value={editorAiGenerateMood} onChange={e => setEditorAiGenerateMood(e.target.value)} className="w-full px-3 py-2 border rounded text-xs bg-white">
                        <option value="Adventurous">⚡ Adventurous</option>
                        <option value="Serene">🌿 Serene &amp; Peaceful</option>
                        <option value="Golden hour">🌅 Golden Hour</option>
                        <option value="Dramatic">🎭 Dramatic</option>
                      </select>
                      <textarea placeholder="Custom visual prompt details..." value={editorAiGeneratePrompt} onChange={e => setEditorAiGeneratePrompt(e.target.value)} className="w-full px-3 py-2 border rounded text-xs resize-none" rows={2} />
                      <button onClick={runAIGenerate} disabled={editorAiGenerateLoading} className="w-full bg-secondary-container text-white py-3 rounded-xl font-bold text-sm">
                        {editorAiGenerateLoading ? 'Painting scene...' : 'Generate AI Image'}
                      </button>
                    </div>

                    {editorAiGenerateLoading && (
                      <div className="flex flex-col items-center py-6 gap-2">
                        <div className="w-8 h-8 border-2 border-secondary-container/20 border-t-secondary-container rounded-full animate-spin"></div>
                        <p className="text-xs text-outline">Generating custom scenery via Gemini Imagen...</p>
                      </div>
                    )}

                    {editorGeneratedImgUrl && (
                      <div className="space-y-2">
                        <img src={editorGeneratedImgUrl} alt="generated" className="w-full rounded-xl object-cover max-h-[160px]" />
                        <button onClick={useGeneratedImage} className="w-full bg-primary text-white py-2 rounded-xl text-xs font-bold">
                          Import into Editor
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOCIAL POST STUDIO MODAL */}
      {studioOpen && (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white max-w-5xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl">post_add</span>
                <div>
                  <h2 className="font-bold text-xl text-primary">Social Post Studio</h2>
                  <p className="text-xs text-on-surface-variant">Design &amp; export templates for Instagram, X/Twitter, WhatsApp</p>
                </div>
              </div>
              <button onClick={() => setStudioOpen(false)} className="text-2xl font-semibold">&times;</button>
            </div>

            <div className="p-4 border-b flex gap-2 overflow-x-auto no-scrollbar">
              {Object.entries(PLATFORMS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setStudioPlatform(key)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${studioPlatform === key ? 'bg-primary text-white' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Canvas Preview Left */}
              <div className="md:w-[45%] p-6 border-r flex flex-col items-center justify-center gap-4 bg-surface-container-low overflow-y-auto">
                <canvas ref={canvasRef} id="studioCanvas" className="max-w-full rounded-xl shadow-lg border border-outline-variant/30"></canvas>
                <div className="flex gap-2 w-full">
                  <button onClick={downloadSocialPost} className="flex-1 bg-primary text-white py-3 rounded-xl text-xs font-bold">Download PNG</button>
                </div>
              </div>

              {/* Controls Right */}
              <div className="md:w-[55%] p-6 overflow-y-auto space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider block">Post Title</label>
                  <input type="text" value={studioTitle} onChange={e => setStudioTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider block">Caption</label>
                  <textarea value={studioCaption} onChange={e => setStudioCaption(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-lg text-sm resize-none" />
                  <button onClick={copyStudioCaption} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">content_copy</span> Copy Caption
                  </button>
                </div>

                {studioCaptionLoading && (
                  <div className="flex items-center gap-2 text-xs text-outline py-2">
                    <div className="w-4 h-4 border border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <span>Gemini is generating caption proposals...</span>
                  </div>
                )}

                {studioViralHook && (
                  <div className="p-4 bg-surface-container-low rounded-xl border-l-4 border-primary space-y-1 text-xs">
                    <p className="font-bold text-primary uppercase">🎯 Viral Hook Option</p>
                    <p className="text-on-surface font-semibold italic">"{studioViralHook}"</p>
                  </div>
                )}
                {studioBestTime && (
                  <p className="text-xs text-outline">🕒 <b>Optimal Timing Suggestion:</b> {studioBestTime}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
