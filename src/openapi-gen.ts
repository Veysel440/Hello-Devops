import fs from "node:fs";
import { createApp } from "./app.js";

async function main() {
 
  if (!process.env.SWAGGER_ENABLED) process.env.SWAGGER_ENABLED = "true";

  const app = await createApp();
  await app.ready();


  const doc = app.swagger();

  fs.writeFileSync("openapi.json", JSON.stringify(doc, null, 2));
  await app.close();
  
  console.log("openapi.json generated");
}

main().catch((err) => {
 
  console.error(err);
  process.exit(1);
});
