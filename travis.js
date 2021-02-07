process.env.URI = "bolt://localhost:7687";

module.exports =  {
    "collectCoverageFrom": [
        "lib/*.js",
        "lib/util/*.js",
        "!node_modules/",
        "!/dev/",
        "!test/helper/*.js"
    ],
    "testPathIgnorePatterns": [
        "/node_modules/",
        "/dev/"
    ],
    "rootDir": ".",
    "roots": [
        "./test"
    ]
};