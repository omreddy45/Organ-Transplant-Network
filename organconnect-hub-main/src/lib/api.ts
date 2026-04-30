// ──────────────────────────────────────────────
// Centralized API service for OrganConnect
// All calls go through the Vite proxy → Express backend
// ──────────────────────────────────────────────

const API_URL = 'https://organ-transplant-network.onrender.com';
const BASE = `${API_URL}/api`;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  // Safely parse JSON — avoid crashing on empty / non-JSON bodies
  let data: any;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

// ───── Auth ─────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: { id: number; email: string; role: string; name: string; roleId: number; orgId: number }; sessionId: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      ),

    signup: (data: Record<string, unknown>) =>
      request<{ message: string; user: { id: number; email: string; role: string; name: string } }>(
        '/auth/signup',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    logout: (sessionId?: string) =>
      request<{ message: string }>(
        '/auth/logout',
        { method: 'POST', body: JSON.stringify({ sessionId }) }
      ),

    resetPassword: (email: string, newPassword: string) =>
      request<{ message: string }>(
        '/auth/reset-password',
        { method: 'POST', body: JSON.stringify({ email, newPassword }) }
      ),
  },

  // ───── Organs ─────

  organs: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/organs${qs}`);
    },

    inventory: (org_id?: number) => {
      const qs = org_id ? `?org_id=${org_id}` : '';
      return request<any[]>(`/organs/inventory${qs}`);
    },

    add: (data: { name: string; quantity: number; donor_id?: number; org_id: number; availability_status?: string }) =>
      request<{ message: string; organ_id: number }>(
        '/organs/add',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    update: (id: number, data: Record<string, unknown>) =>
      request<{ message: string }>(
        `/organs/${id}`,
        { method: 'PUT', body: JSON.stringify(data) }
      ),

    delete: (id: number) =>
      request<{ message: string }>(
        `/organs/${id}`,
        { method: 'DELETE' }
      ),

    stats: () =>
      request<{ donors: number; availableOrgans: number; completedTransplants: number; organizations: number }>(
        '/organs/stats'
      ),

    organizations: () =>
      request<any[]>('/organs/organizations'),
  },

  // ───── Match Requests ─────

  matchRequests: {
    create: (data: { patient_id: number; organ_type: string; urgency_level?: string }) =>
      request<{ message: string; id: number }>(
        '/match_requests',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    list: (params?: { patient_id?: number; status?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<any[]>(`/match_requests${qs}`);
    },

    assign: (id: number, data: { organ_id: number; doctor_id: number; org_id: number }) =>
      request<{ message: string }>(
        `/match_requests/${id}/assign`,
        { method: 'POST', body: JSON.stringify(data) }
      ),

    reject: (id: number) =>
      request<{ message: string }>(`/match_requests/${id}/reject`, {
        method: 'POST',
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/match_requests/${id}`, {
        method: 'DELETE',
      }),
  },

  // ───── Donors ─────

  donors: {
    list: (params?: { status?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<any[]>(`/donors${qs}`);
    },

    approve: (id: number) =>
      request<{ message: string }>(
        `/donors/${id}/approve`,
        { method: 'PUT' }
      ),

    reject: (id: number) =>
      request<{ message: string }>(
        `/donors/${id}/reject`,
        { method: 'PUT' }
      ),

    createPledge: (data: { donor_id: number; org_id: number; organ_type: string }) =>
      request<{ message: string; pledge_id: number }>(
        `/donors/pledge`,
        { method: 'POST', body: JSON.stringify(data) }
      ),

    listPledges: (params?: { donor_id?: number; org_id?: number }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<any[]>(`/donors/pledges${qs}`);
    },

    approvePledge: (id: number) =>
      request<{ message: string }>(
        `/donors/pledge/${id}/approve`,
        { method: 'POST' }
      ),

    rejectPledge: (id: number) =>
      request<{ message: string }>(
        `/donors/pledge/${id}/reject`,
        { method: 'POST' }
      ),
  },

  // ───── Transplants ─────

  transplants: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/transplants${qs}`);
    },

    create: (data: Record<string, unknown>) =>
      request<{ message: string; transplant_id: number }>(
        '/transplants',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    update: (id: number, data: Record<string, unknown>) =>
      request<{ message: string }>(
        `/transplants/${id}`,
        { method: 'PUT', body: JSON.stringify(data) }
      ),

    analytics: (org_id?: number) => {
      const qs = org_id ? `?org_id=${org_id}` : '';
      return request<{ monthly: any[]; mix: any[]; growth: any[] }>(`/transplants/analytics${qs}`);
    },
  },

  // ───── Doctors ─────

  doctors: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/doctors${qs}`);
    },

    updateStatus: (id: number, availability_status: string) =>
      request<{ message: string }>(
        `/doctors/${id}/status`,
        { method: 'PUT', body: JSON.stringify({ availability_status }) }
      ),

    schedule: (id: number) =>
      request<any[]>(`/doctors/${id}/schedule`),

    bookVisit: (data: { doctor_id: number; patient_id: number; visit_date: string }) =>
      request<{ message: string }>(
        '/doctors/visit',
        { method: 'POST', body: JSON.stringify(data) }
      ),
  },

  // ───── Patients ─────

  patients: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/patients${qs}`);
    },

    schedule: (id: number) =>
      request<any[]>(`/patients/${id}/schedule`),
  },

  // ───── Medical History ─────

  medicalHistory: {
    list: (patient_id: number) =>
      request<any[]>(`/medical-history?patient_id=${patient_id}`),

    add: (patient_id: number, medical_detail: string) =>
      request<{ message: string; history_id: number; record_date: string }>(
        '/medical-history/add',
        { method: 'POST', body: JSON.stringify({ patient_id, medical_detail }) }
      ),

    delete: (id: number) =>
      request<{ message: string }>(
        `/medical-history/${id}`,
        { method: 'DELETE' }
      ),
  },

  // ───── Profile ─────

  profile: {
    get: (user_id: number) =>
      request<any>(`/profile?user_id=${user_id}`),

    update: (data: Record<string, unknown>) =>
      request<{ message: string }>(
        '/profile/update',
        { method: 'PUT', body: JSON.stringify(data) }
      ),

    changePassword: (user_id: number, currentPassword: string, newPassword: string) =>
      request<{ message: string }>(
        '/profile/password',
        { method: 'PUT', body: JSON.stringify({ user_id, currentPassword, newPassword }) }
      ),

    delete: (user_id: number) =>
      request<{ message: string }>(
        `/profile?user_id=${user_id}`,
        { method: 'DELETE' }
      ),
  },

  // ───── Sessions ─────

  sessions: {
    list: (org_id: number) =>
      request<{ sessions: any[]; stats: { total: number; active: number; uniqueUsers: number } }>(
        `/sessions?org_id=${org_id}`
      ),
  },

  // ───── Admin ─────

  admin: {
    stats: () =>
      request<any>('/admin/stats'),

    users: (params?: { role?: string; search?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return request<any[]>(`/admin/users${qs}`);
    },

    deleteUser: (id: number) =>
      request<{ message: string }>(
        `/admin/users/${id}`,
        { method: 'DELETE' }
      ),

    organizations: () =>
      request<any[]>('/admin/organizations'),

    auditLog: () =>
      request<any[]>('/admin/audit-log'),

    restoreAuditRecord: (id: number) =>
      request<{ message: string }>(`/admin/audit-log/${id}/restore`, {
        method: 'POST',
      }),

    organLimits: () =>
      request<any[]>('/admin/organ-limits'),

    addOrganLimit: (data: { organ_name: string; max_donations: number; required_specialization: string; description?: string }) =>
      request<{ message: string }>('/admin/organ-limits', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      
    deleteOrganLimit: (name: string) =>
      request<{ message: string }>(`/admin/organ-limits/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      }),
  },
};
