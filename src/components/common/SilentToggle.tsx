import React, { useState } from 'react';
import Icon from './Icon';

const SilentToggle: React.FC = () => {
  const [silent, setSilent] = useState(false);
  // Not enabled by default, just a placeholder for future use
  return (
    <button
      className={`flex items-center gap-2 px-3 py-2 rounded transition border ${silent ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-200'}`}
      onClick={() => setSilent((s) => !s)}
      aria-label="Toggle silent mode"
      type="button"
    >
      <Icon name="settings" className="w-5 h-5" />
      <span className="text-sm">Silent</span>
    </button>
  );
};

export default SilentToggle;
