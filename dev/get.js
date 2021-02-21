const obj = {
    "test:namespace2": {
        any: "text",
        array: ["1", "2", { val: "3"}]
    }
};

const val = obj?.["test:namespace2"]?.array?.[2] ?? "unknwon";

console.log(val);