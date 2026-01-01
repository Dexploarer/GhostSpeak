# File Storage and Scheduling

## Table of Contents
- [File Storage](#file-storage)
- [Scheduled Functions](#scheduled-functions)
- [Cron Jobs](#cron-jobs)
- [Background Jobs Pattern](#background-jobs-pattern)

---

## File Storage

### Storage Schema

Files are stored separately from documents. You store a reference (`Id<"_storage">`) in your documents.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    name: v.string(),
    fileId: v.id("_storage"),  // Reference to stored file
  }),

  users: defineTable({
    name: v.string(),
    avatarId: v.optional(v.id("_storage")),
  }),
});
```

### Upload Flow

#### Step 1: Generate Upload URL

```typescript
// convex/files.ts
import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Optionally check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});
```

#### Step 2: Upload from Client

```typescript
"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export function FileUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Step 3: Save file reference to database
      await saveFile({
        storageId,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <input
      type="file"
      onChange={handleUpload}
      disabled={uploading}
    />
  );
}
```

#### Step 3: Save File Reference

```typescript
// convex/files.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    return await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      type: args.type,
      size: args.size,
      uploadedBy: identity.subject,
      uploadedAt: Date.now(),
    });
  },
});
```

### Serving Files

```typescript
// convex/files.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getFileWithUrl = query({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id);
    if (!file) return null;

    const url = await ctx.storage.getUrl(file.storageId);
    return { ...file, url };
  },
});

export const listWithUrls = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.query("files").collect();

    return Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
  },
});
```

### Displaying Files

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function FileList() {
  const files = useQuery(api.files.listWithUrls, {});

  if (!files) return <div>Loading...</div>;

  return (
    <div>
      {files.map((file) => (
        <div key={file._id}>
          {file.type.startsWith("image/") ? (
            <img src={file.url} alt={file.name} />
          ) : (
            <a href={file.url} download={file.name}>
              {file.name}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Deleting Files

```typescript
// convex/files.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const deleteFile = mutation({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id);
    if (!file) throw new Error("File not found");

    // Delete from storage
    await ctx.storage.delete(file.storageId);

    // Delete database record
    await ctx.db.delete(args.id);
  },
});
```

### File Metadata

```typescript
// convex/files.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getMetadata = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const metadata = await ctx.storage.getMetadata(args.storageId);
    // Returns: { contentType: string, size: number }
    return metadata;
  },
});
```

### Image Processing Example

```typescript
// convex/images.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const processImage = action({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    // Get file info
    const file = await ctx.runQuery(api.files.get, { id: args.fileId });
    if (!file) throw new Error("File not found");

    // Get file URL
    const url = await ctx.storage.getUrl(file.storageId);
    if (!url) throw new Error("File URL not found");

    // Download and process with external service
    const response = await fetch("https://api.example.com/resize", {
      method: "POST",
      body: JSON.stringify({ imageUrl: url, width: 800 }),
    });

    const processedImage = await response.arrayBuffer();

    // Upload processed image
    const uploadUrl = await ctx.storage.generateUploadUrl();
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: processedImage,
    });

    const { storageId } = await uploadResult.json();

    // Save processed image reference
    await ctx.runMutation(internal.files.saveProcessed, {
      originalId: args.fileId,
      processedStorageId: storageId,
    });
  },
});
```

---

## Scheduled Functions

### runAfter (Delay)

```typescript
// convex/orders.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const create = mutation({
  args: { items: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("orders", {
      items: args.items,
      status: "pending",
    });

    // Process payment immediately
    await ctx.scheduler.runAfter(0, internal.orders.processPayment, {
      orderId,
    });

    // Send confirmation email after 1 second
    await ctx.scheduler.runAfter(1000, internal.emails.sendOrderConfirmation, {
      orderId,
    });

    // Check for abandoned cart after 24 hours
    await ctx.scheduler.runAfter(
      24 * 60 * 60 * 1000,  // 24 hours in milliseconds
      internal.orders.checkAbandoned,
      { orderId }
    );

    return orderId;
  },
});
```

### runAt (Specific Time)

```typescript
// convex/reminders.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    message: v.string(),
    remindAt: v.number(),  // Unix timestamp
  },
  handler: async (ctx, args) => {
    const reminderId = await ctx.db.insert("reminders", {
      message: args.message,
      remindAt: args.remindAt,
      sent: false,
    });

    // Schedule notification for specific time
    const scheduledId = await ctx.scheduler.runAt(
      args.remindAt,
      internal.reminders.send,
      { reminderId }
    );

    // Store scheduled job ID for cancellation
    await ctx.db.patch(reminderId, { scheduledId });

    return reminderId;
  },
});

export const cancel = mutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) throw new Error("Reminder not found");

    if (reminder.scheduledId) {
      await ctx.scheduler.cancel(reminder.scheduledId);
    }

    await ctx.db.delete(args.reminderId);
  },
});
```

### Chaining Scheduled Functions

```typescript
// convex/workflows.ts
import { internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const startWorkflow = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, args) => {
    // Step 1: Create workflow record
    const workflowId = await ctx.db.insert("workflows", {
      status: "started",
      data: args.data,
    });

    // Schedule step 2
    await ctx.scheduler.runAfter(0, internal.workflows.step2, {
      workflowId,
    });

    return workflowId;
  },
});

export const step2 = internalAction({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    // Do external API call
    const result = await fetch("https://api.example.com/process");
    const data = await result.json();

    // Schedule step 3 with result
    await ctx.scheduler.runAfter(0, internal.workflows.step3, {
      workflowId: args.workflowId,
      externalData: data,
    });
  },
});

export const step3 = internalMutation({
  args: {
    workflowId: v.id("workflows"),
    externalData: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workflowId, {
      status: "completed",
      result: args.externalData,
    });
  },
});
```

---

## Cron Jobs

### Cron Configuration

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every minute
crons.interval(
  "cleanup temp files",
  { minutes: 1 },
  internal.cleanup.tempFiles,
  {}  // arguments
);

// Every hour
crons.interval(
  "sync external data",
  { hours: 1 },
  internal.sync.externalData,
  {}
);

// Every day at midnight UTC
crons.daily(
  "daily report",
  { hourUTC: 0, minuteUTC: 0 },
  internal.reports.generateDaily,
  {}
);

// Every Monday at 9am UTC
crons.weekly(
  "weekly digest",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.emails.sendWeeklyDigest,
  {}
);

// First of every month at midnight UTC
crons.monthly(
  "monthly billing",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.billing.processMonthly,
  {}
);

// Cron expression (every 15 minutes)
crons.cron(
  "check for updates",
  "*/15 * * * *",
  internal.updates.check,
  {}
);

export default crons;
```

### Cron Job Implementations

```typescript
// convex/cleanup.ts
import { internalMutation } from "./_generated/server";

export const tempFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;  // 24 hours ago

    const oldFiles = await ctx.db
      .query("tempFiles")
      .withIndex("by_createdAt")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();

    for (const file of oldFiles) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }

    console.log(`Cleaned up ${oldFiles.length} temp files`);
  },
});
```

```typescript
// convex/sync.ts
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const externalData = internalAction({
  args: {},
  handler: async (ctx) => {
    const response = await fetch("https://api.example.com/data");
    const data = await response.json();

    await ctx.runMutation(internal.sync.updateData, { data });
  },
});
```

### Interval Options

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";

const crons = cronJobs();

// Seconds (minimum 1)
crons.interval("job", { seconds: 30 }, fn, {});

// Minutes
crons.interval("job", { minutes: 5 }, fn, {});

// Hours
crons.interval("job", { hours: 2 }, fn, {});

// Combined
crons.interval("job", { hours: 1, minutes: 30 }, fn, {});

export default crons;
```

---

## Background Jobs Pattern

### Job Queue Schema

```typescript
// convex/schema.ts
export default defineSchema({
  jobs: defineTable({
    type: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    payload: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    attempts: v.number(),
    maxAttempts: v.number(),
    scheduledAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_type_status", ["type", "status"]),
});
```

### Job Creation

```typescript
// convex/jobs.ts
import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const enqueue = mutation({
  args: {
    type: v.string(),
    payload: v.any(),
    delay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("jobs", {
      type: args.type,
      status: "pending",
      payload: args.payload,
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: Date.now() + (args.delay ?? 0),
    });

    await ctx.scheduler.runAfter(
      args.delay ?? 0,
      internal.jobs.process,
      { jobId }
    );

    return jobId;
  },
});
```

### Job Processing

```typescript
// convex/jobs.ts
import { internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const process = internalMutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "pending") return;

    // Mark as processing
    await ctx.db.patch(args.jobId, {
      status: "processing",
      startedAt: Date.now(),
      attempts: job.attempts + 1,
    });

    // Schedule the actual work
    await ctx.scheduler.runAfter(0, internal.jobs.execute, {
      jobId: args.jobId,
    });
  },
});

export const execute = internalAction({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.jobs.get, { id: args.jobId });
    if (!job) return;

    try {
      // Route to appropriate handler
      let result;
      switch (job.type) {
        case "send_email":
          result = await handleSendEmail(job.payload);
          break;
        case "process_image":
          result = await handleProcessImage(ctx, job.payload);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await ctx.runMutation(internal.jobs.complete, {
        jobId: args.jobId,
        result,
      });
    } catch (error) {
      await ctx.runMutation(internal.jobs.fail, {
        jobId: args.jobId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

export const complete = internalMutation({
  args: { jobId: v.id("jobs"), result: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      result: args.result,
      completedAt: Date.now(),
    });
  },
});

export const fail = internalMutation({
  args: { jobId: v.id("jobs"), error: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    if (job.attempts < job.maxAttempts) {
      // Retry with exponential backoff
      const delay = Math.pow(2, job.attempts) * 1000;
      
      await ctx.db.patch(args.jobId, {
        status: "pending",
        error: args.error,
      });

      await ctx.scheduler.runAfter(delay, internal.jobs.process, {
        jobId: args.jobId,
      });
    } else {
      // Max attempts reached
      await ctx.db.patch(args.jobId, {
        status: "failed",
        error: args.error,
        completedAt: Date.now(),
      });
    }
  },
});
```

### Job Handlers

```typescript
// convex/jobHandlers.ts
import { ActionCtx } from "./_generated/server";

export async function handleSendEmail(payload: {
  to: string;
  subject: string;
  body: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@example.com",
      to: payload.to,
      subject: payload.subject,
      html: payload.body,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email send failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function handleProcessImage(
  ctx: ActionCtx,
  payload: { fileId: string }
) {
  // Image processing logic
  return { processed: true };
}
```
