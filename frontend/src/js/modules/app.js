    function setAccountTab(tabName) {
      state.accountTab = "list";
      if (els.accountTabPanes) {
        els.accountTabPanes.forEach((pane) => {
          pane.classList.toggle("active", pane.dataset.accountPane === "list");
        });
      }
    }

    function closeHeaderMenus() {
      [els.moreMenu, els.adminMenu, els.topbarProfileMenu].forEach((menu) => {
        if (!menu) return;
        menu.classList.remove("open");
        menu.setAttribute("aria-hidden", "true");
      });
      [els.moreMenuBtn, els.adminMenuBtn, topbarUserBtn].forEach((btn) => {
        if (!btn) return;
        btn.setAttribute("aria-expanded", "false");
      });
    }

    function toggleHeaderMenu(menuName) {
      const menu = menuName === "admin" ? els.adminMenu : els.moreMenu;
      const button = menuName === "admin" ? els.adminMenuBtn : els.moreMenuBtn;
      if (!menu || !button) return;
      const willOpen = !menu.classList.contains("open");
      closeHeaderMenus();
      if (!willOpen) return;
      menu.classList.add("open");
      menu.setAttribute("aria-hidden", "false");
      button.setAttribute("aria-expanded", "true");
    }

    function openAccountManagement() {
      setActiveTab("accountSection");
      setAccountTab("list");
    }

    function handleAdminMenuAction(action) {
      closeHeaderMenus();
      ensureCurrentUserAuditAccess();
      const perms = getRolePermissions();
      switch (action) {
        case "accountSection":
        case "createAccount":
        case "accountList":
          if (!perms.canAdminReset) {
            showPermissionDenied("open Account Management");
            return;
          }
          openAccountManagement();
          break;
        case "forgotPassword":
          toast("Forgot Password is handled from the login screen.", "info");
          break;
        case "changeOtherPassword":
          if (!perms.canResetOtherPasswords) {
            showPermissionDenied("change another account password");
            return;
          }
          openAccountManagement("list");
          requestAnimationFrame(() => {
            const selected = getSelectedAccount() || state.currentUser || getAuthUserByUsername("admin") || state.authUsers[0] || null;
            if (selected) {
              selectAccount(selected.username);
              openAdminPasswordModal(selected);
            }
          });
          break;
        case "adminReset":
          if (!perms.canAdminReset) {
            showPermissionDenied("admin reset");
            return;
          }
          openAdminResetModal();
          break;
        default:
          break;
      }
    }

    function auditSummary(tx) {
      const parts = [];
      if (tx?.createdAt) parts.push(`Created ${formatDateTime(tx.createdAt)}`);
      if (tx?.updatedAt) parts.push(`Updated ${formatDateTime(tx.updatedAt)}`);
      if (tx?.lastAction) parts.push(tx.lastAction);
      return parts.join(" · ");
    }

    function getCustomerSnapshot(name) {
      const customer = normalize(name);
      const profile = [...state.customerProfiles].reverse().find((item) => normalize(item.name) === customer);
      if (profile) {
        return {
          address: profile.address || "",
          tin: profile.tin || "",
          contactPerson: profile.contactPerson || "",
          contactNumber: profile.contactNumber || "",
          email: profile.email || "",
          paymentTerms: profile.paymentTerms || "30",
          modeOfPayment: profile.modeOfPayment || "",
          bankDetails: profile.bankDetails || "",
          remarks: profile.remarks || "",
          source: "profile",
        };
      }
      const match = [...state.transactions].reverse().find((tx) => normalize(tx.customer) === customer);
      return match ? {
        address: match.customerAddress || "",
        tin: match.customerTin || "",
        contactPerson: match.representative || "",
        contactNumber: "",
        email: "",
        paymentTerms: String(match.paymentTerms || 30),
        modeOfPayment: "",
        bankDetails: match.bankDetails || "",
        remarks: match.otherRemarks || "",
        source: "transaction",
      } : { address: "", tin: "", contactPerson: "", contactNumber: "", email: "", paymentTerms: "30", modeOfPayment: "", bankDetails: "", remarks: "", source: "none" };
    }

    function applySoaLogoPreview() {
      const src = state.soaHeader.logoDataUrl || COMPANY_LOGO_SRC;
      if (!els.soaBrandLogo) return;
      els.soaBrandLogo.onerror = () => {
        if (els.soaBrandLogo.src !== COMPANY_LOGO_SRC) {
          els.soaBrandLogo.onerror = null;
          els.soaBrandLogo.src = COMPANY_LOGO_SRC;
          return;
        }
        els.soaBrandLogo.removeAttribute("src");
      };
      els.soaBrandLogo.src = src;
    }

    function normalize(str) {
      return String(str || "").trim().toLowerCase();
    }

    function parseJsonMaybe(value) {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value === "object") return value;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    function normalizeAuthUser(user) {
      if (!user || typeof user !== "object") return null;
      const username = String(user.username || "").trim();
      const password = String(user.password || user.passwordHash || user.password_hash || "");
      const fullName = String(user.fullName || user.full_name || "").trim();
      const role = ["Admin", "Encoder", "Reviewer", "Viewer", "President"].includes(user.role) ? user.role : "Viewer";
      if (!username || !fullName) return null;
      const accessSource = user.access || user.permissions || user.access_json || {};
      const access = mergePermissionProfiles(role, parseJsonMaybe(accessSource) || {});
      return {
        username,
        password,
        fullName,
        role,
        access,
        department: String(user.department || user.department_name || "Accounting").trim(),
        email: String(user.email || "").trim(),
        status: String(user.status || "Active").trim() || "Active",
        notes: String(user.notes || "").trim(),
        forcePasswordChange: !!(user.forcePasswordChange ?? user.force_password_change),
        createdAt: user.createdAt || user.created_at || new Date().toISOString(),
        createdBy: String(user.createdBy || user.created_by || "System").trim() || "System",
        updatedAt: user.updatedAt || user.updated_at || user.createdAt || user.created_at || new Date().toISOString(),
        updatedBy: String(user.updatedBy || user.updated_by || user.createdBy || user.created_by || "System").trim() || "System",
        lastLogin: String(user.lastLogin || user.last_login_at || "").trim(),
        profileImage: String(user.profileImage || "").trim(),
        source: user.source || "local",
      };
    }

    const APP_API_BASE = "";

    function resolveApiEndpoint(path) {
      if (typeof APP_API_BASE !== "string" || APP_API_BASE === "") {
        const abs = path.startsWith("/") ? path : `/${path}`;
        return abs;
      }
      const base = APP_API_BASE.replace(/\/+$/, "");
      const suffix = path.startsWith("/") ? path : `/${path}`;
      return `${base}${suffix}`;
    }

    function getAuthToken() {
      try {
        const raw = localStorage.getItem("wholesale_auth_token") || sessionStorage.getItem("wholesale_auth_token");
        return raw || null;
      } catch {
        return null;
      }
    }

    async function apiJson(path, options = {}) {
      const endpoint = resolveApiEndpoint(path);
      const token = getAuthToken();
      const init = {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      };
      const response = await fetch(endpoint, init);
      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }
      if (!response.ok) {
        const error = new Error(data.message || response.statusText || `Request failed (${response.status})`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    }

    function collectTransactionExtras(tx = {}) {
      const known = new Set([
        "id",
        "sourceSheet",
        "source_sheet",
        "sourceRow",
        "source_row",
        "invNo",
        "invoice_no",
        "invoiceNo",
        "customer",
        "customer_name",
        "tin",
        "date",
        "invoice_date",
        "gross",
        "freight",
        "salesReturn",
        "sales_return",
        "discountDM",
        "discount_dm",
        "returnsDisc",
        "returns_disc",
        "notes",
        "netDeduction",
        "net_deduction",
        "ewt",
        "netSales",
        "net_sales",
        "depositDate",
        "deposit_date",
        "bank",
        "crDetails",
        "cr_details",
        "payment",
        "dueDate",
        "due_date",
        "daysPastDue",
        "days_past_due",
        "status",
        "receivable",
        "createdBy",
        "created_by",
        "updatedBy",
        "updated_by",
        "createdAt",
        "created_at",
        "updatedAt",
        "updated_at",
        "extras",
        "extrasJson",
        "extras_json",
      ]);
      const extras = {};
      Object.entries(tx || {}).forEach(([key, value]) => {
        if (known.has(key)) return;
        if (value === undefined) return;
        extras[key] = value;
      });
      return extras;
    }

    function buildTransactionPayload(tx = {}, index = 0) {
      const extras = collectTransactionExtras(tx);
      return {
        sourceSheet: tx.sourceSheet ?? tx.source_sheet ?? "app",
        sourceRow: Number(tx.sourceRow ?? tx.source_row ?? index + 1),
        invNo: tx.invNo ?? tx.invoice_no ?? tx.invoiceNo ?? "",
        customer: tx.customer ?? tx.customer_name ?? "",
        tin: tx.tin ?? "",
        date: tx.date ?? tx.invoice_date ?? "",
        gross: Number(tx.gross ?? 0),
        freight: Number(tx.freight ?? 0),
        salesReturn: Number(tx.salesReturn ?? tx.sales_return ?? 0),
        discountDM: Number(tx.discountDM ?? tx.discount_dm ?? 0),
        returnsDisc: Number(tx.returnsDisc ?? tx.returns_disc ?? 0),
        notes: tx.notes ?? "",
        netDeduction: Number(tx.netDeduction ?? tx.net_deduction ?? 0),
        ewt: Number(tx.ewt ?? 0),
        netSales: Number(tx.netSales ?? tx.net_sales ?? 0),
        depositDate: tx.depositDate ?? tx.deposit_date ?? "",
        bank: tx.bank ?? "",
        crDetails: tx.crDetails ?? tx.cr_details ?? "",
        payment: Number(tx.payment ?? 0),
        dueDate: tx.dueDate ?? tx.due_date ?? "",
        daysPastDue: Number(tx.daysPastDue ?? tx.days_past_due ?? 0),
        status: String(tx.status ?? "NOTDUE").toUpperCase(),
        receivable: Number(tx.receivable ?? 0),
        createdBy: tx.createdBy ?? tx.created_by ?? "",
        updatedBy: tx.updatedBy ?? tx.updated_by ?? "",
        createdAt: tx.createdAt ?? tx.created_at ?? "",
        updatedAt: tx.updatedAt ?? tx.updated_at ?? "",
        extras,
      };
    }

    function buildAccountPayload(user = {}, overrides = {}) {
      const accessSource = overrides.access ?? user.access ?? user.permissions ?? {};
      return {
        username: overrides.username ?? user.username ?? "",
        fullName: overrides.fullName ?? user.fullName ?? "",
        password: overrides.password ?? "",
        role: overrides.role ?? user.role ?? "Viewer",
        department: overrides.department ?? user.department ?? "Accounting",
        status: overrides.status ?? user.status ?? "Active",
        email: overrides.email ?? user.email ?? "",
        access: parseJsonMaybe(accessSource) || {},
        forcePasswordChange: overrides.forcePasswordChange ?? user.forcePasswordChange ?? false,
        notes: overrides.notes ?? user.notes ?? "",
        profileImage: overrides.profileImage ?? user.profileImage ?? "",
      };
    }

    function getAuthUserByUsername(username) {
      const needle = normalize(username);
      if (!needle) return null;
      return (Array.isArray(state.authUsers) ? state.authUsers : []).find((user) => normalize(user.username) === needle) || null;
    }

    function hydrateCurrentUserFromDirectory() {
      if (!state.currentUser?.username) return;
      const stored = getAuthUserByUsername(state.currentUser.username);
      if (stored) {
        state.currentUser = stored;
      }
    }

    async function loadAuthUsers() {
      try {
        const accounts = await apiJson("/api/accounts");
        const normalized = Array.isArray(accounts) ? accounts.map(normalizeAuthUser).filter(Boolean) : [];
        if (normalized.length > 0) {
          state.authUsers = normalized;
          localStorage.setItem(`${STORAGE_KEY}-auth-users`, JSON.stringify(normalized));
          hydrateCurrentUserFromDirectory();
          return;
        }
      } catch (err) {
        console.warn("Could not load auth users from backend, using local data", err);
      }
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY}-auth-users`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const mapped = Array.isArray(parsed) ? parsed.map(normalizeAuthUser).filter(Boolean) : [];
          if (mapped.length > 0) {
            state.authUsers = mapped;
          } else {
            state.authUsers = getDefaultAuthUsers();
          }
        } else {
          state.authUsers = getDefaultAuthUsers();
        }
      } catch {
        state.authUsers = getDefaultAuthUsers();
      }
      hydrateCurrentUserFromDirectory();
    }

    function getDefaultAuthUsers() {
      return [
        normalizeAuthUser({ username: "marco", fullName: "Marco Qua", role: "President", password: "President@123", status: "Active", department: "Management" }),
        normalizeAuthUser({ username: "admin", fullName: "Office Admin", role: "Admin", password: "Admin@123", status: "Active", department: "Accounting" }),
        normalizeAuthUser({ username: "encoder", fullName: "Office Encoder", role: "Encoder", password: "Encoder@123", status: "Active", department: "Accounting" }),
        normalizeAuthUser({ username: "reviewer", fullName: "Office Reviewer", role: "Reviewer", password: "Reviewer@123", status: "Active", department: "Accounting" }),
        normalizeAuthUser({ username: "viewer", fullName: "Office Viewer", role: "Viewer", password: "Viewer@123", status: "Active", department: "Accounting" }),
        normalizeAuthUser({ username: "Satc-Leri", fullName: "Leri", role: "Admin", password: "Satc2005", status: "Active", department: "Accounting" }),
        normalizeAuthUser({ username: "Satc-Mlot", fullName: "Mlot", role: "Admin", password: "Satc2005", status: "Active", department: "Accounting" }),
      ].filter(Boolean);
    }

    function saveAuthUsers() {
      try {
        localStorage.setItem(`${STORAGE_KEY}-auth-users`, JSON.stringify(state.authUsers || []));
      } catch (err) {
        console.warn("Could not save auth users to localStorage", err);
      }
    }

    function updateAccountCountChip() {
      const count = Array.isArray(state.authUsers) ? state.authUsers.length : 0;
      if (els.accountUserCountChip) els.accountUserCountChip.textContent = `${count} account${count === 1 ? "" : "s"}`;
      if (els.accountListCountChip) els.accountListCountChip.textContent = `${count} user${count === 1 ? "" : "s"}`;
    }

    function formatPermissionSummary(user) {
      const perms = getEffectivePermissions(user);
      const labels = [];
      if (perms.tabs?.includes("summarySection")) labels.push("Summary");
      if (perms.tabs?.includes("encodeSection")) labels.push("Encoding");
      if (perms.tabs?.includes("soaSection")) labels.push("SOA");
      if (perms.tabs?.includes("agingSection")) labels.push("Aging");
      if (perms.tabs?.includes("accountSection")) labels.push("Accounts");
      if (perms.canCancel) labels.push("Cancel");
      if (perms.canExport) labels.push("Export");
      if (perms.canResetSample) labels.push("Reset");
      if (perms.canResetOtherPasswords) labels.push("Passwords");
      if (perms.canAdminReset) labels.push("Admin");
      return labels.length ? labels.join(" / ") : "Restricted";
    }

    function getEffectivePermissions(user = state.currentUser) {
      if (!user) return makePermissionProfileFromRole("Viewer");
      return mergePermissionProfiles(user.role, user.access || user.permissions || {});
    }

    function getSelectedAccount() {
      return getAuthUserByUsername(state.selectedAccountUsername);
    }

    function setAccountPermissionChecks(user) {
      if (!els.accountPermissionGrid) return;
      const checks = els.accountPermissionGrid.querySelectorAll("input[data-account-permission]");
      if (!user) {
        checks.forEach((input) => {
          input.checked = false;
          input.disabled = true;
        });
        return;
      }
      const perms = getEffectivePermissions(user);
      checks.forEach((input) => {
        const key = input.dataset.accountPermission;
        if (key === "summarySection" || key === "encodeSection" || key === "soaSection" || key === "agingSection" || key === "settingsSection" || key === "accountSection") {
          input.checked = Array.isArray(perms.tabs) && perms.tabs.includes(key);
          input.disabled = false;
        } else if (key && key in perms) {
          input.checked = !!perms[key];
          input.disabled = false;
        } else {
          input.checked = false;
          input.disabled = true;
        }
      });
    }

    function renderSelectedAccountDetails() {
      const user = getSelectedAccount();
      const hasSelection = !!user;
      if (els.accountSelectedState) els.accountSelectedState.hidden = hasSelection;
      if (els.accountAccessSummary) els.accountAccessSummary.hidden = !hasSelection;
      if (els.saveAccountAccessBtn) els.saveAccountAccessBtn.disabled = !hasSelection;
      if (els.resetAccountAccessBtn) els.resetAccountAccessBtn.disabled = !hasSelection;
      if (els.changeAccountPasswordBtn) els.changeAccountPasswordBtn.disabled = !hasSelection;
      if (!user) {
        if (els.selectedAccountFullName) els.selectedAccountFullName.textContent = "-";
        if (els.selectedAccountUsername) els.selectedAccountUsername.textContent = "-";
        if (els.selectedAccountRole) els.selectedAccountRole.textContent = "-";
        if (els.selectedAccountStatus) els.selectedAccountStatus.textContent = "-";
        setAccountPermissionChecks(null);
        return;
      }
      if (els.selectedAccountFullName) els.selectedAccountFullName.textContent = user.fullName || "-";
      if (els.selectedAccountUsername) els.selectedAccountUsername.textContent = user.username || "-";
      if (els.selectedAccountRole) els.selectedAccountRole.textContent = user.role || "-";
      if (els.selectedAccountStatus) els.selectedAccountStatus.textContent = user.status || "-";
      setAccountPermissionChecks(user);
    }

    function selectAccount(username) {
      const selected = String(username || "").trim();
      state.selectedAccountUsername = selected;
      renderSelectedAccountDetails();
      renderAccountList();
    }

    function collectAccountPermissionOverrides() {
      const overrides = {};
      const checks = els.accountPermissionGrid?.querySelectorAll("input[data-account-permission]") || [];
      checks.forEach((input) => {
        const key = input.dataset.accountPermission;
        if (!key) return;
        if (key === "summarySection" || key === "encodeSection" || key === "soaSection" || key === "agingSection" || key === "accountSection") {
          overrides.tabs = overrides.tabs || [];
          if (input.checked) overrides.tabs.push(key);
          return;
        }
        overrides[key] = !!input.checked;
      });
      if (Array.isArray(overrides.tabs)) {
        const currentTabs = makePermissionProfileFromRole(getSelectedAccount()?.role || "Viewer").tabs || [];
        if (!overrides.tabs.length) {
          overrides.tabs = [];
        } else if (overrides.tabs.length === currentTabs.length && currentTabs.every((item) => overrides.tabs.includes(item))) {
          overrides.tabs = currentTabs.slice();
        }
      }
      return overrides;
    }

    async function saveSelectedAccountAccess() {
      if (!getRolePermissions().canAdminReset) {
        showPermissionDenied("edit account access");
        return;
      }
      const user = getSelectedAccount();
      if (!user) {
        toast("Select an account first.", "warning");
        return;
      }
      const nextAccess = mergePermissionProfiles(user.role, collectAccountPermissionOverrides());
      if (normalize(user.username) === normalize(state.currentUser?.username) && !(nextAccess.tabs || []).includes("accountSection")) {
        toast("You cannot remove your own Account Management access from your active session.", "warning");
        return;
      }
      const index = state.authUsers.findIndex((item) => normalize(item.username) === normalize(user.username));
      if (index < 0) return;
      const payload = buildAccountPayload(state.authUsers[index], {
        access: nextAccess,
        updatedBy: state.currentUser?.fullName || state.currentUser?.username || "System",
      });
      try {
        await apiJson(`/api/accounts/${state.authUsers[index].id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        await loadAuthUsers();
      } catch (err) {
        console.warn("Could not sync account access to backend", err);
        state.authUsers[index] = {
          ...state.authUsers[index],
          access: nextAccess,
          updatedAt: new Date().toISOString(),
          updatedBy: state.currentUser?.fullName || state.currentUser?.username || "System",
        };
        saveAuthUsers();
      }
      hydrateCurrentUserFromDirectory();
      renderAccountList();
      renderSelectedAccountDetails();
      applyRolePermissions();
      toast("Account access saved successfully", "success", `${user.fullName} - ${user.username}`);
      pushAuditLog({
        action: "Account Access Updated",
        invNo: "",
        customer: user.fullName,
        actor: state.currentUser?.fullName || state.currentUser?.username || "System",
        detail: `Updated access for ${user.username} (${user.role})`,
        before: user.access || makePermissionProfileFromRole(user.role),
        after: nextAccess,
        fields: ACCOUNT_PERMISSION_KEYS,
      });
    }

    async function resetSelectedAccountAccessToRole() {
      if (!getRolePermissions().canAdminReset) {
        showPermissionDenied("reset account access");
        return;
      }
      const user = getSelectedAccount();
      if (!user) {
        toast("Select an account first.", "warning");
        return;
      }
      const index = state.authUsers.findIndex((item) => normalize(item.username) === normalize(user.username));
      if (index < 0) return;
      const nextAccess = makePermissionProfileFromRole(user.role);
      const payload = buildAccountPayload(state.authUsers[index], {
        access: nextAccess,
        updatedBy: state.currentUser?.fullName || state.currentUser?.username || "System",
      });
      try {
        await apiJson(`/api/accounts/${state.authUsers[index].id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        await loadAuthUsers();
      } catch (err) {
        console.warn("Could not sync account reset to backend", err);
        state.authUsers[index] = {
          ...state.authUsers[index],
          access: nextAccess,
          updatedAt: new Date().toISOString(),
          updatedBy: state.currentUser?.fullName || state.currentUser?.username || "System",
        };
        saveAuthUsers();
      }
      hydrateCurrentUserFromDirectory();
      renderAccountList();
      renderSelectedAccountDetails();
      applyRolePermissions();
      toast("Account access reset to role default", "info", `${user.fullName} - ${user.role}`);
      pushAuditLog({
        action: "Account Access Reset",
        invNo: "",
        customer: user.fullName,
        actor: state.currentUser?.fullName || state.currentUser?.username || "System",
        detail: `Reset access for ${user.username} to role default`,
        before: user.access || makePermissionProfileFromRole(user.role),
        after: nextAccess,
        fields: ACCOUNT_PERMISSION_KEYS,
      });
    }

    function renderAccountList() {
      if (!els.accountListBody) return;
      const rows = Array.isArray(state.authUsers) ? state.authUsers.slice().sort((a, b) => normalize(a.fullName).localeCompare(normalize(b.fullName))) : [];
      updateAccountCountChip();
      if (!rows.length) {
        state.selectedAccountUsername = "";
        els.accountListBody.innerHTML = `<tr><td colspan="10" class="empty-state">No account records yet.</td></tr>`;
        renderSelectedAccountDetails();
        return;
      }
      if (state.selectedAccountUsername && !rows.some((user) => normalize(user.username) === normalize(state.selectedAccountUsername))) {
        state.selectedAccountUsername = "";
      }
      els.accountListBody.innerHTML = rows.map((user) => {
        const initials = (user.fullName || "AU").split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
        const avatarHtml = user.profileImage
          ? `<img src="${escapeHtml(user.profileImage)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />`
          : `<span style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1d6fd6,#0b4f9f);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;">${escapeHtml(initials)}</span>`;
        return `
        <tr class="${normalize(user.username) === normalize(state.selectedAccountUsername) ? "account-row-selected" : ""}" data-account-username="${escapeHtml(user.username || "")}">
          <td style="display:flex;align-items:center;gap:10px;">${avatarHtml}<strong>${escapeHtml(user.fullName || "-")}</strong></td>
          <td>${escapeHtml(user.username || "-")}</td>
          <td><span class="chip">${escapeHtml(user.role || "-")}</span></td>
          <td>${escapeHtml(user.department || "-")}</td>
          <td><span class="chip">${escapeHtml(user.status || "Active")}</span></td>
          <td>${escapeHtml(user.email || "-")}</td>
          <td>${escapeHtml(formatPermissionSummary(user))}</td>
          <td>${escapeHtml(formatDateTime(user.createdAt || ""))}</td>
          <td>${escapeHtml(formatDateTime(user.lastLogin || ""))}</td>
          <td style="text-align:center;white-space:nowrap;">
            <button type="button" class="account-audit-btn" data-audit-user="${escapeHtml(user.username || "")}" title="View Audit Trail for ${escapeHtml(user.fullName || user.username)}" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;cursor:pointer;color:#475569;font-size:11px;font-weight:600;transition:all 0.15s;display:inline-flex;align-items:center;gap:4px;">Audit</button>
            <button type="button" class="account-delete-btn" data-delete-user="${escapeHtml(user.username || "")}" title="Delete ${escapeHtml(user.fullName || user.username)}" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;cursor:pointer;color:#dc2626;font-size:11px;font-weight:600;transition:all 0.15s;display:inline-flex;align-items:center;gap:4px;margin-left:4px;">Delete</button>
          </td>
        </tr>`;
      }).join("");
      renderSelectedAccountDetails();
    }

    async function loadTransactions() {
      const DATA_VERSION = "2026-v8";
      try {
        const rows = await apiJson("/api/transactions?limit=10000");
        if (Array.isArray(rows) && rows.length > 0) {
          state.transactions = rows;
          localStorage.setItem(`${STORAGE_KEY}-transactions`, JSON.stringify(rows));
          return;
        }
      } catch (err) {
        console.warn("Could not load transactions from backend, using local data", err);
      }
      try {
        const savedVersion = localStorage.getItem(`${STORAGE_KEY}-data-version`);
        if (savedVersion === DATA_VERSION) {
          const raw = localStorage.getItem(`${STORAGE_KEY}-transactions`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              state.transactions = parsed;
              return;
            }
          }
        }
        localStorage.removeItem(`${STORAGE_KEY}-transactions`);
        localStorage.removeItem(`${STORAGE_KEY}-customer-profiles`);
        localStorage.removeItem(`${STORAGE_KEY}-audit-log`);
        localStorage.removeItem(`${STORAGE_KEY}-data-version`);
      } catch {}
      if (window.WHOLESALE_INVOICE_DATABASE && window.WHOLESALE_INVOICE_DATABASE.length) {
        state.transactions = window.WHOLESALE_INVOICE_DATABASE.map((tx) => ({
          sourceSheet: tx.sourceSheet || "",
          sourceRow: tx.sourceRow || 0,
          section: tx.section || "",
          invNo: tx.invNo || "",
          customer: tx.customer || "",
          tin: tx.tin || "",
          date: tx.date || "",
          gross: Number(tx.gross || 0),
          freight: Number(tx.freight || 0),
          salesReturn: Number(tx.salesReturn || 0),
          discountDM: Number(tx.discountDM || 0),
          returnsDisc: Number(tx.returnsDisc || 0),
          notes: tx.notes || "",
          netDeduction: Number(tx.netDeduction || 0),
          ewt: Number(tx.ewt || 0),
          netSales: Number(tx.netSales || 0),
          depositDate: tx.depositDate || "",
          bank: tx.bank || "",
          crDetails: tx.crDetails || "",
          payment: Number(tx.payment || 0),
          dueDate: tx.dueDate || "",
          daysPastDue: Number(tx.daysPastDue || 0),
          status: String(tx.status || "NOTDUE").toUpperCase(),
          receivable: Number(tx.receivable || 0),
        }));
        localStorage.setItem(`${STORAGE_KEY}-transactions`, JSON.stringify(state.transactions));
        localStorage.setItem(`${STORAGE_KEY}-data-version`, DATA_VERSION);
        console.log("Loaded", state.transactions.length, "transactions from database");
        return;
      }
      state.transactions = sampleTransactions.slice();
    }

    async function saveTransactions() {
      try {
        await apiJson("/api/transactions", {
          method: "POST",
          body: JSON.stringify({ transactions: state.transactions || [] }),
        });
      } catch (err) {
        console.warn("Could not sync transactions to backend", err);
      }
      try {
        localStorage.setItem(`${STORAGE_KEY}-transactions`, JSON.stringify(state.transactions || []));
      } catch (err) {
        console.warn("Could not save transactions to localStorage", err);
      }
      if (els.metaLastSaved) els.metaLastSaved.textContent = `Saved ${new Date().toLocaleTimeString("en-PH")}`;
    }

    function saveSoaHeader() {
      localStorage.setItem(`${STORAGE_KEY}-soa-header`, JSON.stringify(state.soaHeader));
    }

    function saveAuditLog() {
      try {
        localStorage.setItem(`${STORAGE_KEY}-audit-log`, JSON.stringify(state.auditLog || []));
      } catch (err) {
        console.warn("Could not save audit log to localStorage", err);
      }
    }

    async function saveCustomerProfiles() {
      try {
        await apiJson("/api/customers", {
          method: "POST",
          body: JSON.stringify({ profiles: state.customerProfiles || [] }),
        });
      } catch (err) {
        console.warn("Could not sync customer profiles to backend", err);
      }
      try {
        localStorage.setItem(`${STORAGE_KEY}-customer-profiles`, JSON.stringify(state.customerProfiles || []));
      } catch (err) {
        console.warn("Could not save customer profiles to localStorage", err);
      }
    }

    function normalizeAuditLogEntry(entry) {
      const changes = Array.isArray(entry?.changes)
        ? entry.changes.filter(Boolean)
        : String(entry?.changes || "")
          .split(";")
          .map((item) => item.trim())
          .filter(Boolean);
      return {
        ...entry,
        changes,
      };
    }

    function applySettingsToSoaHeaderDefaults() {
      state.soaHeader = {
        ...state.soaHeader,
        address: state.settings.companyAddress || state.soaHeader.address || "",
        email: state.settings.companyEmail || state.soaHeader.email || "",
        modePayment: state.settings.defaultModePayment || state.soaHeader.modePayment || "",
        preparedBy: state.settings.defaultPreparedBy || state.soaHeader.preparedBy || "",
        approvedBy: state.settings.defaultApprovedBy || state.soaHeader.approvedBy || "",
      };
    }

    function renderCompanySummaryLine() {
      if (!els.companySummaryLine) return;
      const company = state.settings.companyName || DEFAULT_SETTINGS.companyName;
      const address = state.settings.companyAddress || DEFAULT_SETTINGS.companyAddress;
      els.companySummaryLine.innerHTML = `${escapeHtml(company)}<span class="company-summary-subline">${escapeHtml(address)}</span>`;
    }

    async function loadSettings() {
      try {
        const settings = await apiJson("/api/settings");
        if (settings && typeof settings === "object" && !Array.isArray(settings)) {
          state.settings = { ...DEFAULT_SETTINGS, ...settings };
          localStorage.setItem(`${STORAGE_KEY}-settings`, JSON.stringify(state.settings));
          syncSettingsForm();
          applySettingsToSoaHeaderDefaults();
          renderCompanySummaryLine();
          return;
        }
      } catch (err) {
        console.warn("Could not load settings from backend, using local data", err);
      }
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY}-settings`);
        if (raw) {
          state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } else {
          state.settings = { ...DEFAULT_SETTINGS };
        }
      } catch {
        state.settings = { ...DEFAULT_SETTINGS };
      }
      syncSettingsForm();
      applySettingsToSoaHeaderDefaults();
      renderCompanySummaryLine();
    }

    function syncSettingsForm() {
      if (els.settingsCompanyName) els.settingsCompanyName.value = state.settings.companyName || "";
      if (els.settingsCompanyAddress) els.settingsCompanyAddress.value = state.settings.companyAddress || "";
      if (els.settingsCompanyEmail) els.settingsCompanyEmail.value = state.settings.companyEmail || "";
      if (els.settingsCompanyPhone) els.settingsCompanyPhone.value = state.settings.companyPhone || "";
      if (els.settingsDefaultDocType) els.settingsDefaultDocType.value = state.settings.defaultDocType || "DR";
      if (els.settingsDefaultPaymentTerms) els.settingsDefaultPaymentTerms.value = String(state.settings.defaultPaymentTerms || "30");
      if (els.settingsDefaultStatus) els.settingsDefaultStatus.value = state.settings.defaultStatus || "NOTDUE";
      if (els.settingsDefaultModePayment) els.settingsDefaultModePayment.value = state.settings.defaultModePayment || "";
      if (els.settingsDefaultPreparedBy) els.settingsDefaultPreparedBy.value = state.settings.defaultPreparedBy || "";
      if (els.settingsDefaultApprovedBy) els.settingsDefaultApprovedBy.value = state.settings.defaultApprovedBy || "";
    }

    function collectSettingsDraft() {
      return {
        companyName: String(els.settingsCompanyName?.value || "").trim() || DEFAULT_SETTINGS.companyName,
        companyAddress: String(els.settingsCompanyAddress?.value || "").trim() || DEFAULT_SETTINGS.companyAddress,
        companyEmail: String(els.settingsCompanyEmail?.value || "").trim() || DEFAULT_SETTINGS.companyEmail,
        companyPhone: String(els.settingsCompanyPhone?.value || "").trim() || DEFAULT_SETTINGS.companyPhone,
        defaultDocType: String(els.settingsDefaultDocType?.value || DEFAULT_SETTINGS.defaultDocType),
        defaultPaymentTerms: String(els.settingsDefaultPaymentTerms?.value || DEFAULT_SETTINGS.defaultPaymentTerms),
        defaultStatus: String(els.settingsDefaultStatus?.value || DEFAULT_SETTINGS.defaultStatus),
        defaultModePayment: String(els.settingsDefaultModePayment?.value || "").trim() || DEFAULT_SETTINGS.defaultModePayment,
        defaultPreparedBy: String(els.settingsDefaultPreparedBy?.value || "").trim() || DEFAULT_SETTINGS.defaultPreparedBy,
        defaultApprovedBy: String(els.settingsDefaultApprovedBy?.value || "").trim() || DEFAULT_SETTINGS.defaultApprovedBy,
      };
    }

    async function saveSettings() {
      const before = { ...state.settings };
      const after = collectSettingsDraft();
      state.settings = after;
      applySettingsToSoaHeaderDefaults();
      saveSoaHeader();
      syncSettingsForm();
      if (els.soaEditAddress) els.soaEditAddress.value = state.soaHeader.address || "";
      if (els.soaEditEmail) els.soaEditEmail.value = state.soaHeader.email || "";
      if (els.soaEditMode) els.soaEditMode.value = state.soaHeader.modePayment || "";
      if (els.soaPreparedBy) els.soaPreparedBy.value = state.soaHeader.preparedBy || "";
      if (els.soaApprovedBy) els.soaApprovedBy.value = state.soaHeader.approvedBy || "";
      if (els.soaCustomerAddress) els.soaCustomerAddress.textContent = state.soaHeader.address || "";
      if (els.soaTerms) els.soaTerms.textContent = state.soaHeader.terms || "";
      if (els.soaModePayment) els.soaModePayment.textContent = state.soaHeader.modePayment || "";
      if (els.soaEmail) els.soaEmail.textContent = state.soaHeader.email || "";
      renderCompanySummaryLine();
      if (els.soaCustomerSelect?.value) generateSoa(els.soaCustomerSelect.value, false);
      try {
        await apiJson("/api/settings", {
          method: "POST",
          body: JSON.stringify(after),
        });
      } catch (err) {
        console.warn("Could not sync settings to backend", err);
      }
      try {
        localStorage.setItem(`${STORAGE_KEY}-settings`, JSON.stringify(after));
      } catch (err) {
        console.warn("Could not save settings to localStorage", err);
      }
      if (els.settingsStatusChip) {
        els.settingsStatusChip.textContent = "Settings saved";
        els.settingsStatusChip.classList.add("status-success");
        clearTimeout(saveSettings._timer);
        saveSettings._timer = setTimeout(() => {
          if (els.settingsStatusChip) {
            els.settingsStatusChip.textContent = "Settings saved locally";
            els.settingsStatusChip.classList.remove("status-success");
          }
        }, 2200);
      }
      pushAuditLog({
        action: "Settings Updated",
        entityType: "settings",
        actor: state.currentUser?.fullName || state.currentUser?.username || "System",
        detail: "Updated company information and default values.",
        before,
        after,
        fields: ["companyName", "companyAddress", "companyEmail", "companyPhone", "defaultDocType", "defaultPaymentTerms", "defaultStatus", "defaultModePayment", "defaultPreparedBy", "defaultApprovedBy"],
      });
      toast("Settings saved successfully", "success", `${state.settings.companyName || DEFAULT_SETTINGS.companyName} updated.`);
    }

    async function refreshAuthenticatedWorkspace() {
      await loadAuthUsers();
      await loadSettings();
      await loadAuditLog();
      await loadCustomerProfiles();
      await loadTransactions();
      state.transactions = state.transactions.map(computeTransaction);
      if (!state.customerProfiles.length) {
        seedCustomerProfilesFromTransactions();
        saveCustomerProfiles();
      }
      renderAccountList();
      renderCustomerList();
      renderSoaCustomerOptions();
      renderAuditLog();
      renderStats();
      renderAgingReport();
      if (els.soaCustomerSelect?.value) {
        generateSoa(els.soaCustomerSelect.value, false);
      }
    }

    function saveTheme() {
      localStorage.setItem(THEME_KEY, state.theme);
    }

    function applyTheme(theme) {
      state.theme = theme === "dark" ? "dark" : "light";
      document.body.dataset.theme = state.theme;
      document.documentElement.style.colorScheme = state.theme;
      saveTheme();
    }

    function loadTheme() {
      try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "dark" || saved === "light") {
          applyTheme(saved);
          return;
        }
      } catch (err) {
        console.warn("Could not load theme", err);
      }
      applyTheme("dark");
    }

    function updateAuthBadges() {
      if (els.metaUser) {
        els.metaUser.textContent = state.currentUser
          ? `${state.currentUser.fullName} • ${state.currentUser.role}`
          : "Not signed in";
      }
      if (els.metaRole) {
        els.metaRole.textContent = state.currentUser ? `Role: ${state.currentUser.role}` : "Role: -";
      }
      if (els.loginStatusChip) {
        els.loginStatusChip.textContent = "Office auth ready";
      }
    }

    function getRolePermissions() {
      return getEffectivePermissions(state.currentUser);
    }

    function setLoginApiStatus(text, kind = "") {
      if (!els.loginApiStatusChip) return;
      els.loginApiStatusChip.textContent = text;
      els.loginApiStatusChip.classList.remove("status-success", "status-danger");
      if (kind === "success") els.loginApiStatusChip.classList.add("status-success");
      if (kind === "danger") els.loginApiStatusChip.classList.add("status-danger");
    }

    async function updateLoginApiStatus() {
      if (!els.loginApiStatusChip) return;
      if (!APP_API_BASE && location.protocol === "file:") {
        setLoginApiStatus("Local mode (no API)", "success");
        return;
      }
      setLoginApiStatus("API: checking...");
      try {
        const endpoint = resolveApiEndpoint("/api/health");
        const response = await fetch(endpoint, { cache: "no-store" });
        let ok = response.ok;
        if (ok) {
          try {
            const data = await response.clone().json();
            ok = data?.ok !== false && data?.status !== "error" && data?.success !== false;
          } catch {
            ok = response.ok;
          }
        }
        if (ok) {
          setLoginApiStatus("API: connected", "success");
          return;
        }
        setLoginApiStatus("Local mode (API unavailable)", "success");
      } catch {
        setLoginApiStatus("Local mode (no API)", "success");
      }
    }

    function canAccessTab(tabId) {
      return getRolePermissions().tabs.includes(tabId);
    }

    function showPermissionDenied(actionLabel) {
      toast(`Access restricted: ${actionLabel}`, "warning", "Please sign in with a role that allows this action.");
    }

    function loadAdminResetRecentUsers() {
      try {
        const saved = localStorage.getItem(ADMIN_RESET_USERS_KEY);
        if (!saved) {
          state.recentAdminResetUsers = [];
          return;
        }
        const parsed = JSON.parse(saved);
        state.recentAdminResetUsers = Array.isArray(parsed) ? parsed.slice(0, 5).filter(Boolean) : [];
      } catch (err) {
        console.warn("Could not load admin reset users", err);
        state.recentAdminResetUsers = [];
      }
    }

    function saveAdminResetRecentUsers() {
      localStorage.setItem(ADMIN_RESET_USERS_KEY, JSON.stringify(state.recentAdminResetUsers.slice(0, 5)));
    }

    function renderAdminResetRecentUsers() {
      if (!els.adminResetRecentUsers) return;
      els.adminResetRecentUsers.innerHTML = "";
      state.recentAdminResetUsers.forEach((username) => {
        const option = document.createElement("option");
        option.value = username;
        els.adminResetRecentUsers.appendChild(option);
      });
    }

    function rememberAdminResetUser(username) {
      const trimmed = String(username || "").trim();
      if (!trimmed) return;
      state.recentAdminResetUsers = [trimmed, ...state.recentAdminResetUsers.filter((item) => normalize(item) !== normalize(trimmed))].slice(0, 5);
      saveAdminResetRecentUsers();
      renderAdminResetRecentUsers();
    }

    function ensureCurrentUserAuditAccess() {
      if (!state.currentUser || state.currentUser.role !== "Admin") return;
      const access = state.currentUser.access || state.currentUser.permissions || null;
      if (!access || typeof access !== "object") return;
      if (!Array.isArray(access.tabs)) access.tabs = makePermissionProfileFromRole("Admin").tabs.slice();
      if (!access.tabs.includes("auditSection")) access.tabs.push("auditSection");
      state.currentUser.access = access;
    }

    function applyRolePermissions() {
      const perms = getRolePermissions();
      if (els.moreMenuBtn) els.moreMenuBtn.hidden = !state.authenticated;
      if (els.adminMenuBtn) els.adminMenuBtn.hidden = state.authenticated ? !(perms.canResetOtherPasswords || perms.canAdminReset || perms.canResetSample) : true;
      if (els.restoreBackupBtn) els.restoreBackupBtn.hidden = !perms.canResetSample;
      if (els.openTxModalBtn2) els.openTxModalBtn2.hidden = !perms.canEncode;
      if (els.seedBtn) els.seedBtn.hidden = !perms.canResetSample;
      if (els.downloadBackupBtn) els.downloadBackupBtn.hidden = !perms.canExport;
      if (els.adminResetBtn) els.adminResetBtn.hidden = state.authenticated ? !perms.canResetOtherPasswords : false;
      if (els.changeAccountPasswordBtn) els.changeAccountPasswordBtn.hidden = state.authenticated ? !perms.canResetOtherPasswords : false;
      if (els.adminMenuItems) {
        els.adminMenuItems.forEach((item) => {
          const action = item.dataset.adminAction || "";
          const allowed = action === "changeOtherPassword"
            ? perms.canResetOtherPasswords
            : action === "adminReset"
              ? perms.canAdminReset
              : action === "accountSection" || action === "accountList"
                ? perms.canAdminReset
                : action === "forgotPassword"
                  ? false
                  : true;
          item.hidden = !allowed;
        });
      }
      if (els.summaryEditPanel) els.summaryEditPanel.style.display = "";
      setSummaryEditViewOnly(!perms.canEditSummary);
      if (els.soaDetailsPanel) els.soaDetailsPanel.hidden = !perms.canEncode;
      if (els.tabBtns) {
        els.tabBtns.forEach((btn) => {
          const tabId = btn.dataset.tab;
          if (!tabId) return;
          btn.hidden = !canAccessTab(tabId);
        });
      }
      if (sidebarNav) {
        sidebarNav.querySelectorAll(".sidebar-nav-item[data-tab]").forEach((btn) => {
          const tabId = btn.dataset.tab;
          if (!tabId) return;
          btn.hidden = !canAccessTab(tabId);
        });
      }
      if (!canAccessTab(state.activeTab)) {
        state.activeTab = "summarySection";
      }
      if (state.authenticated) setActiveTab(state.activeTab);
    }

    function readAuthSession() {
      const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
      const sources = [sessionStorage.getItem(AUTH_KEY), localStorage.getItem(AUTH_KEY)];
      for (const raw of sources) {
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.username && parsed.fullName && parsed.role) {
            if (parsed.loggedInAt) {
              const age = Date.now() - new Date(parsed.loggedInAt).getTime();
              if (age > SESSION_MAX_AGE_MS) {
                clearAuthSession();
                return null;
              }
            }
            return parsed;
          }
        } catch (err) {
          console.warn("Could not read auth session", err);
        }
      }
      return null;
    }

    function persistAuthSession(user, remember, token) {
      const payload = JSON.stringify({
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        profileImage: user.profileImage || "",
        loggedInAt: new Date().toISOString(),
        remember: !!remember,
      });
      if (remember) {
        localStorage.setItem(AUTH_KEY, payload);
        sessionStorage.removeItem(AUTH_KEY);
      } else {
        sessionStorage.setItem(AUTH_KEY, payload);
        localStorage.removeItem(AUTH_KEY);
      }
      if (token) {
        if (remember) {
          localStorage.setItem("wholesale_auth_token", token);
          sessionStorage.removeItem("wholesale_auth_token");
        } else {
          sessionStorage.setItem("wholesale_auth_token", token);
          localStorage.removeItem("wholesale_auth_token");
        }
      }
    }


    function clearAuthSession() {
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem("wholesale_auth_token");
      localStorage.removeItem("wholesale_auth_token");
    }

    function syncAuthUi() {
      document.body.classList.toggle("auth-locked", !state.authenticated);
      if (state.authenticated) document.body.setAttribute('data-theme', 'dark');
      if (els.logoutBtn) els.logoutBtn.hidden = !state.authenticated;
      if (els.loginRemember && !state.authenticated) els.loginRemember.checked = false;
      updateAuthBadges();
    }

    function openAdminResetModal() {
      if (!els.adminResetOverlay) return;
      if (state.authenticated && !getRolePermissions().canAdminReset) {
        showPermissionDenied("admin reset");
        return;
      }
      if (els.adminResetUser) els.adminResetUser.value = state.currentUser?.username || "";
      if (els.adminResetRole) els.adminResetRole.value = state.currentUser?.role || "Admin";
      if (els.adminResetTemp) els.adminResetTemp.value = "";
      if (els.adminResetNotes) els.adminResetNotes.value = "";
      renderAdminResetRecentUsers();
      els.adminResetOverlay.classList.add("open");
      els.adminResetOverlay.setAttribute("aria-hidden", "false");
      setTimeout(() => els.adminResetUser?.focus(), 30);
    }

    function closeAdminResetModal() {
      if (!els.adminResetOverlay) return;
      els.adminResetOverlay.classList.remove("open");
      els.adminResetOverlay.setAttribute("aria-hidden", "true");
    }

    function submitAdminReset() {
      if (!getRolePermissions().canAdminReset) {
        showPermissionDenied("admin reset");
        return;
      }
      const username = String(els.adminResetUser?.value || "").trim();
      const role = String(els.adminResetRole?.value || "").trim();
      const action = String(els.adminResetAction?.value || "").trim();
      const temp = String(els.adminResetTemp?.value || "").trim();
      const notes = String(els.adminResetNotes?.value || "").trim();
      if (!username) {
        toast("Username is required for admin reset", "warning");
        els.adminResetUser?.focus();
        return;
      }
      rememberAdminResetUser(username);
      closeAdminResetModal();
      toast("Reset request queued", "success", `${username} • ${role} • ${action}${temp ? ` • temp ${temp}` : ""}${notes ? ` • ${notes}` : ""}`);
    }

    function openAdminPasswordModal(userOrUsername) {
      if (!getRolePermissions().canResetOtherPasswords) {
        showPermissionDenied("change another account password");
        return;
      }
      const target = typeof userOrUsername === "string"
        ? getAuthUserByUsername(userOrUsername)
        : userOrUsername && typeof userOrUsername === "object"
          ? getAuthUserByUsername(userOrUsername.username) || normalizeAuthUser(userOrUsername)
          : null;
      if (!target) {
        toast("Select an account first.", "warning");
        return;
      }
      if (els.adminPasswordSelectedUser) els.adminPasswordSelectedUser.value = target.username || "";
      if (els.adminPasswordUsernameBadge) els.adminPasswordUsernameBadge.textContent = target.username || "-";
      if (els.adminPasswordRoleBadge) els.adminPasswordRoleBadge.textContent = target.role || "-";
      if (els.adminPasswordUsername) els.adminPasswordUsername.value = target.username || "";
      if (els.adminPasswordFullName) els.adminPasswordFullName.value = target.fullName || "";
      if (els.adminPasswordRole) els.adminPasswordRole.value = target.role || "";
      if (els.adminPasswordDepartment) els.adminPasswordDepartment.value = target.department || "";
      if (els.adminPasswordStatus) els.adminPasswordStatus.value = target.status || "";
      if (els.adminPasswordNew) els.adminPasswordNew.value = "";
      if (els.adminPasswordConfirm) els.adminPasswordConfirm.value = "";
      if (els.adminPasswordTemp) els.adminPasswordTemp.value = "";
      if (els.adminPasswordForceChange) els.adminPasswordForceChange.checked = true;
      if (els.adminPasswordMode) els.adminPasswordMode.value = "direct";
      if (els.adminPasswordOverlay) {
        els.adminPasswordOverlay.classList.add("open");
        els.adminPasswordOverlay.setAttribute("aria-hidden", "false");
      }
      setTimeout(() => els.adminPasswordNew?.focus(), 30);
    }

    function closeAdminPasswordModal() {
      if (!els.adminPasswordOverlay) return;
      els.adminPasswordOverlay.classList.remove("open");
      els.adminPasswordOverlay.setAttribute("aria-hidden", "true");
      if (els.adminPasswordForm) els.adminPasswordForm.reset();
      if (els.adminPasswordSelectedUser) els.adminPasswordSelectedUser.value = "";
    }

    function getAdminPasswordTarget() {
      const username = String(els.adminPasswordSelectedUser?.value || "").trim();
      if (!username) return null;
      return getAuthUserByUsername(username);
    }

    function validateAdminPasswordChange(target) {
      if (!target) return "Select an account first.";
      if (!getRolePermissions().canResetOtherPasswords) return "Access restricted: change another account password";
      const mode = String(els.adminPasswordMode?.value || "direct");
      const newPassword = String(els.adminPasswordNew?.value || "").trim();
      const confirmPassword = String(els.adminPasswordConfirm?.value || "").trim();
      const tempPassword = String(els.adminPasswordTemp?.value || "").trim();
      if (mode === "temporary") {
        if (!tempPassword) return "Temporary password is required.";
      } else {
        if (!newPassword) return "New password is required.";
        if (newPassword !== confirmPassword) return "Passwords do not match.";
      }
      return "";
    }

    function buildAdminPasswordPayload(target) {
      const mode = String(els.adminPasswordMode?.value || "direct");
      const newPassword = String(els.adminPasswordNew?.value || "").trim();
      const tempPassword = String(els.adminPasswordTemp?.value || "").trim();
      const password = mode === "temporary" ? (tempPassword || newPassword) : newPassword;
      return {
        password,
        forcePasswordChange: !!els.adminPasswordForceChange?.checked,
        updatedAt: new Date().toISOString(),
        updatedBy: state.currentUser?.fullName || state.currentUser?.username || "System",
        access: target.access || makePermissionProfileFromRole(target.role),
      };
    }

    async function saveAdminPasswordChange() {
      const target = getAdminPasswordTarget();
      const error = validateAdminPasswordChange(target);
      if (error) {
        toast(error, "warning");
        return;
      }
      const index = state.authUsers.findIndex((user) => normalize(user.username) === normalize(target.username));
      if (index < 0) {
        toast("Account not found.", "error");
        return;
      }
      const payload = buildAdminPasswordPayload(target);
      try {
        await apiJson(`/api/accounts/${state.authUsers[index].id}`, {
          method: "PUT",
          body: JSON.stringify(buildAccountPayload(state.authUsers[index], {
            password: payload.password,
            forcePasswordChange: payload.forcePasswordChange,
            notes: payload.notes || state.authUsers[index].notes || "",
            updatedBy: payload.updatedBy,
          })),
        });
        await loadAuthUsers();
      } catch (err) {
        console.warn("Could not sync account password change to backend", err);
        state.authUsers[index] = {
          ...state.authUsers[index],
          password: payload.password,
          forcePasswordChange: payload.forcePasswordChange,
          notes: payload.notes || state.authUsers[index].notes || "",
          updatedAt: payload.updatedAt,
          updatedBy: payload.updatedBy,
        };
        saveAuthUsers();
      }
      hydrateCurrentUserFromDirectory();
      renderAccountList();
      renderSelectedAccountDetails();
      if (state.currentUser && normalize(state.currentUser.username) === normalize(target.username)) {
        state.currentUser = state.authUsers[index];
        persistAuthSession(state.currentUser, !!readAuthSession()?.remember);
        updateAuthBadges();
        applyRolePermissions();
      }
      pushAuditLog({
        action: "Account Password Changed",
        invNo: "",
        customer: target.fullName,
        actor: state.currentUser?.fullName || state.currentUser?.username || "System",
        detail: `Changed password for ${target.username} (${target.role})`,
      });
      toast("Password updated successfully", "success", `${target.fullName} - ${target.username}`);
      closeAdminPasswordModal();
    }


    function getCurrentUserRoleLabel(user = state.currentUser || {}) {
      const role = String(user.role || "Viewer");
      return role === "Admin" ? "Administrator" : role.charAt(0).toUpperCase() + role.slice(1);
    }

    function getCurrentUserDisplayName() {
      const user = state.currentUser || {};
      return user.fullName || user.username || "Local user";
    }

    function getCurrentUserInitials() {
      const user = state.currentUser || {};
      const source = user.fullName || user.username || "User";
      const words = String(source).trim().split(/\s+/).filter(Boolean);
      if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
      return String(user.username || source || "U").slice(0, 2).toUpperCase();
    }

    function getCurrentUserAuditSearchText() {
      const user = state.currentUser || {};
      return user.fullName || user.username || "";
    }

    function updateProfileMenu() {
      const user = state.currentUser || {};
      const initials = getCurrentUserInitials();
      if (els.profileMenuAvatar) {
        if (user.profileImage) {
          els.profileMenuAvatar.innerHTML = `<img src="${escapeHtml(user.profileImage)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
        } else {
          els.profileMenuAvatar.textContent = initials;
        }
      }
      if (els.profileMenuName) els.profileMenuName.textContent = user.fullName || user.username || "User";
      if (els.profileMenuMeta) els.profileMenuMeta.textContent = `${getCurrentUserRoleLabel(user)} · ${user.department || "Accounting"}`;
      if (els.profileMenuFoot) {
        const loginText = user.lastLogin ? `Last login: ${formatDateTime(user.lastLogin)}` : "Account actions are recorded in Audit Trail.";
        els.profileMenuFoot.textContent = loginText;
      }
    }

    function toggleProfileMenu() {
      if (!els.topbarProfileMenu || !topbarUserBtn) return;
      const willOpen = !els.topbarProfileMenu.classList.contains("open");
      closeHeaderMenus();
      if (!willOpen) return;
      updateProfileMenu();
      els.topbarProfileMenu.classList.add("open");
      els.topbarProfileMenu.setAttribute("aria-hidden", "false");
      topbarUserBtn.setAttribute("aria-expanded", "true");
    }

    function renderProfileModal() {
      const user = state.currentUser || {};
      if (els.profileFullName) els.profileFullName.textContent = user.fullName || "-";
      if (els.profileUsername) els.profileUsername.textContent = user.username || "-";
      if (els.profileRole) els.profileRole.textContent = getCurrentUserRoleLabel(user);
      if (els.profileDepartment) els.profileDepartment.textContent = user.department || "Accounting";
      if (els.profileEmail) els.profileEmail.textContent = user.email || "-";
      if (els.profileLastLogin) els.profileLastLogin.textContent = user.lastLogin ? formatDateTime(user.lastLogin) : "Current session";
      if (els.profileCurrentPassword) els.profileCurrentPassword.value = "";
      if (els.profileNewPassword) els.profileNewPassword.value = "";
      if (els.profileConfirmPassword) els.profileConfirmPassword.value = "";
    }

    function openProfileModal(focusPassword = false) {
      if (!state.authenticated || !state.currentUser) {
        toast("Please sign in first.", "warning");
        return;
      }
      closeHeaderMenus();
      renderProfileModal();
      if (els.profileOverlay) {
        els.profileOverlay.classList.add("open");
        els.profileOverlay.setAttribute("aria-hidden", "false");
      }
      setTimeout(() => {
        if (focusPassword) els.profileCurrentPassword?.focus();
        else els.profileCloseBtn?.focus();
      }, 30);
    }

    function closeProfileModal() {
      if (!els.profileOverlay) return;
      els.profileOverlay.classList.remove("open");
      els.profileOverlay.setAttribute("aria-hidden", "true");
      if (els.profilePasswordForm) els.profilePasswordForm.reset();
    }

    function showMyActivity() {
      if (!state.authenticated || !state.currentUser) return;
      closeHeaderMenus();
      closeProfileModal();
      setActiveTab("auditSection");
      if (els.auditLogFilter) els.auditLogFilter.value = "all";
      if (els.auditLogSearch) els.auditLogSearch.value = getCurrentUserAuditSearchText();
      if (els.auditLogFrom) els.auditLogFrom.value = "";
      if (els.auditLogTo) els.auditLogTo.value = "";
      renderAuditLog();
      pushAuditLog({
        action: "Viewed My Activity",
        actor: getCurrentUserDisplayName(),
        detail: `${getCurrentUserDisplayName()} viewed personal audit activity.`,
        entityType: "user",
        entityId: state.currentUser.username || "",
      });
    }

    async function saveOwnPasswordChange() {
      if (!state.currentUser?.username) {
        toast("No active user found.", "error");
        return;
      }
      const currentPassword = String(els.profileCurrentPassword?.value || "");
      const newPassword = String(els.profileNewPassword?.value || "");
      const confirmPassword = String(els.profileConfirmPassword?.value || "");
      const target = getAuthUserByUsername(state.currentUser.username);
      if (!target) {
        toast("Current account was not found in local account list.", "error");
        return;
      }
      if (!currentPassword) {
        toast("Current password is required.", "warning");
        els.profileCurrentPassword?.focus();
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        toast("New password must be at least 8 characters.", "warning");
        els.profileNewPassword?.focus();
        return;
      }
      if (newPassword !== confirmPassword) {
        toast("New password confirmation does not match.", "warning");
        els.profileConfirmPassword?.focus();
        return;
      }
      if (newPassword === currentPassword) {
        toast("New password must be different from the current password.", "warning");
        els.profileNewPassword?.focus();
        return;
      }
      const index = state.authUsers.findIndex((user) => normalize(user.username) === normalize(target.username));
      if (index < 0) {
        toast("Account index not found.", "error");
        return;
      }
      const saveBtn = document.querySelector("#profilePasswordForm button[type='submit'], #profilePasswordSaveBtn");
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; }
      try {
        await apiJson("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ username: state.currentUser.username, currentPassword, newPassword }),
        });
      } catch (apiErr) {
        console.warn("Could not sync password change to backend", apiErr);
      }
      const updated = {
        ...state.authUsers[index],
        password: newPassword,
        forcePasswordChange: false,
        updatedAt: new Date().toISOString(),
        updatedBy: getCurrentUserDisplayName(),
      };
      state.authUsers[index] = updated;
      saveAuthUsers();
      state.currentUser = { ...updated };
      persistAuthSession(state.currentUser, !!readAuthSession()?.remember);
      updateUserChip();
      updateProfileMenu();
      renderAccountList();
      renderSelectedAccountDetails();
      pushAuditLog({
        action: "Changed Own Password",
        actor: getCurrentUserDisplayName(),
        detail: `${getCurrentUserDisplayName()} changed their own password.`,
        entityType: "user",
        entityId: updated.username || "",
        customer: updated.fullName || "",
      });
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Password"; }
      toast("Password updated successfully", "success", "Use the new password on your next login.");
      closeProfileModal();
    }

    function signOutCurrentUser(reason = "logout") {
      const userLabel = getCurrentUserDisplayName();
      const username = state.currentUser?.username || "";
      pushAuditLog({
        action: reason === "lock" ? "Locked Screen" : "Signed Out",
        actor: userLabel,
        detail: reason === "lock" ? `${userLabel} locked the office session.` : `${userLabel} signed out of the office system.`,
        entityType: "user",
        entityId: username,
      });
      closeAppSession();
      if (els.loginUsername && username) els.loginUsername.value = username;
      if (reason === "lock") toast("Screen locked", "info", "Enter your password to continue.");
      else toast("Signed out successfully", "info");
    }

    function handleProfileAction(action) {
      switch (action) {
        case "profile":
          openProfileModal(false);
          break;
        case "activity":
          showMyActivity();
          break;
        case "password":
          openProfileModal(true);
          break;
        case "lock":
          if (!confirm("Lock this office session?")) return;
          signOutCurrentUser("lock");
          break;
        case "logout":
          if (!confirm("Sign out of the office system?")) return;
          signOutCurrentUser("logout");
          break;
        default:
          closeHeaderMenus();
      }
    }

    function openAppSession(user, remember = false, token = null) {
      state.authenticated = true;
      const loginAt = new Date().toISOString();
      state.currentUser = { ...user, lastLogin: loginAt };
      const index = (state.authUsers || []).findIndex((account) => normalize(account.username) === normalize(state.currentUser.username));
      if (index >= 0) {
        state.authUsers[index] = { ...state.authUsers[index], lastLogin: loginAt };
        saveAuthUsers();
      }
      persistAuthSession(state.currentUser, remember, token);
      syncAuthUi();
      updateAuthBadges();
      updateUserChip();
      updateProfileMenu();
      applyRolePermissions();
      pushAuditLog({
        action: "Signed In",
        actor: getCurrentUserDisplayName(),
        detail: `${getCurrentUserDisplayName()} signed in.`,
        entityType: "user",
        entityId: state.currentUser.username || "",
      });
    }

    function closeAppSession() {
      state.authenticated = false;
      state.currentUser = null;
      clearAuthSession();
      closeHeaderMenus();
      closeProfileModal();
      if (els.loginForm) els.loginForm.reset();
      if (els.loginUsername) els.loginUsername.focus();
      syncAuthUi();
      updateAuthBadges();
      applyRolePermissions();
    }

    async function handleLoginSubmit(e) {
      e.preventDefault();
      const username = String(els.loginUsername?.value || "").trim().toLowerCase();
      const password = String(els.loginPassword?.value || "");
      const remember = !!els.loginRemember?.checked;
      let user = null;
      let token = null;
      const loginBtn = els.loginSubmitBtn;
      if (loginBtn) { loginBtn.disabled = true; loginBtn.classList.add("is-loading"); }

      // Try API login first
      try {
        const result = await apiJson("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        token = result.token || null;
        user = normalizeAuthUser(result.account || result.user || result);
      } catch (backendErr) {
        // API not available, try local auth
        const allUsers = [...(state.authUsers || []), ...getDefaultAuthUsers()];
        const seen = new Set();
        const deduped = allUsers.filter((u) => {
          const key = normalize(u.username);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const localUser = deduped.find((u) => normalize(u.username) === normalize(username));
        if (localUser && localUser.password === password) {
          user = localUser;
        }
      }

      if (!user) {
        if (loginBtn) { loginBtn.disabled = false; loginBtn.classList.remove("is-loading"); }
        toast("Invalid username or password", "error", "Use the office credentials assigned to your account.");
        if (els.loginPassword) {
          els.loginPassword.select?.();
          els.loginPassword.focus();
        }
        return;
      }
      openAppSession(user, remember, token);
      await refreshAuthenticatedWorkspace();
      setActiveTab("summarySection");
      if (els.loginPassword) els.loginPassword.value = "";
      if (els.loginRemember) els.loginRemember.checked = remember;
      if (loginBtn) { loginBtn.disabled = false; loginBtn.classList.remove("is-loading"); }
      toast(`Welcome, ${user.fullName}`, "success", `Signed in as ${user.role}.`);
      renderSalesTable();
      renderStats();
      renderAgingReport();
      renderAuditLog();
    }

    async function loadAuditLog() {
      try {
        const rows = await apiJson("/api/audit?limit=200");
        if (Array.isArray(rows) && rows.length > 0) {
          state.auditLog = rows.slice(0, 50).map(normalizeAuditLogEntry);
          localStorage.setItem(`${STORAGE_KEY}-audit-log`, JSON.stringify(state.auditLog));
          return;
        }
      } catch (err) {
        console.warn("Could not load audit log from backend, using local data", err);
      }
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY}-audit-log`);
        if (raw) {
          state.auditLog = JSON.parse(raw);
        } else {
          state.auditLog = [];
        }
      } catch {
        state.auditLog = [];
      }
      renderRecentActivity();
    }

    function deriveCustomerProfile(tx) {
      if (!tx?.customer) return null;
      return {
        name: tx.customer || "",
        address: tx.customerAddress || "",
        tin: tx.customerTin || tx.tin || "",
        contactPerson: tx.representative || "",
        contactNumber: "",
        email: "",
        paymentTerms: String(tx.paymentTerms || tx.terms || 30),
        modeOfPayment: "",
        bankDetails: tx.bankDetails || tx.bank || "",
        remarks: tx.otherRemarks || tx.notes || "",
        updatedAt: tx.updatedAt || tx.createdAt || "",
      };
    }

    async function loadCustomerProfiles() {
      try {
        const rows = await apiJson("/api/customers");
        if (Array.isArray(rows) && rows.length > 0) {
          state.customerProfiles = rows
            .filter((item) => item && typeof item === "object" && item.name)
            .map((item) => ({
              name: String(item.name || ""),
              address: String(item.address || ""),
              tin: String(item.tin || ""),
              contactPerson: String(item.contactPerson || ""),
              contactNumber: String(item.contactNumber || ""),
              email: String(item.email || ""),
              paymentTerms: String(item.paymentTerms || "30"),
              modeOfPayment: String(item.modeOfPayment || ""),
              bankDetails: String(item.bankDetails || ""),
              remarks: String(item.remarks || ""),
              updatedAt: String(item.updatedAt || ""),
            }));
          localStorage.setItem(`${STORAGE_KEY}-customer-profiles`, JSON.stringify(state.customerProfiles));
          return;
        }
      } catch (err) {
        console.warn("Could not load customer profiles from backend, using local data", err);
      }
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY}-customer-profiles`);
        if (raw) {
          state.customerProfiles = JSON.parse(raw);
        } else {
          state.customerProfiles = [];
        }
      } catch {
        state.customerProfiles = [];
      }
    }

    function seedCustomerProfilesFromTransactions(targetProfiles = null, transactions = null) {
      const sourceTransactions = Array.isArray(transactions) ? transactions : state.transactions;
      const profiles = new Map();
      sourceTransactions.forEach((tx) => {
        if (!tx?.customer) return;
        const key = normalize(tx.customer);
        if (!profiles.has(key)) profiles.set(key, deriveCustomerProfile(tx));
        else {
          const current = profiles.get(key);
          if ((!current.address || !current.tin || !current.contactPerson) && (tx.customerAddress || tx.customerTin || tx.representative)) {
            profiles.set(key, {
              ...current,
              address: current.address || tx.customerAddress || "",
              tin: current.tin || tx.customerTin || "",
              contactPerson: current.contactPerson || tx.representative || "",
              bankDetails: current.bankDetails || tx.bankDetails || "",
              remarks: current.remarks || tx.otherRemarks || "",
            });
          }
        }
      });
      const nextProfiles = [...profiles.values()].filter(Boolean);
      if (Array.isArray(targetProfiles)) {
        targetProfiles.splice(0, targetProfiles.length, ...nextProfiles);
        return targetProfiles;
      }
      state.customerProfiles = nextProfiles;
      return state.customerProfiles;
    }

    function upsertCustomerProfile(profile) {
      const normalizedName = normalize(profile?.name);
      if (!normalizedName) return false;
      const idx = state.customerProfiles.findIndex((item) => normalize(item.name) === normalizedName);
      const next = {
        name: profile.name || "",
        address: profile.address || "",
        tin: profile.tin || "",
        contactPerson: profile.contactPerson || "",
        contactNumber: profile.contactNumber || "",
        email: profile.email || "",
        paymentTerms: String(profile.paymentTerms || "30"),
        modeOfPayment: profile.modeOfPayment || "",
        bankDetails: profile.bankDetails || "",
        remarks: profile.remarks || "",
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) state.customerProfiles[idx] = next;
      else state.customerProfiles.unshift(next);
      saveCustomerProfiles();
      renderCustomerList();
      return true;
    }

    function syncCustomerProfileFromTransaction(tx) {
      if (!tx?.customer) return false;
      return upsertCustomerProfile({
        name: tx.customer,
        address: tx.customerAddress || "",
        tin: tx.customerTin || "",
        contactPerson: tx.representative || "",
        contactNumber: "",
        email: "",
        paymentTerms: Number(tx.paymentTerms || 30),
        modeOfPayment: "",
        bankDetails: tx.bankDetails || "",
        remarks: tx.otherRemarks || "",
      });
    }

    function loadSoaHeader() {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY}-soa-header`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            state.soaHeader = { ...state.soaHeader, ...parsed };
          }
        }
      } catch (err) {
        console.warn("Could not load SOA header", err);
      }
      applySettingsToSoaHeaderDefaults();
    }

    function computeTransaction(tx) {
      const items = Array.isArray(tx.items) && tx.items.length
        ? tx.items.map((item) => ({
            desc: String(item.desc || ""),
            qty: Number(item.qty || 0),
            price: Number(item.price || 0),
            total: roundMoney(Number(item.total ?? ((Number(item.qty || 0) * Number(item.price || 0)) || 0))),
          }))
        : [];
      const itemsGross = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const gross = items.length ? itemsGross : Number(tx.gross) || 0;
      const freight = Number(tx.freight) || 0;
      const returnsDisc = Number(tx.returnsDisc) || 0;
      const ewt = Number(tx.ewt) || 0;
      const paymentInput = Number(tx.payment) || 0;
      const netDeduction = roundMoney(gross + freight - returnsDisc);
      const netSales = roundMoney(netDeduction - ewt);
      const payment = tx.status === "PAID" && paymentInput < netSales ? netSales : paymentInput;
      const receivable = roundMoney(Math.max(netSales - payment, 0));
      const today = new Date();
      const due = parseDate(tx.dueDate);
      const daysPastDue = Math.floor((today - due) / 86400000);
      const isCancelled = Boolean(tx.isCancelled);
      let status = tx.status || "NOTDUE";
      if (isCancelled) {
        status = "CANCELLED";
      } else if (tx.status === "PARTIAL_PAYMENT" && payment > 0 && payment < netSales) {
        status = "PARTIAL_PAYMENT";
      } else if (payment >= netSales && netSales > 0) {
        status = "PAID";
      } else if (daysPastDue > 0) {
        status = "PASTDUE";
      } else {
        status = "NOTDUE";
      }
      return {
        ...tx,
        docType: tx.docType || "DR",
        m1m2: tx.m1m2 || "M1",
        poNumber: tx.poNumber || "",
        customerAddress: tx.customerAddress || "",
        customerTin: tx.customerTin || "",
        paymentTerms: Number(tx.paymentTerms || 30),
        collectionReceiptNo: tx.collectionReceiptNo || "",
        bankDetails: tx.bankDetails || "",
        checkNumber: tx.checkNumber || "",
        checkBank: tx.checkBank || "",
        checkAmount: Number(tx.checkAmount || 0),
        checkDate: tx.checkDate || "",
        paymentStatus: tx.paymentStatus || "Issued",
        otherRemarks: tx.otherRemarks || "",
        representative: tx.representative || "",
        cancellationReason: tx.cancellationReason || "",
        isCancelled,
        items,
        gross,
        freight,
        returnsDisc,
        ewt,
        payment,
        netDeduction,
        netSales,
        receivable,
        status,
        paymentDate: tx.paymentDate || "",
      };
    }

    function recomputeAll() {
      state.transactions = state.transactions.map(computeTransaction);
      state.filtered = getFilteredTransactions();
      renderCustomerList();
      renderSoaCustomerOptions();
      renderSalesTable();
      renderStats();
      renderAgingReport();
      renderAuditLog();
      if (state.selectedCustomer) generateSoa(state.selectedCustomer, false);
      saveTransactions();
    }

    function getCustomers() {
      const names = new Set();
      state.customerProfiles.forEach((profile) => { const n = (profile.name || "").trim(); if (n) names.add(n); });
      state.transactions.forEach((tx) => { const n = (tx.customer || "").trim(); if (n) names.add(n); });
      return [...names].sort((a, b) => a.localeCompare(b));
    }

    function renderCustomerList() {
      const customers = getCustomers();
      els.customerList.innerHTML = customers.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
    }

    function setSummaryEditBadges(tx) {
      if (els.summaryEditInvoiceBadge) {
        els.summaryEditInvoiceBadge.textContent = tx?.invNo ? `Invoice # ${tx.invNo}` : "No invoice selected";
      }
      if (els.summaryEditStatusBadge) {
        const status = tx?.isCancelled ? "CANCELLED" : (tx?.status || "NEUTRAL");
        const statusLabelMap = { PAID: "Paid", PARTIAL_PAYMENT: "Partial Payment", PASTDUE: "Past Due", NOTDUE: "Not Due", CANCELLED: "Cancelled", NEUTRAL: "Neutral" };
        els.summaryEditStatusBadge.textContent = statusLabelMap[status] || status;
        els.summaryEditStatusBadge.className = `chip status-cap ${status === "CANCELLED" ? "status-cancelled" : status === "PAID" ? "status-paid" : status === "PARTIAL_PAYMENT" ? "status-partial" : status === "PASTDUE" ? "status-pastdue" : status === "NOTDUE" ? "status-notdue" : ""}`;
      }
    }

    function setSummaryEditViewOnly(viewOnly) {
      const form = els.summaryEditForm;
      const title = els.summaryEditPanel?.querySelector("h3");
      const desc = els.summaryEditPanel?.querySelector(".edit-panel-head p");
      if (els.summaryEditPanel) els.summaryEditPanel.classList.toggle("view-only", !!viewOnly);
      if (title) title.textContent = viewOnly ? "View Transaction Details" : "Edit Transaction";
      if (desc) {
        desc.textContent = viewOnly
          ? "Review the transaction details here. Editing is restricted for this account."
          : "Click a row to load it here. Save changes to update the same invoice.";
      }
      if (form) {
        form.querySelectorAll("input, select, textarea, button").forEach((field) => {
          if (field === els.summaryEditSaveBtn || field === els.summaryEditClearBtn || field === els.summaryEditCancelBtn) return;
          if (field.type === "hidden") return;
          if (field.tagName === "SELECT") {
            field.disabled = false;
            field.style.pointerEvents = viewOnly ? "none" : "";
          } else if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
            field.disabled = false;
            field.readOnly = !!viewOnly;
          } else {
            field.disabled = !!viewOnly;
          }
        });
      }
      if (els.summaryEditSaveBtn) els.summaryEditSaveBtn.hidden = !!viewOnly;
      if (els.summaryEditClearBtn) els.summaryEditClearBtn.hidden = !!viewOnly;
      if (els.summaryEditCancelBtn) els.summaryEditCancelBtn.hidden = !!viewOnly || !getRolePermissions().canCancel;
    }

    function clearSummaryEditForm() {
      state.summaryEditIndex = "";
      state.summaryEditModalOpen = false;
      if (els.summaryEditIndex) els.summaryEditIndex.value = "";
      if (els.summaryEditForm) els.summaryEditForm.reset();
      setSummaryEditBadges(null);
      document.querySelectorAll("#salesTable tbody tr").forEach((tr) => tr.classList.remove("row-selected"));
    }

    function openSummaryEditModal(tx, editIndex = "", focusTarget = true) {
      if (!tx) {
        clearSummaryEditForm();
        closeSummaryEditModal(true);
        return;
      }
      loadSummaryEditForm(tx, editIndex);
      setSummaryEditViewOnly(!getRolePermissions().canEditSummary);
      state.summaryEditModalOpen = true;
      if (els.summaryEditPanel) {
        els.summaryEditPanel.classList.add("open");
        els.summaryEditPanel.setAttribute("aria-hidden", "false");
      }
      if (focusTarget) {
        setTimeout(() => {
          if (els.summaryEditCustomer) {
            els.summaryEditCustomer.focus({ preventScroll: true });
          } else if (els.summaryEditDate) {
            els.summaryEditDate.focus({ preventScroll: true });
          }
        }, 0);
      }
    }

    function closeSummaryEditModal(force = false) {
      if (!force && !state.summaryEditModalOpen) return;
      state.summaryEditModalOpen = false;
      if (els.summaryEditPanel) {
        els.summaryEditPanel.classList.remove("open");
        els.summaryEditPanel.classList.remove("view-only");
        els.summaryEditPanel.setAttribute("aria-hidden", "true");
      }
      setSummaryEditViewOnly(false);
    }

    function loadSummaryEditForm(tx, editIndex = "") {
      if (!tx) {
        clearSummaryEditForm();
        return;
      }
      state.summaryEditIndex = editIndex === "" ? "" : String(editIndex);
      if (els.summaryEditIndex) els.summaryEditIndex.value = state.summaryEditIndex;
      if (els.summaryEditDate) els.summaryEditDate.value = tx.date || todayISO();
      if (els.summaryEditDocType) els.summaryEditDocType.value = tx.docType || "DR";
      if (els.summaryEditM1M2) els.summaryEditM1M2.value = tx.m1m2 || "M1";
      if (els.summaryEditInvNo) els.summaryEditInvNo.value = tx.invNo || "";
      if (els.summaryEditPoNumber) els.summaryEditPoNumber.value = tx.poNumber || "";
      if (els.summaryEditCustomer) els.summaryEditCustomer.value = tx.customer || "";
      if (els.summaryEditCustomerAddress) els.summaryEditCustomerAddress.value = tx.customerAddress || "";
      if (els.summaryEditCustomerTin) els.summaryEditCustomerTin.value = tx.customerTin || "";
      if (els.summaryEditRep) els.summaryEditRep.value = tx.representative || "";
      if (els.summaryEditGross) els.summaryEditGross.value = tx.gross ?? 0;
      if (els.summaryEditFreight) els.summaryEditFreight.value = tx.freight ?? 0;
      if (els.summaryEditReturns) els.summaryEditReturns.value = tx.returnsDisc ?? 0;
      if (els.summaryEditEwt) els.summaryEditEwt.value = tx.ewt ?? 0;
      if (els.summaryEditPayment) els.summaryEditPayment.value = tx.payment ?? 0;
      if (els.summaryEditPaymentTerms) els.summaryEditPaymentTerms.value = String(tx.paymentTerms || 30);
      if (els.summaryEditDueDate) els.summaryEditDueDate.value = tx.dueDate || addDaysISO(tx.date || todayISO(), Number(tx.paymentTerms || 30));
      if (els.summaryEditStatus) els.summaryEditStatus.value = tx.isCancelled ? "CANCELLED" : (tx.status || "NOTDUE");
      if (els.summaryEditPaymentStatus) els.summaryEditPaymentStatus.value = tx.paymentStatus || "Issued";
      if (els.summaryEditCheckNumber) els.summaryEditCheckNumber.value = tx.checkNumber || "";
      if (els.summaryEditCheckBank) els.summaryEditCheckBank.value = tx.checkBank || "";
      if (els.summaryEditCheckAmount) els.summaryEditCheckAmount.value = tx.checkAmount ?? 0;
      if (els.summaryEditCheckDate) els.summaryEditCheckDate.value = tx.checkDate || "";
      if (els.summaryEditCollectionReceiptNo) els.summaryEditCollectionReceiptNo.value = tx.collectionReceiptNo || "";
      if (els.summaryEditBankDetails) els.summaryEditBankDetails.value = tx.bankDetails || "";
      if (els.summaryEditOtherRemarks) els.summaryEditOtherRemarks.value = tx.otherRemarks || "";
      setSummaryEditBadges(tx);
      syncSummaryEditPaymentHelper();
      document.querySelectorAll("#salesTable tbody tr").forEach((tr) => {
        tr.classList.toggle("row-selected", tr.dataset.invNo === tx.invNo);
      });
    }

    function syncSummaryEditPaymentHelper() {
      if (!els.summaryEditPaymentHelper) return;
      const gross = Number(els.summaryEditGross?.value || 0);
      const freight = Number(els.summaryEditFreight?.value || 0);
      const returnsDisc = Number(els.summaryEditReturns?.value || 0);
      const ewt = Number(els.summaryEditEwt?.value || 0);
      const payment = Number(els.summaryEditPayment?.value || 0);
      const status = els.summaryEditStatus?.value || "NOTDUE";
      const netSales = Math.max(gross + freight - returnsDisc - ewt, 0);
      if (status === "PAID" && netSales > 0) {
        const filled = payment <= 0 ? netSales : payment;
        els.summaryEditPaymentHelper.textContent = `Fully paid \u2014 ${formatCurrency(filled)}`;
        els.summaryEditPaymentHelper.className = "summary-edit-payment-helper is-paid";
      } else if (status === "PARTIAL_PAYMENT" && payment > 0 && netSales > 0) {
        const receivable = Math.max(netSales - payment, 0);
        els.summaryEditPaymentHelper.textContent = `${formatCurrency(payment)} paid out of ${formatCurrency(netSales)} \u2014 Balance: ${formatCurrency(receivable)}`;
        els.summaryEditPaymentHelper.className = "summary-edit-payment-helper is-partial";
      } else {
        els.summaryEditPaymentHelper.textContent = "";
        els.summaryEditPaymentHelper.className = "summary-edit-payment-helper";
      }
    }

    function updateSummaryEditDueDate() {
      const terms = Number(els.summaryEditPaymentTerms?.value || 30);
      const base = els.summaryEditDate?.value || todayISO();
      if (els.summaryEditDueDate && (!els.summaryEditDueDate.value || els.summaryEditDueDate.dataset.auto !== "false")) {
        els.summaryEditDueDate.value = addDaysISO(base, terms);
      }
    }

    function syncSummaryCustomerFieldsFromName() {
      const snapshot = getCustomerSnapshot(els.summaryEditCustomer?.value || "");
      if (snapshot.address && els.summaryEditCustomerAddress && !els.summaryEditCustomerAddress.value.trim()) {
        els.summaryEditCustomerAddress.value = snapshot.address;
      }
      if (snapshot.tin && els.summaryEditCustomerTin && !els.summaryEditCustomerTin.value.trim()) {
        els.summaryEditCustomerTin.value = snapshot.tin;
      }
    }

    function buildSummaryEditDraft(editIndex) {
      const current = editIndex >= 0 ? state.transactions[editIndex] : null;
      const gross = Number(els.summaryEditGross?.value || 0);
      const freight = Number(els.summaryEditFreight?.value || 0);
      const returnsDisc = Number(els.summaryEditReturns?.value || 0);
      const ewt = Number(els.summaryEditEwt?.value || 0);
      const payment = Number(els.summaryEditPayment?.value || 0);
      const status = els.summaryEditStatus?.value || "NOTDUE";
      const dueDate = els.summaryEditDueDate?.value || "";
      const date = els.summaryEditDate?.value || "";
      const items = Array.isArray(current?.items) && current.items.length
        ? current.items
        : [{ desc: "Legacy amount", qty: 1, price: gross, total: gross }];
      const draft = {
        ...current,
        docType: els.summaryEditDocType?.value || "DR",
        m1m2: els.summaryEditM1M2?.value || "M1",
        date,
        poNumber: els.summaryEditPoNumber?.value.trim(),
        invNo: els.summaryEditInvNo?.value.trim(),
        customer: els.summaryEditCustomer?.value.trim(),
        customerAddress: els.summaryEditCustomerAddress?.value.trim(),
        customerTin: els.summaryEditCustomerTin?.value.trim(),
        representative: els.summaryEditRep?.value.trim(),
        items,
        gross,
        freight,
        returnsDisc,
        ewt,
        payment,
        paymentTerms: Number(els.summaryEditPaymentTerms?.value || 30),
        dueDate,
        paymentDate: els.summaryEditCheckDate?.value || date,
        paymentStatus: els.summaryEditPaymentStatus?.value || "Issued",
        checkNumber: els.summaryEditCheckNumber?.value.trim(),
        checkBank: els.summaryEditCheckBank?.value.trim(),
        checkAmount: Number(els.summaryEditCheckAmount?.value || 0),
        checkDate: els.summaryEditCheckDate?.value || "",
        collectionReceiptNo: els.summaryEditCollectionReceiptNo?.value.trim(),
        bankDetails: els.summaryEditBankDetails?.value.trim(),
        otherRemarks: els.summaryEditOtherRemarks?.value.trim(),
        status,
        isCancelled: status === "CANCELLED" ? true : Boolean(current?.isCancelled),
      };
      return draft;
    }

    function saveSummaryEditTransaction() {
      const editIndex = state.summaryEditIndex === "" ? -1 : Number(state.summaryEditIndex);
      if (editIndex < 0 || !state.transactions[editIndex]) {
        toast("Select a transaction first.", "warning");
        return;
      }
      const previous = state.transactions[editIndex];
      const draft = buildSummaryEditDraft(editIndex);
      const validationMessage = validateTransaction(draft, editIndex);
      if (validationMessage) {
        toast(validationMessage, "error");
        return;
      }
      const now = new Date().toISOString();
      const normalized = computeTransaction({
        ...previous,
        ...draft,
        createdAt: previous.createdAt || now,
        updatedAt: now,
        lastAction: "Updated in Summary",
        lastActionAt: now,
      });
      state.transactions[editIndex] = normalized;
      syncCustomerProfileFromTransaction(normalized);
      recomputeAll();
      pushAuditLog({
        action: "Updated invoice",
        invNo: normalized.invNo,
        customer: normalized.customer,
        actor: state.soaHeader.preparedBy || "Local user",
        detail: `Updated invoice ${normalized.invNo} from Summary`,
        before: previous,
        after: normalized,
        fields: ["docType", "m1m2", "date", "poNumber", "customer", "customerAddress", "customerTin", "representative", "gross", "freight", "returnsDisc", "ewt", "payment", "paymentTerms", "dueDate", "paymentStatus", "checkNumber", "checkBank", "checkAmount", "checkDate", "collectionReceiptNo", "bankDetails", "otherRemarks", "status"],
      });
      loadSummaryEditForm(normalized, editIndex);
      closeSummaryEditModal(true);
      toast(`Invoice ${normalized.invNo} updated successfully`, "success");
    }

    function cancelSummaryEditTransaction() {
      if (!getRolePermissions().canCancel) {
        showPermissionDenied("cancel a transaction");
        return;
      }
      const editIndex = state.summaryEditIndex === "" ? -1 : Number(state.summaryEditIndex);
      if (editIndex < 0 || !state.transactions[editIndex]) {
        toast("Select a transaction first.", "warning");
        return;
      }
      const invNo = state.transactions[editIndex].invNo;
      cancelTransaction(invNo);
      const refreshedIndex = state.transactions.findIndex((tx) => tx.invNo === invNo);
      if (refreshedIndex >= 0) {
        loadSummaryEditForm(state.transactions[refreshedIndex], refreshedIndex);
      }
      closeSummaryEditModal(true);
    }

    function refreshAuditActionOptions() {
      if (!els.auditLogFilter) return;
      const current = els.auditLogFilter.value || "all";
      const actions = Array.from(new Set((state.auditLog || []).map((entry) => entry.action).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      els.auditLogFilter.innerHTML = `<option value="all">All actions</option>${actions.map((action) => `<option value="${escapeHtml(action)}">${escapeHtml(action)}</option>`).join("")}`;
      els.auditLogFilter.value = actions.includes(current) ? current : "all";
    }

    function renderAuditSummary(filteredRows) {
      const allRows = state.auditLog || [];
      const today = todayISO();
      const todayCount = allRows.filter((entry) => String(entry.at || entry.timestamp || "").slice(0, 10) === today).length;
      const latest = allRows[0] || null;
      if (els.auditTotalCount) els.auditTotalCount.textContent = String(allRows.length);
      if (els.auditTodayCount) els.auditTodayCount.textContent = String(todayCount);
      if (els.auditLastAction) els.auditLastAction.textContent = latest?.action || "-";
      if (els.auditLastUser) els.auditLastUser.textContent = latest?.actor || "-";
      if (els.auditLogCountChip) {
        const filteredCount = filteredRows.length;
        els.auditLogCountChip.textContent = `${filteredCount} entr${filteredCount === 1 ? "y" : "ies"}`;
      }
    }

    function renderAuditTable(rows, totalCount) {
      if (!els.auditTableBody) return;
      if (!rows.length) {
        els.auditTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">${state.auditLog.length ? "No matching activity for the current filters." : "No activity recorded yet."}</td></tr>`;
        if (els.auditTableRange) els.auditTableRange.textContent = `Showing 0 of ${totalCount} entries`;
        return;
      }
      els.auditTableBody.innerHTML = rows.map((entry) => {
        const changes = Array.isArray(entry.changes) && entry.changes.length ? entry.changes.join("; ") : "-";
        const record = entry.invNo || entry.entityId || "-";
        return `
          <tr>
            <td>${escapeHtml(formatDateTime(entry.at || entry.timestamp || ""))}</td>
            <td>${escapeHtml(entry.actor || "Local user")}</td>
            <td><span class="audit-action-pill">${escapeHtml(entry.action || "Action")}</span></td>
            <td>${escapeHtml(record)}</td>
            <td>${escapeHtml(entry.customer || "-")}</td>
            <td class="audit-muted-cell">${escapeHtml(entry.detail || "-")}</td>
            <td class="audit-muted-cell">${escapeHtml(changes)}</td>
          </tr>
        `;
      }).join("");
      if (els.auditTableRange) {
        els.auditTableRange.textContent = `Showing 1 to ${rows.length} of ${totalCount} entr${totalCount === 1 ? "y" : "ies"}`;
      }
    }

    function renderAuditLog() {
      refreshAuditActionOptions();
      const filteredRows = getFilteredAuditLogEntries();
      const limit = Math.max(1, Number(els.auditRowsLimit?.value || 10));
      const rows = filteredRows.slice(0, limit);
      renderAuditSummary(filteredRows);
      renderAuditTable(rows, filteredRows.length);
      if (!els.auditLogList) return;
      if (!rows.length) {
        els.auditLogList.innerHTML = `<div class="audit-log-empty">${state.auditLog.length ? "No matching activity for the current filters." : "No activity recorded yet."}</div>`;
        return;
      }
      els.auditLogList.innerHTML = rows.map((entry) => `
        <div class="audit-log-item">
          <div class="topline">
            <div class="action">${escapeHtml(entry.action || "Action")}</div>
            <div class="time">${escapeHtml(formatDateTime(entry.at || entry.timestamp || ""))}</div>
          </div>
          <div class="meta">${escapeHtml(entry.invNo ? `Invoice # ${entry.invNo}` : (entry.entityId ? `Record ${entry.entityId}` : "No invoice referenced"))}${entry.customer ? ` | ${escapeHtml(entry.customer)}` : ""}</div>
          <div class="meta"><strong>By:</strong> ${escapeHtml(entry.actor || "Local user")}</div>
          ${entry.detail ? `<div class="meta">${escapeHtml(entry.detail)}</div>` : ""}
          ${Array.isArray(entry.changes) && entry.changes.length ? `<div class="meta changes"><strong>Changes:</strong> ${escapeHtml(entry.changes.join("; "))}</div>` : ""}
        </div>
      `).join("");
    }

    function pushAuditLog(entry) {
      const changes = Array.isArray(entry.changes)
        ? entry.changes.filter(Boolean)
        : (entry.before && entry.after && Array.isArray(entry.fields) ? formatFieldChanges(entry.before, entry.after, entry.fields) : []);
      const before = entry.before && typeof entry.before === "object" ? JSON.parse(JSON.stringify(entry.before)) : null;
      const after = entry.after && typeof entry.after === "object" ? JSON.parse(JSON.stringify(entry.after)) : null;
      state.auditLog.unshift({
        at: new Date().toISOString(),
        action: entry.action || "Action",
        invNo: entry.invNo || "",
        customer: entry.customer || "",
        actor: entry.actor || state.soaHeader.preparedBy || "Local user",
        detail: entry.detail || "",
        changes,
        before,
        after,
        fields: Array.isArray(entry.fields) ? entry.fields.slice() : [],
      });
      state.auditLog = state.auditLog.slice(0, 50);
      saveAuditLog();
      void apiJson("/api/audit", {
        method: "POST",
        body: JSON.stringify({
          action: entry.action || "Action",
          entityType: entry.entityType || "general",
          entityId: entry.entityId || "",
          actor: entry.actor || state.soaHeader.preparedBy || "Local user",
          detail: entry.detail || "",
          changes: changes.join("; "),
          invNo: entry.invNo || "",
          customer: entry.customer || "",
        }),
      }).catch((err) => console.warn("Could not sync audit log to backend", err));
      renderAuditLog();
    }

    function getFilteredAuditLogEntries() {
      const criteria = getAuditLogCriteria();
      return state.auditLog.filter((entry) => matchesAuditLogEntry(entry, criteria));
    }

    function getAuditLogCriteria() {
      return {
        action: els.auditLogFilter?.value || "all",
        term: normalize(els.auditLogSearch?.value || ""),
        from: els.auditLogFrom?.value || "",
        to: els.auditLogTo?.value || "",
      };
    }

    function matchesAuditLogEntry(entry, criteria) {
      if (criteria.action !== "all" && entry.action !== criteria.action) return false;
      const haystack = `${entry.action || ""} ${entry.invNo || ""} ${entry.customer || ""} ${entry.actor || ""} ${entry.detail || ""} ${(Array.isArray(entry.changes) ? entry.changes.join(" ") : "")}`.toLowerCase();
      if (criteria.term && !haystack.includes(criteria.term)) return false;
      const entryDate = String(entry.at || entry.timestamp || "").slice(0, 10);
      if (criteria.from && entryDate && entryDate < criteria.from) return false;
      if (criteria.to && entryDate && entryDate > criteria.to) return false;
      return true;
    }

    function formatFieldChanges(before, after, fields) {
      const changes = [];
      fields.forEach((field) => {
        const prev = before?.[field];
        const next = after?.[field];
        const prevText = formatAuditValue(prev);
        const nextText = formatAuditValue(next);
        if (prevText !== nextText) {
          changes.push(`${humanizeField(field)}: ${prevText} -> ${nextText}`);
        }
      });
      return changes;
    }

    function formatAuditValue(value) {
      if (value === null || value === undefined || value === "") return "-";
      if (typeof value === "number") return formatCurrency(value);
      if (value === true) return "Yes";
      if (value === false) return "No";
      return String(value);
    }

    function humanizeField(field) {
      return String(field)
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());
    }

    function exportAuditLogCsv() {
      const rows = getFilteredAuditLogEntries().map((entry) => ({
        Timestamp: formatDateTime(entry.at || entry.timestamp || ""),
        Action: entry.action || "",
        "Invoice #": entry.invNo || "",
        Customer: entry.customer || "",
        Details: entry.detail || "",
        Changes: Array.isArray(entry.changes) ? entry.changes.join("; ") : "",
      }));
      if (!rows.length) {
        alert("No audit log entries to export.");
        return;
      }
      exportCsv(rows, `audit-log-${todayISO()}.csv`);
    }

    function exportAuditLogJson() {
      const rows = getFilteredAuditLogEntries();
      if (!rows.length) {
        alert("No audit log entries to export.");
        return;
      }
      downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), `audit-log-${todayISO()}.json`);
    }

    function renderSoaCustomerOptions() {
      const customers = getCustomers();
      if (!customers.length) {
        els.soaCustomerSelect.innerHTML = `<option value="">No customers</option>`;
        return;
      }
      els.soaCustomerSelect.innerHTML = customers.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
      if (!els.soaCustomerSelect.value || !customers.includes(els.soaCustomerSelect.value)) {
        els.soaCustomerSelect.value = customers[0];
      }
    }

    function getFilteredTransactions() {
      if (!els.monthFilter) return [];
      const searchTerm = normalize(els.dashboardSearch?.value || "");
      const customer = normalize(els.customerFilter?.value || "all");
      const month = els.monthFilter.value;
      const statusFilter = els.statusFilter?.value || "all";
      let rows = state.transactions.slice();
      if (customer && customer !== "all") {
        rows = rows.filter((tx) => normalize(tx.customer || "") === customer);
      }
      if (month !== "all") {
        rows = rows.filter((tx) => String(new Date(tx.date + "T00:00:00").getMonth() + 1) === month);
      }
      if (state.summarySectionTab && state.summarySectionTab !== "ALL") {
        rows = rows.filter((tx) => tx.section === state.summarySectionTab);
      }
      if (statusFilter !== "all") {
        rows = rows.filter((tx) => statusFilter === "CANCELLED" ? !!tx.isCancelled : tx.status === statusFilter);
      }
      if (searchTerm && searchTerm.length >= 2) {
        rows = rows.filter((tx) => {
          const haystack = [
            tx.customer,
            tx.invNo,
            tx.poNumber,
            tx.docType,
            tx.m1m2,
            tx.customerAddress,
            tx.customerTin,
            tx.rep,
            tx.paymentStatus,
            tx.collectionReceiptNo,
            tx.status,
            tx.section,
          ].map((value) => normalize(value || "")).join(" ");
          return haystack.includes(searchTerm);
        });
      }
      rows.sort((a, b) => sortTransactions(a, b, state.sortKey, state.sortDir));
      return rows;
    }

    function sortTransactions(a, b, key, dir) {
      let av = a[key];
      let bv = b[key];
      if (key === "date") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (typeof av === "string" && typeof bv === "string") {
        const cmp = av.localeCompare(bv);
        return dir === "asc" ? cmp : -cmp;
      }
      const diff = (Number(av) || 0) - (Number(bv) || 0);
      return dir === "asc" ? diff : -diff;
    }

    function populateCustomerFilter(selectedValue = null) {
      if (!els.customerFilter) return;
      const current = selectedValue ?? els.customerFilter.value ?? "all";
      const names = [...new Set((state.transactions || [])
        .map((tx) => normalize(tx.customer || "").trim())
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      els.customerFilter.innerHTML = '<option value="all">All Customers</option>' + names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
      els.customerFilter.value = names.includes(current) ? current : "all";
    }

    let salesTableLoaded = false;

    function renderSalesTable() {
      if (!els.salesTableBody || !els.summaryRangeChip) return;
      if (!salesTableLoaded) {
        els.salesTableBody.innerHTML = `<tr><td colspan="17" class="empty-state">Click "Load Recent Transactions" to view.</td></tr>`;
        return;
      }
      populateCustomerFilter();
      state.filtered = getFilteredTransactions();
      els.salesTableBody.innerHTML = "";
      if (!state.filtered.length) {
        const msg = "No transactions found for the selected filters.";
        els.salesTableBody.innerHTML = `<tr><td colspan="17" class="empty-state">${msg}</td></tr>`;
      } else {
        const frag = document.createDocumentFragment();
        state.filtered.forEach((tx) => {
          const row = document.getElementById("txRowTemplate").content.cloneNode(true);
          const tr = row.querySelector("tr");
          const idx = state.transactions.findIndex((item) => item.invNo === tx.invNo);
          tr.dataset.invNo = tx.invNo;
          tr.dataset.customer = tx.customer;
          tr.dataset.index = String(idx);
          tr.style.cursor = "pointer";
          if (tx.isCancelled) tr.classList.add("row-cancelled");
          if (state.summaryEditIndex !== "" && Number(state.summaryEditIndex) === idx) tr.classList.add("row-selected");
          tr.querySelector('[data-key="date"]').textContent = formatDate(tx.date);
          tr.querySelector('[data-key="docType"]').textContent = formatDocTypeLabel(tx.docType || "DR");
          tr.querySelector('[data-key="m1m2"]').textContent = tx.m1m2 || "M1";
          tr.querySelector('[data-key="invNo"]').textContent = tx.invNo;
          tr.querySelector('[data-key="poNumber"]').textContent = tx.poNumber || "";
          const customerCell = tr.querySelector('[data-key="customer"]');
          if (customerCell) {
            customerCell.innerHTML = "";
            const customerBtn = document.createElement("button");
            customerBtn.type = "button";
            customerBtn.className = "customer-link";
            customerBtn.textContent = tx.customer || "";
            const profile = (state.customerProfiles || []).find(p => (p.name || "").trim() === (tx.customer || "").trim());
            const tooltipParts = [`Customer: ${tx.customer || "-"}`];
            if (profile?.address) tooltipParts.push(`Address: ${profile.address}`);
            if (profile?.tin) tooltipParts.push(`TIN: ${profile.tin}`);
            if (profile?.contactPerson) tooltipParts.push(`Contact: ${profile.contactPerson}`);
            if (profile?.email) tooltipParts.push(`Email: ${profile.email}`);
            customerBtn.title = tooltipParts.join("\n");
            customerBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              setActiveTab("encodeSection");
              setTimeout(() => {
                const custInput = document.getElementById("encodeCustomer");
                if (custInput) {
                  custInput.value = tx.customer || "";
                  custInput.dispatchEvent(new Event("input", {bubbles:true}));
                  custInput.dispatchEvent(new Event("change", {bubbles:true}));
                  custInput.focus();
                }
                const custPane = document.getElementById("encodeCustomerPane");
                if (custPane) custPane.classList.remove("is-hidden");
                const masterName = document.getElementById("encodeCustomerMasterName");
                if (masterName) masterName.value = tx.customer || "";
                const masterAddr = document.getElementById("encodeCustomerMasterAddress");
                if (masterAddr && profile?.address) masterAddr.value = profile.address;
                const masterTin = document.getElementById("encodeCustomerMasterTin");
                if (masterTin && profile?.tin) masterTin.value = profile.tin;
                const masterContact = document.getElementById("encodeCustomerMasterContact");
                if (masterContact && profile?.contactPerson) masterContact.value = profile.contactPerson;
                const masterPhone = document.getElementById("encodeCustomerMasterPhone");
                if (masterPhone && profile?.contactNumber) masterPhone.value = profile.contactNumber;
                const masterEmail = document.getElementById("encodeCustomerMasterEmail");
                if (masterEmail && profile?.email) masterEmail.value = profile.email;
                const masterPayTerms = document.getElementById("encodeCustomerMasterPaymentTerms");
                if (masterPayTerms && profile?.paymentTerms) masterPayTerms.value = String(profile.paymentTerms);
                const masterModePay = document.getElementById("encodeCustomerMasterModePayment");
                if (masterModePay && profile?.modeOfPayment) masterModePay.value = profile.modeOfPayment;
                const masterBank = document.getElementById("encodeCustomerMasterBankDetails");
                if (masterBank && profile?.bankDetails) masterBank.value = profile.bankDetails;
                const masterRemarks = document.getElementById("encodeCustomerMasterRemarks");
                if (masterRemarks && profile?.remarks) masterRemarks.value = profile.remarks;
                const custAddr = document.getElementById("encodeCustomerAddress");
                if (custAddr && profile?.address) custAddr.value = profile.address;
                const custTin = document.getElementById("encodeCustomerTin");
                if (custTin && profile?.tin) custTin.value = profile.tin;
                if (typeof toast === "function") toast(`Customer "${tx.customer}" loaded into Encoding`);
              }, 400);
            });
            customerCell.appendChild(customerBtn);
          }
          tr.querySelector('[data-key="gross"]').textContent = formatCurrency(tx.gross);
          tr.querySelector('[data-key="freight"]').textContent = formatCurrency(tx.freight);
          tr.querySelector('[data-key="returnsDisc"]').textContent = formatCurrency(tx.returnsDisc);
          tr.querySelector('[data-key="netDeduction"]').textContent = formatCurrency(tx.netDeduction);
          tr.querySelector('[data-key="ewt"]').textContent = formatCurrency(tx.ewt);
          tr.querySelector('[data-key="netSales"]').textContent = formatCurrency(tx.netSales);
          tr.querySelector('[data-key="payment"]').textContent = formatCurrency(tx.payment);
          tr.querySelector('[data-key="receivable"]').textContent = formatCurrency(tx.receivable);
          const statusCell = tr.querySelector('[data-key="status"]');
          const badge = document.createElement("span");
          const statusClass = tx.status === "CANCELLED"
            ? "status-cancelled"
            : tx.status === "PARTIAL_PAYMENT"
              ? "status-partial"
              : tx.status === "PAID"
                ? "status-paid"
                : tx.status === "PASTDUE"
                  ? "status-pastdue"
                  : "status-notdue";
          badge.className = `status ${statusClass}`;
          if (tx.status === "PAID") {
            badge.textContent = `Paid \u2022 ${formatCurrency(tx.payment)}`;
          } else if (tx.status === "PARTIAL_PAYMENT") {
            badge.textContent = `${formatCurrency(tx.payment)} out of ${formatCurrency(tx.netSales)}`;
          } else {
            badge.textContent = tx.status === "NOTDUE" ? "NOT DUE" : tx.status;
          }
          if (tx.isCancelled && tx.cancellationReason) badge.title = tx.cancellationReason;
          statusCell.appendChild(badge);
          const actionsCell = tr.querySelector('[data-key="actions"]');
          if (actionsCell) {
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "delete-row-btn";
            deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
            deleteBtn.title = `Delete invoice ${tx.invNo}`;
            deleteBtn.style.cssText = "background:none;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;color:#64748b;display:inline-flex;align-items:center;gap:4px;font-size:11px;transition:all 0.15s;";
            deleteBtn.addEventListener("mouseenter", () => { deleteBtn.style.borderColor = "#dc2626"; deleteBtn.style.color = "#dc2626"; deleteBtn.style.background = "#fef2f2"; });
            deleteBtn.addEventListener("mouseleave", () => { deleteBtn.style.borderColor = "#e2e8f0"; deleteBtn.style.color = "#64748b"; deleteBtn.style.background = "none"; });
            deleteBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              if (!confirm(`Delete invoice ${tx.invNo} for ${tx.customer}?`)) return;
              const delIdx = state.transactions.findIndex((item) => item.invNo === tx.invNo && item.customer === tx.customer && item.gross === tx.gross);
              if (delIdx >= 0) {
                state.transactions.splice(delIdx, 1);
                localStorage.setItem(`${STORAGE_KEY}-transactions`, JSON.stringify(state.transactions));
                renderSalesTable();
                renderStats();
                toast(`Invoice ${tx.invNo} deleted`, "success");
              }
            });
            actionsCell.appendChild(deleteBtn);
          }
          tr.addEventListener("click", () => {
            const idx = Number(tr.dataset.index);
            if (Number.isNaN(idx) || !state.transactions[idx]) return;
            openSummaryEditModal(state.transactions[idx], idx);
          });
          frag.appendChild(row);
        });
        els.salesTableBody.appendChild(frag);
      }
      const filteredCount = state.filtered.length;
      if (els.summaryRangeChip) {
        const searchTerm = normalize(els.dashboardSearch?.value || "");
        if (searchTerm.length < 2) {
          els.summaryRangeChip.textContent = `Type to search 3,336 records`;
        } else {
          els.summaryRangeChip.textContent = `${filteredCount} record${filteredCount === 1 ? "" : "s"} shown`;
        }
      }
      if (els.summaryPaginationText) els.summaryPaginationText.textContent = filteredCount ? `Showing 1 to ${Math.min(filteredCount, 10)} of ${filteredCount} entries` : "Showing 0 entries";
      if (els.summaryLastPageBtn) els.summaryLastPageBtn.textContent = String(Math.max(1, Math.ceil(filteredCount / 10)));
    }

    function updateSectionTabCounts() {
      const counts = { ALL: 0, CHSI: 0, CASI: 0, DR_WHOLESALE: 0, DR_SEAFOOD_DR: 0, DR_SEAFOOD_CHSI: 0, DR_LOCAL: 0 };
      const searchTerm = normalize(els.dashboardSearch?.value || "");
      state.transactions.forEach((tx) => {
        counts.ALL++;
        const sec = tx.section || "";
        if (counts[sec] !== undefined) counts[sec]++;
      });
      Object.entries(counts).forEach(([key, val]) => {
        const el = document.getElementById("tabCount" + key);
        if (el) el.textContent = val;
      });
    }

    function getStatsTransactions() {
      if (!els.monthFilter) return [];
      const customer = normalize(els.customerFilter?.value || "all");
      const month = els.monthFilter.value;
      const statusFilter = els.statusFilter?.value || "all";
      let rows = state.transactions.slice();
      if (customer && customer !== "all") {
        rows = rows.filter((tx) => normalize(tx.customer || "") === customer);
      }
      if (month !== "all") {
        rows = rows.filter((tx) => String(new Date(tx.date + "T00:00:00").getMonth() + 1) === month);
      }
      if (state.summarySectionTab && state.summarySectionTab !== "ALL") {
        rows = rows.filter((tx) => tx.section === state.summarySectionTab);
      }
      if (statusFilter !== "all") {
        rows = rows.filter((tx) => statusFilter === "CANCELLED" ? !!tx.isCancelled : tx.status === statusFilter);
      }
      return rows;
    }

    function renderStats() {
      if (!els.grossStat || !els.netSalesStat || !els.arStat || !els.pastDueStat) return;
      const txs = getStatsTransactions().filter((tx) => !tx.isCancelled);
      const gross = txs.reduce((sum, tx) => sum + Number(tx.gross || 0), 0);
      const netSales = txs.reduce((sum, tx) => sum + Number(tx.netSales || 0), 0);
      const outstanding = txs.reduce((sum, tx) => sum + (tx.status === "PAID" ? 0 : Math.max(Number(tx.receivable || 0), 0)), 0);
      const pastDue = txs.reduce((sum, tx) => sum + (tx.status === "PASTDUE" ? Math.max(Number(tx.receivable || 0), 0) : 0), 0);
      els.grossStat.textContent = formatCurrency(gross);
      els.netSalesStat.textContent = formatCurrency(netSales);
      els.arStat.textContent = formatCurrency(outstanding);
      els.pastDueStat.textContent = formatCurrency(pastDue);
      renderAnalyticsSnapshot(txs, { gross, netSales, outstanding, pastDue });
      renderHeroSummary();
    }

    function renderAnalyticsSnapshot(txs, totals = {}) {
      const activeTxs = Array.isArray(txs) ? txs.filter((tx) => !tx.isCancelled) : [];
      const netSales = Number(totals.netSales ?? activeTxs.reduce((sum, tx) => sum + Number(tx.netSales || 0), 0));
      const outstanding = Number(totals.outstanding ?? activeTxs.reduce((sum, tx) => sum + Math.max(Number(tx.receivable || 0), 0), 0));
      const pastDue = Number(totals.pastDue ?? activeTxs.reduce((sum, tx) => sum + (tx.status === "PASTDUE" ? Math.max(Number(tx.receivable || 0), 0) : 0), 0));
      const gross = Number(totals.gross ?? activeTxs.reduce((sum, tx) => sum + Number(tx.gross || 0), 0));
      const paid = activeTxs.reduce((sum, tx) => sum + (tx.status === "PAID" ? Math.max(Number(tx.netSales || 0), 0) : Math.max(Number(tx.payment || 0), 0)), 0);
      const collectionRate = netSales > 0 ? (paid / netSales) * 100 : 0;
      const overdueShare = outstanding > 0 ? (pastDue / outstanding) * 100 : 0;
      const averageTicket = activeTxs.length > 0 ? (netSales / activeTxs.length) : 0;
      const exposureMap = new Map();
      activeTxs.forEach((tx) => {
        const key = tx.customer || "Unknown";
        exposureMap.set(key, (exposureMap.get(key) || 0) + Math.max(Number(tx.receivable || 0), 0));
      });
      const topEntry = [...exposureMap.entries()].sort((a, b) => b[1] - a[1])[0] || null;
      if (els.analyticsCollectionRate) els.analyticsCollectionRate.textContent = `${collectionRate.toFixed(1)}%`;
      if (els.analyticsCollectionRateSub) els.analyticsCollectionRateSub.textContent = `${formatCurrency(paid)} collected from ${formatCurrency(netSales)} net sales`;
      if (els.analyticsOverdueShare) els.analyticsOverdueShare.textContent = `${overdueShare.toFixed(1)}%`;
      if (els.analyticsOverdueShareSub) els.analyticsOverdueShareSub.textContent = `${formatCurrency(pastDue)} past due out of ${formatCurrency(outstanding)} open AR`;
      if (els.analyticsAverageTicket) els.analyticsAverageTicket.textContent = formatCurrency(averageTicket);
      if (els.analyticsAverageTicketSub) els.analyticsAverageTicketSub.textContent = `${activeTxs.length} active invoice${activeTxs.length === 1 ? "" : "s"}`;
      if (els.analyticsTopExposure) els.analyticsTopExposure.textContent = topEntry ? `${topEntry[0]} • ${formatCurrency(topEntry[1])}` : "-";
      if (els.analyticsTopExposureSub) els.analyticsTopExposureSub.textContent = topEntry ? "Largest open balance customer" : "No open balances found";
      renderModernSummaryDashboard(activeTxs, { gross, netSales, outstanding, pastDue });
      updateSectionTabCounts();
    }



    function setDashboardText(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    function setDashboardBar(id, percent) {
      const el = document.getElementById(id);
      if (el) el.style.width = `${Math.max(0, Math.min(100, percent || 0)).toFixed(1)}%`;
    }

    function monthKey(dateValue) {
      const d = new Date(`${dateValue || todayISO()}T00:00:00`);
      if (Number.isNaN(d.getTime())) return "unknown";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    function buildMonthlySeries(txs, valueGetter) {
      const map = new Map();
      (txs || []).forEach((tx) => {
        const key = monthKey(tx.date);
        const current = map.get(key) || { value: 0, count: 0 };
        current.value += Number(valueGetter(tx) || 0);
        current.count += 1;
        map.set(key, current);
      });
      const keys = [...map.keys()].sort();
      if (!keys.length) return [0, 0, 0, 0, 0, 0];
      return keys.map((key) => map.get(key).value);
    }

    function buildMonthlyAverageTicketSeries(txs) {
      const map = new Map();
      (txs || []).forEach((tx) => {
        const key = monthKey(tx.date);
        const current = map.get(key) || { value: 0, count: 0 };
        current.value += Number(tx.netSales || 0);
        current.count += 1;
        map.set(key, current);
      });
      const keys = [...map.keys()].sort();
      if (!keys.length) return [0, 0, 0, 0, 0, 0];
      return keys.map((key) => {
        const row = map.get(key);
        return row.count ? row.value / row.count : 0;
      });
    }

    function renderSparkline(id, values, color = "#155bb5") {
      const svg = document.getElementById(id);
      if (!svg) return;
      const data = Array.isArray(values) && values.length ? values.map((v) => Number(v) || 0) : [0, 0, 0, 0, 0];
      const width = 120;
      const height = 42;
      const pad = 4;
      const min = Math.min(...data);
      const max = Math.max(...data);
      const spread = max - min || 1;
      const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : width - pad * 2;
      const points = data.map((value, index) => {
        const x = pad + index * step;
        const y = height - pad - ((value - min) / spread) * (height - pad * 2);
        return [x, y];
      });
      const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
      const area = `${line} L${(width - pad).toFixed(2)},${(height - pad).toFixed(2)} L${pad},${(height - pad).toFixed(2)} Z`;
      svg.style.color = color;
      svg.innerHTML = `<path class="area" d="${area}" fill="${color}"></path><path d="${line}"></path>`;
    }

    function renderModernSummaryDashboard(txs, totals = {}) {
      const activeTxs = Array.isArray(txs) ? txs.filter((tx) => !tx.isCancelled) : [];
      const gross = Number(totals.gross || 0);
      const netSales = Number(totals.netSales || 0);
      const outstanding = Number(totals.outstanding || 0);
      const pastDue = Number(totals.pastDue || 0);
      const paid = activeTxs.reduce((sum, tx) => sum + (tx.status === "PAID" ? Math.max(Number(tx.netSales || 0), 0) : Math.max(Number(tx.payment || 0), 0)), 0);
      const maxBase = Math.max(gross, netSales, outstanding, pastDue, paid, 1);
      const salesPct = gross > 0 ? 100 : 0;
      const collectionsPct = netSales > 0 ? (paid / netSales) * 100 : 0;
      const arPct = netSales > 0 ? (outstanding / netSales) * 100 : (outstanding / maxBase) * 100;
      const pastDuePct = outstanding > 0 ? (pastDue / outstanding) * 100 : 0;

      setDashboardText("progressSalesValue", formatCurrency(gross));
      setDashboardText("progressCollectionsValue", formatCurrency(paid));
      setDashboardText("progressArValue", formatCurrency(outstanding));
      setDashboardText("progressPastDueValue", formatCurrency(pastDue));
      setDashboardText("progressSalesPct", `${Math.min(100, salesPct).toFixed(0)}%`);
      setDashboardText("progressCollectionsPct", `${Math.min(100, collectionsPct).toFixed(1)}%`);
      setDashboardText("progressArPct", `${Math.min(100, arPct).toFixed(1)}%`);
      setDashboardText("progressPastDuePct", `${Math.min(100, pastDuePct).toFixed(1)}%`);
      setDashboardBar("progressSalesBar", salesPct);
      setDashboardBar("progressCollectionsBar", collectionsPct);
      setDashboardBar("progressArBar", arPct);
      setDashboardBar("progressPastDueBar", pastDuePct);

      renderSparkline("sparklineCollection", buildMonthlySeries(activeTxs, (tx) => tx.status === "PAID" ? Number(tx.netSales || 0) : Number(tx.payment || 0)), "#168246");
      renderSparkline("sparklineOverdue", buildMonthlySeries(activeTxs, (tx) => tx.status === "PASTDUE" ? Math.max(Number(tx.receivable || 0), 0) : 0), "#dc2626");
      renderSparkline("sparklineTicket", buildMonthlyAverageTicketSeries(activeTxs), "#155bb5");
      renderSalesTrendChart(activeTxs);
      renderSalesBarChart(activeTxs);
      renderStatusBreakdown(txs);
      updateSvgRings(activeTxs, totals);
      renderRecentActivity();
      renderCustomerPaymentTrend();
    }

    function showTooltip(x, y, label, value, valueAsHtml = false) {
      let tooltip = document.getElementById("chartTooltip");
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "chartTooltip";
        tooltip.className = "chart-tooltip";
        tooltip.innerHTML = '<div class="tooltip-label"></div><div class="tooltip-value"></div>';
        document.body.appendChild(tooltip);
      }
      tooltip.querySelector(".tooltip-label").textContent = label;
      const valueEl = tooltip.querySelector(".tooltip-value");
      if (valueAsHtml) valueEl.innerHTML = value;
      else valueEl.textContent = value;
      tooltip.style.left = (x + 12) + "px";
      tooltip.style.top = (y - 10) + "px";
      tooltip.style.display = "block";
    }

    function hideTooltip() {
      const tooltip = document.getElementById("chartTooltip");
      if (tooltip) tooltip.style.display = "none";
    }

    function renderSalesTrendChart(txs) {
      const canvas = document.getElementById("salesTrendChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width = canvas.parentElement.clientWidth - 40;
      const h = canvas.height = 200;
      ctx.clearRect(0, 0, w, h);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyData = new Array(12).fill(0);
      txs.forEach(tx => {
        if (tx.date) {
          const d = new Date(tx.date);
          if (!isNaN(d.getTime())) monthlyData[d.getMonth()] += Number(tx.gross || 0);
        }
      });
      const maxVal = Math.max(...monthlyData, 1);
      const padding = { top: 20, right: 20, bottom: 40, left: 60 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;
      const stepX = chartW / 11;
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, h - padding.bottom);
      ctx.lineTo(w - padding.right, h - padding.bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, h - padding.bottom);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      months.forEach((m, i) => {
        const x = padding.left + i * stepX;
        ctx.fillText(m, x, h - padding.bottom + 20);
        ctx.beginPath();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 0.5;
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, h - padding.bottom);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      monthlyData.forEach((val, i) => {
        const x = padding.left + i * stepX;
        const y = h - padding.bottom - (val / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.3)");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.beginPath();
      ctx.moveTo(padding.left, h - padding.bottom);
      monthlyData.forEach((val, i) => {
        const x = padding.left + i * stepX;
        const y = h - padding.bottom - (val / maxVal) * chartH;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(padding.left + 11 * stepX, h - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      monthlyData.forEach((val, i) => {
        if (val > 0) {
          const x = padding.left + i * stepX;
          const y = h - padding.bottom - (val / maxVal) * chartH;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#3b82f6";
          ctx.fill();
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      canvas._chartData = { months, monthlyData, padding, stepX, chartH, maxVal, h };
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let found = false;
        monthlyData.forEach((val, i) => {
          const x = padding.left + i * stepX;
          const y = h - padding.bottom - (val / maxVal) * chartH;
          if (Math.abs(mx - x) < 10 && Math.abs(my - y) < 10) {
            showTooltip(e.clientX, e.clientY, months[i], formatCurrency(val));
            found = true;
          }
        });
        if (!found) hideTooltip();
      };
      canvas.onmouseleave = () => hideTooltip();
    }

    function renderStatusBreakdown(allTxs) {
      const els = {
        paid: document.getElementById("statusCountPaid"),
        notDue: document.getElementById("statusCountNotDue"),
        partial: document.getElementById("statusCountPartial"),
        pastDue: document.getElementById("statusCountPastDue"),
        cancelled: document.getElementById("statusCountCancelled"),
      };
      if (!els.paid) return;
      const counts = { PAID: 0, NOTDUE: 0, PARTIAL_PAYMENT: 0, PASTDUE: 0, CANCELLED: 0 };
      (allTxs || []).forEach((tx) => {
        const s = (tx.status || "NOTDUE").toUpperCase();
        if (s in counts) counts[s]++;
      });
      els.paid.textContent = counts.PAID;
      els.notDue.textContent = counts.NOTDUE;
      els.partial.textContent = counts.PARTIAL_PAYMENT;
      els.pastDue.textContent = counts.PASTDUE;
      els.cancelled.textContent = counts.CANCELLED;
    }

    function updateSvgRings(txs, totals = {}) {
      const rings = document.querySelectorAll(".db-ring-fill");
      if (!rings.length) return;
      const activeTxs = Array.isArray(txs) ? txs.filter((tx) => !tx.isCancelled) : [];
      const netSales = Number(totals.netSales || activeTxs.reduce((sum, tx) => sum + Number(tx.netSales || 0), 0));
      const outstanding = Number(totals.outstanding || activeTxs.reduce((sum, tx) => sum + Math.max(Number(tx.receivable || 0), 0), 0));
      const pastDue = Number(totals.pastDue || activeTxs.reduce((sum, tx) => sum + (tx.status === "PASTDUE" ? Math.max(Number(tx.receivable || 0), 0) : 0), 0));
      const gross = Number(totals.gross || activeTxs.reduce((sum, tx) => sum + Number(tx.gross || 0), 0));
      const paid = activeTxs.reduce((sum, tx) => sum + (tx.status === "PAID" ? Math.max(Number(tx.netSales || 0), 0) : Math.max(Number(tx.payment || 0), 0)), 0);
      const collectionRate = netSales > 0 ? (paid / netSales) : 0;
      const overdueShare = outstanding > 0 ? (pastDue / outstanding) : 0;
      const arPct = netSales > 0 ? (outstanding / netSales) : 0.5;
      const salesPct = gross > 0 ? 1 : 0;
      const pcts = [
        Math.min(salesPct, 1),
        Math.min(arPct, 1),
        Math.min(overdueShare, 1),
        Math.min(collectionRate, 1),
      ];
      const circ = 2 * Math.PI * 17;
      rings.forEach((ring, idx) => {
        const pct = pcts[idx] || 0;
        ring.setAttribute("stroke-dashoffset", String(circ * (1 - pct)));
      });
    }

    function renderRecentActivity() {
      const list = document.getElementById("recentActivityList");
      if (!list) return;
      const log = (state.auditLog || []).slice(0, 5);
      if (!log.length) {
        list.innerHTML = '<p class="db-activity-empty">No recent activity</p>';
        return;
      }
      list.innerHTML = log.map((entry) => {
        const action = escapeHtml(entry.action || "Action");
        const detail = escapeHtml((entry.detail || "").substring(0, 80));
        const actor = escapeHtml(entry.actor || "System");
        const time = formatDateTime(entry.at || entry.timestamp || "");
        return `<div class="db-activity-item">
          <div class="db-activity-action"><strong>${actor}</strong> ${action}${detail ? " — " + detail : ""}</div>
          <span class="db-activity-time">${escapeHtml(time)}</span>
        </div>`;
      }).join("");
    }

    function renderCustomerPaymentTrend() {
      const canvas = document.getElementById("customerTrendChart");
      const select = document.getElementById("customerTrendSelect");
      const yearSelect = document.getElementById("customerTrendYear");
      if (!canvas || !select || !yearSelect) return;

      const currentYear = new Date().getFullYear();
      const years = [];
      (state.transactions || []).forEach(tx => {
        if (tx.date) {
          const y = new Date(tx.date).getFullYear();
          if (!isNaN(y) && !years.includes(y)) years.push(y);
        }
      });
      years.sort((a, b) => b - a);
      if (!years.length) years.push(currentYear);
      const previousYear = parseInt(yearSelect.value, 10);
      const selectedYear = years.includes(previousYear) ? previousYear : (years.includes(currentYear) ? currentYear : years[0]);
      yearSelect.innerHTML = years.map(y => `<option value="${y}"${y === selectedYear ? " selected" : ""}>${y}</option>`).join("");

      const customers = getCustomers();
      const previousCustomer = select.value;
      const selectedCustomer = customers.includes(previousCustomer) ? previousCustomer : customers[0];
      select.innerHTML = customers.map(c => `<option value="${escapeHtml(c)}"${c === selectedCustomer ? " selected" : ""}>${escapeHtml(c)}</option>`).join("");

      const customer = select.value;
      const year = parseInt(yearSelect.value, 10) || selectedYear;
      if (!customer) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        const wrap = document.getElementById("customerTrendTableWrap");
        if (wrap) wrap.innerHTML = "";
        return;
      }

      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const monthlyData = months.map(() => ({ paid: 0, pastDue: 0, notDue: 0, gross: 0 }));

      (state.transactions || []).forEach(tx => {
        if (!tx.date || !tx.customer) return;
        if (normalize(tx.customer) !== normalize(customer)) return;
        const d = new Date(tx.date);
        if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
        const m = d.getMonth();
        const gross = Number(tx.gross || 0);
        const netSales = Number(tx.netSales || 0);
        const receivable = Math.max(Number(tx.receivable || 0), 0);
        const status = (tx.status || "").toUpperCase();

        monthlyData[m].gross += gross;
        if (status === "PAID") {
          monthlyData[m].paid += netSales > 0 ? netSales : receivable;
        } else if (status === "PASTDUE") {
          monthlyData[m].pastDue += receivable;
        } else if (status === "NOTDUE" || status === "PARTIAL_PAYMENT") {
          monthlyData[m].notDue += receivable;
        }
      });

      drawCustomerTrendChart(canvas, months, monthlyData);
      renderCustomerTrendTable(monthlyData);

      if (!select._trendListener) {
        select._trendListener = true;
        const handler = () => renderCustomerPaymentTrend();
        select.addEventListener("change", handler);
        yearSelect.addEventListener("change", handler);
      }
    }

    function drawCustomerTrendChart(canvas, months, data) {
      const ctx = canvas.getContext("2d");
      const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : canvas.clientWidth;
      const w = canvas.width = Math.max((parentWidth || 680) - 40, 320);
      const h = canvas.height = 220;
      ctx.clearRect(0, 0, w, h);

      const maxVal = Math.max(...data.map(m => m.paid + m.pastDue + m.notDue), 1);
      const pad = { top: 20, right: 20, bottom: 40, left: 60 };
      const cw = w - pad.left - pad.right;
      const ch = h - pad.top - pad.bottom;
      const barW = Math.min(40, cw / 12 - 8);
      const gap = (cw - barW * 12) / 13;

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const steps = 4;
      for (let i = 0; i <= steps; i++) {
        const val = (maxVal / steps) * i;
        const y = pad.top + ch - (ch / steps) * i;
        ctx.fillText(formatCurrency(val), pad.left - 8, y);
        if (i > 0) {
          ctx.strokeStyle = "#f1f5f9";
          ctx.beginPath();
          ctx.moveTo(pad.left + 1, y);
          ctx.lineTo(pad.left + cw, y);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top);
      ctx.lineTo(pad.left, pad.top + ch);
      ctx.lineTo(pad.left + cw, pad.top + ch);
      ctx.stroke();

      const colors = { paid: "#22c55e", pastDue: "#ef4444", notDue: "#3b82f6" };
      const barData = [];

      data.forEach((m, i) => {
        const x = pad.left + gap + i * (barW + gap);
        let yOff = 0;
        const segments = [];
        ["paid", "pastDue", "notDue"].forEach(key => {
          const val = m[key];
          if (val <= 0) return;
          const barH = (val / maxVal) * ch;
          const y = pad.top + ch - yOff - barH;
          ctx.fillStyle = colors[key];
          ctx.fillRect(x, y, barW, barH);
          if (key === "paid" && barH > 2) {
            ctx.fillStyle = "#16a34a";
            ctx.fillRect(x, y, barW, 2);
          }
          segments.push({ key, val, y, h: barH });
          yOff += barH;
        });
        barData.push({ x, w: barW, segments, month: months[i] });
      });

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      months.forEach((m, i) => {
        const x = pad.left + gap + i * (barW + gap) + barW / 2;
        ctx.fillText(m, x, pad.top + ch + 6);
      });

      canvas._trendBarData = barData;
      canvas._trendColors = colors;
      canvas.onmousemove = e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const bars = canvas._trendBarData;
        if (!bars) return;
        const found = bars.find(b => mx >= b.x && mx <= b.x + b.w);
        if (found) {
          let val = `<strong>${found.month}</strong><br>`;
          const colors2 = canvas._trendColors;
          found.segments.forEach(s => {
            val += `<span style="color:${colors2[s.key]}">●</span> ${s.key === "paid" ? "Paid" : s.key === "pastDue" ? "Past Due" : "Not Due"}: ${formatCurrency(s.val)}<br>`;
          });
          showTooltip(e.clientX, e.clientY, found.month, val.replace(/<br>$/, ""), true);
        } else {
          hideTooltip();
        }
      };
      canvas.onmouseleave = () => hideTooltip();
    }

    function renderCustomerTrendTable(data) {
      const wrap = document.getElementById("customerTrendTableWrap");
      if (!wrap) return;
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      let totGross = 0, totPaid = 0, totPastDue = 0, totNotDue = 0;
      let html = `<table class="db-trend-table"><thead><tr><th>Month</th><th>Gross</th><th>Paid</th><th>Past Due</th><th>Not Due</th><th>Rate</th></tr></thead><tbody>`;
      data.forEach((m, i) => {
        totGross += m.gross; totPaid += m.paid; totPastDue += m.pastDue; totNotDue += m.notDue;
        const total = m.paid + m.pastDue + m.notDue;
        const rate = total > 0 ? (m.paid / total * 100) : 0;
        html += `<tr><td>${months[i]}</td><td>${formatCurrency(m.gross)}</td><td class="c-paid">${formatCurrency(m.paid)}</td><td class="c-pastdue">${formatCurrency(m.pastDue)}</td><td class="c-notdue">${formatCurrency(m.notDue)}</td><td>${rate.toFixed(1)}%</td></tr>`;
      });
      const allTotal = totPaid + totPastDue + totNotDue;
      const totRate = allTotal > 0 ? (totPaid / allTotal * 100) : 0;
      html += `</tbody><tfoot><tr><td><strong>Total</strong></td><td><strong>${formatCurrency(totGross)}</strong></td><td class="c-paid"><strong>${formatCurrency(totPaid)}</strong></td><td class="c-pastdue"><strong>${formatCurrency(totPastDue)}</strong></td><td class="c-notdue"><strong>${formatCurrency(totNotDue)}</strong></td><td><strong>${totRate.toFixed(1)}%</strong></td></tr></tfoot></table>`;
      wrap.innerHTML = html;
    }

    function renderSalesBarChart(txs) {
      const canvas = document.getElementById("salesBarChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width = canvas.parentElement.clientWidth - 40;
      const h = canvas.height = 200;
      ctx.clearRect(0, 0, w, h);
      const sections = {};
      txs.forEach(tx => {
        const sec = tx.section || "Other";
        sections[sec] = (sections[sec] || 0) + Number(tx.gross || 0);
      });
      const entries = Object.entries(sections).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const colors = ["#3b82f6", "#22c55e", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];
      const maxVal = Math.max(...entries.map(e => e[1]), 1);
      const padding = { top: 20, right: 20, bottom: 50, left: 10 };
      const chartW = w - padding.left - padding.right;
      const barW = Math.min(40, chartW / entries.length - 10);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, h - padding.bottom);
      ctx.lineTo(w - padding.right, h - padding.bottom);
      ctx.stroke();
      const barPositions = [];
      entries.forEach(([name, val], i) => {
        const barH = (val / maxVal) * (h - padding.top - padding.bottom);
        const x = padding.left + (i * (chartW / entries.length)) + (chartW / entries.length - barW) / 2;
        const y = h - padding.bottom - barH;
        barPositions.push({ x, y, w: barW, h: barH, name, val });
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        ctx.fill();
        ctx.fillStyle = "#64748b";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center";
        const label = name.length > 8 ? name.substring(0, 8) + "…" : name;
        ctx.fillText(label, x + barW / 2, h - padding.bottom + 14);
        ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + "K" : val.toFixed(0), x + barW / 2, y - 6);
      });
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let found = false;
        barPositions.forEach(bar => {
          if (mx >= bar.x && mx <= bar.x + bar.w && my >= bar.y && my <= bar.y + bar.h) {
            showTooltip(e.clientX, e.clientY, bar.name, formatCurrency(bar.val));
            found = true;
          }
        });
        if (!found) hideTooltip();
      };
      canvas.onmouseleave = () => hideTooltip();
    }
    function printWithView(viewName) {
      document.body.dataset.printView = viewName;
      window.requestAnimationFrame(() => {
        window.print();
        setTimeout(() => {
          delete document.body.dataset.printView;
        }, 250);
      });
    }

    function openTxModal(tx) {
      els.txForm.reset();
      els.editIndex.value = "";
    els.txModalTitle.textContent = "Encode Transaction";
      els.txDate.value = todayISO();
      els.txDueDate.value = addDaysISO(todayISO(), 30);
      els.txFreight.value = 0;
      els.txReturns.value = 0;
      els.txEwt.value = 0;
      els.txPayment.value = 0;
      els.txStatus.value = "NOTDUE";
      if (tx) {
        const idx = state.transactions.findIndex((item) => item.invNo === tx.invNo);
        els.editIndex.value = String(idx);
        els.txModalTitle.textContent = "Edit Transaction";
        els.txDate.value = tx.date;
        els.txInvNo.value = tx.invNo;
        els.txCustomer.value = tx.customer;
        els.txGross.value = tx.gross;
        els.txFreight.value = tx.freight;
        els.txReturns.value = tx.returnsDisc;
        els.txEwt.value = tx.ewt;
        els.txPayment.value = tx.payment;
        els.txDueDate.value = tx.dueDate;
        els.txStatus.value = tx.status;
      }
      els.txModalOverlay.classList.add("open");
      els.txModalOverlay.setAttribute("aria-hidden", "false");
      setTimeout(() => els.txInvNo.focus(), 30);
    }

    function calcItemTotal(item) {
      return roundMoney((Number(item.qty || 0) || 0) * (Number(item.price || 0) || 0));
    }

    function makeEncodeItemRow(item = {}) {
      const tr = document.createElement("tr");
      tr.className = "encode-item-row";
      tr.innerHTML = `
        <td class="encode-row-number">—</td>
        <td><textarea class="encode-item-desc" placeholder="Item description">${escapeHtml(item.desc || "")}</textarea></td>
        <td class="num"><input class="encode-item-qty num" type="number" min="0" step="0.01" value="${Number(item.qty || 1)}"></td>
        <td class="num"><input class="encode-item-price num" type="number" min="0" step="0.01" value="${Number(item.price || 0)}"></td>
        <td class="num"><input class="encode-item-total num" type="number" min="0" step="0.01" value="${calcItemTotal(item).toFixed(2)}" readonly></td>
        <td class="no-print"><button class="btn btn-danger encode-item-remove" type="button">Remove</button></td>
      `;
      const qty = tr.querySelector(".encode-item-qty");
      const price = tr.querySelector(".encode-item-price");
      const total = tr.querySelector(".encode-item-total");
      const update = () => {
        total.value = calcItemTotal({ qty: qty.value, price: price.value }).toFixed(2);
        syncEncodePreview();
        syncEncodeGrossFromItems();
      };
      qty.addEventListener("input", update);
      price.addEventListener("input", update);
      tr.querySelector(".encode-item-desc").addEventListener("input", syncEncodePreview);
      tr.querySelector(".encode-item-remove").addEventListener("click", () => {
        if (els.encodeItemsBody.children.length <= 1) {
          tr.querySelector(".encode-item-desc").value = "";
          qty.value = 1;
          price.value = 0;
          update();
          return;
        }
        tr.remove();
        syncEncodeGrossFromItems();
        syncEncodePreview();
      });
      return tr;
    }

    function renderEncodeItemRows(items) {
      if (!els.encodeItemsBody) return;
      els.encodeItemsBody.innerHTML = "";
      const rows = Array.isArray(items) && items.length ? items : emptyTxItems();
      rows.forEach((item) => els.encodeItemsBody.appendChild(makeEncodeItemRow(item)));
      syncEncodeGrossFromItems();
    }

    function readEncodeItems() {
      if (!els.encodeItemsBody) return [];
      const rows = [...els.encodeItemsBody.querySelectorAll(".encode-item-row")];
      return rows.map((tr) => {
        const desc = tr.querySelector(".encode-item-desc").value.trim();
        const qty = Number(tr.querySelector(".encode-item-qty").value || 0);
        const price = Number(tr.querySelector(".encode-item-price").value || 0);
        const total = roundMoney(qty * price);
        return { desc, qty, price, total };
      }).filter((item) => item.desc || item.qty || item.price);
    }

    function syncEncodeGrossFromItems() {
      if (!els.encodeGross) return;
      const rows = els.encodeItemsBody ? [...els.encodeItemsBody.querySelectorAll(".encode-item-row")] : [];
      rows.forEach((row, index) => {
        const numberCell = row.querySelector(".encode-row-number");
        if (numberCell) numberCell.textContent = String(index + 1);
      });
      const items = readEncodeItems();
      const gross = roundMoney(items.reduce((sum, item) => sum + Number(item.total || 0), 0));
      els.encodeGross.value = gross.toFixed(2);
      syncEncodePreview();
    }

    function syncCustomerFieldsFromName() {
      const snapshot = getCustomerSnapshot(els.encodeCustomer.value);
      if (snapshot.address && !els.encodeCustomerAddress.value.trim()) els.encodeCustomerAddress.value = snapshot.address;
      if (snapshot.tin && !els.encodeCustomerTin.value.trim()) els.encodeCustomerTin.value = snapshot.tin;
      if (snapshot.contactPerson && !els.encodeRep.value.trim()) els.encodeRep.value = snapshot.contactPerson;
      if (snapshot.paymentTerms && (!els.encodePaymentTerms.value || els.encodePaymentTerms.value === "30")) {
        els.encodePaymentTerms.value = String(snapshot.paymentTerms || "30");
        updateEncodeDueDate();
      }
      if (snapshot.bankDetails && !els.encodeBankDetails.value.trim()) els.encodeBankDetails.value = snapshot.bankDetails;
      if (snapshot.remarks && !els.encodeOtherRemarks.value.trim()) els.encodeOtherRemarks.value = snapshot.remarks;
    }

    function syncCustomerMasterFromName() {
      const name = els.encodeCustomerMasterName?.value || "";
      const snapshot = getCustomerSnapshot(name);
      if (snapshot.source === "profile" || snapshot.source === "transaction") {
        if (els.encodeCustomerMasterAddress && !els.encodeCustomerMasterAddress.value.trim()) els.encodeCustomerMasterAddress.value = snapshot.address || "";
        if (els.encodeCustomerMasterTin && !els.encodeCustomerMasterTin.value.trim()) els.encodeCustomerMasterTin.value = snapshot.tin || "";
        if (els.encodeCustomerMasterContact && !els.encodeCustomerMasterContact.value.trim()) els.encodeCustomerMasterContact.value = snapshot.contactPerson || "";
        if (els.encodeCustomerMasterPhone && !els.encodeCustomerMasterPhone.value.trim()) els.encodeCustomerMasterPhone.value = snapshot.contactNumber || "";
        if (els.encodeCustomerMasterEmail && !els.encodeCustomerMasterEmail.value.trim()) els.encodeCustomerMasterEmail.value = snapshot.email || "";
        if (els.encodeCustomerMasterPaymentTerms && (!els.encodeCustomerMasterPaymentTerms.value || els.encodeCustomerMasterPaymentTerms.value === "30")) {
          els.encodeCustomerMasterPaymentTerms.value = String(snapshot.paymentTerms || "30");
        }
        if (els.encodeCustomerMasterModePayment && !els.encodeCustomerMasterModePayment.value.trim()) els.encodeCustomerMasterModePayment.value = snapshot.modeOfPayment || "";
        if (els.encodeCustomerMasterBankDetails && !els.encodeCustomerMasterBankDetails.value.trim()) els.encodeCustomerMasterBankDetails.value = snapshot.bankDetails || "";
        if (els.encodeCustomerMasterRemarks && !els.encodeCustomerMasterRemarks.value.trim()) els.encodeCustomerMasterRemarks.value = snapshot.remarks || "";
      }
    }

    function clearCustomerMasterForm() {
      if (els.encodeCustomerMasterName) els.encodeCustomerMasterName.value = "";
      if (els.encodeCustomerMasterAddress) els.encodeCustomerMasterAddress.value = "";
      if (els.encodeCustomerMasterTin) els.encodeCustomerMasterTin.value = "";
      if (els.encodeCustomerMasterContact) els.encodeCustomerMasterContact.value = "";
      if (els.encodeCustomerMasterPhone) els.encodeCustomerMasterPhone.value = "";
      if (els.encodeCustomerMasterEmail) els.encodeCustomerMasterEmail.value = "";
      if (els.encodeCustomerMasterPaymentTerms) els.encodeCustomerMasterPaymentTerms.value = "30";
      if (els.encodeCustomerMasterModePayment) els.encodeCustomerMasterModePayment.value = "";
      if (els.encodeCustomerMasterBankDetails) els.encodeCustomerMasterBankDetails.value = "";
      if (els.encodeCustomerMasterRemarks) els.encodeCustomerMasterRemarks.value = "";
    }

    function loadCustomerMasterIntoTransaction(name, overwrite = false) {
      const snapshot = getCustomerSnapshot(name);
      if (!snapshot || snapshot.source === "none") return false;
      if ((overwrite || !els.encodeCustomerAddress.value.trim()) && snapshot.address) els.encodeCustomerAddress.value = snapshot.address;
      if ((overwrite || !els.encodeCustomerTin.value.trim()) && snapshot.tin) els.encodeCustomerTin.value = snapshot.tin;
      if ((overwrite || !els.encodeRep.value.trim()) && snapshot.contactPerson) els.encodeRep.value = snapshot.contactPerson;
      if ((overwrite || !els.encodePaymentTerms.value || els.encodePaymentTerms.value === "30") && snapshot.paymentTerms) {
        els.encodePaymentTerms.value = String(snapshot.paymentTerms || "30");
        updateEncodeDueDate();
      }
      if ((overwrite || !els.encodeBankDetails.value.trim()) && snapshot.bankDetails) els.encodeBankDetails.value = snapshot.bankDetails;
      if ((overwrite || !els.encodeOtherRemarks.value.trim()) && snapshot.remarks) els.encodeOtherRemarks.value = snapshot.remarks;
      syncEncodePreview();
      setEncodeView("transaction");
      return true;
    }

    function saveCustomerMasterProfile() {
      const name = (els.encodeCustomerMasterName?.value || "").trim();
      if (!name) {
        alert("Customer name is required to save a profile.");
        return false;
      }
      const saved = upsertCustomerProfile({
        name,
        address: els.encodeCustomerMasterAddress?.value.trim() || "",
        tin: els.encodeCustomerMasterTin?.value.trim() || "",
        contactPerson: els.encodeCustomerMasterContact?.value.trim() || "",
        contactNumber: els.encodeCustomerMasterPhone?.value.trim() || "",
        email: els.encodeCustomerMasterEmail?.value.trim() || "",
        paymentTerms: Number(els.encodeCustomerMasterPaymentTerms?.value || 30),
        modeOfPayment: els.encodeCustomerMasterModePayment?.value.trim() || "",
        bankDetails: els.encodeCustomerMasterBankDetails?.value.trim() || "",
        remarks: els.encodeCustomerMasterRemarks?.value.trim() || "",
      });
      if (saved) toast(`Customer profile saved for ${name}.`, "success");
      return saved;
    }

    function applyCustomerMasterToTransaction() {
      const name = (els.encodeCustomerMasterName?.value || "").trim();
      if (!name) {
        alert("Enter a customer name in the customer profile section first.");
        return;
      }
      if (els.encodeCustomer) els.encodeCustomer.value = name;
      const applied = loadCustomerMasterIntoTransaction(name, true);
      if (els.encodeCustomerAddress && !els.encodeCustomerAddress.value.trim()) els.encodeCustomerAddress.value = els.encodeCustomerMasterAddress?.value.trim() || "";
      if (els.encodeCustomerTin && !els.encodeCustomerTin.value.trim()) els.encodeCustomerTin.value = els.encodeCustomerMasterTin?.value.trim() || "";
      if (els.encodeRep && !els.encodeRep.value.trim()) els.encodeRep.value = els.encodeCustomerMasterContact?.value.trim() || "";
      if (els.encodePaymentTerms) els.encodePaymentTerms.value = String(els.encodeCustomerMasterPaymentTerms?.value || 30);
      if (els.encodeBankDetails && !els.encodeBankDetails.value.trim()) els.encodeBankDetails.value = els.encodeCustomerMasterBankDetails?.value.trim() || "";
      if (els.encodeOtherRemarks && !els.encodeOtherRemarks.value.trim()) els.encodeOtherRemarks.value = els.encodeCustomerMasterRemarks?.value.trim() || "";
      updateEncodeDueDate();
      syncEncodePreview();
      setEncodeView("transaction");
      toast(applied ? `Customer details applied for ${name}.` : `Customer details prepared for ${name}.`, "success");
    }

    function clearEncodeForm() {
      if (!els.encodeForm) return;
      els.encodeForm.reset();
      clearCustomerMasterForm();
      els.encodeEditIndex.value = "";
      els.encodeDocType.value = state.settings.defaultDocType || "DR";
      els.encodeM1M2.value = "M1";
      els.encodeDate.value = todayISO();
      els.encodePoNumber.value = "";
      els.encodeCustomerAddress.value = "";
      els.encodeCustomerTin.value = "";
      els.encodeRep.value = "";
      els.encodePaymentTerms.value = String(state.settings.defaultPaymentTerms || "30");
      els.encodeDueDate.value = addDaysISO(todayISO(), Number(state.settings.defaultPaymentTerms || 30));
      els.encodeFreight.value = 0;
      els.encodeReturns.value = 0;
      els.encodeEwt.value = 0;
      els.encodePayment.value = 0;
      els.encodePaymentStatus.value = "Issued";
      els.encodeCheckNumber.value = "";
      els.encodeCheckBank.value = "";
      els.encodeCheckAmount.value = 0;
      els.encodeCheckDate.value = "";
      els.encodeCollectionReceiptNo.value = "";
      els.encodeBankDetails.value = "";
      els.encodeOtherRemarks.value = "";
      els.encodeStatus.value = "NOTDUE";
      if (els.encodeCancelBtn) els.encodeCancelBtn.disabled = true;
      setEncodeMode("new");
      setEncodeView("transaction");
      renderEncodeItemRows();
      syncEncodePreview();
    }

    function loadTxIntoEncodeForm(tx, editIndex = "") {
      if (!els.encodeForm) return;
      const itemRows = Array.isArray(tx?.items) && tx.items.length
        ? tx.items
        : tx
          ? [{ desc: tx.otherRemarks ? `Legacy: ${tx.otherRemarks}` : "Legacy amount", qty: 1, price: Number(tx.gross || 0), total: Number(tx.gross || 0) }]
          : emptyTxItems();
      els.encodeEditIndex.value = editIndex === "" ? "" : String(editIndex);
      els.encodeDocType.value = tx?.docType || state.settings.defaultDocType || "DR";
      els.encodeM1M2.value = tx?.m1m2 || "M1";
      if (els.encodeDocSection) els.encodeDocSection.value = tx?.section || "CHSI";
      els.encodeDate.value = tx?.date || todayISO();
      els.encodePoNumber.value = tx?.poNumber || "";
      els.encodeInvNo.value = tx?.invNo || "";
      els.encodeCustomer.value = tx?.customer || "";
      if (els.encodeCustomerMasterName) els.encodeCustomerMasterName.value = tx?.customer || "";
      els.encodeCustomerAddress.value = tx?.customerAddress || "";
      els.encodeCustomerTin.value = tx?.customerTin || "";
      els.encodeRep.value = tx?.representative || "";
      els.encodePaymentTerms.value = String(tx?.paymentTerms || state.settings.defaultPaymentTerms || 30);
      els.encodeFreight.value = tx?.freight ?? 0;
      els.encodeReturns.value = tx?.returnsDisc ?? 0;
      els.encodeEwt.value = tx?.ewt ?? 0;
      els.encodePayment.value = tx?.payment ?? 0;
      els.encodePaymentStatus.value = tx?.paymentStatus || "Issued";
      els.encodeCheckNumber.value = tx?.checkNumber || "";
      els.encodeCheckBank.value = tx?.checkBank || "";
      els.encodeCheckAmount.value = tx?.checkAmount ?? 0;
      els.encodeCheckDate.value = tx?.checkDate || "";
      els.encodeCollectionReceiptNo.value = tx?.collectionReceiptNo || "";
      els.encodeBankDetails.value = tx?.bankDetails || "";
      els.encodeOtherRemarks.value = tx?.otherRemarks || "";
      els.encodeStatus.value = tx?.isCancelled ? "NOTDUE" : (tx?.status || "NOTDUE");
      els.encodeDueDate.value = tx?.dueDate || addDaysISO(els.encodeDate.value || todayISO(), Number(els.encodePaymentTerms.value || 30));
      const hasEditableRecord = editIndex !== "" && !Number.isNaN(Number(editIndex));
      if (els.encodeCancelBtn) els.encodeCancelBtn.disabled = !hasEditableRecord || Boolean(tx?.isCancelled);
      const mode = tx?.isCancelled ? "cancelled" : "editing";
      const audit = auditSummary(tx);
      setEncodeMode(mode, `${tx?.invNo ? `Invoice # ${tx.invNo}` : "Loaded transaction"}${tx?.customer ? ` | ${tx.customer}` : ""}${audit ? ` | ${audit}` : ""}`);
      setEncodeView("transaction");
      renderEncodeItemRows(itemRows);
      syncCustomerMasterFromName();
      syncCustomerFieldsFromName();
      syncEncodePreview();
    }

    function updateEncodeDueDate() {
      const terms = Number(els.encodePaymentTerms?.value || 30);
      const base = els.encodeDate?.value || todayISO();
      if (els.encodeDueDate && (!els.encodeDueDate.value || els.encodeDueDate.dataset.auto !== "false")) {
        els.encodeDueDate.value = addDaysISO(base, terms);
      }
    }

    function handleEncodePaymentStatusChange() {
      if (els.encodePaymentStatus.value === "Cleared" && Number(els.encodeCheckAmount.value || 0) <= 0 && Number(els.encodePayment.value || 0) > 0) {
        els.encodeCheckAmount.value = els.encodePayment.value;
      }
      syncEncodePreview();
    }

    function buildEncodeDraft(editIndex) {
      const items = readEncodeItems();
      const freight = Number(els.encodeFreight.value || 0);
      const returnsDisc = Number(els.encodeReturns.value || 0);
      const ewt = Number(els.encodeEwt.value || 0);
      const gross = roundMoney(items.reduce((sum, item) => sum + Number(item.total || 0), 0));
      const netDeduction = roundMoney(gross + freight - returnsDisc);
      const netSales = roundMoney(netDeduction - ewt);
      const paymentRaw = Number(els.encodePayment.value || 0);
      const status = els.encodeStatus.value;
      if (status === "PARTIAL_PAYMENT" && paymentRaw <= 0) {
        return { error: "Partial Payment requires a payment amount greater than 0." };
      }
      if (status === "PARTIAL_PAYMENT" && paymentRaw >= netSales) {
        return { error: "Partial Payment must be less than Net Sales." };
      }
      const payment = status === "PAID" && paymentRaw <= 0 ? netSales : paymentRaw;
      if (els.encodeDate.value && els.encodeDueDate.value && els.encodeDueDate.value < els.encodeDate.value) {
        return { error: "Due Date must be the same as or later than the invoice date." };
      }
      if (payment > netSales && status !== "PAID") {
        return { error: "Payment cannot be greater than Net Sales unless the invoice is marked PAID." };
      }
      const draft = {
        docType: els.encodeDocType.value,
        m1m2: els.encodeM1M2.value,
        section: els.encodeDocSection?.value || "CHSI",
        date: els.encodeDate.value,
        poNumber: els.encodePoNumber.value.trim(),
        invNo: els.encodeInvNo.value.trim(),
        customer: els.encodeCustomer.value.trim(),
        customerAddress: els.encodeCustomerAddress.value.trim(),
        customerTin: els.encodeCustomerTin.value.trim(),
        items,
        gross,
        freight,
        returnsDisc,
        ewt,
        payment,
        paymentTerms: Number(els.encodePaymentTerms.value || 30),
        dueDate: els.encodeDueDate.value,
        paymentDate: els.encodeCheckDate.value || els.encodeDate.value,
        checkNumber: els.encodeCheckNumber.value.trim(),
        checkBank: els.encodeCheckBank.value.trim(),
        checkAmount: Number(els.encodeCheckAmount.value || 0),
        checkDate: els.encodeCheckDate.value,
        paymentStatus: els.encodePaymentStatus.value,
        collectionReceiptNo: els.encodeCollectionReceiptNo.value.trim(),
        bankDetails: els.encodeBankDetails.value.trim(),
        otherRemarks: els.encodeOtherRemarks.value.trim(),
        representative: els.encodeRep.value.trim(),
        status,
        createdAt: editIndex >= 0 && state.transactions[editIndex]?.createdAt ? state.transactions[editIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      lastAction: editIndex >= 0 ? "Updated in Encoding" : "Created in Encoding",
        lastActionAt: new Date().toISOString(),
      };
      const validationMessage = validateTransaction(draft, editIndex);
      if (validationMessage) return { error: validationMessage };
      return { draft };
    }

    function saveEncodeDraft(editIndex = -1) {
      const result = buildEncodeDraft(editIndex);
      if (result.error) {
        toast(result.error, "error");
        return false;
      }
      const now = new Date().toISOString();
      const previous = editIndex >= 0 ? state.transactions[editIndex] : null;
      if (editIndex >= 0) {
      state.transactions[editIndex] = { ...result.draft, updatedAt: now, lastAction: "Updated in Encoding", lastActionAt: now };
        syncCustomerProfileFromTransaction(result.draft);
      } else {
      state.transactions.unshift({ ...result.draft, createdAt: now, updatedAt: now, lastAction: "Created in Encoding", lastActionAt: now });
        syncCustomerProfileFromTransaction(result.draft);
      }
      recomputeAll();
      pushAuditLog({
        action: editIndex >= 0 ? "Updated invoice" : "Created invoice",
        invNo: result.draft.invNo,
        customer: result.draft.customer,
        actor: state.soaHeader.preparedBy || "Local user",
        detail: editIndex >= 0 ? `Updated invoice ${result.draft.invNo}` : `Created invoice ${result.draft.invNo}`,
        before: previous || {},
        after: result.draft,
        fields: ["docType", "m1m2", "date", "poNumber", "customer", "customerAddress", "customerTin", "gross", "freight", "returnsDisc", "ewt", "payment", "paymentTerms", "dueDate", "paymentStatus", "collectionReceiptNo", "bankDetails", "checkNumber", "checkBank", "checkAmount", "checkDate", "otherRemarks", "representative", "status"],
      });
      exportTransactionJson(state.transactions[editIndex >= 0 ? editIndex : 0], editIndex >= 0 ? "invoice-backup" : "invoice-new");
      toast(editIndex >= 0 ? `Invoice ${result.draft.invNo} updated successfully` : `Invoice ${result.draft.invNo} saved successfully`, "success");
      clearEncodeForm();
      return true;
    }

    function handleEncodeSubmit(e) {
      e.preventDefault();
      if (!getRolePermissions().canEncode) {
      showPermissionDenied("open Encoding");
        return;
      }
      const editIndex = els.encodeEditIndex.value === "" ? -1 : Number(els.encodeEditIndex.value);
      saveEncodeDraft(editIndex);
    }

    function handleEncodeCancelInvoice() {
      if (!getRolePermissions().canCancel) {
        showPermissionDenied("cancel an invoice");
        return;
      }
      const editIndex = els.encodeEditIndex.value === "" ? -1 : Number(els.encodeEditIndex.value);
      if (editIndex < 0 || !state.transactions[editIndex]) {
        toast("Open a transaction from Wholesale Sales Summary first.", "warning");
        return;
      }
      const tx = state.transactions[editIndex];
      if (tx.isCancelled) {
        toast("This invoice is already cancelled.", "warning");
        return;
      }
      cancelTransaction(tx.invNo, tx.cancellationReason || "");
      loadTxIntoEncodeForm(state.transactions[editIndex], editIndex);
      setEncodeMode("cancelled", `Invoice # ${tx.invNo} has been cancelled and remains open for review.`);
      toast(`Invoice ${tx.invNo} cancelled successfully`, "success");
    }

    function populateSoaTransactionSelect(rows) {
      if (!els.soaTransactionSelect) return;
      if (!rows.length) {
        els.soaTransactionSelect.innerHTML = `<option value="">No transactions</option>`;
        return;
      }
      els.soaTransactionSelect.innerHTML = rows.map((tx, index) => {
        const label = `${tx.invNo} | ${formatDate(tx.date)} | ${formatCurrency(tx.receivable || 0)}`;
        return `<option value="${index}">${escapeHtml(label)}</option>`;
      }).join("");
      els.soaTransactionSelect.value = "0";
    }

    function getSelectedSoaTransaction(rows) {
      const idx = Number(els.soaTransactionSelect?.value || 0);
      return rows[idx] || rows[0] || null;
    }

    function loadSoaTransactionIntoEditor(tx) {
      if (!tx) return;
      els.soaEditPayment.value = tx.payment ?? 0;
      els.soaEditPaymentDate.value = tx.paymentDate || tx.checkDate || tx.date || "";
      els.soaEditPaymentStatus.value = tx.paymentStatus || "Issued";
      els.soaEditCollectionReceiptNo.value = tx.collectionReceiptNo || "";
      els.soaEditBankDetails.value = tx.bankDetails || "";
      els.soaEditCheckNumber.value = tx.checkNumber || "";
      els.soaEditCheckBank.value = tx.checkBank || "";
      els.soaEditCheckAmount.value = tx.checkAmount ?? 0;
      els.soaEditCheckDate.value = tx.checkDate || "";
      els.soaEditOtherRemarks.value = tx.otherRemarks || "";
      els.soaCancellationReason.value = tx.cancellationReason || "";
    }

    function saveSelectedSoaTransaction() {
      const customer = els.soaCustomerSelect.value;
      const rows = state.transactions.filter((tx) => tx.customer === customer);
      const selected = getSelectedSoaTransaction(rows);
      if (!selected) {
        alert("Select a transaction first.");
        return;
      }
      const idx = state.transactions.findIndex((tx) => tx.invNo === selected.invNo);
      if (idx < 0) return;
      const now = new Date().toISOString();
      const previous = state.transactions[idx];
      const updated = computeTransaction({
        ...state.transactions[idx],
        payment: Number(els.soaEditPayment.value || 0),
        paymentDate: els.soaEditPaymentDate.value,
        paymentStatus: els.soaEditPaymentStatus.value,
        collectionReceiptNo: els.soaEditCollectionReceiptNo.value.trim(),
        bankDetails: els.soaEditBankDetails.value.trim(),
        checkNumber: els.soaEditCheckNumber.value.trim(),
        checkBank: els.soaEditCheckBank.value.trim(),
        checkAmount: Number(els.soaEditCheckAmount.value || 0),
        checkDate: els.soaEditCheckDate.value,
        otherRemarks: els.soaEditOtherRemarks.value.trim(),
      });
      updated.updatedAt = now;
      updated.lastAction = "Edited in SOA";
      updated.lastActionAt = now;
      state.transactions[idx] = updated;
      syncCustomerProfileFromTransaction(updated);
      recomputeAll();
      generateSoa(customer, false);
      pushAuditLog({
        action: "Updated invoice",
        invNo: selected.invNo,
        customer: selected.customer || "",
        actor: state.soaHeader.preparedBy || "Local user",
        detail: `Updated invoice ${selected.invNo} in SOA`,
        before: previous,
        after: updated,
        fields: ["payment", "paymentDate", "paymentStatus", "collectionReceiptNo", "bankDetails", "checkNumber", "checkBank", "checkAmount", "checkDate", "otherRemarks"],
      });
      exportTransactionJson(updated, "invoice-backup");
      toast(`Invoice ${selected.invNo} updated successfully in SOA`, "success");
    }

    function cancelSelectedSoaInvoice() {
      const customer = els.soaCustomerSelect.value;
      const rows = state.transactions.filter((tx) => tx.customer === customer);
      const selected = getSelectedSoaTransaction(rows);
      if (!selected) {
        toast("Select a transaction first.", "warning");
        return;
      }
      cancelTransaction(selected.invNo, els.soaCancellationReason.value.trim());
    }

    function cancelTransaction(invNo, reason = "") {
      const idx = state.transactions.findIndex((tx) => tx.invNo === invNo);
      if (idx < 0) return;
      const previous = state.transactions[idx];
      const cancellationReason = reason || prompt(`Reason for cancelling invoice ${invNo}:`, state.transactions[idx].cancellationReason || "");
      if (cancellationReason === null) return;
      const trimmedReason = String(cancellationReason || "").trim();
      if (!trimmedReason) {
        alert("Cancellation reason is required.");
        return;
      }
      const now = new Date().toISOString();
      state.transactions[idx] = {
        ...state.transactions[idx],
        isCancelled: true,
        cancellationReason: trimmedReason,
        status: "CANCELLED",
        updatedAt: now,
        lastAction: "Cancelled",
        lastActionAt: now,
      };
      syncCustomerProfileFromTransaction(state.transactions[idx]);
      recomputeAll();
      pushAuditLog({
        action: "Cancelled invoice",
        invNo,
        customer: state.transactions[idx].customer || "",
        actor: state.soaHeader.preparedBy || "Local user",
        detail: `Cancelled invoice ${invNo}; Reason: ${trimmedReason}`,
        before: previous,
        after: state.transactions[idx],
        fields: ["status", "isCancelled", "cancellationReason", "updatedAt", "lastAction", "lastActionAt"],
      });
      exportTransactionJson(state.transactions[idx], "invoice-cancelled");
      toast(`Invoice ${invNo} cancelled successfully`, "success");
    }

    function computeDraftReceivable(values) {
      const gross = Number(values.gross || 0);
      const freight = Number(values.freight || 0);
      const returnsDisc = Number(values.returnsDisc || 0);
      const ewt = Number(values.ewt || 0);
      const payment = Number(values.payment || 0);
      const netSales = gross + freight - returnsDisc - ewt;
      return Math.max(netSales - payment, 0);
    }

    function syncEncodePreview() {
      if (!els.encodeForm) return;
      const customer = (els.encodeCustomer?.value || "").trim();
      const gross = Number(els.encodeGross?.value || 0);
      const freight = Number(els.encodeFreight?.value || 0);
      const returnsDisc = Number(els.encodeReturns?.value || 0);
      const ewt = Number(els.encodeEwt?.value || 0);
      const paymentRaw = Number(els.encodePayment?.value || 0);
      const status = els.encodeStatus?.value || "NOTDUE";
      const netAmount = roundMoney(gross - returnsDisc);
      const netDeduction = roundMoney(gross + freight - returnsDisc);
      const netSales = roundMoney(netDeduction - ewt);
      let payment = status === "PAID" && paymentRaw <= 0 ? netSales : paymentRaw;
      if (status === "PAID" && paymentRaw <= 0 && netSales > 0) {
        els.encodePayment.value = netSales.toFixed(2);
        payment = netSales;
      }
      const receivable = Math.max(netSales - payment, 0);
      if (els.encodePaymentHelper) {
        if (status === "PAID" && netSales > 0) {
          els.encodePaymentHelper.textContent = `Fully paid \u2014 ${formatCurrency(payment)}`;
          els.encodePaymentHelper.className = "encode-payment-helper is-paid";
        } else if (status === "PARTIAL_PAYMENT" && payment > 0 && netSales > 0) {
          els.encodePaymentHelper.textContent = `${formatCurrency(payment)} paid out of ${formatCurrency(netSales)} \u2014 Balance: ${formatCurrency(receivable)}`;
          els.encodePaymentHelper.className = "encode-payment-helper is-partial";
        } else if (status === "PARTIAL_PAYMENT") {
          els.encodePaymentHelper.textContent = "Enter a payment amount greater than 0 for partial payment.";
          els.encodePaymentHelper.className = "encode-payment-helper is-muted";
        } else {
          els.encodePaymentHelper.textContent = "";
          els.encodePaymentHelper.className = "encode-payment-helper";
        }
      }
      const items = readEncodeItems();
      const itemCount = items.length;
      const productTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const hasBaseDetails = Boolean((els.encodeDate?.value || "") && (els.encodeInvNo?.value || "").trim() && customer && (els.encodeDueDate?.value || ""));
      const hasItems = itemCount > 0 && productTotal > 0;
      const hasPaymentReview = hasBaseDetails && hasItems;
      if (els.encodePreviewCustomer) els.encodePreviewCustomer.textContent = customer || "Select or enter customer";
      if (els.encodePreviewReceivable) els.encodePreviewReceivable.textContent = formatCurrency(receivable);
      if (els.encodePreviewStatus) els.encodePreviewStatus.textContent = status || "NOTDUE";
      if (els.encodeSummaryGross) els.encodeSummaryGross.textContent = formatCurrency(gross);
      if (els.encodeSummaryReturns) els.encodeSummaryReturns.textContent = formatCurrency(returnsDisc);
      if (els.encodeSummaryNetAmount) els.encodeSummaryNetAmount.textContent = formatCurrency(netAmount);
      if (els.encodeSummaryFreight) els.encodeSummaryFreight.textContent = formatCurrency(freight);
      if (els.encodeSummaryNetDeduction) els.encodeSummaryNetDeduction.textContent = formatCurrency(netDeduction);
      if (els.encodeSummaryEwt) els.encodeSummaryEwt.textContent = formatCurrency(ewt);
      if (els.encodeSummaryPayment) els.encodeSummaryPayment.textContent = formatCurrency(payment);
      if (els.encodeSummaryNetSales) els.encodeSummaryNetSales.textContent = formatCurrency(netSales);
      if (els.encodeItemCountBadge) els.encodeItemCountBadge.textContent = `${itemCount} item line${itemCount === 1 ? "" : "s"}`;
      if (els.encodeProductTotalBadge) els.encodeProductTotalBadge.textContent = `${formatCurrency(productTotal)} total`;
      if (els.encodeItemsEmptyState) els.encodeItemsEmptyState.classList.toggle("is-visible", !hasItems);
      if (els.encodeRemarksCount) {
        const len = (els.encodeOtherRemarks?.value || "").length;
        els.encodeRemarksCount.textContent = `${len} / 500`;
      }
      if (els.encodeStatusPreviewBadge) {
        els.encodeStatusPreviewBadge.textContent = status;
        els.encodeStatusPreviewBadge.className = "encode-soft-badge";
        if (status === "PAID") els.encodeStatusPreviewBadge.classList.add("is-paid");
        if (status === "PASTDUE") els.encodeStatusPreviewBadge.classList.add("is-pastdue");
        if (status === "PARTIAL_PAYMENT") els.encodeStatusPreviewBadge.classList.add("is-partial");
      }
      if (els.encodeReadinessText) {
        els.encodeReadinessText.textContent = hasPaymentReview
          ? "Ready for payment review and saving"
          : hasBaseDetails
            ? "Add at least one valid product line"
            : "Complete required document and customer fields";
      }
      if (els.encodeWorkflowHint) {
        els.encodeWorkflowHint.textContent = hasPaymentReview
          ? `Review ${formatCurrency(netSales)} net sales and ${formatCurrency(receivable)} receivable before saving.`
          : hasBaseDetails
            ? "Document details are ready. Add products to compute gross sales and net sales."
            : "Start with document details, add products, then review the summary before saving.";
      }
      const steps = document.querySelectorAll("[data-encode-step]");
      steps.forEach((step) => {
        const n = Number(step.dataset.encodeStep || 0);
        step.classList.toggle("completed", (n === 1 && hasBaseDetails) || (n === 2 && hasItems) || (n === 3 && hasPaymentReview));
        step.classList.toggle("active", (n === 1 && !hasBaseDetails) || (n === 2 && hasBaseDetails && !hasItems) || (n === 3 && hasBaseDetails && hasItems && !receivable && status !== "PAID") || (n === 4 && hasPaymentReview));
      });
    }

    function closeTxModal() {
      els.txModalOverlay.classList.remove("open");
      els.txModalOverlay.setAttribute("aria-hidden", "true");
    }

    function resetTxForm() {
      openTxModal(null);
    }

    function deleteTransaction(invNo) {
      if (!confirm(`Delete transaction ${invNo}?`)) return;
      state.transactions = state.transactions.filter((tx) => tx.invNo !== invNo);
      recomputeAll();
      toast(`Transaction ${invNo} deleted successfully`, "success");
    }

    function validateTransaction(formData, editIndex) {
      if (!formData.docType || !formData.m1m2 || !formData.date || !formData.invNo || !formData.customer || !formData.dueDate) {
        return "Please complete all required fields.";
      }
      if (String(formData.customer).trim().length < 2) return "Customer name is too short.";
      if (!/^[A-Za-z0-9][A-Za-z0-9\-\/_. ]{0,24}$/.test(String(formData.invNo).trim())) return "Invoice # must be 1-25 characters and may only contain letters, numbers, spaces, -, /, _, or .";
      if (formData.poNumber && !/^[A-Za-z0-9][A-Za-z0-9\-\/_. ]{0,24}$/.test(String(formData.poNumber).trim())) return "PO # contains invalid characters.";
      if (Number(formData.gross) <= 0) return "Gross Sales must be greater than 0.";
      if (![7, 15, 30].includes(Number(formData.paymentTerms || 0))) return "Payment Terms must be 7, 15, or 30 days.";
      if (String(formData.invNo).trim().length < 1) return "Invoice # is required.";
      if (formData.dueDate < formData.date) return "Due Date must be the same as or later than the invoice date.";
      if (formData.paymentDate && formData.paymentDate < formData.date) return "Payment Date cannot be earlier than the invoice date.";
      if (formData.checkDate && formData.checkDate < formData.date) return "Check Date cannot be earlier than the invoice date.";
      if (formData.paymentStatus === "Cleared" && !String(formData.checkNumber || "").trim()) return "Check Number is required when the payment status is Cleared.";
      if (!Array.isArray(formData.items) || !formData.items.length) return "Add at least one product line.";
      const itemHasIssue = formData.items.some((item) => !String(item.desc || "").trim() || Number(item.qty || 0) <= 0 || Number(item.price || 0) <= 0);
      if (itemHasIssue) return "Each product line needs a description, quantity, and unit price greater than 0.";
      const netSales = roundMoney(Number(formData.gross || 0) + Number(formData.freight || 0) - Number(formData.returnsDisc || 0) - Number(formData.ewt || 0));
      const payment = Number(formData.payment || 0);
      if (payment < 0) return "Payment cannot be negative.";
      if (payment > netSales) return "Payment cannot be greater than Net Sales.";
      if (formData.status === "PARTIAL_PAYMENT" && payment <= 0) return "Partial Payment requires a payment amount greater than 0.";
      if (formData.status === "PARTIAL_PAYMENT" && payment >= netSales) return "Partial Payment must be less than Net Sales.";
      if (formData.status === "PAID" && payment < netSales) return "Paid invoices must cover the full Net Sales amount.";
      if (formData.paymentStatus === "Bounced" && !String(formData.checkNumber || "").trim()) return "Bounced checks must have a Check Number.";
      const duplicate = state.transactions.some((tx, idx) => tx.invNo === formData.invNo && idx !== editIndex);
      if (duplicate) return "Invoice # must be unique.";
      return "";
    }

    function handleTxSubmit(e) {
      e.preventDefault();
      if (!getRolePermissions().canEncode) {
        showPermissionDenied("encode a transaction");
        return;
      }
      const editIndex = els.editIndex.value === "" ? -1 : Number(els.editIndex.value);
      const gross = Number(els.txGross.value || 0);
      const freight = Number(els.txFreight.value || 0);
      const returnsDisc = Number(els.txReturns.value || 0);
      const ewt = Number(els.txEwt.value || 0);
      const baseNetSales = gross + freight - returnsDisc - ewt;
      const paymentRaw = Number(els.txPayment.value || 0);
      const status = els.txStatus.value;
      if (status === "PARTIAL_PAYMENT" && paymentRaw <= 0) {
        alert("Partial Payment requires a payment amount greater than 0.");
        return;
      }
      if (status === "PARTIAL_PAYMENT" && paymentRaw >= baseNetSales) {
        alert("Partial Payment must be less than Net Sales.");
        return;
      }
      const payment = status === "PAID" && paymentRaw <= 0 ? baseNetSales : paymentRaw;

      const draft = {
        docType: "DR",
        m1m2: "M1",
        date: els.txDate.value,
        poNumber: "",
        invNo: els.txInvNo.value.trim(),
        customer: els.txCustomer.value.trim(),
        customerAddress: "",
        customerTin: "",
        items: [{ desc: "Legacy entry", qty: 1, price: gross, total: gross }],
        gross,
        freight,
        returnsDisc,
        ewt,
        payment,
        paymentTerms: 30,
        dueDate: els.txDueDate.value,
        paymentStatus: "Issued",
        collectionReceiptNo: "",
        bankDetails: "",
        checkNumber: "",
        checkBank: "",
        checkAmount: 0,
        checkDate: "",
        otherRemarks: "",
        representative: "",
        status,
      };
      const validationMessage = validateTransaction(draft, editIndex);
      if (validationMessage) {
        alert(validationMessage);
        return;
      }

      const previous = editIndex >= 0 ? state.transactions[editIndex] : null;
      if (editIndex >= 0) {
        state.transactions[editIndex] = { ...draft, updatedAt: new Date().toISOString(), lastAction: "Updated in Transaction Details", lastActionAt: new Date().toISOString() };
      } else {
        const now = new Date().toISOString();
        state.transactions.unshift({ ...draft, createdAt: now, updatedAt: now, lastAction: "Created in Transaction Details", lastActionAt: now });
      }
      syncCustomerProfileFromTransaction(draft);
      closeTxModal();
      recomputeAll();
      pushAuditLog({
        action: editIndex >= 0 ? "Updated invoice" : "Created invoice",
        invNo: draft.invNo,
        customer: draft.customer,
        actor: state.soaHeader.preparedBy || "Local user",
        detail: editIndex >= 0 ? `Updated invoice ${draft.invNo} from Transaction Details` : `Created invoice ${draft.invNo} from Transaction Details`,
        before: previous || {},
        after: draft,
        fields: ["docType", "m1m2", "date", "poNumber", "customer", "customerAddress", "customerTin", "gross", "freight", "returnsDisc", "ewt", "payment", "paymentTerms", "dueDate", "paymentStatus", "collectionReceiptNo", "bankDetails", "checkNumber", "checkBank", "checkAmount", "checkDate", "otherRemarks", "representative", "status"],
      });
      toast(editIndex >= 0 ? `Invoice ${draft.invNo} updated successfully` : `Invoice ${draft.invNo} saved successfully`, "success");
      clearEncodeForm();
    }


    function getSoaAsOfDate() {
      const raw = els.soaAsOfDate?.value || todayISO();
      const date = parseDate(raw);
      return Number.isFinite(date.getTime()) ? date : new Date();
    }

    function getSoaDateFilteredRows(customer) {
      const dateFrom = els.soaDateFrom?.value || "";
      const dateTo = els.soaDateTo?.value || "";
      const sectionFilter = document.getElementById("soaSectionFilter")?.value || "ALL";
      return state.transactions
        .filter((tx) => tx.customer === customer)
        .filter((tx) => sectionFilter === "ALL" || tx.section === sectionFilter)
        .filter((tx) => !dateFrom || String(tx.date || "") >= dateFrom)
        .filter((tx) => !dateTo || String(tx.date || "") <= dateTo)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function getSoaModernStatus(tx, asOfDate = getSoaAsOfDate()) {
      const due = parseDate(tx?.dueDate || "");
      const dueValid = Number.isFinite(due.getTime());
      const daysPastDue = dueValid ? Math.floor((asOfDate - due) / 86400000) : 0;
      if (tx?.isCancelled) return { label: "Cancelled", className: "cancelled", daysPastDue };
      if (tx?.status === "PAID") return { label: "Paid", className: "paid", daysPastDue };
      if (tx?.status === "PARTIAL_PAYMENT") return { label: daysPastDue > 0 ? "Partial / Past Due" : "Partial", className: "partial", daysPastDue };
      if (tx?.status === "PASTDUE" || daysPastDue > 0) return { label: "Past Due", className: "pastdue", daysPastDue };
      if (tx?.status === "ADJUSTED") return { label: "Adjusted", className: "adjusted", daysPastDue };
      return { label: "Open", className: "open", daysPastDue };
    }

    function getFilteredModernSoaRows() {
      const rows = (state.currentSoaRows && state.currentSoaRows.length) ? state.currentSoaRows.slice() : (state.transactions || []).slice();
      const query = normalize(els.soaTransactionSearch?.value || "");
      const show = els.soaShowFilter?.value || "all";
      return rows.filter((tx) => {
        const status = getSoaModernStatus(tx);
        const haystack = normalize([
          tx.date,
          tx.docType,
          tx.invNo,
          tx.poNumber,
          tx.customer,
          tx.collectionReceiptNo,
          tx.paymentStatus,
          tx.otherRemarks,
          status.label,
        ].join(" "));
        if (query && !haystack.includes(query)) return false;
        if (show === "paid") return status.className === "paid";
        if (show === "pastdue") return status.className === "pastdue" || status.label.toLowerCase().includes("past due");
        if (show === "open") return status.className !== "paid" && status.className !== "cancelled";
        return true;
      });
    }

    function renderSoaModernRows() {
      if (!els.soaModernBody) return;
      const rows = getFilteredModernSoaRows();
      if (!rows.length) {
        const hasCustomer = els.soaCustomerSelect?.value;
        const msg = hasCustomer ? "No transactions match the selected SOA filters." : "Select a customer or search to view transactions.";
        els.soaModernBody.innerHTML = `<tr><td colspan="10" class="empty-state">${msg}</td></tr>`;
      } else {
        els.soaModernBody.innerHTML = rows.map((tx) => {
          const status = getSoaModernStatus(tx);
          const debit = Number(tx.netDeduction ?? tx.netSales ?? tx.gross ?? 0);
          const credit = Number(tx.payment || 0);
          const balance = Math.max(Number(tx.receivable || 0), 0);
          const desc = tx.isCancelled
            ? `Cancelled invoice${tx.cancellationReason ? ` - ${tx.cancellationReason}` : ""}`
            : credit > 0 && balance <= 0
              ? `Payment received${tx.collectionReceiptNo ? ` - ${tx.collectionReceiptNo}` : ""}`
              : `Invoice for supplies and materials${tx.poNumber ? ` - PO ${tx.poNumber}` : ""}`;
          return `
            <tr data-soa-modern-inv="${escapeHtml(tx.invNo || "")}">
              <td>${escapeHtml(formatDate(tx.date))}</td>
              <td><span class="doc-pill">${escapeHtml(formatDocTypeLabel(tx.docType || "DR"))}</span></td>
              <td>${escapeHtml(tx.invNo || tx.poNumber || "-")}</td>
              <td>${escapeHtml(desc)}</td>
              <td class="num">${escapeHtml(formatCurrency(debit))}</td>
              <td class="num">${credit ? escapeHtml(formatCurrency(credit)) : "—"}</td>
              <td class="num">${escapeHtml(formatCurrency(balance))}</td>
              <td><span class="soa-modern-status ${status.className}">${escapeHtml(status.label)}</span></td>
              <td><button class="soa-action-dot" type="button" aria-label="Load ${escapeHtml(tx.invNo || "transaction")}" data-soa-load-inv="${escapeHtml(tx.invNo || "")}">⋮</button></td>
            </tr>`;
        }).join("");
      }
      if (els.soaModernCount) {
        const total = state.currentSoaRows?.length || 0;
        els.soaModernCount.textContent = `Showing ${rows.length} of ${total} transaction${total === 1 ? "" : "s"}`;
      }
      if (els.soaModernRange) {
        const from = els.soaDateFrom?.value ? formatDate(els.soaDateFrom.value) : "first record";
        const to = els.soaDateTo?.value ? formatDate(els.soaDateTo.value) : "latest record";
        els.soaModernRange.textContent = `Date range: ${from} to ${to}`;
      }
    }

    function renderSoaModernDashboard(customer, rows, totals) {
      const snapshot = getCustomerSnapshot(customer);
      if (els.soaModernCustomerName) els.soaModernCustomerName.textContent = customer || "Select customer";
      if (els.soaModernAddress) els.soaModernAddress.textContent = state.soaHeader.address || snapshot.address || "-";
      if (els.soaModernTin) els.soaModernTin.textContent = snapshot.tin || rows?.[0]?.customerTin || "000-000-000-000";
      if (els.soaModernEmail) els.soaModernEmail.textContent = state.soaHeader.email || snapshot.email || state.settings.companyEmail || "-";
      if (els.soaModernPhone) els.soaModernPhone.textContent = state.settings.companyPhone || "02-8-242-5511 to 18";
      state.currentSoaRows = rows || [];
      state.currentSoaTotals = totals || {};
      renderSoaModernRows();
    }

    function setSoaActiveTab(tab) {
      state.soaActiveTab = tab || "transactions";
      if (els.soaModernTabs) {
        els.soaModernTabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.soaTab === state.soaActiveTab));
      }
      if (els.soaModernTransactionsPanel) els.soaModernTransactionsPanel.style.display = state.soaActiveTab === "transactions" ? "block" : "none";
      if (els.soaPrintPanel) els.soaPrintPanel.style.display = state.soaActiveTab === "editor" ? "none" : "block";
      if (els.soaEditorPanel) els.soaEditorPanel.style.display = state.soaActiveTab === "print" ? "none" : "block";
    }

    function exportSoaCsv() {
      const rows = getFilteredModernSoaRows().map((tx) => {
        const status = getSoaModernStatus(tx);
        return {
          Date: tx.date || "",
          "Document Type": formatDocTypeLabel(tx.docType || "DR"),
          "Invoice #": tx.invNo || "",
          "PO #": tx.poNumber || "",
          Customer: tx.customer || "",
          "Debit Sales": Number(tx.netDeduction ?? tx.netSales ?? tx.gross ?? 0).toFixed(2),
          "Credit Payment": Number(tx.payment || 0).toFixed(2),
          Balance: Math.max(Number(tx.receivable || 0), 0).toFixed(2),
          Status: status.label,
          "Due Date": tx.dueDate || "",
          "Payment Date": tx.paymentDate || "",
          "Collection Receipt #": tx.collectionReceiptNo || "",
        };
      });
      exportCsv(rows, `statement-of-account-${normalize(state.selectedCustomer || "customer") || "customer"}-${todayISO()}.csv`);
    }

    function exportSoaXlsx() {
      const rows = getFilteredModernSoaRows().map((tx) => {
        const status = getSoaModernStatus(tx);
        return {
          Date: tx.date || "",
          "Document Type": formatDocTypeLabel(tx.docType || "DR"),
          "Invoice #": tx.invNo || "",
          "PO #": tx.poNumber || "",
          Customer: tx.customer || "",
          "Debit Sales": Number(tx.netDeduction ?? tx.netSales ?? tx.gross ?? 0).toFixed(2),
          "Credit Payment": Number(tx.payment || 0).toFixed(2),
          Balance: Math.max(Number(tx.receivable || 0), 0).toFixed(2),
          Status: status.label,
          "Due Date": tx.dueDate || "",
          "Payment Date": tx.paymentDate || "",
          "Collection Receipt #": tx.collectionReceiptNo || "",
        };
      });
      exportXlsx(rows, `statement-of-account-${normalize(state.selectedCustomer || "customer") || "customer"}-${todayISO()}.xlsx`, "SOA");
    }

    function generateSoa(customerName, announce = true) {
      const customer = customerName || els.soaCustomerSelect.value;
      state.selectedCustomer = customer;
      const rows = getSoaDateFilteredRows(customer);
      state.currentSoaRows = rows;
      const todayLabel = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "2-digit" });
      const printStamp = new Date().toLocaleString("en-PH");
      state.soaHeader.customer = customer || "";
      els.soaCustomerName.textContent = customer || "-";
      els.soaCustomerAddress.textContent = state.soaHeader.address;
      els.soaTerms.textContent = state.soaHeader.terms;
      els.soaModePayment.textContent = state.soaHeader.modePayment;
      els.soaEmail.textContent = state.soaHeader.email;
      els.soaNo.textContent = state.soaHeader.soaNo;
      els.soaStatementDate.textContent = todayLabel;
      if (els.soaPreparedBy) els.soaPreparedBy.value = state.soaHeader.preparedBy || "";
      if (els.soaApprovedBy) els.soaApprovedBy.value = state.soaHeader.approvedBy || "";
      els.soaEditCustomer.value = state.soaHeader.customer;
      els.soaEditAddress.value = state.soaHeader.address;
      els.soaEditTerms.value = state.soaHeader.terms;
      els.soaEditMode.value = state.soaHeader.modePayment;
      els.soaEditEmail.value = state.soaHeader.email;
      els.soaEditNo.value = state.soaHeader.soaNo;
      if (els.soaPrintCompany) els.soaPrintCompany.textContent = state.settings.companyName || DEFAULT_SETTINGS.companyName;
      if (els.soaPrintMeta) {
        els.soaPrintMeta.textContent = `Customer: ${customer || "-"} | SOA No.: ${state.soaHeader.soaNo || "-"} | Generated: ${printStamp}`;
      }
      if (els.soaPrintPreparedBy) els.soaPrintPreparedBy.textContent = state.soaHeader.preparedBy || state.settings.defaultPreparedBy || "-";
      if (els.soaPrintApprovedBy) els.soaPrintApprovedBy.textContent = state.soaHeader.approvedBy || state.settings.defaultApprovedBy || "-";
      els.soaPreviewCustomer.textContent = customer || "-";
      applySoaLogoPreview();
      populateSoaTransactionSelect(rows);
      loadSoaTransactionIntoEditor(getSelectedSoaTransaction(rows));
      if (!rows.length) {
        els.soaBody.innerHTML = `<tr><td colspan="17" class="empty-state">No transactions found for this customer.</td></tr>`;
        setSoaTotals({
          paid: 0,
          notDue: 0,
          pastDue: 0,
          totalUnpaid: 0,
          age1to30: 0,
          age30to60: 0,
          age60plus: 0,
          ageTotalPastDue: 0,
          gross: 0,
          returns: 0,
          net: 0,
          paidTotal: 0,
          balance: 0,
        });
        renderSoaModernDashboard(customer, rows, { gross: 0, returns: 0, net: 0, paidTotal: 0, balance: 0, pastDue: 0, notDue: 0 });
        if (announce) toast("No transactions found for the selected customer.");
        return;
      }

      const today = getSoaAsOfDate();
      const totals = {
        paid: 0,
        notDue: 0,
        pastDue: 0,
        totalUnpaid: 0,
        age1to30: 0,
        age30to60: 0,
        age60plus: 0,
        ageTotalPastDue: 0,
        gross: 0,
        returns: 0,
        net: 0,
        paidTotal: 0,
        balance: 0,
      };
      els.soaBody.innerHTML = rows.map((tx, index) => {
        const gross = Number(tx.gross || 0);
        const returnsDisc = Number(tx.returnsDisc || 0);
        const netAmount = Number(tx.netDeduction || 0);
        const credit = Number(tx.payment || 0);
        const balance = Math.max(Number(tx.receivable || 0), 0);
        const due = parseDate(tx.dueDate);
        const dueValid = Number.isFinite(due.getTime());
        const daysPastDue = dueValid ? Math.floor((today - due) / 86400000) : 0;
        const remainingDays = dueValid ? Math.max(Math.ceil((due - today) / 86400000), 0) : 0;
        const statusText = tx.isCancelled ? "CANCELLED" : (tx.status === "PAID" ? "PAID" : tx.status === "PARTIAL_PAYMENT" ? "PARTIAL PAYMENT" : tx.status === "PASTDUE" ? "PAST DUE" : "NOT DUE");
        const stateClass = tx.isCancelled ? "pay-state-cancelled" : (tx.status === "PAID" ? "pay-state-paid" : tx.status === "PARTIAL_PAYMENT" ? "pay-state-partial" : tx.status === "PASTDUE" ? "pay-state-pastdue" : "pay-state-notdue");
        const ageLabel = tx.isCancelled ? "CANCELLED" : (daysPastDue > 0 ? `${daysPastDue} DAYS PAST DUE` : `${remainingDays} DAYS REMAINING`);
        if (!tx.isCancelled) {
          totals.gross += gross;
          totals.returns += returnsDisc;
          totals.net += netAmount;
          totals.paidTotal += credit;
          totals.balance += balance;
          if (tx.status === "PAID") totals.paid += balance;
          if (tx.status === "NOTDUE" || tx.status === "PARTIAL_PAYMENT") totals.notDue += balance;
          if (tx.status === "PASTDUE" || (tx.status === "PARTIAL_PAYMENT" && daysPastDue > 0)) {
            totals.pastDue += balance;
            totals.ageTotalPastDue += balance;
            if (daysPastDue >= 1 && daysPastDue <= 30) totals.age1to30 += balance;
            else if (daysPastDue >= 31 && daysPastDue <= 60) totals.age30to60 += balance;
            else if (daysPastDue > 60) totals.age60plus += balance;
          }
        }
        const rowClass = tx.isCancelled ? "row-cancelled" : "";
        return `
          <tr class="${rowClass}" data-soa-index="${index}" data-invno="${escapeHtml(tx.invNo)}">
            <td>${escapeHtml(formatDate(tx.date))}</td>
            <td>${escapeHtml(tx.invNo)}</td>
            <td>${escapeHtml(tx.poNumber || "")}</td>
            <td class="num">${escapeHtml(formatCurrency(gross))}</td>
            <td class="num">${escapeHtml(formatCurrency(returnsDisc))}</td>
            <td class="num">${escapeHtml(formatCurrency(netAmount))}</td>
            <td>${escapeHtml(formatDate(tx.dueDate))}</td>
            <td>${escapeHtml(tx.paymentDate || "")}</td>
            <td>${escapeHtml(tx.collectionReceiptNo || "")}</td>
            <td class="num">${escapeHtml(formatCurrency(credit))}</td>
            <td class="age-cell">${escapeHtml(ageLabel)}</td>
            <td class="pay-state ${stateClass}">${escapeHtml(statusText)}</td>
            <td class="num">${escapeHtml(formatCurrency(balance))}</td>
              <td class="num">${escapeHtml(tx.status === "PASTDUE" && !tx.isCancelled && daysPastDue >= 1 && daysPastDue <= 30 ? formatCurrency(balance) : "")}</td>
              <td class="num">${escapeHtml(tx.status === "PASTDUE" && !tx.isCancelled && daysPastDue >= 31 && daysPastDue <= 60 ? formatCurrency(balance) : "")}</td>
              <td class="num">${escapeHtml(tx.status === "PASTDUE" && !tx.isCancelled && daysPastDue > 60 ? formatCurrency(balance) : "")}</td>
            <td class="num">${escapeHtml(tx.status === "NOTDUE" && !tx.isCancelled ? formatCurrency(balance) : "")}</td>
          </tr>
        `;
      }).join("");
      setSoaTotals(totals);
      renderSoaModernDashboard(customer, rows, totals);
      if (announce) toast(`Statement generated for ${customer}.`);
    }

    function openCustomerSoa(customerName) {
      const customer = String(customerName || "").trim();
      if (!customer) {
        toast("Select a customer first.", "warning");
        return;
      }
      setActiveTab("soaSection");
      if (els.soaCustomerSelect) {
        els.soaCustomerSelect.value = customer;
      }
      generateSoa(customer, true);
      if (els.soaTransactionSelect) {
        els.soaTransactionSelect.focus({ preventScroll: true });
      }
    }

    function setSoaTotals(totals) {
      els.soaPaidTotal.textContent = formatCurrency(totals.paid || 0);
      els.soaNotDueTotal.textContent = formatCurrency(totals.notDue || 0);
      els.soaPastDueTotal.textContent = formatCurrency(totals.pastDue || 0);
      els.soaTotalUnpaid.textContent = formatCurrency(totals.totalUnpaid || ((totals.notDue || 0) + (totals.pastDue || 0)));
      els.soaAge1to30.textContent = formatCurrency(totals.age1to30 || 0);
      els.soaAge30to60.textContent = formatCurrency(totals.age30to60 || 0);
      els.soaAge60plus.textContent = formatCurrency(totals.age60plus || 0);
      els.soaAgeTotalPastDue.textContent = formatCurrency(totals.ageTotalPastDue || 0);
      if (els.soaTotGross) els.soaTotGross.textContent = formatCurrency(totals.gross || 0);
      if (els.soaTotReturns) els.soaTotReturns.textContent = formatCurrency(totals.returns || 0);
      if (els.soaTotNet) els.soaTotNet.textContent = formatCurrency(totals.net || 0);
      if (els.soaTotPaid) els.soaTotPaid.textContent = formatCurrency(totals.paidTotal || 0);
      if (els.soaTotBalance) els.soaTotBalance.textContent = formatCurrency(totals.balance || 0);
      if (els.soaMetricPastDue) els.soaMetricPastDue.textContent = formatCurrency(totals.pastDue || 0);
      if (els.soaBucket1) els.soaBucket1.textContent = formatCurrency(totals.age1to30 || 0);
      if (els.soaBucket2) els.soaBucket2.textContent = formatCurrency(totals.age30to60 || 0);
      if (els.soaBucket3) els.soaBucket3.textContent = formatCurrency(totals.age60plus || 0);
      if (els.soaBucket4) els.soaBucket4.textContent = formatCurrency(totals.notDue || 0);
      els.soaPreviewBalance.textContent = formatCurrency(totals.balance || 0);
      if (els.soaBottomTotal) els.soaBottomTotal.textContent = formatCurrency(totals.totalUnpaid || ((totals.notDue || 0) + (totals.pastDue || 0)));
      if (els.soaBottomPastDue) els.soaBottomPastDue.textContent = formatCurrency(totals.pastDue || 0);
      if (els.soaBottomNotDue) els.soaBottomNotDue.textContent = formatCurrency(totals.notDue || 0);
    }

    function getAgingAsOfDate() {
      const input = els.agingAsOfDate || document.getElementById("agingAsOfDate");
      if (input && !input.value) input.value = todayISO();
      const candidate = input?.value ? parseDate(input.value) : new Date();
      return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
    }

    function getAgingShowFilter() {
      return (els.agingShowFilter || document.getElementById("agingShowFilter"))?.value || "all";
    }

    function getAgingGroupBy() {
      return (els.agingGroupBy || document.getElementById("agingGroupBy"))?.value || "customer";
    }

    function getAgingSearchTerm() {
      return normalize((els.agingSearchInput || document.getElementById("agingSearchInput"))?.value || "");
    }

    function setAgingMeter(el, amount, total) {
      if (!el) return;
      const pct = total > 0 ? Math.max(3, Math.min(100, (amount / total) * 100)) : 0;
      el.style.setProperty("--w", `${pct}%`);
    }

    function getAgingStatusRank(status) {
      if (status === "Critical") return 3;
      if (status === "Warning") return 2;
      if (status === "Cancelled") return 1;
      return 0;
    }

    function deriveAgingArea(row) {
      const source = String(row.address || "").trim();
      if (!source) return "Unassigned Area";
      const parts = source.split(",").map((part) => part.trim()).filter(Boolean);
      return parts.length ? parts[parts.length - 1] : source;
    }

    function buildAgingSummaryRows(rows) {
      const groupBy = getAgingGroupBy();
      const groups = new Map();
      rows.forEach((row) => {
        let key = row.customer || "Unknown Customer";
        let label = row.customer || "Unknown Customer";
        let sub = row.address || "";
        if (groupBy === "section") {
          const sectionLabels = { CHSI: "CHSI Series", CASI: "CASI Series", DR_WHOLESALE: "DR Wholesale", DR_SEAFOOD_DR: "DR Seafood DR", DR_SEAFOOD_CHSI: "DR Seafood CHSI", DR_LOCAL: "DR Local Sales" };
          key = row.section || "Unknown";
          label = sectionLabels[row.section] || row.section || "Unknown";
          sub = `Grouped by document type`;
        } else if (groupBy === "invoice") {
          key = `${row.customer || "Unknown Customer"}::${row.invoiceNo || row.salesInvoice || "No Invoice"}`;
          label = row.invoiceNo ? `${row.customer || "Unknown Customer"}` : (row.customer || "Unknown Customer");
          sub = `${row.docType || "DR"} #${row.invoiceNo || "No invoice"}${row.dueDate ? ` • Due ${formatDate(row.dueDate)}` : ""}`;
        } else if (groupBy === "representative") {
          key = row.representative || row.m1m2 || "Unassigned Representative";
          label = key;
          sub = "Grouped by representative / M1-M2";
        } else if (groupBy === "area") {
          key = deriveAgingArea(row);
          label = key;
          sub = "Grouped by address area";
        }
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            label,
            sub,
            current: 0,
            b31: 0,
            b61: 0,
            b90: 0,
            total: 0,
            status: "Current",
            count: 0,
          });
        }
        const g = groups.get(key);
        g.count += 1;
        g.current += row.current || 0;
        g.b31 += row.b31 || 0;
        g.b61 += row.b61 || 0;
        g.b90 += row.b90 || 0;
        g.total += row.amount || 0;
        if (getAgingStatusRank(row.agingStatus) > getAgingStatusRank(g.status)) g.status = row.agingStatus;
        if (row.agingStatus === "Cancelled" && g.total <= 0 && getAgingStatusRank(g.status) < getAgingStatusRank("Cancelled")) g.status = "Cancelled";
      });
      return Array.from(groups.values()).sort((a, b) => (b.total || 0) - (a.total || 0));
    }

    function renderAgingReport() {
      if (els.agingAsOfDate && !els.agingAsOfDate.value) els.agingAsOfDate.value = todayISO();
      const detailRows = getAgingRows(state.agingFilter || "all");
      const rows = buildAgingSummaryRows(detailRows);
      if (els.agingFilterBtns) {
        els.agingFilterBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.agingFilter === (state.agingFilter || "all")));
      }

      const totals = rows.reduce((acc, row) => {
        acc.current += row.current || 0;
        acc.b31 += row.b31 || 0;
        acc.b61 += row.b61 || 0;
        acc.b90 += row.b90 || 0;
        acc.total += row.total || 0;
        return acc;
      }, { current: 0, b31: 0, b61: 0, b90: 0, total: 0 });

      if (els.agingTableBody) {
        if (!rows.length) {
          els.agingTableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No receivables match the selected aging report filters.</td></tr>`;
        } else {
          els.agingTableBody.innerHTML = rows.map((row) => {
            const statusKey = row.status === "Cancelled" ? "cancelled" : row.status === "Critical" ? "critical" : row.status === "Warning" ? "warning" : "current";
            return `
              <tr class="aging-row aging-v5-row" data-aging-customer="${escapeHtml(row.label)}">
                <td>
                  <div class="customer-main">${escapeHtml(row.label)}</div>
                  <div class="customer-sub">${escapeHtml(row.sub || `${row.count} transaction${row.count === 1 ? "" : "s"}`)}</div>
                </td>
                <td class="num">${escapeHtml(formatCurrency(row.current || 0))}</td>
                <td class="num">${escapeHtml(formatCurrency(row.b31 || 0))}</td>
                <td class="num">${escapeHtml(formatCurrency(row.b61 || 0))}</td>
                <td class="num">${escapeHtml(formatCurrency(row.b90 || 0))}</td>
                <td class="num"><strong>${escapeHtml(formatCurrency(row.total || 0))}</strong></td>
                <td><span class="aging-v5-status ${statusKey}">${escapeHtml(row.status === "Current" ? "Current / Paid" : row.status)}</span></td>
                <td class="no-print"><button type="button" class="aging-v5-action-btn" data-aging-detail="${statusKey}" title="View aging details" aria-label="View aging details">⋯</button></td>
              </tr>
            `;
          }).join("");
        }
      }

      if (els.agingTotalsFoot) {
        els.agingTotalsFoot.innerHTML = `
          <tr>
            <td>Total</td>
            <td class="num">${formatCurrency(totals.current)}</td>
            <td class="num">${formatCurrency(totals.b31)}</td>
            <td class="num">${formatCurrency(totals.b61)}</td>
            <td class="num">${formatCurrency(totals.b90)}</td>
            <td class="num">${formatCurrency(totals.total)}</td>
            <td colspan="2"></td>
          </tr>
        `;
      }

      if (els.agingCurrentStat) els.agingCurrentStat.textContent = formatCurrency(totals.current);
      if (els.aging31Stat) els.aging31Stat.textContent = formatCurrency(totals.b31);
      if (els.aging61Stat) els.aging61Stat.textContent = formatCurrency(totals.b61);
      if (els.aging90Stat) els.aging90Stat.textContent = formatCurrency(totals.b90);
      if (els.agingTotalOutstandingStat) els.agingTotalOutstandingStat.textContent = formatCurrency(totals.total);
      setAgingMeter(els.agingCurrentMeter, totals.current, totals.total);
      setAgingMeter(els.aging31Meter, totals.b31, totals.total);
      setAgingMeter(els.aging61Meter, totals.b61, totals.total);
      setAgingMeter(els.aging90Meter, totals.b90, totals.total);
      setAgingMeter(els.agingTotalMeter, totals.total, totals.total || 1);
      if (els.agingCountChip) els.agingCountChip.textContent = `${rows.length} entr${rows.length === 1 ? "y" : "ies"}`;
      if (els.agingTableRange) els.agingTableRange.textContent = `Showing ${rows.length ? 1 : 0} to ${rows.length} of ${rows.length} grouped entries`;
    }

    function getAgingRows(filter = "all") {
      const asOfDate = getAgingAsOfDate();
      const showFilter = getAgingShowFilter();
      const searchTerm = getAgingSearchTerm();
      const rawRows = state.transactions.map((tx) => {
        const receivable = Math.max(Number(tx.receivable || 0), 0);
        const due = tx.dueDate ? parseDate(tx.dueDate) : parseDate(tx.date || todayISO());
        const validDue = Number.isNaN(due.getTime()) ? parseDate(todayISO()) : due;
        const daysPastDueRaw = Math.floor((asOfDate - validDue) / 86400000);
        const daysPastDue = daysPastDueRaw > 0 ? daysPastDueRaw : 0;
        const isPaid = tx.status === "PAID" || receivable <= 0;
        const isCancelled = Boolean(tx.isCancelled);
        const bucket = isCancelled
          ? "cancelled"
          : isPaid || daysPastDue <= 30
            ? "current"
            : daysPastDue <= 60
              ? "31-60"
              : daysPastDue <= 90
                ? "61-90"
                : "90+";
        const agingStatus = isCancelled
          ? "Cancelled"
          : isPaid || bucket === "current"
            ? "Current"
            : bucket === "31-60"
              ? "Warning"
              : "Critical";
        const filterBucket = isCancelled
          ? "cancelled"
          : agingStatus === "Current"
            ? "current"
            : agingStatus === "Warning"
              ? "warning"
              : "critical";
        const snapshot = getCustomerSnapshot(tx.customer);
        const row = {
          customer: tx.customer || "Unknown Customer",
          address: tx.customerAddress || snapshot.address || "",
          tin: tx.customerTin || snapshot.tin || "",
          salesInvoice: tx.docType || "DR",
          collectionReceiptNo: tx.collectionReceiptNo || "",
          docType: tx.docType || "DR",
          invoiceNo: tx.invNo || "",
          dueDate: tx.dueDate,
          amount: receivable,
          current: bucket === "current" ? receivable : 0,
          b31: bucket === "31-60" ? receivable : 0,
          b61: bucket === "61-90" ? receivable : 0,
          b90: bucket === "90+" ? receivable : 0,
          daysPastDue,
          bucket,
          agingStatus,
          filterBucket,
          section: tx.section || "",
          representative: tx.representative || tx.m1m2 || "",
          m1m2: tx.m1m2 || "M1",
          searchText: normalize([tx.customer, tx.customerAddress, tx.customerTin, tx.invNo, tx.docType, tx.collectionReceiptNo, tx.representative, tx.m1m2, tx.section].join(" ")),
          rowClass: bucket === "cancelled" ? "aging-cancelled" : bucket === "current" ? "aging-current" : bucket === "31-60" ? "aging-31-60" : bucket === "61-90" ? "aging-61-90" : "aging-90-plus",
        };
        return row;
      });

      let rows = rawRows;
      if (showFilter === "open") rows = rows.filter((row) => row.amount > 0 && row.bucket !== "cancelled");
      if (showFilter === "pastdue") rows = rows.filter((row) => row.amount > 0 && ["31-60", "61-90", "90+"].includes(row.bucket));
      if (showFilter === "cancelled") rows = rows.filter((row) => row.bucket === "cancelled");

      if (filter !== "all") rows = rows.filter((row) => row.filterBucket === filter);
      if (filter === "all" && showFilter === "all") rows = rows.filter((row) => row.bucket !== "cancelled" && row.amount > 0);
      if (searchTerm) rows = rows.filter((row) => row.searchText.includes(searchTerm) || normalize(deriveAgingArea(row)).includes(searchTerm));
      return rows;
    }

    function getAgingFilterLabel(filter) {
      const map = {
        current: "Current / Paid",
        warning: "Warning / Due Soon",
        critical: "Critical / Past Due",
        cancelled: "Cancelled",
        all: "All",
      };
      return map[filter] || "All";
    }

    function getAgingStatusClass(status) {
      if (status === "Cancelled") return "status-cancelled";
      if (status === "Critical") return "status-critical";
      if (status === "Warning") return "status-warning";
      return "status-current";
    }

    function syncAgingDetailModal() {
      const rows = state.agingDetailRows || [];
      const row = rows[state.agingDetailIndex] || rows[0] || null;
      if (!row) {
        if (els.agingDetailFilterBadge) els.agingDetailFilterBadge.textContent = getAgingFilterLabel(state.agingDetailFilter || "all");
        if (els.agingDetailCountBadge) els.agingDetailCountBadge.textContent = "0 rows";
        if (els.agingDetailCustomer) els.agingDetailCustomer.textContent = "-";
        if (els.agingDetailAddress) els.agingDetailAddress.textContent = "-";
        if (els.agingDetailTin) els.agingDetailTin.textContent = "-";
        if (els.agingDetailSalesInvoice) els.agingDetailSalesInvoice.textContent = "-";
        if (els.agingDetailCollectionReceipt) els.agingDetailCollectionReceipt.textContent = "-";
        if (els.agingDetailDocType) els.agingDetailDocType.textContent = "-";
        if (els.agingDetailInvoice) els.agingDetailInvoice.textContent = "-";
        if (els.agingDetailDueDate) els.agingDetailDueDate.textContent = "-";
        if (els.agingDetailBalance) els.agingDetailBalance.textContent = "-";
        if (els.agingDetailStatus) els.agingDetailStatus.textContent = "-";
        if (els.agingDetailDaysPastDue) els.agingDetailDaysPastDue.textContent = "-";
        if (els.agingDetailTableBody) els.agingDetailTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No matching receivables found.</td></tr>`;
        return;
      }
      if (els.agingDetailFilterBadge) els.agingDetailFilterBadge.textContent = getAgingFilterLabel(state.agingDetailFilter || "all");
      if (els.agingDetailCountBadge) els.agingDetailCountBadge.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"}`;
      if (els.agingDetailCustomer) els.agingDetailCustomer.textContent = row.customer || "-";
      if (els.agingDetailAddress) els.agingDetailAddress.textContent = row.address || "-";
      if (els.agingDetailTin) els.agingDetailTin.textContent = row.tin || "-";
      if (els.agingDetailSalesInvoice) els.agingDetailSalesInvoice.textContent = row.salesInvoice || "-";
      if (els.agingDetailCollectionReceipt) els.agingDetailCollectionReceipt.textContent = row.collectionReceiptNo || "-";
        if (els.agingDetailDocType) els.agingDetailDocType.textContent = formatDocTypeLabel(row.docType || "-");
      if (els.agingDetailInvoice) els.agingDetailInvoice.textContent = row.invoiceNo || "-";
      if (els.agingDetailDueDate) els.agingDetailDueDate.textContent = formatDate(row.dueDate) || "-";
      if (els.agingDetailBalance) els.agingDetailBalance.textContent = formatCurrency(row.amount || 0);
      if (els.agingDetailStatus) {
        els.agingDetailStatus.innerHTML = `<span class="status ${getAgingStatusClass(row.agingStatus)}">${escapeHtml(row.agingStatus || "-")}</span>`;
      }
      if (els.agingDetailDaysPastDue) els.agingDetailDaysPastDue.textContent = String(row.daysPastDue || 0);
      if (els.agingDetailTableBody) {
        els.agingDetailTableBody.innerHTML = rows.map((item, index) => {
          const active = index === state.agingDetailIndex ? " active" : "";
          return `
            <tr class="aging-detail-row${active}" data-aging-detail-index="${index}">
              <td>${escapeHtml(item.customer || "")}</td>
              <td>${escapeHtml(item.invoiceNo || "")}</td>
              <td>${escapeHtml(item.collectionReceiptNo || "")}</td>
              <td class="num">${escapeHtml(formatCurrency(item.amount || 0))}</td>
              <td><span class="status ${getAgingStatusClass(item.agingStatus)}">${escapeHtml(item.agingStatus || "")}</span></td>
            </tr>
          `;
        }).join("");
      }
    }

    function openAgingDetailModal(filter = "all") {
      const rows = getAgingRows(filter);
      state.agingDetailFilter = filter;
      state.agingDetailRows = rows;
      state.agingDetailIndex = 0;
      state.agingDetailOpen = true;
      syncAgingDetailModal();
      if (els.agingDetailOverlay) {
        els.agingDetailOverlay.classList.add("open");
        els.agingDetailOverlay.setAttribute("aria-hidden", "false");
      }
    }

    function closeAgingDetailModal(force = false) {
      if (!state.agingDetailOpen && !force) return;
      state.agingDetailOpen = false;
      if (els.agingDetailOverlay) {
        els.agingDetailOverlay.classList.remove("open");
        els.agingDetailOverlay.setAttribute("aria-hidden", "true");
      }
    }

    function selectAgingDetailRow(index) {
      const rows = state.agingDetailRows || [];
      if (!rows.length) return;
      state.agingDetailIndex = Math.max(0, Math.min(index, rows.length - 1));
      syncAgingDetailModal();
    }

    function exportCsv(rows, filename) {
      if (!rows.length) {
        alert("No rows to export.");
        return;
      }
      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(","),
        ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
      ].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
    }

    function csvEscape(value) {
      const str = String(value ?? "");
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportXlsx(rows, filename, sheetName = "Sheet1") {
      if (!rows.length) {
        alert("No rows to export.");
        return;
      }
      if (typeof XLSX === "undefined") {
        alert("Excel export library not loaded. Please check your internet connection.");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, filename);
    }

    function exportVisibleSalesCsv() {
      const rows = state.filtered.map((tx) => ({
        Date: tx.date,
        "Doc Type": formatDocTypeLabel(tx.docType || "DR"),
        "M1/M2": tx.m1m2 || "M1",
        "Invoice #": tx.invNo,
        "PO #": tx.poNumber || "",
        "Customer Name": tx.customer,
        Address: tx.customerAddress || "",
        TIN: tx.customerTin || "",
        "Gross Sales": tx.gross.toFixed(2),
        Freight: tx.freight.toFixed(2),
        "Returns/Discount": tx.returnsDisc.toFixed(2),
        "Net of Deduction": tx.netDeduction.toFixed(2),
        EWT: tx.ewt.toFixed(2),
        "Net Sales": tx.netSales.toFixed(2),
        Payment: tx.payment.toFixed(2),
        Receivable: tx.receivable.toFixed(2),
        Status: tx.status,
        "Collection Receipt #": tx.collectionReceiptNo || "",
        "Other Remarks": tx.otherRemarks || "",
      }));
      exportCsv(rows, `wholesale-sales-summary-${todayISO()}.csv`);
    }

    function exportVisibleSalesXlsx() {
      const rows = state.filtered.map((tx) => ({
        Date: tx.date,
        "Doc Type": formatDocTypeLabel(tx.docType || "DR"),
        "M1/M2": tx.m1m2 || "M1",
        "Invoice #": tx.invNo,
        "PO #": tx.poNumber || "",
        "Customer Name": tx.customer,
        Address: tx.customerAddress || "",
        TIN: tx.customerTin || "",
        "Gross Sales": tx.gross.toFixed(2),
        Freight: tx.freight.toFixed(2),
        "Returns/Discount": tx.returnsDisc.toFixed(2),
        "Net of Deduction": tx.netDeduction.toFixed(2),
        EWT: tx.ewt.toFixed(2),
        "Net Sales": tx.netSales.toFixed(2),
        Payment: tx.payment.toFixed(2),
        Receivable: tx.receivable.toFixed(2),
        Status: tx.status,
        "Collection Receipt #": tx.collectionReceiptNo || "",
        "Other Remarks": tx.otherRemarks || "",
      }));
      exportXlsx(rows, `wholesale-sales-summary-${todayISO()}.xlsx`, "Sales Summary");
    }

    function exportAgingCsv() {
      const rows = buildAgingSummaryRows(getAgingRows(state.agingFilter || "all")).map((row) => ({
        "Customer / Group": row.label,
        Details: row.sub || "",
        "Current (0-30)": (row.current || 0).toFixed(2),
        "31-60 Days": (row.b31 || 0).toFixed(2),
        "61-90 Days": (row.b61 || 0).toFixed(2),
        "Over 90 Days": (row.b90 || 0).toFixed(2),
        "Total Outstanding": (row.total || 0).toFixed(2),
        "Aging Status": row.status,
        "Transaction Count": row.count,
      }));
      exportCsv(rows, `aging-report-${todayISO()}.csv`);
    }

    function exportAgingXlsx() {
      const rows = buildAgingSummaryRows(getAgingRows(state.agingFilter || "all")).map((row) => ({
        "Customer / Group": row.label,
        Details: row.sub || "",
        "Current (0-30)": (row.current || 0).toFixed(2),
        "31-60 Days": (row.b31 || 0).toFixed(2),
        "61-90 Days": (row.b61 || 0).toFixed(2),
        "Over 90 Days": (row.b90 || 0).toFixed(2),
        "Total Outstanding": (row.total || 0).toFixed(2),
        "Aging Status": row.status,
        "Transaction Count": row.count,
      }));
      exportXlsx(rows, `aging-report-${todayISO()}.xlsx`, "Aging Report");
    }

    function exportFullAgingCsv() {
      const rows = getAgingRows(state.agingFilter || "all").map((row) => ({
        "Customer Name": row.customer,
        Address: row.address,
        TIN: row.tin,
        "Sales Invoice #": row.salesInvoice,
        "Collection Receipt #": row.collectionReceiptNo,
        "Doc Type": row.docType,
        "Invoice #": row.invoiceNo,
        "Due Date": row.dueDate,
        "Current (0-30)": (row.current || 0).toFixed(2),
        "31-60 Days": (row.b31 || 0).toFixed(2),
        "61-90 Days": (row.b61 || 0).toFixed(2),
        "Over 90 Days": (row.b90 || 0).toFixed(2),
        "Total AR": (row.amount || 0).toFixed(2),
        "Days Past Due": row.daysPastDue,
        "Aging Status": row.agingStatus,
        Representative: row.representative || "",
      }));
      exportCsv(rows, `aging-full-detail-${todayISO()}.csv`);
    }

    function exportTransactionJson(tx, prefix = "invoice") {
      if (!tx) return;
      const safeInvNo = String(tx.invNo || "unknown").replace(/[^A-Za-z0-9_-]/g, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${prefix}-${safeInvNo}-${timestamp}.json`;
      downloadBlob(new Blob([JSON.stringify(tx, null, 2)], { type: "application/json" }), filename);
    }

    function safeBackupNamePart(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "company";
    }

    function safeBackupTimestampPart(date = new Date()) {
      const pad = (n) => String(n).padStart(2, "0");
      return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
      ].join("-");
    }

    function buildBackupManifest(filename, recordCount, statusCounts = {}) {
      const now = new Date();
      const companyName = state.settings.companyName || DEFAULT_SETTINGS.companyName;
      const warningParts = getBackupWarningParts(statusCounts);
      return [
        `Company: ${companyName}`,
        `Backup file: ${filename}`,
        `Created at: ${now.toLocaleString("en-PH")}`,
        `Record count: ${recordCount}`,
        `PAID: ${statusCounts.PAID || 0}`,
        `PARTIAL PAYMENT: ${statusCounts.PARTIAL_PAYMENT || 0}`,
        `NOTDUE: ${statusCounts.NOTDUE || 0}`,
        `PASTDUE: ${statusCounts.PASTDUE || 0}`,
        `CANCELLED: ${statusCounts.CANCELLED || 0}`,
        warningParts.length ? `Warning: Backup contains ${warningParts.join(" and ")} records.` : "Warning: Backup contains no overdue or cancelled records.",
      ].join("\n");
    }

    function getBackupWarningParts(statusCounts = {}) {
      const overdueCount = Number(statusCounts.PASTDUE || 0);
      const cancelledCount = Number(statusCounts.CANCELLED || 0);
      const warningParts = [];
      if (overdueCount > 0) warningParts.push(`${overdueCount} overdue`);
      if (cancelledCount > 0) warningParts.push(`${cancelledCount} cancelled`);
      return warningParts;
    }

    function getBackupHistory() {
      try {
        const raw = localStorage.getItem(LAST_BACKUP_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            filename: String(item.filename || ""),
            createdAt: Number(item.createdAt || 0),
            recordCount: Number(item.recordCount || 0),
            statusCounts: item.statusCounts && typeof item.statusCounts === "object" ? item.statusCounts : {},
            warning: String(item.warning || ""),
          }))
          .filter((item) => item.filename);
      } catch {
        return [];
      }
    }

    function saveBackupHistory(items) {
      localStorage.setItem(LAST_BACKUP_HISTORY_KEY, JSON.stringify(items.slice(0, 8)));
      renderBackupHistory();
    }

    function addBackupHistoryEntry(entry) {
      const items = getBackupHistory();
      items.unshift(entry);
      saveBackupHistory(items);
    }

    function renderBackupHistory() {
      if (!els.backupHistoryList) return;
      const items = getBackupHistory();
      if (!items.length) {
        els.backupHistoryList.innerHTML = '<div class="helper">No backup history yet.</div>';
        return;
      }
      els.backupHistoryList.innerHTML = items
        .slice(0, 5)
        .map((item) => {
          const statusSummary = [
            `Records: ${item.recordCount}`,
            `PASTDUE: ${item.statusCounts.PASTDUE || 0}`,
            `CANCELLED: ${item.statusCounts.CANCELLED || 0}`,
          ].join(" | ");
          return `
            <div class="backup-history-item">
              <div class="backup-history-title">${escapeHtml(item.filename)}</div>
              <div class="backup-history-meta">
                <span>${escapeHtml(new Date(item.createdAt).toLocaleString("en-PH"))}</span>
                <span>${escapeHtml(statusSummary)}</span>
              </div>
              ${item.warning ? `<div class="helper">${escapeHtml(item.warning)}</div>` : ""}
            </div>
          `;
        })
        .join("");
    }

    function getLatestBackupEntry() {
      const items = getBackupHistory();
      return items.length ? items[0] : null;
    }

    function clearBackupHistory() {
      localStorage.removeItem(LAST_BACKUP_HISTORY_KEY);
      renderBackupHistory();
      toast("Backup history cleared", "success");
    }

    function updateUndoLastImportState() {
      if (!els.undoLastImportBtn) return;
      const snapshot = getImportSnapshot();
      els.undoLastImportBtn.hidden = !snapshot;
      els.undoLastImportBtn.disabled = !snapshot;
      els.undoLastImportBtn.textContent = snapshot ? `Undo Last Import${snapshot.fileName ? `: ${snapshot.fileName}` : ""}` : "Undo Last Import";
    }

    function exportBackupHistory() {
      const items = getBackupHistory();
      const companyPart = safeBackupNamePart(state.settings.companyName || DEFAULT_SETTINGS.companyName);
      const timestamp = safeBackupTimestampPart();
      const filename = `${companyPart}-backup-history-${timestamp}.json`;
      downloadBlob(
        new Blob([JSON.stringify(items, null, 2)], { type: "application/json" }),
        filename
      );
      toast("Backup history exported", "success", filename);
    }

    function exportBackupHistoryCsv() {
      const items = getBackupHistory();
      const companyPart = safeBackupNamePart(state.settings.companyName || DEFAULT_SETTINGS.companyName);
      const timestamp = safeBackupTimestampPart();
      const filename = `${companyPart}-backup-history-${timestamp}.csv`;
      const rows = items.map((item) => ({
        Filename: item.filename,
        "Created At": item.createdAt ? new Date(item.createdAt).toLocaleString("en-PH") : "",
        "Record Count": item.recordCount,
        PAID: item.statusCounts?.PAID || 0,
        "PARTIAL PAYMENT": item.statusCounts?.PARTIAL_PAYMENT || 0,
        NOTDUE: item.statusCounts?.NOTDUE || 0,
        PASTDUE: item.statusCounts?.PASTDUE || 0,
        CANCELLED: item.statusCounts?.CANCELLED || 0,
        Warning: item.warning || "",
      }));
      if (!rows.length) {
        alert("No backup history to export.");
        return;
      }
      exportCsv(rows, filename);
      toast("Backup history CSV exported", "success", filename);
    }

    async function copyLatestBackupFilename() {
      const latest = getLatestBackupEntry();
      if (!latest) {
        alert("No backup history yet.");
        return;
      }
      const text = latest.filename;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const temp = document.createElement("textarea");
          temp.value = text;
          temp.setAttribute("readonly", "true");
          temp.style.position = "fixed";
          temp.style.opacity = "0";
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          temp.remove();
        }
        toast("Latest backup filename copied", "success", text);
      } catch (err) {
        console.error("Could not copy backup filename", err);
        alert("Could not copy the backup filename.");
      }
    }

    async function copyLatestBackupPathHint() {
      const latest = getLatestBackupEntry();
      if (!latest) {
        alert("No backup history yet.");
        return;
      }
      const text = `Backup folder: backup-files | Latest file: ${latest.filename}`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const temp = document.createElement("textarea");
          temp.value = text;
          temp.setAttribute("readonly", "true");
          temp.style.position = "fixed";
          temp.style.opacity = "0";
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          temp.remove();
        }
        toast("Latest backup path hint copied", "success", text);
      } catch (err) {
        console.error("Could not copy backup path hint", err);
        alert("Could not copy the backup path hint.");
      }
    }

    function backupJson() {
      if (!getRolePermissions().canExport) {
        showPermissionDenied("export the backup");
        return;
      }
      const companyPart = safeBackupNamePart(state.settings.companyName || DEFAULT_SETTINGS.companyName);
      const filename = `${companyPart}-backup-${safeBackupTimestampPart()}.json`;
      const recordCount = Array.isArray(state.transactions) ? state.transactions.length : 0;
      const statusCounts = (Array.isArray(state.transactions) ? state.transactions : []).reduce((acc, tx) => {
        const key = String(tx?.status || "").toUpperCase();
        if (key) acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const warningParts = getBackupWarningParts(statusCounts);
      downloadBlob(new Blob([JSON.stringify(state.transactions, null, 2)], { type: "application/json" }), filename);
      downloadBlob(
        new Blob([buildBackupManifest(filename, recordCount, statusCounts)], { type: "text/plain" }),
        filename.replace(/\.json$/i, ".txt")
      );
      recordBackupTimestamp();
      addBackupHistoryEntry({
        filename,
        createdAt: Date.now(),
        recordCount,
        statusCounts,
        warning: warningParts.length ? `Warning: Backup contains ${warningParts.join(" and ")} records.` : "Warning: Backup contains no overdue or cancelled records.",
      });
      toast("Backup JSON downloaded", "success", filename);
    }

    function getBackupTimestamp() {
      const raw = localStorage.getItem(LAST_BACKUP_KEY);
      return raw ? Number(raw) || 0 : 0;
    }

    function isBackupDue() {
      const last = getBackupTimestamp();
      if (!last) return true;
      return (Date.now() - last) > 24 * 60 * 60 * 1000;
    }

    function formatBackupTimestamp(ts) {
      if (!ts) return "No backup yet";
      return `Last backup ${new Date(ts).toLocaleString("en-PH")}`;
    }

    function updateBackupStatusChip() {
      if (!els.backupStatusChip) return;
      const last = getBackupTimestamp();
      const due = isBackupDue();
      els.backupStatusChip.textContent = formatBackupTimestamp(last);
      els.backupStatusChip.classList.toggle("status-success", Boolean(last) && !due);
      els.backupStatusChip.classList.toggle("status-danger", due);
      els.backupStatusChip.classList.toggle("status-warning", false);
    }

    function recordBackupTimestamp() {
      const ts = Date.now();
      localStorage.setItem(LAST_BACKUP_KEY, String(ts));
      updateBackupStatusChip();
      return ts;
    }

    function getImportSnapshot() {
      try {
        const raw = localStorage.getItem(LAST_IMPORT_SNAPSHOT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const createdAt = Number(parsed.createdAt || 0);
        if (!createdAt || (Date.now() - createdAt) > LAST_IMPORT_SNAPSHOT_MAX_AGE_MS) {
          localStorage.removeItem(LAST_IMPORT_SNAPSHOT_KEY);
          return null;
        }
        return {
          createdAt,
          fileName: String(parsed.fileName || "backup.json"),
          mode: String(parsed.mode || "replace"),
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : null,
          customerProfiles: Array.isArray(parsed.customerProfiles) ? parsed.customerProfiles : null,
          settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : null,
        };
      } catch {
        return null;
      }
    }

    function saveImportSnapshot(snapshot) {
      if (!snapshot) return;
      localStorage.setItem(LAST_IMPORT_SNAPSHOT_KEY, JSON.stringify(snapshot));
      updateUndoLastImportState();
    }

    function clearImportSnapshot() {
      localStorage.removeItem(LAST_IMPORT_SNAPSHOT_KEY);
      updateUndoLastImportState();
    }

    function restoreImportSnapshot() {
      const snapshot = getImportSnapshot();
      if (!snapshot) {
        alert("No import snapshot is available to undo.");
        return;
      }
      if (!confirm(`Restore the data saved before the last import from ${snapshot.fileName}?`)) return;
      if (Array.isArray(snapshot.transactions)) state.transactions = snapshot.transactions.slice();
      if (Array.isArray(snapshot.customerProfiles)) state.customerProfiles = snapshot.customerProfiles.slice();
      if (snapshot.settings) {
        state.settings = { ...DEFAULT_SETTINGS, ...snapshot.settings };
        syncSettingsForm();
        applySettingsToSoaHeaderDefaults();
        saveSoaHeader();
      }
      recomputeAll();
      saveCustomerProfiles();
      clearImportSnapshot();
      pushAuditLog({
        action: "Undid Import",
        entityType: "system",
        detail: `Restored data saved before importing ${snapshot.fileName || "backup.json"}.`,
        actor: state.currentUser?.fullName || state.soaHeader.preparedBy || "Local user",
      });
      toast("Last import restored", "success", snapshot.fileName || "backup.json");
    }

    function normalizeImportedCustomerProfiles(items) {
      if (!Array.isArray(items)) return null;
      return items
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          name: String(item.name || item.customer || item.fullName || ""),
          address: String(item.address || item.customerAddress || ""),
          tin: String(item.tin || item.customerTin || ""),
          contactPerson: String(item.contactPerson || item.representative || ""),
          contactNumber: String(item.contactNumber || item.phone || ""),
          email: String(item.email || ""),
          paymentTerms: String(item.paymentTerms || item.terms || "30"),
          modeOfPayment: String(item.modeOfPayment || item.modePayment || ""),
          bankDetails: String(item.bankDetails || ""),
          remarks: String(item.remarks || item.otherRemarks || ""),
          updatedAt: String(item.updatedAt || item.createdAt || ""),
        }))
        .filter((item) => item.name);
    }

    function normalizeImportedPayload(payload) {
      if (Array.isArray(payload)) {
        const looksLikeTransactions = payload.some((item) => item && typeof item === "object" && (item.invNo || item.date || item.customer || item.gross !== undefined));
        if (looksLikeTransactions) return { transactions: payload, customerProfiles: null, settings: null };
        return { transactions: null, customerProfiles: normalizeImportedCustomerProfiles(payload), settings: null };
      }
      if (!payload || typeof payload !== "object") return null;
      const transactions = Array.isArray(payload.transactions) ? payload.transactions : null;
      const customerProfiles = Array.isArray(payload.customerProfiles)
        ? normalizeImportedCustomerProfiles(payload.customerProfiles)
        : Array.isArray(payload.customers)
          ? normalizeImportedCustomerProfiles(payload.customers)
          : null;
      const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : null;
      if (!transactions && !customerProfiles && !settings) return null;
      return { transactions, customerProfiles, settings };
    }

    function analyzeImportConflicts(imported) {
      const conflict = {
        transactionMatches: [],
        transactionDuplicates: [],
        customerMatches: [],
        customerDuplicates: [],
        settingChanges: [],
      };
      if (Array.isArray(imported.transactions) && imported.transactions.length) {
        const currentTxMap = new Map((state.transactions || []).map((tx) => [normalize(tx.invNo), tx]));
        const seenTx = new Set();
        imported.transactions.forEach((tx) => {
          const key = normalize(tx.invNo || tx.invoiceNo || tx.invoice_no || "");
          if (!key) return;
          if (seenTx.has(key)) {
            conflict.transactionDuplicates.push(tx.invNo || tx.invoiceNo || tx.invoice_no);
            return;
          }
          seenTx.add(key);
          if (!currentTxMap.has(key)) return;
          conflict.transactionMatches.push(tx.invNo || tx.invoiceNo || tx.invoice_no);
        });
      }
      if (Array.isArray(imported.customerProfiles) && imported.customerProfiles.length) {
        const currentCustomerMap = new Map((state.customerProfiles || []).map((profile) => [normalize(profile.name || profile.customerName || profile.customer_name || ""), profile]));
        const seenCustomer = new Set();
        imported.customerProfiles.forEach((profile) => {
          const key = normalize(profile.name || profile.customerName || profile.customer_name || "");
          if (!key) return;
          if (seenCustomer.has(key)) {
            conflict.customerDuplicates.push(profile.name || profile.customerName || profile.customer_name);
            return;
          }
          seenCustomer.add(key);
          if (!currentCustomerMap.has(key)) return;
          conflict.customerMatches.push(profile.name || profile.customerName || profile.customer_name);
        });
      }
      if (imported.settings && typeof imported.settings === "object") {
        Object.entries(imported.settings).forEach(([key, value]) => {
          const current = state.settings ? state.settings[key] : undefined;
          if (JSON.stringify(current) !== JSON.stringify(value)) {
            conflict.settingChanges.push(key);
          }
        });
      }
      return conflict;
    }

    function dedupeImportedRecords(items, getKey) {
      const seen = new Set();
      return (Array.isArray(items) ? items : []).filter((item) => {
        const key = normalize(getKey(item));
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function mergeImportedRecords(existingItems, importedItems, getKey) {
      const merged = Array.isArray(existingItems) ? existingItems.slice() : [];
      const seen = new Set(merged.map((item) => normalize(getKey(item))));
      dedupeImportedRecords(importedItems, getKey).forEach((item) => {
        const key = normalize(getKey(item));
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(item);
      });
      return merged;
    }

    function mergeImportedSettings(currentSettings, importedSettings, mode) {
      const next = { ...DEFAULT_SETTINGS, ...(currentSettings || {}) };
      if (!importedSettings || typeof importedSettings !== "object") return next;
      if (mode === "merge") {
        Object.entries(importedSettings).forEach(([key, value]) => {
          const current = next[key];
          const empty = current == null || current === "" || (typeof current === "string" && !current.trim());
          if (empty && value != null && value !== "") next[key] = value;
        });
        return next;
      }
      return { ...DEFAULT_SETTINGS, ...importedSettings };
    }

    function openImportPreviewOverlay() {
      if (els.importPreviewOverlay) {
        els.importPreviewOverlay.classList.add("open");
        els.importPreviewOverlay.setAttribute("aria-hidden", "false");
      }
    }

    function closeImportPreviewOverlay() {
      if (els.importPreviewOverlay) {
        els.importPreviewOverlay.classList.remove("open");
        els.importPreviewOverlay.setAttribute("aria-hidden", "true");
      }
      state.importPreview = null;
      if (els.importPreviewSummary) els.importPreviewSummary.innerHTML = "";
      if (els.importPreviewFileName) els.importPreviewFileName.textContent = "Previewing selected JSON file.";
      if (els.importModeSelect) els.importModeSelect.value = "replace";
      if (els.importPreviewWarning) {
        els.importPreviewWarning.textContent = "Importing this file will overwrite matching current data after you confirm.";
      }
    }

    function renderImportPreview(imported, fileName) {
      const conflict = analyzeImportConflicts(imported);
      const importMode = els.importModeSelect && els.importModeSelect.value === "merge" ? "merge" : "replace";
      const items = [];
      if (Array.isArray(imported.transactions) && imported.transactions.length) {
        items.push({
          title: "Transactions",
          body: importMode === "merge"
            ? `${imported.transactions.length} record${imported.transactions.length === 1 ? "" : "s"} will merge with the current transaction data and skip duplicates.`
            : `${imported.transactions.length} record${imported.transactions.length === 1 ? "" : "s"} will replace the current transaction data.`,
        });
      }
      if (Array.isArray(imported.customerProfiles) && imported.customerProfiles.length) {
        items.push({
          title: "Customer Profiles",
          body: importMode === "merge"
            ? `${imported.customerProfiles.length} profile${imported.customerProfiles.length === 1 ? "" : "s"} will merge with the current customer list and skip duplicates.`
            : `${imported.customerProfiles.length} profile${imported.customerProfiles.length === 1 ? "" : "s"} will replace the current customer profiles.`,
        });
      }
      if (imported.settings) {
        items.push({
          title: "Settings",
          body: importMode === "merge"
            ? "Only empty current settings will be filled from the file."
            : "Company info and default values will be updated from the file.",
        });
      }
      if (els.importPreviewFileName) {
        els.importPreviewFileName.textContent = `File: ${fileName || "backup.json"}`;
      }
      const summaryBits = [];
      if (Array.isArray(imported.transactions) && imported.transactions.length) summaryBits.push(`${imported.transactions.length} transaction${imported.transactions.length === 1 ? "" : "s"}`);
      if (Array.isArray(imported.customerProfiles) && imported.customerProfiles.length) summaryBits.push(`${imported.customerProfiles.length} customer profile${imported.customerProfiles.length === 1 ? "" : "s"}`);
      if (imported.settings) summaryBits.push("settings");
      if (els.importPreviewWarning) {
        const conflictBits = [];
        if (conflict.transactionMatches.length) conflictBits.push(`${conflict.transactionMatches.length} matching transaction${conflict.transactionMatches.length === 1 ? "" : "s"}`);
        if (conflict.transactionDuplicates.length) conflictBits.push(`${conflict.transactionDuplicates.length} duplicate transaction${conflict.transactionDuplicates.length === 1 ? "" : "s"} in the file`);
        if (conflict.customerMatches.length) conflictBits.push(`${conflict.customerMatches.length} matching customer profile${conflict.customerMatches.length === 1 ? "" : "s"}`);
        if (conflict.customerDuplicates.length) conflictBits.push(`${conflict.customerDuplicates.length} duplicate customer${conflict.customerDuplicates.length === 1 ? "" : "s"} in the file`);
        if (conflict.settingChanges.length) conflictBits.push(`${conflict.settingChanges.length} setting${conflict.settingChanges.length === 1 ? "" : "s"} with different values`);
        const base = importMode === "merge"
          ? (summaryBits.length
            ? `This import will merge ${summaryBits.join(", ")} and skip duplicates after you confirm.`
            : "Importing this file will merge matching data and skip duplicates after you confirm.")
          : (summaryBits.length
            ? `This import will overwrite ${summaryBits.join(", ")} after you confirm.`
            : "Importing this file will overwrite matching current data after you confirm.");
        els.importPreviewWarning.textContent = conflictBits.length
          ? `${base} Current overlaps detected: ${conflictBits.join(", ")}.`
          : base;
      }
      if (els.importPreviewSummary) {
        const conflictCards = [];
        if (conflict.transactionMatches.length) {
          conflictCards.push({
            title: "Transaction Conflicts",
            body: `${conflict.transactionMatches.slice(0, 3).join(", ")}${conflict.transactionMatches.length > 3 ? ` and ${conflict.transactionMatches.length - 3} more` : ""} already exist in the current summary.`,
          });
        }
        if (conflict.transactionDuplicates.length) {
          conflictCards.push({
            title: "Duplicate Transactions",
            body: `${conflict.transactionDuplicates.slice(0, 3).join(", ")}${conflict.transactionDuplicates.length > 3 ? ` and ${conflict.transactionDuplicates.length - 3} more` : ""} repeat inside the import file and will be skipped in merge mode.`,
          });
        }
        if (conflict.customerMatches.length) {
          conflictCards.push({
            title: "Customer Conflicts",
            body: `${conflict.customerMatches.slice(0, 3).join(", ")}${conflict.customerMatches.length > 3 ? ` and ${conflict.customerMatches.length - 3} more` : ""} already exist in the current customer list.`,
          });
        }
        if (conflict.customerDuplicates.length) {
          conflictCards.push({
            title: "Duplicate Customers",
            body: `${conflict.customerDuplicates.slice(0, 3).join(", ")}${conflict.customerDuplicates.length > 3 ? ` and ${conflict.customerDuplicates.length - 3} more` : ""} repeat inside the import file and will be skipped in merge mode.`,
          });
        }
        if (conflict.settingChanges.length) {
          conflictCards.push({
            title: "Settings Changes",
            body: `${conflict.settingChanges.slice(0, 4).join(", ")}${conflict.settingChanges.length > 4 ? ` and ${conflict.settingChanges.length - 4} more` : ""} will be updated.`,
          });
        }
        els.importPreviewSummary.innerHTML = [...conflictCards, ...items]
          .map((item) => `<div class="import-preview-card"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.body)}</span></div>`)
          .join("");
      }
      openImportPreviewOverlay();
    }

    function applyImportedData(imported, fileName, mode = "replace") {
      const counts = [];
      if (Array.isArray(imported.transactions) && imported.transactions.length) counts.push(`${imported.transactions.length} transactions`);
      if (Array.isArray(imported.customerProfiles) && imported.customerProfiles.length) counts.push(`${imported.customerProfiles.length} customers`);
      if (imported.settings) counts.push("settings");
      if (!counts.length) {
        alert("Nothing to import from that file.");
        return;
      }
      saveImportSnapshot({
        createdAt: Date.now(),
        fileName: fileName || "backup.json",
        mode,
        transactions: Array.isArray(state.transactions) ? state.transactions.slice() : [],
        customerProfiles: Array.isArray(state.customerProfiles) ? state.customerProfiles.slice() : [],
        settings: { ...(state.settings || {}) },
      });
      const importMode = els.importModeSelect && els.importModeSelect.value === "merge" ? "merge" : "replace";
      const normalizedTransactions = dedupeImportedRecords(imported.transactions, (tx) => tx.invNo || tx.invoiceNo || tx.invoice_no || "");
      const normalizedCustomers = dedupeImportedRecords(imported.customerProfiles, (profile) => profile.name || profile.customerName || profile.customer_name || "");
      if (Array.isArray(imported.transactions)) {
        if (importMode === "merge") {
          state.transactions = mergeImportedRecords(state.transactions || [], normalizedTransactions, (tx) => tx.invNo || tx.invoiceNo || tx.invoice_no || "");
        } else {
          state.transactions = normalizedTransactions.slice();
        }
        seedCustomerProfilesFromTransactions();
      }
      if (Array.isArray(imported.customerProfiles) && imported.customerProfiles.length) {
        if (importMode === "merge") {
          state.customerProfiles = mergeImportedRecords(state.customerProfiles || [], normalizedCustomers, (profile) => profile.name || profile.customerName || profile.customer_name || "");
        } else {
          state.customerProfiles = normalizedCustomers.slice();
        }
      }
      if (imported.settings) {
        state.settings = mergeImportedSettings(state.settings, imported.settings, importMode);
        syncSettingsForm();
        applySettingsToSoaHeaderDefaults();
        saveSoaHeader();
      }
      saveCustomerProfiles();
      recomputeAll();
      pushAuditLog({
        action: "Imported JSON",
        entityType: "system",
        detail: `Imported ${counts.join(" and ")} from ${fileName || "backup.json"}.`,
        actor: state.currentUser?.fullName || state.soaHeader.preparedBy || "Local user",
        changes: counts,
      });
      toast("JSON imported successfully", "success", counts.join(", "));
    }

    async function restoreBackupFromFile(file) {
      if (!file) return;
      if (!getRolePermissions().canResetSample) {
        showPermissionDenied("import a JSON file");
        return;
      }
      const raw = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        alert("The selected file is not valid JSON.");
        return;
      }
      const imported = normalizeImportedPayload(parsed);
      if (!imported) {
        alert("The import file must contain transactions, customer profiles, or settings.");
        return;
      }
      const hasPayload = (Array.isArray(imported.transactions) && imported.transactions.length)
        || (Array.isArray(imported.customerProfiles) && imported.customerProfiles.length)
        || Boolean(imported.settings);
      if (!hasPayload) {
        alert("Nothing to import from that file.");
        return;
      }
      state.importPreview = { imported, fileName: file.name || "backup.json" };
      renderImportPreview(imported, file.name || "backup.json");
    }

    function setActiveTab(tabId) {
      if (state.authenticated && !canAccessTab(tabId)) {
        showPermissionDenied(`open ${tabId.replace("Section", "")}`);
        return;
      }
      state.activeTab = tabId;
      els.tabBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabId));
      updateSidebarActive(tabId);
      updateTopbarForSection(tabId);
      document.querySelectorAll(".section").forEach((section) => {
        section.classList.toggle("active", section.id === tabId);
      });
      if (tabId === "soaSection") {
        renderSoaCustomerOptions();
        if (els.soaCustomerSelect?.value) generateSoa(els.soaCustomerSelect.value, false);
      }
      if (tabId === "summarySection") {
        if (els.dashboardSearch) els.dashboardSearch.focus();
      }
      if (tabId === "agingSection") renderAgingReport();
      if (tabId === "auditSection") renderAuditLog();
      const targetSection = document.getElementById(tabId);
      if (targetSection) {
        requestAnimationFrame(() => {
          targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      if (location.hash !== "#" + tabId) {
        history.pushState(null, "", "#" + tabId);
      }
    }

    function toast(message, type = "info", subtitle = "") {
      if (els.metaLastSaved) els.metaLastSaved.textContent = message;
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        if (els.metaLastSaved) {
          els.metaLastSaved.textContent = `Saved ${new Date().toLocaleTimeString("en-PH")}`;
        }
      }, 1800);
      if (!els.toastRegion) return;
      const node = document.createElement("div");
      node.className = `toast toast-${type}`;
      const icon = type === "success" ? "✓" : type === "warning" ? "!" : type === "error" ? "×" : "i";
      node.innerHTML = `
        <div class="toast-icon" aria-hidden="true">${icon}</div>
        <div class="toast-body">
          <div class="toast-title">${escapeHtml(message)}</div>
          ${subtitle ? `<div class="toast-subtitle">${escapeHtml(subtitle)}</div>` : ""}
        </div>
        <button type="button" class="toast-close" aria-label="Dismiss notification">×</button>
      `;
      const close = () => {
        if (!node.isConnected) return;
        node.classList.add("is-leaving");
        clearTimeout(node._timer);
        node._timer = setTimeout(() => node.remove(), 180);
      };
      node.querySelector(".toast-close")?.addEventListener("click", close);
      els.toastRegion.prepend(node);
      while (els.toastRegion.children.length > 3) {
        const oldest = els.toastRegion.lastElementChild;
        if (!oldest) break;
        oldest.remove();
      }
      const duration = type === "success" ? 2800 : type === "warning" ? 4000 : type === "error" ? 5000 : 3200;
      node._timer = setTimeout(close, duration);
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function wireEvents() {
      if (els.loginForm) els.loginForm.addEventListener("submit", handleLoginSubmit);
      if (els.moreMenuBtn) els.moreMenuBtn.addEventListener("click", () => toggleHeaderMenu("more"));
      if (els.adminMenuBtn) els.adminMenuBtn.addEventListener("click", () => toggleHeaderMenu("admin"));
      if (topbarUserBtn) {
        topbarUserBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleProfileMenu();
        });
        topbarUserBtn.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleProfileMenu();
          }
        });
      }
      if (els.topbarProfileMenu) {
        els.topbarProfileMenu.addEventListener("click", (e) => {
          const item = e.target.closest("[data-profile-action]");
          if (!item) return;
          e.preventDefault();
          handleProfileAction(item.dataset.profileAction || "");
        });
      }
      if (els.profileCloseBtn) els.profileCloseBtn.addEventListener("click", closeProfileModal);
      if (els.profileCancelBtn) els.profileCancelBtn.addEventListener("click", closeProfileModal);
      if (els.profileActivityBtn) els.profileActivityBtn.addEventListener("click", showMyActivity);
      if (els.profilePasswordForm) {
        els.profilePasswordForm.addEventListener("submit", (e) => {
          e.preventDefault();
          saveOwnPasswordChange();
        });
      }
      if (els.profileOverlay) {
        els.profileOverlay.addEventListener("click", (e) => {
          if (e.target === els.profileOverlay) closeProfileModal();
        });
      }
      if (els.moreMenu) {
        els.moreMenu.addEventListener("click", (e) => {
          if (e.target.closest(".menu-item")) closeHeaderMenus();
        });
      }
      if (els.adminMenu) {
        els.adminMenu.addEventListener("click", (e) => {
          const item = e.target.closest("[data-admin-action]");
          if (item) {
            handleAdminMenuAction(item.dataset.adminAction || "");
            return;
          }
          if (e.target.closest(".menu-item")) closeHeaderMenus();
        });
      }
      if (els.forgotPasswordBtn) els.forgotPasswordBtn.addEventListener("click", () => {
        toast("Password reset is managed by the office admin.", "info", "Ask the LAN administrator to reset your account.");
      });
      if (els.adminResetBtn) els.adminResetBtn.addEventListener("click", () => {
        openAdminResetModal();
      });
      const toggleLoginPwBtn = document.getElementById("toggleLoginPw");
      if (toggleLoginPwBtn) {
        toggleLoginPwBtn.addEventListener("click", () => {
          const pwInput = document.getElementById("loginPassword");
          const eyeOpen = toggleLoginPwBtn.querySelector(".pw-eye-open");
          const eyeClosed = toggleLoginPwBtn.querySelector(".pw-eye-closed");
          if (!pwInput) return;
          if (pwInput.type === "password") {
            pwInput.type = "text";
            if (eyeOpen) eyeOpen.style.display = "none";
            if (eyeClosed) eyeClosed.style.display = "";
          } else {
            pwInput.type = "password";
            if (eyeOpen) eyeOpen.style.display = "";
            if (eyeClosed) eyeClosed.style.display = "none";
          }
        });
      }
      if (els.changeAccountPasswordBtn) els.changeAccountPasswordBtn.addEventListener("click", () => {
        const user = getSelectedAccount() || state.currentUser || null;
        if (!user) {
          toast("Select an account first.", "warning");
          return;
        }
        openAdminPasswordModal(user);
      });
      if (els.closeAdminResetBtn) els.closeAdminResetBtn.addEventListener("click", closeAdminResetModal);
      if (els.adminResetCloseBtn) els.adminResetCloseBtn.addEventListener("click", closeAdminResetModal);
      if (els.adminResetSubmitBtn) els.adminResetSubmitBtn.addEventListener("click", submitAdminReset);
      if (els.adminResetForm) els.adminResetForm.addEventListener("submit", (e) => {
        e.preventDefault();
        submitAdminReset();
      });
      if (els.saveSettingsBtn) els.saveSettingsBtn.addEventListener("click", saveSettings);
      if (els.adminResetOverlay) {
        els.adminResetOverlay.addEventListener("click", (e) => {
          if (e.target === els.adminResetOverlay) closeAdminResetModal();
        });
      }
      if (els.closeAdminPasswordBtn) els.closeAdminPasswordBtn.addEventListener("click", closeAdminPasswordModal);
      if (els.adminPasswordCloseBtn) els.adminPasswordCloseBtn.addEventListener("click", closeAdminPasswordModal);
      if (els.adminPasswordForm) els.adminPasswordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveAdminPasswordChange();
      });
      if (els.adminPasswordMode) {
        els.adminPasswordMode.addEventListener("change", () => {
          const mode = String(els.adminPasswordMode.value || "direct");
          if (mode === "temporary") {
            if (els.adminPasswordTemp) els.adminPasswordTemp.focus();
          } else {
            if (els.adminPasswordNew) els.adminPasswordNew.focus();
          }
        });
      }
      if (els.adminPasswordOverlay) {
        els.adminPasswordOverlay.addEventListener("click", (e) => {
          if (e.target === els.adminPasswordOverlay) closeAdminPasswordModal();
        });
      }
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".menu-wrap") && !e.target.closest(".topbar-user") && !e.target.closest(".topbar-profile-menu")) {
          closeHeaderMenus();
        }
      });
      els.closeTxModalBtn.addEventListener("click", closeTxModal);
      els.resetFormBtn.addEventListener("click", () => {
        els.txForm.reset();
        openTxModal();
      });
      els.txForm.addEventListener("submit", handleTxSubmit);
      els.encodeForm.addEventListener("submit", handleEncodeSubmit);
      els.encodeForm.addEventListener("input", syncEncodePreview);
      els.resetFormBtn2.addEventListener("click", clearEncodeForm);
      if (els.encodeCancelBtn) els.encodeCancelBtn.addEventListener("click", handleEncodeCancelInvoice);
      if (els.encodeDeleteBtn) els.encodeDeleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!state.currentUser || state.currentUser.role !== "Admin") {
          toast("Only Admin can delete invoices", "error"); return;
        }
        const invNo = els.encodeInvNo?.value?.trim();
        if (!invNo) { toast("Enter or load an invoice number first", "error"); return; }
        if (!confirm(`Permanently delete invoice ${invNo}? This cannot be undone.`)) return;
        const idx = state.transactions.findIndex((tx) => tx.invNo === invNo);
        if (idx < 0) { toast("Invoice not found in database", "error"); return; }
        const deleted = state.transactions.splice(idx, 1)[0];
        localStorage.setItem(`${STORAGE_KEY}-transactions`, JSON.stringify(state.transactions));
        recomputeAll();
        pushAuditLog({ action: "Deleted invoice", invNo, customer: deleted.customer || "", actor: state.currentUser?.fullName || "Local user", detail: `Deleted invoice ${invNo}` });
        clearEncodeForm();
        renderSalesTable();
        renderStats();
        toast(`Invoice ${invNo} permanently deleted`, "success");
      });
      els.openTxModalBtn2.addEventListener("click", () => {
        if (!getRolePermissions().canEncode) {
      showPermissionDenied("open Encoding");
          return;
        }
        setActiveTab("encodeSection");
        clearEncodeForm();
        els.encodeCustomer?.focus();
      });
      els.txModalOverlay.addEventListener("click", (e) => {
        if (e.target === els.txModalOverlay) closeTxModal();
      });
      document.addEventListener("keydown", (e) => {
        const adminResetOpen = !!els.adminResetOverlay?.classList.contains("open");
        const adminPasswordOpen = !!els.adminPasswordOverlay?.classList.contains("open");
        const profileOpen = !!els.profileOverlay?.classList.contains("open");
        const agingDetailOpen = !!els.agingDetailOverlay?.classList.contains("open");
        const headerMenuOpen = !!els.moreMenu?.classList.contains("open") || !!els.adminMenu?.classList.contains("open") || !!els.topbarProfileMenu?.classList.contains("open");
        if (!state.authenticated && !adminResetOpen && !adminPasswordOpen && !profileOpen) return;
        if (headerMenuOpen && e.key === "Escape") {
          e.preventDefault();
          closeHeaderMenus();
          return;
        }
        if (adminResetOpen && e.key === "Escape") {
          e.preventDefault();
          closeAdminResetModal();
          return;
        }
        if (adminPasswordOpen && e.key === "Escape") {
          e.preventDefault();
          closeAdminPasswordModal();
          return;
        }
        if (profileOpen && e.key === "Escape") {
          e.preventDefault();
          closeProfileModal();
          return;
        }
        if (agingDetailOpen && e.key === "Escape") {
          e.preventDefault();
          closeAgingDetailModal(true);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && adminPasswordOpen) {
          e.preventDefault();
          saveAdminPasswordChange();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && state.summaryEditModalOpen) {
          e.preventDefault();
          saveSummaryEditTransaction();
          return;
        }
        if (e.key === "Escape") {
          if (state.summaryEditModalOpen) closeSummaryEditModal(true);
          else closeTxModal();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          if (els.dashboardSearch) els.dashboardSearch.focus(); else if (els.customerFilter) els.customerFilter.focus();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
          e.preventDefault();
          if (!getRolePermissions().canEncode) {
      showPermissionDenied("open Encoding");
            return;
          }
          setActiveTab("encodeSection");
          clearEncodeForm();
          els.encodeCustomer?.focus();
        }
      });

      const refreshSummaryDashboard = () => {
        renderSalesTable();
        renderStats();
      };
      if (els.customerFilter) els.customerFilter.addEventListener("change", refreshSummaryDashboard);
      if (els.monthFilter) els.monthFilter.addEventListener("change", refreshSummaryDashboard);
      if (els.statusFilter) els.statusFilter.addEventListener("change", refreshSummaryDashboard);
      if (els.dashboardSearch) els.dashboardSearch.addEventListener("input", refreshSummaryDashboard);
      if (els.dashboardRefreshBtn) els.dashboardRefreshBtn.addEventListener("click", refreshSummaryDashboard);
      const sectionTabs = document.getElementById("summarySectionTabs");
      if (sectionTabs) {
        sectionTabs.addEventListener("click", (e) => {
          const tab = e.target.closest(".section-tab");
          if (!tab) return;
          sectionTabs.querySelectorAll(".section-tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          state.summarySectionTab = tab.dataset.section || "ALL";
          renderSalesTable();
          renderStats();
          updateSectionTabCounts();
        });
      }
      if (els.dashboardFilterFocusBtn) els.dashboardFilterFocusBtn.addEventListener("click", () => els.dashboardSearch?.focus());
      if (els.dashboardMoreFiltersBtn) els.dashboardMoreFiltersBtn.addEventListener("click", () => els.customerFilter?.focus());
      if (els.dashboardClearFiltersBtn) els.dashboardClearFiltersBtn.addEventListener("click", () => {
        if (els.dashboardSearch) els.dashboardSearch.value = "";
        if (els.customerFilter) els.customerFilter.value = "all";
        if (els.monthFilter) els.monthFilter.value = "all";
        if (els.statusFilter) els.statusFilter.value = "all";
        refreshSummaryDashboard();
      });
      const loadTxBtn = document.getElementById("loadTransactionsBtn");
      if (loadTxBtn) {
        loadTxBtn.addEventListener("click", () => {
          loadTxBtn.style.display = "none";
          const card = document.getElementById("summaryTableCard");
          if (card) card.style.display = "";
          salesTableLoaded = true;
          renderSalesTable();
        });
      }
      if (els.exportSalesCsvBtn) els.exportSalesCsvBtn.addEventListener("click", exportVisibleSalesCsv);
      if (els.exportSalesXlsxBtn) els.exportSalesXlsxBtn.addEventListener("click", exportVisibleSalesXlsx);
      if (els.logoutBtn) els.logoutBtn.addEventListener("click", () => {
        if (!confirm("Sign out of the office system?")) return;
        signOutCurrentUser("logout");
      });
      if (els.summaryEditForm) els.summaryEditForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveSummaryEditTransaction();
      });
      if (els.summaryEditSaveBtn) els.summaryEditSaveBtn.addEventListener("click", saveSummaryEditTransaction);
      if (els.summaryEditClearBtn) els.summaryEditClearBtn.addEventListener("click", () => {
        clearSummaryEditForm();
        closeSummaryEditModal(true);
      });
      if (els.summaryEditCancelBtn) els.summaryEditCancelBtn.addEventListener("click", cancelSummaryEditTransaction);
      if (els.summaryEditCloseBtn) els.summaryEditCloseBtn.addEventListener("click", () => closeSummaryEditModal(true));
      if (els.summaryEditPanel) {
        els.summaryEditPanel.addEventListener("click", (e) => {
          if (e.target === els.summaryEditPanel) {
            closeSummaryEditModal(true);
          }
        });
      }
      if (els.agingDetailBtns) {
        els.agingDetailBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const filter = btn.dataset.agingDetail || "all";
            state.agingFilter = filter;
            renderAgingReport();
            openAgingDetailModal(filter);
          });
        });
      }
      if (els.agingDetailOverlay) {
        els.agingDetailOverlay.addEventListener("click", (e) => {
          if (e.target === els.agingDetailOverlay) closeAgingDetailModal(true);
        });
      }
      if (els.closeAgingDetailBtn) els.closeAgingDetailBtn.addEventListener("click", () => closeAgingDetailModal(true));
      if (els.agingDetailTableBody) {
        els.agingDetailTableBody.addEventListener("click", (e) => {
          const row = e.target.closest("tr[data-aging-detail-index]");
          if (!row) return;
          selectAgingDetailRow(Number(row.dataset.agingDetailIndex || 0));
        });
      }
      if (els.summaryEditDate) els.summaryEditDate.addEventListener("change", updateSummaryEditDueDate);
      if (els.summaryEditPaymentTerms) els.summaryEditPaymentTerms.addEventListener("change", updateSummaryEditDueDate);
      if (els.summaryEditCustomer) els.summaryEditCustomer.addEventListener("blur", syncSummaryCustomerFieldsFromName);
      if (els.summaryEditCustomer) els.summaryEditCustomer.addEventListener("change", syncSummaryCustomerFieldsFromName);
      if (els.summaryEditPayment) els.summaryEditPayment.addEventListener("input", syncSummaryEditPaymentHelper);
      if (els.summaryEditPayment) els.summaryEditPayment.addEventListener("change", syncSummaryEditPaymentHelper);
      if (els.summaryEditStatus) els.summaryEditStatus.addEventListener("change", syncSummaryEditPaymentHelper);
      if (els.summaryEditGross) els.summaryEditGross.addEventListener("input", syncSummaryEditPaymentHelper);
      if (els.summaryEditFreight) els.summaryEditFreight.addEventListener("input", syncSummaryEditPaymentHelper);
      if (els.summaryEditReturns) els.summaryEditReturns.addEventListener("input", syncSummaryEditPaymentHelper);
      if (els.summaryEditEwt) els.summaryEditEwt.addEventListener("input", syncSummaryEditPaymentHelper);
      if (els.auditLogFilter) els.auditLogFilter.addEventListener("change", renderAuditLog);
      if (els.auditLogSearch) els.auditLogSearch.addEventListener("input", renderAuditLog);
      if (els.auditLogFrom) els.auditLogFrom.addEventListener("change", renderAuditLog);
      if (els.auditLogTo) els.auditLogTo.addEventListener("change", renderAuditLog);
      if (els.auditRowsLimit) els.auditRowsLimit.addEventListener("change", renderAuditLog);
      if (els.auditRefreshBtn) els.auditRefreshBtn.addEventListener("click", renderAuditLog);
      if (els.auditClearFiltersBtn) els.auditClearFiltersBtn.addEventListener("click", () => {
        if (els.auditLogFilter) els.auditLogFilter.value = "all";
        if (els.auditLogSearch) els.auditLogSearch.value = "";
        if (els.auditLogFrom) els.auditLogFrom.value = "";
        if (els.auditLogTo) els.auditLogTo.value = "";
        renderAuditLog();
      });
      if (els.auditExportCsvBtn) els.auditExportCsvBtn.addEventListener("click", exportAuditLogCsv);
      if (els.auditExportJsonBtn) els.auditExportJsonBtn.addEventListener("click", exportAuditLogJson);
      els.seedBtn.addEventListener("click", () => {
        if (!getRolePermissions().canResetSample) {
          showPermissionDenied("reset sample data");
          return;
        }
        if (!confirm("Reset to sample data and overwrite current saved transactions?")) return;
        state.transactions = sampleTransactions.slice();
        state.customerProfiles = [];
        seedCustomerProfilesFromTransactions();
        saveCustomerProfiles();
        recomputeAll();
        toast("Sample data restored successfully", "success");
      });
      els.downloadBackupBtn.addEventListener("click", backupJson);
      if (els.restoreBackupBtn) {
        els.restoreBackupBtn.addEventListener("click", () => {
          if (!getRolePermissions().canResetSample) {
            showPermissionDenied("restore a backup");
            return;
          }
          if (els.restoreBackupInput) {
            els.restoreBackupInput.value = "";
            els.restoreBackupInput.click();
          }
        });
      }
      if (els.restoreBackupInput) {
        els.restoreBackupInput.addEventListener("change", async () => {
          const file = els.restoreBackupInput.files && els.restoreBackupInput.files[0];
          try {
            await restoreBackupFromFile(file);
          } catch (err) {
            console.error("Could not restore backup", err);
            alert(err?.message || "Could not restore backup.");
          } finally {
            els.restoreBackupInput.value = "";
          }
        });
      }
      if (els.settingsBackupBtn) {
        els.settingsBackupBtn.addEventListener("click", backupJson);
      }
      if (els.clearBackupHistoryBtn) {
        els.clearBackupHistoryBtn.addEventListener("click", () => {
          if (!confirm("Clear the backup history list? This will not delete the backup files on your computer.")) return;
          clearBackupHistory();
        });
      }
      const resetAllBtn = document.getElementById("resetAllDataBtn");
      if (resetAllBtn) {
        resetAllBtn.addEventListener("click", () => {
          if (!confirm("DELETE ALL DATA? This will remove all transactions, customers, audit log, and settings. This cannot be undone.")) return;
          if (!confirm("Are you absolutely sure? Type the data to confirm.")) return;
          localStorage.removeItem(`${STORAGE_KEY}-transactions`);
          localStorage.removeItem(`${STORAGE_KEY}-customer-profiles`);
          localStorage.removeItem(`${STORAGE_KEY}-audit-log`);
          localStorage.removeItem(`${STORAGE_KEY}-settings`);
          localStorage.removeItem(`${STORAGE_KEY}-data-version`);
          localStorage.removeItem(`${STORAGE_KEY}-soa-header`);
          localStorage.removeItem(`${STORAGE_KEY}-auth-users`);
          localStorage.removeItem(`${LAST_BACKUP_HISTORY_KEY}`);
          state.transactions = [];
          state.customerProfiles = [];
          state.auditLog = [];
          state.authUsers = getDefaultAuthUsers();
          renderSalesTable();
          renderStats();
          renderAgingReport();
          renderAuditLog();
          renderCustomerList();
          renderSoaCustomerOptions();
          renderBackupHistory();
          toast("All data has been reset", "success");
        });
      }
      if (els.exportBackupHistoryBtn) {
        els.exportBackupHistoryBtn.addEventListener("click", exportBackupHistory);
      }
      if (els.exportBackupHistoryCsvBtn) {
        els.exportBackupHistoryCsvBtn.addEventListener("click", exportBackupHistoryCsv);
      }
      if (els.copyLatestBackupBtn) {
        els.copyLatestBackupBtn.addEventListener("click", copyLatestBackupFilename);
      }
      if (els.copyLatestBackupPathBtn) {
        els.copyLatestBackupPathBtn.addEventListener("click", copyLatestBackupPathHint);
      }
      if (els.undoLastImportBtn) {
        els.undoLastImportBtn.addEventListener("click", restoreImportSnapshot);
      }
      if (els.closeImportPreviewBtn) {
        els.closeImportPreviewBtn.addEventListener("click", closeImportPreviewOverlay);
      }
      if (els.cancelImportPreviewBtn) {
        els.cancelImportPreviewBtn.addEventListener("click", closeImportPreviewOverlay);
      }
      if (els.confirmImportPreviewBtn) {
        els.confirmImportPreviewBtn.addEventListener("click", () => {
          const pending = state.importPreview;
          if (!pending) return;
          const mode = els.importModeSelect && els.importModeSelect.value === "merge" ? "merge" : "replace";
          closeImportPreviewOverlay();
          applyImportedData(pending.imported, pending.fileName, mode);
        });
      }
      if (els.importModeSelect) {
        els.importModeSelect.addEventListener("change", () => {
          if (state.importPreview) renderImportPreview(state.importPreview.imported, state.importPreview.fileName);
        });
      }
      if (els.importPreviewOverlay) {
        els.importPreviewOverlay.addEventListener("click", (event) => {
          if (event.target === els.importPreviewOverlay) closeImportPreviewOverlay();
        });
      }

      els.generateSoaBtn.addEventListener("click", () => generateSoa(els.soaCustomerSelect.value, true));
      if (els.soaExportCsvBtn) els.soaExportCsvBtn.addEventListener("click", exportSoaCsv);
      if (els.soaExportXlsxBtn) els.soaExportXlsxBtn.addEventListener("click", exportSoaXlsx);
      if (els.soaTransactionSearch) els.soaTransactionSearch.addEventListener("input", renderSoaModernRows);
      if (els.soaShowFilter) els.soaShowFilter.addEventListener("change", renderSoaModernRows);
      if (els.soaDateFrom) els.soaDateFrom.addEventListener("change", () => generateSoa(els.soaCustomerSelect.value, false));
      if (els.soaDateTo) els.soaDateTo.addEventListener("change", () => generateSoa(els.soaCustomerSelect.value, false));
      if (els.soaAsOfDate) els.soaAsOfDate.addEventListener("change", () => generateSoa(els.soaCustomerSelect.value, false));
      if (els.soaModernTabs) els.soaModernTabs.forEach((btn) => btn.addEventListener("click", () => setSoaActiveTab(btn.dataset.soaTab || "transactions")));
      if (els.soaModernBody) els.soaModernBody.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-soa-load-inv]");
        if (!btn) return;
        const inv = btn.dataset.soaLoadInv || "";
        if (els.soaTransactionSelect) {
          els.soaTransactionSelect.value = inv;
          loadSoaTransactionIntoEditor(getSelectedSoaTransaction(state.currentSoaRows || []));
          setSoaActiveTab("editor");
        }
      });
      els.printSoaBtn.addEventListener("click", () => printWithView("soa"));
      els.printSoaBtn2.addEventListener("click", () => printWithView("soa"));
      if (els.printAgingBtn) els.printAgingBtn.addEventListener("click", () => printWithView("aging"));
      els.applySoaHeaderBtn.addEventListener("click", () => {
        state.soaHeader.customer = els.soaEditCustomer.value.trim() || els.soaCustomerSelect.value;
        state.soaHeader.address = els.soaEditAddress.value.trim() || state.soaHeader.address;
        state.soaHeader.terms = els.soaEditTerms.value.trim() || state.soaHeader.terms;
        state.soaHeader.modePayment = els.soaEditMode.value.trim() || state.soaHeader.modePayment;
        state.soaHeader.email = els.soaEditEmail.value.trim() || state.soaHeader.email;
        state.soaHeader.soaNo = els.soaEditNo.value.trim() || state.soaHeader.soaNo;
        state.soaHeader.preparedBy = els.soaPreparedBy?.value.trim() || state.soaHeader.preparedBy;
        state.soaHeader.approvedBy = els.soaApprovedBy?.value.trim() || state.soaHeader.approvedBy;
        saveSoaHeader();
        generateSoa(els.soaCustomerSelect.value, false);
        toast("SOA header applied successfully", "success");
      });
      els.soaLogoInput.addEventListener("change", () => {
        const file = els.soaLogoInput.files && els.soaLogoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          state.soaHeader.logoDataUrl = String(reader.result || "");
          saveSoaHeader();
          applySoaLogoPreview();
          toast("SOA logo updated successfully", "success");
        };
        reader.readAsDataURL(file);
      });
      els.refreshAgingBtn.addEventListener("click", renderAgingReport);
      els.exportAgingCsvBtn.addEventListener("click", exportAgingCsv);
      if (els.exportAgingXlsxBtn) els.exportAgingXlsxBtn.addEventListener("click", exportAgingXlsx);
      if (els.agingExportFullBtn) els.agingExportFullBtn.addEventListener("click", exportFullAgingCsv);
      if (els.agingViewReportBtn) els.agingViewReportBtn.addEventListener("click", renderAgingReport);
      [els.agingAsOfDate, els.agingGroupBy, els.agingShowFilter].filter(Boolean).forEach((control) => {
        control.addEventListener("change", renderAgingReport);
      });
      if (els.agingSearchInput) els.agingSearchInput.addEventListener("input", renderAgingReport);
      if (els.agingFilterBtns) {
        els.agingFilterBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            state.agingFilter = btn.dataset.agingFilter || "all";
            if (els.agingShowFilter) {
              els.agingShowFilter.value = state.agingFilter === "cancelled" ? "cancelled" : "all";
            }
            renderAgingReport();
          });
        });
      }
      if (els.agingTableBody) {
        els.agingTableBody.addEventListener("click", (e) => {
          const action = e.target.closest("[data-aging-detail]");
          if (!action) return;
          const filter = action.dataset.agingDetail || state.agingFilter || "all";
          state.agingFilter = filter;
          renderAgingReport();
          openAgingDetailModal(filter);
        });
      }
      els.soaLoadTxBtn.addEventListener("click", () => loadSoaTransactionIntoEditor(getSelectedSoaTransaction(state.transactions.filter((tx) => tx.customer === els.soaCustomerSelect.value))));
      els.soaSaveTxBtn.addEventListener("click", saveSelectedSoaTransaction);
      els.soaCancelInvoiceBtn.addEventListener("click", cancelSelectedSoaInvoice);

      els.soaCustomerSelect.addEventListener("change", () => {
        state.selectedCustomer = els.soaCustomerSelect.value;
        generateSoa(els.soaCustomerSelect.value, false);
      });
      const soaSearchInput = document.getElementById("soaCustomerSearch");
      if (soaSearchInput) {
        soaSearchInput.addEventListener("input", () => {
          const q = normalize(soaSearchInput.value);
          const opts = els.soaCustomerSelect.options;
          let firstMatch = null;
          for (let i = 0; i < opts.length; i++) {
            const match = normalize(opts[i].text).includes(q);
            opts[i].hidden = q.length > 0 && !match;
            if (match && !firstMatch) firstMatch = opts[i].value;
          }
          if (q.length > 0 && firstMatch) els.soaCustomerSelect.value = firstMatch;
          if (q.length > 0 && els.soaCustomerSelect.value) {
            state.selectedCustomer = els.soaCustomerSelect.value;
            generateSoa(els.soaCustomerSelect.value, false);
          }
        });
      }
      els.soaTransactionSelect.addEventListener("change", () => {
        const rows = state.transactions.filter((tx) => tx.customer === els.soaCustomerSelect.value);
        loadSoaTransactionIntoEditor(getSelectedSoaTransaction(rows));
      });

      ["encodeDate", "encodeInvNo", "encodeCustomer", "encodeCustomerAddress", "encodeCustomerTin", "encodeGross", "encodeFreight", "encodeReturns", "encodeEwt", "encodePayment", "encodeDueDate", "encodeStatus", "encodeDocType", "encodeM1M2", "encodePoNumber", "encodePaymentTerms", "encodePaymentStatus", "encodeCheckNumber", "encodeCheckBank", "encodeCheckAmount", "encodeCheckDate", "encodeCollectionReceiptNo", "encodeBankDetails", "encodeOtherRemarks", "encodeRep"].forEach((key) => {
        const field = els[key];
        if (field) {
          field.addEventListener("input", syncEncodePreview);
          field.addEventListener("change", syncEncodePreview);
        }
      });
      if (els.encodeDate) els.encodeDate.addEventListener("change", updateEncodeDueDate);
      if (els.encodePaymentTerms) els.encodePaymentTerms.addEventListener("change", updateEncodeDueDate);
      if (els.encodeCustomer) els.encodeCustomer.addEventListener("change", syncCustomerFieldsFromName);
      if (els.encodeCustomer) els.encodeCustomer.addEventListener("blur", syncCustomerFieldsFromName);
      if (els.encodeCustomerMasterName) els.encodeCustomerMasterName.addEventListener("change", syncCustomerMasterFromName);
      if (els.encodeCustomerMasterName) els.encodeCustomerMasterName.addEventListener("blur", syncCustomerMasterFromName);
      if (els.saveCustomerProfileBtn) els.saveCustomerProfileBtn.addEventListener("click", saveCustomerMasterProfile);
      if (els.applyCustomerProfileBtn) els.applyCustomerProfileBtn.addEventListener("click", applyCustomerMasterToTransaction);
      if (els.clearCustomerProfileBtn) els.clearCustomerProfileBtn.addEventListener("click", clearCustomerMasterForm);
      if (els.encodeCustomerMasterPaymentTerms) els.encodeCustomerMasterPaymentTerms.addEventListener("change", syncCustomerMasterFromName);
      if (els.encodeCustomerMasterName) els.encodeCustomerMasterName.addEventListener("input", syncCustomerMasterFromName);
      if (els.encodePaymentStatus) els.encodePaymentStatus.addEventListener("change", handleEncodePaymentStatusChange);
      if (els.addEncodeItemBtn) els.addEncodeItemBtn.addEventListener("click", () => {
        if (!els.encodeItemsBody) return;
        els.encodeItemsBody.appendChild(makeEncodeItemRow());
        syncEncodeGrossFromItems();
      });
      if (els.encodeModeBtns) {
        els.encodeModeBtns.forEach((btn) => {
          btn.addEventListener("click", () => setEncodeView(btn.dataset.encodeView || "transaction"));
        });
      }
      if (els.refreshAccountsBtn) {
        els.refreshAccountsBtn.addEventListener("click", () => {
          renderAccountList();
          setAccountTab("list");
          toast("Account list refreshed", "info");
        });
      }
      if (els.accountListBody) {
        els.accountListBody.addEventListener("click", (e) => {
          const row = e.target.closest("tr[data-account-username]");
          if (!row) return;
          selectAccount(row.dataset.accountUsername || "");
          setAccountTab("list");
        });
      }
      if (els.saveAccountAccessBtn) {
        els.saveAccountAccessBtn.addEventListener("click", saveSelectedAccountAccess);
      }
      if (els.resetAccountAccessBtn) {
        els.resetAccountAccessBtn.addEventListener("click", resetSelectedAccountAccessToRole);
      }


      els.tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
      });

      window.addEventListener("hashchange", () => {
        const tabId = location.hash.replace("#", "");
        if (tabId && document.getElementById(tabId)) {
          setActiveTab(tabId);
        }
      });

      const sidebarLogo = document.querySelector(".sidebar-logo");
      if (sidebarLogo) {
        sidebarLogo.style.cursor = "pointer";
        sidebarLogo.addEventListener("click", () => setActiveTab("summarySection"));
      }

      const sortHeaders = document.querySelectorAll("#salesTable thead th[data-sort]");
      sortHeaders.forEach((th) => {
        th.addEventListener("click", () => {
          const key = th.dataset.sort;
          if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
          else {
            state.sortKey = key;
            state.sortDir = "asc";
          }
          renderSalesTable();
        });
      });

      els.txStatus.addEventListener("change", () => {
        if (els.txStatus.value === "PAID" && Number(els.txPayment.value || 0) <= 0) {
          const gross = Number(els.txGross.value || 0);
          const freight = Number(els.txFreight.value || 0);
          const returnsDisc = Number(els.txReturns.value || 0);
          const ewt = Number(els.txEwt.value || 0);
          els.txPayment.value = Math.max(gross + freight - returnsDisc - ewt, 0).toFixed(2);
        }
      });
    }

    /* ===== SIDEBAR + TOPBAR LOGIC ===== */
    const sidebarNav = document.getElementById("sidebarNav");
    const appSidebar = document.getElementById("appSidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidebarCollapseBtn = document.getElementById("sidebarCollapseBtn");
    const topbarHamburger = document.getElementById("topbarHamburger");
    const topbarPageTitle = document.getElementById("topbarPageTitle");
    const topbarPageSubtitle = document.getElementById("topbarPageSubtitle");
    const topbarUserName = document.getElementById("topbarUserName");
    const topbarUserRole = document.getElementById("topbarUserRole");
    const topbarUserAvatar = document.getElementById("topbarUserAvatar");
    const topbarTime = document.getElementById("topbarTime");

    const pageInfo = {
      summarySection: { title: "Wholesale Sales Summary", subtitle: "Real-time overview of sales performance, collections, and receivables." },
      encodeSection: { title: "Encoding", subtitle: "Create and manage sales invoices and transactions." },
      soaSection: { title: "Statement of Account", subtitle: "View customer balance and transaction details." },
      agingSection: { title: "Aging Report", subtitle: "Review customer receivables by aging bucket for collections follow-up." },
      settingsSection: { title: "Settings", subtitle: "Configure system settings and defaults." },
      accountSection: { title: "Account Management", subtitle: "Manage user accounts and access permissions." },
      auditSection: { title: "Audit Trail", subtitle: "Review activity logs, changes, exports, and admin actions." }
    };

    function updateTopbarForSection(sectionId) {
      const info = pageInfo[sectionId] || pageInfo.summarySection;
      if (topbarPageTitle) topbarPageTitle.textContent = info.title;
      if (topbarPageSubtitle) topbarPageSubtitle.textContent = info.subtitle;
    }

    function updateSidebarActive(tabId) {
      if (!sidebarNav) return;
      sidebarNav.querySelectorAll(".sidebar-nav-item").forEach(item => {
        item.classList.toggle("active", item.dataset.tab === tabId);
      });
    }

    if (sidebarNav) {
      sidebarNav.addEventListener("click", (e) => {
        const navItem = e.target.closest(".sidebar-nav-item");
        if (!navItem || !navItem.dataset.tab) return;
        e.preventDefault();
        const tabId = navItem.dataset.tab;
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (tabBtn) {
          tabBtn.click();
        } else if (typeof setActiveTab === "function") {
          setActiveTab(tabId);
        }
        updateSidebarActive(tabId);
        updateTopbarForSection(tabId);
        if (appSidebar && window.innerWidth <= 900) {
          appSidebar.classList.remove("open");
          if (sidebarOverlay) sidebarOverlay.classList.remove("show");
        }
      });
    }

    if (topbarHamburger) {
      topbarHamburger.addEventListener("click", () => {
        if (appSidebar) appSidebar.classList.toggle("open");
        if (sidebarOverlay) sidebarOverlay.classList.toggle("show");
      });
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", () => {
        if (appSidebar) appSidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
      });
    }
    if (sidebarCollapseBtn) {
      sidebarCollapseBtn.addEventListener("click", () => {
        if (appSidebar) appSidebar.classList.toggle("collapsed");
      });
    }

    function updateUserChip() {
      const user = state.currentUser;
      if (!user) return;
      if (topbarUserName) topbarUserName.textContent = user.fullName || user.username || "User";
      if (topbarUserRole) topbarUserRole.textContent = getCurrentUserRoleLabel(user);
      if (topbarUserAvatar) {
        if (user.profileImage) {
          topbarUserAvatar.innerHTML = `<img src="${escapeHtml(user.profileImage)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
        } else {
          topbarUserAvatar.textContent = getCurrentUserInitials();
        }
      }
      updateProfileMenu();
    }

    function updateTopbarTime() {
      if (!topbarTime) return;
      const now = new Date();
      const options = { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true };
      topbarTime.textContent = now.toLocaleTimeString("en-US", options);
    }
    setInterval(updateTopbarTime, 1000);
    updateTopbarTime();

    async function init() {
      const savedVersion = localStorage.getItem(`${STORAGE_KEY}-data-version`);
      if (savedVersion !== "2026-v8") {
        localStorage.removeItem(`${STORAGE_KEY}-transactions`);
        localStorage.removeItem(`${STORAGE_KEY}-customer-profiles`);
        localStorage.removeItem(`${STORAGE_KEY}-audit-log`);
        localStorage.removeItem(`${STORAGE_KEY}-data-version`);
      }
      updateLoginApiStatus();
      loadAdminResetRecentUsers();
      renderAdminResetRecentUsers();
      await loadAuthUsers();
      await loadSettings();
      updateBackupStatusChip();
      renderBackupHistory();
      updateUndoLastImportState();
      const authSession = readAuthSession();
      if (authSession) {
        state.authenticated = true;
        state.currentUser = authSession;
        hydrateCurrentUserFromDirectory();
      }
      syncAuthUi();
      updateAuthBadges();
      updateUserChip();
      updateProfileMenu();
      updateSidebarActive(state.activeTab);
      updateTopbarForSection(state.activeTab);
      loadSoaHeader();
      loadTheme();
      if (state.authenticated) {
        await refreshAuthenticatedWorkspace();
      } else {
        await loadAuditLog();
        await loadCustomerProfiles();
        await loadTransactions();
        state.transactions = state.transactions.map(computeTransaction);
        if (!state.customerProfiles.length) {
          seedCustomerProfilesFromTransactions();
          saveCustomerProfiles();
        }
      }
      wireEvents();
      const hashTab = location.hash.replace("#", "");
      if (hashTab && document.getElementById(hashTab)) {
        setActiveTab(hashTab);
      }
      document.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".account-delete-btn");
        if (deleteBtn) {
          e.stopPropagation();
          const username = deleteBtn.dataset.deleteUser || "";
          if (!username) return;
          if (username === state.currentUser?.username) { toast("Cannot delete your own account", "error"); return; }
          const user = (state.authUsers || []).find((u) => normalize(u.username) === normalize(username));
          if (!user) { toast("Account not found", "error"); return; }
          if (!confirm(`Delete account "${user.fullName}" (${user.username})? This cannot be undone.`)) return;
          const idx = state.authUsers.findIndex((u) => normalize(u.username) === normalize(username));
          if (idx >= 0) {
            state.authUsers.splice(idx, 1);
            saveAuthUsers();
            renderAccountList();
            pushAuditLog({ action: "Deleted account", invNo: "", customer: user.fullName, actor: state.currentUser?.fullName || "Local user", detail: `Deleted account ${user.username} (${user.role})` });
            toast(`Account "${user.username}" deleted`, "success");
          }
          return;
        }
        const auditBtn = e.target.closest(".account-audit-btn");
        if (auditBtn) {
          e.stopPropagation();
          const username = auditBtn.dataset.auditUser || "";
          if (username) {
            setActiveTab("auditSection");
            setTimeout(() => {
              const searchInput = document.getElementById("auditLogSearch") || document.querySelector("#auditSection input[type='search']");
              if (searchInput) {
                searchInput.value = username;
                searchInput.dispatchEvent(new Event("input", { bubbles: true }));
                searchInput.focus();
              }
              toast(`Showing audit trail for ${username}`, "info");
            }, 300);
          }
        }
      });
      setAccountTab(state.accountTab || "create");
      renderAccountList();
      if (state.authenticated && !state.selectedAccountUsername) {
        selectAccount(state.currentUser?.username || state.authUsers?.[0]?.username || "");
      }
      renderAuditLog();
      renderCustomerList();
      renderSoaCustomerOptions();
      if (els.soaAsOfDate && !els.soaAsOfDate.value) els.soaAsOfDate.value = todayISO();
      setSoaActiveTab(state.soaActiveTab || "transactions");
      clearEncodeForm();
      renderStats();
      renderAgingReport();
      if (els.soaCustomerSelect.value) {
        generateSoa(els.soaCustomerSelect.value, false);
      }
      els.soaEditAddress.value = state.soaHeader.address;
      els.soaEditTerms.value = state.soaHeader.terms;
      els.soaEditMode.value = state.soaHeader.modePayment;
      els.soaEditEmail.value = state.soaHeader.email;
      els.soaEditNo.value = state.soaHeader.soaNo;
      if (els.soaPreparedBy) els.soaPreparedBy.value = state.soaHeader.preparedBy || "";
      if (els.soaApprovedBy) els.soaApprovedBy.value = state.soaHeader.approvedBy || "";
      applySoaLogoPreview();
      els.txDate.value = todayISO();
      els.txDueDate.value = addDaysISO(todayISO(), 30);
      clearEncodeForm();
      saveSoaHeader();
      if (!state.authenticated && els.loginUsername) {
        els.loginUsername.focus();
      }
    }



    /* ===== PHASE 8: EMPLOYEE AUDIT ACCOUNTABILITY ===== */
    const PHASE8_AUDIT_FIELDS = [
      "docType", "m1m2", "date", "poNumber", "invNo", "customer", "customerAddress", "customerTin",
      "representative", "items", "gross", "freight", "returnsDisc", "ewt", "payment", "paymentTerms",
      "dueDate", "paymentDate", "paymentStatus", "collectionReceiptNo", "bankDetails", "checkNumber",
      "checkBank", "checkAmount", "checkDate", "otherRemarks", "status", "isCancelled", "cancellationReason",
      "isDeleted", "deleteReason"
    ];
    const PHASE8_SENSITIVE_FIELDS = new Set([
      "invNo", "customer", "date", "gross", "freight", "returnsDisc", "ewt", "payment", "paymentTerms",
      "dueDate", "paymentStatus", "checkNumber", "checkBank", "checkAmount", "checkDate", "status",
      "isCancelled", "cancellationReason", "isDeleted", "deleteReason"
    ]);

    function phase8ActorMeta() {
      const user = state.currentUser || {};
      const fullName = String(user.fullName || "").trim();
      const username = String(user.username || "").trim();
      const role = String(user.role || "Local").trim() || "Local";
      const department = String(user.department || "").trim();
      const actor = fullName || username || state.soaHeader?.preparedBy || "Local user";
      return { actor, username, role, department };
    }

    function phase8DeviceInfo() {
      const ua = navigator.userAgent || "Browser";
      const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
      const platform = navigator.platform || "Device";
      return `${browser} / ${platform}`;
    }

    function phase8NormalizeComparable(value) {
      if (Array.isArray(value)) {
        return JSON.stringify(value.map((item) => {
          if (!item || typeof item !== "object") return item;
          return { desc: item.desc || "", qty: Number(item.qty || 0), price: Number(item.price || 0), total: Number(item.total || 0) };
        }));
      }
      if (value && typeof value === "object") return JSON.stringify(value);
      if (value === null || value === undefined || value === "") return "";
      if (typeof value === "number") return String(roundMoney(value));
      return String(value);
    }

    function phase8FieldChangeObjects(before = {}, after = {}, fields = PHASE8_AUDIT_FIELDS) {
      const changes = [];
      fields.forEach((field) => {
        const prev = before?.[field];
        const next = after?.[field];
        if (phase8NormalizeComparable(prev) !== phase8NormalizeComparable(next)) {
          changes.push({
            field,
            label: humanizeField(field),
            oldValue: formatAuditValue(prev),
            newValue: formatAuditValue(next),
          });
        }
      });
      return changes;
    }

    function phase8RequiresReason(before, after, action = "") {
      if (/delete|cancel/i.test(action)) return true;
      const changes = phase8FieldChangeObjects(before, after, PHASE8_AUDIT_FIELDS);
      return changes.some((change) => PHASE8_SENSITIVE_FIELDS.has(change.field));
    }

    function phase8AskReason(action, tx, before, after, fallback = "") {
      if (!phase8RequiresReason(before, after, action)) return fallback || "";
      const inv = tx?.invNo || after?.invNo || before?.invNo || "record";
      const current = String(fallback || after?.lastTouchReason || before?.lastTouchReason || "").trim();
      const reason = prompt(`Reason required for ${action} on invoice ${inv}:`, current);
      if (reason === null) return null;
      const trimmed = String(reason || "").trim();
      if (!trimmed) {
        alert("Reason is required for this action.");
        return null;
      }
      return trimmed;
    }

    function phase8ApplyTransactionDefaults(tx = {}) {
      const now = new Date().toISOString();
      const createdAt = tx.createdAt || tx.created_at || tx.date || now;
      const createdBy = tx.createdBy || tx.created_by || "Imported / Legacy";
      const createdByUsername = tx.createdByUsername || tx.created_by_username || "";
      const createdByRole = tx.createdByRole || tx.created_by_role || "Legacy";
      const updatedAt = tx.updatedAt || tx.updated_at || createdAt;
      const updatedBy = tx.updatedBy || tx.updated_by || createdBy;
      const updatedByUsername = tx.updatedByUsername || tx.updated_by_username || createdByUsername;
      const updatedByRole = tx.updatedByRole || tx.updated_by_role || createdByRole;
      const lastTouchedAt = tx.lastTouchedAt || tx.last_touched_at || tx.lastActionAt || tx.last_action_at || updatedAt;
      const lastTouchedBy = tx.lastTouchedBy || tx.last_touched_by || updatedBy || createdBy;
      const lastTouchedByUsername = tx.lastTouchedByUsername || tx.last_touched_by_username || updatedByUsername || createdByUsername;
      const lastTouchedRole = tx.lastTouchedRole || tx.last_touched_role || updatedByRole || createdByRole;
      return {
        ...tx,
        createdAt,
        createdBy,
        createdByUsername,
        createdByRole,
        updatedAt,
        updatedBy,
        updatedByUsername,
        updatedByRole,
        lastTouchedAt,
        lastTouchedBy,
        lastTouchedByUsername,
        lastTouchedRole,
        lastAction: tx.lastAction || tx.last_action || (createdBy === "Imported / Legacy" ? "Imported / Legacy Record" : "Created"),
        lastActionAt: tx.lastActionAt || tx.last_action_at || lastTouchedAt,
        lastTouchReason: tx.lastTouchReason || tx.last_touch_reason || "",
        isDeleted: Boolean(tx.isDeleted || tx.is_deleted),
        deletedAt: tx.deletedAt || tx.deleted_at || "",
        deletedBy: tx.deletedBy || tx.deleted_by || "",
        deletedByUsername: tx.deletedByUsername || tx.deleted_by_username || "",
        deletedByRole: tx.deletedByRole || tx.deleted_by_role || "",
        deleteReason: tx.deleteReason || tx.delete_reason || "",
      };
    }

    function phase8CreateTransaction(tx, action = "Created in Encoding") {
      const meta = phase8ActorMeta();
      const now = new Date().toISOString();
      return phase8ApplyTransactionDefaults({
        ...tx,
        createdAt: now,
        createdBy: meta.actor,
        createdByUsername: meta.username,
        createdByRole: meta.role,
        updatedAt: now,
        updatedBy: meta.actor,
        updatedByUsername: meta.username,
        updatedByRole: meta.role,
        lastTouchedAt: now,
        lastTouchedBy: meta.actor,
        lastTouchedByUsername: meta.username,
        lastTouchedRole: meta.role,
        lastAction: action,
        lastActionAt: now,
      });
    }

    function phase8TouchTransaction(tx, action, reason = "") {
      const meta = phase8ActorMeta();
      const now = new Date().toISOString();
      return phase8ApplyTransactionDefaults({
        ...tx,
        updatedAt: now,
        updatedBy: meta.actor,
        updatedByUsername: meta.username,
        updatedByRole: meta.role,
        lastTouchedAt: now,
        lastTouchedBy: meta.actor,
        lastTouchedByUsername: meta.username,
        lastTouchedRole: meta.role,
        lastAction: action,
        lastActionAt: now,
        lastTouchReason: reason || tx.lastTouchReason || "",
      });
    }

    function phase8LastTouchHtml(tx) {
      const who = tx.lastTouchedBy || tx.updatedBy || tx.createdBy || "Imported / Legacy";
      const when = tx.lastTouchedAt || tx.updatedAt || tx.createdAt || "";
      const action = tx.lastAction || (tx.isDeleted ? "Soft Deleted" : tx.isCancelled ? "Cancelled" : "Last update");
      const reason = tx.lastTouchReason || tx.deleteReason || tx.cancellationReason || "";
      return `<span class="last-touch-person">${escapeHtml(who)}</span><span class="last-touch-meta">${escapeHtml(action)}${when ? ` · ${escapeHtml(formatDateTime(when))}` : ""}</span>${reason ? `<span class="last-touch-meta">Reason: ${escapeHtml(reason)}</span>` : ""}`;
    }

    function phase8ActiveTransactions(rows = state.transactions) {
      return (rows || []).filter((tx) => !tx.isDeleted);
    }

    function phase8AuditPayload({ action, module, invNo, customer, detail, before, after, fields, reason, entityType }) {
      const meta = phase8ActorMeta();
      return {
        action,
        module,
        entityType: entityType || "transaction",
        entityId: invNo || after?.invNo || before?.invNo || "",
        invNo: invNo || after?.invNo || before?.invNo || "",
        customer: customer || after?.customer || before?.customer || "",
        actor: meta.actor,
        username: meta.username,
        role: meta.role,
        department: meta.department,
        detail,
        before: before || {},
        after: after || {},
        fields: fields || PHASE8_AUDIT_FIELDS,
        reason: reason || "",
        device: phase8DeviceInfo(),
      };
    }

    const phase8OriginalComputeTransaction = computeTransaction;
    computeTransaction = function phase8ComputeTransaction(tx) {
      const computed = phase8OriginalComputeTransaction(tx || {});
      const normalized = phase8ApplyTransactionDefaults(computed);
      if (normalized.isDeleted) {
        normalized.status = "DELETED";
        normalized.receivable = 0;
      }
      return normalized;
    };

    const phase8OriginalGetCustomers = getCustomers;
    getCustomers = function phase8GetCustomers() {
      const names = new Set();
      state.customerProfiles.forEach((profile) => names.add(profile.name));
      phase8ActiveTransactions(state.transactions).forEach((tx) => names.add(tx.customer));
      return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
    };

    const phase8OriginalGetFilteredTransactions = getFilteredTransactions;
    getFilteredTransactions = function phase8GetFilteredTransactions() {
      return phase8OriginalGetFilteredTransactions().filter((tx) => !tx.isDeleted);
    };

    const phase8OriginalRecomputeAll = recomputeAll;
    recomputeAll = function phase8RecomputeAll() {
      state.transactions = state.transactions.map((tx) => computeTransaction(tx));
      phase8OriginalRecomputeAll();
    };

    pushAuditLog = function phase8PushAuditLog(entry = {}) {
      const changeObjects = Array.isArray(entry.changeSet)
        ? entry.changeSet.filter(Boolean)
        : (entry.before && entry.after && Array.isArray(entry.fields) ? phase8FieldChangeObjects(entry.before, entry.after, entry.fields) : []);
      const changes = Array.isArray(entry.changes) && entry.changes.length
        ? entry.changes.filter(Boolean)
        : changeObjects.map((change) => `${change.label}: ${change.oldValue} -> ${change.newValue}`);
      const meta = phase8ActorMeta();
      const before = entry.before && typeof entry.before === "object" ? JSON.parse(JSON.stringify(entry.before)) : null;
      const after = entry.after && typeof entry.after === "object" ? JSON.parse(JSON.stringify(entry.after)) : null;
      const record = {
        at: new Date().toISOString(),
        action: entry.action || "Action",
        module: entry.module || entry.entityType || "General",
        invNo: entry.invNo || entry.entityId || "",
        customer: entry.customer || "",
        actor: entry.actor || meta.actor,
        username: entry.username || meta.username,
        role: entry.role || meta.role,
        department: entry.department || meta.department,
        detail: entry.detail || "",
        reason: entry.reason || "",
        device: entry.device || phase8DeviceInfo(),
        changes,
        changeSet: changeObjects,
        before,
        after,
        fields: Array.isArray(entry.fields) ? entry.fields.slice() : [],
      };
      state.auditLog.unshift(record);
      state.auditLog = state.auditLog.slice(0, 500);
      saveAuditLog();
      void apiJson("/api/audit", {
        method: "POST",
        body: JSON.stringify({
          action: record.action,
          entityType: entry.entityType || record.module || "general",
          entityId: entry.entityId || record.invNo || "",
          actor: record.actor,
          role: record.role,
          username: record.username,
          detail: record.detail,
          reason: record.reason,
          device: record.device,
          changes: record.changes.join("; "),
          invNo: record.invNo,
          customer: record.customer,
        }),
      }).catch((err) => console.warn("Could not sync audit log to backend", err));
      renderAuditLog();
    };

    function phase8AuditSearchText(entry) {
      return `${entry.action || ""} ${entry.module || ""} ${entry.invNo || ""} ${entry.customer || ""} ${entry.actor || ""} ${entry.username || ""} ${entry.role || ""} ${entry.detail || ""} ${entry.reason || ""} ${entry.device || ""} ${(Array.isArray(entry.changes) ? entry.changes.join(" ") : "")}`.toLowerCase();
    }

    matchesAuditLogEntry = function phase8MatchesAuditLogEntry(entry, criteria) {
      if (criteria.action !== "all" && entry.action !== criteria.action) return false;
      if (criteria.term && !phase8AuditSearchText(entry).includes(criteria.term)) return false;
      const entryDate = String(entry.at || entry.timestamp || "").slice(0, 10);
      if (criteria.from && entryDate && entryDate < criteria.from) return false;
      if (criteria.to && entryDate && entryDate > criteria.to) return false;
      return true;
    };

    renderAuditSummary = function phase8RenderAuditSummary(filteredRows) {
      const allRows = state.auditLog || [];
      const today = todayISO();
      const todayRows = allRows.filter((entry) => String(entry.at || entry.timestamp || "").slice(0, 10) === today);
      const todayCount = todayRows.length;
      const editedToday = todayRows.filter((entry) => /update|edit|changed|created|encoded|payment/i.test(entry.action || "")).length;
      const deleteCancel = allRows.filter((entry) => /delete|cancel/i.test(entry.action || "")).length;
      const latest = allRows[0] || null;
      if (els.auditTotalCount) els.auditTotalCount.textContent = String(allRows.length);
      if (els.auditTodayCount) els.auditTodayCount.textContent = String(todayCount);
      if (els.auditLastAction) els.auditLastAction.textContent = latest?.action || "-";
      if (els.auditLastUser) els.auditLastUser.textContent = latest?.actor || "-";
      const editedEl = document.getElementById("auditEditedTodayCount");
      if (editedEl) editedEl.textContent = String(editedToday);
      const deleteEl = document.getElementById("auditDeleteCancelCount");
      if (deleteEl) deleteEl.textContent = String(deleteCancel);
      if (els.auditLogCountChip) {
        const filteredCount = filteredRows.length;
        els.auditLogCountChip.textContent = `${filteredCount} entr${filteredCount === 1 ? "y" : "ies"}`;
      }
    };

    function phase8FirstChange(entry) {
      const set = Array.isArray(entry.changeSet) && entry.changeSet.length ? entry.changeSet : [];
      if (set.length) return set[0];
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      const first = changes[0] || "";
      const match = String(first).match(/^(.+?):\s*(.*?)\s*->\s*(.*)$/);
      if (match) return { label: match[1], oldValue: match[2], newValue: match[3] };
      return { label: changes.length ? `${changes.length} field${changes.length === 1 ? "" : "s"}` : "-", oldValue: "-", newValue: changes.join("; ") || "-" };
    }

    renderAuditTable = function phase8RenderAuditTable(rows, totalCount) {
      if (!els.auditTableBody) return;
      if (!rows.length) {
        els.auditTableBody.innerHTML = `<tr><td colspan="11" class="empty-state">${state.auditLog.length ? "No matching activity for the current filters." : "No activity recorded yet."}</td></tr>`;
        if (els.auditTableRange) els.auditTableRange.textContent = `Showing 0 of ${totalCount} entries`;
        return;
      }
      els.auditTableBody.innerHTML = rows.map((entry) => {
        const change = phase8FirstChange(entry);
        const role = entry.role || "Local";
        const username = entry.username ? `@${entry.username}` : "";
        const record = entry.invNo || entry.entityId || "-";
        const reason = entry.reason || entry.deleteReason || entry.cancellationReason || "-";
        return `
          <tr>
            <td>${escapeHtml(formatDateTime(entry.at || entry.timestamp || ""))}</td>
            <td><span class="audit-user-stack" style="display:flex;align-items:center;gap:8px;">${(() => { const u = (state.authUsers || []).find(a => normalize(a.username) === normalize(entry.username)); const initials = (entry.actor || "AU").split(/\s+/).map(w => w[0] || "").join("").slice(0,2).toUpperCase(); return u?.profileImage ? `<img src="${escapeHtml(u.profileImage)}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;" />` : `<span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1d6fd6,#0b4f9f);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:800;flex-shrink:0;">${escapeHtml(initials)}</span>`; })()}<span style="display:flex;flex-direction:column;gap:1px;"><strong>${escapeHtml(entry.actor || "Local user")}</strong><small style="color:#64748b;font-size:11px;">${escapeHtml(role)} ${escapeHtml(username)}</small></span></span></td>
            <td>${escapeHtml(entry.module || "General")}</td>
            <td><span class="audit-action-pill">${escapeHtml(entry.action || "Action")}</span></td>
            <td>${escapeHtml(record)}</td>
            <td>${escapeHtml(entry.customer || "-")}</td>
            <td><span class="audit-field-chip">${escapeHtml(change.label || "-")}</span></td>
            <td class="audit-muted-cell">${escapeHtml(change.oldValue || "-")}</td>
            <td class="audit-muted-cell">${escapeHtml(change.newValue || "-")}</td>
            <td class="audit-reason-cell">${escapeHtml(reason)}</td>
            <td class="audit-device-cell">${escapeHtml(entry.device || "-")}</td>
          </tr>
        `;
      }).join("");
      if (els.auditTableRange) {
        els.auditTableRange.textContent = `Showing 1 to ${rows.length} of ${totalCount} entr${totalCount === 1 ? "y" : "ies"}`;
      }
    };

    renderAuditLog = function phase8RenderAuditLog() {
      refreshAuditActionOptions();
      const filteredRows = getFilteredAuditLogEntries();
      const limit = Math.max(1, Number(els.auditRowsLimit?.value || 10));
      const rows = filteredRows.slice(0, limit);
      renderAuditSummary(filteredRows);
      renderAuditTable(rows, filteredRows.length);
      if (!els.auditLogList) return;
      if (!rows.length) {
        els.auditLogList.innerHTML = `<div class="audit-log-empty">${state.auditLog.length ? "No matching activity for the current filters." : "No activity recorded yet."}</div>`;
        return;
      }
      els.auditLogList.innerHTML = rows.map((entry) => `
        <div class="audit-log-item">
          <div class="topline">
            <div class="action">${escapeHtml(entry.action || "Action")}</div>
            <div class="time">${escapeHtml(formatDateTime(entry.at || entry.timestamp || ""))}</div>
          </div>
          <div class="meta">${escapeHtml(entry.module ? `${entry.module} module` : "General activity")}${entry.invNo ? ` | Invoice # ${escapeHtml(entry.invNo)}` : ""}${entry.customer ? ` | ${escapeHtml(entry.customer)}` : ""}</div>
          <div class="meta"><strong>By:</strong> ${escapeHtml(entry.actor || "Local user")} ${entry.role ? `(${escapeHtml(entry.role)})` : ""}</div>
          ${entry.detail ? `<div class="meta">${escapeHtml(entry.detail)}</div>` : ""}
          ${entry.reason ? `<div class="meta reason"><strong>Reason:</strong> ${escapeHtml(entry.reason)}</div>` : ""}
          ${Array.isArray(entry.changes) && entry.changes.length ? `<div class="meta changes"><strong>Changes:</strong> ${escapeHtml(entry.changes.join("; "))}</div>` : ""}
          ${entry.device ? `<div class="meta device">${escapeHtml(entry.device)}</div>` : ""}
        </div>
      `).join("");
    };

    exportAuditLogCsv = function phase8ExportAuditLogCsv() {
      const rows = getFilteredAuditLogEntries().map((entry) => ({
        Timestamp: formatDateTime(entry.at || entry.timestamp || ""),
        User: entry.actor || "",
        Username: entry.username || "",
        Role: entry.role || "",
        Module: entry.module || "",
        Action: entry.action || "",
        "Invoice #": entry.invNo || "",
        Customer: entry.customer || "",
        Reason: entry.reason || "",
        Details: entry.detail || "",
        Changes: Array.isArray(entry.changes) ? entry.changes.join("; ") : "",
        Device: entry.device || "",
      }));
      if (!rows.length) {
        alert("No audit log entries to export.");
        return;
      }
      exportCsv(rows, `audit-log-${todayISO()}.csv`);
    };

    function phase8PopulateRowCells(tr, tx) {
      const lastTouchCell = tr.querySelector('[data-key="lastTouch"]');
      if (lastTouchCell) {
        lastTouchCell.className = "last-touch-cell";
        lastTouchCell.innerHTML = phase8LastTouchHtml(tx);
      }
      if (tx.isDeleted) tr.classList.add("row-deleted");
    }

    const phase8OriginalRenderSalesTable = renderSalesTable;
    renderSalesTable = function phase8RenderSalesTable() {
      phase8OriginalRenderSalesTable();
      if (!els.salesTableBody) return;
      els.salesTableBody.querySelectorAll("tr[data-inv-no]").forEach((tr) => {
        const tx = state.transactions.find((item) => item.invNo === tr.dataset.invNo);
        if (!tx) return;
        phase8PopulateRowCells(tr, tx);
      });
    };

    const phase8OriginalRenderSoaModernRows = renderSoaModernRows;
    renderSoaModernRows = function phase8RenderSoaModernRows() {
      if (!els.soaModernBody) return;
      const rows = getFilteredModernSoaRows();
      if (!rows.length) {
        els.soaModernBody.innerHTML = `<tr><td colspan="10" class="empty-state">No transactions match the selected SOA filters.</td></tr>`;
      } else {
        els.soaModernBody.innerHTML = rows.map((tx) => {
          const status = getSoaModernStatus(tx);
          const debit = Number(tx.netDeduction ?? tx.netSales ?? tx.gross ?? 0);
          const credit = Number(tx.payment || 0);
          const balance = Math.max(Number(tx.receivable || 0), 0);
          const desc = tx.isCancelled
            ? `Cancelled invoice${tx.cancellationReason ? ` - ${tx.cancellationReason}` : ""}`
            : credit > 0 && balance <= 0
              ? `Payment received${tx.collectionReceiptNo ? ` - ${tx.collectionReceiptNo}` : ""}`
              : `Invoice for supplies and materials${tx.poNumber ? ` - PO ${tx.poNumber}` : ""}`;
          return `
            <tr data-soa-modern-inv="${escapeHtml(tx.invNo || "")}">
              <td>${escapeHtml(formatDate(tx.date))}</td>
              <td><span class="doc-pill">${escapeHtml(formatDocTypeLabel(tx.docType || "DR"))}</span></td>
              <td>${escapeHtml(tx.invNo || tx.poNumber || "-")}</td>
              <td>${escapeHtml(desc)}</td>
              <td class="num">${escapeHtml(formatCurrency(debit))}</td>
              <td class="num">${credit ? escapeHtml(formatCurrency(credit)) : "—"}</td>
              <td class="num">${escapeHtml(formatCurrency(balance))}</td>
              <td><span class="soa-modern-status ${status.className}">${escapeHtml(status.label)}</span></td>
              <td class="last-touch-cell">${phase8LastTouchHtml(tx)}</td>
              <td><button class="soa-action-dot" type="button" aria-label="Load ${escapeHtml(tx.invNo || "transaction")}" data-soa-load-inv="${escapeHtml(tx.invNo || "")}">⋮</button></td>
            </tr>`;
        }).join("");
      }
      if (els.soaModernCount) {
        const total = state.currentSoaRows?.length || 0;
        els.soaModernCount.textContent = `Showing ${rows.length} of ${total} transaction${total === 1 ? "" : "s"}`;
      }
      if (els.soaModernRange) {
        const from = els.soaDateFrom?.value || "Beginning";
        const to = els.soaDateTo?.value || els.soaAsOfDate?.value || todayISO();
        els.soaModernRange.textContent = `Date range: ${from} to ${to}`;
      }
    };

    saveEncodeDraft = function phase8SaveEncodeDraft(editIndex = -1) {
      const result = buildEncodeDraft(editIndex);
      if (result.error) {
        toast(result.error, "error");
        return false;
      }
      const previous = editIndex >= 0 ? state.transactions[editIndex] : null;
      let normalized;
      let reason = "";
      if (editIndex >= 0) {
        const draft = { ...previous, ...result.draft, createdAt: previous.createdAt || result.draft.createdAt || new Date().toISOString() };
        reason = phase8AskReason("update invoice", previous, previous, draft);
        if (reason === null) return false;
        normalized = computeTransaction(phase8TouchTransaction(draft, "Updated in Encoding", reason));
        state.transactions[editIndex] = normalized;
      } else {
        normalized = computeTransaction(phase8CreateTransaction(result.draft, "Created in Encoding"));
        state.transactions.unshift(normalized);
      }
      syncCustomerProfileFromTransaction(normalized);
      recomputeAll();
      pushAuditLog(phase8AuditPayload({
        action: editIndex >= 0 ? "Updated invoice" : "Created invoice",
        module: "Encoding",
        invNo: normalized.invNo,
        customer: normalized.customer,
        detail: editIndex >= 0 ? `Updated invoice ${normalized.invNo}` : `Created invoice ${normalized.invNo}`,
        before: previous || {},
        after: normalized,
        fields: PHASE8_AUDIT_FIELDS,
        reason,
      }));
      exportTransactionJson(normalized, editIndex >= 0 ? "invoice-backup" : "invoice-new");
      toast(editIndex >= 0 ? `Invoice ${normalized.invNo} updated successfully` : `Invoice ${normalized.invNo} saved successfully`, "success");
      clearEncodeForm();
      return true;
    };

    handleTxSubmit = function phase8HandleTxSubmit(e) {
      e.preventDefault();
      if (!getRolePermissions().canEncode) {
        showPermissionDenied("encode a transaction");
        return;
      }
      const editIndex = els.editIndex.value === "" ? -1 : Number(els.editIndex.value);
      const gross = Number(els.txGross.value || 0);
      const freight = Number(els.txFreight.value || 0);
      const returnsDisc = Number(els.txReturns.value || 0);
      const ewt = Number(els.txEwt.value || 0);
      const baseNetSales = gross + freight - returnsDisc - ewt;
      const paymentRaw = Number(els.txPayment.value || 0);
      const status = els.txStatus.value;
      if (status === "PARTIAL_PAYMENT" && paymentRaw <= 0) {
        alert("Partial Payment requires a payment amount greater than 0.");
        return;
      }
      if (status === "PARTIAL_PAYMENT" && paymentRaw >= baseNetSales) {
        alert("Partial Payment must be less than Net Sales.");
        return;
      }
      const payment = status === "PAID" && paymentRaw <= 0 ? baseNetSales : paymentRaw;
      const draft = {
        docType: "DR", m1m2: "M1", date: els.txDate.value, poNumber: "", invNo: els.txInvNo.value.trim(),
        customer: els.txCustomer.value.trim(), customerAddress: "", customerTin: "", items: [{ desc: "Legacy entry", qty: 1, price: gross, total: gross }],
        gross, freight, returnsDisc, ewt, payment, paymentTerms: 30, dueDate: els.txDueDate.value,
        paymentStatus: "Issued", collectionReceiptNo: "", bankDetails: "", checkNumber: "", checkBank: "", checkAmount: 0,
        checkDate: "", otherRemarks: "", representative: "", status,
      };
      const validationMessage = validateTransaction(draft, editIndex);
      if (validationMessage) {
        alert(validationMessage);
        return;
      }
      const previous = editIndex >= 0 ? state.transactions[editIndex] : null;
      let normalized;
      let reason = "";
      if (editIndex >= 0) {
        const merged = { ...previous, ...draft, createdAt: previous.createdAt || new Date().toISOString() };
        reason = phase8AskReason("update invoice", previous, previous, merged);
        if (reason === null) return;
        normalized = computeTransaction(phase8TouchTransaction(merged, "Updated in Transaction Details", reason));
        state.transactions[editIndex] = normalized;
      } else {
        normalized = computeTransaction(phase8CreateTransaction(draft, "Created in Transaction Details"));
        state.transactions.unshift(normalized);
      }
      syncCustomerProfileFromTransaction(normalized);
      closeTxModal();
      recomputeAll();
      pushAuditLog(phase8AuditPayload({
        action: editIndex >= 0 ? "Updated invoice" : "Created invoice",
        module: "Transaction Form",
        invNo: normalized.invNo,
        customer: normalized.customer,
        detail: editIndex >= 0 ? `Updated invoice ${normalized.invNo} from Transaction Details` : `Created invoice ${normalized.invNo} from Transaction Details`,
        before: previous || {},
        after: normalized,
        fields: PHASE8_AUDIT_FIELDS,
        reason,
      }));
      toast(editIndex >= 0 ? `Invoice ${normalized.invNo} updated successfully` : `Invoice ${normalized.invNo} saved successfully`, "success");
      clearEncodeForm();
    };

    saveSummaryEditTransaction = function phase8SaveSummaryEditTransaction() {
      const editIndex = state.summaryEditIndex === "" ? -1 : Number(state.summaryEditIndex);
      if (editIndex < 0 || !state.transactions[editIndex]) {
        toast("Select a transaction first.", "warning");
        return;
      }
      const previous = state.transactions[editIndex];
      const draft = buildSummaryEditDraft(editIndex);
      const validationMessage = validateTransaction(draft, editIndex);
      if (validationMessage) {
        toast(validationMessage, "error");
        return;
      }
      const reason = phase8AskReason("update invoice", previous, previous, draft);
      if (reason === null) return;
      const normalized = computeTransaction(phase8TouchTransaction({ ...previous, ...draft, createdAt: previous.createdAt || new Date().toISOString() }, "Updated in Summary", reason));
      state.transactions[editIndex] = normalized;
      syncCustomerProfileFromTransaction(normalized);
      recomputeAll();
      pushAuditLog(phase8AuditPayload({
        action: "Updated invoice",
        module: "Wholesale Summary",
        invNo: normalized.invNo,
        customer: normalized.customer,
        detail: `Updated invoice ${normalized.invNo} from Summary`,
        before: previous,
        after: normalized,
        fields: PHASE8_AUDIT_FIELDS,
        reason,
      }));
      loadSummaryEditForm(normalized, editIndex);
      closeSummaryEditModal(true);
      toast(`Invoice ${normalized.invNo} updated successfully`, "success");
    };

    saveSelectedSoaTransaction = function phase8SaveSelectedSoaTransaction() {
      const customer = els.soaCustomerSelect.value;
      const rows = state.transactions.filter((tx) => tx.customer === customer && !tx.isDeleted);
      const selected = getSelectedSoaTransaction(rows);
      if (!selected) {
        alert("Select a transaction first.");
        return;
      }
      const idx = state.transactions.findIndex((tx) => tx.invNo === selected.invNo);
      if (idx < 0) return;
      const previous = state.transactions[idx];
      const draft = {
        ...state.transactions[idx],
        payment: Number(els.soaEditPayment.value || 0),
        paymentDate: els.soaEditPaymentDate.value,
        paymentStatus: els.soaEditPaymentStatus.value,
        collectionReceiptNo: els.soaEditCollectionReceiptNo.value.trim(),
        bankDetails: els.soaEditBankDetails.value.trim(),
        checkNumber: els.soaEditCheckNumber.value.trim(),
        checkBank: els.soaEditCheckBank.value.trim(),
        checkAmount: Number(els.soaEditCheckAmount.value || 0),
        checkDate: els.soaEditCheckDate.value,
        otherRemarks: els.soaEditOtherRemarks.value.trim(),
      };
      const reason = phase8AskReason("update SOA payment", previous, previous, draft);
      if (reason === null) return;
      const updated = computeTransaction(phase8TouchTransaction(draft, "Edited in SOA", reason));
      state.transactions[idx] = updated;
      syncCustomerProfileFromTransaction(updated);
      recomputeAll();
      generateSoa(customer, false);
      pushAuditLog(phase8AuditPayload({
        action: "Updated invoice",
        module: "Statement of Account",
        invNo: selected.invNo,
        customer: selected.customer || "",
        detail: `Updated invoice ${selected.invNo} in SOA`,
        before: previous,
        after: updated,
        fields: ["payment", "paymentDate", "paymentStatus", "collectionReceiptNo", "bankDetails", "checkNumber", "checkBank", "checkAmount", "checkDate", "otherRemarks"],
        reason,
      }));
      exportTransactionJson(updated, "invoice-backup");
      toast(`Invoice ${selected.invNo} updated successfully in SOA`, "success");
    };

    cancelTransaction = function phase8CancelTransaction(invNo, reason = "") {
      const idx = state.transactions.findIndex((tx) => tx.invNo === invNo);
      if (idx < 0) return;
      const previous = state.transactions[idx];
      const cancellationReason = reason || prompt(`Reason for cancelling invoice ${invNo}:`, state.transactions[idx].cancellationReason || "");
      if (cancellationReason === null) return;
      const trimmedReason = String(cancellationReason || "").trim();
      if (!trimmedReason) {
        alert("Cancellation reason is required.");
        return;
      }
      const draft = {
        ...state.transactions[idx],
        isCancelled: true,
        cancellationReason: trimmedReason,
        status: "CANCELLED",
      };
      const updated = computeTransaction(phase8TouchTransaction(draft, "Cancelled", trimmedReason));
      state.transactions[idx] = updated;
      syncCustomerProfileFromTransaction(updated);
      recomputeAll();
      pushAuditLog(phase8AuditPayload({
        action: "Cancelled invoice",
        module: "Transaction Control",
        invNo,
        customer: updated.customer || "",
        detail: `Cancelled invoice ${invNo}`,
        before: previous,
        after: updated,
        fields: ["status", "isCancelled", "cancellationReason", "updatedAt", "updatedBy", "lastTouchedBy", "lastTouchedAt", "lastAction"],
        reason: trimmedReason,
      }));
      exportTransactionJson(updated, "invoice-cancelled");
      toast(`Invoice ${invNo} cancelled successfully`, "success");
    };

    deleteTransaction = function phase8DeleteTransaction(invNo) {
      const idx = state.transactions.findIndex((tx) => tx.invNo === invNo);
      if (idx < 0) return;
      const previous = state.transactions[idx];
      const reason = prompt(`Reason for deleting invoice ${invNo}:`, previous.deleteReason || "");
      if (reason === null) return;
      const trimmedReason = String(reason || "").trim();
      if (!trimmedReason) {
        alert("Delete reason is required.");
        return;
      }
      if (!confirm(`Soft delete transaction ${invNo}? It will be hidden from reports but retained in Audit Trail.`)) return;
      const meta = phase8ActorMeta();
      const now = new Date().toISOString();
      const updated = computeTransaction(phase8TouchTransaction({
        ...previous,
        isDeleted: true,
        deletedAt: now,
        deletedBy: meta.actor,
        deletedByUsername: meta.username,
        deletedByRole: meta.role,
        deleteReason: trimmedReason,
        status: "DELETED",
      }, "Soft Deleted", trimmedReason));
      state.transactions[idx] = updated;
      recomputeAll();
      pushAuditLog(phase8AuditPayload({
        action: "Deleted invoice",
        module: "Transaction Control",
        invNo,
        customer: previous.customer || "",
        detail: `Soft deleted invoice ${invNo}`,
        before: previous,
        after: updated,
        fields: ["status", "isDeleted", "deletedAt", "deletedBy", "deleteReason"],
        reason: trimmedReason,
      }));
      toast(`Invoice ${invNo} soft-deleted and retained in Audit Trail`, "success");
    };

    init().catch((err) => console.error(err));
