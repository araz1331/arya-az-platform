import {
  type Profile, type InsertProfile,
  type Recording, type InsertRecording,
  type Transaction, type InsertTransaction,
  type Voucher, type InsertVoucher,
  type VoiceDonation, type InsertVoiceDonation,
  type WidgetMessage, type InsertWidgetMessage,
  type SmartProfile, type InsertSmartProfile,
  type OwnerChatMessage, type InsertOwnerChatMessage,
  profiles, recordings, transactions, vouchers,
  voiceDonations, widgetMessages, smartProfiles, ownerChatMessages,
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
  getAdminFullStats(): Promise<any>;
  getAdminSmartProfiles(): Promise<any[]>;
  getAdminLeads(): Promise<any[]>;
  getAdminVoiceDonations(): Promise<any[]>;

  createVoiceDonation(donation: InsertVoiceDonation): Promise<VoiceDonation>;
  createWidgetMessage(message: InsertWidgetMessage): Promise<WidgetMessage>;

  getSmartProfileByUserId(userId: string): Promise<SmartProfile | undefined>;
  getSmartProfileBySlug(slug: string): Promise<SmartProfile | undefined>;
  createSmartProfile(profile: InsertSmartProfile): Promise<SmartProfile>;
  updateSmartProfile(id: string, data: Partial<InsertSmartProfile>): Promise<SmartProfile>;

  getOwnerChatHistory(userId: string, limit?: number): Promise<OwnerChatMessage[]>;
  createOwnerChatMessage(message: InsertOwnerChatMessage): Promise<OwnerChatMessage>;
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

    const smartProfilesData = await db.select({
      userId: smartProfiles.userId,
      slug: smartProfiles.slug,
      businessName: smartProfiles.businessName,
      isPro: smartProfiles.isPro,
      proExpiresAt: smartProfiles.proExpiresAt,
      stripeCustomerId: smartProfiles.stripeCustomerId,
    }).from(smartProfiles);
    const spMap = new Map(smartProfilesData.map(sp => [sp.userId, sp]));

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
      const sp = spMap.get(u.id);
      return {
        ...u,
        tokens: profile?.tokens ?? 0,
        recordingsCount: profile?.recordingsCount ?? 0,
        totalDuration: rec?.totalDuration ?? 0,
        totalFileSize: Number(rec?.totalSize ?? 0),
        hasSmartProfile: !!sp,
        smartProfileSlug: sp?.slug || null,
        isPro: sp?.isPro ?? false,
        proExpiresAt: sp?.proExpiresAt || null,
        stripeCustomerId: sp?.stripeCustomerId || null,
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

  async getAdminFullStats(): Promise<any> {
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [profileCount] = await db.select({ count: sql<number>`count(*)::int` }).from(profiles);
    const [smartProfileCount] = await db.select({ count: sql<number>`count(*)::int` }).from(smartProfiles);
    const [proCount] = await db.select({ count: sql<number>`count(*)::int` }).from(smartProfiles).where(eq(smartProfiles.isPro, true));
    const [recStats] = await db.select({
      count: sql<number>`count(*)::int`,
      totalDuration: sql<number>`coalesce(sum(duration), 0)::int`,
      totalSize: sql<number>`coalesce(sum(file_size), 0)::bigint`,
    }).from(recordings);
    const [donationStats] = await db.select({
      count: sql<number>`count(*)::int`,
      totalDuration: sql<number>`coalesce(sum(duration), 0)::int`,
      totalSize: sql<number>`coalesce(sum(file_size), 0)::bigint`,
    }).from(voiceDonations);
    const [messageCount] = await db.select({ count: sql<number>`count(*)::int` }).from(widgetMessages);
    const [sessionCount] = await db.select({ count: sql<number>`count(distinct session_id)::int` }).from(widgetMessages);
    const [voucherCount] = await db.select({ count: sql<number>`count(*)::int` }).from(vouchers);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [newUsersToday] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(sql`${users.createdAt} >= ${todayStart}`);
    const [newProfilesToday] = await db.select({ count: sql<number>`count(*)::int` }).from(smartProfiles).where(sql`${smartProfiles.createdAt} >= ${todayStart}`);

    return {
      totalUsers: userCount?.count ?? 0,
      totalSmartProfiles: smartProfileCount?.count ?? 0,
      totalProUsers: proCount?.count ?? 0,
      totalRecordings: recStats?.count ?? 0,
      totalRecordingDuration: recStats?.totalDuration ?? 0,
      totalRecordingSize: Number(recStats?.totalSize ?? 0),
      totalVoiceDonations: donationStats?.count ?? 0,
      totalDonationDuration: donationStats?.totalDuration ?? 0,
      totalDonationSize: Number(donationStats?.totalSize ?? 0),
      totalWidgetMessages: messageCount?.count ?? 0,
      totalChatSessions: sessionCount?.count ?? 0,
      totalVouchers: voucherCount?.count ?? 0,
      newUsersToday: newUsersToday?.count ?? 0,
      newProfilesToday: newProfilesToday?.count ?? 0,
    };
  }

  async getAdminSmartProfiles(): Promise<any[]> {
    const allProfiles = await db.select({
      id: smartProfiles.id,
      userId: smartProfiles.userId,
      slug: smartProfiles.slug,
      businessName: smartProfiles.businessName,
      displayName: smartProfiles.displayName,
      profession: smartProfiles.profession,
      isPro: smartProfiles.isPro,
      proExpiresAt: smartProfiles.proExpiresAt,
      onboardingComplete: smartProfiles.onboardingComplete,
      isActive: smartProfiles.isActive,
      profileImageUrl: smartProfiles.profileImageUrl,
      hasRu: sql<boolean>`${smartProfiles.knowledgeBaseRu} IS NOT NULL AND ${smartProfiles.knowledgeBaseRu} != ''`,
      hasEn: sql<boolean>`${smartProfiles.knowledgeBaseEn} IS NOT NULL AND ${smartProfiles.knowledgeBaseEn} != ''`,
      createdAt: smartProfiles.createdAt,
    }).from(smartProfiles).orderBy(desc(smartProfiles.createdAt));

    const messageCounts = await db.select({
      profileId: widgetMessages.profileId,
      count: sql<number>`count(*)::int`,
      sessions: sql<number>`count(distinct session_id)::int`,
    }).from(widgetMessages).groupBy(widgetMessages.profileId);
    const msgMap = new Map(messageCounts.map(m => [m.profileId, m]));

    const usersData = await db.select({ id: users.id, email: users.email }).from(users);
    const userMap = new Map(usersData.map(u => [u.id, u.email]));

    return allProfiles.map(p => ({
      ...p,
      email: userMap.get(p.userId) || null,
      totalMessages: msgMap.get(p.id)?.count ?? 0,
      totalSessions: msgMap.get(p.id)?.sessions ?? 0,
    }));
  }

  async getAdminLeads(): Promise<any[]> {
    const sessions = await db.select({
      sessionId: widgetMessages.sessionId,
      profileId: widgetMessages.profileId,
      messageCount: sql<number>`count(*)::int`,
      firstMessage: sql<string>`min(${widgetMessages.createdAt})`,
      lastMessage: sql<string>`max(${widgetMessages.createdAt})`,
      firstUserMsg: sql<string>`min(case when ${widgetMessages.role} = 'user' then ${widgetMessages.content} end)`,
    }).from(widgetMessages)
      .groupBy(widgetMessages.sessionId, widgetMessages.profileId)
      .orderBy(sql`max(${widgetMessages.createdAt}) desc`)
      .limit(100);

    const profileIds = Array.from(new Set(sessions.map(s => s.profileId).filter(Boolean)));
    let profileMap = new Map<string, { slug: string; displayName: string | null }>();
    if (profileIds.length > 0) {
      const profs = await db.select({
        id: smartProfiles.id,
        slug: smartProfiles.slug,
        displayName: smartProfiles.displayName,
      }).from(smartProfiles).where(sql`${smartProfiles.id} IN (${sql.join(profileIds.map(id => sql`${id}`), sql`,`)})`);
      profileMap = new Map(profs.map(p => [p.id, { slug: p.slug, displayName: p.displayName }]));
    }

    return sessions.map(s => ({
      sessionId: s.sessionId,
      profileId: s.profileId,
      profileSlug: profileMap.get(s.profileId || "")?.slug || null,
      profileName: profileMap.get(s.profileId || "")?.displayName || null,
      messageCount: s.messageCount,
      firstMessage: s.firstMessage,
      lastMessage: s.lastMessage,
      preview: s.firstUserMsg ? (s.firstUserMsg.length > 80 ? s.firstUserMsg.slice(0, 80) + "..." : s.firstUserMsg) : null,
    }));
  }

  async getAdminVoiceDonations(): Promise<any[]> {
    return db.select().from(voiceDonations).orderBy(desc(voiceDonations.createdAt)).limit(200);
  }

  async getOwnerChatHistory(userId: string, limit = 50): Promise<OwnerChatMessage[]> {
    return db.select().from(ownerChatMessages)
      .where(eq(ownerChatMessages.userId, userId))
      .orderBy(ownerChatMessages.createdAt)
      .limit(limit);
  }

  async createOwnerChatMessage(message: InsertOwnerChatMessage): Promise<OwnerChatMessage> {
    const [created] = await db.insert(ownerChatMessages).values(message).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
