// ============================================================
//  handlers/database.js
//  Multi-cluster MongoDB manager
//
//  Features:
//  - Connects to all clusters defined in config.mongodb.clusters
//  - Auto-assigns new guilds to a random available cluster
//    (available = alive + serverCount < maxServersPerCluster)
//  - Guild→cluster assignment is permanent and stored in DB
//  - Routes DB queries to the guild's assigned cluster
//  - Exposes helpers: getGuildDb, assignGuild, getAllAssignments,
//    transferGuildData, deleteGuildData, getClusterStatus,
//    isClusterAvailable
// ============================================================
const mongoose = require("mongoose");
const chalk    = require("chalk");
const config   = require("../config");

// ── In-memory cluster registry ────────────────────────────
// Map<clusterName, { connection, status, serverCount, name, GuildAssignment }>
const clusterMap = new Map();

// ── GuildAssignment schema (stored per-cluster) ───────────
const assignmentSchema = new mongoose.Schema({
  guildId:     { type: String, required: true, unique: true },
  clusterName: { type: String, required: true },
  assignedAt:  { type: Date,   default: Date.now },
});

// ============================================================
//  Main export — called by handlerLoader
// ============================================================
module.exports = async (client) => {
  console.log(chalk.yellow.bold("🗄️   [Database] Connecting to clusters..."));

  const clusters = config.mongodb.clusters;

  for (const cluster of clusters) {
    const uri = cluster.uri;

    // Create an isolated mongoose connection per cluster
    const conn = mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    const entry = {
      name:            cluster.name,
      connection:      conn,
      status:          "connecting",
      serverCount:     0,
      GuildAssignment: null,
    };

    clusterMap.set(cluster.name, entry);

    // ── Connection events ──────────────────────────────────
    conn.on("connected", async () => {
      entry.status          = "connected";
      entry.GuildAssignment = conn.model("GuildAssignment", assignmentSchema);

      // ── Drop any stale indexes left from old schemas ─────
      // e.g. caseId_1 on modcases from a previous schema version
      await dropStaleIndexes(conn);

      // Sync server count for this cluster
      try {
        entry.serverCount = await entry.GuildAssignment.countDocuments({ clusterName: cluster.name });
      } catch { entry.serverCount = 0; }

      console.log(chalk.green(`  [DB] ✅ Connected: ${cluster.name} (${entry.serverCount} servers)`));
    });

    conn.on("disconnected", () => {
      entry.status = "disconnected";
      console.warn(chalk.red(`  [DB] ❌ Disconnected: ${cluster.name}`));
    });

    conn.on("error", (err) => {
      entry.status = "error";
      console.error(chalk.red(`  [DB] ⚠️  Error on ${cluster.name}:`), err.message);
    });
  }

  // Give clusters a moment to connect before bot is ready
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // ── Attach db API to client ───────────────────────────────
  client.db = {
    clusterMap,
    isClusterAvailable,
    getClusterStatus,
    assignGuild,
    getGuildDb,
    getAllAssignments,
    transferGuildData,
    deleteGuildData,
  };

  console.log(chalk.green.bold("  [DB] Cluster manager ready.\n"));
};

// ============================================================
//  Helpers
// ============================================================

/**
 * Check if a cluster is available for new guild assignments
 * Available = connected AND under the server cap
 */
function isClusterAvailable(name) {
  const entry = clusterMap.get(name);
  if (!entry) return false;
  return (
    entry.status === "connected" &&
    entry.serverCount < config.mongodb.maxServersPerCluster
  );
}

/**
 * Return a status summary for all clusters
 */
function getClusterStatus() {
  const result = [];
  for (const [name, entry] of clusterMap) {
    result.push({
      name,
      status:      entry.status,
      serverCount: entry.serverCount,
      available:   isClusterAvailable(name),
    });
  }
  return result;
}

/**
 * Permanently assign a guild to a cluster
 * @param {string} guildId
 * @param {string|null} targetCluster — force a specific cluster, or null for random
 */
async function assignGuild(guildId, targetCluster = null) {
  let clusterName;

  if (targetCluster) {
    if (!isClusterAvailable(targetCluster))
      throw new Error(`Cluster "${targetCluster}" is not available.`);
    clusterName = targetCluster;
  } else {
    const available = [...clusterMap.keys()].filter(isClusterAvailable);
    if (available.length === 0) throw new Error("No available clusters.");
    clusterName = available[Math.floor(Math.random() * available.length)];
  }

  const entry = clusterMap.get(clusterName);
  await entry.GuildAssignment.findOneAndUpdate(
    { guildId },
    { guildId, clusterName },
    { upsert: true, new: true }
  );

  entry.serverCount++;
  return clusterName;
}

/**
 * Get the DB connection info for a guild
 * Returns { connection, clusterName, isDown } or null if not assigned
 */
async function getGuildDb(guildId) {
  // 1. Search all connected clusters for this guild's assignment record
  for (const [, entry] of clusterMap) {
    if (entry.status !== "connected" || !entry.GuildAssignment) continue;
    const assignment = await entry.GuildAssignment.findOne({ guildId });
    if (assignment) {
      const target = clusterMap.get(assignment.clusterName);
      if (target) return { connection: target.connection, clusterName: assignment.clusterName, isDown: target.status !== "connected" };
    }
  }

  // 2. Fallback: If not assigned, assign it now to the first available cluster
  try {
    const clusterName = await assignGuild(guildId);
    const target = clusterMap.get(clusterName);
    console.log(chalk.blue(`  [DB] Auto-assigned existing guild ${guildId} to cluster: ${clusterName}`));
    return { connection: target.connection, clusterName, isDown: false };
  } catch (err) {
    console.error(chalk.red(`  [DB] Failed to auto-assign guild ${guildId}:`), err.message);
    return null;
  }
}

/**
 * Get all guild assignments belonging to a cluster
 */
async function getAllAssignments(clusterName) {
  const entry = clusterMap.get(clusterName);
  if (!entry || !entry.GuildAssignment) return [];
  return entry.GuildAssignment.find({ clusterName });
}

/**
 * Transfer all guild data from one cluster to another
 * Used by the graceful `cluster move` command
 */
async function transferGuildData(guildId, fromClusterName, toClusterName) {
  const from = clusterMap.get(fromClusterName);
  const to   = clusterMap.get(toClusterName);
  if (!from || !to) throw new Error("Invalid cluster name(s).");

  const collections = await from.connection.db.listCollections().toArray();

  for (const col of collections) {
    if (col.name === "guildassignments") continue; // managed separately
    try {
      const srcCol  = from.connection.db.collection(col.name);
      const dstCol  = to.connection.db.collection(col.name);
      const docs    = await srcCol.find({ guildId }).toArray();
      if (docs.length > 0) {
        // Remove _id to avoid conflicts on insert
        const cleaned = docs.map(({ _id, ...rest }) => rest);
        await dstCol.insertMany(cleaned, { ordered: false }).catch(() => {});
        await srcCol.deleteMany({ guildId });
      }
    } catch (e) {
      console.warn(`  [DB] Transfer warning on collection "${col.name}":`, e.message);
    }
  }

  // Update the assignment record to point to the new cluster
  if (to.GuildAssignment) {
    await to.GuildAssignment.findOneAndUpdate(
      { guildId },
      { guildId, clusterName: toClusterName },
      { upsert: true }
    );
  }

  // Remove old assignment
  if (from.GuildAssignment) {
    await from.GuildAssignment.deleteOne({ guildId });
    from.serverCount = Math.max(0, from.serverCount - 1);
  }

  to.serverCount++;
}

/**
 * Drop stale indexes left over from old schema versions
 * Runs once per cluster on connect — safe to call repeatedly
 */
async function dropStaleIndexes(connection) {
  // Map of collection → array of index names to drop if they exist
  const staleIndexes = {
    modcases: ["caseId_1"],
    userlevels: ["guildId_1_odId_1"], 
  };

  for (const [colName, indexes] of Object.entries(staleIndexes)) {
    try {
      const col = connection.db.collection(colName);
      const existing = await col.indexes();
      const existingNames = existing.map((i) => i.name);

      for (const indexName of indexes) {
        if (existingNames.includes(indexName)) {
          await col.dropIndex(indexName);
          console.log(chalk.yellow(`  [DB] Dropped stale index "${indexName}" on ${colName}`));
        }
      }
    } catch {} // collection may not exist yet — that's fine
  }
}

/**
 * Delete all data for a guild from a specific cluster (no transfer)
 * Used by the emergency `cluster migrate` command
 */
async function deleteGuildData(guildId, clusterName) {
  const entry = clusterMap.get(clusterName);
  if (!entry) return;

  // Best effort — cluster may be partially down
  try {
    const collections = await entry.connection.db.listCollections().toArray();
    for (const col of collections) {
      try {
        await entry.connection.db.collection(col.name).deleteMany({ guildId });
      } catch {}
    }
  } catch {}

  if (entry.GuildAssignment) {
    await entry.GuildAssignment.deleteOne({ guildId }).catch(() => {});
    entry.serverCount = Math.max(0, entry.serverCount - 1);
  }
}
