import { db } from "./server/db";
import { conversations } from "./shared/models/chat";

async function main() {
  console.log("Inserting conversation...");
  const result = await db.insert(conversations).values({ title: "DIRECT DB TEST" }).returning();
  console.log("Inserted:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
