(function () {
      "use strict";
      const qaState = {
        phase: "Phase 8",
        build: "modern-2026-audit-accountability",
        checks: []
      };

      function addCheck(name, passed, detail) {
        qaState.checks.push({ name, passed: !!passed, detail: detail || "" });
      }

      function setTableScopes() {
        document.querySelectorAll("table thead th:not([scope])").forEach((th) => th.setAttribute("scope", "col"));
      }

      function markScrollableRegions() {
        document.querySelectorAll(".table-wrap, .modern-table-wrap, .soa-modern-table-scroll, .aging-v5-table-scroll, .encode-v3-products-scroll").forEach((region) => {
          if (!region.hasAttribute("tabindex")) region.setAttribute("tabindex", "0");
          if (!region.hasAttribute("role")) region.setAttribute("role", "region");
          if (!region.hasAttribute("aria-label")) region.setAttribute("aria-label", "Scrollable data table");
        });
      }

      function labelIconOnlyButtons() {
        document.querySelectorAll("button").forEach((button) => {
          const text = (button.textContent || "").replace(/\s+/g, "").trim();
          const hasLabel = button.hasAttribute("aria-label") || button.hasAttribute("title");
          if (hasLabel || text.length > 2) return;
          const guess = button.dataset?.agingDetail ? "View aging details" : button.classList.contains("topbar-hamburger") ? "Open navigation" : "Action";
          button.setAttribute("aria-label", guess);
        });
      }

      function syncSidebarAria() {
        document.querySelectorAll(".sidebar-nav-item").forEach((item) => {
          const active = item.classList.contains("active");
          item.setAttribute("aria-current", active ? "page" : "false");
        });
      }

      function protectExternalExports() {
        const excelButtons = Array.from(document.querySelectorAll("button, .btn")).filter((btn) => /excel/i.test(btn.textContent || btn.title || btn.getAttribute("aria-label") || ""));
        const xlsxReady = typeof window.XLSX !== "undefined";
        excelButtons.forEach((btn) => {
          if (!xlsxReady) {
            btn.setAttribute("title", "Excel export requires the SheetJS library to load.");
          }
        });
      }

      function runDomPolish() {
        setTableScopes();
        markScrollableRegions();
        labelIconOnlyButtons();
        syncSidebarAria();
        protectExternalExports();
      }

      function runQaChecks() {
        qaState.checks = [];
        addCheck("Login form", !!document.getElementById("loginForm"), "Login UI is present");
        addCheck("Sidebar", !!document.getElementById("appSidebar"), "Navigation shell is present");
        addCheck("Summary dashboard", !!document.getElementById("summarySection"), "Wholesale Summary section is present");
        addCheck("Encoding", !!document.getElementById("encodeSection"), "Encoding section is present");
        addCheck("Statement of Account", !!document.getElementById("soaSection"), "SOA section is present");
        addCheck("Aging Report", !!document.getElementById("agingSection"), "Aging section is present");
        addCheck("Local storage available", (function () { try { localStorage.setItem("__phase6_test", "1"); localStorage.removeItem("__phase6_test"); return true; } catch (_) { return false; } })(), "Required for offline/local mode persistence");
        addCheck("CSV export helper", typeof window.Blob !== "undefined", "Browser supports file export blobs");
        addCheck("Excel library", typeof window.XLSX !== "undefined", "SheetJS loaded for Excel exports; CSV still works if this is false");
        addCheck("Print API", typeof window.print === "function", "Print / Save as PDF available in browser");
        return qaState.checks;
      }

      window.modernPhase8QA = function () {
        runDomPolish();
        const checks = runQaChecks();
        if (console && console.table) console.table(checks);
        return checks;
      };

      document.addEventListener("DOMContentLoaded", runDomPolish);
      window.addEventListener("load", function () {
        runDomPolish();
        runQaChecks();
        document.body.setAttribute("data-ui-build", qaState.build);
      });
      document.addEventListener("click", function () { window.setTimeout(runDomPolish, 0); }, true);
      document.addEventListener("input", function () { window.setTimeout(runDomPolish, 0); }, true);
    })();