/* eslint-disable @typescript-eslint/no-explicit-any */
import 'node-persist';

declare module 'node-persist' {
  export type InitOptions = {
    ttl: boolean;
    logging: boolean;
    encoding: string;
    parse: (text: string) => any;
    stringify: (value: any) => string;
    forgiveParseErrors: boolean;
    expiredInterval: number /* milliseconds */;
    dir: string;
    writeQueue: boolean;
    writeQueueIntervalMs: number;
    writeQueueWriteOnlyLast: boolean;
    maxFileDescriptors: number;
  };

  interface LocalStorage {
    options: InitOptions;
    initSync(options?: InitOptions): InitOptions;
    _writeQueueInterval?: NodeJS.Timeout;
    _expiredKeysInterval?: NodeJS.Timeout;
    stopWriteQueueInterval(): void;
  }
}
