import { kMajorVersion, kMaxBrightness } from "./consts";

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
    newBlockBrightness: kMaxBrightness,
    currentAudioPositionInMilis: 0,
    // acceptable values 0.5 and 2.0
    audioSpeed: 1,
    // Loop feat. position :: undefined | number
    loopAPositionInMilis: <number | undefined>undefined,
    loopBPositionInMilis: <number | undefined>undefined,
    // scroll position
    editorScrollX: 0,
    // for snap to bpm to slow
    startTimeAccumulator: 0,
    durationAccumulator: 0,
    blockDragAccumulator: 0,
    durationBlockDragAccumulator: 0,

    // Base Phone 1 Info
    NP1: <PhoneSpecificInfo>{
      composer: `v1-Spacewar Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: "5cols",
      custom1: `eNot1TuOHDEMQMHcgG/iBYY/dc/9L2abpUTJywok9fn5/Pn96/MT++a+tW//e2NrbI2tsTW25tbcmltza26trbW1ttbW2tpbe2tv7a29dbbO1tk6W2fr2Xq2nq1n69n6bH22Plufrc/Wd+u79d36bn23frd+t363frd+aXxw0ApcwSsu2BW7ZNfsolELbMEtwAW5QBfsAl7QC3zBLwAGwUAYDANiUAyMwTFABslAGSwDZtAMnMEzgAbRQBpMA2pQDazBNcAG2UAbbANu0E26STfpJt2km3STbtJNunln8g7lnco7lncu6SbdpJt0k27STbpJN+km3aSbdJNu0k26STfpJt2km3STbtJNukk36SbdpJt0k27STbpJN+km3aSbdItu0S26RbfoFt2iW3SLbtEtukW36Bbdumt/9/4u/t38u/p0i27RLbpFt+gW3aJbdItu0S26RbfoFt2iW3SLbtEtukW36Bbdolt0i27RLbpFt+gW3abbdJtu0226TbfpNt2m23SbbtNtuk236Tbdptt0m27fy3pP672t97je60q36Tbdptt0m27TbbpNt+k23abbdJtu0226TbfpNt2m23SbbtNtuk236Q7doTt0h+7QHbpDd+gO3aE7dIfu0B26Q3foDt2hO3SH7tAdukN36M79vO7vdb+v+3/dD4zu0B26Q3foDt2hO3SH7tAdukN36A7doTt0h+7QHbpDd+geuofuoXvoHrqH7qF76B6657/uX0zdN3o=`,
    },
    // Base Phone 1 15 Zone Info
    NP1_15: <PhoneSpecificInfo>{
      composer: `v1-Spacewar Glyph Composer`,
      album: `BNGC v${kMajorVersion}`,
      custom2: "5cols",
      custom1: `eNot1TuOHDEMQMHcgG/iBYY/dc/9L2abpUTJywok9fn5/Pn96/MT++a+tW//e2NrbI2tsTW25tbcmltza26trbW1ttbW2tpbe2tv7a29dbbO1tk6W2fr2Xq2nq1n69n6bH22Plufrc/Wd+u79d36bn23frd+t363frd+aXxw0ApcwSsu2BW7ZNfsolELbMEtwAW5QBfsAl7QC3zBLwAGwUAYDANiUAyMwTFABslAGSwDZtAMnMEzgAbRQBpMA2pQDazBNcAG2UAbbANu0E26STfpJt2km3STbtJNunln8g7lnco7lncu6SbdpJt0k27STbpJN+km3aSbdJNu0k26STfpJt2km3STbtJNukk36SbdpJt0k27STbpJN+km3aSbdItu0S26RbfoFt2iW3SLbtEtukW36Bbdumt/9/4u/t38u/p0i27RLbpFt+gW3aJbdItu0S26RbfoFt2iW3SLbtEtukW36Bbdolt0i27RLbpFt+gW3abbdJtu0226TbfpNt2m23SbbtNtuk236Tbdptt0m27fy3pP672t97je60q36Tbdptt0m27TbbpNt+k23abbdJtu0226TbfpNt2m23SbbtNtuk236Q7doTt0h+7QHbpDd+gO3aE7dIfu0B26Q3foDt2hO3SH7tAdukN36M79vO7vdb+v+3/dD4zu0B26Q3foDt2hO3SH7tAdukN36A7doTt0h+7QHbpDd+geuofuoXvoHrqH7qF76B6657/uX0zdN3o=`,
    },
    // Phone 2 Info

    NP2: <PhoneSpecificInfo>{
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
