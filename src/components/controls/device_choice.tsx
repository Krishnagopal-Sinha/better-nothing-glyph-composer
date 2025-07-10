import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { kAllowedModels, kPhoneModelNames } from '@/lib/consts';

import useGlobalAppStore from '@/lib/timeline_state';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function DeviceChoiceComponent() {
  const currentDevice = useGlobalAppStore((state) => state.phoneModel);
  const { clear } = useGlobalAppStore.temporal.getState();
  const changePhoneModel = useGlobalAppStore((state) => state.changePhoneModel);
  const [, setLocation] = useLocation();

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

  /**
   * Handle device selection with special routing for NP3
   * @param selectedDevice - The selected device model
   */
  const handleDeviceChange = (selectedDevice: string) => {
    // Special handling for NP3 - navigate to custom page
    if (selectedDevice === 'NP3') {
      // TODO: Add a warning for NP3
      toast.info('NP3 is in pre alpha, please be aware of potential issues', {
        description: 'The performance of might be unstable, please be aware of potential issues',
        action: {
          label: 'Ok',
          onClick: () => {}
        },
        duration: 2500
      });
      setLocation('/np3');
      return;
    }

    changePhoneModel(selectedDevice);
    // clear undo n redo states
    clear();
  };

  return (
    <Select onValueChange={handleDeviceChange}>
      <SelectTrigger className="text-sm sm:text-base">
        <SelectValue placeholder={kPhoneModelNames[currentDevice]} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-sm sm:text-base">Nothing Phones</SelectLabel>
          {selectableItems}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
