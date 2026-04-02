(function(){
  const root = document.documentElement;
  const key = 'gr.legal.theme';
  const toggleId = 'theme-toggle';

  function applyTheme(theme){
    if(theme === 'light') root.classList.add('light-theme');
    else root.classList.remove('light-theme');
  }

  // initialize
  try{
    const stored = localStorage.getItem(key);
    if(stored) applyTheme(stored);
    else{
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(prefersLight ? 'light' : 'dark');
    }
  }catch(e){/* ignore */}

  function updateButton(btn){
    if(!btn) return;
    const isLight = root.classList.contains('light-theme');
    btn.setAttribute('aria-pressed', String(isLight));
    btn.textContent = isLight ? '🌞' : '🌙';
  }

  document.addEventListener('DOMContentLoaded', function(){
    const btn = document.getElementById(toggleId);
    updateButton(btn);
    if(!btn) return;
    btn.addEventListener('click', function(){
      const isLight = root.classList.contains('light-theme');
      const next = isLight ? 'dark' : 'light';
      applyTheme(next);
      try{ localStorage.setItem(key, next); }catch(e){}
      updateButton(btn);
    });
  });
})();
