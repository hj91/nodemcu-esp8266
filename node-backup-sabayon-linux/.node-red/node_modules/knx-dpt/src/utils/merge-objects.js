/**
 * Merge 2 objects together
 */
var merge = function (base, extension) {
    if (typeof base === 'number' || typeof base === 'string') {
        return extension;
    } else if (Array.isArray(base)) {
        var bl = base.length;
        var el = extension.length;
        var rl = Math.max(bl, el);
        result = [];
        for (var i = 0; i < rl; i++) {
            if (i >= bl) {
                result.push(extension[i]);
            } else if (i >= el) {
                result.push(base[i]);
            } else {
                result.push(merge(base[i], extension[i]));
            }
        }
        return result;
    } else if (typeof base === 'object') {
        var result = {};
        for (var baseProp in base) {
            if (!base.hasOwnProperty(baseProp)) continue;
            if (extension.hasOwnProperty(baseProp)) {
                result[baseProp] = merge(base[baseProp], extension[baseProp]);
            } else {
                result[baseProp] = base[baseProp];
            }
        }
        for (var extProp in extension) {
            if (!extension.hasOwnProperty(extProp)) continue;
            if (!base.hasOwnProperty(extProp)) {
                result[extProp] = extension[extProp];
            }
        }
        return result;
    }
};

module.exports = merge;