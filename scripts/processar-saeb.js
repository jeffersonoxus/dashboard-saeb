const XLSX = require('xlsx');
const fs = require('fs');

// Ler o arquivo Excel
const wb = XLSX.readFile('RESULTADO PRELIMINAR - SAEB 2025.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const dados = XLSX.utils.sheet_to_json(sheet);

// Processar e limpar os dados
const resultado = [];

dados.forEach((row) => {
  // Pular linhas sem dados importantes
  if (!row['NOME DA ESCOLA']) return;
  if (!row['MÉDIA LINGUA PORTUGUESA']) return;
  if (!row['MÉDIA MATEMÁTICA']) return;
  
  // Extrair etapa (5º ou 9º)
  let etapa = row['ETAPA'] || '';
  if (etapa.includes('5º')) etapa = '5º';
  else if (etapa.includes('9º')) etapa = '9º';
  else return;
  
  resultado.push({
    id: row['CÓDIGO DA ESCOLA'],
    escola: row['NOME DA ESCOLA'],
    municipio: row['NOME DO MUNICÍPIO'],
    rede: row['TIPO REDE'],
    etapa: etapa,
    lp: Number(row['MÉDIA LINGUA PORTUGUESA']) || 0,
    mat: Number(row['MÉDIA MATEMÁTICA']) || 0,
    alunos_presentes: Number(row['PRESENTES']) || 0,
    alunos_matriculados: Number(row['QT. DE ALUNOS MATRICULADOS CONFORME CENSO']) || 0
  });
});

// Salvar como JSON
fs.writeFileSync('public/saeb.json', JSON.stringify(resultado, null, 2));

console.log(`✅ Processado! ${resultado.length} registros salvos.`);
console.log(`📊 5º ano: ${resultado.filter(r => r.etapa === '5º').length}`);
console.log(`📊 9º ano: ${resultado.filter(r => r.etapa === '9º').length}`);