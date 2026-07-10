(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    document.body.dataset.uiPhase = '12-hard-structure';
    document.title = 'Sikat Araw Wholesale Sales Management | Phase 12 Hard UI Structure Fix';
    var oldTabs = document.querySelector('.tabs.no-print');
    if(oldTabs){ oldTabs.style.display = 'none'; }
    // Ensure the generated/logo image is used everywhere it is safe.
    var sidebarLogo = document.querySelector('.sidebar-logo');
    if(sidebarLogo && sidebarLogo.tagName.toLowerCase() === 'img'){
      sidebarLogo.src = 'assets/images/logo/satc-logo-clean.png';
    }
    // Make top content tables readable by wrapping unwrapped tables if any were rendered dynamically.
    document.querySelectorAll('.section table').forEach(function(tbl){
      var parent = tbl.parentElement;
      if(parent && !parent.classList.contains('phase12-table-guard') && parent.tagName.toLowerCase() !== 'td'){
        parent.classList.add('phase12-table-guard');
      }
    });
  });
})();