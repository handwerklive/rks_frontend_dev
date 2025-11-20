import React, { useEffect, useRef, useState } from 'react';
import { NotebookNote } from '../types';

interface NotesMapViewProps {
    notes: NotebookNote[];
    onClose: () => void;
}

interface LocationPoint {
    lat: number;
    lng: number;
    note: NotebookNote;
}

const NotesMapView: React.FC<NotesMapViewProps> = ({ notes, onClose }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNotesList, setShowNotesList] = useState(false);
    
    // Get brand colors from CSS variables
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#59B4E2';
    const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() || '#62B04A';

    // Extract location points from notes
    useEffect(() => {
        const extractLocations = async () => {
            setIsLoading(true);
            setError(null);
            
            const points: LocationPoint[] = [];
            
            for (const note of notes) {
                // Check if note has location data
                if (note.location_city || note.location_postal_code || note.location_street) {
                    try {
                        // Build address string for geocoding
                        const addressParts = [
                            note.location_street,
                            note.location_postal_code,
                            note.location_city,
                            note.location_country
                        ].filter(Boolean);
                        
                        const address = addressParts.join(', ');
                        
                        // Use Nominatim (OpenStreetMap) for geocoding
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
                            {
                                headers: {
                                    'User-Agent': 'HandwerkLive/1.0'
                                }
                            }
                        );
                        
                        const data = await response.json();
                        
                        if (data && data.length > 0) {
                            points.push({
                                lat: parseFloat(data[0].lat),
                                lng: parseFloat(data[0].lon),
                                note
                            });
                        }
                    } catch (err) {
                        console.error('Error geocoding address:', err);
                    }
                }
            }
            
            setLocationPoints(points);
            setIsLoading(false);
            
            if (points.length === 0) {
                setError('Keine Standorte mit Koordinaten gefunden');
            }
        };
        
        extractLocations();
    }, [notes]);

    // Initialize map with Leaflet
    useEffect(() => {
        if (!mapContainerRef.current || locationPoints.length === 0) return;

        // Dynamically load Leaflet CSS and JS
        const loadLeaflet = async () => {
            // Load CSS
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            // Load Leaflet MarkerCluster CSS
            if (!document.getElementById('leaflet-markercluster-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-markercluster-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
                document.head.appendChild(link);
            }

            if (!document.getElementById('leaflet-markercluster-default-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-markercluster-default-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
                document.head.appendChild(link);
            }

            // Load JS
            if (!(window as any).L) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = () => loadMarkerCluster();
                document.head.appendChild(script);
            } else {
                loadMarkerCluster();
            }
        };

        const loadMarkerCluster = () => {
            // Load MarkerCluster plugin
            if (!(window as any).L.markerClusterGroup) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
                script.onload = () => initMap();
                document.head.appendChild(script);
            } else {
                initMap();
            }
        };

        const initMap = () => {
            const L = (window as any).L;
            if (!L || !mapContainerRef.current) return;

            // Clear existing map
            mapContainerRef.current.innerHTML = '';

            // Calculate center and bounds
            const lats = locationPoints.map(p => p.lat);
            const lngs = locationPoints.map(p => p.lng);
            const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
            const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

            // Create map
            const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 13);

            // Add tile layer with custom styling
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            // Custom marker icon in company colors
            const createCustomIcon = (index: number) => {
                return L.divIcon({
                    className: 'custom-marker',
                    html: `
                        <div style="
                            width: 36px;
                            height: 36px;
                            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
                            border: 3px solid white;
                            border-radius: 50%;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 18px;
                            position: relative;
                        ">
                            <div style="
                                position: absolute;
                                top: -8px;
                                right: -8px;
                                background: white;
                                color: ${primaryColor};
                                border-radius: 50%;
                                width: 20px;
                                height: 20px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 11px;
                                font-weight: bold;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            ">${index + 1}</div>
                            📍
                        </div>
                    `,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                    popupAnchor: [0, -18]
                });
            };

            // Create marker cluster group with custom styling
            const markerClusterGroup = (window as any).L.markerClusterGroup({
                iconCreateFunction: function(cluster: any) {
                    const count = cluster.getChildCount();
                    return L.divIcon({
                        html: `
                            <div style="
                                width: 50px;
                                height: 50px;
                                background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
                                border: 4px solid white;
                                border-radius: 50%;
                                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-weight: bold;
                                font-size: 18px;
                            ">${count}</div>
                        `,
                        className: 'custom-cluster-icon',
                        iconSize: [50, 50]
                    });
                },
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: true,
                zoomToBoundsOnClick: true,
                maxClusterRadius: 50,
                disableClusteringAtZoom: 18,
                spiderfyDistanceMultiplier: 2
            });

            // Add markers
            const markers: any[] = [];
            locationPoints.forEach((point, index) => {
                const marker = L.marker([point.lat, point.lng], { icon: createCustomIcon(index) });
                
                // Format time
                const time = new Date(point.note.created_at).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Create popup content
                const popupContent = `
                    <div style="font-family: Inter, sans-serif; min-width: 200px;">
                        <div style="
                            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
                            color: white;
                            padding: 8px 12px;
                            margin: -10px -10px 10px -10px;
                            border-radius: 8px 8px 0 0;
                            font-weight: 600;
                        ">
                            📍 Notiz ${index + 1} • ${time}
                        </div>
                        <div style="padding: 4px 0;">
                            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; line-height: 1.5;">
                                ${point.note.content.substring(0, 100)}${point.note.content.length > 100 ? '...' : ''}
                            </p>
                            ${point.note.location_street ? `<p style="margin: 4px 0; color: #6B7280; font-size: 12px;">📍 ${point.note.location_street}</p>` : ''}
                            ${point.note.location_city ? `<p style="margin: 4px 0; color: #6B7280; font-size: 12px;">${point.note.location_postal_code || ''} ${point.note.location_city}</p>` : ''}
                        </div>
                    </div>
                `;
                
                marker.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'custom-popup'
                });
                
                markers.push(marker);
                markerClusterGroup.addLayer(marker);
            });

            // Add cluster group to map
            map.addLayer(markerClusterGroup);

            // Draw path connecting the points in chronological order
            if (locationPoints.length > 1) {
                const sortedPoints = [...locationPoints].sort((a, b) => 
                    new Date(a.note.created_at).getTime() - new Date(b.note.created_at).getTime()
                );
                
                const pathCoordinates = sortedPoints.map(p => [p.lat, p.lng] as [number, number]);
                
                // Create gradient polyline effect using multiple lines with brand colors
                L.polyline(pathCoordinates, {
                    color: primaryColor,
                    weight: 6,
                    opacity: 0.3,
                    smoothFactor: 1
                }).addTo(map);
                
                L.polyline(pathCoordinates, {
                    color: secondaryColor,
                    weight: 4,
                    opacity: 0.5,
                    smoothFactor: 1,
                    dashArray: '10, 10'
                }).addTo(map);
                
                L.polyline(pathCoordinates, {
                    color: primaryColor,
                    weight: 2,
                    opacity: 0.8,
                    smoothFactor: 1
                }).addTo(map);
            }

            // Fit bounds to show all markers
            if (markers.length > 0) {
                const group = L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.15));
            }
        };

        loadLeaflet();
    }, [locationPoints, primaryColor, secondaryColor]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in-view">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)]">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🗺️</span>
                        <div>
                            <h2 className="text-xl font-bold text-white">Standortkarte</h2>
                            <p className="text-sm text-white/90">
                                {locationPoints.length} {locationPoints.length === 1 ? 'Standort' : 'Standorte'} gefunden
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowNotesList(!showNotesList)}
                            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition-colors flex items-center gap-2"
                            aria-label="Notizenliste anzeigen"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <span className="hidden sm:inline">{showNotesList ? 'Liste ausblenden' : 'Liste anzeigen'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                            aria-label="Schließen"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Map Container with Navigation */}
                <div className="flex-1 relative flex">
                    {/* Notes List Sidebar */}
                    {showNotesList && locationPoints.length > 0 && (
                        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="font-bold text-gray-900">Alle Notizen</h3>
                                <p className="text-xs text-gray-600 mt-1">Klicke auf eine Notiz, um sie auf der Karte anzuzeigen</p>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {locationPoints.map((point, index) => {
                                    const time = new Date(point.note.created_at).toLocaleTimeString('de-DE', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    
                                    return (
                                        <div
                                            key={point.note.id}
                                            className="p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-gray-500">{time}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 line-clamp-2">
                                                        {point.note.content}
                                                    </p>
                                                    {point.note.location_city && (
                                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                            <span>📍</span>
                                                            <span className="truncate">
                                                                {point.note.location_street && `${point.note.location_street}, `}
                                                                {point.note.location_city}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Map */}
                    <div className="flex-1 relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-600">Lade Standorte...</p>
                            </div>
                        </div>
                    )}
                    
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                            <div className="text-center px-4">
                                <span className="text-6xl mb-4 block">📍</span>
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">Keine Standorte verfügbar</h3>
                                <p className="text-gray-600">{error}</p>
                            </div>
                        </div>
                    )}
                    
                        <div 
                            ref={mapContainerRef} 
                            className="w-full h-full"
                            style={{ minHeight: '400px' }}
                        />
                    </div>
                </div>

                {/* Legend */}
                {locationPoints.length > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] border-2 border-white shadow-md flex items-center justify-center">
                                    📍
                                </div>
                                <span className="text-gray-700 font-medium">Standort</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-1 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-full"></div>
                                <span className="text-gray-700 font-medium">Chronologischer Pfad</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-popup .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    padding: 0;
                }
                .custom-popup .leaflet-popup-content {
                    margin: 10px;
                }
                .custom-popup .leaflet-popup-tip {
                    background: white;
                }
                .custom-marker {
                    background: transparent;
                    border: none;
                }
                .custom-cluster-icon {
                    background: transparent;
                    border: none;
                }
                .leaflet-control-zoom {
                    border: none !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                }
                .leaflet-control-zoom a {
                    border-radius: 8px !important;
                    margin: 2px !important;
                }
            `}</style>
        </div>
    );
};

export default NotesMapView;
