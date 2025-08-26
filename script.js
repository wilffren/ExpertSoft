Claro, aquí tienes un script completo en un solo archivo Node.js que:

Carga un archivo .xlsx

Convierte la primera hoja a .csv

Guarda el archivo .csv en una carpeta (creándola si no existe)

✅ Script completo: convertirXlsxACsv.js
// convertirXlsxACsv.js

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 🔧 CONFIGURACIÓN (puedes cambiar estos valores)
const archivoXlsx = 'archivo.xlsx';              // nombre del archivo de entrada
const carpetaSalida = './salidas';               // carpeta donde se guardará el CSV
const archivoCsv = 'archivo_convertido.csv';     // nombre del archivo CSV

// 📥 Leer el archivo .xlsx
try {
  const workbook = XLSX.readFile(archivoXlsx);

  // 📄 Tomar la primera hoja
  const nombreHoja = workbook.SheetNames[0];
  const hoja = workbook.Sheets[nombreHoja];

  // 🔄 Convertir a CSV
  const csv = XLSX.utils.sheet_to_csv(hoja);

  // 📁 Asegurar que la carpeta existe
  if (!fs.existsSync(carpetaSalida)) {
    fs.mkdirSync(carpetaSalida, { recursive: true });
  }

  // 💾 Escribir el archivo CSV
  const rutaSalida = path.join(carpetaSalida, archivoCsv);
  fs.writeFileSync(rutaSalida, csv);

  console.log(`✅ Conversión completada. CSV guardado en: ${rutaSalida}`);
} catch (error) {
  console.error('❌ Error al convertir el archivo:', error.message);
}

🛠️ Cómo usarlo:

Guarda este código en un archivo, por ejemplo convertirXlsxACsv.js

Asegúrate de tener instalado el paquete xlsx:

npm install xlsx


Coloca el archivo .xlsx (por ejemplo, archivo.xlsx) en el mismo directorio que el script.

Ejecuta el script:

node convertirXlsxACsv.js