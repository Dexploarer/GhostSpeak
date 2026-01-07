/**
 * Knowledge Ingestion
 *
 * Provides actions to ingest documentation and other data into the RAG component.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { rag } from "./rag";

/**
 * Ingest text content into a RAG namespace
 */
export const ingest = action({
    args: {
        text: v.string(),
        namespace: v.string(),
        title: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        console.log(`📥 Ingesting content into namespace: ${args.namespace}`);

        await rag.add(ctx, {
            namespace: args.namespace,
            text: args.text,
            metadata: {
                ...(args.metadata || {}),
                title: args.title || "Untitled",
                ingestedAt: Date.now(),
            },
        });

        return { success: true };
    },
});
