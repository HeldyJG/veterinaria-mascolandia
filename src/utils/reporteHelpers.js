function parseRangoFechas(query) {
  const hoy = new Date();
  let fechaInicio = query.fechaInicio;
  let fechaFin = query.fechaFin;

  if (!fechaInicio) {
    const primeroMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    fechaInicio = primeroMes.toISOString().split('T')[0];
  }
  if (!fechaFin) {
    fechaFin = hoy.toISOString().split('T')[0];
  }

  const inicioDate = new Date(`${fechaInicio}T00:00:00`);
  const finDate = new Date(`${fechaFin}T23:59:59`);

  const diffMs = finDate - inicioDate;
  const inicioAntDate = new Date(inicioDate.getTime() - diffMs - 1000);
  const finAntDate = new Date(inicioDate.getTime() - 1000);
  const fechaInicioAnt = inicioAntDate.toISOString().split('T')[0];
  const fechaFinAnt = finAntDate.toISOString().split('T')[0];

  return {
    fechaInicio,
    fechaFin,
    inicioDate,
    finDate,
    inicioAntDate,
    finAntDate,
    fechaInicioAnt,
    fechaFinAnt,
  };
}

function pctCambio(actual, anterior) {
  if (anterior > 0) {
    const diff = actual - anterior;
    const porc = ((diff * 100) / anterior).toFixed(1);
    return (diff >= 0 ? '+' : '') + porc + '%';
  }
  return actual > 0 ? '+100%' : '0%';
}

function diasEntre(inicioDate, finDate) {
  const dias = [];
  const temp = new Date(inicioDate);
  while (temp <= finDate) {
    dias.push(temp.toISOString().split('T')[0]);
    temp.setDate(temp.getDate() + 1);
  }
  return dias;
}

function escaparCsv(valor) {
  const s = String(valor ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function generarCsv(filas, columnas) {
  const header = columnas.map((c) => escaparCsv(c.label)).join(',');
  const body = filas
    .map((fila) => columnas.map((c) => escaparCsv(fila[c.key])).join(','))
    .join('\n');
  return '\uFEFF' + header + '\n' + body;
}

module.exports = {
  parseRangoFechas,
  pctCambio,
  diasEntre,
  generarCsv,
};
