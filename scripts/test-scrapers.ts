/**
 * Test script to verify scrapers work. Run: npx tsx scripts/test-scrapers.ts
 */
import { SCRAPERS, type ScraperId } from "../lib/scrapers";

async function main() {
  const ids = Object.keys(SCRAPERS) as ScraperId[];
  console.log("Testing scrapers:", ids.join(", "));

  for (const id of ids) {
    try {
      const { run, name } = SCRAPERS[id];
      console.log(`\n--- ${name} ---`);
      const items = await run(1);
      console.log(`Found ${items.length} scholarships`);
      if (items.length > 0) {
        const sample = items[0];
        console.log("Sample:", {
          title: sample.title?.slice(0, 50),
          amount: sample.amount,
          sponsor: sample.sponsor,
        });
      }
    } catch (e) {
      console.error(`${id} failed:`, e);
    }
  }
}

main();
