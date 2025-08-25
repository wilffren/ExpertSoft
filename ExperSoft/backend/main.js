// convert files to csv

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const inputDir = './xlsx_files';  // Carpeta con los archivos XLSX
const outputDir = './csv_files';  // Carpeta para guardar CSVs

// Crear carpeta de salida si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Leer todos los archivos XLSX en la carpeta
fs.readdirSync(inputDir).forEach(file => {
  if (path.extname(file) === '.xlsx') {
    const filePath = path.join(inputDir, file);

    // Leer el archivo XLSX
    const workbook = XLSX.readFile(filePath);

    // Procesar cada hoja (si quieres solo la primera, quita el loop)
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      // Nombre del archivo CSV (puedes cambiar para incluir el nombre de la hoja)
      const csvFileName = file.replace('.xlsx', `_${sheetName}.csv`);
      const outputPath = path.join(outputDir, csvFileName);

      // Guardar el CSV
      fs.writeFileSync(outputPath, csv);
      console.log(`Convertido: ${file} hoja: ${sheetName} -> ${csvFileName}`);
    });
  }
});
