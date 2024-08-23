import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { kAllowedModels, kPhoneModelNames } from "@/lib/consts";

import useGlobalAppStore from "@/lib/timeline_state";
import { toast } from "sonner";

export default function DeviceChoiceComponent() {
  const currentDevice = useGlobalAppStore((state) => state.phoneModel);
  const { clear } = useGlobalAppStore.temporal.getState();
  const changePhoneModel = useGlobalAppStore((state) => state.changePhoneModel);

  // Get all selectable Items
  const selectableItems = [];
  for (let i = 0; i < kAllowedModels.length; i++) {
    const currentAllowedDevice = kAllowedModels[i];
    selectableItems.push(
      <SelectItem key={i} value={currentAllowedDevice}>
        {kPhoneModelNames[currentAllowedDevice]}
      </SelectItem>
    );
  }

  return (
    <Select
      onValueChange={(e: string) => {
        if (e === "NP1_15") {
          toast.info("Caution: NP(1) in 15 Zone Mode", {
            description:
              "This is not well supported well by the Phone(1), premature pausing the track in the middle of the playback may cause Glyph to get stuck, toggle glyph torch On and Off to fix. This is Nothing OS issue, ask Nothing to fix!",
            action: {
              label: "Ok",
              onClick: () => {},
            },
          });
        }

        changePhoneModel(e);
        // clear undo n redo states
        clear();
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={kPhoneModelNames[currentDevice]} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Nothing Phones</SelectLabel>
          {selectableItems}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
