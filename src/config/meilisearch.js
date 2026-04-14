import { Meilisearch } from "meilisearch";
import dotenv from "dotenv";

dotenv.config();

const client = new Meilisearch({
  host: process.env.MEILI_HOST || "http://localhost:7700",
  apiKey: process.env.MEILI_API_KEY,
});

export default client;
