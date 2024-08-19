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

import useTimelineStore from "@/lib/timeline_state";

export default function DeviceChoiceComponent() {
  const currentDevice = useTimelineStore((state) => state.phoneModel);
  const changePhoneModel = useTimelineStore((state) => state.changePhoneModel);

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
        changePhoneModel(e);
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
