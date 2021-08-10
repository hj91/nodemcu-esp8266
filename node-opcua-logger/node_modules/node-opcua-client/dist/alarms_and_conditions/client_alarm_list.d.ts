/// <reference types="node" />
import { EventEmitter } from "events";
import { ClientAlarm, EventStuff } from "./client_alarm";
export interface ClientAlarmList {
    on(eventName: "alarmChanged", handler: (alarm: ClientAlarm) => void): this;
    on(eventName: "newAlarm", handler: (alarm: ClientAlarm) => void): this;
}
export declare class ClientAlarmList extends EventEmitter implements Iterable<ClientAlarm> {
    private _map;
    constructor();
    [Symbol.iterator](): Iterator<ClientAlarm>;
    alarms(): ClientAlarm[];
    update(eventField: EventStuff): void;
    removeAlarm(eventField: EventStuff): void;
    readonly length: number;
    purgeUnusedAlarms(): void;
    private _removeAlarm;
    private makeKey;
    private findAlarm;
    private deleteAlarm;
}
