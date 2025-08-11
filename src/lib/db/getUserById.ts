import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserById(userId: string) {
  const users = await db.select().from(userTable).where(eq(userTable.id, userId));
  return users[0] || null;
}
