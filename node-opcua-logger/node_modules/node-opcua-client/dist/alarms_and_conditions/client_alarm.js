"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_nodeid_1 = require("node-opcua-nodeid");
const node_opcua_utils_1 = require("node-opcua-utils");
/**
 * describes a OPCUA Alarm as seen in the client side
 */
class ClientAlarm extends events_1.EventEmitter {
    constructor(eventFields) {
        super();
        this.conditionId = node_opcua_nodeid_1.resolveNodeId(eventFields.conditionId.value);
        this.eventType = node_opcua_nodeid_1.resolveNodeId(eventFields.eventType.value);
        this.eventId = eventFields.eventId.value;
        this.fields = eventFields;
        this.update(eventFields);
    }
    acknowledge(session, comment) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield session.acknowledgeCondition(this.conditionId, this.eventId, comment);
        });
    }
    confirm(session, comment) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield session.confirmCondition(this.conditionId, this.eventId, comment);
        });
    }
    update(eventFields) {
        node_opcua_assert_1.assert(this.conditionId.toString() === node_opcua_nodeid_1.resolveNodeId(eventFields.conditionId.value).toString());
        node_opcua_assert_1.assert(this.eventType.toString() === node_opcua_nodeid_1.resolveNodeId(eventFields.eventType.value).toString());
        this.eventId = eventFields.eventId.value;
        this.fields = eventFields;
    }
    getRetain() {
        return this.fields.retain.value;
    }
}
exports.ClientAlarm = ClientAlarm;
// ------------------------------------------------------------------------------------------------------------------------------
function fieldsToJson(fields, eventFields) {
    function setProperty(_data, fieldName, value) {
        let name;
        if (!fieldName || value === null) {
            return;
        }
        const f = fieldName.split(".");
        if (f.length === 1) {
            fieldName = node_opcua_utils_1.lowerFirstLetter(fieldName);
            _data[fieldName] = value;
        }
        else {
            for (let i = 0; i < f.length - 1; i++) {
                name = node_opcua_utils_1.lowerFirstLetter(f[i]);
                _data[name] = _data[name] || {};
                _data = _data[name];
            }
            name = node_opcua_utils_1.lowerFirstLetter(f[f.length - 1]);
            _data[name] = value;
        }
    }
    if (fields.length > eventFields.length) {
        // tslint:disable-next-line: no-console
        console.log("warning fields.length !==  eventFields.length", fields.length, eventFields.length);
    }
    const data = {};
    for (let index = 0; index < fields.length; index++) {
        const variant = eventFields[index];
        setProperty(data, fields[index], variant);
    }
    setProperty(data, "conditionId", eventFields[eventFields.length - 1]);
    return data;
}
exports.fieldsToJson = fieldsToJson;
//# sourceMappingURL=client_alarm.js.map