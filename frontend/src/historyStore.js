const STORAGE_KEY = 'medai_patient_history';

function fileToDataURL(file) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export async function saveRecord({ module, patientName, inputs, result, imageFile }) {
  const history = getRecords();
  const thumbnail = await fileToDataURL(imageFile);

  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    module,
    patientName: patientName || 'Anonymous',
    inputs,
    result,
    thumbnail,
    timestamp: new Date().toISOString(),
  };

  history.unshift(record);

  // Keep max 100 records to avoid localStorage quota
  if (history.length > 100) history.length = 100;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // If quota exceeded, drop oldest half and retry
    history.length = Math.floor(history.length / 2);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  return record;
}

export function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function deleteRecord(id) {
  const history = getRecords().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}
