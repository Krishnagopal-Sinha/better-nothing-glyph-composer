import { kMagicNumber } from "@/lib/consts";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import TimeBarBlocks from "./timebarBlocks";
import { useState } from "react";

export default function TimeBarComponent() {
  const { duration, seek, playing, play, pause, setVolume, volume } =
    useGlobalAudioPlayer();
  // -> duration from audio player in Seconds; convert to milis
  const boxesToGenerate = Math.ceil(duration);

  // loop ui show state
  const [loopAsUiPosition, setLoopAsUiPosition] = useState<
    number | undefined
  >();
  const [loopBsUiPosition, setLoopBsUiPosition] = useState<
    number | undefined
  >();

  const row = [];
  for (let i = 0; i < boxesToGenerate; i++) {
    // Timebar blocks representing seconds + loop feat triggers
    row.push(
      <TimeBarBlocks
        key={i}
        secondToRespresent={i}
        setLoopAsUiPosition={setLoopAsUiPosition}
        setLoopBsUiPosition={setLoopBsUiPosition}
      />
    );
  }

  return (
    <div
      title={`Seek audio by touching anywhere here...\nRight-click for loop options`}
      className="bg-red-700 h-[20px] flex cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        const oldVol = volume;
        const seekPosition = e.pageX / kMagicNumber; //in seconds fyi

        // Bug Fix - seek not updating position related
        if (!playing) {
          setVolume(0);
          play();
          // Bug fix - audio precesion on seek due to above bug fix this offset gotta happen
          // Bug fix, 0.02ish is the least it'll take!

          seek(seekPosition > 0.1 ? seekPosition - 0.09 : seekPosition);

          setTimeout(pause, 50);
          setTimeout(() => setVolume(oldVol), 50);
        } else {
          // Bug fix, 0.02ish is the least it'll take!

          seek(seekPosition > 0.1 ? seekPosition - 0.09 : seekPosition);
        }

        // console.warn(`seeked @-> ${seekPosition} | ${playing}`);
      }}
    >
      {/* loop indicator */}
      {loopAsUiPosition && (
        <LoopPositionIndicator position={loopAsUiPosition}>
          A
        </LoopPositionIndicator>
      )}
      {loopBsUiPosition && loopBsUiPosition > 0 && (
        <LoopPositionIndicator position={loopBsUiPosition}>
          B
        </LoopPositionIndicator>
      )}
      {row}
    </div>
  );
}

      {/* loop indicator */}

export function LoopPositionIndicator({
  children,
  position: positionInMilis,
}: {
  children: string;
  position: number;
}) {
  return (
    <div
      className={`absolute bg-white text-black font-bold px-[2px] leading-[18px] rounded-b-full select-none`}
      // convert back into pixel from milis
      style={{
        // minus 5 cuz offset of padding n all
        left: `${(positionInMilis / 1000) * kMagicNumber - 4}px`,
      }}
    >
      {children}
    </div>
  );
}
