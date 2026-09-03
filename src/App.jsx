import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AlumnosModulo from "./components/AlumnosModulo.jsx";
import ConsultaAlumnoPublica from "./components/ConsultaAlumnoPublica";
import ConfiguracionModulo from "./components/ConfiguracionModulo";
import PadresModulo from "./components/PadresModulo";
import ProductosMasVendidosModulo from "./components/ProductosMasVendidosModulo";
import KardexModulo from "./components/KardexModulo";
import ProductosFormaPagoModulo from "./components/ProductosFormaPagoModulo";
import PortalUsuarioModulo from "./components/PortalUsuarioModulo";

const API_URL =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://pos-nube-backend.onrender.com";


const ROLES_POS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  ENCARGADO_LOCAL: "ENCARGADO_LOCAL",
  CAJERO: "CAJERO",
  AUDITOR: "AUDITOR",
  PADRE: "PADRE",
  ESTUDIANTE: "ESTUDIANTE",
};

const MENU_POR_ROL = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  ENCARGADO_LOCAL: [
    /* dashboard y módulo Ventas ocultos */,
    "nueva_orden",
    "alumnos",
    "profesores",
    "menu_cafeteria",
    "stock",
    "recargas",
    "egresos",
    "cierre_caja",
  ],
  CAJERO: [
    "nueva_orden",
    "alumnos",
    "profesores",
    "cierre_caja",
  ],
  PADRE: [],
  ESTUDIANTE: [],
  AUDITOR: [
    "consultar_ventas",
    "stock",
    "recargas",
    "egresos",
    "cierre_caja",
    "productos_vendidos",
    "productos_dia",
    "productos_mas_vendidos",
    "kardex_productos",
    "productos_forma_pago",
  ],
};

const VISTA_INICIAL_POR_ROL = {
  SUPER_ADMIN: { vista: "dashboard" },
  ADMIN: { vista: "dashboard" },
  ENCARGADO_LOCAL: { vista: "ventas", ventas: "registrar" },
  CAJERO: { vista: "ventas", ventas: "registrar" },
  AUDITOR: { vista: "reporte_cierre" },
  PADRE: { vista: "portal" },
  ESTUDIANTE: { vista: "portal" },
};

const PERMISOS_FRONTEND = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  ENCARGADO_LOCAL: [
    "ventas.ver",
    "ventas.crear",
    "productos.ver",
    "inventario.ver",
    "inventario.gestionar",
    "personas.ver",
    "recargas.ver",
    "recargas.gestionar",
    "egresos.ver",
    "egresos.gestionar",
    "cierres.ver",
    "cierres.crear",
  ],
  CAJERO: [
    "ventas.ver",
    "ventas.crear",
    "productos.ver",
    "personas.ver",
    "cierres.ver",
    "cierres.crear",
  ],
  PADRE: [],
  ESTUDIANTE: [],
  AUDITOR: [
    "ventas.ver",
    "productos.ver",
    "inventario.ver",
    "recargas.ver",
    "egresos.ver",
    "cierres.ver",
    "reportes.ver",
  ],
};

const normalizarRol = (rol) => String(rol || "").trim().toUpperCase();

const detectarPantallaCompacta = () => {
  if (typeof window === "undefined") return false;
  const anchoVentana = Number(window.innerWidth || 0);
  const anchoPantalla = Number(window.screen?.width || 0);
  return (
    (anchoVentana > 0 && anchoVentana <= 820) ||
    (anchoPantalla > 0 && anchoPantalla <= 820)
  );
};

const puedeRol = (rol, permiso) => {
  const lista = PERMISOS_FRONTEND[normalizarRol(rol)] || [];
  return lista.includes("*") || lista.includes(permiso);
};


const INSTITUCIONES = [
  { id: 1, nombre: "Colegio Marista" },
  { id: 2, nombre: "Colegio Pensionado Universitario" },
  { id: 3, nombre: "FEUE" },
  { id: 4, nombre: "Club Los Cipreses" },
];

const normalizarInstitucionId = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
};

const formatearMoneda = (valor) => {
  return `$${Number(valor || 0).toFixed(2)}`;
};

const formatearFechaInput = (valor) => {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

const formatearFechaHora = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleString();
};

const obtenerFechaEcuadorISO = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const tomar = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value || "";

  return `${tomar("year")}-${tomar("month")}-${tomar("day")}`;
};

const normalizarFechaISO = (valor) => {
  if (!valor) return "";

  const texto = String(valor).trim();
  const coincidencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (coincidencia) {
    return `${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]}`;
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const tomar = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value || "";

  return `${tomar("year")}-${tomar("month")}-${tomar("day")}`;
};

const formatearSoloFecha = (valor) => {
  const fechaISO = normalizarFechaISO(valor);
  if (!fechaISO) return "-";

  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
};

const formatearSoloHora = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const codigoUbicacionCierre = (nombre) => {
  const texto = String(nombre || "HIST")
    .trim()
    .toUpperCase();

  if (texto.includes("BAR")) return "BAR";
  if (texto.includes("KIOS")) return "KIOSKO";

  return (
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8) || "HIST"
  );
};

const obtenerCodigoCierre = (cierre) => {
  if (cierre?.codigo_cierre) return String(cierre.codigo_cierre);

  const fecha = normalizarFechaISO(
    cierre?.fecha ||
      cierre?.periodo_hasta ||
      cierre?.created_at
  ).replace(/-/g, "");

  const ubicacion = codigoUbicacionCierre(cierre?.punto_nombre);
  const jornada = String(cierre?.jornada_id || cierre?.id || 0).padStart(3, "0");

  return `CIE-${fecha || "00000000"}-${ubicacion}-${jornada}`;
};

const subtotalRecargasCierre = (cierre) =>
  Number(cierre?.subtotal_recargas ??
    (Number(cierre?.recargas_efectivo || 0) +
      Number(cierre?.recargas_transferencia || 0)));

const subtotalVentasCierre = (cierre) =>
  Number(cierre?.subtotal_ventas ??
    (Number(cierre?.ventas_efectivo || 0) +
      Number(cierre?.ventas_transferencia || 0) +
      Number(cierre?.ventas_tarjeta || 0) +
      Number(cierre?.ventas_saldo || 0) +
      Number(cierre?.ventas_credito || 0)));

const subtotalEgresosCierre = (cierre) =>
  Number(cierre?.subtotal_egresos ?? cierre?.egresos_total ?? 0);

const efectivoEsperadoCierre = (cierre) =>
  Number(cierre?.efectivo_esperado ??
    (Number(cierre?.ventas_efectivo || 0) +
      Number(cierre?.recargas_efectivo || 0) -
      Number(cierre?.egresos_total || 0)));

const granTotalCierre = (cierre) =>
  Number(cierre?.gran_total ??
    (subtotalRecargasCierre(cierre) + subtotalVentasCierre(cierre)));

// Normaliza nombres equivalentes de ubicación para que una existencia histórica
// guardada como KIOSCO siga perteneciendo al punto actual KIOSKO.
// Normalizador general disponible para todo App.jsx.
// Debe estar fuera del importador de Stock porque también se usa en Ventas.
const normalizarTexto = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const normalizarUbicacionFrontend = (valor, institucionId = null) => {
  const texto = String(valor || "PRINCIPAL")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  if (["KIOSCO", "KIOSKO"].includes(texto)) return "KIOSKO";

  // MARISTA: ADMINISTRACIÓN + BAR. No existe BAR PRINCIPAL como punto
  // de inventario/venta y cualquier alias histórico se representa como BAR.
  if (
    Number(institucionId || 0) === 1 &&
    ["PRINCIPAL", "BAR", "BAR PRINCIPAL"].includes(texto)
  ) {
    return "BAR";
  }

  // En otras instituciones conservamos los nombres reales.
  if (texto === "BAR") return "BAR";
  if (texto === "BAR PRINCIPAL") return "BAR PRINCIPAL";
  if (!texto || texto === "PRINCIPAL") return "PRINCIPAL";

  return texto;
};

const crearMiniaturaGaleria = (nombre, emoji, fondo = "#eef2ff") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" rx="48" fill="${fondo}"/><circle cx="300" cy="255" r="155" fill="#ffffff" opacity="0.94"/><text x="300" y="320" text-anchor="middle" font-size="190" font-family="Arial, sans-serif">${emoji}</text><rect x="55" y="455" width="490" height="82" rx="26" fill="#ffffff" opacity="0.96"/><text x="300" y="507" text-anchor="middle" font-size="29" font-weight="700" font-family="Arial, sans-serif" fill="#172554">${nombre}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const GALERIA_PRODUCTOS_BASE = [
  ["Hamburguesa","🍔","Comida rápida","#fff7ed"],
  ["Hamburguesa con queso","🍔","Comida rápida","#fff7ed"],
  ["Hamburguesa de pollo","🍔","Comida rápida","#fff7ed"],
  ["Hot dog","🌭","Comida rápida","#fff7ed"],
  ["Choripán","🌭","Comida rápida","#fff7ed"],
  ["Salchipapa","🍟","Comida rápida","#fff7ed"],
  ["Papi pollo","🍗","Comida rápida","#fff7ed"],
  ["Pizza","🍕","Comida rápida","#fff7ed"],
  ["Pizza de jamón","🍕","Comida rápida","#fff7ed"],
  ["Pizza de pollo","🍕","Comida rápida","#fff7ed"],
  ["Alitas BBQ","🍗","Comida rápida","#fff7ed"],
  ["Nuggets de pollo","🍗","Comida rápida","#fff7ed"],
  ["Papas fritas","🍟","Comida rápida","#fff7ed"],
  ["Papas con queso","🍟","Comida rápida","#fff7ed"],
  ["Burrito","🌯","Comida rápida","#fff7ed"],
  ["Taco","🌮","Comida rápida","#fff7ed"],
  ["Pincho de pollo","🍢","Comida rápida","#fff7ed"],
  ["Pincho mixto","🍢","Comida rápida","#fff7ed"],
  ["Bolón de queso","🟢","Tradicional","#fef9c3"],
  ["Bolón de chicharrón","🟢","Tradicional","#fef9c3"],
  ["Bolón mixto","🟢","Tradicional","#fef9c3"],
  ["Tigrillo","🍳","Tradicional","#fef9c3"],
  ["Humita","🌽","Tradicional","#fef9c3"],
  ["Tamal de pollo","🫔","Tradicional","#fef9c3"],
  ["Quimbolito","🧁","Tradicional","#fef9c3"],
  ["Corviche","🌽","Tradicional","#fef9c3"],
  ["Muchín de yuca","🥔","Tradicional","#fef9c3"],
  ["Empanada de verde","🥟","Tradicional","#fef9c3"],
  ["Empanada de viento","🥟","Tradicional","#fef9c3"],
  ["Empanada de morocho","🥟","Tradicional","#fef9c3"],
  ["Empanada de queso","🥟","Tradicional","#fef9c3"],
  ["Empanada de pollo","🥟","Tradicional","#fef9c3"],
  ["Empanada de carne","🥟","Tradicional","#fef9c3"],
  ["Maduro con queso","🍌","Tradicional","#fef9c3"],
  ["Patacones con queso","🍌","Tradicional","#fef9c3"],
  ["Choclo con queso","🌽","Tradicional","#fef9c3"],
  ["Mote con chicharrón","🍲","Tradicional","#fef9c3"],
  ["Chochos con tostado","🥣","Tradicional","#fef9c3"],
  ["Cevichochos","🥣","Tradicional","#fef9c3"],
  ["Morocho","🥛","Tradicional","#fef9c3"],
  ["Papa rellena","🥔","Tradicional","#fef9c3"],
  ["Sánduche de jamón y queso","🥪","Sánduches","#f0fdf4"],
  ["Sánduche de queso","🥪","Sánduches","#f0fdf4"],
  ["Sánduche de pollo","🥪","Sánduches","#f0fdf4"],
  ["Sánduche de atún","🥪","Sánduches","#f0fdf4"],
  ["Sánduche mixto","🥪","Sánduches","#f0fdf4"],
  ["Sánduche integral","🥪","Sánduches","#f0fdf4"],
  ["Tostada de queso","🍞","Sánduches","#f0fdf4"],
  ["Tostada mixta","🍞","Sánduches","#f0fdf4"],
  ["Tostada de pollo","🍞","Sánduches","#f0fdf4"],
  ["Pan de yuca","🥖","Panadería","#fff7ed"],
  ["Croissant","🥐","Panadería","#fff7ed"],
  ["Pan de queso","🥖","Panadería","#fff7ed"],
  ["Pan de chocolate","🥐","Panadería","#fff7ed"],
  ["Pastel de pollo","🥧","Panadería","#fff7ed"],
  ["Pastel de carne","🥧","Panadería","#fff7ed"],
  ["Donut","🍩","Panadería","#fff7ed"],
  ["Muffin","🧁","Panadería","#fff7ed"],
  ["Galleta de avena","🍪","Panadería","#fff7ed"],
  ["Galleta de chocolate","🍪","Panadería","#fff7ed"],
  ["Bizcocho","🥖","Panadería","#fff7ed"],
  ["Torta de chocolate","🍰","Postres","#fdf2f8"],
  ["Torta de zanahoria","🍰","Postres","#fdf2f8"],
  ["Torta de naranja","🍰","Postres","#fdf2f8"],
  ["Torta de banano","🍰","Postres","#fdf2f8"],
  ["Cupcake","🧁","Postres","#fdf2f8"],
  ["Gelatina","🍮","Postres","#fdf2f8"],
  ["Flan","🍮","Postres","#fdf2f8"],
  ["Helado","🍦","Postres","#fdf2f8"],
  ["Paleta de fruta","🍧","Postres","#fdf2f8"],
  ["Pie de manzana","🥧","Postres","#fdf2f8"],
  ["Brownie","🍫","Postres","#fdf2f8"],
  ["Fresas con crema","🍓","Postres","#fdf2f8"],
  ["Manzana","🍎","Frutas","#f0fdf4"],
  ["Banano","🍌","Frutas","#f0fdf4"],
  ["Sandía","🍉","Frutas","#f0fdf4"],
  ["Piña","🍍","Frutas","#f0fdf4"],
  ["Uvas","🍇","Frutas","#f0fdf4"],
  ["Fresas","🍓","Frutas","#f0fdf4"],
  ["Naranja","🍊","Frutas","#f0fdf4"],
  ["Mango","🥭","Frutas","#f0fdf4"],
  ["Ensalada de frutas","🍓","Frutas","#f0fdf4"],
  ["Brocheta de frutas","🍢","Frutas","#f0fdf4"],
  ["Fruta con yogur y granola","🥣","Frutas","#f0fdf4"],
  ["Agua","💧","Bebidas","#eff6ff"],
  ["Agua mineral","💧","Bebidas","#eff6ff"],
  ["Jugo de naranja","🧃","Bebidas","#eff6ff"],
  ["Jugo de mora","🧃","Bebidas","#eff6ff"],
  ["Jugo de maracuyá","🧃","Bebidas","#eff6ff"],
  ["Jugo de tomate de árbol","🧃","Bebidas","#eff6ff"],
  ["Limonada","🍋","Bebidas","#eff6ff"],
  ["Batido de fruta","🥤","Bebidas","#eff6ff"],
  ["Yogur","🥛","Bebidas","#eff6ff"],
  ["Leche chocolatada","🥛","Bebidas","#eff6ff"],
  ["Avena","🥛","Bebidas","#eff6ff"],
  ["Café","☕","Bebidas","#eff6ff"],
  ["Chocolate caliente","☕","Bebidas","#eff6ff"],
  ["Aromática","🍵","Bebidas","#eff6ff"],
  ["Té frío","🥤","Bebidas","#eff6ff"],
  ["Arroz con pollo","🍛","Platos","#f8fafc"],
  ["Arroz con menestra y carne","🍛","Platos","#f8fafc"],
  ["Seco de pollo","🍗","Platos","#f8fafc"],
  ["Seco de carne","🥩","Platos","#f8fafc"],
  ["Lasaña","🍝","Platos","#f8fafc"],
  ["Espagueti","🍝","Platos","#f8fafc"],
  ["Encebollado","🍲","Platos","#f8fafc"],
  ["Sopa del día","🍲","Platos","#f8fafc"],
  ["Ensalada","🥗","Platos","#f8fafc"],
  ["Menú del día","🍽️","Platos","#f8fafc"],
  ["Canguil","🍿","Snacks","#fefce8"],
  ["Chifles","🍌","Snacks","#fefce8"],
  ["Tostado","🌽","Snacks","#fefce8"],
  ["Granola","🥣","Snacks","#fefce8"]
].map(([nombre,emoji,categoria,fondo],indice)=>({
  id:`base-${indice+1}`,nombre,categoria,imagen:crearMiniaturaGaleria(nombre,emoji,fondo),base:true
}));

export default function App() {
  const [correo, setCorreo] = useState("");
const [password, setPassword] = useState("");
const [mensaje, setMensaje] = useState("");
const [cargando, setCargando] = useState(false);
const [loginInstitucionId, setLoginInstitucionId] = useState("");
const [loginPuntosOperacion, setLoginPuntosOperacion] = useState([]);
const [loginPuntoId, setLoginPuntoId] = useState("ADMIN");
const [cargandoLoginPuntos, setCargandoLoginPuntos] = useState(false);
const [mostrarRegistroPadrePortal, setMostrarRegistroPadrePortal] = useState(false);
const [registroPadrePortal, setRegistroPadrePortal] = useState({
  cedula: "",
  nombres: "",
  apellidos: "",
  correo: "",
  password: "",
  confirmar_password: "",
});
const [mensajeRegistroPadre, setMensajeRegistroPadre] = useState("");
const [cargandoRegistroPadre, setCargandoRegistroPadre] = useState(false);
const [eventoInstalacionPadres, setEventoInstalacionPadres] = useState(null);
const [appPadresInstalada, setAppPadresInstalada] = useState(() => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true
  );
});
const [mensajeInstalacionPadres, setMensajeInstalacionPadres] = useState("");
const clicksAccesoAdminPadresRef = useRef({ cantidad: 0, ultimoClick: 0 });
const [esPantallaCompacta, setEsPantallaCompacta] = useState(() =>
  detectarPantallaCompacta()
);
const [menuQ2Abierto, setMenuQ2Abierto] = useState(false);

useEffect(() => {
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.setAttribute("name", "viewport");
    document.head.appendChild(viewport);
  }
  viewport.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
  );

  const actualizarPantalla = () => {
    const compacta = detectarPantallaCompacta();
    setEsPantallaCompacta(compacta);
    if (!compacta) setMenuQ2Abierto(false);
  };

  actualizarPantalla();
  window.addEventListener("resize", actualizarPantalla);
  window.addEventListener("orientationchange", actualizarPantalla);
  return () => {
    window.removeEventListener("resize", actualizarPantalla);
    window.removeEventListener("orientationchange", actualizarPantalla);
  };
}, []);


// PWA POS NUBE / PORTAL DE PADRES
useEffect(() => {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const paramsPwa = new URLSearchParams(window.location.search);
  const esPortalPadresPwa = paramsPwa.get("portal") === "padres";

  let manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement("link");
    manifestLink.setAttribute("rel", "manifest");
    document.head.appendChild(manifestLink);
  }

  manifestLink.setAttribute(
    "href",
    esPortalPadresPwa
      ? "/manifest-padres.webmanifest?v=1"
      : "/manifest.webmanifest?v=1"
  );

  document.title = esPortalPadresPwa ? "POS NUBE Padres" : "POS NUBE";

  const asegurarMeta = (selector, atributos) => {
    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      document.head.appendChild(meta);
    }
    Object.entries(atributos).forEach(([clave, valor]) => {
      meta.setAttribute(clave, valor);
    });
  };

  const asegurarLink = (selector, atributos) => {
    let link = document.querySelector(selector);
    if (!link) {
      link = document.createElement("link");
      document.head.appendChild(link);
    }
    Object.entries(atributos).forEach(([clave, valor]) => {
      link.setAttribute(clave, valor);
    });
  };

  asegurarMeta('meta[name="theme-color"]', { name: "theme-color", content: "#1d4ed8" });
  asegurarMeta('meta[name="mobile-web-app-capable"]', { name: "mobile-web-app-capable", content: "yes" });
  asegurarMeta('meta[name="apple-mobile-web-app-capable"]', { name: "apple-mobile-web-app-capable", content: "yes" });
  asegurarMeta('meta[name="apple-mobile-web-app-status-bar-style"]', { name: "apple-mobile-web-app-status-bar-style", content: "default" });
  asegurarMeta('meta[name="apple-mobile-web-app-title"]', {
    name: "apple-mobile-web-app-title",
    content: esPortalPadresPwa ? "POS NUBE Padres" : "POS NUBE",
  });
  asegurarLink('link[rel="apple-touch-icon"]', { rel: "apple-touch-icon", href: "/pwa-icon-192.png" });

  if ("serviceWorker" in navigator) {
    const registrar = async () => {
      try {
        if ("caches" in window) {
          const claves = await caches.keys();
          await Promise.all(
            claves
              .filter((clave) => String(clave).startsWith("pos-nube-pwa-"))
              .map((clave) => caches.delete(clave))
          );
        }
        const registro = await navigator.serviceWorker.register("/sw.js?v=9", { scope: "/" });
        if (registro?.update) registro.update().catch(() => {});
        console.log("POS NUBE PWA activa:", registro.scope);
      } catch (error) {
        console.error("No se pudo registrar la PWA:", error);
      }
    };
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }
}, []);

useEffect(() => {
  if (typeof window === "undefined") return undefined;

  const capturarInstalacion = (event) => {
    event.preventDefault();
    setEventoInstalacionPadres(event);
    setMensajeInstalacionPadres("");
  };
  const confirmarInstalacion = () => {
    setAppPadresInstalada(true);
    setEventoInstalacionPadres(null);
    setMensajeInstalacionPadres("App de Padres instalada correctamente.");
  };

  window.addEventListener("beforeinstallprompt", capturarInstalacion);
  window.addEventListener("appinstalled", confirmarInstalacion);
  return () => {
    window.removeEventListener("beforeinstallprompt", capturarInstalacion);
    window.removeEventListener("appinstalled", confirmarInstalacion);
  };
}, []);

const instalarAppPadres = async () => {
  if (appPadresInstalada) {
    setMensajeInstalacionPadres("La App de Padres ya está instalada.");
    return;
  }

  if (eventoInstalacionPadres) {
    try {
      await eventoInstalacionPadres.prompt();
      const eleccion = await eventoInstalacionPadres.userChoice;
      setMensajeInstalacionPadres(
        eleccion?.outcome === "accepted"
          ? "Instalando POS NUBE Padres..."
          : "Instalación cancelada."
      );
      setEventoInstalacionPadres(null);
      return;
    } catch (error) {
      console.error("No se pudo mostrar la instalación PWA:", error);
    }
  }

  const esIOS =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent || "") &&
    !window.MSStream;

  setMensajeInstalacionPadres(
    esIOS
      ? "En iPhone/iPad: toca Compartir y luego “Añadir a pantalla de inicio”."
      : "En el menú del navegador selecciona “Instalar app” o “Añadir a pantalla de inicio”."
  );
};

const registrarClickAccesoAdminPadres = () => {
  const ahora = Date.now();
  const anterior = clicksAccesoAdminPadresRef.current;

  // Si pasan más de 2 segundos, reinicia la secuencia.
  if (ahora - Number(anterior.ultimoClick || 0) > 2000) {
    anterior.cantidad = 0;
  }

  anterior.cantidad += 1;
  anterior.ultimoClick = ahora;

  if (anterior.cantidad >= 3) {
    anterior.cantidad = 0;
    // Sale del portal de padres y vuelve al login administrativo/operativo normal.
    window.location.href = window.location.pathname;
  }
};


const [verPasswordLogin, setVerPasswordLogin] = useState(false);
const [verPasswordActual, setVerPasswordActual] = useState(false);
const [verPasswordNueva, setVerPasswordNueva] = useState(false);
const [verPasswordConfirmar, setVerPasswordConfirmar] = useState(false);

  const [mostrarCambiarAcceso, setMostrarCambiarAcceso] = useState(false);
  const [mostrarCrearCuenta, setMostrarCrearCuenta] = useState(false);

const [crearCuentaForm, setCrearCuentaForm] = useState({
  institucion_id: "",
  nombre: "",
  correo: "",
  password: "",
  confirmar_password: "",
});
const [mensajeCrearCuenta, setMensajeCrearCuenta] = useState("");
const [cargandoCrearCuenta, setCargandoCrearCuenta] = useState(false);

  const [cambiarAccesoForm, setCambiarAccesoForm] = useState({
    institucion_id: "",
    correo_actual: "",
    password_actual: "",
    nuevo_correo: "",
    nueva_password: "",
    confirmar_password: "",
  });

  const [mensajeCambiarAcceso, setMensajeCambiarAcceso] = useState("");
  const [cargandoCambiarAcceso, setCargandoCambiarAcceso] = useState(false);

  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });


  const rolActual = normalizarRol(usuario?.rol);
  const esRolPortal = ["PADRE", "ESTUDIANTE"].includes(rolActual);

  const puede = (permiso) => puedeRol(rolActual, permiso);

  const puedeAccederMenu = (menuId) => {
    const permitidos = MENU_POR_ROL[rolActual] || [];
    return permitidos.includes("*") || permitidos.includes(menuId);
  };

  const aplicarVistaInicialRol = (rol, setVistaFn, setVentasFn) => {
    const normalizado = normalizarRol(rol);
    const inicial = VISTA_INICIAL_POR_ROL[normalizado] || { vista: "dashboard" };
    setVistaFn(inicial.vista);
    if (inicial.ventas) setVentasFn(inicial.ventas);
  };

  const [vista, setVista] = useState(() => {
    const guardado = JSON.parse(localStorage.getItem("usuario") || "null");
    const rol = normalizarRol(guardado?.rol);
    return VISTA_INICIAL_POR_ROL[rol]?.vista || "dashboard";
  });
  const [resumen, setResumen] = useState(null);

  const [institucionSeleccionadaId, setInstitucionSeleccionadaId] = useState(() => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario") || "null");
    const institucionUsuario = normalizarInstitucionId(usuarioGuardado?.institucion_id);

    if (institucionUsuario) {
      return institucionUsuario;
    }

    const guardada = localStorage.getItem("institucionSeleccionadaId");
    return normalizarInstitucionId(guardada);
  });

  const [productos, setProductos] = useState([]);
  const [productoForm, setProductoForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    stock_minimo: "",
    categoria: "",
    imagen: "",
  });
  const [editandoProductoId, setEditandoProductoId] = useState(null);
  const [galeriaProductos, setGaleriaProductos] = useState([]);
  const [galeriaBusqueda, setGaleriaBusqueda] = useState("");
  const [galeriaCategoria, setGaleriaCategoria] = useState("TODAS");
  const [cargandoGaleria, setCargandoGaleria] = useState(false);
  const inputGaleriaFotoRef = useRef(null);

  const [alumnos, setAlumnos] = useState([]);
  const [alumnoForm, setAlumnoForm] = useState({
    cedula: "",
    nombres: "",
    apellidos: "",
    curso: "",
    paralelo: "",
    saldo: "",
  });
  const [editandoAlumnoId, setEditandoAlumnoId] = useState(null);
  const [filtroAlumnos, setFiltroAlumnos] = useState("todos");
  const [alumnoDetalle, setAlumnoDetalle] = useState(null);
const [vistaAlumnoDetalle, setVistaAlumnoDetalle] = useState("datos");
const [historialVentasAlumno, setHistorialVentasAlumno] = useState([]);
const [historialRecargasAlumno, setHistorialRecargasAlumno] = useState([]);
const [historialConsumoAlumno, setHistorialConsumoAlumno] = useState([]);
const [ordenDetalleAlumno, setOrdenDetalleAlumno] = useState(null);

  const [inventarioFiltro, setInventarioFiltro] = useState("todos");
  const [inventarioBusqueda, setInventarioBusqueda] = useState("");
  const [inventarioForm, setInventarioForm] = useState({
    producto_id: "",
    tipo: "ENTRADA",
    cantidad: "",
    motivo: "",
  });

  const [recargas, setRecargas] = useState([]);
  const [recargaForm, setRecargaForm] = useState({
    alumno_id: "",
    monto: "",
    metodo_pago: "EFECTIVO",
    numero_comprobante: "",
    fecha_transferencia: "",
    observacion: "",
  });

  const [vistaRecargasInterna, setVistaRecargasInterna] = useState("lista");

const [recargasFiltros, setRecargasFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  metodo_pago: "todas",
  alumno_id: "",
  texto: "",
});
const [cuentasBancarias, setCuentasBancarias] = useState([]);

// Selección manual de registros de prueba. Solo se muestran controles de borrado
// a ADMIN / SUPER_ADMIN; el backend vuelve a validar el rol.
const [ventasSeleccionadasBorrar, setVentasSeleccionadasBorrar] = useState([]);
const [recargasSeleccionadasBorrar, setRecargasSeleccionadasBorrar] = useState([]);
const [cierresSeleccionadosBorrar, setCierresSeleccionadosBorrar] = useState([]);
const [jornadasSeleccionadasBorrar, setJornadasSeleccionadasBorrar] = useState([]);
const [productosMenuSeleccionadosBorrar, setProductosMenuSeleccionadosBorrar] = useState([]);
const [productosStockSeleccionadosBorrar, setProductosStockSeleccionadosBorrar] = useState([]);
const [jornadasHistorial, setJornadasHistorial] = useState([]);
const [eliminandoPruebas, setEliminandoPruebas] = useState(false);
const [eliminandoProductosPrueba, setEliminandoProductosPrueba] = useState(false);

  const [ventas, setVentas] = useState([]);
  const [ventaForm, setVentaForm] = useState({
    alumno_id: "",
    profesor_id: "",
    metodo_pago: "EFECTIVO",
    observacion: "",
  });
 const [ventaItems, setVentaItems] = useState([]);

  const [vistaVentasInterna, setVistaVentasInterna] = useState(() => {
    const guardado = JSON.parse(localStorage.getItem("usuario") || "null");
    const rol = normalizarRol(guardado?.rol);
    return VISTA_INICIAL_POR_ROL[rol]?.ventas || "consultar";
  });

  // Seguridad de interfaz:
  // CAJERO y ENCARGADO_LOCAL no consultan el historial de ventas.
  // Dentro de Ventas trabajan únicamente en Nueva Orden.
  useEffect(() => {
    if (
      ["CAJERO", "ENCARGADO_LOCAL"].includes(rolActual) &&
      vistaVentasInterna !== "registrar"
    ) {
      setVistaVentasInterna("registrar");
    }
  }, [rolActual, vistaVentasInterna]);
const [menuComidasAbierto, setMenuComidasAbierto] = useState(true);
const [menuVentasAbierto, setMenuVentasAbierto] = useState(false);
const [menuReportesAbierto, setMenuReportesAbierto] = useState(false);
const [busquedaProductos, setBusquedaProductos] = useState("");
const [busquedaInventario, setBusquedaInventario] = useState("");
const [productoDetalle, setProductoDetalle] = useState(null);
const [productosSeleccionados, setProductosSeleccionados] = useState({});
const [stockDetalle, setStockDetalle] = useState(null);
const [stockTransferencia, setStockTransferencia] = useState(null);
const [bajaStock, setBajaStock] = useState(null);
const [existenciasInventario, setExistenciasInventario] = useState([]);
const [puntosInventario, setPuntosInventario] = useState(["PRINCIPAL"]);
const [puntoInventarioSeleccionado, setPuntoInventarioSeleccionado] = useState("PRINCIPAL");
const [puntosOperacion,setPuntosOperacion]=useState([]);
const [jornadaActiva,setJornadaActiva]=useState(() => {
  // Recuperación inmediata tras un refresh/WebView:
  // se usa solo como estado inicial y luego se valida contra el backend.
  try {
    const guardada = JSON.parse(
      localStorage.getItem("jornadaActiva") || "null"
    );

    return guardada?.id ? guardada : null;
  } catch (_error) {
    return null;
  }
});
const [estadoOperativoCaja,setEstadoOperativoCaja]=useState({
  permitido:true,
  estado_operativo:"CARGANDO",
  requiere_abrir_jornada:false,
  requiere_cerrar_pendiente:false,
  jornada:null,
  message:"",
});
const [cargandoEstadoOperativoCaja,setCargandoEstadoOperativoCaja]=useState(false);

// Referencia visual robusta de la caja pendiente.
// Prioridad 1: la jornada que entrega /estado-operativo como CIERRE_PENDIENTE.
// Respaldo: jornadaActiva/localStorage si su fecha operativa es anterior a hoy.
// Esto evita que la marca roja desaparezca al navegar al módulo Cierre de caja.
const jornadaPendienteCierreVisual = (() => {
  const desdeEstado =
    estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE"
      ? estadoOperativoCaja?.jornada
      : null;

  if (desdeEstado?.id) return desdeEstado;

  let candidata = jornadaActiva || null;

  if (!candidata?.id) {
    try {
      candidata = JSON.parse(localStorage.getItem("jornadaActiva") || "null");
    } catch (_error) {
      candidata = null;
    }
  }

  if (!candidata?.id) return null;

  const fechaJornada = normalizarFechaISO(
    candidata?.fecha_operativa_texto ||
      candidata?.fecha_operativa ||
      candidata?.abierta_at
  );

  const hoyEcuador = obtenerFechaEcuadorISO();

  return fechaJornada && hoyEcuador && fechaJornada < hoyEcuador
    ? candidata
    : null;
})();
const [mostrarSelectorJornada,setMostrarSelectorJornada]=useState(false);
const [mostrarAbrirJornadaAdmin,setMostrarAbrirJornadaAdmin]=useState(false);
const [puntoJornadaSeleccionado,setPuntoJornadaSeleccionado]=useState("");
const [operadorJornadaCorreo,setOperadorJornadaCorreo]=useState("");
const [operadorJornadaPassword,setOperadorJornadaPassword]=useState("");
const [verPasswordOperadorJornada,setVerPasswordOperadorJornada]=useState(false);
const [mostrarEditarAccesoJornada,setMostrarEditarAccesoJornada]=useState(false);
const [editarPuntoStock,setEditarPuntoStock]=useState(null);
const [cargandoJornada,setCargandoJornada]=useState(false);
useEffect(()=>{
  if(jornadaActiva?.id){
    setMostrarSelectorJornada(false);
  }
},[jornadaActiva?.id]);

// Q2 / operadores:
// Si el usuario está dentro del POS pero no tiene jornada, preparamos
// automáticamente el formulario GLOBAL de apertura. No dependemos de
// ningún modal ubicado dentro de "Cierre de caja".
useEffect(() => {
  const rol = normalizarRol(usuario?.rol);

  if (
    !usuario ||
    !["ENCARGADO_LOCAL","CAJERO"].includes(rol) ||
    jornadaActiva?.id
  ) {
    return;
  }

  setOperadorJornadaCorreo(String(usuario?.correo || "").trim());
  setOperadorJornadaPassword("");
  setVerPasswordOperadorJornada(false);

  cargarPuntosOperacion()
    .then((puntos) => {
      const disponibles = obtenerPuntosJornadaDisponibles(puntos);

      let puntoRecordado = 0;

      try {
        const ultimo = JSON.parse(
          localStorage.getItem("ultimoAccesoOperativo") || "null"
        );
        puntoRecordado = Number(ultimo?.punto_id || 0);
      } catch (_error) {
        puntoRecordado = 0;
      }

      const puntoElegido =
        disponibles.find(
          (punto) => Number(punto?.id) === puntoRecordado
        ) ||
        disponibles[0] ||
        null;

      setPuntoJornadaSeleccionado(
        puntoElegido?.id ? String(puntoElegido.id) : ""
      );
    })
    .catch((error) => {
      console.error(
        "No se pudieron preparar las ubicaciones para abrir jornada:",
        error
      );
    });
}, [usuario?.id, usuario?.rol, jornadaActiva?.id]);
const [mostrarPuntosStock,setMostrarPuntosStock]=useState(false);
const [nuevoPuntoForm,setNuevoPuntoForm]=useState({nombre:"",codigo:"",descripcion:""});
const [mostrarNuevoProductoStock,setMostrarNuevoProductoStock]=useState(false);
const [nuevoProductoStockForm,setNuevoProductoStockForm]=useState({
  nombre:"",
  codigo:"",
  precio:"",
  categoria:"",
  stock_minimo:"",
  cantidad_inicial:"",
  concepto_inicial:"COMPRA",
  observacion_inicial:"",
  ubicacion_inicial:"",
});
const [movimientoStock,setMovimientoStock]=useState(null);
const [panelMovimientoStock,setPanelMovimientoStock]=useState(null);
const [transferenciaLocales,setTransferenciaLocales]=useState(null);
const [institucionesTransferencia,setInstitucionesTransferencia]=useState([]);
const [puntosDestinoLocal,setPuntosDestinoLocal]=useState([]);
const [filtroCategoriaStock,setFiltroCategoriaStock]=useState("");

const [stockSeccion,setStockSeccion]=useState("");
const [stockTipoIngreso,setStockTipoIngreso]=useState("");
const [stockTipoEgreso,setStockTipoEgreso]=useState("");
const [stockBusquedaOperacion,setStockBusquedaOperacion]=useState("");
const [stockFamiliaOperacion,setStockFamiliaOperacion]=useState("TODAS");
const [stockItemsOperacion,setStockItemsOperacion]=useState({});
const [stockCompraForm,setStockCompraForm]=useState({
  proveedor_id:"",
  proveedor_nuevo:"",
  numero_factura:"",
  observacion:"",
});
const [stockOperacionForm,setStockOperacionForm]=useState({
  observacion:"",
  ubicacion_destino:"",
  institucion_destino_id:"",
  punto_destino_id:"",
  destinatario_cortesia:"",
});
const [proveedoresStock,setProveedoresStock]=useState([]);
const [familiasCatalogoStock,setFamiliasCatalogoStock]=useState([]);
const [importandoProveedoresStock,setImportandoProveedoresStock]=useState(false);
const [importandoFamiliasStock,setImportandoFamiliasStock]=useState(false);
const [stockConfirmacion,setStockConfirmacion]=useState(null);
const [stockResultado,setStockResultado]=useState(null);
const [guardandoStockOperacion,setGuardandoStockOperacion]=useState(false);

const [mostrarReporteStock,setMostrarReporteStock]=useState(false);
const [reporteStock,setReporteStock]=useState([]);
const [cargandoReporteStock,setCargandoReporteStock]=useState(false);
const [reporteStockFiltros,setReporteStockFiltros]=useState({
  fecha_inicio:"",
  fecha_fin:"",
  producto_id:"",
  familia:"",
  tipo:"CARGA",
  ubicacion:"",
});



const familiasOperacionStock = useMemo(() => {
  const valoresProductos = productos
    .filter((p) => p?.activo !== false)
    .map((p) => String(p?.categoria || "").trim())
    .filter(Boolean);

  const valoresCatalogo = (familiasCatalogoStock || [])
    .filter((f) => f?.activo !== false)
    .map((f) => String(f?.nombre || "").trim())
    .filter(Boolean);

  return [...new Set([...valoresProductos, ...valoresCatalogo])]
    .sort((a,b)=>a.localeCompare(b));
}, [productos, familiasCatalogoStock]);

const productosOperacionStock = useMemo(() => {
  const texto = String(stockBusquedaOperacion || "").trim().toLowerCase();
  const familia = String(stockFamiliaOperacion || "TODAS").trim();

  return productos
    .filter((p) => p?.activo !== false)
    .filter((p) => {
      if (familia === "TODAS") return true;
      return String(p?.categoria || "").trim() === familia;
    })
    .filter((p) => {
      if (!texto) return true;
      return [
        p?.nombre,
        p?.codigo,
        p?.categoria,
        p?.descripcion,
      ]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(texto));
    })
    .sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||"")));
}, [
  productos,
  stockBusquedaOperacion,
  stockFamiliaOperacion,
]);

const [stockEditado, setStockEditado] = useState({});
const inputImportarStockRef = useRef(null);
const inputImportarAlumnosRef = useRef(null);
const inputImportarProfesoresRef = useRef(null);

const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
const [filtroCategoriaProductos, setFiltroCategoriaProductos] = useState("");
const [productoEditando, setProductoEditando] = useState(null);

const [modoNuevaOrden, setModoNuevaOrden] = useState("consumidor_final");
const [tipoUsuarioNuevaOrden, setTipoUsuarioNuevaOrden] = useState("TODOS");
const [busquedaUsuarioNuevaOrden, setBusquedaUsuarioNuevaOrden] = useState("");
const [codigoBarraNuevaOrden, setCodigoBarraNuevaOrden] = useState("");
const [busquedaProductoNuevaOrden, setBusquedaProductoNuevaOrden] = useState("");
const [categoriaNuevaOrden, setCategoriaNuevaOrden] = useState("TODOS");
const [localNuevaOrden, setLocalNuevaOrden] = useState("PRINCIPAL");
const [fechaNuevaOrden, setFechaNuevaOrden] = useState(
  new Date().toISOString().slice(0, 10)
);
const [efectivoRecibidoNuevaOrden, setEfectivoRecibidoNuevaOrden] = useState("");
const formNuevaOrdenRef = useRef(null);
const cabeceraNuevaOrdenRef = useRef(null);
const [topPanelPagoNuevaOrden, setTopPanelPagoNuevaOrden] = useState(176);
const ventaRapidaBloqueadaRef = useRef(false);

useEffect(() => {
  const actualizarTopPanelPago = () => {
    const cabecera = cabeceraNuevaOrdenRef.current;

    if (!cabecera) {
      setTopPanelPagoNuevaOrden(176);
      return;
    }

    const rect = cabecera.getBoundingClientRect();

    // Mientras el bloque azul BAR PRINCIPAL / FECHA está más abajo,
    // el panel baja/sube junto con él. Cuando llega a 176px,
    // queda fijado allí y nunca invade la parte superior.
    const topCalculado = Math.max(176, Math.round(rect.bottom + 12));

    setTopPanelPagoNuevaOrden((anterior) =>
      anterior === topCalculado ? anterior : topCalculado
    );
  };

  actualizarTopPanelPago();

  window.addEventListener("scroll", actualizarTopPanelPago, { passive: true });
  window.addEventListener("resize", actualizarTopPanelPago);

  return () => {
    window.removeEventListener("scroll", actualizarTopPanelPago);
    window.removeEventListener("resize", actualizarTopPanelPago);
  };
}, [vista, vistaVentasInterna]);

//////////////////////////////
// PROFESORES
//////////////////////////////

const [vistaProfesoresInterna, setVistaProfesoresInterna] = useState("profesores");

const [profesores, setProfesores] = useState([]);

const [filtroProfesores, setFiltroProfesores] = useState("todos");
const [busquedaProfesores, setBusquedaProfesores] = useState("");
const [mostrarFiltroProfesores, setMostrarFiltroProfesores] = useState(false);

const [profesorForm, setProfesorForm] = useState({
  cedula: "",
  nombres: "",
  apellidos: "",
  email: "",
  codigo: "",
  telefono: "",
  saldo: "",
  es_profesor: true,
});

const [editandoProfesorId, setEditandoProfesorId] = useState(null);
const [profesorDetalle, setProfesorDetalle] = useState(null);
const [vistaProfesorDetalle, setVistaProfesorDetalle] = useState("ordenes");
const [mostrarFormularioProfesor, setMostrarFormularioProfesor] = useState(false);

const [creditosProfesores, setCreditosProfesores] = useState([]);
const [cargandoCreditosProfesores, setCargandoCreditosProfesores] = useState(false);
const [creditoProfesorForm, setCreditoProfesorForm] = useState({
  tipo: "AJUSTE_POSITIVO",
  monto: "",
  comercio: "POS NUBE",
  observacion: "",
});
const [creditoProfesorAdminPassword, setCreditoProfesorAdminPassword] = useState("");
const [creditoProfesorLimite, setCreditoProfesorLimite] = useState("");
const [verCreditoProfesorAdminPassword, setVerCreditoProfesorAdminPassword] = useState(false);
const [guardandoAutorizacionCreditoProfesor, setGuardandoAutorizacionCreditoProfesor] = useState(false);

useEffect(() => {
  if (profesorDetalle?.id) {
    setCreditoProfesorLimite(
      String(Number(profesorDetalle.limite_credito || 0))
    );
  }
}, [profesorDetalle?.id, profesorDetalle?.limite_credito]);
const [recargaProfesorForm, setRecargaProfesorForm] = useState({
  monto: "",
  metodo_pago: "EFECTIVO",
  numero_comprobante: "",
  fecha_transferencia: "",
  observacion: "",
});
const [guardandoRecargaProfesor, setGuardandoRecargaProfesor] = useState(false);
const [mostrarModalRecargaProfesor, setMostrarModalRecargaProfesor] = useState(false);
const [creditosProfesoresFiltros, setCreditosProfesoresFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  texto: "",
});

   const [ventasFiltros, setVentasFiltros] = useState({
  tipo_fecha: "created_at",
  fecha_inicio: "",
  fecha_fin: "",
  tipo_orden: "",
  orden_id: "",
  ubicacion: "",
  operador: "",
  estado: "ENTREGADA",
  metodo_pago: "todos",
  alumno_id: "",
  texto: "",
});

const [productosFiltros, setProductosFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  operador: "",
  ubicacion: "",
  comprado: "",
  texto: "",
});

const [productosVendidos, setProductosVendidos] = useState([]);

  const [cierreCajaFiltros, setCierreCajaFiltros] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    punto_id: "",
  });
  const [mostrarReporteCierres, setMostrarReporteCierres] = useState(false);

  const [productosPorDiaFiltros, setProductosPorDiaFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  ubicacion: "",
  comprado: "",
  texto: "",
});

const [productosVendidosPorDia, setProductosVendidosPorDia] = useState([]);

const [egresosFiltros, setEgresosFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  texto: "",
});

const [egresosDiarios, setEgresosDiarios] = useState([]);
const [egresosSeleccionadosBorrar, setEgresosSeleccionadosBorrar] = useState([]);
const [mostrarCrearEgreso, setMostrarCrearEgreso] = useState(false);
const [editandoEgresoId, setEditandoEgresoId] = useState(null);
const [cierresCaja, setCierresCaja] = useState([]);
const [cajasPendientesCierre, setCajasPendientesCierre] = useState([]);
const [mostrarCrearCierre, setMostrarCrearCierre] = useState(false);
const [cierreDetalle, setCierreDetalle] = useState(null);
const [guardandoCierre, setGuardandoCierre] = useState(false);
const [cargandoCierres, setCargandoCierres] = useState(false);
const [resumenCierreServidor, setResumenCierreServidor] = useState(null);
// Jornada elegida exclusivamente para realizar un cierre desde ADMIN/SUPER_ADMIN.
// No convierte al administrador en operador ni se guarda como jornada activa.
const [jornadaCierreSeleccionada, setJornadaCierreSeleccionada] = useState(null);
const [cierreConsolidado, setCierreConsolidado] = useState(null);
const [cargandoConsolidado, setCargandoConsolidado] = useState(false);

const cajasPendientesVisuales = (() => {
  if (Array.isArray(cajasPendientesCierre) && cajasPendientesCierre.length > 0) {
    return cajasPendientesCierre.map((fila) => ({
      ...fila,
      id: Number(fila.id || fila.jornada_id || 0),
      fecha_operativa_texto:
        fila.fecha_operativa_texto ||
        fila.fecha_operativa ||
        null,
    })).filter((fila) => fila.id);
  }

  return jornadaPendienteCierreVisual?.id
    ? [jornadaPendienteCierreVisual]
    : [];
})();

// ADMIN / SUPER_ADMIN no trabajan con una jornada propia.
// Para cerrar caja desde administración se muestran las jornadas ABIERTAS
// de los operadores y el administrador elige exactamente cuál caja cerrar.
const cajasAbiertasAdmin = (() => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(rolActual)) return [];

  const idsPendientes = new Set(
    cajasPendientesVisuales.map((fila) => Number(fila.id || 0)).filter(Boolean)
  );

  return (Array.isArray(jornadasHistorial) ? jornadasHistorial : [])
    .map((fila) => ({
      ...fila,
      id: Number(fila.id || fila.jornada_id || 0),
      fecha_operativa_texto:
        fila.fecha_operativa_texto ||
        fila.fecha_operativa ||
        null,
    }))
    .filter((fila) =>
      fila.id &&
      String(fila.estado || "").trim().toUpperCase() === "ABIERTA" &&
      !idsPendientes.has(Number(fila.id))
    );
})();
const [cierreForm, setCierreForm] = useState({
  fecha: obtenerFechaEcuadorISO(),
  negocio: "POS NUBE",
  tarjeta_manual: "0",
  transferencia_manual: "0",
  observacion: "",
  denominaciones: {
    billete_1: "", billete_2: "", billete_5: "", billete_10: "",
    billete_20: "", billete_50: "", billete_100: "",
    moneda_001: "", moneda_005: "", moneda_010: "",
    moneda_025: "", moneda_050: "", moneda_1: "",
  },
});

const [egresoForm, setEgresoForm] = useState({
  // "negocio" se conserva internamente por compatibilidad con backend,
  // pero en pantalla se maneja como LOCAL.
  negocio: "PENSIONADO",
  fecha: "",
  nombre_egreso: "",
  proveedor_id: "",
  proveedor_nombre: "",
  total: "",
  descripcion: "",
  estado: "ACTIVO",
  numero_factura: "",
  tipo_documento: "FACTURA",
  tipo_egreso: "Efectivo",
});

  const [cuentaForm, setCuentaForm] = useState({
    correo: "",
    password_actual: "",
    nueva_password: "",
    confirmar_password: "",
  });
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);

  const obtenerInstitucionActivaId = () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario") || "null");

    const desdeUsuario = normalizarInstitucionId(usuario?.institucion_id);
    if (desdeUsuario) return desdeUsuario;

    const desdeUsuarioGuardado = normalizarInstitucionId(usuarioGuardado?.institucion_id);
    if (desdeUsuarioGuardado) return desdeUsuarioGuardado;

    const guardada = localStorage.getItem("institucionSeleccionadaId");
    return normalizarInstitucionId(guardada);
  };

  const institucionActivaId = obtenerInstitucionActivaId();

  const institucionActiva = useMemo(() => {
    return (
      INSTITUCIONES.find((i) => Number(i.id) === Number(institucionActivaId)) || {
        id: institucionActivaId,
        nombre: "Institución asignada",
      }
    );
  }, [institucionActivaId]);

  const obtenerCedulaAlumno = (alumno) => {
    return (
      alumno?.cedula ||
      alumno?.codigo ||
      alumno?.numero_cedula ||
      alumno?.identificacion ||
      alumno?.documento ||
      ""
    );
  };

  const obtenerNombreAlumno = (alumno) => {
    if (!alumno) return "-";
    const nombre = `${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim();
    return nombre || obtenerCedulaAlumno(alumno) || `Alumno #${alumno.id}`;
  };

  const alumnosActivos = useMemo(() => {
    return alumnos.filter((a) => a.activo !== false);
  }, [alumnos]);

  const alumnosFiltrados = useMemo(() => {
    if (filtroAlumnos === "todos") return alumnos;
    if (filtroAlumnos === "inactivos") {
      return alumnos.filter((a) => a.activo === false);
    }
    return alumnos.filter((a) => a.activo !== false);
  }, [alumnos, filtroAlumnos]);

  const productosActivos = useMemo(() => {
    return productos.filter((p) => p.activo !== false);
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    return productos;
  }, [productos]);

  const profesoresFiltrados = useMemo(() => {
    const texto = busquedaProfesores.trim().toLowerCase();

    return profesores.filter((profesor) => {
      const coincideEstado =
        filtroProfesores === "todos"
          ? true
          : filtroProfesores === "inactivos"
          ? profesor.activo === false
          : profesor.activo !== false;

      if (!coincideEstado) return false;
      if (!texto) return true;

      const nombres = String(profesor.nombres || "").toLowerCase();
      const apellidos = String(profesor.apellidos || "").toLowerCase();
      const cedula = String(profesor.cedula || "").toLowerCase();
      const nombreCompleto = `${nombres} ${apellidos}`.trim();

      return (
        nombres.includes(texto) ||
        apellidos.includes(texto) ||
        cedula.includes(texto) ||
        nombreCompleto.includes(texto)
      );
    });
  }, [profesores, filtroProfesores, busquedaProfesores]);

  const productosInventario = useMemo(() => {
    const texto = inventarioBusqueda.trim().toLowerCase();

    let lista = productos.filter((p) => p.activo !== false);

    if (texto) {
      lista = lista.filter((p) => {
        const nombre = (p.nombre || "").toLowerCase();
        const categoria = (p.categoria || "").toLowerCase();
        const identificador = String(p.id || "");

        return (
          nombre.includes(texto) ||
          categoria.includes(texto) ||
          identificador.includes(texto)
        );
      });
    }

    if (inventarioFiltro === "bajo") {
      lista = lista.filter((p) => {
        const stock = Number(p.stock || 0);
        const stockMinimo = Number(p.stock_minimo || 0);
        return stock > 0 && stock <= stockMinimo;
      });
    }

    if (inventarioFiltro === "agotado") {
      lista = lista.filter((p) => Number(p.stock || 0) <= 0);
    }

    if (inventarioFiltro === "normal") {
      lista = lista.filter((p) => {
        const stock = Number(p.stock || 0);
        const stockMinimo = Number(p.stock_minimo || 0);
        return stock > stockMinimo;
      });
    }

    return lista;
  }, [productos, inventarioBusqueda, inventarioFiltro]);

  const inventarioResumen = useMemo(() => {
    const lista = productosActivos;
    const totalProductos = lista.length;

    const agotados = lista.filter((p) => Number(p.stock || 0) <= 0).length;

    const bajos = lista.filter((p) => {
      const stock = Number(p.stock || 0);
      const stockMinimo = Number(p.stock_minimo || 0);
      return stock > 0 && stock <= stockMinimo;
    }).length;

    const valorInventario = lista.reduce((acc, p) => {
      const stock = Number(p.stock || 0);
      const precio = Number(p.precio || 0);
      return acc + stock * precio;
    }, 0);

    return {
      totalProductos,
      agotados,
      bajos,
      valorInventario,
    };
  }, [productosActivos]);

  const reporteResumen = useMemo(() => {
    const totalRecargas = recargas.reduce((acc, r) => acc + Number(r.monto || 0), 0);
    const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const ventasEfectivo = ventas
      .filter((v) => v.metodo_pago === "EFECTIVO")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
    const ventasTransferencia = ventas
      .filter((v) => v.metodo_pago === "TRANSFERENCIA")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
    const ventasRecarga = ventas
      .filter((v) => v.metodo_pago === "SALDO")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
    const saldoTotalAlumnos = alumnosActivos.reduce(
      (acc, a) => acc + Number(a.saldo || 0),
      0
    );

    return {
      totalRecargas,
      totalVentas,
      ventasEfectivo,
      ventasTransferencia,
      ventasRecarga,
      saldoTotalAlumnos,
    };
  }, [recargas, ventas, alumnosActivos]);

  const recargasEnriquecidas = useMemo(() => {
  return recargas.map((recarga) => {
    const alumno = alumnos.find((a) => String(a.id) === String(recarga.alumno_id));
    const nombreAlumno = alumno
      ? obtenerNombreAlumno(alumno)
      : `${recarga.nombres || ""} ${recarga.apellidos || ""}`.trim() || "Alumno";

    return {
      ...recarga,
      alumno_nombre: nombreAlumno,
      fecha_base: recarga.created_at || recarga.fecha || null,
      operador_nombre:
        recarga.usuario_nombre ||
        recarga.usuario_correo ||
        usuario?.nombre ||
        usuario?.correo ||
        "Sistema",
      estado_visual: recarga.estado || "ACEPTADA",
      documento_visual:
        recarga.numero_comprobante ||
        (recarga.metodo_pago === "TRANSFERENCIA" ? "Sin comprobante" : "-"),
      dinero_entregado: Number(recarga.monto || 0),
      dinero_recargado: Number(recarga.monto || 0),
      tipo_visual:
        recarga.metodo_pago === "TRANSFERENCIA"
          ? "Transferencia"
          : recarga.metodo_pago === "EFECTIVO"
          ? "Efectivo"
          : recarga.metodo_pago || "-",
    };
  });
}, [recargas, alumnos, usuario]);

const recargasFiltradas = useMemo(() => {
  let lista = [...recargasEnriquecidas];

  if (recargasFiltros.metodo_pago !== "todas") {
    lista = lista.filter(
      (recarga) => recarga.metodo_pago === recargasFiltros.metodo_pago
    );
  }

  if (recargasFiltros.alumno_id) {
    lista = lista.filter(
      (recarga) =>
        String(recarga.alumno_id || "") === String(recargasFiltros.alumno_id)
    );
  }

  if (recargasFiltros.fecha_inicio) {
    lista = lista.filter((recarga) => {
      const fecha = formatearFechaInput(recarga.fecha_base);
      return fecha && fecha >= recargasFiltros.fecha_inicio;
    });
  }

  if (recargasFiltros.fecha_fin) {
    lista = lista.filter((recarga) => {
      const fecha = formatearFechaInput(recarga.fecha_base);
      return fecha && fecha <= recargasFiltros.fecha_fin;
    });
  }

  const texto = recargasFiltros.texto.trim().toLowerCase();
  if (texto) {
    lista = lista.filter((recarga) => {
      const nombre = (recarga.alumno_nombre || "").toLowerCase();
      const tipo = (recarga.tipo_visual || "").toLowerCase();
      const observacion = (recarga.observacion || "").toLowerCase();
      const documento = String(recarga.documento_visual || "").toLowerCase();
      const numeroOrden = String(recarga.id || "").toLowerCase();
      const numeroOrdenConPrefijo = `#${numeroOrden}`;

      return (
        nombre.includes(texto) ||
        tipo.includes(texto) ||
        observacion.includes(texto) ||
        documento.includes(texto) ||
        numeroOrden.includes(texto.replace(/^#/, "")) ||
        numeroOrdenConPrefijo.includes(texto)
      );
    });
  }

  return lista.sort((a, b) => {
    const fechaA = new Date(a.fecha_base || 0).getTime();
    const fechaB = new Date(b.fecha_base || 0).getTime();
    return fechaB - fechaA;
  });
}, [recargasEnriquecidas, recargasFiltros]);

const totalRecargasVista = useMemo(() => {
  return recargasFiltradas.reduce(
    (acc, recarga) => acc + Number(recarga.dinero_recargado || 0),
    0
  );
}, [recargasFiltradas]);

  const ventaItemsCalculados = useMemo(() => {
    return ventaItems.map((item) => {
      const producto = productosActivos.find(
        (p) => String(p.id) === String(item.producto_id)
      );

      const cantidad = Number(item.cantidad || 0);
      const precio = Number(producto?.precio || 0);
      const total = cantidad > 0 ? cantidad * precio : 0;

      return {
        ...item,
        producto,
        cantidad,
        precio,
        total,
      };
    });
  }, [ventaItems, productosActivos]);

  const totalVentaCalculado = useMemo(() => {
    return ventaItemsCalculados.reduce((acc, item) => acc + Number(item.total || 0), 0);
  }, [ventaItemsCalculados]);

  const alumnoVentaSeleccionado = useMemo(() => {
    return alumnosActivos.find((a) => String(a.id) === String(ventaForm.alumno_id)) || null;
  }, [alumnosActivos, ventaForm.alumno_id]);

  const profesorVentaSeleccionado = useMemo(() => {
    return profesores.find(
      (p) =>
        p.activo !== false &&
        String(p.id) === String(ventaForm.profesor_id)
    ) || null;
  }, [profesores, ventaForm.profesor_id]);

  const ventasEnriquecidas = useMemo(() => {
    return ventas.map((venta) => {
      const alumno = alumnos.find((a) => String(a.id) === String(venta.alumno_id));
      const nombreAlumno = alumno
        ? obtenerNombreAlumno(alumno)
        : venta.alumno_id
        ? `Alumno #${venta.alumno_id}`
        : "Consumidor final";

      const metodoVisual =
        venta.metodo_pago === "SALDO"
          ? "RECARGA"
          : venta.metodo_pago === "CREDITO"
          ? "CRÉDITO ALUMNO"
          : venta.metodo_pago === "CREDITO_PROFESOR"
          ? "CRÉDITO PROFESOR"
          : venta.metodo_pago || "EFECTIVO";

      return {
        ...venta,
        alumno_nombre: nombreAlumno,
        metodo_visual: metodoVisual,
        fecha_base: venta.created_at || venta.fecha || null,
        items: Array.isArray(venta.items)
          ? venta.items
          : Array.isArray(venta.detalles)
          ? venta.detalles
          : [],
        operador_visual:
          venta.operador ||
          venta.operador_nombre ||
          venta.operador_correo ||
          "Sistema",
        ubicacion_visual: normalizarUbicacionFrontend(
          venta.ubicacion_visual || venta.ubicacion || "PRINCIPAL",
          institucionActivaId
        ),
      };
    });
  }, [ventas, alumnos, institucionActivaId]);

  const ventasFiltradas = useMemo(() => {
    let lista = [...ventasEnriquecidas];

    if (ventasFiltros.metodo_pago !== "todos") {
      lista = lista.filter((venta) => {
        if (ventasFiltros.metodo_pago === "RECARGA") {
          return venta.metodo_visual === "RECARGA";
        }
        return venta.metodo_pago === ventasFiltros.metodo_pago;
      });
    }

    if (ventasFiltros.alumno_id) {
      lista = lista.filter(
        (venta) => String(venta.alumno_id || "") === String(ventasFiltros.alumno_id)
      );
    }

    if (ventasFiltros.fecha_inicio) {
      lista = lista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha >= ventasFiltros.fecha_inicio;
      });
    }

    if (ventasFiltros.fecha_fin) {
      lista = lista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha <= ventasFiltros.fecha_fin;
      });
    }

    if (ventasFiltros.orden_id.trim()) {
      lista = lista.filter((venta) =>
        String(venta.id || "").includes(ventasFiltros.orden_id.trim())
      );
    }

    const texto = ventasFiltros.texto.trim().toLowerCase();
    if (texto) {
      lista = lista.filter((venta) => {
        const metodo = (venta.metodo_visual || "").toLowerCase();
        const alumno = (venta.alumno_nombre || "").toLowerCase();
        const observacion = (venta.observacion || "").toLowerCase();
        const id = String(venta.id || "");
        const total = String(venta.total || "");

        return (
          metodo.includes(texto) ||
          alumno.includes(texto) ||
          observacion.includes(texto) ||
          id.includes(texto) ||
          total.includes(texto)
        );
      });
    }

    return lista.sort((a, b) => {
      const fechaA = new Date(a.fecha_base || 0).getTime();
      const fechaB = new Date(b.fecha_base || 0).getTime();
      return fechaB - fechaA;
    });
  }, [ventasEnriquecidas, ventasFiltros]);

    const resumenVentasVista = useMemo(() => {
    const totalVentas = ventasFiltradas.length;
    const montoTotal = ventasFiltradas.reduce(
      (acc, venta) => acc + Number(venta.total || 0),
      0
    );

    const montoEfectivo = ventasFiltradas
      .filter((venta) => venta.metodo_pago === "EFECTIVO")
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    const montoTransferencia = ventasFiltradas
      .filter((venta) => venta.metodo_pago === "TRANSFERENCIA")
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    const montoRecarga = ventasFiltradas
      .filter((venta) => venta.metodo_visual === "RECARGA")
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    return {
      totalVentas,
      montoTotal,
      montoEfectivo,
      montoTransferencia,
      montoRecarga,
    };
  }, [ventasFiltradas]);

  const limpiarFiltrosCierreCaja = () => {
    setCierreCajaFiltros({
      fecha_inicio: "",
      fecha_fin: "",
      punto_id: "",
    });
  };

  const cierreCajaResumen = useMemo(() => {
    let ventasLista = [...ventasEnriquecidas];
    let recargasLista = [...recargasEnriquecidas];

    if (cierreCajaFiltros.fecha_inicio) {
      ventasLista = ventasLista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha >= cierreCajaFiltros.fecha_inicio;
      });

      recargasLista = recargasLista.filter((recarga) => {
        const fecha = formatearFechaInput(recarga.fecha_base);
        return fecha && fecha >= cierreCajaFiltros.fecha_inicio;
      });
    }

    if (cierreCajaFiltros.fecha_fin) {
      ventasLista = ventasLista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha <= cierreCajaFiltros.fecha_fin;
      });

      recargasLista = recargasLista.filter((recarga) => {
        const fecha = formatearFechaInput(recarga.fecha_base);
        return fecha && fecha <= cierreCajaFiltros.fecha_fin;
      });
    }

    const ventasEfectivo = ventasLista
      .filter((v) => v.metodo_pago === "EFECTIVO")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);

    const ventasTransferencia = ventasLista
      .filter((v) => v.metodo_pago === "TRANSFERENCIA")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);

    const ventasSaldo = ventasLista
      .filter((v) => v.metodo_visual === "RECARGA")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);

    const recargasEfectivo = recargasLista
      .filter((r) => r.metodo_pago === "EFECTIVO")
      .reduce((acc, r) => acc + Number(r.monto || 0), 0);

    const recargasTransferencia = recargasLista
      .filter((r) => r.metodo_pago === "TRANSFERENCIA")
      .reduce((acc, r) => acc + Number(r.monto || 0), 0);

    const totalVentas =
      ventasEfectivo + ventasTransferencia + ventasSaldo;

    const totalRecargas =
      recargasEfectivo + recargasTransferencia;

    const totalGeneral = totalVentas + totalRecargas;

    return {
      ventasEfectivo,
      ventasTransferencia,
      ventasSaldo,
      recargasEfectivo,
      recargasTransferencia,
      totalVentas,
      totalRecargas,
      totalGeneral,
    };
  }, [ventasEnriquecidas, recargasEnriquecidas, cierreCajaFiltros]);

  const creditosProfesoresFiltrados = useMemo(() => {
    const texto = String(
      creditosProfesoresFiltros.texto || ""
    )
      .trim()
      .toLowerCase();

    return creditosProfesores.filter((movimiento) => {
      if (!texto) return true;

      const profesor = `${movimiento.nombres || ""} ${
        movimiento.apellidos || ""
      }`.toLowerCase();

      const comercio = String(
        movimiento.comercio || ""
      ).toLowerCase();

      const usuarioMovimiento = String(
        movimiento.usuario_nombre ||
          movimiento.usuario_correo ||
          ""
      ).toLowerCase();

      const tipo = String(
        movimiento.tipo || ""
      ).toLowerCase();

      return (
        profesor.includes(texto) ||
        comercio.includes(texto) ||
        usuarioMovimiento.includes(texto) ||
        tipo.includes(texto)
      );
    });
  }, [creditosProfesores, creditosProfesoresFiltros.texto]);

  const obtenerEstadoStock = (producto) => {
    const stock = Number(producto.stock || 0);
    const stockMinimo = Number(producto.stock_minimo || 0);

    if (stock <= 0) {
      return { texto: "Agotado", estilo: styles.badgeAgotado };
    }

    if (stock <= stockMinimo) {
      return { texto: "Stock bajo", estilo: styles.badgeBajo };
    }

    return { texto: "Normal", estilo: styles.badgeNormal };
  };

  const limpiarFormularioProducto = () => {
    setProductoForm({
  nombre: "",
  codigo: "",
  precio: "",
  categoria: "",
  stock: "",
  imagen: "",
  activo: true,
});
    setEditandoProductoId(null);
  };

  const iniciarEdicionProducto = (producto) => {
    setEditandoProductoId(producto.id);
    setProductoForm({
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      precio: producto.precio ?? "",
      stock: producto.stock ?? "",
      stock_minimo: producto.stock_minimo ?? "",
      categoria: producto.categoria || "",
    });
    setVista("productos");
  };

  const limpiarFormularioAlumno = () => {
    setAlumnoForm({
      cedula: "",
      nombres: "",
      apellidos: "",
      curso: "",
      paralelo: "",
      saldo: "",
    });
    setEditandoAlumnoId(null);
  };

  const limpiarFormularioRecarga = () => {
    setRecargaForm({
      alumno_id: "",
      monto: "",
      metodo_pago: "EFECTIVO",
      numero_comprobante: "",
                  observacion: "",
    });
  };

  const limpiarFiltrosRecargas = () => {
  setRecargasFiltros({
    fecha_inicio: "",
    fecha_fin: "",
    metodo_pago: "todas",
    alumno_id: "",
    texto: "",
  });
};

const exportarRecargasExcel = () => {
  if (!recargasFiltradas.length) {
    alert("No hay recargas para exportar");
    return;
  }

  try {
    const encabezados = [
      "Fecha y Hora",
      "Alumno",
      "Curso",
      "Paralelo",
      "Monto",
      "Forma de pago",
      "No. comprobante",
      "Banco",
      "Operador",
      "Estado",
      "Observación",
    ];

    const filas = recargasFiltradas.map((r) => [
      formatearFechaHora(r.fecha_base),
      r.alumno_nombre || "",
      r.curso || "",
      r.paralelo || "",
      Number(r.monto || 0).toFixed(2),
      r.tipo_visual || r.metodo_pago || "",
      r.numero_comprobante || "",
      r.banco || "",
      r.operador_nombre || "",
      r.estado_visual || "",
      r.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recargas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exportando recargas:", error);
    alert("No se pudo exportar el historial de recargas.");
  }
};

// ===== STOCK =====

const cargarReporteStock=async(filtrosOpcionales=null)=>{
  try{
    setCargandoReporteStock(true);

    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    if(!token||!institucionId){
      setReporteStock([]);
      return [];
    }

    const filtros=filtrosOpcionales||reporteStockFiltros;
    const params=new URLSearchParams({
      institucion_id:String(Number(institucionId)),
    });

    if(filtros.fecha_inicio)params.set("fecha_inicio",filtros.fecha_inicio);
    if(filtros.fecha_fin)params.set("fecha_fin",filtros.fecha_fin);
    if(filtros.producto_id)params.set("producto_id",String(filtros.producto_id));
    if(filtros.familia)params.set("familia",String(filtros.familia));
    if(filtros.tipo&&filtros.tipo!=="TODOS")params.set("tipo",String(filtros.tipo));
    if(filtros.ubicacion)params.set("ubicacion",String(filtros.ubicacion));

    const res=await fetch(
      `${API_URL}/api/inventario/reporte-movimientos?${params.toString()}&t=${Date.now()}`,
      {
        headers:{Authorization:`Bearer ${token}`},
        cache:"no-store",
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||data.error||"No se pudo cargar el reporte de stock");
    }

    const lista=Array.isArray(data)?data:[];
    setReporteStock(lista);
    return lista;
  }catch(error){
    console.error("Error cargando reporte de stock:",error);
    setReporteStock([]);
    alert(error.message||"No se pudo cargar el reporte de stock.");
    return [];
  }finally{
    setCargandoReporteStock(false);
  }
};

const abrirReporteStock=async()=>{
  setMostrarReporteStock(true);
  await cargarReporteStock();
};

const limpiarReporteStock=async()=>{
  const filtros={
    fecha_inicio:"",
    fecha_fin:"",
    producto_id:"",
    familia:"",
    tipo:"CARGA",
    ubicacion:"",
  };

  setReporteStockFiltros(filtros);
  await cargarReporteStock(filtros);
};

const exportarReporteStockExcel=()=>{
  if(!reporteStock.length){
    alert("No hay movimientos de stock para exportar.");
    return;
  }

  const datos=reporteStock.map((mov)=>({
    "Fecha y hora":formatearFechaHora(mov.fecha),
    "Producto":mov.producto_nombre||"",
    "Código":mov.producto_codigo||"",
    "Familia":mov.familia||"Sin familia",
    "Tipo":mov.tipo_visual||mov.tipo||"",
    "Cantidad":Number(mov.cantidad||0),
    "Stock anterior":mov.stock_anterior==null?"":Number(mov.stock_anterior),
    "Stock nuevo":mov.stock_nuevo==null?"":Number(mov.stock_nuevo),
    "Ubicación":mov.ubicacion||"PRINCIPAL",
    "Proveedor":mov.proveedor_nombre||"",
    "No. factura":mov.numero_factura||"",
    "Referencia":mov.referencia||"",
    "Usuario":mov.usuario_nombre||"",
    "Observación":mov.motivo||"",
  }));

  const worksheet=XLSX.utils.json_to_sheet(datos);

  worksheet["!cols"]=[
    {wch:22},
    {wch:30},
    {wch:14},
    {wch:22},
    {wch:24},
    {wch:12},
    {wch:15},
    {wch:15},
    {wch:20},
    {wch:28},
    {wch:18},
    {wch:24},
    {wch:28},
    {wch:40},
  ];

  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,"Movimientos Stock");
  XLSX.writeFile(workbook,"reporte_movimientos_stock.xlsx");
};

const exportarReporteStockPdf=()=>{
  if(!reporteStock.length){
    alert("No hay movimientos de stock para exportar.");
    return;
  }

  const escaparPdf=(valor)=>
    String(valor??"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^\x20-\x7E]/g,"")
      .replace(/[()\\]/g,(m)=>`\\${m}`);

  const cortar=(valor,maximo)=>
    String(valor??"")
      .replace(/\s+/g," ")
      .trim()
      .slice(0,maximo);

  const fechaReporte=new Date().toLocaleString("es-EC");
  const filtrosTexto=[
    reporteStockFiltros.fecha_inicio?`Desde: ${reporteStockFiltros.fecha_inicio}`:"",
    reporteStockFiltros.fecha_fin?`Hasta: ${reporteStockFiltros.fecha_fin}`:"",
    reporteStockFiltros.familia?`Familia: ${reporteStockFiltros.familia}`:"",
    reporteStockFiltros.tipo?`Tipo: ${reporteStockFiltros.tipo}`:"",
    reporteStockFiltros.ubicacion?`Ubicacion: ${reporteStockFiltros.ubicacion}`:"",
  ].filter(Boolean).join(" | ")||"Sin filtros";

  const lineas=[
    "POS NUBE - REPORTE MOVIMIENTOS DE STOCK",
    `Institucion: ${institucionActiva?.nombre||"POS NUBE"}`,
    `Generado: ${fechaReporte}`,
    `Filtros: ${filtrosTexto}`,
    `Total movimientos: ${reporteStock.length}`,
    "--------------------------------------------------------------------------",
    "Fecha/hora           Producto              Familia        Tipo        Cant",
    "--------------------------------------------------------------------------",
  ];

  reporteStock.forEach((mov)=>{
    lineas.push(
      [
        cortar(formatearFechaHora(mov.fecha),19).padEnd(19," "),
        cortar(mov.producto_nombre||"Producto",21).padEnd(21," "),
        cortar(mov.familia||"Sin familia",14).padEnd(14," "),
        cortar(mov.tipo_visual||mov.tipo||"-",11).padEnd(11," "),
        String(Number(mov.cantidad||0)).padStart(5," "),
      ].join(" ")
    );

    lineas.push(
      `  Stock: ${mov.stock_anterior==null?"-":mov.stock_anterior} -> ${mov.stock_nuevo==null?"-":mov.stock_nuevo} | `+
      `Ubicacion: ${cortar(mov.ubicacion||"PRINCIPAL",22)} | `+
      `Usuario: ${cortar(mov.usuario_nombre||"Sistema",22)}`
    );

    if(mov.proveedor_nombre||mov.numero_factura||mov.motivo){
      lineas.push(
        `  Prov: ${cortar(mov.proveedor_nombre||"-",22)} | `+
        `Factura: ${cortar(mov.numero_factura||"-",16)} | `+
        `Obs: ${cortar(mov.motivo||"-",35)}`
      );
    }

    lineas.push("--------------------------------------------------------------------------");
  });

  const pageWidth=612;
  const pageHeight=792;
  const marginLeft=36;
  const startY=748;
  const lineHeight=12;
  const linesPerPage=58;
  const paginas=[];

  for(let i=0;i<lineas.length;i+=linesPerPage){
    paginas.push(lineas.slice(i,i+linesPerPage));
  }

  const objetos=[];
  const agregarObjeto=(contenido)=>{
    objetos.push(contenido);
    return objetos.length;
  };

  const fontObj=agregarObjeto("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  const pageRefs=[];

  paginas.forEach((lineasPagina,indice)=>{
    let stream="BT\n/F1 8 Tf\n";
    let y=startY;

    lineasPagina.forEach((linea)=>{
      stream+=`1 0 0 1 ${marginLeft} ${y} Tm (${escaparPdf(linea)}) Tj\n`;
      // Tm fija la posición absoluta de cada línea para que todas se vean en la página.
      y-=lineHeight;
    });

    stream+="ET";
    const streamObj=agregarObjeto(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );

    const pageObj=agregarObjeto(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] `+
      `/Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${streamObj} 0 R >>`
    );

    pageRefs.push(pageObj);
  });

  const pagesObj=agregarObjeto(
    `<< /Type /Pages /Kids [${pageRefs.map((n)=>`${n} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`
  );

  pageRefs.forEach((pageObj)=>{
    objetos[pageObj-1]=objetos[pageObj-1].replace("/Parent 0 0 R",`/Parent ${pagesObj} 0 R`);
  });

  const catalogObj=agregarObjeto(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  let pdf="%PDF-1.4\n";
  const offsets=[0];

  objetos.forEach((obj,index)=>{
    offsets.push(pdf.length);
    pdf+=`${index+1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset=pdf.length;
  pdf+=`xref\n0 ${objetos.length+1}\n`;
  pdf+="0000000000 65535 f \n";
  offsets.slice(1).forEach((offset)=>{
    pdf+=`${String(offset).padStart(10,"0")} 00000 n \n`;
  });
  pdf+=
    `trailer\n<< /Size ${objetos.length+1} /Root ${catalogObj} 0 R >>\n`+
    `startxref\n${xrefOffset}\n%%EOF`;

  const blob=new Blob([pdf],{type:"application/pdf"});
  const url=window.URL.createObjectURL(blob);
  const enlace=document.createElement("a");
  enlace.href=url;
  enlace.download="reporte_movimientos_stock.pdf";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.URL.revokeObjectURL(url);
};

const exportarStockExcel = () => {
  try {
    const encabezados = ["Nombre", "Código", "Precio", "Categoría", "Stock actual"];
    const filas = productos.map((p) => [
      p.nombre || "",
      p.codigo || "",
      Number(p.precio || 0).toFixed(4),
      p.categoria || "",
      Number(p.stock || 0),
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "existencias_stock.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error al exportar stock:", error);
    alert("No se pudo exportar el stock.");
  }
};

const abrirImportadorStock = () => {
  if (inputImportarStockRef.current) {
    inputImportarStockRef.current.click();
  }
};

const importarStockArchivo = (event) => {
  const archivo = event.target.files?.[0];
  if (!archivo) return;

  const extension = archivo.name.split(".").pop()?.toLowerCase();

  const normalizarTexto = (valor) =>
    String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const aliasesProducto = {
    nombre: [
      "nombre",
      "producto",
      "nombre_producto",
      "descripcion_producto",
      "articulo",
      "item",
      "nombre_articulo",
    ],
    codigo: [
      "codigo",
      "codigo_producto",
      "codigo_barras",
      "codigo_de_barras",
      "cod_barras",
      "barcode",
      "sku",
      "referencia",
    ],
    precio: [
      "precio",
      "precio_venta",
      "precio_venta_final",
      "precio_final",
      "precio_publico",
      "pvp",
      "valor_venta",
      "precio_unitario",
      "venta",
    ],
    categoria: [
      "categoria",
      "categoria_producto",
      "familia",
      "grupo",
      "linea",
      "tipo",
      "clase",
    ],
    stock: [
      "stock",
      "stock_actual",
      "stock_real",
      "nuevo_stock",
      "existencia",
      "existencias",
      "cantidad_stock",
      "inventario",
      "saldo_stock",
    ],
    descripcion: [
      "descripcion",
      "detalle",
      "observacion",
      "descripcion_larga",
      "detalle_producto",
    ],
    stock_minimo: [
      "stock_minimo",
      "minimo",
      "stock_min",
      "existencia_minima",
    ],
  };

  const buscarIndice = (encabezados, aliases) => {
    const normalizados = aliases.map(normalizarTexto);
    return encabezados.findIndex((h) => normalizados.includes(h));
  };

  const numeroFlexible = (valor, fallback = 0) => {
    if (valor === null || valor === undefined || String(valor).trim() === "") {
      return fallback;
    }

    const original = String(valor).trim();
    const mayuscula = original.toUpperCase();

    if (["SI", "SÍ", "YES", "TRUE", "ACTIVO", "ACTIVA"].includes(mayuscula)) {
      return fallback;
    }

    if (["NO", "FALSE", "INACTIVO", "INACTIVA"].includes(mayuscula)) {
      return fallback;
    }

    let limpio = original
      .replace(/\s/g, "")
      .replace(/\$/g, "")
      .replace(/[^\d,.\-]/g, "");

    if (!limpio) return fallback;

    const ultimaComa = limpio.lastIndexOf(",");
    const ultimoPunto = limpio.lastIndexOf(".");

    if (ultimaComa > ultimoPunto) {
      limpio = limpio.replace(/\./g, "").replace(",", ".");
    } else if (ultimoPunto > ultimaComa && ultimaComa >= 0) {
      limpio = limpio.replace(/,/g, "");
    } else {
      limpio = limpio.replace(",", ".");
    }

    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : fallback;
  };

  const procesarFilasImportadas = async (filasCrudas) => {
    if (!Array.isArray(filasCrudas) || filasCrudas.length < 2) {
      alert("El archivo no tiene datos para importar.");
      return;
    }

    // Busca automáticamente la fila de encabezados dentro de las primeras 20 filas.
    // Así una matriz puede tener títulos o filas informativas antes de los datos.
    let indiceEncabezado = 0;
    let encabezados = [];
    let mejorPuntaje = -1;

    const maxFilasBusqueda = Math.min(filasCrudas.length, 20);

    for (let i = 0; i < maxFilasBusqueda; i += 1) {
      const candidatos = (filasCrudas[i] || []).map(normalizarTexto);
      const puntaje = Object.values(aliasesProducto).reduce(
        (total, aliases) =>
          total +
          (buscarIndice(candidatos, aliases) >= 0 ? 1 : 0),
        0
      );

      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
        indiceEncabezado = i;
        encabezados = candidatos;
      }
    }

    const idxNombre = buscarIndice(encabezados, aliasesProducto.nombre);
    const idxCodigo = buscarIndice(encabezados, aliasesProducto.codigo);
    const idxPrecio = buscarIndice(encabezados, aliasesProducto.precio);
    const idxCategoria = buscarIndice(encabezados, aliasesProducto.categoria);
    const idxStock = buscarIndice(encabezados, aliasesProducto.stock);
    const idxDescripcion = buscarIndice(encabezados, aliasesProducto.descripcion);
    const idxStockMinimo = buscarIndice(encabezados, aliasesProducto.stock_minimo);

    // Para permitir matrices con muchas columnas diferentes,
    // solo NOMBRE/PRODUCTO es indispensable.
    if (idxNombre === -1) {
      alert(
        "No se encontró una columna de producto. Puede llamarse Nombre, Producto, Nombre producto, Artículo o Item. Las demás columnas adicionales se omiten automáticamente."
      );
      return;
    }

    const filasValidas = filasCrudas
      .slice(indiceEncabezado + 1)
      .map((cols) => {
        const nombre = String(cols?.[idxNombre] ?? "").trim();
        if (!nombre) return null;

        const codigo =
          idxCodigo >= 0 ? String(cols?.[idxCodigo] ?? "").trim() : "";

        const precio =
          idxPrecio >= 0 ? numeroFlexible(cols?.[idxPrecio], 0) : 0;

        const categoria =
          idxCategoria >= 0
            ? String(cols?.[idxCategoria] ?? "").trim() || "SIN CATEGORIA"
            : "SIN CATEGORIA";

        // Si Stock trae SI/NO o no existe, se importa en 0.
        const stock =
          idxStock >= 0 ? numeroFlexible(cols?.[idxStock], 0) : 0;

        const descripcion =
          idxDescripcion >= 0
            ? String(cols?.[idxDescripcion] ?? "").trim()
            : "";

        const stock_minimo =
          idxStockMinimo >= 0
            ? numeroFlexible(cols?.[idxStockMinimo], 0)
            : 0;

        return {
          nombre,
          codigo,
          precio,
          categoria,
          stock,
          descripcion,
          stock_minimo,
        };
      })
      .filter(Boolean);

    if (!filasValidas.length) {
      alert("No hay filas válidas para importar.");
      return;
    }

    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      alert("Tu sesión no es válida. Vuelve a iniciar sesión.");
      return;
    }

    // Solo los roles operativos trabajan ligados a una jornada.
    // ADMIN / SUPER_ADMIN pueden importar y administrar productos sin abrir caja.
    const rolImportacion = normalizarRol(usuario?.rol);
    const requiereJornadaImportacion =
      ["ENCARGADO_LOCAL", "CAJERO"].includes(rolImportacion);

    if (requiereJornadaImportacion && !jornadaActiva?.id) {
      alert(
        "Debes tener una jornada abierta antes de importar productos nuevos."
      );
      return;
    }

    const normalizar = (valor) =>
      String(valor || "")
        .trim()
        .toLowerCase();

    const productosActuales = Array.isArray(productos) ? [...productos] : [];

    let actualizados = 0;
    let nuevos = 0;
    let errores = 0;
    const detalleErrores = [];

    for (const fila of filasValidas) {
      const existente = productosActuales.find((producto) => {
        const mismoCodigo =
          fila.codigo &&
          normalizar(producto.codigo) === normalizar(fila.codigo);

        const mismoNombre =
          normalizar(producto.nombre) === normalizar(fila.nombre);

        return mismoCodigo || mismoNombre;
      });

      try {
        const payload = {
          institucion_id: Number(institucionId),

          // ENCARGADO_LOCAL / CAJERO envían su jornada.
          // ADMIN / SUPER_ADMIN administran sin jornada y eligen ubicación.
          ...(existente
            ? {}
            : {
                ...(requiereJornadaImportacion
                  ? { jornada_id: Number(jornadaActiva?.id || 0) }
                  : {}),
                ubicacion_inicial:
                  jornadaActiva?.punto_nombre ||
                  (
                    ["ADMIN","SUPER_ADMIN"].includes(rolImportacion)
                      ? (
                          (puntosOperacion || []).find(
                            (p) =>
                              p?.activo !== false &&
                              normalizarUbicacionFrontend(
                                p?.nombre,
                                Number(institucionId)
                              ) ===
                                normalizarUbicacionFrontend(
                                  puntoInventarioSeleccionado,
                                  Number(institucionId)
                                )
                          )?.nombre ||
                          (puntosOperacion || []).find((p) => p?.activo !== false)?.nombre ||
                          puntoInventarioSeleccionado ||
                          "PRINCIPAL"
                        )
                      : (puntoInventarioSeleccionado || "PRINCIPAL")
                  ),
                concepto_inicial: "COMPRA",
                observacion_inicial: "Producto creado mediante importación masiva",
              }),

          nombre: fila.nombre,
          codigo: fila.codigo || existente?.codigo || "",
          descripcion:
            fila.descripcion || existente?.descripcion || "",
          precio: Number(fila.precio || 0),
          stock: Number(fila.stock || 0),
          stock_minimo:
            Number(fila.stock_minimo || existente?.stock_minimo || 0),
          categoria:
            fila.categoria || existente?.categoria || "SIN CATEGORIA",
          activo: existente ? existente.activo !== false : true,
        };

        const res = await fetch(
          existente
            ? `${API_URL}/api/productos/${existente.id}`
            : `${API_URL}/api/productos`,
          {
            method: existente ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        let data = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (!res.ok) {
          throw new Error(
            data?.error ||
              data?.message ||
              `Error ${existente ? "actualizando" : "creando"} ${fila.nombre}`
          );
        }

        if (existente) {
          const idx = productosActuales.findIndex(
            (p) => Number(p.id) === Number(existente.id)
          );
          if (idx >= 0) productosActuales[idx] = data || { ...existente, ...payload };
          actualizados += 1;
        } else {
          productosActuales.push(data || payload);
          nuevos += 1;
        }
      } catch (error) {
        console.error("Error importando producto:", fila.nombre, error);
        errores += 1;
        detalleErrores.push(`${fila.nombre}: ${error.message}`);
      }
    }

    setProductos(productosActuales);
    setStockEditado((prev) => {
      const copia = { ...prev };
      productosActuales.forEach((p) => {
        if (p?.id != null) copia[p.id] = String(p.stock ?? 0);
      });
      return copia;
    });

    alert(
      `Importación completada.\n\nProductos actualizados: ${actualizados}\nProductos nuevos: ${nuevos}\nErrores: ${errores}` +
        (detalleErrores.length
          ? `\n\nPrimeros errores:\n${detalleErrores.slice(0, 8).join("\n")}`
          : "")
    );
  };

  const parsearCSVTexto = (texto) => {
    const lineas = texto
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean);

    const separarLineaCSV = (linea) => {
      const resultado = [];
      let actual = "";
      let dentroDeComillas = false;

      // Detecta coma, punto y coma o tabulador.
      const cantidadComas = (linea.match(/,/g) || []).length;
      const cantidadPuntoComa = (linea.match(/;/g) || []).length;
      const cantidadTabs = (linea.match(/\t/g) || []).length;
      const separador =
        cantidadTabs > cantidadComas && cantidadTabs > cantidadPuntoComa
          ? "\t"
          : cantidadPuntoComa > cantidadComas
          ? ";"
          : ",";

      for (let i = 0; i < linea.length; i += 1) {
        const char = linea[i];
        const siguiente = linea[i + 1];

        if (char === '"') {
          if (dentroDeComillas && siguiente === '"') {
            actual += '"';
            i += 1;
          } else {
            dentroDeComillas = !dentroDeComillas;
          }
        } else if (char === separador && !dentroDeComillas) {
          resultado.push(actual.trim());
          actual = "";
        } else {
          actual += char;
        }
      }

      resultado.push(actual.trim());

      return resultado.map((valor) =>
        String(valor || "").replace(/^"|"$/g, "").trim()
      );
    };

    return lineas.map(separarLineaCSV);
  };

  try {
    if (extension === "csv" || extension === "txt") {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const texto = String(e.target?.result || "");
          const filasCSV = parsearCSVTexto(texto);
          await procesarFilasImportadas(filasCSV);
        } catch (error) {
          console.error("Error importando CSV/TXT:", error);
          alert("No se pudo importar el archivo.");
        } finally {
          event.target.value = "";
        }
      };

      reader.onerror = () => {
        alert("No se pudo leer el archivo.");
        event.target.value = "";
      };

      reader.readAsText(archivo);
      return;
    }

    if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const primeraHoja = workbook.SheetNames[0];

          if (!primeraHoja) {
            alert("El archivo Excel no contiene hojas.");
            return;
          }

          const worksheet = workbook.Sheets[primeraHoja];
          const filasExcel = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: false,
          });

          await procesarFilasImportadas(filasExcel);
        } catch (error) {
          console.error("Error importando Excel:", error);
          alert("No se pudo importar el archivo Excel.");
        } finally {
          event.target.value = "";
        }
      };

      reader.onerror = () => {
        alert("No se pudo leer el archivo Excel.");
        event.target.value = "";
      };

      reader.readAsArrayBuffer(archivo);
      return;
    }

    alert("Formato no soportado. Usa CSV, TXT, XLSX o XLS.");
  } catch (error) {
    console.error("Error importando stock:", error);
    alert("No se pudo importar el archivo.");
  }

  event.target.value = "";
};

const registrarMovimientoKardex = async ({
  productoId,
  tipo,
  cantidad,
  motivo,
  stockAnterior,
  stockNuevo,
  ubicacion = "PRINCIPAL",
  referencia = null,
  monto = 0,
}) => {
  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();
    if (!token || !institucionId || !productoId) return;

    const res = await fetch(`${API_URL}/api/kardex/movimientos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id: Number(institucionId),
        producto_id: Number(productoId),
        tipo,
        cantidad: Math.abs(Number(cantidad || 0)),
        motivo,
        ubicacion,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        referencia,
        monto: Number(monto || 0),
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.warn("No se pudo registrar movimiento Kardex:", detalle);
    }
  } catch (error) {
    console.warn("Error registrando movimiento Kardex:", error);
  }
};

const cargarExistenciasInventario = async ({
  reintento = true,
  ubicacionForzada = null,
} = {}) => {
  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      setExistenciasInventario([]);
      setPuntosInventario(["PRINCIPAL"]);
      return false;
    }

    const controlador = new AbortController();
    const timeout = window.setTimeout(() => controlador.abort(), 15000);

    let res;

    try {
      res = await fetch(
        `${API_URL}/api/inventario/estado?institucion_id=${institucionId}&t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          signal: controlador.signal,
        }
      );
    } finally {
      window.clearTimeout(timeout);
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `No se pudo cargar inventario. Código ${res.status}`
      );
    }

    const listaProductos = Array.isArray(data.productos)
      ? data.productos
      : [];

    const listaExistencias = Array.isArray(data.existencias)
      ? data.existencias.map((item) => ({
          ...item,
          ubicacion: normalizarUbicacionFrontend(
            item?.ubicacion,
            institucionId
          ),
        }))
      : [];

    const puntosRecibidos = Array.isArray(data.puntos)
      ? data.puntos
          .map((p) => normalizarUbicacionFrontend(p, institucionId))
          .filter(Boolean)
      : [];

    if (institucionId === 1) {
      // MARISTA: el único punto operativo de inventario/venta es BAR.
      puntosRecibidos.splice(0, puntosRecibidos.length, "BAR");
    } else if (!puntosRecibidos.includes("PRINCIPAL")) {
      puntosRecibidos.unshift("PRINCIPAL");
    }

    const puntosUnicos = [...new Set(puntosRecibidos)];

    // La pantalla Stock ya no depende de que otra petición de productos
    // termine antes. Todo viene de la misma consulta a PostgreSQL/Render.
    setProductos(listaProductos);
    setExistenciasInventario(listaExistencias);
    setPuntosInventario(puntosUnicos);

    setPuntoInventarioSeleccionado((actual) => {
      const actualNormalizado = normalizarUbicacionFrontend(
        actual,
        institucionId
      );
      return puntosUnicos.includes(actualNormalizado)
        ? actualNormalizado
        : (institucionId === 1 ? "BAR" : "PRINCIPAL");
    });

    setLocalNuevaOrden((actual) => {
      const puntoJornada = normalizarUbicacionFrontend(
        ubicacionForzada || jornadaActiva?.punto_nombre || "",
        institucionId
      );
      const actualNormalizado = normalizarUbicacionFrontend(
        actual,
        institucionId
      );
      const recomendada = normalizarUbicacionFrontend(
        data?.ubicacion_recomendada || "",
        institucionId
      );

      // Los operadores siguen ligados SIEMPRE al punto de su jornada.
      if (jornadaActiva?.id && puntosUnicos.includes(puntoJornada)) {
        return puntoJornada;
      }

      // ADMIN/SUPER_ADMIN no tienen jornada. Si PRINCIPAL es únicamente
      // un punto lógico/placeholder sin stock y BAR/KIOSKO sí tiene stock,
      // usamos automáticamente la ubicación real recomendada por el backend.
      const stockTotalUbicacion = (ubicacion) =>
        listaExistencias
          .filter(
            (fila) =>
              normalizarUbicacionFrontend(fila?.ubicacion, institucionId) ===
              normalizarUbicacionFrontend(ubicacion, institucionId)
          )
          .reduce((total, fila) => total + Math.max(0, Number(fila?.stock || 0)), 0);

      const actualTieneStock = stockTotalUbicacion(actualNormalizado) > 0;
      const recomendadaTieneStock = stockTotalUbicacion(recomendada) > 0;

      if (actualTieneStock && puntosUnicos.includes(actualNormalizado)) {
        return actualNormalizado;
      }

      if (recomendadaTieneStock && puntosUnicos.includes(recomendada)) {
        return recomendada;
      }

      if (puntosUnicos.includes(actualNormalizado)) {
        return actualNormalizado;
      }

      return puntosUnicos[0] || "PRINCIPAL";
    });

    return true;
  } catch (error) {
    console.error("Error cargando inventario completo:", error);

    // Una iMin puede recuperar conexión unos instantes después de abrir la
    // aplicación. Hacemos un único reintento automático.
    if (reintento) {
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      return cargarExistenciasInventario({
        reintento: false,
        ubicacionForzada,
      });
    }

    return false;
  }
};

const existenciasDeProducto = (productoId) =>
  existenciasInventario.filter(
    (item) => Number(item.producto_id) === Number(productoId)
  );

const stockProductoEnPunto = (productoId, ubicacion) => {
  const institucionId = obtenerInstitucionActivaId();
  const punto = normalizarUbicacionFrontend(ubicacion, institucionId);

  const filasProducto = existenciasInventario.filter(
    (item) => Number(item.producto_id) === Number(productoId)
  );

  const filasPunto = filasProducto.filter(
    (item) =>
      normalizarUbicacionFrontend(item?.ubicacion, institucionId) === punto
  );

  // 1) Si la ubicación solicitada tiene stock real, siempre manda ese valor.
  const stockPunto = filasPunto.reduce(
    (total, fila) => total + Number(fila?.stock || 0),
    0
  );

  if (stockPunto > 0) {
    return stockPunto;
  }

  // 2) Compatibilidad legacy segura para PRINCIPAL.
  // Muchos productos antiguos quedaron con una fila de existencia en 0,
  // pero productos.stock todavía conserva el stock real. La condición clave
  // es que TODAS las existencias por punto estén en 0. Si hay stock positivo
  // en BAR/KIOSKO/u otro punto, no inventamos stock adicional en PRINCIPAL.
  if (punto === "PRINCIPAL") {
    const totalRealPorPuntos = filasProducto.reduce(
      (total, fila) => total + Number(fila?.stock || 0),
      0
    );

    if (totalRealPorPuntos <= 0) {
      const producto = productos.find(
        (p) => Number(p.id) === Number(productoId)
      );

      const stockLegacy = Number(producto?.stock || 0);
      if (stockLegacy > 0) return stockLegacy;
    }
  }

  return 0;
};

// Los paquetes de almuerzo son cupos generales de alimentación y no stock físico
// de un bar específico. Si el punto de venta no tiene cupos propios, pueden consumir
// el cupo registrado en PRINCIPAL sin mezclar el resto de productos entre locales.
const esPaqueteAlmuerzo = (producto) =>
  normalizarTexto(producto?.nombre || "").startsWith("PAQUETE ALMUERZO");

const ubicacionStockVentaProducto = (producto, ubicacionVenta) => {
  const ubicacion = normalizarUbicacionFrontend(
    ubicacionVenta,
    obtenerInstitucionActivaId()
  );
  const stockLocal = Number(stockProductoEnPunto(producto?.id, ubicacion) || 0);

  if (stockLocal > 0) return ubicacion;

  if (esPaqueteAlmuerzo(producto)) {
    const stockPrincipal = Number(stockProductoEnPunto(producto?.id, "PRINCIPAL") || 0);
    if (stockPrincipal > 0) return "PRINCIPAL";
  }

  return ubicacion;
};

const stockDisponibleVentaProducto = (producto, ubicacionVenta) =>
  Number(
    stockProductoEnPunto(
      producto?.id,
      ubicacionStockVentaProducto(producto, ubicacionVenta)
    ) || 0
  );

const resumenStockPorPuntos = (producto) => {
  const filas = existenciasDeProducto(producto.id);
  if (!filas.length) return `PRINCIPAL: ${Number(producto.stock || 0)}`;

  const detalle = filas
    .filter((fila) => Number(fila.stock || 0) !== 0 || fila.ubicacion === "PRINCIPAL")
    .map((fila) => `${fila.ubicacion}: ${Number(fila.stock || 0)}`)
    .join(" | ");

  return `${detalle || "PRINCIPAL: 0"} | TOTAL: ${Number(producto.stock || 0)}`;
};

const guardarStockProducto = async (producto) => {
  const nuevoValor = stockEditado[producto.id];

  if (nuevoValor === undefined || nuevoValor === null || nuevoValor === "") {
    alert("Ingresa un valor en Nuevo stock.");
    return;
  }

  const stockNumero = Number(nuevoValor);

  if (!Number.isInteger(stockNumero) || stockNumero < 0) {
    alert("El stock debe ser un número entero mayor o igual a 0.");
    return;
  }

  const observacion = window.prompt(
    `Observación del ajuste para ${producto.nombre} en ${puntoInventarioSeleccionado}:`,
    "Conteo físico / ajuste manual"
  );

  if (observacion === null) return;

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const res = await fetch(`${API_URL}/api/inventario/ajuste`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id:Number(institucionId),
        jornada_id:Number(jornadaActiva?.id),
        producto_id:Number(producto.id),
        ubicacion:puntoInventarioSeleccionado,
        stock_nuevo: stockNumero,
        observacion: String(observacion || "").trim() || "Ajuste manual",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "No se pudo ajustar el stock.");
    }

    setStockEditado((prev) => ({
      ...prev,
      [producto.id]: String(stockNumero),
    }));

    await Promise.all([cargarProductos(), cargarExistenciasInventario()]);
    alert(
      `${producto.nombre}: stock de ${puntoInventarioSeleccionado} actualizado a ${stockNumero}.`
    );
  } catch (error) {
    console.error("Error ajustando stock:", error);
    alert(error.message || "No se pudo actualizar el stock.");
  }
};


const encerarStockProductoAdmin = async (producto) => {
  if (!["ADMIN","SUPER_ADMIN"].includes(rolActual)) {
    alert("Solo ADMIN puede encerar existencias desde esta pantalla.");
    return;
  }

  const existenciasProducto = existenciasInventario.filter(
    (e) => Number(e.producto_id) === Number(producto?.id)
  );
  const totalActual = existenciasProducto.reduce(
    (s, e) => s + Number(e.stock || 0),
    0
  );
  const detalle = existenciasProducto.length
    ? existenciasProducto
        .filter((e) => Number(e.stock || 0) !== 0)
        .map((e) => `${e.ubicacion}: ${Number(e.stock || 0)}`)
        .join(" | ")
    : `TOTAL: ${totalActual}`;

  const confirmar = window.confirm(
    `¿ENCERAR el stock de ${producto.nombre}?\n\n` +
    `${detalle}\n\n` +
    `El stock total quedará en 0. El ajuste quedará registrado en movimientos de inventario.`
  );

  if (!confirmar) return;

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const res = await fetch(`${API_URL}/api/inventario/encerar-producto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id: Number(institucionId),
        producto_id: Number(producto.id),
        observacion: "Encerado manual de stock desde Existencias actuales",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message || data.error || "No se pudo encerar el stock."
      );
    }

    await Promise.all([cargarProductos(), cargarExistenciasInventario()]);
    alert(`${producto.nombre}: stock actualizado correctamente a 0.`);
  } catch (error) {
    console.error("Error encerando stock:", error);
    alert(error.message || "No se pudo encerar el stock.");
  }
};


const encerarStockSeleccionadosAdmin = async () => {
  if (!["ADMIN","SUPER_ADMIN"].includes(rolActual)) return;

  const ids=[...new Set(
    (productosStockSeleccionadosBorrar||[])
      .map(Number)
      .filter((id)=>Number.isInteger(id)&&id>0)
  )];

  if(!ids.length){
    alert("Selecciona al menos un producto.");
    return;
  }

  const seleccionados=productos.filter((p)=>ids.includes(Number(p.id)));
  const conStock=seleccionados.filter((producto)=>{
    const total=existenciasInventario
      .filter((e)=>Number(e.producto_id)===Number(producto.id))
      .reduce((s,e)=>s+Number(e.stock||0),0);
    return total!==0;
  });
  const idsConStock = conStock.length
    ? conStock.map((p)=>Number(p.id))
    : ids;
  const confirmar=window.confirm(
    `¿ENCERAR ${idsConStock.length} producto(s) seleccionado(s)?\n\n`+
    "El servidor verificará que todas sus existencias queden realmente en 0 "+
    "antes de confirmar la operación."
  );
  if(!confirmar)return;

  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(`${API_URL}/api/inventario/encerar-seleccionados`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`,
      },
      body:JSON.stringify({
        institucion_id:Number(institucionId),
        ids:idsConStock,
        observacion:"Encerado masivo manual desde Existencias actuales",
      }),
    });

    let data={};
    try{data=await res.json();}catch(_e){}

    if(!res.ok){
      throw new Error(
        data.message||data.error||"No se pudieron encerar los productos."
      );
    }

    if(data.verificado!==true){
      throw new Error(
        "El servidor no pudo verificar que todos los stocks quedaran en 0."
      );
    }

    setProductosStockSeleccionadosBorrar([]);

    // Recarga real desde PostgreSQL, sin caché.
    await cargarExistenciasInventario();
    await cargarProductos();

    alert(
      `${Number(data.productos_afectados||idsConStock.length)} producto(s) `+
      `encerado(s) y verificado(s) correctamente en stock 0.`
    );
  }catch(error){
    console.error("Error encerando seleccionados:",error);
    await cargarExistenciasInventario();
    alert(error.message||"No se pudieron encerar los productos.");
  }
};

const desactivarProducto = async (productoId) => {
  setProductos((prev) =>
    prev.map((p) =>
      Number(p.id) === Number(productoId)
        ? { ...p, activo: false }
        : p
    )
  );

  setProductoDetalle((prev) =>
    prev && Number(prev.id) === Number(productoId)
      ? { ...prev, activo: false }
      : prev
  );

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/productos/${productoId}/desactivar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const texto = await res.text();
      console.warn("No se pudo desactivar en backend:", texto);
    }
  } catch (error) {
    console.error("Error desactivando producto:", error);
  }

  return true;
};

const reactivarProducto = async (productoId) => {
  setProductos((prev) =>
    prev.map((p) =>
      Number(p.id) === Number(productoId)
        ? { ...p, activo: true }
        : p
    )
  );

  setProductoDetalle((prev) =>
    prev && Number(prev.id) === Number(productoId)
      ? { ...prev, activo: true }
      : prev
  );

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/productos/${productoId}/reactivar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const texto = await res.text();
      console.warn("No se pudo reactivar en backend:", texto);
    }
  } catch (error) {
    console.error("Error reactivando producto:", error);
  }

  return true;
};

const limpiarFiltrosVentas = () => {
  setVistaVentasInterna("consultar");
};


const crearPuntoOperacion=async(e)=>{
  e.preventDefault();const nombre=String(nuevoPuntoForm.nombre||"").trim();if(!nombre)return alert("Ingresa el nombre del punto.");
  try{const token=localStorage.getItem("token"),institucionId=obtenerInstitucionActivaId();
    const res=await fetch(`${API_URL}/api/puntos`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({institucion_id:Number(institucionId),...nuevoPuntoForm})});
    const data=await res.json();if(!res.ok)throw new Error(data.message||"Error creando punto");
    setNuevoPuntoForm({nombre:"",codigo:"",descripcion:""});await Promise.all([cargarPuntosOperacion(),cargarExistenciasInventario()]);alert(`Punto ${data.nombre} creado.`);
  }catch(e){alert(e.message||"No se pudo crear el punto")}
};

const comenzarEdicionPunto=(punto)=>{
  setEditarPuntoStock({
    id:punto.id,
    nombre:punto.nombre||"",
    codigo:punto.codigo||"",
    descripcion:punto.descripcion||"",
  });
};

const guardarEdicionPunto=async(e)=>{
  e.preventDefault();

  if(!editarPuntoStock?.id){
    return;
  }

  const nombre=String(editarPuntoStock.nombre||"").trim();

  if(!nombre){
    alert("El nombre del punto es obligatorio.");
    return;
  }

  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(
      `${API_URL}/api/puntos/${editarPuntoStock.id}`,
      {
        method:"PUT",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${token}`,
        },
        body:JSON.stringify({
          institucion_id:Number(institucionId),
          nombre,
          codigo:editarPuntoStock.codigo,
          descripcion:editarPuntoStock.descripcion,
        }),
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||"No se pudo editar el punto");
    }

    setEditarPuntoStock(null);

    await Promise.all([
      cargarPuntosOperacion(),
      cargarExistenciasInventario(),
    ]);

    alert("Punto actualizado correctamente.");
  }catch(error){
    alert(error.message||"No se pudo editar el punto.");
  }
};


const cargarInstitucionesTransferencia=async()=>{
  /*
   * POS NUBE ya tiene el catálogo de instituciones en INSTITUCIONES.
   * No consultamos /api/instituciones porque la base actual no usa
   * una tabla "instituciones".
   */
  const lista=Array.isArray(INSTITUCIONES)?INSTITUCIONES:[];
  setInstitucionesTransferencia(lista);
  return lista;
};

const cargarPuntosDestinoLocal=async(institucionDestinoId)=>{
  try{
    if(!institucionDestinoId){
      setPuntosDestinoLocal([]);
      return;
    }

    const token=localStorage.getItem("token");

    const res=await fetch(
      `${API_URL}/api/inventario/destinos-locales?institucion_destino_id=${Number(institucionDestinoId)}&t=${Date.now()}`,
      {
        headers:{
          Authorization:`Bearer ${token}`,
        },
        cache:"no-store",
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(
        data.message||"No se pudieron cargar los puntos destino"
      );
    }

    setPuntosDestinoLocal(
      Array.isArray(data)
        ? data.filter((p)=>p.activo!==false)
        : []
    );
  }catch(error){
    console.error(error);
    setPuntosDestinoLocal([]);
    alert(
      error.message||
      "No se pudieron cargar los puntos del local destino."
    );
  }
};

const abrirPanelMovimientoStock=async(producto)=>{
  setPanelMovimientoStock(producto);
  setMovimientoStock(null);
  setStockTransferencia(null);
  setBajaStock(null);
  setTransferenciaLocales(null);
};

const seleccionarConceptoStock=async(tipo)=>{
  if(!panelMovimientoStock)return;

  if(tipo==="COMPRA"||tipo==="PRODUCCION"){
    setMovimientoStock({
      ...panelMovimientoStock,
      concepto:tipo,
      cantidad:"1",
      observacion:"",
    });
    return;
  }

  if(tipo==="TRANSFERIR_UBICACIONES"){
    setStockTransferencia({
      ...panelMovimientoStock,
      ubicacion_origen:jornadaActiva?.punto_nombre||"PRINCIPAL",
      ubicacion_destino:"",
      cantidad:"1",
      observacion:"",
    });
    return;
  }

  if(tipo==="TRANSFERIR_LOCALES"){
    await cargarInstitucionesTransferencia();
    setPuntosDestinoLocal([]);
    setTransferenciaLocales({
      ...panelMovimientoStock,
      institucion_destino_id:"",
      punto_destino_id:"",
      cantidad:"1",
      observacion:"",
    });
    return;
  }

  if(tipo==="BAJA"){
    setBajaStock({
      ...panelMovimientoStock,
      ubicacion:jornadaActiva?.punto_nombre||"PRINCIPAL",
      cantidad:"1",
      motivo_baja:"DAÑO",
      observacion:"",
    });
  }
};

const confirmarTransferenciaLocales=async()=>{
  if(!transferenciaLocales)return;

  const institucionDestinoId=Number(
    transferenciaLocales.institucion_destino_id
  );
  const puntoDestinoId=Number(
    transferenciaLocales.punto_destino_id
  );
  const cantidad=Number(transferenciaLocales.cantidad||0);
  const observacion=String(
    transferenciaLocales.observacion||""
  ).trim();

  if(!institucionDestinoId||!puntoDestinoId){
    alert("Selecciona el local y el punto destino.");
    return;
  }

  if(!Number.isInteger(cantidad)||cantidad<=0){
    alert("Ingresa una cantidad válida mayor a 0.");
    return;
  }

  if(!observacion){
    alert("La observación es obligatoria.");
    return;
  }

  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(
      `${API_URL}/api/inventario/transferir-locales`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${token}`,
        },
        body:JSON.stringify({
          institucion_id:Number(institucionId),
          jornada_id:Number(jornadaActiva?.id),
          producto_id:Number(transferenciaLocales.id),
          institucion_destino_id:institucionDestinoId,
          punto_destino_id:puntoDestinoId,
          cantidad,
          observacion,
        }),
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(
        data.message||"No se pudo transferir entre locales"
      );
    }

    setTransferenciaLocales(null);
    setPanelMovimientoStock(null);
    await cargarExistenciasInventario();

    alert(
      `Transferencia realizada.\nReferencia: ${data.referencia||"-"}`
    );
  }catch(error){
    alert(
      error.message||
      "No se pudo realizar la transferencia entre locales."
    );
  }
};


const cargarProveedoresStock=async()=>{
  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    if(!token||!institucionId){
      setProveedoresStock([]);
      return [];
    }

    const res=await fetch(
      `${API_URL}/api/inventario/proveedores?institucion_id=${Number(institucionId)}&t=${Date.now()}`,
      {
        headers:{Authorization:`Bearer ${token}`},
        cache:"no-store",
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||"No se pudieron cargar los proveedores");
    }

    const lista=Array.isArray(data)?data:[];
    setProveedoresStock(lista);
    return lista;
  }catch(error){
    console.error("Error cargando proveedores de Stock:",error);
    setProveedoresStock([]);
    return [];
  }
};


const cargarFamiliasStock=async()=>{
  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    if(!token||!institucionId){
      setFamiliasCatalogoStock([]);
      return [];
    }

    const res=await fetch(
      `${API_URL}/api/inventario/familias?institucion_id=${Number(institucionId)}&t=${Date.now()}`,
      {
        headers:{Authorization:`Bearer ${token}`},
        cache:"no-store",
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||"No se pudieron cargar las familias");
    }

    const lista=Array.isArray(data)?data:[];
    setFamiliasCatalogoStock(lista);
    return lista;
  }catch(error){
    console.error("Error cargando familias de Stock:",error);
    setFamiliasCatalogoStock([]);
    return [];
  }
};

const normalizarEncabezadoStockExcel=(valor)=>
  String(valor??"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");

const obtenerCampoStockFlexible=(filaNormalizada,aliases,valorDefecto="")=>{
  for(const alias of aliases){
    const clave=normalizarEncabezadoStockExcel(alias);
    if(
      Object.prototype.hasOwnProperty.call(filaNormalizada,clave)&&
      String(filaNormalizada[clave]??"").trim()!==""
    ){
      return filaNormalizada[clave];
    }
  }
  return valorDefecto;
};

const leerExcelStockCatalogo=(archivo)=>
  new Promise((resolve,reject)=>{
    const reader=new FileReader();

    reader.onload=(evento)=>{
      try{
        const workbook=XLSX.read(evento.target.result,{type:"array"});
        const hoja=workbook.SheetNames[0];

        if(!hoja){
          throw new Error("El archivo Excel no contiene hojas.");
        }

        const filas=XLSX.utils.sheet_to_json(
          workbook.Sheets[hoja],
          {defval:"",raw:false}
        );

        resolve(Array.isArray(filas)?filas:[]);
      }catch(error){
        reject(error);
      }
    };

    reader.onerror=()=>reject(new Error("No se pudo leer el archivo Excel."));
    reader.readAsArrayBuffer(archivo);
  });

const descargarPlantillaProveedoresStock=()=>{
  const worksheet=XLSX.utils.aoa_to_sheet([
    ["NOMBRE","RUC_CEDULA"],
    ["Distribuidora ABC","1790012345001"],
  ]);
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,"Proveedores");
  XLSX.writeFile(workbook,"plantilla_proveedores.xlsx");
};

const descargarPlantillaFamiliasStock=()=>{
  const worksheet=XLSX.utils.aoa_to_sheet([
    ["NOMBRE","CODIGO","MATERIA_PRIMA","ESTADO"],
    ["Bebidas","BEB","NO","ACTIVO"],
    ["Carnes","CAR","SI","ACTIVO"],
  ]);
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,"Familias");
  XLSX.writeFile(workbook,"plantilla_familias.xlsx");
};

const importarProveedoresStockExcel=async(event)=>{
  const archivo=event.target.files?.[0];
  event.target.value="";

  if(!archivo)return;

  try{
    setImportandoProveedoresStock(true);

    const filas=await leerExcelStockCatalogo(archivo);
    const proveedores=filas
      .map((fila)=>{
        const normalizada={};
        Object.entries(fila||{}).forEach(([clave,valor])=>{
          normalizada[normalizarEncabezadoStockExcel(clave)]=valor;
        });

        return {
          nombre:String(
            obtenerCampoStockFlexible(
              normalizada,
              [
                "NOMBRE",
                "NOMBRE_PROVEEDOR",
                "PROVEEDOR",
                "RAZON_SOCIAL",
                "RAZÓN_SOCIAL",
                "NOMBRE_COMERCIAL",
                "EMPRESA",
                "COMPAÑIA",
                "COMPAÑÍA",
              ],
              ""
            )
          ).trim(),
          ruc_cedula:String(
            obtenerCampoStockFlexible(
              normalizada,
              [
                "RUC_CEDULA",
                "RUC/CEDULA",
                "RUC",
                "CEDULA",
                "CÉDULA",
                "IDENTIFICACION",
                "IDENTIFICACIÓN",
                "DOCUMENTO",
                "NUMERO_DOCUMENTO",
                "NIT",
                "TAX_ID",
              ],
              ""
            )
          ).trim(),
        };
      })
      .filter((p)=>p.nombre&&p.ruc_cedula);

    if(!proveedores.length){
      alert("No se encontraron proveedores válidos. Se aceptan columnas equivalentes como Nombre/Proveedor/Razón social y RUC/Cédula/Identificación. Las columnas adicionales se ignoran.");
      return;
    }

    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(`${API_URL}/api/inventario/proveedores/importar`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`,
      },
      body:JSON.stringify({
        institucion_id:Number(institucionId),
        proveedores,
      }),
    });

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||data.error||"No se pudieron importar los proveedores.");
    }

    await cargarProveedoresStock();

    alert(
      `Proveedores importados.\n`+
      `Procesados: ${Number(data.procesados||0)}\n`+
      `Nuevos: ${Number(data.nuevos||0)}\n`+
      `Actualizados: ${Number(data.actualizados||0)}`
    );
  }catch(error){
    console.error("Error importando proveedores:",error);
    alert(error.message||"No se pudo importar el Excel de proveedores.");
  }finally{
    setImportandoProveedoresStock(false);
  }
};

const importarFamiliasStockExcel=async(event)=>{
  const archivo=event.target.files?.[0];
  event.target.value="";

  if(!archivo)return;

  try{
    setImportandoFamiliasStock(true);

    const filas=await leerExcelStockCatalogo(archivo);
    const familias=filas
      .map((fila)=>{
        const normalizada={};
        Object.entries(fila||{}).forEach(([clave,valor])=>{
          normalizada[normalizarEncabezadoStockExcel(clave)]=valor;
        });

        return {
          nombre:String(
            obtenerCampoStockFlexible(
              normalizada,
              [
                "NOMBRE",
                "FAMILIA",
                "NOMBRE_FAMILIA",
                "CATEGORIA",
                "CATEGORÍA",
                "GRUPO",
                "LINEA",
                "LÍNEA",
              ],
              ""
            )
          ).trim(),
          codigo:String(
            obtenerCampoStockFlexible(
              normalizada,
              ["CODIGO","CÓDIGO","CODIGO_FAMILIA","COD","SKU"],
              ""
            )
          ).trim(),
          materia_prima:String(
            obtenerCampoStockFlexible(
              normalizada,
              [
                "MATERIA_PRIMA",
                "MATERIA PRIMA",
                "ES_MATERIA_PRIMA",
                "INSUMO",
              ],
              "NO"
            )
          )
            .trim()
            .toUpperCase(),
          estado:String(
            obtenerCampoStockFlexible(
              normalizada,
              ["ESTADO","ACTIVO","STATUS"],
              "ACTIVO"
            )
          )
            .trim()
            .toUpperCase(),
        };
      })
      .filter((f)=>f.nombre);

    if(!familias.length){
      alert(
        "No se encontraron familias válidas. Se aceptan columnas equivalentes como Nombre/Familia/Categoría. Código, Materia prima y Estado son opcionales; las columnas adicionales se ignoran."
      );
      return;
    }

    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(`${API_URL}/api/inventario/familias/importar`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`,
      },
      body:JSON.stringify({
        institucion_id:Number(institucionId),
        familias,
      }),
    });

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||data.error||"No se pudieron importar las familias.");
    }

    await cargarFamiliasStock();

    alert(
      `Familias importadas.\n`+
      `Procesadas: ${Number(data.procesadas||0)}\n`+
      `Nuevas: ${Number(data.nuevas||0)}\n`+
      `Actualizadas: ${Number(data.actualizadas||0)}`
    );
  }catch(error){
    console.error("Error importando familias:",error);
    alert(error.message||"No se pudo importar el Excel de familias.");
  }finally{
    setImportandoFamiliasStock(false);
  }
};


const limpiarOperacionStock=()=>{
  setGuardandoStockOperacion(false);
  setStockConfirmacion(null);
  setStockItemsOperacion({});
  setStockBusquedaOperacion("");
  setStockFamiliaOperacion("TODAS");
  setStockCompraForm({
    proveedor_id:"",
    proveedor_nuevo:"",
    numero_factura:"",
    observacion:"",
  });
  setStockOperacionForm({
    observacion:"",
    ubicacion_destino:"",
    institucion_destino_id:"",
    punto_destino_id:"",
    destinatario_cortesia:"",
  });
  setStockConfirmacion(null);
};

const cambiarSeccionStock=(valor)=>{
  setStockSeccion(valor);
  setStockTipoIngreso("");
  setStockTipoEgreso("");
  limpiarOperacionStock();
};

const cambiarTipoIngresoStock=async(valor)=>{
  setStockTipoIngreso(valor);
  setStockTipoEgreso("");
  limpiarOperacionStock();

  if(valor==="COMPRA"){
    await Promise.all([
      cargarProveedoresStock(),
      cargarFamiliasStock(),
    ]);
  }

  if(valor==="TRANSFERENCIA_LOCALES"){
    await cargarInstitucionesTransferencia();
  }
};

const cambiarTipoEgresoStock=(valor)=>{
  setStockTipoEgreso(valor);
  setStockTipoIngreso("");
  limpiarOperacionStock();
};

const toggleProductoOperacionStock=(producto)=>{
  setStockItemsOperacion((prev)=>{
    const copia={...prev};
    const id=String(producto.id);

    if(Object.prototype.hasOwnProperty.call(copia,id)){
      delete copia[id];
    }else{
      // Se deja vacío para que el usuario escriba la cantidad sin un 0 inicial.
      copia[id]="";
    }

    return copia;
  });
};

const seleccionarTodosProductosOperacionStock=()=>{
  setStockItemsOperacion((prev)=>{
    const copia={...prev};

    // Selecciona TODOS los productos visibles según búsqueda/familia actual.
    // Conserva cantidades que el usuario ya haya escrito.
    productosOperacionStock.forEach((producto)=>{
      const id=String(producto.id);
      if(!Object.prototype.hasOwnProperty.call(copia,id)){
        copia[id]="";
      }
    });

    return copia;
  });
};

const quitarSeleccionProductosOperacionStock=()=>{
  setStockItemsOperacion((prev)=>{
    const copia={...prev};

    // Quita únicamente los productos visibles del filtro actual.
    // Así se puede trabajar por familias sin perder selecciones de otras familias.
    productosOperacionStock.forEach((producto)=>{
      delete copia[String(producto.id)];
    });

    return copia;
  });
};

const totalSeleccionadosOperacionStock=()=>{
  return Object.keys(stockItemsOperacion).length;
};

const todosVisiblesSeleccionadosOperacionStock=()=>{
  return (
    productosOperacionStock.length>0 &&
    productosOperacionStock.every((producto)=>
      Object.prototype.hasOwnProperty.call(
        stockItemsOperacion,
        String(producto.id)
      )
    )
  );
};

const cambiarCantidadOperacionStock=(productoId,valor)=>{
  const texto=String(valor??"").trim();

  setStockItemsOperacion((prev)=>({
    ...prev,
    [String(productoId)]:
      texto===""
        ?""
        :String(Math.max(0,Math.trunc(Number(texto)||0))),
  }));
};

const itemsValidosOperacionStock=()=>{
  return Object.entries(stockItemsOperacion)
    .map(([producto_id,cantidad])=>({
      producto_id:Number(producto_id),
      cantidad:Number(cantidad),
    }))
    .filter(
      (item)=>
        item.producto_id &&
        Number.isInteger(item.cantidad) &&
        item.cantidad>0
    );
};

const abrirConfirmacionStock=(confirmacion)=>{
  if(!confirmacion)return;

  setGuardandoStockOperacion(false);
  setStockResultado(null);
  setStockConfirmacion(confirmacion);

  setTimeout(()=>{
    const panel=document.getElementById(
      "stock-confirmacion-panel"
    );

    if(panel&&typeof panel.scrollIntoView==="function"){
      panel.scrollIntoView({
        behavior:"auto",
        block:"start",
      });
    }
  },120);
};

const prepararConfirmacionOperacionStock=()=>{
  // ADMIN / SUPER_ADMIN administran Stock sin abrir/cerrar jornada.
  // ENCARGADO_LOCAL / CAJERO conservan el flujo obligatorio de jornada.
  const rolStockActual=normalizarRol(usuario?.rol);
  const requiereJornadaStock=["ENCARGADO_LOCAL","CAJERO"].includes(rolStockActual);
  if(requiereJornadaStock&&!jornadaActiva?.id){
    alert("Debes iniciar una jornada antes de operar Stock.");
    return;
  }

  const items=itemsValidosOperacionStock();

  if(!items.length){
    alert("Selecciona al menos un producto e ingresa una cantidad mayor a 0.");
    return;
  }

  if(stockSeccion==="INGRESOS"){
    if(!stockTipoIngreso){
      alert("Selecciona el tipo de ingreso.");
      return;
    }

    if(stockTipoIngreso==="COMPRA"){
      if(
        !stockCompraForm.proveedor_id &&
        !String(stockCompraForm.proveedor_nuevo||"").trim()
      ){
        alert("Selecciona o ingresa un proveedor.");
        return;
      }

      if(!String(stockCompraForm.numero_factura||"").trim()){
        alert("Ingresa el número de factura.");
        return;
      }
    }

    if(stockTipoIngreso==="TRANSFERENCIA_UBICACIONES"){
      if(!String(stockOperacionForm.ubicacion_destino||"").trim()){
        alert("Selecciona la ubicación destino.");
        return;
      }
    }

    if(stockTipoIngreso==="TRANSFERENCIA_LOCALES"){
      if(
        !Number(stockOperacionForm.institucion_destino_id) ||
        !Number(stockOperacionForm.punto_destino_id)
      ){
        alert("Selecciona el local y la ubicación destino.");
        return;
      }
    }

    if(
      ["PRODUCCION_COCINA","OTROS","TRANSFERENCIA_UBICACIONES","TRANSFERENCIA_LOCALES"]
        .includes(stockTipoIngreso) &&
      !String(stockOperacionForm.observacion||"").trim()
    ){
      alert("La observación es obligatoria.");
      return;
    }

    abrirConfirmacionStock({
      grupo:"INGRESOS",
      tipo:stockTipoIngreso,
      items,
    });
    return;
  }

  if(stockSeccion==="EGRESOS"){
    if(!stockTipoEgreso){
      alert("Selecciona BAJA o CORTESÍA.");
      return;
    }

    if(!String(stockOperacionForm.observacion||"").trim()){
      alert("La observación es obligatoria.");
      return;
    }

    if(
      stockTipoEgreso==="CORTESIA" &&
      !String(stockOperacionForm.destinatario_cortesia||"").trim()
    ){
      alert("Indica a quién se entrega la cortesía.");
      return;
    }

    abrirConfirmacionStock({
      grupo:"EGRESOS",
      tipo:stockTipoEgreso,
      items,
    });
  }
};

const fetchStockConTimeout=async(url,opciones={},timeoutMs=20000)=>{
  const controller=new AbortController();
  const timeoutId=setTimeout(()=>controller.abort(),timeoutMs);

  try{
    return await fetch(url,{
      ...opciones,
      signal:controller.signal,
    });
  }catch(error){
    if(error?.name==="AbortError"){
      throw new Error(
        "El servidor tardó demasiado en responder. Verifica la conexión y vuelve a intentar."
      );
    }

    throw error;
  }finally{
    clearTimeout(timeoutId);
  }
};

const confirmarOperacionStockNueva=async(confirmacionForzada=null)=>{
  const confirmacionActual=confirmacionForzada||stockConfirmacion;

  if(!confirmacionActual||guardandoStockOperacion)return;

  try{
    setGuardandoStockOperacion(true);

    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();
    const items=confirmacionActual.items||[];

    if(confirmacionActual.grupo==="INGRESOS"){
      if(
        ["COMPRA","PRODUCCION_COCINA","OTROS"].includes(
          confirmacionActual.tipo
        )
      ){
        const res=await fetchStockConTimeout(
          `${API_URL}/api/inventario/ingresos/masivo`,
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json",
              Authorization:`Bearer ${token}`,
            },
            body:JSON.stringify({
              institucion_id:Number(institucionId),
              jornada_id:Number(jornadaActiva?.id),
              ubicacion_operacion:String(puntoInventarioSeleccionado||jornadaActiva?.punto_nombre||"PRINCIPAL"),
              tipo_ingreso:confirmacionActual.tipo,
              proveedor_id:
                confirmacionActual.tipo==="COMPRA"
                  ? Number(stockCompraForm.proveedor_id||0)||null
                  : null,
              proveedor_nombre:
                confirmacionActual.tipo==="COMPRA"
                  ? String(stockCompraForm.proveedor_nuevo||"").trim()||null
                  : null,
              numero_factura:
                confirmacionActual.tipo==="COMPRA"
                  ? String(stockCompraForm.numero_factura||"").trim()
                  : null,
              observacion:
                confirmacionActual.tipo==="COMPRA"
                  ? String(stockCompraForm.observacion||"").trim()
                  : String(stockOperacionForm.observacion||"").trim(),
              items,
            }),
          }
        );

        const data=await res.json();

        if(!res.ok){
          throw new Error(
            data.message||
            data.error||
            "No se pudo registrar el ingreso"
          );
        }
      }else if(confirmacionActual.tipo==="TRANSFERENCIA_UBICACIONES"){
        for(const item of items){
          const res=await fetchStockConTimeout(
            `${API_URL}/api/inventario/transferir`,
            {
              method:"POST",
              headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`,
              },
              body:JSON.stringify({
                institucion_id:Number(institucionId),
                jornada_id:Number(jornadaActiva?.id),
                ubicacion_operacion:String(puntoInventarioSeleccionado||jornadaActiva?.punto_nombre||"PRINCIPAL"),
                producto_id:Number(item.producto_id),
                ubicacion_destino:String(
                  stockOperacionForm.ubicacion_destino||""
                ).trim(),
                cantidad:Number(item.cantidad),
                observacion:String(
                  stockOperacionForm.observacion||""
                ).trim(),
              }),
            }
          );

          const data=await res.json();

          if(!res.ok){
            throw new Error(
              data.message||
              `No se pudo transferir el producto ${item.producto_id}`
            );
          }
        }
      }else if(confirmacionActual.tipo==="TRANSFERENCIA_LOCALES"){
        for(const item of items){
          const res=await fetchStockConTimeout(
            `${API_URL}/api/inventario/transferir-locales`,
            {
              method:"POST",
              headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`,
              },
              body:JSON.stringify({
                institucion_id:Number(institucionId),
                jornada_id:Number(jornadaActiva?.id),
                ubicacion_operacion:String(puntoInventarioSeleccionado||jornadaActiva?.punto_nombre||"PRINCIPAL"),
                producto_id:Number(item.producto_id),
                institucion_destino_id:Number(
                  stockOperacionForm.institucion_destino_id
                ),
                punto_destino_id:Number(
                  stockOperacionForm.punto_destino_id
                ),
                cantidad:Number(item.cantidad),
                observacion:String(
                  stockOperacionForm.observacion||""
                ).trim(),
              }),
            }
          );

          const data=await res.json();

          if(!res.ok){
            throw new Error(
              data.message||
              `No se pudo transferir el producto ${item.producto_id}`
            );
          }
        }
      }
    }else{
      const res=await fetchStockConTimeout(
        `${API_URL}/api/inventario/egresos/masivo`,
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${token}`,
          },
          body:JSON.stringify({
            institucion_id:Number(institucionId),
            jornada_id:Number(jornadaActiva?.id),
            ubicacion_operacion:String(puntoInventarioSeleccionado||jornadaActiva?.punto_nombre||"PRINCIPAL"),
            tipo_egreso:confirmacionActual.tipo,
            destinatario_cortesia:
              confirmacionActual.tipo==="CORTESIA"
                ? String(
                    stockOperacionForm.destinatario_cortesia||""
                  ).trim()
                : null,
            observacion:String(
              stockOperacionForm.observacion||""
            ).trim(),
            items,
          }),
        }
      );

      const data=await res.json();

      if(!res.ok){
        throw new Error(
          data.message||
          data.error||
          "No se pudo registrar el egreso"
        );
      }
    }

    const resultadoItems=(items||[]).map((item)=>{
      const producto=productos.find(
        (p)=>Number(p.id)===Number(item.producto_id)
      );

      const esTransferencia=[
        "TRANSFERENCIA_UBICACIONES",
        "TRANSFERENCIA_LOCALES",
      ].includes(confirmacionActual.tipo);

      const signo=
        confirmacionActual.grupo==="EGRESOS"||esTransferencia
          ? "-"
          : "+";

      const stockAnterior=Number(
        stockProductoEnPunto(
          item.producto_id,
          jornadaActiva?.punto_nombre||"PRINCIPAL"
        )||0
      );

      const cantidadMovimiento=Number(item.cantidad||0);

      const stockFinal=Math.max(
        0,
        signo==="-"
          ? stockAnterior-cantidadMovimiento
          : stockAnterior+cantidadMovimiento
      );

      return{
        producto_id:Number(item.producto_id),
        nombre:
          producto?.nombre||
          `Producto #${item.producto_id}`,
        codigo:producto?.codigo||"-",
        familia:producto?.categoria||"-",
        cantidad:cantidadMovimiento,
        cantidad_texto:
          `${signo}${cantidadMovimiento}`,
        stock_anterior:stockAnterior,
        stock_final:stockFinal,
      };
    });

    setStockConfirmacion(null);

    setStockResultado({
      grupo:confirmacionActual.grupo,
      tipo:confirmacionActual.tipo,
      ubicacion:jornadaActiva?.punto_nombre||"-",
      operador:
        jornadaActiva?.usuario_nombre||
        jornadaActiva?.usuario_correo||
        usuario?.nombre||
        usuario?.correo||
        "-",
      jornada_id:jornadaActiva?.id||null,
      items:resultadoItems,
      total_productos:resultadoItems.length,
      fecha:new Date().toISOString(),
    });

    // Limpiamos los campos de captura, pero NO el resultado que acabamos de mostrar.
    setStockItemsOperacion({});
    setStockBusquedaOperacion("");
    setStockFamiliaOperacion("TODAS");
    setStockCompraForm({
      proveedor_id:"",
      proveedor_nuevo:"",
      numero_factura:"",
      observacion:"",
    });
    setStockOperacionForm({
      observacion:"",
      ubicacion_destino:"",
      institucion_destino_id:"",
      punto_destino_id:"",
      destinatario_cortesia:"",
    });

    setGuardandoStockOperacion(false);

    setTimeout(()=>{
      const panel=document.getElementById(
        "stock-resultado-panel"
      );

      if(panel&&typeof panel.scrollIntoView==="function"){
        panel.scrollIntoView({
          behavior:"smooth",
          block:"center",
        });
      }
    },120);

    Promise.all([
      cargarProductos(),
      cargarExistenciasInventario(),
    ]).catch((error)=>{
      console.error(
        "Error refrescando Stock después de guardar:",
        error
      );
    });
  }catch(error){
    console.error("Error confirmando operación Stock:",error);
    alert(
      error.message||
      "No se pudo confirmar el movimiento de Stock."
    );
  }finally{
    setGuardandoStockOperacion(false);
  }
};

const crearProductoDesdeStock=async(e)=>{
  e.preventDefault();
  const rolCrearProductoStock=normalizarRol(usuario?.rol);
  const requiereJornadaCrearProducto=["ENCARGADO_LOCAL","CAJERO"].includes(rolCrearProductoStock);
  if(requiereJornadaCrearProducto&&!jornadaActiva?.id)return alert("Debes abrir una jornada.");
  const cantidad=Number(nuevoProductoStockForm.cantidad_inicial||0);
  if(!nuevoProductoStockForm.nombre.trim())return alert("Nombre obligatorio.");
  if(!Number.isInteger(cantidad)||cantidad<0)return alert("Cantidad inicial inválida.");
  try{const token=localStorage.getItem("token"),institucionId=obtenerInstitucionActivaId();
    const res=await fetch(`${API_URL}/api/productos`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({
      institucion_id:Number(institucionId),
      ...(requiereJornadaCrearProducto?{jornada_id:Number(jornadaActiva?.id||0)}:{}),
      nombre:nuevoProductoStockForm.nombre.trim(),codigo:nuevoProductoStockForm.codigo.trim()||null,
      precio:Number(nuevoProductoStockForm.precio||0),stock:cantidad,stock_minimo:Number(nuevoProductoStockForm.stock_minimo||0),
      categoria:nuevoProductoStockForm.categoria.trim()||null,concepto_inicial:nuevoProductoStockForm.concepto_inicial,
      observacion_inicial:nuevoProductoStockForm.observacion_inicial.trim()||"Ingreso inicial desde Stock",
      ubicacion_inicial:
        nuevoProductoStockForm.ubicacion_inicial ||
        jornadaActiva?.punto_nombre ||
        "PRINCIPAL"
    })});
    const data=await res.json();if(!res.ok)throw new Error(data.message||"Error creando producto");
    setMostrarNuevoProductoStock(false);setNuevoProductoStockForm({
      nombre:"",
      codigo:"",
      precio:"",
      categoria:"",
      stock_minimo:"",
      cantidad_inicial:"",
      concepto_inicial:"COMPRA",
      observacion_inicial:"",
      ubicacion_inicial:"",
    });
    await cargarExistenciasInventario();alert(
      `Producto creado en ${
        nuevoProductoStockForm.ubicacion_inicial ||
        jornadaActiva?.punto_nombre ||
        "PRINCIPAL"
      }.`
    );
  }catch(e){alert(e.message||"No se pudo crear el producto")}
};
const abrirMovimientoStock=(producto)=>setMovimientoStock({...producto,concepto:"COMPRA",cantidad:"1",observacion:""});
const confirmarMovimientoStock=async()=>{
  if(!movimientoStock)return;const cantidad=Number(movimientoStock.cantidad||0);
  if(!Number.isInteger(cantidad)||cantidad<=0)return alert("Cantidad inválida.");
  if(!String(movimientoStock.observacion||"").trim())return alert("Observación obligatoria.");
  try{const token=localStorage.getItem("token"),institucionId=obtenerInstitucionActivaId();
    const res=await fetch(`${API_URL}/api/inventario/movimiento`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({
      institucion_id:Number(institucionId),jornada_id:Number(jornadaActiva?.id),producto_id:Number(movimientoStock.id),
      concepto:movimientoStock.concepto,cantidad,observacion:movimientoStock.observacion.trim()
    })});
    const data=await res.json();if(!res.ok)throw new Error(data.message||"Error registrando movimiento");
    setMovimientoStock(null);await cargarExistenciasInventario();alert(data.message||"Movimiento registrado.");
  }catch(e){alert(e.message||"No se pudo registrar el movimiento")}
};

const verMovimientosStockNuevo = (producto) => {
  setStockTransferencia(null);
  setBajaStock(null);
  setStockDetalle(producto);
};

const eliminarStockProductoNuevo = (producto) => {
  setStockDetalle(null);
  setStockTransferencia(null);
  setBajaStock({
    ...producto,
    ubicacion: puntoInventarioSeleccionado,
    cantidad:"1",
    motivo_baja:"DAÑO",
    observacion:"",
  });
};

const confirmarBajaStock = async () => {
  if (!bajaStock) return;

  const cantidad = Number(bajaStock.cantidad || 0);
  const observacion = String(bajaStock.observacion || "").trim();

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    alert("Ingresa una cantidad válida mayor a 0.");
    return;
  }

  if (!observacion) {
    alert("La observación es obligatoria para dar de baja un producto.");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const res = await fetch(`${API_URL}/api/inventario/baja`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id:Number(institucionId),
        jornada_id:Number(jornadaActiva?.id),
        producto_id:Number(bajaStock.id),
        ubicacion:bajaStock.ubicacion,
        cantidad,
        motivo_baja:bajaStock.motivo_baja||"OTRO",
        observacion,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "No se pudo registrar la baja.");
    }

    setBajaStock(null);
    await Promise.all([cargarProductos(), cargarExistenciasInventario()]);
    alert("Baja registrada correctamente.");
  } catch (error) {
    console.error("Error dando de baja stock:", error);
    alert(error.message || "No se pudo registrar la baja.");
  }
};

const transferirStockProductoNuevo = (producto) => {
  setStockDetalle(null);
  setBajaStock(null);
  setStockTransferencia({
    ...producto,
    ubicacion_origen: puntoInventarioSeleccionado,
    ubicacion_destino: "",
    cantidad: "1",
    observacion: "",
  });
};

const confirmarTransferenciaStock = async () => {
  if (!stockTransferencia) return;

  const cantidad = Number(stockTransferencia.cantidad || 0);
  const origen = String(stockTransferencia.ubicacion_origen || "PRINCIPAL").trim();
  const destino = String(stockTransferencia.ubicacion_destino || "").trim();
  const observacion = String(stockTransferencia.observacion || "").trim();

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    alert("Ingresa una cantidad válida mayor a 0.");
    return;
  }

  if (!destino) {
    alert("Ingresa el punto destino.");
    return;
  }

  if (origen.toUpperCase() === destino.toUpperCase()) {
    alert("El punto origen y destino deben ser diferentes.");
    return;
  }

  if (!observacion) {
    alert("La observación es obligatoria para realizar la transferencia.");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const res = await fetch(`${API_URL}/api/inventario/transferir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id:Number(institucionId),
        jornada_id:Number(jornadaActiva?.id),
        producto_id:Number(stockTransferencia.id),
        ubicacion_origen:origen,
        ubicacion_destino: destino,
        cantidad,
        observacion,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "No se pudo realizar la transferencia.");
    }

    setStockTransferencia(null);
    await Promise.all([cargarProductos(), cargarExistenciasInventario()]);
    alert(
      `Transferencia realizada: ${cantidad} unidad(es) de ${origen} a ${destino}.`
    );
  } catch (error) {
    console.error("Error transfiriendo stock:", error);
    alert(error.message || "No se pudo realizar la transferencia.");
  }
};

useEffect(()=>{
  // Una jornada nunca se reanuda por confianza local.
  // Al abrir/actualizar, se obliga a validar nuevamente al operador.
  // Jornada activa se conserva y se valida contra backend.
},[]);

useEffect(()=>{
  const rol=normalizarRol(usuario?.rol);

  if(
    usuario &&
    institucionActivaId &&
    ["ENCARGADO_LOCAL","CAJERO"].includes(rol)
  ){
    cargarContextoJornada();
    return;
  }

  // Cualquier acceso administrativo debe permanecer libre del modal de jornada.
  if(
    usuario &&
    ["ADMIN","SUPER_ADMIN","AUDITOR"].includes(rol)
  ){
    setMostrarSelectorJornada(false);
    localStorage.removeItem("jornadaActiva");
    setJornadaActiva(null);
    setEstadoOperativoCaja({
      permitido:true,
      estado_operativo:"NO_APLICA",
      requiere_abrir_jornada:false,
      requiere_cerrar_pendiente:false,
      jornada:null,
      message:"",
    });
  }
},[usuario?.id,usuario?.rol,institucionActivaId]);

useEffect(() => {
  if (!usuario || !institucionActivaId || esRolPortal) return;

  // Al iniciar sesión cargamos una vez el inventario compartido.
  // Al entrar a Stock se vuelve a consultar directamente a PostgreSQL.
  if (vista === "inventario" || vista === "ventas") {
    cargarExistenciasInventario();
  }
}, [usuario, institucionActivaId, vista]);

useEffect(() => {
  if (!usuario || esRolPortal) return;

  const refrescarAlVolver = () => {
    if (document.visibilityState !== "visible") return;

    if (vista === "inventario" || vista === "ventas") {
      cargarExistenciasInventario();
    }
  };

  const refrescarAlFoco = () => {
    if (vista === "inventario" || vista === "ventas") {
      cargarExistenciasInventario();
    }
  };

  document.addEventListener("visibilitychange", refrescarAlVolver);
  window.addEventListener("focus", refrescarAlFoco);

  return () => {
    document.removeEventListener("visibilitychange", refrescarAlVolver);
    window.removeEventListener("focus", refrescarAlFoco);
  };
}, [usuario, vista]);

const corregirFormaPagoVenta = async (venta) => {
  if (!["ADMIN", "SUPER_ADMIN"].includes(rolActual)) return;

  const actual = String(venta?.metodo_pago || venta?.metodo_visual || "")
    .trim()
    .toUpperCase();

  if (!["EFECTIVO", "TRANSFERENCIA"].includes(actual)) {
    alert(
      `Esta venta está registrada como ${actual || "otro método"}. ` +
      "Por seguridad, esta herramienta solo corrige EFECTIVO ↔ TRANSFERENCIA."
    );
    return;
  }

  const nuevoMetodo = actual === "EFECTIVO" ? "TRANSFERENCIA" : "EFECTIVO";

  const confirmar = window.confirm(
    `Orden #${venta.id}\n` +
    `Total: ${formatearMoneda(venta.total)}\n\n` +
    `Cambiar forma de pago:\n${actual} → ${nuevoMetodo}\n\n` +
    "Esto NO modifica stock, productos, total, saldo ni crédito."
  );

  if (!confirmar) return;

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const respuesta = await fetch(
      `${API_URL}/api/ventas/${Number(venta.id)}/metodo-pago`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id: Number(institucionId),
          metodo_pago: nuevoMetodo,
        }),
      }
    );

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        data.message || data.error || "No se pudo corregir la forma de pago."
      );
    }

    const jornadaId = Number(data.jornada_id || venta.jornada_id || 0);

    if (jornadaId > 0) {
      try {
        const cierresRes = await fetch(
          `${API_URL}/api/cierres?institucion_id=${Number(institucionId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );

        const cierresData = await cierresRes.json();

        if (cierresRes.ok && Array.isArray(cierresData)) {
          const cierreRelacionado = cierresData.find(
            (c) => Number(c.jornada_id || 0) === jornadaId
          );

          if (cierreRelacionado?.id) {
            await fetch(
              `${API_URL}/api/cierres/recalcular/${Number(cierreRelacionado.id)}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  institucion_id: Number(institucionId),
                }),
              }
            );
          }
        }
      } catch (errorRecalculo) {
        console.warn(
          "La venta se corrigió, pero falló el recálculo automático del cierre:",
          errorRecalculo
        );
      }
    }

    await cargarVentas();
    await cargarCierres();

    alert(
      `Orden #${venta.id}: forma de pago corregida a ${nuevoMetodo}.` +
      "\nSi pertenecía a un cierre guardado, sus totales fueron recalculados."
    );
  } catch (error) {
    console.error("Error corrigiendo forma de pago:", error);
    alert(error.message || "No se pudo corregir la forma de pago.");
  }
};

const limpiarFormularioVenta = () => {
  setVentaForm({
    alumno_id: "",
    profesor_id: "",
    metodo_pago: "EFECTIVO",
    observacion: "",
  });

  setVentaItems([]);
  setCodigoBarraNuevaOrden("");
  setBusquedaProductoNuevaOrden("");
  setCategoriaNuevaOrden("TODOS");
  setModoNuevaOrden("consumidor_final");
  setTipoUsuarioNuevaOrden("TODOS");
  setBusquedaUsuarioNuevaOrden("");
  setLocalNuevaOrden(jornadaActiva?.punto_nombre || localNuevaOrden || "PRINCIPAL");
  setFechaNuevaOrden(new Date().toISOString().slice(0, 10));
  setEfectivoRecibidoNuevaOrden("");
};

const abrirNuevaOrdenConsumidorFinal = () => {
  // Fuerza una orden realmente nueva, sin conservar el alumno/profesor
  // de la venta anterior ni estados de detalle que puedan bloquear la vista.
  limpiarFormularioVenta();

  setAlumnoDetalle(null);
  setOrdenDetalleAlumno(null);
  setProfesorDetalle(null);

  setVista("ventas");
  setVistaVentasInterna("registrar");
  setModoNuevaOrden("consumidor_final");
  setTipoUsuarioNuevaOrden("TODOS");

  // Volvemos arriba para que la nueva orden aparezca inmediatamente.
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  });
};

const exportarVentasExcel = () => {
  if (!ventasFiltradas.length) {
    alert("No hay ventas para exportar");
    return;
  }

  const datos = ventasFiltradas.map((v) => ({
    "Orden No": `#${v.id}`,
    Usuario: v.alumno_nombre || "",
    "Ubicación": v.ubicacion_visual || v.ubicacion || "PRINCIPAL",
    "Fecha de Consumo": formatearSoloFecha(v.fecha_base),
    "Fecha de Pago": formatearSoloFecha(v.fecha_base),
    "Fecha de Creación": formatearSoloFecha(v.fecha_base),
    "Hora compra": formatearSoloHora(v.fecha_base),
    Total: Number(v.total || 0),
    Estado: v.estado || "Entregada",
    "Forma Pago": v.metodo_visual || v.metodo_pago || "",
    "Tipo orden": v.tipo_orden || "Normal",
  }));

  const worksheet = XLSX.utils.json_to_sheet(datos);
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
  XLSX.writeFile(workbook, "ventas_exportadas.xlsx");
};

  const agregarItemVenta = () => {
    setVentaItems((prev) => [
      ...prev,
      {
        producto_id: "",
        cantidad: "1",
      },
    ]);
  };

  const eliminarItemVenta = (index) => {
  setVentaItems((prev) => prev.filter((_, i) => i !== index));
};

  const actualizarItemVenta = (index, campo, valor) => {
    setVentaItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  };

  const handleCambiarAcceso = async (e) => {
    e.preventDefault();
    setMensajeCambiarAcceso("");
    setCargandoCambiarAcceso(true);

    const institucionId = Number(cambiarAccesoForm.institucion_id);
    const correoActual = String(cambiarAccesoForm.correo_actual || "").trim();
    const passwordActual = String(cambiarAccesoForm.password_actual || "");
    const nuevoCorreo = String(cambiarAccesoForm.nuevo_correo || "").trim();
    const nuevaPassword = String(cambiarAccesoForm.nueva_password || "");
    const confirmarPassword = String(
      cambiarAccesoForm.confirmar_password || ""
    );

    if (!institucionId) {
      setMensajeCambiarAcceso("Debes seleccionar una institución");
      setCargandoCambiarAcceso(false);
      return;
    }

    if (
      !correoActual ||
      !passwordActual ||
      !nuevoCorreo ||
      !nuevaPassword ||
      !confirmarPassword
    ) {
      setMensajeCambiarAcceso("Todos los campos son obligatorios");
      setCargandoCambiarAcceso(false);
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setMensajeCambiarAcceso(
        "La confirmación de contraseña no coincide"
      );
      setCargandoCambiarAcceso(false);
      return;
    }

    if (nuevaPassword.length < 6) {
      setMensajeCambiarAcceso(
        "La nueva contraseña debe tener al menos 6 caracteres"
      );
      setCargandoCambiarAcceso(false);
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/api/auth/cambiar-acceso`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institucion_id: institucionId,
          correo_actual: correoActual,
          password_actual: passwordActual,
          nuevo_correo: nuevoCorreo,
          nueva_password: nuevaPassword,
          confirmar_password: confirmarPassword,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        setMensajeCambiarAcceso(
          data.message || data.error || "No se pudo cambiar el acceso"
        );
        return;
      }

      setMensajeCambiarAcceso("Acceso actualizado correctamente");

      setCambiarAccesoForm({
        institucion_id: "",
        correo_actual: "",
        password_actual: "",
        nuevo_correo: "",
        nueva_password: "",
        confirmar_password: "",
      });

      window.setTimeout(() => {
        setMostrarCambiarAcceso(false);
        setMensajeCambiarAcceso("");
      }, 1200);
    } catch (error) {
      console.error("Error cambiando acceso:", error);
      setMensajeCambiarAcceso("No se pudo conectar con el servidor");
    } finally {
      setCargandoCambiarAcceso(false);
    }
  };

  const handleCrearCuenta = async (e) => {
    e.preventDefault();
    setMensajeCrearCuenta("");
    setCargandoCrearCuenta(true);

    if (!crearCuentaForm.institucion_id) {
      setMensajeCrearCuenta("Debes seleccionar una institución");
      setCargandoCrearCuenta(false);
      return;
    }

    if (!crearCuentaForm.nombre.trim()) {
      setMensajeCrearCuenta("Debes ingresar el nombre del usuario");
      setCargandoCrearCuenta(false);
      return;
    }

    if (!crearCuentaForm.correo.trim()) {
      setMensajeCrearCuenta("Debes ingresar el correo");
      setCargandoCrearCuenta(false);
      return;
    }

    if (!crearCuentaForm.password) {
      setMensajeCrearCuenta("Debes ingresar una contraseña");
      setCargandoCrearCuenta(false);
      return;
    }

    if (crearCuentaForm.password !== crearCuentaForm.confirmar_password) {
      setMensajeCrearCuenta("La confirmación de contraseña no coincide");
      setCargandoCrearCuenta(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/crear-cuenta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institucion_id: Number(crearCuentaForm.institucion_id),
          nombre: crearCuentaForm.nombre.trim(),
          correo: crearCuentaForm.correo.trim(),
          password: crearCuentaForm.password,
          confirmar_password: crearCuentaForm.confirmar_password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensajeCrearCuenta(
          data.message || data.error || "No se pudo crear la cuenta"
        );
        return;
      }

      setMensajeCrearCuenta("Cuenta creada correctamente");

      setCrearCuentaForm({
        institucion_id: "",
        nombre: "",
        correo: "",
        password: "",
        confirmar_password: "",
      });

      window.setTimeout(() => {
        setMostrarCrearCuenta(false);
        setMensajeCrearCuenta("");
      }, 1200);
    } catch (error) {
      console.error("Error creando cuenta:", error);
      setMensajeCrearCuenta("No se pudo conectar con el servidor");
    } finally {
      setCargandoCrearCuenta(false);
    }
  };


  const cargarPuntosOperacion=async({tokenForzado=null,institucionForzada=null}={})=>{
    try{
      const token=tokenForzado||localStorage.getItem("token");
      const institucionId=Number(institucionForzada)||obtenerInstitucionActivaId();
      if(!token||!institucionId)return[];
      const res=await fetch(`${API_URL}/api/puntos?institucion_id=${institucionId}&t=${Date.now()}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const data=await res.json(); if(!res.ok)throw new Error(data.message||"Error cargando puntos");
      const lista=Array.isArray(data)?data.filter(p=>p.activo!==false):[];
      setPuntosOperacion(lista);
      const nombres=lista.map(p=>String(p.nombre||"PRINCIPAL").trim().toUpperCase());
      setPuntosInventario(nombres.length?nombres:["PRINCIPAL"]);
      return lista;
    }catch(e){console.error(e);return[]}
  };
  const aplicarJornada=(j)=>{
    if(!j)return;

    const punto=normalizarUbicacionFrontend(
      j.punto_nombre||"PRINCIPAL",
      Number(j?.institucion_id || obtenerInstitucionActivaId())
    );

    const jornadaNormalizada={
      ...j,
      punto_nombre:punto,
    };

    setJornadaActiva(jornadaNormalizada);
    localStorage.setItem(
      "jornadaActiva",
      JSON.stringify(jornadaNormalizada)
    );
    setPuntoInventarioSeleccionado(punto);
    setLocalNuevaOrden(punto);
    setMostrarSelectorJornada(false);
  };
  const volverAlLoginOperativoSinJornada = (mensaje = "") => {
    // Después de cerrar caja volvemos al login operativo, pero conservando
    // institución, ubicación y correo para que abrir la nueva jornada sea rápido.
    let ultimoAcceso = null;

    try {
      ultimoAcceso = JSON.parse(
        localStorage.getItem("ultimoAccesoOperativo") || "null"
      );
    } catch (_error) {
      ultimoAcceso = null;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("accesoOperativo");
    localStorage.removeItem("jornadaActiva");

    setJornadaActiva(null);
    setMostrarSelectorJornada(false);
    setUsuario(null);

    setVentaItems([]);
    setAlumnoDetalle(null);
    setProfesorDetalle(null);
    setOrdenDetalleAlumno(null);

    setPassword("");

    const institucionRecordada = Number(
      ultimoAcceso?.institucion_id || 0
    );
    const puntoRecordado = Number(
      ultimoAcceso?.punto_id || 0
    );
    const correoRecordado = String(
      ultimoAcceso?.correo || ""
    ).trim();

    if (institucionRecordada) {
      setLoginInstitucionId(String(institucionRecordada));
    }

    if (correoRecordado) {
      setCorreo(correoRecordado);
    } else {
      setCorreo("");
    }

    if (institucionRecordada && puntoRecordado) {
      // Carga los puntos reales de la institución y deja seleccionado
      // automáticamente el mismo BAR/KIOSKO que acaba de cerrar.
      cargarPuntosLoginPublicos(institucionRecordada)
        .then((lista) => {
          const existe = (Array.isArray(lista) ? lista : []).some(
            (punto) => Number(punto?.id) === puntoRecordado
          );

          setLoginPuntoId(
            existe ? String(puntoRecordado) : "ADMIN"
          );
        })
        .catch(() => {
          setLoginPuntoId("ADMIN");
        });
    } else {
      setLoginPuntoId("ADMIN");
    }

    if (mensaje) {
      setMensaje(mensaje);
    }
  };

  const cargarEstadoOperativoCaja=async({
    tokenForzado=null,
    institucionForzada=null,
    usuarioForzado=null,
  }={})=>{
    const u=usuarioForzado||usuario;
    const rol=normalizarRol(u?.rol);

    if(
      !u ||
      !["ENCARGADO_LOCAL","CAJERO"].includes(rol)
    ){
      const libre={
        permitido:true,
        estado_operativo:"NO_APLICA",
        requiere_abrir_jornada:false,
        requiere_cerrar_pendiente:false,
        jornada:null,
        message:"",
      };
      setEstadoOperativoCaja(libre);
      return libre;
    }

    const token=tokenForzado||localStorage.getItem("token");
    const institucionId=
      Number(institucionForzada)||
      normalizarInstitucionId(u?.institucion_id)||
      obtenerInstitucionActivaId();

    if(!token||!institucionId)return null;

    try{
      setCargandoEstadoOperativoCaja(true);

      const res=await fetch(
        `${API_URL}/api/jornadas/estado-operativo?institucion_id=${institucionId}&t=${Date.now()}`,
        {
          headers:{Authorization:`Bearer ${token}`},
          cache:"no-store",
        }
      );

      const data=await res.json();

      if(!res.ok){
        throw new Error(
          data.message||
          data.error||
          "No se pudo validar el estado de la caja"
        );
      }

      setEstadoOperativoCaja(data);

      if(data?.jornada?.id){
        setJornadaActiva(data.jornada);
        localStorage.setItem(
          "jornadaActiva",
          JSON.stringify(data.jornada)
        );

        const punto=normalizarUbicacionFrontend(
          data.jornada.punto_nombre||"PRINCIPAL",
          institucionId
        );

        setPuntoInventarioSeleccionado(punto);
        setLocalNuevaOrden(punto);
      }else{
        localStorage.removeItem("jornadaActiva");
        setJornadaActiva(null);
      }

      if(data?.estado_operativo==="SIN_JORNADA"){
        volverAlLoginOperativoSinJornada(
          data?.message ||
          "La caja está cerrada. Selecciona tu ubicación e inicia sesión para abrir una nueva jornada."
        );
        return data;
      }

      if(data?.estado_operativo==="CIERRE_PENDIENTE"){
        const jornadaPendiente = data?.jornada || null;

        const fechaPendiente = normalizarFechaISO(
          jornadaPendiente?.fecha_operativa_texto ||
          jornadaPendiente?.fecha_operativa
        );

        if(jornadaPendiente?.id){
          setJornadaActiva(jornadaPendiente);
          localStorage.setItem(
            "jornadaActiva",
            JSON.stringify(jornadaPendiente)
          );
        }

        if(fechaPendiente){
          setCierreForm({
      fecha: fechaPendiente,
      negocio: "POS NUBE",
      tarjeta_manual: "0",
      transferencia_manual: "0",
      observacion: "",
      denominaciones: {
        billete_1: "", billete_2: "", billete_5: "", billete_10: "",
        billete_20: "", billete_50: "", billete_100: "",
        moneda_001: "", moneda_005: "", moneda_010: "",
        moneda_025: "", moneda_050: "", moneda_1: "",
      },
    });
        }

        setMostrarSelectorJornada(false);
        setVista("reporte_cierre");
        setMostrarCrearCierre(true);

        if(fechaPendiente && jornadaPendiente?.id){
          await cargarResumenCierre(
            fechaPendiente,
            jornadaPendiente
          );
        }
      }

      return data;
    }catch(error){
      console.error("Error validando estado operativo:",error);

      const bloqueado={
        permitido:false,
        estado_operativo:"ERROR_VALIDACION",
        requiere_abrir_jornada:false,
        requiere_cerrar_pendiente:false,
        jornada:null,
        message:
          "No se pudo validar el estado de la caja. Por seguridad las operaciones permanecen bloqueadas.",
      };

      setEstadoOperativoCaja(bloqueado);
      return bloqueado;
    }finally{
      setCargandoEstadoOperativoCaja(false);
    }
  };

  const cargarContextoJornada=async({tokenForzado=null,institucionForzada=null,usuarioForzado=null}={})=>{
    const u=usuarioForzado||usuario;
    const rolContexto=normalizarRol(u?.rol);

    if(!u)return;

    // La jornada/caja operativa aplica SOLO a ENCARGADO_LOCAL y CAJERO.
    // ADMIN / SUPER_ADMIN / AUDITOR entran por administración sin modal de jornada.
    if(!["ENCARGADO_LOCAL","CAJERO"].includes(rolContexto)){
      setMostrarSelectorJornada(false);
      localStorage.removeItem("jornadaActiva");
      setJornadaActiva(null);
      setEstadoOperativoCaja({
        permitido:true,
        estado_operativo:"NO_APLICA",
        requiere_abrir_jornada:false,
        requiere_cerrar_pendiente:false,
        jornada:null,
        message:"",
      });
      return;
    }
    const token=tokenForzado||localStorage.getItem("token");
    const institucionId=Number(institucionForzada)||obtenerInstitucionActivaId();
    if(!token||!institucionId)return;
    const puntos=await cargarPuntosOperacion({tokenForzado:token,institucionForzada:institucionId});
    const estado=await cargarEstadoOperativoCaja({
      tokenForzado:token,
      institucionForzada:institucionId,
      usuarioForzado:u,
    });

    if(estado?.jornada?.id){
      const data=estado.jornada;

      const puntoExistente=puntos.find(
        (p)=>Number(p.id)===Number(data.punto_id)
      );

      const puntosInicio=(()=>{
        const activos=(Array.isArray(puntos)?puntos:[])
          .filter((p)=>p?.activo!==false);

        const puntosReales=activos.filter(
          (p)=>String(p?.nombre||"")
            .trim()
            .toUpperCase()!=="PRINCIPAL"
        );

        return puntosReales.length>0
          ? puntosReales
          : activos;
      })();

      const puntoExistentePermitido=
        puntoExistente&&
        puntosInicio.some(
          (p)=>Number(p.id)===Number(puntoExistente.id)
        )
          ? puntoExistente
          : null;

      setPuntoJornadaSeleccionado(
        puntoExistentePermitido?.id
          ? String(puntoExistentePermitido.id)
          : puntosInicio[0]?.id
          ? String(puntosInicio[0].id)
          : ""
      );

      setOperadorJornadaCorreo(
        String(data.usuario_correo||u?.correo||"")
      );
      setOperadorJornadaPassword("");
      setVerPasswordOperadorJornada(false);

      if(estado.estado_operativo==="CIERRE_PENDIENTE"){
        setVista("reporte_cierre");
        setMostrarSelectorJornada(false);
      }else{
        setMostrarSelectorJornada(false);
      }

      return;
    }

    localStorage.removeItem("jornadaActiva");setJornadaActiva(null);

    const puntosInicio=(()=>{
      const activos=(Array.isArray(puntos)?puntos:[])
        .filter((p)=>p?.activo!==false);

      const puntosReales=activos.filter(
        (p)=>String(p?.nombre||"")
          .trim()
          .toUpperCase()!=="PRINCIPAL"
      );

      return puntosReales.length>0
        ? puntosReales
        : activos;
    })();

    setPuntoJornadaSeleccionado(
      puntosInicio[0]?.id
        ? String(puntosInicio[0].id)
        : ""
    );
    setOperadorJornadaCorreo(String(u?.correo||""));
    setOperadorJornadaPassword("");

    // Nunca volver a mostrar el modal antiguo.
    setMostrarSelectorJornada(false);

    if(estado?.estado_operativo==="SIN_JORNADA"){
      volverAlLoginOperativoSinJornada(
        estado?.message ||
        "La caja está cerrada. Selecciona tu ubicación e inicia sesión para abrir una nueva jornada."
      );
    }
  };
  const obtenerPuntosJornadaDisponibles=(lista=puntosOperacion)=>{
    const activos=(Array.isArray(lista)?lista:[])
      .filter((p)=>p?.activo!==false);

    const puntosReales=activos.filter(
      (p)=>String(p?.nombre||"")
        .trim()
        .toUpperCase()!=="PRINCIPAL"
    );

    // Si la institución ya tiene puntos reales (ej. BAR PRINCIPAL / KIOSKO),
    // PRINCIPAL deja de mostrarse para iniciar jornada.
    // Si una institución solo tiene PRINCIPAL, se conserva como respaldo.
    return puntosReales.length>0
      ? puntosReales
      : activos;
  };

  const abrirJornada=async()=>{
    if(!puntoJornadaSeleccionado){
      alert("Selecciona el punto de trabajo.");
      return;
    }

    const operadorCorreo=String(operadorJornadaCorreo||"").trim();
    const operadorPassword=String(operadorJornadaPassword||"");

    if(!operadorCorreo||!operadorPassword){
      alert("El usuario/correo y la contraseña del operador son obligatorios.");
      return;
    }

    try{
      setCargandoJornada(true);

      const tokenActual=localStorage.getItem("token");
      const institucionId=obtenerInstitucionActivaId();
      const rolQueAbre=normalizarRol(usuario?.rol);

      // Para CAJERO / ENCARGADO_LOCAL usamos el mismo endpoint público
      // que ya funciona correctamente en el login inicial.
      // ADMIN / SUPER_ADMIN conservan /abrir porque abren una jornada
      // para otro operador desde Administración.
      const esOperadorActual=
        ["ENCARGADO_LOCAL","CAJERO"].includes(rolQueAbre);

      const urlAbrir=esOperadorActual
        ? `${API_URL}/api/jornadas/abrir-publica`
        : `${API_URL}/api/jornadas/abrir`;

      const headersAbrir={
        "Content-Type":"application/json",
      };

      if(!esOperadorActual && tokenActual){
        headersAbrir.Authorization=`Bearer ${tokenActual}`;
      }

      const res=await fetch(urlAbrir,{
        method:"POST",
        headers:headersAbrir,
        body:JSON.stringify({
          institucion_id:Number(institucionId),
          punto_id:Number(puntoJornadaSeleccionado),
          operador_correo:operadorCorreo,
          operador_password:operadorPassword,
        }),
      });

      const data=await res.json();

      if(!res.ok){
        throw new Error(data.message||"Error abriendo jornada");
      }

      if(!data.token||!data.usuario||!data.jornada){
        throw new Error("El servidor no devolvió la sesión completa del operador.");
      }

      // A partir de aquí el sistema queda autenticado como el operador real.
      localStorage.setItem("token",data.token);
      localStorage.setItem("usuario",JSON.stringify(data.usuario));
      localStorage.setItem(
        "institucionSeleccionadaId",
        String(data.usuario.institucion_id)
      );

      setUsuario(data.usuario);
      setInstitucionSeleccionadaId(
        normalizarInstitucionId(data.usuario.institucion_id)
      );

      aplicarVistaInicialRol(
        data.usuario.rol,
        setVista,
        setVistaVentasInterna
      );

      setOperadorJornadaCorreo(data.usuario.correo||"");
      setOperadorJornadaPassword("");
      setVerPasswordOperadorJornada(false);

      aplicarJornada(data.jornada);

      // Dejamos el estado operativo confirmado inmediatamente con la
      // misma jornada que acaba de devolver el backend.
      setEstadoOperativoCaja({
        permitido:true,
        estado_operativo:"OPERATIVA",
        requiere_abrir_jornada:false,
        requiere_cerrar_pendiente:false,
        jornada:data.jornada,
        message:"Jornada operativa habilitada.",
      });

      try {
        localStorage.setItem(
          "ultimoAccesoOperativo",
          JSON.stringify({
            institucion_id: Number(data.usuario.institucion_id),
            punto_id: Number(data.jornada?.punto_id || puntoJornadaSeleccionado || 0),
            punto_nombre: String(data.jornada?.punto_nombre || ""),
            correo: String(data.usuario?.correo || operadorCorreo || "").trim(),
          })
        );
      } catch (_error) {}

      setMostrarAbrirJornadaAdmin(false);

      const estadoDespuesAbrir=
        false && data.estado_operativo==="CIERRE_PENDIENTE"
          ? {
              permitido:false,
              estado_operativo:"CIERRE_PENDIENTE",
              requiere_abrir_jornada:false,
              requiere_cerrar_pendiente:true,
              jornada:data.jornada,
              message:
                data.message||
                "Existe una caja pendiente de cierre.",
            }
          : {
              permitido:true,
              estado_operativo:"OPERATIVA",
              requiere_abrir_jornada:false,
              requiere_cerrar_pendiente:false,
              jornada:data.jornada,
              message:"Jornada operativa habilitada.",
            };

      setEstadoOperativoCaja(estadoDespuesAbrir);

      if(estadoDespuesAbrir.estado_operativo==="CIERRE_PENDIENTE"){
        setVista("reporte_cierre");
      }

      await cargarPuntosOperacion({
        tokenForzado:data.token,
        institucionForzada:data.usuario.institucion_id,
      });

      await cargarExistenciasInventario({
        ubicacionForzada: data.jornada?.punto_nombre,
      });

      // IMPORTANTE:
      // No volvemos a consultar estado-operativo inmediatamente después
      // de abrir. La respuesta de /abrir-publica o /abrir ya viene de una
      // transacción confirmada y contiene la jornada real. Una validación
      // inmediata en este Android antiguo podía sobrescribir el estado recién
      // abierto con SIN_JORNADA y volver a mostrar el cuadro.
      // La validación normal seguirá ejecutándose en el ciclo habitual
      // del sistema y en el siguiente refresh.
    }catch(e){
      alert(e.message||"No se pudo abrir la jornada");
    }finally{
      setCargandoJornada(false);
    }
  };

  const cerrarJornadaOperativa=async()=>{
    if(!jornadaActiva?.id)return;
    if(!window.confirm(`¿Cerrar tu jornada en ${jornadaActiva.punto_nombre}?`))return;
    try{
      const token=localStorage.getItem("token"),institucionId=obtenerInstitucionActivaId();
      const res=await fetch(`${API_URL}/api/jornadas/${jornadaActiva.id}/cerrar`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({institucion_id:Number(institucionId)})});
      const data=await res.json();if(!res.ok)throw new Error(data.message||"Error cerrando jornada");
      localStorage.removeItem("jornadaActiva");
      setJornadaActiva(null);
      setEstadoOperativoCaja({
        permitido:false,
        estado_operativo:"SIN_JORNADA",
        requiere_abrir_jornada:true,
        requiere_cerrar_pendiente:false,
        jornada:null,
        message:
          "La caja fue cerrada. Debes abrir una nueva jornada para continuar operando.",
      });
      setOperadorJornadaPassword("");
      setPuntoJornadaSeleccionado("");
      volverAlLoginOperativoSinJornada(
        "La jornada fue cerrada. Selecciona tu ubicación e inicia sesión para abrir una nueva jornada."
      );
    }catch(e){alert(e.message||"No se pudo cerrar la jornada")}
  };

  const cargarPuntosLoginPublicos = async (institucionId) => {
    const id = Number(institucionId || 0);

    if (!id) {
      setLoginPuntosOperacion([]);
      setLoginPuntoId("ADMIN");
      return [];
    }

    try {
      setCargandoLoginPuntos(true);

      const respuesta = await fetch(
        `${API_URL}/api/jornadas/puntos-publicos?institucion_id=${id}`,
        { cache: "no-store" }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || "No se pudieron cargar las ubicaciones");
      }

      const lista = Array.isArray(data) ? data : [];
      setLoginPuntosOperacion(lista);

      // Siempre dejamos ADMINISTRACIÓN como acceso separado.
      // El operador escoge BAR PRINCIPAL / KIOSKO cuando va a trabajar.
      setLoginPuntoId("ADMIN");
      return lista;
    } catch (error) {
      console.error("Error cargando ubicaciones para login:", error);
      setLoginPuntosOperacion([]);
      setLoginPuntoId("ADMIN");
      return [];
    } finally {
      setCargandoLoginPuntos(false);
    }
  };

  const iniciarSesionOperativaPublica = async () => {
    const institucionId = Number(loginInstitucionId || 0);
    const puntoId = Number(loginPuntoId || 0);

    if (!institucionId || !puntoId) {
      throw new Error("Selecciona la institución y la ubicación de trabajo.");
    }

    const respuesta = await fetch(`${API_URL}/api/jornadas/abrir-publica`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institucion_id: institucionId,
        punto_id: puntoId,
        operador_correo: String(correo || "").trim(),
        operador_password: String(password || ""),
      }),
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(data.message || "No se pudo iniciar la jornada");
    }

    if (!data.token || !data.usuario || !data.jornada) {
      throw new Error("El servidor no devolvió la sesión completa del operador.");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    localStorage.setItem("accesoOperativo", JSON.stringify({ punto_id: Number(loginPuntoId), institucion_id: Number(loginInstitucionId) }));
    localStorage.setItem(
      "institucionSeleccionadaId",
      String(data.usuario.institucion_id)
    );

    setUsuario(data.usuario);
    setInstitucionSeleccionadaId(
      normalizarInstitucionId(data.usuario.institucion_id)
    );

    aplicarVistaInicialRol(
      data.usuario.rol,
      setVista,
      setVistaVentasInterna
    );

    setOperadorJornadaCorreo(data.usuario.correo || "");
    setOperadorJornadaPassword("");
    setVerPasswordOperadorJornada(false);
    aplicarJornada(data.jornada);

    const estadoIngresoOperativo=
      false && data.estado_operativo==="CIERRE_PENDIENTE"
        ? {
            permitido:false,
            estado_operativo:"CIERRE_PENDIENTE",
            requiere_abrir_jornada:false,
            requiere_cerrar_pendiente:true,
            jornada:data.jornada,
            message:
              data.message||
              "Existe una caja pendiente de cierre del día anterior.",
          }
        : {
            permitido:true,
            estado_operativo:"OPERATIVA",
            requiere_abrir_jornada:false,
            requiere_cerrar_pendiente:false,
            jornada:data.jornada,
            message:"Jornada operativa habilitada.",
          };

    setEstadoOperativoCaja(estadoIngresoOperativo);

    if(estadoIngresoOperativo.estado_operativo==="CIERRE_PENDIENTE"){
      setVista("reporte_cierre");
    }

    await cargarPuntosOperacion({
      tokenForzado: data.token,
      institucionForzada: data.usuario.institucion_id,
    });

    await cargarExistenciasInventario({
      ubicacionForzada: data.jornada?.punto_nombre,
    });
  };

  const handleRegistroPortalPadres = async (e) => {
    e.preventDefault();
    setMensajeRegistroPadre("");

    const cedula = String(registroPadrePortal.cedula || "").trim();
    const nombresRegistro = String(registroPadrePortal.nombres || "").trim();
    const apellidosRegistro = String(registroPadrePortal.apellidos || "").trim();
    const correoRegistro = String(registroPadrePortal.correo || "")
      .trim()
      .toLowerCase();
    const passwordRegistro = String(registroPadrePortal.password || "");

    if (!loginInstitucionId) {
      setMensajeRegistroPadre("Debes seleccionar la institución.");
      return;
    }

    if (
      !cedula ||
      !nombresRegistro ||
      !apellidosRegistro ||
      !correoRegistro ||
      !passwordRegistro
    ) {
      setMensajeRegistroPadre(
        "Cédula, nombres, apellidos, correo y contraseña son obligatorios."
      );
      return;
    }

    if (passwordRegistro.length < 8) {
      setMensajeRegistroPadre(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    if (
      passwordRegistro !==
      String(registroPadrePortal.confirmar_password || "")
    ) {
      setMensajeRegistroPadre("La confirmación de contraseña no coincide.");
      return;
    }

    try {
      setCargandoRegistroPadre(true);

      const res = await fetch(
        `${API_URL}/api/portal/registro/crear-cuenta`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institucion_id: Number(loginInstitucionId),
            cedula,
            nombres: nombresRegistro,
            apellidos: apellidosRegistro,
            correo: correoRegistro,
            password: passwordRegistro,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "No se pudo crear la cuenta.");
      }

      setCorreo(cedula);
      setPassword("");
      setRegistroPadrePortal({
        cedula: "",
        nombres: "",
        apellidos: "",
        correo: "",
        password: "",
        confirmar_password: "",
      });
      setMostrarRegistroPadrePortal(false);
      setMensaje(
        data.message ||
          "Cuenta creada correctamente. Ingresa con tu cédula y contraseña."
      );
    } catch (error) {
      setMensajeRegistroPadre(
        error.message || "No se pudo crear la cuenta del Portal."
      );
    } finally {
      setCargandoRegistroPadre(false);
    }
  };

  const handleLoginPortalPadres = async (e) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    if (!loginInstitucionId) {
      setMensaje("Debes seleccionar la institución.");
      setCargando(false);
      return;
    }

    if (!correo.trim() || !password) {
      setMensaje("Cédula/correo y contraseña son obligatorios.");
      setCargando(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/portal/login-padre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificador: String(correo || "").trim(),
          password,
          institucion_id: Number(loginInstitucionId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.message || "No se pudo iniciar sesión.");
        return;
      }

      const rolIngreso = normalizarRol(data.usuario?.rol);

      if (!["PADRE", "ESTUDIANTE"].includes(rolIngreso)) {
        setMensaje(
          "Este acceso es exclusivo para padres, representantes y estudiantes."
        );
        return;
      }

      localStorage.removeItem("accesoOperativo");
      localStorage.removeItem("jornadaActiva");
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      localStorage.setItem(
        "institucionSeleccionadaId",
        String(data.usuario?.institucion_id || loginInstitucionId)
      );

      setJornadaActiva(null);
      setUsuario(data.usuario);
      setInstitucionSeleccionadaId(
        normalizarInstitucionId(
          data.usuario?.institucion_id || loginInstitucionId
        )
      );
      aplicarVistaInicialRol(
        rolIngreso,
        setVista,
        setVistaVentasInterna
      );
      setMensaje("");
    } catch (error) {
      console.error("Error ingresando al Portal Padres:", error);
      setMensaje("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    if (!loginInstitucionId) {
      setMensaje("Debes seleccionar una institución");
      setCargando(false);
      return;
    }

    if (!correo.trim() || !password) {
      setMensaje("Correo y contraseña son obligatorios");
      setCargando(false);
      return;
    }

    try {
      // BAR PRINCIPAL / KIOSKO entran directamente con sus propias
      // credenciales y abren/recuperan su jornada sin necesitar al ADMIN.
      if (loginPuntoId && loginPuntoId !== "ADMIN") {
        await iniciarSesionOperativaPublica();
        setMensaje("");
        return;
      }

      // ADMINISTRACIÓN conserva el login normal y no abre una jornada.
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  correo,
  password,
  institucion_id: Number(loginInstitucionId),
}),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.message || "Error al iniciar sesión");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      setUsuario(data.usuario);

      const institucionIdLogin =
  Number(loginInstitucionId) ||
  normalizarInstitucionId(data.usuario?.institucion_id);

if (institucionIdLogin) {
  localStorage.setItem(
    "institucionSeleccionadaId",
    String(institucionIdLogin)
  );
  setInstitucionSeleccionadaId(institucionIdLogin);
} else {
  localStorage.removeItem("institucionSeleccionadaId");
  setInstitucionSeleccionadaId(null);
}

      setCuentaForm((prev) => ({
        ...prev,
        correo: data.usuario?.correo || "",
      }));

      aplicarVistaInicialRol(data.usuario?.rol,setVista,setVistaVentasInterna);

      if (["ADMIN","SUPER_ADMIN","AUDITOR"].includes(normalizarRol(data.usuario?.rol))) {
        // Acceso administrativo: NO abre ni recupera jornada operativa.
        setMostrarSelectorJornada(false);
        localStorage.removeItem("jornadaActiva");
        setJornadaActiva(null);
        await cargarPuntosOperacion({
          tokenForzado:data.token,
          institucionForzada:institucionIdLogin,
        });
        setEstadoOperativoCaja({
          permitido:true,
          estado_operativo:"NO_APLICA",
          requiere_abrir_jornada:false,
          requiere_cerrar_pendiente:false,
          jornada:null,
          message:"",
        });
      } else {
        // Solo ENCARGADO_LOCAL y CAJERO quedan sujetos a la caja operativa.
        await cargarContextoJornada({
          tokenForzado:data.token,
          institucionForzada:institucionIdLogin,
          usuarioForzado:data.usuario
        });
      }

      setMensaje("");
    } catch (error) {
      console.error("Error login:", error);
      setMensaje(error?.message || "No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  useEffect(()=>{
    if(!usuario||!institucionActivaId||esRolPortal)return;

    const rol=normalizarRol(usuario?.rol);
    if(!["ENCARGADO_LOCAL","CAJERO"].includes(rol))return;

    let cancelado=false;

    const revisar=async()=>{
      if(cancelado)return;
      await cargarEstadoOperativoCaja();
    };

    const alVolver=()=>{
      if(document.visibilityState==="visible"){
        revisar();
      }
    };

    revisar();

    const intervalo=window.setInterval(revisar,60000);
    window.addEventListener("focus",revisar);
    document.addEventListener("visibilitychange",alVolver);

    return()=>{
      cancelado=true;
      window.clearInterval(intervalo);
      window.removeEventListener("focus",revisar);
      document.removeEventListener("visibilitychange",alVolver);
    };
  },[
    usuario?.id,
    usuario?.rol,
    institucionActivaId,
  ]);

  useEffect(()=>{
    if(
      estadoOperativoCaja?.estado_operativo==="CIERRE_PENDIENTE" &&
      vista!=="reporte_cierre"
    ){
      setVista("reporte_cierre");
    }
  },[
    estadoOperativoCaja?.estado_operativo,
    vista,
  ]);

  const cargarResumen = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) return;

      const res = await fetch(
        `${API_URL}/api/reportes/ventas-resumen?institucion_id=${institucionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setResumen(data);
      } else {
        setResumen(null);
      }
    } catch (error) {
      console.error("Error cargando resumen:", error);
      setResumen(null);
    }
  };

  const cargarProductos = async () => {
  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      setProductos([]);
      return;
    }

    const res = await fetch(
      `${API_URL}/api/productos?institucion_id=${institucionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Error backend productos:", data);
      setProductos([]);
      return;
    }

    const listaProductos = Array.isArray(data)
      ? data
      : Array.isArray(data.productos)
      ? data.productos
      : [];

    setProductos(listaProductos);
  } catch (error) {
    console.error("Error cargando productos:", error);
    setProductos([]);
  }
};

  const cargarAlumnos = async () => {
  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) return;

    const res = await fetch(
      `${API_URL}/api/alumnos?institucion_id=${institucionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    // 🔵 DEBUG
    console.log("institucionId:", institucionId);
    console.log("respuesta alumnos:", data);

    if (res.ok) {
      setAlumnos(Array.isArray(data) ? data : []);
    } else {
      setAlumnos([]);
    }
  } catch (error) {
    console.error("Error cargando alumnos:", error);
    setAlumnos([]);
  }
};


  const normalizarEncabezadoImportacion = (valor) =>
    String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const obtenerCampoImportado = (fila, aliases, valorDefecto = "") => {
    for (const alias of aliases) {
      const clave = normalizarEncabezadoImportacion(alias);
      if (
        Object.prototype.hasOwnProperty.call(fila || {}, clave) &&
        String(fila?.[clave] ?? "").trim() !== ""
      ) {
        return String(fila[clave] ?? "").trim();
      }
    }
    return valorDefecto;
  };

  const dividirNombreCompletoImportado = (valor) => {
    const partes = String(valor || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!partes.length) return { nombres: "", apellidos: "" };
    if (partes.length === 1) return { nombres: partes[0], apellidos: "-" };
    if (partes.length === 2) {
      return { nombres: partes[0], apellidos: partes[1] };
    }
    if (partes.length === 3) {
      return {
        nombres: partes.slice(0, 1).join(" "),
        apellidos: partes.slice(1).join(" "),
      };
    }

    const mitad = Math.ceil(partes.length / 2);
    return {
      nombres: partes.slice(0, mitad).join(" "),
      apellidos: partes.slice(mitad).join(" "),
    };
  };

  const descargarExcelPlantilla = (nombreArchivo, hoja, encabezados, ejemplo) => {
    const datos = [encabezados, ejemplo];
    const worksheet = XLSX.utils.aoa_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, hoja);
    XLSX.writeFile(workbook, nombreArchivo);
  };

  const descargarPlantillaAlumnos = () => {
    descargarExcelPlantilla(
      "plantilla_alumnos.xlsx",
      "Alumnos",
      ["Cedula", "Codigo", "Nombres", "Apellidos", "Curso", "Paralelo", "Correo", "Estado"],
      ["1723456789", "A001", "Juan", "Perez", "8vo", "A", "juan@correo.com", "ACTIVO"]
    );
  };

  const descargarPlantillaProfesores = () => {
    descargarExcelPlantilla(
      "plantilla_profesores.xlsx",
      "Profesores",
      ["Cedula", "Codigo", "Nombres", "Apellidos", "Correo", "Telefono", "Estado"],
      ["0912345678", "P001", "Maria", "Lopez", "maria@correo.com", "0999999999", "ACTIVO"]
    );
  };

  const leerArchivoImportacion = (archivo) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evento) => {
        try {
          const workbook = XLSX.read(evento.target.result, { type: "array" });
          const nombreHoja = workbook.SheetNames[0];
          if (!nombreHoja) throw new Error("El archivo no contiene hojas");
          const filas = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja], {
            defval: "",
            raw: false,
          });
          resolve(filas);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsArrayBuffer(archivo);
    });

  const normalizarFilaImportada = (fila) => {
    const normalizada = {};
    Object.entries(fila || {}).forEach(([clave, valor]) => {
      normalizada[normalizarEncabezadoImportacion(clave)] = String(valor ?? "").trim();
    });
    return normalizada;
  };

  const estadoImportadoActivo = (valor) => {
    const texto = String(valor || "ACTIVO").trim().toUpperCase();
    return !["INACTIVO", "INACTIVA", "FALSE", "0", "NO"].includes(texto);
  };

  const importarAlumnosArchivo = async (event) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const filas = (await leerArchivoImportacion(archivo)).map(normalizarFilaImportada);
      if (!filas.length) {
        alert("El archivo no contiene registros");
        return;
      }

      let creados = 0;
      let actualizados = 0;
      let errores = 0;
      const detalleErrores = [];
      const alumnosActuales = Array.isArray(alumnos) ? [...alumnos] : [];

      for (let indice = 0; indice < filas.length; indice += 1) {
        const fila = filas[indice];

        const cedula = obtenerCampoImportado(
          fila,
          [
            "cedula",
            "cédula",
            "cedula_ruc",
            "cedula/ruc",
            "identificacion",
            "identificación",
            "numero_identificacion",
            "nro_identificacion",
            "documento",
            "dni",
            "ci",
          ],
          ""
        );

        const codigo = obtenerCampoImportado(
          fila,
          ["codigo","código","codigo_alumno","codigo_estudiante","matricula","matrícula"],
          ""
        );

        let nombres = obtenerCampoImportado(
          fila,
          ["nombres","nombre","nombres_estudiante","nombre_estudiante","alumno","estudiante"],
          ""
        );

        let apellidos = obtenerCampoImportado(
          fila,
          ["apellidos","apellido","apellidos_estudiante","apellido_estudiante"],
          ""
        );

        if (!apellidos) {
          const nombreCompleto = obtenerCampoImportado(
            fila,
            [
              "nombre_completo",
              "nombres_y_apellidos",
              "nombre_y_apellido",
              "alumno_completo",
              "estudiante_completo",
            ],
            ""
          );

          if (nombreCompleto) {
            const separados = dividirNombreCompletoImportado(nombreCompleto);
            nombres = nombres || separados.nombres;
            apellidos = separados.apellidos;
          }
        }

        if (!cedula || !nombres) {
          errores += 1;
          detalleErrores.push(
            `Fila ${indice + 2}: falta identificación/cédula o nombre`
          );
          continue;
        }

        if (!apellidos) apellidos = "-";

        const existente = alumnosActuales.find((a) =>
          String(obtenerCedulaAlumno(a) || "").trim() === String(cedula).trim()
        );

        const payload = {
          institucion_id: Number(institucionId),
          cedula,
          codigo,
          nombres,
          apellidos,
          curso: obtenerCampoImportado(
            fila,
            ["curso","grado","nivel","anio","año","curso_grado"],
            ""
          ),
          paralelo: obtenerCampoImportado(
            fila,
            ["paralelo","seccion","sección","aula"],
            ""
          ),
          correo: obtenerCampoImportado(
            fila,
            ["correo","email","e_mail","mail","correo_electronico"],
            ""
          ),
          saldo: existente ? Number(existente.saldo || 0) : 0,
          activo: estadoImportadoActivo(
            obtenerCampoImportado(fila,["estado","activo","status"],"ACTIVO")
          ),
        };

        try {
          const respuesta = await fetch(
            existente ? `${API_URL}/api/alumnos/${existente.id}` : `${API_URL}/api/alumnos`,
            {
              method: existente ? "PUT" : "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            }
          );
          const data = await respuesta.json();
          if (!respuesta.ok) throw new Error(data.message || "Error guardando alumno");
          if (existente) actualizados += 1;
          else {
            creados += 1;
            alumnosActuales.push(data);
          }
        } catch (error) {
          errores += 1;
          detalleErrores.push(`Fila ${indice + 2}: ${error.message}`);
        }
      }

      await cargarAlumnos();
      alert(
        `Importación de alumnos finalizada.\n\nNuevos: ${creados}\nActualizados: ${actualizados}\nErrores: ${errores}` +
          (detalleErrores.length ? `\n\nPrimeros errores:\n${detalleErrores.slice(0, 8).join("\n")}` : "")
      );
    } catch (error) {
      console.error("Error importando alumnos:", error);
      alert(`No se pudo importar alumnos: ${error.message}`);
    }
  };

  const importarProfesoresArchivo = async (event) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const filas = (await leerArchivoImportacion(archivo)).map(normalizarFilaImportada);
      if (!filas.length) {
        alert("El archivo no contiene registros");
        return;
      }

      let creados = 0;
      let actualizados = 0;
      let errores = 0;
      const detalleErrores = [];
      const profesoresActuales = Array.isArray(profesores) ? [...profesores] : [];

      for (let indice = 0; indice < filas.length; indice += 1) {
        const fila = filas[indice];

        const cedula = obtenerCampoImportado(
          fila,
          [
            "cedula",
            "cédula",
            "cedula_ruc",
            "cedula/ruc",
            "identificacion",
            "identificación",
            "numero_identificacion",
            "documento",
            "dni",
            "ci",
          ],
          ""
        );

        let nombres = obtenerCampoImportado(
          fila,
          ["nombres","nombre","nombres_profesor","nombre_profesor","docente","profesor"],
          ""
        );

        let apellidos = obtenerCampoImportado(
          fila,
          ["apellidos","apellido","apellidos_profesor","apellido_profesor"],
          ""
        );

        if (!apellidos) {
          const nombreCompleto = obtenerCampoImportado(
            fila,
            [
              "nombre_completo",
              "nombres_y_apellidos",
              "nombre_y_apellido",
              "profesor_completo",
              "docente_completo",
            ],
            ""
          );

          if (nombreCompleto) {
            const separados = dividirNombreCompletoImportado(nombreCompleto);
            nombres = nombres || separados.nombres;
            apellidos = separados.apellidos;
          }
        }

        if (!cedula || !nombres) {
          errores += 1;
          detalleErrores.push(
            `Fila ${indice + 2}: falta identificación/cédula o nombre`
          );
          continue;
        }

        if (!apellidos) apellidos = "-";

        const existente = profesoresActuales.find((p) =>
          String(p.cedula || "").trim() === String(cedula).trim()
        );

        const payload = {
          institucion_id: Number(institucionId),
          cedula,
          codigo: obtenerCampoImportado(
            fila,
            ["codigo","código","codigo_profesor","codigo_docente"],
            ""
          ),
          nombres,
          apellidos,
          email: obtenerCampoImportado(
            fila,
            ["correo","email","e_mail","mail","correo_electronico"],
            ""
          ),
          telefono: obtenerCampoImportado(
            fila,
            ["telefono","teléfono","celular","movil","móvil","telefono_celular"],
            ""
          ),
          saldo: existente ? Number(existente.saldo || existente.credito || 0) : 0,
          es_profesor: true,
          activo: estadoImportadoActivo(
            obtenerCampoImportado(fila,["estado","activo","status"],"ACTIVO")
          ),
        };

        try {
          const respuesta = await fetch(
            existente ? `${API_URL}/api/profesores/${existente.id}` : `${API_URL}/api/profesores`,
            {
              method: existente ? "PUT" : "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            }
          );
          const data = await respuesta.json();
          if (!respuesta.ok) throw new Error(data.message || "Error guardando profesor");
          if (existente) actualizados += 1;
          else {
            creados += 1;
            profesoresActuales.push(data);
          }
        } catch (error) {
          errores += 1;
          detalleErrores.push(`Fila ${indice + 2}: ${error.message}`);
        }
      }

      await cargarProfesores();
      alert(
        `Importación de profesores finalizada.\n\nNuevos: ${creados}\nActualizados: ${actualizados}\nErrores: ${errores}` +
          (detalleErrores.length ? `\n\nPrimeros errores:\n${detalleErrores.slice(0, 8).join("\n")}` : "")
      );
    } catch (error) {
      console.error("Error importando profesores:", error);
      alert(`No se pudo importar profesores: ${error.message}`);
    }
  };


  const exportarProfesoresExcel = () => {
    if (!profesoresFiltrados.length) {
      alert("No hay profesores para exportar.");
      return;
    }

    const filas = profesoresFiltrados.map((p) => ({
      ID: p.id || "",
      Nombre: p.nombres || "",
      Apellido: p.apellidos || "",
      "Es profesor": p.es_profesor ? "Sí" : "No",
      "Cédula/Ruc": p.cedula || "",
      Email: p.email || "",
      Código: p.codigo || "",
      Teléfono: p.telefono || "",
      Crédito: Number(p.credito || p.saldo || 0),
      Estado: p.activo !== false ? "Activo" : "Inactivo",
    }));

    const ws = XLSX.utils.json_to_sheet(filas);

    ws["!cols"] = [
      { wch: 8 },
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 30 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profesores");
    XLSX.writeFile(wb, "profesores.xlsx");
  };

  const exportarProfesoresPdf = () => {
    if (!profesoresFiltrados.length) {
      alert("No hay profesores para exportar.");
      return;
    }

    const limpiarPdf = (valor) =>
      String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/[()\\]/g, (m) => `\\${m}`);

    const cortar = (valor, maximo) =>
      String(valor ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maximo);

    const lineas = [
      "POS NUBE - LISTADO DE PROFESORES",
      `Institucion: ${institucionActiva?.nombre || "POS NUBE"}`,
      `Generado: ${new Date().toLocaleString("es-EC")}`,
      `Filtro: ${filtroProfesores || "todos"}`,
      "------------------------------------------------------------------------------------------------",
      "ID   Nombre              Apellido            Cedula/Ruc        Codigo       Credito     Estado",
      "------------------------------------------------------------------------------------------------",
    ];

    profesoresFiltrados.forEach((p) => {
      lineas.push(
        [
          String(p.id || "").padEnd(4, " "),
          cortar(p.nombres || "-", 18).padEnd(18, " "),
          cortar(p.apellidos || "-", 18).padEnd(18, " "),
          cortar(p.cedula || "-", 16).padEnd(16, " "),
          cortar(p.codigo || "-", 12).padEnd(12, " "),
          formatearMoneda(p.credito || p.saldo || 0).padStart(10, " "),
          (p.activo !== false ? "Activo" : "Inactivo").padStart(10, " "),
        ].join(" ")
      );

      if (p.email || p.telefono) {
        lineas.push(
          `     Email: ${cortar(p.email || "-", 34)} | Telefono: ${cortar(
            p.telefono || "-",
            18
          )}`
        );
      }
    });

    lineas.push(
      "------------------------------------------------------------------------------------------------"
    );
    lineas.push(`TOTAL PROFESORES: ${profesoresFiltrados.length}`);

    const pageWidth = 792;
    const pageHeight = 612;
    const marginLeft = 30;
    const startY = 575;
    const lineHeight = 11;
    const linesPerPage = 46;
    const paginas = [];

    for (let i = 0; i < lineas.length; i += linesPerPage) {
      paginas.push(lineas.slice(i, i + linesPerPage));
    }

    const objetos = [];
    const agregarObjeto = (contenido) => {
      objetos.push(contenido);
      return objetos.length;
    };

    const fontObj = agregarObjeto(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"
    );

    const pageRefs = [];

    paginas.forEach((lineasPagina) => {
      let stream = "BT\n/F1 8 Tf\n";
      let y = startY;

      lineasPagina.forEach((linea) => {
        stream += `1 0 0 1 ${marginLeft} ${y} Tm (${limpiarPdf(
          linea
        )}) Tj\n`;
        y -= lineHeight;
      });

      stream += "ET";

      const streamObj = agregarObjeto(
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
      );

      const pageObj = agregarObjeto(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
          `/Resources << /Font << /F1 ${fontObj} 0 R >> >> ` +
          `/Contents ${streamObj} 0 R >>`
      );

      pageRefs.push(pageObj);
    });

    const pagesObj = agregarObjeto(
      `<< /Type /Pages /Kids [${pageRefs
        .map((n) => `${n} 0 R`)
        .join(" ")}] /Count ${pageRefs.length} >>`
    );

    pageRefs.forEach((pageObj) => {
      objetos[pageObj - 1] = objetos[pageObj - 1].replace(
        "/Parent 0 0 R",
        `/Parent ${pagesObj} 0 R`
      );
    });

    const catalogObj = agregarObjeto(
      `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`
    );

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objetos.forEach((objeto, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${objeto}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });

    pdf +=
      `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogObj} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "profesores.pdf";

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  };

  const limpiarFormularioProfesor = () => {
    setProfesorForm({
      cedula: "",
      nombres: "",
      apellidos: "",
      email: "",
      codigo: "",
      telefono: "",
      saldo: "",
      es_profesor: true,
    });
    setEditandoProfesorId(null);
  };

  const cargarCreditosProfesores = async (profesorId = "") => {
    try {
      setCargandoCreditosProfesores(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        setCreditosProfesores([]);
        return;
      }

      const params = new URLSearchParams({
        institucion_id: String(institucionId),
      });

      if (profesorId) {
        params.set("profesor_id", String(profesorId));
      }

      if (creditosProfesoresFiltros.fecha_inicio) {
        params.set(
          "fecha_inicio",
          creditosProfesoresFiltros.fecha_inicio
        );
      }

      if (creditosProfesoresFiltros.fecha_fin) {
        params.set(
          "fecha_fin",
          creditosProfesoresFiltros.fecha_fin
        );
      }

      const res = await fetch(
        `${API_URL}/api/profesores/creditos/historial?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "No se pudo cargar el historial"
        );
      }

      setCreditosProfesores(Array.isArray(data) ? data : []);

      if (profesorId) {
        await cargarProfesores();
      }
    } catch (error) {
      console.error("Error cargando créditos de profesores:", error);
      setCreditosProfesores([]);
      alert(
        error.message ||
          "No se pudo cargar el historial de créditos del profesor."
      );
    } finally {
      setCargandoCreditosProfesores(false);
    }
  };


  const abrirModalRecargaProfesor = () => {
    if (!profesorDetalle?.id) {
      alert("Selecciona un profesor.");
      return;
    }

    setRecargaProfesorForm({
      monto: "",
      metodo_pago: "EFECTIVO",
      numero_comprobante: "",
                  observacion: "",
    });
    setMostrarModalRecargaProfesor(true);
  };

  const cerrarModalRecargaProfesor = () => {
    if (guardandoRecargaProfesor) return;
    setMostrarModalRecargaProfesor(false);
    setRecargaProfesorForm({
      monto: "",
      metodo_pago: "EFECTIVO",
      numero_comprobante: "",
                  observacion: "",
    });
  };

  const recargarEfectivoProfesorRapido = async () => {
    if (!profesorDetalle?.id) {
      alert("Selecciona un profesor.");
      return;
    }

    const valorIngresado = window.prompt(
      `Recarga en efectivo para ${profesorDetalle.nombres || ""} ${
        profesorDetalle.apellidos || ""
      }\n\nIngresa el monto a recargar:`,
      ""
    );

    if (valorIngresado === null) return;

    const monto = Number(
      String(valorIngresado).replace(",", ".").trim()
    );

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingresa un monto válido mayor que cero.");
      return;
    }

    try {
      setGuardandoRecargaProfesor(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida.");
        return;
      }

      // Toda recarga del profesor pasa por /recargas para pagar primero
      // credito_utilizado (FIFO) y acreditar solo el excedente al saldo.
      const res = await fetch(
        `${API_URL}/api/profesores/${profesorDetalle.id}/recargas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
            monto,
            metodo_pago: "EFECTIVO",
            numero_comprobante: null,
            banco: null,
            cuenta_bancaria_id: null,
            comercio: "POS NUBE",
            observacion: "Recarga en efectivo",
          }),
        }
      );

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `No se pudo realizar la recarga. Código ${res.status}`
        );
      }

      if (data.profesor) {
        setProfesorDetalle(data.profesor);

        setProfesores((prev) =>
          prev.map((profesor) =>
            Number(profesor.id) === Number(data.profesor.id)
              ? data.profesor
              : profesor
          )
        );
      } else {
        // Fallback visual si el backend no devuelve profesor completo.
        setProfesorDetalle((prev) =>
          prev
            ? {
                ...prev,
                saldo: Number(prev.saldo || 0) + monto,
                credito: Number(prev.saldo || prev.credito || 0) + monto,
              }
            : prev
        );
      }

      // Actualizar historial sin bloquear el éxito de la recarga.
      try {
        await cargarCreditosProfesores(profesorDetalle.id);
      } catch (errorHistorial) {
        console.warn(
          "La recarga se realizó, pero no se pudo refrescar el historial:",
          errorHistorial
        );
      }

      alert(
        `Recarga en efectivo realizada correctamente.\nMonto: ${formatearMoneda(
          monto
        )}`
      );
    } catch (error) {
      console.error("Error realizando recarga rápida del profesor:", error);
      alert(error.message || "No se pudo realizar la recarga.");
    } finally {
      setGuardandoRecargaProfesor(false);
    }
  };

  const registrarRecargaProfesor = async (e) => {
    e.preventDefault();

    if (!profesorDetalle?.id) {
      alert("Selecciona un profesor.");
      return;
    }

    const monto = Number(recargaProfesorForm.monto || 0);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingresa un monto válido mayor que cero.");
      return;
    }

    if (recargaProfesorForm.metodo_pago === "TRANSFERENCIA") {
      if (!String(recargaProfesorForm.fecha_transferencia || "").trim()) {
        alert("Ingresa la fecha en que se realizó la transferencia.");
        return;
      }

      if (!String(recargaProfesorForm.numero_comprobante || "").trim()) {
        alert("Ingresa el número de comprobante de la transferencia.");
        return;
      }
    }

    try {
      setGuardandoRecargaProfesor(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      /*
       * IMPORTANTE:
       * Toda recarga del profesor, tanto EFECTIVO como TRANSFERENCIA,
       * debe pasar por /recargas porque esa ruta aplica primero el pago
       * contra credito_utilizado (FIFO) y solo manda el excedente a saldo.
       *
       * Antes, EFECTIVO usaba /creditos y por eso sumaba saldo sin bajar
       * la deuda de crédito.
       */
      const urlRecargaProfesor =
        `${API_URL}/api/profesores/${profesorDetalle.id}/recargas`;

      const payloadRecargaProfesor = {
        institucion_id: Number(institucionId),
        monto,
        metodo_pago: recargaProfesorForm.metodo_pago,
        numero_comprobante:
          recargaProfesorForm.metodo_pago === "TRANSFERENCIA"
            ? String(
                recargaProfesorForm.numero_comprobante || ""
              ).trim()
            : null,
        fecha_transferencia:
          recargaProfesorForm.metodo_pago === "TRANSFERENCIA"
            ? String(recargaProfesorForm.fecha_transferencia || "").trim()
            : null,
        comercio: "POS NUBE",
        observacion:
          recargaProfesorForm.observacion ||
          (recargaProfesorForm.metodo_pago === "EFECTIVO"
            ? "Recarga en efectivo"
            : "Recarga por transferencia"),
      };

      const res = await fetch(urlRecargaProfesor, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payloadRecargaProfesor),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || "No se pudo realizar la recarga"
        );
      }

      if (data.profesor) {
        setProfesorDetalle(data.profesor);
        setProfesores((prev) =>
          prev.map((profesor) =>
            Number(profesor.id) === Number(data.profesor.id)
              ? data.profesor
              : profesor
          )
        );
      }

      setRecargaProfesorForm({
        monto: "",
        metodo_pago: "EFECTIVO",
        numero_comprobante: "",
                        observacion: "",
      });

      await cargarCreditosProfesores(profesorDetalle.id);
      await cargarProfesores();
      setMostrarModalRecargaProfesor(false);

      const aplicadoCredito = Number(data.aplicado_credito || 0);
      const excedenteSaldo = Number(data.excedente_saldo || 0);

      if (aplicadoCredito > 0) {
        alert(
          `Recarga realizada correctamente.\n` +
            `Aplicado a deuda de crédito: ${formatearMoneda(aplicadoCredito)}\n` +
            `Excedente a saldo: ${formatearMoneda(excedenteSaldo)}`
        );
      } else {
        alert(
          `Recarga realizada correctamente.\n` +
            `Saldo acreditado: ${formatearMoneda(excedenteSaldo)}`
        );
      }
    } catch (error) {
      console.error("Error realizando recarga del profesor:", error);
      alert(error.message || "No se pudo realizar la recarga.");
    } finally {
      setGuardandoRecargaProfesor(false);
    }
  };

  const actualizarCreditoProfesor = async (
    accion = "HABILITAR"
  ) => {
    if (!profesorDetalle?.id) return;

    if (!["ADMIN", "SUPER_ADMIN"].includes(rolActual)) {
      alert(
        "Solo un administrador puede autorizar cambios de crédito."
      );
      return;
    }

    if (!creditoProfesorAdminPassword) {
      alert("Ingresa la contraseña del administrador.");
      return;
    }

    if (accion === "GUARDAR_LIMITE") {
      const limite = Number(creditoProfesorLimite);

      if (!Number.isFinite(limite) || limite <= 0) {
        alert("Ingresa un límite de crédito mayor a 0.");
        return;
      }
    }

    try {
      setGuardandoAutorizacionCreditoProfesor(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const response = await fetch(
        `${API_URL}/api/profesores/${profesorDetalle.id}/credito-habilitado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
            accion_credito: accion,
            credito_habilitado:
              accion !== "DESHABILITAR",
            limite_credito:
              accion === "GUARDAR_LIMITE"
                ? Number(creditoProfesorLimite)
                : Number(profesorDetalle?.limite_credito || 0),
            admin_password: creditoProfesorAdminPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "No se pudo actualizar la autorización de crédito"
        );
      }

      setProfesorDetalle(data.profesor);

      setProfesores((prev) =>
        prev.map((p) =>
          Number(p.id) === Number(data.profesor.id)
            ? data.profesor
            : p
        )
      );

      setCreditoProfesorLimite(
        String(Number(data.profesor?.limite_credito || 0))
      );
      setCreditoProfesorAdminPassword("");

      alert(data.message);
    } catch (error) {
      console.error(
        "Error actualizando permiso de crédito:",
        error
      );
      alert(
        error.message ||
        "No se pudo actualizar el permiso de crédito"
      );
    } finally {
      setGuardandoAutorizacionCreditoProfesor(false);
    }
  };

  const registrarCreditoProfesor = async (e) => {
    e.preventDefault();

    if (!profesorDetalle?.id) {
      alert("Selecciona un profesor.");
      return;
    }

    if (profesorDetalle.credito_habilitado !== true) {
      alert(
        "El crédito del profesor está inhabilitado. Un administrador debe autorizarlo con su contraseña."
      );
      return;
    }

    const monto = Number(creditoProfesorForm.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingresa un monto válido mayor que cero.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const res = await fetch(
        `${API_URL}/api/profesores/${profesorDetalle.id}/creditos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: institucionId,
            tipo: creditoProfesorForm.tipo,
            monto,
            comercio:
              creditoProfesorForm.comercio || "POS NUBE",
            observacion: creditoProfesorForm.observacion,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || "No se pudo registrar"
        );
      }

      setProfesorDetalle(data.profesor);
      setProfesores((prev) =>
        prev.map((profesor) =>
          Number(profesor.id) === Number(data.profesor.id)
            ? data.profesor
            : profesor
        )
      );

      setCreditoProfesorForm({
        tipo: "AJUSTE_POSITIVO",
        monto: "",
        comercio: "POS NUBE",
        observacion: "",
      });

      await cargarCreditosProfesores(profesorDetalle.id);
      alert("Movimiento de crédito registrado correctamente.");
    } catch (error) {
      console.error("Error registrando crédito:", error);
      alert(error.message || "No se pudo registrar el movimiento.");
    }
  };

  const anularCreditoProfesor = async (movimiento) => {
    const confirmado = window.confirm(
      "¿Deseas anular este movimiento de crédito?"
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const res = await fetch(
        `${API_URL}/api/profesores/creditos/${movimiento.id}/anular`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: institucionId,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || "No se pudo anular"
        );
      }

      await cargarProfesores();
      await cargarCreditosProfesores(profesorDetalle?.id || "");
      setProfesorDetalle((prev) =>
        prev
          ? {
              ...prev,
              saldo: data.saldo,
            }
          : prev
      );

      alert("Movimiento anulado correctamente.");
    } catch (error) {
      console.error("Error anulando crédito:", error);
      alert(error.message || "No se pudo anular el movimiento.");
    }
  };

  const exportarCreditosProfesores = () => {
    const lista = creditosProfesoresFiltrados;

    if (!lista.length) {
      alert("No hay movimientos de crédito para exportar.");
      return;
    }

    const encabezados = [
      "Profesor",
      "Cédula",
      "Comercio",
      "Usuario que hizo el pago",
      "Tipo",
      "Monto",
      "Saldo anterior",
      "Saldo nuevo",
      "Fecha",
      "Estado",
      "Observación",
    ];

    const filas = lista.map((movimiento) => [
      `${movimiento.nombres || ""} ${
        movimiento.apellidos || ""
      }`.trim(),
      movimiento.cedula || "",
      movimiento.comercio || "POS NUBE",
      movimiento.usuario_nombre ||
        movimiento.usuario_correo ||
        "Sistema",
      movimiento.tipo || "",
      Number(movimiento.monto || 0).toFixed(2),
      Number(movimiento.saldo_anterior || 0).toFixed(2),
      Number(movimiento.saldo_nuevo || 0).toFixed(2),
      formatearFechaHora(movimiento.created_at),
      movimiento.estado || "",
      movimiento.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((valor) =>
            `"${String(valor ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\\n");

    const blob = new Blob(["\\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creditos_profesores_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const cargarProfesores = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        setProfesores([]);
        return;
      }

      const res = await fetch(
        `${API_URL}/api/profesores?institucion_id=${institucionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Error backend profesores:", data);
        setProfesores([]);
        return;
      }

      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data.profesores)
        ? data.profesores
        : [];

      setProfesores(lista);

      setProfesorDetalle((detalleActual) => {
        if (!detalleActual) return null;

        return (
          lista.find(
            (profesor) =>
              Number(profesor.id) === Number(detalleActual.id)
          ) || null
        );
      });
    } catch (error) {
      console.error("Error cargando profesores:", error);
      setProfesores([]);
    }
  };

  const guardarProfesor = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const saldoNumero = Number(profesorForm.saldo || 0);

      if (Number.isNaN(saldoNumero) || saldoNumero < 0) {
        alert("El crédito debe ser un número válido mayor o igual a 0.");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        cedula: profesorForm.cedula.trim(),
        nombres: profesorForm.nombres.trim(),
        apellidos: profesorForm.apellidos.trim(),
        email: profesorForm.email.trim(),
        codigo: profesorForm.codigo.trim(),
        telefono: profesorForm.telefono.trim(),
        saldo: saldoNumero,
        es_profesor: profesorForm.es_profesor !== false,
      };

      const url = editandoProfesorId
        ? `${API_URL}/api/profesores/${editandoProfesorId}`
        : `${API_URL}/api/profesores`;

      const res = await fetch(url, {
        method: editandoProfesorId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.message ||
            (editandoProfesorId
              ? "No se pudo actualizar el profesor"
              : "No se pudo crear el profesor")
        );
        return;
      }

      limpiarFormularioProfesor();
      setMostrarFormularioProfesor(false);
      await cargarProfesores();

      alert(
        editandoProfesorId
          ? "Profesor actualizado correctamente"
          : "Profesor creado correctamente"
      );
    } catch (error) {
      console.error("Error guardando profesor:", error);
      alert("No se pudo guardar el profesor");
    }
  };

  const desactivarProfesor = async (profesor) => {
    const confirmado = window.confirm(
      `¿Deseas desactivar al profesor ${profesor.nombres || ""} ${
        profesor.apellidos || ""
      }?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/profesores/${profesor.id}/desactivar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "No se pudo desactivar el profesor");
        return;
      }

      if (
        profesorDetalle &&
        Number(profesorDetalle.id) === Number(profesor.id)
      ) {
        setProfesorDetalle(null);
      }

      await cargarProfesores();
      alert("Profesor desactivado correctamente");
    } catch (error) {
      console.error("Error desactivando profesor:", error);
      alert("No se pudo desactivar el profesor");
    }
  };

  const reactivarProfesor = async (profesor) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/profesores/${profesor.id}/reactivar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "No se pudo reactivar el profesor");
        return;
      }

      await cargarProfesores();
      alert("Profesor reactivado correctamente");
    } catch (error) {
      console.error("Error reactivando profesor:", error);
      alert("No se pudo reactivar el profesor");
    }
  };

  const cargarRecargas = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) return;

      const res = await fetch(
        `${API_URL}/api/recargas?institucion_id=${institucionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setRecargas(Array.isArray(data) ? data : []);
      } else {
        setRecargas([]);
      }
    } catch (error) {
      console.error("Error cargando recargas:", error);
      setRecargas([]);
    }
  };

  const cargarCuentasBancarias = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        setCuentasBancarias([]);
        return;
      }

      const res = await fetch(
        `${API_URL}/api/configuracion/cuentas-bancarias?institucion_id=${institucionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      setCuentasBancarias(
        res.ok && Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error("Error cargando cuentas bancarias:", error);
      setCuentasBancarias([]);
    }
  };

  const cargarVentas = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) return;

      const res = await fetch(
        `${API_URL}/api/ventas?institucion_id=${institucionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setVentas(Array.isArray(data) ? data : []);
      } else {
        setVentas([]);
      }
    } catch (error) {
      console.error("Error cargando ventas:", error);
      setVentas([]);
    }
  };

  const obtenerVentasParaReporteProductos = (filtros) => {
    let lista = [...ventasEnriquecidas];

    if (filtros.fecha_inicio) {
      lista = lista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha >= filtros.fecha_inicio;
      });
    }

    if (filtros.fecha_fin) {
      lista = lista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha <= filtros.fecha_fin;
      });
    }

    if (filtros.operador) {
      lista = lista.filter(
        (venta) =>
          String(venta.operador_visual || "") ===
          String(filtros.operador)
      );
    }

    if (filtros.ubicacion) {
      const ubicacionFiltro = String(filtros.ubicacion || "")
        .trim()
        .toUpperCase();

      lista = lista.filter((venta) => {
        const ubicacionVenta = String(
          venta.ubicacion_visual ||
          venta.ubicacion ||
          "PRINCIPAL"
        )
          .trim()
          .toUpperCase();

        return ubicacionVenta === ubicacionFiltro;
      });
    }

    return lista;
  };

  const construirResumenProductosVendidos = (listaVentas) => {
    const mapa = {};

    listaVentas.forEach((venta) => {
      const items = Array.isArray(venta.items) ? venta.items : [];

      items.forEach((item) => {
        const productoId =
          item.producto_id ||
          item.id ||
          item.codigo ||
          item.nombre ||
          "producto";

        const clave = String(productoId);
        const nombre =
          item.producto_nombre ||
          item.nombre ||
          item.descripcion ||
          "Producto";

        if (!mapa[clave]) {
          mapa[clave] = {
            id: clave,
            producto_id: item.producto_id || item.id || null,
            nombre,
            codigo:
              item.codigo ||
              item.producto_codigo ||
              item.producto_id ||
              "-",
            categoria: item.categoria || "-",
            descripcion:
              item.descripcion ||
              item.producto_nombre ||
              item.nombre ||
              "-",
            cantidad: 0,
            total: 0,
          };
        }

        mapa[clave].cantidad += Number(item.cantidad || 0);
        mapa[clave].total += Number(
          item.total ||
            Number(item.cantidad || 0) *
              Number(item.precio_unitario || item.precio || 0)
        );
      });
    });

    return Object.values(mapa);
  };

  const consultarProductos = () => {
    const filtrosConsulta = {
      ...productosFiltros,
      ubicacion: String(productosFiltros.ubicacion || "")
        .trim()
        .toUpperCase(),
    };

    const ventasFiltradasReporte =
      obtenerVentasParaReporteProductos(filtrosConsulta);

    const vendidos =
      construirResumenProductosVendidos(ventasFiltradasReporte);

    if (productosFiltros.comprado === "NO") {
      const idsVendidos = new Set(
        vendidos.map((item) => String(item.producto_id || item.id))
      );

      const noVendidos = productosActivos
        .filter(
          (producto) =>
            !idsVendidos.has(String(producto.id))
        )
        .map((producto) => ({
          id: `no-vendido-${producto.id}`,
          producto_id: producto.id,
          nombre: producto.nombre || "Producto",
          codigo: producto.codigo || producto.id || "-",
          categoria: producto.categoria || "-",
          descripcion: producto.descripcion || "-",
          cantidad: 0,
          total: 0,
        }));

      setProductosVendidos(noVendidos);
      return;
    }

    setProductosVendidos(vendidos);
  };

  const consultarProductosPorDia = () => {
    const ventasFiltradasReporte =
      obtenerVentasParaReporteProductos({
        ...productosPorDiaFiltros,
        operador: "",
      });

    const mapa = {};

    ventasFiltradasReporte.forEach((venta) => {
      const items = Array.isArray(venta.items) ? venta.items : [];
      const fecha = venta.fecha_base
        ? new Date(venta.fecha_base)
        : null;
      const dia =
        fecha && !Number.isNaN(fecha.getTime())
          ? fecha.getDay()
          : null;

      items.forEach((item) => {
        const productoId =
          item.producto_id ||
          item.id ||
          item.nombre ||
          "producto";
        const clave = String(productoId);
        const nombre =
          item.producto_nombre ||
          item.nombre ||
          item.descripcion ||
          "Producto";

        if (!mapa[clave]) {
          mapa[clave] = {
            id: clave,
            producto_id: item.producto_id || item.id || null,
            producto: nombre,
            categoria: item.categoria || "-",
            domingo: 0,
            lunes: 0,
            martes: 0,
            miercoles: 0,
            jueves: 0,
            viernes: 0,
            sabado: 0,
          };
        }

        const cantidad = Number(item.cantidad || 0);

        if (dia === 0) mapa[clave].domingo += cantidad;
        if (dia === 1) mapa[clave].lunes += cantidad;
        if (dia === 2) mapa[clave].martes += cantidad;
        if (dia === 3) mapa[clave].miercoles += cantidad;
        if (dia === 4) mapa[clave].jueves += cantidad;
        if (dia === 5) mapa[clave].viernes += cantidad;
        if (dia === 6) mapa[clave].sabado += cantidad;
      });
    });

    let resultado = Object.values(mapa);

    if (productosPorDiaFiltros.comprado === "NO") {
      const idsVendidos = new Set(
        resultado.map((item) =>
          String(item.producto_id || item.id)
        )
      );

      resultado = productosActivos
        .filter(
          (producto) =>
            !idsVendidos.has(String(producto.id))
        )
        .map((producto) => ({
          id: `no-vendido-${producto.id}`,
          producto_id: producto.id,
          producto: producto.nombre || "Producto",
          categoria: producto.categoria || "-",
          domingo: 0,
          lunes: 0,
          martes: 0,
          miercoles: 0,
          jueves: 0,
          viernes: 0,
          sabado: 0,
        }));
    }

    setProductosVendidosPorDia(resultado);
  };

  const descargarCsv = (nombreArchivo, encabezados, filas) => {
    if (!filas.length) {
      alert("No hay información para exportar.");
      return;
    }

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((valor) =>
            `"${String(valor ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  };

  const exportarProductosVendidos = () => {
    if (!productosVendidos.length) {
      alert("No hay productos vendidos para exportar.");
      return;
    }

    const datos = productosVendidos.map((producto) => ({
      "Nombre": producto.nombre || "",
      "Código": producto.codigo || "",
      "Categoría": producto.categoria || "",
      "Descripción": producto.descripcion || "",
      "Cantidad": Number(producto.cantidad || 0),
      "Total de ventas": Number(producto.total || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 22 },
      { wch: 38 },
      { wch: 12 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Productos vendidos"
    );

    XLSX.writeFile(
      workbook,
      `productos_vendidos_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  const exportarProductosVendidosPdf = () => {
    if (!productosVendidos.length) {
      alert("No hay productos vendidos para exportar.");
      return;
    }

    const limpiarPdf = (valor) =>
      String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/[()\\]/g, (m) => `\\${m}`);

    const cortar = (valor, maximo) =>
      String(valor ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maximo);

    const fechaReporte = new Date().toLocaleString("es-EC");
    const filtrosUsados = [
      productosFiltros.fecha_inicio
        ? `Desde: ${productosFiltros.fecha_inicio}`
        : "",
      productosFiltros.fecha_fin
        ? `Hasta: ${productosFiltros.fecha_fin}`
        : "",
      productosFiltros.operador
        ? `Operador: ${productosFiltros.operador}`
        : "Operador: Todos",
      productosFiltros.ubicacion
        ? `Ubicacion: ${productosFiltros.ubicacion}`
        : "Ubicacion: Todas",
      productosFiltros.comprado
        ? `Comprado: ${productosFiltros.comprado}`
        : "Comprado: Todos",
    ]
      .filter(Boolean)
      .join(" | ");

    const lineas = [
      "POS NUBE - REPORTE DE PRODUCTOS VENDIDOS",
      `Institucion: ${institucionActiva?.nombre || "POS NUBE"}`,
      `Generado: ${fechaReporte}`,
      filtrosUsados,
      `Total productos: ${productosVendidos.length}`,
      "------------------------------------------------------------------------------------------------",
      "Nombre                    Codigo       Categoria            Cantidad      Total",
      "------------------------------------------------------------------------------------------------",
    ];

    let totalCantidad = 0;
    let totalVentas = 0;

    productosVendidos.forEach((producto) => {
      const cantidad = Number(producto.cantidad || 0);
      const total = Number(producto.total || 0);

      totalCantidad += cantidad;
      totalVentas += total;

      lineas.push(
        [
          cortar(producto.nombre || "-", 25).padEnd(25, " "),
          cortar(producto.codigo || "-", 12).padEnd(12, " "),
          cortar(producto.categoria || "-", 20).padEnd(20, " "),
          String(cantidad).padStart(8, " "),
          `$${total.toFixed(2)}`.padStart(12, " "),
        ].join(" ")
      );

      if (producto.descripcion) {
        lineas.push(
          `  Descripcion: ${cortar(producto.descripcion, 75)}`
        );
      }
    });

    lineas.push(
      "------------------------------------------------------------------------------------------------"
    );
    lineas.push(
      `TOTAL CANTIDAD: ${totalCantidad}     TOTAL VENTAS: $${totalVentas.toFixed(2)}`
    );

    const pageWidth = 792;
    const pageHeight = 612;
    const marginLeft = 34;
    const startY = 575;
    const lineHeight = 11;
    const linesPerPage = 46;
    const paginas = [];

    for (let i = 0; i < lineas.length; i += linesPerPage) {
      paginas.push(lineas.slice(i, i + linesPerPage));
    }

    const objetos = [];
    const agregarObjeto = (contenido) => {
      objetos.push(contenido);
      return objetos.length;
    };

    const fontObj = agregarObjeto(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"
    );

    const pageRefs = [];

    paginas.forEach((lineasPagina) => {
      let stream = "BT\n/F1 8 Tf\n";
      let y = startY;

      lineasPagina.forEach((linea) => {
        stream += `1 0 0 1 ${marginLeft} ${y} Tm (${limpiarPdf(
          linea
        )}) Tj\n`;
        y -= lineHeight;
      });

      stream += "ET";

      const streamObj = agregarObjeto(
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
      );

      const pageObj = agregarObjeto(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
          `/Resources << /Font << /F1 ${fontObj} 0 R >> >> ` +
          `/Contents ${streamObj} 0 R >>`
      );

      pageRefs.push(pageObj);
    });

    const pagesObj = agregarObjeto(
      `<< /Type /Pages /Kids [${pageRefs
        .map((n) => `${n} 0 R`)
        .join(" ")}] /Count ${pageRefs.length} >>`
    );

    pageRefs.forEach((pageObj) => {
      objetos[pageObj - 1] = objetos[pageObj - 1].replace(
        "/Parent 0 0 R",
        `/Parent ${pagesObj} 0 R`
      );
    });

    const catalogObj = agregarObjeto(
      `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`
    );

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objetos.forEach((objeto, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${objeto}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });

    pdf +=
      `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogObj} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], {
      type: "application/pdf",
    });

    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `productos_vendidos_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  };

  const exportarProductosVendidosPorDia = () => {
    if (!productosVendidosPorDia.length) {
      alert("No hay productos vendidos por día para exportar.");
      return;
    }

    const datos = productosVendidosPorDia.map((producto) => ({
      "Producto": producto.producto || "",
      "Categoría": producto.categoria || "",
      "Domingo": Number(producto.domingo || 0),
      "Lunes": Number(producto.lunes || 0),
      "Martes": Number(producto.martes || 0),
      "Miércoles": Number(producto.miercoles || 0),
      "Jueves": Number(producto.jueves || 0),
      "Viernes": Number(producto.viernes || 0),
      "Sábado": Number(producto.sabado || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);

    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Productos por día"
    );

    XLSX.writeFile(
      workbook,
      `productos_vendidos_por_dia_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  const exportarProductosVendidosPorDiaPdf = () => {
    if (!productosVendidosPorDia.length) {
      alert("No hay productos vendidos por día para exportar.");
      return;
    }

    const limpiarPdf = (valor) =>
      String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/[()\\]/g, (m) => `\\${m}`);

    const cortar = (valor, maximo) =>
      String(valor ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maximo);

    const fechaReporte = new Date().toLocaleString("es-EC");

    const filtrosUsados = [
      productosPorDiaFiltros.fecha_inicio
        ? `Desde: ${productosPorDiaFiltros.fecha_inicio}`
        : "",
      productosPorDiaFiltros.fecha_fin
        ? `Hasta: ${productosPorDiaFiltros.fecha_fin}`
        : "",
      productosPorDiaFiltros.ubicacion
        ? `Ubicacion: ${productosPorDiaFiltros.ubicacion}`
        : "Ubicacion: Todas",
      productosPorDiaFiltros.comprado
        ? `Comprado: ${productosPorDiaFiltros.comprado}`
        : "Comprado: Todos",
    ]
      .filter(Boolean)
      .join(" | ");

    const lineas = [
      "POS NUBE - REPORTE DE PRODUCTOS VENDIDOS POR DIA",
      `Institucion: ${institucionActiva?.nombre || "POS NUBE"}`,
      `Generado: ${fechaReporte}`,
      filtrosUsados,
      `Total productos: ${productosVendidosPorDia.length}`,
      "--------------------------------------------------------------------------------------------------------------",
      "Producto              Categoria          Dom  Lun  Mar  Mie  Jue  Vie  Sab  Total",
      "--------------------------------------------------------------------------------------------------------------",
    ];

    let totalGeneral = 0;

    productosVendidosPorDia.forEach((producto) => {
      const dias = [
        Number(producto.domingo || 0),
        Number(producto.lunes || 0),
        Number(producto.martes || 0),
        Number(producto.miercoles || 0),
        Number(producto.jueves || 0),
        Number(producto.viernes || 0),
        Number(producto.sabado || 0),
      ];

      const totalProducto = dias.reduce(
        (acumulado, cantidad) => acumulado + cantidad,
        0
      );

      totalGeneral += totalProducto;

      lineas.push(
        [
          cortar(producto.producto || "-", 21).padEnd(21, " "),
          cortar(producto.categoria || "-", 18).padEnd(18, " "),
          ...dias.map((cantidad) =>
            String(cantidad).padStart(4, " ")
          ),
          String(totalProducto).padStart(6, " "),
        ].join(" ")
      );
    });

    lineas.push(
      "--------------------------------------------------------------------------------------------------------------"
    );

    lineas.push(
      `TOTAL UNIDADES VENDIDAS: ${totalGeneral}`
    );

    const pageWidth = 792;
    const pageHeight = 612;
    const marginLeft = 28;
    const startY = 578;
    const lineHeight = 11;
    const linesPerPage = 46;
    const paginas = [];

    for (let i = 0; i < lineas.length; i += linesPerPage) {
      paginas.push(lineas.slice(i, i + linesPerPage));
    }

    const objetos = [];

    const agregarObjeto = (contenido) => {
      objetos.push(contenido);
      return objetos.length;
    };

    const fontObj = agregarObjeto(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"
    );

    const pageRefs = [];

    paginas.forEach((lineasPagina) => {
      let stream = "BT\n/F1 8 Tf\n";
      let y = startY;

      lineasPagina.forEach((linea) => {
        stream += `1 0 0 1 ${marginLeft} ${y} Tm (${limpiarPdf(
          linea
        )}) Tj\n`;

        y -= lineHeight;
      });

      stream += "ET";

      const streamObj = agregarObjeto(
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
      );

      const pageObj = agregarObjeto(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
          `/Resources << /Font << /F1 ${fontObj} 0 R >> >> ` +
          `/Contents ${streamObj} 0 R >>`
      );

      pageRefs.push(pageObj);
    });

    const pagesObj = agregarObjeto(
      `<< /Type /Pages /Kids [${pageRefs
        .map((numero) => `${numero} 0 R`)
        .join(" ")}] /Count ${pageRefs.length} >>`
    );

    pageRefs.forEach((pageObj) => {
      objetos[pageObj - 1] = objetos[pageObj - 1].replace(
        "/Parent 0 0 R",
        `/Parent ${pagesObj} 0 R`
      );
    });

    const catalogObj = agregarObjeto(
      `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`
    );

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objetos.forEach((objeto, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${objeto}\nendobj\n`;
    });

    const xrefOffset = pdf.length;

    pdf += `xref\n0 ${objetos.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });

    pdf +=
      `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogObj} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob(
      [pdf],
      { type: "application/pdf" }
    );

    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = `productos_vendidos_por_dia_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  };

  const cargarGaleriaProductos = async () => {
    if (!["ADMIN","SUPER_ADMIN"].includes(rolActual)) return [];
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();
    if (!token || !institucionId) return [];
    setCargandoGaleria(true);
    try {
      const res = await fetch(`${API_URL}/api/productos/galeria?institucion_id=${institucionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      const propias = res.ok && Array.isArray(data) ? data : [];
      setGaleriaProductos(propias);
      return propias;
    } catch (error) {
      console.error("Error cargando galería:", error);
      return [];
    } finally {
      setCargandoGaleria(false);
    }
  };

  const subirFotoGaleria = async (archivo) => {
    if (!["ADMIN","SUPER_ADMIN"].includes(rolActual) || !archivo) return;
    const permitidos = ["image/jpeg","image/png","image/webp"];
    if (!permitidos.includes(String(archivo.type || "").toLowerCase())) {
      alert("Formato no permitido. Usa JPG, JPEG, PNG o WEBP."); return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      alert("La imagen supera 2 MB."); return;
    }
    const lector = new FileReader();
    lector.onload = async () => {
      const nombre = window.prompt("Nombre para esta foto en la galería:", archivo.name.replace(/\.[^.]+$/, ""));
      if (!nombre) return;
      try {
        const token = localStorage.getItem("token");
        const institucionId = obtenerInstitucionActivaId();
        const res = await fetch(`${API_URL}/api/productos/galeria`, {
          method:"POST",
          headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
          body:JSON.stringify({institucion_id:Number(institucionId),nombre:String(nombre).trim(),imagen:String(lector.result||"")}),
        });
        const data = await res.json().catch(()=>({}));
        if(!res.ok){alert(data.message||data.error||"No se pudo guardar la foto");return;}
        await cargarGaleriaProductos();
      } catch(error){console.error(error);alert("No se pudo guardar la foto");}
    };
    lector.readAsDataURL(archivo);
  };

  const eliminarFotoGaleria = async (foto) => {
    if (!foto?.id || foto?.base || !window.confirm(`¿Eliminar de la galería ${foto.nombre || "esta foto"}?`)) return;
    try {
      const token=localStorage.getItem("token");
      const institucionId=obtenerInstitucionActivaId();
      const res=await fetch(`${API_URL}/api/productos/galeria/${foto.id}?institucion_id=${institucionId}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){alert(data.message||data.error||"No se pudo eliminar");return;}
      await cargarGaleriaProductos();
    } catch(error){console.error(error);alert("No se pudo eliminar la foto");}
  };

    const crearProducto = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const res = await fetch(`${API_URL}/api/productos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id:Number(institucionId),
          jornada_id:Number(jornadaActiva?.id),
          nombre:productoForm.nombre,
          codigo:productoForm.codigo||null,
          descripcion:productoForm.descripcion,
          precio: Number(productoForm.precio || 0),
          stock: Number(productoForm.stock || 0),
          stock_minimo:Number(productoForm.stock_minimo||0),
          categoria:productoForm.categoria,
          imagen:productoForm.imagen||null,
          concepto_inicial:"COMPRA",
          observacion_inicial:"Producto creado desde Menú Cafetería",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error creando producto");
        return;
      }

      limpiarFormularioProducto();
      await cargarProductos();
      alert("Producto creado correctamente");
    } catch (error) {
      console.error("Error creando producto:", error);
      alert("No se pudo crear el producto");
    }
  };

  const actualizarProducto = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      // La pantalla nueva de Menú Cafetería trabaja con productoEditando.
      // Se conserva editandoProductoId como respaldo para no romper flujos antiguos.
      const productoId = Number(
        productoEditando?.id || editandoProductoId || 0
      );

      if (!token || !institucionId || !productoId) {
        alert("No se puede actualizar el producto");
        return;
      }

      const productoActual =
        productos.find((p) => Number(p.id) === productoId) ||
        productoEditando ||
        null;

      const precioNuevo = Number(productoForm.precio);

      if (!String(productoForm.nombre || "").trim()) {
        alert("El nombre del producto es obligatorio");
        return;
      }

      if (!Number.isFinite(precioNuevo) || precioNuevo < 0) {
        alert("Ingresa un precio válido");
        return;
      }

      // IMPORTANTE:
      // Desde Menú Cafetería se actualizan únicamente los datos comerciales.
      // NO enviamos stock ni stock_minimo para no alterar las existencias
      // de BAR PRINCIPAL, KIOSKO u otros puntos.
      const payload = {
        institucion_id: Number(institucionId),
        nombre: String(productoForm.nombre || "").trim(),
        codigo: String(productoForm.codigo || "").trim() || null,
        precio: precioNuevo,
        categoria: String(productoForm.categoria || "").trim() || null,
        imagen: productoForm.imagen || null,
        activo: productoActual?.activo ?? true,
      };

      const res = await fetch(`${API_URL}/api/productos/${productoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || data.message || "Error actualizando producto");
        return;
      }

      setProductoEditando(null);
      setEditandoProductoId(null);
      setMostrarFormularioProducto(false);
      setProductoForm({
        nombre: "",
        codigo: "",
        precio: "",
        categoria: "",
        stock: "",
        imagen: "",
        activo: true,
      });

      await Promise.all([
        cargarProductos(),
        cargarExistenciasInventario(),
      ]);

      alert("Producto actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando producto:", error);
      alert(error?.message || "No se pudo actualizar el producto");
    }
  };


  const eliminarProducto = async (producto) => {
    const confirmado = window.confirm(
      `¿Deseas eliminar el producto ${producto.nombre || ""}?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no válida");
        return;
      }

      const res = await fetch(`${API_URL}/api/productos/${producto.id}/desactivar`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error eliminando producto");
        return;
      }

      if (editandoProductoId === producto.id) {
        limpiarFormularioProducto();
      }

      await cargarProductos();
      alert("Producto eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando producto:", error);
      alert("No se pudo eliminar el producto");
    }
  };

  const restaurarProducto = async (producto) => {
    const confirmado = window.confirm(
      `¿Deseas restaurar el producto ${producto.nombre || ""}?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión no válida");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: Number(producto.precio || 0),
        stock: Number(producto.stock || 0),
        stock_minimo: Number(producto.stock_minimo || 0),
        categoria: producto.categoria || "",
        activo: true,
      };

      const res = await fetch(`${API_URL}/api/productos/${producto.id}/reactivar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error restaurando producto");
        return;
      }

      await cargarProductos();
      alert("Producto restaurado correctamente");
    } catch (error) {
      console.error("Error restaurando producto:", error);
      alert("No se pudo restaurar el producto");
    }
  };

  const aplicarMovimientoInventario = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no válida");
        return;
      }

      if (!inventarioForm.producto_id || inventarioForm.cantidad === "") {
        alert("Debes seleccionar un producto y una cantidad");
        return;
      }

      const producto = productos.find(
        (p) => String(p.id) === String(inventarioForm.producto_id)
      );

      if (!producto) {
        alert("Producto no encontrado");
        return;
      }

      const cantidad = Number(inventarioForm.cantidad || 0);
      const stockActual = Number(producto.stock || 0);
      const institucionId = obtenerInstitucionActivaId();

      if (!institucionId) {
        alert("Institución no válida");
        return;
      }

      if (Number.isNaN(cantidad) || cantidad < 0) {
        alert("La cantidad no es válida");
        return;
      }

      let nuevoStock = stockActual;

      if (inventarioForm.tipo === "ENTRADA") {
        if (cantidad <= 0) {
          alert("La cantidad debe ser mayor a 0");
          return;
        }
        nuevoStock = stockActual + cantidad;
      }

      if (inventarioForm.tipo === "SALIDA") {
        if (cantidad <= 0) {
          alert("La cantidad debe ser mayor a 0");
          return;
        }
        nuevoStock = stockActual - cantidad;

        if (nuevoStock < 0) {
          alert("No puedes dejar el stock en negativo");
          return;
        }
      }

      if (inventarioForm.tipo === "AJUSTE") {
        nuevoStock = cantidad;
      }

      const payload = {
        institucion_id: Number(institucionId),
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: Number(producto.precio || 0),
        stock: nuevoStock,
        stock_minimo: Number(producto.stock_minimo || 0),
        categoria: producto.categoria || "",
        activo: producto.activo,
      };

      const res = await fetch(`${API_URL}/api/productos/${producto.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error actualizando inventario");
        return;
      }

      const nombreMovimiento = producto.nombre || "Producto";

      await registrarMovimientoKardex({
        productoId: producto.id,
        tipo:
          inventarioForm.tipo === "ENTRADA"
            ? "INGRESO"
            : inventarioForm.tipo === "SALIDA"
            ? "EGRESO"
            : "AJUSTE",
        cantidad:
          inventarioForm.tipo === "AJUSTE"
            ? Math.abs(nuevoStock - stockActual)
            : cantidad,
        motivo:
          inventarioForm.motivo?.trim() ||
          (inventarioForm.tipo === "ENTRADA"
            ? "Ingreso manual"
            : inventarioForm.tipo === "SALIDA"
            ? "Salida manual"
            : "Ajuste de stock"),
        stockAnterior: stockActual,
        stockNuevo: nuevoStock,
        ubicacion: "PRINCIPAL",
      });

      setInventarioForm({
        producto_id: "",
        tipo: "ENTRADA",
        cantidad: "",
        motivo: "",
      });

      await cargarProductos();
      alert(
        `${nombreMovimiento}: stock anterior ${stockActual}, movimiento ${inventarioForm.tipo} ${cantidad}, stock nuevo ${nuevoStock}`
      );
    } catch (error) {
      console.error("Error actualizando inventario:", error);
      alert("No se pudo actualizar el inventario");
    }
  };

  const crearAlumno = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        cedula: alumnoForm.cedula,
        nombres: alumnoForm.nombres,
        apellidos: alumnoForm.apellidos,
        curso: alumnoForm.curso,
        paralelo: alumnoForm.paralelo,
        // saldo no se envía: todo alumno nuevo inicia en $0.00,
      };

      const res = await fetch(`${API_URL}/api/alumnos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error creando alumno");
        return;
      }

      limpiarFormularioAlumno();
      await cargarAlumnos();
      setFiltroAlumnos("todos");
      alert("Alumno creado correctamente");
    } catch (error) {
      console.error("Error creando alumno:", error);
      alert("No se pudo crear el alumno");
    }
  };

  const actualizarAlumno = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId || !editandoAlumnoId) {
        alert("No se puede actualizar el alumno");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        cedula: alumnoForm.cedula,
        nombres: alumnoForm.nombres,
        apellidos: alumnoForm.apellidos,
        curso: alumnoForm.curso,
        paralelo: alumnoForm.paralelo,
        // saldo no se envía: el saldo solo cambia mediante recargas/consumos,
      };

      const res = await fetch(`${API_URL}/api/alumnos/${editandoAlumnoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error actualizando alumno");
        return;
      }

      limpiarFormularioAlumno();
      await cargarAlumnos();
      alert("Alumno actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando alumno:", error);
      alert("No se pudo actualizar el alumno");
    }
  };

  const iniciarEdicionAlumno = (alumno) => {
    setEditandoAlumnoId(alumno.id);
    setAlumnoForm({
      cedula: obtenerCedulaAlumno(alumno),
      nombres: alumno.nombres || "",
      apellidos: alumno.apellidos || "",
      curso: alumno.curso || "",
      paralelo: alumno.paralelo || "",
      saldo: "",
    });
    setVista("alumnos");
  };

  const eliminarAlumno = async (alumno) => {
    const confirmado = window.confirm(
      `¿Deseas eliminar al alumno ${alumno.nombres || ""} ${alumno.apellidos || ""}?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no válida");
        return;
      }

      const res = await fetch(`${API_URL}/api/alumnos/${alumno.id}/desactivar`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error eliminando alumno");
        return;
      }

      if (editandoAlumnoId === alumno.id) {
        limpiarFormularioAlumno();
      }

      await cargarAlumnos();
      alert("Alumno eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando alumno:", error);
      alert("No se pudo eliminar el alumno");
    }
  };

  const restaurarAlumno = async (alumno) => {
    const confirmado = window.confirm(
      `¿Deseas restaurar al alumno ${alumno.nombres || ""} ${alumno.apellidos || ""}?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión no válida");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        cedula: obtenerCedulaAlumno(alumno),
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        curso: alumno.curso,
        paralelo: alumno.paralelo,
        correo: alumno.correo,
        saldo: Number(alumno.saldo || 0),
        activo: true,
      };

      const res = await fetch(`${API_URL}/api/alumnos/${alumno.id}/reactivar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error restaurando alumno");
        return;
      }

      await cargarAlumnos();
      alert("Alumno restaurado correctamente");
    } catch (error) {
      console.error("Error restaurando alumno:", error);
      alert("No se pudo restaurar el alumno");
    }
  };

  const crearRecarga = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      if (!recargaForm.alumno_id || Number(recargaForm.monto || 0) <= 0) {
        alert("Debes seleccionar un alumno y registrar un monto válido.");
        return;
      }

      if (recargaForm.metodo_pago === "TRANSFERENCIA") {
        if (!String(recargaForm.fecha_transferencia || "").trim()) {
          alert("Debes ingresar la fecha en que se realizó la transferencia.");
          return;
        }

        if (!String(recargaForm.numero_comprobante || "").trim()) {
          alert("Debes ingresar el No. de comprobante de la transferencia.");
          return;
        }
      }

      const payload = {
        institucion_id: Number(institucionId),
        alumno_id: Number(recargaForm.alumno_id),
        monto: Number(recargaForm.monto || 0),
        metodo_pago: recargaForm.metodo_pago,
        numero_comprobante:
          recargaForm.metodo_pago === "TRANSFERENCIA"
            ? String(recargaForm.numero_comprobante || "").trim()
            : null,
        fecha_transferencia:
          recargaForm.metodo_pago === "TRANSFERENCIA"
            ? String(recargaForm.fecha_transferencia || "").trim()
            : null,
        observacion: recargaForm.observacion,
      };

      const res = await fetch(`${API_URL}/api/recargas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error creando recarga");
        return;
      }

      limpiarFormularioRecarga();
      await cargarRecargas();
      await cargarAlumnos();
      await cargarResumen();
      alert("Recarga registrada correctamente");
    } catch (error) {
      console.error("Error creando recarga:", error);
      alert("No se pudo registrar la recarga");
    }
  };

  const escaparHtmlTicket = (valor) =>
    String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const imprimirCierreCaja = async (cierre) => {
    if (!cierre) {
      alert("No existen datos del cierre para imprimir.");
      return;
    }

    const montoTicket = (valor) => Number(valor || 0);
    const monedaTicket = (valor) => {
      const numero = Number(valor || 0);
      return numero < 0
        ? `-$${Math.abs(numero).toFixed(2)}`
        : `$${numero.toFixed(2)}`;
    };
    const recargaEfectivoTicket = montoTicket(cierre.recargas_efectivo);
    const recargaTransferenciaTicket = montoTicket(cierre.recargas_transferencia);
    const ventasEfectivoTicket = montoTicket(cierre.ventas_efectivo);
    const ventasTransferenciaTicket = montoTicket(cierre.ventas_transferencia);
    const ventasSaldoTicket = montoTicket(cierre.ventas_saldo);
    const ventasCreditoTicket = montoTicket(cierre.ventas_credito);
    const ventasTarjetaHistoricaTicket = montoTicket(cierre.ventas_tarjeta);
    const egresosTicket = montoTicket(cierre.egresos_total);
    const contadoTicket = montoTicket(cierre.efectivo_contado);
    const subtotalRecargasTicket = recargaEfectivoTicket + recargaTransferenciaTicket;
    const subtotalVentasTicket =
      ventasEfectivoTicket +
      ventasTransferenciaTicket +
      ventasSaldoTicket +
      ventasCreditoTicket +
      ventasTarjetaHistoricaTicket;
    const efectivoEsperadoTicket =
      ventasEfectivoTicket + recargaEfectivoTicket - egresosTicket;
    const diferenciaEfectivoTicket = contadoTicket - efectivoEsperadoTicket;
    const granTotalTicket = subtotalRecargasTicket + subtotalVentasTicket;
    const estadoTicket = String(cierre.estado_cierre || "CERRADA").toUpperCase();
    const fechaOperativaTicket = formatearSoloFecha(cierre.fecha);
    const fechaCierreTicket =
      cierre.fecha_cierre_ecuador ||
      formatearSoloFecha(cierre.periodo_hasta || cierre.created_at || cierre.fecha);
    const horaCierreTicket =
      cierre.hora_cierre_ecuador ||
      formatearSoloHora(cierre.periodo_hasta || cierre.created_at);
    const signoDiferenciaTicket =
      Math.abs(diferenciaEfectivoTicket) < 0.005
        ? "CUADRADO"
        : diferenciaEfectivoTicket > 0
        ? "SOBRA"
        : "FALTA";
    const textoCompactoCierre = [
      "CIERRE DE CAJA",
      institucionActiva?.nombre || cierre.institucion_nombre || "POS NUBE",
      `Codigo: ${obtenerCodigoCierre(cierre)}`,
      `Ubicacion: ${cierre.punto_nombre || "PRINCIPAL"}`,
      `Jornada: #${cierre.jornada_id || "-"}`,
      `Fecha operativa: ${fechaOperativaTicket}`,
      `Cierre: ${fechaCierreTicket} ${horaCierreTicket}`,
      `Estado: ${estadoTicket}`,
      `Usuario: ${cierre.usuario_nombre || cierre.usuario_correo || usuario?.correo || usuario?.nombre || "Administrador"}`,
      "------------------------------",
      "RECARGAS",
      `Efectivo: ${monedaTicket(recargaEfectivoTicket)}`,
      `Transferencia: ${monedaTicket(recargaTransferenciaTicket)}`,
      `SUBTOTAL RECARGAS: ${monedaTicket(subtotalRecargasTicket)}`,
      "------------------------------",
      "VENTAS",
      `Efectivo: ${monedaTicket(ventasEfectivoTicket)}`,
      `Transferencia: ${monedaTicket(ventasTransferenciaTicket)}`,
      `Saldo: ${monedaTicket(ventasSaldoTicket)}`,
      `Credito: ${monedaTicket(ventasCreditoTicket)}`,
      `SUBTOTAL VENTAS: ${monedaTicket(subtotalVentasTicket)}`,
      "------------------------------",
      `Egresos: ${monedaTicket(egresosTicket)}`,
      `EFECTIVO ESPERADO: ${monedaTicket(efectivoEsperadoTicket)}`,
      `EFECTIVO CONTADO: ${monedaTicket(contadoTicket)}`,
      `DIFERENCIA EFECTIVO: ${monedaTicket(diferenciaEfectivoTicket)}`,
      `RESULTADO: ${signoDiferenciaTicket}`,
      "------------------------------",
      `GRAN TOTAL MOV.: ${monedaTicket(granTotalTicket)}`,
      `Obs: ${cierre.observacion_automatica || cierre.observacion || "-"}`,
      "FIN DE CIERRE",
    ].join("\n");

    try {
      const cierreNativo = {
        tipo_documento: "CIERRE_CAJA",
        codigo_cierre: obtenerCodigoCierre(cierre),
        institucion:
          institucionActiva?.nombre ||
          cierre.institucion_nombre ||
          "POS NUBE",
        negocio: cierre.negocio || "POS NUBE",
        fecha: cierre.fecha || obtenerFechaEcuadorISO(),
        fecha_operativa: fechaOperativaTicket,
        fecha_cierre: fechaCierreTicket,
        hora_cierre: horaCierreTicket,
        estado_cierre: estadoTicket,
        ubicacion: cierre.punto_nombre || "PRINCIPAL",
        punto_nombre: cierre.punto_nombre || "PRINCIPAL",
        jornada_id: cierre.jornada_id || null,
        periodo_desde: cierre.periodo_desde_ecuador || cierre.periodo_desde || null,
        periodo_hasta: cierre.periodo_hasta_ecuador || cierre.periodo_hasta || null,
        formato_compacto: true,
        texto_compacto: textoCompactoCierre,
        usuario:
          cierre.usuario_nombre ||
          cierre.usuario_correo ||
          usuario?.correo ||
          usuario?.nombre ||
          "Administrador",

        recargas_efectivo: Number(cierre.recargas_efectivo || 0),
        recargas_transferencia: Number(
          cierre.recargas_transferencia || 0
        ),
        ventas_efectivo: Number(cierre.ventas_efectivo || 0),
        ventas_transferencia: Number(
          cierre.ventas_transferencia || 0
        ),
        ventas_tarjeta: Number(cierre.ventas_tarjeta || 0),
        ventas_saldo: Number(cierre.ventas_saldo || 0),
        ventas_credito: Number(cierre.ventas_credito || 0),
        egresos_total: Number(cierre.egresos_total || 0),

        efectivo_contado: Number(cierre.efectivo_contado || 0),
        tarjeta_manual: Number(cierre.tarjeta_manual || 0),
        transferencia_manual: Number(
          cierre.transferencia_manual || 0
        ),

        diferencia_efectivo: Number(
          cierre.diferencia_efectivo || 0
        ),
        diferencia_tarjeta: Number(
          cierre.diferencia_tarjeta || 0
        ),
        diferencia_transferencia: Number(
          cierre.diferencia_transferencia || 0
        ),
        diferencia_general: Number(
          cierre.diferencia_general || 0
        ),
        subtotal_recargas: subtotalRecargasTicket,
        subtotal_ventas: subtotalVentasTicket,
        efectivo_esperado: efectivoEsperadoTicket,
        diferencia_efectivo_calculada: diferenciaEfectivoTicket,
        resultado_efectivo: signoDiferenciaTicket,
        gran_total_movimientos: granTotalTicket,

        observacion:
          cierre.observacion_automatica ||
          cierre.observacion ||
          "",

        denominaciones: Array.isArray(cierre.denominaciones)
          ? cierre.denominaciones.map((d) => ({
              tipo: d.tipo || "",
              denominacion: Number(d.denominacion || 0),
              cantidad: Number(d.cantidad || 0),
              total: Number(d.total || 0),
            }))
          : [],

        egresos: Array.isArray(cierre.egresos)
          ? cierre.egresos.map((e) => ({
              fecha: normalizarFechaISO(e.fecha),
              nombre:
                e.nombre_egreso ||
                e.nombre ||
                "Egreso",
              tipo: e.tipo_egreso || "",
              factura: e.numero_factura || "",
              total: Number(e.total || 0),
            }))
          : [],
      };

      if (
        window.POSNUBEPrinter &&
        typeof window.POSNUBEPrinter.imprimirTicket === "function"
      ) {
        window.POSNUBEPrinter.imprimirTicket(
          JSON.stringify(cierreNativo)
        );

        console.log(
          "Cierre enviado a impresora nativa iMin:",
          cierreNativo
        );
        return;
      }

      if (
        window.AndroidPrinter &&
        typeof window.AndroidPrinter.printTicket === "function"
      ) {
        window.AndroidPrinter.printTicket(
          JSON.stringify(cierreNativo)
        );
        return;
      }

      // ============================================================
      // IMPRESIÓN DIRECTA PC - PUENTE LOCAL
      // ============================================================
      // Para el cierre NO usamos páginas de 58x100 del driver.
      // El puente RAW imprime un rollo continuo, por lo que no se parte
      // antes de "Conteo de billetes y monedas" ni al final.
      try {
        const controladorCierre = new AbortController();
        const timeoutCierre = window.setTimeout(
          () => controladorCierre.abort(),
          2200
        );

        try {
          const respuestaPuenteCierre = await fetch(
            "http://127.0.0.1:17321/print-close",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(cierreNativo),
              signal: controladorCierre.signal,
              cache: "no-store",
            }
          );

          if (respuestaPuenteCierre.ok) {
            console.log(
              "Cierre impreso completo mediante puente RAW local:",
              cierreNativo
            );
            return;
          }
        } finally {
          window.clearTimeout(timeoutCierre);
        }
      } catch (errorPuenteCierre) {
        console.warn(
          "Puente RAW de cierre no disponible; se usará impresión web:",
          errorPuenteCierre
        );
      }
    } catch (error) {
      console.error(
        "Error enviando cierre a impresora iMin/puente PC:",
        error
      );
    }

    // ============================================================
    // IMPRESIÓN PC / NAVEGADOR - RESPALDO
    // ============================================================
    // No usamos window.print() directamente sobre el modal porque el
    // detalle del cierre vive dentro de un contenedor fixed con scroll.
    // Chrome puede repetir la primera página en impresión dúplex.
    // En PC se crea un documento limpio y paginable exclusivamente
    // para impresión.
    try {
      const moneda = (valor) => {
        const numero = Number(valor || 0);
        return numero < 0
          ? `-$${Math.abs(numero).toFixed(2)}`
          : `$${numero.toFixed(2)}`;
      };

      const filasResumen = [
        ["Código cierre", obtenerCodigoCierre(cierre)],
        ["Ubicación", cierre.punto_nombre || "PRINCIPAL"],
        ["Jornada", `#${cierre.jornada_id || "-"}`],
        ["Fecha operativa", fechaOperativaTicket],
        ["Fecha de cierre", fechaCierreTicket],
        ["Hora de cierre", horaCierreTicket],
        ["Estado", estadoTicket],
        ["Usuario", cierre.usuario_nombre || cierre.usuario_correo || usuario?.correo || usuario?.nombre || "Administrador"],
        ["Recargas efectivo", moneda(recargaEfectivoTicket)],
        ["Recargas transferencia", moneda(recargaTransferenciaTicket)],
        ["Subtotal recargas", moneda(subtotalRecargasTicket)],
        ["Ventas efectivo", moneda(ventasEfectivoTicket)],
        ["Ventas transferencia", moneda(ventasTransferenciaTicket)],
        ["Ventas con saldo", moneda(ventasSaldoTicket)],
        ["Ventas con crédito", moneda(ventasCreditoTicket)],
        ["Subtotal ventas", moneda(subtotalVentasTicket)],
        ["Egresos", moneda(egresosTicket)],
        ["Efectivo esperado", moneda(efectivoEsperadoTicket)],
        ["Efectivo contado", moneda(contadoTicket)],
        ["Diferencia efectivo", moneda(diferenciaEfectivoTicket)],
        ["Resultado", signoDiferenciaTicket],
        ["Gran total movimientos", moneda(granTotalTicket)],
        ["Observación", cierre.observacion_automatica || cierre.observacion || "-"],
      ];

      const resumenHtml = filasResumen
        .map(
          ([etiqueta, valor]) => `
            <div class="dato">
              <div class="etiqueta">${escaparHtmlTicket(etiqueta)}</div>
              <div class="valor">${escaparHtmlTicket(valor)}</div>
            </div>
          `
        )
        .join("");

      const denominacionesHtml = (
        Array.isArray(cierre.denominaciones)
          ? cierre.denominaciones
          : []
      )
        .map(
          (d) => `
            <tr>
              <td>${Number(d.denominacion || 0).toFixed(2)}</td>
              <td>${escaparHtmlTicket(d.tipo || "")}</td>
              <td>${Number(d.cantidad || 0)}</td>
              <td>${moneda(d.total)}</td>
            </tr>
          `
        )
        .join("");

      const egresosHtml = (
        Array.isArray(cierre.egresos)
          ? cierre.egresos
          : []
      )
        .map(
          (e) => `
            <tr>
              <td>${escaparHtmlTicket(formatearSoloFecha(e.fecha))}</td>
              <td>${escaparHtmlTicket(
                e.nombre_egreso || e.nombre || "Egreso"
              )}</td>
              <td>${escaparHtmlTicket(e.tipo_egreso || "")}</td>
              <td>${escaparHtmlTicket(e.numero_factura || "-")}</td>
              <td>${moneda(e.total)}</td>
              <td>${escaparHtmlTicket(
                e.usuario || e.usuario_nombre || "-"
              )}</td>
            </tr>
          `
        )
        .join("");

      const ventanaImpresion = window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

      if (!ventanaImpresion) {
        alert(
          "El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para POS NUBE e intenta nuevamente."
        );
        return;
      }

      ventanaImpresion.document.open();
      ventanaImpresion.document.write(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Cierre de caja - ${escaparHtmlTicket(
              formatearSoloFecha(cierre.fecha)
            )}</title>
            <style>
              * {
                box-sizing: border-box;
              }

              html,
              body {
                margin: 0;
                padding: 0;
                background: #fff;
                color: #111827;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 9pt;
              }

              body {
                padding: 7mm 8mm;
              }

              h1 {
                margin: 0 0 8px;
                font-size: 16pt;
              }

              h2 {
                margin: 12px 0 6px;
                font-size: 11pt;
                page-break-after: avoid;
                break-after: avoid-page;
              }

              .resumen {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 4px;
              }

              .dato {
                border: 1px solid #d7dde5;
                border-radius: 6px;
                padding: 4px 5px;
                break-inside: avoid;
                page-break-inside: avoid;
              }

              .etiqueta {
                color: #64748b;
                font-size: 7.5pt;
                margin-bottom: 1px;
              }

              .valor {
                font-weight: 700;
                overflow-wrap: anywhere;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
              }

              thead {
                display: table-header-group;
              }

              tfoot {
                display: table-footer-group;
              }

              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              th,
              td {
                border-bottom: 1px solid #e5e7eb;
                padding: 4px 4px;
                text-align: left;
                vertical-align: top;
                font-size: 8pt;
              }

              th {
                background: #f5f7fa;
                font-weight: 700;
              }

              .sin-registros {
                padding: 12px 6px;
              }

              @page {
                size: auto;
                margin: 12mm;
              }

              @media print {
                html,
                body {
                  width: auto !important;
                  height: auto !important;
                  overflow: visible !important;
                }

                body {
                  padding: 0;
                }

                .resumen,
                table,
                tbody {
                  overflow: visible !important;
                }
              }
            </style>
          </head>

          <body>
            <h1>Detalle de cierre de caja</h1>

            <section class="resumen">
              ${resumenHtml}
            </section>

            <h2>Conteo de billetes y monedas</h2>
            <table>
              <thead>
                <tr>
                  <th>Denominación</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${
                  denominacionesHtml ||
                  `
                    <tr>
                      <td colspan="4" class="sin-registros">
                        No se registraron denominaciones.
                      </td>
                    </tr>
                  `
                }
              </tbody>
            </table>

            <h2>Egresos incluidos en este cierre</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Factura</th>
                  <th>Valor</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                ${
                  egresosHtml ||
                  `
                    <tr>
                      <td colspan="6" class="sin-registros">
                        No hubo egresos activos en este cierre.
                      </td>
                    </tr>
                  `
                }
              </tbody>
            </table>
          </body>
        </html>
      `);
      ventanaImpresion.document.close();

      const ejecutarImpresion = () => {
        ventanaImpresion.focus();
        ventanaImpresion.print();

        ventanaImpresion.onafterprint = () => {
          ventanaImpresion.close();
        };
      };

      if (ventanaImpresion.document.readyState === "complete") {
        setTimeout(ejecutarImpresion, 250);
      } else {
        ventanaImpresion.onload = () => {
          setTimeout(ejecutarImpresion, 250);
        };
      }
    } catch (error) {
      console.error(
        "Error preparando impresión de cierre en PC:",
        error
      );
      alert(
        "No se pudo preparar la impresión del cierre. Intenta nuevamente."
      );
    }
  };

  const imprimirTicketVenta = async (ticket) => {
    if (!ticket) {
      alert("No existen datos para imprimir el ticket.");
      return;
    }

    // ============================================================
    // IMPRESIÓN NATIVA iMIN
    // ============================================================
    // La APK POSNUBEPrinter expone el puente JavaScript:
    // window.POSNUBEPrinter.imprimirTicket(json)
    //
    // Si POS NUBE está abierto dentro del iMin, se imprime directamente
    // en la impresora térmica integrada. En PC/navegador normal se conserva
    // la impresión web que ya existía.
    try {
      const detalleNativo = Array.isArray(ticket.detalle)
        ? ticket.detalle
        : Array.isArray(ticket.productos)
        ? ticket.productos
        : Array.isArray(ticket.items)
        ? ticket.items
        : [];

      const ticketNativo = {
        institucion:
          ticket.institucion_nombre ||
          ticket.institucion ||
          institucionActiva?.nombre ||
          "POS NUBE",
        orden:
          ticket.id ||
          ticket.venta_id ||
          ticket.orden ||
          "",
        fecha:
          ticket.created_at ||
          ticket.fecha ||
          new Date().toISOString(),
        cliente:
          ticket.alumno_nombre ||
          ticket.profesor_nombre ||
          ticket.cliente ||
          "Consumidor final",
        cajero:
          ticket.cajero ||
          ticket.usuario_nombre ||
          ticket.usuario_correo ||
          usuario?.correo ||
          usuario?.nombre ||
          "Administrador",
        metodo_pago:
          ticket.metodo_pago ||
          ticket.forma_pago ||
          "EFECTIVO",
        total: Number(ticket.total || 0),
        subtotal: Number(
          ticket.subtotal !== undefined && ticket.subtotal !== null
            ? ticket.subtotal
            : ticket.total || 0
        ),
        observacion: ticket.observacion || "",
        saldo_anterior:
          ticket.saldo_anterior !== undefined
            ? ticket.saldo_anterior
            : null,
        saldo_restante:
          ticket.saldo_restante !== undefined
            ? ticket.saldo_restante
            : null,
        productos: detalleNativo.map((item) => {
          const cantidad = Number(item.cantidad || 0);
          const precio = Number(
            item.precio_unitario !== undefined
              ? item.precio_unitario
              : item.precio || 0
          );

          return {
            nombre:
              item.nombre ||
              item.producto_nombre ||
              item.descripcion ||
              "Producto",
            cantidad,
            precio,
            precio_unitario: precio,
            subtotal: Number(
              item.total !== undefined
                ? item.total
                : item.subtotal !== undefined
                ? item.subtotal
                : cantidad * precio
            ),
          };
        }),
      };

      if (
        window.POSNUBEPrinter &&
        typeof window.POSNUBEPrinter.imprimirTicket === "function"
      ) {
        window.POSNUBEPrinter.imprimirTicket(
          JSON.stringify(ticketNativo)
        );

        console.log(
          "Ticket enviado automáticamente a POSNUBEPrinter:",
          ticketNativo
        );

        return;
      }

      // Compatibilidad con una versión anterior del puente Android,
      // por si algún equipo todavía la tuviera instalada.
      if (
        window.AndroidPrinter &&
        typeof window.AndroidPrinter.printTicket === "function"
      ) {
        window.AndroidPrinter.printTicket(
          JSON.stringify(ticketNativo)
        );

        console.log(
          "Ticket enviado mediante puente Android anterior:",
          ticketNativo
        );

        return;
      }
    } catch (error) {
      console.error(
        "Error enviando ticket a la impresora iMin. Se usará impresión web:",
        error
      );
    }

    // ============================================================
    // IMPRESIÓN DIRECTA PC - PUENTE LOCAL ESC/POS
    // ============================================================
    // En PC intentamos imprimir directamente en Windows.
    // Esto evita completamente la página de Chrome y su largo fijo.
    // Si el puente no está disponible, se conserva la impresión web
    // existente como respaldo.
    // ============================================================
    try {
      const detallePC = Array.isArray(ticket.detalle)
        ? ticket.detalle
        : Array.isArray(ticket.productos)
        ? ticket.productos
        : Array.isArray(ticket.items)
        ? ticket.items
        : [];

      const ticketPC = {
        institucion:
          ticket.institucion_nombre ||
          ticket.institucion ||
          institucionActiva?.nombre ||
          "POS NUBE",
        orden:
          ticket.id ||
          ticket.venta_id ||
          ticket.orden ||
          "",
        fecha:
          ticket.created_at ||
          ticket.fecha ||
          new Date().toISOString(),
        cliente:
          ticket.alumno_nombre ||
          ticket.profesor_nombre ||
          ticket.cliente ||
          "Consumidor final",
        cajero:
          ticket.cajero ||
          ticket.usuario_nombre ||
          ticket.usuario_correo ||
          usuario?.correo ||
          usuario?.nombre ||
          "Administrador",
        metodo_pago:
          ticket.metodo_pago ||
          ticket.forma_pago ||
          "EFECTIVO",
        subtotal: Number(
          ticket.subtotal !== undefined && ticket.subtotal !== null
            ? ticket.subtotal
            : ticket.total || 0
        ),
        total: Number(ticket.total || 0),
        observacion: ticket.observacion || "",
        saldo_anterior:
          ticket.saldo_anterior !== undefined
            ? ticket.saldo_anterior
            : null,
        saldo_restante:
          ticket.saldo_restante !== undefined
            ? ticket.saldo_restante
            : null,
        productos: detallePC.map((item) => {
          const cantidad = Number(item.cantidad || 0);
          const precio = Number(
            item.precio_unitario !== undefined
              ? item.precio_unitario
              : item.precio || 0
          );

          return {
            nombre:
              item.nombre ||
              item.producto_nombre ||
              item.descripcion ||
              "Producto",
            cantidad,
            precio,
            precio_unitario: precio,
            total: Number(
              item.total !== undefined
                ? item.total
                : item.subtotal !== undefined
                ? item.subtotal
                : cantidad * precio
            ),
          };
        }),
      };

      const controladorPuente = new AbortController();
      const timeoutPuente = window.setTimeout(
        () => controladorPuente.abort(),
        1800
      );

      try {
        const respuestaPuente = await fetch(
          "http://127.0.0.1:17321/print",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(ticketPC),
            signal: controladorPuente.signal,
            cache: "no-store",
          }
        );

        if (respuestaPuente.ok) {
          console.log(
            "Ticket impreso directamente en EC-PM-5890X mediante puente local:",
            ticketPC
          );
          return;
        }

        console.warn(
          "Puente local respondió con error. Se usará impresión web de respaldo."
        );
      } finally {
        window.clearTimeout(timeoutPuente);
      }
    } catch (errorPuentePC) {
      console.warn(
        "Puente directo PC no disponible. Se usará impresión web de respaldo:",
        errorPuentePC
      );
    }

    const items = Array.isArray(ticket.detalle) ? ticket.detalle : [];
    const institucionNombre =
      ticket.institucion_nombre ||
      institucionActiva?.nombre ||
      "POS NUBE";

    const alumnoNombre =
      ticket.alumno_nombre ||
      "Consumidor final";

    const fechaVenta = ticket.created_at
      ? new Date(ticket.created_at)
      : new Date();

    const filasProductos = items
      .map((item) => {
        const cantidad = Number(item.cantidad || 0);
        const precio = Number(item.precio_unitario || 0);
        const total = Number(item.total || cantidad * precio);

        return `
          <tr>
            <td class="producto">
              ${escaparHtmlTicket(item.nombre || item.producto_nombre || "Producto")}
              <div class="cantidad">${cantidad} x $${precio.toFixed(2)}</div>
            </td>
            <td class="valor">$${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    const mostrarSaldo =
      ticket.saldo_anterior !== null &&
      ticket.saldo_anterior !== undefined;

    // ============================================================
    // TAMAÑO REAL DEL TICKET EN PC
    // La impresora EC-PM-5890X trabaja como ticketera térmica de 58 mm.
    // Calculamos también el alto aproximado para que Chrome NO genere
    // una hoja larga con gran espacio blanco debajo del comprobante.
    // ============================================================
    const cantidadProductosTicket = Math.max(1, items.length);
    // El alto final se calcula DESPUÉS de renderizar el ticket en el iframe.
    // Así evitamos que Chrome lo divida en dos páginas y también evitamos
    // desperdiciar una tira larga de papel en blanco.

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title> </title>
          <style>
            /* ============================================================
               TICKET PC 58 MM
               - Ancho real para la ticketera EC-PM-5890X.
               - Alto libre según el contenido real de la venta.
               - Sin longitud fija impuesta por el navegador.
               ============================================================ */
            @page {
              size: 58mm 120mm;
              margin: 0;
            }

            html,
            body {
              width: 58mm !important;
              min-width: 58mm !important;
              max-width: 58mm !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff;
              color: #000000;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 9px;
              overflow: visible !important;
            }

            * {
              box-sizing: border-box;
            }

            .ticket {
              width: 50mm !important;
              max-width: 50mm !important;
              margin: 0 auto !important;
              padding: 1.5mm 1mm 1.5mm !important;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .centrado {
              text-align: center;
            }

            .titulo {
              font-size: 12px;
              font-weight: 800;
              margin-bottom: 1px;
            }

            .institucion {
              font-size: 10px;
              font-weight: 700;
            }

            .separador {
              border-top: 1px dashed #000;
              margin: 3px 0;
            }

            .datos {
              line-height: 1.25;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            td {
              vertical-align: top;
              padding: 1px 0;
            }

            .producto {
              width: 68%;
              padding-right: 3px;
              overflow-wrap: anywhere;
            }

            .cantidad {
              font-size: 8.5px;
            }

            .valor {
              width: 32%;
              text-align: right;
              white-space: nowrap;
              padding-right: 1mm;
            }

            .total {
              font-size: 12px;
              font-weight: 800;
            }

            .pie {
              margin-top: 3px;
              text-align: center;
              line-height: 1.25;
            }

            @media print {
              html,
              body {
                width: 58mm !important;
                min-width: 58mm !important;
                max-width: 58mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                height: auto !important;
              }

              .ticket {
                width: 50mm !important;
                max-width: 50mm !important;
                margin: 0 auto !important;
                page-break-after: avoid !important;
                break-after: avoid-page !important;
                page-break-before: avoid !important;
                break-before: avoid-page !important;
                page-break-inside: avoid !important;
                break-inside: avoid-page !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="centrado">
              <div class="titulo">POS NUBE</div>
              <div class="institucion">${escaparHtmlTicket(institucionNombre)}</div>
            </div>

            <div class="separador"></div>

            <div class="datos">
              <div><strong>Orden:</strong> #${escaparHtmlTicket(ticket.id)}</div>
              <div><strong>Fecha:</strong> ${escaparHtmlTicket(
                fechaVenta.toLocaleString("es-EC")
              )}</div>
              <div><strong>Cliente:</strong> ${escaparHtmlTicket(alumnoNombre)}</div>
              ${
                ticket.alumno_codigo
                  ? `<div><strong>Cédula/Código:</strong> ${escaparHtmlTicket(
                      ticket.alumno_codigo
                    )}</div>`
                  : ""
              }
              <div><strong>Cajero:</strong> ${escaparHtmlTicket(
                usuario?.correo || usuario?.nombre || "Administrador"
              )}</div>
            </div>

            <div class="separador"></div>

            <table>
              <tbody>
                ${filasProductos}
              </tbody>
            </table>

            <div class="separador"></div>

            <table>
              <tbody>
                <tr>
                  <td><strong>Subtotal</strong></td>
                  <td class="valor">$${Number(ticket.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="total">TOTAL</td>
                  <td class="valor total">$${Number(ticket.total || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td><strong>Forma de pago</strong></td>
                  <td class="valor">${escaparHtmlTicket(
                    ticket.metodo_pago === "SALDO"
                      ? "SALDO DEL ALUMNO"
                      : ticket.metodo_pago || "EFECTIVO"
                  )}</td>
                </tr>
                ${
                  mostrarSaldo
                    ? `
                      <tr>
                        <td><strong>Saldo anterior</strong></td>
                        <td class="valor">$${Number(ticket.saldo_anterior || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td><strong>Saldo restante</strong></td>
                        <td class="valor">$${Number(ticket.saldo_restante || 0).toFixed(2)}</td>
                      </tr>
                    `
                    : ""
                }
              </tbody>
            </table>

            ${
              ticket.observacion
                ? `
                  <div class="separador"></div>
                  <div><strong>Observación:</strong> ${escaparHtmlTicket(
                    ticket.observacion
                  )}</div>
                `
                : ""
            }

            <div class="separador"></div>

            <div class="pie">
              Gracias por su compra
              <br />
              Conserve este comprobante
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Impresión de ticket");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    document.body.appendChild(iframe);

    const documento = iframe.contentWindow?.document;

    if (!documento || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      alert("No se pudo abrir el servicio de impresión.");
      return;
    }

    documento.open();
    documento.write(html);
    documento.close();

    const ejecutarImpresion = () => {
      try {
        documento.title = "";
        const ticketElemento = documento.querySelector(".ticket");

        if (ticketElemento) {
          // Chrome trabaja aproximadamente a 96 dpi:
          // 1 mm = 96 / 25.4 px = 3.7795 px.
          const altoPx = Math.ceil(ticketElemento.getBoundingClientRect().height);
          const altoContenidoMm = altoPx / 3.7795275591;

          // Dejamos un pequeño margen de seguridad al final para que
          // TOTAL / forma de pago / pie nunca queden en una segunda hoja.
          const altoPaginaMm = Math.max(
            96,
            Math.ceil(altoContenidoMm + 6)
          );

          const estiloPagina = documento.createElement("style");
          estiloPagina.setAttribute("data-pos-ticket-page", "true");
          estiloPagina.textContent = `
            @page {
              size: 58mm ${altoPaginaMm}mm !important;
              margin: 0 !important;
            }

            html,
            body {
              width: 58mm !important;
              min-width: 58mm !important;
              max-width: 58mm !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }

            .ticket {
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
          `;

          documento.head.appendChild(estiloPagina);

          console.log(
            "Ticket PC preparado:",
            {
              productos: cantidadProductosTicket,
              altoContenidoMm: Number(altoContenidoMm.toFixed(1)),
              altoPaginaMm,
            }
          );
        }

        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (error) {
        console.error("Error imprimiendo ticket:", error);
        alert(
          "La venta quedó guardada, pero no se pudo iniciar la impresión. Puedes reimprimirla desde Consultar ventas."
        );
      } finally {
        window.setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3500);
      }
    };

    window.setTimeout(ejecutarImpresion, 900);
  };

  const obtenerTicketVenta = async (ventaId) => {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      throw new Error("Sesión o institución no válida");
    }

    const respuesta = await fetch(
      `${API_URL}/api/ventas/${ventaId}/ticket?institucion_id=${institucionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        data.message ||
          data.error ||
          "No se pudo obtener el ticket"
      );
    }

    return data.ticket || data;
  };

  const reimprimirTicketVenta = async (venta) => {
    try {
      const ticket = await obtenerTicketVenta(venta.id);
      imprimirTicketVenta(ticket);
    } catch (error) {
      console.error("Error reimprimiendo ticket:", error);
      alert(error.message || "No se pudo reimprimir el ticket.");
    }
  };

  const crearVenta = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      alert("Sesión o institución no válida");
      return;
    }

    const ubicacionVentaActual =
      jornadaActiva?.punto_nombre || localNuevaOrden || "PRINCIPAL";

    const itemsLimpios = ventaItems
      .map((item) => {
        const producto = productosActivos.find(
          (p) => Number(p.id) === Number(item.producto_id)
        );

        return {
          producto_id: Number(item.producto_id),
          cantidad: Number(item.cantidad || 0),
          ubicacion_stock: producto
            ? ubicacionStockVentaProducto(producto, ubicacionVentaActual)
            : normalizarUbicacionFrontend(ubicacionVentaActual, institucionId),
        };
      })
      .filter(
        (item) =>
          item.producto_id > 0 &&
          item.cantidad > 0
      );

    if (itemsLimpios.length === 0) {
      alert("Debes agregar al menos un producto válido");
      return;
    }

    // Validar stock
    for (const item of itemsLimpios) {
      const producto = productosActivos.find(
        (p) => Number(p.id) === Number(item.producto_id)
      );

      if (!producto) {
        alert("Uno de los productos ya no existe.");
        return;
      }

      const precioProducto = Number(producto.precio || 0);

      if (
        !Number.isFinite(precioProducto) ||
        precioProducto <= 0
      ) {
        alert(
          `${producto.nombre}: no se puede vender porque su precio es $0.00 o inválido.`
        );
        return;
      }

      const stockDisponible = stockDisponibleVentaProducto(
        producto,
        ubicacionVentaActual
      );

      if (stockDisponible < 1) {
        alert(
          `${producto.nombre}: no tiene stock disponible en ${
            jornadaActiva?.punto_nombre || localNuevaOrden || "esta ubicación"
          }.`
        );
        return;
      }

      if (
        !Number.isInteger(Number(item.cantidad)) ||
        Number(item.cantidad) < 1
      ) {
        alert(
          `${producto.nombre}: la cantidad debe ser un número entero desde 1.`
        );
        return;
      }

      if (Number(item.cantidad) > stockDisponible) {
        alert(
          `${producto.nombre}: solo hay ${stockDisponible} unidades disponibles`
        );
        return;
      }
    }

    if (!Number.isFinite(Number(totalVentaCalculado)) || Number(totalVentaCalculado) <= 0) {
      alert("No se puede crear una orden con total $0.00.");
      return;
    }

    const pagaConSaldo =
      ventaForm.metodo_pago === "RECARGA";
    const pagaConCredito =
      ventaForm.metodo_pago === "CREDITO";
    const pagaConCreditoProfesor =
      ventaForm.metodo_pago === "CREDITO_PROFESOR";
    const requiereAlumno = pagaConSaldo || pagaConCredito;

    if (requiereAlumno && !ventaForm.alumno_id) {
      alert("Debes seleccionar un alumno.");
      return;
    }

    // Validar saldo
    if (pagaConSaldo && alumnoVentaSeleccionado) {
      const saldo = Number(
        alumnoVentaSeleccionado.saldo || 0
      );

      if (totalVentaCalculado > saldo) {
        alert(
          `Saldo insuficiente.\nDisponible: ${formatearMoneda(
            saldo
          )}`
        );
        return;
      }
    }

    if (pagaConCreditoProfesor) {
      if (!ventaForm.profesor_id || !profesorVentaSeleccionado) {
        alert("Debes seleccionar un profesor.");
        return;
      }

      if (profesorVentaSeleccionado.credito_habilitado !== true) {
        alert("El crédito no está habilitado para este profesor. Debe autorizarlo un administrador.");
        return;
      }

      const saldoFavorProfesor = Number(
        profesorVentaSeleccionado.saldo || 0
      );

      if (false && saldoFavorProfesor > 0.0001) {
        alert(
          `El crédito del profesor está bloqueado mientras exista saldo a favor.\nSaldo disponible: ${formatearMoneda(
            saldoFavorProfesor
          )}`
        );
        return;
      }

      const limiteProfesor = Number(
        profesorVentaSeleccionado.limite_credito || 0
      );
      const utilizadoProfesor = Number(
        profesorVentaSeleccionado.credito_utilizado || 0
      );
      const disponible = Math.max(
        0,
        limiteProfesor - utilizadoProfesor
      );

      if (totalVentaCalculado > disponible) {
        alert(
          `Crédito insuficiente.
Disponible: ${formatearMoneda(
            disponible
          )}`
        );
        return;
      }
    }

    if (pagaConCredito && alumnoVentaSeleccionado) {
      const habilitado =
        alumnoVentaSeleccionado.credito_habilitado === true;
      const limite = Number(
        alumnoVentaSeleccionado.limite_credito || 0
      );
      const utilizado = Number(
        alumnoVentaSeleccionado.credito_utilizado || 0
      );
      const disponible = Math.max(0, limite - utilizado);

      if (!habilitado) {
        alert("El crédito no está habilitado para este alumno.");
        return;
      }

      if (totalVentaCalculado > disponible) {
        alert(
          `Crédito insuficiente.
Disponible: ${formatearMoneda(
            disponible
          )}`
        );
        return;
      }
    }

    const payload = {
      institucion_id: Number(institucionId),
      alumno_id: requiereAlumno
        ? Number(ventaForm.alumno_id)
        : null,
      profesor_id: pagaConCreditoProfesor
        ? Number(ventaForm.profesor_id)
        : null,
      metodo_pago: pagaConSaldo
        ? "SALDO"
        : pagaConCredito
        ? "CREDITO"
        : pagaConCreditoProfesor
        ? "CREDITO_PROFESOR"
        : ventaForm.metodo_pago,
      items: itemsLimpios,
      observacion:ventaForm.observacion?.trim()||"",
      ubicacion:jornadaActiva?.punto_nombre||localNuevaOrden||"PRINCIPAL",
      jornada_id:Number(jornadaActiva?.id),
    };

    const res = await fetch(`${API_URL}/api/ventas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(
        data.error ||
          data.message ||
          "Error creando venta"
      );
      return;
    }

    // ============================================================
    // IMPRESIÓN AUTOMÁTICA DESPUÉS DE CONFIRMAR LA VENTA
    // ============================================================
    // Nunca se intenta imprimir antes de que el backend confirme la venta.
    // Si el POST ya devuelve ticket, se usa directamente.
    // Si no lo devuelve, se consulta por el ID recién creado.
    let ticketVenta = data.ticket || null;

    if (!ticketVenta) {
      const ventaIdCreada =
        data.venta?.id ||
        data.id ||
        data.venta_id ||
        data.ventaId ||
        null;

      if (ventaIdCreada) {
        try {
          ticketVenta = await obtenerTicketVenta(ventaIdCreada);
        } catch (errorTicket) {
          console.error(
            "Venta guardada, pero no se pudo obtener el ticket para imprimir:",
            errorTicket
          );
        }
      }
    }

    // Si el backend no devuelve un ticket completo, construimos uno aquí
    // usando exactamente los datos de la orden que YA fue confirmada.
    // Así la impresión del iMin no depende del formato de respuesta del backend.
    if (!ticketVenta) {
      const nombreAlumno = alumnoVentaSeleccionado
        ? `${alumnoVentaSeleccionado.nombres || ""} ${
            alumnoVentaSeleccionado.apellidos || ""
          }`.trim()
        : "";

      const nombreProfesor = profesorVentaSeleccionado
        ? `${profesorVentaSeleccionado.nombres || ""} ${
            profesorVentaSeleccionado.apellidos || ""
          }`.trim()
        : "";

      const detalleLocal = itemsLimpios.map((item) => {
        const producto = productosActivos.find(
          (p) => Number(p.id) === Number(item.producto_id)
        );

        const cantidad = Number(item.cantidad || 0);
        const precio = Number(producto?.precio || 0);

        return {
          producto_id: item.producto_id,
          nombre: producto?.nombre || `Producto #${item.producto_id}`,
          producto_nombre: producto?.nombre || `Producto #${item.producto_id}`,
          cantidad,
          precio,
          precio_unitario: precio,
          subtotal: cantidad * precio,
          total: cantidad * precio,
        };
      });

      const saldoAnteriorAlumno = Number(
        alumnoVentaSeleccionado?.saldo || 0
      );

      ticketVenta = {
        id:
          data.venta?.id ||
          data.id ||
          data.venta_id ||
          data.ventaId ||
          "",
        institucion_nombre:
          institucionActiva?.nombre || "POS NUBE",
        fecha: new Date().toISOString(),
        alumno_nombre:
          nombreAlumno ||
          nombreProfesor ||
          "Consumidor final",
        cliente:
          nombreAlumno ||
          nombreProfesor ||
          "Consumidor final",
        metodo_pago: payload.metodo_pago,
        total: Number(totalVentaCalculado || 0),
        subtotal: Number(totalVentaCalculado || 0),
        observacion: payload.observacion || "",
        detalle: detalleLocal,
        productos: detalleLocal,
        saldo_anterior:
          pagaConSaldo && alumnoVentaSeleccionado
            ? saldoAnteriorAlumno
            : undefined,
        saldo_restante:
          pagaConSaldo && alumnoVentaSeleccionado
            ? Math.max(
                0,
                saldoAnteriorAlumno -
                  Number(totalVentaCalculado || 0)
              )
            : undefined,
      };

      console.log(
        "Ticket construido localmente para impresión:",
        ticketVenta
      );
    }

    // La impresión se intenta siempre después de que el backend confirmó la venta.
    imprimirTicketVenta(ticketVenta);

    // Actualizar datos
    await Promise.all([
      cargarVentas(),
      cargarProductos(),
      cargarExistenciasInventario(),
      cargarAlumnos(),
      cargarProfesores(),
      cargarResumen(),
    ]);

    // Si la venta fue iniciada desde la ficha del alumno,
    // NO regresamos a la ficha. Dejamos al mismo alumno seleccionado
    // y la pantalla de Crear orden lista para registrar la siguiente venta.
    if (
      alumnoDetalle &&
      Number(alumnoDetalle.id) ===
        Number(ventaForm.alumno_id)
    ) {
      const alumnoIdActual = Number(ventaForm.alumno_id);

      setAlumnoDetalle((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          saldo:
            pagaConSaldo
              ? Math.max(
                  0,
                  Number(prev.saldo || 0) -
                    Number(totalVentaCalculado || 0)
                )
              : Number(prev.saldo || 0),
          credito_utilizado:
            pagaConCredito
              ? Number(prev.credito_utilizado || 0) +
                Number(totalVentaCalculado || 0)
              : Number(prev.credito_utilizado || 0),
        };
      });

      // Limpiamos solamente los datos de la orden.
      // Se conserva el alumno para poder seguir vendiéndole sin volver a buscarlo.
      setVentaItems([]);
      setVentaForm({
        alumno_id: String(alumnoIdActual),
        profesor_id: "",
        metodo_pago: "RECARGA",
        observacion: "",
      });
      setCodigoBarraNuevaOrden("");
      setBusquedaProductoNuevaOrden("");
      setCategoriaNuevaOrden("TODOS");
      setBusquedaUsuarioNuevaOrden("");
      setModoNuevaOrden("identificar");
      setTipoUsuarioNuevaOrden("ESTUDIANTE");
      setLocalNuevaOrden(
        jornadaActiva?.punto_nombre || localNuevaOrden || "PRINCIPAL"
      );
      setFechaNuevaOrden(new Date().toISOString().slice(0, 10));

      setVista("ventas");
      setVistaVentasInterna("registrar");
    } else {
      // FLUJO RÁPIDO DE CAJA:
      // después de guardar/imprimir una orden normal,
      // limpiar todo y dejar inmediatamente otra Nueva Orden lista.
      limpiarFormularioVenta();
      setVista("ventas");
      setVistaVentasInterna("registrar");
      setBusquedaUsuarioNuevaOrden("");
      setBusquedaProductoNuevaOrden("");
      setCodigoBarraNuevaOrden("");
      setCategoriaNuevaOrden("TODOS");
      setModoNuevaOrden("consumidor_final");
      setTipoUsuarioNuevaOrden("TODOS");
    }

    setEfectivoRecibidoNuevaOrden("");
    alert("Venta registrada correctamente. Nueva orden lista.");
  } catch (error) {
    console.error("Error creando venta:", error);
    alert("No se pudo registrar la venta");
  } finally {
    ventaRapidaBloqueadaRef.current = false;
  }
};

  useEffect(() => {
    if (usuario) {
      setCuentaForm((prev) => ({
        ...prev,
        correo: usuario.correo || "",
      }));
    }
  }, [usuario]);

  useEffect(() => {
    const id = normalizarInstitucionId(usuario?.institucion_id);

    if (id) {
      setInstitucionSeleccionadaId(id);
      localStorage.setItem("institucionSeleccionadaId", String(id));
    }
  }, [usuario]);

  useEffect(() => {
    if (esRolPortal) return;

    const actualizarBancos = () => {
      cargarCuentasBancarias();
    };

    window.addEventListener(
      "posnube:bancos-actualizados",
      actualizarBancos
    );

    return () => {
      window.removeEventListener(
        "posnube:bancos-actualizados",
        actualizarBancos
      );
    };
  }, [usuario, institucionSeleccionadaId]);

  useEffect(() => {
    if (usuario && !esRolPortal) {
      cargarResumen();
      cargarProductos();
      cargarAlumnos();
      cargarProfesores();
      cargarRecargas();
      cargarCuentasBancarias();
      cargarVentas();
    }
  }, [usuario, institucionSeleccionadaId]);

 useEffect(() => {
  if (!usuario || esRolPortal) return;

  if (vista === "productos" || vista === "ventas") {
    cargarProductos();
  }

  if (vista === "inventario") {
    cargarExistenciasInventario();
  }

  if (vista === "alumnos" || vista === "recargas" || vista === "ventas") {
    cargarAlumnos();

    if (vista === "alumnos") {
      cargarCuentasBancarias();
    }
  }

  if (vista === "profesores") {
    cargarProfesores();
  }

  if (vista === "dashboard" || vista === "reportes") {
    cargarResumen();
  }

  if (vista === "recargas" || vista === "reportes") {
    cargarRecargas();
    cargarCuentasBancarias();
  }

  if (
    vista === "ventas" ||
    vista === "reportes" ||
    vista === "reporte_productos" ||
    vista === "reporte_productos_dia"
  ) {
    cargarVentas();
  }

  if (
    vista === "reporte_productos" ||
    vista === "reporte_productos_dia"
  ) {
    cargarProductos();
  }

  // 🔵 abrir menú comidas
  if (vista === "productos" || vista === "inventario") {
    setMenuComidasAbierto(true);
  }

  // 🔵 abrir menú ventas
  if (vista === "ventas") {
    setMenuVentasAbierto(true);
  }

  // 🔵 abrir menú reportes
  if (
    vista === "reportes" ||
    vista === "reporte_cierre" ||
    vista === "reporte_productos" ||
    vista === "reporte_productos_dia"
  ) {
    setMenuReportesAbierto(true);
  }

}, [vista]);

  const cargarEgresos = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      if (!token || !institucionId) return;

      const params = new URLSearchParams({
        institucion_id: String(institucionId),
      });
      if (egresosFiltros.fecha_inicio) params.set("fecha_inicio", egresosFiltros.fecha_inicio);
      if (egresosFiltros.fecha_fin) params.set("fecha_fin", egresosFiltros.fecha_fin);

      const respuesta = await fetch(`${API_URL}/api/egresos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudieron cargar los egresos");
      const listaEgresos = Array.isArray(data) ? data : [];
      setEgresosDiarios(listaEgresos);
      setEgresosSeleccionadosBorrar((actuales) =>
        actuales.filter((id) => listaEgresos.some((egreso) => Number(egreso.id) === Number(id)))
      );
    } catch (error) {
      console.error("Error cargando egresos:", error);
      alert(error.message || "No se pudieron cargar los egresos.");
    }
  };

  const obtenerEgresosFiltrados = () => {
    const texto = String(egresosFiltros.texto || "").toLowerCase();

    return egresosDiarios.filter((egreso) => {
      const fechaISO = normalizarFechaISO(egreso.fecha);

      const cumpleInicio =
        !egresosFiltros.fecha_inicio ||
        (fechaISO && fechaISO >= egresosFiltros.fecha_inicio);

      const cumpleFin =
        !egresosFiltros.fecha_fin ||
        (fechaISO && fechaISO <= egresosFiltros.fecha_fin);

      const cumpleTexto =
        !texto ||
        String(egreso.negocio || "").toLowerCase().includes(texto) ||
        String(egreso.nombre_egreso || "").toLowerCase().includes(texto) ||
        String(egreso.descripcion || "").toLowerCase().includes(texto) ||
        String(egreso.numero_factura || "").toLowerCase().includes(texto) ||
        String(egreso.tipo_documento || "").toLowerCase().includes(texto) ||
        String(egreso.tipo_egreso || "").toLowerCase().includes(texto);

      return cumpleInicio && cumpleFin && cumpleTexto;
    });
  };

  const exportarEgresosExcel = () => {
    try {
      const filas = obtenerEgresosFiltrados();

      if (!filas.length) {
        alert("No hay egresos para exportar con los filtros actuales.");
        return;
      }

      // Cada dato sale en su propia columna.
      const datos = filas.map((egreso) => ({
        LOCAL: egreso.negocio || "",
        FECHA: formatearSoloFecha(egreso.fecha),
        PROVEEDOR: egreso.nombre_egreso || "",
        TOTAL: Number(egreso.total || 0),
        DESCRIPCION: egreso.descripcion || "",
        ESTADO: egreso.estado || "",
        NUMERO_DOCUMENTO: egreso.numero_factura || "",
        TIPO_DOCUMENTO: String(
          egreso.tipo_documento || "FACTURA"
        ).replace(/_/g, " "),
        TIPO_EGRESO: egreso.tipo_egreso || "Efectivo",
      }));

      const worksheet = XLSX.utils.json_to_sheet(datos);

      worksheet["!cols"] = [
        { wch: 16 }, // LOCAL
        { wch: 13 }, // FECHA
        { wch: 30 }, // PROVEEDOR
        { wch: 12 }, // TOTAL
        { wch: 36 }, // DESCRIPCION
        { wch: 12 }, // ESTADO
        { wch: 24 }, // NUMERO DOCUMENTO
        { wch: 22 }, // TIPO DOCUMENTO
        { wch: 16 }, // TIPO EGRESO
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Egresos");

      const desde = egresosFiltros.fecha_inicio || "todos";
      const hasta = egresosFiltros.fecha_fin || "todos";

      XLSX.writeFile(
        workbook,
        `egresos_${desde}_${hasta}.xlsx`
      );
    } catch (error) {
      console.error("Error exportando egresos a Excel:", error);
      alert("No se pudo exportar el archivo Excel.");
    }
  };

  const exportarEgresosPDF = () => {
    try {
      const filas = obtenerEgresosFiltrados();

      if (!filas.length) {
        alert("No hay egresos para exportar con los filtros actuales.");
        return;
      }

      const escapar = (valor) =>
        String(valor ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const totalGeneral = filas.reduce(
        (suma, egreso) => suma + Number(egreso.total || 0),
        0
      );

      const filasHtml = filas
        .map(
          (egreso) => `
            <tr>
              <td>${escapar(egreso.negocio || "")}</td>
              <td>${escapar(formatearSoloFecha(egreso.fecha))}</td>
              <td>${escapar(egreso.nombre_egreso || "")}</td>
              <td class="num">$${Number(egreso.total || 0).toFixed(2)}</td>
              <td>${escapar(egreso.descripcion || "")}</td>
              <td>${escapar(egreso.estado || "")}</td>
              <td>${escapar(egreso.numero_factura || "")}</td>
              <td>${escapar(
                String(egreso.tipo_documento || "FACTURA").replace(/_/g, " ")
              )}</td>
              <td>${escapar(egreso.tipo_egreso || "Efectivo")}</td>
            </tr>
          `
        )
        .join("");

      const ventana = window.open("", "_blank", "width=1200,height=800");

      if (!ventana) {
        alert(
          "El navegador bloqueó la ventana del PDF. Habilita ventanas emergentes para POS NUBE."
        );
        return;
      }

      ventana.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Reporte de egresos</title>
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              * { box-sizing: border-box; }
              body {
                font-family: Arial, sans-serif;
                color: #111827;
                margin: 0;
                font-size: 10px;
              }
              h1 { margin: 0 0 6px; font-size: 20px; }
              .meta { margin-bottom: 12px; color: #475569; }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 5px;
                vertical-align: top;
                overflow-wrap: anywhere;
              }
              th {
                background: #f1f5f9;
                font-weight: 700;
              }
              .num { text-align: right; white-space: nowrap; }
              .total {
                margin-top: 10px;
                text-align: right;
                font-size: 13px;
                font-weight: 700;
              }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <h1>Reporte de Egresos Diarios</h1>
            <div class="meta">
              Fecha inicial: ${escapar(egresosFiltros.fecha_inicio || "Todas")}
              &nbsp;&nbsp;|&nbsp;&nbsp;
              Fecha final: ${escapar(egresosFiltros.fecha_fin || "Todas")}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Local</th>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Total</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>N.º documento</th>
                  <th>Tipo documento</th>
                  <th>Tipo egreso</th>
                </tr>
              </thead>
              <tbody>${filasHtml}</tbody>
            </table>

            <div class="total">
              TOTAL EGRESOS: $${totalGeneral.toFixed(2)}
            </div>

            <script>
              window.onload = function () {
                setTimeout(function () {
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);

      ventana.document.close();
    } catch (error) {
      console.error("Error preparando PDF de egresos:", error);
      alert("No se pudo preparar el reporte PDF.");
    }
  };

  const guardarEgreso = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const total = Number(egresoForm.total || 0);
      if (!institucionId || !token) throw new Error("Sesión inválida");
      if (!egresoForm.fecha || !egresoForm.nombre_egreso || total <= 0) {
        alert("Fecha, proveedor y total mayor a cero son obligatorios.");
        return;
      }

      if (!egresoForm.tipo_documento) {
        alert("Selecciona el tipo de documento.");
        return;
      }

      const url = editandoEgresoId
        ? `${API_URL}/api/egresos/${editandoEgresoId}`
        : `${API_URL}/api/egresos`;
      const respuesta = await fetch(url, {
        method: editandoEgresoId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...egresoForm,
          institucion_id: Number(institucionId),
          total,
          // Los egresos de caja siempre afectan efectivo.
          tipo_egreso: "Efectivo",
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo guardar el egreso");

      setEgresoForm({
        negocio: "PENSIONADO", fecha: "", nombre_egreso: "",
        proveedor_id: "", proveedor_nombre: "", total: "",
        descripcion: "", estado: "ACTIVO", numero_factura: "",
        tipo_documento: "FACTURA", tipo_egreso: "Efectivo",
      });
      setEditandoEgresoId(null);
      setMostrarCrearEgreso(false);
      await cargarEgresos();
      alert(editandoEgresoId ? "Egreso actualizado correctamente." : "Egreso guardado correctamente.");
    } catch (error) {
      console.error("Error guardando egreso:", error);
      alert(error.message || "No se pudo guardar el egreso.");
    }
  };

  const esAdminEgresos =
    ["ADMIN", "SUPER_ADMIN"].includes(normalizarRol(usuario?.rol));

  const eliminarEgreso = async (egreso) => {
    if (!esAdminEgresos) {
      alert("Solo ADMIN puede eliminar egresos.");
      return;
    }
    if (!window.confirm("¿Deseas eliminar este egreso de prueba?")) return;
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(`${API_URL}/api/egresos/${egreso.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ institucion_id: Number(institucionId) }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo eliminar");
      setEgresosSeleccionadosBorrar((actuales) =>
        actuales.filter((id) => Number(id) !== Number(egreso.id))
      );
      await cargarEgresos();
    } catch (error) {
      alert(error.message || "No se pudo eliminar el egreso.");
    }
  };

  const alternarEgresoSeleccionadoBorrar = (id) => {
    if (!esAdminEgresos) return;
    const numero = Number(id);
    setEgresosSeleccionadosBorrar((actuales) =>
      actuales.some((actual) => Number(actual) === numero)
        ? actuales.filter((actual) => Number(actual) !== numero)
        : [...actuales, numero]
    );
  };

  const seleccionarTodosEgresosVisibles = () => {
    if (!esAdminEgresos) return;
    const idsVisibles = obtenerEgresosFiltrados().map((egreso) => Number(egreso.id));
    const todosMarcados =
      idsVisibles.length > 0 &&
      idsVisibles.every((id) =>
        egresosSeleccionadosBorrar.some((actual) => Number(actual) === id)
      );

    setEgresosSeleccionadosBorrar((actuales) => {
      if (todosMarcados) {
        return actuales.filter((id) => !idsVisibles.includes(Number(id)));
      }
      return Array.from(new Set([...actuales.map(Number), ...idsVisibles]));
    });
  };

  const eliminarEgresosSeleccionados = async () => {
    if (!esAdminEgresos) {
      alert("Solo ADMIN puede eliminar egresos.");
      return;
    }

    const ids = Array.from(
      new Set(egresosSeleccionadosBorrar.map(Number).filter((id) => id > 0))
    );
    if (!ids.length) {
      alert("Selecciona al menos un egreso.");
      return;
    }

    if (
      !window.confirm(
        `¿Eliminar ${ids.length} egreso(s) seleccionado(s)? Esta acción es solo para limpiar registros de prueba.`
      )
    ) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(`${API_URL}/api/egresos/eliminar-seleccionados`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id: Number(institucionId),
          ids,
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(data.message || data.error || "No se pudieron eliminar los egresos");
      }

      setEgresosSeleccionadosBorrar([]);
      await cargarEgresos();
      alert(`${Number(data.eliminados || ids.length)} egreso(s) eliminado(s) correctamente.`);
    } catch (error) {
      alert(error.message || "No se pudieron eliminar los egresos seleccionados.");
    }
  };

  const cargarResumenCierre = async (
    fecha = cierreForm.fecha,
    jornadaForzada = null
  ) => {
    if (!fecha) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const jornadaPendiente =
        estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE"
          ? estadoOperativoCaja?.jornada
          : null;

      const jornadaObjetivo =
        jornadaForzada ||
        jornadaPendiente ||
        jornadaCierreSeleccionada ||
        jornadaActiva ||
        null;

      const jornadaId = Number(jornadaObjetivo?.id || 0);

      const respuesta = await fetch(
        `${API_URL}/api/cierres/resumen?institucion_id=${institucionId}&fecha=${fecha}&jornada_id=${jornadaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || data.message || "No se pudo calcular el cierre");
      setResumenCierreServidor(data);
    } catch (error) {
      console.error("Error cargando resumen de cierre:", error);
      alert(error.message || "No se pudo calcular el cierre.");
    }
  };

  const cargarCierres = async () => {
    try {
      setCargandoCierres(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        setCierresCaja([]);
        setCajasPendientesCierre([]);
        return;
      }

      const params = new URLSearchParams({
        institucion_id: String(institucionId),
      });

      if (cierreCajaFiltros.fecha_inicio) {
        params.set("fecha_inicio", cierreCajaFiltros.fecha_inicio);
      }

      if (cierreCajaFiltros.fecha_fin) {
        params.set("fecha_fin", cierreCajaFiltros.fecha_fin);
      }

      if (cierreCajaFiltros.punto_id) {
        params.set("punto_id", cierreCajaFiltros.punto_id);
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [respuestaCierres, respuestaPendientes] = await Promise.all([
        fetch(`${API_URL}/api/cierres?${params.toString()}`, { headers }),
        fetch(
          `${API_URL}/api/cierres/pendientes?institucion_id=${institucionId}`,
          { headers }
        ),
      ]);

      const dataCierres = await respuestaCierres.json();
      const dataPendientes = await respuestaPendientes.json();

      if (!respuestaCierres.ok) {
        throw new Error(
          dataCierres.message ||
          dataCierres.error ||
          "No se pudieron cargar los cierres"
        );
      }

      if (!respuestaPendientes.ok) {
        throw new Error(
          dataPendientes.message ||
          dataPendientes.error ||
          "No se pudieron cargar las cajas pendientes"
        );
      }

      setCierresCaja(Array.isArray(dataCierres) ? dataCierres : []);
      setCajasPendientesCierre(
        Array.isArray(dataPendientes) ? dataPendientes : []
      );

      if (["SUPER_ADMIN", "ADMIN"].includes(normalizarRol(usuario?.rol))) {
        const respuestaJornadas = await fetch(
          `${API_URL}/api/jornadas/historial?institucion_id=${institucionId}`,
          { headers }
        );
        const dataJornadas = await respuestaJornadas.json();
        setJornadasHistorial(
          respuestaJornadas.ok && Array.isArray(dataJornadas) ? dataJornadas : []
        );
      } else {
        setJornadasHistorial([]);
      }
    } catch (error) {
      console.error("Error cargando cierres/cajas pendientes:", error);
      alert(error.message || "No se pudieron cargar los cierres.");
    } finally {
      setCargandoCierres(false);
    }
  };

  const abrirCajaPendienteDesdeListado = async (jornadaPendiente) => {
    if (!jornadaPendiente?.id) return;

    const fechaPendiente = normalizarFechaISO(
      jornadaPendiente?.fecha_operativa_texto ||
      jornadaPendiente?.fecha_operativa
    );

    if (["SUPER_ADMIN", "ADMIN"].includes(rolActual)) {
      // El administrador solo selecciona la jornada del operador para el cierre.
      // NO adopta esa jornada y NO se guarda en localStorage.
      setJornadaCierreSeleccionada(jornadaPendiente);
    } else {
      setJornadaActiva(jornadaPendiente);
      localStorage.setItem(
        "jornadaActiva",
        JSON.stringify(jornadaPendiente)
      );
    }

    setEstadoOperativoCaja({
      permitido: false,
      estado_operativo: "CIERRE_PENDIENTE",
      requiere_abrir_jornada: false,
      requiere_cerrar_pendiente: true,
      jornada: jornadaPendiente,
      message: "Existe una caja pendiente de cierre.",
    });

    setCierreForm({
      fecha: fechaPendiente || obtenerFechaEcuadorISO(),
      negocio: "POS NUBE",
      tarjeta_manual: "0",
      transferencia_manual: "0",
      observacion: "",
      denominaciones: {
        billete_1: "", billete_2: "", billete_5: "", billete_10: "",
        billete_20: "", billete_50: "", billete_100: "",
        moneda_001: "", moneda_005: "", moneda_010: "",
        moneda_025: "", moneda_050: "", moneda_1: "",
      },
    });

    setMostrarCrearCierre(true);

    await cargarResumenCierre(
      fechaPendiente || obtenerFechaEcuadorISO(),
      jornadaPendiente
    );
  };

  const totalEfectivoContado = useMemo(() => {
    const d = cierreForm.denominaciones || {};
    return (
      Number(d.billete_1 || 0) * 1 + Number(d.billete_2 || 0) * 2 +
      Number(d.billete_5 || 0) * 5 + Number(d.billete_10 || 0) * 10 +
      Number(d.billete_20 || 0) * 20 + Number(d.billete_50 || 0) * 50 +
      Number(d.billete_100 || 0) * 100 + Number(d.moneda_001 || 0) * 0.01 +
      Number(d.moneda_005 || 0) * 0.05 + Number(d.moneda_010 || 0) * 0.10 +
      Number(d.moneda_025 || 0) * 0.25 + Number(d.moneda_050 || 0) * 0.50 +
      Number(d.moneda_1 || 0) * 1
    );
  }, [cierreForm.denominaciones]);

  const abrirDiagnosticoCierre = async (cierre) => {
    try {
      if (!cierre?.id) {
        alert("No se pudo identificar el cierre.");
        return;
      }

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida.");
        return;
      }

      const respuesta = await fetch(
        `${API_URL}/api/cierres/diagnostico/${Number(cierre.id)}?institucion_id=${Number(institucionId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.message || data.error || "No se pudo generar el diagnóstico."
        );
      }

      const ventana = window.open("", "_blank");

      if (!ventana) {
        console.log("DIAGNÓSTICO DE CIERRE:", data);
        alert(
          "El navegador bloqueó la ventana. El diagnóstico quedó impreso en la consola."
        );
        return;
      }

      const jsonSeguro = JSON.stringify(data, null, 2)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      ventana.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Diagnóstico cierre ${String(cierre.codigo_cierre || cierre.id)}</title>
            <style>
              body {
                margin: 0;
                padding: 24px;
                font-family: Arial, Helvetica, sans-serif;
                background: #f8fafc;
                color: #0f172a;
              }
              h1 { margin-top: 0; }
              .aviso {
                padding: 12px 14px;
                border: 1px solid #bfdbfe;
                border-radius: 10px;
                background: #eff6ff;
                margin-bottom: 16px;
                font-weight: 700;
              }
              pre {
                white-space: pre-wrap;
                overflow-wrap: anywhere;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 18px;
                font-size: 14px;
                line-height: 1.45;
              }
            </style>
          </head>
          <body>
            <h1>Diagnóstico de cierre</h1>
            <div class="aviso">
              SOLO LECTURA: esta pantalla no modifica ventas, cierres ni egresos.
            </div>
            <pre>${jsonSeguro}</pre>
          </body>
        </html>
      `);
      ventana.document.close();
    } catch (error) {
      console.error("Error diagnóstico cierre:", error);
      alert(error.message || "No se pudo abrir el diagnóstico.");
    }
  };

  const guardarCierre = async () => {
    try {
      setGuardandoCierre(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const jornadaParaCerrar = ["SUPER_ADMIN", "ADMIN"].includes(rolActual)
        ? jornadaCierreSeleccionada
        : jornadaActiva;

      if (!cierreForm.fecha) return alert("Selecciona la fecha del cierre.");
      if (!jornadaParaCerrar?.id) {
        return alert(
          ["SUPER_ADMIN", "ADMIN"].includes(rolActual)
            ? "Selecciona primero la caja del operador que deseas cerrar."
            : "No existe una jornada activa para realizar el cierre."
        );
      }

      const respuesta = await fetch(`${API_URL}/api/cierres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id: Number(institucionId),
          jornada_id: Number(jornadaParaCerrar?.id || 0),
          fecha: cierreForm.fecha,
          negocio: "POS NUBE",
          efectivo_contado: totalEfectivoContado,
          tarjeta_manual: Number(cierreForm.tarjeta_manual || 0),
          transferencia_manual: Number(cierreForm.transferencia_manual || 0),
          observacion: cierreForm.observacion || "",
          denominaciones: cierreForm.denominaciones,
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) {
        const detalleDescuadre =
          data?.code === "DESCUADRE_TRANSFERENCIA"
            ? `\nTransferencia contada: ${formatearMoneda(data.transferencia_contada)}\n` +
              `Transferencia registrada: ${formatearMoneda(data.transferencia_esperada)}\n` +
              `Diferencia: ${formatearMoneda(data.diferencia)}`
            : data?.code === "DESCUADRE_TARJETA"
            ? `\nTarjeta contada: ${formatearMoneda(data.tarjeta_contada)}\n` +
              `Tarjeta registrada: ${formatearMoneda(data.tarjeta_esperada)}\n` +
              `Diferencia: ${formatearMoneda(data.diferencia)}`
            : "";

        throw new Error(
          (data.error || data.message || "No se pudo guardar el cierre") +
          detalleDescuadre
        );
      }
      setMostrarCrearCierre(false);
      setCierreDetalle(data.cierre || null);

      // IMPORTANTE: cada cierre comienza con un conteo físico independiente.
      // No conservar billetes, monedas, tarjeta ni transferencia del cierre anterior.
      setCierreForm({
        fecha: obtenerFechaEcuadorISO(),
        negocio: "POS NUBE",
        tarjeta_manual: "0",
        transferencia_manual: "0",
        observacion: "",
        denominaciones: {
          billete_1: "", billete_2: "", billete_5: "", billete_10: "",
          billete_20: "", billete_50: "", billete_100: "",
          moneda_001: "", moneda_005: "", moneda_010: "",
          moneda_025: "", moneda_050: "", moneda_1: "",
        },
      });

      // CIERRE CONTINUO:
      // El backend devuelve una nueva jornada abierta automáticamente en el mismo punto.
      // Si existe, el operador sigue trabajando de inmediato y NO pasa por el flujo antiguo
      // que lo enviaba nuevamente al login.
      if (data?.nueva_jornada?.id) {
        const nuevaJornada = data.nueva_jornada;

        // IMPORTANTE: ADMIN / SUPER_ADMIN nunca adoptan la jornada del operador.
        // El backend puede abrir automáticamente la siguiente jornada del MISMO
        // operador para que la caja continúe, pero la sesión administrativa queda
        // totalmente separada y sin jornada propia.
        if (["SUPER_ADMIN", "ADMIN"].includes(rolActual)) {
          localStorage.removeItem("jornadaActiva");
          setJornadaActiva(null);
          setJornadaCierreSeleccionada(null);
          setEstadoOperativoCaja(null);
          setMostrarSelectorJornada(false);
          await cargarCierres();

          alert(
            "Cierre de caja guardado correctamente. La sesión de administrador continúa sin jornada propia."
          );

          return;
        }

        setJornadaActiva(nuevaJornada);
        localStorage.setItem("jornadaActiva", JSON.stringify(nuevaJornada));

        setEstadoOperativoCaja({
          permitido: true,
          estado_operativo: "OPERATIVA",
          requiere_abrir_jornada: false,
          requiere_cerrar_pendiente: false,
          jornada: nuevaJornada,
          message:
            "Cierre realizado. La nueva jornada quedó abierta automáticamente.",
        });

        setMostrarSelectorJornada(false);
        await cargarCierres();

        alert(
          "Cierre guardado correctamente. Puedes seguir vendiendo; las nuevas ventas quedarán para el próximo cierre."
        );

        return;
      }

      // Recordamos el acceso operativo que acaba de cerrar la caja para
      // que la siguiente jornada se pueda abrir sin volver a escoger todo.
      try {
        localStorage.setItem(
          "ultimoAccesoOperativo",
          JSON.stringify({
            institucion_id: Number(institucionId),
            punto_id: Number(jornadaActiva?.punto_id || 0),
            punto_nombre: String(
              jornadaActiva?.punto_nombre ||
              localNuevaOrden ||
              ""
            ),
            correo: String(
              usuario?.correo ||
              operadorJornadaCorreo ||
              ""
            ).trim(),
          })
        );
      } catch (_error) {
        // Si el navegador no permite guardar esta preferencia,
        // el cierre igualmente continúa normalmente.
      }

      // El backend cierra la jornada dentro de la misma transacción
      // del cierre de caja. Desde este instante no se puede operar hasta
      // abrir una nueva jornada.
      localStorage.removeItem("jornadaActiva");
      setJornadaActiva(null);
      setEstadoOperativoCaja({
        permitido:false,
        estado_operativo:"SIN_JORNADA",
        requiere_abrir_jornada:true,
        requiere_cerrar_pendiente:false,
        jornada:null,
        message:
          "Cierre realizado. Abre una nueva caja/jornada antes de continuar.",
      });
      setMostrarSelectorJornada(false);

      await cargarCierres();

      alert(
        "Cierre de caja guardado correctamente. Ahora puedes abrir una nueva jornada."
      );

      volverAlLoginOperativoSinJornada(
        "✅ Caja cerrada correctamente. Tu institución, ubicación y correo quedaron listos. Ingresa únicamente tu contraseña y pulsa “Ingresar y abrir jornada”."
      );
    } catch (error) {
      console.error("Error guardando cierre:", error);
      alert(error.message || "No se pudo guardar el cierre.");
    } finally {
      setGuardandoCierre(false);
    }
  };

  const verCierreConsolidado = async () => {
    try {
      setCargandoConsolidado(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const fecha = cierreCajaFiltros.fecha_fin || obtenerFechaEcuadorISO();

      const respuesta = await fetch(
        `${API_URL}/api/cierres/consolidado?institucion_id=${institucionId}&fecha=${fecha}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.message || data.error || "No se pudo calcular el cierre total"
        );
      }

      setCierreConsolidado(data);
    } catch (error) {
      console.error("Error cargando cierre total:", error);
      alert(error.message || "No se pudo calcular el cierre total.");
    } finally {
      setCargandoConsolidado(false);
    }
  };

  const verCierre = async (cierre) => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(
        `${API_URL}/api/cierres/${cierre.id}?institucion_id=${institucionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo abrir el cierre");
      setCierreDetalle(data);
    } catch (error) {
      alert(error.message || "No se pudo abrir el cierre.");
    }
  };

  const eliminarCierre = async (cierre) => {
    if (!window.confirm("¿Deseas eliminar este cierre? Las ventas, recargas y egresos no serán eliminados.")) return;
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(`${API_URL}/api/cierres/${cierre.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ institucion_id: Number(institucionId) }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo eliminar el cierre");
      await cargarCierres();
    } catch (error) {
      alert(error.message || "No se pudo eliminar el cierre.");
    }
  };

  const alternarSeleccionId = (setter, id, marcado) => {
    const numero = Number(id);
    setter((actual) => {
      const set = new Set((actual || []).map(Number));
      if (marcado) set.add(numero);
      else set.delete(numero);
      return Array.from(set);
    });
  };

  const eliminarProductosPruebaSeleccionados = async ({
    ids,
    origen = "menu",
  }) => {
    const seleccion = [...new Set((ids || []).map(Number).filter(Boolean))];

    if (!["SUPER_ADMIN", "ADMIN"].includes(rolActual)) {
      alert("Solo ADMIN o SUPER_ADMIN puede eliminar productos.");
      return;
    }

    if (!seleccion.length) {
      alert("Selecciona al menos un producto.");
      return;
    }

    const textoOrigen = origen === "stock" ? "Stock" : "Menú Cafetería";
    const confirmado = window.confirm(
      `¿Eliminar definitivamente ${seleccion.length} producto(s) seleccionado(s) desde ${textoOrigen}?\n\n` +
      "Se eliminarán también sus existencias y movimientos de inventario. " +
      "Por seguridad, el sistema NO permitirá borrar productos que ya tengan ventas registradas."
    );

    if (!confirmado) return;

    try {
      setEliminandoProductosPrueba(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        throw new Error("Sesión o institución no válida.");
      }

      const endpoint =
        origen === "stock"
          ? `${API_URL}/api/inventario/productos/eliminar-seleccionados`
          : `${API_URL}/api/productos/eliminar-seleccionados`;

      const respuesta = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id: Number(institucionId),
          ids: seleccion,
        }),
      });

      const data = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "No se pudieron eliminar los productos seleccionados."
        );
      }

      setProductosMenuSeleccionadosBorrar([]);
      setProductosStockSeleccionadosBorrar([]);
      setProductosSeleccionados({});

      if (
        productoDetalle &&
        seleccion.includes(Number(productoDetalle.id))
      ) {
        setProductoDetalle(null);
      }

      if (
        productoEditando &&
        seleccion.includes(Number(productoEditando.id))
      ) {
        setProductoEditando(null);
        setMostrarFormularioProducto(false);
      }

      await Promise.all([
        cargarProductos(),
        cargarExistenciasInventario(),
      ]);

      alert(
        data.message ||
        `${seleccion.length} producto(s) eliminado(s) correctamente.`
      );
    } catch (error) {
      console.error("Error eliminando productos seleccionados:", error);
      alert(
        error.message ||
        "No se pudieron eliminar los productos seleccionados."
      );
    } finally {
      setEliminandoProductosPrueba(false);
    }
  };

  const eliminarProductosMenuSeleccionados = () =>
    eliminarProductosPruebaSeleccionados({
      ids: productosMenuSeleccionadosBorrar,
      origen: "menu",
    });

  const eliminarProductosStockSeleccionados = () =>
    eliminarProductosPruebaSeleccionados({
      ids: productosStockSeleccionadosBorrar,
      origen: "stock",
    });

  const eliminarVentasSeleccionadas = async () => {
    const ids = [...new Set((ventasSeleccionadasBorrar || []).map(Number).filter(Boolean))];

    if (!ids.length) {
      return alert("Selecciona al menos una venta.");
    }

    if (
      !window.confirm(
        `¿Eliminar ${ids.length} venta(s) seleccionada(s)?\n\n` +
        "El sistema procesará cada venta por separado. Las ventas que tengan " +
        "pagos/créditos relacionados se conservarán y se informarán al final."
      )
    ) {
      return;
    }

    try {
      setEliminandoPruebas(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      let eliminadas = [];
      let bloqueadas = [];

      for (const id of ids) {
        try {
          const respuesta = await fetch(
            `${API_URL}/api/ventas/eliminar-seleccionadas`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                institucion_id: Number(institucionId),
                ids: [Number(id)],
              }),
            }
          );

          const data = await respuesta.json().catch(() => ({}));

          if (!respuesta.ok) {
            bloqueadas.push({
              id: Number(id),
              motivo:
                data.message ||
                data.error ||
                "No se pudo eliminar esta venta.",
            });
            continue;
          }

          eliminadas.push(Number(id));
        } catch (errorVenta) {
          bloqueadas.push({
            id: Number(id),
            motivo:
              errorVenta.message ||
              "No se pudo eliminar esta venta.",
          });
        }
      }

      setVentasSeleccionadasBorrar(
        bloqueadas.map((item) => Number(item.id))
      );

      await Promise.all([
        cargarVentas(),
        cargarProductos(),
        cargarAlumnos(),
        cargarProfesores(),
      ]);

      let mensaje =
        `Proceso terminado.\n\n` +
        `Ventas eliminadas: ${eliminadas.length}\n` +
        `Ventas pendientes: ${bloqueadas.length}`;

      if (bloqueadas.length) {
        mensaje +=
          `\n\nPendientes:\n` +
          bloqueadas
            .slice(0, 10)
            .map((item) => `#${item.id}: ${item.motivo}`)
            .join("\n");

        if (bloqueadas.length > 10) {
          mensaje += `\n... y ${bloqueadas.length - 10} más.`;
        }
      }

      alert(mensaje);
    } catch (error) {
      alert(
        error.message ||
        "No se pudieron procesar las ventas seleccionadas."
      );
    } finally {
      setEliminandoPruebas(false);
    }
  };

  const eliminarRecargasSeleccionadas = async () => {
    if (!recargasSeleccionadasBorrar.length) return alert("Selecciona al menos una recarga.");
    if (!window.confirm(`¿Eliminar ${recargasSeleccionadasBorrar.length} recarga(s) seleccionada(s)? El sistema revertirá saldo y crédito automáticamente.`)) return;

    try {
      setEliminandoPruebas(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(`${API_URL}/api/recargas/eliminar-seleccionadas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ institucion_id: Number(institucionId), ids: recargasSeleccionadasBorrar }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || "No se pudieron eliminar las recargas seleccionadas");
      setRecargasSeleccionadasBorrar([]);
      await Promise.all([cargarRecargas(), cargarAlumnos()]);
      alert(data.message || "Recargas eliminadas correctamente.");
    } catch (error) {
      alert(error.message || "No se pudieron eliminar las recargas seleccionadas.");
    } finally {
      setEliminandoPruebas(false);
    }
  };

  const eliminarCierresSeleccionados = async () => {
    if (!cierresSeleccionadosBorrar.length) return alert("Selecciona al menos un cierre.");
    if (!window.confirm(`¿Eliminar ${cierresSeleccionadosBorrar.length} cierre(s) seleccionado(s)? No se eliminarán automáticamente ventas, recargas ni egresos.`)) return;

    try {
      setEliminandoPruebas(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(`${API_URL}/api/cierres/eliminar-seleccionados`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ institucion_id: Number(institucionId), ids: cierresSeleccionadosBorrar }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || "No se pudieron eliminar los cierres seleccionados");
      setCierresSeleccionadosBorrar([]);
      await cargarCierres();
      alert(data.message || "Cierres eliminados correctamente.");
    } catch (error) {
      alert(error.message || "No se pudieron eliminar los cierres seleccionados.");
    } finally {
      setEliminandoPruebas(false);
    }
  };

  const eliminarJornadasSeleccionadas = async () => {
    if (!jornadasSeleccionadasBorrar.length) return alert("Selecciona al menos una jornada.");
    if (!window.confirm(`¿Eliminar ${jornadasSeleccionadasBorrar.length} jornada(s) seleccionada(s)? Solo se borrarán si ya no tienen cierre ni ventas relacionadas.`)) return;

    try {
      setEliminandoPruebas(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const ids = [...jornadasSeleccionadasBorrar];
      const respuesta = await fetch(`${API_URL}/api/jornadas/eliminar-seleccionadas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ institucion_id: Number(institucionId), ids }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || "No se pudieron eliminar las jornadas seleccionadas");

      if (jornadaActiva?.id && ids.map(Number).includes(Number(jornadaActiva.id))) {
        localStorage.removeItem("jornadaActiva");
        setJornadaActiva(null);
      }
      setJornadasSeleccionadasBorrar([]);
      await cargarCierres();
      alert(data.message || "Jornadas eliminadas correctamente.");
    } catch (error) {
      alert(error.message || "No se pudieron eliminar las jornadas seleccionadas.");
    } finally {
      setEliminandoPruebas(false);
    }
  };

  useEffect(() => {
    if (!usuario || !institucionActivaId) return;
    if (vista === "egresos_diarios") cargarEgresos();
    if (vista === "reporte_cierre") cargarCierres();
  }, [vista, institucionActivaId]);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accesoOperativo");
    localStorage.removeItem("usuario");
    localStorage.removeItem("institucionSeleccionadaId");
    localStorage.removeItem("jornadaActiva");
    setUsuario(null);
    setJornadaActiva(null);setPuntosOperacion([]);setMostrarSelectorJornada(false);
    setResumen(null);
    setProductos([]);
    setAlumnos([]);
    setProfesores([]);
    setProfesorDetalle(null);
    setCreditosProfesores([]);
    setRecargas([]);
    setVentas([]);
    setCorreo("");
    setPassword("");
    setMensaje("");
    setVista("dashboard");
    setInstitucionSeleccionadaId(null);
    setLoginPuntoId("ADMIN");
    setLoginPuntosOperacion([]);
    setLoginInstitucionId("");
    setVistaVentasInterna("consultar");
    setVistaRecargasInterna("lista");
    limpiarFormularioAlumno();
    limpiarFormularioProducto();
    limpiarFormularioRecarga();
    limpiarFormularioVenta();
    limpiarFiltrosVentas();
    limpiarFiltrosRecargas();
    limpiarFiltrosCierreCaja();
  };

const parametrosAccesoPublico = new URLSearchParams(window.location.search);

const esConsultaPublicaAlumno =
  parametrosAccesoPublico.get("consulta") === "alumno";

const esPortalPadresPublico =
  parametrosAccesoPublico.get("portal") === "padres";

if (esConsultaPublicaAlumno) {
  return <ConsultaAlumnoPublica API_URL={API_URL} />;
}

if (esPortalPadresPublico && !esRolPortal) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #f8fafc 55%, #eef2ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#ffffff",
          borderRadius: 24,
          padding: "34px 34px 30px",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.14)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            onClick={registrarClickAccesoAdminPadres}
            title=""
            style={{
              display: "inline-flex",
              cursor: "default",
              userSelect: "none",
              alignItems: "center",
              justifyContent: "center",
              width: 62,
              height: 62,
              borderRadius: 18,
              background: "#1d4ed8",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 25,
              marginBottom: 14,
            }}
          >
            P
          </div>

          <h1
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            Portal de Padres
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#64748b",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            Consulta saldo, consumos y recargas de tus hijos.
          </p>

          {!appPadresInstalada && (
            <button
              type="button"
              onClick={instalarAppPadres}
              style={{
                marginTop: 14,
                padding: "10px 15px",
                borderRadius: 12,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              📲 Instalar POS NUBE Padres
            </button>
          )}

          {mensajeInstalacionPadres && (
            <div
              style={{
                marginTop: 10,
                padding: "9px 11px",
                borderRadius: 10,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {mensajeInstalacionPadres}
            </div>
          )}
        </div>

        {!mostrarRegistroPadrePortal ? (
          <>
            <form onSubmit={handleLoginPortalPadres} style={styles.form}>
              <label style={styles.label}>Institución</label>
              <select
                value={loginInstitucionId}
                onChange={(e) => setLoginInstitucionId(e.target.value)}
                style={styles.input}
                required
              >
                <option value="">Seleccione una institución</option>
                {INSTITUCIONES.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Cédula o correo</label>
              <input
                type="text"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={styles.input}
                placeholder="Cédula o correo registrado"
                required
              />

              <label style={styles.label}>Contraseña</label>
              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordLogin ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputPassword}
                  placeholder="Contraseña"
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordLogin(!verPasswordLogin)}
                >
                  {verPasswordLogin ? "Ocultar" : "Ver"}
                </button>
              </div>

              <button
                type="submit"
                style={{ ...styles.button, marginTop: 10 }}
                disabled={cargando}
              >
                {cargando ? "Ingresando..." : "Ingresar al Portal de Padres"}
              </button>
            </form>

            <div style={{ marginTop: 18, textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 13 }}>
                ¿Es tu primera vez en el Portal?
              </p>
              <button
                type="button"
                style={styles.linkButton}
                onClick={() => {
                  setMostrarRegistroPadrePortal(true);
                  setMensaje("");
                  setMensajeRegistroPadre("");
                }}
              >
                Crear mi cuenta
              </button>
            </div>

            {mensaje && (
              <div
                style={
                  String(mensaje)
                    .toLowerCase()
                    .includes("cuenta creada correctamente")
                    ? {
                        marginTop: 16,
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "#ecfdf5",
                        border: "1px solid #10b981",
                        color: "#166534",
                        fontWeight: 800,
                        lineHeight: 1.45,
                        textAlign: "center",
                      }
                    : styles.message
                }
              >
                {mensaje}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 style={{ ...styles.title, fontSize: 23, marginBottom: 6 }}>
              Crear cuenta de padre
            </h2>
            <p style={{ ...styles.subtitle, marginBottom: 18 }}>
              Crea tu cuenta directamente. Después de iniciar sesión entrarás
              al Panel de Padres y desde allí podrás vincular a tu hijo.
            </p>

            <form onSubmit={handleRegistroPortalPadres} style={styles.form}>
              <label style={styles.label}>Institución</label>
              <select
                value={loginInstitucionId}
                onChange={(e) => setLoginInstitucionId(e.target.value)}
                style={styles.input}
                required
              >
                <option value="">Seleccione una institución</option>
                {INSTITUCIONES.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Cédula del representante</label>
              <input
                type="text"
                value={registroPadrePortal.cedula}
                onChange={(e) =>
                  setRegistroPadrePortal({
                    ...registroPadrePortal,
                    cedula: e.target.value,
                  })
                }
                style={styles.input}
                placeholder="Número de cédula"
                required
              />

              <label style={styles.label}>Nombres del representante</label>
              <input
                type="text"
                value={registroPadrePortal.nombres}
                onChange={(e) =>
                  setRegistroPadrePortal({
                    ...registroPadrePortal,
                    nombres: e.target.value,
                  })
                }
                style={styles.input}
                placeholder="Nombres"
                required
              />

              <label style={styles.label}>Apellidos del representante</label>
              <input
                type="text"
                value={registroPadrePortal.apellidos}
                onChange={(e) =>
                  setRegistroPadrePortal({
                    ...registroPadrePortal,
                    apellidos: e.target.value,
                  })
                }
                style={styles.input}
                placeholder="Apellidos"
                required
              />

              <label style={styles.label}>Correo electrónico</label>
              <input
                type="email"
                value={registroPadrePortal.correo}
                onChange={(e) =>
                  setRegistroPadrePortal({
                    ...registroPadrePortal,
                    correo: e.target.value,
                  })
                }
                style={styles.input}
                placeholder="Correo para ingresar al Portal"
                required
              />

              <label style={styles.label}>Crear contraseña</label>
              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordNueva ? "text" : "password"}
                  value={registroPadrePortal.password}
                  onChange={(e) =>
                    setRegistroPadrePortal({
                      ...registroPadrePortal,
                      password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordNueva(!verPasswordNueva)}
                >
                  {verPasswordNueva ? "Ocultar" : "Ver"}
                </button>
              </div>

              <label style={styles.label}>Confirmar contraseña</label>
              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordConfirmar ? "text" : "password"}
                  value={registroPadrePortal.confirmar_password}
                  onChange={(e) =>
                    setRegistroPadrePortal({
                      ...registroPadrePortal,
                      confirmar_password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordConfirmar(!verPasswordConfirmar)}
                >
                  {verPasswordConfirmar ? "Ocultar" : "Ver"}
                </button>
              </div>

              <button
                type="submit"
                style={{ ...styles.button, marginTop: 10 }}
                disabled={cargandoRegistroPadre}
              >
                {cargandoRegistroPadre
                  ? "Creando cuenta..."
                  : "Crear mi cuenta"}
              </button>
            </form>

            <button
              type="button"
              style={{ ...styles.linkButton, marginTop: 14 }}
              onClick={() => {
                setMostrarRegistroPadrePortal(false);
                setMensajeRegistroPadre("");
              }}
            >
              ← Ya tengo cuenta
            </button>

            {mensajeRegistroPadre && (
              <div
                style={
                  String(mensajeRegistroPadre)
                    .toLowerCase()
                    .includes("cuenta creada correctamente")
                    ? {
                        marginTop: 16,
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "#ecfdf5",
                        border: "1px solid #10b981",
                        color: "#166534",
                        fontWeight: 800,
                        lineHeight: 1.45,
                        textAlign: "center",
                      }
                    : styles.message
                }
              >
                {mensajeRegistroPadre}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

if (!usuario) {
  return (
    <div style={styles.page}>
      <div style={styles.loginCard}>
        {!mostrarCambiarAcceso && !mostrarCrearCuenta ? (
          <>
            <h1 style={styles.title}>¡Bienvenido a POSNUBE!</h1>
            <p style={styles.subtitle}>
              Selecciona la institución e inicia sesión.
            </p>

            <form onSubmit={handleLogin} style={styles.form}>
              <label style={styles.label}>Institución</label>
              <select
                value={loginInstitucionId}
                onChange={async (e) => {
                  const valor = e.target.value;
                  setLoginInstitucionId(valor);
                  setLoginPuntoId("ADMIN");
                  await cargarPuntosLoginPublicos(valor);
                }}
                style={styles.input}
                required
              >
                <option value="">Seleccione una institución</option>
                {INSTITUCIONES.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Acceso / ubicación</label>
              <select
                value={loginPuntoId}
                onChange={(e) => setLoginPuntoId(e.target.value)}
                style={styles.input}
                disabled={!loginInstitucionId || cargandoLoginPuntos}
                required
              >
                <option value="ADMIN">ADMINISTRACIÓN</option>
                {loginPuntosOperacion.map((punto) => (
                  <option key={punto.id} value={punto.id}>
                    {punto.nombre}
                  </option>
                ))}
              </select>

              {loginInstitucionId && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 9,
                    background: loginPuntoId === "ADMIN" ? "#eff6ff" : "#f0fdf4",
                    color: loginPuntoId === "ADMIN" ? "#1e40af" : "#166534",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  {loginPuntoId === "ADMIN"
                    ? "Acceso administrativo: configuración, usuarios, reportes y supervisión. No abre jornada."
                    : "Acceso operativo: valida las credenciales del operador y abre o continúa la jornada de esta ubicación."}
                </div>
              )}

              <label style={styles.label}>Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={styles.input}
                required
              />

              <label style={styles.label}>Contraseña</label>
              <div style={styles.passwordWrap}>
                <input
  type={verPasswordLogin ? "text" : "password"}
  placeholder="Contraseña"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  style={styles.inputPassword}
  required
/>
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordLogin(!verPasswordLogin)}
                >
                  {verPasswordLogin ? "Ocultar" : "Ver"}
                </button>
              </div>

              <div style={styles.loginExtraRow}>
                <button
                  type="button"
                  style={styles.linkButton}
                  onClick={() => {
                    setMostrarCambiarAcceso(true);
                    setMostrarCrearCuenta(false);
                  }}
                >
                  Cambiar usuario / contraseña
                </button>

                <button
                  type="button"
                  style={styles.linkButton}
                  onClick={() => {
                    setMostrarCrearCuenta(true);
                    setMostrarCambiarAcceso(false);
                  }}
                >
                  Crear cuenta
                </button>
              </div>

              <button type="submit" style={styles.button} disabled={cargando}>
                {cargando
                  ? "Ingresando..."
                  : loginPuntoId === "ADMIN"
                  ? "Ingresar a administración"
                  : "Ingresar y abrir jornada"}
              </button>
            </form>

            {mensaje && (
              <div
                style={
                  String(mensaje).includes("Caja cerrada")
                    ? {
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 10,
                        background: "#ecfdf5",
                        border: "1px solid #10b981",
                        color: "#065f46",
                        fontWeight: 800,
                        lineHeight: 1.45,
                      }
                    : styles.message
                }
              >
                {mensaje}
              </div>
            )}

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                ¿Eres padre o representante?
              </p>
              <a
                href={`${window.location.pathname}?portal=padres`}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontWeight: 800,
                  textDecoration: "none",
                  border: "1px solid #bfdbfe",
                }}
              >
                Entrar al Portal de Padres
              </a>
            </div>
          </>
        ) : mostrarCambiarAcceso ? (
          <>
            <h1 style={styles.title}>Cambiar acceso</h1>

            <form onSubmit={handleCambiarAcceso} style={styles.form}>
              <select
                value={cambiarAccesoForm.institucion_id}
                onChange={(e) =>
                  setCambiarAccesoForm({
                    ...cambiarAccesoForm,
                    institucion_id: e.target.value,
                  })
                }
                style={styles.input}
                required
              >
                <option value="">Seleccione institución</option>
                {INSTITUCIONES.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre}
                  </option>
                ))}
              </select>

              <input
                type="email"
                placeholder="Correo actual"
                value={cambiarAccesoForm.correo_actual}
                onChange={(e) =>
                  setCambiarAccesoForm({
                    ...cambiarAccesoForm,
                    correo_actual: e.target.value,
                  })
                }
                style={styles.input}
                required
              />

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordActual ? "text" : "password"}
                  placeholder="Contraseña actual"
                  value={cambiarAccesoForm.password_actual}
                  onChange={(e) =>
                    setCambiarAccesoForm({
                      ...cambiarAccesoForm,
                      password_actual: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordActual(!verPasswordActual)}
                >
                  {verPasswordActual ? "Ocultar" : "Ver"}
                </button>
              </div>

              <input
                type="email"
                placeholder="Nuevo correo"
                value={cambiarAccesoForm.nuevo_correo}
                onChange={(e) =>
                  setCambiarAccesoForm({
                    ...cambiarAccesoForm,
                    nuevo_correo: e.target.value,
                  })
                }
                style={styles.input}
                required
              />

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordNueva ? "text" : "password"}
                  placeholder="Nueva contraseña"
                  value={cambiarAccesoForm.nueva_password}
                  onChange={(e) =>
                    setCambiarAccesoForm({
                      ...cambiarAccesoForm,
                      nueva_password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordNueva(!verPasswordNueva)}
                >
                  {verPasswordNueva ? "Ocultar" : "Ver"}
                </button>
              </div>

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordConfirmar ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  value={cambiarAccesoForm.confirmar_password}
                  onChange={(e) =>
                    setCambiarAccesoForm({
                      ...cambiarAccesoForm,
                      confirmar_password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() =>
                    setVerPasswordConfirmar(!verPasswordConfirmar)
                  }
                >
                  {verPasswordConfirmar ? "Ocultar" : "Ver"}
                </button>
              </div>

              <button
                type="submit"
                style={styles.button}
                disabled={cargandoCambiarAcceso}
              >
                {cargandoCambiarAcceso ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={() => {
                  setMostrarCambiarAcceso(false);
                  setMensajeCambiarAcceso("");
                }}
              >
                Volver
              </button>
            </form>

            {mensajeCambiarAcceso && (
              <p style={styles.message}>{mensajeCambiarAcceso}</p>
            )}
          </>
        ) : (
          <>
            <h1 style={styles.title}>Crear cuenta</h1>

            <form onSubmit={handleCrearCuenta} style={styles.form}>
              <select
                value={crearCuentaForm.institucion_id}
                onChange={(e) =>
                  setCrearCuentaForm({
                    ...crearCuentaForm,
                    institucion_id: e.target.value,
                  })
                }
                style={styles.input}
                required
              >
                <option value="">Seleccione institución</option>
                {INSTITUCIONES.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Nombre"
                value={crearCuentaForm.nombre}
                onChange={(e) =>
                  setCrearCuentaForm({
                    ...crearCuentaForm,
                    nombre: e.target.value,
                  })
                }
                style={styles.input}
                required
              />

              <input
                type="email"
                placeholder="Correo"
                value={crearCuentaForm.correo}
                onChange={(e) =>
                  setCrearCuentaForm({
                    ...crearCuentaForm,
                    correo: e.target.value,
                  })
                }
                style={styles.input}
                required
              />

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordNueva ? "text" : "password"}
                  placeholder="Contraseña"
                  value={crearCuentaForm.password}
                  onChange={(e) =>
                    setCrearCuentaForm({
                      ...crearCuentaForm,
                      password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordNueva(!verPasswordNueva)}
                >
                  {verPasswordNueva ? "Ocultar" : "Ver"}
                </button>
              </div>

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordConfirmar ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  value={crearCuentaForm.confirmar_password}
                  onChange={(e) =>
                    setCrearCuentaForm({
                      ...crearCuentaForm,
                      confirmar_password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() =>
                    setVerPasswordConfirmar(!verPasswordConfirmar)
                  }
                >
                  {verPasswordConfirmar ? "Ocultar" : "Ver"}
                </button>
              </div>

              <button
                type="submit"
                style={styles.button}
                disabled={cargandoCrearCuenta}
              >
                {cargandoCrearCuenta ? "Creando..." : "Crear cuenta"}
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={() => {
                  setMostrarCrearCuenta(false);
                  setMensajeCrearCuenta("");
                }}
              >
                Volver
              </button>
            </form>

            {mensajeCrearCuenta && (
              <p style={styles.message}>{mensajeCrearCuenta}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

  if (esRolPortal) {
    return (
      <PortalUsuarioModulo
        API_URL={API_URL}
        usuario={usuario}
        onCerrarSesion={cerrarSesion}
      />
    );
  }

  return (
    <div
      style={{
        ...styles.appShell,
        gridTemplateColumns: esPantallaCompacta
          ? "minmax(0, 1fr)"
          : styles.appShell.gridTemplateColumns,
      }}
    >
      {["ENCARGADO_LOCAL","CAJERO"].includes(rolActual) &&
       estadoOperativoCaja?.estado_operativo==="CIERRE_PENDIENTE"&&(
        <div
          style={{
            position:"fixed",
            top:0,
            left:0,
            right:0,
            zIndex:199999,
            background:"#991b1b",
            color:"#fff",
            padding:"10px 18px",
            textAlign:"center",
            fontWeight:900,
            boxShadow:"0 4px 12px rgba(0,0,0,.25)",
          }}
        >
          CAJA PENDIENTE DE CIERRE · {
            estadoOperativoCaja?.message||
            "Debes cerrar la jornada anterior antes de continuar."
          }
        </div>
      )}

      {cargandoEstadoOperativoCaja&&(
        <div
          style={{
            position:"fixed",
            right:18,
            bottom:18,
            zIndex:200001,
            background:"#0f172a",
            color:"#fff",
            borderRadius:10,
            padding:"9px 12px",
            fontSize:12,
            fontWeight:800,
          }}
        >
          Validando estado de caja...
        </div>
      )}

      {["ENCARGADO_LOCAL","CAJERO"].includes(rolActual) &&
       !jornadaActiva?.id &&
       estadoOperativoCaja?.estado_operativo!=="OPERATIVA" &&
       !cargandoEstadoOperativoCaja && (
        <div
          style={{
            position:"fixed",
            inset:0,
            zIndex:200600,
            background:"rgba(15,23,42,0.72)",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            padding:16,
          }}
        >
          <div
            style={{
              width:"min(460px, 100%)",
              background:"#ffffff",
              borderRadius:18,
              padding:22,
              boxShadow:"0 20px 60px rgba(0,0,0,.35)",
              textAlign:"center",
              border:"2px solid #2563eb",
            }}
          >
            <div
              style={{
                width:58,
                height:58,
                margin:"0 auto 12px",
                borderRadius:16,
                background:"#dbeafe",
                color:"#1d4ed8",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                fontSize:30,
                fontWeight:1000,
              }}
            >
              ▶
            </div>

            <h2
              style={{
                margin:"0 0 8px",
                color:"#0f172a",
                fontSize:24,
              }}
            >
              Debes abrir una nueva jornada
            </h2>

            <p
              style={{
                margin:"0 0 18px",
                color:"#475569",
                lineHeight:1.5,
                fontSize:15,
              }}
            >
              No existe una jornada abierta para este operador. Para continuar
              con ventas, abre una nueva jornada.
            </p>

            <div
              style={{
                display:"grid",
                gap:12,
                textAlign:"left",
              }}
            >
              <div>
                <label
                  style={{
                    display:"block",
                    marginBottom:6,
                    color:"#0f172a",
                    fontWeight:800,
                    fontSize:14,
                  }}
                >
                  Ubicación *
                </label>

                <select
                  value={puntoJornadaSeleccionado}
                  onChange={(e) =>
                    setPuntoJornadaSeleccionado(e.target.value)
                  }
                  style={{
                    width:"100%",
                    minHeight:48,
                    border:"1px solid #cbd5e1",
                    borderRadius:10,
                    padding:"10px 12px",
                    fontSize:16,
                    background:"#fff",
                    color:"#0f172a",
                  }}
                >
                  <option value="">
                    {obtenerPuntosJornadaDisponibles(puntosOperacion).length
                      ? "Selecciona ubicación"
                      : "Cargando ubicaciones..."}
                  </option>

                  {obtenerPuntosJornadaDisponibles(puntosOperacion).map(
                    (punto) => (
                      <option key={punto.id} value={punto.id}>
                        {punto.nombre}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display:"block",
                    marginBottom:6,
                    color:"#0f172a",
                    fontWeight:800,
                    fontSize:14,
                  }}
                >
                  Operador
                </label>

                <input
                  type="email"
                  value={operadorJornadaCorreo}
                  readOnly
                  style={{
                    width:"100%",
                    boxSizing:"border-box",
                    minHeight:48,
                    border:"1px solid #cbd5e1",
                    borderRadius:10,
                    padding:"10px 12px",
                    fontSize:15,
                    background:"#f8fafc",
                    color:"#334155",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display:"block",
                    marginBottom:6,
                    color:"#0f172a",
                    fontWeight:800,
                    fontSize:14,
                  }}
                >
                  Contraseña *
                </label>

                <div
                  style={{
                    display:"flex",
                    gap:8,
                    alignItems:"stretch",
                  }}
                >
                  <input
                    type={
                      verPasswordOperadorJornada
                        ? "text"
                        : "password"
                    }
                    value={operadorJornadaPassword}
                    onChange={(e) =>
                      setOperadorJornadaPassword(e.target.value)
                    }
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    style={{
                      flex:1,
                      minWidth:0,
                      minHeight:48,
                      border:"1px solid #cbd5e1",
                      borderRadius:10,
                      padding:"10px 12px",
                      fontSize:16,
                      boxSizing:"border-box",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setVerPasswordOperadorJornada(
                        (actual) => !actual
                      )
                    }
                    style={{
                      minWidth:62,
                      border:"1px solid #cbd5e1",
                      borderRadius:10,
                      background:"#f8fafc",
                      color:"#0f172a",
                      fontWeight:800,
                      padding:"0 10px",
                    }}
                  >
                    {verPasswordOperadorJornada ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={abrirJornada}
                disabled={
                  cargandoJornada ||
                  !puntoJornadaSeleccionado ||
                  !operadorJornadaPassword
                }
                style={{
                  width:"100%",
                  minHeight:52,
                  border:0,
                  borderRadius:12,
                  background:
                    cargandoJornada ||
                    !puntoJornadaSeleccionado ||
                    !operadorJornadaPassword
                      ? "#94a3b8"
                      : "#2563eb",
                  color:"#fff",
                  fontSize:17,
                  fontWeight:900,
                  padding:"12px 14px",
                  cursor:"pointer",
                }}
              >
                {cargandoJornada
                  ? "Abriendo jornada..."
                  : !puntoJornadaSeleccionado
                  ? "Esperando ubicación..."
                  : !operadorJornadaPassword
                  ? "Ingresa tu contraseña"
                  : "Abrir jornada y continuar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* La apertura de una nueva jornada se realiza desde el login operativo.
          Cuando no existe jornada, el botón anterior lleva directamente
          al operador al acceso ya preparado. */}

      {esPantallaCompacta && (
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMenuQ2Abierto((actual) => !actual)}
          style={{
            position: "fixed",
            left: 10,
            top: 10,
            zIndex: 200500,
            width: 46,
            height: 46,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.35)",
            background: "#1e3a8a",
            color: "#ffffff",
            fontSize: 25,
            fontWeight: 900,
            boxShadow: "0 6px 18px rgba(15,23,42,0.25)",
            cursor: "pointer",
          }}
        >
          {menuQ2Abierto ? "×" : "☰"}
        </button>
      )}

      {esPantallaCompacta && menuQ2Abierto && (
        <div
          onClick={() => setMenuQ2Abierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            zIndex: 200300,
          }}
        />
      )}

      <aside
        style={{
          ...styles.sidebar,
          ...(esPantallaCompacta
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                zIndex: 200400,
                width: "min(82vw, 280px)",
                height: "100dvh",
                minHeight: "100vh",
                padding: "68px 14px 16px",
                overflowY: "auto",
                transform: menuQ2Abierto
                  ? "translateX(0)"
                  : "translateX(-105%)",
                transition: "transform 0.2s ease",
                boxShadow: "12px 0 30px rgba(15,23,42,0.28)",
              }
            : {}),
        }}
      >
        <div>
          <h2 style={styles.logo}>POS NUBE</h2>

          <div style={styles.institucionBadge}>
            <span style={styles.institucionLabel}>Institución</span>
            <strong style={styles.institucionName}>
              {institucionActiva?.nombre || "Sin seleccionar"}
            </strong>
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {rolActual || "SIN ROL"}
            </span>
          </div>

          <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 16,
  }}
>
  {[
    {
      id: "dashboard",
      icono: "▦",
      texto: "Dashboard",
      activo: vista === "dashboard",
      accion: () => setVista("dashboard"),
    },
    {
      id: "consultar_ventas",
      icono: "▣",
      texto: "Ventas",
      activo:
        vista === "ventas" &&
        vistaVentasInterna === "consultar",
      accion: () => {
        setVista("ventas");
        setVistaVentasInterna("consultar");
      },
    },
    {
      id: "nueva_orden",
      icono: "＋",
      texto: "Nueva Orden",
      activo:
        vista === "ventas" &&
        vistaVentasInterna === "registrar",
      accion: () => {
        abrirNuevaOrdenConsumidorFinal();
      },
    },
    {
      id: "alumnos",
      icono: "◎",
      texto: "Alumnos",
      activo: vista === "alumnos",
      accion: () => setVista("alumnos"),
    },
    {
      id: "padres",
      icono: "♙",
      texto: "Padres",
      activo: vista === "padres",
      accion: () => setVista("padres"),
    },
    {
      id: "profesores",
      icono: "◉",
      texto: "Profesores",
      activo:
        vista === "profesores" ||
        vista === "creditos_profesores",
      accion: () => {
        setVista("profesores");
        setVistaProfesoresInterna("profesores");
      },
    },
    {
      id: "menu_cafeteria",
      icono: "▤",
      texto: "Menú Cafetería",
      activo: vista === "productos",
      accion: () => setVista("productos"),
    },
    {
      id: "stock",
      icono: "▥",
      texto: "Stock",
      activo: vista === "inventario",
      accion: () => setVista("inventario"),
    },
    {
      id: "recargas",
      icono: "$",
      texto: "Recargas",
      activo: vista === "recargas",
      accion: () => setVista("recargas"),
    },
    {
      id: "egresos",
      icono: "−",
      texto: "Egresos diarios",
      activo: vista === "egresos_diarios",
      accion: () => setVista("egresos_diarios"),
    },
    {
      id: "cierre_caja",
      icono: "◫",
      texto: "Cierre de caja",
      activo: vista === "reporte_cierre",
      accion: () => setVista("reporte_cierre"),
    },
    {
      id: "productos_vendidos",
      icono: "▧",
      texto: "Productos vendidos",
      activo: vista === "reporte_productos",
      accion: () => setVista("reporte_productos"),
    },
    {
      id: "productos_dia",
      icono: "◷",
      texto: "Productos por día",
      activo: vista === "reporte_productos_dia",
      accion: () => setVista("reporte_productos_dia"),
    },
    {
      id: "productos_mas_vendidos",
      icono: "★",
      texto: "Productos más vendidos",
      activo: vista === "productos_mas_vendidos",
      accion: () => setVista("productos_mas_vendidos"),
    },
    {
      id: "kardex_productos",
      icono: "↕",
      texto: "Kardex de productos",
      activo: vista === "kardex_productos",
      accion: () => setVista("kardex_productos"),
    },
    {
      id: "productos_forma_pago",
      icono: "▦",
      texto: "Productos por forma de pago",
      activo: vista === "productos_forma_pago",
      accion: () => setVista("productos_forma_pago"),
    },
    {
      id: "galeria_productos",
      icono: "▧",
      texto: "Galería de Productos",
      activo: vista === "galeria_productos",
      visible: ["ADMIN","SUPER_ADMIN"].includes(rolActual),
      accion: () => { setVista("galeria_productos"); cargarGaleriaProductos(); },
    },
    {
      id: "configuracion",
      icono: "⚙",
      texto: "Configuración",
      activo: vista === "configuracion",
      accion: () => setVista("configuracion"),
    },
  ].filter((opcion) => opcion.visible !== false && puedeAccederMenu(opcion.id)).map((opcion) => (
    <button
      key={opcion.id}
      type="button"
      onClick={() => {
        opcion.accion();
        if (esPantallaCompacta) setMenuQ2Abierto(false);
      }}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 14px 13px 16px",
        border: "none",
        borderRadius: 10,
        background: opcion.activo
          ? "rgba(255,255,255,0.96)"
          : "transparent",
        color: opcion.activo ? "#2447a6" : "#ffffff",
        fontSize: 16,
        fontWeight: opcion.activo ? 800 : 600,
        textAlign: "left",
        cursor: "pointer",
        transition:
          "background 0.2s ease, color 0.2s ease, transform 0.2s ease",
        boxShadow: opcion.activo
          ? "0 5px 14px rgba(0,0,0,0.10)"
          : "none",
      }}
      onMouseEnter={(e) => {
        if (!opcion.activo) {
          e.currentTarget.style.background =
            "rgba(255,255,255,0.12)";
          e.currentTarget.style.transform = "translateX(3px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!opcion.activo) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      {opcion.activo && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 4,
            borderRadius: "0 6px 6px 0",
            background: "#ff9d3d",
          }}
        />
      )}

      <span
        style={{
          width: 29,
          minWidth: 29,
          height: 29,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          border: opcion.activo
            ? "1px solid #9eb5ef"
            : "1px solid rgba(255,255,255,0.40)",
          background: opcion.activo
            ? "#eef3ff"
            : "rgba(255,255,255,0.08)",
          color: opcion.activo ? "#2447a6" : "#ffffff",
          fontSize: 17,
          fontWeight: 900,
        }}
      >
        {opcion.icono}
      </span>

      <span>{opcion.texto}</span>
    </button>
  ))}
</div>

</div>

<button onClick={cerrarSesion} style={styles.logoutButton}>
  Cerrar sesión
</button>

</aside>

<main
  style={{
    ...styles.main,
    padding: esPantallaCompacta ? "66px 10px 18px" : styles.main.padding,
    overflowX: "hidden",
  }}
>

{/* ===== BARRA SUPERIOR GLOBAL ===== */}
<div
  style={{
    position: "sticky",
    top: 0,
    zIndex: 100,
    margin: esPantallaCompacta ? "-66px -10px 12px" : "-34px -36px 28px",
    padding: esPantallaCompacta ? "10px 10px 10px 66px" : "14px 36px",
    minHeight: esPantallaCompacta ? 58 : 68,
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    boxSizing: "border-box",
  }}
>
  <div>
    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
      Institución
    </div>
    <div style={{ fontSize: 21, color: "#111827", fontWeight: 900 }}>
      {institucionActiva?.nombre || "POS NUBE"}
    </div>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "#1e3a8a",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: 17,
      }}
    >
      {(usuario?.correo || correo || "U").charAt(0).toUpperCase()}
    </div>

    <div>
      <div style={{ fontSize: 15, color: "#111827", fontWeight: 800 }}>
        {usuario?.correo || correo || "Usuario sin correo"}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{usuario?.rol || "Administrador"}</div>
      {jornadaActiva?.punto_nombre&&<div style={{fontSize:11,color:"#0f766e",fontWeight:800,marginTop:3}}>Punto: {jornadaActiva.punto_nombre} · Jornada #{jornadaActiva.id}</div>}
    </div>
  </div>
</div>

{vista === "dashboard" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>
          Bienvenido a {institucionActiva?.nombre || "POS NUBE"}
        </h1>
        <p style={styles.dashboardSubtitle}>
          Resumen general del sistema
        </p>
      </div>
    </div>

    <div style={styles.grid}>
      <div style={styles.box}>
        <h3>Total ventas</h3>
        <p>{resumen ? resumen.total_ventas : "0"}</p>
      </div>

      <div style={styles.box}>
        <h3>Total general</h3>
        <p>${resumen ? resumen.total_general : "0.00"}</p>
      </div>

      <div style={styles.box}>
        <h3>Total saldo</h3>
        <p>${resumen ? resumen.total_saldo : "0.00"}</p>
      </div>

      <div style={styles.box}>
        <h3>Total efectivo</h3>
        <p>${resumen ? resumen.total_efectivo : "0.00"}</p>
      </div>

      <div style={styles.box}>
        <h3>Total transferencia</h3>
        <p>${resumen ? resumen.total_transferencia : "0.00"}</p>
      </div>
    </div>
  </>
)}

{vista === "reporte_cierre" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Cierre de caja diario</h1>
        <p style={styles.dashboardSubtitle}>Conteo, diferencias e historial por fecha</p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={styles.refreshButton} onClick={() => { cargarCierres(); cargarVentas(); cargarRecargas(); cargarEgresos(); }}>
          Refrescar
        </button>
        {!(["SUPER_ADMIN","ADMIN"].includes(rolActual)) && (
          <button
            style={styles.button}
            onClick={async () => {
              const jornadaPendiente =
                estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE"
                  ? estadoOperativoCaja?.jornada
                  : null;

              const fechaPendiente = normalizarFechaISO(
                jornadaPendiente?.fecha_operativa_texto ||
                jornadaPendiente?.fecha_operativa
              );

              const fechaObjetivo =
                fechaPendiente ||
                normalizarFechaISO(jornadaActiva?.fecha_operativa) ||
                obtenerFechaEcuadorISO();

              if(jornadaPendiente?.id){
                setJornadaActiva(jornadaPendiente);
                localStorage.setItem(
                  "jornadaActiva",
                  JSON.stringify(jornadaPendiente)
                );
              }

              setCierreForm((actual) => ({
                ...actual,
                fecha: fechaObjetivo,
              }));

              setMostrarCrearCierre(true);

              await cargarResumenCierre(
                fechaObjetivo,
                jornadaPendiente || jornadaActiva
              );
            }}
          >
            Crear cierre de caja
          </button>
        )}

        {["SUPER_ADMIN","ADMIN"].includes(rolActual)&&(
          <>
            <button
              type="button"
              style={styles.outlineButton}
              onClick={verCierreConsolidado}
              disabled={cargandoConsolidado}
            >
              {cargandoConsolidado ? "Calculando..." : "Cierre total del local"}
            </button>

            <button
              type="button"
              style={{
                ...styles.button,
                background:"#16a34a",
                borderColor:"#16a34a",
              }}
              onClick={async () => {
                const puntos = await cargarPuntosOperacion();
                const disponibles = obtenerPuntosJornadaDisponibles(puntos);

                setPuntoJornadaSeleccionado(
                  disponibles[0]?.id ? String(disponibles[0].id) : ""
                );
                setOperadorJornadaCorreo("");
                setOperadorJornadaPassword("");
                setVerPasswordOperadorJornada(false);
                setMostrarAbrirJornadaAdmin(true);
              }}
            >
              Abrir nueva jornada
            </button>
          </>
        )}
        {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
          <button
            type="button"
            style={styles.outlineButton}
            onClick={async () => {
              setMostrarReporteCierres((actual) => !actual);
              await cargarPuntosOperacion();
              await cargarCierres();
            }}
          >
            Reporte cierres de caja
          </button>
        )}
      </div>
    </div>

    {mostrarAbrirJornadaAdmin &&
      ["SUPER_ADMIN","ADMIN","ENCARGADO_LOCAL","CAJERO"].includes(rolActual) && (
        <div
          style={{
            position:"fixed",
            inset:0,
            zIndex:200700,
            background:"rgba(15,23,42,0.72)",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            padding:16,
          }}
          onClick={() => setMostrarAbrirJornadaAdmin(false)}
        >
          <div
            style={{
              width:"min(520px, 100%)",
              maxHeight:"92vh",
              overflowY:"auto",
              background:"#fff",
              borderRadius:18,
              padding:22,
              boxShadow:"0 24px 70px rgba(0,0,0,.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
              <div>
                <h2 style={{margin:"0 0 6px",color:"#0f172a"}}>
                  Abrir nueva jornada
                </h2>
                <p style={{margin:"0 0 18px",color:"#64748b",lineHeight:1.45}}>
                  {["ADMIN","SUPER_ADMIN"].includes(rolActual)
                    ? "Administración puede abrir una jornada para un operador autorizado. Al confirmar, la sesión cambiará al operador real para que las ventas queden registradas correctamente."
                    : "Selecciona tu ubicación, confirma tu correo e ingresa tu contraseña. La nueva jornada se abrirá sin salir del sistema."}
                </p>
              </div>
              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setMostrarAbrirJornadaAdmin(false)}
              >
                ×
              </button>
            </div>

            <label style={styles.label}>Ubicación *</label>
            <select
              value={puntoJornadaSeleccionado}
              onChange={(e) => setPuntoJornadaSeleccionado(e.target.value)}
              style={styles.input}
            >
              <option value="">
                {obtenerPuntosJornadaDisponibles(puntosOperacion).length
                  ? "Selecciona ubicación"
                  : "Cargando ubicaciones..."}
              </option>
              {obtenerPuntosJornadaDisponibles(puntosOperacion).map((punto) => (
                <option key={punto.id} value={punto.id}>
                  {punto.nombre}
                </option>
              ))}
            </select>

            <label style={styles.label}>Correo del operador *</label>
            <input
              type="email"
              value={operadorJornadaCorreo}
              onChange={(e) => setOperadorJornadaCorreo(e.target.value)}
              style={styles.input}
              placeholder="operador@correo.com"
              autoComplete="username"
              readOnly={["ENCARGADO_LOCAL","CAJERO"].includes(rolActual)}
            />

            <label style={styles.label}>Contraseña del operador *</label>
            <div style={styles.passwordWrap}>
              <input
                type={verPasswordOperadorJornada ? "text" : "password"}
                value={operadorJornadaPassword}
                onChange={(e) => setOperadorJornadaPassword(e.target.value)}
                style={styles.passwordInput}
                placeholder="Contraseña"
                autoComplete="current-password"
              />
              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setVerPasswordOperadorJornada((actual) => !actual)}
              >
                {verPasswordOperadorJornada ? "Ocultar" : "Ver"}
              </button>
            </div>

            <div style={{display:"flex",gap:10,marginTop:18,flexWrap:"wrap"}}>
              <button
                type="button"
                style={{
                  ...styles.button,
                  flex:1,
                  minWidth:190,
                  background:"#16a34a",
                  borderColor:"#16a34a",
                }}
                onClick={abrirJornada}
                disabled={
                  cargandoJornada ||
                  !puntoJornadaSeleccionado
                }
              >
                {cargandoJornada
                  ? "Abriendo jornada..."
                  : !puntoJornadaSeleccionado
                  ? "Esperando ubicación..."
                  : "Abrir jornada y entrar"}
              </button>

              <button
                type="button"
                style={{...styles.outlineButton,flex:1,minWidth:130}}
                onClick={() => setMostrarAbrirJornadaAdmin(false)}
                disabled={cargandoJornada}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    {estadoOperativoCaja?.estado_operativo !== "CIERRE_PENDIENTE" && (
      <div style={styles.box}>
        <div style={styles.filtersGridPaymon}>
          <div style={styles.filterField}><label style={styles.filterLabelTop}>Fecha inicial</label><input type="date" value={cierreCajaFiltros.fecha_inicio} onChange={(e)=>setCierreCajaFiltros({...cierreCajaFiltros,fecha_inicio:e.target.value})} style={styles.input}/></div>
          <div style={styles.filterField}><label style={styles.filterLabelTop}>Fecha final</label><input type="date" value={cierreCajaFiltros.fecha_fin} onChange={(e)=>setCierreCajaFiltros({...cierreCajaFiltros,fecha_fin:e.target.value})} style={styles.input}/></div>
        </div>
        <div style={styles.filterButtons}>
          <button type="button" style={styles.button} onClick={cargarCierres}>Consultar</button>
          <button type="button" style={styles.outlineButton} onClick={() => { limpiarFiltrosCierreCaja(); setTimeout(cargarCierres, 0); }}>Borrar filtros</button>
        </div>
      </div>
    )}

    {mostrarReporteCierres && ["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
      <>
        <div style={{ height: 20 }} />
        <div style={styles.box}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:16}}>
            <div>
              <h3 style={{margin:0}}>Reporte de cierres de caja</h3>
              <p style={{margin:"6px 0 0",color:"#64748b"}}>
                Consulta los cierres por rango de fechas y ubicación.
              </p>
            </div>
            <button type="button" style={styles.outlineButton} onClick={()=>setMostrarReporteCierres(false)}>
              Ocultar reporte
            </button>
          </div>

          <div style={styles.filtersGridPaymon}>
            <div style={styles.filterField}>
              <label style={styles.filterLabelTop}>Fecha inicial</label>
              <input type="date" value={cierreCajaFiltros.fecha_inicio}
                onChange={(e)=>setCierreCajaFiltros({...cierreCajaFiltros,fecha_inicio:e.target.value})}
                style={styles.input}/>
            </div>
            <div style={styles.filterField}>
              <label style={styles.filterLabelTop}>Fecha final</label>
              <input type="date" value={cierreCajaFiltros.fecha_fin}
                onChange={(e)=>setCierreCajaFiltros({...cierreCajaFiltros,fecha_fin:e.target.value})}
                style={styles.input}/>
            </div>
            <div style={styles.filterField}>
              <label style={styles.filterLabelTop}>Ubicación</label>
              <select value={cierreCajaFiltros.punto_id}
                onChange={(e)=>setCierreCajaFiltros({...cierreCajaFiltros,punto_id:e.target.value})}
                style={styles.input}>
                <option value="">Todas las ubicaciones</option>
                {puntosOperacion.map((p)=>(
                  <option key={p.id} value={p.id}>{p.nombre || "PRINCIPAL"}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.filterButtons}>
            <button type="button" style={styles.button} onClick={cargarCierres}>Generar reporte</button>
            <button type="button" style={styles.outlineButton}
              onClick={()=>{
                setCierreCajaFiltros({fecha_inicio:"",fecha_fin:"",punto_id:""});
                setTimeout(cargarCierres,0);
              }}>
              Borrar filtros
            </button>
          </div>

          <div style={{height:18}} />
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>
                <th style={styles.th}>Código cierre</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Ubicación</th>
                <th style={styles.th}>Jornada</th>
                <th style={styles.th}>Operador</th>
                <th style={styles.th}>Hora apertura</th>
                <th style={styles.th}>Hora cierre</th>
                <th style={styles.th}>Subtotal recargas</th>
                <th style={styles.th}>Subtotal ventas</th>
                <th style={styles.th}>Subtotal egresos</th>
                <th style={styles.th}>Efectivo esperado</th>
                <th style={styles.th}>Efectivo contado</th>
                <th style={styles.th}>Diferencia</th>
                <th style={styles.th}>GRAN TOTAL</th>
                <th style={styles.th}>Acción</th>
              </tr></thead>
              <tbody>
                {cargandoCierres ? (
                  <tr><td colSpan={15} style={styles.td}>Generando reporte...</td></tr>
                ) : cierresCaja.length===0 ? (
                  <tr><td colSpan={15} style={styles.td}>No existen cierres para los filtros seleccionados.</td></tr>
                ) : cierresCaja.map((c)=>(
                  <tr key={`reporte-${c.id}`}>
                    <td style={{...styles.td,fontWeight:900,whiteSpace:"nowrap"}}>{obtenerCodigoCierre(c)}</td>
                    <td style={styles.td}>{formatearSoloFecha(c.fecha)}</td>
                    <td style={{...styles.td,fontWeight:800}}>{c.punto_nombre || "HISTÓRICO"}</td>
                    <td style={styles.td}>{c.jornada_id ? `#${c.jornada_id}` : "-"}</td>
                    <td style={styles.td}>{c.usuario_nombre || c.usuario_correo || "Sistema"}</td>
                    <td style={styles.td}>{c.periodo_desde_ecuador || "-"}</td>
                    <td style={styles.td}>{c.periodo_hasta_ecuador || "-"}</td>
                    <td style={styles.td}>{formatearMoneda(subtotalRecargasCierre(c))}</td>
                    <td style={styles.td}>{formatearMoneda(subtotalVentasCierre(c))}</td>
                    <td style={styles.td}>{formatearMoneda(subtotalEgresosCierre(c))}</td>
                    <td style={styles.td}>{formatearMoneda(efectivoEsperadoCierre(c))}</td>
                    <td style={styles.td}>{formatearMoneda(c.efectivo_contado)}</td>
                    <td style={{...styles.td,fontWeight:900,color:Number(c.diferencia_general||0)<0?"#dc2626":"#b45309"}}>
                      {formatearMoneda(c.diferencia_general)}
                    </td>
                    <td style={{...styles.td,fontWeight:900}}>{formatearMoneda(granTotalCierre(c))}</td>
                    <td style={styles.td}>
                      <button style={styles.editIconButton} onClick={()=>verCierre(c)}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}

    <div style={{ height: 20 }} />
    <div style={styles.box}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:10, flexWrap:"wrap" }}>
        <h3 style={{ margin:0 }}>Historial de cierres</h3>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span>{cierresCaja.length} registro(s)</span>
          {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
            <>
              <button
                type="button"
                style={styles.outlineButton}
                disabled={eliminandoPruebas || cierresCaja.length === 0}
                onClick={() =>
                  setCierresSeleccionadosBorrar(
                    cierresSeleccionadosBorrar.length === cierresCaja.length
                      ? []
                      : cierresCaja.map((c) => Number(c.id))
                  )
                }
              >
                {cierresSeleccionadosBorrar.length === cierresCaja.length && cierresCaja.length > 0
                  ? "Quitar selección"
                  : "Seleccionar todos"}
              </button>
              <button
                type="button"
                style={{...styles.deleteIconButton,padding:"7px 9px",minWidth:40,fontSize:16,lineHeight:1}}
                disabled={eliminandoPruebas || cierresSeleccionadosBorrar.length === 0}
                onClick={eliminarCierresSeleccionados}
                title={`Eliminar ${cierresSeleccionadosBorrar.length} cierre(s) seleccionado(s)`}
                aria-label="Eliminar cierres seleccionados"
              >
                🗑️ {cierresSeleccionadosBorrar.length}
              </button>
            </>
          )}
        </div>
      </div>
      {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
        <div style={{marginBottom:14}}>
          <div style={{fontWeight:1000,fontSize:18,marginBottom:8}}>
            Cajas abiertas de operadores
          </div>
          <div style={{fontSize:13,color:"#475569",marginBottom:10}}>
            Administración no abre ni usa una jornada propia. Selecciona la caja del operador que deseas cerrar.
          </div>

          {cajasAbiertasAdmin.length === 0 ? (
            <div style={{padding:"12px",border:"1px solid #cbd5e1",borderRadius:10,background:"#f8fafc",color:"#475569"}}>
              No hay cajas abiertas disponibles para cierre en este momento.
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10}}>
              {cajasAbiertasAdmin.map((caja) => (
                <div
                  key={`caja-abierta-admin-${caja.id}`}
                  style={{border:"2px solid #2563eb",borderRadius:12,padding:"12px",background:"#eff6ff"}}
                >
                  <div style={{fontWeight:1000,fontSize:17,color:"#1e3a8a"}}>
                    {caja.punto_nombre || "PUNTO"}
                  </div>
                  <div style={{fontSize:13,lineHeight:1.5,marginTop:4,color:"#1e40af"}}>
                    Jornada #{caja.id}
                    {" · "}Operador: {caja.usuario_nombre || caja.usuario_correo || "Operador"}
                    {" · "}Fecha: {formatearSoloFecha(caja.fecha_operativa_texto || caja.fecha_operativa)}
                  </div>
                  <button
                    type="button"
                    style={{...styles.button,width:"100%",marginTop:10}}
                    onClick={() => abrirCajaPendienteDesdeListado(caja)}
                  >
                    Cerrar esta caja
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {cajasPendientesVisuales.length > 0 && (
        <div style={{display:"grid",gap:10,marginBottom:12}}>
          {cajasPendientesVisuales.map((pendiente) => (
            <div
              key={`aviso-pendiente-${pendiente.id}`}
              style={{
                background:"#fee2e2",
                border:"2px solid #ef4444",
                color:"#991b1b",
                borderRadius:12,
                padding:"12px",
                fontWeight:900,
              }}
            >
              <div style={{fontSize:18,marginBottom:6}}>
                ⚠ CAJA PENDIENTE DE CIERRE
              </div>

              <div style={{fontSize:14,lineHeight:1.5}}>
                Fecha: {formatearSoloFecha(
                  pendiente.fecha_operativa_texto ||
                  pendiente.fecha_operativa
                )}
                {" · "}Ubicación: {pendiente.punto_nombre || "PUNTO"}
                {" · "}Jornada #{pendiente.id}
                {" · "}Operador: {
                  pendiente.usuario_nombre ||
                  pendiente.usuario_correo ||
                  "Operador"
                }
              </div>

              <button
                type="button"
                style={{
                  ...styles.button,
                  background:"#dc2626",
                  borderColor:"#dc2626",
                  color:"#fff",
                  marginTop:10,
                  width:"100%",
                }}
                onClick={() => abrirCajaPendienteDesdeListado(pendiente)}
              >
                Cerrar esta caja pendiente
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead><tr>
            {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
              <th style={styles.th}>Seleccionar</th>
            )}
            <th style={styles.th}>Código cierre</th>
            <th style={styles.th}>Fecha</th>
            <th style={styles.th}>Ubicación</th>
            <th style={styles.th}>Jornada</th>
            <th style={styles.th}>Operador</th>
            <th style={styles.th}>Subtotal recargas</th>
            <th style={styles.th}>Subtotal ventas</th>
            <th style={styles.th}>Subtotal egresos</th>
            <th style={styles.th}>Efectivo esperado</th>
            <th style={styles.th}>Efectivo contado</th>
            <th style={styles.th}>Diferencia</th>
            <th style={styles.th}>GRAN TOTAL</th>
            <th style={styles.th}>Observación</th>
            <th style={styles.th}>Acciones</th>
          </tr></thead>
          <tbody>
            {cajasPendientesVisuales.map((pendiente) => (
              <tr
                key={`pendiente-${pendiente.id}`}
                style={{
                  background:"#fee2e2",
                  color:"#991b1b",
                  borderTop:"2px solid #ef4444",
                  borderBottom:"2px solid #ef4444",
                }}
              >
                {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={jornadasSeleccionadasBorrar.includes(Number(pendiente.id))}
                      onChange={(e) =>
                        alternarSeleccionId(setJornadasSeleccionadasBorrar, pendiente.id, e.target.checked)
                      }
                      aria-label={`Seleccionar jornada ${pendiente.id}`}
                    />
                  </td>
                )}
                <td style={{...styles.td,fontWeight:1000,whiteSpace:"nowrap",color:"#991b1b"}}>
                  PENDIENTE
                </td>

                <td style={{...styles.td,fontWeight:900,color:"#991b1b"}}>
                  {formatearSoloFecha(
                    pendiente.fecha_operativa_texto ||
                    pendiente.fecha_operativa
                  )}
                </td>

                <td style={{...styles.td,fontWeight:1000,color:"#991b1b"}}>
                  {pendiente.punto_nombre || "PUNTO"}
                </td>

                <td style={{...styles.td,fontWeight:1000,color:"#991b1b"}}>
                  #{pendiente.id}
                </td>

                <td style={{...styles.td,fontWeight:800,color:"#991b1b"}}>
                  {pendiente.usuario_nombre ||
                    pendiente.usuario_correo ||
                    "Operador"}
                </td>

                <td
                  colSpan={8}
                  style={{
                    ...styles.td,
                    fontWeight:1000,
                    color:"#991b1b",
                    textAlign:"center",
                    whiteSpace:"normal",
                  }}
                >
                  ⚠ CAJA PENDIENTE DE CIERRE
                </td>

                <td style={styles.td}>
                  <button
                    type="button"
                    style={{
                      ...styles.button,
                      background:"#dc2626",
                      borderColor:"#dc2626",
                      color:"#fff",
                      whiteSpace:"nowrap",
                    }}
                    onClick={() => abrirCajaPendienteDesdeListado(pendiente)}
                  >
                    Cerrar pendiente
                  </button>
                </td>
              </tr>
            ))}

            {cargandoCierres ? (
              <tr><td colSpan={14} style={styles.td}>Cargando cierres...</td></tr>
            ) : cierresCaja.length===0 ? (
              cajasPendientesVisuales.length > 0 ? null : (
                <tr><td colSpan={14} style={styles.td}>No hay cierres registrados.</td></tr>
              )
            ) : cierresCaja.map((c)=><tr key={c.id}>
              {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                <td style={styles.td}>
                  <input
                    type="checkbox"
                    checked={cierresSeleccionadosBorrar.includes(Number(c.id))}
                    onChange={(e) =>
                      alternarSeleccionId(setCierresSeleccionadosBorrar, c.id, e.target.checked)
                    }
                    aria-label={`Seleccionar cierre ${c.id}`}
                  />
                </td>
              )}
              <td style={{...styles.td,fontWeight:900,whiteSpace:"nowrap"}}>{obtenerCodigoCierre(c)}</td>
              <td style={styles.td}>{formatearSoloFecha(c.fecha)}</td>
              <td style={{...styles.td,fontWeight:800}}>{c.punto_nombre || "HISTÓRICO"}</td>
              <td style={styles.td}>{c.jornada_id ? `#${c.jornada_id}` : "-"}</td>
              <td style={styles.td}>{c.usuario_nombre || c.usuario_correo || "Sistema"}</td>
              <td style={styles.td}>{formatearMoneda(subtotalRecargasCierre(c))}</td>
              <td style={styles.td}>{formatearMoneda(subtotalVentasCierre(c))}</td>
              <td style={styles.td}>{formatearMoneda(subtotalEgresosCierre(c))}</td>
              <td style={styles.td}>{formatearMoneda(efectivoEsperadoCierre(c))}</td>
              <td style={styles.td}>{formatearMoneda(c.efectivo_contado)}</td>
              <td style={{...styles.td,fontWeight:900,color:Number(c.diferencia_general||0)<0?"#dc2626":"#b45309"}}>{formatearMoneda(c.diferencia_general)}</td>
              <td style={{...styles.td,fontWeight:900}}>{formatearMoneda(granTotalCierre(c))}</td>
              <td style={styles.td}>{c.observacion_automatica || c.observacion || "-"}</td>
              <td style={styles.td}><div style={{display:"flex",gap:8}}>
                <button style={styles.editIconButton} onClick={()=>verCierre(c)}>Ver</button>
                {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                  <button style={{...styles.deleteIconButton,padding:"6px 8px",fontSize:16,lineHeight:1}} onClick={()=>eliminarCierre(c)} title="Eliminar cierre" aria-label="Eliminar cierre">🗑️</button>
                )}
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>



    {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
      <>
        <div style={{ height: 20 }} />
        <div style={styles.box}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <div>
              <h3 style={{margin:0}}>Administración de jornadas de prueba</h3>
              <p style={{margin:"6px 0 0",color:"#64748b"}}>
                Puedes marcar una por una o seleccionar todas. Una jornada solo se elimina si ya no tiene cierre ni ventas asociadas.
              </p>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button
                type="button"
                style={styles.outlineButton}
                disabled={eliminandoPruebas || jornadasHistorial.length === 0}
                onClick={() =>
                  setJornadasSeleccionadasBorrar(
                    jornadasSeleccionadasBorrar.length === jornadasHistorial.length
                      ? []
                      : jornadasHistorial.map((j) => Number(j.id))
                  )
                }
              >
                {jornadasSeleccionadasBorrar.length === jornadasHistorial.length && jornadasHistorial.length > 0
                  ? "Quitar selección"
                  : "Seleccionar todas"}
              </button>
              <button
                type="button"
                style={{...styles.deleteIconButton,padding:"7px 9px",minWidth:40,fontSize:16,lineHeight:1}}
                disabled={eliminandoPruebas || jornadasSeleccionadasBorrar.length === 0}
                onClick={eliminarJornadasSeleccionadas}
                title={`Eliminar ${jornadasSeleccionadasBorrar.length} jornada(s) seleccionada(s)`}
                aria-label="Eliminar jornadas seleccionadas"
              >
                🗑️ {jornadasSeleccionadasBorrar.length}
              </button>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Seleccionar</th>
                  <th style={styles.th}>Jornada</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Ubicación</th>
                  <th style={styles.th}>Operador</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Apertura</th>
                  <th style={styles.th}>Cierre</th>
                </tr>
              </thead>
              <tbody>
                {jornadasHistorial.length === 0 ? (
                  <tr><td colSpan={8} style={styles.td}>No hay jornadas registradas.</td></tr>
                ) : jornadasHistorial.map((j) => (
                  <tr key={`jornada-admin-${j.id}`}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={jornadasSeleccionadasBorrar.includes(Number(j.id))}
                        onChange={(e) =>
                          alternarSeleccionId(setJornadasSeleccionadasBorrar, j.id, e.target.checked)
                        }
                        aria-label={`Seleccionar jornada ${j.id}`}
                      />
                    </td>
                    <td style={{...styles.td,fontWeight:900}}>#{j.id}</td>
                    <td style={styles.td}>{formatearSoloFecha(j.fecha_operativa)}</td>
                    <td style={styles.td}>{j.punto_nombre || "PUNTO"}</td>
                    <td style={styles.td}>{j.usuario_nombre || j.usuario_correo || "Operador"}</td>
                    <td style={styles.td}>{j.estado || "-"}</td>
                    <td style={styles.td}>{formatearFechaHora(j.abierta_at)}</td>
                    <td style={styles.td}>{formatearFechaHora(j.cerrada_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}

    {mostrarCrearCierre && createPortal((
      <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, width:"100vw", height:"100dvh", minHeight:"100vh", background:"rgba(15,23,42,.65)", zIndex:99999, padding:"8px", boxSizing:"border-box", overflow:"hidden", display:"flex", alignItems:"stretch", justifyContent:"center" }}>
        <div style={{ width:"100%", maxWidth:900, minWidth:0, height:"calc(100dvh - 16px)", maxHeight:"calc(100dvh - 16px)", margin:"0 auto", background:"white", borderRadius:14, boxSizing:"border-box", overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"14px",borderBottom:"1px solid #e5e7eb",flex:"0 0 auto",background:"#fff",position:"relative",zIndex:2}}>
            <div>
              <h2 style={{margin:"0",fontSize:"clamp(22px,4vw,32px)"}}>
                {estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE"
                  ? "Caja pendiente de cierre"
                  : "Nuevo cierre de caja"}
              </h2>
              {estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE" && (
                <div style={{marginTop:6,color:"#b91c1c",fontWeight:900}}>
                  Debes cerrar esta jornada antes de continuar.
                </div>
              )}
            </div>

            {estadoOperativoCaja?.estado_operativo !== "CIERRE_PENDIENTE" && (
              <button
                style={{...styles.outlineButton,flexShrink:0}}
                onClick={()=>setMostrarCrearCierre(false)}
              >
                Cerrar
              </button>
            )}
          </div>
          <div style={{flex:"1 1 auto",minHeight:0,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",touchAction:"pan-y",overscrollBehaviorY:"contain",padding:"14px",boxSizing:"border-box"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:16,marginTop:18,width:"100%",minWidth:0}}>
            <div style={styles.filterField}>
              <label style={styles.label}>Fecha de cierre</label>
              <input
                type="date"
                style={{
                  ...styles.input,
                  background:
                    estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE"
                      ? "#f1f5f9"
                      : undefined,
                }}
                value={cierreForm.fecha}
                disabled={estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE"}
                onChange={async(e)=>{
                  const fecha=e.target.value;
                  setCierreForm({...cierreForm,fecha});
                  await cargarResumenCierre(fecha);
                }}
              />
              {estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE" && (
                <small style={{display:"block",marginTop:6,color:"#b45309",fontWeight:800}}>
                  Fecha fijada automáticamente por la jornada pendiente.
                </small>
              )}
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Operador</label>
              <input
                style={styles.input}
                value={
                  (estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE"
                    ? estadoOperativoCaja?.jornada?.usuario_nombre
                    : jornadaActiva?.usuario_nombre) ||
                  (estadoOperativoCaja?.estado_operativo === "CIERRE_PENDIENTE"
                    ? estadoOperativoCaja?.jornada?.usuario_correo
                    : jornadaActiva?.usuario_correo) ||
                  usuario?.nombre ||
                  usuario?.correo ||
                  "Operador"
                }
                readOnly
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Ubicación</label>
              <input
                style={{...styles.input,fontWeight:900}}
                value={jornadaActiva?.punto_nombre || "SIN UBICACIÓN"}
                readOnly
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Jornada</label>
              <input
                style={styles.input}
                value={jornadaActiva?.id ? `#${jornadaActiva.id}` : "Sin jornada"}
                readOnly
              />
            </div>
            <div style={styles.filterFieldWide}>
              <label style={styles.label}>Negocio</label>
              <input
                style={{ ...styles.input, fontWeight: 800, background: "#f8fafc" }}
                value="POS NUBE"
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>
          <h3 style={{marginTop:24}}>Total de dinero: {formatearMoneda(totalEfectivoContado)}</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:"clamp(14px,2vw,24px)",width:"100%",minWidth:0}}>
            <div>
              <h2 style={{ textAlign: "center" }}>Billetes</h2>
              {[
                ["billete_1", 1],
                ["billete_2", 2],
                ["billete_5", 5],
                ["billete_10", 10],
                ["billete_20", 20],
                ["billete_50", 50],
                ["billete_100", 100],
              ].map(([clave, valor]) => (
                <div key={clave} style={{ marginBottom: 10 }}>
                  <label>
                    BILLETE DE {Number(valor).toFixed(2)}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    autoComplete="off"
                    style={styles.input}
                    value={
                      cierreForm.denominaciones[clave] ?? ""
                    }
                    onFocus={(evento) =>
                      evento.currentTarget.select()
                    }
                    onClick={(evento) =>
                      evento.currentTarget.select()
                    }
                    onChange={(evento) => {
                      const cantidad = evento.target.value
                        .replace(/[^0-9]/g, "")
                        .replace(/^0+(?=\d)/, "");

                      setCierreForm((actual) => ({
                        ...actual,
                        denominaciones: {
                          ...actual.denominaciones,
                          [clave]: cantidad,
                        },
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
            <div>
              <h2 style={{ textAlign: "center" }}>Monedas</h2>
              {[
                ["moneda_001", 0.01],
                ["moneda_005", 0.05],
                ["moneda_010", 0.1],
                ["moneda_025", 0.25],
                ["moneda_050", 0.5],
                ["moneda_1", 1],
              ].map(([clave, valor]) => (
                <div key={clave} style={{ marginBottom: 10 }}>
                  <label>
                    MONEDA DE {Number(valor).toFixed(2)}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    autoComplete="off"
                    style={styles.input}
                    value={
                      cierreForm.denominaciones[clave] ?? ""
                    }
                    onFocus={(evento) =>
                      evento.currentTarget.select()
                    }
                    onClick={(evento) =>
                      evento.currentTarget.select()
                    }
                    onChange={(evento) => {
                      const cantidad = evento.target.value
                        .replace(/[^0-9]/g, "")
                        .replace(/^0+(?=\d)/, "");

                      setCierreForm((actual) => ({
                        ...actual,
                        denominaciones: {
                          ...actual.denominaciones,
                          [clave]: cantidad,
                        },
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,240px),1fr))",gap:"clamp(14px,2vw,20px)",marginTop:24,width:"100%",minWidth:0}}>
            <div><h2>Tarjeta crédito/débito</h2><label>Tarjetas (suma de pagos)</label><input type="number" step="0.01" style={styles.input} value={cierreForm.tarjeta_manual} onChange={(e)=>setCierreForm({...cierreForm,tarjeta_manual:e.target.value})}/></div>
            <div><h2>Transferencia</h2><label>Transferencias (suma de comprobantes)</label><input type="number" step="0.01" style={styles.input} value={cierreForm.transferencia_manual} onChange={(e)=>setCierreForm({...cierreForm,transferencia_manual:e.target.value})}/></div>
          </div>
          {resumenCierreServidor && (
            <div style={{ ...styles.box, marginTop: 24 }}>
              <h3>Resumen esperado del sistema</h3>
              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
                gap:10,
                marginBottom:14
              }}>
                <div style={{padding:10,border:"1px solid #dbeafe",borderRadius:10}}>
                  <strong>Ubicación</strong>
                  <div>{resumenCierreServidor.punto_nombre || jornadaActiva?.punto_nombre || "-"}</div>
                </div>
                <div style={{padding:10,border:"1px solid #dbeafe",borderRadius:10}}>
                  <strong>Operador</strong>
                  <div>{resumenCierreServidor.operador_nombre || jornadaActiva?.usuario_nombre || jornadaActiva?.usuario_correo || "-"}</div>
                </div>
                <div style={{padding:10,border:"1px solid #dbeafe",borderRadius:10}}>
                  <strong>Jornada</strong>
                  <div>#{resumenCierreServidor.jornada_id || jornadaActiva?.id || "-"}</div>
                </div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  marginBottom: 14,
                  background: "#eef6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 10,
                }}
              >
                <strong>Período que se cerrará:</strong>
                <div style={{ marginTop: 5 }}>
                  {resumenCierreServidor.periodo_desde_ecuador || "Inicio"}{" "}
                  →{" "}
                  {resumenCierreServidor.periodo_hasta_ecuador || "Ahora"}
                </div>
                <small style={{ color: "#64748b" }}>
                  Incluye todos los movimientos realizados después del último
                  cierre hasta este momento.
                </small>
              </div>
              {/* El resumen previo se deja intencionalmente compacto. */}
              {/* Los valores económicos se muestran después de guardar el cierre. */}
              {/* Ubicación, operador y jornada permanecen visibles arriba. */}
              {/* El período exacto permanece visible para confirmar el corte. */}
              {/* Detalle de ventas/recargas/egresos: disponible en cierre guardado. */}
              {/* Evita saturar la pantalla de conteo en PC e iMin. */}
            </div>
          )}
          <div style={{marginTop:20}}><label>Observación</label><input style={styles.input} value={cierreForm.observacion} onChange={(e)=>setCierreForm({...cierreForm,observacion:e.target.value})}/></div>
          <button
            type="button"
            style={{ ...styles.button, marginTop: 20 }}
            onClick={guardarCierre}
            disabled={guardandoCierre}
          >
            {guardandoCierre
              ? "Guardando cierre..."
              : "Guardar cierre"}
          </button>
          <div style={{height:24,flex:"0 0 auto"}} />
          </div>
        </div>
      </div>
    ), document.body)}


    {cierreConsolidado && ["SUPER_ADMIN","ADMIN"].includes(rolActual) && createPortal((
      <div style={{
        position:"fixed", inset:0, zIndex:100001,
        background:"rgba(15,23,42,.68)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:12
      }}>
        <div style={{
          width:"min(1000px,96vw)",
          maxHeight:"94vh",
          overflowY:"auto",
          background:"#fff",
          borderRadius:16,
          padding:20
        }}>
          <div style={{
            display:"flex",justifyContent:"space-between",
            alignItems:"center",gap:12,flexWrap:"wrap"
          }}>
            <div>
              <h2 style={{margin:0}}>Cierre total del local</h2>
              <p style={{margin:"6px 0 0",color:"#64748b"}}>
                {institucionActiva?.nombre || INSTITUCIONES.find(i=>Number(i.id)===Number(obtenerInstitucionActivaId()))?.nombre || "Institución"} · {formatearSoloFecha(cierreConsolidado.fecha)}
              </p>
            </div>
            <button
              type="button"
              style={styles.outlineButton}
              onClick={()=>setCierreConsolidado(null)}
            >
              Cerrar
            </button>
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
            gap:10,
            marginTop:18
          }}>
            <div style={styles.statCard}><span>Código consolidado</span><strong>{cierreConsolidado.codigo_consolidado || `CIE-TOTAL-${String(cierreConsolidado.fecha||"").replace(/-/g,"")}`}</strong></div>
            <div style={styles.statCard}><span>Cierres incluidos</span><strong>{cierreConsolidado.cantidad_cierres || 0}</strong></div>
            <div style={styles.statCard}><span>Subtotal recargas</span><strong>{formatearMoneda(subtotalRecargasCierre(cierreConsolidado))}</strong></div>
            <div style={styles.statCard}><span>Subtotal ventas</span><strong>{formatearMoneda(subtotalVentasCierre(cierreConsolidado))}</strong></div>
            <div style={styles.statCard}><span>Subtotal egresos</span><strong>{formatearMoneda(subtotalEgresosCierre(cierreConsolidado))}</strong></div>
            <div style={styles.statCard}><span>Efectivo esperado</span><strong>{formatearMoneda(efectivoEsperadoCierre(cierreConsolidado))}</strong></div>
            <div style={styles.statCard}><span>Efectivo contado</span><strong>{formatearMoneda(cierreConsolidado.efectivo_contado)}</strong></div>
            <div style={styles.statCard}><span>Diferencia general</span><strong>{formatearMoneda(cierreConsolidado.diferencia_general)}</strong></div>
            <div style={{...styles.statCard,border:"2px solid #1d4ed8"}}><span>GRAN TOTAL</span><strong>{formatearMoneda(granTotalCierre(cierreConsolidado))}</strong></div>
          </div>

          <h3 style={{marginTop:24}}>Cierres por ubicación</h3>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Código cierre</th>
                  <th style={styles.th}>Ubicación</th>
                  <th style={styles.th}>Operador</th>
                  <th style={styles.th}>Jornada</th>
                  <th style={styles.th}>Subtotal recargas</th>
                  <th style={styles.th}>Subtotal ventas</th>
                  <th style={styles.th}>Subtotal egresos</th>
                  <th style={styles.th}>Efectivo contado</th>
                  <th style={styles.th}>GRAN TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {(cierreConsolidado.puntos||[]).length===0 ? (
                  <tr>
                    <td colSpan={9} style={styles.td}>
                      Todavía no existen cierres por punto para esta fecha.
                    </td>
                  </tr>
                ) : (
                  (cierreConsolidado.puntos||[]).map((c)=>(
                    <tr key={c.id}>
                      <td style={{...styles.td,fontWeight:900,whiteSpace:"nowrap"}}>{obtenerCodigoCierre(c)}</td>
                      <td style={{...styles.td,fontWeight:900}}>{c.punto_nombre || "-"}</td>
                      <td style={styles.td}>{c.usuario_nombre || c.usuario_correo || "-"}</td>
                      <td style={styles.td}>{c.jornada_id ? `#${c.jornada_id}` : "-"}</td>
                      <td style={styles.td}>{formatearMoneda(subtotalRecargasCierre(c))}</td>
                      <td style={styles.td}>{formatearMoneda(subtotalVentasCierre(c))}</td>
                      <td style={styles.td}>{formatearMoneda(subtotalEgresosCierre(c))}</td>
                      <td style={styles.td}>{formatearMoneda(c.efectivo_contado)}</td>
                      <td style={{...styles.td,fontWeight:900}}>{formatearMoneda(granTotalCierre(c))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ), document.body)}

    {cierreDetalle && createPortal((
      <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, width:"100vw", height:"100dvh", minHeight:"100vh", background:"rgba(15,23,42,.65)", zIndex:100000, padding:"8px", boxSizing:"border-box", overflow:"hidden", display:"flex", alignItems:"stretch", justifyContent:"center" }}>
        <div style={{width:"100%",maxWidth:900,minWidth:0,height:"calc(100dvh - 16px)",maxHeight:"calc(100dvh - 16px)",margin:"0 auto",background:"white",borderRadius:14,boxSizing:"border-box",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"14px",borderBottom:"1px solid #e5e7eb",flex:"0 0 auto",background:"#fff",position:"relative",zIndex:2}}>
            <h2 style={{margin:"0",fontSize:"clamp(22px,4vw,32px)"}}>Detalle de cierre de caja</h2>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {["ADMIN","SUPER_ADMIN"].includes(rolActual) && (
                <button
                  type="button"
                  style={{...styles.outlineButton,flexShrink:0}}
                  onClick={()=>abrirDiagnosticoCierre(cierreDetalle)}
                >
                  Diagnóstico
                </button>
              )}
              <button
                style={{...styles.outlineButton,flexShrink:0}}
                onClick={()=>setCierreDetalle(null)}
              >
                ✕
              </button>
            </div>
          </div>
          <div style={{flex:"1 1 auto",minHeight:0,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",touchAction:"pan-y",overscrollBehaviorY:"contain",padding:"14px",boxSizing:"border-box"}}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                typeof window !== "undefined" && window.innerWidth <= 1280
                  ? "1fr"
                  : "repeat(3,minmax(0,1fr))",
              gap: 12,
              marginTop: 18,
              minWidth: 0,
            }}
          >
            {[
              ["Código de cierre", obtenerCodigoCierre(cierreDetalle)],
              ["Fecha de cierre", formatearSoloFecha(cierreDetalle.fecha)],
              ["Ubicación", cierreDetalle.punto_nombre || "HISTÓRICO"],
              ["Jornada", cierreDetalle.jornada_id ? `#${cierreDetalle.jornada_id}` : "-"],
              ["Operador", cierreDetalle.usuario_nombre || cierreDetalle.usuario_correo || "-"],
              ["Hora apertura", cierreDetalle.periodo_desde_ecuador || "-"],
              ["Hora cierre", cierreDetalle.periodo_hasta_ecuador || `${cierreDetalle.fecha_cierre_ecuador || ""} ${cierreDetalle.hora_cierre_ecuador || ""}`.trim() || "-"],
              ["Unidad educativa", institucionActiva?.nombre],
              ["RECARGAS - Efectivo", formatearMoneda(cierreDetalle.recargas_efectivo)],
              ["RECARGAS - Transferencia", formatearMoneda(cierreDetalle.recargas_transferencia)],
              ["SUBTOTAL RECARGAS", formatearMoneda(subtotalRecargasCierre(cierreDetalle))],
              ["VENTAS - Efectivo", formatearMoneda(cierreDetalle.ventas_efectivo)],
              ["VENTAS - Transferencia", formatearMoneda(cierreDetalle.ventas_transferencia)],
              ["VENTAS - Saldo", formatearMoneda(cierreDetalle.ventas_saldo)],
              ["VENTAS - Crédito", formatearMoneda(cierreDetalle.ventas_credito)],
              ["VENTAS - Tarjeta histórico", formatearMoneda(cierreDetalle.ventas_tarjeta)],
              ["SUBTOTAL VENTAS", formatearMoneda(subtotalVentasCierre(cierreDetalle))],
              ["SUBTOTAL EGRESOS", formatearMoneda(subtotalEgresosCierre(cierreDetalle))],
              ["EFECTIVO ESPERADO", formatearMoneda(efectivoEsperadoCierre(cierreDetalle))],
              ["EFECTIVO CONTADO", formatearMoneda(cierreDetalle.efectivo_contado)],
              ["DIFERENCIA EFECTIVO", formatearMoneda(
                Number(cierreDetalle.efectivo_contado || 0) -
                efectivoEsperadoCierre(cierreDetalle)
              )],
              ["TARJETA CONTADA", formatearMoneda(cierreDetalle.tarjeta_manual)],
              ["DIFERENCIA TARJETA", formatearMoneda(cierreDetalle.diferencia_tarjeta)],
              ["TRANSFERENCIA CONTADA", formatearMoneda(cierreDetalle.transferencia_manual)],
              ["DIFERENCIA TRANSFERENCIA", formatearMoneda(cierreDetalle.diferencia_transferencia)],
              ["DIFERENCIA GENERAL", formatearMoneda(cierreDetalle.diferencia_general)],
              ["GRAN TOTAL", formatearMoneda(granTotalCierre(cierreDetalle))],
              [
                "Observación",
                cierreDetalle.observacion_automatica ||
                  cierreDetalle.observacion ||
                  "-",
              ],
            ].map(([etiqueta, valor]) => (
              <div
                key={etiqueta}
                style={{
                  minWidth: 0,
                  padding:
                    typeof window !== "undefined" && window.innerWidth <= 1280
                      ? "8px 10px"
                      : "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  {etiqueta}:
                </div>
                <strong
                  style={{
                    display: "block",
                    overflowWrap: "anywhere",
                  }}
                >
                  {valor || "-"}
                </strong>
              </div>
            ))}
          </div>
          <h3 style={{marginTop:24}}>Conteo de billetes y monedas</h3>
          <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Denominación</th><th style={styles.th}>Tipo</th><th style={styles.th}>Cantidad</th><th style={styles.th}>Total</th></tr></thead><tbody>{(cierreDetalle.denominaciones||[]).map((d,i)=><tr key={i}><td style={styles.td}>{Number(d.denominacion).toFixed(2)}</td><td style={styles.td}>{d.tipo}</td><td style={styles.td}>{d.cantidad}</td><td style={styles.td}>{formatearMoneda(d.total)}</td></tr>)}</tbody></table></div>
          <h3 style={{marginTop:24}}>Egresos incluidos en este cierre</h3>
          <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Fecha</th><th style={styles.th}>Nombre</th><th style={styles.th}>Tipo</th><th style={styles.th}>Factura</th><th style={styles.th}>Valor</th><th style={styles.th}>Usuario</th></tr></thead><tbody>{(cierreDetalle.egresos||[]).length===0?<tr><td colSpan={6} style={styles.td}>No hubo egresos activos en este cierre.</td></tr>:(cierreDetalle.egresos||[]).map((e)=><tr key={e.id}><td style={styles.td}>{formatearSoloFecha(e.fecha)}</td><td style={styles.td}>{e.nombre_egreso}</td><td style={styles.td}>{e.tipo_egreso}</td><td style={styles.td}>{e.numero_factura||'-'}</td><td style={styles.td}>{formatearMoneda(e.total)}</td><td style={styles.td}>{e.usuario||e.usuario_nombre||'-'}</td></tr>)}</tbody></table></div>
          <button
            style={{ ...styles.button, marginTop: 20 }}
            onClick={() => imprimirCierreCaja(cierreDetalle)}
          >
            Imprimir
          </button>
          <div style={{height:24,flex:"0 0 auto"}} />
          </div>
        </div>
      </div>
    ), document.body)}
  </>
)}

{vista === "reporte_productos" && (
  <div style={styles.card}>
    <div style={styles.reporteHeader}>
      <div>
        <h2 style={{ margin: 0 }}>Reporte de Productos Vendidos</h2>
      </div>
    </div>

    <div style={styles.filtrosRow}>
      <div style={styles.filterGroup}>
        <label style={styles.label}>Fecha inicial</label>
        <input
          type="date"
          value={productosFiltros.fecha_inicio}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              fecha_inicio: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Fecha final</label>
        <input
          type="date"
          value={productosFiltros.fecha_fin}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              fecha_fin: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Operador</label>
        <select
          value={productosFiltros.operador || ""}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              operador: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todos</option>
          {Array.from(
            new Set(
              ventasEnriquecidas.map(
                (venta) => venta.operador_visual || "Sistema"
              )
            )
          ).map((operador) => (
            <option key={operador} value={operador}>
              {operador}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Ubicación</label>
        <select
          value={productosFiltros.ubicacion || ""}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              ubicacion: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todas</option>
          {[...new Set([
            ...(puntosOperacion || []).map((p) =>
              String(p?.nombre || "").trim().toUpperCase()
            ),
            ...ventasEnriquecidas.map((venta) =>
              String(
                venta.ubicacion_visual ||
                venta.ubicacion ||
                ""
              ).trim().toUpperCase()
            ),
          ].filter((ubicacion) =>
            ubicacion &&
            ubicacion !== "PRINCIPAL"
          ))].map((ubicacion) => (
            <option key={ubicacion} value={ubicacion}>
              {ubicacion}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Comprado</label>
        <select
          value={productosFiltros.comprado || ""}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              comprado: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todos</option>
          <option value="SI">Sí</option>
          <option value="NO">No</option>
        </select>
      </div>
    </div>

    <div style={styles.filterActions}>
      <button
        style={{
          ...styles.button,
          minWidth: 150,
          minHeight: 52,
          padding: "12px 26px",
          fontSize: 18,
          fontWeight: 800,
          background: "#2563eb",
          color: "#ffffff",
          border: "1px solid #2563eb",
          borderRadius: 12,
          cursor: "pointer",
        }}
        onClick={() => consultarProductos()}
      >
        Consultar
      </button>

      <button
        style={styles.outlineButton}
        onClick={() =>
          setProductosFiltros({
            fecha_inicio: "",
            fecha_fin: "",
            operador: "",
            ubicacion: "",
            comprado: "",
            texto: "",
          })
        }
      >
        Borrar filtros
      </button>
    </div>

    <div style={styles.reportToolbar}>
      <input
        type="text"
        placeholder="Buscar"
        value={productosFiltros.texto || ""}
        onChange={(e) =>
          setProductosFiltros({
            ...productosFiltros,
            texto: e.target.value,
          })
        }
        style={styles.searchInput}
      />

      <div style={{
        display:"flex",
        gap:12,
        flexWrap:"wrap",
      }}>
        <button
          style={styles.exportButton}
          onClick={exportarProductosVendidos}
        >
          Exportar Excel
        </button>

        <button
          style={{
            ...styles.exportButton,
            borderColor:"#dc2626",
            color:"#dc2626",
          }}
          onClick={exportarProductosVendidosPdf}
        >
          Exportar PDF
        </button>
      </div>
    </div>

    <div style={{ marginTop: 20 }}>
      <div style={styles.tableHeaderProductos}>
        <span>Nombre</span>
        <span>Código</span>
        <span>Categoría</span>
        <span>Descripción</span>
        <span>Cantidad</span>
        <span>Total de Ventas</span>
      </div>

      {productosVendidos.length === 0 ? (
        <div style={styles.emptyState}>
          No hay productos vendidos para mostrar
        </div>
      ) : (
        productosVendidos
          .filter((p) => {
            if (!productosFiltros.texto) return true;
            const texto = productosFiltros.texto.toLowerCase();
            return (
              String(p.nombre || "").toLowerCase().includes(texto) ||
              String(p.codigo || "").toLowerCase().includes(texto) ||
              String(p.categoria || "").toLowerCase().includes(texto) ||
              String(p.descripcion || "").toLowerCase().includes(texto)
            );
          })
          .map((p, index) => (
            <div key={p.id || index} style={styles.rowTablaProductos}>
              <span>{p.nombre || "-"}</span>
              <span>{p.codigo || "-"}</span>
              <span>{p.categoria || "-"}</span>
              <span>{p.descripcion || "-"}</span>
              <span>{p.cantidad || 0}</span>
              <span>${Number(p.total || 0).toFixed(2)}</span>
            </div>
          ))
      )}
    </div>
  </div>
)}

{vista === "egresos_diarios" && (
  <div style={styles.card}>
    <div style={styles.pageHeaderSmall}>
      <div>
        <h2 style={{ margin: 0, fontSize: "28px", color: "#0f172a" }}>
          Egresos diarios
        </h2>
      </div>

      {puede("egresos.gestionar") && (
        <button
          style={styles.secondaryButton}
          onClick={() => {
            const abrir = !mostrarCrearEgreso;

            if (abrir) {
              cargarProveedoresStock();
            }

            if (abrir && !editandoEgresoId) {
              setEgresoForm((actual) => ({
                ...actual,
                fecha: actual.fecha || obtenerFechaEcuadorISO(),
                tipo_documento: actual.tipo_documento || "FACTURA",
                tipo_egreso: "Efectivo",
              }));
            }

            setMostrarCrearEgreso(abrir);
          }}
        >
          {mostrarCrearEgreso ? "Cerrar formulario" : "Crear egreso"}
        </button>
      )}
    </div>

    {mostrarCrearEgreso && puede("egresos.gestionar") && (
      <div style={{ ...styles.box, marginBottom: 20, padding: 20 }}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Local</label>
            <select
              value={egresoForm.negocio}
              onChange={(e) =>
                setEgresoForm({
                  ...egresoForm,
                  negocio: e.target.value,
                })
              }
              style={styles.input}
            >
              <option value="PENSIONADO">PENSIONADO</option>
              <option value="FEUE">FEUE</option>
              <option value="MARISTA">MARISTA</option>
              <option value="CIPRES">CIPRES</option>
              <option value="EVENTO">EVENTO</option>
              <option value="OTROS">OTROS</option>
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Fecha</label>
            <input
              type="date"
              value={egresoForm.fecha}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, fecha: e.target.value })
              }
              style={styles.input}
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Nombre del proveedor</label>
            <select
              value={egresoForm.proveedor_id}
              onChange={(e) => {
                const proveedorId = e.target.value;
                const proveedor = proveedoresStock.find(
                  (item) => Number(item.id) === Number(proveedorId)
                );

                setEgresoForm({
                  ...egresoForm,
                  proveedor_id: proveedorId,
                  proveedor_nombre: proveedor?.nombre || "",
                  // Se conserva nombre_egreso por compatibilidad con cierres/reportes existentes.
                  nombre_egreso: proveedor?.nombre || "",
                });
              }}
              style={styles.input}
            >
              <option value="">Seleccionar proveedor</option>
              {proveedoresStock.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                  {proveedor.ruc ? ` - ${proveedor.ruc}` : ""}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button
                type="button"
                style={styles.outlineButton}
                onClick={() =>
                  document.getElementById("importar-proveedores-egresos")?.click()
                }
                disabled={importandoProveedoresStock}
              >
                {importandoProveedoresStock
                  ? "Importando..."
                  : "Importar proveedores"}
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={descargarPlantillaProveedoresStock}
              >
                Descargar plantilla
              </button>

              <input
                id="importar-proveedores-egresos"
                type="file"
                accept=".xlsx,.xls"
                onChange={importarProveedoresStockExcel}
                style={{ display: "none" }}
              />
            </div>

            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              Excel: NOMBRE | RUC_CEDULA
            </div>
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Total</label>
            <input
              type="number"
              step="0.01"
              value={egresoForm.total}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, total: e.target.value })
              }
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Número de factura</label>
            <input
              type="text"
              value={egresoForm.numero_factura}
              onChange={(e) =>
                setEgresoForm({
                  ...egresoForm,
                  numero_factura: e.target.value,
                })
              }
              style={styles.input}
              placeholder="001-002-000028733"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Tipo de documento</label>
            <select
              value={egresoForm.tipo_documento}
              onChange={(e) =>
                setEgresoForm({
                  ...egresoForm,
                  tipo_documento: e.target.value,
                  tipo_egreso: "Efectivo",
                })
              }
              style={styles.input}
            >
              <option value="FACTURA">FACTURA</option>
              <option value="NOTA_DE_VENTA">NOTA DE VENTA</option>
              <option value="RECIBO_SIMPLE">RECIBO SIMPLE</option>
              <option value="ANTICIPO_SUELDO">ANTICIPO SUELDO</option>
              <option value="PROVISIONAL">PROVISIONAL</option>
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Tipo de egreso</label>
            <input
              type="text"
              value="Efectivo"
              readOnly
              style={{ ...styles.input, background: "#f1f5f9", color: "#334155" }}
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Estado</label>
            <select
              value={egresoForm.estado}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, estado: e.target.value })
              }
              style={styles.input}
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="ANULADO">ANULADO</option>
            </select>
          </div>

          <div style={styles.filterFieldWide}>
            <label style={styles.label}>Descripción</label>
            <input
              type="text"
              value={egresoForm.descripcion}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, descripcion: e.target.value })
              }
              style={styles.input}
              placeholder="Detalle del pago o gasto"
            />
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button
            style={styles.button}
onClick={guardarEgreso}
          >
            Guardar egreso
          </button>
        </div>
      </div>
    )}

    <div style={styles.filtersGrid}>
      <div style={styles.filterField}>
        <label style={styles.label}>Fecha inicial</label>
        <input
          type="date"
          value={egresosFiltros.fecha_inicio}
          onChange={(e) =>
            setEgresosFiltros({
              ...egresosFiltros,
              fecha_inicio: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterField}>
        <label style={styles.label}>Fecha final</label>
        <input
          type="date"
          value={egresosFiltros.fecha_fin}
          onChange={(e) =>
            setEgresosFiltros({
              ...egresosFiltros,
              fecha_fin: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterFieldWide}>
        <label style={styles.label}>Buscar</label>
        <input
          type="text"
          value={egresosFiltros.texto}
          onChange={(e) =>
            setEgresosFiltros({
              ...egresosFiltros,
              texto: e.target.value,
            })
          }
          style={styles.searchInput}
          placeholder="Buscar"
        />
      </div>
    </div>

    <div style={styles.filterButtons}>
      <button style={styles.button} onClick={cargarEgresos}>Consultar</button>

      <button
        style={styles.outlineButton}
        onClick={() =>
          setEgresosFiltros({
            fecha_inicio: "",
            fecha_fin: "",
            texto: "",
          })
        }
      >
        Borrar filtros
      </button>

      <button
        type="button"
        style={styles.exportButton}
        onClick={exportarEgresosExcel}
      >
        EXPORTAR EXCEL
      </button>

      <button
        type="button"
        style={styles.outlineButton}
        onClick={exportarEgresosPDF}
      >
        EXPORTAR PDF
      </button>

      {esAdminEgresos && (
        <>
          <button
            type="button"
            style={styles.outlineButton}
            onClick={seleccionarTodosEgresosVisibles}
          >
            Seleccionar todo
          </button>

          <button
            type="button"
            style={styles.deleteIconButton}
            disabled={!egresosSeleccionadosBorrar.length}
            onClick={eliminarEgresosSeleccionados}
            title="Eliminar egresos seleccionados"
          >
            🗑️ {egresosSeleccionadosBorrar.length || ""}
          </button>
        </>
      )}
    </div>

    <div style={{ marginTop: 20, overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            {esAdminEgresos && <th style={styles.th}>Sel.</th>}
            <th style={styles.th}>Local</th>
            <th style={styles.th}>Fecha</th>
            <th style={styles.th}>Nombre del proveedor</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Descripción</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Número de documento</th>
            <th style={styles.th}>Tipo de documento</th>
            <th style={styles.th}>Tipo de egreso</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {egresosDiarios
            .filter((egreso) => {
              const cumpleInicio =
                !egresosFiltros.fecha_inicio ||
                (egreso.fecha && egreso.fecha >= egresosFiltros.fecha_inicio);

              const cumpleFin =
                !egresosFiltros.fecha_fin ||
                (egreso.fecha && egreso.fecha <= egresosFiltros.fecha_fin);

              const texto = egresosFiltros.texto.toLowerCase();

              const cumpleTexto =
                !texto ||
                String(egreso.negocio || "").toLowerCase().includes(texto) ||
                String(egreso.nombre_egreso || "").toLowerCase().includes(texto) ||
                String(egreso.descripcion || "").toLowerCase().includes(texto) ||
                String(egreso.numero_factura || "").toLowerCase().includes(texto);

              return cumpleInicio && cumpleFin && cumpleTexto;
            })
            .map((egreso) => (
              <tr key={egreso.id}>
                {esAdminEgresos && (
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={egresosSeleccionadosBorrar.some(
                        (id) => Number(id) === Number(egreso.id)
                      )}
                      onChange={() => alternarEgresoSeleccionadoBorrar(egreso.id)}
                      aria-label={`Seleccionar egreso ${egreso.id}`}
                    />
                  </td>
                )}
                <td style={styles.td}>{egreso.negocio}</td>
                <td style={styles.td}>{formatearSoloFecha(egreso.fecha)}</td>
                <td style={styles.td}>{egreso.nombre_egreso}</td>
                <td style={styles.td}>${Number(egreso.total || 0).toFixed(2)}</td>
                <td style={styles.td}>{egreso.descripcion}</td>
                <td style={styles.td}>{egreso.estado}</td>
                <td style={styles.td}>{egreso.numero_factura}</td>
                <td style={styles.td}>
                  {String(egreso.tipo_documento || "FACTURA").replace(/_/g, " ")}
                </td>
                <td style={styles.td}>{egreso.tipo_egreso || "Efectivo"}</td>
                <td style={styles.td}>
                  {puede("egresos.gestionar") ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={styles.editIconButton}
                        onClick={() => {
                          setEgresoForm({
                            negocio: egreso.negocio || "",
                            usuario: egreso.usuario || "",
                            fecha: normalizarFechaISO(egreso.fecha) || "",
                            nombre_egreso:
                              egreso.proveedor_nombre ||
                              egreso.nombre_egreso ||
                              "",
                            proveedor_id: egreso.proveedor_id
                              ? String(egreso.proveedor_id)
                              : "",
                            proveedor_nombre:
                              egreso.proveedor_nombre ||
                              egreso.nombre_egreso ||
                              "",
                            total: egreso.total || "",
                            descripcion: egreso.descripcion || "",
                            estado: egreso.estado || "ACTIVO",
                            numero_factura: egreso.numero_factura || "",
                            tipo_documento: egreso.tipo_documento || "FACTURA",
                            tipo_egreso: "Efectivo",
                          });
                          setEditandoEgresoId(egreso.id);
                          setMostrarCrearEgreso(true);
                        }}
                      >
                        ✎
                      </button>

                      {esAdminEgresos && (
                        <button
                          style={styles.deleteIconButton}
                          onClick={() => eliminarEgreso(egreso)}
                          title="Eliminar egreso"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "#64748b" }}>Solo consulta</span>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{vista === "reporte_productos_dia" && (
  <div style={styles.card}>
    <div style={styles.reporteHeader}>
      <div>
        <h2 style={{ margin: 0 }}>Reporte de Productos Vendidos por Día</h2>
      </div>
    </div>

    <div style={styles.filtrosRow}>
      <div style={styles.filterGroup}>
        <label style={styles.label}>Fecha inicial</label>
        <input
          type="date"
          value={productosPorDiaFiltros.fecha_inicio}
          onChange={(e) =>
            setProductosPorDiaFiltros({
              ...productosPorDiaFiltros,
              fecha_inicio: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Fecha final</label>
        <input
          type="date"
          value={productosPorDiaFiltros.fecha_fin}
          onChange={(e) =>
            setProductosPorDiaFiltros({
              ...productosPorDiaFiltros,
              fecha_fin: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Ubicación</label>
        <select
          value={productosPorDiaFiltros.ubicacion || ""}
          onChange={(e) =>
            setProductosPorDiaFiltros({
              ...productosPorDiaFiltros,
              ubicacion: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todas</option>

          {[...new Set([
            ...(puntosOperacion || []).map((p) =>
              String(p?.nombre || "").trim().toUpperCase()
            ),
            ...ventasEnriquecidas.map((venta) =>
              String(
                venta.ubicacion_visual ||
                venta.ubicacion ||
                ""
              )
                .trim()
                .toUpperCase()
            ),
          ].filter((ubicacion) =>
            ubicacion &&
            ubicacion !== "PRINCIPAL"
          ))].map((ubicacion) => (
            <option
              key={ubicacion}
              value={ubicacion}
            >
              {ubicacion}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Comprado</label>
        <select
          value={productosPorDiaFiltros.comprado || ""}
          onChange={(e) =>
            setProductosPorDiaFiltros({
              ...productosPorDiaFiltros,
              comprado: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todos</option>
          <option value="SI">Sí</option>
          <option value="NO">No</option>
        </select>
      </div>
    </div>

    <div style={styles.filterActions}>
      <button
        style={styles.outlineButton}
        onClick={() =>
          setProductosPorDiaFiltros({
            fecha_inicio: "",
            fecha_fin: "",
            ubicacion: "",
            comprado: "",
            texto: "",
          })
        }
      >
        Borrar filtros
      </button>

      <button
        style={{
          ...styles.button,
          minWidth: 150,
          minHeight: 52,
          padding: "12px 26px",
          fontSize: 18,
          fontWeight: 800,
          background: "#2563eb",
          color: "#ffffff",
          border: "1px solid #2563eb",
          borderRadius: 12,
          cursor: "pointer",
        }}
        onClick={consultarProductosPorDia}
      >
        Consultar
      </button>

      <button
        style={styles.exportButton}
        onClick={exportarProductosVendidosPorDia}
      >
        Exportar Excel
      </button>

      <button
        style={{
          ...styles.exportButton,
          borderColor: "#dc2626",
          color: "#dc2626",
        }}
        onClick={exportarProductosVendidosPorDiaPdf}
      >
        Exportar PDF
      </button>
    </div>

    <div style={styles.reportToolbar}>
      <input
        type="text"
        placeholder="Buscar"
        value={productosPorDiaFiltros.texto || ""}
        onChange={(e) =>
          setProductosPorDiaFiltros({
            ...productosPorDiaFiltros,
            texto: e.target.value,
          })
        }
        style={styles.searchInput}
      />
    </div>

    <div style={{ marginTop: 20, overflowX: "auto" }}>
      <div style={styles.tableHeaderProductosDia}>
        <span>Producto</span>
        <span>Categoría</span>
        <span>Domingo</span>
        <span>Lunes</span>
        <span>Martes</span>
        <span>Miércoles</span>
        <span>Jueves</span>
        <span>Viernes</span>
        <span>Sábado</span>
      </div>

      {productosVendidosPorDia.length === 0 ? (
        <div style={styles.emptyState}>
          No hay productos vendidos por día para mostrar
        </div>
      ) : (
        productosVendidosPorDia
          .filter((p) => {
            if (!productosPorDiaFiltros.texto) return true;
            const texto = productosPorDiaFiltros.texto.toLowerCase();
            return (
              String(p.producto || "").toLowerCase().includes(texto) ||
              String(p.categoria || "").toLowerCase().includes(texto)
            );
          })
          .map((p, index) => (
            <div key={index} style={styles.rowTablaProductosDia}>
              <span>{p.producto}</span>
              <span>{p.categoria}</span>
              <span>{p.domingo}</span>
              <span>{p.lunes}</span>
              <span>{p.martes}</span>
              <span>{p.miercoles}</span>
              <span>{p.jueves}</span>
              <span>{p.viernes}</span>
              <span>{p.sabado}</span>
            </div>
          ))
      )}
    </div>
  </div>
)}
       {vista === "productos" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Menu de la Cafetería</h1>
      </div>

      <div style={styles.headerActions}>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => {
            setProductoDetalle(null);
            setProductoEditando(null);
            setProductoForm({
              nombre: "",
              codigo: "",
              precio: "",
              categoria: "",
              stock: "",
              imagen: "",
              activo: true,
            });
            setVista("productos");
            setMostrarFormularioProducto(true);
          }}
          title="Crear alimento"
        >
          Crear alimento
        </button>
      </div>
    </div>

    {productoDetalle && (
      <div style={{ ...styles.box, marginBottom: 20 }}>
        <div style={styles.pageHeaderSmall}>
          <h2 style={{ margin: 0 }}>Detalle del alimento</h2>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              style={styles.outlineButton}
              onClick={() => {
                setProductoEditando(productoDetalle);
                setProductoForm({
                  nombre: productoDetalle.nombre || "",
                  codigo: productoDetalle.codigo || "",
                  precio: productoDetalle.precio ?? "",
                  categoria: productoDetalle.categoria || "",
                  stock: productoDetalle.stock ?? "",
                  imagen: productoDetalle.imagen || "",
                  activo: productoDetalle.activo !== false,
                });
                setMostrarFormularioProducto(true);
                setProductoDetalle(null);
              }}
            >
              Editar
            </button>

            <button
              type="button"
              style={styles.outlineButton}
              onClick={() => setProductoDetalle(null)}
            >
              Cerrar
            </button>
          </div>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Nombre</label>
            <input
              type="text"
              value={productoDetalle.nombre || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Código</label>
            <input
              type="text"
              value={productoDetalle.codigo || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Precio</label>
            <input
              type="text"
              value={Number(productoDetalle.precio || 0).toFixed(2)}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Categoría</label>
            <input
              type="text"
              value={productoDetalle.categoria || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Stock</label>
            <input
              type="text"
              value={String(productoDetalle.stock ?? "")}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Estado</label>
            <input
              type="text"
              value={productoDetalle.activo === false ? "Inactivo" : "Activo"}
              style={styles.input}
              readOnly
            />
          </div>
        </div>

        {!!productoDetalle.imagen && (
          <div style={{ marginTop: 16 }}>
            <label style={styles.label}>Imagen</label>
            <div style={{ marginTop: 8 }}>
              <img
                src={productoDetalle.imagen}
                alt={productoDetalle.nombre || "Producto"}
                style={{
                  width: 140,
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                }}
              />
            </div>
          </div>
        )}
      </div>
    )}

    {mostrarFormularioProducto && (
      <>
        <div
          onClick={() => {
            setMostrarFormularioProducto(false);
            setProductoEditando(null);
          }}
          style={{
            position:"fixed",
            inset:0,
            background:"rgba(15,23,42,0.28)",
            zIndex:1198,
          }}
        />
        <div
          style={{
            ...styles.box,
            position:"fixed",
            top:esPantallaCompacta?18:24,
            left:esPantallaCompacta?12:292,
            right:esPantallaCompacta?12:24,
            zIndex:1199,
            margin:0,
            maxHeight:"calc(100vh - 48px)",
            overflowY:"auto",
            boxShadow:"0 22px 60px rgba(15,23,42,0.28)",
            border:"1px solid #dbe3ee",
          }}
        >
        <div
          style={{
            ...styles.pageHeaderSmall,
            position:"sticky",
            top:0,
            zIndex:2,
            background:"#fff",
            paddingBottom:12,
            borderBottom:"1px solid #e5e7eb",
          }}
        >
          <h2 style={{ margin: 0 }}>
            {productoEditando ? "Editar alimento" : "Crear alimento"}
          </h2>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              setMostrarFormularioProducto(false);
              setProductoEditando(null);
              setProductoForm({
                nombre: "",
                codigo: "",
                precio: "",
                categoria: "",
                stock: "",
                imagen: "",
                activo: true,
              });
            }}
            title="Cerrar formulario"
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={productoEditando ? actualizarProducto : crearProducto}
          style={styles.form}
        >
          <div style={styles.filtersGrid}>
            <div style={styles.filterField}>
              <label style={styles.label}>Nombre</label>
              <input
                type="text"
                value={productoForm.nombre}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, nombre: e.target.value })
                }
                style={styles.input}
                required
              />
            </div>

            <div style={styles.filterField}>
              <label style={styles.label}>Código</label>
              <input
                type="text"
                value={productoForm.codigo}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, codigo: e.target.value })
                }
                style={styles.input}
              />
            </div>

            <div style={styles.filterField}>
              <label style={styles.label}>Precio</label>
              <input
                type="number"
                step="0.01"
                value={productoForm.precio}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, precio: e.target.value })
                }
                style={styles.input}
                required
              />
            </div>

            <div style={styles.filterField}>
              <label style={styles.label}>Categoría</label>
              <input
                type="text"
                value={productoForm.categoria}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, categoria: e.target.value })
                }
                style={styles.input}
              />
            </div>

            <div style={styles.filterField}>
              <label style={styles.label}>Stock inicial</label>
              <input
                type="number"
                value={productoForm.stock}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, stock: e.target.value })
                }
                style={styles.input}
              />
            </div>
          </div>

          {["ADMIN","SUPER_ADMIN"].includes(rolActual) && (
            <div style={styles.filterField}>
              <label style={styles.label}>Imagen del producto</label>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                {productoForm.imagen ? <img src={productoForm.imagen} alt="Seleccionada" style={{width:72,height:72,objectFit:"cover",borderRadius:12,border:"1px solid #d1d5db"}} /> : null}
                <button type="button" style={styles.outlineButton} onClick={()=>{setVista("galeria_productos");cargarGaleriaProductos();}}>Elegir de la galería</button>
                {productoForm.imagen && <button type="button" style={styles.outlineButton} onClick={()=>setProductoForm({...productoForm,imagen:""})}>Sin imagen</button>}
              </div>
              <small style={{color:"#64748b"}}>La galería usa imágenes cuadradas. Las fotos cargadas admiten JPG, JPEG, PNG o WEBP, máximo 2 MB; recomendado 600 × 600 px.</small>
            </div>
          )}

          <div style={styles.filterButtons}>
            <button type="submit" style={styles.button}>
              {productoEditando ? "Actualizar alimento" : "Guardar alimento"}
            </button>
          </div>
        </form>
      </div>
      </>
    )}

    <div style={styles.box}>
      <div style={styles.pageHeaderSmall}>
        <input
          type="text"
          placeholder="Buscar"
          value={busquedaProductos}
          onChange={(e) => setBusquedaProductos(e.target.value)}
          style={styles.searchInput}
        />

        <div style={styles.headerActions}>
          <select
            value={filtroCategoriaProductos || ""}
            onChange={(e) => setFiltroCategoriaProductos(e.target.value)}
            style={styles.select}
          >
            <option value="">Todas las categorías</option>
            {[...new Set(productos.map((p) => p.categoria).filter(Boolean))].map(
              (categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              )
            )}
          </select>

          {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (() => {
            const visibles = productos
              .filter((p) => {
                const coincideTexto = String(p.nombre || "")
                  .toLowerCase()
                  .includes(busquedaProductos.toLowerCase());

                const coincideCategoria =
                  !filtroCategoriaProductos ||
                  String(p.categoria || "") === filtroCategoriaProductos;

                return coincideTexto && coincideCategoria;
              })
              .map((p) => Number(p.id));

            const todosMarcados =
              visibles.length > 0 &&
              visibles.every((id) =>
                productosMenuSeleccionadosBorrar.includes(id)
              );

            return (
              <>
                <button
                  type="button"
                  style={styles.outlineButton}
                  disabled={eliminandoProductosPrueba || visibles.length === 0}
                  onClick={() =>
                    setProductosMenuSeleccionadosBorrar((actual) => {
                      const actuales = new Set((actual || []).map(Number));

                      if (todosMarcados) {
                        visibles.forEach((id) => actuales.delete(id));
                      } else {
                        visibles.forEach((id) => actuales.add(id));
                      }

                      return Array.from(actuales);
                    })
                  }
                >
                  {todosMarcados ? "Quitar selección" : "Seleccionar todo"}
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.deleteIconButton,
                    padding:"7px 9px",
                    minWidth:40,
                    fontSize:16,
                    lineHeight:1,
                  }}
                  disabled={
                    eliminandoProductosPrueba ||
                    productosMenuSeleccionadosBorrar.length === 0
                  }
                  onClick={eliminarProductosMenuSeleccionados}
                  title={`Eliminar ${productosMenuSeleccionadosBorrar.length} producto(s) seleccionado(s)`}
                  aria-label="Eliminar productos seleccionados del menú"
                >
                  🗑️ {productosMenuSeleccionadosBorrar.length}
                </button>
              </>
            );
          })()}

          <button
            type="button"
            style={styles.button}
            title="Exportar menú cafetería"
            onClick={() => {
              const filas = [
                [
                  "Nombre",
                  "Código",
                  "Precio",
                  "% impuestos",
                  "Precio final",
                  "Categoría",
                  "Estado",
                ],
                ...productos
                  .filter((p) => {
                    const coincideTexto = String(p.nombre || "")
                      .toLowerCase()
                      .includes(busquedaProductos.toLowerCase());

                    const coincideCategoria =
                      !filtroCategoriaProductos ||
                      String(p.categoria || "") === filtroCategoriaProductos;

                    return coincideTexto && coincideCategoria;
                  })
                  .map((p) => {
                    const impuesto = Number(p.impuesto || 0);
                    const precio = Number(p.precio || 0);
                    const precioFinal = precio + precio * (impuesto / 100);

                    return [
                      p.nombre || "",
                      p.codigo || "",
                      precio.toFixed(2),
                      impuesto.toFixed(2),
                      precioFinal.toFixed(2),
                      p.categoria || "",
                      p.activo === false ? "Inactivo" : "Activo",
                    ];
                  }),
              ];

              const csv = filas
                .map((fila) =>
                  fila
                    .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
                    .join(",")
                )
                .join("\n");

              const blob = new Blob([csv], {
                type: "text/csv;charset=utf-8;",
              });

              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "menu_cafeteria.csv";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            Exportar
          </button>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                <th style={styles.th}>Seleccionar</th>
              )}
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Precio</th>
              <th style={styles.th}>% impuestos</th>
              <th style={styles.th}>Precio final</th>
              <th style={styles.th}>Categoría</th>
              <th style={styles.th}>Acciones</th>
            </tr>

            <tr>
              {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                <th style={styles.th}></th>
              )}
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}>
                <select
                  value={filtroCategoriaProductos || ""}
                  onChange={(e) => setFiltroCategoriaProductos(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Seleccionar</option>
                  {[...new Set(productos.map((p) => p.categoria).filter(Boolean))].map(
                    (categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    )
                  )}
                </select>
              </th>
              <th style={styles.th}></th>
            </tr>
          </thead>

          <tbody>
            {productos
              .filter((p) => {
                const coincideTexto = String(p.nombre || "")
                  .toLowerCase()
                  .includes(busquedaProductos.toLowerCase());

                const coincideCategoria =
                  !filtroCategoriaProductos ||
                  String(p.categoria || "") === filtroCategoriaProductos;

                return coincideTexto && coincideCategoria;
              })
              .map((producto) => {
                const precio = Number(producto.precio || 0);
                const impuesto = Number(producto.impuesto || 0);
                const precioFinal = precio + precio * (impuesto / 100);
                const estaInactivo = producto.activo === false;

                return (
                  <tr
                    key={producto.id}
                    style={
                      estaInactivo
                        ? {
                            opacity: 0.6,
                            backgroundColor: "#f3f4f6",
                          }
                        : {}
                    }
                  >
                    {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={productosMenuSeleccionadosBorrar.includes(
                            Number(producto.id)
                          )}
                          onChange={(e) =>
                            alternarSeleccionId(
                              setProductosMenuSeleccionadosBorrar,
                              producto.id,
                              e.target.checked
                            )
                          }
                          title={`Seleccionar ${producto.nombre}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}

                    <td style={styles.td}>
                      {producto.nombre}
                      {estaInactivo ? " 🔒" : ""}
                    </td>

                    <td style={styles.td}>{producto.codigo || ""}</td>
                    <td style={styles.td}>{precio.toFixed(4)}</td>
                    <td style={styles.td}>{impuesto.toFixed(4)}</td>
                    <td style={styles.td}>{precioFinal.toFixed(2)}</td>
                    <td style={styles.td}>
                      {producto.categoria || ""}
                      {estaInactivo ? " (Inactivo)" : ""}
                    </td>

                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          style={styles.smallDarkButton}
                          title="Ver detalle"
                          onClick={() => {
                            setProductoDetalle(producto);
                            setMostrarFormularioProducto(false);
                          }}
                        >
                          ◉
                        </button>

                        <button
                          type="button"
                          style={styles.editIconButton}
                          title="Editar producto"
                          onClick={() => {
                            setProductoDetalle(null);
                            setProductoEditando(producto);
                            setProductoForm({
                              nombre: producto.nombre || "",
                              codigo: producto.codigo || "",
                              precio: producto.precio ?? "",
                              categoria: producto.categoria || "",
                              stock: producto.stock ?? "",
                              imagen: producto.imagen || "",
                              activo: producto.activo !== false,
                            });
                            setVista("productos");
                            setMostrarFormularioProducto(true);
                          }}
                        >
                          ✎
                        </button>

                      {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                        <button
                          type="button"
                          style={styles.deleteIconButton}
                          title={estaInactivo ? "Reactivar producto" : "Desactivar producto"}
                          onClick={() => {
                            if (estaInactivo) {
                              const confirmado = window.confirm(
                                `¿Deseas reactivar el producto ${producto.nombre}?`
                              );
                              if (!confirmado) return;

                              reactivarProducto(producto.id);
                              return;
                            }

                            const confirmado = window.confirm(
                              `¿Deseas desactivar el producto ${producto.nombre}?`
                            );
                            if (!confirmado) return;

                            desactivarProducto(producto.id);
                          }}
                        >
                          {estaInactivo ? "🔓" : "🗑"}
                        </button>
                      )}

                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  </>
)}

       {vista === "alumnos" && (
  <AlumnosModulo
    styles={styles}
    filtroAlumnos={filtroAlumnos}
    setFiltroAlumnos={setFiltroAlumnos}
    cargarAlumnos={cargarAlumnos}
    alumnoDetalle={alumnoDetalle}
    obtenerCedulaAlumno={obtenerCedulaAlumno}
    formatearMoneda={formatearMoneda}
    setVista={setVista}
    setVistaVentasInterna={setVistaVentasInterna}
    setModoNuevaOrden={setModoNuevaOrden}
    setVentaItems={setVentaItems}
    setVentaForm={setVentaForm}
    setBusquedaUsuarioNuevaOrden={setBusquedaUsuarioNuevaOrden}
    setBusquedaProductoNuevaOrden={setBusquedaProductoNuevaOrden}
    setCodigoBarraNuevaOrden={setCodigoBarraNuevaOrden}
    setCategoriaNuevaOrden={setCategoriaNuevaOrden}
    setRecargaForm={setRecargaForm}
    iniciarEdicionAlumno={iniciarEdicionAlumno}
    setAlumnoDetalle={setAlumnoDetalle}
    setVistaAlumnoDetalle={setVistaAlumnoDetalle}
    vistaAlumnoDetalle={vistaAlumnoDetalle}
    historialVentasAlumno={historialVentasAlumno}
    historialConsumoAlumno={historialConsumoAlumno}
    setOrdenDetalleAlumno={setOrdenDetalleAlumno}
    ordenDetalleAlumno={ordenDetalleAlumno}
    historialRecargasAlumno={historialRecargasAlumno}
    editandoAlumnoId={editandoAlumnoId}
    actualizarAlumno={actualizarAlumno}
    crearAlumno={crearAlumno}
    alumnoForm={alumnoForm}
    setAlumnoForm={setAlumnoForm}
    limpiarFormularioAlumno={limpiarFormularioAlumno}
    alumnosFiltrados={alumnosFiltrados}
    eliminarAlumno={eliminarAlumno}
    restaurarAlumno={restaurarAlumno}
    API_URL={API_URL}
    obtenerInstitucionActivaId={obtenerInstitucionActivaId}
    setHistorialVentasAlumno={setHistorialVentasAlumno}
    setHistorialRecargasAlumno={setHistorialRecargasAlumno}
    setHistorialConsumoAlumno={setHistorialConsumoAlumno}
    cuentasBancarias={cuentasBancarias}
    cargarCuentasBancarias={cargarCuentasBancarias}
    cargarRecargas={cargarRecargas}
    rolActual={rolActual}
    descargarPlantillaAlumnos={descargarPlantillaAlumnos}
    importarAlumnosArchivo={importarAlumnosArchivo}
    inputImportarAlumnosRef={inputImportarAlumnosRef}
  />
)}


{vista === "padres" && (
  <PadresModulo
    API_URL={API_URL}
    token={localStorage.getItem("token")}
    institucionId={institucionActivaId}
    institucionNombre={institucionActiva?.nombre || "Institución"}
    alumnos={alumnos}
    cargarAlumnos={cargarAlumnos}
  />
)}

{vista === "productos_mas_vendidos" && (
  <ProductosMasVendidosModulo
    API_URL={API_URL}
    token={localStorage.getItem("token")}
    institucionId={institucionActivaId}
    institucionNombre={institucionActiva?.nombre || "Institución"}
  />
)}

{vista === "kardex_productos" && (
  <KardexModulo
    API_URL={API_URL}
    token={localStorage.getItem("token")}
    institucionId={institucionActivaId}
    institucionNombre={institucionActiva?.nombre || "Institución"}
    productos={productos}
  />
)}

{vista === "productos_forma_pago" && (
  <ProductosFormaPagoModulo
    API_URL={API_URL}
    token={localStorage.getItem("token")}
    institucionId={institucionActivaId}
    institucionNombre={institucionActiva?.nombre || "Institución"}
  />
)}

{vista === "profesores" && (
  <>
    {mostrarModalRecargaProfesor && profesorDetalle && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.62)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            cerrarModalRecargaProfesor();
          }
        }}
      >
        <div
          style={{
            width: "min(780px, 96vw)",
            maxHeight: "92vh",
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: 18,
            padding: "28px 32px",
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 25, color: "#172033" }}>
                Recarga de saldo
              </h3>
              <div style={{ marginTop: 8, color: "#334155" }}>
                {`${profesorDetalle.nombres || ""} ${
                  profesorDetalle.apellidos || ""
                }`.trim()}
              </div>
            </div>

            <button
              type="button"
              onClick={cerrarModalRecargaProfesor}
              disabled={guardandoRecargaProfesor}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 34,
                lineHeight: 1,
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={registrarRecargaProfesor}>
            <label
              style={{
                display: "block",
                fontWeight: 800,
                color: "#334155",
                fontSize: 17,
                marginBottom: 8,
              }}
            >
              Valor a recargar *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={recargaProfesorForm.monto}
              onChange={(e) =>
                setRecargaProfesorForm((prev) => ({
                  ...prev,
                  monto: e.target.value,
                }))
              }
              placeholder="0.00"
              autoFocus
              required
              style={{
                width: "100%",
                height: 56,
                border: "2px solid #172033",
                borderRadius: 12,
                padding: "0 16px",
                fontSize: 20,
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                marginTop: 24,
                fontWeight: 800,
                color: "#475569",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              <span>¿Es transferencia?</span>
              <input
                type="checkbox"
                checked={
                  recargaProfesorForm.metodo_pago === "TRANSFERENCIA"
                }
                onChange={(e) =>
                  setRecargaProfesorForm((prev) => ({
                    ...prev,
                    metodo_pago: e.target.checked
                      ? "TRANSFERENCIA"
                      : "EFECTIVO",
                    fecha_transferencia: "",
                    numero_comprobante: "",
                  }))
                }
                style={{ width: 20, height: 20 }}
              />
            </label>

            {recargaProfesorForm.metodo_pago === "TRANSFERENCIA" && (
              <>                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#334155",
                    fontSize: 17,
                    marginTop: 22,
                    marginBottom: 8,
                  }}
                >
                  Fecha en que realizó la transferencia *
                </label>
                <input
                  type="date"
                  value={recargaProfesorForm.fecha_transferencia}
                  onChange={(e) =>
                    setRecargaProfesorForm((prev) => ({
                      ...prev,
                      fecha_transferencia: e.target.value,
                    }))
                  }
                  required
                  style={{
                    width: "100%",
                    height: 54,
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "0 14px",
                    fontSize: 16,
                    background: "#ffffff",
                    boxSizing: "border-box",
                  }}
                />

                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#334155",
                    fontSize: 17,
                    marginTop: 20,
                    marginBottom: 8,
                  }}
                >
                  Número de comprobante *
                </label>
                <input
                  type="text"
                  value={recargaProfesorForm.numero_comprobante}
                  onChange={(e) =>
                    setRecargaProfesorForm((prev) => ({
                      ...prev,
                      numero_comprobante: e.target.value,
                    }))
                  }
                  placeholder="Número de documento"
                  required
                  style={{
                    width: "100%",
                    height: 54,
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "0 14px",
                    fontSize: 16,
                    boxSizing: "border-box",
                  }}
                />
              </>
            )}

            <label
              style={{
                display: "block",
                fontWeight: 800,
                color: "#334155",
                fontSize: 17,
                marginTop: 22,
                marginBottom: 8,
              }}
            >
              Observación
            </label>
            <input
              type="text"
              value={recargaProfesorForm.observacion}
              onChange={(e) =>
                setRecargaProfesorForm((prev) => ({
                  ...prev,
                  observacion: e.target.value,
                }))
              }
              placeholder="Observación opcional"
              style={{
                width: "100%",
                height: 54,
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                padding: "0 14px",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            <div style={{ textAlign: "center", marginTop: 26 }}>
              <button
                type="submit"
                disabled={guardandoRecargaProfesor}
                style={{
                  minWidth: 245,
                  border: "none",
                  borderRadius: 10,
                  padding: "15px 24px",
                  background: "#2929bd",
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: guardandoRecargaProfesor
                    ? "not-allowed"
                    : "pointer",
                  opacity: guardandoRecargaProfesor ? 0.7 : 1,
                }}
              >
                {guardandoRecargaProfesor
                  ? "Procesando..."
                  : "Realizar recarga"}
              </button>
            </div>

            <p
              style={{
                margin: "22px 0 0",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              La recarga se acreditará inmediatamente al saldo del profesor.
            </p>
          </form>
        </div>
      </div>
    )}

    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Profesores</h1>
        <p style={styles.dashboardSubtitle}>
          Gestión de profesores y créditos
        </p>
      </div>

      <div style={styles.headerActions}>
        {profesorDetalle ? (
          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              setProfesorDetalle(null);
              setVistaProfesorDetalle("ordenes");
              setBusquedaProfesores("");
              setMostrarFiltroProfesores(false);
              limpiarFormularioProfesor();
            }}
          >
            ← Regresar al listado de profesores
          </button>
        ) : (
          <>
            <button
              type="button"
              style={
                vistaProfesoresInterna === "profesores"
                  ? styles.ventasTabActive
                  : styles.ventasTab
              }
              onClick={() => setVistaProfesoresInterna("profesores")}
            >
              Profesores
            </button>

            <button
              type="button"
              style={
                vistaProfesoresInterna === "creditos"
                  ? styles.ventasTabActive
                  : styles.ventasTab
              }
              onClick={async () => {
                setVistaProfesoresInterna("creditos");
                await cargarCreditosProfesores();
              }}
            >
              Créditos Profesores
            </button>
          </>
        )}
      </div>
    </div>

    {vistaProfesoresInterna === "profesores" && !profesorDetalle && (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {mostrarFormularioProfesor && (
        <div style={{ ...styles.box, width: "100%" }}>
          <div style={styles.pageHeaderSmall}>
            <h3 style={{ margin: 0 }}>
              {editandoProfesorId ? "Editar profesor" : "Nuevo profesor"}
            </h3>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => {
                limpiarFormularioProfesor();
                setMostrarFormularioProfesor(false);
              }}
            >
              Cerrar ✕
            </button>
          </div>

          <form
            onSubmit={guardarProfesor}
            style={{
              ...styles.form,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 14,
            }}
          >
            <input
              type="text"
              placeholder="Cédula / RUC"
              value={profesorForm.cedula}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, cedula: e.target.value })
              }
              style={styles.input}
              required
            />

            <input
              type="text"
              placeholder="Nombres"
              value={profesorForm.nombres}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, nombres: e.target.value })
              }
              style={styles.input}
              required
            />

            <input
              type="text"
              placeholder="Apellidos"
              value={profesorForm.apellidos}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, apellidos: e.target.value })
              }
              style={styles.input}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={profesorForm.email}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, email: e.target.value })
              }
              style={styles.input}
            />

            <input
              type="text"
              placeholder="Código"
              value={profesorForm.codigo}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, codigo: e.target.value })
              }
              style={styles.input}
            />

            <input
              type="text"
              placeholder="Teléfono"
              value={profesorForm.telefono}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, telefono: e.target.value })
              }
              style={styles.input}
            />

            <input
              type="number"
              step="0.01"
              placeholder="Crédito"
              value={profesorForm.saldo}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, saldo: e.target.value })
              }
              style={styles.input}
            />

            <button type="submit" style={{ ...styles.button, minHeight: 48 }}>
              {editandoProfesorId ? "Actualizar profesor" : "Guardar profesor"}
            </button>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => {
                limpiarFormularioProfesor();
                setMostrarFormularioProfesor(false);
              }}
            >
              Cancelar
            </button>
          </form>
        </div>
        )}

        <div style={{ ...styles.box, width: "100%" }}>
          <div style={styles.pageHeaderSmall}>
            <h3 style={{ margin: 0 }}>Lista de profesores</h3>

            <div style={styles.headerActions}>
              <button
                type="button"
                style={styles.button}
                onClick={() => {
                  limpiarFormularioProfesor();
                  setMostrarFormularioProfesor(true);
                }}
              >
                + Nuevo profesor
              </button>

              <input
                ref={inputImportarProfesoresRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={importarProfesoresArchivo}
                style={{ display: "none" }}
              />

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={descargarPlantillaProfesores}
              >
                Descargar plantilla
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => inputImportarProfesoresRef.current?.click()}
              >
                Importar Excel
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={() => {
                  setMostrarFiltroProfesores((prev) => !prev);
                  if (mostrarFiltroProfesores) {
                    setBusquedaProfesores("");
                  }
                }}
              >
                {mostrarFiltroProfesores ? "Cerrar filtro" : "Filtrar profesor"}
              </button>

              {mostrarFiltroProfesores && (
                <input
                  type="text"
                  value={busquedaProfesores}
                  onChange={(e) => setBusquedaProfesores(e.target.value)}
                  placeholder="Nombres, apellidos o cédula"
                  style={{ ...styles.input, minWidth: 260, margin: 0 }}
                  autoFocus
                />
              )}

              <select
                value={filtroProfesores}
                onChange={(e) => setFiltroProfesores(e.target.value)}
                style={styles.select}
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={exportarProfesoresExcel}
              >
                Exportar Excel
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={exportarProfesoresPdf}
              >
                Exportar PDF
              </button>
            </div>
          </div>

          {profesoresFiltrados.length === 0 ? (
            <p>No hay profesores para este filtro.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Apellido</th>
                    <th style={styles.th}>Es profesor</th>
                    <th style={styles.th}>Cédula/Ruc</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}>Crédito</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {profesoresFiltrados.map((p) => {
                      const activo = p.activo !== false;

                      return (
                        <tr key={p.id}>
                          <td style={styles.td}>{p.id || "-"}</td>
                          <td style={styles.td}>{p.nombres || "-"}</td>
                          <td style={styles.td}>{p.apellidos || "-"}</td>
                          <td style={styles.td}>{p.es_profesor ? "Sí" : "No"}</td>
                          <td style={styles.td}>{p.cedula || "-"}</td>
                          <td style={styles.td}>{p.email || "-"}</td>
                          <td style={styles.td}>{p.codigo || "-"}</td>
                          <td style={styles.td}>
                            {formatearMoneda(p.credito || p.saldo || 0)}
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                style={styles.smallDarkButton}
                                onClick={() => {
                                  setProfesorDetalle(p);
                                  setVistaProfesorDetalle("ordenes");
                                }}
                                title="Ver"
                              >
                                👁
                              </button>

                              <button
                                type="button"
                                style={styles.editIconButton}
                                onClick={() => {
                                  setEditandoProfesorId(p.id);
                                  setMostrarFormularioProfesor(true);
                                  setProfesorForm({
                                    cedula: p.cedula || "",
                                    nombres: p.nombres || "",
                                    apellidos: p.apellidos || "",
                                    email: p.email || "",
                                    codigo: p.codigo || "",
                                    telefono: p.telefono || "",
                                    saldo: p.credito || p.saldo || "",
                                    es_profesor: p.es_profesor !== false,
                                  });
                                }}
                                title="Editar"
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                style={styles.moveIconButton}
                                onClick={() =>
                                  alert(
                                    `Notificación de saldo bajo para ${p.nombres || ""} ${p.apellidos || ""} aún no implementada.`
                                  )
                                }
                                title="Saldo bajo"
                              >
                                📨
                              </button>

                              <button
                                type="button"
                                style={
                                  activo
                                    ? styles.deleteIconButton
                                    : styles.disabledIconButton
                                }
                                onClick={() =>
                                  activo && desactivarProfesor(p)
                                }
                                disabled={!activo}
                                title="Eliminar"
                              >
                                🗑️
                              </button>

                              {!activo && (
                                <button
                                  type="button"
                                  style={styles.restoreIconButton}
                                  onClick={() => reactivarProfesor(p)}
                                  title="Restaurar"
                                >
                                  ↩️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

    {vistaProfesoresInterna === "profesores" && profesorDetalle && (() => {
      const ordenesProfesor = ventasEnriquecidas.filter(
        (venta) =>
          Number(venta.profesor_id) === Number(profesorDetalle.id)
      );
      const totalPagadasProfesor = ordenesProfesor
        .filter(
          (venta) =>
            String(venta.estado || "PAGADA").toUpperCase() !==
            "PENDIENTE"
        )
        .reduce(
          (acumulado, venta) =>
            acumulado + Number(venta.total || 0),
          0
        );
      const totalPendientesProfesor = ordenesProfesor
        .filter(
          (venta) =>
            String(venta.estado || "").toUpperCase() ===
            "PENDIENTE"
        )
        .reduce(
          (acumulado, venta) =>
            acumulado + Number(venta.total || 0),
          0
        );

      return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1e2bb8 0%, #3036c8 100%)",
            color: "#ffffff",
            padding: "22px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button
              type="button"
              onClick={() => setProfesorDetalle(null)}
              style={{
                border: "none",
                background: "transparent",
                color: "#ff9a45",
                fontSize: 34,
                fontWeight: 900,
                cursor: "pointer",
                lineHeight: 1,
              }}
              title="Regresar a profesores"
            >
              ‹
            </button>

            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: "50%",
                background: "#ffffff",
                color: "#2435bd",
                border: "3px solid #ff8a45",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              {(profesorDetalle.nombres || "P").charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
                {`${profesorDetalle.nombres || ""} ${profesorDetalle.apellidos || ""}`.trim() || "Profesor"}
              </h2>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: "#dbe7ff",
                    color: "#2435bd",
                    padding: "8px 18px",
                    borderRadius: 14,
                    fontWeight: 700,
                  }}
                >
                  Profesor
                </span>
                <span
                  style={{
                    background: profesorDetalle.activo !== false ? "#dcfce7" : "#fee2e2",
                    color: profesorDetalle.activo !== false ? "#166534" : "#991b1b",
                    padding: "8px 18px",
                    borderRadius: 14,
                    fontWeight: 700,
                  }}
                >
                  {profesorDetalle.activo !== false ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{ ...styles.outlineButton, background: "#ffffff", color: "#2435bd" }}
              onClick={async () => {
                setVistaProfesorDetalle("creditos");
                await cargarCreditosProfesores(profesorDetalle.id);
              }}
            >
              Historial de créditos
            </button>
            <button
              type="button"
              style={{ ...styles.outlineButton, background: "#ffffff", color: "#2435bd" }}
              onClick={() => {
                setEditandoProfesorId(profesorDetalle.id);
                setMostrarFormularioProfesor(true);
                setProfesorForm({
                  cedula: profesorDetalle.cedula || "",
                  nombres: profesorDetalle.nombres || "",
                  apellidos: profesorDetalle.apellidos || "",
                  email: profesorDetalle.email || "",
                  codigo: profesorDetalle.codigo || "",
                  telefono: profesorDetalle.telefono || "",
                  saldo: profesorDetalle.credito || profesorDetalle.saldo || "",
                  es_profesor: profesorDetalle.es_profesor !== false,
                });
                setProfesorDetalle(null);
              }}
            >
              Editar perfil
            </button>
            <button
              type="button"
              style={{
                border: "none",
                background: "#ff8548",
                color: "#ffffff",
                padding: "12px 22px",
                borderRadius: 10,
                fontWeight: 800,
                cursor: "pointer",
              }}
              onClick={() => {
                setVista("ventas");
                setVistaVentasInterna("registrar");
                setModoNuevaOrden("consumidor_final");
                setTipoUsuarioNuevaOrden("PROFESOR");
                setVentaItems([]);
                setVentaForm({
                  alumno_id: "",
                  profesor_id: String(profesorDetalle.id),
                  metodo_pago:
                    profesorDetalle.credito_habilitado === true &&
                    Number(profesorDetalle.saldo || 0) <= 0.0001
                      ? "CREDITO_PROFESOR"
                      : "EFECTIVO",
                  observacion: "",
                });
                setBusquedaUsuarioNuevaOrden(
                  `${profesorDetalle.nombres || ""} ${profesorDetalle.apellidos || ""}`.trim()
                );
                setBusquedaProductoNuevaOrden("");
                setCodigoBarraNuevaOrden("");
                setCategoriaNuevaOrden("TODOS");
              }}
            >
              Crear orden +
            </button>
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr) minmax(220px, 0.7fr)",
              gap: 22,
              alignItems: "stretch",
            }}
          >
            <div style={{ padding: 22, lineHeight: 2.05 }}>
              <div><strong>Teléfono:</strong> {profesorDetalle.telefono || "-"}</div>
              <div><strong>Email:</strong> {profesorDetalle.email || "-"}</div>
              <div><strong>Cédula:</strong> {profesorDetalle.cedula || "-"}</div>
              <div><strong>ID:</strong> {profesorDetalle.id || "-"}</div>
            </div>

            <div
              style={{
                padding: 24,
                borderRadius: 14,
                background: "#ffffff",
                boxShadow: "0 5px 18px rgba(15, 23, 42, 0.10)",
                lineHeight: 2.05,
              }}
            >
              <div><strong>Institución:</strong> {institucionActiva?.nombre || "-"}</div>
              <div><strong>Código:</strong> {profesorDetalle.codigo || "-"}</div>
              <div><strong>Es profesor:</strong> {profesorDetalle.es_profesor !== false ? "Sí" : "No"}</div>
              <div>
                <strong>Crédito:</strong>{" "}
                <span style={{ fontWeight: 900, color: profesorDetalle.credito_habilitado === true ? "#166534" : "#991b1b" }}>
                  {profesorDetalle.credito_habilitado === true ? "HABILITADO" : "INHABILITADO"}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: 22,
                borderRadius: 14,
                background: "#ffffff",
                boxShadow: "0 5px 18px rgba(15, 23, 42, 0.10)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  background: "#d9f7ea",
                  borderRadius: 12,
                  padding: 18,
                  fontWeight: 800,
                }}
              >
                <div style={{ fontSize: 17 }}>Crédito actual:</div>
                <div style={{ fontSize: 34, marginTop: 4 }}>
                  {formatearMoneda(profesorDetalle.credito || profesorDetalle.saldo || 0)}
                </div>
              </div>
              <button
                type="button"
                style={{ ...styles.button, width: "100%", marginTop: 18 }}
                onClick={abrirModalRecargaProfesor}
                disabled={guardandoRecargaProfesor}
              >
                Recargar saldo
              </button>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                ["ordenes", "Órdenes"],
                ["recargas", "Recargas"],
                ["dispositivos", "Dispositivos"],
                ["creditos", "Créditos"],
              ].map(([clave, texto]) => (
                <button
                  key={clave}
                  type="button"
                  onClick={async () => {
                    setVistaProfesorDetalle(clave);

                    if (
                      (clave === "creditos" ||
                        clave === "recargas") &&
                      profesorDetalle?.id
                    ) {
                      await cargarCreditosProfesores(
                        profesorDetalle.id
                      );
                    }
                  }}
                  style={{
                    border: "2px solid #ff8548",
                    background: vistaProfesorDetalle === clave ? "#ff8548" : "#ffffff",
                    color: vistaProfesorDetalle === clave ? "#ffffff" : "#ff5b24",
                    padding: "12px 28px",
                    borderRadius: "10px 10px 0 0",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {texto}
                </button>
              ))}
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0 14px 14px 14px",
                padding: 24,
                minHeight: 220,
                background: "#ffffff",
              }}
            >
              {vistaProfesorDetalle === "ordenes" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: 14 }}>
                      <div
                        style={{
                          padding: "16px 24px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                        }}
                      >
                        <div>Total pagadas</div>
                        <strong style={{ fontSize: 28 }}>
                          {formatearMoneda(totalPagadasProfesor)}
                        </strong>
                      </div>
                      <div
                        style={{
                          padding: "16px 24px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                        }}
                      >
                        <div>Total pendientes</div>
                        <strong
                          style={{ fontSize: 28, color: "#10b981" }}
                        >
                          {formatearMoneda(totalPendientesProfesor)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ ...styles.tableWrap, marginTop: 24 }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Orden</th>
                          <th style={styles.th}>Nombre</th>
                          <th style={styles.th}>Apellido</th>
                          <th style={styles.th}>Detalles</th>
                          <th style={styles.th}>Fecha</th>
                          <th style={styles.th}>Total</th>
                          <th style={styles.th}>Forma de pago</th>
                          <th style={styles.th}>Estado</th>
                          <th style={styles.th}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenesProfesor.length === 0 ? (
                          <tr>
                            <td style={styles.td} colSpan={9}>
                              No hay datos disponibles
                            </td>
                          </tr>
                        ) : (
                          ordenesProfesor.map((venta) => (
                            <tr key={venta.id}>
                              <td style={styles.td}>#{venta.id}</td>
                              <td style={styles.td}>
                                {profesorDetalle.nombres || "-"}
                              </td>
                              <td style={styles.td}>
                                {profesorDetalle.apellidos || "-"}
                              </td>
                              <td style={styles.td}>
                                {Array.isArray(venta.items)
                                  ? `${venta.items.length} producto(s)`
                                  : "Ver orden"}
                              </td>
                              <td style={styles.td}>
                                {venta.created_at
                                  ? new Date(
                                      venta.created_at
                                    ).toLocaleString()
                                  : "-"}
                              </td>
                              <td style={styles.td}>
                                {formatearMoneda(venta.total || 0)}
                              </td>
                              <td style={styles.td}>
                                {venta.metodo_visual ||
                                  venta.metodo_pago ||
                                  "-"}
                              </td>
                              <td style={styles.td}>
                                {venta.estado || "PAGADA"}
                              </td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={styles.smallDarkButton}
                                  onClick={() =>
                                    reimprimirVenta(venta)
                                  }
                                >
                                  Reimprimir
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {vistaProfesorDetalle === "recargas" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>Recargas del profesor</h3>
                      <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                        Saldo disponible: {" "}
                        <strong>
                          {formatearMoneda(
                            profesorDetalle.saldo || profesorDetalle.credito || 0
                          )}
                        </strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => cargarCreditosProfesores(profesorDetalle.id)}
                    >
                      Actualizar
                    </button>
                  </div>

                  <form
                    onSubmit={registrarRecargaProfesor}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 12,
                      marginBottom: 22,
                      padding: 16,
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <div>
                      <label style={styles.filterLabelTop}>Monto *</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={recargaProfesorForm.monto}
                        onChange={(e) =>
                          setRecargaProfesorForm((prev) => ({
                            ...prev,
                            monto: e.target.value,
                          }))
                        }
                        style={styles.input}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label style={styles.filterLabelTop}>Forma de pago</label>
                      <select
                        value={recargaProfesorForm.metodo_pago}
                        onChange={(e) =>
                          setRecargaProfesorForm((prev) => ({
                            ...prev,
                            metodo_pago: e.target.value,
                            numero_comprobante: "",
                            fecha_transferencia: "",
                          }))
                        }
                        style={styles.input}
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                      </select>
                    </div>

                    {recargaProfesorForm.metodo_pago === "TRANSFERENCIA" && (
                      <>
                        <div>
                          <label style={styles.filterLabelTop}>
                            Fecha de transferencia *
                          </label>
                          <input
                            type="date"
                            value={recargaProfesorForm.fecha_transferencia}
                            onChange={(e) =>
                              setRecargaProfesorForm((prev) => ({
                                ...prev,
                                fecha_transferencia: e.target.value,
                              }))
                            }
                            style={styles.input}
                            required
                          />
                        </div>

                        <div>
                          <label style={styles.filterLabelTop}>No. comprobante *</label>
                          <input
                            type="text"
                            value={recargaProfesorForm.numero_comprobante}
                            onChange={(e) =>
                              setRecargaProfesorForm((prev) => ({
                                ...prev,
                                numero_comprobante: e.target.value,
                              }))
                            }
                            style={styles.input}
                            placeholder="Número de comprobante"
                            maxLength={100}
                            required
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label style={styles.filterLabelTop}>Observación</label>
                      <input
                        type="text"
                        value={recargaProfesorForm.observacion}
                        onChange={(e) =>
                          setRecargaProfesorForm((prev) => ({
                            ...prev,
                            observacion: e.target.value,
                          }))
                        }
                        style={styles.input}
                        placeholder="Opcional"
                        maxLength={500}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "end" }}>
                      <button
                        type="submit"
                        style={styles.button}
                        disabled={guardandoRecargaProfesor}
                      >
                        {guardandoRecargaProfesor
                          ? "Registrando..."
                          : recargaProfesorForm.metodo_pago === "EFECTIVO"
                          ? "Recargar efectivo"
                          : "Registrar transferencia"}
                      </button>
                    </div>
                  </form>

                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Fecha</th>
                          <th style={styles.th}>Monto</th>
                          <th style={styles.th}>Forma</th>
                          <th style={styles.th}>Banco</th>
                          <th style={styles.th}>Comprobante</th>
                          <th style={styles.th}>Usuario</th>
                          <th style={styles.th}>Saldo nuevo</th>
                          <th style={styles.th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditosProfesoresFiltrados.filter(
                          (movimiento) =>
                            Number(movimiento.profesor_id) ===
                              Number(profesorDetalle.id) &&
                            movimiento.tipo === "RECARGA"
                        ).length === 0 ? (
                          <tr>
                            <td style={styles.td} colSpan={8}>
                              No hay recargas registradas.
                            </td>
                          </tr>
                        ) : (
                          creditosProfesoresFiltrados
                            .filter(
                              (movimiento) =>
                                Number(movimiento.profesor_id) ===
                                  Number(profesorDetalle.id) &&
                                movimiento.tipo === "RECARGA"
                            )
                            .map((movimiento) => (
                              <tr key={movimiento.id}>
                                <td style={styles.td}>
                                  {movimiento.created_at
                                    ? new Date(movimiento.created_at).toLocaleString(
                                        "es-EC",
                                        { timeZone: "America/Guayaquil" }
                                      )
                                    : "-"}
                                </td>
                                <td style={styles.td}>
                                  {formatearMoneda(movimiento.monto || 0)}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.metodo_pago || "EFECTIVO"}
                                </td>
                                <td style={styles.td}>{movimiento.banco || "-"}</td>
                                <td style={styles.td}>
                                  {movimiento.numero_comprobante || "-"}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.usuario_nombre ||
                                    movimiento.usuario_correo ||
                                    "Sistema"}
                                </td>
                                <td style={styles.td}>
                                  {formatearMoneda(movimiento.saldo_nuevo || 0)}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.estado || "ACTIVO"}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {vistaProfesorDetalle === "dispositivos" && (
                <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
                  No hay dispositivos registrados para este profesor.
                </div>
              )}

              {vistaProfesorDetalle === "creditos" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>
                        Historial de créditos,{" "}
                        {`${profesorDetalle.nombres || ""} ${
                          profesorDetalle.apellidos || ""
                        }`.trim()}
                      </h3>

                      <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                        Saldo a favor:{" "}
                        <strong>
                          {formatearMoneda(
                            profesorDetalle.saldo ??
                              profesorDetalle.credito ??
                              0
                          )}
                        </strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() =>
                        cargarCreditosProfesores(profesorDetalle.id)
                      }
                    >
                      Actualizar
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: 14,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        minHeight: 130,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(15,23,42,.06)",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#0f172a",
                            marginBottom: 10,
                          }}
                        >
                          Saldo a favor
                        </div>
                        <strong
                          style={{
                            fontSize: 38,
                            lineHeight: 1,
                            color: "#0f766e",
                          }}
                        >
                          {formatearMoneda(
                            profesorDetalle.saldo ??
                              profesorDetalle.credito ??
                              0
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        minHeight: 130,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(15,23,42,.06)",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#0f172a",
                            marginBottom: 10,
                          }}
                        >
                          Límite de crédito
                        </div>
                        <strong
                          style={{
                            fontSize: 38,
                            lineHeight: 1,
                            color: "#003b66",
                          }}
                        >
                          {formatearMoneda(
                            profesorDetalle.limite_credito || 0
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        minHeight: 130,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(15,23,42,.06)",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#0f172a",
                            marginBottom: 10,
                          }}
                        >
                          Crédito utilizado
                        </div>
                        <strong
                          style={{
                            fontSize: 38,
                            lineHeight: 1,
                            color: "#28c58b",
                          }}
                        >
                          {formatearMoneda(
                            profesorDetalle.credito_utilizado || 0
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        minHeight: 130,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(15,23,42,.06)",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#0f172a",
                            marginBottom: 10,
                          }}
                        >
                          Crédito disponible
                        </div>
                        <strong
                          style={{
                            fontSize: 38,
                            lineHeight: 1,
                            color: "#003b66",
                          }}
                        >
                          {formatearMoneda(
                            Math.max(
                              0,
                              Number(profesorDetalle.limite_credito || 0) -
                                Number(profesorDetalle.credito_utilizado || 0)
                            )
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {["ADMIN", "SUPER_ADMIN"].includes(rolActual) && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(180px,.7fr) minmax(180px,.8fr) minmax(280px,1fr) minmax(260px,1fr)",
                        gap: 12,
                        padding: 16,
                        marginBottom: 18,
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        background: "#f8fafc",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>Habilitar crédito</strong>
                        <div
                          style={{
                            marginTop: 5,
                            fontWeight: 800,
                            color:
                              profesorDetalle.credito_habilitado === true
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {profesorDetalle.credito_habilitado === true
                            ? "HABILITADO"
                            : "INHABILITADO"}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#64748b",
                            lineHeight: 1.35,
                          }}
                        >
                          {profesorDetalle.credito_habilitado === true
                            ? "Ahora puedes definir o modificar el límite. Para guardar o deshabilitar vuelve a ingresar la contraseña del administrador."
                            : "Primero valida la contraseña del administrador. El límite se configura después de habilitar."}
                        </div>
                      </div>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={
                          profesorDetalle.credito_habilitado === true
                            ? "Ingresa el límite de crédito"
                            : "Se habilita después de validar la contraseña"
                        }
                        value={creditoProfesorLimite}
                        onChange={(e) =>
                          setCreditoProfesorLimite(e.target.value)
                        }
                        style={styles.input}
                        disabled={
                          profesorDetalle.credito_habilitado !== true
                        }
                      />

                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type={
                            verCreditoProfesorAdminPassword
                              ? "text"
                              : "password"
                          }
                          placeholder="Contraseña del administrador"
                          value={creditoProfesorAdminPassword}
                          onChange={(e) =>
                            setCreditoProfesorAdminPassword(
                              e.target.value
                            )
                          }
                          style={{
                            ...styles.input,
                            flex: 1,
                          }}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          style={styles.outlineButton}
                          onClick={() =>
                            setVerCreditoProfesorAdminPassword(
                              (actual) => !actual
                            )
                          }
                        >
                          {verCreditoProfesorAdminPassword
                            ? "Ocultar"
                            : "Ver"}
                        </button>
                      </div>

                      {profesorDetalle.credito_habilitado !== true ? (
                        <button
                          type="button"
                          style={styles.button}
                          disabled={
                            guardandoAutorizacionCreditoProfesor
                          }
                          onClick={() =>
                            actualizarCreditoProfesor("HABILITAR")
                          }
                        >
                          {guardandoAutorizacionCreditoProfesor
                            ? "Validando..."
                            : "Autorizar y habilitar crédito"}
                        </button>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            style={styles.button}
                            disabled={
                              guardandoAutorizacionCreditoProfesor
                            }
                            onClick={() =>
                              actualizarCreditoProfesor(
                                "GUARDAR_LIMITE"
                              )
                            }
                          >
                            {guardandoAutorizacionCreditoProfesor
                              ? "Validando..."
                              : "Guardar límite"}
                          </button>

                          <button
                            type="button"
                            style={{
                              ...styles.outlineButton,
                              borderColor: "#dc2626",
                              color: "#dc2626",
                            }}
                            disabled={
                              guardandoAutorizacionCreditoProfesor
                            }
                            onClick={() =>
                              actualizarCreditoProfesor(
                                "DESHABILITAR"
                              )
                            }
                          >
                            Deshabilitar crédito
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <form
                    onSubmit={registrarCreditoProfesor}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                      marginBottom: 22,
                      padding: 16,
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <select
                      value={creditoProfesorForm.tipo}
                      onChange={(e) =>
                        setCreditoProfesorForm({
                          ...creditoProfesorForm,
                          tipo: e.target.value,
                        })
                      }
                      style={styles.input}
                    >
                      <option value="AJUSTE_POSITIVO">
                        Ajuste positivo
                      </option>
                      <option value="CONSUMO">
                        Registrar consumo
                      </option>
                      <option value="AJUSTE_POSITIVO">
                        Ajuste positivo
                      </option>
                      <option value="AJUSTE_NEGATIVO">
                        Ajuste negativo
                      </option>
                    </select>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Monto"
                      value={creditoProfesorForm.monto}
                      onChange={(e) =>
                        setCreditoProfesorForm({
                          ...creditoProfesorForm,
                          monto: e.target.value,
                        })
                      }
                      style={styles.input}
                      required
                    />

                    <input
                      type="text"
                      placeholder="Comercio"
                      value={creditoProfesorForm.comercio}
                      onChange={(e) =>
                        setCreditoProfesorForm({
                          ...creditoProfesorForm,
                          comercio: e.target.value,
                        })
                      }
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Observación"
                      value={creditoProfesorForm.observacion}
                      onChange={(e) =>
                        setCreditoProfesorForm({
                          ...creditoProfesorForm,
                          observacion: e.target.value,
                        })
                      }
                      style={styles.input}
                    />

                    <button
                      type="submit"
                      style={styles.button}
                    >
                      Guardar movimiento
                    </button>
                  </form>

                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Comercio</th>
                          <th style={styles.th}>
                            Usuario que hizo el pago
                          </th>
                          <th style={styles.th}>Tipo</th>
                          <th style={styles.th}>Monto</th>
                          <th style={styles.th}>Saldo nuevo</th>
                          <th style={styles.th}>Fecha</th>
                          <th style={styles.th}>Estado</th>
                          <th style={styles.th}>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {cargandoCreditosProfesores ? (
                          <tr>
                            <td style={styles.td} colSpan={8}>
                              Cargando historial...
                            </td>
                          </tr>
                        ) : creditosProfesoresFiltrados.filter(
                            (movimiento) =>
                              Number(movimiento.profesor_id) ===
                              Number(profesorDetalle.id)
                          ).length === 0 ? (
                          <tr>
                            <td style={styles.td} colSpan={8}>
                              No hay datos disponibles
                            </td>
                          </tr>
                        ) : (
                          creditosProfesoresFiltrados
                            .filter(
                              (movimiento) =>
                                Number(movimiento.profesor_id) ===
                                Number(profesorDetalle.id)
                            )
                            .map((movimiento) => (
                              <tr key={movimiento.id}>
                                <td style={styles.td}>
                                  {movimiento.comercio || "POS NUBE"}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.usuario_nombre ||
                                    movimiento.usuario_correo ||
                                    "Sistema"}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.tipo || "-"}
                                </td>
                                <td style={styles.td}>
                                  {formatearMoneda(
                                    movimiento.monto || 0
                                  )}
                                </td>
                                <td style={styles.td}>
                                  {formatearMoneda(
                                    movimiento.saldo_nuevo || 0
                                  )}
                                </td>
                                <td style={styles.td}>
                                  {formatearFechaHora(
                                    movimiento.created_at
                                  )}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.estado || "ACTIVO"}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.estado !== "ANULADO" ? (
                                    <button
                                      type="button"
                                      style={styles.smallDangerButton}
                                      onClick={() =>
                                        anularCreditoProfesor(
                                          movimiento
                                        )
                                      }
                                    >
                                      Anular
                                    </button>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      );
    })()}

    {vistaProfesoresInterna === "creditos" && (
      <div style={styles.box}>
        <div style={styles.pageHeaderSmall}>
          <h3 style={{ margin: 0 }}>
            Historial de créditos de profesores
          </h3>

          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.outlineButton}
              onClick={() =>
                setVistaProfesoresInterna("profesores")
              }
            >
              Volver a Profesores
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={exportarCreditosProfesores}
            >
              Exportar
            </button>
          </div>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Fecha inicial</label>
            <input
              type="date"
              value={creditosProfesoresFiltros.fecha_inicio}
              onChange={(e) =>
                setCreditosProfesoresFiltros({
                  ...creditosProfesoresFiltros,
                  fecha_inicio: e.target.value,
                })
              }
              style={styles.input}
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Fecha final</label>
            <input
              type="date"
              value={creditosProfesoresFiltros.fecha_fin}
              onChange={(e) =>
                setCreditosProfesoresFiltros({
                  ...creditosProfesoresFiltros,
                  fecha_fin: e.target.value,
                })
              }
              style={styles.input}
            />
          </div>

          <div style={styles.filterFieldWide}>
            <label style={styles.label}>Buscar</label>
            <input
              type="text"
              placeholder="Profesor, comercio, usuario o tipo"
              value={creditosProfesoresFiltros.texto}
              onChange={(e) =>
                setCreditosProfesoresFiltros({
                  ...creditosProfesoresFiltros,
                  texto: e.target.value,
                })
              }
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button
            type="button"
            style={styles.button}
            onClick={() => cargarCreditosProfesores()}
          >
            Filtrar
          </button>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              setCreditosProfesoresFiltros({
                fecha_inicio: "",
                fecha_fin: "",
                texto: "",
              });
              window.setTimeout(
                () => cargarCreditosProfesores(),
                0
              );
            }}
          >
            Borrar filtros
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Profesor</th>
                  <th style={styles.th}>Comercio</th>
                  <th style={styles.th}>
                    Usuario que hizo el pago
                  </th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Monto</th>
                  <th style={styles.th}>Saldo nuevo</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargandoCreditosProfesores ? (
                  <tr>
                    <td style={styles.td} colSpan={9}>
                      Cargando historial...
                    </td>
                  </tr>
                ) : creditosProfesoresFiltrados.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={9}>
                      No hay datos disponibles
                    </td>
                  </tr>
                ) : (
                  creditosProfesoresFiltrados.map(
                    (movimiento) => (
                      <tr key={movimiento.id}>
                        <td style={styles.td}>
                          {`${movimiento.nombres || ""} ${
                            movimiento.apellidos || ""
                          }`.trim()}
                        </td>
                        <td style={styles.td}>
                          {movimiento.comercio || "POS NUBE"}
                        </td>
                        <td style={styles.td}>
                          {movimiento.usuario_nombre ||
                            movimiento.usuario_correo ||
                            "Sistema"}
                        </td>
                        <td style={styles.td}>
                          {movimiento.tipo || "-"}
                        </td>
                        <td style={styles.td}>
                          {formatearMoneda(
                            movimiento.monto || 0
                          )}
                        </td>
                        <td style={styles.td}>
                          {formatearMoneda(
                            movimiento.saldo_nuevo || 0
                          )}
                        </td>
                        <td style={styles.td}>
                          {formatearFechaHora(
                            movimiento.created_at
                          )}
                        </td>
                        <td style={styles.td}>
                          {movimiento.estado || "ACTIVO"}
                        </td>
                        <td style={styles.td}>
                          {movimiento.estado !== "ANULADO" ? (
                            <button
                              type="button"
                              style={styles.smallDangerButton}
                              onClick={() =>
                                anularCreditoProfesor(movimiento)
                              }
                            >
                              Anular
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </>
)}
      {vista === "inventario" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Stock</h1>
        <p style={{margin:"6px 0 0",color:"#64748b"}}>
          Control de ingresos y egresos de inventario por ubicación.
        </p>
      </div>

      <div style={styles.headerActions}>
        <button
          type="button"
          style={styles.refreshButton}
          onClick={() => cargarExistenciasInventario()}
        >
          Refrescar stock
        </button>

        {puede("inventario.gestionar")&&(
          <button
            type="button"
            style={styles.button}
            onClick={()=>{
              setNuevoProductoStockForm((p)=>({
                ...p,
                ubicacion_inicial:
                  p.ubicacion_inicial ||
                  jornadaActiva?.punto_nombre ||
                  puntosOperacion[0]?.nombre ||
                  "PRINCIPAL",
              }));
              setMostrarNuevoProductoStock(true);
            }}
          >
            + Nuevo producto
          </button>
        )}

        {["SUPER_ADMIN","ADMIN"].includes(rolActual)&&(
          <button
            type="button"
            style={styles.outlineButton}
            onClick={()=>setMostrarPuntosStock((v)=>!v)}
          >
            Puntos / ubicaciones
          </button>
        )}

        <button
          type="button"
          style={styles.outlineButton}
          onClick={exportarStockExcel}
        >
          Exportar existencias
        </button>

        <button
          type="button"
          style={styles.outlineButton}
          onClick={abrirReporteStock}
        >
          Reporte movimientos
        </button>

        {puede("inventario.gestionar")&&(
          <button
            type="button"
            style={styles.button}
            onClick={()=>inputImportarStockRef.current?.click()}
          >
            Importar productos
          </button>
        )}

        <input
          ref={inputImportarStockRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          onChange={importarStockArchivo}
          style={{display:"none"}}
        />
      </div>
    </div>

    {mostrarReporteStock&&(
      <div style={{...styles.box,marginBottom:20,border:"1px solid #cbd5e1"}}>
        <div style={styles.pageHeaderSmall}>
          <div>
            <h2 style={{margin:0}}>Reporte de movimientos de stock</h2>
            <p style={{color:"#64748b",margin:"6px 0 0"}}>
              Consulta cuándo se cargó o movió inventario, por fecha, producto, familia y ubicación.
            </p>
          </div>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={()=>setMostrarReporteStock(false)}
          >
            Cerrar reporte
          </button>
        </div>

        <div style={{...styles.filtersGrid,marginTop:18}}>
          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Fecha inicial</label>
            <input
              type="date"
              style={styles.input}
              value={reporteStockFiltros.fecha_inicio}
              onChange={(e)=>setReporteStockFiltros((p)=>({
                ...p,
                fecha_inicio:e.target.value,
              }))}
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Fecha final</label>
            <input
              type="date"
              style={styles.input}
              value={reporteStockFiltros.fecha_fin}
              onChange={(e)=>setReporteStockFiltros((p)=>({
                ...p,
                fecha_fin:e.target.value,
              }))}
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Producto</label>
            <select
              style={styles.input}
              value={reporteStockFiltros.producto_id}
              onChange={(e)=>setReporteStockFiltros((p)=>({
                ...p,
                producto_id:e.target.value,
              }))}
            >
              <option value="">Todos los productos</option>

              {productos
                .filter((p)=>p?.activo!==false)
                .slice()
                .sort((a,b)=>
                  String(a.nombre||"").localeCompare(String(b.nombre||""))
                )
                .map((p)=>(
                  <option key={p.id} value={p.id}>
                    {p.nombre}{p.codigo?` · ${p.codigo}`:""}
                  </option>
                ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Familia</label>
            <select
              style={styles.input}
              value={reporteStockFiltros.familia}
              onChange={(e)=>setReporteStockFiltros((p)=>({
                ...p,
                familia:e.target.value,
              }))}
            >
              <option value="">Todas las familias</option>

              {familiasOperacionStock.map((familia)=>(
                <option key={familia} value={familia}>
                  {familia}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Tipo de movimiento</label>
            <select
              style={styles.input}
              value={reporteStockFiltros.tipo}
              onChange={(e)=>setReporteStockFiltros((p)=>({
                ...p,
                tipo:e.target.value,
              }))}
            >
              <option value="TODOS">Todos</option>
              <option value="CARGA">Carga / ingreso</option>
              <option value="TRANSFERENCIA_ENTRADA">Transferencia entrada</option>
              <option value="TRANSFERENCIA_SALIDA">Transferencia salida</option>
              <option value="BAJA">Baja</option>
              <option value="CORTESIA">Cortesía</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Ubicación</label>
            <select
              style={styles.input}
              value={reporteStockFiltros.ubicacion}
              onChange={(e)=>setReporteStockFiltros((p)=>({
                ...p,
                ubicacion:e.target.value,
              }))}
            >
              <option value="">Todas las ubicaciones</option>

              {[...new Set([
                ...(puntosOperacion||[]).map((p)=>p?.nombre),
                ...(puntosInventario||[]),
              ].filter(Boolean))].map((ubicacion)=>(
                <option key={ubicacion} value={ubicacion}>
                  {ubicacion}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{...styles.filterButtons,marginTop:16}}>
          <button
            type="button"
            style={styles.button}
            onClick={()=>cargarReporteStock()}
            disabled={cargandoReporteStock}
          >
            {cargandoReporteStock?"Consultando...":"Consultar"}
          </button>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={limpiarReporteStock}
            disabled={cargandoReporteStock}
          >
            Borrar filtros
          </button>

          <button
            type="button"
            style={styles.exportButton}
            onClick={exportarReporteStockExcel}
            disabled={!reporteStock.length}
          >
            Exportar Excel
          </button>

          <button
            type="button"
            style={styles.exportButton}
            onClick={exportarReporteStockPdf}
            disabled={!reporteStock.length}
          >
            Exportar PDF
          </button>

          <span style={{
            alignSelf:"center",
            fontWeight:700,
            color:"#475569",
          }}>
            {reporteStock.length} movimientos
          </span>
        </div>

        {cargandoReporteStock?(
          <p style={{marginTop:18}}>
            Cargando movimientos...
          </p>
        ):reporteStock.length===0?(
          <p style={{marginTop:18}}>
            No hay movimientos para los filtros seleccionados.
          </p>
        ):(
          <div style={{...styles.tableWrap,marginTop:18}}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha y hora</th>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Familia</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Cantidad</th>
                  <th style={styles.th}>Stock anterior</th>
                  <th style={styles.th}>Stock nuevo</th>
                  <th style={styles.th}>Ubicación</th>
                  <th style={styles.th}>Proveedor</th>
                  <th style={styles.th}>Factura</th>
                  <th style={styles.th}>Usuario</th>
                  <th style={styles.th}>Observación</th>
                </tr>
              </thead>

              <tbody>
                {reporteStock.map((mov)=>(
                  <tr key={mov.id}>
                    <td style={styles.td}>
                      {formatearFechaHora(mov.fecha)}
                    </td>

                    <td style={styles.td}>
                      <strong>
                        {mov.producto_nombre||"Producto"}
                      </strong>

                      {mov.producto_codigo?(
                        <div style={{
                          fontSize:12,
                          color:"#64748b",
                        }}>
                          {mov.producto_codigo}
                        </div>
                      ):null}
                    </td>

                    <td style={styles.td}>
                      {mov.familia||"Sin familia"}
                    </td>

                    <td style={styles.td}>
                      {mov.tipo_visual||mov.tipo||"-"}
                    </td>

                    <td style={styles.td}>
                      {Number(mov.cantidad||0)}
                    </td>

                    <td style={styles.td}>
                      {mov.stock_anterior==null
                        ? "-"
                        : Number(mov.stock_anterior)}
                    </td>

                    <td style={styles.td}>
                      {mov.stock_nuevo==null
                        ? "-"
                        : Number(mov.stock_nuevo)}
                    </td>

                    <td style={styles.td}>
                      {mov.ubicacion||"PRINCIPAL"}
                    </td>

                    <td style={styles.td}>
                      {mov.proveedor_nombre||"-"}
                    </td>

                    <td style={styles.td}>
                      {mov.numero_factura||"-"}
                    </td>

                    <td style={styles.td}>
                      {mov.usuario_nombre||"Sistema"}
                    </td>

                    <td style={styles.td}>
                      {mov.motivo||"-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

    <div style={{
      ...styles.box,
      marginBottom:20,
      border:"1px solid #bfdbfe",
      background:"#eff6ff"
    }}>
      <div style={{
        display:"flex",
        justifyContent:"space-between",
        gap:16,
        flexWrap:"wrap",
        alignItems:"center"
      }}>
        <div>
          <strong style={{fontSize:18}}>
            {["ADMIN","SUPER_ADMIN"].includes(rolActual)
              ? "Administración: jornada no requerida"
              : `Punto de trabajo: ${jornadaActiva?.punto_nombre||"SIN JORNADA"}`}
          </strong>
          <div style={{color:"#64748b",marginTop:6}}>
            Operador:{" "}
            {jornadaActiva?.usuario_nombre||
              jornadaActiva?.usuario_correo||
              usuario?.nombre||
              usuario?.correo||
              "-"}{" "}
            · Jornada #{jornadaActiva?.id||"-"}
          </div>
        </div>

        {jornadaActiva?.id&&(
          <button
            type="button"
            style={styles.outlineButton}
            onClick={cerrarJornadaOperativa}
          >
            Cerrar jornada
          </button>
        )}
      </div>
    </div>

    {mostrarPuntosStock&&(
      <div style={{...styles.box,marginBottom:20}}>
        <div style={styles.pageHeaderSmall}>
          <div>
            <h2 style={{margin:0}}>Puntos / ubicaciones</h2>
            <p style={{color:"#64748b",margin:"6px 0 0"}}>
              Crea o edita BAR PRINCIPAL, KIOSKO y demás ubicaciones.
            </p>
          </div>
          <button
            type="button"
            style={styles.outlineButton}
            onClick={()=>setMostrarPuntosStock(false)}
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={crearPuntoOperacion}
          style={{...styles.filtersGrid,marginTop:18}}
        >
          <div style={styles.filterField}>
            <label style={styles.label}>Nombre *</label>
            <input
              style={styles.input}
              value={nuevoPuntoForm.nombre}
              onChange={(e)=>setNuevoPuntoForm((p)=>({...p,nombre:e.target.value}))}
              placeholder="Ej. KIOSKO"
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Código</label>
            <input
              style={styles.input}
              value={nuevoPuntoForm.codigo}
              onChange={(e)=>setNuevoPuntoForm((p)=>({...p,codigo:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Descripción</label>
            <input
              style={styles.input}
              value={nuevoPuntoForm.descripcion}
              onChange={(e)=>setNuevoPuntoForm((p)=>({...p,descripcion:e.target.value}))}
            />
          </div>
          <div style={{display:"flex",alignItems:"end"}}>
            <button type="submit" style={styles.button}>Crear ubicación</button>
          </div>
        </form>

        <div style={{display:"grid",gap:10,marginTop:18}}>
          {puntosOperacion.map((punto)=>(
            <div
              key={punto.id}
              style={{
                display:"flex",
                justifyContent:"space-between",
                gap:12,
                alignItems:"center",
                padding:12,
                border:"1px solid #e2e8f0",
                borderRadius:10
              }}
            >
              <div>
                <strong>{punto.nombre}</strong>
                <div style={{color:"#64748b",fontSize:14}}>
                  {punto.codigo||"-"} · {punto.descripcion||"Sin descripción"}
                </div>
              </div>
              <button
                type="button"
                style={styles.outlineButton}
                onClick={()=>comenzarEdicionPunto(punto)}
              >
                Editar
              </button>
            </div>
          ))}
        </div>

        {editarPuntoStock&&(
          <form
            onSubmit={guardarEdicionPunto}
            style={{
              ...styles.filtersGrid,
              marginTop:20,
              paddingTop:18,
              borderTop:"1px solid #e2e8f0"
            }}
          >
            <div style={styles.filterField}>
              <label style={styles.label}>Nombre *</label>
              <input
                style={styles.input}
                value={editarPuntoStock.nombre}
                onChange={(e)=>setEditarPuntoStock((p)=>({...p,nombre:e.target.value}))}
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Código</label>
              <input
                style={styles.input}
                value={editarPuntoStock.codigo}
                onChange={(e)=>setEditarPuntoStock((p)=>({...p,codigo:e.target.value}))}
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Descripción</label>
              <input
                style={styles.input}
                value={editarPuntoStock.descripcion}
                onChange={(e)=>setEditarPuntoStock((p)=>({...p,descripcion:e.target.value}))}
              />
            </div>
            <div style={{display:"flex",gap:10,alignItems:"end"}}>
              <button type="submit" style={styles.button}>Guardar cambios</button>
              <button
                type="button"
                style={styles.outlineButton}
                onClick={()=>setEditarPuntoStock(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    )}

    {mostrarNuevoProductoStock&&(
      <div style={{...styles.box,marginBottom:20}}>
        <div style={styles.pageHeaderSmall}>
          <div>
            <h2 style={{margin:0}}>Nuevo producto</h2>
            <p style={{color:"#64748b",margin:"6px 0 0"}}>
              Crea el producto dentro de Stock. Después podrás ingresarlo por compra,
              producción u otro ingreso.
            </p>
          </div>
          <button
            type="button"
            style={styles.outlineButton}
            onClick={()=>setMostrarNuevoProductoStock(false)}
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={crearProductoDesdeStock}
          style={{...styles.filtersGrid,marginTop:18}}
        >
          <div style={styles.filterField}>
            <label style={styles.label}>Nombre *</label>
            <input
              style={styles.input}
              value={nuevoProductoStockForm.nombre}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,nombre:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Código</label>
            <input
              style={styles.input}
              value={nuevoProductoStockForm.codigo}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,codigo:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Precio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              style={styles.input}
              value={nuevoProductoStockForm.precio}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,precio:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Familia / categoría</label>
            <input
              style={styles.input}
              value={nuevoProductoStockForm.categoria}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,categoria:e.target.value}))}
              placeholder="Bebidas, Brunch, Golosinas, Helados..."
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Stock mínimo</label>
            <input
              type="number"
              min="0"
              step="1"
              style={styles.input}
              value={nuevoProductoStockForm.stock_minimo}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,stock_minimo:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Ubicación inicial</label>
            <select
              style={styles.input}
              value={
                nuevoProductoStockForm.ubicacion_inicial||
                jornadaActiva?.punto_nombre||
                ""
              }
              onChange={(e)=>setNuevoProductoStockForm((p)=>({
                ...p,
                ubicacion_inicial:e.target.value
              }))}
            >
              {puntosOperacion.filter((p)=>p.activo!==false).map((p)=>(
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Cantidad inicial</label>
            <input
              type="number"
              min="0"
              step="1"
              style={styles.input}
              value={nuevoProductoStockForm.cantidad_inicial}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,cantidad_inicial:e.target.value}))}
            />
          </div>
          <div style={{...styles.filterField,gridColumn:"1 / -1"}}>
            <label style={styles.label}>Observación inicial</label>
            <input
              style={styles.input}
              value={nuevoProductoStockForm.observacion_inicial}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,observacion_inicial:e.target.value}))}
            />
          </div>
          <button type="submit" style={styles.button}>Crear producto</button>
        </form>
      </div>
    )}

    <div style={{...styles.box,marginBottom:20}}>
      <div style={styles.pageHeaderSmall}>
        <div>
          <h2 style={{margin:0}}>Movimiento de Stock</h2>
          <p style={{color:"#64748b",margin:"6px 0 0"}}>
            Selecciona primero si registrarás un ingreso o un egreso.
          </p>
        </div>
      </div>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",
        gap:16,
        marginTop:18
      }}>
        <button
          type="button"
          style={{
            ...styles.button,
            minHeight:82,
            fontSize:20,
            opacity:stockSeccion==="INGRESOS"?1:.82
          }}
          onClick={()=>cambiarSeccionStock("INGRESOS")}
        >
          INGRESOS
        </button>

        <button
          type="button"
          style={{
            ...styles.outlineButton,
            minHeight:82,
            fontSize:20,
            border:stockSeccion==="EGRESOS"
              ?"2px solid #dc2626"
              :"1px solid #cbd5e1",
            color:"#b91c1c"
          }}
          onClick={()=>cambiarSeccionStock("EGRESOS")}
        >
          EGRESOS
        </button>
      </div>
    </div>

    {stockSeccion==="INGRESOS"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Tipo de ingreso</h2>

        <div style={styles.filterField}>
          <label style={styles.label}>Seleccionar *</label>
          <select
            style={styles.input}
            value={stockTipoIngreso}
            onChange={(e)=>cambiarTipoIngresoStock(e.target.value)}
          >
            <option value="">Seleccionar tipo de ingreso</option>
            <option value="COMPRA">1. Compras</option>
            <option value="PRODUCCION_COCINA">2. Producción cocina</option>
            <option value="TRANSFERENCIA_UBICACIONES">3. Transferencia entre ubicaciones</option>
            <option value="TRANSFERENCIA_LOCALES">4. Transferencia entre locales</option>
            <option value="OTROS">5. Otros</option>
          </select>
        </div>
      </div>
    )}

    {stockSeccion==="EGRESOS"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Tipo de egreso</h2>
        <p style={{color:"#64748b"}}>
          Estos movimientos son salidas administrativas de inventario.
          <strong> No son ventas.</strong>
        </p>

        <div style={styles.filterField}>
          <label style={styles.label}>Seleccionar *</label>
          <select
            style={styles.input}
            value={stockTipoEgreso}
            onChange={(e)=>cambiarTipoEgresoStock(e.target.value)}
          >
            <option value="">Seleccionar tipo de egreso</option>
            <option value="BAJA">Bajas</option>
            <option value="CORTESIA">Cortesía</option>
          </select>
        </div>
      </div>
    )}

    {stockSeccion==="INGRESOS"&&stockTipoIngreso==="COMPRA"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Compra a proveedor</h2>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Número de factura *</label>
            <input
              style={styles.input}
              value={stockCompraForm.numero_factura}
              onChange={(e)=>setStockCompraForm((p)=>({...p,numero_factura:e.target.value}))}
              placeholder="Ej. 001-001-000123456"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Proveedor *</label>
            <select
              style={styles.input}
              value={stockCompraForm.proveedor_id}
              onChange={(e)=>setStockCompraForm((p)=>({
                ...p,
                proveedor_id:e.target.value,
                proveedor_nuevo:""
              }))}
            >
              <option value="">Seleccionar proveedor</option>
              {proveedoresStock.map((prov)=>(
                <option key={prov.id} value={prov.id}>
                  {prov.nombre}{prov.ruc?` - ${prov.ruc}`:""}
                </option>
              ))}
            </select>

            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              <button
                type="button"
                style={styles.outlineButton}
                onClick={()=>document.getElementById("importar-proveedores-stock")?.click()}
                disabled={importandoProveedoresStock}
              >
                {importandoProveedoresStock?"Importando...":"Importar Excel proveedores"}
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={descargarPlantillaProveedoresStock}
              >
                Descargar plantilla
              </button>

              <input
                id="importar-proveedores-stock"
                type="file"
                accept=".xlsx,.xls"
                onChange={importarProveedoresStockExcel}
                style={{display:"none"}}
              />
            </div>

            <div style={{fontSize:12,color:"#64748b",marginTop:6}}>
              Excel: NOMBRE | RUC_CEDULA
            </div>
          </div>

          <div style={{...styles.filterField,gridColumn:"1 / -1"}}>
            <label style={styles.label}>Observación</label>
            <input
              style={styles.input}
              value={stockCompraForm.observacion}
              onChange={(e)=>setStockCompraForm((p)=>({...p,observacion:e.target.value}))}
              placeholder="Observación opcional de la compra"
            />
          </div>
        </div>
      </div>
    )}

    {stockSeccion==="INGRESOS"&&stockTipoIngreso==="TRANSFERENCIA_UBICACIONES"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Transferencia entre ubicaciones</h2>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Origen</label>
            <input
              style={styles.input}
              value={jornadaActiva?.punto_nombre||"PRINCIPAL"}
              readOnly
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Ubicación destino *</label>
            <select
              style={styles.input}
              value={stockOperacionForm.ubicacion_destino}
              onChange={(e)=>setStockOperacionForm((p)=>({
                ...p,
                ubicacion_destino:e.target.value
              }))}
            >
              <option value="">Seleccionar ubicación</option>
              {puntosOperacion
                .filter((p)=>p.activo!==false)
                .filter((p)=>String(p.nombre).toUpperCase()!==String(jornadaActiva?.punto_nombre||"").toUpperCase())
                .map((p)=>(
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
            </select>
          </div>
          <div style={{...styles.filterField,gridColumn:"1 / -1"}}>
            <label style={styles.label}>Observación *</label>
            <input
              style={styles.input}
              value={stockOperacionForm.observacion}
              onChange={(e)=>setStockOperacionForm((p)=>({...p,observacion:e.target.value}))}
              placeholder="Motivo de la transferencia"
            />
          </div>
        </div>
      </div>
    )}

    {stockSeccion==="INGRESOS"&&stockTipoIngreso==="TRANSFERENCIA_LOCALES"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Transferencia entre locales</h2>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Local / institución destino *</label>
            <select
              style={styles.input}
              value={stockOperacionForm.institucion_destino_id}
              onChange={async(e)=>{
                const valor=e.target.value;
                setStockOperacionForm((p)=>({
                  ...p,
                  institucion_destino_id:valor,
                  punto_destino_id:""
                }));
                await cargarPuntosDestinoLocal(valor);
              }}
            >
              <option value="">Seleccionar local</option>
              {institucionesTransferencia
                .filter((i)=>Number(i.id)!==Number(obtenerInstitucionActivaId()))
                .map((i)=>(
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Ubicación destino *</label>
            <select
              style={styles.input}
              value={stockOperacionForm.punto_destino_id}
              disabled={!stockOperacionForm.institucion_destino_id}
              onChange={(e)=>setStockOperacionForm((p)=>({
                ...p,
                punto_destino_id:e.target.value
              }))}
            >
              <option value="">Seleccionar ubicación</option>
              {puntosDestinoLocal.map((p)=>(
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div style={{...styles.filterField,gridColumn:"1 / -1"}}>
            <label style={styles.label}>Observación *</label>
            <input
              style={styles.input}
              value={stockOperacionForm.observacion}
              onChange={(e)=>setStockOperacionForm((p)=>({...p,observacion:e.target.value}))}
              placeholder="Motivo / referencia de la transferencia"
            />
          </div>
        </div>
      </div>
    )}

    {stockSeccion==="INGRESOS"&&
      ["PRODUCCION_COCINA","OTROS"].includes(stockTipoIngreso)&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>
          {stockTipoIngreso==="PRODUCCION_COCINA"
            ?"Producción cocina"
            :"Otros ingresos"}
        </h2>
        <div style={styles.filterField}>
          <label style={styles.label}>Observación *</label>
          <input
            style={styles.input}
            value={stockOperacionForm.observacion}
            onChange={(e)=>setStockOperacionForm((p)=>({...p,observacion:e.target.value}))}
            placeholder={
              stockTipoIngreso==="PRODUCCION_COCINA"
                ?"Ej. Producción del turno de cocina"
                :"Describe el motivo del ingreso"
            }
          />
        </div>
      </div>
    )}

    {stockSeccion==="EGRESOS"&&stockTipoEgreso&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>
          {stockTipoEgreso==="CORTESIA"?"Cortesía":"Baja de inventario"}
        </h2>

        <div style={styles.filtersGrid}>
          {stockTipoEgreso==="CORTESIA"&&(
            <div style={styles.filterField}>
              <label style={styles.label}>¿A quién se entrega? *</label>
              <input
                style={styles.input}
                value={stockOperacionForm.destinatario_cortesia}
                onChange={(e)=>setStockOperacionForm((p)=>({
                  ...p,
                  destinatario_cortesia:e.target.value
                }))}
                placeholder="Nombre de la persona / institución"
              />
            </div>
          )}

          <div style={{
            ...styles.filterField,
            gridColumn:stockTipoEgreso==="CORTESIA"?"auto":"1 / -1"
          }}>
            <label style={styles.label}>
              {stockTipoEgreso==="CORTESIA"
                ?"¿Por qué se entrega? / Observación *"
                :"Motivo / Observación *"}
            </label>
            <input
              style={styles.input}
              value={stockOperacionForm.observacion}
              onChange={(e)=>setStockOperacionForm((p)=>({...p,observacion:e.target.value}))}
              placeholder={
                stockTipoEgreso==="CORTESIA"
                  ?"Ej. Invitado institucional, evento, atención..."
                  :"Describe la razón de la baja"
              }
            />
          </div>
        </div>
      </div>
    )}

    {(
      (stockSeccion==="INGRESOS"&&stockTipoIngreso)||
      (stockSeccion==="EGRESOS"&&stockTipoEgreso)
    )&&(
      <div style={{...styles.box,marginBottom:20}}>
        <div style={styles.pageHeaderSmall}>
          <div>
            <h2 style={{margin:0}}>Seleccionar productos</h2>
            <p style={{color:"#64748b",margin:"6px 0 0"}}>
              Busca por producto o filtra por familia. Puedes seleccionar varios
              productos y escribir cantidades de 100, 500, 1000 o las que necesites.
            </p>
          </div>
          <div style={{
            padding:"8px 12px",
            borderRadius:999,
            background:"#dcfce7",
            fontWeight:800
          }}>
            Seleccionados: {totalSeleccionadosOperacionStock()}
          </div>
        </div>

        <div style={{
          display:"flex",
          flexWrap:"wrap",
          gap:10,
          alignItems:"center",
          marginTop:14
        }}>
          <button
            type="button"
            style={{
              ...styles.button,
              padding:"10px 16px",
              minWidth:170
            }}
            onClick={seleccionarTodosProductosOperacionStock}
            disabled={productosOperacionStock.length===0}
          >
            Seleccionar todo ({productosOperacionStock.length})
          </button>

          <button
            type="button"
            style={{
              ...styles.outlineButton,
              padding:"10px 16px",
              minWidth:150
            }}
            onClick={quitarSeleccionProductosOperacionStock}
            disabled={
              productosOperacionStock.length===0 ||
              !productosOperacionStock.some((producto)=>
                Object.prototype.hasOwnProperty.call(
                  stockItemsOperacion,
                  String(producto.id)
                )
              )
            }
          >
            Quitar selección
          </button>

          {todosVisiblesSeleccionadosOperacionStock()&&(
            <span style={{
              fontSize:13,
              fontWeight:800,
              color:"#166534",
              background:"#dcfce7",
              borderRadius:999,
              padding:"7px 10px"
            }}>
              Todos los productos visibles están seleccionados
            </span>
          )}
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"minmax(240px,1fr) minmax(220px,320px)",
          gap:12,
          marginTop:18
        }}>
          <div style={styles.filterField}>
            <label style={styles.label}>Buscar producto</label>
            <input
              style={styles.input}
              value={stockBusquedaOperacion}
              onChange={(e)=>setStockBusquedaOperacion(e.target.value)}
              placeholder="Nombre, código o familia"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Familia de producto</label>
            <select
              style={styles.input}
              value={stockFamiliaOperacion}
              onChange={(e)=>setStockFamiliaOperacion(e.target.value)}
            >
              <option value="TODAS">Todas las familias</option>
              {familiasOperacionStock.map((familia)=>(
                <option key={familia} value={familia}>{familia}</option>
              ))}
            </select>

            {stockSeccion==="INGRESOS"&&stockTipoIngreso==="COMPRA"&&(
              <>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  <button
                    type="button"
                    style={styles.outlineButton}
                    onClick={()=>document.getElementById("importar-familias-stock")?.click()}
                    disabled={importandoFamiliasStock}
                  >
                    {importandoFamiliasStock?"Importando...":"Importar Excel familias"}
                  </button>

                  <button
                    type="button"
                    style={styles.outlineButton}
                    onClick={descargarPlantillaFamiliasStock}
                  >
                    Descargar plantilla
                  </button>

                  <input
                    id="importar-familias-stock"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={importarFamiliasStockExcel}
                    style={{display:"none"}}
                  />
                </div>

                <div style={{fontSize:12,color:"#64748b",marginTop:6}}>
                  Excel: NOMBRE | CODIGO | MATERIA_PRIMA (SI/NO) | ESTADO
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{
          ...styles.tableWrap,
          marginTop:16,
          maxHeight:520,
          overflowY:"auto",
          overflowX:"hidden"
        }}>
          <table style={{
            ...styles.table,
            width:"100%",
            tableLayout:"fixed",
            minWidth:0
          }}>
            <thead>
              <tr>
                <th style={{...styles.th,width:56,textAlign:"center"}}>
                  Sel.
                </th>
                <th style={{...styles.th,width:"28%"}}>
                  Producto
                </th>
                <th style={{...styles.th,width:82}}>
                  Código
                </th>
                <th style={{...styles.th,width:90}}>
                  Familia
                </th>
                <th style={{
                  ...styles.th,
                  width:94,
                  whiteSpace:"normal",
                  lineHeight:1.15
                }}>
                  <div>Stock</div>
                  <div style={{fontSize:10,fontWeight:700}}>
                    {jornadaActiva?.punto_nombre||"punto"}
                  </div>
                </th>
                <th style={{...styles.th,width:82}}>
                  Cant.
                </th>
              </tr>
            </thead>
            <tbody>
              {productosOperacionStock.length===0?(
                <tr>
                  <td colSpan={6} style={styles.td}>
                    No hay productos para este filtro.
                  </td>
                </tr>
              ):(
                productosOperacionStock.map((producto)=>{
                  const id=String(producto.id);
                  const seleccionado=Object.prototype.hasOwnProperty.call(
                    stockItemsOperacion,id
                  );

                  return (
                    <tr key={producto.id}>
                      <td style={{
                        ...styles.td,
                        width:56,
                        textAlign:"center",
                        padding:"8px 4px"
                      }}>
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={()=>toggleProductoOperacionStock(producto)}
                        />
                      </td>
                      <td style={{
                        ...styles.td,
                        fontWeight:800,
                        padding:"8px 6px",
                        overflow:"hidden",
                        textOverflow:"ellipsis"
                      }}>
                        {producto.nombre}
                      </td>
                      <td style={{
                        ...styles.td,
                        padding:"8px 5px",
                        overflow:"hidden",
                        textOverflow:"ellipsis"
                      }}>
                        {producto.codigo||"-"}
                      </td>
                      <td style={{
                        ...styles.td,
                        padding:"8px 5px",
                        overflow:"hidden",
                        textOverflow:"ellipsis"
                      }}>
                        {producto.categoria||"Sin familia"}
                      </td>
                      <td style={{
                        ...styles.td,
                        padding:"8px 5px",
                        textAlign:"center",
                        fontWeight:800
                      }}>
                        {stockProductoEnPunto(
                          producto.id,
                          jornadaActiva?.punto_nombre||"PRINCIPAL"
                        )}
                      </td>
                      <td style={{
                        ...styles.td,
                        width:82,
                        padding:"8px 4px",
                        textAlign:"center"
                      }}>
                        <input
                          type="number"
                          min="0"
                          max="9999"
                          step="1"
                          disabled={!seleccionado}
                          value={seleccionado?stockItemsOperacion[id]:""}
                          onChange={(e)=>{
                            const valor=String(e.target.value||"")
                              .replace(/[^0-9]/g,"")
                              .slice(0,4);

                            cambiarCantidadOperacionStock(
                              producto.id,
                              valor
                            );
                          }}
                          style={{
                            ...styles.input,
                            width:68,
                            minWidth:68,
                            maxWidth:68,
                            padding:"8px 6px",
                            textAlign:"center",
                            opacity:seleccionado?1:.5
                          }}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          display:"flex",
          justifyContent:"flex-end",
          gap:12,
          marginTop:18
        }}>
          <button
            type="button"
            style={styles.outlineButton}
            onClick={limpiarOperacionStock}
          >
            Limpiar
          </button>
          <button
            type="button"
            style={styles.button}
            onClick={prepararConfirmacionOperacionStock}
          >
            Guardar y revisar
          </button>
        </div>
      </div>
    )}

    {stockConfirmacion&&(
      <div
        id="stock-confirmacion-panel"
        style={{
          position:"absolute",
          top:0,
          left:0,
          width:"100%",
          minHeight:"100%",
          zIndex:100005,
          background:"rgba(15,23,42,.68)",
          display:"flex",
          alignItems:"flex-start",
          justifyContent:"center",
          padding:"28px 16px",
          boxSizing:"border-box"
        }}
      >
        <div style={{
          width:"min(950px,96vw)",
          maxHeight:"88vh",
          overflowY:"auto",
          background:"#fff",
          borderRadius:18,
          padding:24,
          boxShadow:"0 22px 60px rgba(15,23,42,.30)"
        }}>
          <div style={{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"flex-start",
            gap:12,
            flexWrap:"wrap"
          }}>
            <div>
              <h2 style={{margin:"0 0 6px"}}>
                Confirmar movimiento de Stock
              </h2>
              <p style={{color:"#64748b",margin:0}}>
                Revisa el detalle antes de afectar las existencias.
              </p>
            </div>
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
            gap:10,
            margin:"18px 0"
          }}>
            <div style={styles.statCard}>
              <span>Movimiento</span>
              <strong>{stockConfirmacion.grupo}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Tipo</span>
              <strong>
                {String(stockConfirmacion.tipo)
                  .split("_")
                  .join(" ")}
              </strong>
            </div>

            <div style={styles.statCard}>
              <span>Ubicación</span>
              <strong>{jornadaActiva?.punto_nombre||"-"}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Operador</span>
              <strong>
                {jornadaActiva?.usuario_nombre||
                 jornadaActiva?.usuario_correo||
                 usuario?.nombre||
                 usuario?.correo||
                 "-"}
              </strong>
            </div>

            <div style={styles.statCard}>
              <span>Jornada</span>
              <strong>#{jornadaActiva?.id||"-"}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Productos</span>
              <strong>{stockConfirmacion.items?.length||0}</strong>
            </div>
          </div>

          {stockConfirmacion.tipo==="COMPRA"&&(
            <div style={{
              marginBottom:16,
              padding:12,
              background:"#f8fafc",
              borderRadius:10
            }}>
              <strong>Factura:</strong>{" "}
              {stockCompraForm.numero_factura||"-"}
              <br/>
              <strong>Proveedor:</strong>{" "}
              {proveedoresStock.find(
                (p)=>Number(p.id)===Number(stockCompraForm.proveedor_id)
              )?.nombre||
                stockCompraForm.proveedor_nuevo||
                "-"}
            </div>
          )}

          {stockConfirmacion.tipo==="CORTESIA"&&(
            <div style={{
              marginBottom:16,
              padding:12,
              background:"#fff7ed",
              borderRadius:10
            }}>
              <strong>Destinatario:</strong>{" "}
              {stockOperacionForm.destinatario_cortesia||"-"}
            </div>
          )}

          {String(
            stockConfirmacion.tipo==="COMPRA"
              ? stockCompraForm.observacion||""
              : stockOperacionForm.observacion||""
          ).trim()&&(
            <div style={{
              marginBottom:16,
              padding:12,
              border:"1px solid #e2e8f0",
              borderRadius:10,
              background:"#f8fafc"
            }}>
              <strong>Observación:</strong>{" "}
              {stockConfirmacion.tipo==="COMPRA"
                ? stockCompraForm.observacion
                : stockOperacionForm.observacion}
            </div>
          )}

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Familia</th>
                  <th style={styles.th}>Cantidad</th>
                </tr>
              </thead>

              <tbody>
                {(stockConfirmacion.items||[]).map((item)=>{
                  const producto=productos.find(
                    (p)=>Number(p.id)===Number(item.producto_id)
                  );

                  return(
                    <tr key={item.producto_id}>
                      <td style={{
                        ...styles.td,
                        fontWeight:800
                      }}>
                        {producto?.nombre||
                          `Producto #${item.producto_id}`}
                      </td>

                      <td style={styles.td}>
                        {producto?.codigo||"-"}
                      </td>

                      <td style={styles.td}>
                        {producto?.categoria||"-"}
                      </td>

                      <td style={{
                        ...styles.td,
                        fontWeight:900,
                        fontSize:18
                      }}>
                        {item.cantidad}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{
            display:"flex",
            justifyContent:"flex-end",
            gap:12,
            marginTop:20,
            flexWrap:"wrap"
          }}>
            <button
              type="button"
              style={styles.outlineButton}
              disabled={guardandoStockOperacion}
              onClick={()=>{
                setGuardandoStockOperacion(false);
                setStockConfirmacion(null);
              }}
            >
              Volver
            </button>

            <button
              type="button"
              style={{
                ...styles.button,
                background:"#2563eb",
                minWidth:210
              }}
              disabled={guardandoStockOperacion}
              onClick={()=>confirmarOperacionStockNueva()}
            >
              {guardandoStockOperacion
                ?"Guardando..."
                :"Confirmar movimiento"}
            </button>
          </div>
        </div>
      </div>
    )}

    {stockResultado&&(
      <div
        id="stock-resultado-panel"
        style={{
          position:"absolute",
          top:0,
          left:0,
          width:"100%",
          minHeight:"100%",
          zIndex:100006,
          background:"rgba(15,23,42,.68)",
          display:"flex",
          alignItems:"flex-start",
          justifyContent:"center",
          padding:"28px 16px",
          boxSizing:"border-box"
        }}
      >
        <div style={{
          width:"min(1050px,96vw)",
          maxHeight:"90vh",
          overflowY:"auto",
          background:"#fff",
          borderRadius:18,
          padding:24,
          boxShadow:"0 22px 60px rgba(15,23,42,.30)"
        }}>
          <div style={{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"flex-start",
            gap:12,
            flexWrap:"wrap",
            marginBottom:12
          }}>
            <div>
              <h2 style={{margin:"0 0 6px"}}>
                Stock actualizado correctamente
              </h2>
              <p style={{margin:0,color:"#64748b"}}>
                Estos son los productos que fueron actualizados.
              </p>
            </div>

            <div style={{
              padding:"8px 12px",
              borderRadius:999,
              background:"#dcfce7",
              color:"#166534",
              fontWeight:900
            }}>
              ✓ GUARDADO
            </div>
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
            gap:10,
            margin:"18px 0"
          }}>
            <div style={styles.statCard}>
              <span>Tipo</span>
              <strong>
                {String(stockResultado.tipo||"")
                  .split("_")
                  .join(" ")}
              </strong>
            </div>

            <div style={styles.statCard}>
              <span>Ubicación</span>
              <strong>{stockResultado.ubicacion||"-"}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Operador</span>
              <strong>{stockResultado.operador||"-"}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Productos actualizados</span>
              <strong>
                {Number(stockResultado.total_productos||0)}
              </strong>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Familia</th>
                  <th style={styles.th}>
                    Cantidad actualizada
                  </th>
                  <th style={styles.th}>
                    Stock final
                  </th>
                </tr>
              </thead>

              <tbody>
                {(stockResultado.items||[]).map(
                  (item,index)=>(
                    <tr key={`${item.producto_id}-${index}`}>
                      <td style={{
                        ...styles.td,
                        fontWeight:800
                      }}>
                        {item.nombre}
                      </td>

                      <td style={styles.td}>
                        {item.codigo||"-"}
                      </td>

                      <td style={styles.td}>
                        {item.familia||"-"}
                      </td>

                      <td style={{
                        ...styles.td,
                        fontWeight:900,
                        fontSize:18
                      }}>
                        {item.cantidad_texto}
                      </td>

                      <td style={{
                        ...styles.td,
                        fontWeight:900,
                        fontSize:18,
                        color:"#166534"
                      }}>
                        {Number(item.stock_final||0)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop:18,
            display:"flex",
            justifyContent:"flex-end"
          }}>
            <button
              type="button"
              style={{
                ...styles.button,
                background:"#2563eb",
                minWidth:180
              }}
              onClick={()=>setStockResultado(null)}
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    )}

    <div style={styles.box}>
      <div style={styles.pageHeaderSmall}>
        <div>
          <h2 style={{margin:0}}>Existencias actuales</h2>
          <p style={{color:"#64748b",margin:"6px 0 0"}}>
            Consulta del stock disponible por punto. Las ventas siguen su flujo
            independiente y no se registran como egresos manuales de Stock.
          </p>
        </div>

        {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (() => {
          const textoBusquedaStock=String(busquedaInventario||"")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g,"");

          const visibles = productos
            .filter((p)=>p?.activo!==false)
            .filter((p)=>{
              if(!textoBusquedaStock) return true;
              const contenido=[
                p?.nombre,
                p?.codigo,
                p?.categoria,
                p?.familia,
              ]
                .map((valor)=>String(valor||"")
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g,""))
                .join(" ");
              return contenido.includes(textoBusquedaStock);
            })
            .map((p)=>Number(p.id));

          const todosMarcados =
            visibles.length > 0 &&
            visibles.every((id) =>
              productosStockSeleccionadosBorrar.includes(id)
            );

          return (
            <div style={styles.headerActions}>
              <button
                type="button"
                style={styles.outlineButton}
                disabled={eliminandoProductosPrueba || visibles.length === 0}
                onClick={() =>
                  setProductosStockSeleccionadosBorrar((actual) => {
                    const actuales = new Set((actual || []).map(Number));

                    if (todosMarcados) {
                      visibles.forEach((id) => actuales.delete(id));
                    } else {
                      visibles.forEach((id) => actuales.add(id));
                    }

                    return Array.from(actuales);
                  })
                }
              >
                {todosMarcados ? "Quitar selección" : "Seleccionar todo"}
              </button>

              <button
                type="button"
                style={{
                  ...styles.outlineButton,
                  padding:"7px 10px",
                  minWidth:44,
                  fontSize:13,
                  whiteSpace:"nowrap",
                }}
                disabled={
                  eliminandoProductosPrueba ||
                  productosStockSeleccionadosBorrar.length === 0
                }
                onClick={encerarStockSeleccionadosAdmin}
                title={`Encerar ${productosStockSeleccionadosBorrar.length} producto(s) seleccionado(s)`}
              >
                ✏️ Encerar {productosStockSeleccionadosBorrar.length}
              </button>

              <button
                type="button"
                style={{
                  ...styles.deleteIconButton,
                  padding:"7px 9px",
                  minWidth:40,
                  fontSize:16,
                  lineHeight:1,
                }}
                disabled={
                  eliminandoProductosPrueba ||
                  productosStockSeleccionadosBorrar.length === 0
                }
                onClick={eliminarProductosStockSeleccionados}
                title={`Eliminar ${productosStockSeleccionadosBorrar.length} producto(s) seleccionado(s)`}
                aria-label="Eliminar productos seleccionados de stock"
              >
                🗑️ {productosStockSeleccionadosBorrar.length}
              </button>
            </div>
          );
        })()}
      </div>

      <div
        style={{
          marginTop:16,
          marginBottom:12,
          display:"flex",
          gap:10,
          alignItems:"center",
          flexWrap:"wrap",
        }}
      >
        <input
          type="search"
          value={busquedaInventario}
          onChange={(e)=>setBusquedaInventario(e.target.value)}
          placeholder="Buscar producto por nombre, código o familia..."
          style={{
            ...styles.input,
            maxWidth:520,
            minWidth:280,
            background:"#ffffff",
          }}
        />
        {busquedaInventario && (
          <button
            type="button"
            style={styles.outlineButton}
            onClick={()=>setBusquedaInventario("")}
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      <div style={{...styles.tableWrap,marginTop:16}}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                <th style={styles.th}>Seleccionar</th>
              )}
              <th style={styles.th}>Producto</th>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Familia</th>
              <th style={styles.th}>Stock por puntos</th>
              <th style={styles.th}>Total</th>
              {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                <th style={styles.th}>Acción</th>
              )}
            </tr>
          </thead>
          <tbody>
            {productos
              .filter((p)=>p?.activo!==false)
              .filter((p)=>{
                const texto=String(busquedaInventario||"")
                  .trim()
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g,"");
                if(!texto) return true;
                const contenido=[
                  p?.nombre,
                  p?.codigo,
                  p?.categoria,
                  p?.familia,
                ]
                  .map((valor)=>String(valor||"")
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g,""))
                  .join(" ");
                return contenido.includes(texto);
              })
              .map((producto)=>{
                const existencias=existenciasInventario.filter(
                  (e)=>Number(e.producto_id)===Number(producto.id)
                );
                const total=existencias.reduce(
                  (s,e)=>s+Number(e.stock||0),
                  0
                );

                return (
                  <tr key={producto.id}>
                    {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={productosStockSeleccionadosBorrar.includes(
                            Number(producto.id)
                          )}
                          onChange={(e) =>
                            alternarSeleccionId(
                              setProductosStockSeleccionadosBorrar,
                              producto.id,
                              e.target.checked
                            )
                          }
                          title={`Seleccionar ${producto.nombre}`}
                        />
                      </td>
                    )}
                    <td style={{...styles.td,fontWeight:800}}>
                      {producto.nombre}
                    </td>
                    <td style={styles.td}>{producto.codigo||"-"}</td>
                    <td style={styles.td}>{producto.categoria||"-"}</td>
                    <td style={styles.td}>
                      {existencias.length
                        ? existencias
                            .map(
                              (e)=>`${e.ubicacion}: ${Number(e.stock||0)}`
                            )
                            .join(" | ")
                        : "Sin existencias"}
                    </td>
                    <td style={{...styles.td,fontWeight:900}}>
                      {total}
                    </td>
                    {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                      <td style={styles.td}>
                        <button
                          type="button"
                          onClick={() => encerarStockProductoAdmin(producto)}
                          disabled={total === 0}
                          style={{
                            ...styles.outlineButton,
                            padding:"7px 10px",
                            fontSize:13,
                            whiteSpace:"nowrap",
                            opacity:total===0?0.5:1,
                          }}
                          title={
                            total === 0
                              ? "El producto ya está en cero"
                              : `Editar stock de ${producto.nombre} y encerar a 0`
                          }
                        >
                          ✏️ Encerar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  </>
)}
       {vista === "recargas" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Recargas</h1>
        <p style={styles.dashboardSubtitle}>
          Acredita saldo al alumno mediante efectivo o transferencia
        </p>
      </div>

      <button
        style={styles.refreshButton}
        onClick={async () => {
          await cargarRecargas();
          await cargarAlumnos();
          await cargarCuentasBancarias();
        }}
      >
        Actualizar
      </button>
    </div>

    {/* NUEVA RECARGA */}

    {puede("recargas.gestionar") && (
    <div style={styles.box}>
      <div style={styles.pageHeaderSmall}>
        <div>
          <h3 style={{ margin: 0 }}>Realizar recarga</h3>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            El valor se acredita inmediatamente. En transferencia selecciona la cuenta receptora y registra el comprobante.
          </p>
        </div>
      </div>

      <form onSubmit={crearRecarga}>
        <div style={styles.filtersGridPaymon}>
          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Alumno *</label>
            <select
              value={recargaForm.alumno_id}
              onChange={(e) =>
                setRecargaForm({
                  ...recargaForm,
                  alumno_id: e.target.value,
                })
              }
              style={styles.input}
              required
            >
              <option value="">Seleccionar alumno</option>
              {alumnosActivos.map((alumno) => (
                <option key={alumno.id} value={alumno.id}>
                  {obtenerNombreAlumno(alumno)}
                  {alumno.curso ? ` - ${alumno.curso}` : ""}
                  {alumno.paralelo ? ` ${alumno.paralelo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Valor a recargar *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={recargaForm.monto}
              onChange={(e) =>
                setRecargaForm({
                  ...recargaForm,
                  monto: e.target.value,
                })
              }
              style={styles.input}
              placeholder="0.00"
              required
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Método de recarga</label>
            <select
              value={recargaForm.metodo_pago}
              onChange={(e) =>
                setRecargaForm({
                  ...recargaForm,
                  metodo_pago: e.target.value,
                  numero_comprobante: "",
                                                    })
              }
              style={styles.input}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>

          {recargaForm.metodo_pago === "TRANSFERENCIA" && (
            <>
              <div style={styles.filterField}>
                <label style={styles.filterLabelTop}>
                  No. comprobante *
                </label>
                <input
                  type="text"
                  value={recargaForm.numero_comprobante}
                  onChange={(e) =>
                    setRecargaForm({
                      ...recargaForm,
                      numero_comprobante: e.target.value,
                    })
                  }
                  style={styles.input}
                  placeholder="Ej. 458963214"
                  maxLength={100}
                  required
                />
              </div>

              <div style={styles.filterField}>
                <label style={styles.filterLabelTop}>
                  Fecha en que realizó la transferencia *
                </label>
                <input
                  type="date"
                  value={recargaForm.fecha_transferencia || ""}
                  onChange={(e) =>
                    setRecargaForm({
                      ...recargaForm,
                      fecha_transferencia: e.target.value,
                    })
                  }
                  style={styles.input}
                  required
                />
              </div>
            </>
          )}

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Observación</label>
            <input
              type="text"
              value={recargaForm.observacion}
              onChange={(e) =>
                setRecargaForm({
                  ...recargaForm,
                  observacion: e.target.value,
                })
              }
              style={styles.input}
              placeholder="Observación opcional"
              maxLength={500}
            />
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button type="submit" style={styles.button}>
            Registrar recarga
          </button>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={limpiarFormularioRecarga}
          >
            Limpiar
          </button>
        </div>
      </form>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 9,
          background: "#eff6ff",
          color: "#1e3a8a",
        }}
      >
        <strong>Detalle:</strong> en efectivo se acredita el valor
        directamente. En transferencia, selecciona el banco donde se hizo el pago
        del colegio y registra el número de comprobante.
      </div>
    </div>
    )}

    <div style={{ height: 20 }} />

    {/* FILTROS */}

    <div style={styles.box}>
      <div style={styles.filtersGridPaymon}>

        <div style={styles.filterFieldWide}>
          <label style={styles.filterLabelTop}>Buscar recarga</label>
          <input
            type="text"
            value={recargasFiltros.texto}
            onChange={(e) =>
              setRecargasFiltros({
                ...recargasFiltros,
                texto: e.target.value,
              })
            }
            style={styles.searchInput}
            placeholder="Orden #, nombre, comprobante..."
          />
        </div>

        <div style={styles.filterField}>
          <label style={styles.filterLabelTop}>Fecha inicial</label>
          <input
            type="date"
            value={recargasFiltros.fecha_inicio}
            onChange={(e) =>
              setRecargasFiltros({
                ...recargasFiltros,
                fecha_inicio: e.target.value,
              })
            }
            style={styles.input}
          />
        </div>

        {false && (
        <div style={styles.filterField}>
          <label style={styles.filterLabelTop}>Fecha final</label>
          <input
            type="date"
            value={recargasFiltros.fecha_fin}
            onChange={(e) =>
              setRecargasFiltros({
                ...recargasFiltros,
                fecha_fin: e.target.value,
              })
            }
            style={styles.input}
          />
        </div>
        )}

        {false && (
        <div style={styles.filterField}>
          <label style={styles.filterLabelTop}>Forma de pago</label>
          <select
            value={recargasFiltros.metodo_pago}
            onChange={(e) =>
              setRecargasFiltros({
                ...recargasFiltros,
                metodo_pago: e.target.value,
              })
            }
            style={styles.input}
          >
            <option value="todas">Todas</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
        )}

      </div>

      {false && (
      <div style={styles.filterButtons}>
        <button
          type="button"
          style={styles.button}
          onClick={() => setRecargasFiltros({ ...recargasFiltros })}
        >
          Consultar
        </button>

        <button
          type="button"
          style={styles.outlineButton}
          onClick={limpiarFiltrosRecargas}
        >
          Borrar filtros
        </button>
      </div>
      )}
    </div>

    <div style={{ height: 20 }} />

    {/* TOTAL */}

    <div style={styles.paymonTotalWrap}>
      <span style={styles.paymonTotalLabel}>
        Total recargas: {formatearMoneda(totalRecargasVista)}
      </span>
    </div>

    <div style={{ height: 20 }} />

    {/* TABLA */}

    <div style={styles.box}>

      <div style={styles.pageHeaderSmall}>

        <div>
          <h3 style={{ margin: 0 }}>
            Historial de recargas
          </h3>
        </div>

        <div style={styles.headerActions}>

          <span style={styles.recordsBadge}>
            {recargasFiltradas.length} registros
          </span>

          {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
            <>
              <button
                type="button"
                style={styles.outlineButton}
                disabled={eliminandoPruebas || recargasFiltradas.length === 0}
                onClick={() =>
                  setRecargasSeleccionadasBorrar(
                    recargasSeleccionadasBorrar.length === recargasFiltradas.length
                      ? []
                      : recargasFiltradas.map((r) => Number(r.id))
                  )
                }
              >
                {recargasSeleccionadasBorrar.length === recargasFiltradas.length && recargasFiltradas.length > 0
                  ? "Quitar selección"
                  : "Seleccionar todo"}
              </button>
              <button
                type="button"
                style={{...styles.deleteIconButton,padding:"7px 9px",minWidth:40,fontSize:16,lineHeight:1}}
                disabled={eliminandoPruebas || recargasSeleccionadasBorrar.length === 0}
                onClick={eliminarRecargasSeleccionadas}
                title={`Eliminar ${recargasSeleccionadasBorrar.length} recarga(s) seleccionada(s)`}
                aria-label="Eliminar recargas seleccionadas"
              >
                🗑️ {recargasSeleccionadasBorrar.length}
              </button>
            </>
          )}

          <button
            type="button"
            style={styles.exportButton}
            onClick={exportarRecargasExcel}
          >
            Exportar
          </button>

        </div>

      </div>

      {recargasFiltradas.length === 0 ? (
        <p>No hay recargas para los filtros seleccionados.</p>
      ) : (

        <div style={styles.tableWrap}>

          <table style={styles.table}>

            <thead>
              <tr>
                {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                  <th style={styles.th}>Seleccionar</th>
                )}
                <th style={styles.th}>Orden</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Entregado</th>
                <th style={styles.th}>Recargado</th>
                <th style={styles.th}>Operador</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>No. comprobante</th>
                <th style={styles.th}>Banco</th>
                <th style={styles.th}>Observación</th>
              </tr>
            </thead>

            <tbody>

              {recargasFiltradas.map((r) => (

                <tr key={r.id}>

                  {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={recargasSeleccionadasBorrar.includes(Number(r.id))}
                        onChange={(e) =>
                          alternarSeleccionId(setRecargasSeleccionadasBorrar, r.id, e.target.checked)
                        }
                        aria-label={`Seleccionar recarga ${r.id}`}
                      />
                    </td>
                  )}

                  <td style={{...styles.td,fontWeight:800}}>
                    #{r.id}
                  </td>

                  <td style={styles.td}>
                    {formatearFechaHora(r.fecha_base)}
                  </td>

                  <td style={styles.td}>
                    {r.alumno_nombre}
                  </td>

                  <td style={styles.td}>
                    {formatearMoneda(r.dinero_entregado)}
                  </td>

                  <td style={styles.td}>
                    {formatearMoneda(r.dinero_recargado)}
                  </td>

                  <td style={styles.td}>
                    {r.operador_nombre}
                  </td>

                  <td style={styles.td}>
                    {r.tipo_visual}
                  </td>

                  <td style={styles.td}>
                    {r.estado_visual}
                  </td>

                  <td style={styles.td}>
                    {r.documento_visual}
                  </td>

                  <td style={styles.td}>
                    {r.banco || "-"}
                  </td>

                  <td style={styles.td}>
                    {r.observacion || "-"}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  </>
)}

        {vista === "ventas" && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.dashboardTitle}>Ventas</h1>
                <p style={styles.dashboardSubtitle}>Consulta el historial de ventas</p>
              </div>

              <button
                style={styles.refreshButton}
                onClick={() => {
                  cargarVentas();
                  cargarProductos();
                  cargarAlumnos();
                }}
              >
                Refrescar
              </button>
            </div>

            <div style={styles.ventasTabs}>
  <button
    type="button"
    style={
      vistaVentasInterna === "registrar"
        ? styles.ventasTabActive
        : styles.ventasTab
    }
    onClick={abrirNuevaOrdenConsumidorFinal}
  >
    Nueva Orden
  </button>

  {["ADMIN","SUPER_ADMIN"].includes(rolActual) && (
    <button
      type="button"
      style={
        vistaVentasInterna === "consultar"
          ? styles.ventasTabActive
          : styles.ventasTab
      }
      onClick={() => setVistaVentasInterna("consultar")}
    >
      Consultar ventas
    </button>
  )}

  {vistaVentasInterna === "registrar" && (
    <input
      type="text"
      value={busquedaProductoNuevaOrden}
      onChange={(e) => setBusquedaProductoNuevaOrden(e.target.value)}
      placeholder="Buscar producto..."
      style={{
        ...styles.input,
        width: 260,
        maxWidth: "100%",
        marginLeft: 8,
        background: "#ffffff",
      }}
    />
  )}
</div>

          {vistaVentasInterna === "registrar" && (
  <div
    style={{
      background: "#ffffff",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
      border: "1px solid #e5e7eb",
    }}
  >
    {/* CABECERA AZUL */}
    <div
      style={{
        background: "#2528b8",
        color: "#ffffff",
        padding: "18px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
          Nueva Orden
        </h2>

        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.95 }}>
          {alumnoVentaSeleccionado ? (
            <>
              Compra para{" "}
              <strong>{obtenerNombreAlumno(alumnoVentaSeleccionado)}</strong>
            </>
          ) : (
            <>Selecciona un alumno o continúa como consumidor final</>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {alumnoDetalle &&
          Number(ventaForm.alumno_id) === Number(alumnoDetalle.id) && (
            <button
              type="button"
              onClick={() => {
                const confirmar =
                  (Array.isArray(ventaItems) ? ventaItems : []).length === 0 ||
                  window.confirm(
                    "¿Deseas regresar a la ficha del alumno? Los productos agregados se eliminarán."
                  );

                if (!confirmar) return;

                limpiarFormularioVenta();
                setVistaAlumnoDetalle("datos");
                setVista("alumnos");
              }}
              style={{
                border: "1px solid rgba(255,255,255,0.7)",
                background: "#ffffff",
                color: "#2528b8",
                borderRadius: 10,
                padding: "11px 16px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ← Regresar al alumno
            </button>
          )}

        <div
          style={{
            minWidth: 145,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#dbe7ff",
            color: "#111827",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Usuario</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            {alumnoVentaSeleccionado
              ? obtenerNombreAlumno(alumnoVentaSeleccionado)
              : profesorVentaSeleccionado
              ? `${profesorVentaSeleccionado.nombres || ""} ${
                  profesorVentaSeleccionado.apellidos || ""
                }`.trim()
              : "Consumidor final"}
          </div>
        </div>

        <div
          style={{
            minWidth: 125,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#ffe0a3",
            color: "#111827",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {formatearMoneda(totalVentaCalculado)}
          </div>
        </div>

      </div>
    </div>

    {/* SELECCIÓN DE USUARIO */}
    {modoNuevaOrden === "identificar" && (
      <div
        style={{
          padding: 18,
          borderBottom: "1px solid #e5e7eb",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: esPantallaCompacta
              ? "minmax(0, 1fr)"
              : "minmax(180px, 240px) minmax(240px, 1fr)",
            gap: 14,
          }}
        >
          <div>
            <label style={styles.label}>Tipo de usuario</label>
            <select
              value={tipoUsuarioNuevaOrden}
              onChange={(e) => setTipoUsuarioNuevaOrden(e.target.value)}
              style={styles.input}
            >
              <option value="TODOS">Todos</option>
              <option value="ESTUDIANTE">Estudiante</option>
              <option value="PADRE">Padre</option>
              <option value="PROFESOR">Profesor</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Buscar usuario o código</label>
            <input
              type="text"
              value={busquedaUsuarioNuevaOrden}
              onChange={(e) => setBusquedaUsuarioNuevaOrden(e.target.value)}
              style={styles.input}
              placeholder="Escribe nombre, cédula o código"
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: esPantallaCompacta
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {(tipoUsuarioNuevaOrden === "TODOS" ||
            tipoUsuarioNuevaOrden === "ESTUDIANTE") &&
            alumnosActivos
            .filter((a) => {
              const texto = busquedaUsuarioNuevaOrden.trim().toLowerCase();
              const nombre = obtenerNombreAlumno(a).toLowerCase();
              const codigo = String(
                a.codigo || obtenerCedulaAlumno(a) || ""
              ).toLowerCase();

              return !texto || nombre.includes(texto) || codigo.includes(texto);
            })
            .slice(0, 12)
            .map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => {
                  setVentaForm((prev) => ({
                    ...prev,
                    alumno_id: String(a.id),
                    metodo_pago:
                      prev.metodo_pago === "RECARGA"
                        ? "RECARGA"
                        : prev.metodo_pago === "CREDITO"
                        ? "CREDITO"
                        : prev.metodo_pago,
                  }));
                  setModoNuevaOrden("consumidor_final");
                  setBusquedaUsuarioNuevaOrden("");
                }}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800, color: "#111827" }}>
                  {obtenerNombreAlumno(a)}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {obtenerCedulaAlumno(a) || "Sin cédula"} · Saldo{" "}
                  {formatearMoneda(a.saldo)}
                </div>
              </button>
            ))}

          {(tipoUsuarioNuevaOrden === "TODOS" ||
            tipoUsuarioNuevaOrden === "PROFESOR") &&
            profesores
              .filter((p) => {
                if (p.activo === false) return false;
                const texto =
                  busquedaUsuarioNuevaOrden.trim().toLowerCase();
                const nombre = `${p.nombres || ""} ${
                  p.apellidos || ""
                }`.toLowerCase();
                const codigo = String(
                  p.codigo || p.cedula || ""
                ).toLowerCase();

                return (
                  !texto ||
                  nombre.includes(texto) ||
                  codigo.includes(texto)
                );
              })
              .slice(0, 12)
              .map((p) => (
                <button
                  type="button"
                  key={`profesor-${p.id}`}
                  onClick={() => {
                    setVentaForm((prev) => ({
                      ...prev,
                      alumno_id: "",
                      profesor_id: String(p.id),
                      metodo_pago:
                        p.credito_habilitado === true &&
                        Number(p.saldo || 0) <= 0.0001
                          ? "CREDITO_PROFESOR"
                          : "EFECTIVO",
                    }));
                    setModoNuevaOrden("consumidor_final");
                    setBusquedaUsuarioNuevaOrden("");
                  }}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: 10,
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#111827" }}>
                    {`${p.nombres || ""} ${p.apellidos || ""}`.trim()}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      marginTop: 4,
                    }}
                  >
                    Profesor · {p.cedula || p.codigo || "Sin código"} ·
                    Crédito {formatearMoneda(p.saldo || 0)}
                  </div>
                </button>
              ))}
        </div>
      </div>
    )}

    {/* CONTENIDO PRINCIPAL */}
    <form ref={formNuevaOrdenRef} onSubmit={crearVenta}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          minHeight: 650,
        }}
      >
        {/* ÁREA DE PRODUCTOS */}
        <section
          style={{
            padding: esPantallaCompacta ? 8 : 20,
            minWidth: 0,
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: 18,
              marginBottom: 16,
              color: "#111827",
            }}
          >
            Configura la compra y selecciona los productos
          </div>

          <div
            ref={cabeceraNuevaOrdenRef}
            style={{
              border: "2px solid #2637d9",
              borderRadius: 10,
              padding: 14,
              display: "grid",
              gridTemplateColumns: esPantallaCompacta ? "1fr" : "1fr 1fr",
              gap: esPantallaCompacta ? 8 : 16,
              maxWidth: 1100,
              margin: "0 auto 22px auto",
              background: "#eef4ff",
            }}
          >
            <div>
              <label style={styles.label}>Local</label>
              <input value={jornadaActiva?.punto_nombre||localNuevaOrden} style={styles.input} readOnly />
            </div>

            <div>
              <label style={styles.label}>Fecha de la orden</label>
              <input
                type="date"
                value={fechaNuevaOrden}
                onChange={(e) => setFechaNuevaOrden(e.target.value)}
                style={{ ...styles.input, background: "#ffffff" }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: esPantallaCompacta
                ? "minmax(0, 1fr)"
                : "minmax(0, 1fr) minmax(330px, 390px)",
              gap: esPantallaCompacta ? 12 : 18,
              alignItems: "start",
              position: "relative",
            }}
          >
            <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: esPantallaCompacta
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(5, minmax(0, 1fr))",
              gap: esPantallaCompacta ? 6 : 8,
            }}
          >
            {productosActivos
              .filter((p) => {
                const texto = busquedaProductoNuevaOrden
                  .trim()
                  .toLowerCase();

                const coincideTexto =
                  !texto ||
                  String(p.nombre || "")
                    .toLowerCase()
                    .includes(texto) ||
                  String(p.codigo || "")
                    .toLowerCase()
                    .includes(texto);

                const coincideCategoria =
                  categoriaNuevaOrden === "TODOS" ||
                  String(p.categoria || "") === categoriaNuevaOrden;

                const precioValido =
                  Number.isFinite(Number(p.precio)) &&
                  Number(p.precio) > 0;

                const stockDisponible = stockDisponibleVentaProducto(
                  p,
                  jornadaActiva?.punto_nombre || localNuevaOrden
                );

                const tieneStock = stockDisponible >= 1;

                // Nueva Orden muestra únicamente productos vendibles:
                // precio mayor a cero y stock desde 1 en adelante.
                return (
                  coincideTexto &&
                  coincideCategoria &&
                  precioValido &&
                  tieneStock
                );
              })
              .map((producto) => {
                const itemExistente = (
                  Array.isArray(ventaItems) ? ventaItems : []
                ).find(
                  (item) =>
                    String(item.producto_id) === String(producto.id)
                );

                const sinStock =
                  stockDisponibleVentaProducto(
                    producto,
                    jornadaActiva?.punto_nombre || localNuevaOrden
                  ) <= 0;

                return (
                  <article
                    key={producto.id}
                    role="button"
                    tabIndex={sinStock ? -1 : 0}
                    onClick={(e) => {
                      if (sinStock || itemExistente || Number(e?.detail || 0) > 1) return;

                      const tag = String(
                        e?.target?.tagName || ""
                      ).toUpperCase();

                      if (
                        ["INPUT", "BUTTON", "SELECT", "TEXTAREA", "LABEL"].includes(
                          tag
                        )
                      ) {
                        return;
                      }

                      setVentaItems((prev) => [
                        ...(Array.isArray(prev) ? prev : []),
                        {
                          producto_id: String(producto.id),
                          cantidad: "1",
                        },
                      ]);
                    }}
                    onDoubleClick={(e) => {
                      if (sinStock || ventaRapidaBloqueadaRef.current) return;

                      const tag = String(e?.target?.tagName || "").toUpperCase();
                      if (["INPUT", "BUTTON", "SELECT", "TEXTAREA", "LABEL"].includes(tag)) {
                        return;
                      }

                      e.preventDefault();
                      e.stopPropagation();
                      ventaRapidaBloqueadaRef.current = true;

                      // DOBLE CLIC DE CAJA:
                      // garantizamos que el producto esté en la orden antes de enviarla.
                      setVentaItems((prev) => {
                        const lista = Array.isArray(prev) ? prev : [];
                        const existe = lista.some(
                          (item) => String(item.producto_id) === String(producto.id)
                        );

                        if (existe) return lista;

                        return [
                          ...lista,
                          {
                            producto_id: String(producto.id),
                            cantidad: "1",
                          },
                        ];
                      });

                      // Esperamos a que React pinte el producto/cantidad y luego
                      // usamos exactamente el mismo flujo seguro de "Crear orden".
                      window.setTimeout(() => {
                        if (formNuevaOrdenRef.current) {
                          formNuevaOrdenRef.current.requestSubmit();
                        } else {
                          ventaRapidaBloqueadaRef.current = false;
                        }
                      }, 250);
                    }}
                    title="1 clic: agregar producto · Doble clic: cobrar e imprimir"
                    onKeyDown={(e) => {
                      if (
                        sinStock ||
                        itemExistente ||
                        !["Enter", " "].includes(e.key)
                      ) {
                        return;
                      }

                      e.preventDefault();

                      setVentaItems((prev) => [
                        ...(Array.isArray(prev) ? prev : []),
                        {
                          producto_id: String(producto.id),
                          cantidad: "1",
                        },
                      ]);
                    }}
                    style={{
                      border: itemExistente
                        ? "2px solid #2536db"
                        : "1px solid #e5e7eb",
                      borderRadius: 14,
                      background: "#ffffff",
                      padding: 10,
                      boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
                      cursor: sinStock
                        ? "not-allowed"
                        : itemExistente
                        ? "default"
                        : "pointer",
                      userSelect: "none",
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: producto.imagen ? "64px 1fr" : "1fr",
                        gap: 9,
                        alignItems: "center",
                      }}
                    >
                      {producto.imagen && (
                        <div
                          style={{
                            height: 58,
                            borderRadius: 9,
                            overflow: "hidden",
                            background: "#eef2ff",
                          }}
                        >
                          <img
                            src={producto.imagen}
                            alt={producto.nombre || "Producto"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      )}

                      <div style={{minWidth:0,maxWidth:"100%"}}>
                        <div
                          style={{
                            fontSize: 12,
                            lineHeight: 1.15,
                            fontWeight: 900,
                            color: "#111827",
                            textTransform: "uppercase",
                            minWidth: 0,
                            maxWidth: "100%",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            hyphens: "auto",
                          }}
                        >
                          {producto.nombre}
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 11,
                            lineHeight: 1.2,
                            fontWeight: 700,
                          }}
                        >
                          Costo: {formatearMoneda(producto.precio)}
                        </div>

                        <div
                          style={{
                            display: "inline-block",
                            marginTop: 8,
                            padding: "4px 12px",
                            borderRadius: 999,
                            background: sinStock ? "#fee2e2" : "#dcfce7",
                            color: sinStock ? "#b91c1c" : "#166534",
                            fontSize: 10,
                            lineHeight: 1.15,
                            fontWeight: 800,
                            maxWidth: "100%",
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          }}
                        >
                          Stock {jornadaActiva?.punto_nombre || localNuevaOrden}: {stockDisponibleVentaProducto(producto, jornadaActiva?.punto_nombre || localNuevaOrden)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={sinStock}
                      onClick={() => {
                        if (itemExistente) {
                          const indice = ventaItems.findIndex(
                            (item) =>
                              String(item.producto_id) ===
                              String(producto.id)
                          );

                          if (indice >= 0) {
                            eliminarItemVenta(indice);
                          }

                          return;
                        }

                        setVentaItems((prev) => [
                          ...(Array.isArray(prev) ? prev : []),
                          {
                            producto_id: String(producto.id),
                            cantidad: "1",
                          },
                        ]);
                      }}
                      style={{
                        width: "100%",
                        marginTop: 8,
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 8px",
                        background: sinStock
                          ? "#cbd5e1"
                          : itemExistente
                          ? "#fee2e2"
                          : "#bcd0ff",
                        color: sinStock
                          ? "#64748b"
                          : itemExistente
                          ? "#b91c1c"
                          : "#1726a4",
                        fontWeight: 900,
                        fontSize: 12,
                        lineHeight: 1.15,
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        cursor: sinStock ? "not-allowed" : "pointer",
                      }}
                    >
                      {sinStock
                        ? "Sin stock"
                        : itemExistente
                        ? "Quitar producto"
                        : "Agregar producto"}
                    </button>

                    {itemExistente && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          alignItems: "stretch",
                          width: "100%",
                        }}
                      >
                        <label
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: "#334155",
                            textAlign: "center",
                            display: "block",
                          }}
                        >
                          Cantidad
                        </label>

                        <input
                          type="number"
                          min="1"
                          onClick={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          max={Math.max(
                            1,
                            Number(
                              stockDisponibleVentaProducto(
                                producto,
                                jornadaActiva?.punto_nombre || localNuevaOrden
                              ) || 0
                            )
                          )}
                          step="1"
                          value={String(itemExistente.cantidad ?? "")}
                          onChange={(e) => {
                            const indice = ventaItems.findIndex(
                              (item) =>
                                String(item.producto_id) ===
                                String(producto.id)
                            );

                            if (indice < 0) return;

                            const disponible = Number(
                              stockDisponibleVentaProducto(
                                producto,
                                jornadaActiva?.punto_nombre || localNuevaOrden
                              ) || 0
                            );

                            const texto = String(e.target.value || "")
                              .replace(/[^0-9]/g, "")
                              .slice(0, 4);

                            if (!texto) {
                              actualizarItemVenta(
                                indice,
                                "cantidad",
                                ""
                              );
                              return;
                            }

                            const cantidad = Number(texto);

                            if (cantidad <= 0) {
                              actualizarItemVenta(
                                indice,
                                "cantidad",
                                ""
                              );
                              return;
                            }

                            if (cantidad > disponible) {
                              alert(
                                `No puedes superar el stock disponible: ${disponible}`
                              );

                              actualizarItemVenta(
                                indice,
                                "cantidad",
                                String(disponible)
                              );
                              return;
                            }

                            actualizarItemVenta(
                              indice,
                              "cantidad",
                              String(cantidad)
                            );
                          }}
                          onBlur={(e) => {
                            const indice = ventaItems.findIndex(
                              (item) =>
                                String(item.producto_id) ===
                                String(producto.id)
                            );

                            if (indice < 0) return;

                            const cantidad = Number(e.target.value || 0);

                            if (!Number.isInteger(cantidad) || cantidad <= 0) {
                              actualizarItemVenta(
                                indice,
                                "cantidad",
                                ""
                              );
                            }
                          }}
                          style={{
                            width: "100%",
                            minWidth: 0,
                            height: 44,
                            boxSizing: "border-box",
                            border: "2px solid #64748b",
                            borderRadius: 8,
                            padding: "8px 10px",
                            fontSize: 18,
                            fontWeight: 900,
                            textAlign: "center",
                            background: "#ffffff",
                          }}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </article>
                );
              })}
          </div>


            </div>

            <aside
              style={{
                minWidth: esPantallaCompacta ? 0 : 330,
                width: "100%",
                alignSelf: "stretch",
                position: "relative",
              }}
            >
          {/* RESUMEN DE LA ORDEN */}
          <div
            style={{
              // PANEL FLOTANTE CON LÍMITE:
              // permanece visible mientras se recorren los productos.
              // Su posición sigue el borde inferior del bloque azul;
              // al llegar a 176px queda fijado y no sube más.
              position: esPantallaCompacta ? "relative" : "fixed",
              top: esPantallaCompacta ? "auto" : topPanelPagoNuevaOrden,
              right: esPantallaCompacta ? "auto" : 24,
              zIndex: 80,
              width: esPantallaCompacta
                ? "100%"
                : "min(390px, calc(100vw - 330px))",
              maxWidth: esPantallaCompacta ? "none" : 390,
              maxHeight: esPantallaCompacta
                ? "none"
                : `calc(100vh - ${topPanelPagoNuevaOrden + 14}px)`,
              overflowY: esPantallaCompacta ? "visible" : "auto",
              boxSizing: "border-box",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                border: "1px solid #dbe3f0",
                borderRadius: 12,
                padding: 16,
                background: "#f8fafc",
              }}
            >
              <label style={styles.label}>Método de pago</label>
              <select
                value={ventaForm.metodo_pago}
                onChange={(e) => {
                  const nuevoMetodo = e.target.value;

                  // Efectivo y transferencia funcionan inmediatamente.
                  if (
                    nuevoMetodo === "EFECTIVO" ||
                    nuevoMetodo === "TRANSFERENCIA"
                  ) {
                    setVentaForm((prev) => ({
                      ...prev,
                      metodo_pago: nuevoMetodo,
                    }));
                    return;
                  }

                  // Saldo y crédito del alumno:
                  // si todavía no hay alumno identificado, abrimos
                  // automáticamente el buscador de estudiantes.
                  if (
                    nuevoMetodo === "RECARGA" ||
                    nuevoMetodo === "CREDITO"
                  ) {
                    setVentaForm((prev) => ({
                      ...prev,
                      profesor_id: "",
                      metodo_pago: nuevoMetodo,
                    }));

                    if (!alumnoVentaSeleccionado) {
                      setModoNuevaOrden("identificar");
                      setTipoUsuarioNuevaOrden("ESTUDIANTE");
                      setBusquedaUsuarioNuevaOrden("");
                    }
                    return;
                  }

                  // Crédito profesor:
                  // si todavía no hay profesor, abrimos directamente
                  // la identificación filtrada por profesores.
                  if (nuevoMetodo === "CREDITO_PROFESOR") {
                    if (
                      false &&
                      Number(profesorVentaSeleccionado?.saldo || 0) > 0.0001
                    ) {
                      alert(
                        `El crédito del profesor se habilita únicamente cuando su saldo a favor llegue a $0.00.\nSaldo actual: ${formatearMoneda(
                          profesorVentaSeleccionado.saldo || 0
                        )}`
                      );

                      setVentaForm((prev) => ({
                        ...prev,
                        alumno_id: "",
                        metodo_pago: "EFECTIVO",
                      }));
                      return;
                    }

                    setVentaForm((prev) => ({
                      ...prev,
                      alumno_id: "",
                      metodo_pago: nuevoMetodo,
                    }));

                    if (!profesorVentaSeleccionado) {
                      setModoNuevaOrden("identificar");
                      setTipoUsuarioNuevaOrden("PROFESOR");
                      setBusquedaUsuarioNuevaOrden("");
                    }
                  }
                }}
                style={styles.input}
              >
                {/*
                  REGLAS DE PAGO:
                  - Consumidor final: Efectivo / Transferencia.
                  - Profesor seleccionado: Efectivo / Transferencia siempre disponibles.
                  - Alumno seleccionado: conserva Saldo / Crédito del alumno.
                  - Crédito profesor conserva sus bloqueos actuales.
                */}
                {!alumnoVentaSeleccionado && (
                  <>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </>
                )}

                {modoNuevaOrden !== "consumidor_final" &&
                  alumnoVentaSeleccionado &&
                  !profesorVentaSeleccionado && (
                    <>
                      <option value="RECARGA">Saldo del alumno</option>
                      <option value="CREDITO">Crédito del alumno</option>
                    </>
                  )}

                {profesorVentaSeleccionado && (
                  <option
                    value="CREDITO_PROFESOR"
                    disabled={
                      profesorVentaSeleccionado.credito_habilitado !== true ||
                      false
                    }
                  >
                    {false && Number(profesorVentaSeleccionado.saldo || 0) > 0.0001
                      ? `Crédito del profesor (saldo ${formatearMoneda(
                          profesorVentaSeleccionado.saldo || 0
                        )})`
                      : profesorVentaSeleccionado.credito_habilitado === true
                      ? "Crédito del profesor"
                      : "Crédito del profesor (inhabilitado)"}
                  </option>
                )}
              </select>

              {profesorVentaSeleccionado &&
                Number(profesorVentaSeleccionado.saldo || 0) > 0.0001 && (
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 8,
                      background: "#fff7ed",
                      border: "1px solid #fdba74",
                      color: "#9a3412",
                      padding: 10,
                      fontWeight: 800,
                      lineHeight: 1.4,
                    }}
                  >
                    Saldo a favor del profesor disponible.
                    Saldo actual:{" "}
                    {formatearMoneda(profesorVentaSeleccionado.saldo || 0)}
                  </div>
                )}

              <div style={{ height: 12 }} />

              <label style={styles.label}>Observación</label>
              <input
                type="text"
                value={ventaForm.observacion}
                onChange={(e) =>
                  setVentaForm((prev) => ({
                    ...prev,
                    observacion: e.target.value,
                  }))
                }
                placeholder="Observación"
                style={styles.input}
              />

              {ventaForm.metodo_pago === "RECARGA" &&
                alumnoVentaSeleccionado && (
                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 8,
                      background: "#dcfce7",
                      color: "#166534",
                      padding: 10,
                      fontWeight: 800,
                    }}
                  >
                    Saldo disponible:{" "}
                    {formatearMoneda(
                      alumnoVentaSeleccionado.saldo || 0
                    )}
                  </div>
                )}

              {ventaForm.metodo_pago === "CREDITO" &&
                alumnoVentaSeleccionado && (
                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 8,
                      background: "#fff7ed",
                      color: "#9a3412",
                      padding: 10,
                      fontWeight: 800,
                    }}
                  >
                    Crédito disponible:{" "}
                    {formatearMoneda(
                      Math.max(
                        0,
                        Number(
                          alumnoVentaSeleccionado.limite_credito ||
                            0
                        ) -
                          Number(
                            alumnoVentaSeleccionado.credito_utilizado ||
                              0
                          )
                      )
                    )}
                  </div>
                )}

              {ventaForm.metodo_pago === "CREDITO_PROFESOR" &&
                profesorVentaSeleccionado && (
                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 8,
                      background: "#eef2ff",
                      color: "#2435bd",
                      padding: 10,
                      fontWeight: 800,
                    }}
                  >
                    Crédito disponible del profesor:{" "}
                    {formatearMoneda(
                      Math.max(
                        0,
                        Number(
                          profesorVentaSeleccionado.limite_credito || 0
                        ) -
                          Number(
                            profesorVentaSeleccionado.credito_utilizado || 0
                          )
                      )
                    )}
                  </div>
                )}


              <div
                style={{
                  marginTop: 16,
                  borderRadius: 10,
                  background: "#2528b8",
                  color: "#ffffff",
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13 }}>Total de la orden</div>
                <div style={{ fontSize: 30, fontWeight: 900 }}>
                  {formatearMoneda(totalVentaCalculado)}
                </div>
              </div>

              {/* RECIBIDO / VUELTO / SALDO - debajo del total */}
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    padding: "10px 8px",
                    borderRadius: 10,
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#111827",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Recibido</div>
                  {ventaForm.metodo_pago === "EFECTIVO" ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={efectivoRecibidoNuevaOrden}
                      onChange={(e) => setEfectivoRecibidoNuevaOrden(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: 5,
                        border: "1px solid #94a3b8",
                        borderRadius: 7,
                        padding: "7px 5px",
                        fontSize: 18,
                        fontWeight: 900,
                        textAlign: "center",
                        background: "#ffffff",
                      }}
                    />
                  ) : (
                    <div style={{ marginTop: 7, fontSize: 20, fontWeight: 900 }}>
                      -
                    </div>
                  )}
                </div>

                <div
                  style={{
                    minWidth: 0,
                    padding: "10px 8px",
                    borderRadius: 10,
                    background: "#fef3c7",
                    border: "1px solid #fde68a",
                    color: "#111827",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Vuelto</div>
                  <div style={{ marginTop: 7, fontSize: 20, fontWeight: 900 }}>
                    {ventaForm.metodo_pago === "EFECTIVO"
                      ? formatearMoneda(
                          Math.max(
                            0,
                            Number(efectivoRecibidoNuevaOrden || 0) -
                              Number(totalVentaCalculado || 0)
                          )
                        )
                      : "-"}
                  </div>
                </div>

                <div
                  style={{
                    minWidth: 0,
                    padding: "10px 8px",
                    borderRadius: 10,
                    background: "#d9f4df",
                    border: "1px solid #bbf7d0",
                    color: "#111827",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Saldo</div>
                  <div style={{ marginTop: 7, fontSize: 20, fontWeight: 900 }}>
                    {formatearMoneda(
                      alumnoVentaSeleccionado?.saldo ||
                        profesorVentaSeleccionado?.saldo ||
                        0
                    )}
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={
                  (Array.isArray(ventaItemsCalculados)
                    ? ventaItemsCalculados
                    : []
                  ).length === 0 ||
                  (Array.isArray(ventaItemsCalculados)
                    ? ventaItemsCalculados
                    : []
                  ).some(
                    (item) =>
                      !Number.isFinite(Number(item.cantidad)) ||
                      Number(item.cantidad) <= 0
                  )
                }
                style={{
                  width: "100%",
                  marginTop: 14,
                  border: "none",
                  borderRadius: 9,
                  padding: "13px 12px",
                  background:
                    (Array.isArray(ventaItemsCalculados)
                      ? ventaItemsCalculados
                      : []
                    ).length === 0 ||
                    (Array.isArray(ventaItemsCalculados)
                      ? ventaItemsCalculados
                      : []
                    ).some(
                      (item) =>
                        !Number.isFinite(Number(item.cantidad)) ||
                        Number(item.cantidad) <= 0
                    )
                      ? "#94a3b8"
                      : "#ff8748",
                  color: "#ffffff",
                  fontWeight: 900,
                  cursor:
                    (Array.isArray(ventaItemsCalculados)
                      ? ventaItemsCalculados
                      : []
                    ).length === 0 ||
                    (Array.isArray(ventaItemsCalculados)
                      ? ventaItemsCalculados
                      : []
                    ).some(
                      (item) =>
                        !Number.isFinite(Number(item.cantidad)) ||
                        Number(item.cantidad) <= 0
                    )
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Crear orden
              </button>
              <button
                type="button"
                onClick={() => {
                  const confirmar =
                    (Array.isArray(ventaItems) ? ventaItems : []).length ===
                      0 ||
                    window.confirm(
                      "¿Deseas cancelar esta orden y eliminar los productos agregados?"
                    );
                  if (!confirmar) return;
                  limpiarFormularioVenta();
                }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  border: "1px solid #dc2626",
                  borderRadius: 9,
                  padding: "12px 12px",
                  background: "#ffffff",
                  color: "#b91c1c",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Cancelar orden
              </button>
            </div>
          </div>



            </aside>
          </div>
        </section>
      </div>
    </form>
  </div>
)}
            {vistaVentasInterna === "consultar" &&
              ["ADMIN","SUPER_ADMIN"].includes(rolActual) && (
              <>
                <div style={styles.box}>
                  <div style={styles.filtersGridPaymon}>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Tipo de fecha</label>
                      <select
                        value={ventasFiltros.tipo_fecha}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            tipo_fecha: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="created_at">Compras</option>
                      </select>
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Fecha inicial</label>
                      <input
                        type="date"
                        value={ventasFiltros.fecha_inicio}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            fecha_inicio: e.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Fecha final</label>
                      <input
                        type="date"
                        value={ventasFiltros.fecha_fin}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            fecha_fin: e.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Tipo de orden</label>
                      <select
                        value={ventasFiltros.tipo_orden}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            tipo_orden: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="">Selecciona</option>
                        <option value="NORMAL">Normal</option>
                      </select>
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Orden ID</label>
                      <input
                        type="text"
                        placeholder="Ej: 2043"
                        value={ventasFiltros.orden_id}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            orden_id: e.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Ubicación</label>
                      <select
                        value={ventasFiltros.ubicacion}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            ubicacion: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="">Selecciona</option>
                        <option value="PRINCIPAL">Principal</option>
                      </select>
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Operador</label>
                      <select
                        value={ventasFiltros.operador}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            operador: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="">Selecciona</option>
                      </select>
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Estado</label>
                      <select
                        value={ventasFiltros.estado}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            estado: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="ENTREGADA">Entregada</option>
                      </select>
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Forma de pago</label>
                      <select
                        value={ventasFiltros.metodo_pago}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            metodo_pago: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="todos">Selecciona</option>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="RECARGA">Recarga</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.filterButtons}>
                    <button
                      type="button"
                      style={styles.button}
                      onClick={() => setVentasFiltros({ ...ventasFiltros })}
                    >
                      Consultar
                    </button>
                    <button
                      type="button"
                      style={styles.outlineButton}
                      onClick={limpiarFiltrosVentas}
                    >
                      Borrar Filtros
                    </button>
                  </div>
                </div>
                <div style={{ height: 20 }} />
                <div style={styles.paymonTotalWrap}>
                  <span style={styles.paymonTotalLabel}>
                    Total de ventas: {formatearMoneda(resumenVentasVista.montoTotal)}
                  </span>
                </div>
                <div style={{ height: 20 }} />
                <div style={styles.box}>
  <div style={styles.pageHeaderSmall}>
    <div>
      <h3 style={{ margin: 0 }}>Historial de ventas</h3>
    </div>
    <div style={styles.headerActions}>
      <span style={styles.recordsBadge}>
        {ventasFiltradas.length} registros
      </span>
      {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
        <>
          <button
            type="button"
            style={styles.outlineButton}
            disabled={eliminandoPruebas || ventasFiltradas.length === 0}
            onClick={() =>
              setVentasSeleccionadasBorrar(
                ventasSeleccionadasBorrar.length === ventasFiltradas.length
                  ? []
                  : ventasFiltradas.map((v) => Number(v.id))
              )
            }
          >
            {ventasSeleccionadasBorrar.length === ventasFiltradas.length && ventasFiltradas.length > 0
              ? "Quitar selección"
              : "Seleccionar todo"}
          </button>
          <button
            type="button"
            style={{...styles.deleteIconButton,padding:"7px 9px",minWidth:40,fontSize:16,lineHeight:1}}
            disabled={eliminandoPruebas || ventasSeleccionadasBorrar.length === 0}
            onClick={eliminarVentasSeleccionadas}
            title={`Eliminar ${ventasSeleccionadasBorrar.length} venta(s) seleccionada(s)`}
            aria-label="Eliminar ventas seleccionadas"
          >
            🗑️ {ventasSeleccionadasBorrar.length}
          </button>
        </>
      )}
      <button
        type="button"
        style={styles.exportButton}
        onClick={exportarVentasExcel}
      >
        Exportar
      </button>
    </div>
  </div>
                  {ventasFiltradas.length === 0 ? (
                    <p>No hay ventas para los filtros seleccionados.</p>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                              <th style={styles.th}>Seleccionar</th>
                            )}
                            <th style={styles.th}>Orden No</th>
                            <th style={styles.th}>Usuario</th>
                            <th style={styles.th}>Ubicación</th>
                            <th style={styles.th}>Fecha de Consumo</th>
                            <th style={styles.th}>Fecha de Pago</th>
                            <th style={styles.th}>Fecha de Creación</th>
                            <th style={styles.th}>Hora compra</th>
                            <th style={styles.th}>Total</th>
                            <th style={styles.th}>Estado</th>
                            <th style={styles.th}>Forma Pago</th>
                            <th style={styles.th}>Tipo orden</th>
                            <th style={styles.th}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventasFiltradas.map((v) => (
                            <tr key={v.id}>
                              {["SUPER_ADMIN","ADMIN"].includes(rolActual) && (
                                <td style={styles.td}>
                                  <input
                                    type="checkbox"
                                    checked={ventasSeleccionadasBorrar.includes(Number(v.id))}
                                    onChange={(e) =>
                                      alternarSeleccionId(setVentasSeleccionadasBorrar, v.id, e.target.checked)
                                    }
                                    aria-label={`Seleccionar venta ${v.id}`}
                                  />
                                </td>
                              )}
                              <td style={styles.td}>#{v.id}</td>
                              <td style={styles.td}>{v.alumno_nombre}</td>
                              <td style={styles.td}>PRINCIPAL</td>
                              <td style={styles.td}>{formatearSoloFecha(v.fecha_base)}</td>
                              <td style={styles.td}>{formatearSoloFecha(v.fecha_base)}</td>
                              <td style={styles.td}>{formatearSoloFecha(v.fecha_base)}</td>
                              <td style={styles.td}>{formatearSoloHora(v.fecha_base)}</td>
                              <td style={styles.td}>{formatearMoneda(v.total)}</td>
                              <td style={styles.td}>
                                <span style={styles.badgeDelivered}>Entregada</span>
                              </td>
                              <td style={styles.td}>{v.metodo_visual}</td>
                              <td style={styles.td}>Normal</td>
                              <td style={styles.td}>
                                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                                  {["SUPER_ADMIN","ADMIN"].includes(rolActual) &&
                                    ["EFECTIVO","TRANSFERENCIA"].includes(
                                      String(v.metodo_pago || "").trim().toUpperCase()
                                    ) && (
                                    <button
                                      type="button"
                                      style={{
                                        border: "1px solid #b45309",
                                        background: "#fffbeb",
                                        color: "#92400e",
                                        borderRadius: 7,
                                        padding: "8px 11px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                      }}
                                      onClick={() => corregirFormaPagoVenta(v)}
                                      title={`Corregir forma de pago de la orden #${v.id}`}
                                    >
                                      ⇄ Corregir pago
                                    </button>
                                  )}
                                <button
                                  type="button"
                                  style={{
                                    border: "1px solid #1d4ed8",
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    borderRadius: 7,
                                    padding: "8px 11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                  onClick={() => reimprimirTicketVenta(v)}
                                  title={`Reimprimir ticket de la orden #${v.id}`}
                                >
                                  🖨 Reimprimir
                                </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
        {vista === "reportes" && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.dashboardTitle}>Reportes</h1>
                <p style={styles.dashboardSubtitle}>
                  Resumen de recargas, ventas, saldo y comportamiento del sistema
                </p>
              </div>
              <button
                style={styles.refreshButton}
                onClick={() => {
                  cargarResumen();
                  cargarRecargas();
                  cargarVentas();
                  cargarAlumnos();
                  cargarProductos();
                }}
              >
                Refrescar
              </button>
            </div>
            <div style={styles.grid}>
              <div style={styles.box}>
                <h3>Total recargas</h3>
                <p>{formatearMoneda(reporteResumen.totalRecargas)}</p>
              </div>
              <div style={styles.box}>
                <h3>Total ventas</h3>
                <p>{formatearMoneda(reporteResumen.totalVentas)}</p>
              </div>
              <div style={styles.box}>
                <h3>Ventas efectivo</h3>
                <p>{formatearMoneda(reporteResumen.ventasEfectivo)}</p>
              </div>
              <div style={styles.box}>
                <h3>Ventas transferencia</h3>
                <p>{formatearMoneda(reporteResumen.ventasTransferencia)}</p>
              </div>
              <div style={styles.box}>
                <h3>Ventas por recarga</h3>
                <p>{formatearMoneda(reporteResumen.ventasRecarga)}</p>
              </div>
              <div style={styles.box}>
                <h3>Saldo total alumnos</h3>
                <p>{formatearMoneda(reporteResumen.saldoTotalAlumnos)}</p>
              </div>
            </div>
            <div style={{ height: 20 }} />
            <div style={styles.twoColumn}>
              <div style={styles.box}>
                <h3>Últimas recargas</h3>
                {recargas.length === 0 ? (
                  <p>No hay recargas registradas.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Alumno</th>
                          <th style={styles.th}>Monto</th>
                          <th style={styles.th}>Método</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recargas.slice(0, 10).map((r) => (
                          <tr key={r.id}>
                            <td style={styles.td}>
                              {`${r.nombres || ""} ${r.apellidos || ""}`.trim() || "-"}
                            </td>
                            <td style={styles.td}>{formatearMoneda(r.monto)}</td>
                            <td style={styles.td}>{r.metodo_pago || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div style={styles.box}>
                <h3>Últimas ventas</h3>
                {ventas.length === 0 ? (
                  <p>No hay ventas registradas.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Método</th>
                          <th style={styles.th}>Total</th>
                          <th style={styles.th}>Alumno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.slice(0, 10).map((v) => {
                          const alumno = alumnos.find(
                            (a) => String(a.id) === String(v.alumno_id)
                          );
                          return (
                            <tr key={v.id}>
                              <td style={styles.td}>
                                {v.metodo_pago === "SALDO" ? "RECARGA" : v.metodo_pago}
                              </td>
                              <td style={styles.td}>{formatearMoneda(v.total)}</td>
                              <td style={styles.td}>
                                {alumno ? obtenerNombreAlumno(alumno) : v.alumno_id || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {vista === "galeria_productos" && ["ADMIN","SUPER_ADMIN"].includes(rolActual) && (
          <div>
            <div style={styles.pageHeader}>
              <div><h1 style={styles.dashboardTitle}>Galería de Productos</h1><p style={{margin:"6px 0 0",color:"#64748b"}}>Selecciona una imagen para el producto que estás creando o editando. Solo ADMIN puede administrar esta galería.</p></div>
              <div style={styles.headerActions}>
                <input ref={inputGaleriaFotoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}} onChange={(e)=>{const f=e.target.files?.[0];if(f)subirFotoGaleria(f);e.target.value="";}} />
                <button type="button" style={styles.secondaryButton} onClick={()=>inputGaleriaFotoRef.current?.click()}>＋ Agregar foto</button>
              </div>
            </div>
            <div style={{...styles.box,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:esPantallaCompacta?"1fr":"minmax(0,1fr) 240px",gap:10}}>
                <input value={galeriaBusqueda} onChange={(e)=>setGaleriaBusqueda(e.target.value)} placeholder="Buscar imagen: hamburguesa, bolón, jugo..." style={styles.input}/>
                <select value={galeriaCategoria} onChange={(e)=>setGaleriaCategoria(e.target.value)} style={styles.input}>
                  <option value="TODAS">Todas las categorías</option>
                  {[...new Set(GALERIA_PRODUCTOS_BASE.map((f)=>f.categoria))].map((categoria)=><option key={categoria} value={categoria}>{categoria}</option>)}
                </select>
              </div>
              <div style={{marginTop:8,fontSize:12,color:"#64748b"}}>{GALERIA_PRODUCTOS_BASE.length} imágenes base organizadas por categoría. Fotos propias: JPG, JPEG, PNG o WEBP · máximo 2 MB · recomendado 600 × 600 px (1:1).</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:esPantallaCompacta?"repeat(2,minmax(0,1fr))":"repeat(5,minmax(0,1fr))",gap:12}}>
              {[...GALERIA_PRODUCTOS_BASE,...galeriaProductos]
                .filter((f)=>galeriaCategoria==="TODAS"||String(f.categoria||"PERSONALIZADAS")===galeriaCategoria)
                .filter((f)=>!galeriaBusqueda.trim()||String(f.nombre||"").toLowerCase().includes(galeriaBusqueda.trim().toLowerCase()))
                .map((foto)=>(
                <div key={`${foto.base?"b":"p"}-${foto.id}`} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:10,boxShadow:"0 6px 16px rgba(15,23,42,.06)"}}>
                  <img src={foto.imagen} alt={foto.nombre} style={{width:"100%",aspectRatio:"1 / 1",objectFit:"cover",borderRadius:10,background:"#f8fafc"}}/>
                  <div style={{fontWeight:900,fontSize:13,marginTop:8,textAlign:"center"}}>{foto.nombre}</div><div style={{fontSize:11,color:"#64748b",textAlign:"center",marginTop:2}}>{foto.categoria || "Personalizadas"}</div>
                  <button type="button" style={{...styles.button,width:"100%",marginTop:8,padding:"8px 6px"}} onClick={()=>{setProductoForm((prev)=>({...prev,imagen:foto.imagen}));setVista("productos");setMostrarFormularioProducto(true);}}>Usar imagen</button>
                  {!foto.base && <button type="button" title="Eliminar foto de la galería" onClick={()=>eliminarFotoGaleria(foto)} style={{...styles.deleteIconButton,width:"100%",marginTop:6}}>🗑️</button>}
                </div>
              ))}
            </div>
            {cargandoGaleria && <p>Cargando galería...</p>}
          </div>
        )}

        {vista === "configuracion" &&
          ["ADMIN", "SUPER_ADMIN"].includes(rolActual) && (
          <ConfiguracionModulo
            API_URL={API_URL}
            usuario={usuario}
            institucion={institucionActiva}
            institucionId={institucionActivaId}
            onCerrarSesion={cerrarSesion}
            puede={puede}
          />
        )}
              </main>
    </div>
  );
}
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef2f7",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  },
  loginCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    padding: "32px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "32px",
    textAlign: "center",
    color: "#1d4ed8",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "24px",
    textAlign: "center",
    color: "#555",
  },
  appShell: {
    minHeight: "100vh",
    width: "100%",
    display: "grid",
    gridTemplateColumns: "270px minmax(0, 1fr)",
    background: "#f3f4f6",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    background: "#1e3a8a",
    color: "#fff",
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "20px",
    minHeight: "100vh",
    boxSizing: "border-box",
    position: "sticky",
    top: 0,
  },
  logo: {
    margin: 0,
    marginBottom: "16px",
    fontSize: "22px",
  },
  institucionBadge: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "18px",
  },
  institucionLabel: {
    display: "block",
    fontSize: "12px",
    color: "#cbd5e1",
    marginBottom: "6px",
  },
  institucionName: {
    display: "block",
    fontSize: "14px",
    lineHeight: 1.35,
  },
  menuButton: {
    width: "100%",
    background: "transparent",
    color: "#fff",
    border: "none",
    textAlign: "left",
    padding: "13px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "17px",
    marginBottom: "8px",
  },
  menuButtonActive: {
    width: "100%",
    background: "#3b82f6",
    color: "#fff",
    border: "2px solid #93c5fd",
    textAlign: "left",
    padding: "13px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "17px",
    marginBottom: "8px",
  },
  logoutButton: {
    width: "100%",
    padding: "15px",
    borderRadius: "12px",
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: "17px",
    cursor: "pointer",
  },
  main: {
    width: "100%",
    minWidth: 0,
    padding: "34px 36px",
    boxSizing: "border-box",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  pageHeaderSmall: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  dashboardTitle: {
    marginTop: 0,
    marginBottom: "10px",
    color: "#111827",
    fontSize: "52px",
    lineHeight: 1.05,
  },
  dashboardSubtitle: {
    color: "#6b7280",
    margin: 0,
    fontSize: "18px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    width: "100%",
  },
  gridMini: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    width: "100%",
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
    gap: "20px",
    width: "100%",
    alignItems: "start",
  },
  twoColumnWide: {
    display: "grid",
    gridTemplateColumns: "minmax(360px, 520px) minmax(0, 1fr)",
    gap: "20px",
    width: "100%",
    alignItems: "start",
  },
  accountLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) minmax(320px, 1fr)",
    gap: "20px",
    width: "100%",
    alignItems: "start",
  },
  box: {
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
    minWidth: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  label: {
    fontSize: "14px",
    color: "#374151",
    fontWeight: "bold",
    marginBottom: "-4px",
  },
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
    background: "#fff",
    boxSizing: "border-box",
  },
  searchInput: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "#fff",
    minWidth: "200px",
    boxSizing: "border-box",
  },
  select: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "#fff",
    minWidth: "150px",
    boxSizing: "border-box",
  },
  button: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  outlineButton: {
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #2563eb",
    background: "#fff",
    color: "#1d4ed8",
    fontSize: "16px",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  smallDangerButton: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#6b7280",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  refreshButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "none",
    background: "#0f766e",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "980px",
  },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
    padding: "12px",
    fontSize: "14px",
    background: "#f8fafc",
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid #f1f5f9",
    padding: "12px",
    fontSize: "14px",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  message: {
    marginTop: "16px",
    textAlign: "center",
    color: "#b91c1c",
  },
  filterLabel: {
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: "normal",
  },
  infoBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
  },
  itemVentaCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#f8fafc",
  },
  itemVentaResumen: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: "14px",
    color: "#374151",
    flexWrap: "wrap",
  },
  totalVentaBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "18px",
    fontWeight: "bold",
  },
  badgeActive: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeInactive: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeNormal: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeBajo: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fef3c7",
    color: "#92400e",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeAgotado: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeDelivered: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#d1fae5",
    color: "#065f46",
    fontSize: "12px",
    fontWeight: "bold",
  },
  editIconButton: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
  },
  deleteIconButton: {
    border: "none",
    background: "#dc2626",
    color: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
  },
  restoreIconButton: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
  },
  disabledIconButton: {
    border: "none",
    background: "#cbd5e1",
    color: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "not-allowed",
    fontSize: "16px",
  },
  ventasTabs: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  ventasTab: {
    padding: "12px 18px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontSize: "15px",
    cursor: "pointer",
  },
  ventasTabActive: {
    padding: "12px 18px",
    borderRadius: "12px",
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    fontSize: "15px",
    cursor: "pointer",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    width: "100%",
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  filterFieldWide: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gridColumn: "span 2",
  },
  filterLabelTop: {
    fontSize: "14px",
    color: "#334155",
    fontWeight: "bold",
  },
  filterButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "18px",
    flexWrap: "wrap",
  },
  summaryCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  summaryLabel: {
    fontSize: "13px",
    color: "#64748b",
  },
  summaryValue: {
    fontSize: "24px",
    color: "#0f172a",
  },
  summaryPaymonBox: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
    minWidth: 0,
    border: "1px solid #e5e7eb",
  },
  summaryPaymonLabel: {
    display: "block",
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "8px",
  },
  summaryPaymonValue: {
    display: "block",
    fontSize: "28px",
    color: "#1e3a8a",
    fontWeight: "bold",
  },
  recordsBadge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#e0e7ff",
    color: "#3730a3",
    fontSize: "13px",
    fontWeight: "bold",
  },
  filtersGridPaymon: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    width: "100%",
  },
  paymonTotalWrap: {
    marginBottom: "8px",
  },
  paymonTotalLabel: {
  display: "inline-block",
  fontSize: "18px",
  color: "#1d4ed8",
  fontWeight: "500",
},
subMenu: {
  marginLeft: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
},
subMenuButton: {
  padding: "8px 10px",
  border: "none",
  background: "#e5e7eb",
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14,
},
card: {
  background: "#fff",
  borderRadius: "18px",
  padding: "24px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
  minWidth: 0,
},
reporteHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  flexWrap: "wrap",
  gap: 12,
},
filtrosRow: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  width: "100%",
  alignItems: "end",
},
filterGroup: {
  display: "flex",
  flexDirection: "column",
  gap: 6,
},
filterActions: {
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
},
reportToolbar: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 16,
  flexWrap: "wrap",
},
exportButton: {
  padding: "12px 18px",
  borderRadius: "10px",
  border: "1px solid #166534",
  background: "#fff",
  color: "#166534",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "bold",
},
emptyState: {
  padding: "18px",
  textAlign: "center",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  color: "#64748b",
},
tableHeaderProductos: {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.2fr 2fr 1fr 1.2fr",
  gap: 12,
  padding: "12px 14px",
  background: "#dbe7ff",
  borderRadius: 10,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 10,
},
rowTablaProductos: {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.2fr 2fr 1fr 1.2fr",
  gap: 12,
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
  alignItems: "center",
},
tableHeaderProductosDia: {
  display: "grid",
  gridTemplateColumns: "2fr 1.2fr repeat(7, 1fr)",
  gap: 12,
  padding: "12px 14px",
  background: "#dbe7ff",
  borderRadius: 10,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 10,
  minWidth: "1100px",
},
rowTablaProductosDia: {
  display: "grid",
  gridTemplateColumns: "2fr 1.2fr repeat(7, 1fr)",
  gap: 12,
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
  alignItems: "center",
  minWidth: "1100px",
},
moveIconButton: {
  border: "none",
  background: "#d97706",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
},
smallDarkButton: {
  border: "none",
  background: "#7f1d1d",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
},
saveIconButton: {
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
},
viewIconButton: {
  border: "none",
  background: "#059669",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
},
subMenuButtonActive: {
  padding: "8px 10px",
  border: "none",
  background: "#3b82f6",
  color: "#fff",
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14,
},
};
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
// CONSERVA LINEA APP ACTUAL - AJUSTE RECARGAS FECHA
