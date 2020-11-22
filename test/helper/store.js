const fs = require("fs");

let store = {};

function load (ownerId, objectName, filePath) {
    let internal = Buffer.from(ownerId + "~" + objectName).toString("base64");
    store[internal] = fs.readFileSync(filePath).toString();
}

// mock imicros-minio mixin
const Store = (/*options*/) => { return {
    methods: {
        async putString ({ ctx = null, objectName = null, value = null } = {}) {
            if ( !ctx || !objectName ) return false;
            
            let internal = Buffer.from(ctx.meta.acl.ownerId + "~" + objectName).toString("base64");
            
            this.store[internal] = value;
            return true;
        },
        async getString ({ ctx = null, objectName }) {
            if ( !ctx || !objectName ) throw new Error("missing parameter");

            let internal = Buffer.from(ctx.meta.acl.ownerId + "~" + objectName).toString("base64");
            
            return this.store[internal];            
        }   
    },
    created () {
        this.store = store;
    }
}; };

module.exports = {
    store,
    load,
    Store
};
