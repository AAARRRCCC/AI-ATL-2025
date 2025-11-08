import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

/**
 * DEBUG ENDPOINT: Search all MongoDB collections for user data
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const db = await getDatabase();

    console.log("\n" + "=".repeat(80));
    console.log("DEBUG: Searching ALL MongoDB collections for user:", payload.userId);
    console.log("DEBUG: Database name:", db.databaseName);
    console.log("=".repeat(80));

    // Get all collection names
    const collections = await db.listCollections().toArray();
    const results: Record<string, any> = {};

    console.log(`\nAll collection names:`, collections.map(c => c.name).join(', '));

    console.log(`\nFound ${collections.length} collections in database`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`\n--- Checking collection: ${collectionName} ---`);

      try {
        const collection = db.collection(collectionName);

        // Search for documents with user_id field
        const docs = await collection.find({ user_id: payload.userId }).toArray();

        if (docs.length > 0) {
          console.log(`✓ Found ${docs.length} documents in ${collectionName}`);
          results[collectionName] = {
            count: docs.length,
            documents: docs.map(doc => ({
              ...doc,
              _id: doc._id?.toString(),
            }))
          };

          // Print first 3 docs for quick view
          docs.slice(0, 3).forEach((doc, i) => {
            console.log(`  Doc ${i+1}:`, JSON.stringify(doc, null, 2).substring(0, 200));
          });
        } else {
          console.log(`  (empty - no documents for this user)`);
          results[collectionName] = { count: 0, documents: [] };
        }
      } catch (error: any) {
        console.error(`  Error reading ${collectionName}:`, error.message);
        results[collectionName] = { error: error.message };
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("DEBUG: Search complete");
    console.log("=".repeat(80) + "\n");

    return NextResponse.json({
      success: true,
      userId: payload.userId,
      totalCollections: collections.length,
      collections: results,
    });

  } catch (error: any) {
    console.error("MongoDB debug error:", error.message);
    return NextResponse.json(
      { error: "Failed to search MongoDB" },
      { status: 500 }
    );
  }
}
