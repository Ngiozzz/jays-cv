// Jay CVS: SIMULATED M-Pesa checkout for the design preview (no real money moves).
//
// The real build talks to Safaricom directly through the DARAJA API (no Paystack, no middleman):
//   1. M-Pesa prompt (STK Push / "M-Pesa Express"): the server asks Safaricom to send an
//      "Enter M-PESA PIN" prompt to the client's phone, with the ORDER NUMBER as the account number.
//      Safaricom then calls our server back with the result and the M-Pesa code. If the callback is
//      late, the server re-checks with STK Query.
//   2. Paybill (C2B): every payment to Jay's Paybill is reported to the server automatically. The
//      account number the client typed (order number) matches it to the order. A code the client types
//      is checked against those reports (and Safaricom's Transaction Status API), never trusted alone,
//      and one code can never pay two orders.
window.MpesaMock = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;
  const paybill = () => (window.JayContent && window.JayContent.get().settings.paybill) || '4027127';
  // M-Pesa codes are 10 letters/numbers, e.g. UJ4K7Q2XMB
  const newCode = () => `U${'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]}${Math.random().toString(36).slice(2, 10).toUpperCase()}`.slice(0, 10);
  const CODE_RE = /^[A-Z0-9]{10}$/;

  function open({ amount, phone, account, merchant = 'JAY CVS', isUsed, onSuccess, onClose }) {
    const dlg = document.createElement('dialog');
    dlg.className = 'ps-dialog mp-dialog';
    dlg.innerHTML = `
      <div class="ps-box" role="document">
        <div class="ps-test">TEST MODE · no real money moves</div>
        <header class="ps-head">
          <span class="mp-logo" aria-hidden="true">M-PESA</span>
          <div><strong>Pay ${esc(merchant)}</strong><small>Order ${esc(account)}</small></div>
          <div class="ps-amount"><small>Amount</small><strong>${kes(amount)}</strong></div>
          <button type="button" class="ps-x" aria-label="Close">×</button>
        </header>
        <div class="ps-tabs" role="tablist">
          <button type="button" role="tab" class="active" data-ch="stk">📲 Prompt on my phone</button>
          <button type="button" role="tab" data-ch="paybill">🏦 Pay via Paybill</button>
        </div>
        <div class="ps-body"></div>
        <footer class="ps-foot">🔒 Paid directly to ${esc(merchant)} · Paybill <b>${esc(paybill())}</b> · no middleman</footer>
      </div>`;
    document.body.append(dlg);
    const body = dlg.querySelector('.ps-body');
    let tab = 'stk';
    let timer = null;

    const close = (paid) => {
      clearInterval(timer);
      dlg.close();
      dlg.remove();
      if (!paid && onClose) onClose();
    };
    const succeed = (res) => {
      clearInterval(timer);
      dlg.querySelector('.ps-tabs').hidden = true;
      body.innerHTML = `<div class="ps-done"><span>✓</span><strong>Payment received</strong><p>${kes(amount)} paid by M-Pesa.<br>M-Pesa code <b>${esc(res.receipt)}</b></p></div>`;
      setTimeout(() => {
        close(true);
        if (onSuccess) onSuccess({ amount, account, status: 'success', paidAt: new Date().toISOString(), ...res });
      }, 1300);
    };
    const failed = (title, text) => {
      clearInterval(timer);
      body.innerHTML = `<div class="ps-failed"><strong>${esc(title)}</strong><p>${esc(text)}</p>
        <button type="button" class="ps-pay" data-act="retry">Try again</button>
        <button type="button" class="ps-link mp-alt" data-act="to-paybill">Pay via Paybill instead</button></div>`;
    };

    const views = {
      stk: () => {
        body.innerHTML = `
          <p class="ps-p">Enter your M-Pesa number. A prompt pops up on your phone: just enter your PIN.</p>
          <label class="ps-label" for="mp-phone">M-Pesa phone number</label>
          <input class="ps-input" id="mp-phone" inputmode="tel" value="${esc(phone || '')}" placeholder="0712 345 678">
          <button type="button" class="ps-pay" data-act="prompt">Send M-Pesa prompt</button>
          <p class="mp-small">No prompt? Use <b>Pay via Paybill</b> above.</p>`;
      },
      paybill: () => {
        body.innerHTML = `
          <ol class="mp-steps">
            <li>Go to <b>M-PESA</b> › <b>Lipa na M-PESA</b> › <b>Pay Bill</b></li>
            <li>Business number: <b class="mp-copy">${esc(paybill())}</b> <button type="button" class="mp-c" data-copy="${esc(paybill())}">Copy</button></li>
            <li>Account number: <b class="mp-copy">${esc(account)}</b> <button type="button" class="mp-c" data-copy="${esc(account)}">Copy</button> <small>(your order number)</small></li>
            <li>Amount: <b>${kes(amount)}</b>, then enter your PIN</li>
          </ol>
          <label class="ps-label" for="mp-code">Paid? Enter the M-Pesa code from your SMS</label>
          <input class="ps-input mp-code" id="mp-code" maxlength="10" autocomplete="off" placeholder="e.g. UJ4K7Q2XMB">
          <p class="ps-err" id="mp-err" hidden></p>
          <button type="button" class="ps-pay" data-act="check">Confirm my payment</button>
          <p class="mp-small">Used the account number ${esc(account)}? You don't even need the code: your payment shows up by itself within a minute.</p>
          <p class="mp-sim-note">Preview: any 10-letter/number code works. Try a code already used on another order to see it rejected.</p>`;
      },
    };
    const show = (t) => {
      clearInterval(timer);
      tab = t;
      dlg.querySelectorAll('[data-ch]').forEach((b) => b.classList.toggle('active', b.dataset.ch === t));
      views[t]();
    };

    dlg.addEventListener('click', async (e) => {
      if (e.target.closest('.ps-x')) return close(false);
      const t = e.target.closest('[data-ch]');
      if (t) return show(t.dataset.ch);
      const c = e.target.closest('[data-copy]');
      if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); c.textContent = 'Copied'; } catch (err) { /* ignore */ } return; }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'retry') return show(tab);
      if (a === 'to-paybill') return show('paybill');
      if (a === 'prompt') {
        const input = dlg.querySelector('#mp-phone');
        const num = input.value.replace(/\s|-/g, '');
        if (!/^(?:\+?254|0)[17]\d{8}$/.test(num)) { input.classList.add('bad'); input.focus(); return; }
        let left = 60; // the prompt stays on the phone for about a minute
        body.innerHTML = `
          <div class="ps-wait">
            <div class="ps-phone-art"><span>M-PESA</span><small>Do you want to pay Ksh${Number(amount).toLocaleString('en-KE')}.00 to ${esc(merchant)} account no. ${esc(account)}? Enter M-PESA PIN</small></div>
            <strong>Check your phone</strong>
            <p>Enter your M-Pesa PIN on the prompt sent to <b>${esc(num)}</b>.</p>
            <p class="ps-count">Waiting for M-Pesa… <span data-left>1:00</span></p>
            <div class="ps-sim">
              <small>Preview: what the client does on their phone</small>
              <button type="button" class="ps-pay" data-act="pin">✓ Entered PIN</button>
              <div class="mp-sim-row">
                <button type="button" class="ps-link" data-act="cancel">Cancelled</button>
                <button type="button" class="ps-link" data-act="nofunds">Not enough money</button>
                <button type="button" class="ps-link" data-act="timeout">No answer</button>
              </div>
            </div>
          </div>`;
        timer = setInterval(() => {
          left -= 1;
          const el = dlg.querySelector('[data-left]');
          if (el) el.textContent = `0:${String(Math.max(0, left)).padStart(2, '0')}`;
          if (left <= 0) failed('The prompt timed out', 'You didn\'t enter your PIN in time. No money was taken.');
        }, 1000);
        dlg.dataset.phone = num;
        return;
      }
      if (a === 'pin') {
        act.disabled = true;
        act.textContent = 'Confirming with M-Pesa…';
        setTimeout(() => succeed({ channel: 'M-Pesa prompt', receipt: newCode(), phone: dlg.dataset.phone }), 900);
        return;
      }
      if (a === 'cancel') return failed('Payment cancelled', 'The prompt was cancelled on the phone. No money was taken.');
      if (a === 'nofunds') return failed('Not enough money in M-Pesa', 'Top up your M-Pesa, or use Fuliza, then try again.');
      if (a === 'timeout') return failed('The prompt timed out', 'You didn\'t enter your PIN in time, or your phone was off. No money was taken.');
      if (a === 'check') {
        const input = dlg.querySelector('#mp-code');
        const err = dlg.querySelector('#mp-err');
        const code = input.value.trim().toUpperCase();
        const bad = (msg) => { err.textContent = msg; err.hidden = false; input.classList.add('bad'); input.focus(); };
        if (!CODE_RE.test(code)) return bad('An M-Pesa code has 10 letters and numbers, e.g. UJ4K7Q2XMB.');
        const used = isUsed && isUsed(code);
        if (used) return bad(`This M-Pesa code was already used for order ${used}. Each code can pay for one order only.`);
        err.hidden = true;
        act.disabled = true;
        act.textContent = 'Checking with M-Pesa…';
        setTimeout(() => succeed({ channel: 'Paybill', receipt: code, phone: '' }), 1100);
      }
    });
    dlg.addEventListener('input', (e) => { if (e.target.id === 'mp-code') e.target.value = e.target.value.toUpperCase(); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(false); });

    show('stk');
    dlg.showModal();
    return { close: () => close(false) };
  }

  return { open, paybill, newCode };
})();
