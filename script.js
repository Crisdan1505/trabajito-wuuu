// ----------------- utilidades -----------------
function mod(n, m = 26) {
  return ((n % m) + m) % m;
}
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}
// busca inverso multiplicativo a^-1 mod m (bruto, m pequeño)
function modInverse(a, m = 26) {
  a = mod(a, m);
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x;
  }
  return null;
}

// convierte texto (solo letras A-Z) a pares numéricos [ [n,n], ... ]
function textoACouplesFromString(txt) {
  const text = txt.toUpperCase().replace(/[^A-Z]/g, '');
  const arr = [];
  for (let i = 0; i < text.length; i += 2) {
    const a = text.charCodeAt(i) - 65;
    const b = (i + 1 < text.length) ? text.charCodeAt(i + 1) - 65 : 23; // X = 23 padding
    arr.push([a, b]);
  }
  return arr;
}

function couplesToText(couples) {
  return couples
    .map(p => String.fromCharCode(mod(p[0]) + 65) + String.fromCharCode(mod(p[1]) + 65))
    .join('');
}

// ----------------- DOM -----------------
const mensajeEl = document.getElementById('mensaje');
const charCount = document.querySelector('.char-count');
const matrizMensaje = document.getElementById('matrizMensaje');
const k11 = document.getElementById('k11');
const k12 = document.getElementById('k12');
const k21 = document.getElementById('k21');
const k22 = document.getElementById('k22');
const btnEncriptar = document.getElementById('encriptar');
const btnDesencriptar = document.getElementById('desencriptar');
const resultado = document.getElementById('resultado');

// contador
mensajeEl.addEventListener('input', () => {
  charCount.textContent = `${mensajeEl.value.length}/30`;
  mostrarMatrizMensaje();
});

function mostrarMatrizMensaje() {
  const txt = mensajeEl.value.toUpperCase().replace(/[^A-Z]/g, '');
  if (!txt) {
    matrizMensaje.textContent = 'Escribe un mensaje primero...';
    return;
  }
  const couples = textoACouplesFromString(txt);
  matrizMensaje.innerHTML = couples.map(p => `[ ${p[0]} , ${p[1]} ]`).join('<br>');
}

// obtiene clave en enteros; devuelve null si hay problema
function obtenerClave() {
  const a = parseInt(k11.value, 10);
  const b = parseInt(k12.value, 10);
  const c = parseInt(k21.value, 10);
  const d = parseInt(k22.value, 10);
  if ([a, b, c, d].some(v => Number.isNaN(v))) return null;
  return [[a, b], [c, d]];
}

// ----------------- ENCRIPTAR -----------------
btnEncriptar.addEventListener('click', () => {
  const clave = obtenerClave();
  if (!clave) {
    resultado.textContent = 'Error: introduce todos los valores de la clave.';
    resultado.classList.add('error');
    return;
  }

  // determinante y comprobación invertibilidad
  const detRaw = clave[0][0] * clave[1][1] - clave[0][1] * clave[1][0];
  const det = mod(detRaw, 26);
  if (gcd(det, 26) !== 1) {
    resultado.textContent = `Error: la clave NO es invertible modulo 26 (det=${detRaw} -> ${det}). El gcd(det,26) debe ser 1. Ejemplos de det válidos: 1,3,5,7,9,11,15,17,19,21,23,25.`;
    resultado.classList.add('error');
    return;
  }

  const txt = mensajeEl.value;
  const couples = textoACouplesFromString(txt);

  // encriptado (K * vector) mod26
  const cifrado = couples.map(pair => {
    const v1 = pair[0], v2 = pair[1];
    const c1 = mod(clave[0][0] * v1 + clave[0][1] * v2);
    const c2 = mod(clave[1][0] * v1 + clave[1][1] * v2);
    return [c1, c2];
  });

  resultado.classList.remove('error');
  resultado.textContent = couplesToText(cifrado);
});

// ----------------- DESENCRIPTAR -----------------
btnDesencriptar.addEventListener('click', () => {
  // PRIORIDAD: usar texto en "resultado" (lo generado por encriptar).
  // Si está vacío, usar lo que haya en el textarea 'mensaje' (por si pegaste el cifrado allí).
  let textoCifrado = resultado.textContent.trim();
  if (!textoCifrado) textoCifrado = mensajeEl.value.trim();

  if (!textoCifrado) {
    resultado.textContent = 'Error: no hay texto cifrado para desencriptar (ni en Resultado ni en el textarea).';
    resultado.classList.add('error');
    return;
  }

  // convertir a parejas numéricas
  const couples = textoACouplesFromString(textoCifrado);

  const clave = obtenerClave();
  if (!clave) {
    resultado.textContent = 'Error: introduce todos los valores de la clave.';
    resultado.classList.add('error');
    return;
  }

  // determinante y su inverso mod26
  const detRaw = clave[0][0] * clave[1][1] - clave[0][1] * clave[1][0];
  const det = mod(detRaw, 26);
  if (gcd(det, 26) !== 1) {
    resultado.textContent = `Error: la clave NO es invertible modulo 26 (det=${detRaw} -> ${det}). No existe inversa.`;
    resultado.classList.add('error');
    return;
  }
  const invDet = modInverse(det, 26);
  if (invDet === null) {
    resultado.textContent = 'Error inesperado: no se encontró inverso modular del determinante.';
    resultado.classList.add('error');
    return;
  }

  // calcular adjunta (cofactores transpuestos) y luego multiplicar por invDet
  let adj = [
    [ clave[1][1], -clave[0][1] ],
    [ -clave[1][0], clave[0][0] ]
  ];
  // normalizar mod26
  adj = adj.map(row => row.map(x => mod(x, 26)));

  const claveInv = [
    [ mod(adj[0][0] * invDet), mod(adj[0][1] * invDet) ],
    [ mod(adj[1][0] * invDet), mod(adj[1][1] * invDet) ]
  ];

  // aplicar claveInv a cada pareja
  const descifradoCouples = couples.map(pair => {
    const p1 = mod(claveInv[0][0] * pair[0] + claveInv[0][1] * pair[1]);
    const p2 = mod(claveInv[1][0] * pair[0] + claveInv[1][1] * pair[1]);
    return [p1, p2];
  });

  const textoPlano = couplesToText(descifradoCouples);

  resultado.classList.remove('error');
  resultado.textContent = textoPlano;
});
