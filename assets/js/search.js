(function() {
  var searchData = [];
  var searchInput = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var emptyEl = document.getElementById('search-empty');
  var statusEl = document.getElementById('search-status');
  var isLoaded = false;

  if (!searchInput || !resultsEl) return;

  var query = new URLSearchParams(location.search).get('q');
  if (query !== null) searchInput.value = query;

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function loadData() {
    var url = (document.querySelector('.search-page') && document.querySelector('.search-page').dataset.searchUrl) || '/search.json';
    setStatus('正在加载搜索索引…');
    search(searchInput.value);
    fetch(url)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        if (!Array.isArray(data)) throw new Error('Invalid search index');
        searchData = data;
        isLoaded = true;
        setStatus('');
        search(searchInput.value);
      })
      .catch(function() {
        searchData = [];
        isLoaded = false;
        search(searchInput.value);
        setStatus('搜索索引加载失败，请刷新页面重试。');
      });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function search(keyword) {
    keyword = (keyword || '').trim().toLowerCase();
    if (!isLoaded || !keyword) {
      resultsEl.innerHTML = '';
      emptyEl.style.display = 'none';
      return;
    }

    var terms = keyword.split(/\s+/).filter(Boolean);
    var matched = searchData.filter(function(post) {
      var text = [
        (post.title || ''),
        (post.excerpt || ''),
        (post.content || ''),
        (Array.isArray(post.tags) ? post.tags.join(' ') : (post.tags || '')),
        (Array.isArray(post.categories) ? post.categories.join(' ') : (post.categories || ''))
      ].join(' ').toLowerCase();
      return terms.every(function(t) { return text.indexOf(t) !== -1; });
    });

    if (matched.length === 0) {
      resultsEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';
    resultsEl.innerHTML = '<ul class="search-result-list">' + matched.map(function(post) {
      return '<li class="search-result-item">' +
        '<a href="' + escapeHtml(post.url) + '">' + escapeHtml(post.title) + '</a>' +
        '<span class="search-result-date">' + escapeHtml(post.date || '') + '</span>' +
        (post.excerpt ? '<p class="search-result-excerpt">' + escapeHtml(post.excerpt) + '</p>' : '') +
        '</li>';
    }).join('') + '</ul>';
  }

  searchInput.addEventListener('input', function() {
    search(this.value);
  });

  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') search(this.value);
  });

  loadData();
})();
