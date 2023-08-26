import { promisify } from "util";
import zlib from "zlib";

export function compress(input: zlib.InputType) {
  return promisify(zlib.gzip)(input);
}

export function decompress(input: zlib.InputType) {
  return promisify(zlib.gunzip)(input);
}
