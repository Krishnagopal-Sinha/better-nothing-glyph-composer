import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import InstructionComponent from "../timeline/instructions";

export default function ControlPanelComponent({
  isSaving,
}: {
  isSaving: boolean;
}) {
  return (
    <div className="flex flex-col justify-between h-max-[50dvh] rounded-lg shadow-lg p-6 flex-grow bg-[#111111]">
      {/* Info Title*/}
      <div>
        <h2 className="text-2xl font-bold text-primary">
          Simple Glyph Composer (ツ)
          <span className="animate-pulse duration-700 text-red-600">
            {" "}
            {isSaving ? "[Processing...]" : ""}
          </span>
        </h2>

        {/*  Info content */}

        <p className="text-muted-foreground">
          This app is usable but is still being actively being worked upon!
          <br />
          Supports: Nothing Phone(1) & Phone(2)
          <br />
          (v0.0.1)
        </p>
        <div></div>
      </div>

      <OpenInstructionButton />
    </div>
  );
}

export function OpenInstructionButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-44">Instruction</Button>
      </DialogTrigger>
      <DialogContent className="min-w-[400px] sm:min-w-[400px] md:min-w-[900px] h-[450px] md:h-fit overflow-auto">
        <InstructionComponent />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="submit">Ok</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
