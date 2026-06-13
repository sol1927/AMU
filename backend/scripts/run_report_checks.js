// helper runner - not necessary but kept
import { connectDB } from "../src/config/db.js";
(async () => {
  await connectDB();
  console.log("db ok");
  process.exit(0);
})();
