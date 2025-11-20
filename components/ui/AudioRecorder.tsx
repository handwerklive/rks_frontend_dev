import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import MicrophoneIcon from '../icons/MicrophoneIcon';
import CloseIcon from '../icons/CloseIcon';

interface AudioRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (audioBlob: Blob, duration: number) => void;
}

/**
 * Vollbild Audio-Recorder mit Timer und Visualizer
 */
const AudioRecorder: React.FC<AudioRecorderProps> = ({ isOpen, onClose, onSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      startRecording();
    } else {
      cleanup();
    }
    
    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
    setPermissionError(null);
    setIsRequestingPermission(false);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    audioChunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      // Request microphone access with explicit constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      
      // Detect supported MIME type - prioritize audio/mp4 for iOS
      // iOS Safari only supports audio/mp4 with AAC codec
      let mimeType = 'audio/webm';
      const mimeTypes = [
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2', // AAC-LC
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ];
      
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('[AudioRecorder] Using MIME type:', mimeType);
          break;
        }
      }
      
      // Create MediaRecorder with selected MIME type
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data availability
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Use the actual MIME type from the recorder
        const actualMimeType = mediaRecorder.mimeType || mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Validate blob is not empty
        if (audioBlob.size === 0) {
          console.error('[AudioRecorder] Recording is empty (0 bytes)');
          setPermissionError('Die Aufnahme ist leer. Bitte versuche es erneut.');
          return;
        }
        
        // Call onSave with blob and duration
        onSave(audioBlob, duration);
        onClose();
      };

      // Use timeslice to ensure data is collected regularly (every 100ms)
      mediaRecorder.start(100);
      setIsRecording(true);
      setPermissionError(null);
      
      console.log('[AudioRecorder] Recording started with MIME type:', mimeType);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('[AudioRecorder] Error accessing microphone:', error);
      
      // Provide specific error messages
      let errorMessage = 'Fehler beim Zugriff auf das Mikrofon.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Einstellungen.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Kein Mikrofon gefunden. Bitte stelle sicher, dass ein Mikrofon angeschlossen ist.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Mikrofon wird bereits verwendet. Bitte schließe andere Apps.';
      }
      
      setPermissionError(errorMessage);
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCancel = () => {
    cleanup();
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Drag event listeners
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
      const handleEnd = () => handleDragEnd();
      
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, dragStart]);

  if (!isOpen) return null;

  // Wenn Aufnahme läuft, zeige die verschiebbare Pille
  if (isRecording) {
    return (
      <div
        ref={pillRef}
        className={`fixed z-50 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } transition-shadow`}
        style={{
          left: position.x !== 0 ? `${position.x}px` : '50%',
          top: position.y !== 0 ? `${position.y}px` : '20px',
          transform: position.x === 0 && position.y === 0 ? 'translateX(-50%)' : 'none',
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow-2xl backdrop-blur-sm animate-fade-in-view">
          {/* Recording Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <MicrophoneIcon className="w-5 h-5 text-white" />
          </div>
          
          {/* Timer */}
          <div className="flex flex-col items-center">
            <span className="text-white font-mono font-bold text-lg leading-none">{formatTime(duration)}</span>
            <span className="text-white/80 text-[10px] font-medium mt-0.5">Aufnahme läuft</span>
          </div>
          
          {/* Stop Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStop();
            }}
            disabled={duration < 2}
            className="ml-2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            aria-label="Aufnahme beenden"
          >
            <div className="w-4 h-4 rounded-sm bg-white" />
          </button>
        </div>
        
        {/* Drag Hint */}
        {!isDragging && position.x === 0 && position.y === 0 && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-xs whitespace-nowrap animate-fade-in-view">
            ↕️ Verschiebbar
          </div>
        )}
      </div>
    );
  }

  // Vor der Aufnahme: Zeige Fehler oder starte automatisch
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in-view">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        {/* Close Button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Abbrechen"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
        
        {/* Permission Error */}
        {permissionError && (
          <div className="bg-red-500/20 border border-red-500 text-white px-4 py-3 rounded-xl mb-4">
            <p className="text-sm font-medium mb-1">⚠️ Fehler</p>
            <p className="text-xs">{permissionError}</p>
          </div>
        )}
        
        {/* Requesting Permission */}
        {isRequestingPermission && (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center animate-pulse">
              <MicrophoneIcon className="w-12 h-12 text-white" />
            </div>
            <p className="text-white text-lg font-medium mb-2">🎤 Mikrofon-Berechtigung</p>
            <p className="text-white/70 text-sm">Bitte erlaube den Zugriff in deinem Browser.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;
