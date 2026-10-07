/*!
 * Black Monkey — Cuotas inteligentes en el carrito
 * Reemplaza la leyenda de Tienda Nube ("O hasta 6 cuotas sin interés…", que no respeta
 * los montos mínimos de Mercado Pago) por un mensaje según el total real del carrito.
 *
 * Configuración: tocar solo el bloque CONFIG si cambian los mínimos en Mercado Pago.
 */
!function () {
  "use strict";

  var CONFIG = {
    // Montos mínimos configurados en Mercado Pago (Costos y cuotas → Montos mínimos por cuota)
    niveles: [
      { cuotas: 3, minimo: 100000 },
      { cuotas: 6, minimo: 150000 }
    ],
    // Leyenda original de Tienda Nube (la ocultamos y la usamos para leer el total)
    selectorLeyenda: ".js-installments-cart-total",
    // Respaldo por si la leyenda no está: total del carrito
    selectorTotal: ".js-cart-total"
  };

  var CLASE = "bm-cuotas-msg";

  function formatoPesos(n) {
    var entero = Math.round(n).toString();
    return "$" + entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // "$ 20.443,33" → 20443.33
  function parsearPesos(txt) {
    var m = (txt || "").match(/\$\s*([\d.]+(?:,\d+)?)/);
    if (!m) return null;
    var v = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    return isNaN(v) ? null : v;
  }

  // Total a partir de la leyenda: "O hasta 6 cuotas sin interés de $ 20.443,33" → 6 × 20.443,33
  function totalDesdeLeyenda(txt) {
    var mc = (txt || "").match(/(\d+)\s*cuotas/i);
    var monto = parsearPesos(txt);
    if (!mc || monto === null) return null;
    return Math.round(parseInt(mc[1], 10) * monto);
  }

  function armarMensaje(total) {
    var niveles = CONFIG.niveles.slice().sort(function (a, b) { return a.minimo - b.minimo; });
    var actual = null, siguiente = null;
    for (var i = 0; i < niveles.length; i++) {
      if (total >= niveles[i].minimo) actual = niveles[i];
      else { siguiente = niveles[i]; break; }
    }
    var partes = [];
    if (actual) {
      var cuota = formatoPesos(total / actual.cuotas);
      if (!siguiente) {
        partes.push('<span class="bm-cuotas-main">💳 ¡Tenés <b>' + actual.cuotas +
          " cuotas sin interés</b> de " + cuota + "!</span>");
      } else {
        partes.push('<span class="bm-cuotas-main">💳 Hasta <b>' + actual.cuotas +
          " cuotas sin interés</b> de " + cuota + "</span>");
      }
    }
    if (siguiente) {
      var falta = formatoPesos(Math.ceil(siguiente.minimo - total));
      partes.push('<span class="bm-cuotas-next">' + (actual ? "" : "💳 ") + "Sumá <b>" + falta +
        "</b> y pagá en <b>" + siguiente.cuotas + " cuotas sin interés</b></span>");
    }
    return partes.join("");
  }

  function estilos() {
    if (document.getElementById("bm-cuotas-styles")) return;
    var s = document.createElement("style");
    s.id = "bm-cuotas-styles";
    s.textContent = [
      CONFIG.selectorLeyenda + "{display:none!important;}",
      "." + CLASE + "{text-align:right;font-size:14px;line-height:1.4;margin-top:6px;color:#f0c63a;}",
      "." + CLASE + " span{display:block;}",
      "." + CLASE + " .bm-cuotas-next{color:#f0ece2;font-size:13px;opacity:.9;}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function totalPara(leyenda) {
    var t = totalDesdeLeyenda(leyenda.textContent);
    if (t !== null) return t;
    var cont = leyenda.parentNode;
    for (var k = 0; k < 4 && cont; k++) {
      var tot = cont.querySelector && cont.querySelector(CONFIG.selectorTotal);
      if (tot) return parsearPesos(tot.textContent);
      cont = cont.parentNode;
    }
    return null;
  }

  function actualizar() {
    var leyendas = document.querySelectorAll(CONFIG.selectorLeyenda);
    for (var i = 0; i < leyendas.length; i++) {
      var ley = leyendas[i];
      var msg = ley.nextElementSibling;
      if (!msg || !msg.classList.contains(CLASE)) {
        msg = document.createElement("div");
        msg.className = CLASE;
        ley.parentNode.insertBefore(msg, ley.nextSibling);
      }
      var total = totalPara(ley);
      var html = total ? armarMensaje(total) : "";
      if (msg.getAttribute("data-html") !== html) {
        msg.setAttribute("data-html", html);
        msg.innerHTML = html;
        msg.style.display = html ? "" : "none";
      }
    }
  }

  var pendiente = false;
  function programar() {
    if (pendiente) return;
    pendiente = true;
    setTimeout(function () { pendiente = false; actualizar(); }, 150);
  }

  function init() {
    estilos();
    actualizar();
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        var el = t.nodeType === 1 ? t : t.parentNode;
        if (el && el.closest && el.closest("." + CLASE)) continue; // ignorar nuestros cambios
        programar();
        return;
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Para pruebas
  if (typeof window !== "undefined") window.__bmCuotas = { armarMensaje: armarMensaje, totalDesdeLeyenda: totalDesdeLeyenda };
}();
