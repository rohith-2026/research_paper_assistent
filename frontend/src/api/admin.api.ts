import adminApi from "./adminAxios";

export async function apiAdminDashboard(rangeDays = 30) {
  const res = await adminApi.get("/admin/dashboard", { params: { range_days: rangeDays } });
  return res.data;
}

export async function apiAdminAnalytics(rangeDays = 30) {
  const res = await adminApi.get("/admin/analytics", { params: { range_days: rangeDays } });
  return res.data;
}

export async function apiAdminUsers(params: any = {}) {
  const res = await adminApi.get("/admin/users", { params });
  return res.data;
}

export async function apiAdminUserDetail(userId: string) {
  const res = await adminApi.get(`/admin/users/${userId}`);
  return res.data;
}

export async function apiAdminUpdateUser(userId: string, payload: any) {
  const res = await adminApi.patch(`/admin/users/${userId}`, payload);
  return res.data;
}

export async function apiAdminDeleteUser(userId: string) {
  const res = await adminApi.delete(`/admin/users/${userId}`);
  return res.data;
}

export async function apiAdminDeleteUserData(userId: string) {
  const res = await adminApi.delete(`/admin/users/${userId}/data`);
  return res.data;
}

export async function apiAdminApiUsage(rangeDays = 30) {
  const res = await adminApi.get("/admin/api-usage", { params: { range_days: rangeDays } });
  return res.data;
}

export async function apiAdminFeedback() {
  const res = await adminApi.get("/admin/feedback");
  return res.data;
}

export async function apiAdminModelPerformance(rangeDays = 14) {
  const res = await adminApi.get("/admin/model-performance", { params: { range_days: rangeDays } });
  return res.data;
}

export async function apiAdminAbuse() {
  const res = await adminApi.get("/admin/abuse");
  return res.data;
}

export async function apiAdminUpdateAbuseFlag(flagId: string, payload: any) {
  const res = await adminApi.patch(`/admin/abuse/flags/${flagId}`, payload);
  return res.data;
}

export async function apiAdminBlockIp(ip: string, reason?: string) {
  const res = await adminApi.post("/admin/abuse/block-ip", { ip, reason });
  return res.data;
}

export async function apiAdminRevokeUserSessions(userId: string) {
  const res = await adminApi.post(`/admin/abuse/revoke-sessions/${userId}`);
  return res.data;
}

export async function apiAdminCreateAbuseFlag(payload: any) {
  const res = await adminApi.post("/admin/abuse/flags", payload);
  return res.data;
}

export async function apiAdminSystemHealth() {
  const res = await adminApi.get("/admin/system-health");
  return res.data;
}

export async function apiAdminUserSessions(page = 1, limit = 50) {
  const res = await adminApi.get("/admin/sessions", {
    params: { page, limit },
    skipAdminLogout: true,
  });
  return res.data;
}

export async function apiAdminRevokeUserSession(sessionId: string) {
  const res = await adminApi.delete(`/admin/sessions/${sessionId}`);
  return res.data;
}

export async function apiAdminSettings() {
  const res = await adminApi.get("/admin/settings");
  return res.data;
}

export async function apiAdminUpdateSettings(payload: any) {
  const res = await adminApi.patch("/admin/settings", payload);
  return res.data;
}

export async function apiAdminForceLogoutUsers() {
  const res = await adminApi.post("/admin/settings/logout-users");
  return res.data;
}

export async function apiAdminForceLogoutAdmins() {
  const res = await adminApi.post("/admin/settings/logout-admins");
  return res.data;
}

export async function apiAdminRevokeAllAdminKeys() {
  const res = await adminApi.post("/admin/settings/revoke-admin-keys");
  return res.data;
}

export async function apiAdminTestEmail(to?: string) {
  const res = await adminApi.post("/admin/settings/test-email", { to });
  return res.data;
}

export async function apiAdminListAdmins(page = 1, limit = 25) {
  const res = await adminApi.get("/admin/admin-users", { params: { page, limit } });
  return res.data;
}

export async function apiAdminCreateAdmin(payload: any) {
  const res = await adminApi.post("/admin/admin-users", payload);
  return res.data;
}

export async function apiAdminUpdateAdmin(adminId: string, payload: any) {
  const res = await adminApi.patch(`/admin/admin-users/${adminId}`, payload);
  return res.data;
}

export async function apiAdminAuditLogs(limit = 100) {
  const res = await adminApi.get("/admin/audit-logs", { params: { limit } });
  return res.data;
}

export async function apiAdminExportUser(userId: string) {
  const res = await adminApi.get(`/admin/export/user/${userId}`);
  return res.data;
}

export async function apiAdminProfile() {
  const res = await adminApi.get("/admin/auth/profile");
  return res.data;
}

export async function apiAdminUpdatePreferences(payload: any) {
  const res = await adminApi.patch("/admin/auth/preferences", payload);
  return res.data;
}

export async function apiAdminCreateApiKey(name?: string) {
  const res = await adminApi.post("/admin/auth/api-keys", { name });
  return res.data;
}

export async function apiAdminRevokeApiKey(keyId: string) {
  const res = await adminApi.delete(`/admin/auth/api-keys/${keyId}`);
  return res.data;
}

export async function apiAdminEnableMfa() {
  const res = await adminApi.post("/admin/auth/mfa/enable");
  return res.data;
}

export async function apiAdminDisableMfa() {
  const res = await adminApi.post("/admin/auth/mfa/disable");
  return res.data;
}

export async function apiAdminResetAdminPassword(password: string) {
  const res = await adminApi.post("/admin/auth/reset-password", { password });
  return res.data;
}

export async function apiAdminSecurityAlerts() {
  const res = await adminApi.get("/admin/auth/security-alerts");
  return res.data;
}

export async function apiAdminAuthSessions() {
  const res = await adminApi.get("/admin/auth/sessions");
  return res.data;
}

export async function apiAdminRevokeAuthSession(sessionId: string) {
  const res = await adminApi.delete(`/admin/auth/sessions/${sessionId}`);
  return res.data;
}

export async function apiAdminSudo(password: string) {
  const res = await adminApi.post("/admin/auth/sudo", { password });
  return res.data;
}

export async function apiAdminIpAllowlist() {
  const res = await adminApi.get("/admin/auth/ip-allowlist");
  return res.data;
}

export async function apiAdminAddIpAllowlist(ip: string, label?: string) {
  const res = await adminApi.post("/admin/auth/ip-allowlist", { ip, label });
  return res.data;
}

export async function apiAdminRemoveIpAllowlist(entryId: string) {
  const res = await adminApi.delete(`/admin/auth/ip-allowlist/${entryId}`);
  return res.data;
}

export async function apiAdminCompliance() {
  const res = await adminApi.get("/admin/compliance");
  return res.data;
}

export async function apiAdminComplianceAccessReview(payload: any) {
  const res = await adminApi.post("/admin/compliance/access-review", payload);
  return res.data;
}

export async function apiAdminCompliancePurgeRun(payload: any) {
  const res = await adminApi.post("/admin/compliance/purge-run", payload);
  return res.data;
}

export async function apiAdminCompliancePiiScan(payload: any) {
  const res = await adminApi.post("/admin/compliance/pii-scan", payload);
  return res.data;
}

export async function apiAdminComplianceErrorScan(payload: any) {
  const res = await adminApi.post("/admin/compliance/error-scan", payload);
  return res.data;
}

export async function apiAdminComplianceDbScan(payload: any) {
  const res = await adminApi.post("/admin/compliance/db-scan", payload);
  return res.data;
}

export async function apiAdminComplianceApiErrorScan(payload: any) {
  const res = await adminApi.post("/admin/compliance/api-error-scan", payload);
  return res.data;
}

export async function apiAdminComplianceFrontendScan(payload: any) {
  const res = await adminApi.post("/admin/compliance/frontend-scan", payload);
  return res.data;
}

export async function apiAdminComplianceDependencyScan(payload: any) {
  const res = await adminApi.post("/admin/compliance/dependency-scan", payload);
  return res.data;
}

export async function apiAdminComplianceStorageScan(payload: any) {
  const res = await adminApi.post("/admin/compliance/storage-scan", payload);
  return res.data;
}

export async function apiAdminComplianceAuthScan(payload: any) {
  const res = await adminApi.post("/admin/compliance/auth-scan", payload);
  return res.data;
}

export async function apiAdminComplianceUpdateBadge(badgeId: string, payload: any) {
  const res = await adminApi.patch(`/admin/compliance/badges/${badgeId}`, payload);
  return res.data;
}

export async function apiAdminComplianceCreateBadge(payload: any) {
  const res = await adminApi.post("/admin/compliance/badges", payload);
  return res.data;
}

export async function apiAdminCompliancePolicyAck(policyId: string, acknowledged: boolean) {
  const res = await adminApi.post(`/admin/compliance/policy-ack/${policyId}`, { acknowledged });
  return res.data;
}

export async function apiAdminComplianceCreateJob(payload: any) {
  const res = await adminApi.post("/admin/compliance/jobs", payload);
  return res.data;
}

export async function apiAdminComplianceUpdateJob(jobId: string, payload: any) {
  const res = await adminApi.patch(`/admin/compliance/jobs/${jobId}`, payload);
  return res.data;
}

export async function apiAdminComplianceUploadEvidence(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await adminApi.post("/admin/compliance/evidence/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
