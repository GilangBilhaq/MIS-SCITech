import {
  User,
  Worklog,
  MonthlyPlan,
  Transaction,
  Project,
  RabProject,
  RabItem,
  KpiEvaluation,
  Announcement,
  FinanceSettings,
  UserKpiStats,
} from "@/types";

export class ApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const res = await fetch(endpoint, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      return data;
    } catch (err: unknown) {
      console.warn(`[ApiClient] Endpoint ${endpoint} failed:`, err);
      throw err;
    }
  }

  // Users & PIN
  public static async getUsers(companyId?: string): Promise<User[]> {
    const res = await this.request<{ success: boolean; data: User[] }>(
      `/api/users?companyId=${companyId || "sci-tech-01"}`
    );
    return res.data;
  }

  public static async createUser(userData: Partial<User>): Promise<User> {
    const res = await this.request<{ success: boolean; data: User }>(`/api/users`, {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return res.data;
  }

  public static async updateUser(userData: Partial<User>): Promise<User> {
    const res = await this.request<{ success: boolean; data: User }>(`/api/users`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
    return res.data;
  }

  public static async deleteUser(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/users?id=${id}`, {
      method: "DELETE",
    });
  }

  public static async verifyPin(
    userId: string,
    pin: string
  ): Promise<{ success: boolean; message: string; user?: Partial<User> }> {
    return this.request<{ success: boolean; message: string; user?: Partial<User> }>(
      `/api/users/pin`,
      {
        method: "POST",
        body: JSON.stringify({ userId, pin }),
      }
    );
  }

  // Worklogs
  public static async getWorklogs(companyId?: string): Promise<Worklog[]> {
    const res = await this.request<{ success: boolean; data: Worklog[] }>(
      `/api/worklogs?companyId=${companyId || "sci-tech-01"}`
    );
    return res.data;
  }

  public static async createWorklog(worklogData: Record<string, unknown>): Promise<Worklog> {
    const res = await this.request<{ success: boolean; data: Worklog }>(`/api/worklogs`, {
      method: "POST",
      body: JSON.stringify(worklogData),
    });
    return res.data;
  }

  public static async updateWorklog(worklogData: Record<string, unknown>): Promise<Worklog> {
    const res = await this.request<{ success: boolean; data: Worklog }>(`/api/worklogs`, {
      method: "PUT",
      body: JSON.stringify(worklogData),
    });
    return res.data;
  }

  public static async deleteWorklog(id: string, userId: string, pin: string): Promise<void> {
    await this.request<{ success: boolean }>(
      `/api/worklogs?id=${id}&userId=${userId}&pin=${pin}`,
      { method: "DELETE" }
    );
  }

  // Monthly Plans
  public static async getMonthlyPlans(companyId?: string): Promise<MonthlyPlan[]> {
    const res = await this.request<{ success: boolean; data: MonthlyPlan[] }>(
      `/api/monthly-plans?companyId=${companyId || "sci-tech-01"}`
    );
    return res.data;
  }

  public static async createMonthlyPlan(planData: Record<string, unknown>): Promise<MonthlyPlan> {
    const res = await this.request<{ success: boolean; data: MonthlyPlan }>(`/api/monthly-plans`, {
      method: "POST",
      body: JSON.stringify(planData),
    });
    return res.data;
  }

  public static async updateMonthlyPlan(planData: Record<string, unknown>): Promise<MonthlyPlan> {
    const res = await this.request<{ success: boolean; data: MonthlyPlan }>(`/api/monthly-plans`, {
      method: "PUT",
      body: JSON.stringify(planData),
    });
    return res.data;
  }

  public static async toggleMonthlyPlan(
    id: string,
    userId: string,
    pin: string,
    isCompleted: boolean
  ): Promise<MonthlyPlan> {
    const res = await this.request<{ success: boolean; data: MonthlyPlan }>(`/api/monthly-plans`, {
      method: "PUT",
      body: JSON.stringify({ id, user_id: userId, pin, is_completed: isCompleted }),
    });
    return res.data;
  }

  public static async deleteMonthlyPlan(id: string, userId: string, pin: string): Promise<void> {
    await this.request<{ success: boolean }>(
      `/api/monthly-plans?id=${id}&userId=${userId}&pin=${pin}`,
      { method: "DELETE" }
    );
  }

  // Transactions
  public static async getTransactions(companyId?: string): Promise<Transaction[]> {
    const res = await this.request<{ success: boolean; data: Transaction[] }>(
      `/api/transactions?companyId=${companyId || "sci-tech-01"}`
    );
    return res.data;
  }

  public static async createTransaction(trxData: Record<string, unknown>): Promise<Transaction> {
    const res = await this.request<{ success: boolean; data: Transaction }>(`/api/transactions`, {
      method: "POST",
      body: JSON.stringify(trxData),
    });
    return res.data;
  }

  public static async updateTransaction(trxData: Record<string, unknown>): Promise<Transaction> {
    const res = await this.request<{ success: boolean; data: Transaction }>(`/api/transactions`, {
      method: "PUT",
      body: JSON.stringify(trxData),
    });
    return res.data;
  }

  public static async deleteTransaction(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/transactions?id=${id}`, {
      method: "DELETE",
    });
  }

  // Projects
  public static async getProjects(companyId?: string): Promise<Project[]> {
    const res = await this.request<{ success: boolean; data: Project[] }>(
      `/api/projects?companyId=${companyId || "sci-tech-01"}`
    );
    return res.data;
  }

  public static async createProject(projData: Record<string, unknown>): Promise<Project> {
    const res = await this.request<{ success: boolean; data: Project }>(`/api/projects`, {
      method: "POST",
      body: JSON.stringify(projData),
    });
    return res.data;
  }

  public static async updateProject(projData: Record<string, unknown>): Promise<Project> {
    const res = await this.request<{ success: boolean; data: Project }>(`/api/projects`, {
      method: "PUT",
      body: JSON.stringify(projData),
    });
    return res.data;
  }

  public static async deleteProject(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/projects?id=${id}`, {
      method: "DELETE",
    });
  }

  // RAB (Multi-RAB Support)
  public static async getRabList(companyId?: string): Promise<RabProject[]> {
    const res = await this.request<{ success: boolean; data: RabProject[] }>(
      `/api/rab?companyId=${companyId || "sci-tech-01"}`
    );
    return res.data;
  }

  public static async getRabById(id: string): Promise<RabProject> {
    const res = await this.request<{ success: boolean; data: RabProject }>(`/api/rab/${id}`);
    return res.data;
  }

  public static async createRab(rabData: Record<string, unknown>): Promise<RabProject> {
    const res = await this.request<{ success: boolean; data: RabProject }>(`/api/rab`, {
      method: "POST",
      body: JSON.stringify(rabData),
    });
    return res.data;
  }

  public static async updateRab(id: string, rabData: Record<string, unknown>): Promise<RabProject> {
    const res = await this.request<{ success: boolean; data: RabProject }>(`/api/rab/${id}`, {
      method: "PUT",
      body: JSON.stringify(rabData),
    });
    return res.data;
  }

  public static async deleteRab(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/rab/${id}`, {
      method: "DELETE",
    });
  }

  public static async addRabItem(rabId: string, itemData: Record<string, unknown>): Promise<RabItem> {
    const res = await this.request<{ success: boolean; data: RabItem }>(`/api/rab/${rabId}/items`, {
      method: "POST",
      body: JSON.stringify(itemData),
    });
    return res.data;
  }

  public static async updateRabItem(rabId: string, itemData: Record<string, unknown>): Promise<RabItem> {
    const res = await this.request<{ success: boolean; data: RabItem }>(`/api/rab/${rabId}/items`, {
      method: "PUT",
      body: JSON.stringify(itemData),
    });
    return res.data;
  }

  public static async deleteRabItem(rabId: string, itemId: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/rab/${rabId}/items?itemId=${itemId}`, {
      method: "DELETE",
    });
  }

  public static async convertRabToProject(
    rabId: string,
    options?: { pic_teknisi?: string; deadline?: string; catatan_teknis?: string }
  ): Promise<{ success: boolean; message: string; data: Project }> {
    return this.request<{ success: boolean; message: string; data: Project }>(
      `/api/rab/${rabId}/convert`,
      {
        method: "POST",
        body: JSON.stringify(options || {}),
      }
    );
  }

  // KPIs
  public static async getKpis(
    companyId?: string,
    publishedOnly = false
  ): Promise<{ kpis: KpiEvaluation[]; userStats: Record<string, UserKpiStats> }> {
    const res = await this.request<{
      success: boolean;
      data: KpiEvaluation[];
      userStats: Record<string, UserKpiStats>;
    }>(`/api/kpi?companyId=${companyId || "sci-tech-01"}&publishedOnly=${publishedOnly}`);
    return { kpis: res.data, userStats: res.userStats || {} };
  }

  public static async createKpi(kpiData: Record<string, unknown>): Promise<KpiEvaluation> {
    const res = await this.request<{ success: boolean; data: KpiEvaluation }>(`/api/kpi`, {
      method: "POST",
      body: JSON.stringify(kpiData),
    });
    return res.data;
  }

  public static async updateKpi(kpiData: Record<string, unknown>): Promise<KpiEvaluation> {
    const res = await this.request<{ success: boolean; data: KpiEvaluation }>(`/api/kpi`, {
      method: "PUT",
      body: JSON.stringify(kpiData),
    });
    return res.data;
  }

  public static async toggleKpiPublish(id: string, isPublished: boolean): Promise<KpiEvaluation> {
    const res = await this.request<{ success: boolean; data: KpiEvaluation }>(`/api/kpi`, {
      method: "PUT",
      body: JSON.stringify({ id, is_published: isPublished }),
    });
    return res.data;
  }

  public static async deleteKpi(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/kpi?id=${id}`, {
      method: "DELETE",
    });
  }

  // Announcements
  public static async getAnnouncements(companyId?: string): Promise<Announcement[]> {
    const res = await this.request<{ success: boolean; data: Announcement[] }>(
      `/api/announcements?companyId=${companyId || "sci-tech-01"}`
    );
    return res.data;
  }

  public static async createAnnouncement(annData: Record<string, unknown>): Promise<Announcement> {
    const res = await this.request<{ success: boolean; data: Announcement }>(
      `/api/announcements`,
      {
        method: "POST",
        body: JSON.stringify(annData),
      }
    );
    return res.data;
  }

  public static async toggleAnnouncementPublish(id: string, isPublished: boolean): Promise<Announcement> {
    const res = await this.request<{ success: boolean; data: Announcement }>(
      `/api/announcements`,
      {
        method: "PUT",
        body: JSON.stringify({ id, is_published: isPublished }),
      }
    );
    return res.data;
  }

  public static async deleteAnnouncement(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/announcements?id=${id}`, {
      method: "DELETE",
    });
  }

  // Settings
  public static async getSettings(companyId?: string): Promise<{ company: unknown; finance: FinanceSettings }> {
    const res = await this.request<{ success: boolean; company: unknown; finance: FinanceSettings }>(
      `/api/settings?companyId=${companyId || "sci-tech-01"}`
    );
    return { company: res.company, finance: res.finance };
  }

  public static async updateSettings(settingsData: Record<string, unknown>): Promise<void> {
    await this.request<{ success: boolean }>(`/api/settings`, {
      method: "PUT",
      body: JSON.stringify(settingsData),
    });
  }

  public static async resetAllData(companyId: string, password: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/settings`, {
      method: "POST",
      body: JSON.stringify({
        action: "RESET_ALL_DATA",
        company_id: companyId,
        password,
      }),
    });
  }

  // Upload
  public static async uploadFile(file: File, type: "compro" | "pitchdeck" | "qris" | "logo"): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch(`/api/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Upload gagal");
    }
    return { url: data.url, filename: data.filename };
  }
}
