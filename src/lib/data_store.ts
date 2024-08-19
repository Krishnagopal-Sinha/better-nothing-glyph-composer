import { kMajorVersion } from "./consts";

type Data = Record<string, unknown>;
//Base info - title and author should must from other sources!
export type PhoneSpecificInfo = {
  custom1: string; //TODO: remove this !
  custom2: string;
  composer: string;
  album: string;
};

class DataStore {
  // Base config
  private baseConfig: Data = {
    multiSelect: false,
    overwriteBrightnessWithNewBlock: false,
    newBlockDurationMilis: 500,
    // tracking it for no reason
    isAudioLoaded: false,
    // Max is 4095 but 4096 was working fine too in app.
    newBlockBrightness: 4095,
    currentAudioPositionInMilis: 0,
    // acceptable values 0.5 and 2.0
    audioSpeed: 1,
    // Loop feat. position :: undefined | number
    loopAPositionInMilis: <number | undefined>undefined,
    loopBPositionInMilis: <number | undefined>undefined,
    showEditorRowLabel:false,
    // scroll position
    editorScrollX: 0,

    // Base Phone 1 Info
    NP1: <PhoneSpecificInfo>{
      composer: `v1-Spacewar Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: "5cols",
      custom1: `eNoljVsKAEEIwy60A+r4qPe/2E7pj8FAiZ340vvYh8S7HjBiPB7ivUQ1ZexS3owkUJxlDGWOUZZfyqrmrs24awVahVFhVIAKUAEqrAqrwg8LSR98`,
    },
    // Phone 2 Info
    NP2_15: <PhoneSpecificInfo>{
      composer: `v1-Pong Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: "33cols",
      custom1: `eNoljVsKAEEIwy60A+r4qPe/2E7pj8FAiZ340vvYh8S7HjBiPB7ivUQ1ZexS3owkUJxlDGWOUZZfyqrmrs24awVahVFhVIAKUAEqrAqrwg8LSR98`,
    },
    NP2_33: <PhoneSpecificInfo>{
      composer: `v1-Pong Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: "33cols",
      custom1: `eNoljVsKAEEIwy60A+r4qPe/2E7pj8FAiZ340vvYh8S7HjBiPB7ivUQ1ZexS3owkUJxlDGWOUZZfyqrmrs24awVahVFhVIAKUAEqrAqrwg8LSR98`,
    },
    // Phone 2a Info
    NP2a: <PhoneSpecificInfo>{
      composer: `v1-Pacman Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: "26cols",
      custom1: `eNoljVsKAEEIwy60A+r4qPe/2E7pj8FAiZ340vvYh8S7HjBiPB7ivUQ1ZexS3owkUJxlDGWOUZZfyqrmrs24awVahVFhVIAKUAEqrAqrwg8LSR98`,
    },
  };
  // Actual data store
  private data: Data = { ...this.baseConfig };

  //  update
  set<T>(key: string, value: T): void {
    this.data[key] = value;
  }

  get<T>(key: string): T | undefined {
    const data = this.data[key];

    // DEBUG
    // console.log(`DataDump: ${key} :: ${data}`);
    return data as T | undefined;
  }

  delete(key: string): void {
    delete this.data[key];
  }

  getAll(): Data {
    return this.data;
  }

  // Can't see a use for this yet
  reset(): void {
    this.data = { ...this.baseConfig };
  }
}

// Singleton da ez way
const dataStore = new DataStore();

export default dataStore;

// if (
//   !data &&
//   key != "loopAPositionInMilis" &&
//   key != "loopBPositionInMilis" && typeof data !== 'boolean'
// ) {
//   console.error(
//     `Data Store issue, unable to read stored data. ErrorDebugLabel: ${key}`
//   );
// }
