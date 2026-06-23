"use client";

import Image from 'next/image';

const ventures = [
  {
    name: 'Hamro Hexagon',
    role: 'Site Admin',
    url: 'https://hamrohexagon.com',
    logo: '/hexagon.jpg',
    accent: '#c0c0c0',
    accentBg: '#111111',
    accentBorder: '#262626',
  },
  {
    name: 'Clamphook Academy',
    role: 'Coordinator',
    url: 'https://clamphook.com',
    logo: '/clamphook.jpg',
    accent: '#4169e1',
    accentBg: '#080f2a',
    accentBorder: '#131d45',
  },
  {
    name: 'Paradise Entrance',
    role: 'IT Coordinator',
    url: 'https://www.paradisegroup.edu.np/',
    logo: '/paradise_entrance.jpg',
    accent: '#0ea5b0',
    accentBg: '#04181a',
    accentBorder: '#0a2e31',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 md:p-10 font-sans">
      {/* min-h-[72vh] and justify-between force the top and bottom to push away from each other */}
      <div className="w-full max-w-[1000px] min-h-[72vh] flex flex-col justify-between">
        
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-12 items-center my-auto py-8">

          {/* Left Column */}
          <div className="flex flex-col gap-6 order-2 md:order-1">
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase text-[#555] mb-5 font-medium">
                Entrepreneur &amp; Founder
              </p>
              <h1 className="text-[62px] md:text-[72px] font-bold text-[#f2f2f2] leading-[0.96] tracking-[-0.03em]">
                Saroj<br />
                <span className="text-[#606060]">Singh</span>
              </h1>
              <p className="text-[15px] text-[#555] mt-6 leading-[1.8] max-w-[380px]">
                Founder, builder, and someone who likes turning ideas into real things.
              </p>

              {/* Contact */}
              <div className="flex flex-wrap items-center gap-2.5 mt-8">
                <a
                  href="tel:+97798XXXXXXXX"
                  className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-[#999] border border-[#1e1e1e] hover:border-[#333] rounded-full px-3.5 py-2 transition-all no-underline"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-2.5 h-2.5 shrink-0">
                    <path d="M2 2.5C2 2.5 3.5 1 5 2.5L6.5 4.5C7 5.2 6.8 6 6.2 6.5L5.5 7.2C5.5 7.2 6 8.5 7.5 10C9 11.5 10.3 12 10.3 12L11 11.3C11.5 10.7 12.3 10.5 13 11L15 12.5C16.5 14 15 15.5 15 15.5C13 17.5 1 5.5 2 2.5Z"/>
                  </svg>
                  +977-9860114431
                </a>
                <a
                  href="mailto:saroj@hamrohexagon.com"
                  className="flex items-center gap-1.5 text-[11px] text-[#555] hover:text-[#999] border border-[#1e1e1e] hover:border-[#333] rounded-full px-3.5 py-2 transition-all no-underline"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-2.5 h-2.5 shrink-0">
                    <rect x="1" y="3" width="14" height="10" rx="1.5"/>
                    <path d="M1 4.5l7 4.5 7-4.5"/>
                  </svg>
                  sarozxcing@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Right Column (Photo) */}
          <div className="flex justify-end order-1 md:order-2">
            <div className="relative w-full max-w-[310px]">
              <div className="absolute top-8 -left-3.5 w-px h-20 bg-gradient-to-b from-transparent via-[#2a2a2a] to-transparent" />
              <div className="bg-[#111] border border-[#1e1e1e] rounded-[18px] overflow-hidden relative">
                <Image
                  src="/saroj.jpg"
                  alt="Saroj Singh"
                  width={620}
                  height={885}
                  className="w-full object-cover object-top grayscale contrast-[1.08] brightness-95"
                  style={{ aspectRatio: '2.8/4' }}
                  priority
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent px-5 pb-5 pt-10">
                  <div className="text-[15px] font-semibold text-[#ddd]">Saroj Singh</div>
                  <div className="text-[11px] text-[#484848] mt-1 tracking-[0.05em]">Founder &amp; Entrepreneur</div>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 grid grid-cols-5 gap-1.5 opacity-[0.15] pointer-events-none">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-0.5 h-0.5 bg-[#777] rounded-full" />
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom Section: Centered, Shrunk Ventures ── */}
        <div className="w-full pt-8 mt-8 border-t border-[#141414]">
          <div
            className="flex gap-3 md:justify-center overflow-x-auto pb-2 w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {ventures.map((v) => (
              <a
                key={v.name}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2.5 no-underline rounded-[10px] p-2 transition-all duration-200 cursor-pointer"
                style={{
                  minWidth: '175px',
                  backgroundColor: v.accentBg,
                  border: `1px solid ${v.accentBorder}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = v.accent + '60';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = v.accentBorder;
                }}
              >
                <div
                  className="w-[30px] h-[30px] rounded-[6px] overflow-hidden flex items-center justify-center shrink-0"
                  style={{ backgroundColor: v.accentBorder }}
                >
                  <Image
                    src={v.logo}
                    alt={v.name}
                    width={30}
                    height={30}
                    className={`object-contain w-full h-full`}
                  />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="text-[11.5px] font-medium text-[#c0c0c0] leading-tight truncate">
                    {v.name}
                  </div>
                  <div className="text-[9.5px] tracking-tight" style={{ color: v.accent }}>
                    {v.role}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}