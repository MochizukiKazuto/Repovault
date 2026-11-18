function scrapeGitHubLinksFromPage() {
  const repoMap = new Map();
  const reserved = new Set(['topics', 'orgs', 'settings', 'marketplace', 'explore', 'trending', 'collections', 'sponsors', 'features', 'pricing', 'about', 'login', 'join']);

  function addCandidate(rawUrl, caption = '') {
    const clean = decodeURIComponent(rawUrl || '');
    const match = clean.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
    if (match && match[1] && match[2]) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/i, '');
      if (reserved.has(owner.toLowerCase())) return;
      const fullName = `${owner}/${repo}`;
      const key = fullName.toLowerCase();
      if (!repoMap.has(key)) {
        repoMap.set(key, {
          url: `https://github.com/${fullName}`,
          caption: caption.trim().slice(0, 220)
        });
      }
    }
  }

  document.querySelectorAll('a[href]').forEach(a => {
    const postContainer = a.closest('article, div[data-pressable-container="true"]');
    const caption = postContainer ? postContainer.innerText.replace(/\s+/g, ' ') : '';
    addCandidate(a.href, caption);
  });

  const allText = document.body.innerText || '';
  for (const m of allText.matchAll(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/gi)) {
    addCandidate(`https://github.com/${m[1]}/${m[2]}`);
  }

  return Array.from(repoMap.values());
}

document.getElementById('btn-scroll').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  document.getElementById('status').textContent = 'Sedang auto-scroll halaman Threads...';
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  });
  document.getElementById('status').textContent = 'Auto-scroll selesai! Klik "Ekstrak Link".';
});

document.getElementById('btn-scan').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapeGitHubLinksFromPage
  });

  const items = results?.[0]?.result || [];
  const jsonStr = JSON.stringify(items, null, 2);
  document.getElementById('output').value = jsonStr;
  document.getElementById('status').textContent = `Ditemukan ${items.length} repositori GitHub unik!`;
  const copyBtn = document.getElementById('btn-copy');
  copyBtn.style.display = items.length > 0 ? 'block' : 'none';
});

document.getElementById('btn-copy').addEventListener('click', () => {
  const val = document.getElementById('output').value;
  navigator.clipboard.writeText(val).then(() => {
    document.getElementById('status').textContent = 'JSON tersalin! Buka RepoVault -> Threads Import -> Tempel.';
  });
});
