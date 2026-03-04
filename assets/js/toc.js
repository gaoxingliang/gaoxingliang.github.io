(function() {
  function buildToc() {
    var toc = document.getElementById('toc-list');
    var content = document.querySelector('.post-content');
    if (!toc || !content) return;

    var headings = content.querySelectorAll('h2, h3');
    if (headings.length === 0) {
      document.getElementById('post-toc').style.display = 'none';
      return;
    }

    var list = document.createElement('ul');
    list.className = 'toc-list';
    var stack = [list];
    var lastLevel = 2;

    headings.forEach(function(h, i) {
      var level = parseInt(h.tagName.charAt(1), 10);
      var id = h.id || ('section-' + (i + 1));
      if (!h.id) h.id = id;

      var item = document.createElement('li');
      item.className = 'toc-item toc-level-' + level;
      var link = document.createElement('a');
      link.href = '#' + id;
      link.textContent = h.textContent.replace(/^#+\s*/, '').trim();
      link.className = 'toc-link';
      item.appendChild(link);

      if (level === 3 && lastLevel === 2) {
        var subList = document.createElement('ul');
        subList.className = 'toc-sublist';
        stack[stack.length - 1].lastChild.appendChild(subList);
        stack.push(subList);
      } else if (level === 2 && lastLevel === 3) {
        stack.pop();
      }
      lastLevel = level;

      stack[stack.length - 1].appendChild(item);
    });

    toc.parentNode.replaceChild(list, toc);

    var links = document.querySelectorAll('.toc-link');
    function updateActive() {
      var scrollY = window.scrollY || window.pageYOffset;
      var padding = 100;
      var current = null;
      headings.forEach(function(h) {
        var top = h.getBoundingClientRect().top + scrollY;
        if (scrollY >= top - padding) current = h.id;
      });
      links.forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }
    window.addEventListener('scroll', function() {
      requestAnimationFrame(updateActive);
    });
    updateActive();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildToc);
  } else {
    buildToc();
  }
})();
