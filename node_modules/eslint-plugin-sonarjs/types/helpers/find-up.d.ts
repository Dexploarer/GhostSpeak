import type { vol } from 'memfs';
interface Stats {
    isFile(): boolean;
}
export interface Filesystem {
    readdirSync: (typeof vol)['readdirSync'];
    readFileSync(path: string): Buffer | string;
    statSync(path: string): Stats;
}
interface File {
    readonly path: string;
    readonly content: Buffer | string;
}
type FindUp = (from: string, to?: string, filesystem?: Filesystem) => Array<File>;
/**
 * Create an instance of FindUp.
 */
export declare const createFindUp: (pattern: string) => FindUp;
export {};
