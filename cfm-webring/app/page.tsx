'use client';

import { useState, useRef } from 'react';
import Navbar from './components/Navbar';
import PixelTrail from './components/PixelTrail';

export default function Home() {
  const [started, setStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleStart = () => {
    audioRef.current?.play();
    setStarted(true);
  };

  return (
    <div className="bg-black">

      <div className="fixed top-4 left-4 z-10">
          <Navbar />
      </div>

      <audio ref={audioRef} src="/music/thick_of_it_thomas_remix.mp3" loop />

      {!started && (
        <div
          onClick={handleStart}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black cursor-pointer"
        >
          <div className="text-white text-center">
            <p className="text-2xl tracking-[0.2em] uppercase">ready?</p>
            <p className="text-sm tracking-[0.3em] uppercase opacity-50 mt-2">click to start</p>
          </div>
        </div>
      )}

      <div className="relative h-screen overflow-hidden flex items-center justify-center">

        <div className="relative h-full" style={{ aspectRatio: '3024 / 1964' }}>
          <video
            src="/videos/landing_page.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full"
          />

          {/* left */}
          <div className="absolute inset-y-0 left-0 w-24 pointer-events-none" style={{ background: "linear-gradient(to right, black, transparent)" }} />
          {/* right */}
          <div className="absolute inset-y-0 right-0 w-24 pointer-events-none" style={{ background: "linear-gradient(to left, black, transparent)" }} />
          {/* top */}
          <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: '2.5%', background: "linear-gradient(to bottom, black, transparent)" }} />
          {/* bottom */}
          <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: '2.5%', background: "linear-gradient(to top, black, transparent)" }} />
        </div>

        {/* PixelTrail in its own absolute container filling the full screen */}
        <div className="absolute inset-0">
          <PixelTrail
            gridSize={100}
            trailSize={0.02}
            maxAge={250}
            interpolate={2}
            color="#ffffff"
          />
        </div>
      </div>

      <section className="relative min-h-screen text-white flex items-center justify-center">
        HELLO
      </section>

    </div>
  );
}
