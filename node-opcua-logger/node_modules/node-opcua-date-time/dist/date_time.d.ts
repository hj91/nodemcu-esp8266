export declare class DateWithPicoseconds extends Date {
    picoseconds: number;
    high_low: number[];
}
export declare const offsetFactor1601: number[];
/**
 *
 * @param date        {Date}
 * @param picoseconds {Number} : represent the portion of the date that cannot be managed by the javascript Date object
 *
 * @returns {[high,low]}
 */
export declare function bn_dateToHundredNanoSecondFrom1601(date: Date, picoseconds: number): any;
export declare function bn_dateToHundredNanoSecondFrom1601Excess(date: Date, picoseconds: number): number;
export declare function bn_hundredNanoSecondFrom1601ToDate(high: number, low: number, picoseconds?: number): DateWithPicoseconds;
export interface PreciseClock {
    timestamp: DateWithPicoseconds;
    picoseconds: number;
}
export interface PreciseClockEx extends PreciseClock {
    tick: number[];
}
/**
 *
 * @return PreciseClock
 */
export declare function getCurrentClockWithJavascriptDate(): PreciseClock;
export declare function installPeriodicClockAdjustmement(): void;
export declare function uninstallPeriodicClockAdjustmement(): void;
export declare function getCurrentClock(): PreciseClock;
export declare function coerceClock(timestamp: any, picoseconds?: number): {
    timestamp: any;
    picoseconds: number;
};
export declare const minOPCUADate: Date;
export declare function isMinDate(date?: Date | null): boolean;
