import { useEffect, useRef } from 'react';

interface BenchmarkMetrics {
  index: number;
  success: boolean;
  time: number;
  timestamp: number;
  metrics?: {
    total_time_ms: number;
    lightrag_query_ms: number;
    ai_response_ms: number;
    first_token_ms: number;
    settings_load_ms: number;
    response_length: number;
    tokens_estimate: number;
    tokens_per_second: number;
  };
  error?: string;
}

interface BenchmarkLiveMonitorProps {
  metrics: BenchmarkMetrics[];
  totalRequests: number;
  isRunning: boolean;
}

export default function BenchmarkLiveMonitor({ metrics, totalRequests, isRunning }: BenchmarkLiveMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate statistics
  const completedRequests = metrics.length;
  const successfulRequests = metrics.filter(m => m.success).length;
  const failedRequests = metrics.filter(m => !m.success).length;
  const successRate = completedRequests > 0 ? (successfulRequests / completedRequests * 100) : 0;
  
  const successfulMetrics = metrics.filter(m => m.success && m.metrics);
  
  const avgTotalTime = successfulMetrics.length > 0
    ? successfulMetrics.reduce((sum, m) => sum + (m.metrics?.total_time_ms || 0), 0) / successfulMetrics.length
    : 0;
    
  const avgLightRAGTime = successfulMetrics.length > 0
    ? successfulMetrics.reduce((sum, m) => sum + (m.metrics?.lightrag_query_ms || 0), 0) / successfulMetrics.length
    : 0;
    
  const avgAITime = successfulMetrics.length > 0
    ? successfulMetrics.reduce((sum, m) => sum + (m.metrics?.ai_response_ms || 0), 0) / successfulMetrics.length
    : 0;
    
  const avgFirstToken = successfulMetrics.length > 0
    ? successfulMetrics.reduce((sum, m) => sum + (m.metrics?.first_token_ms || 0), 0) / successfulMetrics.length
    : 0;
    
  const avgTokensPerSec = successfulMetrics.length > 0
    ? successfulMetrics.reduce((sum, m) => sum + (m.metrics?.tokens_per_second || 0), 0) / successfulMetrics.length
    : 0;
  
  // Calculate requests per second (last 10 seconds)
  const now = Date.now();
  const recentMetrics = metrics.filter(m => now - m.timestamp < 10000);
  const requestsPerSecond = recentMetrics.length / 10;
  
  // Draw real-time chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    if (successfulMetrics.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Warte auf Daten...', width / 2, height / 2);
      return;
    }
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (height - 40) * (i / 5) + 20;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }
    
    // Find max time for scaling
    const maxTime = Math.max(
      ...successfulMetrics.map(m => m.metrics?.total_time_ms || 0)
    );
    const yScale = (height - 60) / maxTime;
    const xScale = (width - 60) / Math.max(totalRequests, successfulMetrics.length);
    
    // Draw time labels
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const time = (maxTime * (5 - i) / 5);
      const y = (height - 40) * (i / 5) + 20;
      ctx.fillText(`${(time / 1000).toFixed(1)}s`, 35, y + 3);
    }
    
    // Draw bars for each request
    successfulMetrics.forEach((metric, i) => {
      const x = 40 + (metric.index * xScale);
      const barWidth = Math.max(2, xScale - 2);
      
      if (!metric.metrics) return;
      
      let currentY = height - 20;
      
      // Draw stacked bars
      const components = [
        { value: metric.metrics.settings_load_ms, color: '#4ade80' },  // Green
        { value: metric.metrics.lightrag_query_ms, color: '#60a5fa' }, // Blue
        { value: metric.metrics.first_token_ms, color: '#fbbf24' },    // Yellow
        { value: metric.metrics.ai_response_ms - (metric.metrics.first_token_ms || 0), color: '#f87171' } // Red
      ];
      
      components.forEach(comp => {
        const barHeight = comp.value * yScale;
        ctx.fillStyle = comp.color;
        ctx.fillRect(x, currentY - barHeight, barWidth, barHeight);
        currentY -= barHeight;
      });
      
      // Draw error indicator
      if (!metric.success) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, height - 20, barWidth, 5);
      }
    });
    
    // Draw legend
    const legend = [
      { label: 'Settings', color: '#4ade80' },
      { label: 'LightRAG', color: '#60a5fa' },
      { label: 'First Token', color: '#fbbf24' },
      { label: 'AI Response', color: '#f87171' }
    ];
    
    let legendX = 50;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    legend.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, 5, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(item.label, legendX + 16, 14);
      legendX += ctx.measureText(item.label).width + 30;
    });
    
  }, [metrics, totalRequests, successfulMetrics]);
  
  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            {isRunning ? '🔄 Läuft...' : '✅ Abgeschlossen'}
          </span>
          <span className="text-sm text-gray-400">
            {completedRequests} / {totalRequests} Requests
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
            style={{ width: `${(completedRequests / totalRequests) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>✅ {successfulRequests} erfolgreich</span>
          <span>❌ {failedRequests} fehlgeschlagen</span>
          <span>📊 {successRate.toFixed(1)}% Erfolgsrate</span>
        </div>
      </div>
      
      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Ø Total Zeit</div>
          <div className="text-2xl font-bold text-white">
            {(avgTotalTime / 1000).toFixed(2)}s
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Ø LightRAG</div>
          <div className="text-2xl font-bold text-blue-400">
            {(avgLightRAGTime / 1000).toFixed(2)}s
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Ø AI Zeit</div>
          <div className="text-2xl font-bold text-red-400">
            {(avgAITime / 1000).toFixed(2)}s
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Ø First Token</div>
          <div className="text-2xl font-bold text-yellow-400">
            {(avgFirstToken / 1000).toFixed(2)}s
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Tokens/Sek</div>
          <div className="text-2xl font-bold text-green-400">
            {avgTokensPerSec.toFixed(1)}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Requests/Sek</div>
          <div className="text-2xl font-bold text-purple-400">
            {requestsPerSecond.toFixed(1)}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Schnellste</div>
          <div className="text-2xl font-bold text-green-400">
            {successfulMetrics.length > 0
              ? (Math.min(...successfulMetrics.map(m => m.metrics?.total_time_ms || Infinity)) / 1000).toFixed(2)
              : '0.00'}s
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Langsamste</div>
          <div className="text-2xl font-bold text-red-400">
            {successfulMetrics.length > 0
              ? (Math.max(...successfulMetrics.map(m => m.metrics?.total_time_ms || 0)) / 1000).toFixed(2)
              : '0.00'}s
          </div>
        </div>
      </div>
      
      {/* Real-time Chart */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Response Times (Echtzeit)</h3>
        <canvas 
          ref={canvasRef}
          className="w-full"
          style={{ height: '300px' }}
        />
      </div>
      
      {/* Recent Errors */}
      {failedRequests > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-400 mb-2">
            ❌ Fehler ({failedRequests})
          </h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {metrics
              .filter(m => !m.success)
              .slice(-5)
              .map((m, i) => (
                <div key={i} className="text-xs text-red-300">
                  Request #{m.index + 1}: {m.error || 'Unbekannter Fehler'}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
