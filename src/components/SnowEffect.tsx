import React, { useMemo, useState, useEffect } from 'react';

interface SnowflakeProps {
  index: number;
  isStorm?: boolean;
}

const Snowflake: React.FC<SnowflakeProps> = ({ index, isStorm }) => {
  const style = useMemo(() => {
    const left = `${Math.random() * 100}%`;
    const drift = `${(Math.random() - 0.5) * 20}px`; // Minimal horizontal drift
    
    if (isStorm) {
      return {
        left,
        '--storm-duration': `${4 + Math.random() * 3}s`, // Slower: 4-7s instead of 2-4s
        '--storm-delay': `${Math.random() * -8}s`, // Spread evenly over 8 seconds
      } as React.CSSProperties;
    }

    return {
      left,
      '--drift': drift,
      '--fall-duration': `${8 + Math.random() * 4}s`,
      '--fall-delay': `${Math.random() * -20}s`, // Spread evenly over 20 seconds
    } as React.CSSProperties;
  }, [index, isStorm]);

  return (
    <div
      className={isStorm ? 'snowstorm' : 'snow'}
      style={style}
    />
  );
};

export const SnowEffect: React.FC = () => {
  // Generate array of snowflakes - consistent count throughout
  const snowflakes = useMemo(() => [...Array(50)], []); // Consistent gentle snowfall
  
  // Track snow accumulation height (grows over time)
  const [snowHeight, setSnowHeight] = useState(0);
  
  useEffect(() => {
    // Gradually increase snow height over time (max 80px over 5 minutes)
    const interval = setInterval(() => {
      setSnowHeight(prev => Math.min(prev + 0.5, 80));
    }, 3000); // Add 0.5px every 3 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Falling snowflakes */}
      <div className="snow-container fixed inset-0 pointer-events-none z-50">
        {snowflakes.map((_, i) => (
          <Snowflake key={`snow-${i}`} index={i} />
        ))}
      </div>
      
      {/* Snow accumulation at bottom */}
      <div 
        className="snow-ground fixed bottom-0 left-0 right-0 pointer-events-none z-50"
        style={{ height: `${snowHeight}px` }}
      />
    </>
  );
};