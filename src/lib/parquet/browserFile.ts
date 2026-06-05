import type { AsyncBuffer } from "hyparquet";

export function asyncBufferFromBrowserFile(file: File): AsyncBuffer {
  return {
    byteLength: file.size,
    slice: (start: number, end?: number) => file.slice(start, end).arrayBuffer(),
  };
}
