"use client";

import { kMagicNumber } from "@/lib/consts";
import { useGlobalAudioPlayer } from "react-use-audio-player";

export default function TimeBarComponent() {
  const { duration, seek, playing, play, pause, setVolume, volume } =
    useGlobalAudioPlayer();
  // -> duration from audio player in Seconds; convert to milis
  const boxesToGenerate = Math.ceil(duration);

  const row = [];
  for (let i = 0; i < boxesToGenerate; i++) {
    row.push(
      <div
        className=" border-l "
        style={{ width: `${kMagicNumber}px` }}
        key={i}
      >
        {i}s
      </div>
    );
  }
  return (
    <div
      className="bg-red-500 h-[20px] flex cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        const oldVol = volume;
        const seekPosition = e.pageX / kMagicNumber;

        // Bug Fix - seek not updating position related
        if (!playing) {
          setVolume(0);
          play();
          // Bug fix - audio precesion on seek due to above bug fix this offset gotta happen
          seek(seekPosition - 0.09);

          setTimeout(pause, 50);
          setTimeout(() => setVolume(oldVol), 50);
        } else {
          seek(seekPosition);
        }

        console.warn(`seeked @-> ${seekPosition} | ${playing}`);
      }}
    >
      {row}
    </div>
  );
}
