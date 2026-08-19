import { useRef, useState } from "react";
import * as XLSX from "xlsx";

export default function AlumnosModulo({
  styles,
  filtroAlumnos,
  setFiltroAlumnos,
  cargarAlumnos,
  alumnoDetalle,
  obtenerCedulaAlumno,
  formatearMoneda,
  setVista,
  setVistaVentasInterna,
  setModoNuevaOrden,
  setVentaItems,
  setVentaForm,
  setBusquedaUsuarioNuevaOrden,
  setBusquedaProductoNuevaOrden,
  setCodigoBarraNuevaOrden,
  setCategoriaNuevaOrden,
  setRecargaForm,
  iniciarEdicionAlumno,
  setAlumnoDetalle,
  setVistaAlumnoDetalle,
  vistaAlumnoDetalle,
  historialVentasAlumno,
  historialConsumoAlumno,
  setOrdenDetalleAlumno,
  ordenDetalleAlumno,
  historialRecargasAlumno,
  editandoAlumnoId,
  actualizarAlumno,
  crearAlumno,
  alumnoForm,
  setAlumnoForm,
  limpiarFormularioAlumno,
  alumnosFiltrados,
  eliminarAlumno,
  restaurarAlumno,
  API_URL,
  obtenerInstitucionActivaId,
  setHistorialVentasAlumno,
  setHistorialRecargasAlumno,
  setHistorialConsumoAlumno,
  cuentasBancarias = [],
  cargarCuentasBancarias,
  cargarRecargas,
  rolActual
}) {
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [mostrarFiltroAlumnos, setMostrarFiltroAlumnos] = useState(false);
  const [busquedaAlumnos, setBusquedaAlumnos] = useState("");
  const inputImportarAlumnosRef = useRef(null);
  const [importandoAlumnos, setImportandoAlumnos] = useState(false);
  const [codigoAccesoGenerado, setCodigoAccesoGenerado] = useState(null);
  const [generandoCodigoAcceso, setGenerandoCodigoAcceso] = useState(false);
  const [mostrarFormularioAlumno, setMostrarFormularioAlumno] = useState(false);
  const [mostrarModalRecarga, setMostrarModalRecarga] = useState(false);
  const [guardandoRecarga, setGuardandoRecarga] = useState(false);
  const [recargaAlumnoForm, setRecargaAlumnoForm] = useState({
    monto: "",
    metodo_pago: "EFECTIVO",
    cuenta_bancaria_id: "",
    banco: "",
    numero_comprobante: "",
    observacion: "",
  });
  const [creditoAlumno, setCreditoAlumno] = useState(null);
  const [movimientosCreditoAlumno, setMovimientosCreditoAlumno] = useState([]);
  const [cargandoCreditoAlumno, setCargandoCreditoAlumno] = useState(false);
  const [guardandoCreditoAlumno, setGuardandoCreditoAlumno] = useState(false);
  const [creditoConfiguracionForm, setCreditoConfiguracionForm] = useState({
    credito_habilitado: false,
    limite_credito: "",
  });
  const [creditoAdminPassword, setCreditoAdminPassword] = useState("");
  const [verCreditoAdminPassword, setVerCreditoAdminPassword] = useState(false);
  const [abonoCreditoForm, setAbonoCreditoForm] = useState({
    monto: "",
    observacion: "",
  });

  const creditoAlumnoHabilitado =
    creditoAlumno?.credito_habilitado === true;


  const normalizarEncabezado = (valor) =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const descargarPlantillaAlumnos = () => {
    const datos = [
      {
        Cedula: "1712345678",
        Codigo: "A001",
        Nombres: "Juan",
        Apellidos: "Perez",
        Curso: "8vo",
        Paralelo: "A",
        Correo: "juan@email.com",
        Telefono: "0999999999",
        Estado: "Activo",
      },
    ];

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Alumnos");
    XLSX.writeFile(libro, "plantilla_alumnos.xlsx");
  };

  const importarAlumnosArchivo = async (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";

    if (!archivo) return;

    try {
      setImportandoAlumnos(true);

      const extension = archivo.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(extension)) {
        alert("Selecciona un archivo XLSX, XLS o CSV.");
        return;
      }

      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: "array" });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const filasOriginales = XLSX.utils.sheet_to_json(hoja, {
        defval: "",
        raw: false,
      });

      if (!filasOriginales.length) {
        alert("El archivo no contiene registros.");
        return;
      }

      const filas = filasOriginales.map((fila) => {
        const normalizada = {};
        Object.entries(fila).forEach(([clave, valor]) => {
          normalizada[normalizarEncabezado(clave)] = valor;
        });
        return normalizada;
      });

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("No se pudo identificar la sesión o institución.");
        return;
      }

      let creados = 0;
      let actualizados = 0;
      const errores = [];

      for (let indice = 0; indice < filas.length; indice += 1) {
        const fila = filas[indice];
        const cedula = String(
          fila.cedula || fila.cedula_ruc || fila.identificacion || ""
        ).trim();
        const nombres = String(fila.nombres || fila.nombre || "").trim();
        const apellidos = String(fila.apellidos || fila.apellido || "").trim();

        if (!cedula || !nombres || !apellidos) {
          errores.push(`Fila ${indice + 2}: faltan cédula, nombres o apellidos.`);
          continue;
        }

        const existente = alumnosFiltrados.find(
          (alumno) => String(obtenerCedulaAlumno(alumno) || "").trim() === cedula
        );

        const estadoTexto = String(fila.estado || "Activo").trim().toLowerCase();
        const datos = {
          institucion_id: Number(institucionId),
          cedula,
          codigo: String(fila.codigo || cedula).trim(),
          nombres,
          apellidos,
          curso: String(fila.curso || "").trim(),
          paralelo: String(fila.paralelo || "").trim(),
          correo: String(fila.correo || fila.email || "").trim(),
          telefono: String(fila.telefono || fila.celular || "").trim(),
          saldo: existente ? Number(existente.saldo || 0) : 0,
          activo: !["inactivo", "false", "0", "no"].includes(estadoTexto),
        };

        const url = existente
          ? `${API_URL}/api/alumnos/${existente.id}`
          : `${API_URL}/api/alumnos`;
        const metodo = existente ? "PUT" : "POST";

        const respuesta = await fetch(url, {
          method: metodo,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(datos),
        });

        const resultado = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
          errores.push(
            `Fila ${indice + 2} (${cedula}): ${
              resultado.message || resultado.error || "error al guardar"
            }`
          );
          continue;
        }

        if (existente) actualizados += 1;
        else creados += 1;
      }

      await cargarAlumnos();

      const resumen = [
        "Importación finalizada.",
        `Nuevos: ${creados}`,
        `Actualizados: ${actualizados}`,
        `Errores: ${errores.length}`,
      ];

      if (errores.length) {
        resumen.push("", "Primeros errores:", ...errores.slice(0, 8));
      }

      alert(resumen.join("\n"));
    } catch (error) {
      console.error("Error importando alumnos:", error);
      alert("No se pudo importar el archivo de alumnos.");
    } finally {
      setImportandoAlumnos(false);
    }
  };

  const alumnosFiltradosBusqueda = alumnosFiltrados.filter((alumno) => {
    const texto = busquedaAlumnos.trim().toLowerCase();

    if (!texto) return true;

    const nombres = String(alumno?.nombres || "").toLowerCase();
    const apellidos = String(alumno?.apellidos || "").toLowerCase();
    const cedula = String(obtenerCedulaAlumno(alumno) || "").toLowerCase();

    return (
      nombres.includes(texto) ||
      apellidos.includes(texto) ||
      cedula.includes(texto)
    );
  });

  const regresarListado = () => {
    setAlumnoDetalle(null);
    setVistaAlumnoDetalle("datos");
    setOrdenDetalleAlumno(null);
    setHistorialVentasAlumno([]);
    setHistorialRecargasAlumno([]);
    setHistorialConsumoAlumno([]);
    setBusquedaHistorial("");
    setCodigoAccesoGenerado(null);
    limpiarFormularioAlumno();
  };

  const generarAccesoFamilia = async () => {
    if (!alumnoDetalle?.id) {
      alert("Selecciona un alumno válido.");
      return;
    }

    try {
      setGenerandoCodigoAcceso(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida.");
        return;
      }

      const respuesta = await fetch(
        `${API_URL}/api/consulta-alumno/alumnos/${alumnoDetalle.id}/generar-codigo`,
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

      const data = await respuesta.json();

      if (!respuesta.ok) {
        alert(data.message || "No se pudo generar el acceso para la familia.");
        return;
      }

      setCodigoAccesoGenerado(data);

      const enlace = `${window.location.origin}/?consulta=alumno`;

      try {
        await navigator.clipboard.writeText(
          `Consulta de saldo: ${enlace}\nInstitución: ${institucionId}\nCédula: ${obtenerCedulaAlumno(alumnoDetalle)}\nCódigo: ${data.codigo}`
        );
        alert("Acceso generado. Los datos también se copiaron al portapapeles.");
      } catch {
        alert(`Acceso generado correctamente. Código: ${data.codigo}`);
      }
    } catch (error) {
      console.error("Error generando acceso familiar:", error);
      alert("No se pudo generar el acceso para la familia.");
    } finally {
      setGenerandoCodigoAcceso(false);
    }
  };

  const copiarTextoSeguro = async (texto, mensajeExito) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        alert(mensajeExito);
        return true;
      }

      const areaTemporal = document.createElement("textarea");
      areaTemporal.value = texto;
      areaTemporal.setAttribute("readonly", "");
      areaTemporal.style.position = "fixed";
      areaTemporal.style.opacity = "0";
      document.body.appendChild(areaTemporal);
      areaTemporal.select();

      const copiado = document.execCommand("copy");
      document.body.removeChild(areaTemporal);

      if (copiado) {
        alert(mensajeExito);
        return true;
      }

      window.prompt("Copia manualmente este texto:", texto);
      return false;
    } catch (error) {
      console.error("No se pudo copiar:", error);
      window.prompt("Copia manualmente este texto:", texto);
      return false;
    }
  };

  const obtenerTextoAccesoCompleto = () => {
    if (!codigoAccesoGenerado?.codigo || !alumnoDetalle) return "";

    const enlace = `${window.location.origin}/?consulta=alumno`;
    const institucionId = obtenerInstitucionActivaId();
    const cedula = obtenerCedulaAlumno(alumnoDetalle) || "-";
    const nombre = `${alumnoDetalle.nombres || ""} ${alumnoDetalle.apellidos || ""}`.trim();

    return [
      "ACCESO DE CONSULTA POS NUBE",
      `Alumno: ${nombre || "Alumno"}`,
      `Enlace: ${enlace}`,
      `Institución: ${institucionId}`,
      `Cédula o código: ${cedula}`,
      `Código de acceso: ${codigoAccesoGenerado.codigo}`,
      "",
      "Este acceso es únicamente para consultar saldo, recargas y movimientos.",
    ].join("\n");
  };

  const exportarOrdenesAlumno = (ordenes) => {
    const filas = [["Orden", "Nombre", "Apellido", "Fecha", "Total", "Forma de pago", "Estado"], ...ordenes.map((v) => [v.id || "", alumnoDetalle?.nombres || "", alumnoDetalle?.apellidos || "", v.created_at || "", Number(v.total || 0).toFixed(2), v.metodo_pago || "", v.estado || "Pagada"])];
    const csv = filas.map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `ordenes_alumno_${alumnoDetalle?.id || ""}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const cerrarModalRecarga = () => {
    setMostrarModalRecarga(false);
    setRecargaAlumnoForm({
      monto: "",
      metodo_pago: "EFECTIVO",
      cuenta_bancaria_id: "",
      banco: "",
      numero_comprobante: "",
      observacion: "",
    });
  };

  const realizarRecargaAlumno = async (evento) => {
    evento.preventDefault();
    if (!alumnoDetalle?.id) return;

    const monto = Number(recargaAlumnoForm.monto || 0);
    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingresa un valor válido para la recarga.");
      return;
    }

    if (recargaAlumnoForm.metodo_pago === "TRANSFERENCIA") {
      if (!recargaAlumnoForm.cuenta_bancaria_id || !recargaAlumnoForm.banco) {
        alert("Selecciona la cuenta bancaria receptora.");
        return;
      }
      if (!String(recargaAlumnoForm.numero_comprobante || "").trim()) {
        alert("Ingresa el número de comprobante de la transferencia.");
        return;
      }
    }

    try {
      setGuardandoRecarga(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(`${API_URL}/api/recargas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id: Number(institucionId),
          alumno_id: Number(alumnoDetalle.id),
          monto,
          metodo_pago: recargaAlumnoForm.metodo_pago,
          cuenta_bancaria_id:
            recargaAlumnoForm.metodo_pago === "TRANSFERENCIA"
              ? Number(recargaAlumnoForm.cuenta_bancaria_id)
              : null,
          banco:
            recargaAlumnoForm.metodo_pago === "TRANSFERENCIA"
              ? recargaAlumnoForm.banco
              : null,
          numero_comprobante:
            recargaAlumnoForm.metodo_pago === "TRANSFERENCIA"
              ? String(recargaAlumnoForm.numero_comprobante).trim()
              : null,
          observacion: recargaAlumnoForm.observacion,
        }),
      });

      const data = await respuesta.json();
      if (!respuesta.ok) {
        alert(data.message || data.error || "No se pudo realizar la recarga.");
        return;
      }

      setAlumnoDetalle(data.alumno || {
        ...alumnoDetalle,
        saldo: Number(alumnoDetalle.saldo || 0) + monto,
      });
      await cargarAlumnos();
      if (typeof cargarRecargas === "function") await cargarRecargas();

      setHistorialRecargasAlumno((actual) => [
        {
          ...(data.recarga || {}),
          monto,
          metodo_pago: recargaAlumnoForm.metodo_pago,
          created_at: data.recarga?.created_at || new Date().toISOString(),
        },
        ...actual,
      ]);

      cerrarModalRecarga();
      alert("Recarga realizada correctamente. El saldo fue acreditado inmediatamente.");
    } catch (error) {
      console.error("Error realizando recarga:", error);
      alert("No se pudo realizar la recarga.");
    } finally {
      setGuardandoRecarga(false);
    }
  };


  const cargarCreditoAlumno = async () => {
    if (!alumnoDetalle?.id) return;

    try {
      setCargandoCreditoAlumno(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const respuesta = await fetch(
        `${API_URL}/api/alumnos/${alumnoDetalle.id}/creditos?institucion_id=${institucionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.message || data.error || "No se pudo cargar el crédito"
        );
      }

      const datosAlumno = data.alumno || {};

      setCreditoAlumno(datosAlumno);
      setMovimientosCreditoAlumno(
        Array.isArray(data.movimientos) ? data.movimientos : []
      );
      setCreditoConfiguracionForm((actual) => ({
        ...actual,
        limite_credito: String(
          Number(datosAlumno.limite_credito || 0)
        ),
      }));

      setAlumnoDetalle((actual) =>
        actual
          ? {
              ...actual,
              ...datosAlumno,
            }
          : actual
      );
    } catch (error) {
      console.error("Error cargando crédito del alumno:", error);
      alert(error.message || "No se pudo cargar el crédito.");
    } finally {
      setCargandoCreditoAlumno(false);
    }
  };

  const guardarLimiteCreditoAlumno = async (evento) => {
    evento.preventDefault();

    if (!alumnoDetalle?.id) return;

    const limite = Number(
      creditoConfiguracionForm.limite_credito
    );

    if (
      !creditoAlumnoHabilitado &&
      (!Number.isFinite(limite) || limite <= 0)
    ) {
      alert("Ingresa un límite de crédito mayor a 0 para habilitarlo.");
      return;
    }

    if (!creditoAdminPassword) {
      alert("Ingresa la contraseña del administrador para autorizar el crédito.");
      return;
    }

    try {
      setGuardandoCreditoAlumno(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const respuesta = await fetch(
        `${API_URL}/api/alumnos/${alumnoDetalle.id}/limite-credito`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
            credito_habilitado: !creditoAlumnoHabilitado,
            limite_credito: creditoAlumnoHabilitado
              ? Number(creditoAlumno?.limite_credito || 0)
              : limite,
            admin_password: creditoAdminPassword,
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.message || data.error || "No se pudo guardar"
        );
      }

      setCreditoAlumno(data.alumno);
      setAlumnoDetalle((actual) => ({
        ...actual,
        ...data.alumno,
      }));

      setCreditoAdminPassword("");
      await cargarAlumnos();
      alert(data.message || "Configuración de crédito actualizada correctamente.");
    } catch (error) {
      console.error("Error guardando límite:", error);
      alert(error.message || "No se pudo guardar el límite.");
    } finally {
      setGuardandoCreditoAlumno(false);
    }
  };

  const registrarAbonoCreditoAlumno = async (evento) => {
    evento.preventDefault();

    if (!alumnoDetalle?.id) return;

    const monto = Number(abonoCreditoForm.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingresa un monto de abono válido.");
      return;
    }

    try {
      setGuardandoCreditoAlumno(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const respuesta = await fetch(
        `${API_URL}/api/alumnos/${alumnoDetalle.id}/creditos/abono`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
            monto,
            observacion: abonoCreditoForm.observacion,
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.message || data.error || "No se pudo registrar"
        );
      }

      setAbonoCreditoForm({
        monto: "",
        observacion: "",
      });

      setAlumnoDetalle((actual) => ({
        ...actual,
        ...data.alumno,
      }));

      await cargarAlumnos();
      await cargarCreditoAlumno();

      alert("Abono registrado correctamente.");
    } catch (error) {
      console.error("Error registrando abono:", error);
      alert(error.message || "No se pudo registrar el abono.");
    } finally {
      setGuardandoCreditoAlumno(false);
    }
  };

  const anularAbonoCreditoAlumno = async (movimiento) => {
    const confirmado = window.confirm(
      "¿Deseas anular este abono?"
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const respuesta = await fetch(
        `${API_URL}/api/alumnos/creditos/${movimiento.id}/anular`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.message || data.error || "No se pudo anular"
        );
      }

      await cargarAlumnos();
      await cargarCreditoAlumno();

      alert("Abono anulado correctamente.");
    } catch (error) {
      console.error("Error anulando abono:", error);
      alert(error.message || "No se pudo anular el abono.");
    }
  };

  return (
  <>
    {mostrarModalRecarga && alumnoDetalle && (
      <div style={paymon.modalOverlay}>
        <div style={paymon.rechargeModal}>
          <div style={paymon.modalHeader}>
            <div>
              <h3 style={{ margin: 0 }}>Recarga de saldo</h3>
              <small>{`${alumnoDetalle.nombres || ""} ${alumnoDetalle.apellidos || ""}`.trim()}</small>
            </div>
            <button type="button" style={paymon.modalClose} onClick={cerrarModalRecarga}>×</button>
          </div>

          <form onSubmit={realizarRecargaAlumno}>
            <label style={paymon.modalLabel}>Valor a recargar *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={recargaAlumnoForm.monto}
              onChange={(e) => setRecargaAlumnoForm({ ...recargaAlumnoForm, monto: e.target.value })}
              style={paymon.modalInput}
              placeholder="0.00"
              autoFocus
              required
            />

            <label style={paymon.transferToggleRow}>
              <span>¿Es transferencia?</span>
              <input
                type="checkbox"
                checked={recargaAlumnoForm.metodo_pago === "TRANSFERENCIA"}
                onChange={(e) => setRecargaAlumnoForm({
                  ...recargaAlumnoForm,
                  metodo_pago: e.target.checked ? "TRANSFERENCIA" : "EFECTIVO",
                  cuenta_bancaria_id: "",
                  banco: "",
                  numero_comprobante: "",
                })}
              />
            </label>

            {recargaAlumnoForm.metodo_pago === "TRANSFERENCIA" && (
              <>
                <label style={paymon.modalLabel}>Banco donde realizó la transferencia *</label>
                <select
                  value={recargaAlumnoForm.cuenta_bancaria_id}
                  onChange={(e) => {
                    const cuenta = cuentasBancarias.find((c) => String(c.id) === String(e.target.value));
                    setRecargaAlumnoForm({
                      ...recargaAlumnoForm,
                      cuenta_bancaria_id: e.target.value,
                      banco: cuenta ? cuenta.banco : "",
                    });
                  }}
                  style={paymon.modalInput}
                  required
                >
                  <option value="">Seleccionar banco</option>
                  {cuentasBancarias.filter((c) => c.activo !== false).map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.banco}
                    </option>
                  ))}
                </select>

                {!cuentasBancarias.length && (
                  <div style={paymon.modalWarning}>
                    No hay bancos configurados. Regístralos en Configuración → Bancos.
                  </div>
                )}

                <label style={paymon.modalLabel}>Número de comprobante *</label>
                <input
                  type="text"
                  value={recargaAlumnoForm.numero_comprobante}
                  onChange={(e) => setRecargaAlumnoForm({ ...recargaAlumnoForm, numero_comprobante: e.target.value })}
                  style={paymon.modalInput}
                  placeholder="Número de documento"
                  required
                />
              </>
            )}

            <label style={paymon.modalLabel}>Observación</label>
            <input
              type="text"
              value={recargaAlumnoForm.observacion}
              onChange={(e) => setRecargaAlumnoForm({ ...recargaAlumnoForm, observacion: e.target.value })}
              style={paymon.modalInput}
              placeholder="Observación opcional"
            />

            <button type="submit" style={paymon.modalSubmit} disabled={guardandoRecarga}>
              {guardandoRecarga ? "Procesando..." : "Realizar recarga"}
            </button>

            <p style={paymon.modalNote}>
              La recarga se acreditará inmediatamente al saldo del alumno.
            </p>
          </form>
        </div>
      </div>
    )}

    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Alumnos</h1>
        <p style={styles.dashboardSubtitle}>
          Ficha central del alumno, saldo, órdenes y recargas
        </p>
      </div>

      <div style={styles.headerActions}>
        {alumnoDetalle ? (
          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              setAlumnoDetalle(null);
              setVistaAlumnoDetalle("datos");
              setOrdenDetalleAlumno(null);
              setHistorialVentasAlumno([]);
              setHistorialRecargasAlumno([]);
              setHistorialConsumoAlumno([]);
              limpiarFormularioAlumno();
            }}
          >
            ← Regresar al listado de alumnos
          </button>
        ) : (
          <>
            <select
              value={filtroAlumnos}
              onChange={(e) => setFiltroAlumnos(e.target.value)}
              style={styles.select}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setMostrarFiltroAlumnos((valorActual) => !valorActual);

                if (mostrarFiltroAlumnos) {
                  setBusquedaAlumnos("");
                }
              }}
            >
              {mostrarFiltroAlumnos ? "Cerrar filtro" : "Filtrar alumno"}
            </button>

            {mostrarFiltroAlumnos && (
              <input
                type="text"
                value={busquedaAlumnos}
                onChange={(e) => setBusquedaAlumnos(e.target.value)}
                placeholder="Nombre, apellido o cédula"
                style={{
                  ...styles.input,
                  width: 260,
                  margin: 0,
                }}
              />
            )}

            <button
              type="button"
              style={styles.refreshButton}
              onClick={cargarAlumnos}
            >
              Refrescar
            </button>
          </>
        )}
      </div>
    </div>

    {alumnoDetalle && (() => {
      const activo = alumnoDetalle.activo !== false;
      const nombreCompleto = `${alumnoDetalle.nombres || ""} ${alumnoDetalle.apellidos || ""}`.trim() || "Alumno";
      const totalPagadas = historialVentasAlumno
        .filter((v) => String(v.estado || "").toUpperCase() !== "PENDIENTE")
        .reduce((acc, v) => acc + Number(v.total || 0), 0);
      const totalPendientes = historialVentasAlumno
        .filter((v) => String(v.estado || "").toUpperCase() === "PENDIENTE")
        .reduce((acc, v) => acc + Number(v.total || 0), 0);
      const ordenesVisibles = historialVentasAlumno.filter((v) => {
        const texto = busquedaHistorial.trim().toLowerCase();
        if (!texto) return true;
        return [v.id, v.metodo_pago, v.estado, v.total, v.created_at]
          .some((valor) => String(valor || "").toLowerCase().includes(texto));
      });

      const irACrearOrden = () => {
        setVista("ventas");
        setVistaVentasInterna("registrar");
        setModoNuevaOrden("consumidor_final");
        setVentaItems([]);
        setVentaForm({ alumno_id: alumnoDetalle.id, metodo_pago: "RECARGA", observacion: "" });
        setBusquedaUsuarioNuevaOrden(nombreCompleto);
        setBusquedaProductoNuevaOrden("");
        setCodigoBarraNuevaOrden("");
        setCategoriaNuevaOrden("TODOS");
      };

      return (
        <div style={paymon.fichaShell}>
          <div style={paymon.hero}>
            <button
              type="button"
              style={paymon.backButton}
              title="Regresar al listado"
              onClick={regresarListado}
            >
              ←
            </button>

            <div style={paymon.avatar}>
              {String(alumnoDetalle.nombres || "A").charAt(0).toUpperCase()}
            </div>

            <div style={paymon.heroIdentity}>
              <h2 style={paymon.heroName}>{nombreCompleto}</h2>
              <div style={paymon.badgeRow}>
                <span style={paymon.studentBadge}>Estudiante</span>
                <span style={activo ? paymon.activeBadge : paymon.inactiveBadge}>
                  {activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>

            <div style={paymon.heroActions}>
              <button
                type="button"
                style={paymon.whiteButton}
                onClick={() => {
                  iniciarEdicionAlumno(alumnoDetalle);
                  setAlumnoDetalle(null);
                  setMostrarFormularioAlumno(true);
                }}
              >
                Editar perfil ✎
              </button>
              <button
                type="button"
                style={paymon.familyButton}
                onClick={generarAccesoFamilia}
                disabled={generandoCodigoAcceso}
              >
                {generandoCodigoAcceso ? "Generando..." : "Acceso familias 🔐"}
              </button>
              <button
                type="button"
                style={paymon.monthButton}
                onClick={() => alert("La compra mensual se habilitará en el siguiente ajuste.")}
              >
                Compra mensual ◫
              </button>
              <button type="button" style={paymon.orangeButton} onClick={irACrearOrden}>
                Crear orden ＋
              </button>
            </div>
          </div>

          {codigoAccesoGenerado && (
            <div style={paymon.familyAccessPanel}>
              <div style={paymon.familyAccessInfo}>
                <strong style={paymon.familyAccessTitle}>
                  Acceso de consulta para padres o representantes
                </strong>

                <label style={paymon.accessFieldLabel}>Enlace público</label>
                <div style={paymon.accessFieldRow}>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?consulta=alumno`}
                    style={paymon.accessReadonlyInput}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    style={paymon.copyLinkButton}
                    onClick={() =>
                      copiarTextoSeguro(
                        `${window.location.origin}/?consulta=alumno`,
                        "Enlace copiado. Ya puedes enviarlo al representante."
                      )
                    }
                  >
                    Copiar enlace
                  </button>
                </div>

                <div style={paymon.familyAccessText}>
                  Cédula o código del alumno:{" "}
                  <strong>{obtenerCedulaAlumno(alumnoDetalle) || "-"}</strong>
                </div>
              </div>

              <div style={paymon.familyCodeBox}>
                <span style={paymon.familyCodeLabel}>Código temporal</span>
                <strong style={paymon.familyCodeValue}>
                  {codigoAccesoGenerado.codigo}
                </strong>
                <button
                  type="button"
                  style={paymon.copyCodeMiniButton}
                  onClick={() =>
                    copiarTextoSeguro(
                      codigoAccesoGenerado.codigo,
                      `Código copiado: ${codigoAccesoGenerado.codigo}`
                    )
                  }
                >
                  Copiar código
                </button>
              </div>

              <div style={paymon.familyButtons}>
                <button
                  type="button"
                  style={paymon.copyFullButton}
                  onClick={() =>
                    copiarTextoSeguro(
                      obtenerTextoAccesoCompleto(),
                      "Mensaje completo copiado. Ya puedes pegarlo en WhatsApp o correo."
                    )
                  }
                >
                  Copiar mensaje completo
                </button>

                <button
                  type="button"
                  style={paymon.whatsappButton}
                  onClick={() => {
                    const texto = obtenerTextoAccesoCompleto();
                    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  Compartir por WhatsApp
                </button>
              </div>
            </div>
          )}

          <div style={paymon.profileGrid}>
            <div style={paymon.dataCardPlain}>
              <DataRow label="Teléfono" value={alumnoDetalle.telefono || alumnoDetalle.celular || "-"} />
              <DataRow label="Email" value={alumnoDetalle.email || alumnoDetalle.correo || "-"} />
              <DataRow label="Cédula" value={obtenerCedulaAlumno(alumnoDetalle) || "-"} />
              <DataRow label="País" value={alumnoDetalle.pais || "Ecuador"} />
              <DataRow label="Ciudad" value={alumnoDetalle.ciudad || "-"} />
              <DataRow label="ID" value={alumnoDetalle.id || "-"} />
            </div>

            <div style={paymon.dataCard}>
              <DataRow label="Institución" value={alumnoDetalle.institucion_nombre || "Colegio Marista"} />
              <DataRow label="Curso" value={alumnoDetalle.curso || "-"} />
              <DataRow label="Paralelo" value={alumnoDetalle.paralelo || "-"} />
              <DataRow label="Código" value={alumnoDetalle.codigo || obtenerCedulaAlumno(alumnoDetalle) || "-"} />
              <DataRow label="Profesor" value={alumnoDetalle.es_profesor ? "Sí" : "No"} />
              <DataRow
                label="Crédito"
                value={
                  alumnoDetalle.credito_habilitado
                    ? `Sí · límite ${formatearMoneda(
                        alumnoDetalle.limite_credito || 0
                      )}`
                    : "No habilitado"
                }
              />
            </div>

            <div style={paymon.balanceCard}>
              <div style={paymon.balanceBox}>
                <span style={paymon.balanceLabel}>Saldo actual:</span>
                <strong style={paymon.balanceValue}>{formatearMoneda(alumnoDetalle.saldo)}</strong>
              </div>
              <button
                type="button"
                style={paymon.rechargeButton}
                onClick={async () => {
                  if (typeof cargarCuentasBancarias === "function") {
                    await cargarCuentasBancarias();
                  }

                  setMostrarModalRecarga(true);
                }}
              >
                Recargar
              </button>
            </div>
          </div>

          <div style={paymon.faceNotice}>
            <div>
              <strong>☺ &nbsp; Registrar reconocimiento facial para {alumnoDetalle.nombres || "el alumno"}</strong>
              <div style={paymon.faceSubtext}>Permite identificarlo de forma segura y rápida.</div>
            </div>
            <button type="button" style={paymon.faceButton}>Registrar rostro</button>
          </div>

          <div style={paymon.tabs}>
            <button type="button" style={vistaAlumnoDetalle === "ordenes" || vistaAlumnoDetalle === "datos" ? paymon.tabActive : paymon.tab} onClick={() => setVistaAlumnoDetalle("ordenes")}>Órdenes</button>
            <button type="button" style={vistaAlumnoDetalle === "recargas" ? paymon.tabActive : paymon.tab} onClick={() => setVistaAlumnoDetalle("recargas")}>Recargas</button>
            <button type="button" style={vistaAlumnoDetalle === "consumo" ? paymon.tabActive : paymon.tab} onClick={() => setVistaAlumnoDetalle("consumo")}>Consumo</button>
            <button
              type="button"
              style={
                vistaAlumnoDetalle === "creditos"
                  ? paymon.tabActive
                  : paymon.tab
              }
              onClick={async () => {
                setVistaAlumnoDetalle("creditos");
                await cargarCreditoAlumno();
              }}
            >
              Créditos
            </button>
          </div>

          {(vistaAlumnoDetalle === "ordenes" || vistaAlumnoDetalle === "datos") && (
            <div style={paymon.historyPanel}>
              <div style={paymon.summaryRow}>
                <div style={paymon.summaryCard}>
                  <div style={paymon.summaryCell}>
                    <span>Total pagadas</span>
                    <strong style={paymon.paidValue}>{formatearMoneda(totalPagadas)}</strong>
                    <small>Total de órdenes pagadas</small>
                  </div>
                  <div style={paymon.summaryCell}>
                    <span>Total pendientes</span>
                    <strong style={paymon.pendingValue}>{formatearMoneda(totalPendientes)}</strong>
                    <small>Total de órdenes por pagar</small>
                  </div>
                </div>
                <button type="button" style={paymon.orangeButton} onClick={irACrearOrden}>Crear orden</button>
              </div>

              <div style={paymon.tableCard}>
                <div style={paymon.tableToolbar}>
                  <input
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    placeholder="⌕  Buscar"
                    style={paymon.searchInput}
                  />
                  <button type="button" style={paymon.exportButton} onClick={() => exportarOrdenesAlumno(ordenesVisibles)}>
                    EXPORTAR ⤓
                  </button>
                </div>

                <div style={paymon.tableWrap}>
                  <table style={paymon.table}>
                    <thead>
                      <tr>
                        <th style={paymon.th}>Orden</th>
                        <th style={paymon.th}>Nombre</th>
                        <th style={paymon.th}>Apellido</th>
                        <th style={paymon.th}>Detalles</th>
                        <th style={paymon.th}>Fecha</th>
                        <th style={paymon.th}>Total</th>
                        <th style={paymon.th}>Forma de pago</th>
                        <th style={paymon.th}>Estado</th>
                        <th style={paymon.th}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenesVisibles.length === 0 ? (
                        <tr><td colSpan="9" style={paymon.emptyCell}>No hay datos disponibles</td></tr>
                      ) : ordenesVisibles.map((v) => (
                        <tr key={v.id}>
                          <td style={paymon.td}>#{v.id}</td>
                          <td style={paymon.td}>{alumnoDetalle.nombres || "-"}</td>
                          <td style={paymon.td}>{alumnoDetalle.apellidos || "-"}</td>
                          <td style={paymon.td}>{Array.isArray(v.items) ? `${v.items.length} producto(s)` : "Ver orden"}</td>
                          <td style={paymon.td}>{v.created_at ? new Date(v.created_at).toLocaleString() : "-"}</td>
                          <td style={paymon.td}>{formatearMoneda(v.total)}</td>
                          <td style={paymon.td}>{v.metodo_pago || "-"}</td>
                          <td style={paymon.td}><span style={paymon.statusPill}>{v.estado || "Pagada"}</span></td>
                          <td style={paymon.td}>
                            <button
                              type="button"
                              style={paymon.viewButton}
                              onClick={() => {
                                const detalleOrden = historialConsumoAlumno.filter((c) => Number(c.venta_id) === Number(v.id));
                                setOrdenDetalleAlumno({ ...v, detalle: detalleOrden });
                              }}
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {ordenDetalleAlumno && (
                <div style={paymon.orderDetail}>
                  <div style={paymon.detailHeader}>
                    <h4 style={{ margin: 0 }}>Detalle de orden #{ordenDetalleAlumno.id}</h4>
                    <button type="button" style={paymon.exportButton} onClick={() => setOrdenDetalleAlumno(null)}>Cerrar</button>
                  </div>
                  {ordenDetalleAlumno.detalle?.length ? (
                    <div style={paymon.tableWrap}>
                      <table style={paymon.table}>
                        <thead><tr><th style={paymon.th}>Producto</th><th style={paymon.th}>Cantidad</th><th style={paymon.th}>Precio</th><th style={paymon.th}>Total</th></tr></thead>
                        <tbody>{ordenDetalleAlumno.detalle.map((d, index) => <tr key={`${d.producto_id}-${index}`}><td style={paymon.td}>{d.producto_nombre}</td><td style={paymon.td}>{d.cantidad}</td><td style={paymon.td}>{formatearMoneda(d.precio_unitario)}</td><td style={paymon.td}>{formatearMoneda(d.total)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : <p>No hay detalle de productos para esta orden.</p>}
                </div>
              )}
            </div>
          )}

          {vistaAlumnoDetalle === "recargas" && <HistorialSimple titulo="Historial de recargas" columnas={["Fecha", "Monto", "Método"]} filas={historialRecargasAlumno.map((r) => [r.created_at ? new Date(r.created_at).toLocaleString() : "-", formatearMoneda(r.monto), r.metodo_pago || "-"])} />}
          {vistaAlumnoDetalle === "consumo" && <HistorialSimple titulo="Consumo detallado" columnas={["Fecha", "Orden", "Producto", "Cantidad", "Precio", "Total"]} filas={historialConsumoAlumno.map((c) => [c.created_at ? new Date(c.created_at).toLocaleString() : "-", `#${c.venta_id}`, c.producto_nombre || "-", c.cantidad || 0, formatearMoneda(c.precio_unitario), formatearMoneda(c.total)])} />}
          {vistaAlumnoDetalle === "creditos" && (
            <div style={paymon.historyPanel}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div style={paymon.summaryCard}>
                  <div style={paymon.summaryCell}>
                    <span>Límite de crédito</span>
                    <strong style={paymon.paidValue}>
                      {formatearMoneda(
                        creditoAlumno?.limite_credito ||
                          alumnoDetalle.limite_credito ||
                          0
                      )}
                    </strong>
                  </div>
                </div>

                <div style={paymon.summaryCard}>
                  <div style={paymon.summaryCell}>
                    <span>Crédito utilizado</span>
                    <strong style={paymon.pendingValue}>
                      {formatearMoneda(
                        creditoAlumno?.credito_utilizado ||
                          alumnoDetalle.credito_utilizado ||
                          0
                      )}
                    </strong>
                  </div>
                </div>

                <div style={paymon.summaryCard}>
                  <div style={paymon.summaryCell}>
                    <span>Crédito disponible</span>
                    <strong style={paymon.paidValue}>
                      {formatearMoneda(
                        creditoAlumno?.credito_disponible ??
                          Math.max(
                            0,
                            Number(
                              alumnoDetalle.limite_credito || 0
                            ) -
                              Number(
                                alumnoDetalle.credito_utilizado ||
                                  0
                              )
                          )
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {["ADMIN", "SUPER_ADMIN"].includes(
                String(rolActual || "").toUpperCase()
              ) && (
                <form
                  onSubmit={guardarLimiteCreditoAlumno}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(190px, .7fr) minmax(180px, .7fr) minmax(320px, 1fr) minmax(300px, 1fr)",
                    gap: 12,
                    padding: 16,
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#f8fafc",
                    marginBottom: 18,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>Habilitar crédito</strong>
                    <div
                      style={{
                        marginTop: 5,
                        fontWeight: 800,
                        color: creditoAlumnoHabilitado
                          ? "#166534"
                          : "#991b1b",
                      }}
                    >
                      {creditoAlumnoHabilitado
                        ? "HABILITADO"
                        : "INHABILITADO"}
                    </div>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Límite de crédito"
                    value={
                      creditoConfiguracionForm.limite_credito
                    }
                    onChange={(e) =>
                      setCreditoConfiguracionForm({
                        ...creditoConfiguracionForm,
                        limite_credito: e.target.value,
                      })
                    }
                    style={paymon.modalInput}
                    required={!creditoAlumnoHabilitado}
                    disabled={creditoAlumnoHabilitado}
                  />

                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type={
                        verCreditoAdminPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Contraseña del administrador"
                      value={creditoAdminPassword}
                      onChange={(e) =>
                        setCreditoAdminPassword(e.target.value)
                      }
                      style={{
                        ...paymon.modalInput,
                        flex: 1,
                      }}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      style={paymon.smallButton}
                      onClick={() =>
                        setVerCreditoAdminPassword(
                          (actual) => !actual
                        )
                      }
                    >
                      {verCreditoAdminPassword ? "Ocultar" : "Ver"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    style={paymon.orangeButton}
                    disabled={guardandoCreditoAlumno}
                  >
                    {guardandoCreditoAlumno
                      ? "Validando..."
                      : creditoAlumnoHabilitado
                      ? "Autorizar y deshabilitar crédito"
                      : "Autorizar y habilitar crédito"}
                  </button>
                </form>
              )}

              <form
                onSubmit={registrarAbonoCreditoAlumno}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: 12,
                  padding: 16,
                  border: "1px solid #fed7aa",
                  borderRadius: 12,
                  background: "#fff7ed",
                  marginBottom: 18,
                }}
              >
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Monto del abono"
                  value={abonoCreditoForm.monto}
                  onChange={(e) =>
                    setAbonoCreditoForm({
                      ...abonoCreditoForm,
                      monto: e.target.value,
                    })
                  }
                  style={paymon.modalInput}
                  required
                />

                <input
                  type="text"
                  placeholder="Observación del abono"
                  value={abonoCreditoForm.observacion}
                  onChange={(e) =>
                    setAbonoCreditoForm({
                      ...abonoCreditoForm,
                      observacion: e.target.value,
                    })
                  }
                  style={paymon.modalInput}
                />

                <button
                  type="submit"
                  style={paymon.rechargeButton}
                  disabled={guardandoCreditoAlumno}
                >
                  Registrar abono
                </button>
              </form>

              <div style={paymon.tableCard}>
                <div style={paymon.tableToolbar}>
                  <h3 style={{ margin: 0 }}>
                    Historial de créditos
                  </h3>

                  <button
                    type="button"
                    style={paymon.exportButton}
                    onClick={cargarCreditoAlumno}
                  >
                    Actualizar
                  </button>
                </div>

                <div style={paymon.tableWrap}>
                  <table style={paymon.table}>
                    <thead>
                      <tr>
                        <th style={paymon.th}>Comercio</th>
                        <th style={paymon.th}>
                          Usuario que hizo el pago
                        </th>
                        <th style={paymon.th}>Tipo</th>
                        <th style={paymon.th}>Monto</th>
                        <th style={paymon.th}>Deuda nueva</th>
                        <th style={paymon.th}>Fecha</th>
                        <th style={paymon.th}>Estado</th>
                        <th style={paymon.th}>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {cargandoCreditoAlumno ? (
                        <tr>
                          <td colSpan="8" style={paymon.emptyCell}>
                            Cargando historial...
                          </td>
                        </tr>
                      ) : movimientosCreditoAlumno.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={paymon.emptyCell}>
                            No hay datos disponibles
                          </td>
                        </tr>
                      ) : (
                        movimientosCreditoAlumno.map(
                          (movimiento) => (
                            <tr key={movimiento.id}>
                              <td style={paymon.td}>
                                {movimiento.comercio ||
                                  "POS NUBE"}
                              </td>
                              <td style={paymon.td}>
                                {movimiento.usuario_nombre ||
                                  movimiento.usuario_correo ||
                                  "Sistema"}
                              </td>
                              <td style={paymon.td}>
                                {movimiento.tipo || "-"}
                              </td>
                              <td style={paymon.td}>
                                {formatearMoneda(
                                  movimiento.monto || 0
                                )}
                              </td>
                              <td style={paymon.td}>
                                {formatearMoneda(
                                  movimiento.credito_nuevo || 0
                                )}
                              </td>
                              <td style={paymon.td}>
                                {movimiento.created_at
                                  ? new Date(
                                      movimiento.created_at
                                    ).toLocaleString()
                                  : "-"}
                              </td>
                              <td style={paymon.td}>
                                {movimiento.estado || "ACTIVO"}
                              </td>
                              <td style={paymon.td}>
                                {movimiento.tipo === "ABONO" &&
                                movimiento.estado !== "ANULADO" ? (
                                  <button
                                    type="button"
                                    style={paymon.viewButton}
                                    onClick={() =>
                                      anularAbonoCreditoAlumno(
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
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      );
    })()}

    {!alumnoDetalle && (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {mostrarFormularioAlumno && (
      <div style={{ ...styles.box, width: "100%" }}>
        <div style={styles.pageHeaderSmall}>
          <h3 style={{ margin: 0 }}>
            {editandoAlumnoId ? "Editar alumno" : "Nuevo alumno"}
          </h3>

          <button
            type="button"
            style={styles.cancelButton}
            onClick={() => {
              limpiarFormularioAlumno();
              setMostrarFormularioAlumno(false);
            }}
          >
            Cerrar ✕
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            if (editandoAlumnoId) {
              await actualizarAlumno(e);
            } else {
              await crearAlumno(e);
            }
            setMostrarFormularioAlumno(false);
          }}
          style={{
            ...styles.form,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          <input type="text" placeholder="Cédula" value={alumnoForm.cedula} onChange={(e) => setAlumnoForm({ ...alumnoForm, cedula: e.target.value })} style={styles.input} required />
          <input type="text" placeholder="Nombres" value={alumnoForm.nombres} onChange={(e) => setAlumnoForm({ ...alumnoForm, nombres: e.target.value })} style={styles.input} required />
          <input type="text" placeholder="Apellidos" value={alumnoForm.apellidos} onChange={(e) => setAlumnoForm({ ...alumnoForm, apellidos: e.target.value })} style={styles.input} required />
          <input type="text" placeholder="Curso" value={alumnoForm.curso} onChange={(e) => setAlumnoForm({ ...alumnoForm, curso: e.target.value })} style={styles.input} />
          <input type="text" placeholder="Paralelo" value={alumnoForm.paralelo} onChange={(e) => setAlumnoForm({ ...alumnoForm, paralelo: e.target.value })} style={styles.input} />
          <input type="number" step="0.01" placeholder="Saldo inicial" value={alumnoForm.saldo} onChange={(e) => setAlumnoForm({ ...alumnoForm, saldo: e.target.value })} style={styles.input} />

          <button type="submit" style={{ ...styles.button, minHeight: 48 }}>
            {editandoAlumnoId ? "Actualizar alumno" : "Guardar alumno"}
          </button>

          <button
            type="button"
            style={styles.cancelButton}
            onClick={() => {
              limpiarFormularioAlumno();
              setMostrarFormularioAlumno(false);
            }}
          >
            Cancelar
          </button>
        </form>
      </div>
      )}

      <div style={{ ...styles.box, width: "100%" }}>
        <div style={styles.pageHeaderSmall}>
          <h3 style={{ margin: 0 }}>
            Lista de alumnos{" "}
            <span style={styles.filterLabel}>
              {filtroAlumnos === "activos"
                ? "(Activos)"
                : filtroAlumnos === "inactivos"
                ? "(Inactivos)"
                : "(Todos)"}
            </span>
          </h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={styles.button}
              onClick={() => {
                limpiarFormularioAlumno();
                setMostrarFormularioAlumno(true);
              }}
            >
              + Nuevo alumno
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={descargarPlantillaAlumnos}
            >
              Descargar plantilla
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              disabled={importandoAlumnos}
              onClick={() => inputImportarAlumnosRef.current?.click()}
            >
              {importandoAlumnos ? "Importando..." : "Importar Excel"}
            </button>

            <input
              ref={inputImportarAlumnosRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={importarAlumnosArchivo}
              style={{ display: "none" }}
            />

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                const filas = [
                ["ID", "Nombres", "Apellidos", "Cédula", "Curso", "Paralelo", "Saldo", "Estado"],
                ...alumnosFiltradosBusqueda.map((a) => [
                  a.id || "",
                  a.nombres || "",
                  a.apellidos || "",
                  obtenerCedulaAlumno(a) || "",
                  a.curso || "",
                  a.paralelo || "",
                  Number(a.saldo || 0).toFixed(2),
                  a.activo !== false ? "Activo" : "Inactivo",
                ]),
              ];

              const csv = filas
                .map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(","))
                .join("\n");

              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "alumnos.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
            >
              Exportar
            </button>
          </div>
        </div>

        {alumnosFiltradosBusqueda.length === 0 ? (
          <p>No hay alumnos para este filtro.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Apellido</th>
                  <th style={styles.th}>Cédula</th>
                  <th style={styles.th}>Curso</th>
                  <th style={styles.th}>Paralelo</th>
                  <th style={styles.th}>Saldo</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {alumnosFiltradosBusqueda.map((a) => {
                  const activo = a.activo !== false;

                  return (
                    <tr key={a.id}>
                      <td style={styles.td}>{a.id || "-"}</td>
                      <td style={styles.td}>{a.nombres || "-"}</td>
                      <td style={styles.td}>{a.apellidos || "-"}</td>
                      <td style={styles.td}>{obtenerCedulaAlumno(a) || "-"}</td>
                      <td style={styles.td}>{a.curso || "-"}</td>
                      <td style={styles.td}>{a.paralelo || "-"}</td>
                      <td style={styles.td}>{formatearMoneda(a.saldo)}</td>
                      <td style={styles.td}>
                        <span style={activo ? styles.badgeActive : styles.badgeInactive}>
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            style={styles.smallDarkButton}
                            onClick={async () => {
  setAlumnoDetalle(a);
  setVistaAlumnoDetalle("datos");

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

   const [ventasRes, recargasRes, consumoRes] = await Promise.all([
  fetch(
    `${API_URL}/api/ventas?institucion_id=${institucionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  ),
  fetch(
    `${API_URL}/api/recargas?institucion_id=${institucionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  ),
  fetch(
    `${API_URL}/api/ventas/alumno/${a.id}/detalle?institucion_id=${institucionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  ),
]);

const ventas = await ventasRes.json();
const recargas = await recargasRes.json();
const consumo = await consumoRes.json();

setHistorialVentasAlumno(
  (ventas || []).filter(
    (v) => Number(v.alumno_id) === Number(a.id)
  )
);

setHistorialRecargasAlumno(
  (recargas || []).filter(
    (r) => Number(r.alumno_id) === Number(a.id)
  )
);

setHistorialConsumoAlumno(
  Array.isArray(consumo) ? consumo : []
);
  } catch (error) {
    console.error(error);
  }
}}
                            title="Ver alumno"
                          >
                            👁
                          </button>

                          <button
                            type="button"
                            style={styles.saveIconButton}
                            onClick={() => {
                              setAlumnoDetalle(a);
                              setVistaAlumnoDetalle("recargas");
                            }}
                            title="Recargas mensuales"
                          >
                            📄
                          </button>

                          <button
                            type="button"
                            style={activo ? styles.editIconButton : styles.disabledIconButton}
                            onClick={() => {
                              if (!activo) return;
                              iniciarEdicionAlumno(a);
                              setMostrarFormularioAlumno(true);
                            }}
                            disabled={!activo}
                            title="Editar alumno"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            style={styles.moveIconButton}
                            onClick={() => {
                              setAlumnoDetalle(a);
                              setVistaAlumnoDetalle("datos");
                            }}
                            title="Enviar notificación saldo bajo"
                          >
                            📨
                          </button>

<button
  type="button"
  style={styles.outlineButton}
  onClick={async () => {
    setAlumnoDetalle(a);
    setVistaAlumnoDetalle("consumo");
    setOrdenDetalleAlumno(null);

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const [ventasRes, recargasRes, consumoRes] = await Promise.all([
        fetch(`${API_URL}/api/ventas?institucion_id=${institucionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/recargas?institucion_id=${institucionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `${API_URL}/api/ventas/alumno/${a.id}/detalle?institucion_id=${institucionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      const ventas = await ventasRes.json();
      const recargas = await recargasRes.json();
      const consumo = await consumoRes.json();

      setHistorialVentasAlumno(
        (Array.isArray(ventas) ? ventas : []).filter(
          (v) => Number(v.alumno_id) === Number(a.id)
        )
      );

      setHistorialRecargasAlumno(
        (Array.isArray(recargas) ? recargas : []).filter(
          (r) => Number(r.alumno_id) === Number(a.id)
        )
      );

      setHistorialConsumoAlumno(
        Array.isArray(consumo) ? consumo : []
      );
    } catch (error) {
      console.error("Error cargando consumo del alumno:", error);
      setHistorialConsumoAlumno([]);
      alert("No se pudo cargar el historial de consumo del alumno.");
    }
  }}
  title="Ver historial de consumo"
>
  Consumo
</button>

                          <button
                            type="button"
                            style={activo ? styles.deleteIconButton : styles.disabledIconButton}
                            onClick={() => activo && eliminarAlumno(a)}
                            disabled={!activo}
                            title="Eliminar alumno"
                          >
                            🗑️
                          </button>

                          {!activo && (
                            <button
                              type="button"
                              style={styles.restoreIconButton}
                              onClick={() => restaurarAlumno(a)}
                              title="Restaurar alumno"
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
  </>
  );
}


function DataRow({ label, value }) {
  return <div style={paymon.dataRow}><span style={paymon.dataLabel}>{label}:</span><strong style={paymon.dataValue}>{value}</strong></div>;
}

function HistorialSimple({ titulo, columnas, filas }) {
  return (
    <div style={paymon.historyPanel}>
      <h3>{titulo}</h3>
      <div style={paymon.tableWrap}>
        <table style={paymon.table}>
          <thead><tr>{columnas.map((c) => <th key={c} style={paymon.th}>{c}</th>)}</tr></thead>
          <tbody>{filas.length ? filas.map((fila, i) => <tr key={i}>{fila.map((v, j) => <td key={j} style={paymon.td}>{v}</td>)}</tr>) : <tr><td colSpan={columnas.length} style={paymon.emptyCell}>No hay datos disponibles</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

const paymon = {
  fichaShell: { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 14px 40px rgba(15,23,42,.10)", marginBottom: 24 },
  hero: { background: "#2428b8", color: "#fff", padding: "22px 28px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" },
  backButton: { border: 0, background: "transparent", color: "#ff8b45", fontSize: 34, cursor: "pointer", padding: 0 },
  avatar: { width: 72, height: 72, borderRadius: "50%", background: "#fff", color: "#2428b8", border: "3px solid #ff8b45", display: "grid", placeItems: "center", fontSize: 30, fontWeight: 800 },
  heroIdentity: { minWidth: 220, flex: 1 }, heroName: { margin: "0 0 10px", fontSize: 26 }, badgeRow: { display: "flex", gap: 10 },
  studentBadge: { background: "#eef2ff", color: "#3137d8", padding: "8px 18px", borderRadius: 12 }, activeBadge: { background: "#dff7e8", color: "#166534", padding: "8px 18px", borderRadius: 12 }, inactiveBadge: { background: "#fee2e2", color: "#991b1b", padding: "8px 18px", borderRadius: 12 },
  heroActions: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  whiteButton: { border: 0, background: "#fff", color: "#2428b8", borderRadius: 7, padding: "14px 20px", fontWeight: 700, cursor: "pointer" },
  familyButton: { border: 0, background: "#10b981", color: "#fff", borderRadius: 7, padding: "14px 20px", fontWeight: 700, cursor: "pointer" },
  monthButton: { border: 0, background: "#6d88ef", color: "#fff", borderRadius: 7, padding: "14px 20px", fontWeight: 700, cursor: "pointer" },
  familyAccessPanel: { margin: "20px 5% 4px", padding: "20px 22px", border: "1px solid #a7f3d0", background: "#ecfdf5", borderRadius: 12, display: "grid", gridTemplateColumns: "minmax(320px, 1fr) auto", gap: 18, alignItems: "center" },
  familyAccessInfo: { minWidth: 0 },
  familyAccessTitle: { color: "#065f46", display: "block", marginBottom: 12, fontSize: 17 },
  familyAccessText: { color: "#047857", fontSize: 14, overflowWrap: "anywhere", marginTop: 10 },
  accessFieldLabel: { display: "block", color: "#065f46", fontSize: 13, fontWeight: 700, marginBottom: 5 },
  accessFieldRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  accessReadonlyInput: { flex: "1 1 320px", minWidth: 0, border: "1px solid #6ee7b7", background: "#fff", borderRadius: 8, padding: "11px 12px", color: "#064e3b", fontSize: 14 },
  copyLinkButton: { border: 0, background: "#047857", color: "#fff", borderRadius: 8, padding: "11px 16px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  familyCodeBox: { background: "#fff", border: "1px dashed #10b981", borderRadius: 10, padding: "12px 18px", textAlign: "center", minWidth: 210 },
  familyCodeLabel: { display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 },
  familyCodeValue: { display: "block", color: "#065f46", fontSize: 24, letterSpacing: 3, marginBottom: 10 },
  copyCodeMiniButton: { border: 0, background: "#047857", color: "#fff", borderRadius: 7, padding: "8px 12px", fontWeight: 700, cursor: "pointer" },
  familyButtons: { gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap" },
  copyFullButton: { border: "1px solid #047857", background: "#fff", color: "#047857", borderRadius: 8, padding: "11px 17px", fontWeight: 700, cursor: "pointer" },
  whatsappButton: { border: 0, background: "#25D366", color: "#fff", borderRadius: 8, padding: "11px 17px", fontWeight: 700, cursor: "pointer" },
  orangeButton: { border: 0, background: "#ff8548", color: "#fff", borderRadius: 9, padding: "14px 24px", fontWeight: 700, cursor: "pointer" },
  profileGrid: { padding: "34px 6% 22px", display: "grid", gridTemplateColumns: "minmax(230px,1fr) minmax(260px,1fr) minmax(230px,.75fr)", gap: 30, alignItems: "stretch" },
  dataCardPlain: { padding: "8px 12px" }, dataCard: { padding: "24px 28px", borderRadius: 12, boxShadow: "0 6px 18px rgba(15,23,42,.12)" },
  dataRow: { display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, marginBottom: 14, alignItems: "baseline" }, dataLabel: { color: "#64748b", fontSize: 16 }, dataValue: { color: "#111827", overflowWrap: "anywhere" },
  balanceCard: { padding: 20, borderRadius: 12, boxShadow: "0 6px 18px rgba(15,23,42,.12)", display: "flex", flexDirection: "column", gap: 18, justifyContent: "center" },
  balanceBox: { background: "#dff7ef", borderRadius: 10, padding: 18, textAlign: "center" }, balanceLabel: { display: "block", fontWeight: 700 }, balanceValue: { display: "block", fontSize: 38, marginTop: 6 }, rechargeButton: { border: 0, background: "#2428b8", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 700, cursor: "pointer" },
  faceNotice: { margin: "8px 5% 34px", border: "1px solid #c9d7ff", background: "#f3f6ff", borderRadius: 13, padding: "18px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, color: "#3f46ce", flexWrap: "wrap" }, faceSubtext: { fontSize: 13, marginTop: 4 }, faceButton: { border: 0, background: "#5b50e8", color: "#fff", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer" },
  tabs: { margin: "0 5%", display: "flex", gap: 4, flexWrap: "wrap" }, tab: { minWidth: 170, padding: "14px 28px", border: "2px solid #ff8548", color: "#ff5f2b", background: "#fff", cursor: "pointer", fontWeight: 700 }, tabActive: { minWidth: 170, padding: "14px 28px", border: "2px solid #ff8548", color: "#fff", background: "#ff8548", cursor: "pointer", fontWeight: 700 },
  historyPanel: { margin: "0 5% 40px", padding: "28px 0" }, summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }, summaryCard: { display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 10, boxShadow: "0 5px 16px rgba(15,23,42,.12)", overflow: "hidden", minWidth: 420 }, summaryCell: { padding: "20px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, borderRight: "1px solid #e5e7eb" }, paidValue: { fontSize: 36, color: "#062c4c" }, pendingValue: { fontSize: 36, color: "#2fc48d" },
  tableCard: { marginTop: 34, padding: 28, borderRadius: 12, boxShadow: "0 8px 22px rgba(15,23,42,.12)" }, tableToolbar: { display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }, searchInput: { width: 270, maxWidth: "100%", padding: "14px 16px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16 }, exportButton: { border: "1px solid #10b981", color: "#059669", background: "#fff", borderRadius: 8, padding: "12px 20px", cursor: "pointer", fontWeight: 700 },
  tableWrap: { overflowX: "auto" }, table: { width: "100%", borderCollapse: "collapse", minWidth: 880 }, th: { background: "#dceafe", color: "#10167d", padding: "16px 12px", textAlign: "left", whiteSpace: "nowrap" }, td: { padding: "14px 12px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }, emptyCell: { textAlign: "center", padding: 26, fontSize: 18 }, statusPill: { background: "#dcfce7", color: "#166534", padding: "6px 10px", borderRadius: 999, fontWeight: 700 }, viewButton: { border: 0, background: "#2428b8", color: "#fff", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }, orderDetail: { marginTop: 22, padding: 20, border: "1px solid #e5e7eb", borderRadius: 10 }, detailHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.62)", display: "grid", placeItems: "center", padding: 18, zIndex: 9999 },
  rechargeModal: { width: "min(620px, 96vw)", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 14, padding: 26, boxShadow: "0 24px 80px rgba(0,0,0,.28)" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18 },
  modalClose: { border: 0, background: "transparent", fontSize: 30, color: "#64748b", cursor: "pointer", lineHeight: 1 },
  modalLabel: { display: "block", color: "#334155", fontWeight: 700, margin: "12px 0 6px" },
  modalInput: { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: "12px 13px", fontSize: 16, background: "#fff" },
  transferToggleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, margin: "18px 0 8px", color: "#475569", fontWeight: 700 },
  modalWarning: { marginTop: 8, padding: 10, borderRadius: 8, background: "#fff7ed", color: "#9a3412", fontSize: 13 },
  modalSubmit: { display: "block", margin: "20px auto 0", border: 0, background: "#2428b8", color: "#fff", borderRadius: 8, padding: "12px 24px", fontWeight: 800, cursor: "pointer" },
  modalNote: { margin: "18px 0 0", textAlign: "center", color: "#475569", fontSize: 13, lineHeight: 1.45 },

};