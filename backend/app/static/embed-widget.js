/*!
 * CRM PRO booking lead-capture widget.
 * Drop this on ANY landing page:
 *   <script src="https://<api-host>/api/v1/embed/widget.js" data-key="wgt_xxx" async></script>
 * One tag, no other markup needed — it injects its own container right after
 * itself and renders inside a Shadow DOM so it never inherits (or leaks) CSS
 * from the host page. Covers Flights/Hotels/Cabs in one tabbed form, styled
 * after MakeMyTrip's search widget. On submit it captures:
 *   - the landing page URL (this document's own window.location.href — no
 *     cross-origin issue since this script runs IN the host page, not an
 *     iframe)
 *   - the visitor's local/network IP, best-effort via a WebRTC ICE probe
 *     (modern Chrome/Firefox increasingly return an mDNS hostname instead of
 *     a real IP here — that's a browser privacy feature, not a bug in this
 *     script; whatever comes back is sent as-is)
 *   - the visitor's public IP is captured server-side (X-Forwarded-For), not
 *     by this script — see app/api/v1/embed_public.py
 */
(function () {
  "use strict";

  var scriptEl = document.currentScript;
  if (!scriptEl) return;
  var KEY = scriptEl.getAttribute("data-key");
  if (!KEY) {
    console.error("[CRM PRO widget] missing data-key attribute on the <script> tag");
    return;
  }
  var API_BASE = scriptEl.src.replace(/\/embed\/widget\.js.*$/, "");

  var TABS = [
    { id: "flight", label: "Flights", icon: "✈" },
    { id: "hotel", label: "Hotels", icon: "\u{1F3E8}" },
    { id: "car", label: "Cabs", icon: "\u{1F697}" }
  ];

  // ---- Shadow DOM host -----------------------------------------------
  var host = document.createElement("div");
  host.style.all = "initial";
  host.style.display = "block";
  scriptEl.parentNode.insertBefore(host, scriptEl.nextSibling);
  var shadow = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial;}",
    "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}",
    ".cw-root{max-width:900px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(4,41,74,0.18);}",
    ".cw-tabs{display:flex;background:#04294a;}",
    ".cw-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 8px;cursor:pointer;color:#a9c1d9;font-weight:600;font-size:14px;border-bottom:3px solid transparent;user-select:none;transition:color .15s;}",
    ".cw-tab:hover{color:#ffffff;}",
    ".cw-tab.active{color:#ffffff;background:#ffffff;color:#04294a;border-bottom-color:#eb2026;}",
    ".cw-card{background:#ffffff;padding:20px;}",
    ".cw-row{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;}",
    ".cw-field{flex:1;min-width:140px;display:flex;flex-direction:column;gap:4px;}",
    ".cw-field label{font-size:11px;font-weight:700;color:#5b6b7f;text-transform:uppercase;letter-spacing:.03em;}",
    ".cw-field input,.cw-field select{border:1.5px solid #dbe3ea;border-radius:8px;padding:9px 10px;font-size:14px;color:#04294a;background:#fbfcfd;outline:none;width:100%;}",
    ".cw-field input:focus,.cw-field select:focus{border-color:#0f4c81;}",
    ".cw-trip-toggle{display:flex;gap:16px;margin-bottom:10px;}",
    ".cw-trip-toggle label{display:flex;align-items:center;gap:5px;font-size:13px;color:#04294a;font-weight:600;cursor:pointer;}",
    ".cw-divider{border:none;border-top:1px solid #eef1f4;margin:14px 0;}",
    ".cw-contact-title{font-size:12px;font-weight:700;color:#5b6b7f;text-transform:uppercase;letter-spacing:.03em;margin-bottom:10px;}",
    ".cw-submit{width:100%;background:#eb2026;color:#fff;border:none;border-radius:8px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.02em;transition:background .15s;}",
    ".cw-submit:hover{background:#c81a20;}",
    ".cw-submit:disabled{background:#e5a3a5;cursor:not-allowed;}",
    ".cw-error{color:#c81a20;font-size:12.5px;margin-top:8px;}",
    ".cw-success{background:#ffffff;padding:36px 24px;text-align:center;}",
    ".cw-success h3{color:#04294a;font-size:19px;margin:0 0 6px;}",
    ".cw-success p{color:#5b6b7f;font-size:14px;margin:0;}",
    ".cw-success .cw-check{width:48px;height:48px;border-radius:50%;background:#e7f7ec;color:#18a558;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 14px;}",
    ".cw-footer{font-size:10.5px;color:#9aa7b4;text-align:center;padding:8px 0 2px;}"
  ].join("");
  shadow.appendChild(style);

  var root = document.createElement("div");
  root.className = "cw-root";
  shadow.appendChild(root);

  // ---- Best-effort local/network IP via WebRTC ICE gathering ---------
  var localIp = null;
  (function probeLocalIp() {
    var resolved = false;
    function done(ip) {
      if (resolved) return;
      resolved = true;
      localIp = ip;
    }
    try {
      var pc = new (window.RTCPeerConnection || window.webkitRTCPeerConnection)({ iceServers: [] });
      pc.createDataChannel("");
      pc.onicecandidate = function (e) {
        if (!e || !e.candidate || !e.candidate.candidate) {
          try { pc.close(); } catch (err) {}
          done(localIp);
          return;
        }
        var match = /([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9-]+\.local)/i.exec(e.candidate.candidate);
        if (match && !localIp) localIp = match[1];
      };
      pc.createOffer()
        .then(function (offer) { return pc.setLocalDescription(offer); })
        .catch(function () { done(null); });
      setTimeout(function () {
        try { pc.close(); } catch (err) {}
        done(localIp);
      }, 1200);
    } catch (err) {
      done(null);
    }
  })();

  // ---- State + render --------------------------------------------------
  var state = { tab: "flight", flightTrip: "oneway", carTrip: "oneway", submitting: false, done: false, error: null };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function tabsHTML() {
    return (
      '<div class="cw-tabs">' +
      TABS.map(function (t) {
        return (
          '<div class="cw-tab' + (state.tab === t.id ? " active" : "") + '" data-tab="' + t.id + '">' +
          '<span>' + t.icon + "</span><span>" + t.label + "</span></div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function flightFieldsHTML() {
    var round = state.flightTrip === "roundtrip";
    return (
      '<div class="cw-trip-toggle">' +
      '<label><input type="radio" name="cw-flight-trip" value="oneway"' + (round ? "" : " checked") + "> One Way</label>" +
      '<label><input type="radio" name="cw-flight-trip" value="roundtrip"' + (round ? " checked" : "") + "> Round Trip</label>" +
      "</div>" +
      '<div class="cw-row">' +
      '<div class="cw-field"><label>From</label><input type="text" id="cw-f-from" placeholder="Delhi (DEL)" required></div>' +
      '<div class="cw-field"><label>To</label><input type="text" id="cw-f-to" placeholder="Mumbai (BOM)" required></div>' +
      "</div>" +
      '<div class="cw-row">' +
      '<div class="cw-field"><label>Departure</label><input type="date" id="cw-f-depart" min="' + todayStr() + '" required></div>' +
      (round ? '<div class="cw-field"><label>Return</label><input type="date" id="cw-f-return" min="' + todayStr() + '" required></div>' : "") +
      '<div class="cw-field"><label>Travellers</label><input type="number" id="cw-f-pax" min="1" max="9" value="1" required></div>' +
      '<div class="cw-field"><label>Class</label><select id="cw-f-class">' +
      "<option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option>" +
      "</select></div>" +
      "</div>"
    );
  }

  function hotelFieldsHTML() {
    return (
      '<div class="cw-row">' +
      '<div class="cw-field" style="flex:2;"><label>City / Destination</label><input type="text" id="cw-h-city" placeholder="Goa" required></div>' +
      "</div>" +
      '<div class="cw-row">' +
      '<div class="cw-field"><label>Check-in</label><input type="date" id="cw-h-in" min="' + todayStr() + '" required></div>' +
      '<div class="cw-field"><label>Check-out</label><input type="date" id="cw-h-out" min="' + todayStr() + '" required></div>' +
      '<div class="cw-field"><label>Rooms</label><input type="number" id="cw-h-rooms" min="1" max="9" value="1" required></div>' +
      '<div class="cw-field"><label>Guests</label><input type="number" id="cw-h-guests" min="1" max="20" value="2" required></div>' +
      "</div>"
    );
  }

  function carFieldsHTML() {
    var round = state.carTrip === "roundtrip";
    return (
      '<div class="cw-trip-toggle">' +
      '<label><input type="radio" name="cw-car-trip" value="oneway"' + (round ? "" : " checked") + "> One Way</label>" +
      '<label><input type="radio" name="cw-car-trip" value="roundtrip"' + (round ? " checked" : "") + "> Round Trip</label>" +
      "</div>" +
      '<div class="cw-row">' +
      '<div class="cw-field"><label>Pickup city</label><input type="text" id="cw-c-from" placeholder="Bengaluru" required></div>' +
      '<div class="cw-field"><label>Drop city</label><input type="text" id="cw-c-to" placeholder="Mysuru" required></div>' +
      "</div>" +
      '<div class="cw-row">' +
      '<div class="cw-field"><label>Pickup date</label><input type="date" id="cw-c-date" min="' + todayStr() + '" required></div>' +
      '<div class="cw-field"><label>Pickup time</label><input type="time" id="cw-c-time" required></div>' +
      "</div>"
    );
  }

  function contactFieldsHTML() {
    return (
      '<hr class="cw-divider">' +
      '<div class="cw-contact-title">Your details — we’ll get back with the best deals</div>' +
      '<div class="cw-row">' +
      '<div class="cw-field"><label>Name</label><input type="text" id="cw-name" required></div>' +
      '<div class="cw-field"><label>Phone</label><input type="tel" id="cw-phone" required></div>' +
      '<div class="cw-field"><label>Email</label><input type="email" id="cw-email" required></div>' +
      "</div>"
    );
  }

  function cardHTML() {
    var fields = state.tab === "flight" ? flightFieldsHTML() : state.tab === "hotel" ? hotelFieldsHTML() : carFieldsHTML();
    return (
      '<form class="cw-card" id="cw-form">' +
      fields +
      contactFieldsHTML() +
      '<button type="submit" class="cw-submit"' + (state.submitting ? " disabled" : "") + ">" +
      (state.submitting ? "Sending…" : "Search Best Deals") +
      "</button>" +
      (state.error ? '<div class="cw-error">' + esc(state.error) + "</div>" : "") +
      "</form>"
    );
  }

  function successHTML() {
    return (
      '<div class="cw-success"><div class="cw-check">✓</div>' +
      "<h3>Thank you!</h3>" +
      "<p>Our travel expert will call you shortly with the best deals.</p></div>"
    );
  }

  function render() {
    root.innerHTML = (state.done ? successHTML() : tabsHTML() + cardHTML()) + '<div class="cw-footer">Powered by CRM PRO</div>';
    bind();
  }

  function bind() {
    var tabs = shadow.querySelectorAll(".cw-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function (e) {
        state.tab = e.currentTarget.getAttribute("data-tab");
        state.error = null;
        render();
      });
    }
    var flightRadios = shadow.querySelectorAll('input[name="cw-flight-trip"]');
    for (var j = 0; j < flightRadios.length; j++) {
      flightRadios[j].addEventListener("change", function (e) {
        state.flightTrip = e.target.value;
        render();
      });
    }
    var carRadios = shadow.querySelectorAll('input[name="cw-car-trip"]');
    for (var k = 0; k < carRadios.length; k++) {
      carRadios[k].addEventListener("change", function (e) {
        state.carTrip = e.target.value;
        render();
      });
    }
    var form = shadow.getElementById ? shadow.getElementById("cw-form") : shadow.querySelector("#cw-form");
    if (form) form.addEventListener("submit", handleSubmit);
  }

  function val(id) {
    var el = shadow.querySelector("#" + id);
    return el ? el.value : "";
  }

  function collectDetails() {
    if (state.tab === "flight") {
      return {
        trip_type: state.flightTrip,
        from: val("cw-f-from"),
        to: val("cw-f-to"),
        departure_date: val("cw-f-depart"),
        return_date: state.flightTrip === "roundtrip" ? val("cw-f-return") : null,
        travellers: val("cw-f-pax"),
        cabin_class: val("cw-f-class")
      };
    }
    if (state.tab === "hotel") {
      return {
        city: val("cw-h-city"),
        check_in: val("cw-h-in"),
        check_out: val("cw-h-out"),
        rooms: val("cw-h-rooms"),
        guests: val("cw-h-guests")
      };
    }
    return {
      trip_type: state.carTrip,
      pickup_city: val("cw-c-from"),
      drop_city: val("cw-c-to"),
      pickup_date: val("cw-c-date"),
      pickup_time: val("cw-c-time")
    };
  }

  function friendlyError(body) {
    // FastAPI's validation-error shape is {"detail": [{"loc":[...],"msg":...}, ...]},
    // not a plain string — coercing that array straight into an Error message
    // prints "[object Object],...". Pull out the first message when it's
    // structured like that; fall back to the raw detail when it's already a
    // string (e.g. the "no longer accepting submissions" 404).
    var d = body && body.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length && d[0] && d[0].msg) return d[0].msg;
    return "Something went wrong. Please try again.";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (state.submitting) return;

    var payload = {
      name: val("cw-name"),
      phone: val("cw-phone"),
      email: val("cw-email"),
      service_type: state.tab,
      landing_page_url: window.location.href,
      visitor_local_ip: localIp,
      details: collectDetails()
    };

    // Deliberately NOT a full render() here (and none on failure below,
    // either) — that rebuilds the form's HTML from scratch, which would
    // wipe every field the visitor just filled in. Only the submit button
    // itself is mutated in place while the request is in flight; a full
    // render() only happens once, on success, to swap in the thank-you
    // screen (a different view entirely, so nothing is lost there).
    state.submitting = true;
    var btn = shadow.querySelector(".cw-submit");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending…";
    }
    var existingError = shadow.querySelector(".cw-error");
    if (existingError) existingError.remove();

    fetch(API_BASE + "/embed/" + KEY + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (resp) {
        if (!resp.ok) return resp.json().then(function (b) { throw new Error(friendlyError(b)); });
        return resp.json();
      })
      .then(function () {
        state.submitting = false;
        state.done = true;
        render();
      })
      .catch(function (err) {
        state.submitting = false;
        var btn2 = shadow.querySelector(".cw-submit");
        if (btn2) {
          btn2.disabled = false;
          btn2.textContent = "Search Best Deals";
        }
        var form = shadow.getElementById ? shadow.getElementById("cw-form") : shadow.querySelector("#cw-form");
        if (form) {
          var errEl = document.createElement("div");
          errEl.className = "cw-error";
          errEl.textContent = err.message || "Something went wrong. Please try again.";
          form.appendChild(errEl);
        }
      });
  }

  render();
})();
