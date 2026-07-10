const STORAGE_KEY = "sikat-araw-wholesale-transactions-v1";
    const THEME_KEY = `${STORAGE_KEY}-theme`;
    const COMPANY_LOGO_SRC = "assets/images/logo/Sikat%20Araw%20Logo.png";
    const AUTH_KEY = `${STORAGE_KEY}-office-auth`;
    const ADMIN_RESET_USERS_KEY = `${STORAGE_KEY}-admin-reset-users`;
    const LAST_BACKUP_KEY = `${STORAGE_KEY}-last-backup`;
    const LAST_BACKUP_HISTORY_KEY = `${STORAGE_KEY}-last-backup-history`;
    const LAST_IMPORT_SNAPSHOT_KEY = `${STORAGE_KEY}-last-import-snapshot`;
    const LAST_IMPORT_SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    const DEFAULT_SETTINGS = {
      companyName: "Sikat Araw Trading Corp.",
      companyAddress: "Rm. 1115 State Center Bldg. 333 Juan Luna St., Binondo Manila",
      companyEmail: "cold_storage888@yahoo.com",
      companyPhone: "02-824-2551 to 18",
      defaultDocType: "DR",
      defaultPaymentTerms: "30",
      defaultStatus: "NOTDUE",
      defaultModePayment: "B2B thru BDO",
      defaultPreparedBy: "Accounting",
      defaultApprovedBy: "Manager",
    };
    const state = {
      transactions: [],
      filtered: [],
      auditLog: [],
      customerProfiles: [],
      authUsers: [],
      recentAdminResetUsers: [],
      settings: { ...DEFAULT_SETTINGS },
      agingFilter: "all",
      agingDetailFilter: "current",
      agingDetailRows: [],
      agingDetailIndex: 0,
      agingDetailOpen: false,
      summaryEditIndex: "",
      summaryEditModalOpen: false,
      importPreview: null,
      theme: "light",
      authenticated: false,
      currentUser: null,
      selectedAccountUsername: "",
      sortKey: "date",
      sortDir: "asc",
      activeTab: "summarySection",
      summarySectionTab: "ALL",
      encodeView: "transaction",
      accountTab: "create",
      selectedCustomer: "",
      soaData: [],
      currentSoaRows: [],
      currentSoaTotals: {},
      soaActiveTab: "transactions",
      soaHeader: {
        customer: "",
        address: "GYY building, Tomas Morato Cor, 1112 E Rodriguez Sr. Ave, Quezon City, Metro Manila",
        terms: "30 Days",
        modePayment: "B2B thru BDO",
        email: "buitamartreceipts@gmail.com",
        soaNo: "2026-04-147",
        preparedBy: "Accounting",
        approvedBy: "Manager",
        logoDataUrl: COMPANY_LOGO_SRC,
      },
    };
