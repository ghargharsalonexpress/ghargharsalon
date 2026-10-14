import fs from "fs";

// 1. Path to your actual file (UPDATE THIS)
const filePath = "./salon_for_womenPackages.js";

// 2. Read the file as plain text
let content = fs.readFileSync(filePath, "utf8");

// 3. Replace "key": with key:
content = content.replace(/"([^"]+)"\s*:/g, "$1:");

// 4. Write back to same file
fs.writeFileSync(filePath, content, "utf8");

console.log("✔ Keys updated successfully in:", filePath);
