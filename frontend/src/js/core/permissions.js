    const ACCOUNT_PERMISSION_KEYS = [
      "summarySection",
      "encodeSection",
      "operationsSection",
      "soaSection",
      "agingSection",
      "settingsSection",
      "accountSection",
      "auditSection",
      "canEditSummary",
      "canEncode",
      "canCancel",
      "canExport",
      "canResetSample",
      "canAdminReset",
      "canResetOtherPasswords",
    ];
    const ROLE_PERMISSIONS = {
      President: {
        tabs: ["summarySection", "encodeSection", "operationsSection", "soaSection", "agingSection", "settingsSection", "accountSection", "auditSection"],
        canEditSummary: true,
        canEncode: true,
        canCancel: true,
        canAdminReset: true,
        canResetSample: true,
        canExport: true,
        canResetOtherPasswords: true,
      },
      Admin: {
        tabs: ["summarySection", "encodeSection", "operationsSection", "soaSection", "agingSection", "settingsSection", "accountSection", "auditSection"],
        canEditSummary: true,
        canEncode: true,
        canCancel: true,
        canAdminReset: true,
        canResetSample: true,
        canExport: true,
        canResetOtherPasswords: true,
      },
      Encoder: {
        tabs: ["summarySection", "encodeSection", "operationsSection", "soaSection", "agingSection"],
        canEditSummary: true,
        canEncode: true,
        canCancel: false,
        canAdminReset: false,
        canResetSample: false,
        canExport: true,
        canResetOtherPasswords: false,
      },
      Reviewer: {
        tabs: ["summarySection", "operationsSection", "soaSection", "agingSection"],
        canEditSummary: false,
        canEncode: false,
        canCancel: false,
        canAdminReset: false,
        canResetSample: false,
        canExport: true,
        canResetOtherPasswords: false,
      },
      Viewer: {
        tabs: ["summarySection", "operationsSection", "soaSection", "agingSection"],
        canEditSummary: false,
        canEncode: false,
        canCancel: false,
        canAdminReset: false,
        canResetSample: false,
        canExport: false,
        canResetOtherPasswords: false,
      },
    };
    function clonePermissionProfile(profile) {
      const base = profile && typeof profile === "object" ? profile : {};
      const cloned = { ...base };
      if (Array.isArray(base.tabs)) cloned.tabs = base.tabs.slice();
      return cloned;
    }

    function makePermissionProfileFromRole(role) {
      return clonePermissionProfile(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Viewer);
    }

    function mergePermissionProfiles(role, overrides) {
      const merged = makePermissionProfileFromRole(role);
      if (!overrides || typeof overrides !== "object") return merged;
      Object.entries(overrides).forEach(([key, value]) => {
        if (key === "tabs") {
          if (Array.isArray(value)) merged.tabs = value.slice();
          if (ROLE_PERMISSIONS[role]?.tabs?.includes("operationsSection") && !merged.tabs.includes("operationsSection")) {
            merged.tabs.splice(Math.min(2, merged.tabs.length), 0, "operationsSection");
          }
          return;
        }
        if (typeof value === "boolean") {
          merged[key] = value;
        }
      });
      return merged;
    }
