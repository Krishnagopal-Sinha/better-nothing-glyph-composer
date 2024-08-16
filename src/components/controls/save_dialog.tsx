import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import ffmpegService from "@/logic/ffmpeg_service";

export default function SaveDialog({ isOpen }: { isOpen: boolean }) {
  const [val, setVal] = useState(isOpen);

  const [saveProgress, setSaveProgress] = useState(
    ffmpegService.getSaveProgress()
  );

  useEffect(() => {
    // throttle down the save percentage updates!
    const timerID = setInterval(() => refreshUi(), 500);

    return () => clearInterval(timerID);
  }, []);

  function refreshUi() {
    // console.log(" refreshing ui every 500ms");
    setSaveProgress(ffmpegService.getSaveProgress());
  }

  return (
    <Dialog open={val}>
      <DialogHeader>Save File</DialogHeader>
      <DialogContent className="overflow-auto dontClose">
        <DialogHeader>
          <DialogTitle>Saving ({saveProgress}% done)</DialogTitle>
          <DialogDescription>
            Don't leave this site! You can close this popup, file will be still
            be processed and saved in the background :D
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center mt-12">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />{" "}
          <div className="text-xl">Saving file</div>
        </div>
        <DialogFooter>
          <Button onClick={() => setVal(false)}>Ok</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
