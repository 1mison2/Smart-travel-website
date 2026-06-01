require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const cloudinary = require("../config/cloudinary");
const Location = require("../models/Location");
const Listing = require("../models/Listing");
const Post = require("../models/Post");
const User = require("../models/User");

const uploadsDir = path.resolve(__dirname, "..", "uploads");
const applyChanges = process.argv.includes("--apply");
const uploadCache = new Map();

const stats = {
  scanned: 0,
  changedDocs: 0,
  uploaded: 0,
  wouldUpload: 0,
  missing: 0,
  skipped: 0,
};

const isLocalUploadUrl = (value) => {
  if (!value || typeof value !== "string") return false;
  if (value.includes("res.cloudinary.com")) return false;
  return /\/uploads\//.test(value);
};

const getUploadFilename = (value) => {
  try {
    const parsed = new URL(value);
    return decodeURIComponent(path.basename(parsed.pathname));
  } catch (_err) {
    return decodeURIComponent(path.basename(String(value).split("?")[0]));
  }
};

const getLocalFilePath = (value) => {
  const filename = getUploadFilename(value);
  if (!filename) return "";

  const resolved = path.resolve(uploadsDir, filename);
  if (!resolved.startsWith(`${uploadsDir}${path.sep}`)) return "";
  return resolved;
};

const uploadLocalFile = async (oldUrl) => {
  if (!isLocalUploadUrl(oldUrl)) {
    stats.skipped += 1;
    return oldUrl;
  }

  if (uploadCache.has(oldUrl)) {
    return uploadCache.get(oldUrl);
  }

  const filePath = getLocalFilePath(oldUrl);
  if (!filePath || !fs.existsSync(filePath)) {
    stats.missing += 1;
    console.warn(`Missing local upload file for: ${oldUrl}`);
    return oldUrl;
  }

  if (!applyChanges) {
    stats.wouldUpload += 1;
    console.log(`[dry-run] Would upload: ${filePath}`);
    const dryRunUrl = `dry-run-cloudinary://${getUploadFilename(oldUrl)}`;
    uploadCache.set(oldUrl, dryRunUrl);
    return dryRunUrl;
  }

  const baseName = path
    .basename(filePath, path.extname(filePath))
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  const result = await cloudinary.v2.uploader.upload(filePath, {
    folder: "smart-travel/uploads",
    public_id: `migrated-${baseName || Date.now()}`,
    overwrite: true,
    resource_type: "image",
  });

  const newUrl = result.secure_url || result.url;
  uploadCache.set(oldUrl, newUrl);
  stats.uploaded += 1;
  console.log(`Uploaded: ${filePath}`);
  return newUrl;
};

const migrateStringField = async (doc, fieldName) => {
  const current = doc[fieldName];
  const next = await uploadLocalFile(current);
  if (next !== current) {
    doc[fieldName] = next;
    return true;
  }
  return false;
};

const migrateArrayField = async (doc, fieldName) => {
  const current = Array.isArray(doc[fieldName]) ? doc[fieldName] : [];
  const next = [];
  let changed = false;

  for (const item of current) {
    const migrated = await uploadLocalFile(item);
    next.push(migrated);
    if (migrated !== item) changed = true;
  }

  if (changed) {
    doc[fieldName] = next;
    doc.markModified(fieldName);
  }
  return changed;
};

const migrateModel = async ({ model, name, stringFields = [], arrayFields = [] }) => {
  console.log(`\nScanning ${name}...`);
  const docs = await model.find();

  for (const doc of docs) {
    stats.scanned += 1;
    let changed = false;

    for (const fieldName of stringFields) {
      changed = (await migrateStringField(doc, fieldName)) || changed;
    }

    for (const fieldName of arrayFields) {
      changed = (await migrateArrayField(doc, fieldName)) || changed;
    }

    if (!changed) continue;

    stats.changedDocs += 1;
    if (applyChanges) {
      await doc.save();
      console.log(`Saved ${name}: ${doc._id}`);
    } else {
      console.log(`[dry-run] Would update ${name}: ${doc._id}`);
    }
  }
};

const run = async () => {
  if (!applyChanges) {
    console.log("Running in dry-run mode. No Cloudinary uploads or MongoDB updates will be made.");
    console.log("Run `npm run migrate:uploads -- --apply` to perform the migration.\n");
  }

  await connectDB();

  await migrateModel({
    model: Location,
    name: "Location",
    stringFields: ["image"],
    arrayFields: ["images"],
  });
  await migrateModel({
    model: Listing,
    name: "Listing",
    arrayFields: ["photos"],
  });
  await migrateModel({
    model: Post,
    name: "Post",
    arrayFields: ["images"],
  });
  await migrateModel({
    model: User,
    name: "User",
    stringFields: ["profilePicture"],
  });

  console.log("\nMigration summary:");
  console.log(`Mode: ${applyChanges ? "apply" : "dry-run"}`);
  console.log(`Documents scanned: ${stats.scanned}`);
  console.log(`Documents ${applyChanges ? "updated" : "that would be updated"}: ${stats.changedDocs}`);
  console.log(`Files ${applyChanges ? "uploaded" : "that would be uploaded"}: ${applyChanges ? stats.uploaded : stats.wouldUpload}`);
  console.log(`Missing local files: ${stats.missing}`);
  console.log(`Skipped non-local URLs: ${stats.skipped}`);
};

run()
  .catch((error) => {
    console.error("Upload migration failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
