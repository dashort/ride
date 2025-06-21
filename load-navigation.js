// Dynamically load the navigation menu for local testing
function injectNavigation() {
  const placeholder = document.getElementById('navigation-container');
  if (!placeholder) return;
  fetch('_navigation.html')
    .then(res => res.text())
    .then(html => {
      placeholder.innerHTML = html;
      // Execute any scripts from the loaded HTML
      placeholder.querySelectorAll('script').forEach(old => {
        const script = document.createElement('script');
        if (old.src) {
          script.src = old.src;
        } else {
          script.textContent = old.textContent;
        }
        document.head.appendChild(script);
        old.remove();
      });
    })
    .catch(err => console.error('Failed to load navigation', err));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectNavigation);
} else {
  injectNavigation();
}
