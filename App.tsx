import React, { useState, useRef, useEffect } from 'react';
import { ImageHistoryItem } from './types';
import { editImage, generateModel, ModelAssets } from './services/geminiService';

// --- TYPES ---
type AppMode = 'GENERATING' | 'EDITING';

// --- HELPER COMPONENTS ---

const Spinner: React.FC = () => (
  <svg
    className="animate-spin h-8 w-8 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

interface HeaderProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isEditing: boolean;
  onSwitchToGenerator: () => void;
}

const Header: React.FC<HeaderProps> = ({ onUndo, onRedo, canUndo, canRedo, isEditing, onSwitchToGenerator }) => (
  <header className="flex-shrink-0 flex items-center p-4 bg-background-light dark:bg-background-dark z-10 shadow-md md:shadow-none">
    <button onClick={onSwitchToGenerator} className="text-gray-900 dark:text-gray-100 text-3xl" title="Start New Project">
      <span className="material-symbols-outlined">restart_alt</span>
    </button>
    <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mx-auto">Virtual Model</h1>
    <div className="flex items-center space-x-2">
      <button onClick={onUndo} disabled={!canUndo || !isEditing} className="text-gray-900 dark:text-gray-100 text-3xl disabled:opacity-30 transition-opacity">
        <span className="material-symbols-outlined">undo</span>
      </button>
      <button onClick={onRedo} disabled={!canRedo || !isEditing} className="text-gray-900 dark:text-gray-100 text-3xl disabled:opacity-30 transition-opacity">
        <span className="material-symbols-outlined">redo</span>
      </button>
    </div>
  </header>
);

interface ImageCardProps {
  image: ImageHistoryItem;
  isSelected: boolean;
  onSelect: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, isSelected, onSelect }) => (
    <div 
        className={`relative group cursor-pointer aspect-[3/4] rounded-lg bg-gray-100 dark:bg-gray-800 transition-all duration-300 ${isSelected ? 'border-4 border-primary rounded-xl' : ''}`}
        onClick={onSelect}
    >
        <img src={image.src} alt={image.prompt} className="w-full h-full object-cover rounded-lg"/>
        <div className="absolute top-0 left-0 w-full h-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
    </div>
);

const LoadingCard: React.FC = () => (
    <div className="relative group aspect-[3/4] rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

interface FullScreenViewerProps {
    src: string;
    onClose: () => void;
}

const FullScreenViewer: React.FC<FullScreenViewerProps> = ({ src, onClose }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
        <button className="absolute top-4 right-4 text-white text-4xl hover:opacity-80 transition-opacity">
            <span className="material-icons-outlined">close</span>
        </button>
        <img src={src} alt="Full screen view" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
);

// --- WORKSPACE COMPONENTS ---
interface AssetPreviewProps {
  label: string;
  icon: string;
  imageSrc: string | undefined;
  onRemove: () => void;
}

const AssetPreview: React.FC<AssetPreviewProps> = ({ label, icon, imageSrc, onRemove }) => (
    <div className="relative aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-center p-4">
        {imageSrc ? (
            <>
                <img src={imageSrc} alt={`${label} asset`} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center z-10 hover:bg-black/80 transition-colors"
                    aria-label={`Remove ${label}`}
                >
                    <span className="material-icons-outlined text-sm">close</span>
                </button>
                 <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md font-semibold">{label}</div>
            </>
        ) : (
            <>
                <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-500">{icon}</span>
                <span className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">Add {label}</span>
                <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">Use footer buttons</span>
            </>
        )}
    </div>
);

interface GenerationPreviewProps {
    assets: ModelAssets;
    onRemoveAsset: (type: keyof ModelAssets) => void;
}

const GenerationPreview: React.FC<GenerationPreviewProps> = ({ assets, onRemoveAsset }) => (
    <div className="px-4">
        <p className="text-center text-gray-600 dark:text-gray-300 mb-4">Upload assets using the buttons below to create your virtual model.</p>
        <div className="grid grid-cols-3 gap-3">
            <AssetPreview label="Face" icon="face" imageSrc={assets.face} onRemove={() => onRemoveAsset('face')}/>
            <AssetPreview label="Outfit" icon="checkroom" imageSrc={assets.outfit} onRemove={() => onRemoveAsset('outfit')}/>
            <AssetPreview label="Background" icon="landscape" imageSrc={assets.background} onRemove={() => onRemoveAsset('background')}/>
        </div>
    </div>
);


interface ImageHistoryGridProps {
    history: ImageHistoryItem[];
    currentIndex: number;
    onSelect: (index: number) => void;
    isLoading: boolean;
}

const ImageHistoryGrid: React.FC<ImageHistoryGridProps> = ({ history, currentIndex, onSelect, isLoading }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-4">
       {history.map((image, index) => (
            <ImageCard 
                key={image.id} 
                image={image} 
                isSelected={index === currentIndex} 
                onSelect={() => onSelect(index)} 
            />
       ))}
       {isLoading && <LoadingCard />}
    </div>
);

interface EditingWorkspaceProps {
    currentImageSrc: string | undefined;
    isLoading: boolean;
    onDownload: () => void;
    onFullScreen: () => void;
    onStop: () => void;
}

const EditingWorkspace: React.FC<EditingWorkspaceProps> = ({ currentImageSrc, isLoading, onDownload, onFullScreen, onStop }) => (
    <div className="relative w-full aspect-[3/4] max-w-md mx-auto rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-lg">
        {currentImageSrc && (
            <>
                <img src={currentImageSrc} alt="Current model" className="w-full h-full object-contain" />
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button onClick={onDownload} className="bg-black/50 text-white rounded-full p-3 hover:bg-black/80 transition-colors" title="Download Image"><span className="material-symbols-outlined">download</span></button>
                    <button onClick={onFullScreen} className="bg-black/50 text-white rounded-full p-3 hover:bg-black/80 transition-colors" title="Full Screen"><span className="material-symbols-outlined">fullscreen</span></button>
                </div>
            </>
        )}
        {isLoading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                <Spinner />
                <p className="mt-4 font-semibold text-lg">Applying your edits...</p>
                <p className="text-sm text-gray-300">This can take a moment.</p>
                <button onClick={onStop} className="mt-6 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-600 transition-colors">Stop Generation</button>
            </div>
        )}
    </div>
);

interface EditAssetPreviewProps {
    imageSrc: string;
    label: string;
    onRemove: () => void;
}

const EditAssetPreview: React.FC<EditAssetPreviewProps> = ({ imageSrc, label, onRemove }) => (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-primary">
        <img src={imageSrc} alt={label} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 w-full text-center bg-black/60 text-white text-[10px] font-bold py-0.5">{label}</div>
        <button onClick={onRemove} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors" aria-label={`Remove ${label}`}>
            <span className="material-icons-outlined text-sm">close</span>
        </button>
    </div>
);


// --- MAIN APP ---
const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('GENERATING');
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [assets, setAssets] = useState<ModelAssets>({});
  const [editingAssets, setEditingAssets] = useState<ModelAssets>({});
  const [error, setError] = useState<string | null>(null);
  const [isFullScreenView, setIsFullScreenView] = useState(false);

  const stopGenerationRef = useRef(false);
  const customFileInputRef = useRef<HTMLInputElement>(null);
  const faceFileInputRef = useRef<HTMLInputElement>(null);
  const outfitFileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const editFaceRef = useRef<HTMLInputElement>(null);
  const editOutfitRef = useRef<HTMLInputElement>(null); // For reference
  const editBackgroundRef = useRef<HTMLInputElement>(null);

  const currentImage = history[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const handleImageUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject('Failed to read file');
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleCustomUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setIsLoading(true);
        setError(null);
        try {
            const dataUrl = await handleImageUpload(event.target.files[0]);
            const newItem: ImageHistoryItem = { id: crypto.randomUUID(), src: dataUrl, prompt: 'Initial image' };
            setHistory([newItem]);
            setCurrentIndex(0);
            setMode('EDITING');
        } catch (err) { setError('Failed to upload image.'); } finally {
            setIsLoading(false);
            event.target.value = '';
        }
    }
  };

  const handleAssetUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: keyof ModelAssets, target: 'generate' | 'edit') => {
    if (event.target.files && event.target.files[0]) {
        try {
            const dataUrl = await handleImageUpload(event.target.files[0]);
            if (target === 'generate') {
                setAssets(prev => ({...prev, [type]: dataUrl}));
            } else {
                setEditingAssets(prev => ({...prev, [type]: dataUrl}));
            }
        } catch (err) { setError(`Failed to upload ${type}.`); } finally {
            event.target.value = '';
        }
    }
  };
  
  const handleRemoveAsset = (type: keyof ModelAssets) => setAssets(prev => { const newAssets = {...prev}; delete newAssets[type]; return newAssets; });
  const handleRemoveEditingAsset = (type: keyof ModelAssets) => setEditingAssets(prev => { const newAssets = {...prev}; delete newAssets[type]; return newAssets; });

  const handlePromptSubmit = async () => {
    if (!prompt.trim() && Object.keys(editingAssets).length === 0 || isLoading) return;

    setIsLoading(true);
    setError(null);
    stopGenerationRef.current = false;

    try {
        let newImageSrc: string;

        if (mode === 'GENERATING') {
            if (Object.keys(assets).length === 0) {
                setError("Please upload at least one asset to generate a model.");
                setIsLoading(false);
                return;
            }
            newImageSrc = await generateModel(assets, prompt);
            if (stopGenerationRef.current) return;
            const newHistoryItem: ImageHistoryItem = { id: crypto.randomUUID(), src: newImageSrc, prompt: prompt };
            setHistory([newHistoryItem]);
            setCurrentIndex(0);
            setMode('EDITING');
        } else { // EDITING mode
            if (!currentImage) { setError("No image selected for editing."); setIsLoading(false); return; }
            newImageSrc = await editImage(currentImage.src, prompt, editingAssets);
            if (stopGenerationRef.current) return;
            const newHistoryItem: ImageHistoryItem = { id: crypto.randomUUID(), src: newImageSrc, prompt: prompt || 'Image-based edit' };
            const newHistory = history.slice(0, currentIndex + 1);
            newHistory.push(newHistoryItem);
            setHistory(newHistory);
            setCurrentIndex(newHistory.length - 1);
        }

        setPrompt('');
        setEditingAssets({});
    } catch (err) {
        if (stopGenerationRef.current) return;
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate image: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleUndo = () => { if (canUndo) setCurrentIndex(currentIndex - 1); };
  const handleRedo = () => { if (canRedo) setCurrentIndex(currentIndex + 1); };
  const handleSelectHistoryItem = (index: number) => { setCurrentIndex(index); };
  const handleStopGeneration = () => { stopGenerationRef.current = true; setIsLoading(false); };
  const handleDownload = () => {
      if (!currentImage) return;
      const link = document.createElement('a');
      link.href = currentImage.src;
      link.download = `virtual-model-${currentImage.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const handleSwitchToGenerator = () => {
    setMode('GENERATING'); setHistory([]); setCurrentIndex(-1); setAssets({}); setPrompt(''); setError(null); setEditingAssets({});
  };
  
  useEffect(() => { if (error) { const timer = setTimeout(() => setError(null), 5000); return () => clearTimeout(timer); } }, [error]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <Header onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo} isEditing={mode === 'EDITING'} onSwitchToGenerator={handleSwitchToGenerator} />
      {error && (<div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">{error}</div>)}
      {isFullScreenView && currentImage && <FullScreenViewer src={currentImage.src} onClose={() => setIsFullScreenView(false)} />}

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
            {mode === 'GENERATING' ? (
                <GenerationPreview assets={assets} onRemoveAsset={handleRemoveAsset} />
            ) : (
                <EditingWorkspace currentImageSrc={currentImage?.src} isLoading={isLoading && mode === 'EDITING'} onDownload={handleDownload} onFullScreen={() => setIsFullScreenView(true)} onStop={handleStopGeneration} />
            )}
        </div>
        <aside className="w-full md:w-1/3 max-w-sm flex-shrink-0 bg-gray-50 dark:bg-gray-900/50 p-4 overflow-y-auto no-scrollbar border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">History</h2>
            {history.length > 0 ? (
                <ImageHistoryGrid history={history} currentIndex={currentIndex} onSelect={handleSelectHistoryItem} isLoading={isLoading && mode === 'EDITING'} />
            ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <span className="material-symbols-outlined text-5xl">history</span>
                    <p className="mt-2">Your image edits will appear here.</p>
                </div>
            )}
        </aside>
      </main>

      <footer className="flex-shrink-0 p-4 bg-background-light dark:bg-background-dark shadow-inner">
        <input type="file" accept="image/*" ref={customFileInputRef} onChange={handleCustomUpload} className="hidden" />
        <input type="file" accept="image/*" ref={faceFileInputRef} onChange={(e) => handleAssetUpload(e, 'face', 'generate')} className="hidden" />
        <input type="file" accept="image/*" ref={outfitFileInputRef} onChange={(e) => handleAssetUpload(e, 'outfit', 'generate')} className="hidden" />
        <input type="file" accept="image/*" ref={backgroundFileInputRef} onChange={(e) => handleAssetUpload(e, 'background', 'generate')} className="hidden" />
        <input type="file" accept="image/*" ref={editFaceRef} onChange={(e) => handleAssetUpload(e, 'face', 'edit')} className="hidden" />
        <input type="file" accept="image/*" ref={editOutfitRef} onChange={(e) => handleAssetUpload(e, 'outfit', 'edit')} className="hidden" />
        <input type="file" accept="image/*" ref={editBackgroundRef} onChange={(e) => handleAssetUpload(e, 'background', 'edit')} className="hidden" />

        {mode === 'EDITING' && Object.keys(editingAssets).length > 0 && (
            <div className="flex items-center gap-3 p-2 mb-2">
                {editingAssets.face && <EditAssetPreview imageSrc={editingAssets.face} label="Face" onRemove={() => handleRemoveEditingAsset('face')} />}
                {editingAssets.outfit && <EditAssetPreview imageSrc={editingAssets.outfit} label="Ref" onRemove={() => handleRemoveEditingAsset('outfit')} />}
                {editingAssets.background && <EditAssetPreview imageSrc={editingAssets.background} label="BG" onRemove={() => handleRemoveEditingAsset('background')} />}
            </div>
        )}

        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-full p-2">
             {mode === 'EDITING' && (
                 <div className="flex items-center pl-2">
                    <button onClick={() => customFileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Upload Image to Edit"><span className="material-symbols-outlined">add_photo_alternate</span></button>
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button onClick={() => editFaceRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Add Face Reference"><span className="material-symbols-outlined">face</span></button>
                    <button onClick={() => editOutfitRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Add Style Reference"><span className="material-symbols-outlined">style</span></button>
                    <button onClick={() => editBackgroundRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Add Background Reference"><span className="material-symbols-outlined">landscape</span></button>
                 </div>
            )}
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePromptSubmit(); } }} placeholder={mode === 'GENERATING' ? "Describe the model, pose, and style..." : "Describe the change or use the + icons..."} className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" rows={1} />
            {mode === 'GENERATING' && (
                 <div className="flex items-center">
                    <button onClick={() => customFileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Upload Custom Image"><span className="material-symbols-outlined">add_photo_alternate</span></button>
                    <button onClick={() => faceFileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Upload Face"><span className="material-symbols-outlined">face</span></button>
                    <button onClick={() => outfitFileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Upload Outfit"><span className="material-symbols-outlined">checkroom</span></button>
                    <button onClick={() => backgroundFileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Upload Background"><span className="material-symbols-outlined">landscape</span></button>
                 </div>
            )}
            <button onClick={handlePromptSubmit} disabled={isLoading || (!prompt.trim() && (mode !== 'EDITING' || Object.keys(editingAssets).length === 0))} className="bg-primary text-white rounded-full p-3 disabled:bg-opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90 transition-all duration-300">
                {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined">arrow_upward</span>}
            </button>
        </div>
      </footer>
    </div>
  );
};

export default App;