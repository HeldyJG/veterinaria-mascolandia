function initMascotaRazasForm(selectEspecieId, selectRazaId) {
  const selectEspecie = document.getElementById(selectEspecieId);
  const selectRaza = document.getElementById(selectRazaId);
  if (!selectEspecie || !selectRaza) return;

  const todasLasRazas = Array.from(selectRaza.options).map((opt) => ({
    value: opt.value,
    text: opt.text,
  }));

  selectEspecie.addEventListener('change', async function () {
    const idEspecie = this.value;
    selectRaza.innerHTML = '<option value="">— Cargando razas... —</option>';

    if (!idEspecie) {
      selectRaza.innerHTML = '<option value="">— Seleccionar raza —</option>';
      todasLasRazas.forEach((r) => {
        if (r.value) {
          const opt = document.createElement('option');
          opt.value = r.value;
          opt.textContent = r.text;
          selectRaza.appendChild(opt);
        }
      });
      return;
    }

    try {
      const response = await fetch(`/api/mascotas/razas/${idEspecie}`);
      const data = await response.json();
      selectRaza.innerHTML = '<option value="">— Seleccionar raza —</option>';
      if (data.success && data.data.length > 0) {
        data.data.forEach((raza) => {
          const opt = document.createElement('option');
          opt.value = raza.id;
          opt.textContent = raza.nombre;
          selectRaza.appendChild(opt);
        });
      } else {
        selectRaza.innerHTML = '<option value="">— Sin razas para esta especie —</option>';
      }
    } catch (err) {
      selectRaza.innerHTML = '<option value="">— Error al cargar razas —</option>';
    }
  });
}

function initMascotaFotoPreview(inputId, previewId, imgId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', function () {
    const file = this.files[0];
    const preview = document.getElementById(previewId);
    const previewImg = document.getElementById(imgId);
    if (!preview || !previewImg) return;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = 'none';
      previewImg.src = '';
    }
  });
}
