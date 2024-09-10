import { kMajorVersion, kMaxBrightness } from './consts';

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
    playbackSpeed: 1,
    // tracking it for no reason
    isAudioLoaded: false,
    // Max is 4095 but 4096 was working fine too in app.
    newBlockBrightness: kMaxBrightness,
    currentAudioPositionInMilis: 0,
    currentAudioDurationInMilis: 0,
    // acceptable values 0.5 and 2.0
    audioSpeed: 1,
    // scroll position
    editorScrollX: 0,
    // for snap to bpm to slow
    startTimeAccumulator: 0,
    durationAccumulator: 0,
    blockDragAccumulator: 0,
    durationBlockDragAccumulator: 0,
    exportCustom1: 'eNoDAAAAAAE=',

    // Note: Phone custom 1 are just legacy, TOOD: Remove when ya have time
    // Base Phone 1 Info
    NP1: <PhoneSpecificInfo>{
      composer: `v1-Spacewar Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: '5cols',
      custom1: `eNoDAAAAAAE=`
    },
    // Base Phone 1 15 Zone Info
    NP1_15: <PhoneSpecificInfo>{
      composer: `v1-Spacewar Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: '5cols',
      custom1: `eNoDAAAAAAE=`
    },
    // Phone 2 Info

    NP2: <PhoneSpecificInfo>{
      composer: `v1-Pong Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: '33cols',
      custom1: `eNoDAAAAAAE=`
    },
    // Phone 2a Info
    NP2a: <PhoneSpecificInfo>{
      composer: `v1-Pacman Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: '26cols',
      custom1: `eNoDAAAAAAE=`
    }
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
