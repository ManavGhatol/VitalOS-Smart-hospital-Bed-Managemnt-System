import React from 'react';

interface VitalisBotAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  animated?: boolean;
  showGlow?: boolean;
}

export const VitalisBotAvatar: React.FC<VitalisBotAvatarProps> = ({
  size = 'md',
  className = '',
  animated = true,
  showGlow = true,
}) => {
  let dimension = 48;
  if (typeof size === 'number') {
    dimension = size;
  } else {
    switch (size) {
      case 'xs':
        dimension = 28;
        break;
      case 'sm':
        dimension = 36;
        break;
      case 'md':
        dimension = 48;
        break;
      case 'lg':
        dimension = 80;
        break;
      case 'xl':
        dimension = 140;
        break;
    }
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${animated ? 'group' : ''} ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <svg
        viewBox="0 0 200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-sm select-none transition-transform duration-300 ${
          animated ? 'hover:scale-105' : ''
        }`}
        aria-label="Vitalis AI Health Bot"
        role="img"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="vb-coral-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A59" />
            <stop offset="50%" stopColor="#FF5733" />
            <stop offset="100%" stopColor="#E6391A" />
          </linearGradient>

          <linearGradient id="vb-white-body" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          <linearGradient id="vb-head-helm" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          <linearGradient id="vb-visor" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0B132B" />
            <stop offset="100%" stopColor="#1C2541" />
          </linearGradient>

          <linearGradient id="vb-cyan-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="vb-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="vb-glow-coral" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- Ground Glow / Shadow --- */}
        <ellipse cx="102" cy="208" rx="42" ry="7" fill="#38BDF8" opacity="0.35" />
        <ellipse cx="102" cy="208" rx="28" ry="4.5" fill="#0284C7" opacity="0.5" />

        {/* --- Propulsion Hover Rings --- */}
        <g className={animated ? 'animate-pulse' : ''}>
          <ellipse
            cx="102"
            cy="188"
            rx="20"
            ry="4"
            stroke="#00F0FF"
            strokeWidth="2.5"
            fill="none"
            opacity="0.75"
            filter="url(#vb-glow-cyan)"
          />
          <ellipse
            cx="102"
            cy="194"
            rx="14"
            ry="3"
            stroke="#38BDF8"
            strokeWidth="2"
            fill="none"
            opacity="0.55"
          />
        </g>

        {/* --- Thruster Base Engine --- */}
        <path
          d="M 90 170 Q 102 173 114 170 L 111 178 Q 102 181 93 178 Z"
          fill="#1E293B"
        />
        <ellipse cx="102" cy="177" rx="10" ry="3" fill="#00F0FF" filter="url(#vb-glow-cyan)" />

        {/* --- Left Arm (Extended downward/left) --- */}
        <g id="vb-left-arm">
          {/* Shoulder Coral Joint */}
          <circle cx="70" cy="132" r="11" fill="url(#vb-coral-grad)" />
          {/* Upper Arm White */}
          <path d="M 64 135 L 48 152 Q 44 156 48 160 L 52 163 Q 57 165 60 160 L 73 140 Z" fill="url(#vb-white-body)" />
          {/* Coral Elbow Ring */}
          <circle cx="50" cy="158" r="6.5" fill="url(#vb-coral-grad)" />
          {/* Hand/Paws */}
          <ellipse cx="40" cy="167" rx="7" ry="6" fill="#1E293B" transform="rotate(-20 40 167)" />
          <circle cx="34" cy="164" r="3" fill="#1E293B" />
          <circle cx="32" cy="170" r="2.8" fill="#1E293B" />
          <circle cx="36" cy="174" r="2.8" fill="#1E293B" />
        </g>

        {/* --- Torso Body --- */}
        {/* Coral Lower Body & Belt */}
        <path
          d="M 76 142 C 76 172 128 172 128 142 C 128 130 76 130 76 142 Z"
          fill="url(#vb-coral-grad)"
        />
        {/* White Chest Capsule */}
        <ellipse cx="102" cy="140" rx="30" ry="28" fill="url(#vb-white-body)" stroke="#CBD5E1" strokeWidth="1" />

        {/* Chest Plate with Chat Emblem */}
        <circle cx="102" cy="140" r="15" fill="#0B192C" stroke="#00F0FF" strokeWidth="2.2" filter="url(#vb-glow-cyan)" />
        {/* Speech Bubble Icon in Chest */}
        <path
          d="M 94 136 C 94 132.5 97.5 130 102 130 C 106.5 130 110 132.5 110 136 C 110 139.5 106.5 142 102 142 C 100.5 142 99 141.5 98 141 L 95 143 L 95.5 140 C 94.5 139 94 137.5 94 136 Z"
          fill="#FFFFFF"
        />
        {/* Dots inside chat bubble */}
        <circle cx="98.5" cy="136" r="1" fill="#0B192C" />
        <circle cx="102" cy="136" r="1" fill="#0B192C" />
        <circle cx="105.5" cy="136" r="1" fill="#0B192C" />

        {/* --- Right Arm (Waving Hand!) --- */}
        <g id="vb-right-arm" className={animated ? 'origin-[132px_130px] animate-[bounce_2s_infinite]' : ''}>
          {/* Shoulder Coral Joint */}
          <circle cx="134" cy="130" r="11" fill="url(#vb-coral-grad)" />
          {/* Upper Arm White */}
          <path d="M 132 124 L 152 108 Q 157 104 161 108 L 165 113 Q 166 118 161 122 L 140 137 Z" fill="url(#vb-white-body)" />
          {/* Coral Elbow/Forearm Accent */}
          <circle cx="158" cy="112" r="7" fill="url(#vb-coral-grad)" />
          {/* Forearm White */}
          <path d="M 158 110 L 170 95 Q 173 91 178 94 L 180 97 Q 183 102 178 106 L 165 119 Z" fill="url(#vb-white-body)" />
          {/* Coral Wrist Cuff */}
          <ellipse cx="174" cy="98" rx="6" ry="4" fill="url(#vb-coral-grad)" transform="rotate(-30 174 98)" />

          {/* Waving Hand (Dark Robot Glove) */}
          <g id="vb-hand">
            <ellipse cx="180" cy="90" rx="9" ry="8" fill="#1E293B" transform="rotate(-25 180 90)" />
            {/* 4 Rounded Fingers */}
            <circle cx="170" cy="88" r="3.6" fill="#1E293B" /> {/* Thumb */}
            <circle cx="174" cy="80" r="3.8" fill="#1E293B" /> {/* Index */}
            <circle cx="182" cy="77" r="4.0" fill="#1E293B" /> {/* Middle */}
            <circle cx="189" cy="82" r="3.8" fill="#1E293B" /> {/* Pinky */}
          </g>

          {/* Hand Wave Action Rays */}
          <path
            d="M 194 72 Q 199 79 198 88"
            stroke="#FF7A59"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 200 78 Q 204 84 203 91"
            stroke="#FF7A59"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* --- Neck Connector --- */}
        <ellipse cx="102" cy="116" rx="14" ry="5" fill="#334155" />

        {/* --- Antenna & Signal Waves --- */}
        <g id="vb-antenna">
          {/* Curved stalk */}
          <path
            d="M 98 42 Q 90 28 82 20"
            stroke="#334155"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Coral glowing ball */}
          <circle cx="78" cy="17" r="9" fill="url(#vb-coral-grad)" filter="url(#vb-glow-coral)" />
          <circle cx="76" cy="15" r="3" fill="#FFE4E6" opacity="0.8" />

          {/* Antenna Signal Rays */}
          <path d="M 68 12 Q 65 17 68 23" stroke="#FF5733" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 88 10 L 93 7" stroke="#FF5733" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M 84 5 L 87 2" stroke="#FF5733" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>

        {/* --- Head Helmet Outer & Ear Pods --- */}
        {/* Left Ear Disc */}
        <g>
          <ellipse cx="56" cy="82" rx="7" ry="16" fill="url(#vb-coral-grad)" transform="rotate(-10 56 82)" />
          <ellipse cx="57" cy="82" rx="4" ry="11" fill="#0F172A" transform="rotate(-10 57 82)" />
          <line x1="57" y1="76" x2="57" y2="88" stroke="#00F0FF" strokeWidth="1.8" filter="url(#vb-glow-cyan)" />
        </g>

        {/* Right Ear Disc */}
        <g>
          <ellipse cx="148" cy="82" rx="7" ry="16" fill="url(#vb-coral-grad)" transform="rotate(10 148 82)" />
          <ellipse cx="147" cy="82" rx="4" ry="11" fill="#0F172A" transform="rotate(10 147 82)" />
          <line x1="147" y1="76" x2="147" y2="88" stroke="#00F0FF" strokeWidth="1.8" filter="url(#vb-glow-cyan)" />
        </g>

        {/* Helmet Top Coral Cap */}
        <path
          d="M 66 65 C 72 40 132 40 138 65 C 130 52 74 52 66 65 Z"
          fill="url(#vb-coral-grad)"
        />

        {/* Main White Helmet Shell */}
        <path
          d="M 58 84 C 58 50 74 42 102 42 C 130 42 146 50 146 84 C 146 118 130 124 102 124 C 74 124 58 118 58 84 Z"
          fill="url(#vb-head-helm)"
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />

        {/* Coral Helmet Rim Brow */}
        <path
          d="M 68 62 C 78 54 126 54 136 62 C 124 57 80 57 68 62 Z"
          fill="url(#vb-coral-grad)"
        />

        {/* --- Visor Screen (Glossy Dark Screen) --- */}
        <rect
          x="66"
          y="62"
          width="72"
          height="48"
          rx="22"
          fill="url(#vb-visor)"
          stroke="#1E293B"
          strokeWidth="1.5"
        />

        {/* Glossy Reflection Highlight */}
        <path
          d="M 72 70 C 82 65 110 65 124 67 C 114 70 82 72 72 70 Z"
          fill="#FFFFFF"
          opacity="0.22"
        />

        {/* --- Cute Glowing Cyan Smiling Eyes (^ ^) --- */}
        <g id="vb-eyes" filter="url(#vb-glow-cyan)">
          {/* Left Eye: Curved smiling arc */}
          <path
            d="M 77 84 Q 85 73 93 84"
            stroke="#00F0FF"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Right Eye: Curved smiling arc */}
          <path
            d="M 111 84 Q 119 73 127 84"
            stroke="#00F0FF"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Cute Blushing Cheeks */}
        <g opacity="0.85">
          {/* Left Cheek */}
          <line x1="77" y1="92" x2="80" y2="95" stroke="#FF4757" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="81" y1="91" x2="84" y2="94" stroke="#FF4757" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="85" y1="91" x2="88" y2="94" stroke="#FF4757" strokeWidth="1.8" strokeLinecap="round" />

          {/* Right Cheek */}
          <line x1="116" y1="91" x2="119" y2="94" stroke="#FF4757" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="120" y1="91" x2="123" y2="94" stroke="#FF4757" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="124" y1="92" x2="127" y2="95" stroke="#FF4757" strokeWidth="1.8" strokeLinecap="round" />
        </g>

        {/* Happy Smiling Open Mouth */}
        <path
          d="M 98 87 Q 102 89 106 87 Q 102 96 98 87 Z"
          fill="#FF4757"
          stroke="#FF7A59"
          strokeWidth="0.8"
        />

        {/* Subtle Side Motion Waves */}
        <g opacity="0.6">
          <path d="M 44 116 Q 40 124 44 132" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M 40 119 Q 36 124 40 129" stroke="#FF7A59" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M 160 170 Q 164 177 160 184" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
};
