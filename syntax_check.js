const fs = require('fs');
const path = "temp_load.js";

try {
    const content = fs.readFileSync(path, 'utf8');
    // Wrap in a function to allow return statements
    const wrapped = "(function() { " + content + " })";
    // Attempt to parse
    new Function(wrapped);
    console.log("Syntax OK");
} catch (e) {
    console.log("Syntax Error: " + e.message);
    console.log(e.stack);
}
