// The demo password page's script (gate.html). A separate file so the site's security policy
// can forbid scripts written inside pages. The gate lets this file through without a password.
(function () {
  var form = document.getElementById('gate');
  var input = document.getElementById('password');
  var button = document.getElementById('enter');
  var message = document.getElementById('message');

  // Same rule as scripts/gate-record.ts: capitals and stray spaces don't matter.
  function normalize(text) { return text.trim().toLowerCase().replace(/\s+/g, ' '); }

  function sha256(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buffer) {
      return Array.prototype.map.call(new Uint8Array(buffer), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var password = normalize(input.value);
    if (!password) { message.textContent = 'Type the demo password first.'; input.focus(); return; }
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
      message.textContent = "This browser can't open the demo. Try an up-to-date browser.";
      return;
    }
    button.disabled = true;
    message.textContent = '';
    sha256(password)
      .then(function (hash) { return fetch('/gate/enter', { headers: { 'x-demo-pass': hash }, cache: 'no-store', credentials: 'same-origin' }); })
      .then(function (response) {
        if (response.ok) { window.location.reload(); return; }
        message.textContent = response.status === 401 ? "That password didn't work. Check it and try again."
          : response.status === 503 ? 'The demo is closed right now.'
          : "Something went wrong. Try again in a moment.";
        button.disabled = false;
        input.select();
      })
      .catch(function () {
        message.textContent = "Can't reach the site. Check your connection and try again.";
        button.disabled = false;
      });
  });
})();
