import { EllipsisVertical } from 'lucide-react';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '../ui/menubar';
import useGlobalAppStore from '@/lib/timeline_state';
import fileDownload from 'js-file-download';
import { getDateTime } from '@/lib/helpers';
import { useFilePicker } from 'use-file-picker';
import { useEffect } from 'react';
import { Dialog, DialogTrigger } from '../ui/dialog';
import SettingDialogContent from './more_dialog_content';
import { generateCSV } from '@/logic/export_logic';
import dataStore from '@/lib/data_store';

// type Props = {
//   isAdvOpen: boolean;
//   setIsAdvOpen: (value: boolean) => void;
// };
export default function MoreMenuButton() {
  const timelineData = useGlobalAppStore((state) => state.items);
  const phoneModel = useGlobalAppStore((state) => state.phoneModel);
  // BugFix: Block backspace key from poping off the dialog by triggering UI updates, along with other keyboard gesture. Lift state to top, cuz renderes causing useState to reinit :(
  const isSettingsDialogOpen = useGlobalAppStore((state) => state.appSettings.isSettingsDialogOpen);
  const setIsSettingsDialogOpen = useGlobalAppStore((state) => state.setIsSettingsDialogOpen);
  // Dialog Content Index
  const settingDialogContentIndex = useGlobalAppStore(
    (state) => state.appSettings.settingDialogContentIndex
  );
  const setDialogContentIndex = useGlobalAppStore((state) => state.setSettingsDialogContentIndex);

  const importJsonData = useGlobalAppStore((state) => state.importJsonData);
  const { openFilePicker, filesContent, errors } = useFilePicker({
    accept: '.json',
    multiple: false
  });

  useEffect(() => {
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        importJsonData(filesContent[0].content);
      } catch (e) {
        console.error('Error while loading Glyph data file:', e);
      }
    } else if (errors.length > 0) {
      console.error('Error while selecting Glyph data file:', errors);
      alert(`File error.\nError while importing Glyph data file, possible file format mismatch?`);
    }
  }, [filesContent, errors, importJsonData]);

  if (errors.length) {
    console.error(`Failed to import Glyph data: ${errors}`);
  }
  const onImportGlyphClick = () => {
    openFilePicker();
  };

  const onExportGlyphClick = () => {
    const jsonString = JSON.stringify(timelineData, null, 2); //prettify it a lil'
    fileDownload(jsonString, `${phoneModel}_glyph_data_${getDateTime()}.json`);
  };

  const onExportGlyphCsvClick = () => {
    const csvToExport = generateCSV(
      timelineData,
      dataStore.get('currentAudioDurationInMilis') as number
    );
    fileDownload(csvToExport, `${phoneModel}_glyph_data_${getDateTime()}.csv`);
  };
  // Dialog was not getting opened as on MenuItem click, menu unmounts, so nothing else is there to show, this is the only way to escape that.
  return (
    <>
      <Dialog open={isSettingsDialogOpen}>
        <DialogTrigger asChild>
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>
                <EllipsisVertical />
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem
                  onClick={() => {
                    setIsSettingsDialogOpen(true);
                    setDialogContentIndex(0);
                  }}
                >
                  Edit Selected (Advanced)
                </MenubarItem>

                <MenubarItem
                  onClick={() => {
                    setIsSettingsDialogOpen(true);
                    setDialogContentIndex(1);
                  }}
                >
                  Generate Glyphs (Advanced)
                </MenubarItem>

                <MenubarItem
                  onClick={() => {
                    setIsSettingsDialogOpen(true);
                    setDialogContentIndex(2);
                  }}
                >
                  Embed Custom Watermark&nbsp;<span className="font-[ndot]">;)</span>
                </MenubarItem>

                <MenubarItem onClick={onImportGlyphClick}>Import Glyph Data</MenubarItem>
                <MenubarItem onClick={onExportGlyphClick}>
                  Export Project (.json) | BNGC
                </MenubarItem>

                <MenubarItem onClick={onExportGlyphCsvClick}>
                  Export Glyph Data (.csv) | Custom ROMs
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </DialogTrigger>
        <SettingDialogContent dialogContentIdx={settingDialogContentIndex} />
      </Dialog>
    </>
  );
}
