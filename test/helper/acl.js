const { credentials } = require("./credentials");

class User {
    constructor () {
        let timestamp = Date.now();
        return {
            id: `1-${timestamp}` , 
            email: `1-${timestamp}@host.com`
        };
    }
}

const user = new User();
const meta = {
    ownerId: credentials.ownerId,
    acl: {
        accessToken: credentials.accessToken,
        ownerId: credentials.ownerId
    }, 
    user: user
}; 

module.exports = {
    meta
};
