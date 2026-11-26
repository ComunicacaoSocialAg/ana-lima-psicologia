(function () {
  function sendEvent(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  }

  function detectCtaLocation(el) {
    if (el.closest('#siteHeader, .site-header')) return 'header';
    if (el.closest('#inicio, .hero-section')) return 'hero';
    if (el.closest('#contato, .closing-section')) return 'closing';
    if (el.closest('#mobileStickyBar')) return 'mobile_sticky';
    if (el.closest('#mobileNavDrawer')) return 'mobile_drawer';
    if (el.closest('.cta-banner')) return 'blog_banner';
    if (el.closest('.closing-cta-card')) return 'blog_article_closing';
    if (el.closest('.contact-card')) return 'contato_card';
    if (el.closest('footer, .site-footer')) return 'footer';
    return 'body';
  }

  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var pagePath = window.location.pathname || '/';

    if (href.indexOf('api.whatsapp.com/send') !== -1) {
      sendEvent('share', {
        method: 'whatsapp',
        content_type: 'article',
        page_path: pagePath,
        transport_type: 'beacon'
      });
      return;
    }

    if (href.indexOf('wa.me/') !== -1 || href.indexOf('whatsapp.com') !== -1) {
      var location = detectCtaLocation(link);
      sendEvent('whatsapp_click', {
        cta_location: location,
        page_path: pagePath,
        link_url: href,
        transport_type: 'beacon'
      });
      sendEvent('generate_lead', {
        currency: 'BRL',
        value: 1,
        method: 'whatsapp',
        cta_location: location,
        page_path: pagePath,
        transport_type: 'beacon'
      });
      return;
    }

    if (href.indexOf('mailto:') === 0) {
      sendEvent('contact_email_click', {
        cta_location: detectCtaLocation(link),
        page_path: pagePath,
        transport_type: 'beacon'
      });
      return;
    }

    if (href.indexOf('instagram.com') !== -1) {
      sendEvent('social_click', {
        network: 'instagram',
        cta_location: detectCtaLocation(link),
        page_path: pagePath,
        transport_type: 'beacon'
      });
    }
  });

  document.addEventListener(
    'toggle',
    function (e) {
      var details = e.target;
      if (!details || details.tagName !== 'DETAILS' || !details.open) return;
      var summary = details.querySelector('summary');
      sendEvent('faq_expand', {
        question: summary ? summary.textContent.trim().slice(0, 100) : 'faq_item',
        page_path: window.location.pathname || '/'
      });
    },
    true
  );

  if (window.location.pathname.indexOf('/blog/') === 0) {
    var readTracked = false;
    window.addEventListener(
      'scroll',
      function () {
        if (readTracked) return;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0 && window.scrollY / docHeight >= 0.75) {
          readTracked = true;
          sendEvent('blog_read_complete', {
            page_path: window.location.pathname
          });
        }
      },
      { passive: true }
    );
  }
})();
