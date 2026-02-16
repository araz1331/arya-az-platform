import {
  type Profile, type InsertProfile,
  type Recording, type InsertRecording,
  type Transaction, type InsertTransaction,
  type Voucher, type InsertVoucher,
  type VoiceDonation, type InsertVoiceDonation,
  type WidgetMessage, type InsertWidgetMessage,
  type SmartProfile, type InsertSmartProfile,
  profiles, recordings, transactions, vouchers,
  voiceDonations, widgetMessages, smartProfiles,
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getProfile(userId: string): Promise<Profile | undefined>;
  getOrCreateProfile(userId: string): Promise<Profile>;
  updateProfileTokens(userId: string, tokens: number): Promise<void>;
  updateProfileInfo(userId: string, data: { age?: string; gender?: string }): Promise<void>;
  incrementRecordingsCount(userId: string): Promise<void>;
  claimMilestone(userId: string, milestone: 1 | 2): Promise<void>;
  getTotalProfileCount(): Promise<number>;

  createRecording(recording: InsertRecording): Promise<Recording>;
  getRecordingsByUserId(userId: string): Promise<Recording[]>;
  getRecordedSentenceIds(userId: string): Promise<string[]>;

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: string): Promise<Transaction[]>;

  createVoucher(voucher: InsertVoucher): Promise<Voucher>;
  getVouchersByUserId(userId: string): Promise<Voucher[]>;

  getAllRecordings(): Promise<Recording[]>;
  getStats(): Promise<{ totalUsers: number; totalRecordings: number; totalHours: number }>;
  getAdminStats(): Promise<{ totalUsers: number; totalRecordings: number; totalDurationSeconds: number; totalFileSize: number }>;
  getAllUsersWithProfiles(): Promise<any[]>;

  createVoiceDonation(donation: InsertVoiceDonation): Promise<VoiceDonation>;
  createWidgetMessage(message: InsertWidgetMessage): Promise<WidgetMessage>;

  getSmartProfileByUserId(userId: string): Promise<SmartProfile | undefined>;
  getSmartProfileBySlug(slug: string): Promise<SmartProfile | undefined>;
  createSmartProfile(profile: InsertSmartProfile): Promise<SmartProfile>;
  updateSmartProfile(id: string, data: Partial<InsertSmartProfile>): Promise<SmartProfile>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
    return profile;
  }

  async getOrCreateProfile(userId: string): Promise<Profile> {
    let profile = await this.getProfile(userId);
    if (!profile) {
      const [newProfile] = await db.insert(profiles).values({
        id: userId,
        displayName: null,
        tokens: 0,
        recordingsCount: 0,
        milestone1Claimed: false,
        milestone2Claimed: false,
      }).returning();
      profile = newProfile;
    }
    return profile;
  }

  async updateProfileTokens(userId: string, tokens: number): Promise<void> {
    await db.update(profiles).set({ tokens }).where(eq(profiles.id, userId));
  }

  async updateProfileInfo(userId: string, data: { age?: string; gender?: string }): Promise<void> {
    await db.update(profiles).set(data).where(eq(profiles.id, userId));
  }

  async incrementRecordingsCount(userId: string): Promise<void> {
    await db.update(profiles)
      .set({ recordingsCount: sql`${profiles.recordingsCount} + 1` })
      .where(eq(profiles.id, userId));
  }

  async claimMilestone(userId: string, milestone: 1 | 2): Promise<void> {
    if (milestone === 1) {
      await db.update(profiles).set({ milestone1Claimed: true }).where(eq(profiles.id, userId));
    } else {
      await db.update(profiles).set({ milestone2Claimed: true }).where(eq(profiles.id, userId));
    }
  }

  async getTotalProfileCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(profiles);
    return result[0]?.count ?? 0;
  }

  async createRecording(recording: InsertRecording): Promise<Recording> {
    const [rec] = await db.insert(recordings).values(recording).returning();
    return rec;
  }

  async getRecordingsByUserId(userId: string): Promise<Recording[]> {
    return db.select().from(recordings).where(eq(recordings.userId, userId)).orderBy(desc(recordings.createdAt));
  }

  async getRecordedSentenceIds(userId: string): Promise<string[]> {
    const rows = await db
      .selectDistinct({ sentenceId: recordings.sentenceId })
      .from(recordings)
      .where(eq(recordings.userId, userId));
    return rows.map(r => r.sentenceId);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [tx] = await db.insert(transactions).values(transaction).returning();
    return tx;
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async createVoucher(voucher: InsertVoucher): Promise<Voucher> {
    const [v] = await db.insert(vouchers).values(voucher).returning();
    return v;
  }

  async getVouchersByUserId(userId: string): Promise<Voucher[]> {
    return db.select().from(vouchers).where(eq(vouchers.userId, userId)).orderBy(desc(vouchers.createdAt));
  }

  async getAllRecordings(): Promise<Recording[]> {
    return db.select().from(recordings).orderBy(desc(recordings.createdAt));
  }

  async getStats(): Promise<{ totalUsers: number; totalRecordings: number; totalHours: number }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(profiles);
    const [recCount] = await db.select({ count: sql<number>`count(*)::int` }).from(recordings);
    const [totalDuration] = await db.select({ sum: sql<number>`coalesce(sum(duration), 0)::int` }).from(recordings);
    return {
      totalUsers: userCount?.count ?? 0,
      totalRecordings: recCount?.count ?? 0,
      totalHours: Math.round((totalDuration?.sum ?? 0) / 3600),
    };
  }
  async getAdminStats(): Promise<{ totalUsers: number; totalRecordings: number; totalDurationSeconds: number; totalFileSize: number }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(profiles);
    const [recStats] = await db.select({
      count: sql<number>`count(*)::int`,
      totalDuration: sql<number>`coalesce(sum(duration), 0)::int`,
      totalSize: sql<number>`coalesce(sum(file_size), 0)::bigint`,
    }).from(recordings);
    return {
      totalUsers: userCount?.count ?? 0,
      totalRecordings: recStats?.count ?? 0,
      totalDurationSeconds: recStats?.totalDuration ?? 0,
      totalFileSize: Number(recStats?.totalSize ?? 0),
    };
  }

  async getAllUsersWithProfiles(): Promise<any[]> {
    const usersData = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));

    const profilesData = await db.select().from(profiles);
    const profileMap = new Map(profilesData.map(p => [p.id, p]));

    const recCounts = await db.select({
      userId: recordings.userId,
      count: sql<number>`count(*)::int`,
      totalDuration: sql<number>`coalesce(sum(duration), 0)::int`,
      totalSize: sql<number>`coalesce(sum(file_size), 0)::bigint`,
    }).from(recordings).groupBy(recordings.userId);
    const recMap = new Map(recCounts.map(r => [r.userId, r]));

    return usersData.map(u => {
      const profile = profileMap.get(u.id);
      const rec = recMap.get(u.id);
      return {
        ...u,
        tokens: profile?.tokens ?? 0,
        recordingsCount: profile?.recordingsCount ?? 0,
        totalDuration: rec?.totalDuration ?? 0,
        totalFileSize: Number(rec?.totalSize ?? 0),
      };
    });
  }
  async createVoiceDonation(donation: InsertVoiceDonation): Promise<VoiceDonation> {
    const [d] = await db.insert(voiceDonations).values(donation).returning();
    return d;
  }

  async createWidgetMessage(message: InsertWidgetMessage): Promise<WidgetMessage> {
    const [m] = await db.insert(widgetMessages).values(message).returning();
    return m;
  }

  async getSmartProfileByUserId(userId: string): Promise<SmartProfile | undefined> {
    const [profile] = await db.select().from(smartProfiles).where(eq(smartProfiles.userId, userId));
    return profile;
  }

  async getSmartProfileBySlug(slug: string): Promise<SmartProfile | undefined> {
    const [profile] = await db.select().from(smartProfiles).where(eq(smartProfiles.slug, slug));
    return profile;
  }

  async createSmartProfile(profile: InsertSmartProfile): Promise<SmartProfile> {
    const [p] = await db.insert(smartProfiles).values(profile).returning();
    return p;
  }

  async updateSmartProfile(id: string, data: Partial<InsertSmartProfile>): Promise<SmartProfile> {
    const [p] = await db.update(smartProfiles).set(data).where(eq(smartProfiles.id, id)).returning();
    return p;
  }
}

export const storage = new DatabaseStorage();
