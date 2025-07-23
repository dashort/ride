// Optimized navigation loader
(function() {
  function loadNavigation() {
    const container = document.getElementById('navigation-container');
    if (!container) return;

    fetch('_navigation.html')
      .then(res => res.ok ? res.text() : Promise.reject(`HTTP ${res.status}`))
      .then(html => {
        container.innerHTML = html;
        
        // Execute scripts from loaded HTML
        container.querySelectorAll('script').forEach(oldScript => {
          const newScript = document.createElement('script');
          newScript.textContent = oldScript.src ? '' : oldScript.textContent;
          if (oldScript.src) newScript.src = oldScript.src;
          
          document.head.appendChild(newScript);
          oldScript.remove();
        });
      })
      .catch(err => console.error('Navigation load failed:', err));
  }

  // Initialize when ready
  document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', loadNavigation)
    : loadNavigation();
})();
