import { InferModel } from "drizzle-orm";
import { Metadata } from "sst/constructs/Metadata";
import { resource } from "./app.sql";

type Model = InferModel<typeof resource>;

interface Enrichment {
  Function: {
    size: string;
  };
  [key: string]: unknown;
}

export type Info = {
  [key in Metadata["type"]]: Model & {
    type: key;
    metadata: Extract<Metadata, { type: key }>["data"];
    enrichment: Enrichment[key];
  };
}[Metadata["type"]];
