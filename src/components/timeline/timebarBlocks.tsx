import React, { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import dataStore from "@/lib/data_store";
import { kMagicNumber } from "@/lib/consts";
import { toast } from "sonner";

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
    setRightClickPosition(e.pageX);
  };
  const onLoopAClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const loopAPositionInMilis = (rightClickPosition / kMagicNumber) * 1000;

    const loopBPositionInMilis: number | undefined = dataStore.get(
      "loopBPositionInMilis"
    );
    // Check for error with duration and stuff
    if (loopAPositionInMilis > duration * 1000) {
      // show error
      toast.error("Invalid Value - Loop A Position", {
        description:
          "Loop's starting point should be before the audio ends. UI may show it otherwise, but the audio has ended before this point.",
        action: {
          label: "Ok",
          onClick: () => {},
        },
      });
      return;
    }
    // When loop B already
    if (loopBPositionInMilis) {
      if (loopAPositionInMilis < loopBPositionInMilis) {
        // add loop a
        updateLoopA(loopAPositionInMilis);
      } else {
        // show error
        toast.error("Invalid Value - Loop A Position", {
          description: "Loop's starting point should be before it's ending.",
          action: {
            label: "Ok",
            onClick: () => {},
          },
        });
      }
      return;
    }
    // add loop a
    updateLoopA(loopAPositionInMilis);
  };

  const onLoopBClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const loopBPositionInMilis = (rightClickPosition / kMagicNumber) * 1000;

    const loopAPositionInMilis: number | undefined = dataStore.get(
      "loopAPositionInMilis"
    );
    // Check for error with audio duration
    if (loopBPositionInMilis > duration * 1000) {
      // show error
      toast.error("Invalid Value - Loop B Position", {
        description:
          "Loop's ending point should be before the audio ends. UI may show it otherwise, but the audio has ended before this point.",
        action: {
          label: "Ok",
          onClick: () => {},
        },
      });
      return;
    }
    // When loop A already
    if (loopAPositionInMilis) {
      if (loopBPositionInMilis > loopAPositionInMilis) {
        // add loop b position
        dataStore.set("loopBPositionInMilis", loopBPositionInMilis);
        setLoopBsUiPosition(loopBPositionInMilis);
      } else {
        // show error
        toast.error("Invalid Value - Loop B Position", {
          description:
            "Loop's ending point must be before it's starting point.",
          action: {
            label: "Ok",
            onClick: () => {},
          },
        });
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
  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="border-r"
        onContextMenu={onRightClickToMenu}
      >
        <div
          className="pl-[10px] leading-[17px]"
          style={{ width: `${kMagicNumber}px` }}
          key={secondToRespresent}
        >
          {secondToRespresent}s
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onLoopAClick}>Set loop A</ContextMenuItem>
        <ContextMenuItem onClick={onLoopBClick}>Set loop B</ContextMenuItem>
        <ContextMenuItem onClick={onResetLoopClick}>
          Remove loop
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
