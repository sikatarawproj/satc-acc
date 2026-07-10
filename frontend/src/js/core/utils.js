    function todayISO() {
      return new Date().toISOString().slice(0, 10);
    }

    function addDaysISO(dateStr, days) {
      const d = new Date(dateStr + "T00:00:00");
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }

    function parseDate(dateStr) {
      return new Date(dateStr + "T00:00:00");
    }

    function formatDate(dateStr) {
      if (!dateStr) return "";
      const d = parseDate(dateStr);
      return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
    }

    function formatDateTime(dateTimeStr) {
      if (!dateTimeStr) return "";
      const d = new Date(dateTimeStr);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    function openPrintInvoice() {
      const invNo = els.encodeInvNo?.value || '';
      const customer = els.encodeCustomer?.value || '';
      const date = els.encodeDate?.value || '';
      const tin = els.encodeCustomerTin?.value || '';
      const address = els.encodeCustomerAddress?.value || '';
      const terms = els.encodePaymentTerms?.value || '30';
      const modePayment = els.encodePaymentStatus?.value || 'B2B thru BDO';
      const gross = els.encodeGross?.value || 0;
      const freight = els.encodeFreight?.value || 0;
      const returns = els.encodeReturns?.value || 0;
      const ewt = els.encodeEwt?.value || 0;
      const preparedBy = state.currentUser?.fullName || 'Office Admin';
      const approvedBy = state.settings?.defaultApprovedBy || 'Manager';
      const params = new URLSearchParams({
        invNo, date, customer, tin, address, terms, modePayment,
        gross, freight, returns, ewt, preparedBy, approvedBy
      });
      window.open('invoice-print.html?' + params.toString(), '_blank');
    }

    function formatCurrency(value) {
      const num = Number(value || 0);
      return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }

    function formatDocTypeLabel(docType) {
      const value = String(docType || "").trim();
      if (value === "DR") return "Delivery Receipt";
      return value || "-";
    }

    function computeHeroSummary(transactions = []) {
      const today = todayISO();
      let todaySales = 0;
      let collections = 0;
      let outstandingAr = 0;
      let pastDue = 0;
      let cancelled = 0;
      transactions.forEach((tx) => {
        if (!tx) return;
        const status = String(tx.status || "").toUpperCase();
        if (status === "CANCELLED" || tx.isCancelled) {
          cancelled += 1;
          return;
        }
        const gross = Number(tx.gross || 0);
        const freight = Number(tx.freight || 0);
        const returnsDisc = Number(tx.returnsDisc || 0);
        const ewt = Number(tx.ewt || 0);
        const payment = Number(tx.payment || 0);
        const netSales = Math.max(gross + freight - returnsDisc - ewt, 0);
        const receivable = Number.isFinite(Number(tx.receivable))
          ? Math.max(Number(tx.receivable || 0), 0)
          : Math.max(netSales - payment, 0);
        if (String(tx.date || "").slice(0, 10) === today) {
          todaySales += gross;
        }
        collections += payment;
        outstandingAr += receivable;
        if (tx.dueDate && String(tx.dueDate).slice(0, 10) < today && receivable > 0) {
          pastDue += receivable;
        }
      });
      return { todaySales, collections, outstandingAr, pastDue, cancelled };
    }

    function setHeroBarHeight(el, value, maxValue) {
      if (!el) return;
      const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, 8) : 8;
      el.style.height = `${pct}%`;
    }

    function renderHeroSummary() {
      const metrics = computeHeroSummary(state.transactions || []);
      const maxValue = Math.max(metrics.todaySales, metrics.collections, metrics.outstandingAr, metrics.pastDue, 1);
      if (els.heroTodaySales) els.heroTodaySales.textContent = formatCurrency(metrics.todaySales);
      if (els.heroCollections) els.heroCollections.textContent = formatCurrency(metrics.collections);
      if (els.heroOutstandingAr) els.heroOutstandingAr.textContent = formatCurrency(metrics.outstandingAr);
      if (els.heroPastDue) els.heroPastDue.textContent = formatCurrency(metrics.pastDue);
      if (els.heroCancelled) els.heroCancelled.textContent = String(metrics.cancelled);
      setHeroBarHeight(els.heroChartSalesBar, metrics.todaySales, maxValue);
      setHeroBarHeight(els.heroChartCollectionsBar, metrics.collections, maxValue);
      setHeroBarHeight(els.heroChartArBar, metrics.outstandingAr, maxValue);
      setHeroBarHeight(els.heroChartPastDueBar, metrics.pastDue, maxValue);
      if (els.metaRole) {
        els.metaRole.textContent = state.currentUser ? `Role: ${state.currentUser.role}` : "Role: -";
      }
      if (els.metaLastSaved) {
        els.metaLastSaved.textContent = `Saved ${new Date().toLocaleTimeString("en-PH")}`;
      }
    }

    function roundMoney(value) {
      return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }

    function emptyTxItems() {
      return [{ desc: "", qty: 1, price: 0 }];
    }

    function setEncodeMode(mode, detail = "") {
      const normalized = String(mode || "new").toLowerCase();
      const labels = {
        new: { title: "New transaction", chip: "NEW", cls: "new", button: "Save Transaction" },
        editing: { title: "Edit Transaction", chip: "EDITING", cls: "editing", button: "Edit Transaction" },
        cancelled: { title: "Cancelled transaction", chip: "CANCELLED", cls: "cancelled", button: "Edit Transaction" },
      };
      const stateInfo = labels[normalized] || labels.new;
      if (els.encodeSaveBtn) els.encodeSaveBtn.textContent = stateInfo.button;
    }

    function setEncodeView(view) {
      const normalized = view === "customer" ? "customer" : "transaction";
      state.encodeView = normalized;
      if (els.encodeModeBtns) {
        els.encodeModeBtns.forEach((btn) => {
          const active = btn.dataset.encodeView === normalized;
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-pressed", active ? "true" : "false");
        });
      }
      if (els.encodeTransactionPane) els.encodeTransactionPane.classList.toggle("is-hidden", normalized !== "transaction");
      if (els.encodeCustomerPane) els.encodeCustomerPane.classList.toggle("is-hidden", normalized !== "customer");
    }
