import React from 'react';

interface ReleaseDataFieldProps {
  icon: string;
  label: string;
  fieldType: 'songname' | 'release_date' | 'artist_genre' | 'song_genre' | 'master' | 'snippet' | 'tiktok' | 'instagram' | 'spotify';
  value?: string;
  placeholder?: string;
  isLinked?: boolean;
}

export const ReleaseDataField: React.FC<ReleaseDataFieldProps> = ({
  icon,
  label,
  fieldType,
  value,
  placeholder,
  isLinked = false
}) => {
  const displayValue = value || placeholder || '';
  const isEmpty = !value;

  return (
    <div 
      className="release-data-field my-2 p-3 rounded-lg border-2 border-dashed transition-all"
      style={{
        borderColor: isEmpty ? '#d1d5db' : '#10b981',
        backgroundColor: isEmpty ? '#f9fafb' : '#ecfdf5'
      }}
      data-field-type={fieldType}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <div className="font-medium text-gray-700 dark:text-gray-300">
            {label}
          </div>
          {displayValue && (
            <div className="mt-1 text-gray-900 dark:text-white">
              {fieldType === 'tiktok' || fieldType === 'instagram' || fieldType === 'spotify' ? (
                <a 
                  href={displayValue} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {displayValue}
                </a>
              ) : fieldType === 'master' || fieldType === 'snippet' ? (
                <div className="flex items-center gap-2">
                  <audio controls className="w-full max-w-md">
                    <source src={displayValue} type="audio/mpeg" />
                    <source src={displayValue} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                displayValue
              )}
            </div>
          )}
          {isEmpty && (
            <div className="mt-1 text-sm text-gray-500 italic">
              {isLinked ? 'Waiting for data...' : 'Link a release to auto-fill'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
