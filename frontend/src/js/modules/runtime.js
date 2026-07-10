(function(){
  function applyPhase13(){
    document.body.setAttribute('data-ui-phase','13-light');
    document.body.setAttribute('data-theme','dark');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyPhase13);
  else applyPhase13();
  window.addEventListener('load',applyPhase13);
})();