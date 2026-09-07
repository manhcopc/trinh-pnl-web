const fs = require('fs');
let file = fs.readFileSync('app/components/PnLMatrixTable.js', 'utf8');

const lines = file.split('\n');
let inColsMap = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('columns.map(col =>')) {
    inColsMap = true;
  }
  
  if (inColsMap && lines[i].includes('<td style={{')) {
    lines[i] = lines[i].replace('<td style={{', '<td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col),');
  }
  if (inColsMap && lines[i].includes('<th style={{')) {
    lines[i] = lines[i].replace('<th style={{', '<th onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col),');
  }
  if (inColsMap && lines[i].includes('<th colSpan={getColSpan(col)} key={col} style={{')) {
    lines[i] = lines[i].replace('<th colSpan={getColSpan(col)} key={col} style={{', '<th colSpan={getColSpan(col)} key={col} onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col),');
  }
  
  if (inColsMap && lines[i].includes('</React.Fragment>')) {
    inColsMap = false;
  }
}

fs.writeFileSync('app/components/PnLMatrixTable.js', lines.join('\n'));
