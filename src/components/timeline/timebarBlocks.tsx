import React, { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import dataStore from "@/lib/data_store";
import useGlobalAppStore from "@/lib/timeline_state";
import { showError } from "@/lib/helpers";

type Props = {
  secondToRespresent: number;
  setLoopAsUiPosition: (value: number | undefined) => void;
  setLoopBsUiPosition: (value: number | undefined) => void;
};
export default function TimeBarBlocks({
  secondToRespresent,
  setLoopAsUiPosition,
  setLoopBsUiPosition,
}: Props) {
  const timelinePixelFactor = useGlobalAppStore(
    (state) => state.appSettings.timelinePixelFactor
  );
  const { duration } = useGlobalAudioPlayer();
  // UI trim show state

  // Cuz right click position would be diff from the menu click pos!
  const [rightClickPosition, setRightClickPosition] = useState<number>(0);

  const updateLoopA = (posInMilis: number) => {
    if (posInMilis <= 0) {
      posInMilis = 1;
    }
    dataStore.set("loopAPositionInMilis", posInMilis);
    setLoopAsUiPosition(posInMilis);
  };
  const onRightClickToMenu = (e: React.MouseEvent) => {
    const scrollValue: number = dataStore.get("editorScrollX") ?? 0;
    // e.clientx alone also works, makes sense but adding scroll to make it proper
    setRightClickPosition(e.clientX + scrollValue);
  };
  const onLoopAClick = (e: React.MouseEvent) => {
    e.stopPropagation(); //needed as otherwise timebar gesture will trigger
    const loopAPositionInMilis =
      (rightClickPosition / timelinePixelFactor) * 1000;

    const loopBPositionInMilis: number | undefined = dataStore.get(
      "loopBPositionInMilis"
    );
    // Check for error with duration and stuff
    if (loopAPositionInMilis > duration * 1000) {
      showError(
        "Invalid Value - Loop A Position",

        "Loop's starting point should be before the audio ends. UI may show it otherwise, but the audio has ended before this point."
      );

      return;
    }
    // When loop B already
    if (loopBPositionInMilis) {
      if (loopAPositionInMilis < loopBPositionInMilis) {
        // add loop a
        updateLoopA(loopAPositionInMilis);
      } else {
        showError(
          "Invalid Value - Loop A Position",

          "Loop's starting point should be before it's ending."
        );
      }
      return;
    }
    // add loop a
    updateLoopA(loopAPositionInMilis);
  };

  const onLoopBClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const loopBPositionInMilis =
      (rightClickPosition / timelinePixelFactor) * 1000;

    const loopAPositionInMilis: number | undefined = dataStore.get(
      "loopAPositionInMilis"
    );
    // Check for error with audio duration
    if (loopBPositionInMilis > duration * 1000) {
      // show error
      showError(
        "Invalid Value - Loop B Position",
        "Loop's ending point should be before the audio ends. UI may show it otherwise, but the audio has ended before this point."
      );

      return;
    }
    // When loop A already
    if (loopAPositionInMilis) {
      if (loopBPositionInMilis > loopAPositionInMilis) {
        // add loop b position
        dataStore.set("loopBPositionInMilis", loopBPositionInMilis);
        setLoopBsUiPosition(loopBPositionInMilis);
      } else {
        showError(
          "Invalid Value - Loop B Position",
          "Loop's ending point must be before it's starting point."
        );
      }
      return;
    }
    // add loop b position

    dataStore.set("loopBPositionInMilis", loopBPositionInMilis);
    setLoopBsUiPosition(loopBPositionInMilis);
  };

  const onResetLoopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dataStore.set("loopBPositionInMilis", undefined);
    dataStore.set("loopAPositionInMilis", undefined);
    setLoopAsUiPosition(undefined);
    setLoopBsUiPosition(undefined);
  };

  // Zone label visibility
  const toggleZoneVisibility = useGlobalAppStore(
    (state) => state.toggleZoneVisibility
  );

  const onShowRowLabel = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleZoneVisibility();
  };

  const isMinuteMark: boolean =
    secondToRespresent !== 0 && secondToRespresent % 60 === 0;
  const isTenSecMark: boolean =
    secondToRespresent !== 0 && secondToRespresent % 10 === 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger onContextMenu={onRightClickToMenu}>
        {/* Time bar blocks */}
        <div
          className={`pt-0 select-none overflow-clip`}
          title={secondToRespresent + "s"}
          style={{
            width: `${timelinePixelFactor}px`,
            paddingLeft: timelinePixelFactor >= 40 ? "10px" : "2px",
            backgroundColor: isMinuteMark
              ? "rgb(85 28 28)"
              : isTenSecMark
              ? "rgb(155 28 28)"
              : "rgb(185 28 28)",
            // color: isMinuteMark ? "black" : "",
            boxShadow: secondToRespresent === 0 ? "" : `1px 0 0 #000 inset`,

            // borderLeftWidth: secondToRespresent != 0 ? "1px" : 0,
          }}
          key={secondToRespresent}
        >
          {timelinePixelFactor < 25 ? <pre> </pre> : secondToRespresent + "s"}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onLoopAClick}>Set Loop A</ContextMenuItem>
        <ContextMenuItem onClick={onLoopBClick}>Set Loop B</ContextMenuItem>
        <ContextMenuItem onClick={onResetLoopClick}>
          Remove Loop
        </ContextMenuItem>
        <ContextMenuItem onClick={onShowRowLabel}>Toggle Zones</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
