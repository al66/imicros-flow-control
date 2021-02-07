const { v4: uuid } = require("uuid");

const credentials = {
    ownerId: uuid(),
    serviceId: uuid(),
    authToken: "this is the super secret service authorization token",
    serviceToken: "this is the emitted service token - emitted by agents",
    grantToken: "this is the grantToken emitted by the acl service and passed through by the agent service"
};

module.exports = {
    credentials
};
