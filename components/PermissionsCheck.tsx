import React, { useEffect, useState } from 'react';

interface PermissionsCheckProps {
  onPermissionsGranted?: () => void;
}

const PermissionsCheck: React.FC<PermissionsCheckProps> = ({ onPermissionsGranted }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Check if permissions API is available
    if (!navigator.permissions) {
      console.log('Permissions API not available');
      return;
    }

    try {
      // Check microphone permission
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicrophoneStatus(micPermission.state);

      // Check location permission
      const geoPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setLocationStatus(geoPermission.state);

      // Show dialog if any permission is not granted
      if (micPermission.state !== 'granted' || geoPermission.state !== 'granted') {
        setShowDialog(true);
      } else {
        onPermissionsGranted?.();
      }
    } catch (error) {
      console.log('Error checking permissions:', error);
      // On iOS/Safari, permissions API might not be fully supported
      // Show dialog anyway to let user grant permissions
      setShowDialog(true);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      setIsChecking(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicrophoneStatus('granted');
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicrophoneStatus('denied');
    } finally {
      setIsChecking(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setIsChecking(true);
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0
        });
      });
      setLocationStatus('granted');
    } catch (error) {
      console.error('Location permission denied:', error);
      setLocationStatus('denied');
    } finally {
      setIsChecking(false);
    }
  };

  const requestAllPermissions = async () => {
    setIsChecking(true);
    
    let micGranted = false;
    let locGranted = false;
    
    // Request microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicrophoneStatus('granted');
      micGranted = true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicrophoneStatus('denied');
    }

    // Request location
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0
        });
      });
      setLocationStatus('granted');
      locGranted = true;
    } catch (error) {
      console.error('Location permission denied:', error);
      setLocationStatus('denied');
    }

    setIsChecking(false);
    
    // Only close if both are granted
    if (micGranted && locGranted) {
      setTimeout(() => {
        setShowDialog(false);
        onPermissionsGranted?.();
      }, 1000);
    }
  };

  const skipPermissions = () => {
    setShowDialog(false);
    onPermissionsGranted?.();
  };

  if (!showDialog) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-view">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Berechtigungen erforderlich</h2>
          <p className="text-sm text-gray-600">
            Für die beste Erfahrung benötigt die App Zugriff auf Mikrofon und Standort
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Microphone Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-xl">🎤</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Mikrofon</p>
                <p className="text-xs text-gray-600">Für Sprachaufnahmen</p>
              </div>
            </div>
            <div>
              {microphoneStatus === 'granted' ? (
                <span className="text-green-600 text-2xl">✓</span>
              ) : microphoneStatus === 'denied' ? (
                <span className="text-red-600 text-2xl">✕</span>
              ) : (
                <button
                  onClick={requestMicrophonePermission}
                  disabled={isChecking}
                  className="px-3 py-1 bg-[var(--primary-color)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Erlauben
                </button>
              )}
            </div>
          </div>

          {/* Location Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xl">📍</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Standort</p>
                <p className="text-xs text-gray-600">Für Notiz-Orte</p>
              </div>
            </div>
            <div>
              {locationStatus === 'granted' ? (
                <span className="text-green-600 text-2xl">✓</span>
              ) : locationStatus === 'denied' ? (
                <span className="text-red-600 text-2xl">✕</span>
              ) : (
                <button
                  onClick={requestLocationPermission}
                  disabled={isChecking}
                  className="px-3 py-1 bg-[var(--primary-color)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Erlauben
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={requestAllPermissions}
            disabled={isChecking || (microphoneStatus === 'granted' && locationStatus === 'granted')}
            className="w-full px-6 py-3 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            {isChecking ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                Prüfe Berechtigungen...
              </span>
            ) : (
              'Alle Berechtigungen erteilen'
            )}
          </button>

          <button
            onClick={skipPermissions}
            className="w-full px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Später
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Du kannst die Berechtigungen jederzeit in den Browser-Einstellungen ändern
        </p>
      </div>
    </div>
  );
};

export default PermissionsCheck;
