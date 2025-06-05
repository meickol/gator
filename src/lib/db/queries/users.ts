import { db } from "../index";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function createUser(name: string) {
  console.log("Creating user:", name);
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

export async function getUser(name: string) {
  const [result] = await db.select().from(users).where(eq(users.name, name));
  return result;
}

export async function getUserById(id: string) {
  const [result] = await db.select().from(users).where(eq(users.id, id));
  return result;
}

export async function resetUser() {
  await db.delete(users);
}

export async function listUsers() {
  const result = await db.select().from(users);
  return result;
}