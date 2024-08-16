type Data = Record<string, unknown>;

class DataStore {
  // Base config
  private data: Data = {
    multiSelect: false,
    newBlockDurationMilis: 500,
    // Max is 4096 but lets keep @ 4095
    newBlockBrightness: 4095,
    currentAudioPositionInMilis: 0,
  };

  //  update
  set<T>(key: string, value: T): void {
    this.data[key] = value;
  }

  get<T>(key: string): T | undefined {
    return this.data[key] as T | undefined;
  }

  delete(key: string): void {
    delete this.data[key];
  }

  getAll(): Data {
    return this.data;
  }
}

// Singleton da ez way
const dataStore = new DataStore();

export default dataStore;
