import { EllipsisVertical } from "lucide-react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "../ui/menubar";
import useGlobalAppStore from "@/lib/timeline_state";
import fileDownload from "js-file-download";
import { getDateTime } from "@/lib/helpers";
import { useFilePicker } from "use-file-picker";
import { useEffect } from "react";

export default function MoreMenuButton() {
  const timelineData = useGlobalAppStore((state) => state.items);
  const phoneModel = useGlobalAppStore((state) => state.phoneModel);
  const importJsonData = useGlobalAppStore((state) => state.importJsonData);
  const { openFilePicker, filesContent, errors } = useFilePicker({
    accept: ".json",
    multiple: false,
  });

  useEffect(() => {
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        importJsonData(filesContent[0].content);
      } catch (e) {
        console.error("Error while loading Glyph data file:", e);
      }
    } else if (errors.length > 0) {
      console.error("Error while selecting Glyph data file:", errors);
      alert(
        `File error.\nError while importing Glyph data file, possible file format mismatch?`
      );
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
  return (
    <>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>
            <EllipsisVertical />
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onImportGlyphClick}>
              Import Glyph Data
            </MenubarItem>
            <MenubarItem onClick={onExportGlyphClick}>
              Export Glyph Data
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </>
  );
}
