import React, { useEffect, useState, useMemo } from 'react';

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
        '--storm-duration': `${2 + Math.random()}s`,
        '--storm-delay': `${Math.random() * -2}s`,
      } as React.CSSProperties;
    }

    return {
      left,
      '--drift': drift,
      '--fall-duration': `${8 + Math.random() * 4}s`,
      '--fall-delay': `${Math.random() * -15}s`,
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
  const [showStorm, setShowStorm] = useState(true);

  useEffect(() => {
    const stormTimer = setTimeout(() => {
      setShowStorm(false);
    }, 3000);

    return () => clearTimeout(stormTimer);
  }, []);

  // Generate arrays of snowflakes
  const gentleSnow = useMemo(() => [...Array(75)], []); // Reduced number for better performance
  const stormSnow = useMemo(() => [...Array(150)], []);

  return (
    <>
      {/* Permanent gentle snowfall */}
      <div className="snow-container fixed inset-0 pointer-events-none z-50">
        {gentleSnow.map((_, i) => (
          <Snowflake key={`snow-${i}`} index={i} />
        ))}
      </div>

      {/* Initial intense snowstorm */}
      {showStorm && (
        <div className="snowstorm-container fixed inset-0 pointer-events-none z-50">
          {stormSnow.map((_, i) => (
            <Snowflake key={`storm-${i}`} index={i} isStorm />
          ))}
        </div>
      )}
    </>
  );
};