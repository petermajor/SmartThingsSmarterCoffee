'use strict';

module.exports = {
    port : 2081,

    acknowledgementSuccessByte : 0x0,
    acknowledgementReplyByte : 0x3,
    acknowledgementNoCarafeByte : 0x5,
    statusReplyByte : 0x32,
    brewOnRequestByte : 0x33,
    brewOffRequestByte : 0x34,
    strengthRequestByte : 0x35,
    cupsRequestByte : 0x36,
    brewOnDefaultRequestByte : 0x37,
    toggleGrindRequestByte : 0x3C,
    hotplateOnRequestByte : 0x3E,
    hotplateOffRequestByte : 0x4A,
    discoverRequestByte : 0x64,
    discoverReplyByte : 0x65,

    coffeeDeviceType : 0x02,
    
    messageTerminator : 0x7E
};
