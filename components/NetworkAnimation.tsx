import React, { useEffect, useRef, useState } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  angle: number; // Angle from center for initial positioning
  distance: number; // Distance from center
}

interface NetworkAnimationProps {
  onComplete: () => void;
  primaryColor?: string;
  secondaryColor?: string;
}

const NetworkAnimation: React.FC<NetworkAnimationProps> = ({ 
  onComplete, 
  primaryColor = '#0066cc',
  secondaryColor = '#00aaff'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const animationFrameRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create nodes arranged around center (person icon)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const nodeCount = 12;
    const nodes: Node[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const distance = 100 + Math.random() * 150;
      
      nodes.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 3 + 2,
        opacity: 0,
        angle: angle,
        distance: distance,
      });
    }
    nodesRef.current = nodes;

    // Animation constants
    const FADE_IN_DURATION = 800;
    const ANIMATION_DURATION = 2500;
    const FADE_OUT_DURATION = 400;
    const CONNECTION_DISTANCE = 150;

    // Parse colors to RGB
    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 102, b: 204 };
    };

    const primaryRgb = hexToRgb(primaryColor);
    const secondaryRgb = hexToRgb(secondaryColor);

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate global opacity based on animation phase
      let globalOpacity = 1;
      if (elapsed < FADE_IN_DURATION) {
        // Fade in
        globalOpacity = elapsed / FADE_IN_DURATION;
      } else if (elapsed > ANIMATION_DURATION - FADE_OUT_DURATION) {
        // Fade out
        globalOpacity = (ANIMATION_DURATION - elapsed) / FADE_OUT_DURATION;
      }

      // Draw person icon in center
      const iconOpacity = Math.min(1, elapsed / 500) * globalOpacity;
      const iconSize = 60;
      
      // Person icon (head + body)
      ctx.fillStyle = `rgba(156, 163, 175, ${iconOpacity})`; // gray-400
      
      // Head
      ctx.beginPath();
      ctx.arc(centerX, centerY - iconSize * 0.25, iconSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
      
      // Body (simplified torso)
      ctx.beginPath();
      ctx.arc(centerX, centerY + iconSize * 0.35, iconSize * 0.4, Math.PI, 0);
      ctx.lineTo(centerX + iconSize * 0.4, centerY + iconSize * 0.6);
      ctx.lineTo(centerX - iconSize * 0.4, centerY + iconSize * 0.6);
      ctx.closePath();
      ctx.fill();

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Keep within bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));

        // Update node opacity (fade in individual nodes)
        if (elapsed < FADE_IN_DURATION) {
          const nodeDelay = i * (FADE_IN_DURATION / nodes.length);
          node.opacity = Math.min(1, Math.max(0, (elapsed - nodeDelay) / (FADE_IN_DURATION * 0.5)));
        } else {
          node.opacity = 1;
        }

        // Pulsing effect
        const pulse = Math.sin(elapsed * 0.003 + i) * 0.3 + 0.7;
        const finalOpacity = node.opacity * globalOpacity * pulse;

        // Draw connections
        nodes.forEach((otherNode, j) => {
          if (i >= j) return;

          const dx = otherNode.x - node.x;
          const dy = otherNode.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONNECTION_DISTANCE) {
            const lineOpacity = (1 - distance / CONNECTION_DISTANCE) * finalOpacity * 0.4;
            
            // Gradient from primary to secondary color
            const gradient = ctx.createLinearGradient(node.x, node.y, otherNode.x, otherNode.y);
            gradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${lineOpacity})`);
            gradient.addColorStop(1, `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, ${lineOpacity})`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });

        // Draw node with glow
        const nodeGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3);
        nodeGradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${finalOpacity * 0.8})`);
        nodeGradient.addColorStop(0.5, `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, ${finalOpacity * 0.4})`);
        nodeGradient.addColorStop(1, `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0)`);

        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw solid node center
        ctx.fillStyle = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${finalOpacity})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Check if animation should end
      if (elapsed >= ANIMATION_DURATION) {
        setIsVisible(false);
        setTimeout(() => {
          onComplete();
        }, 100);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onComplete, primaryColor, secondaryColor]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default NetworkAnimation;
