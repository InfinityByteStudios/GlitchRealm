(function () {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));

  if (navLinks.length) {
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    navLinks.forEach(function (link) {
      const href = (link.getAttribute('href') || '').replace(/\/+$/, '');
      if (!href) return;
      if (href === currentPath) {
        link.classList.add('active');
      }
    });
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      const open = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  document.addEventListener('click', function (event) {
    if (!navMenu || !navToggle) return;
    if (!navMenu.classList.contains('open')) return;
    if (navMenu.contains(event.target) || navToggle.contains(event.target)) return;
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });

  function waitForFirebaseReady(timeoutMs) {
    const waitMs = typeof timeoutMs === 'number' ? timeoutMs : 10000;
    return new Promise(function (resolve) {
      if (window.firebaseFirestore && window.firebaseAuth) {
        resolve(true);
        return;
      }

      let done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        resolve(ok);
      }

      const timer = window.setTimeout(function () {
        finish(false);
      }, waitMs);

      (window.firebaseReady || Promise.resolve())
        .then(function () {
          window.clearTimeout(timer);
          finish(!!(window.firebaseFirestore && window.firebaseAuth));
        })
        .catch(function () {
          window.clearTimeout(timer);
          finish(false);
        });
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeRenderedHtml(html) {
    return String(html || '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+=(["']).*?\1/gi, '')
      .replace(/javascript:/gi, '');
  }

  function markdownToHtml(markdownText) {
    const text = String(markdownText || '').trim();
    if (!text) {
      return '<p class="muted">No additional information yet.</p>';
    }

    if (window.marked && typeof window.marked.parse === 'function') {
      try {
        return sanitizeRenderedHtml(window.marked.parse(text, { breaks: true, gfm: true }));
      } catch (e) {
        console.warn('[V2] Markdown parse failed, using escaped fallback:', e);
      }
    }

    return '<p>' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>';
  }

  function reviewTimestampToLabel(timestamp) {
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
    } catch (_) {
      // no-op
    }
    return 'Recent';
  }

  function buildStarString(rating) {
    const safe = Math.max(1, Math.min(5, Math.round(Number(rating) || 0)));
    return '★★★★★'.slice(0, safe) + '☆☆☆☆☆'.slice(0, 5 - safe);
  }

  async function loadV2ReviewsForGame(gameId) {
    const countEl = document.getElementById('detailReviewsCount');
    const listEl = document.getElementById('detailReviewsList');
    if (!countEl || !listEl) return;

    const isReady = await waitForFirebaseReady(10000);
    if (!isReady) {
      countEl.textContent = 'Reviews unavailable right now';
      listEl.innerHTML = '<article class="review-card"><p class="muted">Sign in or reload to fetch live reviews.</p></article>';
      return;
    }

    try {
      const reviewsRef = window.firestoreCollection(window.firebaseFirestore, 'reviews');
      const q = window.firestoreQuery(
        reviewsRef,
        window.firestoreWhere('gameId', '==', String(gameId || '')),
        window.firestoreWhere('moderationStatus', '==', 'approved')
      );

      const snap = await window.firestoreGetDocs(q);
      const reviews = [];
      snap.forEach(function (docSnap) {
        reviews.push(Object.assign({ id: docSnap.id }, docSnap.data() || {}));
      });

      reviews.sort(function (a, b) {
        const aMs = (a.timestamp && a.timestamp.toMillis && a.timestamp.toMillis()) || 0;
        const bMs = (b.timestamp && b.timestamp.toMillis && b.timestamp.toMillis()) || 0;
        return bMs - aMs;
      });

      if (!reviews.length) {
        countEl.textContent = '0 reviews';
        listEl.innerHTML = '<article class="review-card"><p class="muted">No approved reviews yet. Be the first to review this game on the main site.</p></article>';
        return;
      }

      countEl.textContent = reviews.length + ' review' + (reviews.length === 1 ? '' : 's');
      listEl.innerHTML = reviews.slice(0, 12).map(function (review) {
        const author = escapeHtml(review.userDisplayName || 'Anonymous');
        const stars = buildStarString(review.rating);
        const dateLabel = reviewTimestampToLabel(review.timestamp);
        const commentHtml = markdownToHtml(review.comment || '');

        return (
          '<article class="review-card">' +
          '  <div class="review-head">' +
          '    <span class="review-author">' + author + '</span>' +
          '    <span class="review-stars" aria-label="Rating">' + stars + '</span>' +
          '  </div>' +
          '  <div class="markdown-content">' + commentHtml + '</div>' +
          '  <div class="review-date">' + escapeHtml(dateLabel) + '</div>' +
          '</article>'
        );
      }).join('');
    } catch (error) {
      countEl.textContent = 'Reviews unavailable';
      listEl.innerHTML = '<article class="review-card"><p class="muted">Could not load reviews right now.</p></article>';
      console.warn('[V2] Failed to load reviews:', error);
    }
  }

  function normalizeTags(tags, fallback) {
    if (Array.isArray(tags) && tags.length) {
      return tags
        .map(function (tag) {
          return String(tag || '').trim();
        })
        .filter(Boolean)
        .slice(0, 4);
    }
    if (!fallback) return [];
    return [String(fallback).trim()].filter(Boolean);
  }

  const MAIN_SITE_GAMES = [
    {
      id: 'bytesurge',
      title: 'ByteSurge',
      description: 'Ride the digital waves in this high-speed cyberpunk racing adventure. Master data surfing through neon networks.',
      ownerUsername: 'NanoShade Studios',
      playUrl: 'https://bytesurgeloop.netlify.app/',
      coverImageUrl: '/assets/game logos/ByteSurge.webp',
      tags: ['Racing', 'Speed', 'Cyberpunk'],
      badge: 'new',
      status: 'published',
      inputMethod: 'Keyboard + Mouse',
      performanceTarget: 'Optimized browser gameplay',
      mobileSupport: 'Desktop-first'
    },
    {
      id: 'neurocore',
      title: 'NeuroCore: Byte Wars',
      description: 'Engage in neural combat using advanced algorithms. Battle through digital networks in strategic cyber warfare.',
      ownerUsername: 'InfinityByte Studios',
      playUrl: 'https://neurocorebytewars.netlify.app/',
      coverImageUrl: '/assets/game%20logos/neurocore%20byte%20wars%20logo.webp',
      tags: ['Strategy', 'Combat', 'Sci-Fi'],
      badge: 'updated',
      status: 'published',
      inputMethod: 'Keyboard + Mouse',
      performanceTarget: '60 FPS target',
      mobileSupport: 'Landscape recommended'
    },
    {
      id: 'coderunner',
      title: 'CodeRunner',
      description: 'Navigate digital mazes while solving programming challenges and racing against the clock in a cyberpunk coding run.',
      ownerUsername: 'NanoShade Studios',
      playUrl: 'https://coderunner-quest.netlify.app/',
      coverImageUrl: '/assets/game%20logos/coderunner%20logo.webp',
      tags: ['Puzzle', 'Coding', 'Adventure'],
      badge: 'live',
      status: 'published',
      inputMethod: 'Keyboard + Mouse',
      performanceTarget: 'Optimized browser gameplay',
      mobileSupport: 'Limited support'
    }
  ];

  function findMainSiteGameById(gameId) {
    const id = String(gameId || '').trim().toLowerCase();
    if (!id) return null;
    const aliases = {
      bytewars: 'neurocore'
    };
    const normalizedId = aliases[id] || id;
    return MAIN_SITE_GAMES.find(function (game) {
      return String(game.id).toLowerCase() === normalizedId;
    }) || null;
  }

  function buildDynamicGameCard(game) {
    const card = document.createElement('article');
    const title = escapeHtml(game.title || 'Untitled Game');
    const description = escapeHtml(game.description || 'No description available yet.');
    const playUrl = String(game.playUrl || '/games.html');
    const cover = String(game.coverImageUrl || '/assets/game logos/ByteSurge.webp');
    const badge = ['new', 'updated', 'beta'].indexOf(String(game.badge || '').toLowerCase()) !== -1
      ? String(game.badge || '').toLowerCase()
      : 'live';
    const tags = normalizeTags(game.tags, game.genre);
    const tagText = tags.join(',').toLowerCase();
    const detailUrl = '/v2/game-detail?id=' + encodeURIComponent(game.id || '');
    const badgeText = badge === 'new' ? 'New' : badge === 'updated' ? 'Updated' : badge === 'beta' ? 'Beta' : 'Published';

    card.className = 'game-card';
    card.setAttribute('data-card-tags', tagText || 'all');
    card.innerHTML =
      '<img src="' + escapeHtml(cover) + '" alt="' + title + ' cover">' +
      '<div class="game-body">' +
      '  <div class="game-title-row"><h3>' + title + '</h3><span class="badge">' + escapeHtml(badgeText) + '</span></div>' +
      '  <p class="muted">' + description + '</p>' +
      '  <div class="tags">' + tags.map(function (tag) {
        return '<span class="tag">' + escapeHtml(tag) + '</span>';
      }).join('') + '</div>' +
      '  <div class="card-actions">' +
      '    <a class="btn btn-primary" href="' + escapeHtml(playUrl) + '">Play</a>' +
      '    <a class="btn btn-ghost" href="' + escapeHtml(detailUrl) + '">Details</a>' +
      '  </div>' +
      '</div>';

    return card;
  }

  async function hydrateGamesFromFirestore() {
    const gamesGrid = document.querySelector('[data-games-grid]');
    const liveStatus = document.querySelector('[data-live-status]');
    if (!gamesGrid) return;

    const mergedGames = MAIN_SITE_GAMES.map(function (game) {
      return Object.assign({}, game);
    });

    try {
      const isReady = await waitForFirebaseReady(10000);
      if (!isReady) {
        if (liveStatus) {
          liveStatus.textContent = '';
        }
        gamesGrid.innerHTML = '';
        mergedGames.forEach(function (game) {
          gamesGrid.appendChild(buildDynamicGameCard(game));
        });
        return;
      }

      const db = window.firebaseFirestore;
      const submissionsRef = window.firestoreCollection(db, 'game_submissions');
      const q = window.firestoreQuery(
        submissionsRef,
        window.firestoreWhere('status', 'in', ['published', 'Published'])
      );
      const snapshot = await window.firestoreGetDocs(q);
      const submissions = [];

      snapshot.forEach(function (docSnap) {
        submissions.push({ id: docSnap.id, data: docSnap.data() || {} });
      });

      submissions.sort(function (a, b) {
        const aMillis = (a.data.updatedAt && a.data.updatedAt.toMillis && a.data.updatedAt.toMillis()) ||
          (a.data.createdAt && a.data.createdAt.toMillis && a.data.createdAt.toMillis()) || 0;
        const bMillis = (b.data.updatedAt && b.data.updatedAt.toMillis && b.data.updatedAt.toMillis()) ||
          (b.data.createdAt && b.data.createdAt.toMillis && b.data.createdAt.toMillis()) || 0;
        return bMillis - aMillis;
      });

      submissions.slice(0, 12).forEach(function (entry) {
        const game = Object.assign({ id: entry.id }, entry.data);
        const duplicateById = mergedGames.some(function (existing) {
          return String(existing.id || '').toLowerCase() === String(game.id || '').toLowerCase();
        });
        const duplicateByTitle = mergedGames.some(function (existing) {
          return String(existing.title || '').toLowerCase() === String(game.title || '').toLowerCase();
        });
        if (!duplicateById && !duplicateByTitle) {
          mergedGames.push(game);
        }
      });

      gamesGrid.innerHTML = '';
      mergedGames.forEach(function (game) {
        gamesGrid.appendChild(buildDynamicGameCard(game));
      });

      if (liveStatus) {
        liveStatus.textContent = 'Showing ' + MAIN_SITE_GAMES.length + ' featured games and ' + Math.max(mergedGames.length - MAIN_SITE_GAMES.length, 0) + ' community submissions.';
      }
    } catch (error) {
      gamesGrid.innerHTML = '';
      MAIN_SITE_GAMES.forEach(function (game) {
        gamesGrid.appendChild(buildDynamicGameCard(game));
      });
      if (liveStatus) {
        liveStatus.textContent = '';
      }
      console.warn('[V2] Failed to load published games:', error);
    }
  }

  async function hydrateGameDetailFromFirestore() {
    const root = document.querySelector('[data-detail-root]');
    if (!root) return;

    const loading = document.querySelector('[data-detail-loading]');
    const errorBox = document.querySelector('[data-detail-error]');
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');

    if (!gameId) {
      if (loading) loading.style.display = 'none';
      return;
    }

    function applyDetail(game, reviewGameId) {
      const title = game.title || 'Untitled Game';
      const tags = normalizeTags(game.tags, game.genre);
      const heroDescription = game.description || game.extendedDescription || 'No description provided.';

      document.title = title + ' - GlitchRealm V2';
      document.getElementById('detailTitle').textContent = title;
      document.getElementById('detailDescription').innerHTML = markdownToHtml(heroDescription);
      document.getElementById('detailDeveloper').textContent = game.ownerUsername || 'GlitchRealm Creator';
      document.getElementById('detailStatus').textContent = String(game.status || 'draft').toUpperCase();
      document.getElementById('detailTags').textContent = tags.length ? tags.join(', ') : 'Uncategorized';
      document.getElementById('detailInput').textContent = game.inputMethod || 'Keyboard + Mouse';
      document.getElementById('detailPerformance').textContent = game.performanceTarget || 'Optimized for browser play';
      document.getElementById('detailMobile').textContent = game.mobileSupport || 'Mobile compatibility varies by title';

      const badgeValue = ['new', 'updated', 'beta'].indexOf(String(game.badge || '').toLowerCase()) !== -1
        ? String(game.badge || '').toUpperCase()
        : 'PUBLISHED';
      document.getElementById('detailBadge').textContent = badgeValue;

      const cover = game.coverImageUrl || '/assets/game logos/ByteSurge.webp';
      const coverEl = document.getElementById('detailCover');
      coverEl.src = cover;
      coverEl.alt = title + ' cover';

      const playUrl = game.playUrl || '/games.html';
      document.getElementById('detailPlayButton').setAttribute('href', playUrl);

      const timeline = document.getElementById('detailTimeline');
      if (timeline) {
        const timelineItems = [];
        if (game.description) {
          timelineItems.push('<div class="timeline-item"><strong>Game loop</strong><span class="muted">' + escapeHtml(game.description) + '</span></div>');
        }
        if (game.howToPlay) {
          timelineItems.push('<div class="timeline-item"><strong>How to play</strong><span class="muted">' + escapeHtml(game.howToPlay) + '</span></div>');
        }
        if (tags.length) {
          timelineItems.push('<div class="timeline-item"><strong>Tagged as</strong><span class="muted">' + escapeHtml(tags.join(', ')) + '</span></div>');
        }
        if (timelineItems.length) {
          timeline.innerHTML = timelineItems.join('');
        }
      }

      const extendedEl = document.getElementById('detailExtendedDescription');
      if (extendedEl) {
        extendedEl.innerHTML = markdownToHtml(game.extendedDescription || game.description || 'No additional details provided.');
      }

      const howToSection = document.getElementById('detailHowToSection');
      const howToEl = document.getElementById('detailHowToPlay');
      if (howToSection && howToEl) {
        if (game.howToPlay) {
          howToSection.style.display = '';
          howToEl.innerHTML = markdownToHtml(game.howToPlay);
        } else {
          howToSection.style.display = 'none';
          howToEl.innerHTML = '';
        }
      }

      loadV2ReviewsForGame(reviewGameId || game.id || gameId);

      if (loading) loading.style.display = 'none';
      if (errorBox) errorBox.style.display = 'none';
    }

    const mainSiteGame = findMainSiteGameById(gameId);
    if (mainSiteGame) {
      applyDetail(mainSiteGame, mainSiteGame.id);
      return;
    }

    try {
      const isReady = await waitForFirebaseReady(10000);
      if (!isReady) {
        if (loading) loading.style.display = 'none';
        if (errorBox) errorBox.style.display = '';
        return;
      }

      const docRef = window.firestoreDoc(window.firebaseFirestore, 'game_submissions', gameId);
      const snap = await window.firestoreGetDoc(docRef);
      if (!snap.exists()) {
        if (loading) loading.style.display = 'none';
        if (errorBox) errorBox.style.display = '';
        return;
      }

      applyDetail(snap.data() || {}, gameId);
    } catch (error) {
      if (loading) loading.style.display = 'none';
      if (errorBox) errorBox.style.display = '';
      console.warn('[V2] Failed to load game detail:', error);
    }
  }

  async function wireV2SubmitToFirestore() {
    const form = document.querySelector('[data-submit-form]');
    if (!form) return;

    const statusEl = document.querySelector('[data-submit-status]');
    const submitButton = document.querySelector('[data-submit-button]');

    const isReady = await waitForFirebaseReady(12000);
    if (!isReady) {
      if (statusEl) {
        statusEl.textContent = 'Submissions are temporarily unavailable. Try again later.';
      }
      return;
    }

    const user = window.currentFirebaseUser || (window.firebaseAuth && window.firebaseAuth.currentUser);
    if (statusEl) {
      statusEl.textContent = user
        ? 'Signed in as ' + (user.displayName || user.email || user.uid) + '. Your submission will be saved as a draft.'
        : 'Sign in to submit your game.';
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      const authUser = window.currentFirebaseUser || (window.firebaseAuth && window.firebaseAuth.currentUser);
      if (!authUser) {
        if (statusEl) {
          statusEl.textContent = 'Please sign in before submitting.';
        }
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
      }

      try {
        const title = String(form.querySelector('#title').value || '').trim();
        const genre = String(form.querySelector('#genre').value || '').trim();
        const summary = String(form.querySelector('#summary').value || '').trim();
        const playUrl = String(form.querySelector('#playUrl').value || '').trim();
        const coverImageUrl = String(form.querySelector('#cover').value || '').trim();
        const howToPlay = String(form.querySelector('#howTo').value || '').trim();

        if (!title || !summary || !playUrl || !coverImageUrl) {
          throw new Error('Title, summary, play URL, and cover URL are required.');
        }

        let ownerUsername = authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'Anonymous');
        try {
          const verifiedRef = window.firestoreDoc(window.firebaseFirestore, 'verified_users', authUser.uid);
          const verifiedSnap = await window.firestoreGetDoc(verifiedRef);
          if (verifiedSnap.exists() && verifiedSnap.data() && verifiedSnap.data().username) {
            ownerUsername = String(verifiedSnap.data().username);
          }
        } catch (lookupErr) {
          console.warn('[V2] verified_users lookup failed:', lookupErr);
        }

        const payload = {
          title: title,
          ownerId: authUser.uid,
          ownerUsername: ownerUsername,
          description: summary,
          playUrl: playUrl,
          coverImageUrl: coverImageUrl,
          createdAt: window.firestoreServerTimestamp(),
          updatedAt: window.firestoreServerTimestamp(),
          status: 'draft'
        };

        if (howToPlay) payload.howToPlay = howToPlay;
        if (genre) payload.tags = [genre];

        const docRef = await window.firestoreAddDoc(
          window.firestoreCollection(window.firebaseFirestore, 'game_submissions'),
          payload
        );

        if (statusEl) {
          statusEl.textContent = 'Draft submitted successfully. Game ID: ' + docRef.id;
        }
        form.reset();
      } catch (error) {
        if (statusEl) {
          statusEl.textContent = 'Submit failed: ' + (error && error.message ? error.message : 'Unknown error');
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Submit Game';
        }
      }
    });
  }

  const chips = Array.from(document.querySelectorAll('[data-filter]'));
  const searchInput = document.querySelector('[data-search-input]');
  const resultsRow = document.querySelector('[data-results-row]');
  const emptyState = document.querySelector('[data-empty-state]');

  function applyCardFilters() {
    const cards = Array.from(document.querySelectorAll('[data-card-tags]'));
    if (!cards.length) return;
    const activeChip = chips.find(function (chip) {
      return chip.classList.contains('active');
    });
    const filter = activeChip ? activeChip.getAttribute('data-filter') : 'all';
    const searchTerm = (searchInput ? searchInput.value : '').trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach(function (card) {
      const tags = (card.getAttribute('data-card-tags') || '').toLowerCase();
      const title = (card.querySelector('h3') ? card.querySelector('h3').textContent : '').toLowerCase();
      const text = (card.textContent || '').toLowerCase();
      const matchesFilter = filter === 'all' || tags.split(',').indexOf(filter) !== -1;
      const matchesSearch = !searchTerm || title.indexOf(searchTerm) !== -1 || tags.indexOf(searchTerm) !== -1 || text.indexOf(searchTerm) !== -1;
      const show = matchesFilter && matchesSearch;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount += 1;
    });

    if (resultsRow) {
      resultsRow.textContent = 'Showing ' + visibleCount + ' game' + (visibleCount === 1 ? '' : 's');
    }
    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (el) {
        el.classList.remove('active');
      });
      chip.classList.add('active');
      applyCardFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyCardFilters);
  }

  hydrateGamesFromFirestore().then(function () {
    applyCardFilters();
  });

  hydrateGameDetailFromFirestore();
  wireV2SubmitToFirestore();

  applyCardFilters();

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('visible');
    });
    return;
  }

  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.reveal').forEach(function (el) {
    observer.observe(el);
  });
})();
