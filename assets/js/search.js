(function() {
  var searchData = [];
  var searchInput = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var emptyEl = document.getElementById('search-empty');

  if (!searchInput || !resultsEl) return;

  function loadData() {
    var url = (document.querySelector('.search-page') && document.querySelector('.search-page').dataset.searchUrl) || '/search.json';
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        searchData = Array.isArray(data) ? data : [];
      })
      .catch(function() { searchData = []; });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function search(keyword) {
    keyword = (keyword || '').trim().toLowerCase();
    if (!keyword) {
      resultsEl.innerHTML = '';
      emptyEl.style.display = 'none';
      return;
    }

    var terms = keyword.split(/\s+/).filter(Boolean);
    var matched = searchData.filter(function(post) {
      var text = [
        (post.title || ''),
        (post.excerpt || ''),
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
